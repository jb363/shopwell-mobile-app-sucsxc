
import "react-native-reanimated";
import React, { useEffect } from "react";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from 'expo-linking';
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme, Alert, Platform } from "react-native";

// Type declaration for ErrorUtils (React Native global)
declare const ErrorUtils: {
  setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
} | undefined;
import { useNetworkState } from "expo-network";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { shopWellColors } from "@/constants/Colors";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Global error handler
const errorHandler = (error: Error, isFatal?: boolean) => {
  console.error('[Global Error Handler]', isFatal ? 'FATAL:' : 'ERROR:', error);
  console.error('[Global Error Handler] Stack:', error.stack);
  
  if (isFatal) {
    console.error('[Global Error Handler] Fatal error detected - app may crash');
  }
};

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const networkState = useNetworkState();

  useEffect(() => {
    console.log('[RootLayout] Initializing app...');
    console.log('[RootLayout] Platform:', Platform.OS);
    console.log('[RootLayout] Color scheme:', colorScheme);
    
    // Set up global error handler
    if (ErrorUtils) {
      ErrorUtils.setGlobalHandler(errorHandler);
      console.log('[RootLayout] Global error handler installed');
    }
    
    // Hide splash screen after a short delay to ensure everything is loaded
    const timer = setTimeout(() => {
      console.log('[RootLayout] Hiding splash screen');
      SplashScreen.hideAsync().catch((error) => {
        console.error('[RootLayout] Error hiding splash screen:', error);
      });
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Handle deep linking and share intents
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      try {
        console.log('Deep link received:', event.url);
        
        const url = Linking.parse(event.url);
        console.log('Parsed URL:', url);

        // Handle share target deep links
        if (url.path === 'share-target' || url.hostname === 'share-target') {
          console.log('Navigating to share-target with params:', url.queryParams);
          router.push({
            pathname: '/share-target',
            params: url.queryParams || {},
          });
        }
        // Handle other deep links
        else if (url.path) {
          console.log('Navigating to path:', url.path);
          router.push(url.path as any);
        }
      } catch (error) {
        console.error('Error handling deep link:', error);
      }
    };

    // Get initial URL (app opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('Initial URL:', url);
        handleDeepLink({ url });
      }
    }).catch((error) => {
      console.error('Error getting initial URL:', error);
    });

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, []);

  React.useEffect(() => {
    if (
      !networkState.isConnected &&
      networkState.isInternetReachable === false
    ) {
      console.log('User is offline - showing offline alert');
      Alert.alert(
        "🔌 You are offline",
        "You can keep using the app! Your changes will be saved locally and synced when you are back online."
      );
    }
  }, [networkState.isConnected, networkState.isInternetReachable]);

  const CustomDefaultTheme: Theme = {
    ...DefaultTheme,
    dark: false,
    colors: {
      primary: shopWellColors.primary,
      background: shopWellColors.background,
      card: "rgb(255, 255, 255)",
      text: shopWellColors.text,
      border: "rgb(216, 216, 220)",
      notification: "rgb(255, 59, 48)",
    },
  };

  const CustomDarkTheme: Theme = {
    ...DarkTheme,
    colors: {
      primary: shopWellColors.primary,
      background: "rgb(1, 1, 1)",
      card: "rgb(28, 28, 30)",
      text: "rgb(255, 255, 255)",
      border: "rgb(44, 44, 46)",
      notification: "rgb(255, 69, 58)",
    },
  };

  return (
    <>
      <StatusBar style="auto" animated />
      <ThemeProvider
        value={colorScheme === "dark" ? CustomDarkTheme : CustomDefaultTheme}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Stack>
            {/* Main app with tabs */}
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

            {/* Share Target Screen */}
            <Stack.Screen 
              name="share-target" 
              options={{ 
                headerShown: false,
                presentation: 'modal',
              }} 
            />

            {/* 404 Not Found Screen */}
            <Stack.Screen 
              name="+not-found" 
              options={{ 
                title: 'Not Found',
              }} 
            />
          </Stack>
          <SystemBars style={"auto"} />
        </GestureHandlerRootView>
      </ThemeProvider>
    </>
  );
}
