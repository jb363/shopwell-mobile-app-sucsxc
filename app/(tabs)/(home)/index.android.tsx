
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';

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
      console.log('[Android HomeScreen] Processing shared content');
      
      const sharedContentStr = Array.isArray(params.sharedContent) ? params.sharedContent[0] : params.sharedContent;
      const sharedTypeStr = Array.isArray(params.sharedType) ? params.sharedType[0] : params.sharedType;
      
      setTimeout(() => {
        try {
          webViewRef.current?.injectJavaScript(`
            (function() {
              try {
                window.postMessage({ 
                  type: 'SHARED_CONTENT', 
                  contentType: '${sharedTypeStr}',
                  content: ${JSON.stringify(sharedContentStr)}
                }, '*');
              } catch (error) {
                console.error('[Native] Error sending shared content:', error);
              }
            })();
            true;
          `);
        } catch (error) {
          console.error('[Android HomeScreen] Error injecting shared content:', error);
        }
      }, 1500);
    }
  }, [params.sharedContent, params.sharedType, webViewLoaded]);

  const handleMessage = useCallback(async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('[Android HomeScreen] Message received:', data.type);
      
      // Handle messages from the website
      // For now, just log them - the website handles most functionality
      
    } catch (error) {
      console.error('[Android HomeScreen] Error handling message:', error);
    }
  }, []);

  const injectedJavaScript = `
    (function() {
      console.log('[Native Bridge] Initializing...');
      
      window.isNativeApp = true;
      window.nativeAppPlatform = 'android';
      
      // Signal that we're ready
      setTimeout(function() {
        window.postMessage({ 
          type: 'NATIVE_APP_READY',
          platform: 'android',
          timestamp: Date.now()
        }, '*');
        console.log('[Native Bridge] Ready signal sent');
      }, 100);
      
      console.log('[Native Bridge] Initialized');
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
          console.log('[Android HomeScreen] Loading started');
          setWebViewLoaded(false);
          setWebViewError(null);
        }}
        onLoadEnd={() => {
          console.log('[Android HomeScreen] Loading complete');
          setWebViewLoaded(true);
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('[Android HomeScreen] WebView error:', nativeEvent);
          setWebViewError(`Error loading website: ${nativeEvent.description || 'Unknown error'}`);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('[Android HomeScreen] HTTP error:', nativeEvent.statusCode);
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
