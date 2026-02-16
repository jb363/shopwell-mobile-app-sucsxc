
# iOS-Specific Features for ShopWell.ai

This document outlines the iOS-specific features implemented in the ShopWell.ai native app.

## Features Implemented

### 1. iOS Push Notifications ✅

The app supports native iOS push notifications with the following capabilities:

- **Permission Handling**: Automatically requests notification permissions on first launch
- **Push Token Management**: Obtains and manages Expo push tokens for sending notifications
- **Deep Linking**: Notifications can include URLs that open specific pages in the app
- **Foreground Notifications**: Displays notifications even when the app is open
- **Background Notifications**: Handles notifications when the app is in the background
- **Notification Interactions**: Responds to user taps on notifications

**Implementation Files:**
- `hooks/useNotifications.ts` - Main notification logic
- `app/(tabs)/(home)/index.ios.tsx` - iOS-specific WebView with notification integration

**JavaScript Bridge API:**
```javascript
// Get notification token
const token = await window.natively.notification.getToken();

// Listen for notification token
window.addEventListener('natively.notification.token', (event) => {
  console.log('Push token:', event.detail.token);
});

// Listen for incoming notifications
window.addEventListener('natively.notification.received', (event) => {
  console.log('Notification:', event.detail);
});
```

### 2. Barcode/QR Code Scanner ✅ NEW

Native barcode and QR code scanning with real-time detection:

- **Multiple Barcode Types**: Supports EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, QR codes, and more
- **Real-time Scanning**: Live camera preview with scanning frame overlay
- **Torch/Flash Control**: Toggle flashlight for low-light scanning
- **Haptic Feedback**: Success vibration when barcode is detected
- **Visual Feedback**: Animated scanning frame with corner indicators

**Implementation Files:**
- `app/scanner.tsx` - Dedicated scanner screen with camera UI
- `app/(tabs)/(home)/index.ios.tsx` - Scanner integration via JavaScript bridge

**JavaScript Bridge API:**
```javascript
// Open native scanner
window.postMessage({ type: 'natively.scanner.open' }, '*');

// Listen for scanned barcode
window.addEventListener('message', (event) => {
  if (event.data.type === 'BARCODE_SCANNED') {
    console.log('Barcode:', event.data.barcode);
    console.log('Type:', event.data.barcodeType);
  }
});
```

**Supported Barcode Types:**
- QR Code
- EAN-13 (European Article Number)
- EAN-8
- UPC-A (Universal Product Code)
- UPC-E
- Code 128
- Code 39
- Code 93
- Codabar
- ITF-14

### 3. Offline Storage & Sync ✅ NEW

Comprehensive offline data storage with automatic synchronization:

- **Local Database**: AsyncStorage-based persistence for shopping lists and products
- **Offline Queue**: Tracks all changes made while offline for later sync
- **Automatic Sync**: Syncs data automatically when network connection is restored
- **Manual Sync**: Trigger sync manually via JavaScript bridge
- **Product Caching**: Cache product information for offline access
- **Network State Monitoring**: Real-time network status updates

**Implementation Files:**
- `utils/offlineStorage.ts` - Core offline storage utilities
- `hooks/useOfflineSync.ts` - Automatic sync hook with network monitoring
- `app/(tabs)/(home)/index.ios.tsx` - Offline storage bridge integration

**JavaScript Bridge API:**
```javascript
// Generic storage
await window.postMessage({ type: 'natively.storage.set', key: 'myKey', value: { data: 'value' } }, '*');
const value = await window.postMessage({ type: 'natively.storage.get', key: 'myKey' }, '*');
await window.postMessage({ type: 'natively.storage.remove', key: 'myKey' }, '*');

// Shopping lists
await window.postMessage({ 
  type: 'natively.lists.save', 
  list: { id: '123', name: 'Groceries', items: [...] } 
}, '*');

const lists = await window.postMessage({ type: 'natively.lists.get' }, '*');
await window.postMessage({ type: 'natively.lists.delete', listId: '123' }, '*');

// Product caching
await window.postMessage({ 
  type: 'natively.product.cache', 
  product: { id: '456', barcode: '1234567890', name: 'Product Name' } 
}, '*');

const product = await window.postMessage({ 
  type: 'natively.product.getCached', 
  barcode: '1234567890' 
}, '*');

// Manual sync
await window.postMessage({ type: 'natively.sync.manual' }, '*');

// Listen for sync status
window.addEventListener('message', (event) => {
  if (event.data.type === 'SYNC_STATUS') {
    console.log('Syncing:', event.data.isSyncing);
    console.log('Queue size:', event.data.queueSize);
    console.log('Online:', event.data.isOnline);
  }
});
```

**Data Structures:**
```typescript
interface ShoppingList {
  id: string;
  name: string;
  items: ShoppingListItem[];
  createdAt: string;
  updatedAt: string;
  synced: boolean;
}

interface ShoppingListItem {
  id: string;
  productId?: string;
  name: string;
  quantity: number;
  checked: boolean;
  notes?: string;
}

interface Product {
  id: string;
  barcode?: string;
  name: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  lastPrice?: number;
  cachedAt: string;
}
```

### 4. Universal Links (Deep Linking) ✅

The app supports Universal Links for seamless deep linking from web to app:

- **Associated Domains**: Configured for `bda3e11e-68e8-45b3-9d3c-7c4fff44599c.lovableproject.com`
- **URL Handling**: Automatically opens app when users tap links from the website
- **Route Preservation**: Maintains the exact path and query parameters from the web URL

**Configuration:**
- `app.json` - iOS associated domains configuration
- `app/(tabs)/(home)/index.ios.tsx` - Deep link handling logic

**Supported URL Patterns:**
- `https://bda3e11e-68e8-45b3-9d3c-7c4fff44599c.lovableproject.com/*` - Opens in app
- `shopwell://*` - Custom URL scheme

### 5. iOS Share Extension Support 🔧

The app is configured to receive shared content from other iOS apps:

**What Works:**
- Intent filters configured for receiving shared URLs and images
- Share target screen (`app/share-target.tsx`) processes shared content
- WebView bridge can receive shared data

**What Needs Native Configuration:**
To fully enable iOS Share Extension, you need to:

1. **Add Share Extension Target in Xcode:**
   - Open the iOS project in Xcode
   - Add a new Share Extension target
   - Configure the extension to handle URLs and images
   - Set up the extension to communicate with the main app

2. **Configure Info.plist:**
   ```xml
   <key>NSExtension</key>
   <dict>
     <key>NSExtensionAttributes</key>
     <dict>
       <key>NSExtensionActivationRule</key>
       <dict>
         <key>NSExtensionActivationSupportsWebURLWithMaxCount</key>
         <integer>1</integer>
         <key>NSExtensionActivationSupportsImageWithMaxCount</key>
         <integer>1</integer>
       </dict>
     </dict>
     <key>NSExtensionPointIdentifier</key>
     <string>com.apple.share-services</string>
   </dict>
   ```

3. **Share Extension Code:**
   The extension should extract shared content and pass it to the main app via:
   - App Groups (for data sharing)
   - URL scheme (`shopwell://share-target?url=...&text=...`)

**Target URL for Shared Content:**
`https://bda3e11e-68e8-45b3-9d3c-7c4fff44599c.lovableproject.com/share-target`

### 6. JavaScript Bridge ✅

Comprehensive bridge between WebView and native iOS features:

**Available APIs:**

```javascript
// Haptic Feedback
await window.postMessage({ type: 'natively.haptic.trigger', style: 'light' }, '*');
await window.postMessage({ type: 'natively.haptic.trigger', style: 'medium' }, '*');
await window.postMessage({ type: 'natively.haptic.trigger', style: 'heavy' }, '*');
await window.postMessage({ type: 'natively.haptic.trigger', style: 'success' }, '*');
await window.postMessage({ type: 'natively.haptic.trigger', style: 'warning' }, '*');
await window.postMessage({ type: 'natively.haptic.trigger', style: 'error' }, '*');

// Clipboard
window.postMessage({ type: 'natively.clipboard.read' }, '*');
window.postMessage({ type: 'natively.clipboard.write', text: 'Hello World' }, '*');

// Share
window.postMessage({ 
  type: 'natively.share', 
  url: 'https://example.com',
  message: 'Check this out'
}, '*');

// Image Picker
window.postMessage({ type: 'natively.imagePicker' }, '*');

// Scanner
window.postMessage({ type: 'natively.scanner.open' }, '*');

// Storage (see Offline Storage section above)
// Lists (see Offline Storage section above)
// Products (see Offline Storage section above)
// Sync (see Offline Storage section above)
```

### 7. iOS-Specific Optimizations ✅

- **Swipe Gestures**: Back/forward navigation with iOS swipe gestures
- **Pull to Refresh**: Native iOS pull-to-refresh control
- **Safe Area**: Respects iOS safe areas (notch, home indicator)
- **Status Bar**: Adapts to light/dark mode automatically
- **Keyboard Handling**: Proper keyboard avoidance for input fields

## Testing Features

### Test Barcode Scanner

1. **Open Scanner:**
   - Navigate to the scanner screen from the app
   - Grant camera permissions when prompted

2. **Scan a Barcode:**
   - Point camera at any product barcode
   - Scanner will automatically detect and process the barcode
   - Haptic feedback confirms successful scan

3. **Test Different Barcode Types:**
   - Try EAN-13 (most grocery products)
   - Try QR codes
   - Try UPC codes (US products)

### Test Offline Storage

1. **Save Data Offline:**
   ```javascript
   // Save a shopping list
   window.postMessage({ 
     type: 'natively.lists.save',
     list: {
       id: 'test-123',
       name: 'Test List',
       items: [
         { id: '1', name: 'Milk', quantity: 1, checked: false }
       ],
       createdAt: new Date().toISOString(),
       updatedAt: new Date().toISOString(),
       synced: false
     }
   }, '*');
   ```

2. **Enable Airplane Mode:**
   - Turn on airplane mode on your device
   - Continue making changes to shopping lists
   - All changes are queued for sync

3. **Disable Airplane Mode:**
   - Turn off airplane mode
   - App automatically syncs queued changes
   - Monitor sync status via SYNC_STATUS messages

### Test Notifications

1. **Get Push Token:**
   ```javascript
   const token = await window.natively.notification.getToken();
   console.log('Token:', token);
   ```

2. **Send Test Notification:**
   Use the Expo Push Notification Tool:
   - Visit: https://expo.dev/notifications
   - Enter your Expo push token
   - Send a test notification

3. **Test Deep Linking:**
   Include in notification payload:
   ```json
   {
     "to": "ExponentPushToken[...]",
     "title": "Test Notification",
     "body": "Tap to open app",
     "data": {
       "url": "/lists/123"
     }
   }
   ```

## Known Limitations

1. **Share Extension**: Requires native Xcode configuration (not available in Expo Go)
2. **Background Notifications**: Limited by iOS system policies
3. **Notification Sounds**: Custom sounds require additional configuration
4. **Rich Notifications**: Images/videos in notifications need additional setup
5. **Offline Sync**: Requires backend API endpoints for full synchronization

## Backend Integration Required

The following backend endpoints are needed for full offline sync functionality:

```
POST /api/products/scan
Body: { barcode: string, type: string }
Returns: { id: string, name: string, brand: string, price: number, imageUrl: string }

GET /api/lists
Returns: [{ id: string, name: string, items: [...], createdAt: string, updatedAt: string }]

POST /api/lists
Body: { name: string, items: [...] }
Returns: { id: string, name: string, items: [...], createdAt: string }

PUT /api/lists/:id
Body: { name?: string, items?: [...] }
Returns: { id: string, name: string, items: [...], updatedAt: string }

DELETE /api/lists/:id
Returns: { success: true }

POST /api/lists/:id/items
Body: { productId?: string, name: string, quantity: number }
Returns: { id: string, ...item }

PUT /api/lists/:id/items/:itemId
Body: { name?: string, quantity?: number, checked?: boolean }
Returns: { id: string, ...item }

DELETE /api/lists/:id/items/:itemId
Returns: { success: true }
```

## Next Steps

To complete iOS feature parity:

1. **Backend API**: Implement the endpoints listed above for offline sync
2. **Share Extension**: Run `npx expo prebuild` and configure in Xcode
3. **Biometric Auth**: Implement Face ID/Touch ID for secure access
4. **Location Services**: Add store locator and proximity alerts
5. **Background Refresh**: Implement background sync for price updates
6. **Apple Wallet**: Add coupon and loyalty card integration

## Resources

- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Expo Camera Documentation](https://docs.expo.dev/versions/latest/sdk/camera/)
- [AsyncStorage Documentation](https://react-native-async-storage.github.io/async-storage/)
- [iOS Universal Links](https://developer.apple.com/ios/universal-links/)
- [iOS Share Extension](https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/Share.html)
- [Expo Push Notifications Guide](https://docs.expo.dev/push-notifications/overview/)
