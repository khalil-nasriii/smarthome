import { useState, useEffect, useRef, useCallback } from "react";
import mqtt, { MqttClient } from "mqtt";

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export interface SensorData {
  temperature: number | null;
  humidity: number | null;
  motion: boolean;
  ledState: boolean;
  buzzerState: boolean;
  lastUpdate: Date | null;
}

export interface MqttConfig {
  brokerUrl: string;
  username: string;
  password: string;
  clientId: string;
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
}

const DEFAULT_CONFIG: MqttConfig = {
  brokerUrl: "wss://broker.hivemq.com:8884/mqtt",
  username: "",
  password: "",
  clientId: `smarthome_${Math.random().toString(16).slice(2, 8)}`,
};

const SUBSCRIBED_TOPICS = [
  "home/temp",
  "home/hum",
  "home/motion",
  "home/led/status",
  "home/buzzer/status",
  "home/alarm/status",
];

export function useMqtt(): UseMqttReturn {
  const clientRef = useRef<MqttClient | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [config, setConfig] = useState<MqttConfig>(DEFAULT_CONFIG);
  const [sensors, setSensors] = useState<SensorData>({
    temperature: null,
    humidity: null,
    motion: false,
    ledState: false,
    buzzerState: false,
    lastUpdate: null,
  });

  const handleMessage = useCallback((topic: string, payload: Buffer) => {
    const message = payload.toString().trim();
    console.log(`[MQTT] Message received | Topic: ${topic} | Payload: "${message}"`);

    setSensors((prev) => {
      const next = { ...prev, lastUpdate: new Date() };
      if (topic === "home/temp") {
        const val = parseFloat(message);
        if (!isNaN(val)) next.temperature = val;
      } else if (topic === "home/hum") {
        const val = parseFloat(message);
        if (!isNaN(val)) next.humidity = val;
      } else if (topic === "home/motion") {
        next.motion =
          message === "1" ||
          message.toLowerCase() === "true" ||
          message.toLowerCase() === "detected" ||
          message.toLowerCase() === "motion";
      } else if (topic === "home/led/status") {
        next.ledState =
          message.toLowerCase() === "on" ||
          message === "1" ||
          message.toLowerCase() === "true";
      } else if (topic === "home/buzzer/status") {
        next.buzzerState =
          message.toLowerCase() === "on" ||
          message === "1" ||
          message.toLowerCase() === "true";
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

      setStatus("connecting");
      setErrorMessage(null);
      console.log(`[MQTT] Connecting to: ${cfg.brokerUrl} | ClientID: ${cfg.clientId}`);

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

      const client = mqtt.connect(cfg.brokerUrl, options);
      clientRef.current = client;

      client.on("connect", () => {
        console.log("[MQTT] Connected successfully!");
        setStatus("connected");
        setErrorMessage(null);
        SUBSCRIBED_TOPICS.forEach((topic) => {
          client.subscribe(topic, { qos: 0 }, (err) => {
            if (err) {
              console.error(`[MQTT] Failed to subscribe to ${topic}:`, err);
            } else {
              console.log(`[MQTT] Subscribed to: ${topic}`);
            }
          });
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
    return true;
  }, []);

  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.end(true);
      }
    };
  }, []);

  return { status, errorMessage, sensors, publish, connect, disconnect, config, setConfig };
}
