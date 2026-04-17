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
  sensors: SensorData;
  publish: (topic: string, message: string) => void;
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

const TOPICS = [
  "home/temp",
  "home/hum",
  "home/motion",
  "home/led/status",
  "home/buzzer/status",
];

export function useMqtt(): UseMqttReturn {
  const clientRef = useRef<MqttClient | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
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
    setSensors((prev) => {
      const next = { ...prev, lastUpdate: new Date() };
      if (topic === "home/temp") {
        const val = parseFloat(message);
        next.temperature = isNaN(val) ? prev.temperature : val;
      } else if (topic === "home/hum") {
        const val = parseFloat(message);
        next.humidity = isNaN(val) ? prev.humidity : val;
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
    if (clientRef.current) {
      clientRef.current.end(true);
      clientRef.current = null;
    }
    setStatus("disconnected");
  }, []);

  const connect = useCallback(
    (cfg: MqttConfig) => {
      if (clientRef.current) {
        clientRef.current.end(true);
        clientRef.current = null;
      }

      setStatus("connecting");

      const options: mqtt.IClientOptions = {
        clientId: cfg.clientId,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 10000,
        rejectUnauthorized: false,
      };

      if (cfg.username) options.username = cfg.username;
      if (cfg.password) options.password = cfg.password;

      const client = mqtt.connect(cfg.brokerUrl, options);
      clientRef.current = client;

      client.on("connect", () => {
        setStatus("connected");
        TOPICS.forEach((topic) => {
          client.subscribe(topic, { qos: 0 });
        });
      });

      client.on("message", handleMessage);

      client.on("error", (err) => {
        console.error("MQTT error:", err);
        setStatus("error");
      });

      client.on("close", () => {
        setStatus((prev) => (prev === "connected" ? "disconnected" : prev));
      });

      client.on("reconnect", () => {
        setStatus("connecting");
      });
    },
    [handleMessage]
  );

  const publish = useCallback((topic: string, message: string) => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish(topic, message, { qos: 0, retain: false });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.end(true);
      }
    };
  }, []);

  return { status, sensors, publish, connect, disconnect, config, setConfig };
}
