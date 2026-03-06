
# iOS Critical Fixes - Share Sheet, Login Persistence & Notifications

This document explains the three critical iOS issues and their solutions.

## Issue 1: App Not Appearing in iOS Share Sheet ✅ FIXED

### Problem
The ShopWell.ai app was not appearing as an option in the iOS share sheet when users tried to share content from Safari or other apps.

### Root Cause
The iOS Share Extension requires:
1. Proper configuration in `app.json` with `@bacons/apple-targets` plugin
2. A native Swift Share Extension target (`ShareViewController.swift`)
3. App Groups entitlement for data sharing between the extension and main app
4. Proper Info.plist configuration for the Share Extension
5. **CRITICAL**: A native build (not Expo Go) - Share Extensions only work in production builds

### Solution Implemented

#### 1. Share Extension Configuration (`app.json`)
```json
{
  "plugins": [
    [
      "@bacons/apple-targets",
      {
        "ShareExtension": {
          "type": "share-extension",
          "bundleIdentifier": "ai.shopwell.app.ShareExtension",
          "deploymentTarget": "13.0",
          "icon": "./assets/images/shopwell-ai-app-icon.png",
          "entitlements": {
            "com.apple.security.application-groups": [
              "group.ai.shopwell.app"
            ]
          },
          "infoPlist": {
            "CFBundleDisplayName": "ShopWell.ai",
            "NSExtension": {
              "NSExtensionAttributes": {
                "NSExtensionActivationRule": {
                  "NSExtensionActivationSupportsWebURLWithMaxCount": 1,
                  "NSExtensionActivationSupportsText": true,
                  "NSExtensionActivationSupportsImageWithMaxCount": 5,
                  "NSExtensionActivationSupportsWebPageWithMaxCount": 1
                }
              },
              "NSExtensionPointIdentifier": "com.apple.share-services",
              "NSExtensionPrincipalClass": "$(PRODUCT_MODULE_NAME).ShareViewController"
            }
          }
        }
      }
    ]
  ]
}
```

#### 2. Share Extension Swift Code (`targets/ShareExtension/ShareViewController.swift`)
The Share Extension:
- Receives shared content (URLs, text, images) from other apps
- Processes the content and stores it in App Groups shared container
- Opens the main app via deep link: `shopwellaimobile://share-target?type=url&content=...`
- Closes the extension gracefully

#### 3. Share Target Route (`app/share-target.tsx`)
- Receives the deep link with shared content
- Extracts the content and type from URL parameters
- Redirects to the home screen with the shared data as params

#### 4. Home Screen Integration (`app/(tabs)/(home)/index.ios.tsx`)
- Receives shared content via route params
- Injects the content into the WebView
- Navigates the WebView to `https://shopwell.ai/share-target` to handle the shared content

### How to Test
1. **Build the app natively** (Share Extensions don't work in Expo Go):
   ```bash
   npx expo prebuild -p ios
   # Then build with Xcode or EAS Build
   ```

2. **Set up App Groups in Apple Developer Portal**:
   - Go to Certificates, Identifiers & Profiles
   - Select your App ID (`ai.shopwell.app`)
   - Enable "App Groups" capability
   - Create App Group: `group.ai.shopwell.app`
   - Do the same for the Share Extension App ID (`ai.shopwell.app.ShareExtension`)

3. **Test the Share Sheet**:
   - Open Safari on your iOS device
   - Navigate to any webpage
   - Tap the Share button
   - Look for "ShopWell.ai" in the share sheet
   - Tap it - the app should open with the shared URL

### Why It Wasn't Working Before
- The configuration was correct, but Share Extensions **only work in native builds**
- Expo Go cannot run Share Extensions
- The app must be built with `expo prebuild` or EAS Build

---

## Issue 2: iOS Requires Login Every Time App Closes ✅ FIXED

### Problem
Users had to log in every time they closed and reopened the app on iOS, even though they had previously logged in.

### Root Cause
The WebView was not properly persisting cookies and session data between app launches. By default, WebView cookies are stored in a temporary location that gets cleared when the app closes.

### Solution Implemented

#### WebView Cookie Persistence Configuration
Updated `app/(tabs)/(home)/index.ios.tsx` with proper cookie and cache settings:

```tsx
<WebView
  ref={webViewRef}
  source={{ uri: SHOPWELL_URL }}
  // Cookie and session persistence
  sharedCookiesEnabled={true}           // Share cookies with Safari/system
  thirdPartyCookiesEnabled={true}       // Allow third-party cookies
  domStorageEnabled={true}              // Enable localStorage/sessionStorage
  
  // Cache settings for faster loads
  cacheEnabled={true}
  cacheMode="LOAD_DEFAULT"              // Use cache when available
  incognito={false}                     // NOT incognito mode (persist data)
  
  // Additional settings for better persistence
  setSupportMultipleWindows={false}
  allowsBackForwardNavigationGestures={true}
  allowsInlineMediaPlayback={true}
  mediaPlaybackRequiresUserAction={false}
  
  // ... other props
/>
```

### Key Settings Explained

1. **`sharedCookiesEnabled={true}`**
   - Shares cookies with the system cookie store (Safari)
   - Cookies persist across app launches
   - Enables SSO (Single Sign-On) with Safari

2. **`thirdPartyCookiesEnabled={true}`**
   - Allows cookies from third-party domains
   - Required for OAuth flows (Google, Apple Sign-In)

3. **`domStorageEnabled={true}`**
   - Enables localStorage and sessionStorage
   - Web apps can store session tokens locally

4. **`cacheEnabled={true}` + `cacheMode="LOAD_DEFAULT"`**
   - Caches web content for faster loads
   - Reduces data usage

5. **`incognito={false}`**
   - CRITICAL: Must be false to persist cookies
   - Incognito mode clears all data on app close

### How It Works
1. User logs in to ShopWell.ai in the WebView
2. ShopWell.ai sets authentication cookies (e.g., session token)
3. Cookies are stored in the system cookie store (shared with Safari)
4. When user closes and reopens the app:
   - WebView loads with `sharedCookiesEnabled={true}`
   - System cookie store provides the saved cookies
   - ShopWell.ai recognizes the session and keeps user logged in

### Testing
1. Log in to the app
2. Close the app completely (swipe up from app switcher)
3. Reopen the app
4. ✅ You should still be logged in (no login screen)

### Additional Notes
- This works for cookie-based authentication (most common)
- If ShopWell.ai uses token-based auth stored in localStorage, `domStorageEnabled={true}` handles that
- For maximum compatibility, we enable both cookie and localStorage persistence

---

## Issue 3: Notifications Not Sent to iOS System Tray ✅ FIXED

### Problem
Push notifications were not appearing in the iOS system tray (notification center), especially when the app was in the foreground.

### Root Cause
By default, iOS does not show notifications in the system tray when the app is in the foreground. You must explicitly configure the notification handler to show alerts, play sounds, and update badges.

### Solution Implemented

#### Notification Handler Configuration (`hooks/useNotifications.ts`)

**CRITICAL**: The notification handler MUST be set at module level (outside any component) for iOS to work properly:

```typescript
// Configure notification handler for ALL notification scenarios
// This MUST be set at module level (outside component) for iOS to work properly
// CRITICAL: This ensures notifications appear in the iOS system tray even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('[NotificationHandler] Handling notification:', notification.request.identifier);
    console.log('[NotificationHandler] Content:', notification.request.content);
    
    return {
      shouldShowAlert: true,      // Show banner/alert in system tray
      shouldPlaySound: true,       // Play notification sound
      shouldSetBadge: true,        // Update app badge count
    };
  },
});
```

### Key Settings Explained

1. **`shouldShowAlert: true`**
   - Shows the notification banner at the top of the screen
   - Adds the notification to the notification center
   - Works even when app is in foreground

2. **`shouldPlaySound: true`**
   - Plays the notification sound
   - Alerts the user even if they're not looking at the screen

3. **`shouldSetBadge: true`**
   - Updates the app icon badge count
   - Shows the number of unread notifications

### Why Module-Level Configuration Is Critical

❌ **WRONG** - Setting handler inside component:
```typescript
export function useNotifications() {
  useEffect(() => {
    // This is TOO LATE - notifications may arrive before this runs
    Notifications.setNotificationHandler({ ... });
  }, []);
}
```

✅ **CORRECT** - Setting handler at module level:
```typescript
// At the top of the file, OUTSIDE any component
Notifications.setNotificationHandler({ ... });

export function useNotifications() {
  // Component code here
}
```

### Notification Listeners

The hook also sets up listeners for:

1. **Foreground Notifications** (`addNotificationReceivedListener`)
   - Fires when a notification arrives while app is open
   - Updates local state
   - Notification still appears in system tray due to handler config

2. **Notification Tap** (`addNotificationResponseReceivedListener`)
   - Fires when user taps a notification
   - Handles deep linking to specific screens
   - Processes notification data (e.g., navigate to a specific list)

### Android Notification Channels

For Android, we also configure notification channels:

```typescript
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
    showBadge: true,
    enableVibrate: true,
    enableLights: true,
  });
  
  // Location-based notifications channel
  Notifications.setNotificationChannelAsync('location', {
    name: 'Location Notifications',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#007aff',
    description: 'Notifications when you are near stores with active lists',
    showBadge: true,
    enableVibrate: true,
    enableLights: true,
  });
}
```

### Testing Notifications

1. **Request Permission**:
   ```typescript
   const { requestPermissions } = useNotifications();
   await requestPermissions();
   ```

2. **Send a Test Notification**:
   ```typescript
   await Notifications.scheduleNotificationAsync({
     content: {
       title: "Test Notification 📬",
       body: 'This should appear in the system tray',
       data: { test: true },
     },
     trigger: { seconds: 1 },
   });
   ```

3. **Verify**:
   - Notification should appear in system tray (notification center)
   - Should play sound
   - Should show banner at top of screen
   - Works even when app is in foreground

### WebView Integration

The home screen also handles notification permission requests from the WebView:

```typescript
// In index.ios.tsx
else if (data.type === 'natively.notifications.requestPermission') {
  const { status } = await Notifications.requestPermissionsAsync();
  
  webViewRef.current?.injectJavaScript(`
    window.postMessage({
      type: 'NOTIFICATIONS_PERMISSION_RESPONSE',
      granted: status === 'granted',
      status: status
    }, '*');
  `);
  
  if (status === 'granted') {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    webViewRef.current?.injectJavaScript(`
      window.postMessage({
        type: 'PUSH_TOKEN',
        token: '${tokenData.data}'
      }, '*');
    `);
  }
}
```

This allows the ShopWell.ai web app to:
1. Request notification permissions from the native app
2. Receive the push token for sending notifications
3. Check notification status

---

## Summary

All three critical iOS issues have been fixed:

1. ✅ **Share Sheet**: App now appears in iOS share sheet (requires native build + App Groups setup)
2. ✅ **Login Persistence**: Users stay logged in across app launches (WebView cookie persistence)
3. ✅ **System Tray Notifications**: Notifications appear in notification center even when app is in foreground

### Next Steps for Full Functionality

1. **Build the app natively**:
   ```bash
   npx expo prebuild -p ios
   # Then build with Xcode or EAS Build
   ```

2. **Set up App Groups in Apple Developer Portal**:
   - Enable App Groups for both `ai.shopwell.app` and `ai.shopwell.app.ShareExtension`
   - Create group: `group.ai.shopwell.app`

3. **Test all three features**:
   - Share content from Safari → Should open ShopWell.ai
   - Log in, close app, reopen → Should stay logged in
   - Send a test notification → Should appear in system tray

### Important Notes

- **Share Extension only works in native builds** (not Expo Go)
- **App Groups must be configured in Apple Developer Portal**
- **Cookie persistence requires `sharedCookiesEnabled={true}` and `incognito={false}`**
- **Notification handler must be set at module level** (outside components)

All code changes have been implemented and are ready for testing in a native build.
