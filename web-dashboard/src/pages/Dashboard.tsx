import { useState, useEffect, useCallback, useRef } from "react";
import { useMqtt } from "@/hooks/useMqtt";
import { useAlarmSound, useBrowserNotifications } from "@/hooks/useAlarm";
import { useSensorHistory } from "@/hooks/useSensorHistory";
import { TemperatureChart } from "@/components/charts/TemperatureChart";
import { HumidityChart } from "@/components/charts/HumidityChart";
import { ConnectionModal } from "@/components/ConnectionModal";
import { NotificationToast } from "@/components/NotificationToast";
import { Switch } from "@/components/ui/switch";
import {
  Activity,
  BellRing,
  Flame,
  Gauge,
  Radio,
  Thermometer,
  Waves,
} from "lucide-react";
import {
  listDevices,
  listNotifications,
  getSettings,
  updateSettings,
  listRules,
  createRule,
  deleteRule,
  getHistory,
  type Device,
  type NotificationEvent,
  type Rule,
} from "@workspace/api-client-react";

interface Toast {
  id: number;
  message: string;
  type: "alert" | "info" | "success";
}

const TEMP_ALARM_THRESHOLD_C = 30;

const LS_ALARM_MOTION = "smarthome_alarm_motion";
const LS_ALARM_TEMP = "smarthome_alarm_temp";

function readStoredAlarms(): { motion: boolean; temp: boolean } {
  if (typeof window === "undefined") return { motion: false, temp: false };
  return {
    motion: localStorage.getItem(LS_ALARM_MOTION) === "true",
    temp: localStorage.getItem(LS_ALARM_TEMP) === "true",
  };
}

function writeStoredAlarms(motion: boolean, temp: boolean) {
  try {
    localStorage.setItem(LS_ALARM_MOTION, motion ? "true" : "false");
    localStorage.setItem(LS_ALARM_TEMP, temp ? "true" : "false");
  } catch {
    /* quota / private mode */
  }
}

interface PendingState {
  red: boolean;
  blue: boolean;
  buzzer: boolean;
}

let toastId = 0;
type Lang = "en" | "fr" | "ar";

const translations = {
  en: {
    appName: "SmartHome Cloud",
    appSubtitle: "Mobile IoT dashboard",
    connected: "Connected",
    connecting: "Connecting",
    offline: "Offline",
    error: "Error",
    connect: "Connect",
    disconnect: "Disconnect",
    temperature: "Temperature",
    humidity: "Humidity",
    motion: "Motion",
    noMotion: "No Motion",
    motionDetected: "Motion Detected",
    indoor: "Indoor",
    relative: "Relative",
    controls: "Controls",
    led: "LED",
    ledRed: "Red LED",
    ledBlue: "Blue LED",
    buzzer: "Buzzer",
    alarm: "Alarm",
    alarms: "Alarms",
    alarmMotion: "Motion alarm",
    alarmTemp: "Temp alarm",
    pending: "Pending...",
    on: "ON",
    off: "OFF",
    armed: "ARMED",
    triggered: "TRIGGERED",
    realtimeCharts: "Realtime Charts",
    daily: "Daily",
    weekly: "Weekly",
    refresh: "Refresh",
    waitingData: "Waiting for MQTT data...",
    automationRules: "Automation Rules",
    serverNotifications: "Server Notifications",
    liveLogs: "Live MQTT Logs",
    noRules: "No rules configured for this device.",
    noServerEvents: "No server-side events yet.",
    noMqttTraffic: "No MQTT traffic yet.",
    lastUpdate: "Last update",
    broker: "Broker",
    client: "Client",
    device: "Device",
    intrusion: "Intrusion detected",
    intrusionSub: "Motion detected, buzzer activated automatically",
    tempAlert: "Temperature alert",
    tempAlertSub: "Temperature crossed threshold while temp alarm is on",
    dismiss: "Dismiss",
    notConnectedMsg: "Not connected to MQTT broker.",
    receiveLiveMsg: "to receive live data and control devices.",
    alert: "Alert",
    warning: "Warning",
    normal: "Normal",
    motionNight: "motion night",
    tempThreshold: "temp threshold",
    anomaly: "anomaly",
    delete: "Delete",
    espFooter: "ESP32 Smart Home",
    mqttFooter: "MQTT over WSS",
  },
  fr: {
    appName: "SmartHome Cloud",
    appSubtitle: "Tableau IoT mobile",
    connected: "Connecté",
    connecting: "Connexion",
    offline: "Hors ligne",
    error: "Erreur",
    connect: "Connecter",
    disconnect: "Déconnecter",
    temperature: "Température",
    humidity: "Humidité",
    motion: "Mouvement",
    noMotion: "Aucun mouvement",
    motionDetected: "Mouvement détecté",
    indoor: "Intérieur",
    relative: "Relative",
    controls: "Contrôles",
    led: "LED",
    ledRed: "LED rouge",
    ledBlue: "LED bleue",
    buzzer: "Buzzer",
    alarm: "Alarme",
    alarms: "Alarmes",
    alarmMotion: "Alarme mouvement",
    alarmTemp: "Alarme température",
    pending: "En attente...",
    on: "ON",
    off: "OFF",
    armed: "ARMÉ",
    triggered: "DÉCLENCHÉE",
    realtimeCharts: "Graphiques temps réel",
    daily: "Jour",
    weekly: "Semaine",
    refresh: "Rafraîchir",
    waitingData: "En attente des données MQTT...",
    automationRules: "Règles automatiques",
    serverNotifications: "Notifications serveur",
    liveLogs: "Logs MQTT en direct",
    noRules: "Aucune règle pour cet appareil.",
    noServerEvents: "Aucun événement serveur.",
    noMqttTraffic: "Aucun trafic MQTT.",
    lastUpdate: "Dernière mise à jour",
    broker: "Broker",
    client: "Client",
    device: "Appareil",
    intrusion: "Intrusion détectée",
    intrusionSub: "Mouvement détecté, buzzer activé automatiquement",
    tempAlert: "Alerte température",
    tempAlertSub: "Température au-dessus du seuil avec alarme temp activée",
    dismiss: "Fermer",
    notConnectedMsg: "Non connecté au broker MQTT.",
    receiveLiveMsg: "pour recevoir les données en direct et contrôler les appareils.",
    alert: "Alerte",
    warning: "Avertissement",
    normal: "Normal",
    motionNight: "mouvement nuit",
    tempThreshold: "seuil temp",
    anomaly: "anomalie",
    delete: "Supprimer",
    espFooter: "ESP32 Maison Connectée",
    mqttFooter: "MQTT via WSS",
  },
  ar: {
    appName: "سمارت هوم كلاود",
    appSubtitle: "لوحة إنترنت الأشياء",
    connected: "متصل",
    connecting: "جاري الاتصال",
    offline: "غير متصل",
    error: "خطأ",
    connect: "اتصال",
    disconnect: "قطع الاتصال",
    temperature: "درجة الحرارة",
    humidity: "الرطوبة",
    motion: "الحركة",
    noMotion: "لا توجد حركة",
    motionDetected: "تم اكتشاف حركة",
    indoor: "داخلي",
    relative: "نسبية",
    controls: "التحكم",
    led: "الإضاءة",
    ledRed: "LED أحمر",
    ledBlue: "LED أزرق",
    buzzer: "الصفارة",
    alarm: "الإنذار",
    alarms: "الإنذارات",
    alarmMotion: "إنذار الحركة",
    alarmTemp: "إنذار الحرارة",
    pending: "قيد الانتظار...",
    on: "تشغيل",
    off: "إيقاف",
    armed: "مفعل",
    triggered: "تم التفعيل",
    realtimeCharts: "مخططات لحظية",
    daily: "يومي",
    weekly: "أسبوعي",
    refresh: "تحديث",
    waitingData: "بانتظار بيانات MQTT...",
    automationRules: "قواعد الأتمتة",
    serverNotifications: "إشعارات الخادم",
    liveLogs: "سجلات MQTT المباشرة",
    noRules: "لا توجد قواعد لهذا الجهاز.",
    noServerEvents: "لا توجد أحداث من الخادم.",
    noMqttTraffic: "لا يوجد مرور MQTT بعد.",
    lastUpdate: "آخر تحديث",
    broker: "الوسيط",
    client: "العميل",
    device: "الجهاز",
    intrusion: "تم اكتشاف اقتحام",
    intrusionSub: "تم اكتشاف حركة، تم تفعيل الصفارة تلقائيا",
    tempAlert: "تنبيه حرارة",
    tempAlertSub: "تجاوزت الحرارة العتبة مع تفعيل إنذار الحرارة",
    dismiss: "إغلاق",
    notConnectedMsg: "غير متصل بوسيط MQTT.",
    receiveLiveMsg: "لاستقبال البيانات المباشرة والتحكم بالأجهزة.",
    alert: "تنبيه",
    warning: "تحذير",
    normal: "طبيعي",
    motionNight: "حركة ليلية",
    tempThreshold: "حد الحرارة",
    anomaly: "شذوذ",
    delete: "حذف",
    espFooter: "منزل ذكي ESP32",
    mqttFooter: "MQTT عبر WSS",
  },
} as const;

export default function Dashboard() {
  const { status, errorMessage, sensors, publish, connect, disconnect, config, setConfig, logs } = useMqtt();
  const { play: playAlarm, stop: stopAlarm } = useAlarmSound();
  const { requestPermission, notify } = useBrowserNotifications();
  const { tempHistory, humHistory, addTemperature, addHumidity } = useSensorHistory();

  const [motionAlarmEnabled, setMotionAlarmEnabled] = useState(
    () => readStoredAlarms().motion,
  );
  const [tempAlarmEnabled, setTempAlarmEnabled] = useState(() => readStoredAlarms().temp);
  const [motionAlarmTriggered, setMotionAlarmTriggered] = useState(false);
  const [tempAlarmTriggered, setTempAlarmTriggered] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState<PendingState>({ red: false, blue: false, buzzer: false });
  const [devices, setDevices] = useState<Device[]>([]);
  const [serverEvents, setServerEvents] = useState<NotificationEvent[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [historyRange, setHistoryRange] = useState<"daily" | "weekly">("daily");
  const [currentLang, setCurrentLang] = useState<Lang>(
    () =>
      (typeof window !== "undefined"
        ? (localStorage.getItem("smarthome_lang") as Lang | null)
        : null) ?? "en",
  );
  const [historyTemp, setHistoryTemp] = useState<{ time: string; value: number }[]>([]);
  const [historyHum, setHistoryHum] = useState<{ time: string; value: number }[]>([]);
  const seenEventIdsRef = useRef<Set<number>>(new Set());
  const prevMotionRef = useRef(false);
  const prevTempAboveRef = useRef(false);
  const tempSampleInitializedRef = useRef(false);
  const prevRedLedRef = useRef(sensors.redLedState);
  const prevBlueLedRef = useRef(sensors.blueLedState);
  const prevBuzzerRef = useRef(sensors.buzzerState);
  const lastPublishedAlarmPairRef = useRef<string | null>(null);
  const topic = useCallback((leaf: string) => `home/${config.deviceId}/${leaf}`, [config.deviceId]);
  /** Motion or temp alarm armed → automation owns red + buzzer; manual toggles disabled */
  const alarmsLockManualOutputs = motionAlarmEnabled || tempAlarmEnabled;
  const t = useCallback(
    (key: keyof (typeof translations)["en"]) => translations[currentLang][key],
    [currentLang],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("smarthome_lang", currentLang);
    document.documentElement.dir = currentLang === "ar" ? "rtl" : "ltr";
  }, [currentLang]);

  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;
    let nextDelayMs = 10_000;

    const tick = async (notifyOnNew: boolean) => {
      try {
        const [devicesRes, settingsRes, eventsRes] = await Promise.all([
          listDevices(),
          getSettings(),
          listNotifications({ limit: 20 }),
        ]);
        if (!mounted) return;
        nextDelayMs = 10_000;
        setDevices(devicesRes.devices);
        setServerEvents(eventsRes.events);
        const motion = settingsRes.settings.alarmEnabled;
        const temp = Boolean(settingsRes.settings.tempAlarmEnabled);
        setMotionAlarmEnabled(motion);
        setTempAlarmEnabled(temp);
        writeStoredAlarms(motion, temp);

        if (notifyOnNew) {
          for (const event of eventsRes.events) {
            if (!seenEventIdsRef.current.has(event.id)) {
              notify(event.title, event.body);
            }
          }
        }
        seenEventIdsRef.current = new Set(eventsRes.events.map((e) => e.id));
      } catch {
        nextDelayMs = Math.min(nextDelayMs * 2, 120_000);
      }
      if (mounted) {
        timeoutId = setTimeout(() => tick(true), nextDelayMs);
      }
    };

    tick(false);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [notify]);

  const rulesBackoffRef = useRef(10_000);

  const loadRulesAndHistory = useCallback(async () => {
    try {
      const [rulesRes, historyRes] = await Promise.all([
        listRules(),
        getHistory({ deviceId: config.deviceId, range: historyRange }),
      ]);
      rulesBackoffRef.current = 10_000;
      setRules(rulesRes.rules);
      setHistoryTemp(
        historyRes.series.temp.map((p) => ({
          time: new Date(p.t).toLocaleTimeString(),
          value: p.v,
        })),
      );
      setHistoryHum(
        historyRes.series.hum.map((p) => ({
          time: new Date(p.t).toLocaleTimeString(),
          value: p.v,
        })),
      );
    } catch {
      rulesBackoffRef.current = Math.min(rulesBackoffRef.current * 2, 120_000);
    }
  }, [config.deviceId, historyRange]);

  useEffect(() => {
    let cancelled = false;
    let tid: ReturnType<typeof setTimeout>;

    const run = async () => {
      await loadRulesAndHistory();
      if (!cancelled) {
        tid = setTimeout(run, rulesBackoffRef.current);
      }
    };

    run();

    return () => {
      cancelled = true;
      clearTimeout(tid);
    };
  }, [loadRulesAndHistory]);

  const addToast = useCallback((message: string, type: Toast["type"]) => {
    const id = ++toastId;
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Track sensor history
  useEffect(() => {
    if (sensors.temperature !== null) addTemperature(sensors.temperature);
    if (sensors.humidity !== null) addHumidity(sensors.humidity);
  }, [sensors.temperature, sensors.humidity, addTemperature, addHumidity]);

  // Clear LED pending when ESP32 confirms
  useEffect(() => {
    if (sensors.redLedState !== prevRedLedRef.current) {
      prevRedLedRef.current = sensors.redLedState;
      setPending((p) => ({ ...p, red: false }));
    }
  }, [sensors.redLedState]);

  useEffect(() => {
    if (sensors.blueLedState !== prevBlueLedRef.current) {
      prevBlueLedRef.current = sensors.blueLedState;
      setPending((p) => ({ ...p, blue: false }));
    }
  }, [sensors.blueLedState]);

  // Clear Buzzer pending state when ESP32 confirms
  useEffect(() => {
    if (sensors.buzzerState !== prevBuzzerRef.current) {
      prevBuzzerRef.current = sensors.buzzerState;
      setPending((p) => ({ ...p, buzzer: false }));
    }
  }, [sensors.buzzerState]);

  // Keep ESP alarm flags in sync when MQTT connects, device id changes, or toggles change.
  // Key must include deviceId — otherwise after auto-switch from default "1" to ESP32 we skip republish and the board never gets alarm OFF.
  useEffect(() => {
    if (status !== "connected") {
      lastPublishedAlarmPairRef.current = null;
      return;
    }
    const key = `${config.deviceId}|${motionAlarmEnabled},${tempAlarmEnabled}`;
    if (lastPublishedAlarmPairRef.current === key) return;
    lastPublishedAlarmPairRef.current = key;
    publish(topic("alarm/motion"), motionAlarmEnabled ? "ON" : "OFF");
    publish(topic("alarm/temp"), tempAlarmEnabled ? "ON" : "OFF");
  }, [status, config.deviceId, motionAlarmEnabled, tempAlarmEnabled, publish, topic]);

  // Motion alarm
  useEffect(() => {
    const motionJustDetected = sensors.motion && !prevMotionRef.current;
    const motionStopped = !sensors.motion && prevMotionRef.current;
    prevMotionRef.current = sensors.motion;

    if (motionJustDetected) {
      if (motionAlarmEnabled) {
        setMotionAlarmTriggered(true);
        playAlarm();
        publish(topic("buzzer"), "ON");
        addToast("Intrusion Detected! Alarm activated.", "alert");
        notify("Smart Home Alert", "Motion detected! Alarm triggered.");
        console.log("[Alarm] Motion detected — auto-triggered buzzer ON");
      } else {
        addToast("Motion detected", "info");
        console.log("[Alarm] Motion detected — motion alarm off, no action");
      }
    }

    if (motionStopped && motionAlarmTriggered) {
      setMotionAlarmTriggered(false);
      if (!tempAlarmTriggered) {
        stopAlarm();
        publish(topic("buzzer"), "OFF");
      }
      addToast("All clear — motion stopped", "success");
      console.log("[Alarm] Motion cleared");
    }
  }, [
    sensors.motion,
    motionAlarmEnabled,
    motionAlarmTriggered,
    tempAlarmTriggered,
    playAlarm,
    stopAlarm,
    publish,
    addToast,
    notify,
    topic,
  ]);

  // Temp alarm (edge crossing threshold)
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
      playAlarm();
      publish(topic("buzzer"), "ON");
      addToast(`Temperature ≥ ${TEMP_ALARM_THRESHOLD_C}°C — alarm`, "alert");
      notify("Smart Home Alert", `Temperature crossed ${TEMP_ALARM_THRESHOLD_C}°C`);
      console.log("[Alarm] Temp threshold crossed — buzzer ON");
    }

    if (crossedDown && tempAlarmTriggered) {
      setTempAlarmTriggered(false);
      if (!motionAlarmTriggered) {
        stopAlarm();
        publish(topic("buzzer"), "OFF");
      }
      console.log("[Alarm] Temp back below threshold");
    }
  }, [
    sensors.temperature,
    tempAlarmEnabled,
    tempAlarmTriggered,
    motionAlarmTriggered,
    playAlarm,
    stopAlarm,
    publish,
    addToast,
    notify,
    topic,
  ]);

  useEffect(() => {
    if (!motionAlarmEnabled && motionAlarmTriggered) {
      setMotionAlarmTriggered(false);
      if (!tempAlarmTriggered) {
        stopAlarm();
        publish(topic("buzzer"), "OFF");
      }
      console.log("[Alarm] Motion alarm disabled while active");
    }
  }, [motionAlarmEnabled, motionAlarmTriggered, tempAlarmTriggered, stopAlarm, publish, topic]);

  useEffect(() => {
    if (!tempAlarmEnabled && tempAlarmTriggered) {
      setTempAlarmTriggered(false);
      if (!motionAlarmTriggered) {
        stopAlarm();
        publish(topic("buzzer"), "OFF");
      }
      console.log("[Alarm] Temp alarm disabled while active");
    }
  }, [tempAlarmEnabled, tempAlarmTriggered, motionAlarmTriggered, stopAlarm, publish, topic]);

  const toggleRedLed = () => {
    const next = sensors.redLedState ? "OFF" : "ON";
    const ok = publish(topic("red"), next);
    if (ok) {
      setPending((p) => ({ ...p, red: true }));
      setTimeout(() => setPending((p) => ({ ...p, red: false })), 5000);
    }
  };

  const toggleBlueLed = () => {
    const next = sensors.blueLedState ? "OFF" : "ON";
    const ok = publish(topic("blue"), next);
    if (ok) {
      setPending((p) => ({ ...p, blue: true }));
      setTimeout(() => setPending((p) => ({ ...p, blue: false })), 5000);
    }
  };

  const toggleBuzzer = () => {
    const next = sensors.buzzerState ? "OFF" : "ON";
    const ok = publish(topic("buzzer"), next);
    if (ok) {
      setPending((p) => ({ ...p, buzzer: true }));
      setTimeout(() => setPending((p) => ({ ...p, buzzer: false })), 5000);
    }
  };

  const toggleMotionAlarm = () => {
    const next = !motionAlarmEnabled;
    setMotionAlarmEnabled(next);
    writeStoredAlarms(next, tempAlarmEnabled);
    updateSettings({ alarmEnabled: next }).catch(() => undefined);
    console.log(`[Alarm] Motion ${next ? "ON" : "OFF"}`);
  };

  const toggleTempAlarm = () => {
    const next = !tempAlarmEnabled;
    setTempAlarmEnabled(next);
    writeStoredAlarms(motionAlarmEnabled, next);
    updateSettings({ tempAlarmEnabled: next }).catch(() => undefined);
    console.log(`[Alarm] Temp ${next ? "ON" : "OFF"}`);
  };

  const handleConnect = (cfg: typeof config) => {
    setConfig(cfg);
    connect(cfg);
    requestPermission();
  };

  const handleReconnect = () => {
    connect(config);
  };

  const statusMeta = {
    disconnected: { dot: "bg-gray-500", text: "text-gray-400", label: t("offline") },
    connecting: { dot: "bg-yellow-400", text: "text-yellow-400", label: t("connecting") },
    connected: { dot: "bg-emerald-500", text: "text-emerald-400", label: t("connected") },
    error: { dot: "bg-red-500", text: "text-red-400", label: t("error") },
  };
  const sc = statusMeta[status];

  const lastUpdateStr = sensors.lastUpdate
    ? sensors.lastUpdate.toLocaleTimeString()
    : "--:--:--";

  const isConnected = status === "connected";
  const chartTemp = [...historyTemp, ...tempHistory].slice(-30);
  const chartHum = [...historyHum, ...humHistory].slice(-30);

  const createDefaultRule = async (type: "motion_night_buzzer" | "temp_threshold_alert" | "anomaly_alert") => {
    try {
      const deviceIdNum = Number(config.deviceId);
      if (!deviceIdNum) return;
      if (type === "motion_night_buzzer") {
        await createRule({ type, deviceId: deviceIdNum, startHour: 22, endHour: 6 });
      } else if (type === "temp_threshold_alert") {
        await createRule({ type, deviceId: deviceIdNum, thresholdC: 32 });
      } else {
        await createRule({ type, deviceId: deviceIdNum });
      }
      loadRulesAndHistory();
    } catch {
      addToast("Failed to create rule", "alert");
    }
  };

  const removeRule = async (id: number) => {
    try {
      await deleteRule(id);
      loadRulesAndHistory();
    } catch {
      addToast("Failed to delete rule", "alert");
    }
  };

  const tempSeverity =
    sensors.temperature === null ? "normal" : sensors.temperature >= 35 ? "alert" : sensors.temperature >= 30 ? "warn" : "normal";
  const humSeverity =
    sensors.humidity === null ? "normal" : sensors.humidity >= 80 ? "warn" : sensors.humidity <= 25 ? "alert" : "normal";
  const severityStyles = {
    normal: "border-blue-500/20 text-blue-400",
    warn: "border-amber-500/25 text-amber-400",
    alert: "border-red-500/25 text-red-400",
  } as const;

  return (
    <div className="min-h-screen bg-[#0f172a] text-[#e5e7eb]">
      {(motionAlarmTriggered || tempAlarmTriggered) && <div className="alarm-overlay" />}

      <div className="fixed right-3 top-3 z-50 flex max-w-[90vw] flex-col gap-2 sm:right-6 sm:top-6">
        {toasts.map((toast) => (
          <NotificationToast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      {showConnectionModal && (
        <ConnectionModal
          config={config}
          onConnect={handleConnect}
          onClose={() => setShowConnectionModal(false)}
        />
      )}

      <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">
        <main className="space-y-4 sm:space-y-6">
          <header className="saas-card rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="mb-2 flex items-center gap-1">
                  {(["en", "fr", "ar"] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setCurrentLang(lang)}
                      className={`rounded-md border px-2 py-0.5 text-[11px] uppercase transition ${
                        currentLang === lang
                          ? "border-blue-500/60 text-blue-300"
                          : "border-white/10 text-[#9ca3af]"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
                <h1 className="text-lg font-semibold sm:text-xl">{t("appName")}</h1>
                <p className="text-xs text-[#9ca3af]">{t("appSubtitle")}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${sc.dot}`} />
                <span className={`text-xs font-medium ${sc.text}`}>{sc.label}</span>
                <button
                  onClick={() => {
                    if (isConnected) {
                      disconnect();
                      addToast("Disconnected from broker", "info");
                    } else {
                      setShowConnectionModal(true);
                    }
                  }}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition active:scale-95 ${
                    isConnected
                      ? "border-red-500/40 text-red-400"
                      : "border-blue-500/40 text-blue-400"
                  }`}
                >
                  {isConnected ? t("disconnect") : t("connect")}
                </button>
              </div>
            </div>
          </header>

          {status === "error" && errorMessage && (
            <div className="saas-card rounded-2xl border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              MQTT connection error: {errorMessage}
            </div>
          )}

          {(motionAlarmTriggered || tempAlarmTriggered) && (
            <div className="saas-card flex items-center gap-3 rounded-2xl border-red-500/40 bg-red-500/10 p-4">
              <Flame className="h-5 w-5 text-red-400" />
              <div>
                <p className="text-sm font-semibold text-red-300">
                  {motionAlarmTriggered && tempAlarmTriggered
                    ? `${t("intrusion")} · ${t("tempAlert")}`
                    : motionAlarmTriggered
                      ? t("intrusion")
                      : t("tempAlert")}
                </p>
                <p className="text-xs text-red-200/80">
                  {motionAlarmTriggered && tempAlarmTriggered
                    ? `${t("intrusionSub")} ${t("tempAlertSub")}`
                    : motionAlarmTriggered
                      ? t("intrusionSub")
                      : t("tempAlertSub")}
                </p>
              </div>
              <button
                onClick={() => {
                  setMotionAlarmTriggered(false);
                  setTempAlarmTriggered(false);
                  stopAlarm();
                  publish(topic("buzzer"), "OFF");
                }}
                className="ml-auto rounded-xl border border-red-500/40 px-3 py-1.5 text-xs text-red-300 transition active:scale-95"
              >
                {t("dismiss")}
              </button>
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className={`saas-card rounded-2xl p-4 ${severityStyles[tempSeverity]}`}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-[#9ca3af]">
                  <Thermometer className="h-4 w-4" />
                  {t("temperature")}
                </div>
                <span className="text-xs text-[#9ca3af]">{t("indoor")}</span>
              </div>
              <p className="text-4xl font-semibold">
                {sensors.temperature !== null ? sensors.temperature.toFixed(1) : "--"}
                <span className="ml-1 text-base text-[#9ca3af]">°C</span>
              </p>
              <p className="mt-2 text-xs text-[#9ca3af]">
                {tempSeverity === "alert" ? t("alert") : tempSeverity === "warn" ? t("warning") : t("normal")}
              </p>
            </div>

            <div className={`saas-card rounded-2xl p-4 ${severityStyles[humSeverity]}`}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-[#9ca3af]">
                  <Waves className="h-4 w-4" />
                  {t("humidity")}
                </div>
                <span className="text-xs text-[#9ca3af]">{t("relative")}</span>
              </div>
              <p className="text-4xl font-semibold">
                {sensors.humidity !== null ? sensors.humidity.toFixed(1) : "--"}
                <span className="ml-1 text-base text-[#9ca3af]">%</span>
              </p>
              <p className="mt-2 text-xs text-[#9ca3af]">
                {humSeverity === "alert" ? t("alert") : humSeverity === "warn" ? t("warning") : t("normal")}
              </p>
            </div>

            <div className="saas-card rounded-2xl p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-[#9ca3af]">
                  <Activity className={`h-4 w-4 transition ${sensors.motion ? "animate-pulse text-emerald-400" : ""}`} />
                  {t("motion")}
                </div>
                <span className="text-xs text-[#9ca3af]">{topic("motion")}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${sensors.motion ? "bg-emerald-400" : "bg-gray-500"}`} />
                <span className="text-base font-medium">{sensors.motion ? t("motionDetected") : t("noMotion")}</span>
              </div>
            </div>

            <div className="saas-card rounded-2xl p-4 md:col-span-2 lg:col-span-3">
              <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 md:grid-cols-4">
                <div><span className="text-[#9ca3af]">{t("lastUpdate")}:</span> <span>{lastUpdateStr}</span></div>
                <div className="truncate"><span className="text-[#9ca3af]">{t("broker")}:</span> <span>{config.brokerUrl.replace("wss://", "").split(":")[0]}</span></div>
                <div><span className="text-[#9ca3af]">{t("client")}:</span> <span>{config.clientId.slice(-10)}</span></div>
                <div><span className="text-[#9ca3af]">{t("device")}:</span> <span>{config.deviceId}</span></div>
              </div>
            </div>
          </section>

          {!isConnected && status !== "connecting" && (
            <div className="saas-card rounded-2xl border-blue-500/20 bg-blue-500/5 p-3 text-sm text-[#9ca3af]">
              {t("notConnectedMsg")}{" "}
              <button onClick={() => setShowConnectionModal(true)} className="text-blue-400 underline">
                {t("connect")}
              </button>{" "}
              {t("receiveLiveMsg")}
            </div>
          )}

          <section className="saas-card rounded-2xl p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#9ca3af]">{t("controls")}</h3>
              <Radio className="h-4 w-4 text-[#9ca3af]" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#111827] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm text-[#9ca3af]">{t("ledRed")}</p>
                  <Switch
                    checked={sensors.redLedState}
                    onCheckedChange={() => toggleRedLed()}
                    disabled={!isConnected || pending.red || alarmsLockManualOutputs}
                    className="h-7 w-12 data-[state=checked]:bg-red-500"
                  />
                </div>
                <p className={`text-lg font-semibold ${sensors.redLedState ? "text-red-400" : "text-[#9ca3af]"}`}>
                  {pending.red ? t("pending") : sensors.redLedState ? t("on") : t("off")}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#111827] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm text-[#9ca3af]">{t("ledBlue")}</p>
                  <Switch
                    checked={sensors.blueLedState}
                    onCheckedChange={() => toggleBlueLed()}
                    disabled={!isConnected || pending.blue}
                    className="h-7 w-12 data-[state=checked]:bg-blue-500"
                  />
                </div>
                <p className={`text-lg font-semibold ${sensors.blueLedState ? "text-blue-400" : "text-[#9ca3af]"}`}>
                  {pending.blue ? t("pending") : sensors.blueLedState ? t("on") : t("off")}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#111827] p-4 sm:col-span-2 lg:col-span-1">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm text-[#9ca3af]">{t("buzzer")}</p>
                  <Switch
                    checked={sensors.buzzerState}
                    onCheckedChange={() => toggleBuzzer()}
                    disabled={!isConnected || pending.buzzer || alarmsLockManualOutputs}
                    className="h-7 w-12 data-[state=checked]:bg-amber-500"
                  />
                </div>
                <p className={`text-lg font-semibold ${sensors.buzzerState ? "text-amber-400" : "text-[#9ca3af]"}`}>
                  {pending.buzzer ? t("pending") : sensors.buzzerState ? t("on") : t("off")}
                </p>
              </div>
            </div>

            <div className="mt-6 border-t border-white/10 pt-4">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#9ca3af]">{t("alarms")}</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-[#111827] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm text-[#9ca3af]">{t("alarmMotion")}</p>
                    <Switch
                      checked={motionAlarmEnabled}
                      onCheckedChange={() => toggleMotionAlarm()}
                      className="h-7 w-12 data-[state=checked]:bg-emerald-500"
                    />
                  </div>
                  <p
                    className={`text-lg font-semibold ${motionAlarmTriggered ? "text-red-400" : motionAlarmEnabled ? "text-emerald-400" : "text-[#9ca3af]"}`}
                  >
                    {motionAlarmTriggered ? t("triggered") : motionAlarmEnabled ? t("armed") : t("off")}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#111827] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm text-[#9ca3af]">{t("alarmTemp")}</p>
                    <Switch
                      checked={tempAlarmEnabled}
                      onCheckedChange={() => toggleTempAlarm()}
                      className="h-7 w-12 data-[state=checked]:bg-emerald-500"
                    />
                  </div>
                  <p
                    className={`text-lg font-semibold ${tempAlarmTriggered ? "text-red-400" : tempAlarmEnabled ? "text-emerald-400" : "text-[#9ca3af]"}`}
                  >
                    {tempAlarmTriggered ? t("triggered") : tempAlarmEnabled ? t("armed") : t("off")}
                  </p>
                  <p className="mt-1 text-[10px] text-[#6b7280]">
                    ≥ {TEMP_ALARM_THRESHOLD_C}°C ({t("temperature").toLowerCase()})
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="saas-card rounded-2xl p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[#9ca3af]">{t("realtimeCharts")}</h3>
              <div className="flex gap-2 text-xs">
                <button
                  onClick={() => setHistoryRange("daily")}
                  className={`rounded-xl border px-3 py-1.5 transition active:scale-95 ${historyRange === "daily" ? "border-blue-500/50 text-blue-400" : "border-white/10 text-[#9ca3af]"}`}
                >
                  {t("daily")}
                </button>
                <button
                  onClick={() => setHistoryRange("weekly")}
                  className={`rounded-xl border px-3 py-1.5 transition active:scale-95 ${historyRange === "weekly" ? "border-blue-500/50 text-blue-400" : "border-white/10 text-[#9ca3af]"}`}
                >
                  {t("weekly")}
                </button>
                <button
                  onClick={loadRulesAndHistory}
                  className="rounded-xl border border-white/10 px-3 py-1.5 text-[#9ca3af] transition active:scale-95"
                >
                  {t("refresh")}
                </button>
              </div>
            </div>
            {chartTemp.length === 0 && chartHum.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-[#111827] text-center">
                <Gauge className="h-8 w-8 text-[#9ca3af]/50" />
                <p className="mt-2 text-sm text-[#e5e7eb]">{t("waitingData")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <TemperatureChart data={chartTemp} lang={currentLang} />
                <HumidityChart data={chartHum} lang={currentLang} />
              </div>
            )}
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="saas-card rounded-2xl p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-[#9ca3af]">{t("automationRules")}</h3>
                  <span className="text-xs text-[#9ca3af]">{t("device")} {config.deviceId}</span>
                </div>
                <div className="mb-3 flex flex-wrap gap-2">
                  <button onClick={() => createDefaultRule("motion_night_buzzer")} className="rounded-xl border border-white/10 px-2.5 py-1 text-xs text-[#9ca3af] transition active:scale-95">+ {t("motionNight")}</button>
                  <button onClick={() => createDefaultRule("temp_threshold_alert")} className="rounded-xl border border-white/10 px-2.5 py-1 text-xs text-[#9ca3af] transition active:scale-95">+ {t("tempThreshold")}</button>
                  <button onClick={() => createDefaultRule("anomaly_alert")} className="rounded-xl border border-white/10 px-2.5 py-1 text-xs text-[#9ca3af] transition active:scale-95">+ {t("anomaly")}</button>
                </div>
                <div className="space-y-2 text-xs">
                  {rules.filter((r) => String(r.deviceId) === config.deviceId).map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between rounded-md border border-white/10 bg-[#0b1224] px-2.5 py-2">
                      <span className="text-[#e5e7eb]">{rule.type}</span>
                      <button onClick={() => removeRule(rule.id)} className="text-red-400 transition hover:text-red-300">{t("delete")}</button>
                    </div>
                  ))}
                  {rules.filter((r) => String(r.deviceId) === config.deviceId).length === 0 && <p className="text-[#9ca3af]">{t("noRules")}</p>}
                </div>
              </div>

              <div className="saas-card rounded-2xl p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-[#9ca3af]">{t("serverNotifications")}</h3>
                  <BellRing className="h-4 w-4 text-[#9ca3af]" />
                </div>
                <div className="max-h-48 space-y-2 overflow-auto text-xs">
                  {serverEvents.length === 0 ? (
                    <p className="text-[#9ca3af]">{t("noServerEvents")}</p>
                  ) : (
                    serverEvents.map((event) => (
                      <div key={event.id} className="rounded-md border border-white/10 bg-[#0b1224] p-2.5">
                        <p className="font-medium text-[#e5e7eb]">{event.title}</p>
                        <p className="text-[#9ca3af]">{event.body}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="saas-card rounded-2xl p-4 lg:col-span-1">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-[#9ca3af]">{t("liveLogs")}</h3>
                  <span className="text-xs text-[#9ca3af]">{logs.length} entries</span>
                </div>
                <div className="max-h-48 space-y-1 overflow-auto text-xs">
                  {logs.length === 0 ? (
                    <p className="text-[#9ca3af]">{t("noMqttTraffic")}</p>
                  ) : (
                    logs
                      .slice()
                      .reverse()
                      .map((entry) => (
                        <div key={entry.id} className="flex gap-2 rounded-md border border-white/10 bg-[#0b1224] px-2 py-1.5">
                          <span className={entry.direction === "in" ? "text-emerald-400" : "text-blue-400"}>{entry.direction.toUpperCase()}</span>
                          <span className="text-[#9ca3af]">{entry.timestamp.toLocaleTimeString()}</span>
                          <span className="truncate text-[#e5e7eb]">{entry.topic}</span>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </section>

            <footer className="flex items-center justify-between border-t border-white/10 pt-4 text-xs text-[#9ca3af]">
              <span>{t("espFooter")}</span>
              <span>{t("mqttFooter")}</span>
              <span>{new Date().toLocaleDateString()}</span>
            </footer>
        </main>
      </div>
    </div>
  );
}
