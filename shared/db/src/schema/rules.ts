import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { usersTable } from "./users";
import { devicesTable } from "./devices";

export type RuleType = "motion_night_buzzer" | "temp_threshold_alert" | "anomaly_alert";

export type RuleConfig =
  | { type: "motion_night_buzzer"; enabled: boolean; deviceId: number; startHour: number; endHour: number }
  | { type: "temp_threshold_alert"; enabled: boolean; deviceId: number; thresholdC: number }
  | { type: "anomaly_alert"; enabled: boolean; deviceId: number };

export const rulesTable = pgTable("rules", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  deviceId: integer("device_id")
    .notNull()
    .references(() => devicesTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // RuleType
  enabled: boolean("enabled").notNull().default(true),
  config: jsonb("config").notNull(), // RuleConfig
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRuleSchema = createInsertSchema(rulesTable).omit({
  id: true,
  createdAt: true,
});

export type Rule = typeof rulesTable.$inferSelect;
export type InsertRule = typeof rulesTable.$inferInsert;

