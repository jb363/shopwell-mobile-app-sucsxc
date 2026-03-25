
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AudioRecorder, RecordingPresets, requestRecordingPermissionsAsync } from 'expo-audio';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuickActions } from '@/hooks/useQuickActions';
import * as BiometricHandler from '@/utils/biometricHandler';
import { useShareIntent } from 'expo-share-intent';
import { useTrackingPermission } from '@/hooks/useTrackingPermission';

const NOTIF_PREFS_KEY = '@shopwell/notification_preferences';
const LOCATION_PREFS_KEY = '@shopwell/location_preferences';

// Conditional imports for native modules
let Notifications: any;
let Contacts: any;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Notifications = require('expo-notifications');
} catch (error) {
  console.warn('[iOS HomeScreen] expo-notifications not available:', error);
}

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Contacts = require('expo-contacts');
} catch (error) {
  console.warn('[iOS HomeScreen] expo-contacts not available:', error);
}

const SHOPWELL_URL = 'https://shopwell.ai';

const PROJECT_ID = 'e7626989-42f0-4892-8690-78e62394d076';

export default function HomeScreen() {
  console.log('[iOS HomeScreen] Initializing...');
  
  const webViewRef = useRef<WebView>(null);
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  const [webViewLoaded, setWebViewLoaded] = useState(false);
  const [webViewError, setWebViewError] = useState<string | null>(null);
  const [currentRecording, setCurrentRecording] = useState<AudioRecorder | null>(null);
  const webViewReady = useRef(false);
  // ATT gate: allow rendering after status resolves OR after a 3s timeout (prevents permanent blank screen)
  const [attReady, setAttReady] = useState(false);
  // Cached push token — injected into WebView once it loads
  const pendingPushToken = useRef<string | null>(null);

  const { status: trackingStatus } = useTrackingPermission();

  // Unblock WebView only once ATT status is fully resolved (never on 'undetermined')
  useEffect(() => {
    if (trackingStatus !== 'undetermined') {
      console.log('[iOS HomeScreen] ATT status resolved:', trackingStatus, '— unblocking WebView');
      setAttReady(true);
    }
  }, [trackingStatus]);

  // Initialize quick actions (app shortcuts)
  useQuickActions(webViewRef);

  // Helper: inject a postMessage into the WebView's JS context
  const injectPostMessage = useCallback((payload: object) => {
    const json = JSON.stringify(payload);
    webViewRef.current?.injectJavaScript(`
      (function() {
        try {
          window.postMessage(${json}, '*');
        } catch(e) {
          console.error('[Native Bridge] injectPostMessage error:', e);
        }
      })();
      true;
    `);
  }, []);

  // Helper: send push token to WebView (used both on load and when token arrives)
  const sendPushTokenToWebView = useCallback((token: string) => {
    console.log('[iOS HomeScreen] 📲 Injecting push token into WebView:', token);
    injectPostMessage({ type: 'PUSH_TOKEN', token, platform: 'expo' });
  }, [injectPostMessage]);

  // Set up notification listeners: foreground received + tap response
  useEffect(() => {
    if (!Notifications) return;

    console.log('[iOS HomeScreen] 🔔 Setting up notification listeners');

    // Foreground notification received — forward data to WebView
    const foregroundSub = Notifications.addNotificationReceivedListener((notification: any) => {
      console.log('[iOS HomeScreen] 📬 Foreground notification received:', notification.request.identifier);
      const content = notification.request.content;
      injectPostMessage({
        type: 'NOTIFICATION_RECEIVED',
        title: content.title,
        body: content.body,
        data: content.data,
      });
    });

    // Notification tap (app in background or foreground)
    const tapSub = Notifications.addNotificationResponseReceivedListener((response: any) => {
      console.log('[iOS HomeScreen] 👆 Notification tapped:', response.notification.request.identifier);
      const data = response.notification.request.content.data;
      const url = data?.url || data?.productUrl;
      console.log('[iOS HomeScreen] 🔗 Notification tap data:', data);
      injectPostMessage({ type: 'NOTIFICATION_TAP', url: url ?? null, data });
    });

    // Cold-start: app was killed and launched by tapping a notification
    Notifications.getLastNotificationResponseAsync()
      .then((response: any) => {
        if (!response) return;
        console.log('[iOS HomeScreen] 🚀 Cold-start notification tap detected');
        const data = response.notification.request.content.data;
        const url = data?.url || data?.productUrl;
        console.log('[iOS HomeScreen] 🔗 Cold-start notification data:', data);
        // Wait until WebView is ready before injecting
        const tryInject = () => {
          if (webViewReady.current) {
            console.log('[iOS HomeScreen] 📨 Injecting cold-start NOTIFICATION_TAP into WebView');
            injectPostMessage({ type: 'NOTIFICATION_TAP', url: url ?? null, data });
          } else {
            setTimeout(tryInject, 300);
          }
        };
        tryInject();
      })
      .catch((err: any) => {
        console.error('[iOS HomeScreen] ❌ Error checking last notification response:', err);
      });

    return () => {
      foregroundSub.remove();
      tapSub.remove();
    };
  }, [injectPostMessage]);

  // Handle share intents (URLs shared from Safari or other apps)
  const { hasShareIntent, shareIntent, resetShareIntent, error: shareIntentError } = useShareIntent({
    debug: true,
    resetOnBackground: false,
  });

  // Process incoming shared URLs
  useEffect(() => {
    if (hasShareIntent && shareIntent && webViewRef.current && webViewLoaded) {
      console.log('[iOS HomeScreen] 🔗 Share intent detected:', shareIntent);
      
      // Extract the URL from the share intent
      const sharedUrl = shareIntent.webUrl || shareIntent.text;
      
      if (sharedUrl && typeof sharedUrl === 'string') {
        console.log('[iOS HomeScreen] 📎 Processing shared URL:', sharedUrl);
        
        // Validate that it's a URL
        try {
          new URL(sharedUrl);
          
          // Navigate to share-target page with the URL as a query parameter
          const encodedUrl = encodeURIComponent(sharedUrl);
          const targetUrl = `https://shopwell.ai/share-target?productUrl=${encodedUrl}`;
          
          console.log('[iOS HomeScreen] 🌐 Navigating to share-target with product URL:', targetUrl);
          
          setTimeout(() => {
            webViewRef.current?.injectJavaScript(`
              (function() {
                try {
                  console.log('[Native Bridge] Navigating to share-target with product URL');
                  window.location.href = '${targetUrl}';
                  console.log('[Native Bridge] ✅ Navigation initiated');
                } catch (error) {
                  console.error('[Native Bridge] ❌ Error navigating:', error);
                }
              })();
              true;
            `);
            
            // Clear the share intent after processing
            console.log('[iOS HomeScreen] 🧹 Clearing share intent');
            resetShareIntent();
          }, 1000);
          
        } catch (urlError) {
          console.error('[iOS HomeScreen] ❌ Invalid URL in share intent:', urlError);
          resetShareIntent();
        }
      } else {
        console.log('[iOS HomeScreen] ⚠️ Share intent does not contain a valid URL');
        resetShareIntent();
      }
    }
    
    if (shareIntentError) {
      console.error('[iOS HomeScreen] ❌ Share intent error:', shareIntentError);
    }
  }, [hasShareIntent, shareIntent, webViewLoaded, resetShareIntent, shareIntentError]);

  // Handle shared content from params
  useEffect(() => {
    if (params.sharedContent && params.sharedType && webViewRef.current && webViewLoaded) {
      console.log('[iOS HomeScreen] 📤 Processing shared content:', params.sharedType);
      
      const sharedContentStr = Array.isArray(params.sharedContent) ? params.sharedContent[0] : params.sharedContent;
      const sharedTypeStr = Array.isArray(params.sharedType) ? params.sharedType[0] : params.sharedType;
      
      setTimeout(() => {
        try {
          // Check if the shared content is a URL
          const isUrl = sharedTypeStr === 'url' || sharedContentStr.startsWith('http://') || sharedContentStr.startsWith('https://');
          
          if (isUrl) {
            // Navigate to share-target page with the URL as productUrl query parameter
            const encodedUrl = encodeURIComponent(sharedContentStr);
            const targetUrl = `https://shopwell.ai/share-target?productUrl=${encodedUrl}`;
            
            console.log('[iOS HomeScreen] 🌐 Navigating to share-target with product URL:', targetUrl);
            
            webViewRef.current?.injectJavaScript(`
              (function() {
                try {
                  console.log('[Native Bridge] Navigating to share-target with product URL');
                  window.location.href = '${targetUrl}';
                  console.log('[Native Bridge] ✅ Navigation initiated');
                } catch (error) {
                  console.error('[Native Bridge] ❌ Error navigating:', error);
                }
              })();
              true;
            `);
          } else {
            // For non-URL content, send as a message and navigate to share-target
            const message = {
              type: 'SHARED_CONTENT',
              contentType: sharedTypeStr,
              content: sharedContentStr
            };
            
            console.log('[iOS HomeScreen] 📨 Sending shared content to WebView:', message);
            
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
          }
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
          const { granted } = await requestRecordingPermissionsAsync();
          
          if (!granted) {
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

          // Start recording
          console.log('[iOS HomeScreen] 🎙️ Starting recording...');
          const recorder = new AudioRecorder(RecordingPresets.HIGH_QUALITY);
          await recorder.prepareToRecordAsync();
          await recorder.record();
          setCurrentRecording(recorder);
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
          await currentRecording.stop();
          const uri = currentRecording.uri;
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
        
        if (!Contacts) {
          console.error('[iOS HomeScreen] ❌ Contacts module not available');
          webViewRef.current?.injectJavaScript(`
            window.postMessage(${JSON.stringify({
              type: 'CONTACT_PICKER_RESPONSE',
              success: false,
              error: 'Contacts module not available'
            })}, '*');
            true;
          `);
          return;
        }
        
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
                phoneNumbers: result.phoneNumbers?.map((p: any) => ({ number: p.number || '' })) || [],
                emails: result.emails?.map((e: any) => ({ email: e.email || '' })) || []
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
        
        if (!Notifications) {
          console.error('[iOS HomeScreen] ❌ Notifications module not available');
          webViewRef.current?.injectJavaScript(`
            window.postMessage(${JSON.stringify({
              type: 'NOTIFICATIONS_PERMISSION_RESPONSE',
              granted: false,
              status: 'unavailable',
              error: 'Notifications module not available'
            })}, '*');
            true;
          `);
          return;
        }
        
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
              console.log('[iOS HomeScreen] 📲 Getting Expo push token...');
              const tokenData = await Notifications.getExpoPushTokenAsync({
                projectId: PROJECT_ID,
                experienceId: `@${Constants.expoConfig?.owner ?? 'natively'}/${Constants.expoConfig?.slug ?? 'shopwell-mobile-app-sucsxc'}`,
              });
              const expoPushToken = tokenData.data;
              console.log('[iOS HomeScreen] ✅ Expo push token obtained:', expoPushToken);
              pendingPushToken.current = expoPushToken;
              sendPushTokenToWebView(expoPushToken);
              // Fix 1: Persist notification enabled + token
              try {
                await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify({ notificationsEnabled: true, pushToken: expoPushToken }));
                console.log('[iOS HomeScreen] 💾 Notification preferences saved (enabled)');
              } catch (storageErr) {
                console.warn('[iOS HomeScreen] ⚠️ Failed to save notification preferences:', storageErr);
              }
            } catch (tokenError) {
              console.error('[iOS HomeScreen] ❌ Error getting push token:', tokenError);
              // Still persist enabled=true even if token fetch failed
              try {
                await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify({ notificationsEnabled: true }));
              } catch (storageErr) {
                console.warn('[iOS HomeScreen] ⚠️ Failed to save notification preferences:', storageErr);
              }
            }
          } else {
            console.log('[iOS HomeScreen] ⚠️ Notification permission not granted');
            // Fix 1: Persist notification disabled
            try {
              await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify({ notificationsEnabled: false }));
              console.log('[iOS HomeScreen] 💾 Notification preferences saved (disabled)');
            } catch (storageErr) {
              console.warn('[iOS HomeScreen] ⚠️ Failed to save notification preferences:', storageErr);
            }
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

      // Fix 2: Handle location/geofencing enable
      else if (data.type === 'natively.location.enable' || data.type === 'natively.geofencing.start') {
        console.log('[iOS HomeScreen] 📍 Location/geofencing enable received:', data.type);
        try {
          await AsyncStorage.setItem(LOCATION_PREFS_KEY, JSON.stringify({ locationEnabled: true }));
          console.log('[iOS HomeScreen] 💾 Location preferences saved (enabled)');
        } catch (storageErr) {
          console.warn('[iOS HomeScreen] ⚠️ Failed to save location preferences:', storageErr);
        }
      }

      // Fix 2: Handle location/geofencing disable
      else if (data.type === 'natively.location.disable' || data.type === 'natively.geofencing.stop') {
        console.log('[iOS HomeScreen] 📍 Location/geofencing disable received:', data.type);
        try {
          await AsyncStorage.setItem(LOCATION_PREFS_KEY, JSON.stringify({ locationEnabled: false }));
          console.log('[iOS HomeScreen] 💾 Location preferences saved (disabled)');
        } catch (storageErr) {
          console.warn('[iOS HomeScreen] ⚠️ Failed to save location preferences:', storageErr);
        }
      }
      
      // Fix 4: Handle notification status check — include AsyncStorage preference
      else if (data.type === 'natively.notifications.getStatus') {
        console.log('[iOS HomeScreen] 🔔 Notification status check requested');
        
        if (!Notifications) {
          console.error('[iOS HomeScreen] ❌ Notifications module not available');
          webViewRef.current?.injectJavaScript(`
            window.postMessage(${JSON.stringify({
              type: 'NOTIFICATIONS_STATUS_RESPONSE',
              status: 'unavailable',
              error: 'Notifications module not available'
            })}, '*');
            true;
          `);
          return;
        }
        
        try {
          const { status } = await Notifications.getPermissionsAsync();
          console.log('[iOS HomeScreen] ✅ Notification status:', status);

          // Read saved preference and token from AsyncStorage
          let savedEnabled: boolean | null = null;
          let savedToken: string | null = null;
          try {
            const raw = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
            if (raw) {
              const parsed = JSON.parse(raw);
              savedEnabled = parsed.notificationsEnabled ?? null;
              savedToken = parsed.pushToken ?? null;
            }
          } catch (storageErr) {
            console.warn('[iOS HomeScreen] ⚠️ Failed to read notification preferences:', storageErr);
          }

          const enabled = savedEnabled !== null ? savedEnabled : status === 'granted';
          const token = savedToken ?? pendingPushToken.current ?? null;

          webViewRef.current?.injectJavaScript(`
            window.postMessage(${JSON.stringify({
              type: 'NOTIFICATIONS_STATUS_RESPONSE',
              status: status,
              enabled: enabled,
              token: token
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
  }, [currentRecording, sendPushTokenToWebView]);

  const trackingAllowed = trackingStatus === 'granted';

  const injectedJavaScript = `
    (function() {
      console.log('[Native Bridge] Initializing iOS bridge...');
      
      window.isNativeApp = true;
      window.nativeAppPlatform = 'ios';
      window.nativeAppReady = false;
      
      // Feature flags
      window.nativeFeatures = {
        contacts: ${!!Contacts},
        notifications: ${!!Notifications},
        sharing: true,
        biometrics: true,
        voiceRecording: true,
        quickActions: true,
        trackingAllowed: ${trackingAllowed}
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

  // Block WebView from loading until ATT permission has been determined (or 3s timeout).
  // This prevents tracking cookies from being set before the user responds.
  if (!attReady) {
    console.log('[iOS HomeScreen] ATT status undetermined — holding WebView render');
    return (
      <View style={{ flex: 1, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const thirdPartyCookiesAllowed = trackingStatus !== 'denied' && trackingStatus !== 'restricted';

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
        thirdPartyCookiesEnabled={thirdPartyCookiesAllowed}
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
          console.log('[iOS HomeScreen] ATT status dispatched to web app:', trackingStatus);
          setWebViewLoaded(true);
          webViewReady.current = true;
          webViewRef.current?.injectJavaScript(`
            window.dispatchEvent(new CustomEvent('nativeTrackingStatus', {
              detail: { status: '${trackingStatus}', allowed: ${trackingAllowed} }
            }));
            true;
          `);
          // Proactively send cached push token to WebView on every load
          if (pendingPushToken.current) {
            console.log('[iOS HomeScreen] 📲 Sending cached push token to WebView on load');
            sendPushTokenToWebView(pendingPushToken.current);
          } else if (Notifications) {
            // Try to get token if permission is already granted (no prompt)
            Notifications.getPermissionsAsync()
              .then((result: any) => {
                if (result.status !== 'granted') return;
                return Notifications.getExpoPushTokenAsync({
                  projectId: PROJECT_ID,
                  experienceId: `@${Constants.expoConfig?.owner ?? 'natively'}/${Constants.expoConfig?.slug ?? 'shopwell-mobile-app-sucsxc'}`,
                });
              })
              .then((tokenData: any) => {
                if (!tokenData) return;
                console.log('[iOS HomeScreen] 📲 Push token fetched on load:', tokenData.data);
                pendingPushToken.current = tokenData.data;
                sendPushTokenToWebView(tokenData.data);
              })
              .catch((err: any) => {
                console.warn('[iOS HomeScreen] ⚠️ Could not fetch push token on load:', err);
              });
          }
          // Fix 3: Inject saved preferences so web app can restore toggle states
          (async () => {
            try {
              const [notifRaw, locationRaw] = await Promise.all([
                AsyncStorage.getItem(NOTIF_PREFS_KEY),
                AsyncStorage.getItem(LOCATION_PREFS_KEY),
              ]);
              const savedPrefs = {
                notifications: notifRaw ? JSON.parse(notifRaw) : null,
                location: locationRaw ? JSON.parse(locationRaw) : null,
              };
              console.log('[iOS HomeScreen] 💾 Injecting saved preferences into WebView:', savedPrefs);
              webViewRef.current?.injectJavaScript(`
                window.dispatchEvent(new CustomEvent('nativePreferencesRestored', {
                  detail: ${JSON.stringify(savedPrefs)}
                }));
                true;
              `);
            } catch (err) {
              console.warn('[iOS HomeScreen] ⚠️ Failed to inject saved preferences:', err);
            }
          })();
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
