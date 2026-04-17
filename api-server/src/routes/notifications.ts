import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { notificationEventsTable } from "@workspace/db/schema";
import { getAuthUserId } from "../lib/authRequest";
import { z } from "zod";

const router: IRouter = Router();

router.get("/notifications", async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "missing_auth" });

  const querySchema = z.object({
    deviceId: z.string().optional(),
    limit: z.string().optional(),
  });

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "invalid_query" });

  const limit = Math.min(200, Math.max(1, Number(parsed.data.limit ?? "50") || 50));

  if (parsed.data.deviceId) {
    const deviceId = Number(parsed.data.deviceId);
    if (Number.isNaN(deviceId) || deviceId <= 0) {
      return res.status(400).json({ error: "invalid_device_id" });
    }

    const events = await db
      .select()
      .from(notificationEventsTable)
      .where(and(eq(notificationEventsTable.userId, userId), eq(notificationEventsTable.deviceId, deviceId)))
      .orderBy(desc(notificationEventsTable.createdAt))
      .limit(limit);

    return res.json({ events });
  }

  const events = await db
    .select()
    .from(notificationEventsTable)
    .where(eq(notificationEventsTable.userId, userId))
    .orderBy(desc(notificationEventsTable.createdAt))
    .limit(limit);

  return res.json({ events });
});

export default router;

