import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Field, SubmitButton, styles as fs } from "@/components/form";
import { api } from "@/lib/api";
import { c, radius, sp } from "@/lib/theme";

// Preset starting relationship → seed stats (score = sum, see relationshipLevel.js).
const CLOSENESS = {
  Stranger: { startAffection: 0, startTrust: 0, startIntimacy: 0 },
  Friend: { startAffection: 15, startTrust: 12, startIntimacy: 3 },
  "Close Friend": { startAffection: 22, startTrust: 18, startIntimacy: 8 },
  Crush: { startAffection: 28, startTrust: 22, startIntimacy: 15 },
  Lover: { startAffection: 35, startTrust: 28, startIntimacy: 22 },
} as const;

export default function Create() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [personality, setPersonality] = useState("");
  const [description, setDescription] = useState("");
  const [gender, setGender] = useState<"female" | "male">("female");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [closeness, setCloseness] = useState<keyof typeof CLOSENESS>("Stranger");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim() || !personality.trim())
      return setError("Name and personality are required.");
    setBusy(true);
    setError(null);
    try {
      await api("/api/character/create", {
        body: { name: name.trim(), personality, description, gender, visibility, ...CLOSENESS[closeness] },
      });
      router.back();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ padding: sp.lg, gap: sp.md }}>
      <Field placeholder="Name *" value={name} onChangeText={setName} />
      <Field
        placeholder="Personality / backstory *"
        multiline
        style={[fs.input, styles.multiline]}
        value={personality}
        onChangeText={setPersonality}
      />
      <Field
        placeholder="Description (shown on card)"
        multiline
        style={[fs.input, styles.multiline]}
        value={description}
        onChangeText={setDescription}
      />
      <Toggle
        label="Starting closeness"
        options={Object.keys(CLOSENESS) as (keyof typeof CLOSENESS)[]}
        value={closeness}
        onChange={setCloseness}
      />
      <Toggle label="Gender" options={["female", "male"]} value={gender} onChange={setGender} />
      <Toggle
        label="Visibility"
        options={["private", "public"]}
        value={visibility}
        onChange={setVisibility}
      />
      {error && <Text style={fs.error}>{error}</Text>}
      <SubmitButton label="Create" busy={busy} onPress={save} />
    </ScrollView>
  );
}

function Toggle<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.toggleRow}>
        {options.map((o) => (
          <TouchableOpacity
            key={o}
            style={[styles.chip, value === o && styles.chipActive]}
            onPress={() => onChange(o)}
          >
            <Text style={value === o ? styles.chipTextActive : styles.chipText}>{o}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  multiline: { height: 110, paddingTop: 14, textAlignVertical: "top" },
  label: { fontWeight: "700", marginBottom: sp.sm, color: c.ink, fontSize: 15 },
  toggleRow: { flexDirection: "row", gap: sp.sm, flexWrap: "wrap" },
  chip: {
    paddingVertical: sp.sm,
    paddingHorizontal: sp.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  chipActive: { backgroundColor: c.accent, borderColor: c.accent },
  chipText: { color: c.muted },
  chipTextActive: { color: c.onAccent, fontWeight: "700" },
});
