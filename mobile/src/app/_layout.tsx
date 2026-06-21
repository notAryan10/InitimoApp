import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AuthProvider, useAuth } from "@/lib/auth";
import { c } from "@/lib/theme";

// Committed dark identity — ignore system light/dark, the app is always dark.
const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: c.bg,
    card: c.bg,
    text: c.ink,
    border: c.border,
    primary: c.accent,
  },
};

function RootNav() {
  const { user } = useAuth();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style="light" />
      <AuthProvider>
        <RootNav />
      </AuthProvider>
    </ThemeProvider>
  );
}
