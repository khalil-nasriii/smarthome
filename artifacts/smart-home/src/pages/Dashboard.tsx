import { useState, useEffect, useCallback, useRef } from "react";
import { useMqtt } from "@/hooks/useMqtt";
import { useAlarmSound, useBrowserNotifications } from "@/hooks/useAlarm";
import { useSensorHistory } from "@/hooks/useSensorHistory";
import { SensorChart } from "@/components/SensorChart";
import { ConnectionModal } from "@/components/ConnectionModal";
import { NotificationToast } from "@/components/NotificationToast";

interface Toast {
  id: number;
  message: string;
  type: "alert" | "info" | "success";
}

interface PendingState {
  led: boolean;
  buzzer: boolean;
}

let toastId = 0;

export default function Dashboard() {
  const { status, errorMessage, sensors, publish, connect, disconnect, config, setConfig } = useMqtt();
  const { play: playAlarm, stop: stopAlarm } = useAlarmSound();
  const { requestPermission, notify } = useBrowserNotifications();
  const { tempHistory, humHistory, addTemperature, addHumidity } = useSensorHistory();

  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [alarmTriggered, setAlarmTriggered] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState<PendingState>({ led: false, buzzer: false });
  const prevMotionRef = useRef(false);
  const prevLedRef = useRef(sensors.ledState);
  const prevBuzzerRef = useRef(sensors.buzzerState);

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

  // Clear LED pending state when ESP32 confirms
  useEffect(() => {
    if (sensors.ledState !== prevLedRef.current) {
      prevLedRef.current = sensors.ledState;
      setPending((p) => ({ ...p, led: false }));
    }
  }, [sensors.ledState]);

  // Clear Buzzer pending state when ESP32 confirms
  useEffect(() => {
    if (sensors.buzzerState !== prevBuzzerRef.current) {
      prevBuzzerRef.current = sensors.buzzerState;
      setPending((p) => ({ ...p, buzzer: false }));
    }
  }, [sensors.buzzerState]);

  // Smart alarm: trigger when motion detected and alarm is armed
  useEffect(() => {
    const motionJustDetected = sensors.motion && !prevMotionRef.current;
    const motionStopped = !sensors.motion && prevMotionRef.current;
    prevMotionRef.current = sensors.motion;

    if (motionJustDetected) {
      if (alarmEnabled) {
        setAlarmTriggered(true);
        playAlarm();
        publish("home/buzzer", "ON");
        addToast("Intrusion Detected! Alarm activated.", "alert");
        notify("Smart Home Alert", "Motion detected! Alarm triggered.");
        console.log("[Alarm] Motion detected — auto-triggered buzzer ON");
      } else {
        addToast("Motion detected", "info");
        console.log("[Alarm] Motion detected — alarm is disarmed, no action");
      }
    }

    if (motionStopped && alarmTriggered) {
      setAlarmTriggered(false);
      stopAlarm();
      publish("home/buzzer", "OFF");
      addToast("All clear — motion stopped", "success");
      console.log("[Alarm] Motion cleared — buzzer OFF");
    }
  }, [sensors.motion, alarmEnabled, alarmTriggered, playAlarm, stopAlarm, publish, addToast, notify]);

  // Disarm alarm if toggle is switched off while triggered
  useEffect(() => {
    if (!alarmEnabled && alarmTriggered) {
      setAlarmTriggered(false);
      stopAlarm();
      publish("home/buzzer", "OFF");
      console.log("[Alarm] Disarmed while triggered — buzzer OFF");
    }
  }, [alarmEnabled, alarmTriggered, stopAlarm, publish]);

  const toggleLed = () => {
    const next = sensors.ledState ? "OFF" : "ON";
    const ok = publish("home/led", next);
    if (ok) {
      setPending((p) => ({ ...p, led: true }));
      // Auto-clear pending if no ESP32 confirmation within 5s
      setTimeout(() => setPending((p) => ({ ...p, led: false })), 5000);
    }
  };

  const toggleBuzzer = () => {
    const next = sensors.buzzerState ? "OFF" : "ON";
    const ok = publish("home/buzzer", next);
    if (ok) {
      setPending((p) => ({ ...p, buzzer: true }));
      setTimeout(() => setPending((p) => ({ ...p, buzzer: false })), 5000);
    }
  };

  const toggleAlarm = () => {
    const next = !alarmEnabled;
    setAlarmEnabled(next);
    publish("home/alarm", next ? "ON" : "OFF");
    console.log(`[Alarm] System ${next ? "ARMED" : "DISARMED"} — published home/alarm: ${next ? "ON" : "OFF"}`);
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
    disconnected: { dot: "bg-gray-500", text: "text-gray-400", label: "OFFLINE" },
    connecting: { dot: "bg-yellow-400", text: "text-yellow-400", label: "CONNECTING..." },
    connected: { dot: "status-online", text: "text-neon-green", label: "ONLINE" },
    error: { dot: "bg-red-500", text: "text-neon-red", label: "ERROR" },
  };
  const sc = statusMeta[status];

  const lastUpdateStr = sensors.lastUpdate
    ? sensors.lastUpdate.toLocaleTimeString()
    : "--:--:--";

  const isConnected = status === "connected";

  return (
    <div className="min-h-screen p-4 md:p-6 relative">
      {/* Scan line overlay */}
      <div className="scan-line" />

      {/* Alarm flash overlay */}
      {alarmTriggered && <div className="alarm-overlay" />}

      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3">
        {toasts.map((toast) => (
          <NotificationToast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      {/* Connection Modal */}
      {showConnectionModal && (
        <ConnectionModal
          config={config}
          onConnect={handleConnect}
          onClose={() => setShowConnectionModal(false)}
        />
      )}

      {/* Header */}
      <header className="mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-orbitron text-2xl md:text-3xl font-black text-neon-blue tracking-widest uppercase">
            SmartHome
          </h1>
          <p className="text-xs text-muted-foreground font-mono tracking-wider mt-0.5">
            IOT CONTROL PANEL v2.0
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Status indicator */}
          <div className="flex items-center gap-2">
            <span className={`status-dot ${sc.dot}`} style={{ width: 9, height: 9 }} />
            <span className={`text-xs font-mono font-bold tracking-widest ${sc.text}`}>
              {sc.label}
            </span>
            {status === "connecting" && (
              <svg className="w-3 h-3 text-yellow-400 connecting-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </div>

          {/* Reconnect button — shows on error or disconnected (if previously configured) */}
          {(status === "error" || status === "disconnected") && config.brokerUrl && (
            <button
              onClick={handleReconnect}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border font-mono tracking-wider transition-all"
              style={{
                border: "1px solid rgba(255, 200, 0, 0.4)",
                color: "#ffc800",
                background: "rgba(255, 200, 0, 0.05)",
              }}
            >
              RECONNECT
            </button>
          )}

          {/* Connect / Disconnect button */}
          <button
            onClick={() => {
              if (isConnected) {
                disconnect();
                addToast("Disconnected from broker", "info");
              } else {
                setShowConnectionModal(true);
              }
            }}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg border transition-all font-mono tracking-wider"
            style={
              isConnected
                ? { border: "1px solid rgba(255,50,50,0.4)", color: "#ff3232", background: "rgba(255,50,50,0.05)" }
                : { border: "1px solid rgba(0,200,255,0.4)", color: "#00c8ff", background: "rgba(0,200,255,0.05)" }
            }
          >
            {isConnected ? "DISCONNECT" : "CONNECT"}
          </button>
        </div>
      </header>

      {/* Error message banner */}
      {status === "error" && errorMessage && (
        <div
          className="mb-4 rounded-xl p-3 flex items-center gap-3"
          style={{
            background: "rgba(255,50,50,0.08)",
            border: "1px solid rgba(255,50,50,0.35)",
          }}
        >
          <svg className="w-4 h-4 flex-shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div className="flex-1">
            <p className="text-xs font-semibold text-red-400">MQTT Connection Error</p>
            <p className="text-xs text-red-300/70 font-mono mt-0.5">{errorMessage}</p>
          </div>
          <button
            onClick={handleReconnect}
            className="text-xs px-3 py-1 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all font-mono"
          >
            Retry
          </button>
        </div>
      )}

      {/* Alarm alert banner */}
      {alarmTriggered && (
        <div
          className="mb-4 rounded-xl p-4 flex items-center gap-3 border"
          style={{
            background: "rgba(255,30,30,0.12)",
            border: "1px solid rgba(255,50,50,0.6)",
            boxShadow: "0 0 30px rgba(255,50,50,0.3)",
          }}
        >
          <span className="text-2xl">🚨</span>
          <div>
            <p className="font-orbitron font-bold text-base text-neon-red tracking-wide">
              INTRUSION DETECTED
            </p>
            <p className="text-xs text-red-300/70 mt-0.5">
              Motion detected — buzzer activated automatically
            </p>
          </div>
          <button
            onClick={() => {
              setAlarmTriggered(false);
              stopAlarm();
              publish("home/buzzer", "OFF");
            }}
            className="ml-auto text-xs px-3 py-1.5 rounded-lg font-semibold border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-all font-mono"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Offline banner */}
      {!isConnected && status !== "connecting" && (
        <div
          className="mb-4 rounded-xl p-3 flex items-center gap-3"
          style={{
            background: "rgba(0,200,255,0.04)",
            border: "1px solid rgba(0,200,255,0.12)",
          }}
        >
          <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
          <p className="text-xs text-muted-foreground">
            Not connected to MQTT broker. Press{" "}
            <button onClick={() => setShowConnectionModal(true)} className="text-primary underline underline-offset-2">
              CONNECT
            </button>{" "}
            to start receiving sensor data and controlling devices.
          </p>
        </div>
      )}

      {/* Sensor cards */}
      <div className="dashboard-grid mb-4">
        {/* Temperature */}
        <div className={`glass-card p-5 ${!alarmTriggered ? "neon-blue" : ""}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#00c8ff">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Temperature</span>
            </div>
            <span className="text-xs font-mono text-muted-foreground/40">home/temp</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="font-orbitron text-4xl font-black text-neon-blue">
              {sensors.temperature !== null ? sensors.temperature.toFixed(1) : "--"}
            </span>
            <span className="text-lg text-muted-foreground pb-1">°C</span>
          </div>
          {sensors.temperature !== null && (
            <div className="mt-3 h-1.5 rounded-full overflow-hidden bg-background/40">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.min(100, Math.max(0, ((sensors.temperature - 10) / 40) * 100))}%`,
                  background: "linear-gradient(90deg, #00c8ff, #ff3232)",
                }}
              />
            </div>
          )}
          <p className="text-xs text-muted-foreground/40 mt-1.5 font-mono">Range: 10°C – 50°C</p>
        </div>

        {/* Humidity */}
        <div className="glass-card neon-green p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#00ff88">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Humidity</span>
            </div>
            <span className="text-xs font-mono text-muted-foreground/40">home/hum</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="font-orbitron text-4xl font-black text-neon-green">
              {sensors.humidity !== null ? sensors.humidity.toFixed(1) : "--"}
            </span>
            <span className="text-lg text-muted-foreground pb-1">%</span>
          </div>
          {sensors.humidity !== null && (
            <div className="mt-3 h-1.5 rounded-full overflow-hidden bg-background/40">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.min(100, Math.max(0, sensors.humidity))}%`,
                  background: "linear-gradient(90deg, #00ff88, #00c8ff)",
                }}
              />
            </div>
          )}
          <p className="text-xs text-muted-foreground/40 mt-1.5 font-mono">Range: 0% – 100%</p>
        </div>

        {/* Motion */}
        <div className={`glass-card p-5 transition-all duration-500 ${sensors.motion ? "neon-red" : "neon-blue"}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg
                className={`w-5 h-5 ${sensors.motion ? "motion-detected" : ""}`}
                fill="none" viewBox="0 0 24 24"
                stroke={sensors.motion ? "#ff3232" : "#00c8ff"}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Motion</span>
            </div>
            <span className="text-xs font-mono text-muted-foreground/40">home/motion</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{
                background: sensors.motion ? "#ff3232" : "#00c8ff",
                boxShadow: sensors.motion
                  ? "0 0 15px #ff3232, 0 0 30px rgba(255,50,50,0.4)"
                  : "0 0 8px #00c8ff",
              }}
            />
            <span className={`font-orbitron text-2xl font-bold ${sensors.motion ? "text-neon-red" : "text-neon-blue"}`}>
              {sensors.motion ? "DETECTED" : "NO MOTION"}
            </span>
          </div>
          <p className="text-xs mt-3 font-mono" style={{ color: sensors.motion ? "#ff3232aa" : "#00c8ff55" }}>
            {sensors.motion ? "⚠ PIR sensor triggered" : "Monitoring active"}
          </p>
        </div>

        {/* Device info */}
        <div className="glass-card p-5 neon-blue">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#00c8ff">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Last Update</span>
          </div>
          <p className="font-orbitron text-xl font-bold text-neon-blue">{lastUpdateStr}</p>
          <div className="mt-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Broker:</span>
              <span className="font-mono text-foreground/50 truncate max-w-[140px]">
                {config.brokerUrl.replace("wss://", "").split(":")[0]}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Client:</span>
              <span className="font-mono text-foreground/50">{config.clientId.slice(-10)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Status:</span>
              <span className={`${sc.text} font-bold font-mono`}>{sc.label}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* LED Control */}
        <div className={`glass-card p-5 transition-all duration-500 ${sensors.ledState ? "neon-green" : "neon-blue"}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg
                className={`w-5 h-5 ${sensors.ledState ? "led-on" : ""}`}
                fill={sensors.ledState ? "#00ff88" : "none"}
                viewBox="0 0 24 24"
                stroke={sensors.ledState ? "#00ff88" : "#6b7280"}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
              </svg>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">LED Light</span>
            </div>
            <span className="text-xs font-mono text-muted-foreground/40">home/led</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className={`font-orbitron text-2xl font-bold ${sensors.ledState ? "text-neon-green" : "text-muted-foreground"}`}>
                {pending.led ? "PENDING..." : sensors.ledState ? "ON" : "OFF"}
              </span>
              <p className="text-xs text-muted-foreground/40 mt-1 font-mono">
                {pending.led ? "Waiting for ESP32..." : "Confirmed via home/led/status"}
              </p>
            </div>
            <button
              onClick={toggleLed}
              disabled={!isConnected || pending.led}
              className="px-4 py-2.5 rounded-xl text-sm font-bold font-mono transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={
                sensors.ledState
                  ? { background: "rgba(0,255,136,0.15)", border: "1px solid rgba(0,255,136,0.5)", color: "#00ff88", boxShadow: "0 0 15px rgba(0,255,136,0.3)" }
                  : { background: "rgba(0,200,255,0.1)", border: "1px solid rgba(0,200,255,0.3)", color: "#00c8ff" }
              }
            >
              {pending.led ? (
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 connecting-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  WAIT
                </span>
              ) : sensors.ledState ? "TURN OFF" : "TURN ON"}
            </button>
          </div>
        </div>

        {/* Buzzer Control */}
        <div className={`glass-card p-5 transition-all duration-500 ${sensors.buzzerState ? "neon-red" : "neon-blue"}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg
                className={`w-5 h-5 ${sensors.buzzerState ? "buzzer-active" : ""}`}
                fill="none" viewBox="0 0 24 24"
                stroke={sensors.buzzerState ? "#ff3232" : "#6b7280"}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Buzzer</span>
            </div>
            <span className="text-xs font-mono text-muted-foreground/40">home/buzzer</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className={`font-orbitron text-2xl font-bold ${sensors.buzzerState ? "text-neon-red" : "text-muted-foreground"}`}>
                {pending.buzzer ? "PENDING..." : sensors.buzzerState ? "ACTIVE" : "SILENT"}
              </span>
              <p className="text-xs text-muted-foreground/40 mt-1 font-mono">
                {pending.buzzer ? "Waiting for ESP32..." : "Confirmed via home/buzzer/status"}
              </p>
            </div>
            <button
              onClick={toggleBuzzer}
              disabled={!isConnected || pending.buzzer}
              className="px-4 py-2.5 rounded-xl text-sm font-bold font-mono transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={
                sensors.buzzerState
                  ? { background: "rgba(255,50,50,0.15)", border: "1px solid rgba(255,50,50,0.5)", color: "#ff3232", boxShadow: "0 0 15px rgba(255,50,50,0.3)" }
                  : { background: "rgba(0,200,255,0.1)", border: "1px solid rgba(0,200,255,0.3)", color: "#00c8ff" }
              }
            >
              {pending.buzzer ? (
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 connecting-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  WAIT
                </span>
              ) : sensors.buzzerState ? "SILENCE" : "TRIGGER"}
            </button>
          </div>
        </div>

        {/* Alarm System */}
        <div
          className={`glass-card p-5 transition-all duration-500 ${
            alarmEnabled ? (alarmTriggered ? "neon-red" : "neon-green") : "neon-blue"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none" viewBox="0 0 24 24"
                stroke={alarmTriggered ? "#ff3232" : alarmEnabled ? "#00ff88" : "#6b7280"}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Alarm System</span>
            </div>
            <span className="text-xs font-mono text-muted-foreground/40">home/alarm</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span
                className={`font-orbitron text-2xl font-bold ${
                  alarmTriggered ? "text-neon-red" : alarmEnabled ? "text-neon-green" : "text-muted-foreground"
                }`}
              >
                {alarmTriggered ? "TRIGGERED" : alarmEnabled ? "ARMED" : "DISARMED"}
              </span>
              <p className="text-xs text-muted-foreground/40 mt-1 font-mono">
                {alarmEnabled ? "Publishes home/alarm ON" : "Publishes home/alarm OFF"}
              </p>
            </div>

            <button
              onClick={toggleAlarm}
              className={`relative w-14 h-7 rounded-full transition-all duration-300 ${alarmEnabled ? "toggle-track enabled" : "bg-muted/40"}`}
              style={{
                border: alarmEnabled ? "1px solid rgba(0,255,136,0.5)" : "1px solid rgba(0,200,255,0.2)",
              }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full transition-transform duration-300"
                style={{
                  transform: alarmEnabled ? "translateX(28px)" : "translateX(0)",
                  background: alarmEnabled ? "rgba(0,255,136,0.9)" : "rgba(200,200,200,0.3)",
                  boxShadow: alarmEnabled ? "0 0 10px rgba(0,255,136,0.6)" : "none",
                }}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Live chart */}
      <div className="glass-card neon-blue p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#00c8ff">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
            </svg>
            <span className="text-sm font-semibold text-neon-blue uppercase tracking-wider font-orbitron">
              Live Sensor Data
            </span>
          </div>
          <span className="text-xs font-mono text-muted-foreground/40">{tempHistory.length} / 20 readings</span>
        </div>

        {tempHistory.length === 0 && humHistory.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground/30">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
              </svg>
              <p className="text-sm font-mono">Waiting for sensor data...</p>
              <p className="text-xs mt-1 opacity-70">Connect to MQTT broker to see live charts</p>
            </div>
          </div>
        ) : (
          <SensorChart tempHistory={tempHistory} humHistory={humHistory} />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground/30 font-mono px-1">
        <span>ESP32 Smart Home</span>
        <span>MQTT over WSS — PWA Ready</span>
        <span>{new Date().toLocaleDateString()}</span>
      </div>
    </div>
  );
}
