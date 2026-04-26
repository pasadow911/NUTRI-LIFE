import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { createOAuthCallbackHandler } from "./kimi/auth";
import { createGoogleOAuthCallbackHandler } from "./google-auth";
import { Paths } from "@contracts/constants";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

// CORS for API
app.use("/api/*", async (c, next) => {
  const origin = c.req.header("origin");
  const allowedOrigins = [
    env.appOrigin,
    "http://localhost:3000",
    "http://localhost:5173",
  ].filter(Boolean);

  if (origin && allowedOrigins.some((o) => origin.startsWith(o))) {
    c.header("Access-Control-Allow-Origin", origin);
  }

  c.header("Access-Control-Allow-Credentials", "true");
  c.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-trpc-source");

  if (c.req.method === "OPTIONS") {
    return c.body(null, 204);
  }

  await next();
});

app.get(Paths.oauthCallback, createOAuthCallbackHandler());
app.get("/api/oauth/google/callback", createGoogleOAuthCallbackHandler());

app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
