
import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View, Platform, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-audio';
import { useNotifications } from '@/hooks/useNotifications';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import * as OfflineStorage from '@/utils/offlineStorage';
import * as ContactsHandler from '@/utils/contactsHandler';
import * as AudioHandler from '@/utils/audioHandler';

const SHOPWELL_URL = 'https://shopwell.ai';

export default function HomeScreen() {
  const webViewRef = useRef<WebView>(null);
  const { expoPushToken } = useNotifications();
  const { isSyncing, queueSize, isOnline, manualSync } = useOfflineSync();
  const [currentRecording, setCurrentRecording] = useState<Audio.Recording | null>(null);

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
        case 'natively.microphone.requestPermission':
          console.log('User requested microphone permission from web');
          const micPermissionGranted = await AudioHandler.requestMicrophonePermission();
          webViewRef.current?.injectJavaScript(`
            window.postMessage({ 
              type: 'MICROPHONE_PERMISSION_RESPONSE', 
              granted: ${micPermissionGranted}
            }, '*');
          `);
          break;

        case 'natively.audio.startRecording':
          console.log('User initiated audio recording from web');
          const recording = await AudioHandler.startRecording();
          if (recording) {
            setCurrentRecording(recording);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'AUDIO_RECORDING_STARTED', 
                success: true
              }, '*');
            `);
          } else {
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'AUDIO_RECORDING_STARTED', 
                success: false,
                error: 'Failed to start recording'
              }, '*');
            `);
          }
          break;

        case 'natively.audio.stopRecording':
          console.log('User stopped audio recording from web');
          if (currentRecording) {
            const uri = await AudioHandler.stopRecording(currentRecording);
            setCurrentRecording(null);
            if (uri) {
              webViewRef.current?.injectJavaScript(`
                window.postMessage({ 
                  type: 'AUDIO_RECORDING_STOPPED', 
                  success: true,
                  uri: '${uri}'
                }, '*');
              `);
            } else {
              webViewRef.current?.injectJavaScript(`
                window.postMessage({ 
                  type: 'AUDIO_RECORDING_STOPPED', 
                  success: false,
                  error: 'Failed to stop recording'
                }, '*');
              `);
            }
          } else {
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'AUDIO_RECORDING_STOPPED', 
                success: false,
                error: 'No active recording'
              }, '*');
            `);
          }
          break;

        case 'natively.audio.pauseRecording':
          console.log('User paused audio recording from web');
          if (currentRecording) {
            const paused = await AudioHandler.pauseRecording(currentRecording);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'AUDIO_RECORDING_PAUSED', 
                success: ${paused}
              }, '*');
            `);
          }
          break;

        case 'natively.audio.resumeRecording':
          console.log('User resumed audio recording from web');
          if (currentRecording) {
            const resumed = await AudioHandler.resumeRecording(currentRecording);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'AUDIO_RECORDING_RESUMED', 
                success: ${resumed}
              }, '*');
            `);
          }
          break;

        case 'natively.audio.getStatus':
          if (currentRecording) {
            const status = await AudioHandler.getRecordingStatus(currentRecording);
            if (status) {
              webViewRef.current?.injectJavaScript(`
                window.postMessage({ 
                  type: 'AUDIO_RECORDING_STATUS', 
                  status: ${JSON.stringify(status)}
                }, '*');
              `);
            }
          }
          break;

        case 'natively.account.delete':
          console.log('User initiated account deletion from web');
          Alert.alert(
            'Delete Account',
            'Your account will be permanently deleted. This action cannot be undone. All your data will be removed from our servers.',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => {
                  webViewRef.current?.injectJavaScript(`
                    window.postMessage({ 
                      type: 'ACCOUNT_DELETE_RESPONSE', 
                      cancelled: true
                    }, '*');
                  `);
                }
              },
              {
                text: 'Delete Account',
                style: 'destructive',
                onPress: async () => {
                  console.log('User confirmed account deletion');
                  await OfflineStorage.clearAll();
                  console.log('Cleared all local storage');
                  
                  webViewRef.current?.injectJavaScript(`
                    window.postMessage({ 
                      type: 'ACCOUNT_DELETE_RESPONSE', 
                      confirmed: true
                    }, '*');
                  `);
                }
              }
            ]
          );
          break;

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
          router.push('/scanner');
          break;
          
        case 'natively.contacts.requestPermission':
          console.log('User requested contacts permission from web');
          const permissionGranted = await ContactsHandler.requestContactsPermission();
          webViewRef.current?.injectJavaScript(`
            window.postMessage({ 
              type: 'CONTACTS_PERMISSION_RESPONSE', 
              granted: ${permissionGranted}
            }, '*');
          `);
          break;
          
        case 'natively.contacts.getAll':
          console.log('User requested to import all contacts from web');
          const hasPermission = await ContactsHandler.hasContactsPermission();
          if (!hasPermission) {
            console.log('No contacts permission, requesting...');
            const granted = await ContactsHandler.requestContactsPermission();
            if (!granted) {
              console.log('Contacts permission denied by user');
              webViewRef.current?.injectJavaScript(`
                window.postMessage({ 
                  type: 'CONTACTS_GET_ALL_RESPONSE', 
                  contacts: [],
                  error: 'Permission denied'
                }, '*');
              `);
              break;
            }
          }
          
          const allContacts = await ContactsHandler.getAllContacts();
          console.log(`Sending ${allContacts.length} contacts to web`);
          webViewRef.current?.injectJavaScript(`
            window.postMessage({ 
              type: 'CONTACTS_GET_ALL_RESPONSE', 
              contacts: ${JSON.stringify(allContacts)}
            }, '*');
          `);
          break;
          
        case 'natively.contacts.search':
          console.log('User searching contacts with query:', data.query);
          const searchResults = await ContactsHandler.searchContacts(data.query || '');
          console.log(`Found ${searchResults.length} matching contacts`);
          webViewRef.current?.injectJavaScript(`
            window.postMessage({ 
              type: 'CONTACTS_SEARCH_RESPONSE', 
              contacts: ${JSON.stringify(searchResults)},
              query: '${data.query || ''}'
            }, '*');
          `);
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

  const injectedJavaScript = `
    (function() {
      window.isNativeApp = true;
      window.nativeAppPlatform = 'android';
      
      const hideUnwantedElements = () => {
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
        
        const allLinks = document.querySelectorAll('a, button, div[role="button"]');
        allLinks.forEach(el => {
          const text = el.textContent?.toLowerCase() || '';
          if (text.includes('products in the news') || text.includes('products in news')) {
            el.style.display = 'none';
            if (el.parentElement?.tagName === 'LI') {
              el.parentElement.style.display = 'none';
            }
          }
        });
      };
      
      hideUnwantedElements();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hideUnwantedElements);
      }
      
      setInterval(hideUnwantedElements, 1000);
      
      window.postMessage({ 
        type: 'NATIVE_APP_READY', 
        platform: 'android',
        features: ['contacts', 'camera', 'sharing', 'notifications', 'offline', 'accountDeletion', 'microphone', 'audioRecording']
      }, '*');
    })();
    true;
  `;

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
        allowsBackForwardNavigationGestures={true}
        sharedCookiesEnabled={true}
        injectedJavaScript={injectedJavaScript}
        onLoadEnd={() => {
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
    paddingTop: 48,
  },
  webview: {
    flex: 1,
  },
});
