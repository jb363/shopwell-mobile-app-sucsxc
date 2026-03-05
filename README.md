
# 🛒 ShopWell.ai Mobile App

A hybrid React Native + Expo mobile application that wraps the ShopWell.ai website with native device capabilities.

## 🎯 **Overview**

ShopWell.ai Mobile is a feature-rich hybrid app that combines the power of a web application with native mobile capabilities. The app provides a seamless shopping experience with advanced features like geofencing notifications, offline mode, biometric authentication, and more.

## ✨ **Features**

### **Core Features**
- 📱 **Hybrid Architecture** - WebView wrapper with native bridge
- 🔔 **Push Notifications** - Real-time alerts and updates
- 📍 **Geofencing** - Location-based store notifications
- 🔐 **Biometric Auth** - Face ID, Touch ID, Fingerprint
- 📷 **Camera & Photos** - Product scanning and image selection
- 👥 **Contacts** - Share lists with friends and family
- 🎤 **Voice Notes** - Audio recording for shopping lists
- 📤 **Share Target** - Receive shared content from other apps
- ⚡ **Quick Actions** - App shortcuts for common tasks
- 💾 **Offline Mode** - Queue and sync when connection restored
- 📋 **Clipboard** - Copy/paste functionality
- 🔗 **Deep Linking** - Open specific content from web

### **Platform-Specific**
- **iOS**: SF Symbols, native UI patterns, Face ID/Touch ID
- **Android**: Material Design, native UI patterns, Fingerprint
- **Web**: Graceful degradation, feature detection

## 🏗️ **Architecture**

```
┌─────────────────────────────────────┐
│     React Native + Expo Shell       │
│  ┌───────────────────────────────┐  │
│  │       WebView Container       │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │   shopwell.ai Website   │  │  │
│  │  │                         │  │  │
│  │  │  JavaScript Bridge ↕    │  │  │
│  │  └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
│                                     │
│  Native Modules:                    │
│  • Notifications                    │
│  • Geofencing                       │
│  • Biometrics                       │
│  • Camera/Photos                    │
│  • Contacts                         │
│  • Audio Recording                  │
│  • Offline Storage                  │
└─────────────────────────────────────┘
```

## 🚀 **Getting Started**

### **Prerequisites**
- Node.js 18+
- npm or yarn
- Expo CLI
- iOS Simulator (Mac only) or Android Emulator
- EAS CLI for building

### **Installation**

```bash
# Clone the repository
git clone <repository-url>
cd shopwell-mobile-app

# Install dependencies
npm install

# Start development server
npm run dev
```

### **Development**

```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Web Browser
npm run web

# With tunnel (for testing on physical devices)
npm run dev
```

## 📦 **Building**

### **Validation**
```bash
# Validate configuration before building
npm run validate
```

### **Prebuild**
```bash
# iOS
npm run prebuild:ios

# Android
npm run prebuild:android

# Both platforms
npm run prebuild
```

### **EAS Build**
```bash
# Development build
eas build --platform ios --profile development
eas build --platform android --profile development

# Production build
eas build --platform ios --profile production
eas build --platform android --profile production
```

## 🔧 **Configuration**

### **Environment**
- `SHOPWELL_URL`: Website URL (default: `https://shopwell.ai`)

### **App Configuration** (`app.json`)
- **iOS Bundle ID**: `ai.shopwell.app`
- **Android Package**: `com.axiomstrategies.shopwellai`
- **Scheme**: `shopwellaimobile`

### **Permissions**
All required permissions are declared in `app.json`:
- Camera, Photo Library, Microphone
- Contacts, Location (Always), Notifications
- Biometric Authentication

## 📱 **Native Bridge API**

The app exposes a JavaScript bridge to the website via `window.natively`:

### **Notifications**
```javascript
// Request permission
window.postMessage({ type: 'natively.notifications.requestPermission' }, '*');

// Get status
window.postMessage({ type: 'natively.notifications.getStatus' }, '*');
```

### **Contacts**
```javascript
// Pick a contact
window.postMessage({ type: 'natively.contacts.pick' }, '*');

// Request permission
window.postMessage({ type: 'natively.contacts.requestPermission' }, '*');
```

### **Biometric Authentication**
```javascript
// Check support
window.postMessage({ type: 'natively.biometric.isSupported' }, '*');

// Authenticate
window.postMessage({ 
  type: 'natively.biometric.authenticate',
  reason: 'Authenticate to continue'
}, '*');
```

### **Camera & Photos**
```javascript
// Take picture
window.postMessage({ 
  type: 'natively.camera.takePicture',
  allowsEditing: true,
  quality: 0.8
}, '*');

// Pick image
window.postMessage({ 
  type: 'natively.imagePicker.pick',
  allowsEditing: true,
  quality: 0.8
}, '*');
```

### **Geofencing**
```javascript
// Request permission
window.postMessage({ type: 'natively.geofence.requestPermission' }, '*');

// Enable notifications
window.postMessage({ 
  type: 'natively.geofence.enableNotifications',
  enabled: true
}, '*');

// Add location
window.postMessage({ 
  type: 'natively.geofence.add',
  location: {
    id: 'store-123',
    name: 'Walmart',
    latitude: 37.7749,
    longitude: -122.4194,
    radius: 100,
    listId: 'list-456',
    listName: 'Grocery List'
  }
}, '*');

// Remove location
window.postMessage({ 
  type: 'natively.geofence.remove',
  locationId: 'store-123'
}, '*');

// Get all locations
window.postMessage({ type: 'natively.geofence.getAll' }, '*');
```

### **Other Features**
```javascript
// Clipboard
window.postMessage({ 
  type: 'natively.clipboard.copy',
  text: 'Text to copy'
}, '*');

// Share
window.postMessage({ 
  type: 'natively.share',
  url: 'https://shopwell.ai',
  message: 'Check out this product!'
}, '*');

// Haptics
window.postMessage({ 
  type: 'natively.haptics.impact',
  style: 'medium' // 'light', 'medium', 'heavy'
}, '*');

// Audio Recording
window.postMessage({ type: 'natively.audio.startRecording' }, '*');
window.postMessage({ type: 'natively.audio.stopRecording' }, '*');

// Offline Sync
window.postMessage({ type: 'natively.offline.sync' }, '*');
```

### **Receiving Responses**
```javascript
window.addEventListener('message', (event) => {
  const data = event.data;
  
  switch (data.type) {
    case 'NATIVE_APP_READY':
      console.log('Native app ready!', data.platform, data.features);
      break;
      
    case 'CONTACT_PICKER_RESPONSE':
      if (data.success) {
        console.log('Contact selected:', data.contact);
      }
      break;
      
    case 'BIOMETRIC_AUTH_RESPONSE':
      if (data.success) {
        console.log('Authentication successful!');
      }
      break;
      
    case 'GEOFENCING_STATUS':
      console.log('Geofencing:', data.isActive, data.locationCount);
      break;
      
    case 'PERMISSIONS_STATUS':
      console.log('Permissions:', data.contacts, data.location, data.notifications);
      break;
      
    case 'SHARED_CONTENT':
      console.log('Received shared content:', data.contentType, data.content);
      break;
      
    case 'QUICK_ACTION':
      console.log('Quick action triggered:', data.action);
      break;
  }
});
```

## 🧪 **Testing**

### **Unit Tests**
```bash
npm test
```

### **E2E Tests**
```bash
npm run test:e2e
```

### **Crash Diagnostics**
Navigate to `/crash-diagnostics` in the app to view crash reports.

## 📂 **Project Structure**

```
shopwell-mobile-app/
├── app/                          # Expo Router screens
│   ├── (tabs)/                   # Tab navigation
│   │   ├── (home)/               # Home screen (WebView)
│   │   │   ├── index.ios.tsx    # iOS-specific
│   │   │   ├── index.android.tsx # Android-specific
│   │   │   └── index.web.tsx    # Web fallback
│   │   └── _layout.tsx           # Tab layout
│   ├── _layout.tsx               # Root layout
│   ├── share-target.tsx          # Share target handler
│   └── crash-diagnostics.tsx    # Crash reporting
├── components/                   # Reusable components
├── hooks/                        # Custom React hooks
│   ├── useNotifications.ts       # Push notifications
│   ├── useGeofencing.ts          # Location-based notifications
│   ├── useOfflineSync.ts         # Offline data sync
│   └── useQuickActions.ts        # App shortcuts
├── utils/                        # Utility functions
│   ├── contactsHandler.ts        # Contacts API
│   ├── biometricHandler.ts       # Biometric auth
│   ├── locationHandler.ts        # Location services
│   ├── audioHandler.ts           # Audio recording
│   ├── offlineStorage.ts         # Local storage
│   └── crashReporter.ts          # Error tracking
├── assets/                       # Images, fonts, etc.
├── app.json                      # Expo configuration
├── package.json                  # Dependencies
└── README.md                     # This file
```

## 🔐 **Security**

- ✅ All network requests use HTTPS
- ✅ Biometric authentication for sensitive actions
- ✅ Secure storage for user data
- ✅ No hardcoded API keys or secrets
- ✅ Permission-based access control
- ✅ Crash reporting with privacy protection

## 📊 **Performance**

- ✅ WebView caching enabled
- ✅ Lazy loading for heavy operations
- ✅ Offline mode with queue system
- ✅ Memory leak prevention
- ✅ Error boundaries for crash prevention

## 🐛 **Debugging**

### **Frontend Logs**
```bash
# View console logs
npm run logs
```

### **Crash Reports**
- Navigate to `/crash-diagnostics` in the app
- Logs are stored locally and can be shared

### **Common Issues**

**WebView not loading:**
- Check internet connection
- Verify `SHOPWELL_URL` is correct
- Check for CORS issues

**Permissions not working:**
- Verify permissions are declared in `app.json`
- Check permission status in device settings
- Request permissions before using features

**Geofencing not triggering:**
- Ensure "Always" location permission is granted
- Verify locations are added correctly
- Check notification permissions

## 📝 **License**

[Your License Here]

## 🤝 **Contributing**

[Contributing Guidelines]

## 📞 **Support**

For issues and questions:
- GitHub Issues: [Your Repo URL]
- Email: [Your Email]
- Website: https://shopwell.ai

---

**Built with ❤️ using React Native + Expo**
