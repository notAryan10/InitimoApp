import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Field, SubmitButton, styles as fs } from "@/components/form";
import { api } from "@/lib/api";

export default function Create() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [personality, setPersonality] = useState("");
  const [description, setDescription] = useState("");
  const [gender, setGender] = useState<"female" | "male">("female");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim() || !personality.trim())
      return setError("Name and personality are required.");
    setBusy(true);
    setError(null);
    try {
      await api("/api/character/create", {
        body: { name: name.trim(), personality, description, gender, visibility },
      });
      router.back();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
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
  multiline: { height: 100, textAlignVertical: "top" },
  label: { fontWeight: "600", marginBottom: 6 },
  toggleRow: { flexDirection: "row", gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20, borderWidth: 1, borderColor: "#ccc" },
  chipActive: { backgroundColor: "#7c3aed", borderColor: "#7c3aed" },
  chipText: { color: "#444" },
  chipTextActive: { color: "#fff", fontWeight: "600" },
});
