
# iOS Share Extension Setup Guide - UPDATED

## Overview
This guide explains how the iOS Share Extension is configured to make "ShopWell.ai Mobile" appear as an option in the iOS share sheet.

## What is an iOS Share Extension?
An iOS Share Extension is a native iOS app extension that allows your app to receive shared content from other apps (Safari, Photos, Notes, etc.). Unlike Android's intent filters which can be configured in `app.json`, iOS requires a separate native target with its own Swift code and configuration.

## Current Configuration (FIXED)

### 1. Config Plugin (`plugins/withIOSShareExtension.js`)
This plugin configures the main app to support sharing:
- Adds app groups entitlement for data sharing between main app and extension
- Configures URL schemes for deep linking (`shopwellaimobile://`)
- Sets up universal links for `shopwell.ai` domain

### 2. Apple Targets Plugin (`@bacons/apple-targets`)
We use the `@bacons/apple-targets` package to create the Share Extension target in `app.json`:

```json
{
  "@bacons/apple-targets": {
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
              "NSExtensionActivationSupportsImageWithMaxCount": 5
            }
          },
          "NSExtensionPointIdentifier": "com.apple.share-services",
          "NSExtensionPrincipalClass": "ShareViewController"
        }
      }
    }
  }
}
```

### 3. Native Swift Code
**File**: `targets/ShareExtension/ShareViewController.swift`

This is the actual Share Extension code that:
- Receives shared content from iOS
- Extracts URLs, text, or images
- Stores data in the shared app group container
- Opens the main app via deep link: `shopwellaimobile://share-target?type=url&content=...`

### 4. What Content Can Be Shared?
The Share Extension is configured to accept:
- **URLs** - Web pages from Safari and other browsers (1 at a time)
- **Text** - Plain text content
- **Images** - Photos and images (up to 5 at once)

## How It Works

### Step 1: User Shares Content
1. User opens Safari, Photos, or any app
2. Taps the Share button (square with arrow)
3. Sees "ShopWell.ai" in the share sheet
4. Taps the ShopWell.ai option

### Step 2: Share Extension Receives Content
The Share Extension (`ShareViewController.swift`) receives the shared content and:
1. Extracts the URL, text, or image data
2. Stores it in the shared app group container (`group.ai.shopwell.app`)
3. Creates a deep link: `shopwellaimobile://share-target?type=url&content=https://example.com`
4. Opens the main ShopWell.ai app via the deep link

### Step 3: Main App Processes Content
The main app:
1. Receives the deep link at `/share-target` route
2. Extracts the shared data from URL parameters (`params.type`, `params.content`)
3. Redirects to home screen: `/(tabs)/(home)/` with shared data as params
4. Home screen (`index.ios.tsx`) receives the shared content
5. WebView receives the `SHARED_CONTENT` message via `postMessage`

## Building the App

### ⚠️ CRITICAL: Share Extensions Require a Native Build

**Share Extensions do NOT work in:**
- ❌ Expo Go
- ❌ Expo Dev Client (without prebuild)
- ❌ Web preview

**Share Extensions ONLY work in:**
- ✅ EAS Build (production or development profile)
- ✅ Local builds with `npx expo prebuild` + Xcode

### Build with EAS (Recommended)

```bash
# Production build
eas build --platform ios

# Development build (for testing)
eas build --profile development --platform ios
```

The Share Extension will be automatically included in the build.

### Local Build (Advanced)

If you need to build locally:

```bash
# 1. Generate native iOS project
npx expo prebuild --platform ios

# 2. Open in Xcode
open ios/ShopWellaiMobile.xcworkspace

# 3. Build and run on device
# (Share Extensions don't work in iOS Simulator for testing)
```

## Verification

After building and installing the app on a **physical iOS device**:

1. Open Safari on your iOS device
2. Navigate to any website (e.g., https://amazon.com)
3. Tap the Share button (square with arrow pointing up)
4. Scroll through the share options
5. You should see **"ShopWell.ai"** with the app icon
6. Tap it to share the URL to the app
7. The ShopWell.ai app should open and receive the shared URL

## Troubleshooting

### Share Extension Not Appearing in Share Sheet

**Possible Causes:**
1. **App not built with native code** - Share Extensions require a native build (EAS Build or `npx expo prebuild`)
2. **Testing in Expo Go** - Share Extensions don't work in Expo Go
3. **Testing in iOS Simulator** - Share Extensions may not appear in simulator; test on a physical device
4. **App not installed correctly** - Try uninstalling and reinstalling the app

**Solution:**
- Build with EAS Build: `eas build --platform ios`
- Install on a physical iOS device
- Restart the device after installation

### Share Extension Appears but Crashes

**Possible Causes:**
1. Missing app group entitlement
2. Incorrect bundle identifier
3. Swift code compilation error

**Solution:**
- Check EAS Build logs for compilation errors
- Verify bundle identifiers match:
  - Main app: `ai.shopwell.app`
  - Share Extension: `ai.shopwell.app.ShareExtension`
- Verify app group: `group.ai.shopwell.app`

### Shared Content Not Reaching Main App

**Possible Causes:**
1. Deep linking not configured correctly
2. URL scheme not registered
3. `/share-target` route not handling params correctly

**Solution:**
- Verify URL scheme `shopwellaimobile` is registered in `app.json`
- Check logs in `app/share-target.tsx` for received params
- Verify home screen (`app/(tabs)/(home)/index.ios.tsx`) receives shared content

### Share Extension Shows "?" Icon

**Cause:** Icon not configured correctly in `@bacons/apple-targets`

**Solution:** Verify `icon` path in `app.json` points to a valid PNG file

## Technical Details

### App Groups
App groups allow the Share Extension and main app to share data:
- **Group ID**: `group.ai.shopwell.app`
- **Purpose**: Pass shared content from extension to main app
- **Storage**: `UserDefaults(suiteName: "group.ai.shopwell.app")`

### Bundle Identifiers
- **Main app**: `ai.shopwell.app`
- **Share Extension**: `ai.shopwell.app.ShareExtension`

### Deep Linking Flow
```
User shares URL in Safari
    ↓
iOS Share Sheet shows "ShopWell.ai"
    ↓
User taps "ShopWell.ai"
    ↓
ShareViewController.swift receives URL
    ↓
Stores in app group: UserDefaults(suiteName: "group.ai.shopwell.app")
    ↓
Opens deep link: shopwellaimobile://share-target?type=url&content=https://example.com
    ↓
Main app opens at /share-target route
    ↓
Extracts params: { type: "url", content: "https://example.com" }
    ↓
Redirects to /(tabs)/(home)/ with params
    ↓
index.ios.tsx receives shared content
    ↓
WebView receives SHARED_CONTENT message via postMessage
    ↓
shopwell.ai web app processes shared content
```

### URL Scheme
- **Scheme**: `shopwellaimobile`
- **Format**: `shopwellaimobile://share-target?type={type}&content={content}`
- **Types**: `url`, `text`, `image`

### Associated Domains (Universal Links)
- `applinks:shopwell.ai`
- `applinks:*.shopwell.ai`
- Enables opening `https://shopwell.ai/*` URLs directly in the app

## Files Structure

```
app.json                                    # Main config with @bacons/apple-targets
plugins/withIOSShareExtension.js            # Config plugin for app groups & URL schemes
targets/ShareExtension/ShareViewController.swift  # Share Extension Swift code
targets/ShareExtension/Info.plist           # Share Extension Info.plist
app/share-target.tsx                        # Route that receives shared content
app/(tabs)/(home)/index.ios.tsx             # Home screen that processes shared content
```

## Next Steps

1. **Build the app** with EAS Build
   ```bash
   eas build --platform ios
   ```

2. **Install on a physical iOS device**
   - Download from TestFlight or install IPA directly
   - Share Extensions don't work reliably in iOS Simulator

3. **Test sharing from Safari**
   - Open Safari
   - Navigate to any website
   - Tap Share button
   - Look for "ShopWell.ai" in the share sheet
   - Tap it and verify the app opens with the shared URL

4. **Verify shared content reaches WebView**
   - Check console logs in `app/(tabs)/(home)/index.ios.tsx`
   - Verify WebView receives `SHARED_CONTENT` message
   - Confirm shopwell.ai web app processes the shared content

## Support

### Build Issues
- Check EAS Build logs: `eas build:list`
- Verify `@bacons/apple-targets` is installed: `npm list @bacons/apple-targets`
- Ensure Swift code compiles without errors

### Runtime Issues
- Check device logs in Xcode: Window → Devices and Simulators → Select device → Open Console
- Look for logs from "ShareExtension" process
- Verify deep link opens the app: `shopwellaimobile://share-target?type=url&content=test`

### Integration Issues
- Check logs in `app/share-target.tsx` for received params
- Verify home screen receives shared content in params
- Check WebView message passing in `index.ios.tsx`

## Related Files
- `app.json` - Main configuration with `@bacons/apple-targets` plugin
- `plugins/withIOSShareExtension.js` - Config plugin for iOS setup
- `targets/ShareExtension/ShareViewController.swift` - Share Extension Swift code
- `targets/ShareExtension/Info.plist` - Share Extension configuration
- `app/share-target.tsx` - Screen that receives shared content
- `app/(tabs)/(home)/index.ios.tsx` - Home screen that processes shared content
- `hooks/useSharing.ts` - Hook for sharing content from the app
- `utils/shareHandler.ts` - Utilities for handling shared content

---

**Status**: ✅ Configuration complete with native Swift code. Ready for EAS Build.

**Important**: You MUST build with EAS Build for the Share Extension to work. It will NOT work in Expo Go or without a native build.
