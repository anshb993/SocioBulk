import { Text, View } from "react-native";
import { ParticipantRing } from "../../components/campaign/ParticipantRing";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Screen } from "../../components/ui/Screen";

export default function Home() {
  return (
    <Screen>
      <Text className="mt-6 text-3xl font-bold text-ink">Campaigns</Text>
      <Card className="mt-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-lg font-semibold text-ink">AC Servicing</Text>
            <Text className="text-muted">CoolCare Services</Text>
          </View>
          <Badge label="3 days left" tone="rust" />
        </View>
        <View className="mt-4 flex-row items-center">
          <ParticipantRing joined={18} max={30} />
          <View className="ml-4 flex-1">
            <Text className="text-2xl font-bold text-primary-dark">₹650</Text>
            <Text className="font-semibold text-gold">Save ₹100 each</Text>
          </View>
        </View>
        <View className="mt-4">
          <Button label="Join group" />
        </View>
      </Card>
    </Screen>
  );
}