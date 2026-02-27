
import "react-native-reanimated";
import React, { useEffect } from "react";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from 'expo-linking';
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme, Alert, Platform } from "react-native";
import { useNetworkState } from "expo-network";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { shopWellColors } from "@/constants/Colors";
import { crashReporter } from "@/utils/crashReporter";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Global error handler with crash reporting
const errorHandler = (error: Error, isFatal?: boolean) => {
  console.error('[Global Error Handler]', isFatal ? 'FATAL:' : 'ERROR:', error);
  console.error('[Global Error Handler] Stack:', error.stack);
  console.error('[Global Error Handler] Name:', error.name);
  console.error('[Global Error Handler] Message:', error.message);
  
  // Log to crash reporter
  crashReporter.logCrash(error, {
    isFatal,
    location: 'globalErrorHandler',
    timestamp: new Date().toISOString(),
  });
  
  if (isFatal) {
    console.error('[Global Error Handler] ⚠️ FATAL ERROR - App may crash');
    console.error('[Global Error Handler] This crash has been logged for debugging');
  }
};

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const networkState = useNetworkState();

  useEffect(() => {
    console.log('[RootLayout] ═══════════════════════════════════════');
    console.log('[RootLayout] APP INITIALIZATION STARTED');
    console.log('[RootLayout] ═══════════════════════════════════════');
    console.log('[RootLayout] Platform:', Platform.OS);
    console.log('[RootLayout] Platform Version:', Platform.Version);
    console.log('[RootLayout] Color scheme:', colorScheme);
    console.log('[RootLayout] Timestamp:', new Date().toISOString());
    
    // Set up global error handler
    if (typeof ErrorUtils !== 'undefined') {
      ErrorUtils.setGlobalHandler(errorHandler);
      console.log('[RootLayout] ✅ Global error handler installed');
    } else {
      console.warn('[RootLayout] ⚠️ ErrorUtils not available - error handling may be limited');
    }
    
    // Check for previous crashes
    crashReporter.getLastCrash().then((lastCrash) => {
      if (lastCrash) {
        console.log('[RootLayout] ⚠️ Previous crash detected:');
        console.log('[RootLayout] Crash time:', lastCrash.timestamp);
        console.log('[RootLayout] Error:', lastCrash.error.message);
        console.log('[RootLayout] Device:', lastCrash.deviceInfo.modelName, lastCrash.deviceInfo.osVersion);
      } else {
        console.log('[RootLayout] ✅ No previous crashes detected');
      }
    }).catch((error) => {
      console.error('[RootLayout] Error checking for previous crashes:', error);
    });
    
    // Hide splash screen after a short delay to ensure everything is loaded
    const timer = setTimeout(() => {
      console.log('[RootLayout] Hiding splash screen...');
      SplashScreen.hideAsync()
        .then(() => {
          console.log('[RootLayout] ✅ Splash screen hidden successfully');
          console.log('[RootLayout] ═══════════════════════════════════════');
          console.log('[RootLayout] APP INITIALIZATION COMPLETE');
          console.log('[RootLayout] ═══════════════════════════════════════');
        })
        .catch((error) => {
          console.error('[RootLayout] ❌ Error hiding splash screen:', error);
          crashReporter.logCrash(error, { location: 'splashScreenHide' });
        });
    }, 100);

    return () => clearTimeout(timer);
  }, [colorScheme]);

  // Handle deep linking and share intents
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      try {
        console.log('[RootLayout] Deep link received:', event.url);
        
        const url = Linking.parse(event.url);
        console.log('[RootLayout] Parsed URL:', JSON.stringify(url, null, 2));

        // Handle share target deep links
        if (url.path === 'share-target' || url.hostname === 'share-target') {
          console.log('[RootLayout] Navigating to share-target with params:', url.queryParams);
          router.push({
            pathname: '/share-target',
            params: url.queryParams || {},
          });
        }
        // Handle other deep links
        else if (url.path) {
          console.log('[RootLayout] Navigating to path:', url.path);
          router.push(url.path as any);
        }
      } catch (error) {
        console.error('[RootLayout] Error handling deep link:', error);
        if (error instanceof Error) {
          crashReporter.logCrash(error, { 
            location: 'deepLinkHandler',
            url: event.url,
          });
        }
      }
    };

    // Get initial URL (app opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('[RootLayout] Initial URL:', url);
        handleDeepLink({ url });
      } else {
        console.log('[RootLayout] No initial URL (normal app launch)');
      }
    }).catch((error) => {
      console.error('[RootLayout] Error getting initial URL:', error);
      if (error instanceof Error) {
        crashReporter.logCrash(error, { location: 'getInitialURL' });
      }
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
      console.log('[RootLayout] User is offline - showing offline alert');
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

            {/* Crash Diagnostics Screen */}
            <Stack.Screen 
              name="crash-diagnostics" 
              options={{ 
                title: 'Crash Diagnostics',
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
