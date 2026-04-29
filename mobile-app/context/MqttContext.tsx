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
  deviceId: string;
}

export interface SensorData {
  temperature: number | null;
  humidity: number | null;
  motion: boolean;
  redLedState: boolean;
  blueLedState: boolean;
  buzzerState: boolean;
  lastUpdate: Date | null;
}

export interface DataPoint {
  time: string;
  value: number;
}

type AlarmPrefs = { motion: boolean; temp: boolean };

interface MqttContextValue {
  status: ConnectionStatus;
  errorMessage: string | null;
  sensors: SensorData;
  config: MqttConfig;
  motionAlarmEnabled: boolean;
  tempAlarmEnabled: boolean;
  /** True if motion or temp alarm condition is latched (UI banner / haptics). */
  alarmTriggered: boolean;
  motionAlarmTriggered: boolean;
  tempAlarmTriggered: boolean;
  connect: (cfg: MqttConfig) => void;
  disconnect: () => void;
  publish: (topic: string, payload: string) => boolean;
  setConfig: (cfg: MqttConfig) => void;
  setDeviceId: (deviceId: string) => void;
  toggleMotionAlarm: () => void;
  toggleTempAlarm: () => void;
  dismissAlarm: () => void;
  logs: Array<{
    id: number;
    direction: "in" | "out";
    topic: string;
    payload: string;
    timestamp: Date;
  }>;
  tempHistory: DataPoint[];
  humHistory: DataPoint[];
}

const DEFAULT_CONFIG: MqttConfig = {
  brokerUrl: "wss://516e74c9ef2141bfbb71e74a08a4b722.s1.eu.hivemq.cloud:8884/mqtt",
  username: "pexaa",
  password: "KHalil123@",
  clientId: `smarthome_mobile_${Date.now().toString(16).slice(-6)}`,
  deviceId: "1",
};

const STORAGE_KEY = "@smarthome_mqtt_config";
const ALARM_PREFS_KEY = "@smarthome_alarm_prefs";
const TEMP_ALARM_THRESHOLD_C = 30;

function deviceTopic(deviceId: string, leaf: string) {
  return `home/${deviceId}/${leaf}`;
}

function normalizeBrokerUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return trimmed;
  const wsNormalized = trimmed
    .replace(/^mqtts:\/\//i, "wss://")
    .replace(/^mqtt:\/\//i, "ws://");
  if (!/^wss?:\/\//i.test(wsNormalized)) {
    return `wss://${wsNormalized.replace(/^\/+/, "")}`;
  }
  if (wsNormalized.includes(".hivemq.cloud") && !wsNormalized.endsWith("/mqtt")) {
    return `${wsNormalized.replace(/\/+$/, "")}/mqtt`;
  }
  return wsNormalized;
}
let logId = 0;

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
    redLedState: false,
    blueLedState: false,
    buzzerState: false,
    lastUpdate: null,
  });
  const [motionAlarmEnabled, setMotionAlarmEnabled] = useState(false);
  const [tempAlarmEnabled, setTempAlarmEnabled] = useState(false);
  const [motionAlarmTriggered, setMotionAlarmTriggered] = useState(false);
  const [tempAlarmTriggered, setTempAlarmTriggered] = useState(false);
  const [logs, setLogs] = useState<MqttContextValue["logs"]>([]);
  const [tempHistory, setTempHistory] = useState<DataPoint[]>([]);
  const [humHistory, setHumHistory] = useState<DataPoint[]>([]);
  const prevMotionRef = useRef(false);
  const prevTempAboveRef = useRef(false);
  const tempSampleInitializedRef = useRef(false);
  const lastTempRef = useRef<number | null>(null);
  const lastHumRef = useRef<number | null>(null);
  const lastPublishedAlarmPairRef = useRef<string | null>(null);
  const deviceIdRef = useRef(config.deviceId);
  useEffect(() => {
    deviceIdRef.current = config.deviceId;
  }, [config.deviceId]);

  const publishBuzzer = useCallback((deviceId: string, on: boolean) => {
    const c = clientRef.current;
    if (!c?.connected) return;
    c.publish(deviceTopic(deviceId, "buzzer"), on ? "ON" : "OFF", { qos: 1 });
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as MqttConfig;
          setConfigState(parsed);
        } catch {}
      }
    });
    AsyncStorage.getItem(ALARM_PREFS_KEY).then((raw) => {
      if (!raw) return;
      try {
        const p = JSON.parse(raw) as Partial<AlarmPrefs>;
        if (typeof p.motion === "boolean") setMotionAlarmEnabled(p.motion);
        if (typeof p.temp === "boolean") setTempAlarmEnabled(p.temp);
      } catch {}
    });
  }, []);

  const persistAlarmPrefs = useCallback((motion: boolean, temp: boolean) => {
    const body: AlarmPrefs = { motion, temp };
    AsyncStorage.setItem(ALARM_PREFS_KEY, JSON.stringify(body));
  }, []);

  const handleMessage = useCallback((topic: string, payload: Buffer) => {
    const message = payload.toString().trim();
    console.log(`[MQTT] ${topic} → ${message}`);
    setLogs((prev) => [
      ...prev.slice(-99),
      { id: ++logId, direction: "in", topic, payload: message, timestamp: new Date() },
    ]);
    if (!message) return;
    const parts = topic.split("/");
    if (parts.length < 3 || parts[0] !== "home") return;
    const topicDeviceId = parts[1];
    const activeId = deviceIdRef.current;
    if (topicDeviceId !== activeId) {
      console.log(`[MQTT] Auto-switching device from ${activeId} to ${topicDeviceId}`);
      deviceIdRef.current = topicDeviceId;
      setConfigState((prev) => {
        if (prev.deviceId === topicDeviceId) return prev;
        const next = { ...prev, deviceId: topicDeviceId };
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    }
    const leaf = parts.slice(2).join("/");
    setSensors((prev) => {
      const next = { ...prev, lastUpdate: new Date() };
      if (leaf === "temp") {
        const v = parseFloat(message);
        if (Number.isFinite(v)) {
          next.temperature = v;
          if (lastTempRef.current !== v) {
            lastTempRef.current = v;
            const point = { time: new Date().toLocaleTimeString(), value: v };
            setTempHistory((prevH) => {
              const nextSeries = [...prevH, point];
              return nextSeries.length > 30 ? nextSeries.slice(nextSeries.length - 30) : nextSeries;
            });
          }
        }
      } else if (leaf === "hum") {
        const v = parseFloat(message);
        if (Number.isFinite(v)) {
          next.humidity = v;
          if (lastHumRef.current !== v) {
            lastHumRef.current = v;
            const point = { time: new Date().toLocaleTimeString(), value: v };
            setHumHistory((prevH) => {
              const nextSeries = [...prevH, point];
              return nextSeries.length > 30 ? nextSeries.slice(nextSeries.length - 30) : nextSeries;
            });
          }
        }
      } else if (leaf === "motion") {
        next.motion =
          message === "1" ||
          message.toLowerCase() === "true" ||
          message.toLowerCase() === "detected" ||
          message.toLowerCase() === "motion";
      } else if (leaf === "red/status") {
        next.redLedState =
          message.toLowerCase() === "on" || message === "1" || message.toLowerCase() === "true";
      } else if (leaf === "blue/status" || leaf === "led/status") {
        next.blueLedState =
          message.toLowerCase() === "on" || message === "1" || message.toLowerCase() === "true";
      } else if (leaf === "buzzer/status") {
        next.buzzerState =
          message.toLowerCase() === "on" || message === "1" || message.toLowerCase() === "true";
      } else if (
        leaf === "red" ||
        leaf === "blue" ||
        leaf === "led" ||
        leaf === "buzzer" ||
        leaf === "alarm" ||
        leaf.startsWith("alarm/")
      ) {
        /* command echoes — …/status drives UI */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (status !== "connected") {
      lastPublishedAlarmPairRef.current = null;
      return;
    }
    const key = `${config.deviceId}|${motionAlarmEnabled},${tempAlarmEnabled}`;
    if (lastPublishedAlarmPairRef.current === key) return;
    lastPublishedAlarmPairRef.current = key;
    const c = clientRef.current;
    if (!c?.connected) return;
    c.publish(deviceTopic(config.deviceId, "alarm/motion"), motionAlarmEnabled ? "ON" : "OFF", {
      qos: 1,
    });
    c.publish(deviceTopic(config.deviceId, "alarm/temp"), tempAlarmEnabled ? "ON" : "OFF", {
      qos: 1,
    });
  }, [status, motionAlarmEnabled, tempAlarmEnabled, config.deviceId]);

  // Motion alarm → buzzer
  useEffect(() => {
    const motionOn = sensors.motion;
    const motionJust = motionOn && !prevMotionRef.current;
    const motionStopped = !motionOn && prevMotionRef.current;
    prevMotionRef.current = motionOn;

    if (motionJust && motionAlarmEnabled) {
      setMotionAlarmTriggered(true);
      publishBuzzer(config.deviceId, true);
    }
    if (motionStopped && motionAlarmTriggered) {
      setMotionAlarmTriggered(false);
      if (!tempAlarmTriggered) publishBuzzer(config.deviceId, false);
    }
  }, [
    sensors.motion,
    motionAlarmEnabled,
    motionAlarmTriggered,
    tempAlarmTriggered,
    config.deviceId,
    publishBuzzer,
  ]);

  // Temp threshold alarm
  useEffect(() => {
    const temp = sensors.temperature;
    if (temp === null || Number.isNaN(temp)) return;
    const above = temp >= TEMP_ALARM_THRESHOLD_C;
    if (!tempSampleInitializedRef.current) {
      tempSampleInitializedRef.current = true;
      prevTempAboveRef.current = above;
      return;
    }
    const crossedUp = above && !prevTempAboveRef.current;
    const crossedDown = !above && prevTempAboveRef.current;
    prevTempAboveRef.current = above;

    if (crossedUp && tempAlarmEnabled) {
      setTempAlarmTriggered(true);
      publishBuzzer(config.deviceId, true);
    }
    if (crossedDown && tempAlarmTriggered) {
      setTempAlarmTriggered(false);
      if (!motionAlarmTriggered) publishBuzzer(config.deviceId, false);
    }
  }, [
    sensors.temperature,
    tempAlarmEnabled,
    tempAlarmTriggered,
    motionAlarmTriggered,
    config.deviceId,
    publishBuzzer,
  ]);

  useEffect(() => {
    if (!motionAlarmEnabled && motionAlarmTriggered) {
      setMotionAlarmTriggered(false);
      if (!tempAlarmTriggered) publishBuzzer(config.deviceId, false);
    }
  }, [
    motionAlarmEnabled,
    motionAlarmTriggered,
    tempAlarmTriggered,
    config.deviceId,
    publishBuzzer,
  ]);

  useEffect(() => {
    if (!tempAlarmEnabled && tempAlarmTriggered) {
      setTempAlarmTriggered(false);
      if (!motionAlarmTriggered) publishBuzzer(config.deviceId, false);
    }
  }, [tempAlarmEnabled, tempAlarmTriggered, motionAlarmTriggered, config.deviceId, publishBuzzer]);

  useEffect(() => {
    persistAlarmPrefs(motionAlarmEnabled, tempAlarmEnabled);
  }, [motionAlarmEnabled, tempAlarmEnabled, persistAlarmPrefs]);

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
      const normalizedConfig = {
        ...cfg,
        brokerUrl: normalizeBrokerUrl(cfg.brokerUrl),
      };
      setConfigState(normalizedConfig);
      console.log(`[MQTT] Connecting to ${normalizedConfig.brokerUrl}`);

      const options: mqtt.IClientOptions = {
        clientId: normalizedConfig.clientId,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 12000,
        rejectUnauthorized: false,
      };
      if (normalizedConfig.username) {
        options.username = normalizedConfig.username;
        options.password = normalizedConfig.password;
      }

      const client = mqtt.connect(normalizedConfig.brokerUrl, options);
      clientRef.current = client;

      client.on("connect", () => {
        console.log("[MQTT] Connected!");
        setStatus("connected");
        setErrorMessage(null);
        const wildcardTopic = "home/#";
        client.subscribe(wildcardTopic, { qos: 0 }, (err) => {
          if (err) console.error(`[MQTT] Subscribe ${wildcardTopic} failed:`, err);
          else
            console.log(
              `[MQTT] Subscribed: ${wildcardTopic} (active filter ${normalizedConfig.deviceId})`,
            );
        });
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
    [handleMessage],
  );

  const publish = useCallback((topic: string, payload: string): boolean => {
    const client = clientRef.current;
    if (!client?.connected) {
      console.warn(`[MQTT] Not connected — cannot publish to ${topic}`);
      return false;
    }
    client.publish(topic, payload, { qos: 1 });
    console.log(`[MQTT] Published ${topic} → ${payload}`);
    setLogs((prev) => [
      ...prev.slice(-99),
      { id: ++logId, direction: "out", topic, payload, timestamp: new Date() },
    ]);
    return true;
  }, []);

  const setConfig = useCallback((cfg: MqttConfig) => {
    const normalized = {
      ...cfg,
      brokerUrl: normalizeBrokerUrl(cfg.brokerUrl),
    };
    setConfigState(normalized);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }, []);

  const setDeviceId = useCallback((deviceId: string) => {
    const normalized = deviceId.trim() || "1";
    setConfigState((prev) => {
      const next = { ...prev, deviceId: normalized };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleMotionAlarm = useCallback(() => {
    setMotionAlarmEnabled((v) => !v);
  }, []);

  const toggleTempAlarm = useCallback(() => {
    setTempAlarmEnabled((v) => !v);
  }, []);

  const dismissAlarm = useCallback(() => {
    setMotionAlarmTriggered(false);
    setTempAlarmTriggered(false);
    publish(deviceTopic(config.deviceId, "buzzer"), "OFF");
  }, [publish, config.deviceId]);

  useEffect(() => {
    return () => {
      clientRef.current?.end(true);
    };
  }, []);

  const alarmTriggered = motionAlarmTriggered || tempAlarmTriggered;

  return (
    <MqttContext.Provider
      value={{
        status,
        errorMessage,
        sensors,
        config,
        motionAlarmEnabled,
        tempAlarmEnabled,
        alarmTriggered,
        motionAlarmTriggered,
        tempAlarmTriggered,
        connect,
        disconnect,
        publish,
        setConfig,
        setDeviceId,
        toggleMotionAlarm,
        toggleTempAlarm,
        dismissAlarm,
        logs,
        tempHistory,
        humHistory,
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
