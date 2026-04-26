import { authRouter } from "./auth-router";
import { phoneAuthRouter } from "./phone-auth-router";
import { configRouter } from "./config-router";
import { profileRouter } from "./profile-router";
import { taskRouter } from "./task-router";
import { chatRouter } from "./chat-router";
import { notificationRouter } from "./notification-router";
import { aiRouter } from "./ai-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  phoneAuth: phoneAuthRouter,
  config: configRouter,
  profile: profileRouter,
  task: taskRouter,
  chat: chatRouter,
  notification: notificationRouter,
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;
