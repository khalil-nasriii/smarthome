import mqtt, { type IClientOptions, type MqttClient } from "mqtt";
import { EventEmitter } from "node:events";
import { logger } from "../../lib/logger";
import type { MqttSensorMessage, SensorMetric } from "./types";
import { parseHomeTopic } from "./topics";

function parseMetricFromTopic(topic: string): SensorMetric | null {
  // Expected: home/{deviceId}/{metric}
  const parts = topic.split("/");
  const metric = parts.at(-1);
  if (metric === "temp" || metric === "hum" || metric === "motion") return metric;
  return null;
}

function parseDeviceIdFromTopic(topic: string): string | null {
  const parsed = parseHomeTopic(topic);
  return parsed?.deviceId ?? null;
}

export type MqttServiceEvents = {
  connect: [];
  reconnect: [];
  close: [];
  error: [Error];
  sensor: [MqttSensorMessage];
};

export class MqttService extends EventEmitter {
  private client: MqttClient | null = null;
  private connected = false;

  start() {
    const url = process.env["MQTT_URL"];
    if (!url) {
      logger.warn("MQTT_URL not set; MQTT service will not start.");
      return;
    }
    if (!url.startsWith("mqtts://")) {
      logger.error({ mqttUrl: url }, "MQTT_URL must use mqtts:// for TLS");
      return;
    }

    const options: IClientOptions = {
      username: process.env["MQTT_USERNAME"] || undefined,
      password: process.env["MQTT_PASSWORD"] || undefined,
      reconnectPeriod: 2_000,
      keepalive: 30,
      clean: true,
      protocol: "mqtts",
      rejectUnauthorized: true,
    };

    this.client = mqtt.connect(url, options);
    this.wireClient(this.client);
  }

  isConnected(): boolean {
    return this.connected;
  }

  publish(topic: string, message: string | Buffer) {
    if (!this.client) {
      throw new Error("MQTT client not started");
    }
    this.client.publish(topic, message, { qos: 0 });
  }

  private wireClient(client: MqttClient) {
    client.on("connect", () => {
      this.connected = true;
      logger.info("MQTT connected");
      this.emit("connect");

      const topics: string[] = ["home/+/temp", "home/+/hum", "home/+/motion"];
      client.subscribe(topics, { qos: 0 }, (err) => {
        if (err) {
          logger.error({ err }, "MQTT subscribe error");
          this.emit("error", err);
          return;
        }
        logger.info({ topics }, "MQTT subscribed");
      });
    });

    client.on("reconnect", () => {
      this.connected = false;
      logger.warn("MQTT reconnecting");
      this.emit("reconnect");
    });

    client.on("close", () => {
      this.connected = false;
      logger.warn("MQTT connection closed");
      this.emit("close");
    });

    client.on("error", (err) => {
      logger.error({ err }, "MQTT error");
      this.emit("error", err);
    });

    client.on("message", (topic, payload) => {
      const deviceId = parseDeviceIdFromTopic(topic);
      const metric = parseMetricFromTopic(topic);
      if (!deviceId || !metric) {
        logger.debug({ topic }, "MQTT message ignored (unrecognized topic)");
        return;
      }

      const msg: MqttSensorMessage = {
        deviceId,
        metric,
        topic,
        payload,
        receivedAt: new Date(),
      };

      this.emit("sensor", msg);
    });
  }
}

export const mqttService = new MqttService();

