
# 🚨 CRITICAL BUILD SAFETY RULES - READ BEFORE ANY CHANGES 🚨

## ⚠️ THESE RULES PREVENT iOS BUILD FAILURES (Exit Status 65)

### 1. ❌ NEVER ADD `expo-file-system` TO package.json

**WHY:** The `expo-file-system` native Swift module has compilation errors with Expo SDK 54+. The Swift code references methods that don't exist in the current SDK version (`getPathPermissions` is missing from `EXFileSystemInterface`).

**ERROR YOU'LL SEE:**
```
SwiftCompile normal arm64 Compiling\ Encoding.swift,\ FilePickingHandler.swift...
value of type 'any EXFileSystemInterface' has no member 'getPathPermissions'
Exit status: 65
```

**SOLUTION:** Use standard Web APIs instead:
- For reading files: Use `fetch(uri)` and `FileReader`
- For audio file conversion: Use `fetch()` + `blob()` + `FileReader.readAsDataURL()`
- For file operations: Use `expo-audio` for audio, `expo-image-picker` for images

**EXAMPLE (Audio to Base64):**
```typescript
// ❌ WRONG - DO NOT USE expo-file-system
import * as FileSystem from 'expo-file-system';
const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });

// ✅ CORRECT - Use fetch + FileReader
const response = await fetch(uri);
const blob = await response.blob();
const reader = new FileReader();
reader.onloadend = () => {
  const base64Audio = (reader.result as string).split(',')[1];
  // Use base64Audio
};
reader.readAsDataURL(blob);
```

---

### 2. ❌ NEVER ADD metro-cache TO metro.config.js

**WHY:** The `metro-cache` configuration with `FileStore` causes iOS build failures during the `fastlane gym` archive process. This has been a recurring issue.

**ERROR YOU'LL SEE:**
```
fastlane gym exited with non-zero code: 1
Exit status: 65
```

**WHAT TO AVOID:**
```javascript
// ❌ WRONG - DO NOT ADD THESE LINES
const { FileStore } = require('metro-cache');
config.cacheStores = [
  new FileStore({ root: path.join(__dirname, 'node_modules', '.cache', 'metro') }),
];
```

**CORRECT metro.config.js STRUCTURE:**
```javascript
// ✅ CORRECT
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;

// Custom server middleware (logging, etc.) is OK
config.server = config.server || {};
config.server.enhanceMiddleware = (middleware) => {
  // Your custom middleware here
  return middleware;
};

module.exports = config;
```

---

### 3. ✅ SAFE DEPENDENCIES FOR FILE OPERATIONS

**For Audio:**
- ✅ `expo-audio` - Recording and playback
- ✅ `fetch()` + `FileReader` - Converting audio files to base64

**For Images:**
- ✅ `expo-image-picker` - Picking and capturing images
- ✅ `fetch()` + `FileReader` - Converting images to base64

**For Documents:**
- ✅ `expo-document-picker` - Picking documents (if needed in future)

**For Storage:**
- ✅ `@react-native-async-storage/async-storage` - Local key-value storage
- ✅ `expo-secure-store` - Secure credential storage

---

### 4. 🔍 HOW TO VERIFY BEFORE BUILDING

**Before any iOS build, check these files:**

1. **package.json** - Ensure `expo-file-system` is NOT in dependencies:
```bash
# Should return nothing
grep "expo-file-system" package.json
```

2. **metro.config.js** - Ensure no `metro-cache` imports:
```bash
# Should return nothing
grep "metro-cache" metro.config.js
grep "FileStore" metro.config.js
grep "cacheStores" metro.config.js
```

3. **Source files** - Ensure no imports of `expo-file-system`:
```bash
# Should return nothing
grep -r "from 'expo-file-system'" app/
grep -r "from 'expo-file-system'" utils/
grep -r "from 'expo-file-system'" hooks/
```

---

### 5. 🛠️ IF BUILD FAILS WITH EXIT STATUS 65

**Step 1:** Check the error message for these keywords:
- `SwiftCompile` + `expo-file-system` → Remove `expo-file-system` from package.json
- `fastlane gym` + `metro` → Check metro.config.js for `metro-cache`
- `getPathPermissions` → Definitely `expo-file-system` issue

**Step 2:** Clean and rebuild:
1. Remove `expo-file-system` from package.json (if present)
2. Remove `metro-cache` from metro.config.js (if present)
3. Delete `node_modules` and reinstall
4. Delete `ios` folder (if using prebuild)
5. Run prebuild again

**Step 3:** Verify the fix:
- Check that audio recording still works (uses `expo-audio` + `fetch`)
- Check that file conversions work (uses `FileReader`)

---

### 6. 📋 CHECKLIST BEFORE EVERY BUILD

- [ ] `expo-file-system` is NOT in package.json
- [ ] `metro-cache` is NOT in metro.config.js
- [ ] `FileStore` is NOT in metro.config.js
- [ ] `cacheStores` is NOT in metro.config.js
- [ ] Audio recording uses `expo-audio` + `fetch()` + `FileReader`
- [ ] No imports of `expo-file-system` in source code

---

### 7. 🚨 EMERGENCY FIX COMMANDS

If you accidentally added the problematic dependencies:

```bash
# Remove expo-file-system from package.json manually, then:
rm -rf node_modules package-lock.json yarn.lock
npm install

# If using prebuild:
rm -rf ios android
npx expo prebuild

# Verify metro.config.js has no metro-cache
cat metro.config.js | grep -E "(metro-cache|FileStore|cacheStores)"
# Should return nothing
```

---

## 📚 REFERENCE: WORKING AUDIO RECORDING PATTERN

This is the CORRECT pattern used in `app/(tabs)/(home)/index.ios.tsx`:

```typescript
import { Audio } from 'expo-audio';

// Start recording
const recording = await Audio.createRecordingAsync(
  Audio.RecordingPresets.HIGH_QUALITY
);

// Stop recording
await recording.stopAndUnloadAsync();
const uri = recording.getURI();

// Convert to base64 (NO expo-file-system!)
const response = await fetch(uri);
const blob = await response.blob();

const reader = new FileReader();
reader.onloadend = () => {
  const base64Audio = (reader.result as string).split(',')[1];
  // Send base64Audio to backend or WebView
};
reader.readAsDataURL(blob);
```

---

## ⚠️ FINAL WARNING

**DO NOT:**
- Add `expo-file-system` to package.json for "convenience"
- Add `metro-cache` to metro.config.js for "performance"
- Use any `FileSystem.*` methods in code

**THESE WILL BREAK iOS BUILDS WITH EXIT STATUS 65**

If you see these in a code review or pull request, **REJECT IMMEDIATELY**.

---

## 📞 TROUBLESHOOTING

**Q: But I need to read files!**
A: Use `fetch(uri)` + `FileReader`. It works cross-platform and doesn't require native modules.

**Q: But expo-file-system is in the Expo docs!**
A: It has compatibility issues with Expo SDK 54+. The Swift native code is broken. Use Web APIs instead.

**Q: But metro-cache improves performance!**
A: It causes iOS build failures. The performance gain is not worth broken builds.

**Q: The build worked before, why not now?**
A: Expo SDK 54 changed the native module interfaces. Old code that worked in SDK 52 breaks in SDK 54.

---

**LAST UPDATED:** 2024-01-XX (After fixing recurring Exit Status 65 errors)
**APPLIES TO:** Expo SDK 54+, React Native 0.81+
**CRITICAL FOR:** iOS builds via EAS Build, fastlane gym, Xcode Cloud
