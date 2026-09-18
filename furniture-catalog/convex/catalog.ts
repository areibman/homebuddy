import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const item = {
  slug: v.string(),
  name: v.string(),
  category: v.string(),
  description: v.string(),
  materials: v.array(v.string()),
  widthM: v.number(),
  depthM: v.number(),
  heightM: v.number(),
  provenance: v.string(),
  dimensionsNote: v.optional(v.string()),
  retailer: v.string(),
  sourceUrl: v.string(),
  photoUrl: v.string(),
  articleNumber: v.string(),
  checkedDate: v.string(),
  glbKey: v.string(),
  previewKey: v.string(),
  blendKey: v.optional(v.string()),
  viewerOrbit: v.optional(v.string()),
};

function publicFile(key: string) {
  return key.startsWith("homes/") ? key : `/api/assets/${key}`;
}

function toClient(row: {
  slug: string;
  ownerId?: Id<"users">;
  name: string;
  category: string;
  description: string;
  materials: string[];
  widthM: number;
  depthM: number;
  heightM: number;
  provenance: string;
  dimensionsNote?: string;
  retailer: string;
  sourceUrl: string;
  photoUrl: string;
  articleNumber: string;
  checkedDate: string;
  glbKey: string;
  previewKey: string;
  blendKey?: string;
  viewerOrbit?: string;
}) {
  return {
    id: row.slug,
    name: row.name,
    category: row.category,
    description: row.description,
    materials: row.materials,
    dimensions_m: { width: row.widthM, depth: row.depthM, height: row.heightM },
    dimensions_note: row.dimensionsNote,
    source: {
      retailer: row.retailer,
      url: row.sourceUrl,
      photo_url: row.photoUrl,
      article_number: row.articleNumber,
      checked_date: row.checkedDate,
    },
    files: {
      glb: publicFile(row.glbKey),
      preview: publicFile(row.previewKey),
      ...(row.blendKey ? { blend: publicFile(row.blendKey) } : {}),
    },
    provenance: row.provenance,
    viewer: row.viewerOrbit ? { orbit: row.viewerOrbit } : undefined,
    shared: !row.ownerId,
    glbKey: row.glbKey,
    previewKey: row.previewKey,
  };
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const shared = await ctx.db.query("catalogItems").withIndex("by_published", (q) => q.eq("published", true)).collect();
    const owned = userId
      ? await ctx.db.query("catalogItems").withIndex("by_owner", (q) => q.eq("ownerId", userId)).collect()
      : [];
    const seen = new Set<string>();
    return [...shared.filter((row) => !row.ownerId), ...owned]
      .filter((row) => (seen.has(row.slug) ? false : (seen.add(row.slug), true)))
      .map(toClient);
  },
});

async function upsert(ctx: MutationCtx, args: {
  slug: string;
  ownerId?: Id<"users">;
  name: string;
  category: string;
  description: string;
  materials: string[];
  widthM: number;
  depthM: number;
  heightM: number;
  provenance: string;
  dimensionsNote?: string;
  retailer: string;
  sourceUrl: string;
  photoUrl: string;
  articleNumber: string;
  checkedDate: string;
  glbKey: string;
  previewKey: string;
  blendKey?: string;
  viewerOrbit?: string;
  published: boolean;
}) {
  const existing = await ctx.db.query("catalogItems").withIndex("by_slug", (q) => q.eq("slug", args.slug)).unique();
  const row = { ...args, createdAt: existing?.createdAt ?? Date.now() };
  if (existing) await ctx.db.patch(existing._id, row);
  else await ctx.db.insert("catalogItems", row);
}

export const seedShared = internalMutation({
  args: { items: v.array(v.object(item)) },
  handler: async (ctx, { items }) => {
    for (const next of items) await upsert(ctx, { ...next, published: true });
    return items.length;
  },
});

export const publishOwned = internalMutation({
  args: { userId: v.id("users"), items: v.array(v.object(item)) },
  handler: async (ctx, { userId, items }) => {
    for (const next of items) await upsert(ctx, { ...next, ownerId: userId, published: false });
    return items.length;
  },
});

export const importGenerated = mutation({
  args: { items: v.array(v.object(item)) },
  handler: async (ctx, { items }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in to save generated furniture.");
    if (!items.length || items.length > 30) throw new Error("Generated furniture did not pass validation.");
    for (const next of items) {
      if (!next.slug.startsWith("upload-") || !next.glbKey.startsWith(`homes/${userId}/`)) {
        throw new Error("Generated furniture must stay on your account.");
      }
      await upsert(ctx, { ...next, ownerId: userId, published: false });
    }
  },
});
