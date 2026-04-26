import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { chatSessions, chatMessages } from "../db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { z } from "zod";

export const chatRouter = createRouter({
  sessions: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const sessions = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.userId, ctx.user.id))
      .orderBy(desc(chatSessions.updatedAt));
    return sessions;
  }),

  createSession: authedQuery
    .input(
      z.object({
        botType: z.enum([
          "weight_loss",
          "weight_gain",
          "healthy_lifestyle",
          "diabetic",
          "muscle_build",
          "general_nutrition",
          "breastfeeding",
          "meal_prep",
        ]),
        title: z.string().min(1).max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.insert(chatSessions).values({
        userId: ctx.user.id,
        ...input,
      });
      return { success: true };
    }),

  messages: authedQuery
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const session = await db
        .select()
        .from(chatSessions)
        .where(and(eq(chatSessions.id, input.sessionId), eq(chatSessions.userId, ctx.user.id)))
        .then((rows) => rows[0]);

      if (!session) throw new Error("Session not found");

      const messages = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.sessionId, input.sessionId))
        .orderBy(asc(chatMessages.createdAt));

      return messages;
    }),

  sendMessage: authedQuery
    .input(
      z.object({
        sessionId: z.number(),
        content: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const session = await db
        .select()
        .from(chatSessions)
        .where(and(eq(chatSessions.id, input.sessionId), eq(chatSessions.userId, ctx.user.id)))
        .then((rows) => rows[0]);

      if (!session) throw new Error("Session not found");

      await db.insert(chatMessages).values({
        sessionId: input.sessionId,
        role: "user",
        content: input.content,
      });

      // Simulated bot response based on bot type
      const botResponses: Record<string, string[]> = {
        weight_loss: [
          "Great question! For weight loss, I recommend focusing on a calorie deficit with high protein intake. Would you like a meal plan?",
          "Remember: sustainable weight loss is 0.5-1kg per week. Let's track your progress together!",
          "Have you tried intermittent fasting? It can be effective when combined with balanced meals.",
          "Stay hydrated! Sometimes thirst is mistaken for hunger. Aim for 2-3 liters daily.",
        ],
        weight_gain: [
          "To gain weight healthily, you need a calorie surplus of 300-500 calories. Let's build a nutrient-dense meal plan!",
          "Protein is key for muscle gain. Aim for 1.6-2.2g per kg of bodyweight.",
          "Don't forget healthy fats! Avocados, nuts, and olive oil are excellent calorie-dense options.",
          "Consistency beats intensity. Regular meals every 3-4 hours will help you reach your goals.",
        ],
        healthy_lifestyle: [
          "A healthy lifestyle starts with small habits. Have you tried the 10-minute morning stretch routine?",
          "Sleep is your superpower! 7-9 hours nightly supports metabolism, mood, and immunity.",
          "The Mediterranean diet is consistently ranked #1 for overall health. More olive oil, fish, and vegetables!",
          "Mindful eating — take 20 minutes per meal and savor each bite. Your digestion will thank you.",
        ],
        diabetic: [
          "Blood sugar management is all about balancing carbs, fiber, and protein at every meal.",
          "The glycemic index matters! Choose low-GI foods like oats, lentils, and non-starchy vegetables.",
          "Regular monitoring is key. Have you checked your levels today?",
          "Portion control plates help: half vegetables, quarter protein, quarter complex carbs.",
        ],
        muscle_build: [
          "Progressive overload is essential. Increase weights or reps gradually each week.",
          "Post-workout nutrition: 20-40g protein within 2 hours optimizes muscle protein synthesis.",
          "Creatine monohydrate is the most researched supplement for muscle building. Consider it!",
          "Rest days are growth days. Your muscles repair and grow during recovery, not during the workout.",
        ],
        general_nutrition: [
          "A balanced plate: fill half with colorful vegetables, quarter with lean protein, quarter with whole grains.",
          "Micronutrients matter too! Variety ensures you get all the vitamins and minerals you need.",
          "Meal prepping on Sundays can save you from unhealthy choices during busy weekdays.",
          "Listen to your body. Hunger and fullness cues are powerful tools for intuitive eating.",
        ],
      };

      const responses = botResponses[session.botType] || botResponses.general_nutrition;
      const response = responses[Math.floor(Math.random() * responses.length)];

      await db.insert(chatMessages).values({
        sessionId: input.sessionId,
        role: "assistant",
        content: response,
      });

      // Update session timestamp
      await db
        .update(chatSessions)
        .set({ updatedAt: new Date() })
        .where(eq(chatSessions.id, input.sessionId));

      return { success: true };
    }),
});
