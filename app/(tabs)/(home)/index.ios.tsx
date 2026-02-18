
import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { useNotifications } from '@/hooks/useNotifications';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import * as OfflineStorage from '@/utils/offlineStorage';

const SHOPWELL_URL = 'https://shopwell.ai';

export default function HomeScreen() {
  const webViewRef = useRef<WebView>(null);
  const { expoPushToken } = useNotifications();
  const { isSyncing, queueSize, isOnline, manualSync } = useOfflineSync();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (expoPushToken && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        window.postMessage({ type: 'PUSH_TOKEN', token: '${expoPushToken}' }, '*');
      `);
    }
  }, [expoPushToken]);

  useEffect(() => {
    // Inject sync status
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        window.postMessage({ 
          type: 'SYNC_STATUS', 
          isSyncing: ${isSyncing}, 
          queueSize: ${queueSize},
          isOnline: ${isOnline}
        }, '*');
      `);
    }
  }, [isSyncing, queueSize, isOnline]);

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
          const style = data.style || 'medium';
          const hapticMap: Record<string, any> = {
            light: Haptics.ImpactFeedbackStyle.Light,
            medium: Haptics.ImpactFeedbackStyle.Medium,
            heavy: Haptics.ImpactFeedbackStyle.Heavy,
            success: Haptics.NotificationFeedbackType.Success,
            warning: Haptics.NotificationFeedbackType.Warning,
            error: Haptics.NotificationFeedbackType.Error,
          };
          if (style in hapticMap) {
            if (['success', 'warning', 'error'].includes(style)) {
              await Haptics.notificationAsync(hapticMap[style]);
            } else {
              await Haptics.impactAsync(hapticMap[style]);
            }
          }
          break;
          
        case 'natively.share':
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(data.url || data.message);
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
          
        case 'natively.scanner.open':
          // Navigate to scanner screen
          router.push('/scanner');
          break;
          
        case 'natively.storage.get':
          const storedValue = await OfflineStorage.getItem(data.key);
          webViewRef.current?.injectJavaScript(`
            window.postMessage({ 
              type: 'STORAGE_GET_RESPONSE', 
              key: '${data.key}',
              value: ${JSON.stringify(storedValue)}
            }, '*');
          `);
          break;
          
        case 'natively.storage.set':
          await OfflineStorage.setItem(data.key, data.value);
          webViewRef.current?.injectJavaScript(`
            window.postMessage({ 
              type: 'STORAGE_SET_RESPONSE', 
              key: '${data.key}',
              success: true
            }, '*');
          `);
          break;
          
        case 'natively.storage.remove':
          await OfflineStorage.removeItem(data.key);
          break;
          
        case 'natively.sync.manual':
          const syncSuccess = await manualSync();
          webViewRef.current?.injectJavaScript(`
            window.postMessage({ 
              type: 'SYNC_MANUAL_RESPONSE', 
              success: ${syncSuccess}
            }, '*');
          `);
          break;
          
        case 'natively.lists.save':
          await OfflineStorage.saveShoppingList(data.list);
          webViewRef.current?.injectJavaScript(`
            window.postMessage({ 
              type: 'LIST_SAVE_RESPONSE', 
              success: true,
              listId: '${data.list.id}'
            }, '*');
          `);
          break;
          
        case 'natively.lists.get':
          const lists = await OfflineStorage.getShoppingLists();
          webViewRef.current?.injectJavaScript(`
            window.postMessage({ 
              type: 'LISTS_GET_RESPONSE', 
              lists: ${JSON.stringify(lists)}
            }, '*');
          `);
          break;
          
        case 'natively.lists.delete':
          await OfflineStorage.deleteShoppingList(data.listId);
          webViewRef.current?.injectJavaScript(`
            window.postMessage({ 
              type: 'LIST_DELETE_RESPONSE', 
              success: true,
              listId: '${data.listId}'
            }, '*');
          `);
          break;
          
        case 'natively.product.cache':
          await OfflineStorage.cacheProduct(data.product);
          break;
          
        case 'natively.product.getCached':
          const cachedProduct = await OfflineStorage.getCachedProduct(data.barcode);
          webViewRef.current?.injectJavaScript(`
            window.postMessage({ 
              type: 'PRODUCT_CACHED_RESPONSE', 
              barcode: '${data.barcode}',
              product: ${JSON.stringify(cachedProduct)}
            }, '*');
          `);
          break;
          
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  };

  // JavaScript to inject that tells the website it's running in native app
  const injectedJavaScript = `
    (function() {
      // Set flag that we're in native app
      window.isNativeApp = true;
      window.nativeAppPlatform = 'ios';
      
      // Hide any "Download App" banners, prompts, and "Products in the News"
      const hideUnwantedElements = () => {
        // Common selectors for app download banners
        const selectors = [
          '[data-download-app]',
          '[class*="download-app"]',
          '[class*="app-banner"]',
          '[class*="install-app"]',
          '[id*="download-app"]',
          '[id*="app-banner"]',
          '.app-download-banner',
          '.download-banner',
          '.install-banner',
          // Products in the News selectors
          '[data-products-news]',
          '[class*="products-news"]',
          '[class*="products-in-news"]',
          '[id*="products-news"]',
          '[id*="products-in-news"]',
          'a[href*="/news"]',
          'a[href*="/products-news"]'
        ];
        
        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            el.style.display = 'none';
          });
        });
        
        // Also hide by text content (for "Products in the News" links)
        const allLinks = document.querySelectorAll('a, button, div[role="button"]');
        allLinks.forEach(el => {
          const text = el.textContent?.toLowerCase() || '';
          if (text.includes('products in the news') || text.includes('products in news')) {
            el.style.display = 'none';
            // Also hide parent if it's a list item
            if (el.parentElement?.tagName === 'LI') {
              el.parentElement.style.display = 'none';
            }
          }
        });
      };
      
      // Run immediately and after DOM loads
      hideUnwantedElements();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hideUnwantedElements);
      }
      
      // Also run periodically to catch dynamically added elements
      setInterval(hideUnwantedElements, 1000);
      
      // Notify the website that we're in native app
      window.postMessage({ type: 'NATIVE_APP_READY', platform: 'ios' }, '*');
    })();
    true;
  `;

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
        allowsBackForwardNavigationGestures={true}
        sharedCookiesEnabled={true}
        injectedJavaScript={injectedJavaScript}
        onLoadEnd={() => {
          // Re-inject after page loads to ensure it takes effect
          if (webViewRef.current) {
            webViewRef.current.injectJavaScript(injectedJavaScript);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});
