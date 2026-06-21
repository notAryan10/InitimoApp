import { Link, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { avatarTint, c, radius, sp } from "@/lib/theme";
import type { Character } from "@/lib/types";

export default function Dashboard() {
  const { logout } = useAuth();
  const router = useRouter();
  const [chars, setChars] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api<Character[]>("/api/character/my")
      .then(setChars)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Reload when returning from create screen.
  useFocusEffect(useCallback(() => load(), [load]));

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={c.accent} />
      </View>
    );

  return (
    <View style={styles.container}>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={chars}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={load} tintColor={c.muted} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No one here yet</Text>
            <Text style={styles.emptyBody}>
              Create your first character and start a conversation.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => router.push(`/(app)/chat/${item._id}`)}
          >
            <View style={[styles.avatar, { backgroundColor: avatarTint(item._id) }]}>
              <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.name}>{item.name}</Text>
              {!!item.description && (
                <Text style={styles.tagline} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
      />
      <Link href="/(app)/create" asChild>
        <TouchableOpacity style={styles.fab} activeOpacity={0.85}>
          <Text style={styles.fabText}>＋</Text>
        </TouchableOpacity>
      </Link>
      <TouchableOpacity onPress={logout} style={styles.logout} hitSlop={8}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.bg },
  list: { padding: sp.lg, paddingBottom: 140, gap: sp.md },
  error: { color: c.danger, padding: sp.lg, paddingBottom: 0 },
  empty: { alignItems: "center", marginTop: 120, paddingHorizontal: sp.xl },
  emptyTitle: { color: c.ink, fontSize: 20, fontWeight: "700", marginBottom: sp.sm },
  emptyBody: { color: c.muted, fontSize: 15, textAlign: "center", lineHeight: 22 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp.lg,
    padding: sp.lg,
    borderRadius: radius.lg,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  avatar: { width: 52, height: 52, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  avatarText: { color: c.onAccent, fontSize: 22, fontWeight: "800" },
  cardBody: { flex: 1 },
  name: { fontSize: 18, fontWeight: "700", color: c.ink },
  tagline: { color: c.muted, marginTop: 3, fontSize: 14, lineHeight: 19 },
  chevron: { color: c.faint, fontSize: 26, fontWeight: "300" },
  fab: {
    position: "absolute",
    right: sp.xl,
    bottom: 96,
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: c.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: c.accent,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  fabText: { color: c.onAccent, fontSize: 30, lineHeight: 32, fontWeight: "400" },
  logout: { position: "absolute", bottom: sp.xl, alignSelf: "center", padding: sp.md },
  logoutText: { color: c.faint, fontSize: 14, fontWeight: "600" },
});
