import { Text, TextInput, TextInputProps, View } from "react-native";

type Props = TextInputProps & { label: string; error?: string };

export function TextField({ label, error, ...props }: Props) {
  return (
    <View className="mb-4">
      <Text className="mb-1 text-sm font-medium text-ink">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#6B6882"
        className={`rounded-2xl bg-white px-4 py-3 text-base text-ink ${
          error ? "border border-rust" : "border border-tint"
        }`}
        {...props}
      />
      {error ? <Text className="mt-1 text-sm text-rust">{error}</Text> : null}
    </View>
  );
}