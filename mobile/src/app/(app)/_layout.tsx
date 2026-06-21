import { Stack } from "expo-router";

import { c } from "@/lib/theme";

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.bg },
        headerTintColor: c.ink,
        headerTitleStyle: { fontWeight: "700" },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: c.bg },
      }}
    >
      <Stack.Screen name="dashboard" options={{ title: "Your characters" }} />
      <Stack.Screen name="create" options={{ title: "New character", presentation: "modal" }} />
      <Stack.Screen name="chat/[id]" options={{ title: "Chat" }} />
    </Stack>
  );
}
