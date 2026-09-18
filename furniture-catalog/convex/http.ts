import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();
auth.addHttpRoutes(http);

http.route({
  path: "/stripe",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("stripe-signature");
    if (!signature) return new Response("Missing signature", { status: 400 });
    const result = await ctx.runAction(internal.stripeNode.handleWebhook, {
      body: await request.text(),
      signature,
    });
    if (!result.ok) return new Response(result.error, { status: 400 });
    return new Response("ok");
  }),
});

function workerAuthorized(request: Request) {
  const expected = process.env.ASSET_WORKER_TOKEN || "";
  const provided = request.headers.get("authorization") || "";
  if (!expected || provided.length !== `Bearer ${expected}`.length) return false;
  let mismatch = 0;
  const bearer = `Bearer ${expected}`;
  for (let i = 0; i < bearer.length; i++) mismatch |= bearer.charCodeAt(i) ^ provided.charCodeAt(i);
  return mismatch === 0;
}

http.route({
  path: "/worker",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!workerAuthorized(request)) return new Response("Unauthorized", { status: 401 });
    const body = await request.json() as { action?: string; jobId?: string; error?: string; items?: never; interior?: never };
    if (body.action === "claim") return Response.json(await ctx.runMutation(internal.jobs.claim, {}));
    if (body.action === "fail-leased") {
      await ctx.runMutation(internal.jobs.failLeased, {});
      return Response.json({ ok: true });
    }
    if (body.action === "fail" && body.jobId) {
      await ctx.runMutation(internal.jobs.fail, { jobId: body.jobId as never, error: body.error || "Generation failed." });
      return Response.json({ ok: true });
    }
    if (body.action === "complete" && body.jobId) {
      await ctx.runMutation(internal.jobs.complete, { jobId: body.jobId as never, items: (body.items || []) as never, interior: body.interior as never });
      return Response.json({ ok: true });
    }
    return new Response("Unknown worker action", { status: 400 });
  }),
});

export default http;
