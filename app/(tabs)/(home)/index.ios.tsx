
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
import { crashReporter } from '@/utils/crashReporter';

const SHOPWELL_URL = 'https://shopwell.ai';

export default function HomeScreen() {
  console.log('[iOS HomeScreen] ═══════════════════════════════════════');
  console.log('[iOS HomeScreen] COMPONENT MOUNTING');
  console.log('[iOS HomeScreen] ═══════════════════════════════════════');
  console.log('[iOS HomeScreen] Timestamp:', new Date().toISOString());
  console.log('[iOS HomeScreen] Platform:', Platform.OS, Platform.Version);
  
  const webViewRef = useRef<WebView>(null);
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [currentRecording, setCurrentRecording] = useState<Audio.Recording | null>(null);
  const [contactsPermissionStatus, setContactsPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');

  console.log('[iOS HomeScreen] State initialized');
  console.log('[iOS HomeScreen] Safe area insets:', JSON.stringify(insets));

  // CRITICAL: Hooks MUST be called unconditionally at the top level
  // React Hooks cannot be wrapped in try-catch or conditionals
  console.log('[iOS HomeScreen] Initializing hooks...');
  const notificationsHook = useNotifications();
  const offlineSyncHook = useOfflineSync();
  const geofencingHook = useGeofencing();
  
  // Set up quick actions (app shortcuts) - MUST be called unconditionally
  useQuickActions(webViewRef);
  
  console.log('[iOS HomeScreen] ✅ All hooks initialized successfully');

  // Extract values from hooks
  const expoPushToken = notificationsHook.expoPushToken;
  const isSyncing = offlineSyncHook.isSyncing;
  const queueSize = offlineSyncHook.queueSize;
  const isOnline = offlineSyncHook.isOnline;
  const manualSync = offlineSyncHook.manualSync;
  const isGeofencingActive = geofencingHook.isActive;
  const geofencePermissionStatus = geofencingHook.hasPermission;
  const storeLocations = geofencingHook.storeLocations;
  const addStoreLocation = geofencingHook.addStoreLocation;
  const removeStoreLocation = geofencingHook.removeStoreLocation;
  const loadStoreLocations = geofencingHook.loadStoreLocations;
  const startGeofencing = geofencingHook.startGeofencing;
  const stopGeofencing = geofencingHook.stopGeofencing;

  console.log('[iOS HomeScreen] Hook values:', {
    hasExpoPushToken: !!expoPushToken,
    isSyncing,
    queueSize,
    isOnline,
    isGeofencingActive,
    geofencePermissionStatus,
    storeLocationsCount: storeLocations.length,
  });

  // Handle shared content from share-target screen
  useEffect(() => {
    try {
      if (params.sharedContent && params.sharedType && webViewRef.current) {
        console.log('[iOS HomeScreen] Received shared content:', { type: params.sharedType, content: params.sharedContent });
        
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
      console.error('[iOS HomeScreen] Error handling shared content:', error);
      if (error instanceof Error) {
        crashReporter.logCrash(error, { location: 'sharedContentHandler' });
      }
    }
  }, [params.sharedContent, params.sharedType]);

  // DO NOT check permissions automatically on mount
  // Permissions will be checked only when the user explicitly requests them
  // This prevents crashes on iOS 16.7.14 where early permission checks fail
  console.log('[iOS HomeScreen] Skipping automatic permission checks - will request in context when needed');

  useEffect(() => {
    try {
      if (expoPushToken && webViewRef.current) {
        console.log('[iOS HomeScreen] Sending push token to web:', expoPushToken);
        webViewRef.current.injectJavaScript(`
          window.postMessage({ type: 'PUSH_TOKEN', token: '${expoPushToken}' }, '*');
        `);
      }
    } catch (error) {
      console.error('[iOS HomeScreen] Error sending push token:', error);
      if (error instanceof Error) {
        crashReporter.logCrash(error, { location: 'sendPushToken' });
      }
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
      console.error('[iOS HomeScreen] Error sending sync status:', error);
      if (error instanceof Error) {
        crashReporter.logCrash(error, { location: 'sendSyncStatus' });
      }
    }
  }, [isSyncing, queueSize, isOnline]);

  useEffect(() => {
    try {
      // Send geofencing status to web
      if (webViewRef.current) {
        console.log('[iOS HomeScreen] Sending geofencing status to web:', { isGeofencingActive, geofencePermissionStatus });
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
      console.error('[iOS HomeScreen] Error sending geofencing status:', error);
      if (error instanceof Error) {
        crashReporter.logCrash(error, { location: 'sendGeofencingStatus' });
      }
    }
  }, [isGeofencingActive, geofencePermissionStatus]);

  // Send permission statuses to web when they change
  useEffect(() => {
    try {
      if (webViewRef.current) {
        console.log('[iOS HomeScreen] Sending permission statuses to web:', { contactsPermissionStatus, locationPermissionStatus });
        webViewRef.current.injectJavaScript(`
          window.postMessage({ 
            type: 'PERMISSIONS_STATUS', 
            contacts: '${contactsPermissionStatus}',
            location: '${locationPermissionStatus}'
          }, '*');
        `);
      }
    } catch (error) {
      console.error('[iOS HomeScreen] Error sending permission statuses:', error);
      if (error instanceof Error) {
        crashReporter.logCrash(error, { location: 'sendPermissionStatuses' });
      }
    }
  }, [contactsPermissionStatus, locationPermissionStatus]);

  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('[iOS HomeScreen] Received message from web:', data.type);
      
      switch (data.type) {
        case 'natively.list.addToHomeScreen':
          console.log('[iOS HomeScreen] User requested to add list to home screen:', data.list);
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
              console.log('[iOS HomeScreen] Sharing not available on this device');
              webViewRef.current?.injectJavaScript(`
                window.postMessage({ 
                  type: 'LIST_ADD_TO_HOME_SCREEN_RESPONSE', 
                  success: false,
                  error: 'Sharing not available on this device'
                }, '*');
              `);
            }
          } catch (error) {
            console.error('[iOS HomeScreen] Error adding list to home screen:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'addToHomeScreen', listId: data.list?.id });
            }
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
          console.log('[iOS HomeScreen] User toggling location-based notifications from web:', data.enabled);
          try {
            if (data.enabled) {
              const started = await startGeofencing();
              console.log('[iOS HomeScreen] Geofencing started:', started);
              webViewRef.current?.injectJavaScript(`
                window.postMessage({ 
                  type: 'GEOFENCE_ENABLE_RESPONSE', 
                  success: ${started},
                  enabled: ${started}
                }, '*');
              `);
            } else {
              await stopGeofencing();
              console.log('[iOS HomeScreen] Geofencing stopped');
              webViewRef.current?.injectJavaScript(`
                window.postMessage({ 
                  type: 'GEOFENCE_ENABLE_RESPONSE', 
                  success: true,
                  enabled: false
                }, '*');
              `);
            }
          } catch (error) {
            console.error('[iOS HomeScreen] Error toggling geofencing:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'toggleGeofencing', enabled: data.enabled });
            }
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
          console.log('[iOS HomeScreen] User requesting location permission from web (profile page)');
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
                    console.log('[iOS HomeScreen] User declined location permission prompt');
                    setLocationPermissionStatus('denied');
                    webViewRef.current?.injectJavaScript(`
                      window.postMessage({ 
                        type: 'GEOFENCE_PERMISSION_RESPONSE', 
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
                    console.log('[iOS HomeScreen] User accepted location permission prompt, requesting permission...');
                    try {
                      const permissionGranted = await LocationHandler.requestLocationPermission();
                      console.log('[iOS HomeScreen] Location permission granted:', permissionGranted);
                      
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
                    } catch (permError) {
                      console.error('[iOS HomeScreen] Error requesting location permission:', permError);
                      if (permError instanceof Error) {
                        crashReporter.logCrash(permError, { location: 'requestLocationPermission' });
                      }
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
                  }
                }
              ]
            );
          } catch (error) {
            console.error('[iOS HomeScreen] Error showing location permission prompt:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'showLocationPermissionPrompt' });
            }
            setLocationPermissionStatus('denied');
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'GEOFENCE_PERMISSION_RESPONSE', 
                granted: false,
                status: 'denied',
                error: 'Failed to show permission prompt'
              }, '*');
            `);
          }
          break;

        case 'natively.geofence.getStatus':
          console.log('[iOS HomeScreen] Web requesting geofencing status');
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
            console.error('[iOS HomeScreen] Error getting geofence status:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'getGeofenceStatus' });
            }
          }
          break;

        case 'natively.geofence.add':
          console.log('[iOS HomeScreen] User adding geofence from web:', data.location);
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
            console.error('[iOS HomeScreen] Error adding geofence:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'addGeofence', locationId: data.location?.id });
            }
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
          console.log('[iOS HomeScreen] User removing geofence from web:', data.locationId);
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
            console.error('[iOS HomeScreen] Error removing geofence:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'removeGeofence', locationId: data.locationId });
            }
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
          console.log('[iOS HomeScreen] Web requesting all monitored locations');
          try {
            const allLocations = await loadStoreLocations();
            console.log(`[iOS HomeScreen] Sending ${allLocations.length} monitored locations to web`);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'GEOFENCE_LIST_RESPONSE', 
                locations: ${JSON.stringify(allLocations)}
              }, '*');
            `);
          } catch (error) {
            console.error('[iOS HomeScreen] Error getting all geofences:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'getAllGeofences' });
            }
          }
          break;

        case 'natively.microphone.requestPermission':
          console.log('[iOS HomeScreen] User requested microphone permission from web');
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
                    console.log('[iOS HomeScreen] User declined microphone permission prompt');
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
                    console.log('[iOS HomeScreen] User accepted microphone permission prompt, requesting permission...');
                    try {
                      const micPermissionGranted = await AudioHandler.requestMicrophonePermission();
                      console.log('[iOS HomeScreen] Microphone permission granted:', micPermissionGranted);
                      webViewRef.current?.injectJavaScript(`
                        window.postMessage({ 
                          type: 'MICROPHONE_PERMISSION_RESPONSE', 
                          granted: ${micPermissionGranted}
                        }, '*');
                      `);
                    } catch (permError) {
                      console.error('[iOS HomeScreen] Error requesting microphone permission:', permError);
                      if (permError instanceof Error) {
                        crashReporter.logCrash(permError, { location: 'requestMicrophonePermission' });
                      }
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
            console.error('[iOS HomeScreen] Error showing microphone permission prompt:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'showMicrophonePermissionPrompt' });
            }
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
          console.log('[iOS HomeScreen] User initiated audio recording from web');
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
            console.error('[iOS HomeScreen] Error starting audio recording:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'startAudioRecording' });
            }
          }
          break;

        case 'natively.audio.stopRecording':
          console.log('[iOS HomeScreen] User stopped audio recording from web');
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
            console.error('[iOS HomeScreen] Error stopping audio recording:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'stopAudioRecording' });
            }
          }
          break;

        case 'natively.audio.pauseRecording':
          console.log('[iOS HomeScreen] User paused audio recording from web');
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
            console.error('[iOS HomeScreen] Error pausing audio recording:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'pauseAudioRecording' });
            }
          }
          break;

        case 'natively.audio.resumeRecording':
          console.log('[iOS HomeScreen] User resumed audio recording from web');
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
            console.error('[iOS HomeScreen] Error resuming audio recording:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'resumeAudioRecording' });
            }
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
            console.error('[iOS HomeScreen] Error getting audio status:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'getAudioStatus' });
            }
          }
          break;

        case 'natively.tracking.requestPermission':
          console.log('[iOS HomeScreen] User requested tracking permission from web');
          try {
            // Import the tracking permission function dynamically to avoid crashes
            const { requestTrackingPermission } = await import('@/hooks/useTrackingPermission.ios');
            const granted = await requestTrackingPermission();
            console.log('[iOS HomeScreen] Tracking permission result:', granted);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'TRACKING_PERMISSION_RESPONSE', 
                granted: ${granted},
                status: '${granted ? 'granted' : 'denied'}'
              }, '*');
            `);
          } catch (error) {
            console.error('[iOS HomeScreen] Error requesting tracking permission:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'requestTrackingPermission' });
            }
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
          console.log('[iOS HomeScreen] User requested tracking status from web');
          try {
            // Import the tracking transparency module dynamically
            const { getTrackingStatus } = await import('@/hooks/useTrackingPermission.ios');
            const status = await getTrackingStatus();
            console.log('[iOS HomeScreen] Current tracking status:', status);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'TRACKING_STATUS_RESPONSE', 
                status: '${status}'
              }, '*');
            `);
          } catch (error) {
            console.error('[iOS HomeScreen] Error getting tracking status:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'getTrackingStatus' });
            }
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
          console.log('[iOS HomeScreen] User initiated account deletion from web');
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
                  console.log('[iOS HomeScreen] User confirmed account deletion');
                  await OfflineStorage.clearAll();
                  console.log('[iOS HomeScreen] Cleared all local storage');
                  
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
            console.error('[iOS HomeScreen] Error reading clipboard:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'readClipboard' });
            }
          }
          break;
          
        case 'natively.clipboard.write':
          try {
            await Clipboard.setStringAsync(data.text);
          } catch (error) {
            console.error('[iOS HomeScreen] Error writing to clipboard:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'writeClipboard' });
            }
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
            console.error('[iOS HomeScreen] Error triggering haptic:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'triggerHaptic', style: data.style });
            }
          }
          break;
          
        case 'natively.share':
          try {
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(data.url || data.message);
            }
          } catch (error) {
            console.error('[iOS HomeScreen] Error sharing:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'share' });
            }
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
            console.error('[iOS HomeScreen] Error picking image:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'imagePicker' });
            }
          }
          break;
          
        case 'natively.scanner.open':
          try {
            router.push('/scanner');
          } catch (error) {
            console.error('[iOS HomeScreen] Error opening scanner:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'openScanner' });
            }
          }
          break;
          
        case 'natively.contacts.requestPermission':
          console.log('[iOS HomeScreen] User requested contacts permission from web (profile page or contacts page)');
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
                    console.log('[iOS HomeScreen] User declined contacts permission prompt');
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
                    console.log('[iOS HomeScreen] User accepted contacts permission prompt, requesting permission...');
                    try {
                      const permissionGranted = await ContactsHandler.requestContactsPermission();
                      console.log('[iOS HomeScreen] Contacts permission granted:', permissionGranted);
                      
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
                      console.error('[iOS HomeScreen] Error requesting contacts permission:', permError);
                      if (permError instanceof Error) {
                        crashReporter.logCrash(permError, { location: 'requestContactsPermission' });
                      }
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
            console.error('[iOS HomeScreen] Error showing contacts permission prompt:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'showContactsPermissionPrompt' });
            }
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
          console.log('[iOS HomeScreen] User requested to import all contacts from web');
          try {
            const hasPermission = await ContactsHandler.hasContactsPermission();
            if (!hasPermission) {
              console.log('[iOS HomeScreen] No contacts permission, showing prompt...');
              
              // Show user-friendly explanation before requesting permission
              Alert.alert(
                'Import Contacts',
                'ShopWell would like to access your contacts to help you share shopping lists. Your contacts will never be uploaded to our servers without your explicit permission.',
                [
                  {
                    text: 'Cancel',
                    style: 'cancel',
                    onPress: () => {
                      console.log('[iOS HomeScreen] User cancelled contacts import');
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
                      console.log('[iOS HomeScreen] User accepted, requesting contacts permission...');
                      try {
                        const granted = await ContactsHandler.requestContactsPermission();
                        setContactsPermissionStatus(granted ? 'granted' : 'denied');
                        
                        if (!granted) {
                          console.log('[iOS HomeScreen] Contacts permission denied by system');
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
                        console.log(`[iOS HomeScreen] Sending ${allContacts.length} contacts to web`);
                        webViewRef.current?.injectJavaScript(`
                          window.postMessage({ 
                            type: 'CONTACTS_GET_ALL_RESPONSE', 
                            contacts: ${JSON.stringify(allContacts)}
                          }, '*');
                        `);
                      } catch (permError) {
                        console.error('[iOS HomeScreen] Error requesting contacts permission:', permError);
                        if (permError instanceof Error) {
                          crashReporter.logCrash(permError, { location: 'requestContactsForImport' });
                        }
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
              console.log(`[iOS HomeScreen] Sending ${allContacts.length} contacts to web`);
              webViewRef.current?.injectJavaScript(`
                window.postMessage({ 
                  type: 'CONTACTS_GET_ALL_RESPONSE', 
                  contacts: ${JSON.stringify(allContacts)}
                }, '*');
              `);
            }
          } catch (error) {
            console.error('[iOS HomeScreen] Error getting contacts:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'getAllContacts' });
            }
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
          console.log('[iOS HomeScreen] User searching contacts with query:', data.query);
          try {
            const searchResults = await ContactsHandler.searchContacts(data.query || '');
            console.log(`[iOS HomeScreen] Found ${searchResults.length} matching contacts`);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'CONTACTS_SEARCH_RESPONSE', 
                contacts: ${JSON.stringify(searchResults)},
                query: '${data.query || ''}'
              }, '*');
            `);
          } catch (error) {
            console.error('[iOS HomeScreen] Error searching contacts:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'searchContacts', query: data.query });
            }
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
            console.error('[iOS HomeScreen] Error getting storage item:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'getStorageItem', key: data.key });
            }
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
            console.error('[iOS HomeScreen] Error setting storage item:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'setStorageItem', key: data.key });
            }
          }
          break;
          
        case 'natively.storage.remove':
          try {
            await OfflineStorage.removeItem(data.key);
          } catch (error) {
            console.error('[iOS HomeScreen] Error removing storage item:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'removeStorageItem', key: data.key });
            }
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
            console.error('[iOS HomeScreen] Error manual sync:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'manualSync' });
            }
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
            console.error('[iOS HomeScreen] Error saving list:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'saveList', listId: data.list?.id });
            }
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
            console.error('[iOS HomeScreen] Error getting lists:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'getLists' });
            }
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
            console.error('[iOS HomeScreen] Error deleting list:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'deleteList', listId: data.listId });
            }
          }
          break;
          
        case 'natively.location.requestPermission':
          console.log('[iOS HomeScreen] User requested location permission from web');
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
            console.error('[iOS HomeScreen] Error requesting location permission:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'requestLocationPermission' });
            }
          }
          break;
          
        case 'natively.location.getCurrent':
          console.log('[iOS HomeScreen] User requested current location from web');
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
            console.error('[iOS HomeScreen] Error getting current location:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'getCurrentLocation' });
            }
          }
          break;
          
        case 'natively.product.cache':
          try {
            await OfflineStorage.cacheProduct(data.product);
          } catch (error) {
            console.error('[iOS HomeScreen] Error caching product:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'cacheProduct', productId: data.product?.id });
            }
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
            console.error('[iOS HomeScreen] Error getting cached product:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'getCachedProduct', barcode: data.barcode });
            }
          }
          break;
          
        default:
          console.log('[iOS HomeScreen] Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('[iOS HomeScreen] Error handling message:', error);
      if (error instanceof Error) {
        crashReporter.logCrash(error, { 
          location: 'handleMessage',
          messageData: event.nativeEvent.data,
        });
      }
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

  console.log('[iOS HomeScreen] Rendering WebView...');

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
        onLoadStart={() => {
          console.log('[iOS HomeScreen] WebView started loading');
        }}
        onLoadEnd={() => {
          console.log('[iOS HomeScreen] WebView finished loading');
          // Re-inject after page loads to ensure it takes effect
          try {
            if (webViewRef.current) {
              webViewRef.current.injectJavaScript(injectedJavaScript);
            }
          } catch (error) {
            console.error('[iOS HomeScreen] Error re-injecting JavaScript:', error);
            if (error instanceof Error) {
              crashReporter.logCrash(error, { location: 'webViewReInject' });
            }
          }
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('[iOS HomeScreen] ❌ WebView error:', nativeEvent);
          crashReporter.logCrash(new Error(`WebView error: ${nativeEvent.description}`), {
            location: 'webViewError',
            url: nativeEvent.url,
            code: nativeEvent.code,
          });
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('[iOS HomeScreen] ❌ WebView HTTP error:', nativeEvent.statusCode, nativeEvent.url);
          crashReporter.logCrash(new Error(`WebView HTTP error: ${nativeEvent.statusCode}`), {
            location: 'webViewHttpError',
            url: nativeEvent.url,
            statusCode: nativeEvent.statusCode,
            description: nativeEvent.description,
          });
        }}
        onRenderProcessGone={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('[iOS HomeScreen] ❌ WebView render process gone:', nativeEvent.didCrash);
          crashReporter.logCrash(new Error('WebView render process gone'), {
            location: 'webViewRenderProcessGone',
            didCrash: nativeEvent.didCrash,
          });
        }}
      />
    </View>
  );
}

console.log('[iOS HomeScreen] ✅ Module loaded successfully');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});
