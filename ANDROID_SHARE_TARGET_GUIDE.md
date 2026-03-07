
# Android Share Target Implementation Guide

## Overview

This guide documents the Android share target implementation for ShopWell.ai Mobile, enabling the app to appear in the Android share sheet and receive shared content from other apps.

## Problem Statement

**Before:** The Android native wrapper did not register Intent Filters for `ACTION_SEND` / `ACTION_SEND_MULTIPLE`, preventing the app from:
- Appearing in the Android share sheet
- Receiving shared content (URLs, text, images) from other apps
- Forwarding share data to the WebView

**Why PWA worked but native didn't:**
- PWA: Android reads `manifest.json`'s `share_target` field directly
- Native: The wrapper ignores `manifest.json` entirely and requires explicit Intent Filters in `AndroidManifest.xml`

## Solution

### 1. Android Config Plugin (`plugins/withAndroidShareTarget.js`)

Created a config plugin that automatically injects the required Intent Filters into `AndroidManifest.xml` during the prebuild phase.

**Intent Filters Added:**

```xml
<!-- Share text/plain (URLs and text) -->
<intent-filter>
  <action android:name="android.intent.action.SEND" />
  <category android:name="android.intent.category.DEFAULT" />
  <data android:mimeType="text/plain" />
</intent-filter>

<!-- Share single image -->
<intent-filter>
  <action android:name="android.intent.action.SEND" />
  <category android:name="android.intent.category.DEFAULT" />
  <data android:mimeType="image/*" />
</intent-filter>

<!-- Share multiple images -->
<intent-filter>
  <action android:name="android.intent.action.SEND_MULTIPLE" />
  <category android:name="android.intent.category.DEFAULT" />
  <data android:mimeType="image/*" />
</intent-filter>
```

### 2. Share Data Flow

**Android Share Sheet → Intent → MainActivity → WebView → shopwell.ai/share-target**

1. **User shares content** from another app (Chrome, Gallery, etc.)
2. **Android OS** shows share sheet with ShopWell.ai as an option
3. **MainActivity** receives the Intent with extras:
   - `Intent.EXTRA_TEXT` for URLs/text
   - `Intent.EXTRA_STREAM` for images
4. **App launches** and navigates to `app/share-target.tsx`
5. **share-target.tsx** extracts the shared data from URL params
6. **Redirects to home** with `sharedContent` and `sharedType` params
7. **Home screen** (index.android.tsx) injects the data into WebView
8. **WebView** navigates to `https://shopwell.ai/share-target` with the shared content

### 3. WebView Integration (index.android.tsx)

The Android home screen handles shared content via URL parameters:

```typescript
useEffect(() => {
  if (params.sharedContent && params.sharedType && webViewRef.current && webViewLoaded) {
    const message = {
      type: 'SHARED_CONTENT',
      contentType: sharedTypeStr,
      content: sharedContentStr
    };
    
    // Inject shared content and navigate to share-target page
    webViewRef.current?.injectJavaScript(`
      window.postMessage(${JSON.stringify(message)}, '*');
      window.location.href = 'https://shopwell.ai/share-target';
    `);
  }
}, [params.sharedContent, params.sharedType, webViewLoaded]);
```

### 4. Share Target Screen (app/share-target.tsx)

Acts as a router that:
- Receives shared data from deep links or Intent extras
- Extracts and normalizes the data
- Redirects to the home screen with proper params

**Supported Parameters:**
- `text` - Plain text or URLs (from `Intent.EXTRA_TEXT`)
- `url` - Direct URL sharing
- `image` - Image URIs (from `Intent.EXTRA_STREAM`)
- `content` + `type` - Generic content with type

## Diagnostic Tools

### 1. Native Bridge Debug Screen (`app/native-debug.tsx`)

Real-time monitoring of native messages between the app and WebView.

**Features:**
- Live message logging (incoming/outgoing)
- Timestamp tracking
- Test actions for share intents and push tokens
- Pause/resume listening
- Clear message history

**Access:** Navigate to `/native-debug` in the app

**Use Cases:**
- Verify share intent data is being received
- Debug WebView message passing
- Test push token registration
- Monitor native bridge communication

### 2. Push Diagnostics Screen (`app/push-diagnostics.tsx`)

Comprehensive push notification debugging and status checking.

**Features:**
- Permission status display
- Push token information
- Subscription details (platform, created/updated dates)
- Test notification sender
- Troubleshooting guide

**Access:** Navigate to `/push-diagnostics` in the app

**Use Cases:**
- Check if push notifications are properly configured
- Verify token registration
- Test local notifications
- Debug FCM payload issues

## Testing

### Testing Share Target

1. **Build the app** with the new config plugin:
   ```
   The config plugin will run automatically during prebuild
   ```

2. **Install on Android device**

3. **Test sharing from Chrome:**
   - Open a webpage in Chrome
   - Tap Share button
   - Look for "ShopWell.ai Mobile" in the share sheet
   - Select it and verify the URL is received

4. **Test sharing text:**
   - Select text in any app
   - Tap Share
   - Select ShopWell.ai Mobile
   - Verify text is received

5. **Test sharing images:**
   - Open Gallery app
   - Select an image
   - Tap Share
   - Select ShopWell.ai Mobile
   - Verify image URI is received

6. **Use Native Debug screen:**
   - Navigate to `/native-debug`
   - Share content from another app
   - Verify messages appear in the debug log

### Testing Push Notifications

1. **Check permission status:**
   - Navigate to `/push-diagnostics`
   - View current permission status

2. **Request permission:**
   - Tap "Request Permission" button
   - Grant notification permission
   - Verify token is generated

3. **Test local notification:**
   - Tap "Send Test Notification"
   - Verify notification appears in system tray

4. **Test remote notification:**
   - Use Expo push notification tool or backend
   - Send a test notification
   - Verify it appears in system tray

## Push Notification Payload Requirements

### Android FCM Payload Structure

**CRITICAL:** Android requires the `notification` field for system tray display.

**Correct Payload:**
```json
{
  "message": {
    "token": "ExponentPushToken[...]",
    "notification": {
      "title": "New item added",
      "body": "Someone added milk to your list"
    },
    "data": {
      "route": "/lists/abc",
      "listId": "123"
    }
  }
}
```

**Incorrect Payload (won't show in tray):**
```json
{
  "message": {
    "token": "ExponentPushToken[...]",
    "data": {
      "title": "New item added",
      "body": "Someone added milk to your list",
      "route": "/lists/abc"
    }
  }
}
```

### Why This Matters

- **With `notification` field:** Android displays the notification in the system tray automatically
- **Without `notification` field:** The notification is delivered as a "data-only" message, which requires the app to be running and manually create a system notification
- **Background behavior:** Data-only messages are silently dropped when the app is in the background

## Configuration

### app.json

The Android share target plugin is registered in the plugins array:

```json
{
  "plugins": [
    "./plugins/withAndroidShareTarget",
    // ... other plugins
  ]
}
```

### No Additional Configuration Required

The plugin automatically:
- Detects the MainActivity in AndroidManifest.xml
- Injects the required Intent Filters
- Preserves existing configuration

## Comparison: iOS vs Android

| Feature | iOS | Android |
|---------|-----|---------|
| **Implementation** | Share Extension (NSExtension) | Intent Filters |
| **Config Plugin** | @bacons/apple-targets | ./plugins/withAndroidShareTarget |
| **Data Transfer** | App Groups + URL Scheme | Intent Extras + Deep Links |
| **Activation Rules** | NSExtensionActivationRule | Intent Filter mimeType |
| **Supported Types** | URLs, Text, Images, Web Pages | URLs, Text, Images |
| **Native Code** | ShareViewController.swift | MainActivity (auto-handled) |

## Troubleshooting

### App doesn't appear in share sheet

1. **Verify prebuild ran:** Check that `expo prebuild` was executed
2. **Check AndroidManifest.xml:** Ensure Intent Filters are present in `android/app/src/main/AndroidManifest.xml`
3. **Rebuild the app:** Clean build and reinstall
4. **Check logs:** Use Native Debug screen to see if intents are being received

### Shared content not reaching WebView

1. **Check share-target.tsx:** Verify params are being extracted correctly
2. **Check index.android.tsx:** Verify `useEffect` is triggering
3. **Use Native Debug screen:** Monitor message flow
4. **Check WebView logs:** Look for JavaScript errors in the WebView

### Push notifications not appearing

1. **Check permission:** Use Push Diagnostics screen
2. **Verify FCM payload:** Ensure `notification` field is present
3. **Test local notification:** Use "Send Test Notification" button
4. **Check backend:** Verify FCM HTTP v1 API is being used correctly

## Next Steps

1. **Backend Integration:**
   - Implement `POST /api/push-subscriptions` endpoint
   - Implement `GET /api/push-subscriptions/me` endpoint
   - Update FCM payload to include `notification` field

2. **WebView Integration:**
   - Ensure `https://shopwell.ai/share-target` page exists
   - Handle `SHARED_CONTENT` messages from native bridge
   - Process shared URLs, text, and images

3. **Testing:**
   - Test on multiple Android devices
   - Test with various apps (Chrome, Gallery, Gmail, etc.)
   - Test push notifications from backend

## Resources

- [Android Intent Filters Documentation](https://developer.android.com/guide/components/intents-filters)
- [Expo Config Plugins](https://docs.expo.dev/guides/config-plugins/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/)

## Status

✅ **Implemented:**
- Android share target config plugin
- Intent Filters for SEND and SEND_MULTIPLE
- Share data flow from Intent → WebView
- Native Bridge Debug screen
- Push Diagnostics screen

⏳ **Pending:**
- Backend push subscription endpoints
- FCM payload verification
- WebView share-target page integration
- End-to-end testing on physical devices

🔧 **Known Issues:**
- Push notifications may not appear in system tray if FCM payload lacks `notification` field
- Image sharing requires proper URI handling in WebView
- Multiple image sharing (SEND_MULTIPLE) needs additional testing
