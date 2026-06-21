import { Link } from "expo-router";
import { useState } from "react";
import { Switch, Text, View } from "react-native";

import { Field, SubmitButton, styles } from "@/components/form";
import { useAuth } from "@/lib/auth";
import { c } from "@/lib/theme";

export default function Signup() {
  const { signup } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdult, setIsAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!username.trim() || !email.trim() || !password)
      return setError("Username, email and password are required.");
    setBusy(true);
    setError(null);
    try {
      await signup(username.trim(), email.trim(), password, isAdult);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Create account</Text>
      <Text style={styles.subtitle}>Build a companion who remembers you.</Text>
      <Field placeholder="Username" autoCapitalize="none" value={username} onChangeText={setUsername} />
      <Field placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <Field placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <View style={styles.row}>
        <Switch
          value={isAdult}
          onValueChange={setIsAdult}
          trackColor={{ false: c.surfaceAlt, true: c.accent }}
          thumbColor={c.ink}
        />
        <Text style={{ color: c.muted }}>I am 18 or older</Text>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <SubmitButton label="Sign up" busy={busy} onPress={submit} />
      <Link href="/(auth)/login" style={styles.link}>
        Have an account? Log in
      </Link>
    </View>
  );
}
