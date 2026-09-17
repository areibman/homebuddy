import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { profileFor, requireUserId } from "./credits";
import { PLANS, type PlanId } from "./plans";

const SAMPLES = new Set(["15", "13", "flowhouse-wb1"]);
const FLOOR_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);
const PHOTO_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const homes = await ctx.db.query("homes").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    const files = await Promise.all(homes.map((home) => ctx.db.query("homeFiles").withIndex("by_home", (q) => q.eq("homeId", home._id)).collect()));
    return homes
      .map((home, index) => {
        const own = files[index];
        return {
          id: home._id,
          name: home.name,
          place: home.place ?? "",
          notes: home.notes ?? "",
          sampleId: home.sampleId ?? null,
          style: home.style ?? "Scandinavian",
          createdAt: home.createdAt,
          floorPlans: own.filter((file) => file.kind === "floor_plan").length,
          photos: own.filter((file) => file.kind === "photo").length,
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const get = query({
  args: { homeId: v.id("homes") },
  handler: async (ctx, { homeId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const home = await ctx.db.get(homeId);
    if (!home || home.userId !== userId) return null;
    const files = await ctx.db.query("homeFiles").withIndex("by_home", (q) => q.eq("homeId", homeId)).collect();
    const arrangements = await ctx.db.query("arrangements").withIndex("by_home", (q) => q.eq("homeId", homeId)).collect();
    return {
      id: home._id,
      name: home.name,
      place: home.place ?? "",
      notes: home.notes ?? "",
      sampleId: home.sampleId ?? null,
      style: home.style ?? "Scandinavian",
      createdAt: home.createdAt,
      files: await Promise.all(files.sort((a, b) => b.createdAt - a.createdAt).map(async (file) => ({
        id: file._id,
        kind: file.kind,
        fileName: file.fileName,
        contentType: file.contentType,
        size: file.size,
        createdAt: file.createdAt,
        url: await ctx.storage.getUrl(file.storageId),
      }))),
      arrangements: arrangements.sort((a, b) => b.createdAt - a.createdAt).map((row) => ({
        id: row._id,
        style: row.style,
        status: row.status,
        summary: row.summary ?? "",
        creditsCharged: row.creditsCharged,
        createdAt: row.createdAt,
        pieces: row.pieces ?? [],
      })),
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    place: v.optional(v.string()),
    notes: v.optional(v.string()),
    sampleId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const profile = await profileFor(ctx, userId);
    const name = args.name.trim();
    if (name.length < 2 || name.length > 80) throw new Error("Name the home in 2 to 80 characters.");
    const place = args.place?.trim().slice(0, 80) || undefined;
    const notes = args.notes?.trim().slice(0, 2000) || undefined;
    const sampleId = args.sampleId?.trim();
    if (sampleId && !SAMPLES.has(sampleId)) throw new Error("That sample floor plan is not available.");
    const homes = await ctx.db.query("homes").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    const limit = PLANS[profile.plan as PlanId].homes;
    if (homes.length >= limit) {
      throw new Error(`${PLANS[profile.plan as PlanId].label} includes ${limit} ${limit === 1 ? "home" : "homes"}. Upgrade to add another.`);
    }
    return await ctx.db.insert("homes", {
      userId,
      name,
      place,
      notes,
      sampleId,
      style: "Scandinavian",
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    homeId: v.id("homes"),
    name: v.optional(v.string()),
    place: v.optional(v.string()),
    notes: v.optional(v.string()),
    style: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const home = await ctx.db.get(args.homeId);
    if (!home || home.userId !== userId) throw new Error("That home is not on your account.");
    const patch: { name?: string; place?: string; notes?: string; style?: string } = {};
    if (args.name !== undefined) {
      const name = args.name.trim();
      if (name.length < 2 || name.length > 80) throw new Error("Name the home in 2 to 80 characters.");
      patch.name = name;
    }
    if (args.place !== undefined) patch.place = args.place.trim().slice(0, 80);
    if (args.notes !== undefined) patch.notes = args.notes.trim().slice(0, 2000);
    if (args.style !== undefined) {
      const style = args.style.trim();
      if (style.length < 2 || style.length > 40) throw new Error("Choose a style name.");
      patch.style = style;
    }
    await ctx.db.patch(home._id, patch);
  },
});

export const remove = mutation({
  args: { homeId: v.id("homes") },
  handler: async (ctx, { homeId }) => {
    const userId = await requireUserId(ctx);
    const home = await ctx.db.get(homeId);
    if (!home || home.userId !== userId) throw new Error("That home is not on your account.");
    const files = await ctx.db.query("homeFiles").withIndex("by_home", (q) => q.eq("homeId", homeId)).collect();
    for (const file of files) {
      await ctx.storage.delete(file.storageId);
      await ctx.db.delete(file._id);
    }
    const arrangements = await ctx.db.query("arrangements").withIndex("by_home", (q) => q.eq("homeId", homeId)).collect();
    for (const row of arrangements) await ctx.db.delete(row._id);
    await ctx.db.delete(home._id);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveFile = mutation({
  args: {
    homeId: v.id("homes"),
    storageId: v.id("_storage"),
    kind: v.union(v.literal("floor_plan"), v.literal("photo")),
    fileName: v.string(),
    contentType: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const home = await ctx.db.get(args.homeId);
    if (!home || home.userId !== userId) throw new Error("That home is not on your account.");
    const allowed = args.kind === "floor_plan" ? FLOOR_TYPES : PHOTO_TYPES;
    if (!allowed.has(args.contentType)) {
      throw new Error(args.kind === "floor_plan" ? "Floor plans need to be PNG, JPG, WebP, or PDF." : "Photos need to be PNG, JPG, or WebP.");
    }
    const metadata = await ctx.storage.getMetadata(args.storageId);
    if (!metadata) throw new Error("The file did not finish uploading.");
    if (metadata.size > 20 * 1024 * 1024) {
      await ctx.storage.delete(args.storageId);
      throw new Error("Keep each file under 20 MB.");
    }
    const files = await ctx.db.query("homeFiles").withIndex("by_home", (q) => q.eq("homeId", args.homeId)).collect();
    const same = files.filter((file) => file.kind === args.kind);
    const limit = args.kind === "floor_plan" ? 8 : 24;
    if (same.length >= limit) {
      await ctx.storage.delete(args.storageId);
      throw new Error(args.kind === "floor_plan" ? "This home already has 8 floor plans." : "This home already has 24 photos.");
    }
    return await ctx.db.insert("homeFiles", {
      homeId: args.homeId,
      userId,
      kind: args.kind,
      storageId: args.storageId,
      fileName: args.fileName.trim().slice(0, 180) || "upload",
      contentType: args.contentType,
      size: metadata.size,
      createdAt: Date.now(),
    });
  },
});

export const removeFile = mutation({
  args: { fileId: v.id("homeFiles") },
  handler: async (ctx, { fileId }) => {
    const userId = await requireUserId(ctx);
    const file = await ctx.db.get(fileId);
    if (!file || file.userId !== userId) throw new Error("That file is not on your account.");
    await ctx.storage.delete(file.storageId);
    await ctx.db.delete(file._id);
  },
});
