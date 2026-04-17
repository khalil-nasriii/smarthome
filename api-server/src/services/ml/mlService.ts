import { z } from "zod";
import { logger } from "../../lib/logger";
import type { SensorMetric } from "../mqtt/types";

const analyzeResponseSchema = z.object({
  anomaly: z.boolean(),
  kind: z.string().optional().nullable(),
  score: z.number().optional().nullable(),
});

export type AnalyzeResult = z.infer<typeof analyzeResponseSchema>;

function requireUrl(url: string): string {
  // Ensure no trailing slash surprises
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

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

export class MlService {
  private baseUrl: string | null = null;

  start() {
    const url = process.env["ML_SERVICE_URL"];
    if (!url) {
      logger.warn("ML_SERVICE_URL not set; ML integration disabled.");
      return;
    }
    this.baseUrl = requireUrl(url);
    logger.info({ url: this.baseUrl }, "ML service enabled");
  }

  isEnabled(): boolean {
    return !!this.baseUrl;
  }

  async analyzeSensor(input: {
    deviceId: string;
    metric: SensorMetric;
    payload: Buffer;
    timestamp: Date;
  }): Promise<AnalyzeResult | null> {
    if (!this.baseUrl) return null;

    const value = parseNumericPayload(input.payload);
    if (value === null) return null;

    const res = await fetch(`${this.baseUrl}/analyze`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        deviceId: input.deviceId,
        metric: input.metric,
        value,
        timestamp: input.timestamp.toISOString(),
      }),
    });

    if (!res.ok) {
      logger.warn({ status: res.status }, "ML analyze request failed");
      return null;
    }

    const json = (await res.json()) as unknown;
    const parsed = analyzeResponseSchema.safeParse(json);
    if (!parsed.success) {
      logger.warn("ML analyze response invalid");
      return null;
    }
    return parsed.data;
  }
}

export const mlService = new MlService();

