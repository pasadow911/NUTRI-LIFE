import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  int,
  boolean,
  bigint,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export const otpCodes = mysqlTable("otp_codes", {
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const profiles = mysqlTable("profiles", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull().unique(),
  goalType: mysqlEnum("goalType", [
    "weight_loss",
    "weight_gain",
    "healthy_lifestyle",
    "diabetic",
    "muscle_build",
    "general"
  ]).default("general").notNull(),
  gender: mysqlEnum("gender", ["male", "female", "other"]).default("other"),
  age: int("age"),
  weight: int("weight"),
  height: int("height"),
  activityLevel: mysqlEnum("activityLevel", [
    "sedentary",
    "light",
    "moderate",
    "active",
    "very_active"
  ]).default("moderate"),
  targetWeight: int("targetWeight"),
  dietaryRestrictions: text("dietaryRestrictions"),
  allergies: text("allergies"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const dailyTasks = mysqlTable("daily_tasks", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", [
    "meal",
    "exercise",
    "water",
    "sleep",
    "medication",
    "habit",
    "other"
  ]).default("habit").notNull(),
  completed: boolean("completed").default(false).notNull(),
  scheduledAt: timestamp("scheduledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const chatSessions = mysqlTable("chat_sessions", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  botType: mysqlEnum("botType", [
    "weight_loss",
    "weight_gain",
    "healthy_lifestyle",
    "diabetic",
    "muscle_build",
    "general_nutrition",
    "breastfeeding",
    "meal_prep",
  ]).notNull(),
  title: varchar("title", { length: 255 }).default("New Chat"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const chatMessages = mysqlTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: bigint("sessionId", { mode: "number", unsigned: true }).notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const notificationSettings = mysqlTable("notification_settings", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull().unique(),
  pushEnabled: boolean("pushEnabled").default(true).notNull(),
  mealReminders: boolean("mealReminders").default(true).notNull(),
  waterReminders: boolean("waterReminders").default(true).notNull(),
  exerciseReminders: boolean("exerciseReminders").default(false).notNull(),
  sleepReminders: boolean("sleepReminders").default(false).notNull(),
  medicationReminders: boolean("medicationReminders").default(false).notNull(),
  reminderInterval: int("reminderInterval").default(60),
  quietHoursStart: int("quietHoursStart").default(22),
  quietHoursEnd: int("quietHoursEnd").default(7),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const notifications = mysqlTable("notifications", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: mysqlEnum("type", [
    "meal",
    "water",
    "exercise",
    "sleep",
    "medication",
    "system",
    "achievement"
  ]).notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type OtpCode = typeof otpCodes.$inferSelect;
export type InsertOtpCode = typeof otpCodes.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;
export type DailyTask = typeof dailyTasks.$inferSelect;
export type InsertDailyTask = typeof dailyTasks.$inferInsert;
export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = typeof chatSessions.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;
export type NotificationSetting = typeof notificationSettings.$inferSelect;
export type InsertNotificationSetting = typeof notificationSettings.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
