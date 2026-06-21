import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { api, streamPost } from "@/lib/api";
import { c, radius, sp } from "@/lib/theme";
import type { Message, Relationship } from "@/lib/types";

type ChatLoad = {
  messages: Message[];
  relationship: Relationship;
  level: string;
  emoji: string;
};

export default function Chat() {
  const { id: characterId } = useLocalSearchParams<{ id: string }>();
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [rel, setRel] = useState<Relationship | null>(null);
  const [level, setLevel] = useState("");
  const [emoji, setEmoji] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  // Open (or resume) the chat for this character, then load its history.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { chatId } = await api<{ chatId: string }>("/api/chat/create", {
          body: { characterId },
        });
        const data = await api<ChatLoad>(`/api/chat/${chatId}`);
        if (cancelled) return;
        setChatId(chatId);
        setMessages(data.messages ?? []);
        setRel(data.relationship);
        setLevel(data.level);
        setEmoji(data.emoji);
      } catch {
        // leave empty; user sees an error on send
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [characterId]);

  async function send() {
    const message = input.trim();
    if (!message || sending || !chatId) return;
    setInput("");
    // Add the user message + an empty character bubble we fill as tokens arrive.
    setMessages((m) => [...m, { sender: "user", text: message }, { sender: "character", text: "" }]);
    setSending(true);

    const setLast = (text: string) =>
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { sender: "character", text };
        return copy;
      });

    try {
      await streamPost(
        "/api/chat/message",
        { chatId, message },
        {
          onMeta: (meta) => {
            setRel(meta.relationship);
            setLevel(meta.level);
            setEmoji(meta.emoji);
          },
          onChunk: (textSoFar) => setLast(textSoFar),
        }
      );
    } catch (e: any) {
      setLast(`⚠️ ${e.message}`);
    } finally {
      setSending(false);
    }
  }

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={c.accent} />
      </View>
    );

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      {rel && (
        <View style={styles.relBar}>
          <Stat icon="❤" value={rel.affection} />
          <Stat icon="🤝" value={rel.trust} />
          <Stat icon="🔥" value={rel.intimacy} />
          <View style={styles.levelPill}>
            <Text style={styles.levelText}>
              {emoji} {level}
            </Text>
          </View>
        </View>
      )}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const mine = item.sender === "user";
          const waiting = !mine && item.text === "";
          return (
            <View
              style={[
                styles.bubble,
                mine ? styles.user : styles.assistant,
                waiting && styles.bubbleWaiting,
              ]}
            >
              {waiting ? <TypingDots /> : <RichText text={item.text} mine={mine} />}
            </View>
          );
        }}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Message…"
          placeholderTextColor={c.faint}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={send}
          returnKeyType="send"
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnOff]}
          onPress={send}
          disabled={sending}
          activeOpacity={0.85}
        >
          <Text style={styles.sendText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function Stat({ icon, value }: { icon: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{Math.round(value)}</Text>
    </View>
  );
}

// Three dots that pulse while the reply is being generated. Falls back to
// static dots when the OS has reduce-motion enabled.
function TypingDots() {
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0.35))).current;
  useEffect(() => {
    let loops: Animated.CompositeAnimation[] = [];
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced) return;
      loops = dots.map((d, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(i * 160),
            Animated.timing(d, { toValue: 1, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(d, { toValue: 0.35, duration: 320, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          ])
        )
      );
      loops.forEach((l) => l.start());
    });
    return () => loops.forEach((l) => l.stop());
  }, [dots]);

  return (
    <View style={styles.dots}>
      {dots.map((d, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity: d, transform: [{ scale: d }] }]} />
      ))}
    </View>
  );
}

// Your messages: *action* renders italic. AI messages: "dialogue" is normal,
// everything else is narration (italic) — independent of the model's asterisks.
function RichText({ text, mine }: { text: string; mine: boolean }) {
  if (mine) {
    const parts = text.split(/(\*[^*]+\*)/g).filter(Boolean);
    return (
      <Text style={styles.userText}>
        {parts.map((p, i) =>
          p.startsWith("*") && p.endsWith("*") ? (
            <Text key={i} style={[styles.userText, styles.italic]}>
              {p.slice(1, -1)}
            </Text>
          ) : (
            <Text key={i}>{p}</Text>
          )
        )}
      </Text>
    );
  }
  const parts = text.split(/("[^"]*"|“[^”]*”)/g).filter(Boolean);
  return (
    <Text style={styles.aiText}>
      {parts.map((p, i) =>
        /^["“]/.test(p) ? (
          <Text key={i}>{p}</Text>
        ) : (
          <Text key={i} style={styles.narration}>
            {p.replace(/\*/g, "")}
          </Text>
        )
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.bg },
  relBar: {
    flexDirection: "row",
    gap: sp.md,
    paddingHorizontal: sp.lg,
    paddingVertical: sp.md,
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bg,
  },
  stat: { flexDirection: "row", alignItems: "center", gap: sp.xs },
  statIcon: { fontSize: 13 },
  statValue: { fontSize: 13, color: c.muted, fontWeight: "600", fontVariant: ["tabular-nums"] },
  levelPill: {
    marginLeft: "auto",
    backgroundColor: c.surface,
    borderRadius: radius.pill,
    paddingHorizontal: sp.md,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: c.border,
  },
  levelText: { color: c.accent, fontSize: 13, fontWeight: "700" },
  listContent: { padding: sp.lg, gap: sp.sm },
  bubble: { maxWidth: "82%", paddingHorizontal: sp.lg, paddingVertical: sp.md, borderRadius: radius.lg },
  bubbleWaiting: { paddingVertical: sp.lg },
  user: { alignSelf: "flex-end", backgroundColor: c.accent, borderBottomRightRadius: radius.sm },
  assistant: { alignSelf: "flex-start", backgroundColor: c.surface, borderBottomLeftRadius: radius.sm },
  userText: { color: c.onAccent, fontSize: 16, lineHeight: 23 },
  aiText: { color: c.ink, fontSize: 16, lineHeight: 23 },
  narration: { fontStyle: "italic", color: c.muted },
  italic: { fontStyle: "italic" },
  dots: { flexDirection: "row", gap: 6, alignItems: "center" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.muted },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: sp.md,
    gap: sp.sm,
    borderTopWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bg,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    paddingHorizontal: sp.lg,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 16,
    color: c.ink,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: c.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnOff: { opacity: 0.4 },
  sendText: { color: c.onAccent, fontSize: 22, fontWeight: "800", marginTop: -1 },
});
