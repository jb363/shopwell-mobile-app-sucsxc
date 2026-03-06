
# iOS Share Extension - Build Instructions

## What Was Done
I've configured the iOS Share Extension to make "ShopWell.ai Mobile" appear in the iOS share sheet. This allows users to share URLs, text, and images from other apps directly to ShopWell.ai.

## Changes Made

### 1. Added Config Plugin
**File**: `plugins/withIOSShareExtension.js`
- Configures app groups for data sharing
- Sets up URL schemes for deep linking
- Adds universal links support

### 2. Configured Apple Targets
**File**: `app.json` (updated)
- Added `@bacons/apple-targets` plugin configuration
- Created Share Extension target with bundle ID: `ai.shopwell.app.ShareExtension`
- Configured to accept URLs, text, images, and files

### 3. Added Documentation
**Files**: 
- `IOS_SHARE_EXTENSION_SETUP.md` - Complete technical guide
- `IOS_SHARE_EXTENSION_INSTRUCTIONS.md` - This file

## What This Enables

Users can now:
1. Open Safari, Photos, or any iOS app
2. Tap the Share button
3. See "ShopWell.ai Mobile" in the share sheet
4. Share content directly to the app

Supported content types:
- ✅ URLs from Safari and other browsers
- ✅ Plain text
- ✅ Images (up to 10)
- ✅ Files

## Build Requirements

⚠️ **IMPORTANT**: Share Extensions require a native build. They do NOT work in Expo Go.

### To Build:
```bash
# iOS production build
eas build --platform ios

# iOS development build (for testing)
eas build --profile development --platform ios
```

The Share Extension will be automatically included in the build.

## Testing

After installing the built app:

1. Open Safari on iOS
2. Navigate to any website (e.g., https://amazon.com)
3. Tap the Share button (square with arrow pointing up)
4. Scroll through the share options
5. Look for "ShopWell.ai Mobile" with the app icon
6. Tap it to share the URL to the app

## How It Works

```
User shares content → iOS Share Sheet → ShopWell.ai Mobile option
                                              ↓
                                    Share Extension receives content
                                              ↓
                                    Stores in app group container
                                              ↓
                                    Opens main app via deep link
                                              ↓
                                    /share-target screen
                                              ↓
                                    Redirects to home with shared data
                                              ↓
                                    WebView receives SHARED_CONTENT message
```

## Verification Checklist

After building:
- [ ] App installs successfully
- [ ] Share button in Safari shows "ShopWell.ai Mobile"
- [ ] Tapping the share option opens the app
- [ ] Shared URL appears in the app
- [ ] WebView receives the shared content
- [ ] User can interact with the shared content

## Existing Android Support

Android share functionality is already configured via intent filters in `app.json`:
- ✅ Text sharing (SEND action with text/plain)
- ✅ Image sharing (SEND action with image/*)
- ✅ Multiple images (SEND_MULTIPLE action)

No changes needed for Android.

## Technical Notes

### Bundle Identifiers
- Main app: `ai.shopwell.app`
- Share Extension: `ai.shopwell.app.ShareExtension`

### App Group
- ID: `group.ai.shopwell.app`
- Purpose: Share data between extension and main app

### URL Scheme
- Scheme: `shopwellaimobile`
- Used for deep linking from Share Extension to main app

### Associated Domains
- `applinks:shopwell.ai`
- `applinks:*.shopwell.ai`
- Enables universal links

## Files Modified
1. `app.json` - Added @bacons/apple-targets plugin and configuration
2. `plugins/withIOSShareExtension.js` - New config plugin
3. `IOS_SHARE_EXTENSION_SETUP.md` - New documentation
4. `IOS_SHARE_EXTENSION_INSTRUCTIONS.md` - This file

## Files Already Configured (No Changes Needed)
- `app/share-target.tsx` - Receives shared content
- `app/(tabs)/(home)/index.ios.tsx` - Processes shared content
- `hooks/useSharing.ts` - Sharing utilities
- `utils/shareHandler.ts` - Share handling logic

## Next Steps

1. **Build the app** using EAS Build
2. **Install** on a physical iOS device (Share Extensions don't work in simulator for testing)
3. **Test** by sharing from Safari, Photos, Notes, etc.
4. **Verify** shared content reaches the WebView correctly

## Support

If the Share Extension doesn't appear:
- Ensure the app was built with EAS Build (not Expo Go)
- Check that `@bacons/apple-targets` is in package.json dependencies (it is)
- Verify the build completed without errors
- Try uninstalling and reinstalling the app

If shared content doesn't reach the app:
- Check logs in `app/(tabs)/(home)/index.ios.tsx`
- Verify the `/share-target` route is working
- Ensure URL scheme `shopwellaimobile` is registered

---

**Status**: ✅ Configuration complete. Ready for build.
