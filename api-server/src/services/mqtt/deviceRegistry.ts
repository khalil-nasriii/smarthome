import { db, devicesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

type CacheEntry = { id: number | null; checkedAt: number };

export class DeviceRegistry {
  private cache = new Map<string, CacheEntry>();

  constructor(private ttlMs: number) {}

  async resolveDevice(deviceId: string): Promise<number | null> {
    const now = Date.now();
    const cached = this.cache.get(deviceId);
    if (cached && now - cached.checkedAt < this.ttlMs) {
      return cached.id;
    }

    // Try numeric ID first (backward compatibility)
    const numericId = Number(deviceId);
    if (!Number.isNaN(numericId) && numericId > 0) {
      const rows = await db
        .select({ id: devicesTable.id })
        .from(devicesTable)
        .where(eq(devicesTable.id, numericId))
        .limit(1);

      const id = rows[0]?.id ?? null;
      this.cache.set(deviceId, { id, checkedAt: now });
      return id;
    }

    // Otherwise look up by hardwareId
    const rows = await db
      .select({ id: devicesTable.id })
      .from(devicesTable)
      .where(eq(devicesTable.hardwareId, deviceId))
      .limit(1);

    const id = rows[0]?.id ?? null;
    this.cache.set(deviceId, { id, checkedAt: now });
    return id;
  }

  // Deprecated shim
  async deviceExists(deviceId: string): Promise<boolean> {
    const id = await this.resolveDevice(deviceId);
    return id !== null;
  }
}

export const deviceRegistry = new DeviceRegistry(60_000);

