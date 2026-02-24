
import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useGeofencing } from '@/hooks/useGeofencing';

const SHOPWELL_URL = 'https://shopwell.ai';

export default function HomeScreen() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { 
    storeLocations, 
    isActive: isGeofencingActive, 
    hasPermission: geofencePermissionStatus,
    startGeofencing,
    stopGeofencing,
    addStoreLocation,
    removeStoreLocation,
    loadStoreLocations
  } = useGeofencing();

  const [iframeReady, setIframeReady] = useState(false);

  // Helper function to send messages to iframe with retry logic
  const sendMessageToIframe = (message: any, retries = 3) => {
    if (!iframeRef.current?.contentWindow) {
      console.warn('Iframe contentWindow not available');
      return;
    }

    try {
      console.log('Sending message to iframe:', message.type, message);
      iframeRef.current.contentWindow.postMessage(message, SHOPWELL_URL);
    } catch (error) {
      console.error('Error sending message to iframe:', error);
      if (retries > 0) {
        setTimeout(() => sendMessageToIframe(message, retries - 1), 500);
      }
    }
  };

  // Send status to web when iframe is ready or status changes
  useEffect(() => {
    if (!iframeReady || !iframeRef.current?.contentWindow) return;

    console.log('Sending geofencing status to web:', {
      isActive: isGeofencingActive,
      permissionStatus: geofencePermissionStatus ? 'granted' : 'denied',
      locationCount: storeLocations.length
    });

    // Send initial status to web with multiple attempts to ensure delivery
    const statusMessage = {
      type: 'GEOFENCING_STATUS',
      isActive: isGeofencingActive,
      permissionStatus: geofencePermissionStatus ? 'granted' : 'denied',
      locationCount: storeLocations.length,
      locations: storeLocations,
      platform: 'web',
      timestamp: Date.now()
    };

    // Send immediately
    sendMessageToIframe(statusMessage);
    
    // Send again after delays to catch late listeners
    setTimeout(() => sendMessageToIframe(statusMessage), 500);
    setTimeout(() => sendMessageToIframe(statusMessage), 1000);
    setTimeout(() => sendMessageToIframe(statusMessage), 2000);
  }, [iframeReady, isGeofencingActive, geofencePermissionStatus, storeLocations]);

  useEffect(() => {
    console.log('Web home screen mounted');
    
    // Listen for messages from the iframe
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== new URL(SHOPWELL_URL).origin) return;
      
      const data = event.data;
      console.log('Received message from web:', data);
      
      switch (data.type) {
        case 'WEB_PAGE_READY':
          console.log('Web page is ready, sending initial status');
          // Web page is ready to receive messages
          sendMessageToIframe({
            type: 'GEOFENCING_STATUS',
            isActive: isGeofencingActive,
            permissionStatus: geofencePermissionStatus ? 'granted' : 'denied',
            locationCount: storeLocations.length,
            locations: storeLocations,
            platform: 'web',
            timestamp: Date.now()
          });
          break;

        case 'natively.geofence.requestPermission':
          console.log('Web requesting location permission');
          try {
            // On web, we simulate permission request
            // In a real scenario, this would trigger browser geolocation permission
            const granted = true; // Web always has "permission" for localStorage-based geofencing
            
            sendMessageToIframe({
              type: 'GEOFENCE_PERMISSION_RESPONSE',
              foreground: granted,
              background: granted,
              permissionStatus: granted ? 'granted' : 'denied',
              timestamp: Date.now()
            });
          } catch (error) {
            console.error('Error requesting permission:', error);
            sendMessageToIframe({
              type: 'GEOFENCE_PERMISSION_RESPONSE',
              foreground: false,
              background: false,
              permissionStatus: 'denied',
              error: 'Failed to request permission',
              timestamp: Date.now()
            });
          }
          break;

        case 'natively.geofence.enableNotifications':
          console.log('Web requesting to toggle location notifications:', data.enabled);
          try {
            if (data.enabled) {
              const started = await startGeofencing();
              sendMessageToIframe({
                type: 'GEOFENCE_ENABLE_RESPONSE',
                success: started,
                enabled: started,
                timestamp: Date.now()
              });
              
              // Send updated status
              sendMessageToIframe({
                type: 'GEOFENCING_STATUS',
                isActive: started,
                permissionStatus: 'granted',
                locationCount: storeLocations.length,
                locations: storeLocations,
                platform: 'web',
                timestamp: Date.now()
              });
            } else {
              await stopGeofencing();
              sendMessageToIframe({
                type: 'GEOFENCE_ENABLE_RESPONSE',
                success: true,
                enabled: false,
                timestamp: Date.now()
              });
              
              // Send updated status
              sendMessageToIframe({
                type: 'GEOFENCING_STATUS',
                isActive: false,
                permissionStatus: 'granted',
                locationCount: storeLocations.length,
                locations: storeLocations,
                platform: 'web',
                timestamp: Date.now()
              });
            }
          } catch (error) {
            console.error('Error toggling geofencing:', error);
            sendMessageToIframe({
              type: 'GEOFENCE_ENABLE_RESPONSE',
              success: false,
              error: 'Failed to toggle notifications',
              timestamp: Date.now()
            });
          }
          break;

        case 'natively.geofence.getStatus':
          console.log('Web requesting geofencing status');
          const locations = await loadStoreLocations();
          sendMessageToIframe({
            type: 'GEOFENCE_STATUS_RESPONSE',
            isActive: isGeofencingActive,
            permissionStatus: geofencePermissionStatus ? 'granted' : 'denied',
            locationCount: locations.length,
            locations: locations,
            platform: 'web',
            timestamp: Date.now()
          });
          break;

        case 'natively.geofence.add':
          console.log('Web adding geofence:', data.location);
          try {
            await addStoreLocation(data.location);
            sendMessageToIframe({
              type: 'GEOFENCE_ADD_RESPONSE',
              success: true,
              locationId: data.location.id,
              timestamp: Date.now()
            });
            
            // Send updated status
            const updatedLocations = await loadStoreLocations();
            sendMessageToIframe({
              type: 'GEOFENCING_STATUS',
              isActive: isGeofencingActive,
              permissionStatus: 'granted',
              locationCount: updatedLocations.length,
              locations: updatedLocations,
              platform: 'web',
              timestamp: Date.now()
            });
          } catch (error) {
            console.error('Error adding geofence:', error);
            sendMessageToIframe({
              type: 'GEOFENCE_ADD_RESPONSE',
              success: false,
              error: 'Failed to add location',
              timestamp: Date.now()
            });
          }
          break;

        case 'natively.geofence.remove':
          console.log('Web removing geofence:', data.locationId);
          try {
            await removeStoreLocation(data.locationId);
            sendMessageToIframe({
              type: 'GEOFENCE_REMOVE_RESPONSE',
              success: true,
              locationId: data.locationId,
              timestamp: Date.now()
            });
            
            // Send updated status
            const updatedLocations = await loadStoreLocations();
            sendMessageToIframe({
              type: 'GEOFENCING_STATUS',
              isActive: isGeofencingActive,
              permissionStatus: 'granted',
              locationCount: updatedLocations.length,
              locations: updatedLocations,
              platform: 'web',
              timestamp: Date.now()
            });
          } catch (error) {
            console.error('Error removing geofence:', error);
            sendMessageToIframe({
              type: 'GEOFENCE_REMOVE_RESPONSE',
              success: false,
              error: 'Failed to remove location',
              timestamp: Date.now()
            });
          }
          break;

        case 'natively.geofence.getAll':
          console.log('Web requesting all monitored locations');
          const allLocations = await loadStoreLocations();
          sendMessageToIframe({
            type: 'GEOFENCE_LIST_RESPONSE',
            locations: allLocations,
            timestamp: Date.now()
          });
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Inject script to hide Quick Tip and other unwanted elements
    const injectHideScript = () => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        try {
          const script = `
            (function() {
              console.log('[Native App] Initializing native app bridge...');
              
              window.isNativeApp = true;
              window.nativeAppPlatform = 'web';
              
              // Store for tracking if we've already sent ready message
              if (!window.nativeAppInitialized) {
                window.nativeAppInitialized = true;
                
                // Notify parent that web page is ready to receive messages
                window.parent.postMessage({ 
                  type: 'WEB_PAGE_READY',
                  timestamp: Date.now()
                }, '*');
                
                console.log('[Native App] Sent WEB_PAGE_READY message to parent');
              }
              
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
                  try {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => {
                      el.style.display = 'none !important';
                      el.style.visibility = 'hidden !important';
                      el.style.opacity = '0 !important';
                      el.style.height = '0 !important';
                      el.style.overflow = 'hidden !important';
                    });
                  } catch (e) {
                    console.error('[Native App] Error hiding element:', selector, e);
                  }
                });
                
                try {
                  const allElements = document.querySelectorAll('div, p, span, a, button, li, section, article');
                  allElements.forEach(el => {
                    const text = el.textContent?.toLowerCase() || '';
                    
                    if (text.includes('products in the news') || text.includes('products in news')) {
                      el.style.display = 'none !important';
                      el.style.visibility = 'hidden !important';
                      if (el.parentElement?.tagName === 'LI') {
                        el.parentElement.style.display = 'none !important';
                      }
                    }
                    
                    if (text.includes('quick tip')) {
                      if (text.includes('click') || text.includes('add') || text.includes('install')) {
                        el.style.display = 'none !important';
                        el.style.visibility = 'hidden !important';
                        el.style.opacity = '0 !important';
                        el.style.height = '0 !important';
                        el.style.overflow = 'hidden !important';
                        
                        let parent = el.parentElement;
                        while (parent && parent !== document.body) {
                          const parentText = parent.textContent?.toLowerCase() || '';
                          if (parentText.includes('quick tip') && (parentText.includes('click') || parentText.includes('install'))) {
                            parent.style.display = 'none !important';
                            parent.style.visibility = 'hidden !important';
                          }
                          parent = parent.parentElement;
                        }
                      }
                    }
                    
                    if (text.includes('install now') && el.closest('[class*="tip"]')) {
                      let container = el.closest('[class*="tip"]');
                      if (container) {
                        container.style.display = 'none !important';
                        container.style.visibility = 'hidden !important';
                      }
                    }
                  });
                } catch (e) {
                  console.error('[Native App] Error hiding by text:', e);
                }
              };
              
              hideUnwantedElements();
              
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', hideUnwantedElements);
              }
              
              window.addEventListener('load', hideUnwantedElements);
              
              setInterval(hideUnwantedElements, 500);
              
              const observer = new MutationObserver(hideUnwantedElements);
              observer.observe(document.body, {
                childList: true,
                subtree: true
              });
              
              // Listen for messages from parent (native app)
              window.addEventListener('message', function(event) {
                console.log('[Native App] Received message from parent:', event.data.type);
                
                // Dispatch custom event so the web app can listen to it
                const customEvent = new CustomEvent('nativeAppMessage', {
                  detail: event.data
                });
                window.dispatchEvent(customEvent);
              });
              
              console.log('[Native App] Native app bridge initialized - geofencing features available');
            })();
          `;
          
          iframeRef.current.contentWindow.eval(script);
          console.log('Injected native app script into iframe');
          
          // Mark iframe as ready after script injection
          setIframeReady(true);
        } catch (error) {
          console.error('Error injecting script:', error);
        }
      }
    };

    const iframe = iframeRef.current;
    if (iframe) {
      iframe.addEventListener('load', () => {
        console.log('Iframe loaded, injecting native app script');
        setTimeout(injectHideScript, 100);
        setTimeout(injectHideScript, 500);
        setTimeout(injectHideScript, 1000);
        setTimeout(injectHideScript, 2000);
      });
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [isGeofencingActive, geofencePermissionStatus, storeLocations, startGeofencing, stopGeofencing, addStoreLocation, removeStoreLocation, loadStoreLocations]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <iframe
        ref={iframeRef}
        src={SHOPWELL_URL}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
        }}
        title="ShopWell.ai"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
  },
});
</write file>

Now I need to verify that the iOS and Android implementations are also properly sending these messages. Let me check those files:I can see the issue now! The iOS and Android implementations are missing a critical function `getMonitoredStoreLocations` from the `useGeofencing` hook. Let me check the hook to see what's available:

The hook exports `loadStoreLocations` but the iOS/Android files are trying to call `getMonitoredStoreLocations` which doesn't exist. Let me fix both platform files:

<write file="app/(tabs)/(home)/index.ios.tsx">
import React, { useRef, useEffect, useState } from 'react';
import { StyleSheet, View, Platform, Alert } from 'react-native';
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

const SHOPWELL_URL = 'https://shopwell.ai';

export default function HomeScreen() {
  const webViewRef = useRef<WebView>(null);
  const { expoPushToken } = useNotifications();
  const { isSyncing, queueSize, isOnline, manualSync } = useOfflineSync();
  const { trackingStatus } = useTrackingPermission();
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
  const insets = useSafeAreaInsets();
  const [currentRecording, setCurrentRecording] = useState<Audio.Recording | null>(null);

  useEffect(() => {
    if (expoPushToken && webViewRef.current) {
      console.log('Sending push token to web:', expoPushToken);
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
          platform: 'ios'
        }, '*');
      `);
    }
  }, [isGeofencingActive, geofencePermissionStatus, storeLocations]);

  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('iOS received message from web:', data.type);
      
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
              platform: 'ios'
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
                  platform: 'ios'
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
                  platform: 'ios'
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
          console.log('User requesting location permission from web');
          try {
            const permissionGranted = await LocationHandler.requestLocationPermission();
            console.log('Location permission granted:', permissionGranted);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'GEOFENCE_PERMISSION_RESPONSE', 
                foreground: ${permissionGranted},
                background: ${permissionGranted},
                permissionStatus: '${permissionGranted ? 'granted' : 'denied'}'
              }, '*');
            `);
          } catch (error) {
            console.error('Error requesting location permission:', error);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'GEOFENCE_PERMISSION_RESPONSE', 
                foreground: false,
                background: false,
                permissionStatus: 'denied',
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
              platform: 'ios'
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
                platform: 'ios'
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
                platform: 'ios'
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
      console.log('[Native App iOS] Initializing native app bridge...');
      
      // Set flag that we're in native app
      window.isNativeApp = true;
      window.nativeAppPlatform = 'ios';
      
      // Store for tracking if we've already sent ready message
      if (!window.nativeAppInitialized) {
        window.nativeAppInitialized = true;
        
        // Notify parent that web page is ready to receive messages
        window.postMessage({ 
          type: 'WEB_PAGE_READY',
          timestamp: Date.now()
        }, '*');
        
        console.log('[Native App iOS] Sent WEB_PAGE_READY message');
      }
      
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
      
      // Notify the website that we're in native app with all features including geofencing
      window.postMessage({ 
        type: 'NATIVE_APP_READY', 
        platform: 'ios',
        features: ['contacts', 'camera', 'sharing', 'notifications', 'offline', 'accountDeletion', 'tracking', 'microphone', 'audioRecording', 'location', 'geofencing', 'locationNotifications']
      }, '*');
      
      console.log('[Native App iOS] Native app bridge initialized - geofencing features available');
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
