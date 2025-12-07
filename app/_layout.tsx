
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { WebViewBridgeProvider } from '@/contexts/WebViewBridgeContext';
import { WidgetProvider } from '@/contexts/WidgetContext';
import 'react-native-reanimated';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <NotificationProvider>
        <WebViewBridgeProvider>
          <WidgetProvider>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen
                name="modal"
                options={{
                  presentation: 'modal',
                  title: 'Modal',
                }}
              />
              <Stack.Screen
                name="formsheet"
                options={{
                  presentation: 'formSheet',
                  title: 'Form Sheet',
                  sheetAllowedDetents: [0.5, 1],
                }}
              />
              <Stack.Screen
                name="transparent-modal"
                options={{
                  presentation: 'transparentModal',
                  animation: 'fade',
                  headerShown: false,
                }}
              />
              <Stack.Screen
                name="create"
                options={{
                  presentation: 'modal',
                  title: 'Create',
                }}
              />
              <Stack.Screen
                name="settings"
                options={{
                  presentation: 'modal',
                  title: 'Settings',
                }}
              />
            </Stack>
          </WidgetProvider>
        </WebViewBridgeProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
