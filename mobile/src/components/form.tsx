import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
} from "react-native";

import { c, radius, sp } from "@/lib/theme";

export function Field(props: TextInputProps) {
  return <TextInput style={styles.input} placeholderTextColor={c.faint} {...props} />;
}

export function SubmitButton({
  label,
  busy,
  onPress,
}: {
  label: string;
  busy?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.btn, busy && styles.btnBusy]}
      onPress={onPress}
      disabled={busy}
      activeOpacity={0.85}
    >
      {busy ? (
        <ActivityIndicator color={c.onAccent} />
      ) : (
        <Text style={styles.btnText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

export const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", padding: sp.xl, gap: sp.md, backgroundColor: c.bg },
  title: { fontSize: 32, fontWeight: "800", color: c.ink, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: c.muted, marginBottom: sp.lg, lineHeight: 22 },
  input: {
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    borderRadius: radius.md,
    paddingHorizontal: sp.lg,
    paddingVertical: 15,
    fontSize: 16,
    color: c.ink,
  },
  error: { color: c.danger, fontSize: 14 },
  link: { color: c.accent, textAlign: "center", marginTop: sp.md, fontSize: 15, fontWeight: "600" },
  btn: {
    backgroundColor: c.accent,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: "center",
    marginTop: sp.xs,
  },
  btnBusy: { opacity: 0.7 },
  btnText: { color: c.onAccent, fontWeight: "700", fontSize: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: sp.md },
});
