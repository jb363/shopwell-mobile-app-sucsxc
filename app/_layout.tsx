
import "react-native-reanimated";
import React, { useEffect, Component, ErrorInfo, ReactNode } from "react";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from 'expo-linking';
import { SystemBars } from "react-native-edge-to-edge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme, Alert, Platform, View, Text, StyleSheet, TouchableOpacity } from "react-native";
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
import { useTrackingPermission } from "@/hooks/useTrackingPermission";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationProvider } from "@/contexts/NotificationContext";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Global error handler with crash reporting
const errorHandler = (error: Error, isFatal?: boolean) => {
  try {
    console.error('[Global Error Handler]', isFatal ? 'FATAL:' : 'ERROR:', error);
    console.error('[Global Error Handler] Stack:', error?.stack);
    console.error('[Global Error Handler] Name:', error?.name);
    console.error('[Global Error Handler] Message:', error?.message);
    
    // Log to crash reporter
    try {
      crashReporter.logCrash(error, {
        isFatal,
        location: 'globalErrorHandler',
        timestamp: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('[Global Error Handler] Error logging crash:', logError);
    }
    
    if (isFatal) {
      console.error('[Global Error Handler] ⚠️ FATAL ERROR - App may crash');
      console.error('[Global Error Handler] This crash has been logged for debugging');
    }
  } catch (handlerError) {
    console.error('[Global Error Handler] Error in error handler:', handlerError);
  }
};

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.error('[ErrorBoundary] Caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Error details:', error, errorInfo);
    try {
      crashReporter.logCrash(error, {
        location: 'ErrorBoundary',
        componentStack: errorInfo.componentStack,
      });
    } catch (logError) {
      console.error('[ErrorBoundary] Error logging crash:', logError);
    }
  }

  handleReload = () => {
    console.log('[ErrorBoundary] Reloading app...');
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.title}>Something went wrong</Text>
          <Text style={errorStyles.message}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <TouchableOpacity style={errorStyles.button} onPress={this.handleReload}>
            <Text style={errorStyles.buttonText}>Reload App</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    backgroundColor: shopWellColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const networkState = useNetworkState();
  // Trigger ATT prompt early, before any web content loads (iOS only)
  const { status: trackingStatus } = useTrackingPermission();
  console.log('[RootLayout] ATT tracking status:', trackingStatus);
  // Initialize notification handler and Android channels on every app start
  useNotifications();

  useEffect(() => {
    let isMounted = true;
    
    try {
      console.log('[RootLayout] ═══════════════════════════════════════');
      console.log('[RootLayout] APP INITIALIZATION STARTED');
      console.log('[RootLayout] ═══════════════════════════════════════');
      console.log('[RootLayout] Platform:', Platform.OS);
      console.log('[RootLayout] Platform Version:', Platform.Version);
      console.log('[RootLayout] Color scheme:', colorScheme);
      console.log('[RootLayout] Timestamp:', new Date().toISOString());
      
      // Set up global error handler
      try {
        if (typeof ErrorUtils !== 'undefined') {
          ErrorUtils.setGlobalHandler(errorHandler);
          console.log('[RootLayout] ✅ Global error handler installed');
        } else {
          console.warn('[RootLayout] ⚠️ ErrorUtils not available - error handling may be limited');
        }
      } catch (errorUtilsError) {
        console.error('[RootLayout] Error setting up ErrorUtils:', errorUtilsError);
      }
      
      // Check for previous crashes
      crashReporter.getLastCrash().then((lastCrash) => {
        if (!isMounted) return;
        
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
        if (!isMounted) return;
        
        console.log('[RootLayout] Hiding splash screen...');
        SplashScreen.hideAsync()
          .then(() => {
            if (!isMounted) return;
            
            console.log('[RootLayout] ✅ Splash screen hidden successfully');
            console.log('[RootLayout] ═══════════════════════════════════════');
            console.log('[RootLayout] APP INITIALIZATION COMPLETE');
            console.log('[RootLayout] ═══════════════════════════════════════');
          })
          .catch((error) => {
            console.error('[RootLayout] ❌ Error hiding splash screen:', error);
            try {
              crashReporter.logCrash(error, { location: 'splashScreenHide' });
            } catch (logError) {
              console.error('[RootLayout] Error logging splash screen error:', logError);
            }
          });
      }, 100);

      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    } catch (error) {
      console.error('[RootLayout] ❌ CRITICAL ERROR in initialization:', error);
      try {
        if (error instanceof Error) {
          crashReporter.logCrash(error, { location: 'rootLayoutInit' });
        }
      } catch (logError) {
        console.error('[RootLayout] Error logging initialization error:', logError);
      }
    }
  }, [colorScheme]);

  // Handle deep linking and share intents
  useEffect(() => {
    let isMounted = true;
    
    const handleDeepLink = (event: { url: string }) => {
      if (!isMounted) return;
      
      try {
        console.log('[RootLayout] Deep link received:', event?.url);
        
        if (!event?.url) {
          console.warn('[RootLayout] Deep link event has no URL');
          return;
        }
        
        const url = Linking.parse(event.url);
        console.log('[RootLayout] Parsed URL:', JSON.stringify(url, null, 2));

        // Handle share deep links (from website "Open in App" buttons or Android share intents)
        if (url.path === 'share-target' || url.hostname === 'share-target' || url.hostname === 'share' || url.path === 'share') {
          console.log('[RootLayout] Share intent detected, navigating to share-target');
          console.log('[RootLayout] Query params:', url.queryParams);
          
          try {
            // Navigate to share-target with all query params
            router.push({
              pathname: '/share-target',
              params: url.queryParams || {},
            });
          } catch (navError) {
            console.error('[RootLayout] Error navigating to share-target:', navError);
          }
        }
        // Handle other deep links
        else if (url.path) {
          console.log('[RootLayout] Navigating to path:', url.path);
          try {
            router.push(url.path as any);
          } catch (navError) {
            console.error('[RootLayout] Error navigating to path:', navError);
          }
        }
      } catch (error) {
        console.error('[RootLayout] Error handling deep link:', error);
        try {
          if (error instanceof Error) {
            crashReporter.logCrash(error, { 
              location: 'deepLinkHandler',
              url: event?.url,
            });
          }
        } catch (logError) {
          console.error('[RootLayout] Error logging deep link error:', logError);
        }
      }
    };

    // Get initial URL (app opened via deep link or share intent)
    Linking.getInitialURL().then((url) => {
      if (!isMounted) return;
      
      if (url) {
        console.log('[RootLayout] Initial URL:', url);
        handleDeepLink({ url });
      } else {
        console.log('[RootLayout] No initial URL (normal app launch)');
        
        // On Android, check if app was opened via share intent
        // Share intents don't always provide a URL, so we need to check for shared content
        if (Platform.OS === 'android') {
          console.log('[RootLayout] Checking for Android share intent...');
          // The share intent will be handled by the WebView's message handler
          // We'll navigate to share-target if we detect shared content in the home screen
        }
      }
    }).catch((error) => {
      console.error('[RootLayout] Error getting initial URL:', error);
      try {
        if (error instanceof Error) {
          crashReporter.logCrash(error, { location: 'getInitialURL' });
        }
      } catch (logError) {
        console.error('[RootLayout] Error logging initial URL error:', logError);
      }
    });

    // Listen for deep links while app is running
    let subscription: any;
    try {
      subscription = Linking.addEventListener('url', handleDeepLink);
    } catch (error) {
      console.error('[RootLayout] Error setting up deep link listener:', error);
    }

    return () => {
      isMounted = false;
      try {
        if (subscription) {
          subscription.remove();
        }
      } catch (error) {
        console.error('[RootLayout] Error removing deep link listener:', error);
      }
    };
  }, []);

  React.useEffect(() => {
    try {
      if (
        !networkState.isConnected &&
        networkState.isInternetReachable === false
      ) {
        console.log('[RootLayout] User is offline - showing offline alert');
        try {
          Alert.alert(
            "🔌 You are offline",
            "You can keep using the app! Your changes will be saved locally and synced when you are back online."
          );
        } catch (alertError) {
          console.error('[RootLayout] Error showing offline alert:', alertError);
        }
      }
    } catch (error) {
      console.error('[RootLayout] Error in network state effect:', error);
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
    <ErrorBoundary>
      <NotificationProvider>
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

              {/* Notification Preferences Screen */}
              <Stack.Screen
                name="notification-preferences"
                options={{
                  title: 'Notifications',
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
      </NotificationProvider>
    </ErrorBoundary>
  );
}
