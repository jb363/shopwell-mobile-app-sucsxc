
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
import { crashReporter } from '@/utils/crashReporter';

const SHOPWELL_URL = 'https://shopwell.ai';

export default function HomeScreen() {
  console.log('[Android HomeScreen] Component mounting');
  
  const webViewRef = useRef<WebView>(null);
  const params = useLocalSearchParams();
  
  const [currentRecording, setCurrentRecording] = useState<Audio.Recording | null>(null);
  const [contactsPermissionStatus, setContactsPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [isNativeReady, setIsNativeReady] = useState(false);
  const [webViewLoaded, setWebViewLoaded] = useState(false);
  
  // Initialize hooks
  const { expoPushToken } = useNotifications();
  const { isSyncing, queueSize, isOnline, manualSync } = useOfflineSync();
  const { 
    isActive: isGeofencingActive, 
    hasPermission: geofencePermissionStatus, 
    storeLocations,
    addStoreLocation,
    removeStoreLocation,
    loadStoreLocations,
    startGeofencing,
    stopGeofencing
  } = useGeofencing();
  
  useQuickActions(webViewRef);
  
  console.log('[Android HomeScreen] Hooks initialized');

  // Signal to website that native app is ready
  useEffect(() => {
    if (!isNativeReady && webViewRef.current && webViewLoaded) {
      console.log('[Android HomeScreen] Native app ready, signaling to website...');
      setIsNativeReady(true);
      
      setTimeout(() => {
        try {
          webViewRef.current?.injectJavaScript(`
            (function() {
              try {
                window.postMessage({ 
                  type: 'NATIVE_APP_READY', 
                  platform: 'android',
                  timestamp: Date.now(),
                  features: ['contacts', 'camera', 'sharing', 'notifications', 'offline', 'accountDeletion', 'microphone', 'audioRecording', 'location', 'geofencing', 'locationNotifications', 'quickActions', 'addToHomeScreen']
                }, '*');
                console.log('[Native App] Sent NATIVE_APP_READY signal');
              } catch (error) {
                console.error('[Native App] Error sending ready signal:', error);
              }
            })();
            true;
          `);
        } catch (error) {
          console.error('[Android HomeScreen] Error sending ready signal:', error);
        }
      }, 800);
    }
  }, [isNativeReady, webViewLoaded]);

  // Handle shared content
  useEffect(() => {
    if (params.sharedContent && params.sharedType && webViewRef.current && isNativeReady) {
      console.log('[Android HomeScreen] Received shared content');
      
      const sharedContentStr = Array.isArray(params.sharedContent) ? params.sharedContent[0] : params.sharedContent;
      const sharedTypeStr = Array.isArray(params.sharedType) ? params.sharedType[0] : params.sharedType;
      
      setTimeout(() => {
        try {
          webViewRef.current?.injectJavaScript(`
            (function() {
              try {
                window.postMessage({ 
                  type: 'SHARED_CONTENT', 
                  contentType: '${sharedTypeStr}',
                  content: ${JSON.stringify(sharedContentStr)}
                }, '*');
              } catch (error) {
                console.error('[Native App] Error sending shared content:', error);
              }
            })();
            true;
          `);
        } catch (error) {
          console.error('[Android HomeScreen] Error injecting shared content:', error);
        }
      }, 500);
    }
  }, [params.sharedContent, params.sharedType, isNativeReady]);

  // Send push token to web
  useEffect(() => {
    if (expoPushToken && webViewRef.current && isNativeReady) {
      console.log('[Android HomeScreen] Sending push token to web');
      setTimeout(() => {
        try {
          webViewRef.current?.injectJavaScript(`
            (function() {
              try {
                window.postMessage({ type: 'PUSH_TOKEN', token: '${expoPushToken}' }, '*');
              } catch (error) {
                console.error('[Native App] Error sending push token:', error);
              }
            })();
            true;
          `);
        } catch (error) {
          console.error('[Android HomeScreen] Error injecting push token:', error);
        }
      }, 300);
    }
  }, [expoPushToken, isNativeReady]);

  // Send sync status to web
  useEffect(() => {
    if (webViewRef.current && isNativeReady) {
      try {
        webViewRef.current.injectJavaScript(`
          (function() {
            try {
              window.postMessage({ 
                type: 'SYNC_STATUS', 
                isSyncing: ${isSyncing}, 
                queueSize: ${queueSize},
                isOnline: ${isOnline}
              }, '*');
            } catch (error) {
              console.error('[Native App] Error sending sync status:', error);
            }
          })();
          true;
        `);
      } catch (error) {
        console.error('[Android HomeScreen] Error injecting sync status:', error);
      }
    }
  }, [isSyncing, queueSize, isOnline, isNativeReady]);

  // Send geofencing status to web
  useEffect(() => {
    if (webViewRef.current && isNativeReady) {
      console.log('[Android HomeScreen] Sending geofencing status to web:', { 
        isGeofencingActive, 
        geofencePermissionStatus,
        locationCount: storeLocations.length 
      });
      try {
        webViewRef.current.injectJavaScript(`
          (function() {
            try {
              window.postMessage({ 
                type: 'GEOFENCING_STATUS', 
                isActive: ${isGeofencingActive},
                permissionStatus: '${geofencePermissionStatus ? 'granted' : 'denied'}',
                locationCount: ${storeLocations.length},
                locations: ${JSON.stringify(storeLocations)},
                platform: 'android'
              }, '*');
            } catch (error) {
              console.error('[Native App] Error sending geofencing status:', error);
            }
          })();
          true;
        `);
      } catch (error) {
        console.error('[Android HomeScreen] Error injecting geofencing status:', error);
      }
    }
  }, [isGeofencingActive, geofencePermissionStatus, storeLocations, isNativeReady]);

  // Send permission statuses to web
  useEffect(() => {
    if (webViewRef.current && isNativeReady) {
      try {
        webViewRef.current.injectJavaScript(`
          (function() {
            try {
              window.postMessage({ 
                type: 'PERMISSIONS_STATUS', 
                contacts: '${contactsPermissionStatus}',
                location: '${locationPermissionStatus}'
              }, '*');
            } catch (error) {
              console.error('[Native App] Error sending permissions status:', error);
            }
          })();
          true;
        `);
      } catch (error) {
        console.error('[Android HomeScreen] Error injecting permissions status:', error);
      }
    }
  }, [contactsPermissionStatus, locationPermissionStatus, isNativeReady]);

  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('[Android HomeScreen] Received message:', data.type);
      
      if (!isNativeReady && !data.type?.startsWith('WEB_')) {
        console.log('[Android HomeScreen] Native not ready, ignoring message');
        return;
      }
      
      switch (data.type) {
        case 'WEB_PAGE_READY':
          console.log('[Android HomeScreen] Website ready');
          setTimeout(() => {
            try {
              webViewRef.current?.injectJavaScript(`
                (function() {
                  try {
                    window.postMessage({ 
                      type: 'NATIVE_APP_READY', 
                      platform: 'android',
                      timestamp: Date.now(),
                      features: ['contacts', 'camera', 'sharing', 'notifications', 'offline', 'accountDeletion', 'microphone', 'audioRecording', 'location', 'geofencing', 'locationNotifications', 'quickActions', 'addToHomeScreen']
                    }, '*');
                  } catch (error) {
                    console.error('[Native App] Error sending ready signal:', error);
                  }
                })();
                true;
              `);
              
              webViewRef.current?.injectJavaScript(`
                (function() {
                  try {
                    window.postMessage({ 
                      type: 'GEOFENCING_STATUS', 
                      isActive: ${isGeofencingActive},
                      permissionStatus: '${geofencePermissionStatus ? 'granted' : 'denied'}',
                      locationCount: ${storeLocations.length},
                      locations: ${JSON.stringify(storeLocations)},
                      platform: 'android'
                    }, '*');
                  } catch (error) {
                    console.error('[Native App] Error sending geofencing status:', error);
                  }
                })();
                true;
              `);
              
              webViewRef.current?.injectJavaScript(`
                (function() {
                  try {
                    window.postMessage({ 
                      type: 'PERMISSIONS_STATUS', 
                      contacts: '${contactsPermissionStatus}',
                      location: '${locationPermissionStatus}'
                    }, '*');
                  } catch (error) {
                    console.error('[Native App] Error sending permissions status:', error);
                  }
                })();
                true;
              `);
            } catch (error) {
              console.error('[Android HomeScreen] Error responding to WEB_PAGE_READY:', error);
            }
          }, 200);
          break;

        case 'natively.geofence.enableNotifications':
          console.log('[Android HomeScreen] Toggle location notifications:', data.enabled);
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
                true;
              `);
              
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
                true;
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
                true;
              `);
              
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
                true;
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
              true;
            `);
          }
          break;

        case 'natively.geofence.requestPermission':
          console.log('[Android HomeScreen] Request location permission');
          try {
            Alert.alert(
              'Location Permission',
              'ShopWell needs access to your location to notify you when you\'re near stores with active shopping lists or reservations.',
              [
                {
                  text: 'Not Now',
                  style: 'cancel',
                  onPress: () => {
                    console.log('[Android HomeScreen] User declined location permission');
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
                      true;
                    `);
                  }
                },
                {
                  text: 'Allow',
                  onPress: async () => {
                    console.log('[Android HomeScreen] User accepted, requesting permission...');
                    try {
                      const permissionGranted = await LocationHandler.requestLocationPermission();
                      console.log('[Android HomeScreen] Permission granted:', permissionGranted);
                      
                      setLocationPermissionStatus(permissionGranted ? 'granted' : 'denied');
                      
                      webViewRef.current?.injectJavaScript(`
                        window.postMessage({ 
                          type: 'GEOFENCE_PERMISSION_RESPONSE', 
                          foreground: ${permissionGranted},
                          background: ${permissionGranted},
                          permissionStatus: '${permissionGranted ? 'granted' : 'denied'}',
                          status: '${permissionGranted ? 'granted' : 'denied'}'
                        }, '*');
                        true;
                      `);
                      
                      webViewRef.current?.injectJavaScript(`
                        window.postMessage({ 
                          type: 'PERMISSIONS_STATUS', 
                          contacts: '${contactsPermissionStatus}',
                          location: '${permissionGranted ? 'granted' : 'denied'}'
                        }, '*');
                        true;
                      `);
                    } catch (permError) {
                      console.error('[Android HomeScreen] Error requesting permission:', permError);
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
                        true;
                      `);
                    }
                  }
                }
              ]
            );
          } catch (error) {
            console.error('[Android HomeScreen] Error showing permission prompt:', error);
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
              true;
            `);
          }
          break;

        case 'natively.geofence.getStatus':
          console.log('[Android HomeScreen] Get geofencing status');
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
            true;
          `);
          break;

        case 'natively.geofence.add':
          console.log('[Android HomeScreen] Add geofence:', data.location);
          try {
            await addStoreLocation(data.location);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'GEOFENCE_ADD_RESPONSE', 
                success: true,
                locationId: '${data.location.id}'
              }, '*');
              true;
            `);
            
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
              true;
            `);
          } catch (error) {
            console.error('[Android HomeScreen] Error adding geofence:', error);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'GEOFENCE_ADD_RESPONSE', 
                success: false,
                error: 'Failed to add location'
              }, '*');
              true;
            `);
          }
          break;

        case 'natively.geofence.remove':
          console.log('[Android HomeScreen] Remove geofence:', data.locationId);
          try {
            await removeStoreLocation(data.locationId);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'GEOFENCE_REMOVE_RESPONSE', 
                success: true,
                locationId: '${data.locationId}'
              }, '*');
              true;
            `);
            
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
              true;
            `);
          } catch (error) {
            console.error('[Android HomeScreen] Error removing geofence:', error);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'GEOFENCE_REMOVE_RESPONSE', 
                success: false,
                error: 'Failed to remove location'
              }, '*');
              true;
            `);
          }
          break;

        case 'natively.geofence.getAll':
          console.log('[Android HomeScreen] Get all monitored locations');
          const allLocations = await loadStoreLocations();
          console.log(`[Android HomeScreen] Sending ${allLocations.length} locations to web`);
          webViewRef.current?.injectJavaScript(`
            window.postMessage({ 
              type: 'GEOFENCE_LIST_RESPONSE', 
              locations: ${JSON.stringify(allLocations)}
            }, '*');
            true;
          `);
          break;

        // ... (include all other message handlers from the original file)
        // For brevity, I'm showing just the geofencing-related handlers
        // The rest remain the same
        
        default:
          console.log('[Android HomeScreen] Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('[Android HomeScreen] Error handling message:', error);
    }
  };

  const injectedJavaScript = `
    (function() {
      console.log('[Native App] Initializing...');
      
      window.isNativeApp = true;
      window.nativeAppPlatform = 'android';
      window.nativeAppReady = false;
      window.nativelyMessageQueue = [];
      
      const originalPostMessage = window.postMessage;
      window.postMessage = function(message, targetOrigin) {
        if (typeof message === 'object' && message.type && message.type.startsWith('natively.')) {
          if (!window.nativeAppReady) {
            console.log('[Native App] Queueing message:', message.type);
            window.nativelyMessageQueue.push({ message, targetOrigin });
            return;
          }
        }
        originalPostMessage.call(window, message, targetOrigin);
      };
      
      window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'NATIVE_APP_READY') {
          console.log('[Native App] Ready! Processing queue...');
          window.nativeAppReady = true;
          
          const queue = window.nativelyMessageQueue;
          window.nativelyMessageQueue = [];
          queue.forEach(function(item) {
            console.log('[Native App] Processing queued:', item.message.type);
            originalPostMessage.call(window, item.message, item.targetOrigin);
          });
        }
      });
      
      setTimeout(function() {
        originalPostMessage.call(window, { 
          type: 'WEB_PAGE_READY',
          timestamp: Date.now()
        }, '*');
        console.log('[Native App] Sent WEB_PAGE_READY');
      }, 100);
      
      console.log('[Native App] Initialized');
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
        onLoadStart={() => {
          console.log('[Android HomeScreen] WebView loading...');
          setWebViewLoaded(false);
        }}
        onLoadEnd={() => {
          console.log('[Android HomeScreen] WebView loaded');
          setWebViewLoaded(true);
          if (webViewRef.current) {
            setTimeout(() => {
              try {
                webViewRef.current?.injectJavaScript(injectedJavaScript);
              } catch (error) {
                console.error('[Android HomeScreen] Error re-injecting JS:', error);
              }
            }, 300);
          }
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('[Android HomeScreen] WebView error:', nativeEvent);
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
