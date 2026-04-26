import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { dailyTasks } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

export const taskRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const tasks = await db
      .select()
      .from(dailyTasks)
      .where(eq(dailyTasks.userId, ctx.user.id))
      .orderBy(desc(dailyTasks.createdAt));
    return tasks;
  }),

  create: authedQuery
    .input(
      z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        category: z.enum([
          "meal",
          "exercise",
          "water",
          "sleep",
          "medication",
          "habit",
          "other",
        ]),
        scheduledAt: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.insert(dailyTasks).values({
        userId: ctx.user.id,
        ...input,
      });
      return { success: true };
    }),

  toggle: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const task = await db
        .select()
        .from(dailyTasks)
        .where(and(eq(dailyTasks.id, input.id), eq(dailyTasks.userId, ctx.user.id)))
        .then((rows) => rows[0]);

      if (!task) throw new Error("Task not found");

      await db
        .update(dailyTasks)
        .set({ completed: !task.completed })
        .where(eq(dailyTasks.id, input.id));

      return { success: true, completed: !task.completed };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .delete(dailyTasks)
        .where(and(eq(dailyTasks.id, input.id), eq(dailyTasks.userId, ctx.user.id)));
      return { success: true };
    }),
});
