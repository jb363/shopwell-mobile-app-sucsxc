
import { useEffect } from 'react';
import * as QuickActions from 'expo-quick-actions';
import { router } from 'expo-router';
import { Platform } from 'react-native';

export function useQuickActions(webViewRef: React.RefObject<any>) {
  useEffect(() => {
    let isMounted = true;
    
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
        params: { action: 'VOICE_PLANNER' },
      },
      {
        id: 'product_search',
        title: 'Product Search',
        subtitle: 'Search for products',
        icon: Platform.OS === 'ios' ? 'symbol:magnifyingglass' : 'search',
        params: { action: 'PRODUCT_SEARCH' },
      },
      {
        id: 'photo_search',
        title: 'Photo Search',
        subtitle: 'Search by photo',
        icon: Platform.OS === 'ios' ? 'symbol:camera.fill' : 'camera-alt',
        params: { action: 'PHOTO_SEARCH' },
      },
    ];

    // Set the quick actions with error handling
    // Add delay to ensure native modules are ready
    setTimeout(() => {
      if (!isMounted) return;
      
      try {
        QuickActions.setItems(quickActions);
        console.log('[QuickActions] Quick actions set successfully:', quickActions.length);
      } catch (error) {
        console.error('[QuickActions] Error setting quick actions:', error);
      }
    }, 600);

    // Handle quick action selection
    const handleQuickAction = (action: QuickActions.Action) => {
      console.log('[QuickActions] Quick action triggered:', action.id, 'params:', action.params);

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

      // Get the action from params (Android) or id (iOS)
      const actionType = (action.params as any)?.action || action.id;
      console.log('[QuickActions] Action type:', actionType);

      // Send QUICK_ACTION message to WebView
      try {
        switch (actionType) {
          case 'VOICE_PLANNER':
          case 'voice_planner':
            console.log('[QuickActions] Sending VOICE_PLANNER action to WebView');
            webViewRef.current.injectJavaScript(`
              (function() {
                try {
                  console.log('[QuickActions] Received VOICE_PLANNER action');
                  window.postMessage({ 
                    type: 'QUICK_ACTION', 
                    action: 'VOICE_PLANNER' 
                  }, '*');
                } catch (error) {
                  console.error('[QuickActions] Error processing VOICE_PLANNER action:', error);
                }
              })();
              true;
            `);
            break;

          case 'PRODUCT_SEARCH':
          case 'product_search':
            console.log('[QuickActions] Sending PRODUCT_SEARCH action to WebView');
            webViewRef.current.injectJavaScript(`
              (function() {
                try {
                  console.log('[QuickActions] Received PRODUCT_SEARCH action');
                  window.postMessage({ 
                    type: 'QUICK_ACTION', 
                    action: 'PRODUCT_SEARCH' 
                  }, '*');
                } catch (error) {
                  console.error('[QuickActions] Error processing PRODUCT_SEARCH action:', error);
                }
              })();
              true;
            `);
            break;

          case 'PHOTO_SEARCH':
          case 'photo_search':
            console.log('[QuickActions] Sending PHOTO_SEARCH action to WebView');
            webViewRef.current.injectJavaScript(`
              (function() {
                try {
                  console.log('[QuickActions] Received PHOTO_SEARCH action');
                  window.postMessage({ 
                    type: 'QUICK_ACTION', 
                    action: 'PHOTO_SEARCH' 
                  }, '*');
                } catch (error) {
                  console.error('[QuickActions] Error processing PHOTO_SEARCH action:', error);
                }
              })();
              true;
            `);
            break;

          default:
            console.log('[QuickActions] Unknown quick action:', actionType);
        }
      } catch (error) {
        console.error('[QuickActions] Error injecting JavaScript for quick action:', error);
      }
    };

    // Listen for initial quick action (app launched via quick action)
    // Add delay to ensure native modules are ready
    setTimeout(() => {
      if (!isMounted) return;
      
      QuickActions.initial()
        .then((action) => {
          if (!isMounted) return;
          
          if (action) {
            console.log('[QuickActions] Initial quick action detected:', action.id, 'params:', action.params);
            // Wait a bit for WebView to be ready
            setTimeout(() => {
              if (isMounted) {
                handleQuickAction(action);
              }
            }, 1500);
          }
        })
        .catch((error) => {
          console.error('[QuickActions] Error getting initial quick action:', error);
        });
    }, 800);

    // Listen for subsequent quick actions (app already running)
    let listener: any;
    setTimeout(() => {
      if (!isMounted) return;
      
      try {
        listener = QuickActions.addListener(handleQuickAction);
        console.log('[QuickActions] Quick action listener added');
      } catch (error) {
        console.error('[QuickActions] Error adding quick action listener:', error);
      }
    }, 900);

    return () => {
      isMounted = false;
      console.log('[QuickActions] Cleaning up quick actions...');
      try {
        if (listener) {
          listener.remove();
        }
      } catch (error) {
        console.error('[QuickActions] Error removing quick action listener:', error);
      }
    };
  }, [webViewRef]);
}
