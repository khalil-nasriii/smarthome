import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MqttConfig, useMqtt } from "@/context/MqttContext";
import { useColors } from "@/hooks/useColors";

const PRESETS = [
  {
    label: "HiveMQ Public",
    url: "wss://broker.hivemq.com:8884/mqtt",
    requiresAuth: false,
  },
  {
    label: "HiveMQ Cloud",
    url: "wss://YOUR-CLUSTER.s1.eu.hivemq.cloud:8884/mqtt",
    requiresAuth: true,
  },
  {
    label: "Custom",
    url: "",
    requiresAuth: false,
  },
];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { status, errorMessage, config, connect, disconnect, setConfig, setDeviceId } = useMqtt();

  const [form, setForm] = useState<MqttConfig>({ ...config });
  const [selectedPreset, setSelectedPreset] = useState(
    config.brokerUrl.includes(".hivemq.cloud")
      ? 1
      : config.brokerUrl.includes("broker.hivemq.com")
        ? 0
        : 2,
  );

  useEffect(() => {
    setForm({ ...config });
    setSelectedPreset(
      config.brokerUrl.includes(".hivemq.cloud")
        ? 1
        : config.brokerUrl.includes("broker.hivemq.com")
          ? 0
          : 2,
    );
  }, [config]);

  const isConnected = status === "connected";
  const isConnecting = status === "connecting";

  const handlePreset = (idx: number) => {
    setSelectedPreset(idx);
    if (idx < 2) {
      setForm((f) => ({ ...f, brokerUrl: PRESETS[idx].url }));
    }
  };

  const handleConnect = () => {
    const brokerUrl = form.brokerUrl.trim();
    if (!brokerUrl) {
      Alert.alert("Missing URL", "Please enter a broker URL.");
      return;
    }
    if (!/^wss?:\/\//i.test(brokerUrl) && !brokerUrl.includes(".hivemq.cloud")) {
      Alert.alert("Invalid URL", "Broker URL must include ws:// or wss://");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const next = { ...form, brokerUrl };
    setConfig(next);
    connect(next);
  };

  const handleDisconnect = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    disconnect();
  };

  const regenClientId = () => {
    setForm((f) => ({
      ...f,
      clientId: `smarthome_mobile_${Date.now().toString(16).slice(-6)}`,
    }));
  };

  const statusColors = {
    disconnected: colors.mutedForeground,
    connecting: "#fbbf24",
    connected: colors.neonGreen,
    error: colors.neonRed,
  };
  const statusLabels = {
    disconnected: "Disconnected",
    connecting: "Connecting...",
    connected: "Connected",
    error: "Error",
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.neonBlue }]}>SETTINGS</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>MQTT CONFIGURATION</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Connection status */}
        <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColors[status] }]} />
            <Text style={[styles.statusText, { color: statusColors[status] }]}>
              {statusLabels[status]}
            </Text>
          </View>
          {errorMessage && (
            <Text style={[styles.errorText, { color: colors.neonRed }]} numberOfLines={3}>
              {errorMessage}
            </Text>
          )}
          {isConnected && (
            <Text style={[styles.connectedInfo, { color: colors.mutedForeground }]} numberOfLines={1}>
              {form.brokerUrl.replace("wss://", "").split(":")[0]}
            </Text>
          )}
        </View>

        {/* Broker presets */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>BROKER TYPE</Text>
        <View style={styles.presetRow}>
          {PRESETS.map((p, i) => (
            <Pressable
              key={i}
              onPress={() => handlePreset(i)}
              style={[
                styles.presetBtn,
                {
                  backgroundColor:
                    selectedPreset === i ? "rgba(0,200,255,0.12)" : colors.card,
                  borderColor:
                    selectedPreset === i ? "rgba(0,200,255,0.5)" : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.presetLabel,
                  { color: selectedPreset === i ? colors.neonBlue : colors.mutedForeground },
                ]}
              >
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Broker URL */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>BROKER URL (WSS)</Text>
        <TextInput
          value={form.brokerUrl}
          onChangeText={(v) => { setForm((f) => ({ ...f, brokerUrl: v })); setSelectedPreset(2); }}
          placeholder="wss://broker.hivemq.com:8884/mqtt"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
        />
        {selectedPreset === 1 && (
          <Text style={[styles.hint, { color: "#fbbf2499" }]}>
            Replace YOUR-CLUSTER with your HiveMQ Cloud cluster ID
          </Text>
        )}

        {/* Username */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>USERNAME</Text>
        <TextInput
          value={form.username}
          onChangeText={(v) => setForm((f) => ({ ...f, username: v }))}
          placeholder={selectedPreset === 1 ? "required" : "optional"}
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
        />

        {/* Password */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>PASSWORD</Text>
        <TextInput
          value={form.password}
          onChangeText={(v) => setForm((f) => ({ ...f, password: v }))}
          placeholder={selectedPreset === 1 ? "required" : "optional"}
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry
          autoCapitalize="none"
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
        />

        {/* Client ID */}
        <Text style={[styles.label, { color: colors.mutedForeground }]}>CLIENT ID</Text>
        <View style={styles.clientRow}>
          <TextInput
            value={form.clientId}
            onChangeText={(v) => setForm((f) => ({ ...f, clientId: v }))}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, styles.clientInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
          />
          <Pressable
            onPress={regenClientId}
            style={[styles.regenBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name="refresh-cw" size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>DEVICE ID</Text>
        <TextInput
          value={form.deviceId}
          onChangeText={(v) => {
            const next = v.trim() || "1";
            setForm((f) => ({ ...f, deviceId: next }));
            setDeviceId(next);
          }}
          placeholder="1"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
        />

        {/* Topics info */}
        <View style={[styles.topicsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.topicsTitle, { color: colors.mutedForeground }]}>Subscribed topics:</Text>
          {[
            `home/${form.deviceId}/temp`,
            `home/${form.deviceId}/hum`,
            `home/${form.deviceId}/motion`,
            `home/${form.deviceId}/led/status`,
            `home/${form.deviceId}/buzzer/status`,
            `home/${form.deviceId}/alarm/status`,
          ].map(
            (t) => (
              <Text key={t} style={[styles.topicItem, { color: colors.neonBlue }]}>
                • {t}
              </Text>
            )
          )}
          <Text style={[styles.topicsTitle, { color: colors.mutedForeground, marginTop: 8 }]}>Publish topics:</Text>
          {[`home/${form.deviceId}/led`, `home/${form.deviceId}/buzzer`, `home/${form.deviceId}/alarm`].map((t) => (
            <Text key={t} style={[styles.topicItem, { color: colors.neonGreen }]}>
              • {t}
            </Text>
          ))}
        </View>

        {/* Connect / Disconnect buttons */}
        {isConnected ? (
          <Pressable
            onPress={handleDisconnect}
            style={({ pressed }) => [
              styles.connectBtn,
              { backgroundColor: "rgba(255,50,50,0.1)", borderColor: "rgba(255,50,50,0.4)", opacity: pressed ? 0.75 : 1 },
            ]}
          >
            <Feather name="wifi-off" size={18} color={colors.neonRed} />
            <Text style={[styles.connectBtnText, { color: colors.neonRed }]}>Disconnect</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleConnect}
            disabled={isConnecting}
            style={({ pressed }) => [
              styles.connectBtn,
              {
                backgroundColor: "rgba(0,200,255,0.1)",
                borderColor: "rgba(0,200,255,0.4)",
                opacity: isConnecting || pressed ? 0.7 : 1,
              },
            ]}
          >
            <Feather name="wifi" size={18} color={colors.neonBlue} />
            <Text style={[styles.connectBtnText, { color: colors.neonBlue }]}>
              {isConnecting ? "Connecting..." : "Connect"}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,200,255,0.08)",
  },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 4 },
  headerSub: { fontSize: 10, fontFamily: "Inter_400Regular", letterSpacing: 2, marginTop: 2 },
  scroll: { paddingHorizontal: 16, paddingTop: 16 },
  statusCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 6,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  connectedInfo: { fontSize: 12, fontFamily: "Inter_400Regular" },
  label: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 2, marginBottom: 6 },
  presetRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  presetBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  presetLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 14,
  },
  hint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: -10, marginBottom: 14 },
  clientRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  clientInput: { flex: 1, marginBottom: 14 },
  regenBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  topicsCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  topicsTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginBottom: 6 },
  topicItem: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 2 },
  connectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  connectBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
});
