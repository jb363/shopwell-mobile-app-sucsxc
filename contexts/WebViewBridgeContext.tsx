
import React, { createContext, useContext, useRef, useCallback } from 'react';
import { WebView } from 'react-native-webview';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { launchCamera, launchImageLibrary } from '@/utils/cameraHandler';

interface WebViewBridgeContextType {
  registerWebView: (webView: WebView) => void;
  injectJavaScript: (script: string) => void;
  handleHapticFeedback: (type: string) => void;
  handleClipboardRead: () => Promise<string>;
  handleClipboardWrite: (text: string) => Promise<void>;
  handleShare: (data: any) => Promise<void>;
  handleImagePicker: () => Promise<string | null>;
  handleCameraLaunch: () => Promise<string | null>;
}

const WebViewBridgeContext = createContext<WebViewBridgeContextType>({
  registerWebView: () => {},
  injectJavaScript: () => {},
  handleHapticFeedback: () => {},
  handleClipboardRead: async () => '',
  handleClipboardWrite: async () => {},
  handleShare: async () => {},
  handleImagePicker: async () => null,
  handleCameraLaunch: async () => null,
});

export const useWebViewBridge = () => useContext(WebViewBridgeContext);

export function WebViewBridgeProvider({ children }: { children: React.ReactNode }) {
  const webViewRef = useRef<WebView | null>(null);

  const registerWebView = useCallback((webView: WebView) => {
    webViewRef.current = webView;
    console.log('WebView registered with bridge');
  }, []);

  const injectJavaScript = useCallback((script: string) => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(script);
    } else {
      console.warn('WebView not registered, cannot inject JavaScript');
    }
  }, []);

  const handleHapticFeedback = useCallback((type: string) => {
    console.log('Triggering haptic feedback:', type);
    switch (type) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      default:
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, []);

  const handleClipboardRead = useCallback(async () => {
    try {
      const text = await Clipboard.getStringAsync();
      console.log('Read from clipboard:', text.substring(0, 50));
      return text;
    } catch (error) {
      console.error('Error reading clipboard:', error);
      return '';
    }
  }, []);

  const handleClipboardWrite = useCallback(async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      console.log('Wrote to clipboard:', text.substring(0, 50));
    } catch (error) {
      console.error('Error writing to clipboard:', error);
    }
  }, []);

  const handleShare = useCallback(async (data: any) => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        console.log('Sharing:', data);
        await Sharing.shareAsync(data.url || data.text, {
          dialogTitle: data.title || 'Share',
        });
      } else {
        console.log('Sharing not available on this platform');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }, []);

  const handleImagePicker = useCallback(async () => {
    try {
      const uri = await launchImageLibrary();
      console.log('Image picked:', uri);
      return uri;
    } catch (error) {
      console.error('Error picking image:', error);
      return null;
    }
  }, []);

  const handleCameraLaunch = useCallback(async () => {
    try {
      const uri = await launchCamera();
      console.log('Camera photo taken:', uri);
      return uri;
    } catch (error) {
      console.error('Error launching camera:', error);
      return null;
    }
  }, []);

  return (
    <WebViewBridgeContext.Provider
      value={{
        registerWebView,
        injectJavaScript,
        handleHapticFeedback,
        handleClipboardRead,
        handleClipboardWrite,
        handleShare,
        handleImagePicker,
        handleCameraLaunch,
      }}
    >
      {children}
    </WebViewBridgeContext.Provider>
  );
}
