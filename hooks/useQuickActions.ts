
import { useEffect } from 'react';
import * as QuickActions from 'expo-quick-actions';
import { router } from 'expo-router';
import { Platform } from 'react-native';

export function useQuickActions(webViewRef: React.RefObject<any>) {
  useEffect(() => {
    if (Platform.OS === 'web') {
      console.log('Quick actions not supported on web');
      return;
    }

    console.log('Setting up quick actions...');

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

    // Set the quick actions
    QuickActions.setItems(quickActions);
    console.log('Quick actions set:', quickActions.length);

    // Handle quick action selection
    const handleQuickAction = (action: QuickActions.Action) => {
      console.log('Quick action triggered:', action.id);

      if (!webViewRef.current) {
        console.warn('WebView ref not available');
        return;
      }

      // Inject JavaScript to trigger the appropriate action on the web page
      switch (action.id) {
        case 'voice_planner':
          console.log('Triggering voice planner...');
          webViewRef.current.injectJavaScript(`
            (function() {
              // Try to find and click the voice planner button
              const voiceButton = document.querySelector('[data-voice-planner], [aria-label*="voice"], button[class*="voice"]');
              if (voiceButton) {
                voiceButton.click();
                console.log('Voice planner button clicked');
              } else {
                // Fallback: navigate to voice planner URL if it exists
                if (window.location.pathname !== '/voice-planner') {
                  window.location.href = '/voice-planner';
                }
                console.log('Navigated to voice planner');
              }
              
              // Notify native app
              window.postMessage({ 
                type: 'QUICK_ACTION_EXECUTED', 
                action: 'voice_planner' 
              }, '*');
            })();
            true;
          `);
          break;

        case 'product_search':
          console.log('Triggering product search...');
          webViewRef.current.injectJavaScript(`
            (function() {
              // Try to find and focus the search input
              const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i]');
              if (searchInput) {
                searchInput.focus();
                console.log('Search input focused');
              } else {
                // Fallback: navigate to search page if it exists
                if (window.location.pathname !== '/search') {
                  window.location.href = '/search';
                }
                console.log('Navigated to search page');
              }
              
              // Notify native app
              window.postMessage({ 
                type: 'QUICK_ACTION_EXECUTED', 
                action: 'product_search' 
              }, '*');
            })();
            true;
          `);
          break;

        case 'photo_search':
          console.log('Triggering photo search...');
          webViewRef.current.injectJavaScript(`
            (function() {
              // Try to find and click the photo search button
              const photoButton = document.querySelector('[data-photo-search], [aria-label*="photo"], button[class*="photo"], button[class*="camera"]');
              if (photoButton) {
                photoButton.click();
                console.log('Photo search button clicked');
              } else {
                // Fallback: trigger native image picker
                window.postMessage({ 
                  type: 'natively.imagePicker'
                }, '*');
                console.log('Triggered native image picker');
              }
              
              // Notify native app
              window.postMessage({ 
                type: 'QUICK_ACTION_EXECUTED', 
                action: 'photo_search' 
              }, '*');
            })();
            true;
          `);
          break;

        default:
          console.log('Unknown quick action:', action.id);
      }
    };

    // Listen for quick action events
    const subscription = QuickActions.initial().then((action) => {
      if (action) {
        console.log('Initial quick action:', action.id);
        // Wait a bit for WebView to be ready
        setTimeout(() => handleQuickAction(action), 1000);
      }
    });

    // Listen for subsequent quick actions
    const listener = QuickActions.addListener(handleQuickAction);

    return () => {
      console.log('Cleaning up quick actions...');
      listener.remove();
    };
  }, [webViewRef]);
}
