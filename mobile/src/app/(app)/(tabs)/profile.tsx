import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { avatarTint, c, radius, sp } from "@/lib/theme";

type Me = { _id: string; username: string; email: string; isAdult?: boolean; plan?: string; createdAt?: string };

export default function Profile() {
  const { logout } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      api<Me>("/api/auth/me")
        .then(setMe)
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [])
  );

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={c.accent} />
      </View>
    );

  const initial = me?.username?.charAt(0).toUpperCase() || "?";
  const since = me?.createdAt
    ? new Date(me.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: avatarTint(me?._id || "me") }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.username}>{me?.username || "You"}</Text>
        {!!me?.email && <Text style={styles.email}>{me.email}</Text>}
      </View>

      <View style={styles.fields}>
        <Field label="Plan" value={(me?.plan || "free").toUpperCase()} />
        <Field label="Age confirmed" value={me?.isAdult ? "Yes (18+)" : "No"} />
        {since && <Field label="Member since" value={since} last />}
      </View>

      <TouchableOpacity style={styles.logout} onPress={logout} activeOpacity={0.85}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

function Field({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.field, last && styles.fieldLast]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg, padding: sp.xl },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.bg },
  header: { alignItems: "center", marginTop: sp.xl, marginBottom: sp.xxl },
  avatar: { width: 88, height: 88, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", marginBottom: sp.lg },
  avatarText: { color: c.onAccent, fontSize: 38, fontWeight: "800" },
  username: { color: c.ink, fontSize: 24, fontWeight: "800" },
  email: { color: c.muted, fontSize: 15, marginTop: sp.xs },
  fields: { backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, paddingHorizontal: sp.lg },
  field: { flexDirection: "row", justifyContent: "space-between", paddingVertical: sp.lg, borderBottomWidth: 1, borderColor: c.border },
  fieldLast: { borderBottomWidth: 0 },
  fieldLabel: { color: c.muted, fontSize: 15 },
  fieldValue: { color: c.ink, fontSize: 15, fontWeight: "600" },
  logout: {
    marginTop: sp.xxl,
    paddingVertical: 15,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.accent,
    alignItems: "center",
  },
  logoutText: { color: c.accent, fontSize: 16, fontWeight: "700" },
});
