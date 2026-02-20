
# Native App Integration Guide for ShopWell.ai Website

This document explains how the ShopWell.ai website can integrate with the native mobile app features.

## Account Deletion

### Overview
The native app now supports account deletion to comply with Apple App Store requirements. When a user initiates account deletion from your website, the app will:
1. Show a native confirmation dialog
2. Clear all local data if confirmed
3. Send confirmation back to the website to complete server-side deletion

### Implementation

#### Step 1: Detect if running in native app
```javascript
if (window.isNativeApp) {
  // User is in the native app
  console.log('Running in native app on:', window.nativeAppPlatform);
}
```

#### Step 2: Trigger account deletion from your website
```javascript
// In your account settings page, add a "Delete Account" button
function handleDeleteAccount() {
  if (window.isNativeApp) {
    // Send message to native app
    window.postMessage({
      type: 'natively.account.delete'
    }, '*');
  } else {
    // Handle web-only deletion flow
    // Show your own confirmation dialog and delete via API
  }
}
```

#### Step 3: Listen for confirmation from native app
```javascript
window.addEventListener('message', (event) => {
  const data = event.data;
  
  if (data.type === 'ACCOUNT_DELETE_RESPONSE') {
    if (data.confirmed) {
      // User confirmed deletion in native dialog
      // Proceed with server-side account deletion
      deleteAccountOnServer();
    } else if (data.cancelled) {
      // User cancelled deletion
      console.log('Account deletion cancelled');
    }
  }
});

async function deleteAccountOnServer() {
  try {
    // Call your API to delete the account
    const response = await fetch('https://shopwell.ai/api/account/delete', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      // Account deleted successfully
      // Redirect to goodbye page or login
      window.location.href = '/account-deleted';
    }
  } catch (error) {
    console.error('Failed to delete account:', error);
    alert('Failed to delete account. Please try again.');
  }
}
```

### User Experience Flow
1. User clicks "Delete Account" in your website settings
2. Native app shows confirmation dialog: "Your account will be permanently deleted. This action cannot be undone. All your data will be removed from our servers."
3. If user confirms:
   - App clears all local data (shopping lists, cached products, preferences)
   - App sends confirmation to website
   - Website calls API to delete account on server
   - User is logged out and redirected
4. If user cancels:
   - No action taken
   - User remains on settings page

## App Tracking Transparency (iOS only)

### Overview
On iOS 14.5+, the app automatically requests tracking permission when launched. This is required by Apple for apps that collect tracking data.

### What the app does
- Requests permission with message: "This allows us to provide you with personalized product recommendations and improve your shopping experience. Your data is used to show relevant content and offers."
- Sends tracking status to website

### Receiving tracking status
```javascript
window.addEventListener('message', (event) => {
  const data = event.data;
  
  if (data.type === 'TRACKING_STATUS') {
    console.log('Tracking status:', data.status);
    // Possible values: 'granted', 'denied', 'restricted', 'not-determined', 'not-applicable' (Android)
    
    if (data.status === 'granted') {
      // User allowed tracking - you can use analytics, personalization, etc.
      enablePersonalization();
    } else {
      // User denied tracking - respect their privacy
      disablePersonalization();
    }
  }
});
```

## Complete Example: Account Settings Page

```html
<!DOCTYPE html>
<html>
<head>
  <title>Account Settings - ShopWell.ai</title>
</head>
<body>
  <div class="settings-page">
    <h1>Account Settings</h1>
    
    <!-- Other settings -->
    
    <div class="danger-zone">
      <h2>Danger Zone</h2>
      <button id="deleteAccountBtn" class="btn-danger">
        Delete My Account
      </button>
      <p class="warning">
        This action cannot be undone. All your data will be permanently deleted.
      </p>
    </div>
  </div>

  <script>
    // Listen for messages from native app
    window.addEventListener('message', (event) => {
      const data = event.data;
      
      if (data.type === 'ACCOUNT_DELETE_RESPONSE') {
        if (data.confirmed) {
          deleteAccountOnServer();
        }
      }
      
      if (data.type === 'TRACKING_STATUS') {
        handleTrackingStatus(data.status);
      }
    });

    // Handle delete account button
    document.getElementById('deleteAccountBtn').addEventListener('click', () => {
      if (window.isNativeApp) {
        // Let native app handle confirmation
        window.postMessage({
          type: 'natively.account.delete'
        }, '*');
      } else {
        // Web-only flow
        if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
          deleteAccountOnServer();
        }
      }
    });

    async function deleteAccountOnServer() {
      try {
        const response = await fetch('/api/account/delete', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          localStorage.clear();
          window.location.href = '/goodbye';
        } else {
          alert('Failed to delete account. Please contact support.');
        }
      } catch (error) {
        console.error('Error deleting account:', error);
        alert('An error occurred. Please try again.');
      }
    }

    function handleTrackingStatus(status) {
      if (status === 'granted') {
        // Enable analytics and personalization
        console.log('Tracking enabled');
      } else {
        // Disable tracking features
        console.log('Tracking disabled');
      }
    }
  </script>
</body>
</html>
```

## Testing

### Test Account Deletion
1. Open the app
2. Navigate to account settings on your website
3. Click "Delete Account"
4. Verify native confirmation dialog appears
5. Click "Delete Account" in dialog
6. Verify account is deleted on server
7. Verify user is logged out

### Test Tracking Permission (iOS only)
1. Delete and reinstall the app
2. Launch the app
3. Verify tracking permission dialog appears
4. Grant or deny permission
5. Check that website receives tracking status

## Notes for Backend Team

You need to implement a DELETE endpoint for account deletion:

```
DELETE /api/account/delete
Authorization: Bearer {token}

Response:
200 OK - Account deleted successfully
401 Unauthorized - Invalid token
500 Internal Server Error - Deletion failed
```

The endpoint should:
1. Verify the user's authentication token
2. Delete all user data from the database
3. Invalidate all user sessions
4. Return success response

## Compliance Notes

### Apple App Store Requirements
✅ Account deletion is now supported in-app
✅ App Tracking Transparency is implemented for iOS 14.5+
✅ User can delete account without contacting support
✅ Deletion is permanent and removes all user data

### Privacy Policy
Make sure your privacy policy mentions:
- What data is collected for tracking purposes
- How users can control tracking (via iOS settings)
- How to delete their account
- What happens to their data after deletion
