import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

const interiorArgs = {
  slug: v.optional(v.string()),
  homeId: v.optional(v.id("homes")),
  userId: v.optional(v.id("users")),
  status: v.union(v.literal("ready"), v.literal("failed")),
  error: v.optional(v.string()),
  title: v.string(),
  subtitle: v.string(),
  beds: v.number(),
  sqft: v.number(),
  planJson: v.string(),
  listingJson: v.string(),
  floorPlanKey: v.optional(v.string()),
  downloadKey: v.optional(v.string()),
  layoutDownloadsJson: v.optional(v.string()),
  location: v.optional(v.string()),
  panoramaKey: v.optional(v.string()),
};

function present(row: {
  slug?: string;
  homeId?: Id<"homes">;
  status: "ready" | "failed";
  error?: string;
  title: string;
  subtitle: string;
  beds: number;
  sqft: number;
  planJson: string;
  listingJson: string;
  floorPlanKey?: string;
  downloadKey?: string;
  layoutDownloadsJson?: string;
  location?: string;
  panoramaKey?: string;
}) {
  return {
    ref: row.homeId ?? row.slug ?? "",
    slug: row.slug ?? null,
    homeId: row.homeId ?? null,
    status: row.status,
    error: row.error ?? "",
    title: row.title,
    subtitle: row.subtitle,
    beds: row.beds,
    sqft: row.sqft,
    plan: row.status === "ready" ? JSON.parse(row.planJson) : null,
    listing: JSON.parse(row.listingJson),
    floorPlan: row.floorPlanKey ? `/api/assets/${row.floorPlanKey}` : "",
    download: row.downloadKey ? `/api/assets/${row.downloadKey}` : "",
    layoutDownloads: row.layoutDownloadsJson
      ? Object.fromEntries(Object.entries(JSON.parse(row.layoutDownloadsJson) as Record<string, string>).map(([id, key]) => [id, `/api/assets/${key}`]))
      : undefined,
    location: row.location ?? "",
    panorama: row.panoramaKey === "" ? null : row.panoramaKey ? `/api/assets/${row.panoramaKey}` : undefined,
  };
}

async function byRef(ctx: QueryCtx | MutationCtx, ref: string) {
  const bySlug = await ctx.db.query("interiors").withIndex("by_slug", (q) => q.eq("slug", ref)).unique();
  if (bySlug) return bySlug;
  const homeId = ctx.db.normalizeId("homes", ref);
  if (!homeId) return null;
  return await ctx.db.query("interiors").withIndex("by_home", (q) => q.eq("homeId", homeId)).unique();
}

export const get = query({
  args: { ref: v.string() },
  handler: async (ctx, { ref }) => {
    const row = await byRef(ctx, ref);
    if (!row) return null;
    if (row.userId) {
      const userId = await getAuthUserId(ctx);
      if (userId !== row.userId) return null;
    }
    return present(row);
  },
});

export const save = internalMutation({
  args: interiorArgs,
  handler: async (ctx, args) => {
    if (args.planJson.length > 900_000 || args.listingJson.length > 200_000) throw new Error("Interior plan is too large.");
    const existing = args.homeId
      ? await ctx.db.query("interiors").withIndex("by_home", (q) => q.eq("homeId", args.homeId)).unique()
      : args.slug
        ? await ctx.db.query("interiors").withIndex("by_slug", (q) => q.eq("slug", args.slug)).unique()
        : null;
    const row = { ...args, updatedAt: Date.now() };
    if (existing) await ctx.db.patch(existing._id, row);
    else await ctx.db.insert("interiors", row);
  },
});
