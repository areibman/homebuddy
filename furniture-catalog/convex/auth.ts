import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { WELCOME_CREDITS } from "./plans";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        const name = typeof params.name === "string" ? params.name.trim() : "";
        return {
          email: params.email as string,
          ...(name ? { name } : {}),
        };
      },
    }),
  ],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, { userId, existingUserId }) {
      if (existingUserId) return;
      const existing = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .unique();
      if (existing) return;
      await ctx.db.insert("profiles", {
        userId,
        plan: "studio",
        credits: WELCOME_CREDITS,
      });
      await ctx.db.insert("creditLedger", {
        userId,
        delta: WELCOME_CREDITS,
        reason: "welcome",
        createdAt: Date.now(),
      });
    },
  },
});
