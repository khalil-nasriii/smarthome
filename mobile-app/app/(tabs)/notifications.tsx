import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useMqtt } from "@/context/MqttContext";

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { logs } = useMqtt();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const events = logs
    .filter((l) => l.topic.endsWith("/motion"))
    .slice()
    .reverse()
    .slice(0, 20);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.title, { color: colors.neonBlue }]}>NOTIFICATIONS</Text>
      </View>
      <View style={{ padding: 16, gap: 10 }}>
        {events.length === 0 ? (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>
            No motion events yet. MQTT-only mode enabled.
          </Text>
        ) : (
          events.map((item) => (
            <View key={item.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Motion event</Text>
              <Text style={[styles.cardBody, { color: colors.mutedForeground }]}>
                Topic: {item.topic}
              </Text>
              <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
                {item.timestamp.toLocaleString()} • payload: {item.payload}
              </Text>
            </View>
          ))
        )}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 3 },
  card: { borderWidth: 1, borderRadius: 12, padding: 12 },
  cardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  cardBody: { marginTop: 4, fontSize: 12, fontFamily: "Inter_400Regular" },
  cardMeta: { marginTop: 6, fontSize: 11, fontFamily: "Inter_400Regular" },
  empty: { textAlign: "center", marginTop: 28, fontSize: 13, fontFamily: "Inter_400Regular" },
});

