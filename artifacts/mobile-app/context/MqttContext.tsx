import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import mqtt, { MqttClient } from "mqtt";

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export interface MqttConfig {
  brokerUrl: string;
  username: string;
  password: string;
  clientId: string;
}

export interface SensorData {
  temperature: number | null;
  humidity: number | null;
  motion: boolean;
  ledState: boolean;
  buzzerState: boolean;
  lastUpdate: Date | null;
}

interface MqttContextValue {
  status: ConnectionStatus;
  errorMessage: string | null;
  sensors: SensorData;
  config: MqttConfig;
  alarmEnabled: boolean;
  alarmTriggered: boolean;
  connect: (cfg: MqttConfig) => void;
  disconnect: () => void;
  publish: (topic: string, payload: string) => boolean;
  setConfig: (cfg: MqttConfig) => void;
  toggleAlarm: () => void;
  dismissAlarm: () => void;
}

const DEFAULT_CONFIG: MqttConfig = {
  brokerUrl: "wss://broker.hivemq.com:8884/mqtt",
  username: "",
  password: "",
  clientId: `smarthome_mobile_${Date.now().toString(16).slice(-6)}`,
};

const STORAGE_KEY = "@smarthome_mqtt_config";

const SUBSCRIBED_TOPICS = [
  "home/temp",
  "home/hum",
  "home/motion",
  "home/led/status",
  "home/buzzer/status",
  "home/alarm/status",
];

const MqttContext = createContext<MqttContextValue | null>(null);

export function MqttProvider({ children }: { children: React.ReactNode }) {
  const clientRef = useRef<MqttClient | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [config, setConfigState] = useState<MqttConfig>(DEFAULT_CONFIG);
  const [sensors, setSensors] = useState<SensorData>({
    temperature: null,
    humidity: null,
    motion: false,
    ledState: false,
    buzzerState: false,
    lastUpdate: null,
  });
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [alarmTriggered, setAlarmTriggered] = useState(false);
  const prevMotionRef = useRef(false);

  // Load saved config on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as MqttConfig;
          setConfigState(parsed);
        } catch {}
      }
    });
  }, []);

  const handleMessage = useCallback((topic: string, payload: Buffer) => {
    const message = payload.toString().trim();
    console.log(`[MQTT] ${topic} → ${message}`);
    setSensors((prev) => {
      const next = { ...prev, lastUpdate: new Date() };
      if (topic === "home/temp") {
        const v = parseFloat(message);
        if (!isNaN(v)) next.temperature = v;
      } else if (topic === "home/hum") {
        const v = parseFloat(message);
        if (!isNaN(v)) next.humidity = v;
      } else if (topic === "home/motion") {
        next.motion =
          message === "1" ||
          message.toLowerCase() === "true" ||
          message.toLowerCase() === "detected" ||
          message.toLowerCase() === "motion";
      } else if (topic === "home/led/status") {
        next.ledState =
          message.toLowerCase() === "on" || message === "1" || message.toLowerCase() === "true";
      } else if (topic === "home/buzzer/status") {
        next.buzzerState =
          message.toLowerCase() === "on" || message === "1" || message.toLowerCase() === "true";
      }
      return next;
    });
  }, []);

  // Motion → alarm logic
  useEffect(() => {
    const motionOn = sensors.motion;
    if (motionOn && !prevMotionRef.current && alarmEnabled) {
      setAlarmTriggered(true);
      if (clientRef.current?.connected) {
        clientRef.current.publish("home/buzzer", "ON", { qos: 1 });
      }
    }
    if (!motionOn && prevMotionRef.current && alarmTriggered) {
      setAlarmTriggered(false);
      if (clientRef.current?.connected) {
        clientRef.current.publish("home/buzzer", "OFF", { qos: 1 });
      }
    }
    prevMotionRef.current = motionOn;
  }, [sensors.motion, alarmEnabled, alarmTriggered]);

  const disconnect = useCallback(() => {
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
      console.log(`[MQTT] Connecting to ${cfg.brokerUrl}`);

      const options: mqtt.IClientOptions = {
        clientId: cfg.clientId,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 12000,
        rejectUnauthorized: false,
      };
      if (cfg.username) {
        options.username = cfg.username;
        options.password = cfg.password;
      }

      const client = mqtt.connect(cfg.brokerUrl, options);
      clientRef.current = client;

      client.on("connect", () => {
        console.log("[MQTT] Connected!");
        setStatus("connected");
        setErrorMessage(null);
        SUBSCRIBED_TOPICS.forEach((t) =>
          client.subscribe(t, { qos: 0 }, (err) => {
            if (err) console.error(`[MQTT] Subscribe ${t} failed:`, err);
            else console.log(`[MQTT] Subscribed: ${t}`);
          })
        );
      });

      client.on("message", handleMessage);

      client.on("error", (err) => {
        console.error("[MQTT] Error:", err);
        setStatus("error");
        setErrorMessage(err.message ?? "Connection error");
      });

      client.on("close", () => {
        setStatus((prev) => (prev === "connected" ? "disconnected" : prev));
      });

      client.on("reconnect", () => setStatus("connecting"));
    },
    [handleMessage]
  );

  const publish = useCallback((topic: string, payload: string): boolean => {
    const client = clientRef.current;
    if (!client?.connected) {
      console.warn(`[MQTT] Not connected — cannot publish to ${topic}`);
      return false;
    }
    client.publish(topic, payload, { qos: 1 });
    console.log(`[MQTT] Published ${topic} → ${payload}`);
    return true;
  }, []);

  const setConfig = useCallback((cfg: MqttConfig) => {
    setConfigState(cfg);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  }, []);

  const toggleAlarm = useCallback(() => {
    setAlarmEnabled((v) => {
      const next = !v;
      publish("home/alarm", next ? "ON" : "OFF");
      if (!next && alarmTriggered) {
        setAlarmTriggered(false);
        publish("home/buzzer", "OFF");
      }
      return next;
    });
  }, [alarmTriggered, publish]);

  const dismissAlarm = useCallback(() => {
    setAlarmTriggered(false);
    publish("home/buzzer", "OFF");
  }, [publish]);

  useEffect(() => {
    return () => {
      clientRef.current?.end(true);
    };
  }, []);

  return (
    <MqttContext.Provider
      value={{
        status,
        errorMessage,
        sensors,
        config,
        alarmEnabled,
        alarmTriggered,
        connect,
        disconnect,
        publish,
        setConfig,
        toggleAlarm,
        dismissAlarm,
      }}
    >
      {children}
    </MqttContext.Provider>
  );
}

export function useMqtt() {
  const ctx = useContext(MqttContext);
  if (!ctx) throw new Error("useMqtt must be used within MqttProvider");
  return ctx;
}
