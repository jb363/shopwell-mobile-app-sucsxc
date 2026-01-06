
import React, { createContext, useContext, useState, useCallback } from 'react';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

interface WebViewBridgeContextType {
  webViewRef: any;
  registerWebView: (ref: any) => void;
  injectJavaScript: (script: string) => void;
  handleBridgeMessage: (event: any) => void;
  handleHapticFeedback: (type?: string) => Promise<void>;
  handleClipboardRead: () => Promise<string>;
  handleClipboardWrite: (text: string) => Promise<void>;
  handleShare: (data: any) => Promise<void>;
  handleImagePicker: (source?: string) => Promise<string | null>;
}

const WebViewBridgeContext = createContext<WebViewBridgeContextType | undefined>(undefined);

export const WebViewBridgeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [webViewRef, setWebViewRef] = useState<any>(null);

  const registerWebView = useCallback((ref: any) => {
    setWebViewRef(ref);
    console.log('WebView registered');
  }, []);

  const injectJavaScript = useCallback((script: string) => {
    if (webViewRef) {
      webViewRef.injectJavaScript(script);
    }
  }, [webViewRef]);

  const handleHapticFeedback = useCallback(async (type: string = 'medium') => {
    try {
      switch (type) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        default:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (error) {
      console.error('Haptic feedback error:', error);
    }
  }, []);

  const handleClipboardRead = useCallback(async () => {
    try {
      const text = await Clipboard.getStringAsync();
      return text;
    } catch (error) {
      console.error('Clipboard read error:', error);
      return '';
    }
  }, []);

  const handleClipboardWrite = useCallback(async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
    } catch (error) {
      console.error('Clipboard write error:', error);
    }
  }, []);

  const handleShare = useCallback(async (data: any) => {
    try {
      if (await Sharing.isAvailableAsync()) {
        const { url, title, message } = data;
        
        if (url) {
          await Sharing.shareAsync(url, { 
            dialogTitle: title || 'Share',
          });
        } else if (message) {
          // For text sharing, we need to create a temporary file
          // or use the native share dialog differently
          console.log('Text sharing:', message);
        }
      } else {
        Alert.alert('Sharing not available', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Share failed', 'Failed to share content');
    }
  }, []);

  const handleImagePicker = useCallback(async (source: string = 'library') => {
    try {
      // Request permissions
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission denied', 'Camera permission is required to take photos');
          return null;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission denied', 'Photo library permission is required to select images');
          return null;
        }
      }

      // Launch picker
      const result = source === 'camera' 
        ? await ImagePicker.launchCameraAsync({ 
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({ 
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
          });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        return result.assets[0].uri;
      }
      
      return null;
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
      return null;
    }
  }, []);

  const handleBridgeMessage = useCallback(async (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      const { type, id, payload } = message;

      const sendResponse = (responseData: any) => {
        if (webViewRef) {
          const script = `
            if (window.nativelyMessageHandlers && window.nativelyMessageHandlers['${id}']) {
              window.nativelyMessageHandlers['${id}'](${JSON.stringify(responseData)});
              delete window.nativelyMessageHandlers['${id}'];
            }
            true;
          `;
          webViewRef.injectJavaScript(script);
        }
      };

      switch (type) {
        case 'natively.clipboard.read':
          const text = await handleClipboardRead();
          sendResponse({ text });
          break;

        case 'natively.clipboard.write':
          await handleClipboardWrite(payload?.text || '');
          sendResponse({ success: true });
          break;

        case 'natively.haptic.trigger':
          await handleHapticFeedback(payload?.type || 'medium');
          sendResponse({ success: true });
          break;

        case 'natively.share':
          await handleShare(payload);
          sendResponse({ success: true });
          break;

        case 'natively.imagePicker':
          const imageUri = await handleImagePicker(payload?.source || 'library');
          sendResponse({ uri: imageUri });
          break;

        case 'natively.notification.register':
          // Handled by useNotifications hook
          sendResponse({ success: true });
          break;

        case 'natively.notification.getToken':
          // Token will be sent separately
          sendResponse({ success: true });
          break;

        default:
          console.log('Unknown message type:', type);
      }
    } catch (error) {
      console.error('Bridge message error:', error);
    }
  }, [webViewRef, handleHapticFeedback, handleClipboardRead, handleClipboardWrite, handleShare, handleImagePicker]);

  return (
    <WebViewBridgeContext.Provider value={{ 
      webViewRef, 
      registerWebView, 
      injectJavaScript, 
      handleBridgeMessage,
      handleHapticFeedback,
      handleClipboardRead,
      handleClipboardWrite,
      handleShare,
      handleImagePicker,
    }}>
      {children}
    </WebViewBridgeContext.Provider>
  );
};

export const useWebViewBridge = () => {
  const context = useContext(WebViewBridgeContext);
  if (!context) throw new Error('useWebViewBridge must be used within WebViewBridgeProvider');
  return context;
};
