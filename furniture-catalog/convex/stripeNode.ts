"use node";

import Stripe from "stripe";
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { CREDIT_PACKS, isPlanId, type PlanId } from "./plans";

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Billing is not connected yet.");
  return new Stripe(key, { stripeContext: process.env.STRIPE_ACCOUNT_CONTEXT });
}

function priceId(plan: Exclude<PlanId, "studio">, interval: "month" | "year") {
  const env = `STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`;
  const value = process.env[env];
  if (!value) throw new Error("That plan is not available for checkout yet.");
  return value;
}

function packPriceId(packId: string) {
  const pack = CREDIT_PACKS.find((item) => item.id === packId);
  const value = process.env[`STRIPE_PRICE_CREDITS_${packId}`];
  if (!pack || !value) throw new Error("That credit pack is not available.");
  return { pack, price: value };
}

function siteOrigin(origin: string) {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    throw new Error("Open billing from the Homebuddy site.");
  }
  const allowed = process.env.APP_URL;
  const local = (url.hostname === "localhost" || url.hostname === "127.0.0.1") && url.protocol === "http:";
  if (!local && (!allowed || url.origin !== allowed)) throw new Error("Open billing from the Homebuddy site.");
  return url.origin;
}

export const startCheckout = action({
  args: {
    origin: v.string(),
    plan: v.optional(v.string()),
    interval: v.optional(v.union(v.literal("month"), v.literal("year"))),
    packId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ url: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in before checkout.");
    const account = await ctx.runQuery(api.account.me, {});
    if (!account) throw new Error("Your account is still being set up. Refresh and try again.");
    const origin = siteOrigin(args.origin);
    const stripe = stripeClient();
    let customerId = (await ctx.runQuery(api.account.profile, {}))?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: account.email || undefined,
        name: account.name || undefined,
        metadata: { userId, app: "homebuddy" },
      });
      customerId = customer.id;
      await ctx.runMutation(internal.billing.attachCustomer, { userId, customerId });
    }
    const interval = args.interval ?? "month";
    if (args.packId) {
      const { pack, price } = packPriceId(args.packId);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer: customerId,
        client_reference_id: userId,
        success_url: `${origin}/account?billing=credits`,
        cancel_url: `${origin}/account?billing=cancelled`,
        metadata: { userId, kind: "credits", credits: String(pack.credits) },
        line_items: [{ price, quantity: 1 }],
      });
      if (!session.url) throw new Error("Stripe did not return a checkout page.");
      return { url: session.url };
    }
    if (!args.plan || !isPlanId(args.plan) || args.plan === "studio") throw new Error("Choose a paid plan.");
    const plan = args.plan;
    const existing = (await ctx.runQuery(api.account.profile, {}))?.stripeSubscriptionId;
    if (existing) {
      const subscription = await stripe.subscriptions.retrieve(existing);
      const item = subscription.items.data[0];
      if (!item) throw new Error("The current subscription could not be updated.");
      await stripe.subscriptions.update(existing, {
        items: [{ id: item.id, price: priceId(plan, interval) }],
        proration_behavior: "create_prorations",
        metadata: { userId, plan, interval, app: "homebuddy" },
      });
      return { url: `${origin}/account?billing=updated` };
    }
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: userId,
      success_url: `${origin}/account?billing=subscribed`,
      cancel_url: `${origin}/pricing?billing=cancelled`,
      metadata: { userId, plan, interval, app: "homebuddy" },
      subscription_data: { metadata: { userId, plan, interval, app: "homebuddy" } },
      line_items: [{ price: priceId(plan, interval), quantity: 1 }],
    });
    if (!session.url) throw new Error("Stripe did not return a checkout page.");
    return { url: session.url };
  },
});

export const openPortal = action({
  args: { origin: v.string() },
  handler: async (ctx, args): Promise<{ url: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in to manage billing.");
    const profile = await ctx.runQuery(api.account.profile, {});
    if (!profile?.stripeCustomerId) throw new Error("Subscribe first, then you can open invoices and cancel here.");
    const origin = siteOrigin(args.origin);
    const session = await stripeClient().billingPortal.sessions.create({
      customer: profile.stripeCustomerId,
      return_url: `${origin}/account`,
      ...(process.env.STRIPE_PORTAL_CONFIGURATION ? { configuration: process.env.STRIPE_PORTAL_CONFIGURATION } : {}),
    });
    return { url: session.url };
  },
});

export const handleWebhook = internalAction({
  args: { body: v.string(), signature: v.string() },
  handler: async (ctx, { body, signature }) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) return { ok: false, error: "Webhook secret is not set." };
    const stripe = stripeClient();
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, secret);
    } catch {
      return { ok: false, error: "Invalid Stripe signature." };
    }
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      await ctx.runMutation(internal.billing.applyCheckout, {
        eventId: event.id,
        userId: session.metadata?.userId ?? session.client_reference_id ?? "",
        mode: session.mode ?? "",
        customerId: typeof session.customer === "string" ? session.customer : session.customer?.id ?? "",
        subscriptionId: typeof session.subscription === "string" ? session.subscription : "",
        plan: session.metadata?.plan ?? "",
        interval: session.metadata?.interval ?? "",
        credits: Number(session.metadata?.credits ?? 0),
        paymentStatus: session.payment_status,
      });
    }
    if (event.type === "invoice.paid") {
      const invoice = event.data.object;
      const reason = invoice.billing_reason;
      if (reason === "subscription_create" || reason === "subscription_cycle" || reason === "subscription_update") {
        const subscriptionId = subscriptionIdFromInvoice(invoice);
        let plan = "";
        let interval = "";
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          plan = subscription.metadata.plan ?? "";
          interval = subscription.metadata.interval ?? "";
        }
        await ctx.runMutation(internal.billing.applyInvoice, {
          eventId: event.id,
          customerId: typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? "",
          plan,
          interval,
          invoiceId: invoice.id,
          subscriptionId: subscriptionId ?? "",
        });
      }
    }
    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;
      await ctx.runMutation(internal.billing.applySubscription, {
        eventId: event.id,
        customerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
        subscriptionId: subscription.id,
        status: subscription.status,
        plan: subscription.metadata.plan ?? "",
        interval: subscription.metadata.interval ?? "",
        deleted: event.type === "customer.subscription.deleted",
      });
    }
    return { ok: true, error: "" };
  },
});

function subscriptionIdFromInvoice(invoice: Stripe.Invoice) {
  const details = invoice.parent?.type === "subscription_details" ? invoice.parent.subscription_details : null;
  const fromParent = details?.subscription;
  if (typeof fromParent === "string") return fromParent;
  if (fromParent && typeof fromParent === "object" && "id" in fromParent) return fromParent.id;
  const legacy = (invoice as Stripe.Invoice & { subscription?: string | { id: string } | null }).subscription;
  if (typeof legacy === "string") return legacy;
  return legacy?.id;
}
