
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
  console.log('[Android HomeScreen] Component mounting');
  
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
  const [isNativeReady, setIsNativeReady] = useState(false);

  // Set up quick actions (app shortcuts)
  useQuickActions(webViewRef);

  // Signal to website that native app is ready to receive messages
  useEffect(() => {
    if (!isNativeReady && webViewRef.current) {
      console.log('[Android HomeScreen] ✅ Native app is ready, signaling to website...');
      setIsNativeReady(true);
      
      // Send ready signal to website
      setTimeout(() => {
        try {
          webViewRef.current?.injectJavaScript(`
            window.postMessage({ 
              type: 'NATIVE_APP_READY', 
              platform: 'android',
              timestamp: Date.now(),
              features: ['contacts', 'camera', 'sharing', 'notifications', 'offline', 'accountDeletion', 'microphone', 'audioRecording', 'location', 'geofencing', 'locationNotifications', 'quickActions', 'addToHomeScreen']
            }, '*');
            console.log('[Native App Android] Sent NATIVE_APP_READY signal to website');
          `);
        } catch (error) {
          console.error('[Android HomeScreen] Error sending ready signal:', error);
        }
      }, 500);
    }
  }, [isNativeReady]);

  // Handle shared content from share-target screen
  useEffect(() => {
    if (params.sharedContent && params.sharedType && webViewRef.current) {
      console.log('[Android HomeScreen] Received shared content:', { type: params.sharedType, content: params.sharedContent });
      
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

  // DO NOT check permissions automatically on mount
  // Permissions will be checked only when the user explicitly requests them
  // This prevents crashes where early permission checks fail
  console.log('[Android HomeScreen] Skipping automatic permission checks - will request in context when needed');

  useEffect(() => {
    if (expoPushToken && webViewRef.current) {
      console.log('[Android HomeScreen] Sending push token to web:', expoPushToken);
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
      console.log('[Android HomeScreen] Sending geofencing status to web:', { 
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
      console.log('[Android HomeScreen] Sending permission statuses to web:', { contactsPermissionStatus, locationPermissionStatus });
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
      console.log('[Android HomeScreen] Received message from web:', data.type);
      
      // Ignore messages until native app is ready
      if (!isNativeReady && !data.type?.startsWith('WEB_')) {
        console.log('[Android HomeScreen] ⚠️ Native app not ready yet, ignoring message:', data.type);
        return;
      }
      
      switch (data.type) {
        case 'WEB_PAGE_READY':
          console.log('[Android HomeScreen] Website signals it is ready');
          // Re-send ready signal and current status to ensure website knows we're ready
          webViewRef.current?.injectJavaScript(`
            window.postMessage({ 
              type: 'NATIVE_APP_READY', 
              platform: 'android',
              timestamp: Date.now(),
              features: ['contacts', 'camera', 'sharing', 'notifications', 'offline', 'accountDeletion', 'microphone', 'audioRecording', 'location', 'geofencing', 'locationNotifications', 'quickActions', 'addToHomeScreen']
            }, '*');
          `);
          
          // Also send current geofencing status
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

        case 'natively.list.addToHomeScreen':
          console.log('[Android HomeScreen] User requested to add list to home screen:', data.list);
          try {
            const listName = data.list?.name || 'Shopping List';
            const listUrl = data.list?.url || `${SHOPWELL_URL}/lists/${data.list?.id}`;
            
            // On Android, we can share the URL which allows the user to add it to home screen
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(listUrl, {
                dialogTitle: `Add "${listName}" to Home Screen`,
              });
              
              // Provide haptic feedback
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              
              webViewRef.current?.injectJavaScript(`
                window.postMessage({ 
                  type: 'LIST_ADD_TO_HOME_SCREEN_RESPONSE', 
                  success: true,
                  listId: '${data.list?.id}',
                  message: 'Share dialog opened. Select "Add to Home screen" from the options.'
                }, '*');
              `);
            } else {
              console.log('[Android HomeScreen] Sharing not available on this device');
              webViewRef.current?.injectJavaScript(`
                window.postMessage({ 
                  type: 'LIST_ADD_TO_HOME_SCREEN_RESPONSE', 
                  success: false,
                  error: 'Sharing not available on this device'
                }, '*');
              `);
            }
          } catch (error) {
            console.error('[Android HomeScreen] Error adding list to home screen:', error);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'LIST_ADD_TO_HOME_SCREEN_RESPONSE', 
                success: false,
                error: 'Failed to add list to home screen'
              }, '*');
            `);
          }
          break;

        case 'natively.geofence.enableNotifications':
          console.log('[Android HomeScreen] User toggling location-based notifications from web:', data.enabled);
          try {
            if (data.enabled) {
              const started = await startGeofencing();
              console.log('[Android HomeScreen] Geofencing started:', started);
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
              console.log('[Android HomeScreen] Geofencing stopped');
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
            console.error('[Android HomeScreen] Error toggling geofencing:', error);
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
          console.log('[Android HomeScreen] User requesting location permission from web (profile page)');
          try {
            // Show user-friendly explanation before requesting permission
            Alert.alert(
              'Location Permission',
              'ShopWell needs access to your location to notify you when you\'re near stores with active shopping lists or reservations. This helps you remember to pick up items when you\'re nearby.',
              [
                {
                  text: 'Not Now',
                  style: 'cancel',
                  onPress: () => {
                    console.log('[Android HomeScreen] User declined location permission prompt');
                    setLocationPermissionStatus('denied');
                    webViewRef.current?.injectJavaScript(`
                      window.postMessage({ 
                        type: 'GEOFENCE_PERMISSION_RESPONSE', 
                        foreground: false,
                        background: false,
                        permissionStatus: 'denied',
                        status: 'denied',
                        userCancelled: true
                      }, '*');
                    `);
                  }
                },
                {
                  text: 'Allow',
                  onPress: async () => {
                    console.log('[Android HomeScreen] User accepted location permission prompt, requesting permission...');
                    try {
                      const permissionGranted = await LocationHandler.requestLocationPermission();
                      console.log('[Android HomeScreen] Location permission granted:', permissionGranted);
                      
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
                    } catch (permError) {
                      console.error('[Android HomeScreen] Error requesting location permission:', permError);
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
                  }
                }
              ]
            );
          } catch (error) {
            console.error('[Android HomeScreen] Error showing location permission prompt:', error);
            setLocationPermissionStatus('denied');
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'GEOFENCE_PERMISSION_RESPONSE', 
                foreground: false,
                background: false,
                permissionStatus: 'denied',
                status: 'denied',
                error: 'Failed to show permission prompt'
              }, '*');
            `);
          }
          break;

        case 'natively.geofence.getStatus':
          console.log('[Android HomeScreen] Web requesting geofencing status');
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
          console.log('[Android HomeScreen] User adding geofence from web:', data.location);
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
            console.error('[Android HomeScreen] Error adding geofence:', error);
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
          console.log('[Android HomeScreen] User removing geofence from web:', data.locationId);
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
            console.error('[Android HomeScreen] Error removing geofence:', error);
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
          console.log('[Android HomeScreen] Web requesting all monitored locations');
          const allLocations = await loadStoreLocations();
          console.log(`[Android HomeScreen] Sending ${allLocations.length} monitored locations to web`);
          webViewRef.current?.injectJavaScript(`
            window.postMessage({ 
              type: 'GEOFENCE_LIST_RESPONSE', 
              locations: ${JSON.stringify(allLocations)}
            }, '*');
          `);
          break;

        case 'natively.microphone.requestPermission':
          console.log('[Android HomeScreen] User requested microphone permission from web');
          try {
            // Show user-friendly explanation before requesting permission
            Alert.alert(
              'Microphone Permission',
              'ShopWell needs access to your microphone to record voice notes for your shopping lists. This helps you quickly add items by speaking instead of typing.',
              [
                {
                  text: 'Not Now',
                  style: 'cancel',
                  onPress: () => {
                    console.log('[Android HomeScreen] User declined microphone permission prompt');
                    webViewRef.current?.injectJavaScript(`
                      window.postMessage({ 
                        type: 'MICROPHONE_PERMISSION_RESPONSE', 
                        granted: false,
                        userCancelled: true
                      }, '*');
                    `);
                  }
                },
                {
                  text: 'Allow',
                  onPress: async () => {
                    console.log('[Android HomeScreen] User accepted microphone permission prompt, requesting permission...');
                    try {
                      const micPermissionGranted = await AudioHandler.requestMicrophonePermission();
                      console.log('[Android HomeScreen] Microphone permission granted:', micPermissionGranted);
                      webViewRef.current?.injectJavaScript(`
                        window.postMessage({ 
                          type: 'MICROPHONE_PERMISSION_RESPONSE', 
                          granted: ${micPermissionGranted}
                        }, '*');
                      `);
                    } catch (permError) {
                      console.error('[Android HomeScreen] Error requesting microphone permission:', permError);
                      webViewRef.current?.injectJavaScript(`
                        window.postMessage({ 
                          type: 'MICROPHONE_PERMISSION_RESPONSE', 
                          granted: false,
                          error: 'Failed to request permission'
                        }, '*');
                      `);
                    }
                  }
                }
              ]
            );
          } catch (error) {
            console.error('[Android HomeScreen] Error showing microphone permission prompt:', error);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'MICROPHONE_PERMISSION_RESPONSE', 
                granted: false,
                error: 'Failed to show permission prompt'
              }, '*');
            `);
          }
          break;

        case 'natively.audio.startRecording':
          console.log('[Android HomeScreen] User initiated audio recording from web');
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
          console.log('[Android HomeScreen] User stopped audio recording from web');
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
          console.log('[Android HomeScreen] User paused audio recording from web');
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
          console.log('[Android HomeScreen] User resumed audio recording from web');
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
          console.log('[Android HomeScreen] User initiated account deletion from web');
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
                  console.log('[Android HomeScreen] User confirmed account deletion');
                  await OfflineStorage.clearAll();
                  console.log('[Android HomeScreen] Cleared all local storage');
                  
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
          console.log('[Android HomeScreen] User requested contacts permission from web (profile page or contacts page)');
          try {
            // Show user-friendly explanation before requesting permission
            Alert.alert(
              'Contacts Permission',
              'ShopWell would like to access your contacts to help you share shopping lists and collaborate with friends and family. Your contacts will never be uploaded to our servers without your explicit permission.',
              [
                {
                  text: 'Not Now',
                  style: 'cancel',
                  onPress: () => {
                    console.log('[Android HomeScreen] User declined contacts permission prompt');
                    setContactsPermissionStatus('denied');
                    webViewRef.current?.injectJavaScript(`
                      window.postMessage({ 
                        type: 'CONTACTS_PERMISSION_RESPONSE', 
                        granted: false,
                        status: 'denied',
                        userCancelled: true
                      }, '*');
                    `);
                  }
                },
                {
                  text: 'Allow',
                  onPress: async () => {
                    console.log('[Android HomeScreen] User accepted contacts permission prompt, requesting permission...');
                    try {
                      const permissionGranted = await ContactsHandler.requestContactsPermission();
                      console.log('[Android HomeScreen] Contacts permission granted:', permissionGranted);
                      
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
                    } catch (permError) {
                      console.error('[Android HomeScreen] Error requesting contacts permission:', permError);
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
                  }
                }
              ]
            );
          } catch (error) {
            console.error('[Android HomeScreen] Error showing contacts permission prompt:', error);
            setContactsPermissionStatus('denied');
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'CONTACTS_PERMISSION_RESPONSE', 
                granted: false,
                status: 'denied',
                error: 'Failed to show permission prompt'
              }, '*');
            `);
          }
          break;
          
        case 'natively.contacts.getAll':
          console.log('[Android HomeScreen] User requested to import all contacts from web');
          try {
            const hasPermission = await ContactsHandler.hasContactsPermission();
            if (!hasPermission) {
              console.log('[Android HomeScreen] No contacts permission, showing prompt...');
              
              // Show user-friendly explanation before requesting permission
              Alert.alert(
                'Import Contacts',
                'ShopWell would like to access your contacts to help you share shopping lists. Your contacts will never be uploaded to our servers without your explicit permission.',
                [
                  {
                    text: 'Cancel',
                    style: 'cancel',
                    onPress: () => {
                      console.log('[Android HomeScreen] User cancelled contacts import');
                      setContactsPermissionStatus('denied');
                      webViewRef.current?.injectJavaScript(`
                        window.postMessage({ 
                          type: 'CONTACTS_GET_ALL_RESPONSE', 
                          contacts: [],
                          error: 'Permission denied',
                          userCancelled: true
                        }, '*');
                      `);
                    }
                  },
                  {
                    text: 'Allow',
                    onPress: async () => {
                      console.log('[Android HomeScreen] User accepted, requesting contacts permission...');
                      try {
                        const granted = await ContactsHandler.requestContactsPermission();
                        setContactsPermissionStatus(granted ? 'granted' : 'denied');
                        
                        if (!granted) {
                          console.log('[Android HomeScreen] Contacts permission denied by system');
                          webViewRef.current?.injectJavaScript(`
                            window.postMessage({ 
                              type: 'CONTACTS_GET_ALL_RESPONSE', 
                              contacts: [],
                              error: 'Permission denied'
                            }, '*');
                          `);
                          return;
                        }
                        
                        const allContacts = await ContactsHandler.getAllContacts();
                        console.log(`[Android HomeScreen] Sending ${allContacts.length} contacts to web`);
                        webViewRef.current?.injectJavaScript(`
                          window.postMessage({ 
                            type: 'CONTACTS_GET_ALL_RESPONSE', 
                            contacts: ${JSON.stringify(allContacts)}
                          }, '*');
                        `);
                      } catch (permError) {
                        console.error('[Android HomeScreen] Error requesting contacts permission:', permError);
                        webViewRef.current?.injectJavaScript(`
                          window.postMessage({ 
                            type: 'CONTACTS_GET_ALL_RESPONSE', 
                            contacts: [],
                            error: 'Failed to request permission'
                          }, '*');
                        `);
                      }
                    }
                  }
                ]
              );
            } else {
              // Already have permission, just get contacts
              const allContacts = await ContactsHandler.getAllContacts();
              console.log(`[Android HomeScreen] Sending ${allContacts.length} contacts to web`);
              webViewRef.current?.injectJavaScript(`
                window.postMessage({ 
                  type: 'CONTACTS_GET_ALL_RESPONSE', 
                  contacts: ${JSON.stringify(allContacts)}
                }, '*');
              `);
            }
          } catch (error) {
            console.error('[Android HomeScreen] Error getting contacts:', error);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'CONTACTS_GET_ALL_RESPONSE', 
                contacts: [],
                error: 'Failed to get contacts'
              }, '*');
            `);
          }
          break;
          
        case 'natively.contacts.search':
          console.log('[Android HomeScreen] User searching contacts with query:', data.query);
          const searchResults = await ContactsHandler.searchContacts(data.query || '');
          console.log(`[Android HomeScreen] Found ${searchResults.length} matching contacts`);
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
          console.log('[Android HomeScreen] User requested location permission from web');
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
          console.log('[Android HomeScreen] User requested current location from web');
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
          console.log('[Android HomeScreen] Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('[Android HomeScreen] Error handling message:', error);
    }
  };

  // JavaScript to inject that tells the website it's running in native app
  const injectedJavaScript = `
    (function() {
      console.log('[Native App Android] Initializing native app bridge...');
      
      // Set flag that we're in native app
      window.isNativeApp = true;
      window.nativeAppPlatform = 'android';
      window.nativeAppReady = false;
      
      // Queue for messages sent before native app is ready
      window.nativelyMessageQueue = [];
      
      // Override postMessage to queue messages until native is ready
      const originalPostMessage = window.postMessage;
      window.postMessage = function(message, targetOrigin) {
        if (typeof message === 'object' && message.type && message.type.startsWith('natively.')) {
          if (!window.nativeAppReady) {
            console.log('[Native App Android] Queueing message (native not ready):', message.type);
            window.nativelyMessageQueue.push({ message, targetOrigin });
            return;
          }
        }
        originalPostMessage.call(window, message, targetOrigin);
      };
      
      // Listen for native ready signal
      window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'NATIVE_APP_READY') {
          console.log('[Native App Android] Native app is ready! Processing queued messages...');
          window.nativeAppReady = true;
          
          // Process queued messages
          const queue = window.nativelyMessageQueue;
          window.nativelyMessageQueue = [];
          queue.forEach(function(item) {
            console.log('[Native App Android] Processing queued message:', item.message.type);
            originalPostMessage.call(window, item.message, item.targetOrigin);
          });
        }
      });
      
      // Notify native that web page is ready
      setTimeout(function() {
        originalPostMessage.call(window, { 
          type: 'WEB_PAGE_READY',
          timestamp: Date.now()
        }, '*');
        console.log('[Native App Android] Sent WEB_PAGE_READY signal to native');
      }, 100);
      
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
          '[data-products-news]',
          '[class*="products-news"]',
          '[class*="products-in-news"]',
          '[id*="products-news"]',
          '[id*="products-in-news"]',
          'a[href*="/news"]',
          'a[href*="/products-news"]',
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
        
        const allElements = document.querySelectorAll('div, p, span, a, button, li, section, article, nav, header');
        allElements.forEach(el => {
          const text = el.textContent?.toLowerCase() || '';
          const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
          const title = el.getAttribute('title')?.toLowerCase() || '';
          const combinedText = text + ' ' + ariaLabel + ' ' + title;
          
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
            
            if (el.parentElement?.tagName === 'LI' || el.parentElement?.tagName === 'NAV') {
              el.parentElement.style.display = 'none';
            }
          }
          
          if (combinedText.includes('products in the news') || combinedText.includes('products in news')) {
            el.style.display = 'none';
            el.style.visibility = 'hidden';
            if (el.parentElement?.tagName === 'LI') {
              el.parentElement.style.display = 'none';
            }
          }
          
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
      
      hideUnwantedElements();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hideUnwantedElements);
      }
      
      setInterval(hideUnwantedElements, 1000);
      
      const observer = new MutationObserver(hideUnwantedElements);
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      console.log('[Native App Android] Native app bridge initialized - waiting for NATIVE_APP_READY signal');
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
          console.log('[Android HomeScreen] WebView finished loading');
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
