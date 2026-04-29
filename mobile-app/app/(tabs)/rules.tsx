import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMqtt } from "@/context/MqttContext";
import { useColors } from "@/hooks/useColors";

export default function RulesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { config, status } = useMqtt();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.title, { color: colors.neonBlue }]}>RULES</Text>
      </View>
      <View style={{ padding: 16 }}>
        <View style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.ruleLabel, { color: colors.foreground }]}>MQTT-only mode</Text>
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }}>
            Device: {config.deviceId}
          </Text>
        </View>
        <View style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card, marginTop: 8 }]}>
          <Text style={[styles.ruleLabel, { color: colors.foreground }]}>Connection status</Text>
          <Text style={{ color: status === "connected" ? colors.neonGreen : colors.mutedForeground, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
            {status.toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.empty, { color: colors.mutedForeground }]}>
          Automation rules via API were removed from mobile to keep behavior MQTT-only like requested.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,200,255,0.08)",
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 3 },
  row: { borderWidth: 1, borderRadius: 10, padding: 12, flexDirection: "row", justifyContent: "space-between" },
  ruleLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  empty: { textAlign: "center", marginTop: 24, fontSize: 13, fontFamily: "Inter_400Regular" },
});

