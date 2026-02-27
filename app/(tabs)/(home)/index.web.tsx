
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
  }, [iframeReady, isGeofencingActive, geofencePermissionStatus, storeLocations, sendMessageToIframe]);

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
  }, [isGeofencingActive, geofencePermissionStatus, storeLocations, startGeofencing, stopGeofencing, addStoreLocation, removeStoreLocation, loadStoreLocations, sendMessageToIframe]);

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
