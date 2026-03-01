
import { useEffect } from 'react';
import * as QuickActions from 'expo-quick-actions';
import { router } from 'expo-router';
import { Platform } from 'react-native';

export function useQuickActions(webViewRef: React.RefObject<any>) {
  useEffect(() => {
    if (Platform.OS === 'web') {
      console.log('[QuickActions] Quick actions not supported on web');
      return;
    }

    console.log('[QuickActions] Setting up quick actions...');

    // Define quick actions for iOS and Android
    const quickActions: QuickActions.Action[] = [
      {
        id: 'voice_planner',
        title: 'Voice Planner',
        subtitle: 'Start voice planning',
        icon: Platform.OS === 'ios' ? 'symbol:mic.fill' : 'mic',
        params: { action: 'voice_planner' },
      },
      {
        id: 'product_search',
        title: 'Product Search',
        subtitle: 'Search for products',
        icon: Platform.OS === 'ios' ? 'symbol:magnifyingglass' : 'search',
        params: { action: 'product_search' },
      },
      {
        id: 'photo_search',
        title: 'Photo Search',
        subtitle: 'Search by photo',
        icon: Platform.OS === 'ios' ? 'symbol:camera.fill' : 'camera',
        params: { action: 'photo_search' },
      },
    ];

    // Set the quick actions with error handling
    try {
      QuickActions.setItems(quickActions);
      console.log('[QuickActions] Quick actions set successfully:', quickActions.length);
    } catch (error) {
      console.error('[QuickActions] Error setting quick actions:', error);
    }

    // Handle quick action selection
    const handleQuickAction = (action: QuickActions.Action) => {
      console.log('[QuickActions] Quick action triggered:', action.id);

      if (!webViewRef.current) {
        console.warn('[QuickActions] WebView ref not available, deferring action');
        // Retry after a short delay
        setTimeout(() => {
          if (webViewRef.current) {
            handleQuickAction(action);
          }
        }, 500);
        return;
      }

      // Inject JavaScript to trigger the appropriate action on the web page
      try {
        switch (action.id) {
          case 'voice_planner':
            console.log('[QuickActions] Triggering voice planner...');
            webViewRef.current.injectJavaScript(`
              (function() {
                try {
                  // Try to find and click the voice planner button
                  const voiceButton = document.querySelector('[data-voice-planner], [aria-label*="voice"], button[class*="voice"]');
                  if (voiceButton) {
                    voiceButton.click();
                    console.log('[QuickActions] Voice planner button clicked');
                  } else {
                    // Fallback: navigate to voice planner URL if it exists
                    if (window.location.pathname !== '/voice-planner') {
                      window.location.href = '/voice-planner';
                    }
                    console.log('[QuickActions] Navigated to voice planner');
                  }
                  
                  // Notify native app
                  window.postMessage({ 
                    type: 'QUICK_ACTION_EXECUTED', 
                    action: 'voice_planner' 
                  }, '*');
                } catch (error) {
                  console.error('[QuickActions] Error executing voice planner action:', error);
                }
              })();
              true;
            `);
            break;

          case 'product_search':
            console.log('[QuickActions] Triggering product search...');
            webViewRef.current.injectJavaScript(`
              (function() {
                try {
                  // Try to find and focus the search input
                  const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i]');
                  if (searchInput) {
                    searchInput.focus();
                    console.log('[QuickActions] Search input focused');
                  } else {
                    // Fallback: navigate to search page if it exists
                    if (window.location.pathname !== '/search') {
                      window.location.href = '/search';
                    }
                    console.log('[QuickActions] Navigated to search page');
                  }
                  
                  // Notify native app
                  window.postMessage({ 
                    type: 'QUICK_ACTION_EXECUTED', 
                    action: 'product_search' 
                  }, '*');
                } catch (error) {
                  console.error('[QuickActions] Error executing product search action:', error);
                }
              })();
              true;
            `);
            break;

          case 'photo_search':
            console.log('[QuickActions] Triggering photo search...');
            webViewRef.current.injectJavaScript(`
              (function() {
                try {
                  // Try to find and click the photo search button
                  const photoButton = document.querySelector('[data-photo-search], [aria-label*="photo"], button[class*="photo"], button[class*="camera"]');
                  if (photoButton) {
                    photoButton.click();
                    console.log('[QuickActions] Photo search button clicked');
                  } else {
                    // Fallback: trigger native image picker
                    window.postMessage({ 
                      type: 'natively.imagePicker'
                    }, '*');
                    console.log('[QuickActions] Triggered native image picker');
                  }
                  
                  // Notify native app
                  window.postMessage({ 
                    type: 'QUICK_ACTION_EXECUTED', 
                    action: 'photo_search' 
                  }, '*');
                } catch (error) {
                  console.error('[QuickActions] Error executing photo search action:', error);
                }
              })();
              true;
            `);
            break;

          default:
            console.log('[QuickActions] Unknown quick action:', action.id);
        }
      } catch (error) {
        console.error('[QuickActions] Error injecting JavaScript for quick action:', error);
      }
    };

    // Listen for initial quick action (app launched via quick action)
    QuickActions.initial()
      .then((action) => {
        if (action) {
          console.log('[QuickActions] Initial quick action detected:', action.id);
          // Wait a bit for WebView to be ready
          setTimeout(() => handleQuickAction(action), 1500);
        }
      })
      .catch((error) => {
        console.error('[QuickActions] Error getting initial quick action:', error);
      });

    // Listen for subsequent quick actions (app already running)
    const listener = QuickActions.addListener(handleQuickAction);

    return () => {
      console.log('[QuickActions] Cleaning up quick actions...');
      listener.remove();
    };
  }, [webViewRef]);
}
