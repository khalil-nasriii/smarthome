import { mqttService } from "./mqttService";
import { logger } from "../../lib/logger";
import { deviceRegistry } from "./deviceRegistry";
import { influxService } from "../influx";
import { mlService } from "../ml";
import { automationEngine } from "../automation";

export function initMqttService() {
  mqttService.on("error", (err) => {
    logger.error({ err }, "MQTT service error (continuing without MQTT)");
  });

  mqttService.start();

  mqttService.on("sensor", async (msg) => {
    try {
      const internalId = await deviceRegistry.resolveDevice(msg.deviceId);
      if (internalId === null) {
        logger.warn(
          { deviceId: msg.deviceId, topic: msg.topic },
          "Unknown device; ignoring MQTT message",
        );
        return;
      }

      const deviceIdStr = internalId.toString();

      await influxService.writeSensor(
        deviceIdStr,
        msg.metric,
        msg.payload,
        msg.receivedAt,
      );

      const analysis = await mlService.analyzeSensor({
        deviceId: deviceIdStr,
        metric: msg.metric,
        payload: msg.payload,
        timestamp: msg.receivedAt,
      });

      await automationEngine.handleSensorEvent({
        deviceId: deviceIdStr,
        metric: msg.metric,
        payload: msg.payload,
        receivedAt: msg.receivedAt,
        ml: analysis,
      });

      if (analysis?.anomaly) {
        logger.warn(
          {
            deviceId: deviceIdStr,
            hardwareId: msg.deviceId,
            metric: msg.metric,
            kind: analysis.kind,
            score: analysis.score,
          },
          "Anomaly detected",
        );
      }

      logger.info(
        {
          deviceId: deviceIdStr,
          hardwareId: msg.deviceId,
          metric: msg.metric,
          topic: msg.topic,
          payload: msg.payload.toString(),
          receivedAt: msg.receivedAt.toISOString(),
        },
        "MQTT sensor message",
      );
    } catch (err) {
      logger.error({ err }, "MQTT sensor handler failed");
    }
  });
}

