
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as Contacts from 'expo-contacts';
import { Audio } from 'expo-audio';
import * as FileSystem from 'expo-file-system';
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
          
          // Read audio file as base64
          console.log('[iOS HomeScreen] 📖 Reading audio file...');
          const base64Audio = await FileSystem.readAsStringAsync(uri, {
            encoding: 'base64',
          });
          
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
        injectedJavaScript={injectedJavaScript}
        cacheEnabled={false}
        incognito={false}
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
