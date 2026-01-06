
import { View, StyleSheet, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useWebViewBridge } from '@/contexts/WebViewBridgeContext';
import { useNotifications } from '@/hooks/useNotifications';
import { colors } from '@/styles/commonStyles';
import * as Linking from 'expo-linking';
import React, { useRef, useEffect, useState } from 'react';

const WEBSITE_URL = 'https://bda3e11e-68e8-45b3-9d3c-7c4fff44599c.lovableproject.com';

export default function HomeScreen() {
  const { registerWebView, handleBridgeMessage, injectJavaScript } = useWebViewBridge();
  const { expoPushToken, notification } = useNotifications();
  const webViewRef = useRef<WebView>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    registerWebView(webViewRef.current);
  }, [registerWebView]);

  // Send push token to WebView when available
  useEffect(() => {
    if (expoPushToken && webViewRef.current) {
      const script = `
        window.dispatchEvent(new CustomEvent('natively.notification.token', { 
          detail: { token: '${expoPushToken}' } 
        }));
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, [expoPushToken]);

  // Handle incoming notifications while app is open
  useEffect(() => {
    if (notification && webViewRef.current) {
      const script = `
        window.dispatchEvent(new CustomEvent('natively.notification.received', { 
          detail: ${JSON.stringify(notification.request.content)} 
        }));
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, [notification]);

  // Handle deep links and Universal Links
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      console.log('Deep link received:', event.url);
      const { path, queryParams } = Linking.parse(event.url);
      
      if (path && webViewRef.current) {
        let targetUrl = `${WEBSITE_URL}/${path}`;
        if (queryParams) {
          const params = new URLSearchParams(queryParams as any).toString();
          targetUrl += `?${params}`;
        }
        
        webViewRef.current.injectJavaScript(`
          window.location.href = '${targetUrl}';
          true;
        `);
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Handle iOS Share Extension data
  useEffect(() => {
    const handleSharedData = async () => {
      const url = await Linking.getInitialURL();
      if (url && url.includes('/share-target')) {
        const { queryParams } = Linking.parse(url);
        if (queryParams && webViewRef.current) {
          const script = `
            window.dispatchEvent(new CustomEvent('natively.share.received', { 
              detail: ${JSON.stringify(queryParams)} 
            }));
            true;
          `;
          webViewRef.current.injectJavaScript(script);
        }
      }
    };

    handleSharedData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    webViewRef.current?.reload();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const injectedJavaScriptBeforeContentLoaded = `
    (function() {
      window.isNativeApp = true;
      window.isIOSApp = true;
      window.nativelyMessageHandlers = {};
      
      window.natively = {
        haptic: {
          trigger: function(type) {
            return new Promise((resolve) => {
              const messageId = 'msg_' + Date.now() + '_' + Math.random();
              window.nativelyMessageHandlers[messageId] = resolve;
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'natively.haptic.trigger',
                id: messageId,
                payload: { type: type || 'medium' }
              }));
            });
          }
        },
        clipboard: {
          read: function() {
            return new Promise((resolve) => {
              const messageId = 'msg_' + Date.now() + '_' + Math.random();
              window.nativelyMessageHandlers[messageId] = resolve;
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'natively.clipboard.read',
                id: messageId
              }));
            });
          },
          write: function(text) {
            return new Promise((resolve) => {
              const messageId = 'msg_' + Date.now() + '_' + Math.random();
              window.nativelyMessageHandlers[messageId] = resolve;
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'natively.clipboard.write',
                id: messageId,
                payload: { text: text }
              }));
            });
          }
        },
        share: function(data) {
          return new Promise((resolve) => {
            const messageId = 'msg_' + Date.now() + '_' + Math.random();
            window.nativelyMessageHandlers[messageId] = resolve;
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'natively.share',
              id: messageId,
              payload: data
            }));
          });
        },
        imagePicker: function(source) {
          return new Promise((resolve) => {
            const messageId = 'msg_' + Date.now() + '_' + Math.random();
            window.nativelyMessageHandlers[messageId] = resolve;
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'natively.imagePicker',
              id: messageId,
              payload: { source: source || 'library' }
            }));
          });
        },
        notification: {
          register: function() {
            return new Promise((resolve) => {
              const messageId = 'msg_' + Date.now() + '_' + Math.random();
              window.nativelyMessageHandlers[messageId] = resolve;
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'natively.notification.register',
                id: messageId
              }));
            });
          },
          getToken: function() {
            return new Promise((resolve) => {
              const messageId = 'msg_' + Date.now() + '_' + Math.random();
              window.nativelyMessageHandlers[messageId] = resolve;
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'natively.notification.getToken',
                id: messageId
              }));
            });
          }
        }
      };
      
      console.log('Natively iOS bridge initialized');
    })();
    true;
  `;

  const handleMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('Message from WebView:', message);

      const sendResponse = (data: any) => {
        if (webViewRef.current) {
          const script = `
            if (window.nativelyMessageHandlers && window.nativelyMessageHandlers['${message.id}']) {
              window.nativelyMessageHandlers['${message.id}'](${JSON.stringify(data)});
              delete window.nativelyMessageHandlers['${message.id}'];
            }
            true;
          `;
          webViewRef.current.injectJavaScript(script);
        }
      };

      // Handle the message through the bridge context
      handleBridgeMessage(event);
      
      // Send token if requested
      if (message.type === 'natively.notification.getToken') {
        sendResponse({ token: expoPushToken });
      }
    } catch (error) {
      console.error('Error handling WebView message:', error);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: WEBSITE_URL }}
        style={styles.webview}
        onMessage={handleMessage}
        onLoadProgress={(event) => {
          setCanGoBack(event.nativeEvent.canGoBack);
        }}
        injectedJavaScriptBeforeContentLoaded={injectedJavaScriptBeforeContentLoaded}
        allowsBackForwardNavigationGestures={true}
        sharedCookiesEnabled={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        renderLoading={() => <ActivityIndicator size="large" color={colors.primary} style={styles.loading} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        onShouldStartLoadWithRequest={(request) => {
          const url = request.url;
          
          // Allow navigation within the app domain
          if (url.startsWith(WEBSITE_URL) || url.startsWith('about:blank')) {
            return true;
          }
          
          // Open external links in Safari
          if (url.startsWith('http://') || url.startsWith('https://')) {
            Linking.openURL(url);
            return false;
          }
          
          // Handle custom URL schemes
          if (url.startsWith('shopwell://')) {
            Linking.openURL(url);
            return false;
          }
          
          return true;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background 
  },
  webview: { 
    flex: 1 
  },
  loading: { 
    position: 'absolute', 
    top: '50%', 
    left: '50%', 
    marginLeft: -20, 
    marginTop: -20 
  },
});
