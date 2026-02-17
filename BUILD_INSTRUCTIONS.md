
# ShopWell.ai - Production Build Instructions

## Prerequisites

Before building for production, ensure you have:

1. **EAS CLI installed globally** (your development team needs to run this):
   ```
   npm install -g eas-cli
   ```

2. **Expo account** - Sign up at https://expo.dev

3. **Apple Developer Account** (for iOS builds)
   - Enrolled in Apple Developer Program ($99/year)
   - Have your Apple ID, Team ID, and ASC App ID ready

4. **Google Play Console Account** (for Android builds)
   - One-time $25 registration fee
   - Service account key for automated submissions

## Initial Setup (One-Time)

### 1. Login to EAS
```
eas login
```

### 2. Configure the Project
```
eas build:configure
```
This will create/update your `eas.json` and link your project to EAS.

### 3. Update EAS Project ID
After running `eas build:configure`, update the `projectId` in `app.json`:
```json
"extra": {
  "eas": {
    "projectId": "your-actual-eas-project-id"
  }
}
```

## Building for iOS Production

### Option 1: Build for App Store Submission
```
eas build --platform ios --profile production
```

### Option 2: Build for Internal Testing
```
eas build --platform ios --profile preview
```

### What happens during iOS build:
- EAS will prompt you to create/select credentials (certificates, provisioning profiles)
- Choose "Let EAS handle credentials" for easiest setup
- Build takes 15-30 minutes typically
- You'll get a download link for the `.ipa` file

## Building for Android Production

### For App Bundle (Google Play Store):
```
eas build --platform android --profile production-aab
```

### For APK (Direct distribution):
```
eas build --platform android --profile production
```

### What happens during Android build:
- EAS will create/manage your keystore automatically
- Build takes 10-20 minutes typically
- You'll get a download link for the `.aab` or `.apk` file

## Submitting to App Stores

### iOS - Submit to App Store Connect

1. **Manual submission:**
   - Download the `.ipa` from EAS build
   - Use Transporter app or Xcode to upload to App Store Connect
   - Complete app metadata in App Store Connect
   - Submit for review

2. **Automated submission with EAS:**
   ```
   eas submit --platform ios --profile production
   ```
   
   First, update `eas.json` with your Apple credentials:
   ```json
   "submit": {
     "production": {
       "ios": {
         "appleId": "your-apple-id@example.com",
         "ascAppId": "your-asc-app-id",
         "appleTeamId": "your-apple-team-id"
       }
     }
   }
   ```

### Android - Submit to Google Play Console

1. **Manual submission:**
   - Download the `.aab` from EAS build
   - Upload to Google Play Console
   - Complete store listing
   - Submit for review

2. **Automated submission with EAS:**
   ```
   eas submit --platform android --profile production
   ```
   
   First, create a service account key in Google Play Console and update `eas.json`:
   ```json
   "submit": {
     "production": {
       "android": {
         "serviceAccountKeyPath": "./google-service-account.json",
         "track": "production"
       }
     }
   }
   ```

## App Store Requirements

### iOS App Store Connect Setup:
1. Create app in App Store Connect (https://appstoreconnect.apple.com)
2. Bundle ID must match: `app.shopwell.ios`
3. Prepare:
   - App name: ShopWell.ai
   - App description
   - Keywords
   - Screenshots (required sizes: 6.7", 6.5", 5.5")
   - App icon (1024x1024px)
   - Privacy policy URL
   - Support URL

### Google Play Console Setup:
1. Create app in Google Play Console (https://play.google.com/console)
2. Package name must match: `app.shopwell.android`
3. Prepare:
   - App name: ShopWell.ai
   - Short description (80 chars)
   - Full description (4000 chars)
   - Screenshots (phone, tablet, TV if applicable)
   - Feature graphic (1024x500px)
   - App icon (512x512px)
   - Privacy policy URL
   - Content rating questionnaire

## Version Management

### Incrementing Version Numbers

The `autoIncrement` setting in `eas.json` automatically increments build numbers.

To manually update version:

**iOS:**
- Update `version` in `app.json` (e.g., "1.0.0" → "1.0.1")
- Update `buildNumber` in `app.json` → `ios.buildNumber`

**Android:**
- Update `version` in `app.json` (e.g., "1.0.0" → "1.0.1")
- Update `versionCode` in `app.json` → `android.versionCode`

## Testing Builds

### iOS TestFlight (Internal Testing):
```
eas build --platform ios --profile preview
```
Then submit to TestFlight:
```
eas submit --platform ios --profile production
```
Add internal testers in App Store Connect → TestFlight

### Android Internal Testing:
```
eas build --platform android --profile preview
```
Upload to Google Play Console → Internal Testing track

## Troubleshooting

### Common Issues:

1. **"No bundle identifier found"**
   - Ensure `ios.bundleIdentifier` is set in `app.json`

2. **"Provisioning profile doesn't include signing certificate"**
   - Run `eas credentials` to reset credentials
   - Choose "Let EAS handle credentials"

3. **"Build failed: Metro bundler error"**
   - Clear cache: `npx expo start --clear`
   - Check for TypeScript errors: `npx tsc --noEmit`

4. **"Android build failed: Gradle error"**
   - Check `android.package` in `app.json` is valid (lowercase, dots)
   - Ensure all dependencies are compatible with Expo SDK 54

## Build Status & Logs

Check build status:
```
eas build:list
```

View build logs:
```
eas build:view [build-id]
```

## Important Notes

- **First build takes longer** - EAS sets up credentials and caches dependencies
- **Builds are queued** - Free tier has limited concurrent builds
- **Keep credentials safe** - EAS stores them securely, but back up locally too
- **Test thoroughly** - Use preview builds before production submission
- **Review guidelines** - Read Apple and Google's app review guidelines before submitting

## Next Steps After Building

1. ✅ Build completes successfully
2. ✅ Download and test the build on a real device
3. ✅ Submit to App Store Connect / Google Play Console
4. ✅ Complete store listings with screenshots and descriptions
5. ✅ Submit for review
6. ✅ Wait for approval (1-3 days for iOS, hours to days for Android)
7. ✅ Release to production!

## Support

- EAS Documentation: https://docs.expo.dev/build/introduction/
- Expo Forums: https://forums.expo.dev/
- App Store Connect Help: https://developer.apple.com/support/app-store-connect/
- Google Play Console Help: https://support.google.com/googleplay/android-developer/

---

**Note:** This file provides instructions for your development team. The actual build commands must be run by someone with terminal access and the necessary credentials.
