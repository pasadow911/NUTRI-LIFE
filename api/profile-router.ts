import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { profiles } from "../db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const profileRouter = createRouter({
  get: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, ctx.user.id),
    });
    return profile ?? null;
  }),

  upsert: authedQuery
    .input(
      z.object({
        goalType: z.enum([
          "weight_loss",
          "weight_gain",
          "healthy_lifestyle",
          "diabetic",
          "muscle_build",
          "general",
        ]),
        gender: z.enum(["male", "female", "other"]).optional(),
        age: z.number().min(10).max(120).optional(),
        weight: z.number().min(20).max(300).optional(),
        height: z.number().min(50).max(250).optional(),
        activityLevel: z.enum([
          "sedentary",
          "light",
          "moderate",
          "active",
          "very_active",
        ]),
        targetWeight: z.number().min(20).max(300).optional(),
        dietaryRestrictions: z.string().optional(),
        allergies: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const existing = await db.query.profiles.findFirst({
        where: eq(profiles.userId, ctx.user.id),
      });

      if (existing) {
        await db
          .update(profiles)
          .set({
            ...input,
            updatedAt: new Date(),
          })
          .where(eq(profiles.id, existing.id));
        return { success: true, id: existing.id };
      }

      await db.insert(profiles).values({
        userId: ctx.user.id,
        ...input,
      });
      return { success: true };
    }),
});
