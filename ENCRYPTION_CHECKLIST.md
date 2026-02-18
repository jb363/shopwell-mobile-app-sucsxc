
# App Store Encryption Submission Checklist

## Pre-Submission Verification

Use this checklist before submitting to App Store Connect to ensure encryption compliance.

### 1. Info.plist Configuration ✅

- [x] `ITSAppUsesNonExemptEncryption` key is present in app.json
- [x] Value is set to `false`
- [x] Located at: `expo.ios.infoPlist.ITSAppUsesNonExemptEncryption`

**Verification Command:**
```bash
# Check app.json contains the encryption declaration
grep -A 2 "ITSAppUsesNonExemptEncryption" app.json
```

**Expected Output:**
```json
"ITSAppUsesNonExemptEncryption": false
```

### 2. Code Audit ✅

- [x] No custom encryption libraries imported
- [x] No cryptographic algorithm implementations
- [x] All network calls use standard HTTPS
- [x] No end-to-end encryption features
- [x] No VPN or proxy functionality

**Files Checked:**
- ✅ `app/(tabs)/(home)/index.ios.tsx` - WebView with HTTPS only
- ✅ `app/(tabs)/(home)/index.android.tsx` - WebView with HTTPS only
- ✅ `utils/offlineStorage.ts` - AsyncStorage, no encryption
- ✅ `hooks/useNotifications.ts` - Standard expo-notifications
- ✅ `package.json` - No crypto libraries

### 3. Dependencies Audit ✅

**Encryption-Related Dependencies:**
- [x] `expo-notifications` - Uses standard APNs/FCM (exempt)
- [x] `expo-secure-store` - Uses OS Keychain (exempt)
- [x] `react-native-webview` - Standard HTTPS (exempt)
- [x] `@react-native-async-storage/async-storage` - No encryption

**No Custom Crypto Libraries:**
- [x] No `crypto-js`
- [x] No `node-forge`
- [x] No `libsodium`
- [x] No `OpenSSL` bindings
- [x] No `bcrypt` or `scrypt`

### 4. Build Configuration ✅

**EAS Build (eas.json):**
- [x] Production profile configured
- [x] iOS build settings correct
- [x] No custom native modules with encryption

**App Configuration (app.json):**
- [x] Bundle identifier: `app.shopwell.ios`
- [x] Build number incremented
- [x] Info.plist includes encryption declaration

### 5. App Store Connect Submission Answers

When submitting, answer these questions:

#### Question 1: "Is your app designed to use cryptography or does it contain or incorporate cryptography?"

**Answer: YES**

**Reason:** The app uses HTTPS for network communication, which is technically cryptography.

#### Question 2: "Does your app qualify for any of the exemptions provided in Category 5, Part 2 of the U.S. Export Administration Regulations?"

**Answer: YES**

**Reason:** The app uses only standard HTTPS/TLS encryption provided by the operating system.

#### Question 3: "Does your app implement any encryption algorithms that are proprietary or not accepted as standard by international standards bodies?"

**Answer: NO**

**Reason:** All encryption is standard HTTPS/TLS.

#### Question 4: "Does your app contain any encryption functionality that is not already provided by the operating system?"

**Answer: NO**

**Reason:** We rely entirely on iOS/Android OS-provided encryption.

#### Question 5: "Will your app be distributed outside the U.S.?"

**Answer: YES** (if applicable)

**Note:** This is fine because we're using exempt encryption.

### 6. Documentation Ready ✅

- [x] `ENCRYPTION_DOCUMENTATION.md` created
- [x] Technical details documented
- [x] Compliance checklist completed
- [x] References included

### 7. Testing Verification ✅

**Network Traffic:**
- [x] All API calls use HTTPS (verified in logs)
- [x] No plaintext data transmission
- [x] WebView loads HTTPS content only

**Local Storage:**
- [x] AsyncStorage used for non-sensitive data
- [x] expo-secure-store used for tokens (OS Keychain)
- [x] No custom encryption applied

### 8. Common Pitfalls Avoided ✅

- [x] Not using `ITSAppUsesNonExemptEncryption: true` (would require docs)
- [x] Not omitting the key entirely (would cause submission issues)
- [x] Not using custom crypto libraries
- [x] Not implementing end-to-end encryption

## Submission Process

### Step 1: Build the App
```bash
# Build for iOS production
eas build --platform ios --profile production
```

### Step 2: Upload to App Store Connect
```bash
# Submit to App Store Connect
eas submit --platform ios --profile production
```

### Step 3: Answer Encryption Questions

Follow the answers in Section 5 above.

### Step 4: Submit for Review

After answering encryption questions:
1. Complete app metadata (screenshots, description, etc.)
2. Submit for review
3. Monitor status in App Store Connect

## Troubleshooting

### Issue: "Missing Compliance Documentation"

**Solution:** Verify `ITSAppUsesNonExemptEncryption: false` is in Info.plist

**Check:**
```bash
# After build, check the compiled Info.plist
# The key should be present in the iOS build
```

### Issue: "App Uses Non-Exempt Encryption"

**Solution:** Audit code for custom crypto libraries

**Action:**
1. Search codebase for crypto imports
2. Remove any custom encryption
3. Update `ITSAppUsesNonExemptEncryption` to `false`
4. Rebuild and resubmit

### Issue: "Export Compliance Required"

**Solution:** You may have accidentally set the key to `true`

**Action:**
1. Set `ITSAppUsesNonExemptEncryption: false` in app.json
2. Rebuild the app
3. Resubmit to App Store Connect

## Final Verification

Before clicking "Submit for Review":

- [ ] Encryption questions answered correctly
- [ ] `ITSAppUsesNonExemptEncryption: false` in build
- [ ] No custom crypto libraries in dependencies
- [ ] All network calls use HTTPS
- [ ] Documentation is up to date

## Post-Submission

### If Approved ✅
- Archive this checklist with the build number
- Update version for next release

### If Rejected ❌
- Review rejection reason
- Check if encryption-related
- Update documentation if needed
- Resubmit with corrections

## Contact for Questions

**Apple Developer Support:**
- [App Store Connect Support](https://developer.apple.com/contact/)
- [Encryption Export Regulations](https://developer.apple.com/documentation/security/complying_with_encryption_export_regulations)

**Internal Team:**
- Technical Lead: [To be filled]
- Compliance Officer: [To be filled]

---

## Quick Reference Card

**For App Store Connect Submission:**

| Question | Answer | Reason |
|----------|--------|--------|
| Uses cryptography? | YES | HTTPS is cryptography |
| Exempt encryption? | YES | Standard HTTPS/TLS only |
| Proprietary algorithms? | NO | Standard protocols only |
| Custom encryption? | NO | OS-provided only |
| Distributed outside U.S.? | YES | Exempt, so OK |

**Info.plist Key:**
```json
"ITSAppUsesNonExemptEncryption": false
```

**Result:** ✅ No export compliance documentation required

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Next Review:** Before each App Store submission
