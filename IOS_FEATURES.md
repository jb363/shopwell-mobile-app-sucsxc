
# iOS-Specific Features for ShopWell.ai

This document outlines the iOS-specific features implemented in the ShopWell.ai native app.

## Features Implemented

### 1. iOS Push Notifications ✅

The app supports native iOS push notifications with the following capabilities:

- **Permission Handling**: Automatically requests notification permissions on first launch
- **Push Token Management**: Obtains and manages Expo push tokens for sending notifications
- **Deep Linking**: Notifications can include URLs that open specific pages in the app
- **Foreground Notifications**: Displays notifications even when the app is open
- **Background Notifications**: Handles notifications when the app is in the background
- **Notification Interactions**: Responds to user taps on notifications

**Implementation Files:**
- `hooks/useNotifications.ts` - Main notification logic
- `app/(tabs)/(home)/index.ios.tsx` - iOS-specific WebView with notification integration

**JavaScript Bridge API:**
```javascript
// Get notification token
const token = await window.natively.notification.getToken();

// Listen for notification token
window.addEventListener('natively.notification.token', (event) => {
  console.log('Push token:', event.detail.token);
});

// Listen for incoming notifications
window.addEventListener('natively.notification.received', (event) => {
  console.log('Notification:', event.detail);
});
```

### 2. Universal Links (Deep Linking) ✅

The app supports Universal Links for seamless deep linking from web to app:

- **Associated Domains**: Configured for `bda3e11e-68e8-45b3-9d3c-7c4fff44599c.lovableproject.com`
- **URL Handling**: Automatically opens app when users tap links from the website
- **Route Preservation**: Maintains the exact path and query parameters from the web URL

**Configuration:**
- `app.json` - iOS associated domains configuration
- `app/(tabs)/(home)/index.ios.tsx` - Deep link handling logic

**Supported URL Patterns:**
- `https://bda3e11e-68e8-45b3-9d3c-7c4fff44599c.lovableproject.com/*` - Opens in app
- `shopwell://*` - Custom URL scheme

### 3. iOS Share Extension Support 🔧

The app is configured to receive shared content from other iOS apps:

**What Works:**
- Intent filters configured for receiving shared URLs and images
- Share target screen (`app/share-target.tsx`) processes shared content
- WebView bridge can receive shared data

**What Needs Native Configuration:**
To fully enable iOS Share Extension, you need to:

1. **Add Share Extension Target in Xcode:**
   - Open the iOS project in Xcode
   - Add a new Share Extension target
   - Configure the extension to handle URLs and images
   - Set up the extension to communicate with the main app

2. **Configure Info.plist:**
   ```xml
   <key>NSExtension</key>
   <dict>
     <key>NSExtensionAttributes</key>
     <dict>
       <key>NSExtensionActivationRule</key>
       <dict>
         <key>NSExtensionActivationSupportsWebURLWithMaxCount</key>
         <integer>1</integer>
         <key>NSExtensionActivationSupportsImageWithMaxCount</key>
         <integer>1</integer>
       </dict>
     </dict>
     <key>NSExtensionPointIdentifier</key>
     <string>com.apple.share-services</string>
   </dict>
   ```

3. **Share Extension Code:**
   The extension should extract shared content and pass it to the main app via:
   - App Groups (for data sharing)
   - URL scheme (`shopwell://share-target?url=...&text=...`)

**Target URL for Shared Content:**
`https://bda3e11e-68e8-45b3-9d3c-7c4fff44599c.lovableproject.com/share-target`

### 4. JavaScript Bridge ✅

Comprehensive bridge between WebView and native iOS features:

**Available APIs:**

```javascript
// Haptic Feedback
await window.natively.haptic.trigger('light');    // Light impact
await window.natively.haptic.trigger('medium');   // Medium impact
await window.natively.haptic.trigger('heavy');    // Heavy impact
await window.natively.haptic.trigger('success');  // Success notification
await window.natively.haptic.trigger('warning');  // Warning notification
await window.natively.haptic.trigger('error');    // Error notification

// Clipboard
const text = await window.natively.clipboard.read();
await window.natively.clipboard.write('Hello World');

// Share
await window.natively.share({
  url: 'https://example.com',
  title: 'Check this out',
  message: 'Optional message'
});

// Image Picker
const imageUri = await window.natively.imagePicker('camera');  // Take photo
const imageUri = await window.natively.imagePicker('library'); // Pick from library

// Notifications
await window.natively.notification.register();
const token = await window.natively.notification.getToken();
```

### 5. iOS-Specific Optimizations ✅

- **Swipe Gestures**: Back/forward navigation with iOS swipe gestures
- **Pull to Refresh**: Native iOS pull-to-refresh control
- **Safe Area**: Respects iOS safe areas (notch, home indicator)
- **Status Bar**: Adapts to light/dark mode automatically
- **Keyboard Handling**: Proper keyboard avoidance for input fields

## Testing Notifications

### Local Testing

1. **Get Push Token:**
   ```javascript
   const token = await window.natively.notification.getToken();
   console.log('Token:', token);
   ```

2. **Send Test Notification:**
   Use the Expo Push Notification Tool:
   - Visit: https://expo.dev/notifications
   - Enter your Expo push token
   - Send a test notification

3. **Test Deep Linking:**
   Include in notification payload:
   ```json
   {
     "to": "ExponentPushToken[...]",
     "title": "Test Notification",
     "body": "Tap to open app",
     "data": {
       "url": "/lists/123"
     }
   }
   ```

### Production Setup

1. **Configure APNs:**
   - Generate APNs key in Apple Developer Portal
   - Upload to Expo (via `eas credentials`)
   - Configure in your backend

2. **Backend Integration:**
   - Store user push tokens in your database
   - Send notifications via Expo Push API
   - Include deep link URLs in notification data

## Known Limitations

1. **Share Extension**: Requires native Xcode configuration (not available in Expo Go)
2. **Background Notifications**: Limited by iOS system policies
3. **Notification Sounds**: Custom sounds require additional configuration
4. **Rich Notifications**: Images/videos in notifications need additional setup

## Next Steps

To complete iOS Share Extension setup:

1. Run `npx expo prebuild` to generate native iOS project
2. Open `ios/ShopWellAi.xcworkspace` in Xcode
3. Add Share Extension target
4. Configure App Groups for data sharing
5. Build with `eas build --platform ios`

## Resources

- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [iOS Universal Links](https://developer.apple.com/ios/universal-links/)
- [iOS Share Extension](https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/Share.html)
- [Expo Push Notifications Guide](https://docs.expo.dev/push-notifications/overview/)
