import { Link } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { Field, SubmitButton, styles } from "@/components/form";
import { useAuth } from "@/lib/auth";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email.trim() || !password) return setError("Email and password are required.");
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Welcome back</Text>
      <Field placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <Field placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      {error && <Text style={styles.error}>{error}</Text>}
      <SubmitButton label="Log in" busy={busy} onPress={submit} />
      <Link href="/(auth)/signup" style={styles.link}>
        No account? Sign up
      </Link>
    </View>
  );
}
