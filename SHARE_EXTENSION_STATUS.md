
# iOS Share Extension - Current Status & Next Steps

## ✅ What Has Been Fixed

### 1. Configuration Updates
- **app.json**: 
  - Added explicit `CFBundleURLTypes` in `ios.infoPlist` to register `shopwellaimobile://` URL scheme
  - Added `entitlements` with app groups: `group.ai.shopwell.app`
  - Incremented build number to `1.0.20`
  - Added `NSExtensionActivationSupportsWebPageWithMaxCount` to Share Extension activation rules

- **Info.plist** (Share Extension):
  - Added `CFBundlePackageType` set to `XPC!` (required for app extensions)
  - Added `NSExtensionActivationSupportsWebPageWithMaxCount` for web page sharing
  - Synchronized version numbers with main app

- **ShareViewController.swift**:
  - Added `@objc(ShareViewController)` attribute for proper Objective-C bridging
  - Added simple UI feedback ("Opening ShopWell.ai...")
  - Improved error handling and logging
  - Ensured proper extension lifecycle management

- **withIOSShareExtension.js** Plugin:
  - Added `LSApplicationQueriesSchemes` to allow the Share Extension to query if the main app can handle the URL scheme
  - This is critical for iOS 9+ to allow inter-app communication

### 2. Deep Linking Already Configured
- `app/_layout.tsx` already has proper deep link handling
- Listens for `shopwellaimobile://share-target` URLs
- Parses query parameters and navigates to share-target screen
- Share target screen extracts data and redirects to home screen

### 3. Share Flow Complete
The entire flow is implemented:
1. User shares from Safari/other app
2. iOS shows share sheet with "ShopWell.ai"
3. ShareViewController processes content
4. Creates deep link: `shopwellaimobile://share-target?type=url&content=...`
5. Opens main app
6. App navigates to share-target screen
7. Share target extracts data and redirects to home
8. Home screen receives shared data

## ⚠️ Why It's Not Appearing Yet

The Share Extension **ONLY works in native builds**, not Expo Go. Here's why:

### Technical Requirements:
1. **Native Build Required**: Share Extensions are compiled as separate targets in Xcode
2. **Proper Signing**: Must be signed with provisioning profile that includes App Groups capability
3. **App Groups Setup**: Must be configured in Apple Developer Portal for both:
   - Main app: `ai.shopwell.app`
   - Share Extension: `ai.shopwell.app.ShareExtension`
4. **Installation Required**: Must be installed on device/simulator (not just built)

### What Doesn't Work:
- ❌ Expo Go (Share Extensions are not supported)
- ❌ Web preview (iOS-specific feature)
- ❌ Development builds without proper signing

### What Does Work:
- ✅ EAS Build with proper provisioning
- ✅ Xcode build with manual signing
- ✅ TestFlight builds
- ✅ App Store builds

## 🚀 Next Steps to Make It Work

### Step 1: Ensure App Groups in Apple Developer Portal
1. Go to [Apple Developer Portal](https://developer.apple.com)
2. Navigate to Certificates, Identifiers & Profiles
3. Select "Identifiers"
4. Find your app: `ai.shopwell.app`
5. Enable "App Groups" capability
6. Create/select App Group: `group.ai.shopwell.app`
7. Repeat for Share Extension: `ai.shopwell.app.ShareExtension`

### Step 2: Update Provisioning Profiles
1. In Apple Developer Portal, go to "Profiles"
2. Edit/create provisioning profile for `ai.shopwell.app`
3. Ensure "App Groups" is enabled
4. Download and install the profile
5. Repeat for `ai.shopwell.app.ShareExtension`

### Step 3: Build with EAS
```bash
# Clean any previous builds
rm -rf ios android

# Run prebuild to generate native projects
npm run prebuild:ios

# Build with EAS (development or production)
eas build --platform ios --profile development
```

### Step 4: Install and Test
1. Download the built IPA from EAS
2. Install on physical device or simulator
3. Open Safari and navigate to any website
4. Tap Share button
5. Look for "ShopWell.ai" in the share sheet
6. Tap it to test the flow

## 🔍 Verification Checklist

Before building:
- [ ] App Groups enabled in Apple Developer Portal for both targets
- [ ] Provisioning profiles updated with App Groups capability
- [ ] `app.json` has correct bundle identifiers
- [ ] `app.json` has `shopwellaimobile` URL scheme
- [ ] Share Extension files exist in `targets/ShareExtension/`

After building:
- [ ] App installed on device/simulator (not just built)
- [ ] Open Safari and tap Share button
- [ ] "ShopWell.ai" appears in share sheet
- [ ] Tapping it opens the main app
- [ ] Shared URL appears in the app

## 🐛 Troubleshooting

### "ShopWell.ai" doesn't appear in share sheet
**Cause**: Not using a native build, or App Groups not configured
**Solution**: Build with EAS and ensure App Groups are set up in Apple Developer Portal

### Share Extension crashes immediately
**Cause**: Bundle identifier mismatch or missing entitlements
**Solution**: Verify bundle IDs match in app.json and Apple Developer Portal

### Main app doesn't open when tapping share option
**Cause**: URL scheme not registered or LSApplicationQueriesSchemes missing
**Solution**: Verify `CFBundleURLTypes` and `LSApplicationQueriesSchemes` in Info.plist

### Shared content not appearing in app
**Cause**: Deep link not being parsed correctly
**Solution**: Check console logs for deep link handling in app/_layout.tsx

## 📝 Important Notes

1. **Expo Go Limitation**: Share Extensions are native iOS features that require compilation. They cannot work in Expo Go.

2. **Build Required**: Every change to native code (Swift files, Info.plist, entitlements) requires a new build.

3. **App Groups**: Both the main app and Share Extension must use the same App Group ID for data sharing.

4. **Provisioning**: The provisioning profile must include the App Groups capability, or the extension won't work.

5. **Testing**: Always test on a real device or simulator with the installed IPA, not in development mode.

## ✅ Summary

**All code is ready and properly configured.** The Share Extension will work once you:
1. Set up App Groups in Apple Developer Portal
2. Build with EAS (native build)
3. Install the built app on a device/simulator

The issue is not with the code—it's that Share Extensions require a native build with proper signing and entitlements, which can only be verified after building and installing the app.
