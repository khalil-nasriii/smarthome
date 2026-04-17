import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { usersTable } from "./users";

export const devicesTable = pgTable(
  "devices",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userDeviceNameUnique: uniqueIndex("devices_user_name_unique").on(
      t.userId,
      t.name,
    ),
  }),
);

export const insertDeviceSchema = createInsertSchema(devicesTable).omit({
  id: true,
  createdAt: true,
});

export type Device = typeof devicesTable.$inferSelect;
export type InsertDevice = typeof devicesTable.$inferInsert;

