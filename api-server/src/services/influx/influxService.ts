import { InfluxDB, Point } from "@influxdata/influxdb-client";
import { logger } from "../../lib/logger";
import type { SensorMetric } from "../mqtt/types";

type RangeKind = "daily" | "weekly";

export type HistoryPoint = { t: string; v: number };
export type DeviceHistory = {
  deviceId: string;
  range: RangeKind;
  series: {
    temp: HistoryPoint[];
    hum: HistoryPoint[];
    motion: HistoryPoint[];
  };
};

function parseNumericPayload(payload: Buffer): number | null {
  const raw = payload.toString("utf8").trim();
  if (!raw) return null;

  // allow JSON payloads like {"value": 23.1}
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
  if (!Number.isFinite(n)) return null;
  return n;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required for InfluxDB integration`);
  return v;
}

function rangeConfig(range: RangeKind): { start: string; every: string } {
  if (range === "daily") return { start: "-24h", every: "5m" };
  return { start: "-7d", every: "30m" };
}

function fluxEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export class InfluxService {
  private enabled = false;
  private influx: InfluxDB | null = null;
  private org = "";
  private bucket = "";

  start() {
    const url = process.env["INFLUX_URL"];
    const token = process.env["INFLUX_TOKEN"];
    const org = process.env["INFLUX_ORG"];
    const bucket = process.env["INFLUX_BUCKET"];

    if (!url || !token || !org || !bucket) {
      logger.warn(
        "InfluxDB env not fully set; Influx integration disabled (needs INFLUX_URL, INFLUX_TOKEN, INFLUX_ORG, INFLUX_BUCKET).",
      );
      return;
    }

    this.influx = new InfluxDB({ url, token });
    this.org = org;
    this.bucket = bucket;
    this.enabled = true;
    logger.info({ url, org, bucket }, "InfluxDB enabled");
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async writeSensor(
    deviceId: string,
    metric: SensorMetric,
    payload: Buffer,
    receivedAt: Date,
  ): Promise<void> {
    if (!this.influx || !this.enabled) return;

    const n = parseNumericPayload(payload);
    if (n === null) return;

    const writeApi = this.influx.getWriteApi(this.org, this.bucket, "ms");
    const point = new Point("sensor")
      .tag("deviceId", deviceId)
      .timestamp(receivedAt);

    if (metric === "motion") {
      point.intField("motion", n > 0 ? 1 : 0);
    } else if (metric === "temp") {
      point.floatField("temp", n);
    } else if (metric === "hum") {
      point.floatField("hum", n);
    }

    writeApi.writePoint(point);

    try {
      await writeApi.close();
    } catch (err) {
      logger.error({ err }, "Influx write failed");
    }
  }

  async queryHistory(deviceId: string, range: RangeKind): Promise<DeviceHistory> {
    if (!this.influx || !this.enabled) {
      throw new Error("influx_disabled");
    }

    const { start, every } = rangeConfig(range);
    const queryApi = this.influx.getQueryApi(this.org);
    const deviceIdEscaped = fluxEscape(deviceId);

    const querySeries = async (
      field: SensorMetric,
      fn: "mean" | "max",
    ): Promise<HistoryPoint[]> => {
      const fieldName = field;
      const flux = `
from(bucket: "${this.bucket}")
  |> range(start: ${start})
  |> filter(fn: (r) => r._measurement == "sensor")
  |> filter(fn: (r) => r.deviceId == "${deviceIdEscaped}")
  |> filter(fn: (r) => r._field == "${fieldName}")
  |> aggregateWindow(every: ${every}, fn: ${fn}, createEmpty: false)
  |> keep(columns: ["_time", "_value"])
`;

      const rows = (await queryApi.collectRows(flux)) as Array<{
        _time: string;
        _value: number;
      }>;

      return rows
        .filter((r) => typeof r._value === "number" && Number.isFinite(r._value))
        .map((r) => ({ t: r._time, v: r._value }));
    };

    // For motion, max() over window indicates any motion within the bucket.
    const [temp, hum, motion] = await Promise.all([
      querySeries("temp", "mean"),
      querySeries("hum", "mean"),
      querySeries("motion", "max"),
    ]);

    return {
      deviceId,
      range,
      series: { temp, hum, motion },
    };
  }
}

export const influxService = new InfluxService();

