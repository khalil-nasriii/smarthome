import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { userSettingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getAuthUserId } from "../lib/authRequest";

const router: IRouter = Router();

const updateSettingsSchema = z.object({
  alarmEnabled: z.boolean().optional(),
  tempAlarmEnabled: z.boolean().optional(),
  notificationsEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
});

router.get("/settings", async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "missing_auth" });

  const rows = await db
    .select()
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, userId))
    .limit(1);

  const settings = rows[0];
  if (!settings) {
    const inserted = await db
      .insert(userSettingsTable)
      .values({ userId })
      .returning();
    return res.json({ settings: inserted[0] });
  }

  return res.json({ settings });
});

router.put("/settings", async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "missing_auth" });

  const body = updateSettingsSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "invalid_body" });

  const existing = await db
    .select({ id: userSettingsTable.id })
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, userId))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(userSettingsTable).values({ userId });
  }

  const updated = await db
    .update(userSettingsTable)
    .set({
      ...body.data,
      updatedAt: new Date(),
    })
    .where(eq(userSettingsTable.userId, userId))
    .returning();

  return res.json({ settings: updated[0] });
});

router.post("/settings/push-token", async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "missing_auth" });

  const schema = z.object({ expoPushToken: z.string().min(10) });
  const body = schema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "invalid_body" });

  const existing = await db
    .select({ id: userSettingsTable.id })
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, userId))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(userSettingsTable).values({ userId });
  }

  const updated = await db
    .update(userSettingsTable)
    .set({ expoPushToken: body.data.expoPushToken, updatedAt: new Date() })
    .where(eq(userSettingsTable.userId, userId))
    .returning({ expoPushToken: userSettingsTable.expoPushToken });

  return res.json({ ok: true, expoPushToken: updated[0]?.expoPushToken ?? null });
});

export default router;

