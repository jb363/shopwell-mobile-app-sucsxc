
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, Platform } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Audio } from 'expo-audio';
import { useQuickActions } from '@/hooks/useQuickActions';
import * as BiometricHandler from '@/utils/biometricHandler';
import { useShareIntent } from 'expo-share-intent';

// Conditional imports for native modules
let Notifications: any;
let Contacts: any;

try {
  Notifications = require('expo-notifications');
} catch (error) {
  console.warn('[Android HomeScreen] expo-notifications not available:', error);
}

try {
  Contacts = require('expo-contacts');
} catch (error) {
  console.warn('[Android HomeScreen] expo-contacts not available:', error);
}

const SHOPWELL_URL = 'https://shopwell.ai';

export default function HomeScreen() {
  console.log('[Android HomeScreen] Initializing...');
  
  const webViewRef = useRef<WebView>(null);
  const params = useLocalSearchParams();
  
  const [webViewLoaded, setWebViewLoaded] = useState(false);
  const [webViewError, setWebViewError] = useState<string | null>(null);
  const [currentRecording, setCurrentRecording] = useState<Audio.Recording | null>(null);

  // Initialize quick actions (app shortcuts)
  useQuickActions(webViewRef);

  // Handle share intents (URLs shared from other apps)
  const { hasShareIntent, shareIntent, resetShareIntent, error: shareIntentError } = useShareIntent({
    debug: true,
    resetOnBackground: false,
  });

  // Process incoming shared URLs
  useEffect(() => {
    if (hasShareIntent && shareIntent && webViewRef.current && webViewLoaded) {
      console.log('[Android HomeScreen] 🔗 Share intent detected:', shareIntent);
      
      // Extract the URL from the share intent
      const sharedUrl = shareIntent.webUrl || shareIntent.text;
      
      if (sharedUrl && typeof sharedUrl === 'string') {
        console.log('[Android HomeScreen] 📎 Processing shared URL:', sharedUrl);
        
        // Validate that it's a URL
        try {
          new URL(sharedUrl);
          
          // Navigate to share-target page with the URL as a query parameter
          const encodedUrl = encodeURIComponent(sharedUrl);
          const targetUrl = `https://shopwell.ai/share-target?productUrl=${encodedUrl}`;
          
          console.log('[Android HomeScreen] 🌐 Navigating to share-target with product URL:', targetUrl);
          
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
            console.log('[Android HomeScreen] 🧹 Clearing share intent');
            resetShareIntent();
          }, 1000);
          
        } catch (urlError) {
          console.error('[Android HomeScreen] ❌ Invalid URL in share intent:', urlError);
          resetShareIntent();
        }
      } else {
        console.log('[Android HomeScreen] ⚠️ Share intent does not contain a valid URL');
        resetShareIntent();
      }
    }
    
    if (shareIntentError) {
      console.error('[Android HomeScreen] ❌ Share intent error:', shareIntentError);
    }
  }, [hasShareIntent, shareIntent, webViewLoaded, resetShareIntent, shareIntentError]);

  // Handle shared content from params
  useEffect(() => {
    if (params.sharedContent && params.sharedType && webViewRef.current && webViewLoaded) {
      console.log('[Android HomeScreen] 📤 Processing shared content:', params.sharedType);
      
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
            
            console.log('[Android HomeScreen] 🌐 Navigating to share-target with product URL:', targetUrl);
            
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
            
            console.log('[Android HomeScreen] 📨 Sending shared content to WebView:', message);
            
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
          console.error('[Android HomeScreen] ❌ Error injecting shared content:', error);
        }
      }, 1500);
    }
  }, [params.sharedContent, params.sharedType, webViewLoaded]);

  const handleMessage = useCallback(async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('[Android HomeScreen] 📩 Message received from WebView:', data.type);
      
      // Handle biometric support check
      if (data.type === 'natively.biometric.isSupported') {
        console.log('[Android HomeScreen] 🔐 Biometric support check requested');
        
        try {
          const capabilities = await BiometricHandler.checkBiometricCapabilities();
          const biometricType = BiometricHandler.getBiometricTypeName(capabilities);
          
          console.log('[Android HomeScreen] ✅ Biometric capabilities:', {
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
          console.error('[Android HomeScreen] ❌ Error checking biometric support:', error);
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
        console.log('[Android HomeScreen] 🔐 Biometric authentication requested');
        
        const reason = data.reason || 'Authenticate to log in to ShopWell.ai';
        
        try {
          const success = await BiometricHandler.authenticateWithBiometrics(reason);
          
          console.log('[Android HomeScreen] Authentication result:', success ? '✅ Success' : '❌ Failed');
          
          webViewRef.current?.injectJavaScript(`
            window.postMessage(${JSON.stringify({
              type: 'BIOMETRIC_AUTH_RESPONSE',
              success: success
            })}, '*');
            true;
          `);
        } catch (error) {
          console.error('[Android HomeScreen] ❌ Error during biometric authentication:', error);
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
        console.log('[Android HomeScreen] 🎤 Voice recording start requested');
        
        try {
          // Request permission
          const { status } = await Audio.getPermissionsAsync();
          
          if (status !== 'granted') {
            console.log('[Android HomeScreen] 🔐 Requesting microphone permission...');
            const { status: newStatus } = await Audio.requestPermissionsAsync();
            
            if (newStatus !== 'granted') {
              console.log('[Android HomeScreen] ❌ Microphone permission denied');
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
          console.log('[Android HomeScreen] 🎙️ Starting recording...');
          const recording = await Audio.createRecordingAsync(
            Audio.RecordingPresets.HIGH_QUALITY
          );
          
          setCurrentRecording(recording);
          console.log('[Android HomeScreen] ✅ Recording started');
          
          webViewRef.current?.injectJavaScript(`
            window.postMessage(${JSON.stringify({
              type: 'VOICE_RECORDING_STARTED'
            })}, '*');
            true;
          `);
        } catch (error) {
          console.error('[Android HomeScreen] ❌ Error starting recording:', error);
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
        console.log('[Android HomeScreen] 🛑 Voice recording stop requested');
        
        if (!currentRecording) {
          console.log('[Android HomeScreen] ⚠️ No active recording');
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
          console.log('[Android HomeScreen] 📼 Stopping recording...');
          await currentRecording.stopAndUnloadAsync();
          const uri = currentRecording.getURI();
          setCurrentRecording(null);
          
          console.log('[Android HomeScreen] ✅ Recording stopped, URI:', uri);
          
          if (!uri) {
            throw new Error('No recording URI');
          }
          
          // Read audio file as base64 using fetch and FileReader approach
          console.log('[Android HomeScreen] 📖 Reading audio file...');
          
          try {
            // Use fetch to read the local file
            const response = await fetch(uri);
            const blob = await response.blob();
            
            // Convert blob to base64
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64Audio = (reader.result as string).split(',')[1];
              
              console.log('[Android HomeScreen] 📤 Sending audio for transcription...');
              
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
            console.error('[Android HomeScreen] ❌ Error reading audio file:', readError);
            throw readError;
          }
          
        } catch (error) {
          console.error('[Android HomeScreen] ❌ Error stopping recording:', error);
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
        console.log('[Android HomeScreen] 📱 Contact picker requested');
        
        if (!Contacts) {
          console.error('[Android HomeScreen] ❌ Contacts module not available');
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
            console.log('[Android HomeScreen] 🔐 Requesting contacts permission...');
            const { status: newStatus } = await Contacts.requestPermissionsAsync();
            
            if (newStatus !== 'granted') {
              console.log('[Android HomeScreen] ❌ Contacts permission denied');
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
            console.log('[Android HomeScreen] 🎯 Opening native contact picker...');
            const result = await Contacts.presentContactPickerAsync();
            
            if (result && result.id) {
              const contact = {
                name: result.name || `${result.firstName || ''} ${result.lastName || ''}`.trim() || 'Unknown',
                phoneNumbers: result.phoneNumbers?.map((p: any) => ({ number: p.number || '' })) || [],
                emails: result.emails?.map((e: any) => ({ email: e.email || '' })) || []
              };
              
              console.log('[Android HomeScreen] ✅ Contact selected:', contact.name);
              
              webViewRef.current?.injectJavaScript(`
                window.postMessage(${JSON.stringify({
                  type: 'CONTACT_PICKER_RESPONSE',
                  success: true,
                  contact: contact
                })}, '*');
                true;
              `);
            } else {
              console.log('[Android HomeScreen] ⏸️ Contact picker cancelled');
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
            console.error('[Android HomeScreen] ❌ Contact picker not available');
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
          console.error('[Android HomeScreen] ❌ Error picking contact:', error);
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
        console.log('[Android HomeScreen] 🔔 Notification permission requested');
        
        if (!Notifications) {
          console.error('[Android HomeScreen] ❌ Notifications module not available');
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
          console.log('[Android HomeScreen] Current notification status:', currentStatus);
          
          let finalStatus = currentStatus;
          
          // Request if not granted
          if (currentStatus !== 'granted') {
            console.log('[Android HomeScreen] 📱 Requesting notification permission...');
            const { status: newStatus } = await Notifications.requestPermissionsAsync();
            finalStatus = newStatus;
            console.log('[Android HomeScreen] Permission result:', newStatus);
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
              console.log('[Android HomeScreen] 📲 Getting push token...');
              const tokenData = await Notifications.getExpoPushTokenAsync();
              console.log('[Android HomeScreen] ✅ Push token obtained:', tokenData.data);
              
              webViewRef.current?.injectJavaScript(`
                window.postMessage(${JSON.stringify({
                  type: 'PUSH_TOKEN',
                  token: tokenData.data
                })}, '*');
                true;
              `);
            } catch (tokenError) {
              console.error('[Android HomeScreen] ❌ Error getting push token:', tokenError);
            }
          } else {
            console.log('[Android HomeScreen] ⚠️ Notification permission not granted');
          }
        } catch (error) {
          console.error('[Android HomeScreen] ❌ Error requesting notification permission:', error);
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
        console.log('[Android HomeScreen] 🔔 Notification status check requested');
        
        if (!Notifications) {
          console.error('[Android HomeScreen] ❌ Notifications module not available');
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
          console.log('[Android HomeScreen] ✅ Notification status:', status);
          
          webViewRef.current?.injectJavaScript(`
            window.postMessage(${JSON.stringify({
              type: 'NOTIFICATIONS_STATUS_RESPONSE',
              status: status
            })}, '*');
            true;
          `);
        } catch (error) {
          console.error('[Android HomeScreen] ❌ Error getting notification status:', error);
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
      console.error('[Android HomeScreen] ❌ Error handling message:', error);
    }
  }, [currentRecording]);

  const injectedJavaScript = `
    (function() {
      console.log('[Native Bridge] Initializing Android bridge...');
      
      window.isNativeApp = true;
      window.nativeAppPlatform = 'android';
      window.nativeAppReady = false;
      
      // Feature flags
      window.nativeFeatures = {
        contacts: ${!!Contacts},
        notifications: ${!!Notifications},
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
          platform: 'android',
          features: window.nativeFeatures,
          timestamp: Date.now()
        }, '*');
        console.log('[Native Bridge] ✅ Android bridge ready');
      }, 100);
      
    })();
    true;
  `;

  if (webViewError) {
    return (
      <View style={[styles.errorContainer, { paddingTop: 48 }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorTitle}>Unable to Load ShopWell.ai</Text>
        <Text style={styles.errorMessage}>{webViewError}</Text>
        <Text style={styles.errorDetails}>Please check your internet connection and try again.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: 48 }]}>
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
          console.log('[Android HomeScreen] 🔄 Loading started');
          setWebViewLoaded(false);
          setWebViewError(null);
        }}
        onLoadEnd={() => {
          console.log('[Android HomeScreen] ✅ Loading complete');
          setWebViewLoaded(true);
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('[Android HomeScreen] ❌ WebView error:', nativeEvent);
          setWebViewError(`Error loading website: ${nativeEvent.description || 'Unknown error'}`);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('[Android HomeScreen] ❌ HTTP error:', nativeEvent.statusCode);
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
