import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import "../../global.css";
import { useAuthBootstrap } from "../hooks/useAuthBootstrap";
import { useAuthGuard } from "../hooks/useAuthGuard";
import { useAuthStore } from "../store/authStore";

export default function RootLayout() {
  useAuthBootstrap();
  useAuthGuard();
  const initialized = useAuthStore((s) => s.initialized);

  if (!initialized) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#4F46C8" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}