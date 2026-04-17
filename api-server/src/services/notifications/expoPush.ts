import { logger } from "../../lib/logger";

export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export class ExpoPushService {
  private enabled = true;

  isEnabled(): boolean {
    // This service uses the public Expo push endpoint; no token required.
    // We keep it always "available", but callers should respect user settings.
    return this.enabled;
  }

  async send(message: ExpoPushMessage): Promise<void> {
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          to: message.to,
          title: message.title,
          body: message.body,
          data: message.data ?? {},
        }),
      });

      if (!res.ok) {
        logger.warn({ status: res.status }, "Expo push send failed");
        return;
      }
    } catch (err) {
      logger.warn({ err }, "Expo push send error");
    }
  }
}

export const expoPushService = new ExpoPushService();

