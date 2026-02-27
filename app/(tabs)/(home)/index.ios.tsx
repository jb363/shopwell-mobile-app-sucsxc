
import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View, Platform, Alert } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const [currentRecording, setCurrentRecording] = useState<Audio.Recording | null>(null);
  const [contactsPermissionStatus, setContactsPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');

  // Initialize hooks with error handling
  let expoPushToken = '';
  let isSyncing = false;
  let queueSize = 0;
  let isOnline = true;
  let manualSync = async () => false;
  let isGeofencingActive = false;
  let geofencePermissionStatus = false;
  let storeLocations: any[] = [];
  let addStoreLocation = async (store: any) => {};
  let removeStoreLocation = async (storeId: string) => {};
  let loadStoreLocations = async () => [];
  let startGeofencing = async () => false;
  let stopGeofencing = async () => {};

  try {
    const notificationsHook = useNotifications();
    expoPushToken = notificationsHook.expoPushToken;
  } catch (error) {
    console.error('Error initializing notifications hook:', error);
  }

  try {
    const offlineSyncHook = useOfflineSync();
    isSyncing = offlineSyncHook.isSyncing;
    queueSize = offlineSyncHook.queueSize;
    isOnline = offlineSyncHook.isOnline;
    manualSync = offlineSyncHook.manualSync;
  } catch (error) {
    console.error('Error initializing offline sync hook:', error);
  }

  // DO NOT initialize tracking permission hook here
  // It will be handled on-demand when the user requests it from the web

  try {
    const geofencingHook = useGeofencing();
    isGeofencingActive = geofencingHook.isActive;
    geofencePermissionStatus = geofencingHook.hasPermission;
    storeLocations = geofencingHook.storeLocations;
    addStoreLocation = geofencingHook.addStoreLocation;
    removeStoreLocation = geofencingHook.removeStoreLocation;
    loadStoreLocations = geofencingHook.loadStoreLocations;
    startGeofencing = geofencingHook.startGeofencing;
    stopGeofencing = geofencingHook.stopGeofencing;
  } catch (error) {
    console.error('Error initializing geofencing hook:', error);
  }

  // Set up quick actions (app shortcuts)
  try {
    useQuickActions(webViewRef);
  } catch (error) {
    console.error('Error initializing quick actions:', error);
  }

  // Handle shared content from share-target screen
  useEffect(() => {
    try {
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
    } catch (error) {
      console.error('Error handling shared content:', error);
    }
  }, [params.sharedContent, params.sharedType]);

  // Check initial permission statuses
  useEffect(() => {
    async function checkPermissions() {
      try {
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
      } catch (error) {
        console.error('Error checking permissions:', error);
      }
    }
    
    checkPermissions();
  }, []);

  useEffect(() => {
    try {
      if (expoPushToken && webViewRef.current) {
        console.log('Sending push token to web:', expoPushToken);
        webViewRef.current.injectJavaScript(`
          window.postMessage({ type: 'PUSH_TOKEN', token: '${expoPushToken}' }, '*');
        `);
      }
    } catch (error) {
      console.error('Error sending push token:', error);
    }
  }, [expoPushToken]);

  useEffect(() => {
    try {
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
    } catch (error) {
      console.error('Error sending sync status:', error);
    }
  }, [isSyncing, queueSize, isOnline]);

  useEffect(() => {
    try {
      // Send geofencing status to web
      if (webViewRef.current) {
        console.log('Sending geofencing status to web:', { isGeofencingActive, geofencePermissionStatus });
        const permissionStatusStr = geofencePermissionStatus ? 'granted' : 'denied';
        webViewRef.current.injectJavaScript(`
          window.postMessage({ 
            type: 'GEOFENCING_STATUS', 
            isActive: ${isGeofencingActive},
            permissionStatus: '${permissionStatusStr}'
          }, '*');
        `);
      }
    } catch (error) {
      console.error('Error sending geofencing status:', error);
    }
  }, [isGeofencingActive, geofencePermissionStatus]);

  // Send permission statuses to web when they change
  useEffect(() => {
    try {
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
    } catch (error) {
      console.error('Error sending permission statuses:', error);
    }
  }, [contactsPermissionStatus, locationPermissionStatus]);

  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('iOS received message from web:', data.type);
      
      switch (data.type) {
        case 'natively.list.addToHomeScreen':
          console.log('User requested to add list to home screen:', data.list);
          try {
            const listName = data.list?.name || 'Shopping List';
            const listUrl = data.list?.url || `${SHOPWELL_URL}/lists/${data.list?.id}`;
            
            // On iOS, we can share the URL which allows the user to add it to home screen
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
                  message: 'Share dialog opened. Select "Add to Home Screen" from the share sheet.'
                }, '*');
              `);
            } else {
              console.log('Sharing not available on this device');
              webViewRef.current?.injectJavaScript(`
                window.postMessage({ 
                  type: 'LIST_ADD_TO_HOME_SCREEN_RESPONSE', 
                  success: false,
                  error: 'Sharing not available on this device'
                }, '*');
              `);
            }
          } catch (error) {
            console.error('Error adding list to home screen:', error);
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
                granted: ${permissionGranted},
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
                granted: false,
                status: 'denied',
                error: 'Failed to request permission'
              }, '*');
            `);
          }
          break;

        case 'natively.geofence.getStatus':
          console.log('Web requesting geofencing status');
          try {
            const locations = await loadStoreLocations();
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'GEOFENCE_STATUS_RESPONSE', 
                isActive: ${isGeofencingActive},
                permissionStatus: '${geofencePermissionStatus ? 'granted' : 'denied'}',
                locationCount: ${locations.length},
                locations: ${JSON.stringify(locations)}
              }, '*');
            `);
          } catch (error) {
            console.error('Error getting geofence status:', error);
          }
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
          try {
            const allLocations = await loadStoreLocations();
            console.log(`Sending ${allLocations.length} monitored locations to web`);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'GEOFENCE_LIST_RESPONSE', 
                locations: ${JSON.stringify(allLocations)}
              }, '*');
            `);
          } catch (error) {
            console.error('Error getting all geofences:', error);
          }
          break;

        case 'natively.microphone.requestPermission':
          console.log('User requested microphone permission from web');
          try {
            const micPermissionGranted = await AudioHandler.requestMicrophonePermission();
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'MICROPHONE_PERMISSION_RESPONSE', 
                granted: ${micPermissionGranted}
              }, '*');
            `);
          } catch (error) {
            console.error('Error requesting microphone permission:', error);
          }
          break;

        case 'natively.audio.startRecording':
          console.log('User initiated audio recording from web');
          try {
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
          } catch (error) {
            console.error('Error starting audio recording:', error);
          }
          break;

        case 'natively.audio.stopRecording':
          console.log('User stopped audio recording from web');
          try {
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
          } catch (error) {
            console.error('Error stopping audio recording:', error);
          }
          break;

        case 'natively.audio.pauseRecording':
          console.log('User paused audio recording from web');
          try {
            if (currentRecording) {
              const paused = await AudioHandler.pauseRecording(currentRecording);
              webViewRef.current?.injectJavaScript(`
                window.postMessage({ 
                  type: 'AUDIO_RECORDING_PAUSED', 
                  success: ${paused}
                }, '*');
              `);
            }
          } catch (error) {
            console.error('Error pausing audio recording:', error);
          }
          break;

        case 'natively.audio.resumeRecording':
          console.log('User resumed audio recording from web');
          try {
            if (currentRecording) {
              const resumed = await AudioHandler.resumeRecording(currentRecording);
              webViewRef.current?.injectJavaScript(`
                window.postMessage({ 
                  type: 'AUDIO_RECORDING_RESUMED', 
                  success: ${resumed}
                }, '*');
              `);
            }
          } catch (error) {
            console.error('Error resuming audio recording:', error);
          }
          break;

        case 'natively.audio.getStatus':
          try {
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
          } catch (error) {
            console.error('Error getting audio status:', error);
          }
          break;

        case 'natively.tracking.requestPermission':
          console.log('User requested tracking permission from web');
          try {
            // Import the tracking permission function dynamically to avoid crashes
            const { requestTrackingPermission } = await import('@/hooks/useTrackingPermission.ios');
            const granted = await requestTrackingPermission();
            console.log('Tracking permission result:', granted);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'TRACKING_PERMISSION_RESPONSE', 
                granted: ${granted},
                status: '${granted ? 'granted' : 'denied'}'
              }, '*');
            `);
          } catch (error) {
            console.error('Error requesting tracking permission:', error);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'TRACKING_PERMISSION_RESPONSE', 
                granted: false,
                status: 'denied',
                error: 'Failed to request permission'
              }, '*');
            `);
          }
          break;

        case 'natively.tracking.getStatus':
          console.log('User requested tracking status from web');
          try {
            // Import the tracking transparency module dynamically
            const { getTrackingStatus } = await import('@/hooks/useTrackingPermission.ios');
            const status = await getTrackingStatus();
            console.log('Current tracking status:', status);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'TRACKING_STATUS_RESPONSE', 
                status: '${status}'
              }, '*');
            `);
          } catch (error) {
            console.error('Error getting tracking status:', error);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'TRACKING_STATUS_RESPONSE', 
                status: 'unknown',
                error: 'Failed to get status'
              }, '*');
            `);
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
          try {
            const text = await Clipboard.getStringAsync();
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ type: 'CLIPBOARD_READ_RESPONSE', text: '${text}' }, '*');
            `);
          } catch (error) {
            console.error('Error reading clipboard:', error);
          }
          break;
          
        case 'natively.clipboard.write':
          try {
            await Clipboard.setStringAsync(data.text);
          } catch (error) {
            console.error('Error writing to clipboard:', error);
          }
          break;
          
        case 'natively.haptic.trigger':
          try {
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
          } catch (error) {
            console.error('Error triggering haptic:', error);
          }
          break;
          
        case 'natively.share':
          try {
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(data.url || data.message);
            }
          } catch (error) {
            console.error('Error sharing:', error);
          }
          break;
          
        case 'natively.imagePicker':
          try {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 1,
            });
            if (!result.canceled) {
              webViewRef.current?.injectJavaScript(`
                window.postMessage({ type: 'IMAGE_SELECTED', uri: '${result.assets[0].uri}' }, '*');
              `);
            }
          } catch (error) {
            console.error('Error picking image:', error);
          }
          break;
          
        case 'natively.scanner.open':
          try {
            router.push('/scanner');
          } catch (error) {
            console.error('Error opening scanner:', error);
          }
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
          try {
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
          } catch (error) {
            console.error('Error getting contacts:', error);
          }
          break;
          
        case 'natively.contacts.search':
          console.log('User searching contacts with query:', data.query);
          try {
            const searchResults = await ContactsHandler.searchContacts(data.query || '');
            console.log(`Found ${searchResults.length} matching contacts`);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'CONTACTS_SEARCH_RESPONSE', 
                contacts: ${JSON.stringify(searchResults)},
                query: '${data.query || ''}'
              }, '*');
            `);
          } catch (error) {
            console.error('Error searching contacts:', error);
          }
          break;
          
        case 'natively.storage.get':
          try {
            const storedValue = await OfflineStorage.getItem(data.key);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'STORAGE_GET_RESPONSE', 
                key: '${data.key}',
                value: ${JSON.stringify(storedValue)}
              }, '*');
            `);
          } catch (error) {
            console.error('Error getting storage item:', error);
          }
          break;
          
        case 'natively.storage.set':
          try {
            await OfflineStorage.setItem(data.key, data.value);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'STORAGE_SET_RESPONSE', 
                key: '${data.key}',
                success: true
              }, '*');
            `);
          } catch (error) {
            console.error('Error setting storage item:', error);
          }
          break;
          
        case 'natively.storage.remove':
          try {
            await OfflineStorage.removeItem(data.key);
          } catch (error) {
            console.error('Error removing storage item:', error);
          }
          break;
          
        case 'natively.sync.manual':
          try {
            const syncSuccess = await manualSync();
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'SYNC_MANUAL_RESPONSE', 
                success: ${syncSuccess}
              }, '*');
            `);
          } catch (error) {
            console.error('Error manual sync:', error);
          }
          break;
          
        case 'natively.lists.save':
          try {
            await OfflineStorage.saveShoppingList(data.list);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'LIST_SAVE_RESPONSE', 
                success: true,
                listId: '${data.list.id}'
              }, '*');
            `);
          } catch (error) {
            console.error('Error saving list:', error);
          }
          break;
          
        case 'natively.lists.get':
          try {
            const lists = await OfflineStorage.getShoppingLists();
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'LISTS_GET_RESPONSE', 
                lists: ${JSON.stringify(lists)}
              }, '*');
            `);
          } catch (error) {
            console.error('Error getting lists:', error);
          }
          break;
          
        case 'natively.lists.delete':
          try {
            await OfflineStorage.deleteShoppingList(data.listId);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'LIST_DELETE_RESPONSE', 
                success: true,
                listId: '${data.listId}'
              }, '*');
            `);
          } catch (error) {
            console.error('Error deleting list:', error);
          }
          break;
          
        case 'natively.location.requestPermission':
          console.log('User requested location permission from web');
          try {
            const locationPermissionGranted = await LocationHandler.requestLocationPermission();
            setLocationPermissionStatus(locationPermissionGranted ? 'granted' : 'denied');
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'LOCATION_PERMISSION_RESPONSE', 
                granted: ${locationPermissionGranted},
                status: '${locationPermissionGranted ? 'granted' : 'denied'}'
              }, '*');
            `);
          } catch (error) {
            console.error('Error requesting location permission:', error);
          }
          break;
          
        case 'natively.location.getCurrent':
          console.log('User requested current location from web');
          try {
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
          } catch (error) {
            console.error('Error getting current location:', error);
          }
          break;
          
        case 'natively.product.cache':
          try {
            await OfflineStorage.cacheProduct(data.product);
          } catch (error) {
            console.error('Error caching product:', error);
          }
          break;
          
        case 'natively.product.getCached':
          try {
            const cachedProduct = await OfflineStorage.getCachedProduct(data.barcode);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'PRODUCT_CACHED_RESPONSE', 
                barcode: '${data.barcode}',
                product: ${JSON.stringify(cachedProduct)}
              }, '*');
            `);
          } catch (error) {
            console.error('Error getting cached product:', error);
          }
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
      console.log('[Native App iOS] Initializing native app bridge...');
      
      // Set flag that we're in native app
      window.isNativeApp = true;
      window.nativeAppPlatform = 'ios';
      
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
      
      window.postMessage({ 
        type: 'NATIVE_APP_READY', 
        platform: 'ios',
        features: ['contacts', 'camera', 'sharing', 'notifications', 'offline', 'accountDeletion', 'tracking', 'microphone', 'audioRecording', 'location', 'geofencing', 'locationNotifications', 'quickActions', 'addToHomeScreen']
      }, '*');
      
      console.log('[Native App iOS] Native app bridge initialized - all features available');
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
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
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
