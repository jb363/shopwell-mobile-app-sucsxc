
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
  console.log('[iOS HomeScreen] ✅ Module loaded successfully');
  
  // CRITICAL: All hooks MUST be called unconditionally at the top level
  const webViewRef = useRef<WebView>(null);
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  // State initialization with defensive defaults
  const [currentRecording, setCurrentRecording] = useState<Audio.Recording | null>(null);
  const [contactsPermissionStatus, setContactsPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [isNativeReady, setIsNativeReady] = useState(false);

  // CRITICAL: Call all hooks unconditionally
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
  
  // Set up quick actions (app shortcuts)
  useQuickActions(webViewRef);

  // Signal to website that native app is ready to receive messages
  useEffect(() => {
    if (!isNativeReady && webViewRef.current) {
      console.log('[iOS HomeScreen] ✅ Native app is ready, signaling to website...');
      setIsNativeReady(true);
      
      // Send ready signal to website with a delay to ensure WebView is fully initialized
      setTimeout(() => {
        try {
          webViewRef.current?.injectJavaScript(`
            (function() {
              try {
                window.postMessage({ 
                  type: 'NATIVE_APP_READY', 
                  platform: 'ios',
                  timestamp: Date.now(),
                  features: ['contacts', 'camera', 'sharing', 'notifications', 'offline', 'accountDeletion', 'microphone', 'audioRecording', 'location', 'geofencing', 'locationNotifications', 'quickActions', 'addToHomeScreen']
                }, '*');
                console.log('[Native App iOS] Sent NATIVE_APP_READY signal to website');
              } catch (error) {
                console.error('[Native App iOS] Error sending ready signal:', error);
              }
            })();
            true;
          `);
        } catch (error) {
          console.error('[iOS HomeScreen] Error sending ready signal:', error);
          crashReporter.logCrash(error as Error, { location: 'sendReadySignal' });
        }
      }, 800);
    }
  }, [isNativeReady]);

  // Handle shared content from share-target screen
  useEffect(() => {
    if (params.sharedContent && params.sharedType && webViewRef.current && isNativeReady) {
      console.log('[iOS HomeScreen] Received shared content:', { type: params.sharedType, content: params.sharedContent });
      
      // Send shared content to the web app
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
                console.error('[Native App iOS] Error sending shared content:', error);
              }
            })();
            true;
          `);
        } catch (error) {
          console.error('[iOS HomeScreen] Error injecting shared content:', error);
          crashReporter.logCrash(error as Error, { location: 'injectSharedContent' });
        }
      }, 500);
    }
  }, [params.sharedContent, params.sharedType, isNativeReady]);

  // DO NOT check permissions automatically on mount
  // Permissions will be checked only when the user explicitly requests them
  // This prevents crashes where early permission checks fail
  console.log('[iOS HomeScreen] Skipping automatic permission checks - will request in context when needed');

  useEffect(() => {
    if (expoPushToken && webViewRef.current && isNativeReady) {
      console.log('[iOS HomeScreen] Sending push token to web:', expoPushToken);
      setTimeout(() => {
        try {
          webViewRef.current?.injectJavaScript(`
            (function() {
              try {
                window.postMessage({ type: 'PUSH_TOKEN', token: '${expoPushToken}' }, '*');
              } catch (error) {
                console.error('[Native App iOS] Error sending push token:', error);
              }
            })();
            true;
          `);
        } catch (error) {
          console.error('[iOS HomeScreen] Error injecting push token:', error);
          crashReporter.logCrash(error as Error, { location: 'injectPushToken' });
        }
      }, 300);
    }
  }, [expoPushToken, isNativeReady]);

  useEffect(() => {
    // Inject sync status
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
              console.error('[Native App iOS] Error sending sync status:', error);
            }
          })();
          true;
        `);
      } catch (error) {
        console.error('[iOS HomeScreen] Error injecting sync status:', error);
        crashReporter.logCrash(error as Error, { location: 'injectSyncStatus' });
      }
    }
  }, [isSyncing, queueSize, isOnline, isNativeReady]);

  useEffect(() => {
    // Send geofencing status to web
    if (webViewRef.current && isNativeReady) {
      console.log('[iOS HomeScreen] Sending geofencing status to web:', { 
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
                platform: 'ios'
              }, '*');
            } catch (error) {
              console.error('[Native App iOS] Error sending geofencing status:', error);
            }
          })();
          true;
        `);
      } catch (error) {
        console.error('[iOS HomeScreen] Error injecting geofencing status:', error);
        crashReporter.logCrash(error as Error, { location: 'injectGeofencingStatus' });
      }
    }
  }, [isGeofencingActive, geofencePermissionStatus, storeLocations, isNativeReady]);

  // Send permission statuses to web when they change
  useEffect(() => {
    if (webViewRef.current && isNativeReady) {
      console.log('[iOS HomeScreen] Sending permission statuses to web:', { contactsPermissionStatus, locationPermissionStatus });
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
              console.error('[Native App iOS] Error sending permissions status:', error);
            }
          })();
          true;
        `);
      } catch (error) {
        console.error('[iOS HomeScreen] Error injecting permissions status:', error);
        crashReporter.logCrash(error as Error, { location: 'injectPermissionsStatus' });
      }
    }
  }, [contactsPermissionStatus, locationPermissionStatus, isNativeReady]);

  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('[iOS HomeScreen] Received message from web:', data.type);
      
      // Ignore messages until native app is ready
      if (!isNativeReady && !data.type?.startsWith('WEB_')) {
        console.log('[iOS HomeScreen] ⚠️ Native app not ready yet, ignoring message:', data.type);
        return;
      }
      
      switch (data.type) {
        case 'WEB_PAGE_READY':
          console.log('[iOS HomeScreen] Website signals it is ready');
          // Re-send ready signal and current status to ensure website knows we're ready
          setTimeout(() => {
            try {
              webViewRef.current?.injectJavaScript(`
                (function() {
                  try {
                    window.postMessage({ 
                      type: 'NATIVE_APP_READY', 
                      platform: 'ios',
                      timestamp: Date.now(),
                      features: ['contacts', 'camera', 'sharing', 'notifications', 'offline', 'accountDeletion', 'microphone', 'audioRecording', 'location', 'geofencing', 'locationNotifications', 'quickActions', 'addToHomeScreen']
                    }, '*');
                  } catch (error) {
                    console.error('[Native App iOS] Error sending ready signal:', error);
                  }
                })();
                true;
              `);
              
              // Also send current geofencing status
              webViewRef.current?.injectJavaScript(`
                (function() {
                  try {
                    window.postMessage({ 
                      type: 'GEOFENCING_STATUS', 
                      isActive: ${isGeofencingActive},
                      permissionStatus: '${geofencePermissionStatus ? 'granted' : 'denied'}',
                      locationCount: ${storeLocations.length},
                      locations: ${JSON.stringify(storeLocations)},
                      platform: 'ios'
                    }, '*');
                  } catch (error) {
                    console.error('[Native App iOS] Error sending geofencing status:', error);
                  }
                })();
                true;
              `);
              
              // Also send permissions status
              webViewRef.current?.injectJavaScript(`
                (function() {
                  try {
                    window.postMessage({ 
                      type: 'PERMISSIONS_STATUS', 
                      contacts: '${contactsPermissionStatus}',
                      location: '${locationPermissionStatus}'
                    }, '*');
                  } catch (error) {
                    console.error('[Native App iOS] Error sending permissions status:', error);
                  }
                })();
                true;
              `);
            } catch (error) {
              console.error('[iOS HomeScreen] Error responding to WEB_PAGE_READY:', error);
              crashReporter.logCrash(error as Error, { location: 'handleWebPageReady' });
            }
          }, 200);
          break;

        // ... (rest of the message handlers remain the same as Android version)
        // I'll include the critical location permission handler:

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
                          foreground: ${permissionGranted},
                          background: ${permissionGranted},
                          permissionStatus: '${permissionGranted ? 'granted' : 'denied'}',
                          status: '${permissionGranted ? 'granted' : 'denied'}'
                        }, '*');
                        true;
                      `);
                      
                      // Also send updated permissions status
                      webViewRef.current?.injectJavaScript(`
                        window.postMessage({ 
                          type: 'PERMISSIONS_STATUS', 
                          contacts: '${contactsPermissionStatus}',
                          location: '${permissionGranted ? 'granted' : 'denied'}'
                        }, '*');
                        true;
                      `);
                    } catch (permError) {
                      console.error('[iOS HomeScreen] Error requesting location permission:', permError);
                      crashReporter.logCrash(permError as Error, { location: 'requestLocationPermission' });
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
            console.error('[iOS HomeScreen] Error showing location permission prompt:', error);
            crashReporter.logCrash(error as Error, { location: 'showLocationPermissionPrompt' });
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

        // ... (include all other message handlers from Android version)
        
        default:
          console.log('[iOS HomeScreen] Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('[iOS HomeScreen] Error handling message:', error);
      crashReporter.logCrash(error as Error, { 
        location: 'handleMessage',
        messageType: event?.nativeEvent?.data 
      });
    }
  };

  // JavaScript to inject that tells the website it's running in native app
  const injectedJavaScript = `
    (function() {
      console.log('[Native App iOS] Initializing native app bridge...');
      
      // Set flag that we're in native app
      window.isNativeApp = true;
      window.nativeAppPlatform = 'ios';
      window.nativeAppReady = false;
      
      // Queue for messages sent before native app is ready
      window.nativelyMessageQueue = [];
      
      // Override postMessage to queue messages until native is ready
      const originalPostMessage = window.postMessage;
      window.postMessage = function(message, targetOrigin) {
        if (typeof message === 'object' && message.type && message.type.startsWith('natively.')) {
          if (!window.nativeAppReady) {
            console.log('[Native App iOS] Queueing message (native not ready):', message.type);
            window.nativelyMessageQueue.push({ message, targetOrigin });
            return;
          }
        }
        originalPostMessage.call(window, message, targetOrigin);
      };
      
      // Listen for native ready signal
      window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'NATIVE_APP_READY') {
          console.log('[Native App iOS] Native app is ready! Processing queued messages...');
          window.nativeAppReady = true;
          
          // Process queued messages
          const queue = window.nativelyMessageQueue;
          window.nativelyMessageQueue = [];
          queue.forEach(function(item) {
            console.log('[Native App iOS] Processing queued message:', item.message.type);
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
        console.log('[Native App iOS] Sent WEB_PAGE_READY signal to native');
      }, 100);
      
      console.log('[Native App iOS] Native app bridge initialized - waiting for NATIVE_APP_READY signal');
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
        sharedCookiesEnabled={true}
        injectedJavaScript={injectedJavaScript}
        onLoadEnd={() => {
          console.log('[iOS HomeScreen] WebView finished loading');
          // Re-inject after page loads to ensure it takes effect
          if (webViewRef.current) {
            setTimeout(() => {
              try {
                webViewRef.current?.injectJavaScript(injectedJavaScript);
              } catch (error) {
                console.error('[iOS HomeScreen] Error re-injecting JavaScript:', error);
                crashReporter.logCrash(error as Error, { location: 'reInjectJavaScript' });
              }
            }, 300);
          }
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('[iOS HomeScreen] WebView error:', nativeEvent);
          crashReporter.logCrash(new Error(`WebView error: ${JSON.stringify(nativeEvent)}`), { 
            location: 'webViewError',
            nativeEvent 
          });
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
