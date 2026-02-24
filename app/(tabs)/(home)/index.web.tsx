
import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Stack } from 'expo-router';
import StoreLocationManager from '@/components/StoreLocationManager';
import { IconSymbol } from '@/components/IconSymbol';
import { useGeofencing } from '@/hooks/useGeofencing';

const SHOPWELL_URL = 'https://shopwell.ai';

export default function HomeScreen() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [showLocationManager, setShowLocationManager] = useState(false);
  const { storeLocations } = useGeofencing();

  useEffect(() => {
    console.log('Web home screen mounted');
    
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
                
                // Hide by text content
                try {
                  const allElements = document.querySelectorAll('div, p, span, a, button, li, section, article');
                  allElements.forEach(el => {
                    const text = el.textContent?.toLowerCase() || '';
                    
                    // Hide "Products in the News"
                    if (text.includes('products in the news') || text.includes('products in news')) {
                      el.style.display = 'none !important';
                      el.style.visibility = 'hidden !important';
                      if (el.parentElement?.tagName === 'LI') {
                        el.parentElement.style.display = 'none !important';
                      }
                    }
                    
                    // Hide "Quick Tip" messages about Click-&-Add
                    if (text.includes('quick tip')) {
                      if (text.includes('click') || text.includes('add') || text.includes('install')) {
                        el.style.display = 'none !important';
                        el.style.visibility = 'hidden !important';
                        el.style.opacity = '0 !important';
                        el.style.height = '0 !important';
                        el.style.overflow = 'hidden !important';
                        
                        // Also hide parent containers
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
                    
                    // Specifically target "Install Now" buttons related to Quick Tip
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
              
              // Run immediately
              hideUnwantedElements();
              
              // Run on DOM ready
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', hideUnwantedElements);
              }
              
              // Run on window load
              window.addEventListener('load', hideUnwantedElements);
              
              // Run periodically to catch dynamically added elements
              setInterval(hideUnwantedElements, 500);
              
              // Use MutationObserver to catch DOM changes
              const observer = new MutationObserver(hideUnwantedElements);
              observer.observe(document.body, {
                childList: true,
                subtree: true
              });
              
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

    // Try to inject after iframe loads
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
  }, []);

  const storeCountText = `${storeLocations.length}`;

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
      
      {/* Floating Location Button */}
      <TouchableOpacity
        style={styles.locationButton}
        onPress={() => {
          console.log('User tapped location button on web');
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
    width: '100%',
    height: '100%',
    position: 'relative',
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
    zIndex: 1000,
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
