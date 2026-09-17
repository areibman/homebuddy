import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { profileFor } from "./credits";
import { PLANS, type PlanId } from "./plans";

export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    const profile = await ctx.db.query("profiles").withIndex("by_user", (q) => q.eq("userId", userId)).unique();
    if (!user || !profile) return null;
    const homes = await ctx.db.query("homes").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    const plan = PLANS[profile.plan as PlanId];
    return {
      userId,
      name: user.name ?? "",
      email: user.email ?? "",
      plan: profile.plan,
      planLabel: plan.label,
      interval: profile.interval ?? null,
      credits: profile.credits,
      homeCount: homes.length,
      homeLimit: plan.homes,
      subscriptionStatus: profile.subscriptionStatus ?? null,
      hasBilling: Boolean(profile.stripeCustomerId),
    };
  },
});

export const ledger = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db.query("creditLedger").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, 20).map((row) => ({
      id: row._id,
      delta: row.delta,
      reason: row.reason,
      createdAt: row.createdAt,
    }));
  },
});

export const updateName = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in to update your account.");
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 80) throw new Error("Use a name between 1 and 80 characters.");
    await ctx.db.patch(userId, { name: trimmed });
  },
});

export const profile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await profileFor(ctx, userId).catch(() => null);
  },
});
