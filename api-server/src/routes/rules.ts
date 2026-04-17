import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { devicesTable, rulesTable } from "@workspace/db/schema";
import { getAuthUserId } from "../lib/authRequest";
import { z } from "zod";

const router: IRouter = Router();

const createRuleSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("motion_night_buzzer"),
    deviceId: z.number().int().positive(),
    enabled: z.boolean().optional().default(true),
    startHour: z.number().int().min(0).max(23).default(22),
    endHour: z.number().int().min(0).max(23).default(6),
  }),
  z.object({
    type: z.literal("temp_threshold_alert"),
    deviceId: z.number().int().positive(),
    enabled: z.boolean().optional().default(true),
    thresholdC: z.number().min(-20).max(100),
  }),
  z.object({
    type: z.literal("anomaly_alert"),
    deviceId: z.number().int().positive(),
    enabled: z.boolean().optional().default(true),
  }),
]);

router.get("/rules", async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "missing_auth" });

  const rules = await db
    .select()
    .from(rulesTable)
    .where(eq(rulesTable.userId, userId))
    .orderBy(desc(rulesTable.createdAt));

  return res.json({ rules });
});

router.post("/rules", async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "missing_auth" });

  const body = createRuleSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "invalid_body" });

  const owned = await db
    .select({ id: devicesTable.id })
    .from(devicesTable)
    .where(and(eq(devicesTable.userId, userId), eq(devicesTable.id, body.data.deviceId)))
    .limit(1);

  if (owned.length === 0) return res.status(404).json({ error: "device_not_found" });

  const inserted = await db
    .insert(rulesTable)
    .values({
      userId,
      deviceId: body.data.deviceId,
      type: body.data.type,
      enabled: body.data.enabled ?? true,
      config: body.data,
    })
    .returning();

  return res.status(201).json({ rule: inserted[0] });
});

router.delete("/rules/:ruleId", async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "missing_auth" });

  const ruleId = Number(req.params.ruleId);
  if (Number.isNaN(ruleId) || ruleId <= 0) return res.status(400).json({ error: "invalid_rule_id" });

  const deleted = await db
    .delete(rulesTable)
    .where(and(eq(rulesTable.userId, userId), eq(rulesTable.id, ruleId)))
    .returning({ id: rulesTable.id });

  if (deleted.length === 0) return res.status(404).json({ error: "rule_not_found" });
  return res.json({ ok: true });
});

export default router;

