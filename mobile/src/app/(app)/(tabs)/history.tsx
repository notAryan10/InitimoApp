import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import Reanimated, { FadeInDown } from "react-native-reanimated";
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
import { avatarTint, c, radius, sp } from "@/lib/theme";

const AnimatedRow = Reanimated.createAnimatedComponent(TouchableOpacity);

type ChatItem = {
  chatId: string;
  characterId: string;
  name: string;
  image?: string | null;
  level: string;
  emoji: string;
  lastSeen: string;
  preview: string;
};

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function History() {
  const router = useRouter();
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api<ChatItem[]>("/api/chat/list")
      .then(setChats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

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
        data={chats}
        keyExtractor={(item) => item.chatId}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={c.muted} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptyBody}>Start chatting from the Characters tab.</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <AnimatedRow
            entering={FadeInDown.delay(Math.min(index, 10) * 45).duration(260)}
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => router.push(`/(app)/chat/${item.characterId}`)}
          >
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: avatarTint(item.characterId) }]}>
                <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.body}>
              <View style={styles.topLine}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.time}>{timeAgo(item.lastSeen)}</Text>
              </View>
              <Text style={styles.preview} numberOfLines={1}>
                {item.preview || "No messages yet"}
              </Text>
              <Text style={styles.level}>
                {item.emoji} {item.level}
              </Text>
            </View>
          </AnimatedRow>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.bg },
  list: { padding: sp.lg, gap: sp.md },
  error: { color: c.danger, padding: sp.lg, paddingBottom: 0 },
  empty: { alignItems: "center", marginTop: 120, paddingHorizontal: sp.xl },
  emptyTitle: { color: c.ink, fontSize: 20, fontWeight: "700", marginBottom: sp.sm },
  emptyBody: { color: c.muted, fontSize: 15, textAlign: "center", lineHeight: 22 },
  row: {
    flexDirection: "row",
    gap: sp.lg,
    padding: sp.lg,
    borderRadius: radius.lg,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  avatar: { width: 52, height: 52, borderRadius: radius.pill },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarText: { color: c.onAccent, fontSize: 22, fontWeight: "800" },
  body: { flex: 1, justifyContent: "center", gap: 3 },
  topLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name: { fontSize: 17, fontWeight: "700", color: c.ink, flex: 1 },
  time: { fontSize: 13, color: c.faint, marginLeft: sp.sm },
  preview: { fontSize: 14, color: c.muted },
  level: { fontSize: 12, color: c.accent, fontWeight: "600", marginTop: 2 },
});
