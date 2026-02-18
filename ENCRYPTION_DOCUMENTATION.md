
# App Encryption Documentation - ShopWell.ai

## Overview
This document provides detailed information about the encryption usage in the ShopWell.ai mobile application for compliance with U.S. export regulations and App Store Connect submission requirements.

## Encryption Declaration

**ITSAppUsesNonExemptEncryption: false**

The ShopWell.ai app has been configured with `ITSAppUsesNonExemptEncryption: false` in the iOS Info.plist, indicating that the app **does not use non-exempt encryption**.

## What This Means

### Non-Exempt Encryption Definition
Non-exempt encryption refers to encryption that:
- Uses proprietary or non-standard cryptographic protocols
- Implements custom encryption algorithms
- Uses encryption for purposes other than standard HTTPS/TLS communication
- Requires export compliance documentation under U.S. regulations

### Our App's Encryption Usage

The ShopWell.ai app uses **ONLY** standard, exempt encryption:

1. **HTTPS/TLS Communication**
   - All network requests use standard HTTPS protocol
   - TLS encryption is handled by the operating system (iOS/Android)
   - No custom cryptographic implementations

2. **WebView Security**
   - The app uses `react-native-webview` to display content from `https://shopwell.ai`
   - All web traffic is encrypted using standard browser HTTPS/TLS
   - No additional encryption layers are implemented

3. **Local Storage**
   - Uses `@react-native-async-storage/async-storage` for local data persistence
   - No custom encryption is applied to stored data
   - Relies on OS-level security features

4. **Push Notifications**
   - Uses `expo-notifications` with standard APNs (iOS) and FCM (Android)
   - Notification payloads are encrypted by Apple/Google infrastructure
   - No custom encryption is implemented by the app

5. **Authentication & Tokens**
   - Bearer tokens are transmitted over HTTPS
   - No custom encryption of authentication credentials
   - Relies on standard HTTPS/TLS for security

## Exempt Encryption Categories

Our app falls under the following exempt categories:

### 1. Standard Cryptography (Category 5, Part 2)
- Uses only standard, publicly available encryption (HTTPS/TLS)
- No proprietary or custom cryptographic protocols
- Encryption is provided by the operating system and standard libraries

### 2. Mass Market Software
- Consumer-facing mobile application
- Available to the general public
- No specialized encryption features

## Technical Implementation Details

### Network Layer
```typescript
// All API calls use standard fetch with HTTPS
const response = await fetch('https://shopwell.ai/api/endpoint', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### WebView Configuration
```typescript
// WebView uses standard HTTPS without custom encryption
<WebView
  source={{ uri: 'https://shopwell.ai' }}
  // Standard browser security applies
/>
```

### Local Storage
```typescript
// AsyncStorage - no custom encryption
import AsyncStorage from '@react-native-async-storage/async-storage';

await AsyncStorage.setItem('key', 'value');
// Data is stored using OS-provided security
```

## Dependencies Audit

### Encryption-Related Dependencies
All dependencies use standard, exempt encryption:

- **expo-notifications**: Uses APNs/FCM standard encryption
- **expo-secure-store**: Uses iOS Keychain/Android Keystore (OS-level, exempt)
- **react-native-webview**: Uses standard browser HTTPS/TLS
- **@react-native-async-storage/async-storage**: No encryption, OS-level security

### No Custom Cryptography
The app does **NOT** include:
- Custom encryption algorithms
- Third-party encryption libraries (OpenSSL, libsodium, etc.)
- End-to-end encryption implementations
- Cryptographic key generation or management
- Digital signature implementations (beyond OS-provided)

## Compliance Checklist

✅ **App uses only standard HTTPS/TLS encryption**
✅ **No custom cryptographic implementations**
✅ **No proprietary encryption protocols**
✅ **Encryption is provided by OS and standard libraries**
✅ **ITSAppUsesNonExemptEncryption set to false in Info.plist**
✅ **No export compliance documentation required**

## App Store Connect Configuration

### Info.plist Entry
```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

This key is located in:
- File: `app.json`
- Path: `expo.ios.infoPlist.ITSAppUsesNonExemptEncryption`
- Value: `false`

### Submission Process
When submitting to App Store Connect:

1. **Encryption Question**: "Does your app use encryption?"
   - Answer: **YES** (because HTTPS is technically encryption)

2. **Non-Exempt Encryption Question**: "Does your app use non-exempt encryption?"
   - Answer: **NO** (we only use standard HTTPS/TLS)

3. **Documentation**: This document serves as internal reference
   - No export compliance documentation needs to be submitted
   - The Info.plist declaration is sufficient

## Security Best Practices

While we don't use custom encryption, we follow security best practices:

1. **HTTPS Everywhere**: All network communication uses HTTPS
2. **Secure Storage**: Sensitive data uses expo-secure-store (OS Keychain)
3. **Token Security**: Bearer tokens transmitted only over HTTPS
4. **No Plaintext Secrets**: API keys and secrets not hardcoded
5. **OS-Level Security**: Leverage iOS/Android security features

## Future Considerations

If the app adds any of the following features, this documentation must be updated:

- ❌ End-to-end encryption for messages
- ❌ Custom cryptographic implementations
- ❌ File encryption beyond OS-provided
- ❌ Blockchain or cryptocurrency features
- ❌ VPN or proxy functionality
- ❌ Custom authentication protocols

Any such additions would require:
1. Updating `ITSAppUsesNonExemptEncryption` to `true`
2. Completing export compliance documentation
3. Potentially registering with BIS (Bureau of Industry and Security)

## References

### Apple Documentation
- [App Store Connect Help - Encryption](https://developer.apple.com/documentation/security/complying_with_encryption_export_regulations)
- [Export Compliance Overview](https://help.apple.com/app-store-connect/#/dev88f5c7bf9)

### U.S. Export Regulations
- [BIS Encryption Guidelines](https://www.bis.doc.gov/index.php/policy-guidance/encryption)
- [CCATS (Commodity Classification Automated Tracking System)](https://www.bis.doc.gov/index.php/licensing/commerce-control-list-classification/encryption-items-not-subject-to-the-ear)

### Expo Documentation
- [Expo App Store Deployment](https://docs.expo.dev/distribution/app-stores/)
- [Expo Security Best Practices](https://docs.expo.dev/guides/security/)

## Contact Information

**App Name**: ShopWell.ai
**Bundle Identifier**: app.shopwell.ios
**Package Name**: app.shopwell.android
**ASC App ID**: 6759304677

**Technical Contact**: Development Team
**Compliance Officer**: [To be filled]

## Document Version

- **Version**: 1.0
- **Last Updated**: January 2025
- **Next Review**: Before any major feature additions involving security/encryption

---

## Summary for App Store Submission

**Quick Reference for Reviewers:**

- ✅ App uses standard HTTPS/TLS encryption only
- ✅ No custom cryptographic implementations
- ✅ ITSAppUsesNonExemptEncryption = false
- ✅ No export compliance documentation required
- ✅ Exempt under Category 5, Part 2 (standard cryptography)

**Submission Answer Guide:**
1. "Does your app use encryption?" → **YES**
2. "Is it exempt?" → **YES** (standard HTTPS/TLS only)
3. "Upload documentation?" → **NOT REQUIRED** (exempt encryption)

This app is compliant with U.S. export regulations and ready for App Store submission.
