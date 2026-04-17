import { and, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  devicesTable,
  notificationEventsTable,
  rulesTable,
  userSettingsTable,
} from "@workspace/db/schema";
import { logger } from "../../lib/logger";
import { mqttService } from "../mqtt/mqttService";
import { commandTopic } from "../mqtt/topics";
import type { SensorMetric } from "../mqtt/types";
import type { AnalyzeResult } from "../ml/mlService";
import { expoPushService } from "../notifications/expoPush";

type RangeKind = { startHour: number; endHour: number };

function isNightLocal(now: Date, range: RangeKind): boolean {
  const h = now.getHours();
  const { startHour, endHour } = range;
  if (startHour === endHour) return true;
  if (startHour < endHour) return h >= startHour && h < endHour;
  // crosses midnight
  return h >= startHour || h < endHour;
}

function parseNumericPayload(payload: Buffer): number | null {
  const raw = payload.toString("utf8").trim();
  if (!raw) return null;

  if (raw.startsWith("{") || raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "value" in (parsed as Record<string, unknown>)
      ) {
        const v = (parsed as Record<string, unknown>)["value"];
        if (typeof v === "number" && Number.isFinite(v)) return v;
        if (typeof v === "string") {
          const n = Number(v);
          return Number.isFinite(n) ? n : null;
        }
      }
    } catch {
      // fall through
    }
  }

  if (raw === "true") return 1;
  if (raw === "false") return 0;

  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export class AutomationEngine {
  async handleSensorEvent(input: {
    deviceId: string;
    metric: SensorMetric;
    payload: Buffer;
    receivedAt: Date;
    ml?: AnalyzeResult | null;
  }) {
    const deviceIdNum = Number(input.deviceId);
    if (Number.isNaN(deviceIdNum) || deviceIdNum <= 0) return;

    // Fetch device + owner
    const deviceRows = await db
      .select({
        deviceId: devicesTable.id,
        deviceName: devicesTable.name,
        userId: devicesTable.userId,
      })
      .from(devicesTable)
      .where(eq(devicesTable.id, deviceIdNum))
      .limit(1);

    const device = deviceRows[0];
    if (!device) return;

    // Ensure settings row exists
    const settingsRows = await db
      .select()
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userId, device.userId))
      .limit(1);

    const settings =
      settingsRows[0] ??
      (
        await db
          .insert(userSettingsTable)
          .values({ userId: device.userId })
          .returning()
      )[0];

    // Pull enabled rules for device
    const rules = await db
      .select()
      .from(rulesTable)
      .where(
        and(
          eq(rulesTable.userId, device.userId),
          eq(rulesTable.deviceId, deviceIdNum),
          eq(rulesTable.enabled, true),
        ),
      );

    const value = parseNumericPayload(input.payload);

    // Alarm motion trigger (settings-based, independent of rules)
    if (
      input.metric === "motion" &&
      value !== null &&
      value > 0 &&
      settings.notificationsEnabled &&
      settings.alarmEnabled
    ) {
      await this.createNotification({
        userId: device.userId,
        deviceId: deviceIdNum,
        kind: "motion_alarm",
        title: "Motion detected",
        body: `Motion detected on "${device.deviceName}" while alarm is enabled.`,
        data: { deviceId: input.deviceId, metric: "motion", ts: input.receivedAt.toISOString() },
        settings,
      });
    }

    // ML anomaly trigger (rule-driven: anomaly_alert)
    if (input.ml?.anomaly && settings.notificationsEnabled) {
      const hasAnomalyRule = rules.some((r) => r.type === "anomaly_alert");
      if (hasAnomalyRule) {
        await this.createNotification({
          userId: device.userId,
          deviceId: deviceIdNum,
          kind: "ml_anomaly",
          title: "Anomaly detected",
          body: `Anomaly detected on "${device.deviceName}" (${input.ml.kind ?? "unknown"}).`,
          data: {
            deviceId: input.deviceId,
            metric: input.metric,
            kind: input.ml.kind ?? null,
            score: input.ml.score ?? null,
            ts: input.receivedAt.toISOString(),
          },
          settings,
        });
      }
    }

    // Rule: motion_night_buzzer
    if (input.metric === "motion" && value !== null && value > 0) {
      const now = input.receivedAt;
      for (const r of rules) {
        if (r.type !== "motion_night_buzzer") continue;
        const cfg = r.config as unknown as {
          startHour?: number;
          endHour?: number;
        };
        const startHour = typeof cfg.startHour === "number" ? cfg.startHour : 22;
        const endHour = typeof cfg.endHour === "number" ? cfg.endHour : 6;
        if (isNightLocal(now, { startHour, endHour })) {
          try {
            // Convention: buzzer control topic leaf "buzzer"
            mqttService.publish(commandTopic(input.deviceId, "buzzer"), "1");
            logger.info({ deviceId: input.deviceId }, "Automation: buzzer ON (motion at night)");
          } catch (err) {
            logger.warn({ err }, "Automation publish failed");
          }
        }
      }
    }

    // Rule: temp_threshold_alert
    if (input.metric === "temp" && value !== null && settings.notificationsEnabled) {
      for (const r of rules) {
        if (r.type !== "temp_threshold_alert") continue;
        const cfg = r.config as unknown as { thresholdC?: number };
        const thresholdC =
          typeof cfg.thresholdC === "number" ? cfg.thresholdC : Number.POSITIVE_INFINITY;
        if (value > thresholdC) {
          await this.createNotification({
            userId: device.userId,
            deviceId: deviceIdNum,
            kind: "temp_threshold",
            title: "High temperature",
            body: `Temperature ${value.toFixed(1)}°C exceeded ${thresholdC.toFixed(1)}°C on "${device.deviceName}".`,
            data: {
              deviceId: input.deviceId,
              metric: "temp",
              value,
              thresholdC,
              ts: input.receivedAt.toISOString(),
            },
            settings,
          });
        }
      }
    }
  }

  private async createNotification(input: {
    userId: number;
    deviceId: number;
    kind: "motion_alarm" | "temp_threshold" | "ml_anomaly";
    title: string;
    body: string;
    data: Record<string, unknown>;
    settings: typeof userSettingsTable.$inferSelect;
  }) {
    await db.insert(notificationEventsTable).values({
      userId: input.userId,
      deviceId: input.deviceId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      data: input.data,
    });

    if (input.settings.pushEnabled && input.settings.expoPushToken) {
      await expoPushService.send({
        to: input.settings.expoPushToken,
        title: input.title,
        body: input.body,
        data: input.data,
      });
    }
  }
}

export const automationEngine = new AutomationEngine();

