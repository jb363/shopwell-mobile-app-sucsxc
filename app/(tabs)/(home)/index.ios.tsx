
import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View, Platform, Alert, TouchableOpacity, Text } from 'react-native';
import { Stack, router } from 'expo-router';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-audio';
import { useNotifications } from '@/hooks/useNotifications';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useTrackingPermission } from '@/hooks/useTrackingPermission';
import { useGeofencing } from '@/hooks/useGeofencing';
import * as OfflineStorage from '@/utils/offlineStorage';
import * as ContactsHandler from '@/utils/contactsHandler';
import * as AudioHandler from '@/utils/audioHandler';
import * as LocationHandler from '@/utils/locationHandler';
import StoreLocationManager from '@/components/StoreLocationManager';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';

const SHOPWELL_URL = 'https://shopwell.ai';

export default function HomeScreen() {
  const webViewRef = useRef<WebView>(null);
  const { expoPushToken } = useNotifications();
  const { isSyncing, queueSize, isOnline, manualSync } = useOfflineSync();
  const { trackingStatus } = useTrackingPermission();
  const { isActive: isGeofencingActive, storeLocations, addStoreLocation } = useGeofencing();
  const insets = useSafeAreaInsets();
  const [currentRecording, setCurrentRecording] = useState<Audio.Recording | null>(null);
  const [showLocationManager, setShowLocationManager] = useState(false);

  useEffect(() => {
    if (expoPushToken && webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        window.postMessage({ type: 'PUSH_TOKEN', token: '${expoPushToken}' }, '*');
      `);
    }
  }, [expoPushToken]);

  useEffect(() => {
    // Inject tracking status to web
    if (webViewRef.current && trackingStatus !== 'unknown') {
      console.log('Sending tracking status to web:', trackingStatus);
      webViewRef.current.injectJavaScript(`
        window.postMessage({ 
          type: 'TRACKING_STATUS', 
          status: '${trackingStatus}'
        }, '*');
      `);
    }
  }, [trackingStatus]);

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
          // The website should handle the actual deletion
          // We just need to acknowledge and clear local data
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
                  // Clear all local data
                  await OfflineStorage.clearAll();
                  console.log('Cleared all local storage');
                  
                  // Notify web to proceed with server-side deletion
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
          // Navigate to scanner screen
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
          // Escape JSON for injection
          const contactsJson = JSON.stringify(allContacts).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
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
          
        case 'natively.location.requestPermission':
          console.log('User requested location permission from web');
          const locationPermissionGranted = await LocationHandler.requestLocationPermission();
          webViewRef.current?.injectJavaScript(`
            window.postMessage({ 
              type: 'LOCATION_PERMISSION_RESPONSE', 
              granted: ${locationPermissionGranted}
            }, '*');
          `);
          break;
          
        case 'natively.location.getCurrent':
          console.log('User requested current location from web');
          const currentLocation = await LocationHandler.getCurrentLocation();
          if (currentLocation) {
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'LOCATION_CURRENT_RESPONSE', 
                location: ${JSON.stringify(currentLocation.coords)}
              }, '*');
            `);
          } else {
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'LOCATION_CURRENT_RESPONSE', 
                error: 'Failed to get location'
              }, '*');
            `);
          }
          break;
          
        case 'natively.geofence.add':
          console.log('User adding geofence from web:', data.store);
          await addStoreLocation(data.store);
          webViewRef.current?.injectJavaScript(`
            window.postMessage({ 
              type: 'GEOFENCE_ADD_RESPONSE', 
              success: true,
              storeId: '${data.store.id}'
            }, '*');
          `);
          break;
          
        case 'natively.geofence.openManager':
          console.log('User opened location manager from web');
          setShowLocationManager(true);
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
      
      // Hide any "Download App" banners, prompts, "Products in the News", and "Quick Tip" messages
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
          'a[href*="/products-news"]',
          // Quick Tip selectors
          '[data-quick-tip]',
          '[class*="quick-tip"]',
          '[class*="quicktip"]',
          '[id*="quick-tip"]',
          '[id*="quicktip"]',
          '.tip-banner',
          '.tip-message'
        ];
        
        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            el.style.display = 'none';
          });
        });
        
        // Also hide by text content
        const allElements = document.querySelectorAll('div, p, span, a, button, li, section, article');
        allElements.forEach(el => {
          const text = el.textContent?.toLowerCase() || '';
          // Hide "Products in the News" links
          if (text.includes('products in the news') || text.includes('products in news')) {
            el.style.display = 'none';
            if (el.parentElement?.tagName === 'LI') {
              el.parentElement.style.display = 'none';
            }
          }
          // Hide "Quick Tip" messages about Click-&-Add
          if (text.includes('quick tip') && (text.includes('click') || text.includes('add') || text.includes('install'))) {
            el.style.display = 'none';
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
      
      // Notify the website that we're in native app with all features
      window.postMessage({ 
        type: 'NATIVE_APP_READY', 
        platform: 'ios',
        features: ['contacts', 'camera', 'sharing', 'notifications', 'offline', 'accountDeletion', 'tracking', 'microphone', 'audioRecording', 'location', 'geofencing']
      }, '*');
    })();
    true;
  `;

  const geofenceStatusText = isGeofencingActive ? 'Active' : 'Inactive';
  const storeCountText = `${storeLocations.length}`;

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
      
      {/* Floating Location Button */}
      <TouchableOpacity
        style={styles.locationButton}
        onPress={() => {
          console.log('User tapped location button');
          setShowLocationManager(true);
        }}
      >
        <IconSymbol
          ios_icon_name="location.fill"
          android_material_icon_name="location-on"
          size={24}
          color="#fff"
        />
        {storeLocations.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{storeCountText}</Text>
          </View>
        )}
      </TouchableOpacity>
      
      {/* Location Manager Modal */}
      <StoreLocationManager
        visible={showLocationManager}
        onClose={() => setShowLocationManager(false)}
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
  locationButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007aff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ff3b30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
