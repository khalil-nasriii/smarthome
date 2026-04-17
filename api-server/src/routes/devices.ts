import { Router, type IRouter } from "express";
import { db, devicesTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getAuthUserId } from "../lib/authRequest";

const router: IRouter = Router();

const createDeviceSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

router.get("/devices", async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "missing_auth" });

  const devices = await db
    .select({
      id: devicesTable.id,
      name: devicesTable.name,
      createdAt: devicesTable.createdAt,
    })
    .from(devicesTable)
    .where(eq(devicesTable.userId, userId))
    .orderBy(devicesTable.createdAt);

  return res.json({ devices });
});

router.post("/devices", async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "missing_auth" });

  const body = createDeviceSchema.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "invalid_body" });

  const inserted = await db
    .insert(devicesTable)
    .values({ userId, name: body.data.name })
    .returning({
      id: devicesTable.id,
      name: devicesTable.name,
      createdAt: devicesTable.createdAt,
    });

  const device = inserted[0];
  if (!device) return res.status(500).json({ error: "create_failed" });

  return res.status(201).json({ device });
});

router.get("/devices/:deviceId", async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "missing_auth" });

  const deviceId = Number(req.params.deviceId);
  if (Number.isNaN(deviceId) || deviceId <= 0) {
    return res.status(400).json({ error: "invalid_device_id" });
  }

  const rows = await db
    .select({
      id: devicesTable.id,
      name: devicesTable.name,
      createdAt: devicesTable.createdAt,
    })
    .from(devicesTable)
    .where(and(eq(devicesTable.userId, userId), eq(devicesTable.id, deviceId)))
    .limit(1);

  const device = rows[0];
  if (!device) return res.status(404).json({ error: "device_not_found" });

  return res.json({ device });
});

export default router;

