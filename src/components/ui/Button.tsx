import { Pressable, Text } from "react-native";

type Props = {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "tonal";
  disabled?: boolean;
};

export function Button({ label, onPress, variant = "primary", disabled }: Props) {
  const bg = variant === "primary" ? "bg-primary" : "bg-tint";
  const fg = variant === "primary" ? "text-white" : "text-primary-dark";
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      className={`items-center justify-center rounded-2xl px-8 py-4 ${bg} ${disabled ? "opacity-50" : ""}`}
    >
      <Text className={`text-base font-semibold ${fg}`}>{label}</Text>
    </Pressable>
  );
}