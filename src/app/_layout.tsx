import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import "../../global.css";
import { useAuthBootstrap } from "../hooks/useAuthBootstrap";
import { useAuthGuard } from "../hooks/useAuthGuard";
import { useAuthStore } from "../store/authStore";

function RootNavigator() {
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

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <RootNavigator />
    </QueryClientProvider>
  );
}