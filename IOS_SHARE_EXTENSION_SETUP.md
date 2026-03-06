
# iOS Share Extension Setup Guide

## Overview
This guide explains how the iOS Share Extension is configured to make "ShopWell.ai Mobile" appear as an option in the iOS share sheet.

## What is an iOS Share Extension?
An iOS Share Extension is a native iOS app extension that allows your app to receive shared content from other apps (Safari, Photos, Notes, etc.). Unlike Android's intent filters which can be configured in `app.json`, iOS requires a separate native target with its own code and configuration.

## Current Configuration

### 1. Config Plugin (`plugins/withIOSShareExtension.js`)
This plugin configures the main app to support sharing:
- Adds app groups entitlement for data sharing between main app and extension
- Configures URL schemes for deep linking
- Sets up universal links for `shopwell.ai` domain

### 2. Apple Targets Plugin (`@bacons/apple-targets`)
We use the `@bacons/apple-targets` package to create the Share Extension target:

```json
{
  "type": "share-extension",
  "name": "ShareExtension",
  "bundleIdentifier": "ai.shopwell.app.ShareExtension",
  "deploymentTarget": "13.0",
  "icon": "./assets/images/shopwell-ai-app-icon.png"
}
```

This configuration:
- Creates a Share Extension target named "ShareExtension"
- Uses bundle ID: `ai.shopwell.app.ShareExtension`
- Supports iOS 13.0 and later
- Uses the ShopWell.ai app icon

### 3. What Content Can Be Shared?
The Share Extension is configured to accept:
- **URLs** - Web pages from Safari and other browsers
- **Text** - Plain text content
- **Images** - Photos and images (up to 10 at once)
- **Files** - Single file sharing

## How It Works

### Step 1: User Shares Content
1. User opens Safari, Photos, or any app
2. Taps the Share button
3. Sees "ShopWell.ai Mobile" in the share sheet
4. Taps the ShopWell.ai option

### Step 2: Share Extension Receives Content
The Share Extension (a separate mini-app) receives the shared content and:
1. Extracts the URL, text, or image data
2. Stores it in the shared app group container
3. Opens the main ShopWell.ai app via deep link

### Step 3: Main App Processes Content
The main app:
1. Receives the deep link with shared content
2. Routes to `/share-target` screen
3. Extracts the shared data from URL parameters
4. Redirects to home screen with the shared content
5. WebView receives the `SHARED_CONTENT` message

## Building the App

### For Development (Expo Go)
⚠️ **Share Extensions do NOT work in Expo Go**. You must create a development build.

### For Production Build
The Share Extension will be automatically included when you build with EAS:

```bash
# iOS build (this will include the Share Extension)
eas build --platform ios
```

### For Local Development Build
If you need to test locally:

```bash
# Create a development build with the Share Extension
eas build --profile development --platform ios
```

## Verification

After building and installing the app:

1. Open Safari on your iOS device
2. Navigate to any website
3. Tap the Share button (square with arrow)
4. Scroll through the share options
5. You should see "ShopWell.ai Mobile" with the app icon

## Troubleshooting

### Share Extension Not Appearing
- **Cause**: The app needs to be rebuilt with `npx expo prebuild` to generate native code
- **Solution**: Create a new build with EAS Build

### Share Extension Crashes
- **Cause**: Missing app group entitlement or incorrect bundle identifier
- **Solution**: Verify the bundle identifier matches in both `app.json` and the Share Extension config

### Shared Content Not Reaching Main App
- **Cause**: Deep linking not configured correctly
- **Solution**: Verify URL scheme `shopwellaimobile` is registered and the app handles the `/share-target` route

## Technical Details

### App Groups
App groups allow the Share Extension and main app to share data:
- Group ID: `group.ai.shopwell.app`
- Used to pass shared content from extension to main app

### Bundle Identifiers
- Main app: `ai.shopwell.app`
- Share Extension: `ai.shopwell.app.ShareExtension`

### Deep Linking Flow
```
Share Extension → App Group Storage → Deep Link → Main App → /share-target → Home Screen → WebView
```

## Next Steps

1. **Build the app** with EAS Build to include the Share Extension
2. **Test sharing** from Safari, Photos, and other apps
3. **Verify** the shared content reaches the WebView correctly
4. **Monitor logs** in the home screen to see shared content processing

## Related Files
- `app.json` - Main configuration with plugins
- `plugins/withIOSShareExtension.js` - Config plugin for iOS setup
- `app/share-target.tsx` - Screen that receives shared content
- `app/(tabs)/(home)/index.ios.tsx` - Home screen that processes shared content
- `hooks/useSharing.ts` - Hook for sharing content from the app
- `utils/shareHandler.ts` - Utilities for handling shared content

## Support
For issues with the Share Extension, check:
1. EAS Build logs for compilation errors
2. Xcode console logs when testing on device
3. App logs in `app/(tabs)/(home)/index.ios.tsx` for shared content processing
