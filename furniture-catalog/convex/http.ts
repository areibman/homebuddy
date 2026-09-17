import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();
auth.addHttpRoutes(http);

http.route({
  path: "/stripe",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("stripe-signature");
    if (!signature) return new Response("Missing signature", { status: 400 });
    const result = await ctx.runAction(internal.stripeNode.handleWebhook, {
      body: await request.text(),
      signature,
    });
    if (!result.ok) return new Response(result.error, { status: 400 });
    return new Response("ok");
  }),
});

export default http;
