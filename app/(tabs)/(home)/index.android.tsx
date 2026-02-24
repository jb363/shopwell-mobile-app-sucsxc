
import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View, Platform, Alert } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-audio';
import { useNotifications } from '@/hooks/useNotifications';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useGeofencing } from '@/hooks/useGeofencing';
import { useQuickActions } from '@/hooks/useQuickActions';
import * as OfflineStorage from '@/utils/offlineStorage';
import * as ContactsHandler from '@/utils/contactsHandler';
import * as AudioHandler from '@/utils/audioHandler';
import * as LocationHandler from '@/utils/locationHandler';

const SHOPWELL_URL = 'https://shopwell.ai';

export default function HomeScreen() {
  const webViewRef = useRef<WebView>(null);
  const params = useLocalSearchParams();
  const { expoPushToken } = useNotifications();
  const { isSyncing, queueSize, isOnline, manualSync } = useOfflineSync();
  const { 
    addStoreLocation, 
    removeStoreLocation, 
    loadStoreLocations,
    storeLocations,
    isActive: isGeofencingActive,
    startGeofencing,
    stopGeofencing,
    hasPermission: geofencePermissionStatus
  } = useGeofencing();
  const [currentRecording, setCurrentRecording] = useState<Audio.Recording | null>(null);
  const [contactsPermissionStatus, setContactsPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');

  // Set up quick actions (app shortcuts)
  useQuickActions(webViewRef);

  // Handle shared content from share-target screen
  useEffect(() => {
    if (params.sharedContent && params.sharedType && webViewRef.current) {
      console.log('Received shared content:', { type: params.sharedType, content: params.sharedContent });
      
      // Send shared content to the web app
      const sharedContentStr = Array.isArray(params.sharedContent) ? params.sharedContent[0] : params.sharedContent;
      const sharedTypeStr = Array.isArray(params.sharedType) ? params.sharedType[0] : params.sharedType;
      
      webViewRef.current.injectJavaScript(`
        window.postMessage({ 
          type: 'SHARED_CONTENT', 
          contentType: '${sharedTypeStr}',
          content: ${JSON.stringify(sharedContentStr)}
        }, '*');
      `);
    }
  }, [params.sharedContent, params.sharedType]);

  // Check initial permission statuses
  useEffect(() => {
    async function checkPermissions() {
      console.log('Checking initial permission statuses...');
      
      // Check contacts permission
      const hasContacts = await ContactsHandler.hasContactsPermission();
      setContactsPermissionStatus(hasContacts ? 'granted' : 'undetermined');
      console.log('Initial contacts permission:', hasContacts ? 'granted' : 'undetermined');
      
      // Check location permission
      const hasLocation = await LocationHandler.hasLocationPermission();
      setLocationPermissionStatus(hasLocation ? 'granted' : 'undetermined');
      console.log('Initial location permission:', hasLocation ? 'granted' : 'undetermined');
      
      // Send initial status to web
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          window.postMessage({ 
            type: 'PERMISSIONS_STATUS', 
            contacts: '${hasContacts ? 'granted' : 'undetermined'}',
            location: '${hasLocation ? 'granted' : 'undetermined'}'
          }, '*');
        `);
      }
    }
    
    checkPermissions();
  }, []);

  useEffect(() => {
    if (expoPushToken && webViewRef.current) {
      console.log('Sending push token to web:', expoPushToken);
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

  useEffect(() => {
    // Send geofencing status to web
    if (webViewRef.current) {
      console.log('Sending geofencing status to web:', { 
        isGeofencingActive, 
        geofencePermissionStatus,
        locationCount: storeLocations.length 
      });
      webViewRef.current.injectJavaScript(`
        window.postMessage({ 
          type: 'GEOFENCING_STATUS', 
          isActive: ${isGeofencingActive},
          permissionStatus: '${geofencePermissionStatus ? 'granted' : 'denied'}',
          locationCount: ${storeLocations.length},
          locations: ${JSON.stringify(storeLocations)},
          platform: 'android'
        }, '*');
      `);
    }
  }, [isGeofencingActive, geofencePermissionStatus, storeLocations]);

  // Send permission statuses to web when they change
  useEffect(() => {
    if (webViewRef.current) {
      console.log('Sending permission statuses to web:', { contactsPermissionStatus, locationPermissionStatus });
      webViewRef.current.injectJavaScript(`
        window.postMessage({ 
          type: 'PERMISSIONS_STATUS', 
          contacts: '${contactsPermissionStatus}',
          location: '${locationPermissionStatus}'
        }, '*');
      `);
    }
  }, [contactsPermissionStatus, locationPermissionStatus]);

  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('Android received message from web:', data.type);
      
      switch (data.type) {
        case 'WEB_PAGE_READY':
          console.log('Web page is ready, sending initial status');
          // Web page is ready to receive messages
          webViewRef.current?.injectJavaScript(`
            window.postMessage({ 
              type: 'GEOFENCING_STATUS', 
              isActive: ${isGeofencingActive},
              permissionStatus: '${geofencePermissionStatus ? 'granted' : 'denied'}',
              locationCount: ${storeLocations.length},
              locations: ${JSON.stringify(storeLocations)},
              platform: 'android'
            }, '*');
          `);
          
          // Also send permissions status
          webViewRef.current?.injectJavaScript(`
            window.postMessage({ 
              type: 'PERMISSIONS_STATUS', 
              contacts: '${contactsPermissionStatus}',
              location: '${locationPermissionStatus}'
            }, '*');
          `);
          break;

        case 'natively.geofence.enableNotifications':
          console.log('User toggling location-based notifications from web:', data.enabled);
          try {
            if (data.enabled) {
              const started = await startGeofencing();
              console.log('Geofencing started:', started);
              webViewRef.current?.injectJavaScript(`
                window.postMessage({ 
                  type: 'GEOFENCE_ENABLE_RESPONSE', 
                  success: ${started},
                  enabled: ${started}
                }, '*');
              `);
              
              // Send updated status
              const updatedLocations = await loadStoreLocations();
              webViewRef.current?.injectJavaScript(`
                window.postMessage({ 
                  type: 'GEOFENCING_STATUS', 
                  isActive: ${started},
                  permissionStatus: 'granted',
                  locationCount: ${updatedLocations.length},
                  locations: ${JSON.stringify(updatedLocations)},
                  platform: 'android'
                }, '*');
              `);
            } else {
              await stopGeofencing();
              console.log('Geofencing stopped');
              webViewRef.current?.injectJavaScript(`
                window.postMessage({ 
                  type: 'GEOFENCE_ENABLE_RESPONSE', 
                  success: true,
                  enabled: false
                }, '*');
              `);
              
              // Send updated status
              const updatedLocations = await loadStoreLocations();
              webViewRef.current?.injectJavaScript(`
                window.postMessage({ 
                  type: 'GEOFENCING_STATUS', 
                  isActive: false,
                  permissionStatus: 'granted',
                  locationCount: ${updatedLocations.length},
                  locations: ${JSON.stringify(updatedLocations)},
                  platform: 'android'
                }, '*');
              `);
            }
          } catch (error) {
            console.error('Error toggling geofencing:', error);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'GEOFENCE_ENABLE_RESPONSE', 
                success: false,
                error: 'Failed to toggle notifications'
              }, '*');
            `);
          }
          break;

        case 'natively.geofence.requestPermission':
          console.log('User requesting location permission from web (profile page)');
          try {
            const permissionGranted = await LocationHandler.requestLocationPermission();
            console.log('Location permission granted:', permissionGranted);
            
            // Update local state
            setLocationPermissionStatus(permissionGranted ? 'granted' : 'denied');
            
            // Send response to web
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'GEOFENCE_PERMISSION_RESPONSE', 
                foreground: ${permissionGranted},
                background: ${permissionGranted},
                permissionStatus: '${permissionGranted ? 'granted' : 'denied'}',
                status: '${permissionGranted ? 'granted' : 'denied'}'
              }, '*');
            `);
            
            // Also send updated permissions status
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'PERMISSIONS_STATUS', 
                contacts: '${contactsPermissionStatus}',
                location: '${permissionGranted ? 'granted' : 'denied'}'
              }, '*');
            `);
          } catch (error) {
            console.error('Error requesting location permission:', error);
            setLocationPermissionStatus('denied');
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'GEOFENCE_PERMISSION_RESPONSE', 
                foreground: false,
                background: false,
                permissionStatus: 'denied',
                status: 'denied',
                error: 'Failed to request permission'
              }, '*');
            `);
          }
          break;

        case 'natively.geofence.getStatus':
          console.log('Web requesting geofencing status');
          const locations = await loadStoreLocations();
          webViewRef.current?.injectJavaScript(`
            window.postMessage({ 
              type: 'GEOFENCE_STATUS_RESPONSE', 
              isActive: ${isGeofencingActive},
              permissionStatus: '${geofencePermissionStatus ? 'granted' : 'denied'}',
              locationCount: ${locations.length},
              locations: ${JSON.stringify(locations)},
              platform: 'android'
            }, '*');
          `);
          break;

        case 'natively.geofence.add':
          console.log('User adding geofence from web:', data.location);
          try {
            await addStoreLocation(data.location);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'GEOFENCE_ADD_RESPONSE', 
                success: true,
                locationId: '${data.location.id}'
              }, '*');
            `);
            
            // Send updated status
            const updatedLocations = await loadStoreLocations();
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'GEOFENCING_STATUS', 
                isActive: ${isGeofencingActive},
                permissionStatus: 'granted',
                locationCount: ${updatedLocations.length},
                locations: ${JSON.stringify(updatedLocations)},
                platform: 'android'
              }, '*');
            `);
          } catch (error) {
            console.error('Error adding geofence:', error);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'GEOFENCE_ADD_RESPONSE', 
                success: false,
                error: 'Failed to add location'
              }, '*');
            `);
          }
          break;

        case 'natively.geofence.remove':
          console.log('User removing geofence from web:', data.locationId);
          try {
            await removeStoreLocation(data.locationId);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'GEOFENCE_REMOVE_RESPONSE', 
                success: true,
                locationId: '${data.locationId}'
              }, '*');
            `);
            
            // Send updated status
            const updatedLocations = await loadStoreLocations();
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'GEOFENCING_STATUS', 
                isActive: ${isGeofencingActive},
                permissionStatus: 'granted',
                locationCount: ${updatedLocations.length},
                locations: ${JSON.stringify(updatedLocations)},
                platform: 'android'
              }, '*');
            `);
          } catch (error) {
            console.error('Error removing geofence:', error);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'GEOFENCE_REMOVE_RESPONSE', 
                success: false,
                error: 'Failed to remove location'
              }, '*');
            `);
          }
          break;

        case 'natively.geofence.getAll':
          console.log('Web requesting all monitored locations');
          const allLocations = await loadStoreLocations();
          console.log(`Sending ${allLocations.length} monitored locations to web`);
          webViewRef.current?.injectJavaScript(`
            window.postMessage({ 
              type: 'GEOFENCE_LIST_RESPONSE', 
              locations: ${JSON.stringify(allLocations)}
            }, '*');
          `);
          break;

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
          console.log('User requested contacts permission from web (profile page or contacts page)');
          try {
            const permissionGranted = await ContactsHandler.requestContactsPermission();
            console.log('Contacts permission granted:', permissionGranted);
            
            // Update local state
            setContactsPermissionStatus(permissionGranted ? 'granted' : 'denied');
            
            // Send response to web
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'CONTACTS_PERMISSION_RESPONSE', 
                granted: ${permissionGranted},
                status: '${permissionGranted ? 'granted' : 'denied'}'
              }, '*');
            `);
            
            // Also send updated permissions status
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'PERMISSIONS_STATUS', 
                contacts: '${permissionGranted ? 'granted' : 'denied'}',
                location: '${locationPermissionStatus}'
              }, '*');
            `);
          } catch (error) {
            console.error('Error requesting contacts permission:', error);
            setContactsPermissionStatus('denied');
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'CONTACTS_PERMISSION_RESPONSE', 
                granted: false,
                status: 'denied',
                error: 'Failed to request permission'
              }, '*');
            `);
          }
          break;
          
        case 'natively.contacts.getAll':
          console.log('User requested to import all contacts from web');
          const hasPermission = await ContactsHandler.hasContactsPermission();
          if (!hasPermission) {
            console.log('No contacts permission, requesting...');
            const granted = await ContactsHandler.requestContactsPermission();
            setContactsPermissionStatus(granted ? 'granted' : 'denied');
            
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
          
        case 'natively.location.requestPermission':
          console.log('User requested location permission from web');
          const locationPermissionGranted = await LocationHandler.requestLocationPermission();
          setLocationPermissionStatus(locationPermissionGranted ? 'granted' : 'denied');
          webViewRef.current?.injectJavaScript(`
            window.postMessage({ 
              type: 'LOCATION_PERMISSION_RESPONSE', 
              granted: ${locationPermissionGranted},
              status: '${locationPermissionGranted ? 'granted' : 'denied'}'
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
      console.log('[Native App Android] Initializing native app bridge...');
      
      // Set flag that we're in native app
      window.isNativeApp = true;
      window.nativeAppPlatform = 'android';
      
      // Store for tracking if we've already sent ready message
      if (!window.nativeAppInitialized) {
        window.nativeAppInitialized = true;
        
        // Notify parent that web page is ready to receive messages
        window.postMessage({ 
          type: 'WEB_PAGE_READY',
          timestamp: Date.now()
        }, '*');
        
        console.log('[Native App Android] Sent WEB_PAGE_READY message');
      }
      
      // Hide any "Download App" banners, prompts, "Products in the News", and "Quick Tip" messages
      const hideUnwantedElements = () => {
        // Common selectors for app download banners and unwanted elements
        const selectors = [
          '[data-download-app]',
          '[class*="download-app"]',
          '[class*="app-banner"]',
          '[class*="install-app"]',
          '[class*="get-app"]',
          '[class*="mobile-app"]',
          '[id*="download-app"]',
          '[id*="app-banner"]',
          '[id*="install-app"]',
          '[id*="get-app"]',
          '.app-download-banner',
          '.download-banner',
          '.install-banner',
          '.get-app-banner',
          '.mobile-app-banner',
          'a[href*="download"]',
          'a[href*="get-app"]',
          'button[class*="download"]',
          'button[class*="get-app"]',
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
            el.style.visibility = 'hidden';
            el.style.opacity = '0';
            el.style.height = '0';
            el.style.overflow = 'hidden';
            el.remove();
          });
        });
        
        // Also hide by text content (more aggressive)
        const allElements = document.querySelectorAll('div, p, span, a, button, li, section, article, nav, header');
        allElements.forEach(el => {
          const text = el.textContent?.toLowerCase() || '';
          const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
          const title = el.getAttribute('title')?.toLowerCase() || '';
          const combinedText = text + ' ' + ariaLabel + ' ' + title;
          
          // Hide "Download App" or "Get App" elements
          if (combinedText.includes('download app') || 
              combinedText.includes('get app') || 
              combinedText.includes('install app') ||
              combinedText.includes('download the app') ||
              combinedText.includes('get the app')) {
            el.style.display = 'none';
            el.style.visibility = 'hidden';
            el.style.opacity = '0';
            el.style.height = '0';
            el.style.overflow = 'hidden';
            
            // Also hide parent if it's a list item or nav item
            if (el.parentElement?.tagName === 'LI' || el.parentElement?.tagName === 'NAV') {
              el.parentElement.style.display = 'none';
            }
          }
          
          // Hide "Products in the News" links
          if (combinedText.includes('products in the news') || combinedText.includes('products in news')) {
            el.style.display = 'none';
            el.style.visibility = 'hidden';
            if (el.parentElement?.tagName === 'LI') {
              el.parentElement.style.display = 'none';
            }
          }
          
          // Hide "Quick Tip" messages about Click-&-Add
          if (combinedText.includes('quick tip') && (combinedText.includes('click') || combinedText.includes('add') || combinedText.includes('install'))) {
            el.style.display = 'none';
            el.style.visibility = 'hidden';
            el.style.opacity = '0';
            el.style.height = '0';
            el.style.overflow = 'hidden';
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
      
      // Use MutationObserver for more efficient detection
      const observer = new MutationObserver(hideUnwantedElements);
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // Notify the website that we're in native app with all features including geofencing
      window.postMessage({ 
        type: 'NATIVE_APP_READY', 
        platform: 'android',
        features: ['contacts', 'camera', 'sharing', 'notifications', 'offline', 'accountDeletion', 'microphone', 'audioRecording', 'location', 'geofencing', 'locationNotifications', 'quickActions']
      }, '*');
      
      console.log('[Native App Android] Native app bridge initialized - geofencing and quick actions features available');
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
    paddingTop: 48,
  },
  webview: {
    flex: 1,
  },
});
