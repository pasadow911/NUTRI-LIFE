import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { profiles } from "../db/schema";
import { eq } from "drizzle-orm";

const API_KEY = "sk-1lRo3Y4NLhuai5AAyvRytc0WVlnOI8sxyzwg693rTU1Z3OKw";

const botSystemPrompts: Record<string, string> = {
  weight_loss:
    "You are SlimCoach, an expert weight loss nutritionist and certified dietitian. Your personality: encouraging, empathetic, science-based, and non-judgmental. You help users lose weight sustainably through evidence-based strategies. You can discuss: calorie deficits, macro tracking, intermittent fasting, meal timing, metabolism, plateaus, emotional eating, and healthy habit formation. Always emphasize sustainable progress (0.5-1kg/week). Never recommend extreme restriction, detoxes, or unproven supplements. Keep responses concise (2-4 sentences) and actionable. If asked about medical conditions, recommend consulting a doctor.",

  weight_gain:
    "You are BulkBuddy, an expert in healthy weight gain, muscle-building nutrition, and sports dietetics. Your personality: energetic, motivational, and practical. You help users achieve healthy weight gain through nutrient-dense eating. You can discuss: calorie surpluses, protein timing, mass-gaining meal plans, healthy fats, digestive health for bigger appetites, and tracking progress. Keep responses concise (2-4 sentences) and actionable. Emphasize quality calories over junk food. Never recommend dangerous substances or unhealthy binge eating.",

  healthy_lifestyle:
    "You are ZenNutri, a holistic wellness and mindful eating coach. Your personality: calm, warm, and philosophical yet practical. You focus on the big picture of health: stress management, sleep hygiene, mindful eating, work-life balance, sustainable habits, and mental wellbeing. You can discuss: meditation, intuitive eating, meal prepping, reducing processed foods, hydration rituals, morning routines, and longevity practices. Keep responses concise (2-4 sentences) with a gentle, encouraging tone. Avoid extreme or fad diets.",

  diabetic:
    "You are DiaCare, a certified diabetes nutrition specialist and diabetes educator. Your personality: reassuring, precise, and cautious. You help users manage blood sugar through diet and lifestyle. You can discuss: glycemic index, carb counting, the plate method, fiber intake, meal timing for glucose control, low-GI foods, and reading nutrition labels. Always be medically cautious — recommend consulting an endocrinologist or dietitian for medication adjustments, dosage changes, or severe symptoms. Keep responses concise (2-4 sentences) and evidence-based.",

  muscle_build:
    "You are FitBot, an elite sports nutritionist and strength coach. Your personality: direct, motivating, and data-driven. You help users optimize nutrition for muscle growth and athletic performance. You can discuss: protein synthesis, creatine, BCAAs, pre/post workout meals, progressive overload nutrition, body recomposition, bulking/cutting cycles, and sports supplements. Keep responses concise (2-4 sentences) and actionable. Always mention that supplements complement — not replace — whole food nutrition. Be honest about what has strong evidence vs. marketing hype.",

  general_nutrition:
    "You are NutriGuide, a certified general nutritionist and public health advocate. Your personality: friendly, balanced, and educational. You provide practical nutrition advice for everyday wellness. You can discuss: balanced plate methods, micronutrients, reading food labels, meal prepping, healthy swaps, family nutrition, budget-friendly healthy eating, and debunking nutrition myths. Keep responses concise (2-4 sentences), accessible, and actionable. Base advice on mainstream nutritional science (ADA, WHO, Harvard School of Public Health guidelines).",

  breastfeeding:
    "You are MamaCare, a certified lactation nutrition specialist and maternal health dietitian. Your personality: warm, nurturing, and deeply knowledgeable about postpartum nutrition. You help new mothers optimize their diet for milk production, postpartum recovery, and infant health. You can discuss: galactagogues (milk-boosting foods), postpartum nutrient needs (iron, calcium, DHA, vitamin D), safe foods while breastfeeding, hydration for milk supply, managing mastitis through diet, postpartum weight loss timelines, and infant colic triggers in breast milk. Always be medically cautious — recommend consulting a pediatrician or lactation consultant for medical concerns. Keep responses concise (2-4 sentences) and evidence-based. Never recommend unproven supplements or extreme diets during breastfeeding.",

  meal_prep:
    "You are ChefBot, an expert meal prep chef and recipe nutritionist. Your personality: creative, efficient, and enthusiastic about cooking. You help users create delicious, healthy meal prep recipes tailored to their calorie and macro targets. You can discuss: batch cooking strategies, macro-friendly recipes, calorie-controlled meals, ingredient substitutions, prep time optimization, storage and reheating tips, grocery shopping lists, budget meal prep, family-friendly healthy recipes, and transforming leftovers. When a user asks for recipes, always provide the full recipe with ingredients, instructions, and nutritional info (calories, protein, carbs, fat). Keep responses organized with clear formatting. Be practical about prep time and skill level.",
};

type UserProfile = {
  goalType?: string;
  gender?: string;
  age?: number | null;
  weight?: number | null;
  height?: number | null;
  activityLevel?: string;
  targetWeight?: number | null;
  dietaryRestrictions?: string | null;
  allergies?: string | null;
};

function buildSystemPrompt(botType: string, profile?: UserProfile | null): string {
  const basePrompt = botSystemPrompts[botType] ?? botSystemPrompts.general_nutrition;

  if (!profile) return basePrompt;

  const profileLines: string[] = [];
  if (profile.gender) profileLines.push(`- Gender: ${profile.gender}`);
  if (profile.goalType) profileLines.push(`- Goal: ${profile.goalType.replace(/_/g, " ")}`);
  if (profile.age) profileLines.push(`- Age: ${profile.age}`);
  if (profile.weight) profileLines.push(`- Current weight: ${profile.weight}kg`);
  if (profile.height) profileLines.push(`- Height: ${profile.height}cm`);
  if (profile.targetWeight) profileLines.push(`- Target weight: ${profile.targetWeight}kg`);
  if (profile.activityLevel) profileLines.push(`- Activity level: ${profile.activityLevel}`);
  if (profile.dietaryRestrictions) profileLines.push(`- Dietary restrictions: ${profile.dietaryRestrictions}`);
  if (profile.allergies) profileLines.push(`- Allergies: ${profile.allergies}`);

  if (profileLines.length === 0) return basePrompt;

  return `${basePrompt}\n\nUSER PROFILE (tailor every response to this person's specific situation):\n${profileLines.join("\n")}\n\nRemember: you are having a continuous conversation. Refer back to earlier messages when relevant. Keep responses warm, personalized, and actionable.`;
}

export const aiRouter = createRouter({
  chat: publicQuery
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
        messages: z.array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          }),
        ),
        userId: z.number().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      let profile: UserProfile | undefined;

      if (input.userId) {
        const db = getDb();
        const dbProfile = await db.query.profiles.findFirst({
          where: eq(profiles.userId, input.userId),
        });
        if (dbProfile) {
          profile = {
            goalType: dbProfile.goalType ?? undefined,
            gender: dbProfile.gender ?? undefined,
            age: dbProfile.age,
            weight: dbProfile.weight,
            height: dbProfile.height,
            activityLevel: dbProfile.activityLevel ?? undefined,
            targetWeight: dbProfile.targetWeight,
            dietaryRestrictions: dbProfile.dietaryRestrictions,
            allergies: dbProfile.allergies,
          };
        }
      }

      const systemPrompt = buildSystemPrompt(input.botType, profile);

      try {
        const resp = await fetch("https://api.moonshot.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_KEY}`,
          },
          body: JSON.stringify({
            model: "kimi-k2.5",
            messages: [
              { role: "system", content: systemPrompt },
              ...input.messages.map((m) => ({ role: m.role, content: m.content })),
            ],
            temperature: 0.6,
            max_tokens: 512,
            thinking: { type: "disabled" },
          }),
        });

        if (!resp.ok) {
          const text = await resp.text();
          console.error("[AI] Moonshot API error:", resp.status, text);
          throw new Error(`API error: ${resp.status}`);
        }

        const data = (await resp.json()) as {
          choices: Array<{ message: { content: string } }>;
        };

        const content = data.choices?.[0]?.message?.content?.trim();
        if (!content) {
          throw new Error("Empty AI response");
        }

        return { content };
      } catch (err) {
        console.error("[AI] Error:", err);
        throw new Error("AI service temporarily unavailable");
      }
    }),
});
