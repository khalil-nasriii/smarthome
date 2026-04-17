import { boolean, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { usersTable } from "./users";

export const userSettingsTable = pgTable(
  "user_settings",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),

    alarmEnabled: boolean("alarm_enabled").notNull().default(false),
    notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
    pushEnabled: boolean("push_enabled").notNull().default(false),

    // Expo push token for mobile notifications (optional).
    expoPushToken: text("expo_push_token"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userUnique: uniqueIndex("user_settings_user_unique").on(t.userId),
  }),
);

export const insertUserSettingsSchema = createInsertSchema(userSettingsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UserSettings = typeof userSettingsTable.$inferSelect;

