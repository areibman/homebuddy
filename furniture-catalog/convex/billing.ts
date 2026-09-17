import { v } from "convex/values";
import { internalMutation, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { applyCredits } from "./credits";
import { creditGrant, isPlanId, type PlanId } from "./plans";

async function claimEvent(ctx: MutationCtx, eventId: string) {
  const prior = await ctx.db.query("stripeEvents").withIndex("by_event", (q) => q.eq("eventId", eventId)).unique();
  if (prior) return false;
  await ctx.db.insert("stripeEvents", { eventId, createdAt: Date.now() });
  return true;
}

export const attachCustomer = internalMutation({
  args: { userId: v.id("users"), customerId: v.string() },
  handler: async (ctx, { userId, customerId }) => {
    const profile = await ctx.db.query("profiles").withIndex("by_user", (q) => q.eq("userId", userId)).unique();
    if (!profile) throw new Error("Account not found.");
    if (!profile.stripeCustomerId) await ctx.db.patch(profile._id, { stripeCustomerId: customerId });
  },
});

export const applyCheckout = internalMutation({
  args: {
    eventId: v.string(),
    userId: v.string(),
    mode: v.string(),
    customerId: v.string(),
    subscriptionId: v.string(),
    plan: v.string(),
    interval: v.string(),
    credits: v.number(),
    paymentStatus: v.string(),
  },
  handler: async (ctx, args) => {
    if (!(await claimEvent(ctx, args.eventId))) return;
    const userId = args.userId as Id<"users">;
    const profile = await ctx.db.query("profiles").withIndex("by_user", (q) => q.eq("userId", userId)).unique();
    if (!profile) return;
    const patch: {
      stripeCustomerId?: string;
      stripeSubscriptionId?: string;
      subscriptionStatus?: string;
      plan?: PlanId;
      interval?: "month" | "year";
    } = {};
    if (args.customerId) patch.stripeCustomerId = args.customerId;
    if (args.mode === "subscription" && isPlanId(args.plan)) {
      patch.plan = args.plan;
      patch.interval = args.interval === "year" ? "year" : "month";
      patch.subscriptionStatus = "active";
      if (args.subscriptionId) patch.stripeSubscriptionId = args.subscriptionId;
    }
    if (Object.keys(patch).length) await ctx.db.patch(profile._id, patch);
    if (args.mode === "payment" && args.paymentStatus === "paid" && args.credits > 0) {
      const fresh = (await ctx.db.get(profile._id))!;
      await applyCredits(ctx, fresh, args.credits, "credit pack", `pack:${args.eventId}`);
    }
  },
});

export const applyInvoice = internalMutation({
  args: {
    eventId: v.string(),
    customerId: v.string(),
    plan: v.string(),
    interval: v.string(),
    invoiceId: v.string(),
    subscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!(await claimEvent(ctx, args.eventId))) return;
    const profile = await ctx.db.query("profiles").withIndex("by_customer", (q) => q.eq("stripeCustomerId", args.customerId)).unique();
    if (!profile) return;
    const plan = isPlanId(args.plan) ? args.plan : profile.plan as PlanId;
    const interval = args.interval === "year" ? "year" : args.interval === "month" ? "month" : profile.interval ?? "month";
    await ctx.db.patch(profile._id, {
      plan,
      interval,
      subscriptionStatus: "active",
      ...(args.subscriptionId ? { stripeSubscriptionId: args.subscriptionId } : {}),
    });
    const grant = creditGrant(plan, interval);
    if (grant > 0) {
      const fresh = (await ctx.db.get(profile._id))!;
      await applyCredits(ctx, fresh, grant, `${plan} credits`, `invoice:${args.invoiceId}`);
    }
  },
});

export const applySubscription = internalMutation({
  args: {
    eventId: v.string(),
    customerId: v.string(),
    subscriptionId: v.string(),
    status: v.string(),
    plan: v.string(),
    interval: v.string(),
    deleted: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!(await claimEvent(ctx, args.eventId))) return;
    const profile = await ctx.db.query("profiles").withIndex("by_customer", (q) => q.eq("stripeCustomerId", args.customerId)).unique();
    if (!profile) return;
    if (args.deleted || args.status === "canceled") {
      await ctx.db.patch(profile._id, {
        plan: "studio",
        interval: undefined,
        stripeSubscriptionId: undefined,
        subscriptionStatus: "canceled",
      });
      return;
    }
    const plan = isPlanId(args.plan) ? args.plan : profile.plan;
    await ctx.db.patch(profile._id, {
      plan,
      interval: args.interval === "year" ? "year" : args.interval === "month" ? "month" : profile.interval,
      stripeSubscriptionId: args.subscriptionId,
      subscriptionStatus: args.status,
    });
  },
});
