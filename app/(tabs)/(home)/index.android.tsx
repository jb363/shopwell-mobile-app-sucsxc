
import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { useNotifications } from '@/hooks/useNotifications';

const SHOPWELL_URL = 'https://bda3e11e-68e8-45b3-9d3c-7c4fff44599c.lovableproject.com';

export default function HomeScreen() {
  const webViewRef = useRef<WebView>(null);
  const { expoPushToken } = useNotifications();

  useEffect(() => {
    if (expoPushToken && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        window.postMessage({ type: 'PUSH_TOKEN', token: '${expoPushToken}' }, '*');
      `);
    }
  }, [expoPushToken]);

  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'natively.clipboard.read':
          const text = await Clipboard.getStringAsync();
          webViewRef.current?.injectJavaScript(`
            window.postMessage({ type: 'CLIPBOARD_READ_RESPONSE', text: '${text}' }, '*');
          `);
          break;
          
        case 'natively.clipboard.write':
          await Clipboard.setStringAsync(data.text);
          break;
          
        case 'natively.haptic.trigger':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
          
        case 'natively.share':
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(data.url);
          }
          break;
          
        case 'natively.imagePicker':
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 1,
          });
          if (!result.canceled) {
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ type: 'IMAGE_SELECTED', uri: '${result.assets[0].uri}' }, '*');
            `);
          }
          break;
          
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  };

  return (
    <View style={styles.container}>
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 48, // Add padding for Android notch
  },
  webview: {
    flex: 1,
  },
});
