import { Text, View } from "react-native";
import { signOut } from "../api/auth";
import { useAuthStore } from "../store/authStore";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Screen } from "./ui/Screen";

const roleLabel = {
  resident: "Resident",
  vendor: "Service provider",
  system_admin: "System admin",
} as const;

export function ProfileScreen() {
  const { session, profile } = useAuthStore();
  return (
    <Screen>
      <Text className="mt-6 text-3xl font-bold text-ink">Profile</Text>
      <Card className="mt-4">
        <Text className="text-xl font-semibold text-ink">
          {profile?.full_name || "Unnamed user"}
        </Text>
        <Text className="mb-3 text-muted">{session?.user.email}</Text>
        {profile ? <Badge label={roleLabel[profile.role]} /> : null}
      </Card>
      <View className="mt-6">
        <Button label="Log out" variant="tonal" onPress={() => void signOut()} />
      </View>
    </Screen>
  );
}