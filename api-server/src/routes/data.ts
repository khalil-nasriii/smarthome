import { Router, type IRouter } from "express";
import { z } from "zod";
import { influxService } from "../services/influx";
import { getAuthUserId } from "../lib/authRequest";
import { db, devicesTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

const router: IRouter = Router();

const historyQuerySchema = z.object({
  deviceId: z.string().min(1),
  range: z.enum(["daily", "weekly"]).default("daily"),
});

router.get("/data/history", async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "missing_auth" });

  const parsed = historyQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "invalid_query" });

  const deviceId = parsed.data.deviceId;
  const deviceIdNum = Number(deviceId);
  if (Number.isNaN(deviceIdNum) || deviceIdNum <= 0) {
    return res.status(400).json({ error: "invalid_device_id" });
  }

  const owned = await db
    .select({ id: devicesTable.id })
    .from(devicesTable)
    .where(and(eq(devicesTable.userId, userId), eq(devicesTable.id, deviceIdNum)))
    .limit(1);

  if (owned.length === 0) {
    return res.status(404).json({ error: "device_not_found" });
  }

  if (!influxService.isEnabled()) {
    return res.status(503).json({ error: "influx_disabled" });
  }

  try {
    const data = await influxService.queryHistory(deviceId, parsed.data.range);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: "history_failed" });
  }
});

export default router;

