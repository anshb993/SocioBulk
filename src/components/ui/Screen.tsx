import { ReactNode } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="w-full max-w-[480px] flex-1 self-center px-4">
        {children}
      </View>
    </SafeAreaView>
  );
}