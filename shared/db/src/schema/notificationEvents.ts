import { integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { usersTable } from "./users";
import { devicesTable } from "./devices";

export type NotificationKind =
  | "motion_alarm"
  | "temp_threshold"
  | "ml_anomaly";

export const notificationEventsTable = pgTable("notification_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  deviceId: integer("device_id")
    .notNull()
    .references(() => devicesTable.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  data: jsonb("data").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertNotificationEventSchema = createInsertSchema(notificationEventsTable).omit({
  id: true,
  createdAt: true,
});

export type NotificationEvent = typeof notificationEventsTable.$inferSelect;

