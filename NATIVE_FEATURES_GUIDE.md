
# Native Features Integration Guide

This guide explains how the native iOS/Android features are integrated with the ShopWell.ai web application.

## Overview

The ShopWell.ai mobile app is a **hybrid app** that wraps the web application (https://shopwell.ai) in a native WebView. Native features are exposed to the web app through a JavaScript bridge.

## Push Notifications

### Service Used
- **Expo Push Notifications** (NOT OneSignal)
- Free tier: Unlimited notifications
- Handles both iOS (APNs) and Android (FCM) automatically

### How It Works
1. The native app requests notification permissions
2. Once granted, it obtains an Expo Push Token
3. The token is sent to the WebView via `window.postMessage`
4. The web app should send this token to your backend
5. Your backend uses the Expo Push API to send notifications

### Web App Integration
```javascript
// Listen for the push token
window.addEventListener('message', (event) => {
  if (event.data.type === 'PUSH_TOKEN') {
    const pushToken = event.data.token;
    // Send this to your backend
    fetch('https://shopwell.ai/api/register-push-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: pushToken })
    });
  }
});

// Request notification permission from web app
window.postMessage({
  type: 'natively.notifications.requestPermission'
}, '*');
```

### Sending Notifications from Backend
```javascript
// Example: Send a notification using Expo Push API
const message = {
  to: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  sound: 'default',
  title: 'New Product Available!',
  body: 'Check out our latest deals',
  data: { url: 'https://shopwell.ai/products/123' },
};

await fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(message),
});
```

### Foreground Notifications (iOS)
The app is configured to show notifications even when the app is in the foreground:
- `shouldShowAlert: true` - Shows banner
- `shouldPlaySound: true` - Plays sound
- `shouldSetBadge: true` - Updates app badge

## iOS Share Sheet

### Current Status
✅ **Fully Configured** - The Share Extension is set up and will work in production builds

### Why It's Not Working in Development
The iOS Share Sheet **ONLY works in native builds**, not in:
- ❌ Expo Go
- ❌ iOS Simulator (sometimes)
- ❌ Development builds without proper code signing

### How to Test
1. Build a production or development build with EAS:
   ```bash
   eas build --platform ios --profile development
   ```
2. Install the build on a physical iOS device
3. Open Safari and navigate to any website
4. Tap the Share button
5. You should see "ShopWell.ai" in the share sheet

### How It Works
1. User shares content from Safari/Photos/etc.
2. iOS Share Extension receives the content
3. Extension opens the main app with a deep link: `shopwellaimobile://share-target?type=url&content=...`
4. App navigates to `/share-target` route
5. Share target redirects to home screen with shared content
6. Home screen injects the content into the WebView
7. WebView navigates to `https://shopwell.ai/share-target`

### Web App Integration
```javascript
// Listen for shared content
window.addEventListener('message', (event) => {
  if (event.data.type === 'SHARED_CONTENT') {
    const { contentType, content } = event.data;
    
    if (contentType === 'url') {
      // Handle shared URL
      console.log('Shared URL:', content);
    } else if (contentType === 'text') {
      // Handle shared text
      console.log('Shared text:', content);
    } else if (contentType === 'image') {
      // Handle shared image
      console.log('Shared image:', content);
    }
  }
});
```

## App Shortcuts (Quick Actions)

### Current Status
✅ **Fully Configured** - Quick actions are set up and working

### Available Actions
1. **Voice Planner** - Opens voice planning feature
2. **Product Search** - Opens product search
3. **Photo Search** - Opens photo search

### How to Trigger
- **iOS**: Long-press the app icon on the home screen
- **Android**: Long-press the app icon or use the app shortcuts menu

### How It Works
1. User long-presses the app icon
2. User selects a quick action
3. Native app sends a message to the WebView
4. WebView receives the action and opens the appropriate feature

### Web App Integration
```javascript
// Listen for quick actions
window.addEventListener('message', (event) => {
  if (event.data.type === 'QUICK_ACTION') {
    const action = event.data.action;
    
    switch (action) {
      case 'VOICE_PLANNER':
        // Open voice planner modal/page
        openVoicePlanner();
        break;
      case 'PRODUCT_SEARCH':
        // Open product search
        openProductSearch();
        break;
      case 'PHOTO_SEARCH':
        // Open photo search
        openPhotoSearch();
        break;
    }
  }
});

// Alternative: Listen for custom event
window.addEventListener('nativeQuickAction', (event) => {
  const { action } = event.detail;
  console.log('Quick action triggered:', action);
});
```

## Other Native Features

### Biometric Authentication
```javascript
// Check if biometrics are supported
window.postMessage({ type: 'natively.biometric.isSupported' }, '*');

// Listen for response
window.addEventListener('message', (event) => {
  if (event.data.type === 'BIOMETRIC_SUPPORT_RESPONSE') {
    if (event.data.isSupported) {
      // Biometrics available (Face ID, Touch ID, or Fingerprint)
      console.log('Biometric type:', event.data.biometricType);
    }
  }
});

// Authenticate with biometrics
window.postMessage({
  type: 'natively.biometric.authenticate',
  reason: 'Authenticate to log in to ShopWell.ai'
}, '*');

// Listen for authentication result
window.addEventListener('message', (event) => {
  if (event.data.type === 'BIOMETRIC_AUTH_RESPONSE') {
    if (event.data.success) {
      // Authentication successful
    } else {
      // Authentication failed
    }
  }
});
```

### Voice Recording
```javascript
// Start recording
window.postMessage({ type: 'natively.voice.startRecording' }, '*');

// Stop recording
window.postMessage({ type: 'natively.voice.stopRecording' }, '*');

// Listen for recording result
window.addEventListener('message', (event) => {
  if (event.data.type === 'VOICE_RECORDING_COMPLETE') {
    const audioBase64 = event.data.audioData;
    const mimeType = event.data.mimeType; // 'audio/m4a'
    
    // Send to backend for transcription
    fetch('https://shopwell.ai/api/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio: audioBase64, mimeType })
    });
  }
});
```

### Contact Picker
```javascript
// Open contact picker
window.postMessage({ type: 'natively.contacts.pick' }, '*');

// Listen for selected contact
window.addEventListener('message', (event) => {
  if (event.data.type === 'CONTACT_PICKER_RESPONSE') {
    if (event.data.success && event.data.contact) {
      const { name, phoneNumbers, emails } = event.data.contact;
      console.log('Selected contact:', name);
    }
  }
});
```

## Debugging

### Check if running in native app
```javascript
if (window.isNativeApp) {
  console.log('Running in native app');
  console.log('Platform:', window.nativeAppPlatform); // 'ios' or 'android'
  console.log('Features:', window.nativeFeatures);
}
```

### Wait for native bridge to be ready
```javascript
window.addEventListener('message', (event) => {
  if (event.data.type === 'NATIVE_APP_READY') {
    console.log('Native bridge ready!');
    console.log('Platform:', event.data.platform);
    console.log('Available features:', event.data.features);
    
    // Now safe to use native features
    initializeNativeFeatures();
  }
});
```

## Troubleshooting

### Notifications Not Showing
1. Check permission status: `Settings > ShopWell.ai > Notifications`
2. Verify push token is being sent to backend
3. Check notification payload format
4. Test with Expo Push Notification Tool: https://expo.dev/notifications

### Share Sheet Not Appearing
1. Must use a **native build** (not Expo Go)
2. Test on a **physical iOS device**
3. Check that the app is properly code-signed
4. Verify the Share Extension target is included in the build

### Quick Actions Not Working
1. Check that the app is installed (not running in Expo Go)
2. Verify quick actions are registered (check console logs)
3. Ensure WebView is loaded before triggering action
4. Check that the web app is listening for the messages

### WebView Communication Issues
1. Check browser console in the WebView (use Safari Web Inspector)
2. Verify `window.postMessage` is being called correctly
3. Ensure event listeners are set up before messages are sent
4. Check for CORS issues if loading external content

## Best Practices

1. **Always check if running in native app** before using native features
2. **Wait for NATIVE_APP_READY** message before initializing
3. **Handle permission denials gracefully** with user-friendly messages
4. **Test on physical devices** for accurate results
5. **Use console.log extensively** for debugging native bridge communication
6. **Implement fallbacks** for when native features aren't available

## Support

For issues with native features:
1. Check the console logs in both native app and WebView
2. Verify the feature is supported on the platform (iOS vs Android)
3. Ensure proper permissions are granted
4. Test in a production build, not Expo Go
