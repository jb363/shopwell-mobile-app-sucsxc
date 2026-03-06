
# iOS Share Extension - Final Fix for Share Sheet Appearance

## Problem
The ShopWell.ai app is not appearing in the iOS share sheet despite having the Share Extension configured.

## Root Cause
The Share Extension requires a **native build** (not Expo Go) to appear in the iOS share sheet. The extension must be:
1. Properly compiled as a separate target
2. Embedded in the main app bundle
3. Signed with the correct provisioning profile
4. Installed on a physical device or simulator

## Solution Applied

### 1. Updated app.json Configuration
- Added explicit `CFBundleURLTypes` in `ios.infoPlist` to register the `shopwellaimobile://` URL scheme
- Added `entitlements` with app groups: `group.ai.shopwell.app`
- Incremented build number to `1.0.20`
- Added `NSExtensionActivationSupportsWebPageWithMaxCount` to activation rules

### 2. Updated Info.plist for Share Extension
- Added `CFBundlePackageType` set to `XPC!` (required for app extensions)
- Added `NSExtensionActivationSupportsWebPageWithMaxCount` to support web page sharing
- Synchronized version numbers with main app

### 3. Updated ShareViewController.swift
- Added `@objc(ShareViewController)` attribute for proper Objective-C bridging
- Added simple UI feedback ("Opening ShopWell.ai...")
- Improved error handling and logging
- Ensured proper extension lifecycle management

### 4. Updated withIOSShareExtension.js Plugin
- Added `LSApplicationQueriesSchemes` to allow the Share Extension to query if the main app can handle the URL scheme
- This is critical for iOS 9+ to allow inter-app communication

## How the Share Extension Works

### Flow:
1. User taps "Share" in Safari or another app
2. iOS shows share sheet with "ShopWell.ai" option
3. User taps "ShopWell.ai"
4. ShareViewController loads and processes the shared content
5. Extension creates deep link: `shopwellaimobile://share-target?type=url&content=https://example.com`
6. Extension opens main app via deep link
7. Main app navigates to `app/share-target.tsx`
8. Share target screen extracts data and redirects to home screen
9. Home screen receives shared data and injects it into WebView

### Supported Content Types:
- **URLs**: Web pages from Safari (most common use case)
- **Text**: Plain text content
- **Images**: Photos and images (up to 5)

## Build Requirements

### For Share Extension to Appear:
1. **Must use EAS Build or Xcode** (not Expo Go)
2. **Must install on device/simulator** (not just build)
3. **Must have valid provisioning profile** with App Groups capability
4. **Must have App Groups enabled** in Apple Developer Portal for both:
   - Main app: `ai.shopwell.app`
   - Share Extension: `ai.shopwell.app.ShareExtension`

### Build Commands:
```bash
# Clean prebuild
rm -rf ios android

# Prebuild with validation
npm run prebuild:ios

# Build with EAS
eas build --platform ios --profile development
```

### Verification Steps:
1. Install the built app on a physical device or simulator
2. Open Safari and navigate to any website
3. Tap the Share button (square with arrow pointing up)
4. Scroll through the share sheet options
5. Look for "ShopWell.ai" with the app icon
6. Tap it to test the sharing flow

## Troubleshooting

### Share Extension Not Appearing:
- **Check**: Are you testing in Expo Go? → Won't work, need native build
- **Check**: Did you install the app after building? → Must install, not just build
- **Check**: Is App Groups capability enabled in Apple Developer Portal?
- **Check**: Are both targets (main app + extension) using the same App Group ID?
- **Check**: Is the provisioning profile valid and not expired?

### Share Extension Crashes:
- **Check**: Are the bundle identifiers correct?
  - Main: `ai.shopwell.app`
  - Extension: `ai.shopwell.app.ShareExtension`
- **Check**: Is the URL scheme registered? → `shopwellaimobile`
- **Check**: Is the Swift code compiling without errors?

### Deep Link Not Opening Main App:
- **Check**: Is `CFBundleURLTypes` configured in main app's Info.plist?
- **Check**: Is `LSApplicationQueriesSchemes` set to allow querying the URL scheme?
- **Check**: Is the main app installed and not deleted?

## Testing Checklist

- [ ] Build app with EAS or Xcode (not Expo Go)
- [ ] Install app on device/simulator
- [ ] Open Safari and navigate to a website
- [ ] Tap Share button
- [ ] Verify "ShopWell.ai" appears in share sheet
- [ ] Tap "ShopWell.ai" option
- [ ] Verify main app opens
- [ ] Verify shared URL appears in app
- [ ] Test sharing text content
- [ ] Test sharing images

## Key Files Modified

1. `app.json` - Added URL scheme and entitlements
2. `targets/ShareExtension/Info.plist` - Added activation rules and package type
3. `targets/ShareExtension/ShareViewController.swift` - Improved implementation
4. `plugins/withIOSShareExtension.js` - Added LSApplicationQueriesSchemes

## Next Steps

1. **Run prebuild**: `npm run prebuild:ios`
2. **Build with EAS**: `eas build --platform ios --profile development`
3. **Install on device**: Download and install the built IPA
4. **Test share sheet**: Open Safari → Share → Look for "ShopWell.ai"

## Important Notes

- Share Extensions **ONLY work in native builds**, not Expo Go
- The extension must be **properly signed** with a provisioning profile that includes App Groups
- The App Group ID must be **registered in Apple Developer Portal**
- Both the main app and extension must use the **same App Group ID**
- Changes to native code require a **new build** (prebuild + EAS build)

## Success Criteria

✅ "ShopWell.ai" appears in iOS share sheet when sharing from Safari
✅ Tapping the option opens the main app
✅ Shared content (URL, text, or image) is passed to the app
✅ App displays or processes the shared content correctly
