
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as Notifications from 'expo-notifications';
import * as Contacts from 'expo-contacts';

const SHOPWELL_URL = 'https://shopwell.ai';

export default function HomeScreen() {
  console.log('[Android HomeScreen] Initializing...');
  
  const webViewRef = useRef<WebView>(null);
  const params = useLocalSearchParams();
  
  const [webViewLoaded, setWebViewLoaded] = useState(false);
  const [webViewError, setWebViewError] = useState<string | null>(null);

  // Handle shared content from params
  useEffect(() => {
    if (params.sharedContent && params.sharedType && webViewRef.current && webViewLoaded) {
      console.log('[Android HomeScreen] 📤 Processing shared content:', params.sharedType);
      
      const sharedContentStr = Array.isArray(params.sharedContent) ? params.sharedContent[0] : params.sharedContent;
      const sharedTypeStr = Array.isArray(params.sharedType) ? params.sharedType[0] : params.sharedType;
      
      setTimeout(() => {
        try {
          const message = {
            type: 'SHARED_CONTENT',
            contentType: sharedTypeStr,
            content: sharedContentStr
          };
          
          console.log('[Android HomeScreen] 📨 Sending shared content to WebView:', message);
          
          webViewRef.current?.injectJavaScript(`
            (function() {
              try {
                console.log('[Native Bridge] Sending SHARED_CONTENT message');
                window.postMessage(${JSON.stringify(message)}, '*');
                console.log('[Native Bridge] SHARED_CONTENT message sent');
              } catch (error) {
                console.error('[Native Bridge] Error sending shared content:', error);
              }
            })();
            true;
          `);
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
      
      // Handle contact picker request
      if (data.type === 'natively.contacts.pick') {
        console.log('[Android HomeScreen] 📱 Contact picker requested');
        
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
                phoneNumbers: result.phoneNumbers?.map(p => ({ number: p.number || '' })) || [],
                emails: result.emails?.map(e => ({ email: e.email || '' })) || []
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
      
    } catch (error) {
      console.error('[Android HomeScreen] ❌ Error handling message:', error);
    }
  }, []);

  const injectedJavaScript = `
    (function() {
      console.log('[Native Bridge] Initializing Android bridge...');
      
      window.isNativeApp = true;
      window.nativeAppPlatform = 'android';
      window.nativeAppReady = false;
      
      // Feature flags
      window.nativeFeatures = {
        contacts: true,
        notifications: true,
        sharing: true,
        biometrics: true
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
        injectedJavaScript={injectedJavaScript}
        cacheEnabled={false}
        incognito={false}
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
