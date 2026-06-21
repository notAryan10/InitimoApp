import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useFocusEffect, useRouter } from "expo-router";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { api } from "@/lib/api";
import { avatarTint, c, radius, sp } from "@/lib/theme";
import type { Character } from "@/lib/types";

const AnimatedCard = Reanimated.createAnimatedComponent(TouchableOpacity);

export default function Characters() {
  const router = useRouter();
  const [chars, setChars] = useState<Character[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api<Character[]>("/api/character/my")
      .then(setChars)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => load(), [load]));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? chars.filter((ch) => ch.name.toLowerCase().includes(q)) : chars;
  }, [chars, query]);

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={c.accent} />
      </View>
    );

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={c.faint} />
        <TextInput
          style={styles.search}
          placeholder="Search characters"
          placeholderTextColor={c.faint}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.grid}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={c.muted} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{query ? "No matches" : "No one here yet"}</Text>
            <Text style={styles.emptyBody}>
              {query ? "Try a different name." : "Tap + to create your first character."}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const tint = avatarTint(item._id);
          return (
            <AnimatedCard
              entering={FadeInDown.delay(Math.min(index, 8) * 45).duration(280)}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => router.push(`/(app)/chat/${item._id}`)}
              onLongPress={() => router.push(`/(app)/create?id=${item._id}`)}
              delayLongPress={300}
            >
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.cardFill} contentFit="cover" transition={200} />
              ) : (
                <LinearGradient colors={[tint, c.bg]} style={styles.cardFill}>
                  <Text style={styles.cardInitial}>{item.name.charAt(0).toUpperCase()}</Text>
                </LinearGradient>
              )}
              <LinearGradient
                colors={["transparent", "rgba(10,7,12,0.92)"]}
                style={styles.scrim}
                pointerEvents="none"
              />
              <View style={styles.badge}>
                <Ionicons name="chatbubble" size={13} color={c.ink} />
              </View>
              <Text style={styles.cardName} numberOfLines={1}>
                {item.name}
              </Text>
            </AnimatedCard>
          );
        }}
      />

      <Link href="/(app)/create" asChild>
        <TouchableOpacity style={styles.fab} activeOpacity={0.85}>
          <Ionicons name="add" size={30} color={c.onAccent} />
        </TouchableOpacity>
      </Link>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.bg },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp.sm,
    margin: sp.lg,
    marginBottom: sp.sm,
    paddingHorizontal: sp.lg,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  search: { flex: 1, color: c.ink, fontSize: 15 },
  grid: { padding: sp.md, paddingBottom: 120 },
  column: { gap: sp.md },
  card: {
    flex: 1,
    aspectRatio: 0.74,
    marginBottom: sp.md,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  cardFill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  cardInitial: { color: "rgba(255,255,255,0.85)", fontSize: 64, fontWeight: "800" },
  scrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: "55%" },
  badge: {
    position: "absolute",
    top: sp.sm,
    right: sp.sm,
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: "rgba(10,7,12,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardName: { position: "absolute", left: sp.md, right: sp.md, bottom: sp.md, color: "#fff", fontSize: 17, fontWeight: "700" },
  empty: { alignItems: "center", marginTop: 120, paddingHorizontal: sp.xl },
  emptyTitle: { color: c.ink, fontSize: 20, fontWeight: "700", marginBottom: sp.sm },
  emptyBody: { color: c.muted, fontSize: 15, textAlign: "center", lineHeight: 22 },
  error: { color: c.danger, textAlign: "center", padding: sp.md },
  fab: {
    position: "absolute",
    right: sp.xl,
    bottom: sp.xl,
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
});
