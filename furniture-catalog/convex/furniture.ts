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
      glbUrl: await ctx.storage.getUrl(row.glbStorageId),
      previewUrl: row.previewStorageId ? await ctx.storage.getUrl(row.previewStorageId) : null,
    })));
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const save = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    widthCm: v.number(),
    depthCm: v.number(),
    heightCm: v.number(),
    glbStorageId: v.id("_storage"),
    previewStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const profile = await profileFor(ctx, userId);
    const name = args.name.trim();
    if (name.length < 2 || name.length > 80) throw new Error("Name the model in 2 to 80 characters.");
    if (![args.widthCm, args.depthCm, args.heightCm].every((n) => n >= 5 && n <= 500)) {
      throw new Error("Enter width, depth, and height in centimeters, between 5 and 500.");
    }
    const glb = await ctx.storage.getMetadata(args.glbStorageId);
    if (!glb) throw new Error("The model did not finish uploading.");
    if (glb.size > 30 * 1024 * 1024) {
      await ctx.storage.delete(args.glbStorageId);
      throw new Error("Keep the model under 30 MB.");
    }
    const contentType = glb.contentType ?? "";
    if (contentType.startsWith("image/") || contentType === "application/pdf" || contentType.startsWith("video/")) {
      await ctx.storage.delete(args.glbStorageId);
      throw new Error("Upload a GLB model, not a photo or PDF.");
    }
    if (args.previewStorageId) {
      const preview = await ctx.storage.getMetadata(args.previewStorageId);
      if (!preview || preview.size > 8 * 1024 * 1024) {
        await ctx.storage.delete(args.previewStorageId);
        throw new Error("The preview image needs to be under 8 MB.");
      }
    }
    const id = await ctx.db.insert("customFurniture", {
      userId,
      name,
      category: args.category.trim().slice(0, 40) || "Your models",
      widthM: args.widthCm / 100,
      depthM: args.depthCm / 100,
      heightM: args.heightCm / 100,
      glbStorageId: args.glbStorageId,
      previewStorageId: args.previewStorageId,
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
    await ctx.storage.delete(row.glbStorageId);
    if (row.previewStorageId) await ctx.storage.delete(row.previewStorageId);
    await ctx.db.delete(row._id);
  },
});
