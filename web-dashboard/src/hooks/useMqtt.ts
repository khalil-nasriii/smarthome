import { useState, useEffect, useRef, useCallback } from "react";
import mqtt, { MqttClient } from "mqtt";

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export interface SensorData {
  temperature: number | null;
  humidity: number | null;
  motion: boolean;
  redLedState: boolean;
  blueLedState: boolean;
  buzzerState: boolean;
  lastUpdate: Date | null;
}

export interface MqttConfig {
  brokerUrl: string;
  username: string;
  password: string;
  clientId: string;
  deviceId: string;
}

export interface MqttLogEntry {
  id: number;
  direction: "in" | "out";
  topic: string;
  payload: string;
  timestamp: Date;
}

export interface UseMqttReturn {
  status: ConnectionStatus;
  errorMessage: string | null;
  sensors: SensorData;
  publish: (topic: string, message: string) => boolean;
  connect: (config: MqttConfig) => void;
  disconnect: () => void;
  config: MqttConfig;
  setConfig: (config: MqttConfig) => void;
  logs: MqttLogEntry[];
}

const DEFAULT_CONFIG: MqttConfig = {
  brokerUrl:
    (import.meta.env.VITE_MQTT_BROKER_URL as string | undefined) ??
    "wss://broker.hivemq.com:8884/mqtt",
  username: (import.meta.env.VITE_MQTT_USERNAME as string | undefined) ?? "",
  password: (import.meta.env.VITE_MQTT_PASSWORD as string | undefined) ?? "",
  clientId: `smarthome_${Math.random().toString(16).slice(2, 8)}`,
  deviceId: (import.meta.env.VITE_MQTT_DEVICE_ID as string | undefined) ?? "1",
};
let logId = 0;

function sensorTopic(deviceId: string, leaf: string) {
  return `home/${deviceId}/${leaf}`;
}

function normalizeBrokerUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return trimmed;
  // Browser MQTT client must use websocket scheme.
  const wsNormalized = trimmed
    .replace(/^mqtts:\/\//i, "wss://")
    .replace(/^mqtt:\/\//i, "ws://");
  // HiveMQ Cloud WSS endpoint usually requires /mqtt path.
  if (wsNormalized.includes(".hivemq.cloud") && !wsNormalized.endsWith("/mqtt")) {
    return `${wsNormalized.replace(/\/+$/, "")}/mqtt`;
  }
  return wsNormalized;
}

export function useMqtt(): UseMqttReturn {
  const clientRef = useRef<MqttClient | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [config, setConfig] = useState<MqttConfig>(DEFAULT_CONFIG);
  const [logs, setLogs] = useState<MqttLogEntry[]>([]);
  const [sensors, setSensors] = useState<SensorData>({
    temperature: null,
    humidity: null,
    motion: false,
    redLedState: false,
    blueLedState: false,
    buzzerState: false,
    lastUpdate: null,
  });

  /** MQTT client binds message handler once at connect — must not read stale deviceId from closure. */
  const deviceIdRef = useRef(config.deviceId);
  useEffect(() => {
    deviceIdRef.current = config.deviceId;
  }, [config.deviceId]);

  const handleMessage = useCallback((topic: string, payload: Buffer) => {
    const message = payload.toString().trim();
    console.log(`[MQTT] Message received | Topic: ${topic} | Payload: "${message}"`);
    setLogs((prev) => [
      ...prev.slice(-99),
      { id: ++logId, direction: "in", topic, payload: message, timestamp: new Date() },
    ]);

    if (!message) {
      console.warn(`[MQTT] Ignoring empty payload for topic: ${topic}`);
      return;
    }

    const parts = topic.split("/");
    if (parts.length < 2 || parts[0] !== "home") {
      console.warn(`[MQTT] Ignoring unexpected topic shape: ${topic}`);
      return;
    }

    let topicDeviceId = deviceIdRef.current;
    let leaf = "";

    // Supports both home/<deviceId>/<leaf> and home/<leaf> patterns.
    if (parts.length >= 3) {
      topicDeviceId = parts[1];
      leaf = parts.slice(2).join("/");
    } else {
      leaf = parts[1];
    }

    const activeId = deviceIdRef.current;
    if (topicDeviceId !== activeId && parts.length >= 3) {
      console.log(
        `[MQTT] Auto-switching device from ${activeId} to ${topicDeviceId} based on live topic`,
      );
      deviceIdRef.current = topicDeviceId;
      setConfig((prev) =>
        prev.deviceId === topicDeviceId ? prev : { ...prev, deviceId: topicDeviceId },
      );
    }

    setSensors((prev) => {
      const next = { ...prev, lastUpdate: new Date() };
      if (leaf === "temp") {
        const val = parseFloat(message);
        if (Number.isFinite(val)) {
          next.temperature = val;
        } else {
          console.warn(`[MQTT] Invalid temperature payload: "${message}"`);
        }
      } else if (leaf === "hum") {
        const val = parseFloat(message);
        if (Number.isFinite(val)) {
          next.humidity = val;
        } else {
          console.warn(`[MQTT] Invalid humidity payload: "${message}"`);
        }
      } else if (leaf === "motion") {
        next.motion =
          message === "1" ||
          message.toLowerCase() === "true" ||
          message.toLowerCase() === "detected" ||
          message.toLowerCase() === "motion";
      } else if (leaf === "red/status") {
        next.redLedState =
          message.toLowerCase() === "on" ||
          message === "1" ||
          message.toLowerCase() === "true";
      } else if (leaf === "blue/status" || leaf === "led/status") {
        next.blueLedState =
          message.toLowerCase() === "on" ||
          message === "1" ||
          message.toLowerCase() === "true";
      } else if (leaf === "buzzer/status") {
        next.buzzerState =
          message.toLowerCase() === "on" ||
          message === "1" ||
          message.toLowerCase() === "true";
      } else if (
        leaf === "red" ||
        leaf === "blue" ||
        leaf === "led" ||
        leaf === "buzzer" ||
        leaf === "alarm" ||
        leaf.startsWith("alarm/")
      ) {
        // Command topics (echoes / retained) — UI follows …/status topics
      } else {
        console.log(`[MQTT] Unhandled topic leaf "${leaf}"`);
      }
      return next;
    });
  }, []);

  const disconnect = useCallback(() => {
    console.log("[MQTT] Disconnecting...");
    if (clientRef.current) {
      clientRef.current.end(true);
      clientRef.current = null;
    }
    setStatus("disconnected");
    setErrorMessage(null);
  }, []);

  const connect = useCallback(
    (cfg: MqttConfig) => {
      if (clientRef.current) {
        clientRef.current.end(true);
        clientRef.current = null;
      }

      const normalizedUrl = normalizeBrokerUrl(cfg.brokerUrl);
      setStatus("connecting");
      setErrorMessage(null);
      console.log(`[MQTT] Connecting to: ${normalizedUrl} | ClientID: ${cfg.clientId} | Device: ${cfg.deviceId}`);

      const options: mqtt.IClientOptions = {
        clientId: cfg.clientId,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 12000,
        rejectUnauthorized: false,
      };

      if (cfg.username) {
        options.username = cfg.username;
        console.log(`[MQTT] Using username: ${cfg.username}`);
      }
      if (cfg.password) options.password = cfg.password;

      const client = mqtt.connect(normalizedUrl, options);
      clientRef.current = client;

      client.on("connect", () => {
        console.log("[MQTT] Connected successfully");
        setStatus("connected");
        setErrorMessage(null);
        const wildcardTopic = "home/#";
        client.subscribe(wildcardTopic, { qos: 0 }, (err) => {
          if (err) {
            console.error(`[MQTT] Failed to subscribe to ${wildcardTopic}:`, err);
          } else {
            console.log(
              `[MQTT] Subscribed to wildcard: ${wildcardTopic} (active device filter: ${cfg.deviceId})`,
            );
          }
        });
      });

      client.on("message", handleMessage);

      client.on("error", (err) => {
        const msg = err.message || "Unknown MQTT error";
        console.error("[MQTT] Error:", err);
        setStatus("error");
        setErrorMessage(msg);
      });

      client.on("close", () => {
        console.log("[MQTT] Connection closed");
        setStatus((prev) => (prev === "connected" ? "disconnected" : prev));
      });

      client.on("offline", () => {
        console.warn("[MQTT] Client went offline");
        setStatus("disconnected");
      });

      client.on("reconnect", () => {
        console.log("[MQTT] Attempting reconnect...");
        setStatus("connecting");
      });
    },
    [handleMessage]
  );

  const publish = useCallback((topic: string, message: string): boolean => {
    const client = clientRef.current;
    if (!client || !client.connected) {
      console.warn(`[MQTT] Cannot publish — not connected | Topic: ${topic}`);
      return false;
    }
    client.publish(topic, message, { qos: 1, retain: false }, (err) => {
      if (err) {
        console.error(`[MQTT] Publish failed | Topic: ${topic} | Error:`, err);
      } else {
        console.log(`[MQTT] Published | Topic: ${topic} | Payload: "${message}"`);
      }
    });
    setLogs((prev) => [
      ...prev.slice(-99),
      { id: ++logId, direction: "out", topic, payload: message, timestamp: new Date() },
    ]);
    return true;
  }, []);

  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.end(true);
      }
    };
  }, []);

  return { status, errorMessage, sensors, publish, connect, disconnect, config, setConfig, logs };
}
