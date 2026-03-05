
# ShopWell.ai Native App Integration Guide

## Overview
This document explains how the ShopWell.ai website should integrate with the native mobile app to enable all native features.

## Architecture
The native app wraps the ShopWell.ai website in a WebView and communicates via JavaScript message passing:
- **Native → Web**: `window.postMessage()` injected into WebView
- **Web → Native**: `window.postMessage()` from web app code

## 🚨 CRITICAL: Web App Integration Required

**The native app is fully implemented and working correctly.** All 7 reported issues are caused by the **web application (shopwell.ai) not listening for or handling native messages**.

### Current Status
✅ **Native App (Working)**:
- Biometric authentication handlers implemented
- Notification permission handlers implemented
- Contact picker handlers implemented
- Quick action handlers implemented (Photo Search, Product Search, Voice Planner)
- Share target handlers implemented
- All messages are being sent to the WebView

❌ **Web App (Missing Integration)**:
- Not listening for `BIOMETRIC_SUPPORT_RESPONSE` / `BIOMETRIC_AUTH_RESPONSE`
- Not listening for `NOTIFICATIONS_PERMISSION_RESPONSE`
- Not listening for `CONTACT_PICKER_RESPONSE`
- Not listening for `QUICK_ACTION` messages (Photo Search, Product Search shortcuts)
- Not listening for `SHARED_CONTENT` messages
- Not triggering native calls via `window.postMessage()`

## Required Web App Implementation

### 1. Initialize Native Bridge Listener

Add this code to your web app's main JavaScript file (runs on page load):

```javascript
// Check if running in native app
if (window.isNativeApp) {
  console.log('[ShopWell Web] Running in native app:', window.nativeAppPlatform);
  
  // Listen for messages from native app
  window.addEventListener('message', function(event) {
    const data = event.data;
    console.log('[ShopWell Web] Received message:', data.type);
    
    switch (data.type) {
      case 'NATIVE_APP_READY':
        console.log('[ShopWell Web] Native app ready, features:', data.features);
        // Enable native features in your UI
        handleNativeAppReady(data);
        break;
        
      case 'BIOMETRIC_SUPPORT_RESPONSE':
        console.log('[ShopWell Web] Biometric support:', data.isSupported, data.biometricType);
        // Update UI to show/hide biometric login option
        handleBiometricSupport(data);
        break;
        
      case 'BIOMETRIC_AUTH_RESPONSE':
        console.log('[ShopWell Web] Biometric auth result:', data.success);
        // Handle successful/failed biometric authentication
        handleBiometricAuth(data);
        break;
        
      case 'NOTIFICATIONS_PERMISSION_RESPONSE':
        console.log('[ShopWell Web] Notification permission:', data.status);
        // Update UI to reflect notification permission status
        handleNotificationPermission(data);
        break;
        
      case 'CONTACT_PICKER_RESPONSE':
        console.log('[ShopWell Web] Contact picked:', data.contact);
        // Use the selected contact data
        handleContactPicked(data);
        break;
        
      case 'QUICK_ACTION':
        console.log('[ShopWell Web] Quick action triggered:', data.action);
        // Handle quick actions (PHOTO_SEARCH, PRODUCT_SEARCH, VOICE_PLANNER)
        handleQuickAction(data);
        break;
        
      case 'SHARED_CONTENT':
        console.log('[ShopWell Web] Shared content received:', data.contentType, data.content);
        // Handle shared content from other apps
        handleSharedContent(data);
        break;
        
      case 'PERMISSIONS_STATUS':
        console.log('[ShopWell Web] Permissions status:', data);
        // Update UI based on permission statuses
        handlePermissionsStatus(data);
        break;
    }
  });
  
  // Signal to native app that web page is ready
  window.postMessage({ type: 'WEB_PAGE_READY', timestamp: Date.now() }, '*');
}
```

### 2. Biometric Authentication

**Enable Biometric Login in Settings:**

```javascript
// In your profile/settings page, add a "Enable Biometric Login" toggle

// Check if biometrics are supported
function checkBiometricSupport() {
  if (window.isNativeApp) {
    window.postMessage({ type: 'natively.biometric.isSupported' }, '*');
  }
}

// Handle the response
function handleBiometricSupport(data) {
  if (data.isSupported) {
    // Show biometric toggle in settings
    document.getElementById('biometric-toggle').style.display = 'block';
    document.getElementById('biometric-type').textContent = data.biometricType; // "Face ID", "Touch ID", etc.
  } else {
    // Hide biometric toggle
    document.getElementById('biometric-toggle').style.display = 'none';
  }
}

// Trigger biometric authentication (e.g., on login button click)
function authenticateWithBiometrics() {
  if (window.isNativeApp) {
    window.postMessage({ 
      type: 'natively.biometric.authenticate',
      reason: 'Log in to ShopWell.ai'
    }, '*');
  }
}

// Handle authentication result
function handleBiometricAuth(data) {
  if (data.success) {
    // User authenticated successfully - log them in
    console.log('Biometric authentication successful');
    // Proceed with login flow
  } else {
    // Authentication failed or cancelled
    console.log('Biometric authentication failed');
    // Show error message or fallback to password
  }
}
```

### 3. Native Notifications

**Add "Enable Notifications" button in profile page:**

```javascript
// In your profile page, add a button to request notification permissions

function requestNotificationPermission() {
  if (window.isNativeApp) {
    console.log('[ShopWell Web] Requesting notification permission...');
    window.postMessage({ type: 'natively.notifications.requestPermission' }, '*');
  }
}

function handleNotificationPermission(data) {
  console.log('[ShopWell Web] Notification permission status:', data.status);
  
  if (data.granted) {
    // Update UI to show notifications are enabled
    document.getElementById('notification-status').textContent = 'Enabled';
    document.getElementById('notification-button').textContent = 'Notifications Enabled';
    document.getElementById('notification-button').disabled = true;
  } else {
    // Show message that notifications are disabled
    document.getElementById('notification-status').textContent = 'Disabled';
    alert('Please enable notifications in your device settings to receive alerts.');
  }
}

// Add button click handler
document.getElementById('enable-notifications-btn').addEventListener('click', requestNotificationPermission);
```

### 4. Contact Picker

**"Choose from Contacts" button:**

```javascript
// When user clicks "Choose from Contacts" button

function pickContact() {
  if (window.isNativeApp) {
    console.log('[ShopWell Web] Opening contact picker...');
    window.postMessage({ type: 'natively.contacts.pick' }, '*');
  } else {
    // Fallback for web - show manual input
    alert('Contact picker is only available in the mobile app');
  }
}

function handleContactPicked(data) {
  if (data.success && data.contact) {
    console.log('[ShopWell Web] Contact selected:', data.contact);
    
    // Use the contact data
    const contact = data.contact;
    document.getElementById('contact-name').value = contact.name;
    
    if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
      document.getElementById('contact-phone').value = contact.phoneNumbers[0];
    }
    
    if (contact.emails && contact.emails.length > 0) {
      document.getElementById('contact-email').value = contact.emails[0];
    }
  } else if (data.cancelled) {
    console.log('[ShopWell Web] Contact picker cancelled');
  } else {
    console.error('[ShopWell Web] Failed to pick contact:', data.error);
    alert('Failed to access contacts. Please check permissions.');
  }
}

// Add button click handler
document.getElementById('choose-contact-btn').addEventListener('click', pickContact);
```

### 5. Quick Actions (App Shortcuts)

**Handle Photo Search and Product Search shortcuts:**

```javascript
function handleQuickAction(data) {
  console.log('[ShopWell Web] Quick action:', data.action);
  
  switch (data.action) {
    case 'PHOTO_SEARCH':
      // Open the "Scan Product" modal
      console.log('[ShopWell Web] Opening Scan Product modal...');
      openScanProductModal();
      break;
      
    case 'PRODUCT_SEARCH':
      // Open the "Product Search" modal
      console.log('[ShopWell Web] Opening Product Search modal...');
      openProductSearchModal();
      break;
      
    case 'VOICE_PLANNER':
      // Open the voice planner
      console.log('[ShopWell Web] Opening Voice Planner...');
      openVoicePlanner();
      break;
  }
}

// Example modal opening functions (implement based on your UI framework)
function openScanProductModal() {
  // Show your scan product modal/page
  document.getElementById('scan-product-modal').style.display = 'block';
  // Or navigate to scan page: window.location.hash = '#/scan';
}

function openProductSearchModal() {
  // Show your product search modal/page
  document.getElementById('product-search-modal').style.display = 'block';
  // Or navigate to search page: window.location.hash = '#/search';
}
```

### 6. Share Target

**Handle shared content from other apps:**

```javascript
function handleSharedContent(data) {
  console.log('[ShopWell Web] Shared content received:', data.contentType, data.content);
  
  switch (data.contentType) {
    case 'url':
      // User shared a URL - maybe add product from URL
      console.log('[ShopWell Web] Shared URL:', data.content);
      handleSharedUrl(data.content);
      break;
      
    case 'text':
      // User shared text - maybe create a shopping list item
      console.log('[ShopWell Web] Shared text:', data.content);
      handleSharedText(data.content);
      break;
      
    case 'image':
      // User shared an image - maybe scan it for products
      console.log('[ShopWell Web] Shared image:', data.content);
      handleSharedImage(data.content);
      break;
  }
}

function handleSharedUrl(url) {
  // Example: Extract product from URL and add to shopping list
  // Show a modal: "Add this product to your shopping list?"
  showAddProductModal(url);
}

function handleSharedText(text) {
  // Example: Create a new shopping list item with this text
  // Show a modal: "Add to shopping list?"
  showAddItemModal(text);
}

function handleSharedImage(imageUri) {
  // Example: Scan the image for products
  // Show a modal: "Scan this image for products?"
  showScanImageModal(imageUri);
}
```

### 7. Performance Optimization

**The slow loading is inherent to WebView, but you can improve it:**

```javascript
// 1. Optimize your web app for mobile
// - Minimize JavaScript bundle size
// - Use lazy loading for images
// - Implement code splitting
// - Use service workers for caching

// 2. Show loading indicators
window.addEventListener('load', function() {
  // Hide loading spinner when page is fully loaded
  document.getElementById('loading-spinner').style.display = 'none';
});

// 3. Implement progressive loading
// Load critical content first, then load secondary content
```

## Testing Checklist

### ✅ Biometric Authentication
1. Open ShopWell.ai in the native app
2. Go to Profile/Settings page
3. Look for "Enable Biometric Login" toggle
4. Click it - should trigger native biometric prompt (Face ID/Touch ID/Fingerprint)
5. Verify authentication result is handled correctly

### ✅ Notifications
1. Open ShopWell.ai in the native app
2. Go to Profile page
3. Click "Enable Notifications" button
4. Should show native permission prompt
5. Verify permission status is reflected in UI

### ✅ Contacts
1. Open ShopWell.ai in the native app
2. Find a "Choose from Contacts" button (e.g., when sharing a list)
3. Click it - should open native contact picker
4. Select a contact
5. Verify contact data is populated in the form

### ✅ Quick Actions
1. Close the app completely
2. Long-press the app icon
3. Tap "Photo Search" - should open app and show Scan Product modal
4. Repeat with "Product Search" - should show Product Search modal

### ✅ Share Target
1. Open another app (e.g., Safari, Photos)
2. Share a URL/text/image
3. Select "ShopWell.ai" from share sheet
4. App should open and handle the shared content

## Debugging

### Check if running in native app:
```javascript
console.log('Is native app:', window.isNativeApp);
console.log('Platform:', window.nativeAppPlatform);
console.log('Native ready:', window.nativeAppReady);
```

### Monitor messages:
```javascript
window.addEventListener('message', function(event) {
  console.log('[DEBUG] Message received:', event.data);
});
```

### Test message sending:
```javascript
// Send a test message to native app
window.postMessage({ type: 'natively.biometric.isSupported' }, '*');
```

## Summary

**All native features are implemented and working.** The web application needs to:

1. ✅ Add event listener for `window.addEventListener('message', ...)`
2. ✅ Handle `BIOMETRIC_SUPPORT_RESPONSE` and `BIOMETRIC_AUTH_RESPONSE`
3. ✅ Handle `NOTIFICATIONS_PERMISSION_RESPONSE`
4. ✅ Handle `CONTACT_PICKER_RESPONSE`
5. ✅ Handle `QUICK_ACTION` messages
6. ✅ Handle `SHARED_CONTENT` messages
7. ✅ Add UI elements (buttons/toggles) that call `window.postMessage()` to trigger native features

**The native app is sending all messages correctly. The web app just needs to listen for and handle them.**
