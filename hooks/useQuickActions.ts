
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

    console.log('[QuickActions] 🚀 Setting up quick actions...');

    // Define quick actions for iOS and Android
    const quickActions: QuickActions.Action[] = [
      {
        id: 'VOICE_PLANNER',
        title: 'Voice Planner',
        subtitle: 'Start voice planning',
        icon: Platform.OS === 'ios' ? 'symbol:mic.fill' : 'mic',
        params: { action: 'VOICE_PLANNER' },
      },
      {
        id: 'PRODUCT_SEARCH',
        title: 'Product Search',
        subtitle: 'Search for products',
        icon: Platform.OS === 'ios' ? 'symbol:magnifyingglass' : 'search',
        params: { action: 'PRODUCT_SEARCH' },
      },
      {
        id: 'PHOTO_SEARCH',
        title: 'Photo Search',
        subtitle: 'Search by photo',
        icon: Platform.OS === 'ios' ? 'symbol:camera.fill' : 'camera-alt',
        params: { action: 'PHOTO_SEARCH' },
      },
    ];

    // Set the quick actions
    setTimeout(() => {
      if (!isMounted) return;
      
      try {
        QuickActions.setItems(quickActions);
        console.log('[QuickActions] ✅ Quick actions set successfully:', quickActions.length);
      } catch (error) {
        console.error('[QuickActions] ❌ Error setting quick actions:', error);
      }
    }, 400);

    // Handle quick action selection
    const handleQuickAction = (action: QuickActions.Action) => {
      console.log('[QuickActions] 🎯 Quick action triggered:', action.id, 'params:', action.params);

      // Get the action from params (Android) or id (iOS)
      const actionType = (action.params as any)?.action || action.id;
      console.log('[QuickActions] Action type:', actionType);

      // Wait for WebView to be ready before sending action
      const sendActionToWebView = (retryCount = 0) => {
        if (!webViewRef.current) {
          if (retryCount < 15) {
            console.log(`[QuickActions] ⏳ WebView not ready, retrying (${retryCount + 1}/15)...`);
            setTimeout(() => sendActionToWebView(retryCount + 1), 500);
          } else {
            console.error('[QuickActions] ❌ WebView not available after 15 retries');
          }
          return;
        }

        // Send QUICK_ACTION message to WebView
        try {
          const normalizedAction = actionType.toUpperCase().replace(/-/g, '_');
          console.log('[QuickActions] 📤 Sending action to WebView:', normalizedAction);
          
          webViewRef.current.injectJavaScript(`
            (function() {
              try {
                console.log('[QuickActions] 📨 Received ${normalizedAction} action');
                window.postMessage({ 
                  type: 'QUICK_ACTION', 
                  action: '${normalizedAction}' 
                }, '*');
                console.log('[QuickActions] ✅ Action sent successfully');
              } catch (error) {
                console.error('[QuickActions] ❌ Error processing action:', error);
              }
            })();
            true;
          `);
        } catch (error) {
          console.error('[QuickActions] ❌ Error injecting JavaScript for quick action:', error);
        }
      };

      sendActionToWebView();
    };

    // Listen for initial quick action (app launched via quick action)
    setTimeout(() => {
      if (!isMounted) return;
      
      QuickActions.initial()
        .then((action) => {
          if (!isMounted) return;
          
          if (action) {
            console.log('[QuickActions] 🎬 Initial quick action detected:', action.id, 'params:', action.params);
            // Wait for WebView to be ready
            setTimeout(() => {
              if (isMounted) {
                handleQuickAction(action);
              }
            }, 2500);
          } else {
            console.log('[QuickActions] No initial quick action');
          }
        })
        .catch((error) => {
          console.error('[QuickActions] ❌ Error getting initial quick action:', error);
        });
    }, 600);

    // Listen for subsequent quick actions (app already running)
    let listener: any;
    setTimeout(() => {
      if (!isMounted) return;
      
      try {
        listener = QuickActions.addListener(handleQuickAction);
        console.log('[QuickActions] ✅ Quick action listener added');
      } catch (error) {
        console.error('[QuickActions] ❌ Error adding quick action listener:', error);
      }
    }, 700);

    return () => {
      isMounted = false;
      console.log('[QuickActions] 🧹 Cleaning up quick actions...');
      try {
        if (listener) {
          listener.remove();
        }
      } catch (error) {
        console.error('[QuickActions] ❌ Error removing quick action listener:', error);
      }
    };
  }, [webViewRef]);
}
