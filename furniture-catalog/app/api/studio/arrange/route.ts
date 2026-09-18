import { seedCatalog } from '../../../catalog/items';
import { homeDefinitions } from '../../../decorate/home-definitions';
import { assertSameOrigin, bearerToken, convexFor, errorResponse, HttpError, json } from '@/lib/server/convex';

const MODEL = 'gpt-6-astra';

type Piece = { id: string; quantity: number; reason: string };

export const maxDuration = 60;

/** Astra picks catalog pieces for a home that has no walkable plan yet. Placement lives in /api/placements. */
export async function POST(request: Request) {
  let handle: Awaited<ReturnType<typeof convexFor>>;
  try {
    assertSameOrigin(request, 'Start the arrangement from Homebuddy.');
    if (!bearerToken(request)) throw new HttpError('Sign in to spend credits on an arrangement.', 401);
    if (!process.env.OPENAI_API_KEY) throw new HttpError('Arranging is not connected yet. Add OPENAI_API_KEY on the server.', 503);
    handle = await convexFor(bearerToken(request));
  } catch (error) {
    return errorResponse(error);
  }
  const { client, api } = handle;

  let arrangementId: string | null = null;
  try {
    const body = await request.json() as { recordId?: string; style?: string; prompt?: string };
    if (!body.recordId) return json({ error: 'Choose a home before arranging.' }, 400);
    const style = body.style?.trim() || 'Scandinavian';
    arrangementId = await client.mutation(api.arrangements.reserve, {
      homeId: body.recordId as never,
      style,
      prompt: body.prompt,
    });
    await client.mutation(api.arrangements.markRunning, { arrangementId: arrangementId as never });
    const live = await client.query(api.catalog.list, {}).catch(() => []);
    const catalog = live.length ? live : seedCatalog;
    const pieces = await ask(style, body.prompt ?? '', catalog);
    const summary = pieces.length
      ? `A ${style.toLowerCase()} list from the catalog: ${pieces.map((piece) => `${piece.quantity} × ${nameFor(piece.id, catalog)}`).join(', ')}.`
      : 'Nothing in the catalog fit this request. Credits were used because the request was accepted.';
    await client.mutation(api.arrangements.complete, {
      arrangementId: arrangementId as never,
      summary,
      pieces,
    });
    return json({ summary, pieces, sampleHomes: Object.keys(homeDefinitions) });
  } catch (error) {
    if (arrangementId) {
      await client.mutation(api.arrangements.refund, {
        arrangementId: arrangementId as never,
        reason: error instanceof Error ? error.message : 'The arrangement did not start.',
      }).catch(() => undefined);
    }
    return json({ error: error instanceof Error ? error.message : 'The arrangement could not be completed.' }, 400);
  }
}

function nameFor(id: string, catalog = seedCatalog) {
  return catalog.find((item) => item.id === id)?.name.split(/ — |, /)[0] ?? id;
}

async function ask(style: string, prompt: string, catalog = seedCatalog): Promise<Piece[]> {
  const catalogBrief = catalog.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    width_cm: Math.round(item.dimensions_m.width * 100),
    depth_cm: Math.round(item.dimensions_m.depth * 100),
    height_cm: Math.round(item.dimensions_m.height * 100),
  }));
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      store: false,
      max_output_tokens: 4000,
      instructions: 'You are an interior buyer selecting real catalog furniture. Use only the supplied catalog ids. Do not invent products. Prefer a practical set for one home: seating, a table if useful, a bed if the notes suggest a bedroom, lighting, and a rug. Quantities are integers from 1 to 4. Reasons are one short sentence each.',
      input: JSON.stringify({ style, notes: prompt.slice(0, 500), catalog: catalogBrief }),
      text: {
        format: {
          type: 'json_schema',
          name: 'furniture_list',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['pieces'],
            properties: {
              pieces: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['id', 'quantity', 'reason'],
                  properties: {
                    id: { type: 'string' },
                    quantity: { type: 'integer' },
                    reason: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    }),
    signal: AbortSignal.timeout(90000),
  });
  if (!response.ok) throw new Error('The arrangement service could not accept this request. Credits were returned.');
  const data = await response.json() as { output?: { type: string; content?: { type: string; text?: string }[] }[] };
  const text = data.output?.filter((item) => item.type === 'message').flatMap((item) => item.content ?? []).filter((item) => item.type === 'output_text').map((item) => item.text ?? '').join('');
  if (!text) throw new Error('The arrangement came back empty. Credits were returned.');
  const parsed = JSON.parse(text) as { pieces: Piece[] };
  return parsed.pieces.filter((piece) => catalog.some((item) => item.id === piece.id) && Number.isInteger(piece.quantity) && piece.quantity > 0 && piece.quantity <= 4).slice(0, 16);
}
