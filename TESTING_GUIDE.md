
# Testing Guide - App Store Compliance Features

## Prerequisites
- iOS device running iOS 14.5 or later (for ATT testing)
- Android device (for account deletion testing)
- Test account on shopwell.ai

---

## Test 1: App Tracking Transparency (iOS Only)

### Setup
1. Delete the app from your iOS device if already installed
2. Reset advertising identifier:
   - Settings → Privacy & Security → Tracking → Reset Advertising Identifier

### Test Steps
1. Install the app
2. Launch the app for the first time
3. **Expected**: ATT permission dialog appears with message:
   > "This allows us to provide you with personalized product recommendations and improve your shopping experience. Your data is used to show relevant content and offers."
4. Tap "Allow" or "Ask App Not to Track"
5. App continues to load shopwell.ai website

### Verification
- Check console logs for: `"Current tracking status: granted"` or `"denied"`
- Website should receive tracking status message
- If denied, tracking features should be disabled

### Test Scenarios

#### Scenario A: User Grants Permission
1. Tap "Allow" in ATT dialog
2. Verify tracking status is "granted"
3. Verify analytics and personalization work

#### Scenario B: User Denies Permission
1. Tap "Ask App Not to Track"
2. Verify tracking status is "denied"
3. Verify app still functions normally
4. Verify no tracking data is collected

#### Scenario C: Change Permission Later
1. Go to iOS Settings → Privacy & Security → Tracking
2. Find "ShopWell.ai Mobile"
3. Toggle permission on/off
4. Relaunch app
5. Verify new tracking status is respected

---

## Test 2: Account Deletion (iOS & Android)

### Setup
1. Create a test account on shopwell.ai
2. Add some data (shopping lists, products, etc.)
3. Log into the app with test account

### Test Steps

#### Part 1: Initiate Deletion
1. Open the app
2. Navigate to shopwell.ai within the app
3. Go to Account Settings page
4. Click "Delete Account" button
5. **Expected**: Native confirmation dialog appears

#### Part 2: Confirmation Dialog
The dialog should show:
- **Title**: "Delete Account"
- **Message**: "Your account will be permanently deleted. This action cannot be undone. All your data will be removed from our servers."
- **Buttons**: "Cancel" and "Delete Account" (red/destructive)

#### Part 3: Cancel Flow
1. Tap "Cancel"
2. **Expected**: Dialog dismisses
3. **Expected**: Account is NOT deleted
4. **Expected**: User remains on settings page
5. **Expected**: All data still exists

#### Part 4: Confirm Flow
1. Click "Delete Account" again
2. Tap "Delete Account" (red button)
3. **Expected**: Dialog dismisses
4. **Expected**: Console logs show: `"User confirmed account deletion"`
5. **Expected**: Console logs show: `"Cleared all local storage"`
6. **Expected**: Website receives confirmation message
7. **Expected**: Account is deleted on server
8. **Expected**: User is logged out
9. **Expected**: Redirect to goodbye/login page

### Verification Checklist

#### Local Data Cleared
- [ ] Shopping lists deleted
- [ ] Cached products removed
- [ ] User preferences cleared
- [ ] Offline queue cleared
- [ ] All AsyncStorage data removed

#### Server-Side Deletion
- [ ] User account deleted from database
- [ ] All user data removed
- [ ] User sessions invalidated
- [ ] Cannot log in with deleted account

#### User Experience
- [ ] Clear warning message shown
- [ ] Confirmation required (not accidental)
- [ ] No external steps needed
- [ ] Process completes in-app
- [ ] User is logged out after deletion

---

## Test 3: Integration Testing

### Test Both Features Together
1. Fresh install of app
2. Launch app → ATT dialog appears
3. Grant tracking permission
4. Log in to account
5. Use app normally
6. Navigate to settings
7. Delete account
8. Verify both features work correctly

---

## Console Log Verification

### Expected Logs for ATT (iOS)
```
Checking tracking permission status...
Current tracking status: undetermined
Requesting tracking permission from user...
User responded with tracking permission: granted
Sending tracking status to web: granted
```

### Expected Logs for Account Deletion
```
User initiated account deletion from web
User confirmed account deletion
Cleared all local storage
```

---

## Common Issues & Solutions

### Issue: ATT Dialog Doesn't Appear
**Cause**: Already requested in previous install
**Solution**: 
1. Delete app
2. Settings → Privacy & Security → Tracking → Reset Advertising Identifier
3. Reinstall app

### Issue: Account Deletion Button Not Visible
**Cause**: Website hasn't implemented the feature yet
**Solution**: 
1. Check `NATIVE_APP_INTEGRATION.md`
2. Ensure website has delete account button
3. Ensure website sends `natively.account.delete` message

### Issue: Confirmation Dialog Doesn't Appear
**Cause**: Message not reaching native app
**Solution**:
1. Check console logs for message type
2. Verify WebView message handler is working
3. Check JavaScript injection is successful

### Issue: Account Not Deleted on Server
**Cause**: Backend endpoint not implemented
**Solution**:
1. Implement `DELETE /api/account/delete` endpoint
2. Ensure endpoint validates auth token
3. Ensure endpoint deletes all user data

---

## Testing for App Store Review

### Prepare Test Account
1. Create a dedicated test account
2. Add sample data (lists, products)
3. Document credentials for Apple reviewers

### Test Account Info for Apple
```
Email: test@shopwell.ai
Password: TestPassword123!

Instructions:
1. Log in with above credentials
2. Navigate to Settings (hamburger menu → Settings)
3. Scroll to "Danger Zone"
4. Click "Delete Account"
5. Confirm in native dialog
6. Account will be deleted and user logged out
```

### Video Recording (Optional but Recommended)
Record a screen video showing:
1. App launch with ATT dialog
2. Granting tracking permission
3. Navigating to settings
4. Clicking delete account
5. Confirming deletion
6. Account successfully deleted

---

## Automated Testing (Future)

### Unit Tests
```typescript
// hooks/useTrackingPermission.test.ts
describe('useTrackingPermission', () => {
  it('should request permission on iOS', async () => {
    // Test implementation
  });
  
  it('should return not-applicable on Android', () => {
    // Test implementation
  });
});
```

### Integration Tests
```typescript
// account-deletion.test.ts
describe('Account Deletion', () => {
  it('should show confirmation dialog', async () => {
    // Test implementation
  });
  
  it('should clear local data on confirm', async () => {
    // Test implementation
  });
  
  it('should not delete on cancel', async () => {
    // Test implementation
  });
});
```

---

## Sign-Off Checklist

Before submitting to App Store:

### ATT Implementation
- [ ] ATT dialog appears on first launch (iOS 14.5+)
- [ ] Permission message is clear and accurate
- [ ] App respects user's tracking choice
- [ ] Tracking status sent to website
- [ ] Works on iOS 14.5, 15, 16, 17, 18
- [ ] Doesn't crash on older iOS versions

### Account Deletion Implementation
- [ ] Delete button accessible in app
- [ ] Native confirmation dialog appears
- [ ] Clear warning about permanent deletion
- [ ] Cancel button works correctly
- [ ] Confirm button deletes account
- [ ] Local data cleared on deletion
- [ ] Server-side deletion triggered
- [ ] User logged out after deletion
- [ ] No external steps required
- [ ] Works on both iOS and Android

### Documentation
- [ ] Integration guide provided to website team
- [ ] Backend endpoint documented
- [ ] Testing guide complete
- [ ] Compliance document ready for Apple

### Privacy Policy
- [ ] Mentions account deletion process
- [ ] Mentions tracking data collection
- [ ] Mentions user control over tracking
- [ ] Mentions data deletion after account removal

---

## Contact

For questions about testing:
- Technical issues: [Your technical contact]
- App Store submission: [Your submission contact]
- Privacy/compliance: [Your legal contact]
