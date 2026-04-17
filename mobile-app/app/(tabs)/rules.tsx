import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createRule, deleteRule, listRules, type Rule } from "@workspace/api-client-react";
import { useMqtt } from "@/context/MqttContext";
import { useColors } from "@/hooks/useColors";

export default function RulesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { config } = useMqtt();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const deviceId = Number(config.deviceId) || 1;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listRules();
      setRules(res.rules);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addRule = async (type: "motion_night_buzzer" | "temp_threshold_alert" | "anomaly_alert") => {
    if (type === "motion_night_buzzer") {
      await createRule({ type, deviceId, startHour: 22, endHour: 6 });
    } else if (type === "temp_threshold_alert") {
      await createRule({ type, deviceId, thresholdC: 32 });
    } else {
      await createRule({ type, deviceId });
    }
    load();
  };

  const removeRule = async (id: number) => {
    await deleteRule(id);
    load();
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const shown = rules.filter((r) => r.deviceId === deviceId);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.title, { color: colors.neonBlue }]}>RULES (D{deviceId})</Text>
      </View>
      <View style={styles.actions}>
        <Pressable onPress={() => addRule("motion_night_buzzer")} style={[styles.actionBtn, { borderColor: colors.border }]}>
          <Text style={[styles.actionText, { color: colors.foreground }]}>+ motion buzzer</Text>
        </Pressable>
        <Pressable onPress={() => addRule("temp_threshold_alert")} style={[styles.actionBtn, { borderColor: colors.border }]}>
          <Text style={[styles.actionText, { color: colors.foreground }]}>+ temp alert</Text>
        </Pressable>
        <Pressable onPress={() => addRule("anomaly_alert")} style={[styles.actionBtn, { borderColor: colors.border }]}>
          <Text style={[styles.actionText, { color: colors.foreground }]}>+ anomaly</Text>
        </Pressable>
      </View>
      <FlatList
        data={shown}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.mutedForeground }]}>{loading ? "Loading..." : "No rules for device."}</Text>}
        renderItem={({ item }) => (
          <View style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.ruleLabel, { color: colors.foreground }]}>{item.type}</Text>
            <Pressable onPress={() => removeRule(item.id)}>
              <Text style={{ color: colors.neonRed, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>Delete</Text>
            </Pressable>
          </View>
        )}
      />
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
  actions: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 12, flexWrap: "wrap" },
  actionBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  actionText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  row: { borderWidth: 1, borderRadius: 10, padding: 12, flexDirection: "row", justifyContent: "space-between" },
  ruleLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  empty: { textAlign: "center", marginTop: 24, fontSize: 13, fontFamily: "Inter_400Regular" },
});

