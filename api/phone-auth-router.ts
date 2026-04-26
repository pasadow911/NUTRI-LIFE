import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { otpCodes } from "../db/schema";
import { eq, and, gt } from "drizzle-orm";
import { signSessionToken } from "./kimi/session";
import { upsertUser, findUserByUnionId } from "./queries/users";
import { setCookie } from "hono/cookie";
import { getSessionCookieOptions } from "./lib/cookies";
import { Session } from "@contracts/constants";

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getPhoneUnionId(phone: string): string {
  return `phone:${phone.replace(/\D/g, "")}`;
}

export const phoneAuthRouter = createRouter({
  sendOtp: publicQuery
    .input(z.object({ phone: z.string().min(8).max(20) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const code = generateOtp();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      await db.insert(otpCodes).values({
        phone: input.phone,
        code,
        expiresAt,
        used: false,
      });

      // In production, you would send SMS here via Twilio, AWS SNS, etc.
      // For demo purposes, we return the code in the response
      return {
        success: true,
        message: "OTP generated. In production, this would be sent via SMS.",
        code, // REMOVE IN PRODUCTION - only for demo
        expiresIn: 300, // 5 minutes in seconds
      };
    }),

  verifyOtp: publicQuery
    .input(z.object({ phone: z.string().min(8).max(20), code: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const now = new Date();

      // Find valid unused OTP
      const rows = await db
        .select()
        .from(otpCodes)
        .where(
          and(
            eq(otpCodes.phone, input.phone),
            eq(otpCodes.code, input.code),
            eq(otpCodes.used, false),
            gt(otpCodes.expiresAt, now),
          ),
        )
        .limit(1);

      const validOtp = rows[0];
      if (!validOtp) {
        return { success: false, error: "Invalid or expired OTP" };
      }

      // Mark OTP as used
      await db
        .update(otpCodes)
        .set({ used: true })
        .where(eq(otpCodes.id, validOtp.id));

      // Create or login user
      const unionId = getPhoneUnionId(input.phone);
      const cleanPhone = input.phone.replace(/\D/g, "");
      const formattedPhone = `+${cleanPhone}`;

      await upsertUser({
        unionId,
        name: `User ${cleanPhone.slice(-4)}`,
        phone: formattedPhone,
        lastSignInAt: new Date(),
      });

      const user = await findUserByUnionId(unionId);
      if (!user) {
        return { success: false, error: "Failed to create user" };
      }

      // Create session
      const token = await signSessionToken({
        unionId,
        clientId: "nutrilife-phone",
      });

      const cookieOpts = getSessionCookieOptions(ctx.req.headers);
      setCookie(ctx as any, Session.cookieName, token, {
        ...cookieOpts,
        maxAge: Session.maxAgeMs / 1000,
      });

      return { success: true, user };
    }),
});
