
# Building ShopWell.ai with iOS Share Extension

## What Changed
The iOS Share Extension configuration has been **fixed and completed**. The app will now appear in the iOS share sheet as "ShopWell.ai" when users share content from Safari, Photos, and other apps.

## What Was Fixed

### 1. Corrected `@bacons/apple-targets` Configuration
**File**: `app.json`

The previous configuration was incomplete. The fixed version includes:
- ✅ Proper `NSExtension` configuration in `infoPlist`
- ✅ `NSExtensionActivationRule` to specify supported content types
- ✅ `NSExtensionPointIdentifier` set to `com.apple.share-services`
- ✅ `NSExtensionPrincipalClass` pointing to `ShareViewController`

### 2. Added Native Swift Code
**Files**: 
- `targets/ShareExtension/ShareViewController.swift` - Share Extension implementation
- `targets/ShareExtension/Info.plist` - Share Extension configuration

This is the actual Share Extension code that runs when users tap "ShopWell.ai" in the share sheet.

## How to Build

### Option 1: EAS Build (Recommended)

This is the easiest and most reliable method:

```bash
# Production build
eas build --platform ios

# Development build (for testing)
eas build --profile development --platform ios
```

The Share Extension will be automatically included in the build.

### Option 2: Local Build (Advanced)

If you need to build locally:

```bash
# 1. Install dependencies
npm install

# 2. Generate native iOS project
npx expo prebuild --platform ios --clean

# 3. Open in Xcode
open ios/ShopWellaiMobile.xcworkspace

# 4. In Xcode:
#    - Select your development team
#    - Select a physical iOS device (not simulator)
#    - Click Run (⌘R)
```

**Note**: Share Extensions work best on physical devices. Testing in the iOS Simulator may not show the share extension in the share sheet.

## Testing the Share Extension

After installing the app on a physical iOS device:

### Test 1: Share from Safari
1. Open Safari
2. Navigate to any website (e.g., https://amazon.com)
3. Tap the Share button (square with arrow)
4. Scroll through the share options
5. **Look for "ShopWell.ai"** with the app icon
6. Tap it
7. The ShopWell.ai app should open with the shared URL

### Test 2: Share from Photos
1. Open Photos app
2. Select a photo
3. Tap the Share button
4. Look for "ShopWell.ai"
5. Tap it
6. The ShopWell.ai app should open with the shared image

### Test 3: Share Text
1. Open Notes app
2. Select some text
3. Tap Share
4. Look for "ShopWell.ai"
5. Tap it
6. The ShopWell.ai app should open with the shared text

## What to Expect

### When Share Extension Works Correctly:
1. ✅ "ShopWell.ai" appears in the iOS share sheet
2. ✅ Tapping it opens the ShopWell.ai app
3. ✅ The app receives the shared content (URL, text, or image)
4. ✅ The WebView receives a `SHARED_CONTENT` message
5. ✅ The shopwell.ai web app can process the shared content

### If Share Extension Doesn't Appear:
- ❌ App was not built with native code (using Expo Go)
- ❌ Testing in iOS Simulator (use physical device)
- ❌ App not installed correctly (try reinstalling)
- ❌ Device needs restart after installation

## Troubleshooting

### "I don't see ShopWell.ai in the share sheet"

**Solution 1**: Rebuild with EAS Build
```bash
eas build --platform ios
```

**Solution 2**: Test on a physical device, not simulator

**Solution 3**: Restart your iOS device after installing the app

**Solution 4**: Check that the app is installed correctly (not via Expo Go)

### "Share Extension crashes when I tap it"

**Check EAS Build logs:**
```bash
eas build:list
# Click on the build to see logs
```

Look for Swift compilation errors in the logs.

### "App opens but doesn't receive shared content"

**Check logs in the app:**
1. Open the app
2. Check console logs in `app/share-target.tsx`
3. Look for: `[ShareTarget] 📤 Screen opened with params:`
4. Verify params contain `type` and `content`

## Technical Details

### Supported Content Types
- **URLs**: Web pages from Safari, Chrome, etc. (1 at a time)
- **Text**: Plain text from Notes, Messages, etc.
- **Images**: Photos from Photos app, screenshots, etc. (up to 5)

### Deep Link Format
```
shopwellaimobile://share-target?type={type}&content={content}
```

Examples:
- `shopwellaimobile://share-target?type=url&content=https%3A%2F%2Famazon.com`
- `shopwellaimobile://share-target?type=text&content=Hello%20World`
- `shopwellaimobile://share-target?type=image&content=file%3A%2F%2F...`

### App Group
- **ID**: `group.ai.shopwell.app`
- **Purpose**: Share data between Share Extension and main app
- **Used for**: Backup storage of shared content

### Bundle Identifiers
- **Main app**: `ai.shopwell.app`
- **Share Extension**: `ai.shopwell.app.ShareExtension`

## Files Modified

1. ✅ `app.json` - Fixed `@bacons/apple-targets` configuration
2. ✅ `targets/ShareExtension/ShareViewController.swift` - New Share Extension code
3. ✅ `targets/ShareExtension/Info.plist` - New Share Extension config
4. ✅ `IOS_SHARE_EXTENSION_SETUP.md` - Updated documentation
5. ✅ `BUILD_IOS_SHARE_EXTENSION.md` - This file

## Next Steps

1. **Build the app** with EAS Build:
   ```bash
   eas build --platform ios
   ```

2. **Install on a physical iOS device**
   - Use TestFlight for distribution
   - Or install IPA directly via Xcode

3. **Test the share extension**
   - Share from Safari, Photos, Notes
   - Verify "ShopWell.ai" appears in share sheet
   - Confirm app opens and receives shared content

4. **Monitor logs**
   - Check `app/share-target.tsx` for received params
   - Check `app/(tabs)/(home)/index.ios.tsx` for WebView messages
   - Verify shopwell.ai web app processes shared content

## Important Notes

- ⚠️ **Share Extensions require a native build** - They do NOT work in Expo Go
- ⚠️ **Test on physical devices** - Share Extensions may not appear in iOS Simulator
- ⚠️ **Restart device after installation** - iOS sometimes needs a restart to register the Share Extension
- ⚠️ **Check build logs** - If the Share Extension doesn't appear, check EAS Build logs for Swift compilation errors

## Support

If you encounter issues:

1. **Check EAS Build logs**: `eas build:list`
2. **Verify native code was generated**: Look for `targets/ShareExtension/` folder after `npx expo prebuild`
3. **Test on physical device**: Share Extensions work best on real devices
4. **Check device logs**: Connect device to Mac, open Xcode → Window → Devices and Simulators → Open Console
5. **Restart device**: Sometimes iOS needs a restart to register the Share Extension

---

**Status**: ✅ iOS Share Extension configuration complete with native Swift code.

**Next Action**: Build with `eas build --platform ios` and test on a physical iOS device.
