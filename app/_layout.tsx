
import { Stack } from 'expo-router';
import { WebViewBridgeProvider } from '@/contexts/WebViewBridgeContext';
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <WebViewBridgeProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </WebViewBridgeProvider>
    </AuthProvider>
  );
}
