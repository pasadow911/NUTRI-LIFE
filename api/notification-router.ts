import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { notificationSettings, notifications } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

export const notificationRouter = createRouter({
  settings: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const settings = await db.query.notificationSettings.findFirst({
      where: eq(notificationSettings.userId, ctx.user.id),
    });
    return settings ?? null;
  }),

  updateSettings: authedQuery
    .input(
      z.object({
        pushEnabled: z.boolean().optional(),
        mealReminders: z.boolean().optional(),
        waterReminders: z.boolean().optional(),
        exerciseReminders: z.boolean().optional(),
        sleepReminders: z.boolean().optional(),
        medicationReminders: z.boolean().optional(),
        reminderInterval: z.number().min(15).max(180).optional(),
        quietHoursStart: z.number().min(0).max(23).optional(),
        quietHoursEnd: z.number().min(0).max(23).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const existing = await db.query.notificationSettings.findFirst({
        where: eq(notificationSettings.userId, ctx.user.id),
      });

      if (existing) {
        await db
          .update(notificationSettings)
          .set({
            ...input,
            updatedAt: new Date(),
          })
          .where(eq(notificationSettings.id, existing.id));
        return { success: true };
      }

      await db.insert(notificationSettings).values({
        userId: ctx.user.id,
        ...input,
      });
      return { success: true };
    }),

  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const notifs = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, ctx.user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
    return notifs;
  }),

  markRead: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(notifications)
        .set({ read: true })
        .where(eq(notifications.id, input.id));
      return { success: true };
    }),

  markAllRead: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, ctx.user.id));
    return { success: true };
  }),

  create: authedQuery
    .input(
      z.object({
        title: z.string().min(1).max(255),
        message: z.string().min(1),
        type: z.enum([
          "meal",
          "water",
          "exercise",
          "sleep",
          "medication",
          "system",
          "achievement",
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.insert(notifications).values({
        userId: ctx.user.id,
        ...input,
      });
      return { success: true };
    }),
});
