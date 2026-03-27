
import { Redirect } from 'expo-router';
import { NotificationBell } from "@/components/NotificationBell";

export default function Index() {
  return <Redirect href="/(tabs)/(home)/" />;
}
