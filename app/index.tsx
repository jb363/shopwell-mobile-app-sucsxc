
import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Platform,
  BackHandler,
  RefreshControl,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useColorScheme } from 'react-native';
import * as Linking from 'expo-linking';
import { useNotifications } from '@/hooks/useNotifications';
import { useWebViewBridge } from '@/contexts/WebViewBridgeContext';
import { colors } from '@/styles/commonStyles';

const WEBSITE_URL = 'https://bda3e11e-68e8-45b3-9d3c-7c4fff44599c.lovableproject.com';
const ALLOWED_DOMAIN = 'bda3e11e-68e8-45b3-9d3c-7c4fff44599c.lovableproject.com';

export default function WebViewScreen() {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(WEBSITE_URL);
  const colorScheme = useColorScheme();
  
  const { expoPushToken, notification } = useNotifications();
  const { registerWebView, injectJavaScript } = useWebViewBridge();

  // Register WebView with bridge
  useEffect(() => {
    if (webViewRef.current) {
      registerWebView(webViewRef.current);
    }
  }, [registerWebView]);

  // Handle deep links
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      console.log('Deep link received:', event.url);
      const { hostname, path, queryParams } = Linking.parse(event.url);
      
      if (hostname === ALLOWED_DOMAIN || event.url.includes(ALLOWED_DOMAIN)) {
        const targetUrl = event.url.replace('shopwell://', 'https://');
        setCurrentUrl(targetUrl);
        webViewRef.current?.injectJavaScript(`
          window.location.href = '${targetUrl}';
          true;
        `);
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check for initial URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Handle notification responses
  useEffect(() => {
    if (notification) {
      const data = notification.request.content.data;
      if (data.url) {
        const targetUrl = data.url as string;
        if (targetUrl.includes(ALLOWED_DOMAIN)) {
          setCurrentUrl(targetUrl);
          webViewRef.current?.injectJavaScript(`
            window.location.href = '${targetUrl}';
            true;
          `);
        }
      }
    }
  }, [notification]);

  // Send push token to web app
  useEffect(() => {
    if (expoPushToken && webViewRef.current) {
      const message = JSON.stringify({
        type: 'natively.notification.token',
        token: expoPushToken,
      });
      injectJavaScript(`
        if (window.natively && window.natively.onMessage) {
          window.natively.onMessage(${message});
        }
        true;
      `);
    }
  }, [expoPushToken, injectJavaScript]);

  // Android back button handler
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [canGoBack]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    webViewRef.current?.reload();
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleNavigationStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack);
    setCurrentUrl(navState.url);
    
    // Check if navigation is within allowed domain
    const url = new URL(navState.url);
    if (url.hostname !== ALLOWED_DOMAIN) {
      // Open external links in browser
      webViewRef.current?.stopLoading();
      Linking.openURL(navState.url);
    }
  };

  const handleShouldStartLoadWithRequest = (request: any) => {
    const url = new URL(request.url);
    
    // Allow navigation within app domain
    if (url.hostname === ALLOWED_DOMAIN) {
      return true;
    }
    
    // Open external links in browser
    Linking.openURL(request.url);
    return false;
  };

  const handleMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('Message from WebView:', message);
      
      // Handle different message types from web app
      switch (message.type) {
        case 'natively.notification.register':
          // Notification registration is handled by useNotifications hook
          break;
        case 'natively.notification.getToken':
          if (expoPushToken) {
            injectJavaScript(`
              if (window.natively && window.natively.onMessage) {
                window.natively.onMessage(${JSON.stringify({
                  type: 'natively.notification.token',
                  token: expoPushToken,
                })});
              }
              true;
            `);
          }
          break;
        case 'natively.share.receive':
          // Handle shared content
          console.log('Shared content:', message.data);
          break;
        case 'natively.haptic.trigger':
          // Haptic feedback is handled by the bridge
          break;
        case 'natively.clipboard.read':
        case 'natively.clipboard.write':
          // Clipboard operations are handled by the bridge
          break;
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing message from WebView:', error);
    }
  };

  // Injected JavaScript to set up the bridge
  const injectedJavaScript = `
    (function() {
      // Create natively bridge object
      window.natively = {
        platform: '${Platform.OS}',
        version: '1.0.0',
        
        // Send message to native
        postMessage: function(message) {
          window.ReactNativeWebView.postMessage(JSON.stringify(message));
        },
        
        // Notification methods
        notification: {
          register: function() {
            window.natively.postMessage({ type: 'natively.notification.register' });
          },
          getToken: function() {
            window.natively.postMessage({ type: 'natively.notification.getToken' });
          }
        },
        
        // Share methods
        share: {
          receive: function(data) {
            window.natively.postMessage({ type: 'natively.share.receive', data: data });
          }
        },
        
        // Haptic methods
        haptic: {
          trigger: function(type) {
            window.natively.postMessage({ type: 'natively.haptic.trigger', hapticType: type });
          }
        },
        
        // Clipboard methods
        clipboard: {
          read: function() {
            window.natively.postMessage({ type: 'natively.clipboard.read' });
          },
          write: function(text) {
            window.natively.postMessage({ type: 'natively.clipboard.write', text: text });
          }
        },
        
        // Message handler (will be called from native)
        onMessage: function(message) {
          console.log('Message from native:', message);
          // Dispatch custom event for web app to listen to
          window.dispatchEvent(new CustomEvent('natively-message', { detail: message }));
        }
      };
      
      // Notify web app that native bridge is ready
      window.dispatchEvent(new Event('natively-ready'));
      
      console.log('ShopWell.ai native bridge initialized');
    })();
    true;
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: currentUrl }}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onMessage={handleMessage}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        injectedJavaScript={injectedJavaScript}
        injectedJavaScriptBeforeContentLoaded={`
          window.isNativeApp = true;
          window.nativePlatform = '${Platform.OS}';
          true;
        `}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        allowsBackForwardNavigationGestures={Platform.OS === 'ios'}
        pullToRefreshEnabled={true}
        sharedCookiesEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      />
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
});
