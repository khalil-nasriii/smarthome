import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMqtt } from "@/context/MqttContext";
import { useColors } from "@/hooks/useColors";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { status, sensors, alarmEnabled, alarmTriggered, publish, toggleAlarm, dismissAlarm } =
    useMqtt();

  const isConnected = status === "connected";

  // Pulsing animation for alarm
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (alarmTriggered) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      ).start();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [alarmTriggered, pulseAnim]);

  const handleToggleLed = () => {
    if (!isConnected) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    publish("home/led", sensors.ledState ? "OFF" : "ON");
  };

  const handleToggleBuzzer = () => {
    if (!isConnected) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    publish("home/buzzer", sensors.buzzerState ? "OFF" : "ON");
  };

  const handleToggleAlarm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    toggleAlarm();
  };

  const statusInfo = {
    disconnected: { color: colors.mutedForeground, label: "OFFLINE", dotColor: "#4b5563" },
    connecting: { color: "#fbbf24", label: "CONNECTING", dotColor: "#fbbf24" },
    connected: { color: colors.neonGreen, label: "ONLINE", dotColor: colors.neonGreen },
    error: { color: colors.neonRed, label: "ERROR", dotColor: colors.neonRed },
  };
  const si = statusInfo[status];

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Alarm overlay */}
      {alarmTriggered && (
        <Animated.View
          style={[
            styles.alarmOverlay,
            { transform: [{ scale: pulseAnim }] },
          ]}
        />
      )}

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.neonBlue }]}>SMARTHOME</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            IOT CONTROL PANEL
          </Text>
        </View>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: si.dotColor }]} />
          <Text style={[styles.statusLabel, { color: si.color }]}>{si.label}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Alarm banner */}
        {alarmTriggered && (
          <Pressable
            onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); dismissAlarm(); }}
            style={[styles.alarmBanner, { borderColor: colors.neonRed }]}
          >
            <MaterialCommunityIcons name="alarm-light" size={28} color={colors.neonRed} />
            <View style={styles.alarmBannerText}>
              <Text style={[styles.alarmBannerTitle, { color: colors.neonRed }]}>
                INTRUSION DETECTED
              </Text>
              <Text style={[styles.alarmBannerSub, { color: "#ff666688" }]}>
                Tap to dismiss alarm
              </Text>
            </View>
            <Feather name="x-circle" size={20} color={colors.neonRed} />
          </Pressable>
        )}

        {/* Offline notice */}
        {!isConnected && status !== "connecting" && (
          <View style={[styles.offlineBanner, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Feather name="wifi-off" size={16} color={colors.mutedForeground} />
            <Text style={[styles.offlineText, { color: colors.mutedForeground }]}>
              Not connected — go to Settings to connect
            </Text>
          </View>
        )}

        {/* Sensor cards */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SENSORS</Text>
        <View style={styles.sensorGrid}>
          {/* Temperature */}
          <View style={[styles.sensorCard, { backgroundColor: colors.card, borderColor: "rgba(0,200,255,0.2)" }]}>
            <View style={styles.sensorCardHeader}>
              <MaterialCommunityIcons name="thermometer" size={18} color={colors.neonBlue} />
              <Text style={[styles.sensorCardLabel, { color: colors.mutedForeground }]}>TEMP</Text>
            </View>
            <Text style={[styles.sensorCardValue, { color: colors.neonBlue }]}>
              {sensors.temperature !== null ? sensors.temperature.toFixed(1) : "--"}
            </Text>
            <Text style={[styles.sensorCardUnit, { color: colors.mutedForeground }]}>°C</Text>
          </View>

          {/* Humidity */}
          <View style={[styles.sensorCard, { backgroundColor: colors.card, borderColor: "rgba(0,255,136,0.2)" }]}>
            <View style={styles.sensorCardHeader}>
              <MaterialCommunityIcons name="water-percent" size={18} color={colors.neonGreen} />
              <Text style={[styles.sensorCardLabel, { color: colors.mutedForeground }]}>HUM</Text>
            </View>
            <Text style={[styles.sensorCardValue, { color: colors.neonGreen }]}>
              {sensors.humidity !== null ? sensors.humidity.toFixed(1) : "--"}
            </Text>
            <Text style={[styles.sensorCardUnit, { color: colors.mutedForeground }]}>%</Text>
          </View>
        </View>

        {/* Motion */}
        <View
          style={[
            styles.motionCard,
            {
              backgroundColor: colors.card,
              borderColor: sensors.motion ? "rgba(255,50,50,0.4)" : "rgba(0,200,255,0.2)",
            },
          ]}
        >
          <View style={styles.motionLeft}>
            <View
              style={[
                styles.motionDot,
                {
                  backgroundColor: sensors.motion ? colors.neonRed : colors.neonBlue,
                  shadowColor: sensors.motion ? colors.neonRed : colors.neonBlue,
                },
              ]}
            />
            <View>
              <Text style={[styles.motionLabel, { color: colors.mutedForeground }]}>MOTION SENSOR</Text>
              <Text
                style={[
                  styles.motionValue,
                  { color: sensors.motion ? colors.neonRed : colors.neonBlue },
                ]}
              >
                {sensors.motion ? "DETECTED" : "NO MOTION"}
              </Text>
            </View>
          </View>
          <Feather
            name={sensors.motion ? "alert-triangle" : "shield"}
            size={22}
            color={sensors.motion ? colors.neonRed : colors.neonBlue}
          />
        </View>

        {/* Last update */}
        {sensors.lastUpdate && (
          <Text style={[styles.lastUpdate, { color: colors.mutedForeground }]}>
            Last update: {sensors.lastUpdate.toLocaleTimeString()}
          </Text>
        )}

        {/* Controls */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>CONTROLS</Text>

        {/* LED */}
        <Pressable
          onPress={handleToggleLed}
          disabled={!isConnected}
          style={({ pressed }) => [
            styles.controlCard,
            {
              backgroundColor: colors.card,
              borderColor: sensors.ledState ? "rgba(0,255,136,0.4)" : colors.border,
              opacity: !isConnected ? 0.4 : pressed ? 0.75 : 1,
            },
          ]}
        >
          <View style={styles.controlLeft}>
            <View
              style={[
                styles.controlIcon,
                {
                  backgroundColor: sensors.ledState
                    ? "rgba(0,255,136,0.12)"
                    : "rgba(0,200,255,0.08)",
                },
              ]}
            >
              <MaterialCommunityIcons
                name="lightbulb"
                size={22}
                color={sensors.ledState ? colors.neonGreen : colors.mutedForeground}
              />
            </View>
            <View>
              <Text style={[styles.controlTitle, { color: colors.foreground }]}>LED Light</Text>
              <Text style={[styles.controlSub, { color: colors.mutedForeground }]}>
                home/led
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.controlBadge,
              {
                backgroundColor: sensors.ledState
                  ? "rgba(0,255,136,0.15)"
                  : "rgba(100,116,139,0.15)",
                borderColor: sensors.ledState ? "rgba(0,255,136,0.4)" : "rgba(100,116,139,0.3)",
              },
            ]}
          >
            <Text
              style={[
                styles.controlBadgeText,
                { color: sensors.ledState ? colors.neonGreen : colors.mutedForeground },
              ]}
            >
              {sensors.ledState ? "ON" : "OFF"}
            </Text>
          </View>
        </Pressable>

        {/* Buzzer */}
        <Pressable
          onPress={handleToggleBuzzer}
          disabled={!isConnected}
          style={({ pressed }) => [
            styles.controlCard,
            {
              backgroundColor: colors.card,
              borderColor: sensors.buzzerState ? "rgba(255,50,50,0.4)" : colors.border,
              opacity: !isConnected ? 0.4 : pressed ? 0.75 : 1,
            },
          ]}
        >
          <View style={styles.controlLeft}>
            <View
              style={[
                styles.controlIcon,
                {
                  backgroundColor: sensors.buzzerState
                    ? "rgba(255,50,50,0.12)"
                    : "rgba(0,200,255,0.08)",
                },
              ]}
            >
              <MaterialCommunityIcons
                name="bell"
                size={22}
                color={sensors.buzzerState ? colors.neonRed : colors.mutedForeground}
              />
            </View>
            <View>
              <Text style={[styles.controlTitle, { color: colors.foreground }]}>Buzzer</Text>
              <Text style={[styles.controlSub, { color: colors.mutedForeground }]}>
                home/buzzer
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.controlBadge,
              {
                backgroundColor: sensors.buzzerState
                  ? "rgba(255,50,50,0.15)"
                  : "rgba(100,116,139,0.15)",
                borderColor: sensors.buzzerState ? "rgba(255,50,50,0.4)" : "rgba(100,116,139,0.3)",
              },
            ]}
          >
            <Text
              style={[
                styles.controlBadgeText,
                { color: sensors.buzzerState ? colors.neonRed : colors.mutedForeground },
              ]}
            >
              {sensors.buzzerState ? "ACTIVE" : "SILENT"}
            </Text>
          </View>
        </Pressable>

        {/* Alarm toggle */}
        <View
          style={[
            styles.controlCard,
            {
              backgroundColor: colors.card,
              borderColor: alarmEnabled
                ? alarmTriggered
                  ? "rgba(255,50,50,0.4)"
                  : "rgba(0,255,136,0.4)"
                : colors.border,
            },
          ]}
        >
          <View style={styles.controlLeft}>
            <View
              style={[
                styles.controlIcon,
                {
                  backgroundColor: alarmEnabled
                    ? alarmTriggered
                      ? "rgba(255,50,50,0.12)"
                      : "rgba(0,255,136,0.12)"
                    : "rgba(0,200,255,0.08)",
                },
              ]}
            >
              <MaterialCommunityIcons
                name="shield-check"
                size={22}
                color={
                  alarmTriggered
                    ? colors.neonRed
                    : alarmEnabled
                    ? colors.neonGreen
                    : colors.mutedForeground
                }
              />
            </View>
            <View>
              <Text style={[styles.controlTitle, { color: colors.foreground }]}>Alarm System</Text>
              <Text style={[styles.controlSub, { color: colors.mutedForeground }]}>
                {alarmTriggered ? "TRIGGERED!" : alarmEnabled ? "Armed" : "Disarmed"}
              </Text>
            </View>
          </View>
          <Switch
            value={alarmEnabled}
            onValueChange={handleToggleAlarm}
            trackColor={{ false: "#1e2d3d", true: "rgba(0,255,136,0.3)" }}
            thumbColor={alarmEnabled ? colors.neonGreen : "#4b5563"}
            ios_backgroundColor="#1e2d3d"
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,200,255,0.08)",
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: 4,
  },
  headerSub: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    letterSpacing: 2,
    marginTop: 2,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },
  alarmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,30,30,0.08)",
    zIndex: 1,
    pointerEvents: "none",
  },
  scroll: { paddingHorizontal: 16, paddingTop: 12 },
  alarmBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "rgba(255,30,30,0.1)",
    marginBottom: 12,
  },
  alarmBannerText: { flex: 1 },
  alarmBannerTitle: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  alarmBannerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  offlineText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
    marginBottom: 10,
    marginTop: 4,
  },
  sensorGrid: { flexDirection: "row", gap: 10, marginBottom: 10 },
  sensorCard: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  sensorCardHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  sensorCardLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1.5 },
  sensorCardValue: { fontSize: 36, fontFamily: "Inter_700Bold", lineHeight: 40 },
  sensorCardUnit: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 2 },
  motionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  motionLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  motionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  motionLabel: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 1.5 },
  motionValue: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: 1, marginTop: 2 },
  lastUpdate: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 16, marginTop: 4 },
  controlCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  controlLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  controlIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  controlTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  controlSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  controlBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  controlBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1 },
});
