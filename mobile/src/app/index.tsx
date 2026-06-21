import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/lib/auth";
import { c } from "@/lib/theme";

export default function Index() {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: c.bg }}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  return <Redirect href={user ? "/(app)/dashboard" : "/(auth)/login"} />;
}
