import { Text, View } from "react-native";

const tones = {
  tint: ["bg-tint", "text-primary-dark"],
  rust: ["bg-rust-soft", "text-rust"],
  gold: ["bg-gold-soft", "text-gold"],
} as const;

export function Badge({ label, tone = "tint" }: { label: string; tone?: keyof typeof tones }) {
  const [bg, fg] = tones[tone];
  return (
    <View className={`self-start rounded-xl px-3 py-1 ${bg}`}>
      <Text className={`text-xs font-semibold ${fg}`}>{label}</Text>
    </View>
  );
}