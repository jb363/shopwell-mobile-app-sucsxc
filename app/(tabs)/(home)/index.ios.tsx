
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as Contacts from 'expo-contacts';
import { Audio } from 'expo-audio';
import { useQuickActions } from '@/hooks/useQuickActions';
import * as BiometricHandler from '@/utils/biometricHandler';

const SHOPWELL_URL = 'https://shopwell.ai';

export default function HomeScreen() {
  console.log('[iOS HomeScreen] Initializing...');
  
  const webViewRef = useRef<WebView>(null);
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  const [webViewLoaded, setWebViewLoaded] = useState(false);
  const [webViewError, setWebViewError] = useState<string | null>(null);
  const [currentRecording, setCurrentRecording] = useState<Audio.Recording | null>(null);

  // Initialize quick actions (app shortcuts)
  useQuickActions(webViewRef);

  // Handle shared content from params
  useEffect(() => {
    if (params.sharedContent && params.sharedType && webViewRef.current && webViewLoaded) {
      console.log('[iOS HomeScreen] 📤 Processing shared content:', params.sharedType);
      
      const sharedContentStr = Array.isArray(params.sharedContent) ? params.sharedContent[0] : params.sharedContent;
      const sharedTypeStr = Array.isArray(params.sharedType) ? params.sharedType[0] : params.sharedType;
      
      setTimeout(() => {
        try {
          const message = {
            type: 'SHARED_CONTENT',
            contentType: sharedTypeStr,
            content: sharedContentStr
          };
          
          console.log('[iOS HomeScreen] 📨 Sending shared content to WebView:', message);
          
          // Inject the shared content and navigate to share-target page
          webViewRef.current?.injectJavaScript(`
            (function() {
              try {
                console.log('[Native Bridge] Sending SHARED_CONTENT message and navigating to share-target');
                
                // Store the shared content
                window.postMessage(${JSON.stringify(message)}, '*');
                
                // Navigate to the share-target page on shopwell.ai
                window.location.href = 'https://shopwell.ai/share-target';
                
                console.log('[Native Bridge] SHARED_CONTENT message sent and navigation initiated');
              } catch (error) {
                console.error('[Native Bridge] Error sending shared content:', error);
              }
            })();
            true;
          `);
        } catch (error) {
          console.error('[iOS HomeScreen] ❌ Error injecting shared content:', error);
        }
      }, 1500);
    }
  }, [params.sharedContent, params.sharedType, webViewLoaded]);

  const handleMessage = useCallback(async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('[iOS HomeScreen] 📩 Message received from WebView:', data.type);
      
      // Handle biometric support check
      if (data.type === 'natively.biometric.isSupported') {
        console.log('[iOS HomeScreen] 🔐 Biometric support check requested');
        
        try {
          const capabilities = await BiometricHandler.checkBiometricCapabilities();
          const biometricType = BiometricHandler.getBiometricTypeName(capabilities);
          
          console.log('[iOS HomeScreen] ✅ Biometric capabilities:', {
            isSupported: capabilities.isAvailable,
            biometricType
          });
          
          webViewRef.current?.injectJavaScript(`
            window.postMessage(${JSON.stringify({
              type: 'BIOMETRIC_SUPPORT_RESPONSE',
              isSupported: capabilities.isAvailable,
              biometricType: biometricType,
              hasHardware: capabilities.hasHardware,
              isEnrolled: capabilities.isEnrolled
            })}, '*');
            true;
          `);
        } catch (error) {
          console.error('[iOS HomeScreen] ❌ Error checking biometric support:', error);
          webViewRef.current?.injectJavaScript(`
            window.postMessage(${JSON.stringify({
              type: 'BIOMETRIC_SUPPORT_RESPONSE',
              isSupported: false,
              error: String(error)
            })}, '*');
            true;
          `);
        }
      }
      
      // Handle biometric authentication
      else if (data.type === 'natively.biometric.authenticate') {
        console.log('[iOS HomeScreen] 🔐 Biometric authentication requested');
        
        const reason = data.reason || 'Authenticate to log in to ShopWell.ai';
        
        try {
          const success = await BiometricHandler.authenticateWithBiometrics(reason);
          
          console.log('[iOS HomeScreen] Authentication result:', success ? '✅ Success' : '❌ Failed');
          
          webViewRef.current?.injectJavaScript(`
            window.postMessage(${JSON.stringify({
              type: 'BIOMETRIC_AUTH_RESPONSE',
              success: success
            })}, '*');
            true;
          `);
        } catch (error) {
          console.error('[iOS HomeScreen] ❌ Error during biometric authentication:', error);
          webViewRef.current?.injectJavaScript(`
            window.postMessage(${JSON.stringify({
              type: 'BIOMETRIC_AUTH_RESPONSE',
              success: false,
              error: String(error)
            })}, '*');
            true;
          `);
        }
      }
      
      // Handle voice recording start
      else if (data.type === 'natively.voice.startRecording') {
        console.log('[iOS HomeScreen] 🎤 Voice recording start requested');
        
        try {
          // Request permission
          const { status } = await Audio.getPermissionsAsync();
          
          if (status !== 'granted') {
            console.log('[iOS HomeScreen] 🔐 Requesting microphone permission...');
            const { status: newStatus } = await Audio.requestPermissionsAsync();
            
            if (newStatus !== 'granted') {
              console.log('[iOS HomeScreen] ❌ Microphone permission denied');
              webViewRef.current?.injectJavaScript(`
                window.postMessage(${JSON.stringify({
                  type: 'VOICE_RECORDING_ERROR',
                  error: 'Microphone permission denied'
                })}, '*');
                true;
              `);
              return;
            }
          }
          
          // Set audio mode for recording
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
          });

          // Start recording
          console.log('[iOS HomeScreen] 🎙️ Starting recording...');
          const recording = await Audio.createRecordingAsync(
            Audio.RecordingPresets.HIGH_QUALITY
          );
          
          setCurrentRecording(recording);
          console.log('[iOS HomeScreen] ✅ Recording started');
          
          webViewRef.current?.injectJavaScript(`
            window.postMessage(${JSON.stringify({
              type: 'VOICE_RECORDING_STARTED'
            })}, '*');
            true;
          `);
        } catch (error) {
          console.error('[iOS HomeScreen] ❌ Error starting recording:', error);
          webViewRef.current?.injectJavaScript(`
            window.postMessage(${JSON.stringify({
              type: 'VOICE_RECORDING_ERROR',
              error: String(error)
            })}, '*');
            true;
          `);
        }
      }
      
      // Handle voice recording stop
      else if (data.type === 'natively.voice.stopRecording') {
        console.log('[iOS HomeScreen] 🛑 Voice recording stop requested');
        
        if (!currentRecording) {
          console.log('[iOS HomeScreen] ⚠️ No active recording');
          webViewRef.current?.injectJavaScript(`
            window.postMessage(${JSON.stringify({
              type: 'VOICE_RECORDING_ERROR',
              error: 'No active recording'
            })}, '*');
            true;
          `);
          return;
        }
        
        try {
          console.log('[iOS HomeScreen] 📼 Stopping recording...');
          await currentRecording.stopAndUnloadAsync();
          const uri = currentRecording.getURI();
          setCurrentRecording(null);
          
          console.log('[iOS HomeScreen] ✅ Recording stopped, URI:', uri);
          
          if (!uri) {
            throw new Error('No recording URI');
          }
          
          // Read audio file as base64 using fetch and FileReader approach
          console.log('[iOS HomeScreen] 📖 Reading audio file...');
          
          try {
            // Use fetch to read the local file
            const response = await fetch(uri);
            const blob = await response.blob();
            
            // Convert blob to base64
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64Audio = (reader.result as string).split(',')[1];
              
              console.log('[iOS HomeScreen] 📤 Sending audio for transcription...');
              
              // Send to WebView for backend transcription
              webViewRef.current?.injectJavaScript(`
                window.postMessage(${JSON.stringify({
                  type: 'VOICE_RECORDING_COMPLETE',
                  audioData: base64Audio,
                  mimeType: 'audio/m4a'
                })}, '*');
                true;
              `);
            };
            reader.onerror = () => {
              throw new Error('Failed to read audio file');
            };
            reader.readAsDataURL(blob);
          } catch (readError) {
            console.error('[iOS HomeScreen] ❌ Error reading audio file:', readError);
            throw readError;
          }
          
        } catch (error) {
          console.error('[iOS HomeScreen] ❌ Error stopping recording:', error);
          setCurrentRecording(null);
          webViewRef.current?.injectJavaScript(`
            window.postMessage(${JSON.stringify({
              type: 'VOICE_RECORDING_ERROR',
              error: String(error)
            })}, '*');
            true;
          `);
        }
      }
      
      // Handle contact picker request
      else if (data.type === 'natively.contacts.pick') {
        console.log('[iOS HomeScreen] 📱 Contact picker requested');
        
        try {
          // Check permission
          const { status } = await Contacts.getPermissionsAsync();
          
          if (status !== 'granted') {
            console.log('[iOS HomeScreen] 🔐 Requesting contacts permission...');
            const { status: newStatus } = await Contacts.requestPermissionsAsync();
            
            if (newStatus !== 'granted') {
              console.log('[iOS HomeScreen] ❌ Contacts permission denied');
              webViewRef.current?.injectJavaScript(`
                window.postMessage(${JSON.stringify({
                  type: 'CONTACT_PICKER_RESPONSE',
                  success: false,
                  error: 'Permission denied',
                  cancelled: false
                })}, '*');
                true;
              `);
              return;
            }
          }
          
          // Open contact picker
          if (Contacts.presentContactPickerAsync) {
            console.log('[iOS HomeScreen] 🎯 Opening native contact picker...');
            const result = await Contacts.presentContactPickerAsync();
            
            if (result && result.id) {
              const contact = {
                name: result.name || `${result.firstName || ''} ${result.lastName || ''}`.trim() || 'Unknown',
                phoneNumbers: result.phoneNumbers?.map(p => ({ number: p.number || '' })) || [],
                emails: result.emails?.map(e => ({ email: e.email || '' })) || []
              };
              
              console.log('[iOS HomeScreen] ✅ Contact selected:', contact.name);
              
              webViewRef.current?.injectJavaScript(`
                window.postMessage(${JSON.stringify({
                  type: 'CONTACT_PICKER_RESPONSE',
                  success: true,
                  contact: contact
                })}, '*');
                true;
              `);
            } else {
              console.log('[iOS HomeScreen] ⏸️ Contact picker cancelled');
              webViewRef.current?.injectJavaScript(`
                window.postMessage(${JSON.stringify({
                  type: 'CONTACT_PICKER_RESPONSE',
                  success: false,
                  cancelled: true
                })}, '*');
                true;
              `);
            }
          } else {
            console.error('[iOS HomeScreen] ❌ Contact picker not available');
            webViewRef.current?.injectJavaScript(`
              window.postMessage(${JSON.stringify({
                type: 'CONTACT_PICKER_RESPONSE',
                success: false,
                error: 'Contact picker not available'
              })}, '*');
              true;
            `);
          }
        } catch (error) {
          console.error('[iOS HomeScreen] ❌ Error picking contact:', error);
          webViewRef.current?.injectJavaScript(`
            window.postMessage(${JSON.stringify({
              type: 'CONTACT_PICKER_RESPONSE',
              success: false,
              error: String(error)
            })}, '*');
            true;
          `);
        }
      }
      
      // Handle notification permission request
      else if (data.type === 'natively.notifications.requestPermission') {
        console.log('[iOS HomeScreen] 🔔 Notification permission requested');
        
        try {
          // Check current status
          const { status: currentStatus } = await Notifications.getPermissionsAsync();
          console.log('[iOS HomeScreen] Current notification status:', currentStatus);
          
          let finalStatus = currentStatus;
          
          // Request if not granted
          if (currentStatus !== 'granted') {
            console.log('[iOS HomeScreen] 📱 Requesting notification permission...');
            const { status: newStatus } = await Notifications.requestPermissionsAsync();
            finalStatus = newStatus;
            console.log('[iOS HomeScreen] Permission result:', newStatus);
          }
          
          const granted = finalStatus === 'granted';
          
          // Send permission response
          webViewRef.current?.injectJavaScript(`
            window.postMessage(${JSON.stringify({
              type: 'NOTIFICATIONS_PERMISSION_RESPONSE',
              granted: granted,
              status: finalStatus
            })}, '*');
            true;
          `);
          
          // Get push token if granted
          if (granted) {
            try {
              console.log('[iOS HomeScreen] 📲 Getting push token...');
              const tokenData = await Notifications.getExpoPushTokenAsync();
              console.log('[iOS HomeScreen] ✅ Push token obtained:', tokenData.data);
              
              webViewRef.current?.injectJavaScript(`
                window.postMessage(${JSON.stringify({
                  type: 'PUSH_TOKEN',
                  token: tokenData.data
                })}, '*');
                true;
              `);
            } catch (tokenError) {
              console.error('[iOS HomeScreen] ❌ Error getting push token:', tokenError);
            }
          } else {
            console.log('[iOS HomeScreen] ⚠️ Notification permission not granted');
          }
        } catch (error) {
          console.error('[iOS HomeScreen] ❌ Error requesting notification permission:', error);
          webViewRef.current?.injectJavaScript(`
            window.postMessage(${JSON.stringify({
              type: 'NOTIFICATIONS_PERMISSION_RESPONSE',
              granted: false,
              status: 'denied',
              error: String(error)
            })}, '*');
            true;
          `);
        }
      }
      
      // Handle notification status check
      else if (data.type === 'natively.notifications.getStatus') {
        console.log('[iOS HomeScreen] 🔔 Notification status check requested');
        
        try {
          const { status } = await Notifications.getPermissionsAsync();
          console.log('[iOS HomeScreen] ✅ Notification status:', status);
          
          webViewRef.current?.injectJavaScript(`
            window.postMessage(${JSON.stringify({
              type: 'NOTIFICATIONS_STATUS_RESPONSE',
              status: status
            })}, '*');
            true;
          `);
        } catch (error) {
          console.error('[iOS HomeScreen] ❌ Error getting notification status:', error);
          webViewRef.current?.injectJavaScript(`
            window.postMessage(${JSON.stringify({
              type: 'NOTIFICATIONS_STATUS_RESPONSE',
              status: 'undetermined',
              error: String(error)
            })}, '*');
            true;
          `);
        }
      }
      
    } catch (error) {
      console.error('[iOS HomeScreen] ❌ Error handling message:', error);
    }
  }, [currentRecording]);

  const injectedJavaScript = `
    (function() {
      console.log('[Native Bridge] Initializing iOS bridge...');
      
      window.isNativeApp = true;
      window.nativeAppPlatform = 'ios';
      window.nativeAppReady = false;
      
      // Feature flags
      window.nativeFeatures = {
        contacts: true,
        notifications: true,
        sharing: true,
        biometrics: true,
        voiceRecording: true,
        quickActions: true
      };
      
      // Signal that we're ready
      setTimeout(function() {
        window.nativeAppReady = true;
        window.postMessage({ 
          type: 'NATIVE_APP_READY',
          platform: 'ios',
          features: window.nativeFeatures,
          timestamp: Date.now()
        }, '*');
        console.log('[Native Bridge] ✅ iOS bridge ready');
      }, 100);
      
    })();
    true;
  `;

  if (webViewError) {
    return (
      <View style={[styles.errorContainer, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorTitle}>Unable to Load ShopWell.ai</Text>
        <Text style={styles.errorMessage}>{webViewError}</Text>
        <Text style={styles.errorDetails}>Please check your internet connection and try again.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <WebView
        ref={webViewRef}
        source={{ uri: SHOPWELL_URL }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        pullToRefreshEnabled={true}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        injectedJavaScript={injectedJavaScript}
        cacheEnabled={true}
        cacheMode="LOAD_DEFAULT"
        incognito={false}
        setSupportMultipleWindows={false}
        allowsBackForwardNavigationGestures={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        onLoadStart={() => {
          console.log('[iOS HomeScreen] 🔄 Loading started');
          setWebViewLoaded(false);
          setWebViewError(null);
        }}
        onLoadEnd={() => {
          console.log('[iOS HomeScreen] ✅ Loading complete');
          setWebViewLoaded(true);
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('[iOS HomeScreen] ❌ WebView error:', nativeEvent);
          setWebViewError(`Error loading website: ${nativeEvent.description || 'Unknown error'}`);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('[iOS HomeScreen] ❌ HTTP error:', nativeEvent.statusCode);
          setWebViewError(`HTTP Error ${nativeEvent.statusCode}: Unable to load ShopWell.ai`);
        }}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading ShopWell.ai...</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDetails: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
  },
});
</write file>

<write file="hooks/useNotifications.ts">
import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';

// Configure notification handler for ALL notification scenarios
// This MUST be set at module level (outside component) for iOS to work properly
// CRITICAL: This ensures notifications appear in the iOS system tray even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('[NotificationHandler] Handling notification:', notification.request.identifier);
    console.log('[NotificationHandler] Content:', notification.request.content);
    
    return {
      shouldShowAlert: true,      // Show banner/alert in system tray
      shouldPlaySound: true,       // Play notification sound
      shouldSetBadge: true,        // Update app badge count
    };
  },
});

// Handle notification data and deep linking
function handleNotificationData(data: any) {
  console.log('[useNotifications] Handling notification data:', data);
  
  if (!data) return;

  // Handle geofence notifications
  if (data.type === 'geofence') {
    console.log('[useNotifications] Geofence notification:', data.storeName);
    
    if (data.listId) {
      console.log('[useNotifications] Navigating to list:', data.listId);
    } else if (data.reservationNumber) {
      console.log('[useNotifications] Navigating to reservation:', data.reservationNumber);
    }
  }
  
  // Handle other notification types
  if (data.url) {
    console.log('[useNotifications] Opening URL from notification:', data.url);
    // You can navigate to specific screens based on notification data
  }
}

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string>();
  const [notification, setNotification] = useState<Notifications.Notification>();
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    let isMounted = true;
    
    // Only run on native platforms
    if (Platform.OS === 'web') {
      console.log('[useNotifications] Notifications are not supported on web');
      return;
    }

    console.log('[useNotifications] 🔔 Initializing notification system...');
    
    // Check existing permissions and get token if already granted
    const checkPermissions = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!isMounted) return;
        
        const { status } = await Notifications.getPermissionsAsync();
        console.log('[useNotifications] Current permission status:', status);
        setPermissionStatus(status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined');
        
        if (status === 'granted') {
          console.log('[useNotifications] ✅ Already have notification permission, getting token');
          try {
            const tokenData = await Notifications.getExpoPushTokenAsync({
              projectId: 'e7626989-42f0-4892-8690-78e62394d076',
            });
            if (isMounted) {
              setExpoPushToken(tokenData.data);
              console.log('[useNotifications] 📲 Push token:', tokenData.data);
            }
          } catch (tokenError) {
            console.error('[useNotifications] ❌ Error getting push token:', tokenError);
          }
        } else {
          console.log('[useNotifications] ⏳ No notification permission yet - will request when user enables notifications');
        }
      } catch (error) {
        console.error('[useNotifications] ❌ Error checking notification permissions:', error);
      }
    };

    checkPermissions();

    // Check for notification that opened the app
    const checkLastNotification = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 700));
        
        if (!isMounted) return;
        
        const response = await Notifications.getLastNotificationResponseAsync();
        if (response) {
          console.log('[useNotifications] 🚀 App opened from notification:', response);
          const data = response.notification.request.content.data;
          handleNotificationData(data);
        }
      } catch (error) {
        console.error('[useNotifications] ❌ Error checking last notification:', error);
      }
    };

    checkLastNotification();

    // Set up notification listeners
    setTimeout(() => {
      if (!isMounted) return;
      
      try {
        // Listen for notifications received while app is in foreground
        // CRITICAL: This ensures notifications appear in system tray even when app is open
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
          console.log('[useNotifications] 📬 Notification received in foreground:', notification);
          console.log('[useNotifications] ✅ Notification will appear in system tray due to handler configuration');
          if (isMounted) {
            setNotification(notification);
          }
        });

        // Listen for user tapping on notifications
        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
          console.log('[useNotifications] 👆 User tapped notification:', response);
          const data = response.notification.request.content.data;
          handleNotificationData(data);
        });
        
        console.log('[useNotifications] ✅ Notification listeners registered');
      } catch (error) {
        console.error('[useNotifications] ❌ Error setting up notification listeners:', error);
      }
    }, 800);

    return () => {
      isMounted = false;
      try {
        notificationListener.current?.remove();
        responseListener.current?.remove();
        console.log('[useNotifications] 🧹 Notification listeners cleaned up');
      } catch (error) {
        console.error('[useNotifications] ❌ Error removing notification listeners:', error);
      }
    };
  }, []);

  const schedulePushNotification = async () => {
    if (Platform.OS === 'web') {
      console.warn('[useNotifications] Push notifications not supported on web');
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "ShopWell.ai Notification! 📬",
          body: 'Here is the notification body',
          data: { data: 'goes here' },
        },
        trigger: { seconds: 1 },
      });
      console.log('[useNotifications] ✅ Notification scheduled');
    } catch (error) {
      console.error('[useNotifications] ❌ Error scheduling notification:', error);
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      console.log('[useNotifications] Push notifications not available on web');
      return false;
    }

    try {
      console.log('[useNotifications] 🔔 Requesting notification permissions from user');
      
      // Check current status first
      const { status: currentStatus } = await Notifications.getPermissionsAsync();
      console.log('[useNotifications] Current status before request:', currentStatus);
      
      // If already granted, just get the token
      if (currentStatus === 'granted') {
        console.log('[useNotifications] ✅ Permission already granted, getting token');
        try {
          const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: 'e7626989-42f0-4892-8690-78e62394d076',
          });
          setExpoPushToken(tokenData.data);
          console.log('[useNotifications] 📲 Push token:', tokenData.data);
        } catch (tokenError) {
          console.error('[useNotifications] ❌ Error getting push token:', tokenError);
        }
        return true;
      }
      
      // If previously denied, inform user they need to enable in settings
      if (currentStatus === 'denied') {
        console.log('[useNotifications] ⚠️ Permission previously denied');
        Alert.alert(
          'Notifications Disabled',
          'Notifications are currently disabled. Please enable them in your device settings to receive alerts.',
          [{ text: 'OK' }]
        );
        return false;
      }
      
      // Request permission
      console.log('[useNotifications] 📱 Showing permission dialog...');
      const { status } = await Notifications.requestPermissionsAsync();
      console.log('[useNotifications] Permission result:', status);
      
      const granted = status === 'granted';
      setPermissionStatus(granted ? 'granted' : 'denied');
      
      if (granted) {
        console.log('[useNotifications] ✅ Permission granted, getting token');
        try {
          const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: 'e7626989-42f0-4892-8690-78e62394d076',
          });
          setExpoPushToken(tokenData.data);
          console.log('[useNotifications] 📲 Push token:', tokenData.data);
        } catch (tokenError) {
          console.error('[useNotifications] ❌ Error getting push token:', tokenError);
        }
        return true;
      } else {
        console.warn('[useNotifications] ❌ Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('[useNotifications] ❌ Error requesting permissions:', error);
      return false;
    }
  };

  return { 
    schedulePushNotification, 
    expoPushToken, 
    notification,
    permissionStatus,
    requestPermissions
  };
}

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') {
    console.log('[registerForPushNotifications] Push notifications not available on web');
    return undefined;
  }

  try {
    let token;
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      console.log('[registerForPushNotifications] Requesting notification permissions from user');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('[registerForPushNotifications] Failed to get push token for push notification!');
      return;
    }
    
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: 'e7626989-42f0-4892-8690-78e62394d076',
    })).data;
    console.log('[registerForPushNotifications] Expo push token:', token);
    
    return token;
  } catch (error) {
    console.error('[registerForPushNotifications] Error:', error);
    return undefined;
  }
}

// Android notification channel setup
if (Platform.OS === 'android') {
  try {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      showBadge: true,
      enableVibrate: true,
      enableLights: true,
    });
    
    // Create a channel for location-based notifications
    Notifications.setNotificationChannelAsync('location', {
      name: 'Location Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#007aff',
      description: 'Notifications when you are near stores with active lists',
      showBadge: true,
      enableVibrate: true,
      enableLights: true,
    });
    
    console.log('[useNotifications] ✅ Android notification channels configured');
  } catch (error) {
    console.error('[useNotifications] ❌ Error setting up Android notification channels:', error);
  }
}
</write file>

<write file="targets/ShareExtension/Info.plist">
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDisplayName</key>
	<string>ShopWell.ai</string>
	<key>CFBundleName</key>
	<string>ShareExtension</string>
	<key>CFBundleShortVersionString</key>
	<string>1.0.23</string>
	<key>CFBundleVersion</key>
	<string>1.0.20</string>
	<key>CFBundlePackageType</key>
	<string>XPC!</string>
	<key>NSExtension</key>
	<dict>
		<key>NSExtensionAttributes</key>
		<dict>
			<key>NSExtensionActivationRule</key>
			<dict>
				<key>NSExtensionActivationSupportsWebURLWithMaxCount</key>
				<integer>10</integer>
				<key>NSExtensionActivationSupportsText</key>
				<true/>
				<key>NSExtensionActivationSupportsImageWithMaxCount</key>
				<integer>10</integer>
				<key>NSExtensionActivationSupportsWebPageWithMaxCount</key>
				<integer>10</integer>
				<key>NSExtensionActivationSupportsFileWithMaxCount</key>
				<integer>10</integer>
			</dict>
		</dict>
		<key>NSExtensionPointIdentifier</key>
		<string>com.apple.share-services</string>
		<key>NSExtensionPrincipalClass</key>
		<string>$(PRODUCT_MODULE_NAME).ShareViewController</string>
		<key>NSExtensionMainStoryboard</key>
		<string>MainInterface</string>
	</dict>
</dict>
</plist>
