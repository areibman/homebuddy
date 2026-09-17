import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { creditCap, type PlanId } from "./plans";

export async function requireUserId(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Sign in to continue.");
  return userId;
}

export async function profileFor(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  const profile = await ctx.db.query("profiles").withIndex("by_user", (q) => q.eq("userId", userId)).unique();
  if (!profile) throw new Error("Your account is still being set up. Refresh and try again.");
  return profile;
}

export async function applyCredits(
  ctx: MutationCtx,
  profile: Doc<"profiles">,
  delta: number,
  reason: string,
  ref?: string,
) {
  if (ref) {
    const prior = await ctx.db.query("creditLedger").withIndex("by_ref", (q) => q.eq("ref", ref)).unique();
    if (prior) return prior;
  }
  if (delta < 0 && profile.credits + delta < 0) {
    throw new Error(`This uses ${Math.abs(delta)} credits. You have ${profile.credits}.`);
  }
  const cap = creditCap(profile.plan as PlanId, profile.interval);
  const next = delta > 0 ? Math.min(cap, profile.credits + delta) : profile.credits + delta;
  const applied = next - profile.credits;
  await ctx.db.patch(profile._id, { credits: next });
  const id = await ctx.db.insert("creditLedger", {
    userId: profile.userId,
    delta: applied,
    reason,
    ref,
    createdAt: Date.now(),
  });
  return await ctx.db.get(id);
}
