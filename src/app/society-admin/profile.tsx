import { router } from 'expo-router';
import { ProfileScreen } from "../../components/ProfileScreen";
import { Button } from '../../components/ui/Button';
export default function Page() {
  <Button label="Switch to Resident View" onPress={() => router.replace('/resident/home')} />
  return <ProfileScreen />;
}