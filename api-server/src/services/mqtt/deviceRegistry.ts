import { db, devicesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

type CacheEntry = { exists: boolean; checkedAt: number };

export class DeviceRegistry {
  private cache = new Map<string, CacheEntry>();

  constructor(private ttlMs: number) {}

  async deviceExists(deviceId: string): Promise<boolean> {
    const now = Date.now();
    const cached = this.cache.get(deviceId);
    if (cached && now - cached.checkedAt < this.ttlMs) {
      return cached.exists;
    }

    const id = Number(deviceId);
    if (Number.isNaN(id) || id <= 0) {
      this.cache.set(deviceId, { exists: false, checkedAt: now });
      return false;
    }

    const rows = await db
      .select({ id: devicesTable.id })
      .from(devicesTable)
      .where(eq(devicesTable.id, id))
      .limit(1);

    const exists = rows.length > 0;
    this.cache.set(deviceId, { exists, checkedAt: now });
    return exists;
  }
}

export const deviceRegistry = new DeviceRegistry(60_000);

