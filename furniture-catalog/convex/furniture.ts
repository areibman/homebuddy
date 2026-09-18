import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { applyCredits, profileFor, requireUserId } from "./credits";
import { CUSTOM_FURNITURE_COST } from "./plans";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db.query("customFurniture").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    return await Promise.all(rows.sort((a, b) => b.createdAt - a.createdAt).map(async (row) => ({
      id: row._id,
      name: row.name,
      category: row.category,
      widthM: row.widthM,
      depthM: row.depthM,
      heightM: row.heightM,
      creditsCharged: row.creditsCharged,
      createdAt: row.createdAt,
      glbKey: row.glbKey ?? null,
      previewKey: row.previewKey ?? null,
      glbUrl: row.glbKey ? null : row.glbStorageId ? await ctx.storage.getUrl(row.glbStorageId) : null,
      previewUrl: row.previewKey ? null : row.previewStorageId ? await ctx.storage.getUrl(row.previewStorageId) : null,
    })));
  },
});

export const save = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    widthCm: v.number(),
    depthCm: v.number(),
    heightCm: v.number(),
    glbKey: v.string(),
    previewKey: v.optional(v.string()),
    glbSize: v.number(),
    contentType: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const profile = await profileFor(ctx, userId);
    const name = args.name.trim();
    if (name.length < 2 || name.length > 80) throw new Error("Name the model in 2 to 80 characters.");
    if (![args.widthCm, args.depthCm, args.heightCm].every((n) => n >= 5 && n <= 500)) {
      throw new Error("Enter width, depth, and height in centimeters, between 5 and 500.");
    }
    const prefix = `homes/${userId}/`;
    if (!args.glbKey.startsWith(prefix) || (args.previewKey && !args.previewKey.startsWith(prefix))) {
      throw new Error("The model did not finish uploading.");
    }
    if (args.glbSize > 30 * 1024 * 1024) throw new Error("Keep the model under 30 MB.");
    if (args.contentType.startsWith("image/") || args.contentType === "application/pdf" || args.contentType.startsWith("video/")) {
      throw new Error("Upload a GLB model, not a photo or PDF.");
    }
    const id = await ctx.db.insert("customFurniture", {
      userId,
      name,
      category: args.category.trim().slice(0, 40) || "Your models",
      widthM: args.widthCm / 100,
      depthM: args.depthCm / 100,
      heightM: args.heightCm / 100,
      glbKey: args.glbKey,
      previewKey: args.previewKey,
      creditsCharged: CUSTOM_FURNITURE_COST,
      createdAt: Date.now(),
    });
    await applyCredits(ctx, profile, -CUSTOM_FURNITURE_COST, "custom furniture", `furniture:${id}`);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("customFurniture") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(id);
    if (!row || row.userId !== userId) throw new Error("That model is not on your account.");
    if (row.glbStorageId) await ctx.storage.delete(row.glbStorageId);
    if (row.previewStorageId) await ctx.storage.delete(row.previewStorageId);
    await ctx.db.delete(row._id);
    return { keys: [row.glbKey, row.previewKey].filter((key): key is string => Boolean(key)) };
  },
});
