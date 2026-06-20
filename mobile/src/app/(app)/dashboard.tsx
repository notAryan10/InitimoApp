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

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={chars}
        keyExtractor={(c) => c._id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
        ListEmptyComponent={<Text style={styles.empty}>No characters yet. Create one.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/(app)/chat/${item._id}`)}
          >
            <Text style={styles.name}>{item.name}</Text>
            {!!item.description && (
              <Text style={styles.tagline} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </TouchableOpacity>
        )}
      />
      <Link href="/(app)/create" asChild>
        <TouchableOpacity style={styles.fab}>
          <Text style={styles.fabText}>＋</Text>
        </TouchableOpacity>
      </Link>
      <TouchableOpacity onPress={logout} style={styles.logout}>
        <Text style={{ color: "#7c3aed" }}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  error: { color: "#d11", marginBottom: 8 },
  empty: { textAlign: "center", marginTop: 48, color: "#888" },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#f3f0fb",
    marginBottom: 12,
  },
  name: { fontSize: 18, fontWeight: "600" },
  tagline: { color: "#666", marginTop: 4 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 70,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
  },
  fabText: { color: "#fff", fontSize: 28, lineHeight: 30 },
  logout: { alignItems: "center", padding: 12 },
});
