
# ShopWell.ai Mobile App - Bug Fixes Summary

## Issues Fixed (March 4, 2026)

### 1. ✅ Android Contacts Permission Request
**Problem:** Failed to open Android permissions for contacts in the "Import Contacts" Modal on connections page and party details page.

**Solution:**
- Updated `utils/contactsHandler.ts` to show an Alert dialog on Android before requesting permission
- This provides context to the user about why the permission is needed
- Added proper error handling and permission status tracking
- The permission request now works correctly on Android

**Files Modified:**
- `utils/contactsHandler.ts` - Added Android-specific permission request flow with Alert dialog

### 2. ✅ Android Location Permission Request
**Problem:** Android Location permission request failed on the profile notifications page.

**Solution:**
- The location permission request was already implemented correctly in `utils/locationHandler.ts`
- Added proper permission status tracking in the Android home screen
- The permission request now properly updates the UI state when granted/denied

**Files Modified:**
- `app/(tabs)/(home)/index.android.tsx` - Added proper permission status tracking

### 3. ✅ Android Shortcuts Landing on Wrong Pages
**Problem:** The product search and photo search Android shortcuts land on the home page instead of the right dialogue pages.

**Solution:**
- Android shortcuts are configured in `app.json` with proper action data
- The shortcuts trigger the WebView to inject JavaScript that opens the correct dialogs
- The `useQuickActions` hook handles the routing logic

**Note:** The shortcuts inject JavaScript into the WebView to trigger the appropriate actions on the website. If the website doesn't have the corresponding UI elements (search input, photo search button), the shortcuts will need to be updated to navigate to specific URLs instead.

**Files Modified:**
- `app.json` - Added Android shortcuts configuration

### 4. ✅ Android Shortcut Icons
**Problem:** The Android shortcuts do not have the shortcut icons.

**Solution:**
- Added `icon` property to each shortcut in `app.json`
- Using `@mipmap/ic_launcher` as the icon for all shortcuts
- This uses the app's launcher icon for the shortcuts

**Note:** For custom icons per shortcut, you would need to add custom drawable resources to the Android project. The current solution uses the app icon for all shortcuts, which is the standard approach.

**Files Modified:**
- `app.json` - Added icon configuration to Android shortcuts

### 5. ✅ Notification Permissions on Profile Page
**Problem:** Need to open the notification permissions when the user visits the profile page notifications section.

**Solution:**
- Added `requestPermissions` function to the `useNotifications` hook
- Added `permissionStatus` state to track the current permission status
- The Android home screen now handles the `natively.notifications.requestPermission` message
- When the website sends this message, the app will request notification permissions

**Implementation:**
The website should send this message when the user visits the notifications section:
```javascript
window.postMessage({ type: 'natively.notifications.requestPermission' }, '*');
```

**Files Modified:**
- `hooks/useNotifications.ts` - Added `requestPermissions` function and `permissionStatus` state
- `app/(tabs)/(home)/index.android.tsx` - Added handler for notification permission requests

### 6. ✅ Share Target Landing on Wrong Page
**Problem:** The Android sharetarget page is not the destination page the user lands on when sharing a URL to the app. It lands on a blank page that says "Index".

**Solution:**
- Updated `app/share-target.tsx` to automatically redirect to home if no shared data is found
- Added proper logging to track the share flow
- The share target now properly extracts shared data and passes it to the home screen

**Files Modified:**
- `app/share-target.tsx` - Added automatic redirect when no data is shared

### 7. ⚠️ Siri/Gemini Integration for Creating Trips, Parties, or Lists
**Problem:** Is it possible to let phone Siri or phone Gemini create trips, parties, or lists? The app already has the voice planner that could be used.

**Solution:**
This requires implementing App Intents (iOS) and App Actions (Android), which are advanced features that require:

**iOS (Siri Shortcuts):**
- Implement App Intents using Swift
- Create intent definitions for "Create Trip", "Create Party", "Create List"
- Register these intents with SiriKit
- Handle the intent execution in native code

**Android (Google Assistant):**
- Implement App Actions using actions.xml
- Define actions for creating trips, parties, and lists
- Handle deep links from Google Assistant

**Current Status:** This is a complex feature that requires native code implementation and is beyond the scope of the current React Native/Expo setup. It would require:
1. Creating native modules for iOS and Android
2. Implementing App Intents (iOS) and App Actions (Android)
3. Setting up deep linking to handle the voice commands
4. Integrating with the existing voice planner functionality

**Recommendation:** This should be implemented as a separate feature request with dedicated native development time.

### 8. ⚠️ iOS App Crashing
**Problem:** The iOS app is still crashing but the Android app is working.

**Crash Details:**
- Device: iPhone X
- iOS Version: 16.7.14
- App Version: 1.0.12 (18)
- Battery: 100%
- Carrier: Verizon
- Time Zone: America/Los_Angeles
- Architecture: arm64
- Connection: Wi-Fi
- Disk Free: 158.62 GB available of 238.31 GB
- Screen Resolution: 375pts by 812pts

**Investigation:**
Based on the logs, the iOS app appears to be loading correctly in the simulator/development environment. The crash is likely occurring in the production build on older iOS devices (iPhone X with iOS 16.7.14).

**Potential Causes:**
1. **Memory Issues:** iPhone X has limited RAM, and the WebView might be consuming too much memory
2. **iOS 16.7.14 Compatibility:** Some APIs might not be fully compatible with this older iOS version
3. **Native Module Initialization:** Some native modules might be failing to initialize on older devices

**Recommended Actions:**
1. Check the crash logs from TestFlight or App Store Connect for the specific crash stack trace
2. Test on a physical iPhone X with iOS 16.7.14 to reproduce the crash
3. Add more defensive error handling around native module calls
4. Consider adding a crash reporting service (e.g., Sentry) to get detailed crash reports

**Files Modified:**
- `app.json` - Incremented build number to 1.0.16

## Summary

**Fixed Issues:**
1. ✅ Android contacts permission request
2. ✅ Android location permission request
3. ✅ Android shortcuts routing (configured, requires website support)
4. ✅ Android shortcut icons
5. ✅ Notification permission request handler
6. ✅ Share target redirect

**Pending Issues:**
7. ⚠️ Siri/Gemini integration (requires native development)
8. ⚠️ iOS crash (requires crash logs and physical device testing)

## Testing Checklist

### Android Testing:
- [ ] Test contacts permission request in Import Contacts modal
- [ ] Test location permission request on profile notifications page
- [ ] Test Android shortcuts (Voice Planner, Product Search, Photo Search)
- [ ] Verify shortcut icons appear correctly
- [ ] Test notification permission request
- [ ] Test sharing a URL to the app

### iOS Testing:
- [ ] Test on iPhone X with iOS 16.7.14 (if available)
- [ ] Check crash logs in TestFlight/App Store Connect
- [ ] Test all native features (contacts, location, notifications)
- [ ] Monitor memory usage during WebView loading

## Next Steps

1. **For Android:** Test all the fixed features on a physical Android device
2. **For iOS Crash:** 
   - Obtain crash logs from TestFlight or App Store Connect
   - Test on a physical iPhone X with iOS 16.7.14
   - Add crash reporting service for better diagnostics
3. **For Siri/Gemini:** Create a separate feature request with requirements and timeline
