
import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useGeofencing } from '@/hooks/useGeofencing';

const SHOPWELL_URL = 'https://shopwell.ai';

export default function HomeScreen() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { 
    storeLocations, 
    isGeofencingActive, 
    geofencePermissionStatus,
    startGeofencing,
    stopGeofencing,
    addStoreLocation,
    removeStoreLocation,
    getMonitoredStoreLocations
  } = useGeofencing();

  useEffect(() => {
    console.log('Web home screen mounted');
    
    // Listen for messages from the iframe
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== new URL(SHOPWELL_URL).origin) return;
      
      const data = event.data;
      console.log('Received message from web:', data);
      
      switch (data.type) {
        case 'natively.geofence.enableNotifications':
          console.log('Web requesting to toggle location notifications:', data.enabled);
          try {
            if (data.enabled) {
              const started = await startGeofencing();
              iframeRef.current?.contentWindow?.postMessage({
                type: 'GEOFENCE_ENABLE_RESPONSE',
                success: started,
                enabled: started
              }, SHOPWELL_URL);
            } else {
              await stopGeofencing();
              iframeRef.current?.contentWindow?.postMessage({
                type: 'GEOFENCE_ENABLE_RESPONSE',
                success: true,
                enabled: false
              }, SHOPWELL_URL);
            }
          } catch (error) {
            console.error('Error toggling geofencing:', error);
            iframeRef.current?.contentWindow?.postMessage({
              type: 'GEOFENCE_ENABLE_RESPONSE',
              success: false,
              error: 'Failed to toggle notifications'
            }, SHOPWELL_URL);
          }
          break;

        case 'natively.geofence.getStatus':
          console.log('Web requesting geofencing status');
          const locations = await getMonitoredStoreLocations();
          iframeRef.current?.contentWindow?.postMessage({
            type: 'GEOFENCE_STATUS_RESPONSE',
            isActive: isGeofencingActive,
            permissionStatus: geofencePermissionStatus,
            locationCount: locations.length,
            locations: locations
          }, SHOPWELL_URL);
          break;

        case 'natively.geofence.add':
          console.log('Web adding geofence:', data.location);
          try {
            await addStoreLocation(data.location);
            iframeRef.current?.contentWindow?.postMessage({
              type: 'GEOFENCE_ADD_RESPONSE',
              success: true,
              locationId: data.location.id
            }, SHOPWELL_URL);
          } catch (error) {
            console.error('Error adding geofence:', error);
            iframeRef.current?.contentWindow?.postMessage({
              type: 'GEOFENCE_ADD_RESPONSE',
              success: false,
              error: 'Failed to add location'
            }, SHOPWELL_URL);
          }
          break;

        case 'natively.geofence.remove':
          console.log('Web removing geofence:', data.locationId);
          try {
            await removeStoreLocation(data.locationId);
            iframeRef.current?.contentWindow?.postMessage({
              type: 'GEOFENCE_REMOVE_RESPONSE',
              success: true,
              locationId: data.locationId
            }, SHOPWELL_URL);
          } catch (error) {
            console.error('Error removing geofence:', error);
            iframeRef.current?.contentWindow?.postMessage({
              type: 'GEOFENCE_REMOVE_RESPONSE',
              success: false,
              error: 'Failed to remove location'
            }, SHOPWELL_URL);
          }
          break;

        case 'natively.geofence.getAll':
          console.log('Web requesting all monitored locations');
          const allLocations = await getMonitoredStoreLocations();
          iframeRef.current?.contentWindow?.postMessage({
            type: 'GEOFENCE_LIST_RESPONSE',
            locations: allLocations
          }, SHOPWELL_URL);
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
              window.isNativeApp = true;
              window.nativeAppPlatform = 'web';
              
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
                    console.error('Error hiding element:', selector, e);
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
                  console.error('Error hiding by text:', e);
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
              
              // Notify web that native features are available
              window.postMessage({ 
                type: 'NATIVE_APP_READY', 
                platform: 'web',
                features: ['geofencing', 'locationNotifications']
              }, '*');
              
              console.log('Quick Tip hiding script injected and running');
            })();
          `;
          
          iframeRef.current.contentWindow.eval(script);
          console.log('Injected hide script into iframe');
        } catch (error) {
          console.error('Error injecting script:', error);
        }
      }
    };

    const iframe = iframeRef.current;
    if (iframe) {
      iframe.addEventListener('load', () => {
        console.log('Iframe loaded, injecting hide script');
        setTimeout(injectHideScript, 100);
        setTimeout(injectHideScript, 500);
        setTimeout(injectHideScript, 1000);
        setTimeout(injectHideScript, 2000);
      });
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [isGeofencingActive, geofencePermissionStatus, startGeofencing, stopGeofencing, addStoreLocation, removeStoreLocation, getMonitoredStoreLocations]);

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
