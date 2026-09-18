import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { applyCredits, profileFor, requireUserId } from "./credits";
import { ARRANGEMENT_COST } from "./plans";

async function owned(ctx: MutationCtx, homeId: Id<"homes">, userId: Id<"users">) {
  const home = await ctx.db.get(homeId);
  if (!home || home.userId !== userId) throw new Error("That home is not on your account.");
  return home;
}

export const reserve = mutation({
  args: {
    homeId: v.id("homes"),
    style: v.string(),
    prompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const home = await owned(ctx, args.homeId, userId);
    const profile = await profileFor(ctx, userId);
    const style = args.style.trim();
    if (style.length < 2 || style.length > 40) throw new Error("Choose a style.");
    const id = await ctx.db.insert("arrangements", {
      userId,
      homeId: home._id,
      style,
      prompt: args.prompt?.trim().slice(0, 500) || undefined,
      creditsCharged: ARRANGEMENT_COST,
      status: "reserved",
      createdAt: Date.now(),
    });
    await applyCredits(ctx, profile, -ARRANGEMENT_COST, "arrangement", `spend:${id}`);
    return id;
  },
});

export const markRunning = mutation({
  args: { arrangementId: v.id("arrangements") },
  handler: async (ctx, { arrangementId }) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(arrangementId);
    if (!row || row.userId !== userId) throw new Error("That arrangement is not on your account.");
    if (row.status === "running" || row.status === "completed") return row.status;
    if (row.status !== "reserved") throw new Error("This arrangement is no longer available to run.");
    await ctx.db.patch(row._id, { status: "running" });
    return "running";
  },
});

export const complete = mutation({
  args: {
    arrangementId: v.id("arrangements"),
    summary: v.string(),
    pieces: v.optional(v.array(v.object({
      id: v.string(),
      quantity: v.number(),
      reason: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(args.arrangementId);
    if (!row || row.userId !== userId) throw new Error("That arrangement is not on your account.");
    if (row.status === "completed") return;
    if (row.status === "refunded") throw new Error("This arrangement was refunded.");
    await ctx.db.patch(row._id, {
      status: "completed",
      summary: args.summary.slice(0, 1200),
      pieces: args.pieces?.slice(0, 40),
    });
  },
});

export const get = query({
  args: { arrangementId: v.id("arrangements") },
  handler: async (ctx, { arrangementId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const row = await ctx.db.get(arrangementId);
    if (!row || row.userId !== userId) return null;
    return {
      id: row._id,
      homeId: row.homeId,
      layoutStatus: row.layoutStatus ?? null,
      openaiResponseId: row.openaiResponseId ?? null,
      summary: row.summary ?? "",
      selection: row.selection ?? [],
      placements: row.placements ?? [],
      unplaced: row.unplaced ?? [],
      attempt: row.attempt ?? 0,
      issues: row.issues ?? [],
    };
  },
});

export const latest = query({
  args: { homeId: v.id("homes") },
  handler: async (ctx, { homeId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const home = await ctx.db.get(homeId);
    if (!home || home.userId !== userId) return null;
    const rows = await ctx.db.query("arrangements").withIndex("by_home", (q) => q.eq("homeId", homeId)).collect();
    const row = rows.filter((item) => item.openaiResponseId || item.layoutStatus).sort((a, b) => b.createdAt - a.createdAt)[0];
    if (!row) return null;
    return {
      id: row._id,
      status: row.status,
      layoutStatus: row.layoutStatus ?? null,
      openaiResponseId: row.openaiResponseId ?? null,
      summary: row.summary ?? "",
      selection: row.selection ?? [],
      placements: row.placements ?? [],
      unplaced: row.unplaced ?? [],
      attempt: row.attempt ?? 0,
      issues: row.issues ?? [],
      createdAt: row.createdAt,
    };
  },
});

export const saveLayout = mutation({
  args: {
    arrangementId: v.id("arrangements"),
    openaiResponseId: v.optional(v.string()),
    layoutStatus: v.string(),
    selection: v.optional(v.array(v.object({ id: v.string(), quantity: v.number() }))),
    placements: v.optional(v.array(v.object({
      id: v.string(),
      instanceId: v.string(),
      x: v.number(),
      z: v.number(),
      r: v.number(),
    }))),
    unplaced: v.optional(v.array(v.object({ instanceId: v.string(), reason: v.string() }))),
    summary: v.optional(v.string()),
    attempt: v.optional(v.number()),
    issues: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const row = await ctx.db.get(args.arrangementId);
    if (!row || row.userId !== userId) throw new Error("That arrangement is not on your account.");
    await ctx.db.patch(row._id, {
      openaiResponseId: args.openaiResponseId ?? row.openaiResponseId,
      layoutStatus: args.layoutStatus.slice(0, 40),
      selection: args.selection?.slice(0, 40) ?? row.selection,
      placements: args.placements?.slice(0, 80),
      unplaced: args.unplaced?.slice(0, 40),
      summary: args.summary?.slice(0, 1200) ?? row.summary,
      attempt: args.attempt,
      issues: args.issues?.slice(0, 40),
    });
  },
});

export const refund = mutation({
  args: { arrangementId: v.id("arrangements"), reason: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in to continue.");
    const row = await ctx.db.get(args.arrangementId);
    if (!row || row.userId !== userId) throw new Error("That arrangement is not on your account.");
    if (row.status === "completed" || row.status === "refunded") return;
    const profile = await profileFor(ctx, userId);
    await applyCredits(ctx, profile, row.creditsCharged, "arrangement refund", `refund:${row._id}`);
    await ctx.db.patch(row._id, { status: "refunded", summary: args.reason.slice(0, 400) });
  },
});
