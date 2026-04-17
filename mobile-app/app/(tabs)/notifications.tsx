import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { listNotifications, type NotificationEvent } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listNotifications({ limit: 50 });
      setEvents(res.events);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load notifications";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, [load]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.title, { color: colors.neonBlue }]}>NOTIFICATIONS</Text>
        <Pressable
          onPress={load}
          style={[styles.refreshBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
        >
          <Text style={[styles.refreshText, { color: colors.mutedForeground }]}>
            {loading ? "Loading..." : "Refresh"}
          </Text>
        </Pressable>
      </View>

      {error && <Text style={[styles.error, { color: colors.neonRed }]}>{error}</Text>}

      <FlatList
        data={events}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.title}</Text>
            <Text style={[styles.cardBody, { color: colors.mutedForeground }]}>{item.body}</Text>
            <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
              {new Date(item.createdAt).toLocaleString()} • {item.kind}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>
            {loading ? "Loading..." : "No notifications yet."}
          </Text>
        }
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 3 },
  refreshBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  refreshText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  error: { paddingHorizontal: 16, paddingTop: 10, fontSize: 12, fontFamily: "Inter_400Regular" },
  card: { borderWidth: 1, borderRadius: 12, padding: 12 },
  cardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  cardBody: { marginTop: 4, fontSize: 12, fontFamily: "Inter_400Regular" },
  cardMeta: { marginTop: 6, fontSize: 11, fontFamily: "Inter_400Regular" },
  empty: { textAlign: "center", marginTop: 28, fontSize: 13, fontFamily: "Inter_400Regular" },
});

