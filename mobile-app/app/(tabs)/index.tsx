import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import Svg, { Polyline } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { DataPoint } from "@/context/MqttContext";
import { useMqtt } from "@/context/MqttContext";
import { useColors } from "@/hooks/useColors";

type Lang = "en" | "fr" | "ar";
const LANG_KEY = "@smarthome_lang";

const translations = {
  en: {
    appName: "SmartHome Cloud",
    appSubtitle: "Mobile IoT dashboard",
    connected: "Connected",
    connecting: "Connecting",
    offline: "Offline",
    error: "Error",
    disconnect: "Disconnect",
    sensors: "Sensors",
    temperature: "Temperature",
    humidity: "Humidity",
    motion: "Motion",
    indoor: "Indoor",
    relative: "Relative",
    noMotion: "No Motion",
    motionDetected: "Motion Detected",
    normal: "Normal",
    warning: "Warning",
    alert: "Alert",
    controls: "Controls",
    led: "LED",
    ledRed: "Red LED",
    ledBlue: "Blue LED",
    buzzer: "Buzzer",
    alarm: "Alarm",
    alarms: "Alarms",
    alarmMotion: "Motion alarm",
    alarmTemp: "Temp alarm",
    on: "ON",
    off: "OFF",
    active: "ACTIVE",
    silent: "SILENT",
    armed: "ARMED",
    disarmed: "DISARMED",
    triggered: "TRIGGERED",
    infoLastUpdate: "Last update",
    broker: "Broker",
    client: "Client",
    device: "Device",
    charts: "Realtime Charts",
    daily: "Daily",
    weekly: "Weekly",
    refresh: "Refresh",
    waitingData: "Waiting for MQTT data...",
    rules: "Automation Rules",
    notifications: "Server Notifications",
    logs: "Live MQTT Logs",
    noRules: "No rules configured for this device.",
    noEvents: "No server-side events yet.",
    noLogs: "No MQTT traffic yet.",
    intrusionTitle: "Intrusion detected",
    intrusionSub: "Motion detected, buzzer activated automatically",
    dismiss: "Dismiss",
  },
  fr: {
    appName: "SmartHome Cloud",
    appSubtitle: "Tableau IoT mobile",
    connected: "Connecté",
    connecting: "Connexion",
    offline: "Hors ligne",
    error: "Erreur",
    disconnect: "Déconnecter",
    sensors: "Capteurs",
    temperature: "Température",
    humidity: "Humidité",
    motion: "Mouvement",
    indoor: "Intérieur",
    relative: "Relative",
    noMotion: "Aucun mouvement",
    motionDetected: "Mouvement détecté",
    normal: "Normal",
    warning: "Avertissement",
    alert: "Alerte",
    controls: "Contrôles",
    led: "LED",
    ledRed: "LED rouge",
    ledBlue: "LED bleue",
    buzzer: "Buzzer",
    alarm: "Alarme",
    alarms: "Alarmes",
    alarmMotion: "Alarme mouvement",
    alarmTemp: "Alarme température",
    on: "ON",
    off: "OFF",
    active: "ACTIF",
    silent: "SILENCIEUX",
    armed: "ARMÉ",
    disarmed: "DÉSARMÉ",
    triggered: "DÉCLENCHÉ",
    infoLastUpdate: "Dernière mise à jour",
    broker: "Broker",
    client: "Client",
    device: "Appareil",
    charts: "Graphiques temps réel",
    daily: "Jour",
    weekly: "Semaine",
    refresh: "Rafraîchir",
    waitingData: "En attente des données MQTT...",
    rules: "Règles automatiques",
    notifications: "Notifications serveur",
    logs: "Logs MQTT en direct",
    noRules: "Aucune règle pour cet appareil.",
    noEvents: "Aucun événement serveur.",
    noLogs: "Aucun trafic MQTT.",
    intrusionTitle: "Intrusion détectée",
    intrusionSub: "Mouvement détecté, buzzer activé automatiquement",
    dismiss: "Fermer",
  },
  ar: {
    appName: "سمارت هوم كلاود",
    appSubtitle: "لوحة إنترنت الأشياء",
    connected: "متصل",
    connecting: "جاري الاتصال",
    offline: "غير متصل",
    error: "خطأ",
    disconnect: "قطع الاتصال",
    sensors: "الحساسات",
    temperature: "درجة الحرارة",
    humidity: "الرطوبة",
    motion: "الحركة",
    indoor: "داخلي",
    relative: "نسبية",
    noMotion: "لا توجد حركة",
    motionDetected: "تم اكتشاف حركة",
    normal: "طبيعي",
    warning: "تحذير",
    alert: "تنبيه",
    controls: "التحكم",
    led: "الإضاءة",
    ledRed: "LED أحمر",
    ledBlue: "LED أزرق",
    buzzer: "الصفارة",
    alarm: "الإنذار",
    alarms: "الإنذارات",
    alarmMotion: "إنذار الحركة",
    alarmTemp: "إنذار الحرارة",
    on: "تشغيل",
    off: "إيقاف",
    active: "نشط",
    silent: "صامت",
    armed: "مفعل",
    disarmed: "غير مفعل",
    triggered: "تم التفعيل",
    infoLastUpdate: "آخر تحديث",
    broker: "الوسيط",
    client: "العميل",
    device: "الجهاز",
    charts: "المخططات اللحظية",
    daily: "يومي",
    weekly: "أسبوعي",
    refresh: "تحديث",
    waitingData: "بانتظار بيانات MQTT...",
    rules: "قواعد الأتمتة",
    notifications: "إشعارات الخادم",
    logs: "سجلات MQTT المباشرة",
    noRules: "لا توجد قواعد لهذا الجهاز.",
    noEvents: "لا توجد أحداث من الخادم.",
    noLogs: "لا يوجد مرور MQTT بعد.",
    intrusionTitle: "تم اكتشاف اقتحام",
    intrusionSub: "تم اكتشاف حركة، تم تفعيل الصفارة تلقائيا",
    dismiss: "إغلاق",
  },
} as const;

function Sparkline({ data, color }: { data: DataPoint[]; color: string }) {
  const width = 300;
  const height = 110;
  if (data.length < 2) return <View style={{ height }} />;
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = data
    .slice(-30)
    .map((d, i, arr) => {
      const x = (i / (arr.length - 1)) * width;
      const y = height - ((d.value - min) / range) * (height - 10) - 5;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      <Polyline points={points} fill="none" stroke={color} strokeWidth="2.5" />
    </Svg>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    status,
    connect,
    disconnect,
    sensors,
    motionAlarmEnabled,
    tempAlarmEnabled,
    alarmTriggered,
    motionAlarmTriggered,
    tempAlarmTriggered,
    publish,
    toggleMotionAlarm,
    toggleTempAlarm,
    dismissAlarm,
    config,
    logs,
    tempHistory,
    humHistory,
  } = useMqtt();
  const [lang, setLang] = useState<Lang>("en");
  const [range, setRange] = useState<"daily" | "weekly">("daily");
  const [rules, setRules] = useState<Array<{ id: number; type: string }>>([]);
  const topic = (leaf: string) => `home/${config.deviceId}/${leaf}`;
  const t = useMemo(() => translations[lang], [lang]);
  const isRTL = lang === "ar";

  const isConnected = status === "connected";
  const alarmsLockManualOutputs = motionAlarmEnabled || tempAlarmEnabled;

  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((stored) => {
      if (stored === "en" || stored === "fr" || stored === "ar") setLang(stored);
    });
  }, []);
  useEffect(() => {
    AsyncStorage.setItem(LANG_KEY, lang);
    if (typeof document !== "undefined") {
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    }
  }, [lang]);

  useEffect(() => {
    if (alarmTriggered) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
      ).start();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [alarmTriggered, pulseAnim]);

  const statusInfo = {
    disconnected: { color: colors.mutedForeground, label: t.offline, dotColor: "#4b5563" },
    connecting: { color: "#fbbf24", label: t.connecting, dotColor: "#fbbf24" },
    connected: { color: colors.neonGreen, label: t.connected, dotColor: colors.neonGreen },
    error: { color: colors.neonRed, label: t.error, dotColor: colors.neonRed },
  };
  const si = statusInfo[status];

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const lastUpdate = sensors.lastUpdate ? sensors.lastUpdate.toLocaleTimeString() : "--:--:--";

  const serverEvents = logs.filter((l) => l.topic.endsWith("/motion")).slice().reverse().slice(0, 8);

  const addRule = (type: string) => {
    setRules((prev) => [...prev, { id: Date.now() + Math.random(), type }].slice(-8));
  };
  const removeRule = (id: number) => setRules((prev) => prev.filter((r) => r.id !== id));

  const tempSeverity = sensors.temperature === null ? "normal" : sensors.temperature >= 35 ? "alert" : sensors.temperature >= 30 ? "warning" : "normal";
  const humSeverity = sensors.humidity === null ? "normal" : sensors.humidity >= 80 ? "warning" : sensors.humidity <= 25 ? "alert" : "normal";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {alarmTriggered && (
        <Animated.View style={[styles.alarmOverlay, { transform: [{ scale: pulseAnim }] }]} />
      )}
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: topPad + 12, paddingBottom: bottomPad + 110 }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: "#111827", borderColor: colors.border }]}>
          <View style={[styles.rowBetween, isRTL && styles.rowReverse]}>
            <View>
              <View style={[styles.row, { marginBottom: 8 }]}>
                {(["en", "fr", "ar"] as const).map((l) => (
                  <Pressable
                    key={l}
                    onPress={() => setLang(l)}
                    style={[
                      styles.langBtn,
                      {
                        borderColor: lang === l ? "rgba(59,130,246,0.8)" : colors.border,
                        backgroundColor: lang === l ? "rgba(59,130,246,0.15)" : "transparent",
                      },
                    ]}
                  >
                    <Text style={[styles.langText, { color: lang === l ? "#93c5fd" : colors.mutedForeground }]}>{l.toUpperCase()}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.title, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>{t.appName}</Text>
              <Text style={[styles.subTitle, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>{t.appSubtitle}</Text>
            </View>
            <View style={[styles.row, isRTL && styles.rowReverse]}>
              <View style={[styles.statusDot, { backgroundColor: si.dotColor }]} />
              <Text style={[styles.statusText, { color: si.color }]}>{si.label}</Text>
              {isConnected && (
                <Pressable
                  onPress={disconnect}
                  style={[styles.disconnectBtn, { borderColor: "rgba(239,68,68,0.5)" }]}
                >
                  <Text style={[styles.disconnectText, { color: "#f87171" }]}>{t.disconnect}</Text>
                </Pressable>
              )}
              {!isConnected && (
                <Pressable
                  onPress={() => connect(config)}
                  style={[styles.disconnectBtn, { borderColor: "rgba(59,130,246,0.6)" }]}
                >
                  <Text style={[styles.disconnectText, { color: "#60a5fa" }]}>
                    {lang === "fr" ? "Connecter" : lang === "ar" ? "اتصال" : "Connect"}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {alarmTriggered && (
          <Pressable onPress={dismissAlarm} style={[styles.alarmBanner, { borderColor: "rgba(239,68,68,0.5)" }]}>
            <MaterialCommunityIcons name="alarm-light" size={20} color="#f87171" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerTitle, { color: "#fca5a5" }]}>{t.intrusionTitle}</Text>
              <Text style={[styles.bannerSub, { color: "#fca5a5" }]}>{t.intrusionSub}</Text>
            </View>
            <Text style={[styles.bannerSub, { color: "#fca5a5" }]}>{t.dismiss}</Text>
          </Pressable>
        )}

        {!isConnected && status !== "connecting" && (
          <View style={[styles.infoBar, { borderColor: colors.border }]}>
            <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
              {lang === "fr"
                ? "Non connecté au broker MQTT."
                : lang === "ar"
                  ? "غير متصل بوسيط MQTT."
                  : "Not connected to MQTT broker."}
            </Text>
          </View>
        )}

        <View style={styles.sectionWrap}>
          <View style={styles.sensorRow}>
            <View style={[styles.sensorCard, styles.flex1, { borderColor: "rgba(59,130,246,0.3)" }]}>
              <View style={styles.rowBetween}>
                <View style={styles.row}>
                  <MaterialCommunityIcons name="thermometer" size={14} color="#60a5fa" />
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>{t.temperature}</Text>
                </View>
                <Text style={[styles.small, { color: colors.mutedForeground }]}>{t.indoor}</Text>
              </View>
              <Text style={[styles.bigValue, { color: "#60a5fa" }]}>{sensors.temperature !== null ? sensors.temperature.toFixed(1) : "--"}</Text>
              <Text style={[styles.small, { color: colors.mutedForeground }]}>°C • {t[tempSeverity]}</Text>
            </View>

            <View style={[styles.sensorCard, styles.flex1, { borderColor: "rgba(34,197,94,0.3)" }]}>
              <View style={styles.rowBetween}>
                <View style={styles.row}>
                  <MaterialCommunityIcons name="water-percent" size={14} color="#22c55e" />
                  <Text style={[styles.label, { color: colors.mutedForeground }]}>{t.humidity}</Text>
                </View>
                <Text style={[styles.small, { color: colors.mutedForeground }]}>{t.relative}</Text>
              </View>
              <Text style={[styles.bigValue, { color: "#22c55e" }]}>{sensors.humidity !== null ? sensors.humidity.toFixed(1) : "--"}</Text>
              <Text style={[styles.small, { color: colors.mutedForeground }]}>% • {t[humSeverity]}</Text>
            </View>
          </View>

          <View style={[styles.sensorCard, { marginTop: 8, borderColor: "rgba(148,163,184,0.25)" }]}>
            <View style={styles.rowBetween}>
              <View style={styles.row}>
                <View style={[styles.motionDot, { backgroundColor: sensors.motion ? "#22c55e" : "#6b7280" }]} />
                <Text style={[styles.label, { color: colors.mutedForeground }]}>{t.motion}</Text>
              </View>
              <Text style={[styles.small, { color: colors.mutedForeground }]}>{topic("motion")}</Text>
            </View>
            <Text style={[styles.motionText, { color: sensors.motion ? "#22c55e" : "#9ca3af" }]}>{sensors.motion ? t.motionDetected : t.noMotion}</Text>
          </View>
        </View>

        <View style={[styles.infoBar, { borderColor: colors.border }]}>
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{t.infoLastUpdate}: {lastUpdate}</Text>
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{t.broker}: {config.brokerUrl.replace("wss://", "").split(":")[0]}</Text>
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{t.client}: {config.clientId.slice(-10)}</Text>
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{t.device}: {config.deviceId}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: "#111827", borderColor: colors.border }]}>
          <View style={styles.rowBetween}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{t.controls}</Text>
          </View>
          {[
            {
              key: "ledRed",
              value: sensors.redLedState,
              onToggle: () => {
                publish(topic("red"), sensors.redLedState ? "OFF" : "ON");
              },
              activeColor: "#ef4444",
            },
            {
              key: "ledBlue",
              value: sensors.blueLedState,
              onToggle: () => {
                publish(topic("blue"), sensors.blueLedState ? "OFF" : "ON");
              },
              activeColor: "#3b82f6",
            },
            {
              key: "buzzer",
              value: sensors.buzzerState,
              onToggle: () => {
                publish(topic("buzzer"), sensors.buzzerState ? "OFF" : "ON");
              },
              activeColor: "#f59e0b",
            },
          ].map((item) => (
            <View key={item.key} style={[styles.controlRow, { borderColor: colors.border }]}>
              <View>
                <Text style={[styles.controlTitle, { color: colors.foreground }]}>
                  {t[item.key as "ledRed" | "ledBlue" | "buzzer"]}
                </Text>
                <Text style={[styles.small, { color: colors.mutedForeground }]}>
                  {item.value ? t.on : t.off}
                </Text>
              </View>
              <Switch
                value={item.value}
                onValueChange={() => item.onToggle()}
                disabled={
                  !isConnected ||
                  (alarmsLockManualOutputs && (item.key === "ledRed" || item.key === "buzzer"))
                }
                trackColor={{ false: "#1e293b", true: `${item.activeColor}55` }}
                thumbColor={item.value ? item.activeColor : "#64748b"}
              />
            </View>
          ))}
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground, marginTop: 12 }]}>{t.alarms}</Text>
          {[
            {
              key: "alarmMotion",
              value: motionAlarmEnabled,
              onToggle: toggleMotionAlarm,
              activeColor: "#22c55e",
              sub: motionAlarmTriggered ? t.triggered : motionAlarmEnabled ? t.armed : t.disarmed,
            },
            {
              key: "alarmTemp",
              value: tempAlarmEnabled,
              onToggle: toggleTempAlarm,
              activeColor: "#22c55e",
              sub: tempAlarmTriggered ? t.triggered : tempAlarmEnabled ? t.armed : t.disarmed,
            },
          ].map((item) => (
            <View key={item.key} style={[styles.controlRow, { borderColor: colors.border }]}>
              <View>
                <Text style={[styles.controlTitle, { color: colors.foreground }]}>
                  {t[item.key as "alarmMotion" | "alarmTemp"]}
                </Text>
                <Text style={[styles.small, { color: colors.mutedForeground }]}>{item.sub}</Text>
              </View>
              <Switch
                value={item.value}
                onValueChange={() => item.onToggle()}
                trackColor={{ false: "#1e293b", true: `${item.activeColor}55` }}
                thumbColor={item.value ? item.activeColor : "#64748b"}
              />
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: "#111827", borderColor: colors.border }]}>
          <View style={styles.rowBetween}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{t.charts}</Text>
            <View style={styles.row}>
              {(["daily", "weekly"] as const).map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setRange(r)}
                  style={[
                    styles.rangeBtn,
                    { borderColor: range === r ? "rgba(59,130,246,0.6)" : colors.border },
                  ]}
                >
                  <Text style={[styles.small, { color: range === r ? "#93c5fd" : colors.mutedForeground }]}>{t[r]}</Text>
                </Pressable>
              ))}
              <Pressable style={[styles.rangeBtn, { borderColor: colors.border }]}>
                <Text style={[styles.small, { color: colors.mutedForeground }]}>{t.refresh}</Text>
              </Pressable>
            </View>
          </View>
          {tempHistory.length === 0 && humHistory.length === 0 ? (
            <View style={styles.emptyChart}>
              <Text style={[styles.small, { color: colors.mutedForeground }]}>{t.waitingData}</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <View style={[styles.chartCard, { borderColor: colors.border }]}>
                <Text style={[styles.small, { color: colors.foreground }]}>{t.temperature}</Text>
                <Sparkline data={tempHistory} color="#3b82f6" />
              </View>
              <View style={[styles.chartCard, { borderColor: colors.border }]}>
                <Text style={[styles.small, { color: colors.foreground }]}>{t.humidity}</Text>
                <Sparkline data={humHistory} color="#22c55e" />
              </View>
            </View>
          )}
        </View>

        <View style={{ gap: 10 }}>
          <View style={[styles.card, { backgroundColor: "#111827", borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{t.rules}</Text>
            <View style={[styles.row, { marginVertical: 8 }]}>
              <Pressable onPress={() => addRule("motion_night_buzzer")} style={[styles.ruleBtn, { borderColor: colors.border }]}><Text style={[styles.small, { color: colors.mutedForeground }]}>+ motion night</Text></Pressable>
              <Pressable onPress={() => addRule("temp_threshold_alert")} style={[styles.ruleBtn, { borderColor: colors.border }]}><Text style={[styles.small, { color: colors.mutedForeground }]}>+ temp threshold</Text></Pressable>
              <Pressable onPress={() => addRule("anomaly_alert")} style={[styles.ruleBtn, { borderColor: colors.border }]}><Text style={[styles.small, { color: colors.mutedForeground }]}>+ anomaly</Text></Pressable>
            </View>
            {rules.length === 0 ? (
              <Text style={[styles.small, { color: colors.mutedForeground }]}>{t.noRules}</Text>
            ) : (
              rules.map((rule) => (
                <View key={rule.id} style={[styles.rowBetween, { marginBottom: 6 }]}>
                  <Text style={[styles.small, { color: colors.foreground }]}>{rule.type}</Text>
                  <Pressable onPress={() => removeRule(rule.id)}><Text style={[styles.small, { color: "#f87171" }]}>Delete</Text></Pressable>
                </View>
              ))
            )}
          </View>

          <View style={[styles.card, { backgroundColor: "#111827", borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{t.notifications}</Text>
            {serverEvents.length === 0 ? (
              <Text style={[styles.small, { color: colors.mutedForeground }]}>{t.noEvents}</Text>
            ) : (
              serverEvents.map((e) => (
                <Text key={e.id} style={[styles.small, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {e.timestamp.toLocaleTimeString()} • {e.topic} • {e.payload}
                </Text>
              ))
            )}
          </View>

          <View style={[styles.card, { backgroundColor: "#111827", borderColor: colors.border }]}>
            <View style={styles.rowBetween}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{t.logs}</Text>
              <Text style={[styles.small, { color: colors.mutedForeground }]}>{logs.length} entries</Text>
            </View>
            {logs.length === 0 ? (
              <Text style={[styles.small, { color: colors.mutedForeground }]}>{t.noLogs}</Text>
            ) : (
              logs.slice(-8).reverse().map((entry) => (
                <Text key={entry.id} style={[styles.small, { color: colors.mutedForeground }]} numberOfLines={1}>
                  [{entry.direction.toUpperCase()}] {entry.topic} {entry.payload}
                </Text>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  alarmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,0,0,0.06)",
    zIndex: 1,
    pointerEvents: "none",
  },
  scroll: { paddingHorizontal: 12, gap: 10 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowReverse: { flexDirection: "row-reverse" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  langBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  langText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  subTitle: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  disconnectBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  disconnectText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  alarmBanner: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(239,68,68,0.08)",
  },
  bannerTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  bannerSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  sectionWrap: { gap: 8 },
  sensorRow: { flexDirection: "row", gap: 8 },
  sensorCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#111827",
  },
  flex1: { flex: 1 },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  small: { fontSize: 11, fontFamily: "Inter_400Regular" },
  bigValue: { fontSize: 32, lineHeight: 36, fontFamily: "Inter_700Bold", marginTop: 6 },
  motionDot: { width: 8, height: 8, borderRadius: 4 },
  motionText: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 6 },
  infoBar: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    backgroundColor: "#111827",
    gap: 4,
  },
  infoText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    backgroundColor: "#0b1224",
  },
  controlTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  rangeBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  emptyChart: {
    height: 150,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(148,163,184,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  chartCard: { borderWidth: 1, borderRadius: 12, padding: 8, backgroundColor: "#0b1224" },
  ruleBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
});
