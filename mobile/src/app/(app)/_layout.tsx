import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="dashboard" options={{ title: "Characters" }} />
      <Stack.Screen name="create" options={{ title: "New Character", presentation: "modal" }} />
      <Stack.Screen name="chat/[id]" options={{ title: "Chat" }} />
    </Stack>
  );
}
