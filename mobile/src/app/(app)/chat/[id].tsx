import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { api } from "@/lib/api";
import type { Message, Relationship } from "@/lib/types";

type ChatLoad = {
  messages: Message[];
  relationship: Relationship;
  level: string;
  emoji: string;
};
type SendRes = {
  reply: string;
  relationship: Relationship;
  level: string;
  emoji: string;
  emotion: string;
  event?: string | null;
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
    setMessages((m) => [...m, { sender: "user", text: message }]);
    setSending(true);
    try {
      const res = await api<SendRes>("/api/chat/message", { body: { chatId, message } });
      setMessages((m) => [...m, { sender: "character", text: res.reply }]);
      setRel(res.relationship);
      setLevel(res.level);
      setEmoji(res.emoji);
    } catch (e: any) {
      setMessages((m) => [...m, { sender: "character", text: `⚠️ ${e.message}` }]);
    } finally {
      setSending(false);
    }
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      {rel && (
        <View style={styles.relBar}>
          <Text style={styles.stat}>❤️ {Math.round(rel.affection)}</Text>
          <Text style={styles.stat}>🤝 {Math.round(rel.trust)}</Text>
          <Text style={styles.stat}>🔥 {Math.round(rel.intimacy)}</Text>
          <Text style={styles.level}>
            {emoji} {level}
          </Text>
        </View>
      )}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ padding: 12, gap: 8 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.sender === "user" ? styles.user : styles.assistant]}>
            <RichText text={item.text} mine={item.sender === "user"} />
          </View>
        )}
        ListFooterComponent={sending ? <Text style={styles.typing}>typing…</Text> : null}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Message…"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendBtn} onPress={send} disabled={sending}>
          <Text style={styles.sendText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// Renders *narration* as italic, leaving "dialogue" as normal text.
function RichText({ text, mine }: { text: string; mine: boolean }) {
  const parts = text.split(/(\*[^*]+\*)/g).filter(Boolean);
  return (
    <Text style={mine ? styles.userText : undefined}>
      {parts.map((p, i) =>
        p.startsWith("*") && p.endsWith("*") ? (
          <Text key={i} style={[styles.narration, mine && styles.userText]}>
            {p.slice(1, -1)}
          </Text>
        ) : (
          <Text key={i}>{p}</Text>
        )
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  relBar: {
    flexDirection: "row",
    gap: 14,
    padding: 8,
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
  },
  stat: { fontSize: 13 },
  level: { marginLeft: "auto", fontStyle: "italic", color: "#7c3aed" },
  bubble: { maxWidth: "80%", padding: 12, borderRadius: 14 },
  user: { alignSelf: "flex-end", backgroundColor: "#7c3aed" },
  userText: { color: "#fff" },
  narration: { fontStyle: "italic", color: "#666" },
  assistant: { alignSelf: "flex-start", backgroundColor: "#eee" },
  typing: { padding: 8, color: "#888", fontStyle: "italic" },
  inputRow: {
    flexDirection: "row",
    padding: 8,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
  },
  sendText: { color: "#fff", fontSize: 18 },
});
