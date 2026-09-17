import Stripe from "stripe";
import { spawnSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";

const key = process.env.STRIPE_API_KEY;
if (!key) throw new Error("STRIPE_API_KEY is not set");
const stripe = new Stripe(key, { stripeContext: "acct_1SEoFvROY1TlKkba" });

const plans = [
  ["residence", "Homebuddy Residence", "Three homes and 250 credits a month.", 2900, 22800],
  ["atelier", "Homebuddy Atelier", "Ten homes and 1,000 credits a month.", 7900, 46800],
  ["estate", "Homebuddy Estate", "Twenty-five homes and 4,000 credits a month.", 19900, 118800],
];
const packs = [
  ["100", "Homebuddy 100 credits", "One-time pack of 100 arrangement and upload credits.", 1500],
  ["400", "Homebuddy 400 credits", "One-time pack of 400 arrangement and upload credits.", 4800],
];

async function productFor(productKey, name, description) {
  const listed = await stripe.products.search({ query: `metadata['homebuddy_key']:'${productKey}'`, limit: 1 });
  if (listed.data[0]) return listed.data[0];
  return stripe.products.create({ name, description, metadata: { app: "homebuddy", homebuddy_key: productKey } });
}

async function recurringPrice(productId, amount, interval, lookup) {
  const existing = await stripe.prices.list({ product: productId, active: true, limit: 20 });
  const found = existing.data.find((price) => price.lookup_key === lookup);
  if (found) return found;
  return stripe.prices.create({
    product: productId,
    unit_amount: amount,
    currency: "usd",
    recurring: { interval },
    lookup_key: lookup,
    metadata: { app: "homebuddy" },
  });
}

async function oneTimePrice(productId, amount, lookup) {
  const existing = await stripe.prices.list({ product: productId, active: true, limit: 10 });
  const found = existing.data.find((price) => price.lookup_key === lookup);
  if (found) return found;
  return stripe.prices.create({
    product: productId,
    unit_amount: amount,
    currency: "usd",
    lookup_key: lookup,
    metadata: { app: "homebuddy" },
  });
}

const env = {};
for (const [id, name, description, monthly, yearly] of plans) {
  const product = await productFor(id, name, description);
  const month = await recurringPrice(product.id, monthly, "month", `homebuddy_${id}_month`);
  const year = await recurringPrice(product.id, yearly, "year", `homebuddy_${id}_year`);
  env[`STRIPE_PRICE_${id.toUpperCase()}_MONTH`] = month.id;
  env[`STRIPE_PRICE_${id.toUpperCase()}_YEAR`] = year.id;
}
for (const [id, name, description, amount] of packs) {
  const product = await productFor(`credits_${id}`, name, description);
  const price = await oneTimePrice(product.id, amount, `homebuddy_credits_${id}`);
  env[`STRIPE_PRICE_CREDITS_${id}`] = price.id;
}

const endpoints = await stripe.webhookEndpoints.list({ limit: 20 });
const url = "https://limitless-llama-806.convex.site/stripe";
let endpoint = endpoints.data.find((item) => item.url === url && item.status !== "disabled");
if (!endpoint) {
  endpoint = await stripe.webhookEndpoints.create({
    url,
    enabled_events: [
      "checkout.session.completed",
      "invoice.paid",
      "customer.subscription.updated",
      "customer.subscription.deleted",
    ],
    description: "Homebuddy Convex billing",
    metadata: { app: "homebuddy" },
  });
}
if (endpoint.secret) env.STRIPE_WEBHOOK_SECRET = endpoint.secret;

const configs = await stripe.billingPortal.configurations.list({ limit: 5 });
let portal = configs.data.find((item) => item.metadata?.app === "homebuddy" && item.active);
if (!portal) {
  portal = await stripe.billingPortal.configurations.create({
    metadata: { app: "homebuddy" },
    business_profile: { headline: "Manage your Homebuddy plan" },
    features: {
      customer_update: { enabled: true, allowed_updates: ["email", "address", "name"] },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true, mode: "at_period_end", cancellation_reason: { enabled: true, options: ["too_expensive", "unused", "other"] } },
    },
  });
}
env.STRIPE_PORTAL_CONFIGURATION = portal.id;

function setEnv(name, value) {
  const file = `/tmp/homebuddy-env-${name}`;
  writeFileSync(file, value);
  const result = spawnSync("npx", ["convex", "env", "set", name, "--from-file", file], { stdio: "inherit" });
  unlinkSync(file);
  if (result.status !== 0) throw new Error(`Failed to set ${name}`);
}

setEnv("STRIPE_SECRET_KEY", key);
setEnv("STRIPE_ACCOUNT_CONTEXT", "acct_1SEoFvROY1TlKkba");
for (const [name, value] of Object.entries(env)) setEnv(name, value);
console.log("stripe billing ready", Object.keys(env).join(", "));
