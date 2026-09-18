import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { profileFor, requireUserId } from "./credits";
import { PLANS, type PlanId } from "./plans";

const LEASE_MS = 50 * 60 * 1000;

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const jobs = await ctx.db.query("generationJobs").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    return jobs.sort((a, b) => b.createdAt - a.createdAt).slice(0, 20).map((job) => ({
      id: job._id,
      homeId: job.homeId ?? null,
      name: job.name,
      status: job.status,
      error: job.error ?? "",
      assetCount: job.assetCount ?? 0,
      interiorStatus: job.interiorStatus ?? null,
      createdAt: job.createdAt,
    }));
  },
});

export const forHome = query({
  args: { homeId: v.id("homes") },
  handler: async (ctx, { homeId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const home = await ctx.db.get(homeId);
    if (!home || home.userId !== userId) return [];
    const jobs = await ctx.db.query("generationJobs").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    return jobs.filter((job) => job.homeId === homeId).sort((a, b) => b.createdAt - a.createdAt).slice(0, 5).map((job) => ({
      id: job._id,
      status: job.status,
      error: job.error ?? "",
      assetCount: job.assetCount ?? 0,
      interiorStatus: job.interiorStatus ?? null,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    }));
  },
});

export const enqueue = mutation({
  args: {
    name: v.string(),
    notes: v.optional(v.string()),
    idempotencyKey: v.string(),
    inputKeys: v.array(v.string()),
    homeId: v.optional(v.id("homes")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const name = args.name.trim();
    if (name.length < 2 || name.length > 100) throw new Error("Add a project name up to 100 characters.");
    if ((args.notes?.length ?? 0) > 2000) throw new Error("Notes need to stay under 2,000 characters.");
    if (!/^[a-zA-Z0-9-]{16,80}$/.test(args.idempotencyKey)) throw new Error("Missing upload request ID.");
    if (!args.inputKeys.length || args.inputKeys.length > 20) throw new Error("Choose 1–20 floor plans, photos, or videos.");
    const prefix = `homes/${userId}/`;
    if (args.inputKeys.some((key) => !key.startsWith(prefix))) throw new Error("Those uploads are not on your account.");
    const existing = await ctx.db.query("generationJobs").withIndex("by_idempotency", (q) => q.eq("idempotencyKey", args.idempotencyKey)).unique();
    if (existing) {
      if (existing.userId !== userId) throw new Error("That upload is already assigned.");
      return { jobId: existing._id, homeId: existing.homeId ?? null };
    }
    const waiting = (await ctx.db.query("generationJobs").withIndex("by_status", (q) => q.eq("status", "queued")).collect())
      .concat(await ctx.db.query("generationJobs").withIndex("by_status", (q) => q.eq("status", "running")).collect())
      .filter((job) => job.userId === userId);
    if (waiting.length >= 5) throw new Error("Five uploads are already waiting. Try again after one finishes.");
    let homeId = args.homeId;
    if (homeId) {
      const home = await ctx.db.get(homeId);
      if (!home || home.userId !== userId) throw new Error("That home is not on your account.");
      const active = waiting.find((job) => job.homeId === homeId);
      if (active) return { jobId: active._id, homeId };
    } else {
      const profile = await profileFor(ctx, userId);
      const homes = await ctx.db.query("homes").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
      const limit = PLANS[profile.plan as PlanId].homes;
      if (homes.length >= limit) {
        throw new Error(`${PLANS[profile.plan as PlanId].label} includes ${limit} ${limit === 1 ? "home" : "homes"}. Upgrade to add another.`);
      }
      homeId = await ctx.db.insert("homes", { userId, name, notes: args.notes?.trim() || undefined, style: "Scandinavian", createdAt: Date.now() });
    }
    const now = Date.now();
    const jobId = await ctx.db.insert("generationJobs", {
      userId,
      homeId,
      idempotencyKey: args.idempotencyKey,
      name,
      notes: args.notes?.trim() || undefined,
      status: "queued",
      inputKeys: args.inputKeys,
      createdAt: now,
      updatedAt: now,
    });
    return { jobId, homeId };
  },
});

export const claim = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const queued = await ctx.db.query("generationJobs").withIndex("by_status", (q) => q.eq("status", "queued")).collect();
    const running = await ctx.db.query("generationJobs").withIndex("by_status", (q) => q.eq("status", "running")).collect();
    const next = queued.sort((a, b) => a.createdAt - b.createdAt)[0]
      ?? running.find((job) => (job.leaseUntil ?? 0) < now);
    if (!next) return null;
    await ctx.db.patch(next._id, { status: "running", updatedAt: now, leaseUntil: now + LEASE_MS, error: undefined });
    return {
      id: next._id,
      userId: next.userId,
      homeId: next.homeId ?? null,
      name: next.name,
      notes: next.notes ?? "",
      inputKeys: next.inputKeys,
    };
  },
});

export const failLeased = internalMutation({
  args: {},
  handler: async (ctx) => {
    const running = await ctx.db.query("generationJobs").withIndex("by_status", (q) => q.eq("status", "running")).collect();
    const validating = await ctx.db.query("generationJobs").withIndex("by_status", (q) => q.eq("status", "validating")).collect();
    for (const job of [...running, ...validating]) {
      await ctx.db.patch(job._id, {
        status: "failed",
        error: "Generation was interrupted when the worker restarted. Upload again to retry.",
        updatedAt: Date.now(),
        leaseUntil: undefined,
      });
    }
  },
});

const publishedItem = v.object({
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
});

export const complete = internalMutation({
  args: {
    jobId: v.id("generationJobs"),
    items: v.array(publishedItem),
    interior: v.optional(v.object({
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
    })),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new Error("That generation job is gone.");
    for (const item of args.items) {
      const existing = await ctx.db.query("catalogItems").withIndex("by_slug", (q) => q.eq("slug", item.slug)).unique();
      const row = { ...item, ownerId: job.userId, published: false, createdAt: existing?.createdAt ?? Date.now() };
      if (existing) await ctx.db.patch(existing._id, row);
      else await ctx.db.insert("catalogItems", row);
    }
    let interiorStatus: "ready" | "failed" | undefined;
    if (args.interior && job.homeId) {
      interiorStatus = args.interior.status;
      const existing = await ctx.db.query("interiors").withIndex("by_home", (q) => q.eq("homeId", job.homeId)).unique();
      const row = {
        homeId: job.homeId,
        userId: job.userId,
        status: args.interior.status,
        error: args.interior.error,
        title: args.interior.title,
        subtitle: args.interior.subtitle,
        beds: args.interior.beds,
        sqft: args.interior.sqft,
        planJson: args.interior.planJson,
        listingJson: args.interior.listingJson,
        floorPlanKey: args.interior.floorPlanKey,
        downloadKey: args.interior.downloadKey,
        updatedAt: Date.now(),
      };
      if (existing) await ctx.db.patch(existing._id, row);
      else await ctx.db.insert("interiors", row);
    }
    await ctx.db.patch(job._id, {
      status: "completed",
      assetCount: args.items.length,
      interiorStatus,
      error: args.interior?.status === "failed" ? args.interior.error : undefined,
      updatedAt: Date.now(),
      leaseUntil: undefined,
    });
  },
});

export const fail = internalMutation({
  args: { jobId: v.id("generationJobs"), error: v.string() },
  handler: async (ctx, { jobId, error }) => {
    const job = await ctx.db.get(jobId);
    if (!job || job.status === "completed") return;
    await ctx.db.patch(jobId, { status: "failed", error: error.slice(0, 400), updatedAt: Date.now(), leaseUntil: undefined });
  },
});

export type ClaimedJob = {
  id: Id<"generationJobs">;
  userId: Id<"users">;
  homeId: Id<"homes"> | null;
  name: string;
  notes: string;
  inputKeys: string[];
};
