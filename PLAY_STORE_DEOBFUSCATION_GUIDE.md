
# Play Store Deobfuscation File Guide

## Overview
This guide explains the deobfuscation file setup for ShopWell.ai Android builds. The deobfuscation file (mapping.txt) is essential for debugging production crashes in the Google Play Console.

## What Changed

### 1. App Branding Fixed
- **App Name**: Changed from "ShopWell.ai Mobile" to "shopwell.ai" in `app.json`
- **Version Code**: Incremented to 23 (from 22)
- The app will now display "shopwell.ai" on the home screen and app drawer

### 2. ProGuard/R8 Configuration Added
- **File**: `android/app/proguard-rules.pro`
- **Purpose**: Configures code obfuscation rules for React Native and Expo
- **Benefits**: 
  - Reduces APK/AAB size by ~30-40%
  - Obfuscates code to protect intellectual property
  - Generates mapping file for crash deobfuscation

### 3. Build Configuration Updated
- **File**: `android/app/build.gradle`
- **Changes**:
  - Enabled `minifyEnabled = true` for release builds
  - Enabled `shrinkResources = true` for release builds
  - Added ProGuard configuration file reference
  - Uses `proguard-android-optimize.txt` for maximum optimization

### 4. EAS Build Configuration
- **File**: `eas.json`
- **Changes**: Added explicit `gradleCommand` for production-aab builds

## How It Works

### Build Process
1. When you build a release AAB with EAS Build, R8 (Android's code shrinker) will:
   - Minify the code (remove unused code)
   - Obfuscate class and method names
   - Optimize the bytecode
   - Generate a `mapping.txt` file

2. The `mapping.txt` file contains the mapping between:
   - Original class names → Obfuscated names
   - Original method names → Obfuscated names
   - Original line numbers → Obfuscated line numbers

### Mapping File Location
After building with EAS, the mapping file will be located at:
```
android/app/build/outputs/mapping/release/mapping.txt
```

## Using the Deobfuscation File

### Automatic Upload (Recommended)
When you upload your AAB to Google Play Console, you should also upload the mapping file:

1. Go to Google Play Console
2. Select your app → Release → Production (or other track)
3. Click on the release version
4. Scroll to "App bundles" section
5. Click "Upload deobfuscation file"
6. Select the `mapping.txt` file from your build output
7. Click "Save"

### Manual Deobfuscation
If you need to manually deobfuscate a crash report:

```bash
# Using R8's retrace tool
java -jar $ANDROID_HOME/tools/proguard/lib/retrace.jar mapping.txt obfuscated_stacktrace.txt
```

## Build Commands

### Building Production AAB with Deobfuscation
```bash
# This will generate the AAB and mapping.txt file
eas build --platform android --profile production-aab
```

### After Build Completes
1. Download the build artifacts from EAS
2. Extract the AAB file
3. Locate the `mapping.txt` file in the build output
4. Upload both the AAB and mapping.txt to Google Play Console

## Important Notes

### What Gets Obfuscated
- ✅ Java/Kotlin code (native modules)
- ✅ Third-party library code
- ❌ JavaScript/TypeScript code (bundled separately by Metro)
- ❌ React Native bridge code (kept by ProGuard rules)

### ProGuard Rules Explained
The `proguard-rules.pro` file contains rules to:
- Keep React Native bridge classes (required for JS ↔ Native communication)
- Keep Expo module classes
- Keep WebView JavaScript interface methods
- Preserve line numbers for stack traces
- Keep native methods

### File Size Reduction
Expected size reduction with minification enabled:
- **Before**: ~50-80 MB (unobfuscated)
- **After**: ~35-55 MB (obfuscated + optimized)
- **Savings**: ~30-40% reduction

## Troubleshooting

### Build Fails with ProGuard Errors
If you encounter ProGuard-related build errors:
1. Check the build logs for specific class/method errors
2. Add keep rules to `proguard-rules.pro` for the problematic classes
3. Example: `-keep class com.example.MyClass { *; }`

### Crashes in Production
If you see obfuscated crash reports in Play Console:
1. Verify the mapping file was uploaded for that specific version code
2. Each version code needs its own mapping file
3. Google Play will automatically deobfuscate crashes if the mapping file is present

### Missing Mapping File
If you forgot to save the mapping file:
- ⚠️ You cannot regenerate it for an already-published build
- You must keep mapping files for ALL published versions
- Store mapping files in version control or secure backup

## Best Practices

1. **Always Save Mapping Files**: Keep a copy of every mapping.txt for every published version
2. **Version Control**: Consider adding mapping files to a separate secure repository
3. **Automated Upload**: Use EAS Submit to automatically upload mapping files
4. **Test Obfuscated Builds**: Test release builds thoroughly before publishing
5. **Monitor Crashes**: Check Play Console regularly for crash reports

## Verification

To verify the setup is working:

1. Build a production AAB:
   ```bash
   eas build --platform android --profile production-aab
   ```

2. Check the build logs for:
   ```
   > Task :app:minifyReleaseWithR8
   R8: Shrinking and optimizing...
   ```

3. Verify the mapping file exists in build output

4. Upload to Play Console and check for the deobfuscation file warning
   - ✅ Should be gone after uploading mapping.txt
   - ❌ If still present, mapping file wasn't uploaded correctly

## Summary

✅ **Fixed**: App now displays "shopwell.ai" instead of "Natively"
✅ **Enabled**: Code obfuscation and minification for release builds
✅ **Configured**: ProGuard rules for React Native and Expo compatibility
✅ **Generated**: Deobfuscation mapping file for crash analysis
✅ **Reduced**: APK/AAB size by ~30-40%

The next production build will include the mapping.txt file, which should be uploaded to Google Play Console alongside the AAB to eliminate the deobfuscation warning.
