import { createRouter, publicQuery } from "./middleware";
import { env } from "./lib/env";

export const configRouter = createRouter({
  authProviders: publicQuery.query(() => {
    return {
      kimi: true,
      google: !!(env.googleClientId && env.googleClientSecret),
      phone: true,
      googleClientId: env.googleClientId || null,
    };
  }),
  validateGoogle: publicQuery.query(() => {
    const hasClientId = !!env.googleClientId;
    const hasClientSecret = !!env.googleClientSecret;

    if (!hasClientId || !hasClientSecret) {
      return {
        configured: false,
        message: "Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.",
        redirectUri: null,
      };
    }

    const appOrigin = env.appOrigin || "http://localhost:3000";
    return {
      configured: true,
      redirectUri: `${appOrigin}/api/oauth/google/callback`,
      message: "Google OAuth is configured and ready.",
    };
  }),
});
