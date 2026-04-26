import type { Context } from "hono";
import { setCookie } from "hono/cookie";
import { env } from "./lib/env";
import { getSessionCookieOptions } from "./lib/cookies";
import { Session } from "@contracts/constants";
import { signSessionToken } from "./kimi/session";
import { upsertUser } from "./queries/users";

export function createGoogleOAuthCallbackHandler() {
  return async (c: Context) => {
    const code = c.req.query("code");
    const state = c.req.query("state");
    const error = c.req.query("error");

    if (error) {
      return c.json({ error: "Google OAuth denied" }, 400);
    }

    if (!code || !state) {
      return c.json({ error: "Missing code or state" }, 400);
    }

    if (!env.googleClientId || !env.googleClientSecret) {
      return c.json({ error: "Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." }, 500);
    }

    // Decode state to get redirect URI
    let redirectUri: string;
    try {
      redirectUri = atob(state);
    } catch {
      return c.json({ error: "Invalid state" }, 400);
    }

    try {
      // Exchange code for tokens with Google
      const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: env.googleClientId,
          client_secret: env.googleClientSecret,
          redirect_uri: redirectUri,
        }).toString(),
      });

      if (!tokenResp.ok) {
        const text = await tokenResp.text();
        throw new Error(`Google token exchange failed: ${text}`);
      }

      const tokens = (await tokenResp.json()) as {
        access_token: string;
        id_token?: string;
      };

      // Fetch user profile from Google
      const profileResp = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        },
      );

      if (!profileResp.ok) {
        throw new Error("Failed to fetch Google profile");
      }

      const profile = (await profileResp.json()) as {
        id: string;
        email: string;
        name?: string;
        picture?: string;
      };

      const unionId = `google:${profile.id}`;

      await upsertUser({
        unionId,
        name: profile.name || profile.email.split("@")[0],
        email: profile.email,
        avatar: profile.picture,
        lastSignInAt: new Date(),
      });

      const token = await signSessionToken({
        unionId,
        clientId: "nutrilife-google",
      });

      const cookieOpts = getSessionCookieOptions(c.req.raw.headers);
      setCookie(c, Session.cookieName, token, {
        ...cookieOpts,
        maxAge: Session.maxAgeMs / 1000,
      });

      return c.redirect("/", 302);
    } catch (err) {
      console.error("[Google OAuth] Callback failed:", err);
      return c.json({ error: "Google OAuth failed" }, 500);
    }
  };
}

export function getGoogleOAuthUrl(): string {
  const clientId = env.googleClientId;
  if (!clientId) {
    throw new Error("Google OAuth not configured: missing GOOGLE_CLIENT_ID");
  }
  const appOrigin = env.appOrigin || "http://localhost:3000";
  const redirectUri = `${appOrigin}/api/oauth/google/callback`;
  const state = btoa(redirectUri);

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "online");
  url.searchParams.set("prompt", "select_account");

  return url.toString();
}
