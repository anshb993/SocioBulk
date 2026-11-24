import { Text } from "react-native";
import { Screen } from "./Screen";

export function PlaceholderScreen({ title }: { title: string }) {
  return (
    <Screen>
      <Text className="mt-6 text-3xl font-bold text-ink">{title}</Text>
      <Text className="mt-2 text-muted">This screen is built in a later phase.</Text>
    </Screen>
  );
}