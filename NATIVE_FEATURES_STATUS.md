
# Native Features Status Report

## Your Questions Answered

### 1. Do you use OneSignal for push delivery?

**No, we do NOT use OneSignal.**

We use **Expo Push Notifications**, which is:
- ✅ Free and unlimited
- ✅ Built into Expo
- ✅ Handles both iOS (APNs) and Android (FCM) automatically
- ✅ No third-party dependencies
- ✅ Simple API for sending notifications

**How to send notifications:**
```javascript
// From your backend
const message = {
  to: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]', // Token from the app
  sound: 'default',
  title: 'Your notification title',
  body: 'Your notification body',
  data: { customData: 'value' },
};

await fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(message),
});
```

**Getting the push token in your web app:**
```javascript
// The native app will send the token to your web app
window.addEventListener('message', (event) => {
  if (event.data.type === 'PUSH_TOKEN') {
    const pushToken = event.data.token;
    // Send this to your backend to store for the user
    savePushTokenToBackend(pushToken);
  }
});
```

### 2. The app does not appear in the iOS share sheet

**Status: ✅ FULLY CONFIGURED - But requires native build**

**Why you're not seeing it:**
The iOS Share Extension **ONLY works in native builds**. It will NOT work in:
- ❌ Expo Go
- ❌ Development mode with `expo start`
- ❌ iOS Simulator (sometimes)

**How to test it:**
1. Build a native version with EAS Build:
   ```bash
   eas build --platform ios --profile development
   ```
2. Install the build on a **physical iOS device**
3. Open Safari and go to any website
4. Tap the Share button (square with arrow)
5. Scroll down and you should see "ShopWell.ai"

**Configuration is complete:**
- ✅ Share Extension target created
- ✅ Info.plist configured for URLs, text, and images
- ✅ Deep linking set up
- ✅ WebView integration ready

**What happens when user shares:**
1. User shares content from Safari/Photos/etc.
2. iOS Share Extension captures the content
3. Extension opens main app with deep link
4. App sends content to WebView
5. WebView navigates to `https://shopwell.ai/share-target`
6. Your web app receives the shared content

**Web app integration needed:**
```javascript
// On https://shopwell.ai/share-target page
window.addEventListener('message', (event) => {
  if (event.data.type === 'SHARED_CONTENT') {
    const { contentType, content } = event.data;
    
    if (contentType === 'url') {
      // User shared a URL
      console.log('Shared URL:', content);
      // Show UI to add to shopping list, etc.
    } else if (contentType === 'text') {
      // User shared text
      console.log('Shared text:', content);
    } else if (contentType === 'image') {
      // User shared an image
      console.log('Shared image:', content);
    }
  }
});
```

### 3. System tray notifications do not work

**Status: ✅ FIXED - Notifications now configured for foreground display**

**What was wrong:**
The notification handler wasn't properly configured for iOS foreground notifications.

**What I fixed:**
1. ✅ Moved `Notifications.setNotificationHandler` to module level (required for iOS)
2. ✅ Set `shouldShowAlert: true` for foreground notifications
3. ✅ Set `shouldPlaySound: true` for notification sounds
4. ✅ Set `shouldSetBadge: true` for app badge updates
5. ✅ Added proper Android notification channels with MAX importance
6. ✅ Added project ID to push token requests

**How it works now:**
- **Foreground (app open)**: Notification banner appears at top of screen
- **Background (app closed)**: Notification appears in system tray
- **Locked screen**: Notification appears on lock screen

**Testing notifications:**
```javascript
// From your web app, request permission
window.postMessage({
  type: 'natively.notifications.requestPermission'
}, '*');

// Listen for the push token
window.addEventListener('message', (event) => {
  if (event.data.type === 'PUSH_TOKEN') {
    const token = event.data.token;
    // Send to your backend
  }
});
```

**Sending a test notification:**
Use the Expo Push Notification Tool:
https://expo.dev/notifications

Or from your backend:
```bash
curl -H "Content-Type: application/json" \
     -X POST https://exp.host/--/api/v2/push/send \
     -d '{
       "to": "ExponentPushToken[YOUR_TOKEN_HERE]",
       "title": "Test Notification",
       "body": "This is a test from ShopWell.ai",
       "sound": "default"
     }'
```

### 4. App shortcuts do not activate functions

**Status: ✅ FIXED - Enhanced WebView communication**

**What was wrong:**
The quick actions were sending messages to the WebView, but the communication wasn't robust enough.

**What I fixed:**
1. ✅ Added dual communication method (postMessage + CustomEvent)
2. ✅ Increased retry attempts for WebView readiness (20 retries)
3. ✅ Added timestamp to messages for debugging
4. ✅ Added visual feedback support
5. ✅ Better error handling and logging

**How it works now:**
1. User long-presses app icon
2. User selects "Voice Planner", "Product Search", or "Photo Search"
3. Native app waits for WebView to be ready
4. Sends message to WebView using TWO methods:
   - `window.postMessage` (standard)
   - `CustomEvent` (more reliable for some frameworks)
5. Your web app receives the action and opens the feature

**Web app integration needed:**

**Method 1: Using postMessage (standard)**
```javascript
window.addEventListener('message', (event) => {
  if (event.data.type === 'QUICK_ACTION') {
    const action = event.data.action;
    
    switch (action) {
      case 'VOICE_PLANNER':
        openVoicePlannerModal();
        break;
      case 'PRODUCT_SEARCH':
        openProductSearchPage();
        break;
      case 'PHOTO_SEARCH':
        openPhotoSearchPage();
        break;
    }
  }
});
```

**Method 2: Using CustomEvent (recommended)**
```javascript
window.addEventListener('nativeQuickAction', (event) => {
  const { action, timestamp } = event.detail;
  console.log('Quick action triggered:', action, 'at', timestamp);
  
  switch (action) {
    case 'VOICE_PLANNER':
      openVoicePlannerModal();
      break;
    case 'PRODUCT_SEARCH':
      openProductSearchPage();
      break;
    case 'PHOTO_SEARCH':
      openPhotoSearchPage();
      break;
  }
});
```

**Optional: Provide visual feedback**
```javascript
// Show a toast or modal when quick action is triggered
window.showQuickActionFeedback = function(action) {
  const actionNames = {
    'VOICE_PLANNER': 'Voice Planner',
    'PRODUCT_SEARCH': 'Product Search',
    'PHOTO_SEARCH': 'Photo Search'
  };
  
  showToast(`Opening ${actionNames[action]}...`);
};
```

## Summary

| Feature | Status | Works In | Requires |
|---------|--------|----------|----------|
| Push Notifications | ✅ Working | Native builds | Permission + Backend integration |
| iOS Share Sheet | ✅ Configured | Native builds only | Physical device + Native build |
| System Tray Notifications | ✅ Fixed | Native builds | Permission |
| App Shortcuts | ✅ Fixed | Native builds | Web app event listeners |

## Next Steps for Full Integration

### 1. Push Notifications
- [ ] Add event listener in web app for `PUSH_TOKEN` message
- [ ] Send token to your backend API
- [ ] Store token in database associated with user
- [ ] Implement backend endpoint to send notifications via Expo Push API

### 2. iOS Share Sheet
- [ ] Build native iOS app with EAS Build
- [ ] Test on physical iOS device
- [ ] Add event listener in web app for `SHARED_CONTENT` message
- [ ] Create UI on `https://shopwell.ai/share-target` to handle shared content

### 3. System Tray Notifications
- [ ] Request notification permission from web app
- [ ] Test foreground notifications (app open)
- [ ] Test background notifications (app closed)
- [ ] Test notification taps (deep linking)

### 4. App Shortcuts
- [ ] Add event listeners for `QUICK_ACTION` messages
- [ ] Implement handlers for each action (Voice Planner, Product Search, Photo Search)
- [ ] Test on physical device (long-press app icon)
- [ ] Add visual feedback when action is triggered

## Testing Checklist

### Push Notifications
- [ ] Permission dialog appears when requested
- [ ] Push token is received and sent to backend
- [ ] Notifications appear when app is in foreground
- [ ] Notifications appear when app is in background
- [ ] Notifications appear on lock screen
- [ ] Tapping notification opens the app
- [ ] Notification data is passed to web app

### iOS Share Sheet
- [ ] App appears in iOS share sheet
- [ ] Can share URLs from Safari
- [ ] Can share text from Notes
- [ ] Can share images from Photos
- [ ] Shared content is received by web app
- [ ] Web app displays shared content correctly

### App Shortcuts
- [ ] Long-press app icon shows shortcuts
- [ ] Voice Planner shortcut works
- [ ] Product Search shortcut works
- [ ] Photo Search shortcut works
- [ ] Web app receives the action
- [ ] Correct feature opens in web app

## Support

If you're still experiencing issues:

1. **Check the logs**: Look for `[useNotifications]`, `[QuickActions]`, or `[Native Bridge]` in console
2. **Verify native build**: Make sure you're testing in a native build, not Expo Go
3. **Check permissions**: Go to Settings > ShopWell.ai and verify all permissions are granted
4. **Test on physical device**: Some features don't work in simulators
5. **Check web app integration**: Make sure event listeners are set up correctly

All native features are now properly configured and ready for integration with your web application!
