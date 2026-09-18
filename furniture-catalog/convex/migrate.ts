import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const pending = internalQuery({
  args: {},
  handler: async (ctx) => {
    const files = await ctx.db.query("homeFiles").collect();
    const furniture = await ctx.db.query("customFurniture").collect();
    const pendingFiles = [];
    for (const file of files) {
      if (file.assetKey || !file.storageId) continue;
      pendingFiles.push({
        id: file._id,
        userId: file.userId,
        fileName: file.fileName,
        contentType: file.contentType,
        url: await ctx.storage.getUrl(file.storageId),
      });
    }
    const pendingFurniture = [];
    for (const row of furniture) {
      if (row.glbKey || !row.glbStorageId) continue;
      pendingFurniture.push({
        id: row._id,
        userId: row.userId,
        name: row.name,
        glbUrl: await ctx.storage.getUrl(row.glbStorageId),
        previewUrl: row.previewStorageId ? await ctx.storage.getUrl(row.previewStorageId) : null,
      });
    }
    return { files: pendingFiles, furniture: pendingFurniture };
  },
});

export const attachFile = internalMutation({
  args: { id: v.id("homeFiles"), assetKey: v.string() },
  handler: async (ctx, { id, assetKey }) => {
    const file = await ctx.db.get(id);
    if (!file || file.assetKey) return;
    await ctx.db.patch(id, { assetKey });
    if (file.storageId) await ctx.storage.delete(file.storageId);
  },
});

export const attachFurniture = internalMutation({
  args: { id: v.id("customFurniture"), glbKey: v.string(), previewKey: v.optional(v.string()) },
  handler: async (ctx, { id, glbKey, previewKey }) => {
    const row = await ctx.db.get(id);
    if (!row || row.glbKey) return;
    await ctx.db.patch(id, { glbKey, previewKey });
    if (row.glbStorageId) await ctx.storage.delete(row.glbStorageId);
    if (row.previewStorageId) await ctx.storage.delete(row.previewStorageId);
  },
});
