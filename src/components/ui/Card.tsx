import { ReactNode } from "react";
import { View } from "react-native";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <View className={`rounded-3xl bg-white p-4 shadow-sm ${className}`}>{children}</View>;
}