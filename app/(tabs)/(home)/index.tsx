
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform, BackHandler } from 'react-native';
import { WebView } from 'react-native-webview';
import { useWebViewBridge } from '@/contexts/WebViewBridgeContext';
import { colors } from '@/styles/commonStyles';
import * as Linking from 'expo-linking';

const WEBSITE_URL = 'https://bda3e11e-68e8-45b3-9d3c-7c4fff44599c.lovableproject.com';

export default function HomeScreen() {
  const webViewRef = useRef<WebView>(null);
  const {
    registerWebView,
    handleHapticFeedback,
    handleClipboardRead,
    handleClipboardWrite,
    handleShare,
    handleImagePicker,
  } = useWebViewBridge();
  
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (webViewRef.current) {
      registerWebView(webViewRef.current);
    }
  }, [registerWebView]);

  // Handle Android back button
  const onAndroidBackPress = useCallback(() => {
    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
      return true;
    }
    return false;
  }, [canGoBack]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      BackHandler.addEventListener('hardwareBackPress', onAndroidBackPress);
      return () => {
        BackHandler.removeEventListener('hardwareBackPress', onAndroidBackPress);
      };
    }
  }, [onAndroidBackPress]);

  // Handle deep links
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      console.log('Deep link received:', event.url);
      const { path, queryParams } = Linking.parse(event.url);
      
      if (path && webViewRef.current) {
        const targetUrl = `${WEBSITE_URL}/${path}${queryParams ? '?' + new URLSearchParams(queryParams as any).toString() : ''}`;
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

  const handleMessage = useCallback(async (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('Message from WebView:', message);

      switch (message.type) {
        case 'natively.haptic.trigger':
          handleHapticFeedback(message.payload?.type || 'medium');
          sendResponse(message.id, { success: true });
          break;

        case 'natively.clipboard.read':
          const clipboardText = await handleClipboardRead();
          sendResponse(message.id, { text: clipboardText });
          break;

        case 'natively.clipboard.write':
          await handleClipboardWrite(message.payload?.text || '');
          sendResponse(message.id, { success: true });
          break;

        case 'natively.share':
          await handleShare(message.payload);
          sendResponse(message.id, { success: true });
          break;

        case 'natively.imagePicker':
          const imageUri = await handleImagePicker();
          sendResponse(message.id, { uri: imageUri });
          break;

        case 'natively.notification.register':
          // This will be handled by NotificationContext
          sendResponse(message.id, { success: true });
          break;

        case 'natively.notification.getToken':
          // This will be handled by NotificationContext
          sendResponse(message.id, { token: null });
          break;

        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling WebView message:', error);
    }
  }, [handleHapticFeedback, handleClipboardRead, handleClipboardWrite, handleShare, handleImagePicker]);

  const sendResponse = (messageId: string, data: any) => {
    if (webViewRef.current) {
      const script = `
        if (window.nativelyMessageHandlers && window.nativelyMessageHandlers['${messageId}']) {
          window.nativelyMessageHandlers['${messageId}'](${JSON.stringify(data)});
          delete window.nativelyMessageHandlers['${messageId}'];
        }
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    }
  };

  const injectedJavaScriptBeforeContentLoaded = `
    (function() {
      window.isNativeApp = true;
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
        imagePicker: function() {
          return new Promise((resolve) => {
            const messageId = 'msg_' + Date.now() + '_' + Math.random();
            window.nativelyMessageHandlers[messageId] = resolve;
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'natively.imagePicker',
              id: messageId
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
      
      console.log('Natively bridge initialized');
    })();
    true;
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: WEBSITE_URL }}
        style={styles.webview}
        onMessage={handleMessage}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onLoadProgress={(event) => {
          setCanGoBack(event.nativeEvent.canGoBack);
        }}
        injectedJavaScriptBeforeContentLoaded={injectedJavaScriptBeforeContentLoaded}
        allowsBackForwardNavigationGestures={Platform.OS === 'ios'}
        sharedCookiesEnabled={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        onShouldStartLoadWithRequest={(request) => {
          // Allow navigation within the app domain
          const url = request.url;
          if (url.startsWith(WEBSITE_URL) || url.startsWith('about:blank')) {
            return true;
          }
          
          // Open external links in browser
          if (url.startsWith('http://') || url.startsWith('https://')) {
            Linking.openURL(url);
            return false;
          }
          
          return true;
        }}
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
    backgroundColor: colors.background,
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
    backgroundColor: colors.background,
  },
});
