
# Location-Based Push Notifications Guide

## Overview
This app now supports location-based push notifications for shopping lists and reservations. When users approach stores with active lists or reservations, they receive automatic notifications with quick access to their information.

## Features Implemented

### 1. **Geofencing System**
- Background location monitoring
- Automatic notifications when entering store radius
- Customizable radius per store (default: 100 meters)
- Support for multiple store locations

### 2. **Store Location Management**
- Add stores with current location
- Associate lists or reservations with stores
- View and manage all monitored locations
- Enable/disable monitoring
- Remove individual store locations

### 3. **Notification Types**
- **Shopping List Notifications**: "📋 [List Name] - You're near [Store Name]! Tap to view your list."
- **Reservation Notifications**: "🎫 Reservation #[Number] - Tap to view details."
- **Generic Store Notifications**: "📍 Near [Store Name]"

### 4. **Deep Linking**
- Notifications include data for deep linking to:
  - List detail screens (when backend provides endpoints)
  - Reservation detail screens (when backend provides endpoints)
  - Store information

## User Flow

### Setup
1. User taps the floating location button (blue pin icon with badge)
2. App requests location permissions (foreground + background)
3. User grants permissions
4. User can now add store locations

### Adding a Store Location
1. Open Location Manager
2. Tap the "+" button
3. Fill in store details:
   - Store Name (e.g., "Costco")
   - List Name (optional)
   - Reservation Number (optional)
   - Radius in meters (default: 100)
4. Tap "Use Current Location"
5. Store is added and monitoring begins

### Receiving Notifications
1. User approaches a monitored store
2. App detects entry into geofence
3. Notification is sent immediately
4. User taps notification
5. App opens to relevant screen (list or reservation)

## Technical Implementation

### Files Created
- `utils/locationHandler.ts` - Location and geofencing utilities
- `hooks/useGeofencing.ts` - React hook for geofencing management
- `components/StoreLocationManager.tsx` - UI for managing locations

### Files Modified
- `app.json` - Added location permissions and plugin configuration
- `hooks/useNotifications.ts` - Added geofence notification handling
- `app/(tabs)/(home)/index.ios.tsx` - Integrated geofencing for iOS
- `app/(tabs)/(home)/index.android.tsx` - Integrated geofencing for Android

### Permissions Required

#### iOS (app.json)
```json
"NSLocationWhenInUseUsageDescription": "ShopWell.ai needs your location to notify you when you're near stores with active shopping lists",
"NSLocationAlwaysAndWhenInUseUsageDescription": "ShopWell.ai needs your location in the background to send you reminders when you're near stores with active shopping lists",
"UIBackgroundModes": ["remote-notification", "location"]
```

#### Android (app.json)
```json
"permissions": [
  "ACCESS_FINE_LOCATION",
  "ACCESS_COARSE_LOCATION",
  "ACCESS_BACKGROUND_LOCATION"
]
```

### Data Storage
Store locations are persisted in AsyncStorage:
```typescript
interface StoreLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
  listId?: string;
  listName?: string;
  listImage?: string;
  reservationNumber?: string;
}
```

### Background Task
The geofencing task runs in the background using `expo-task-manager`:
```typescript
TaskManager.defineTask('SHOPWELL_GEOFENCING_TASK', async ({ data, error }) => {
  // Handles geofence enter/exit events
  // Schedules notifications
  // Includes store and list/reservation data
});
```

## WebView Bridge Integration

The web app can interact with location features via postMessage:

### Request Location Permission
```javascript
window.postMessage({
  type: 'natively.location.requestPermission'
}, '*');

// Response:
{
  type: 'LOCATION_PERMISSION_RESPONSE',
  granted: true/false
}
```

### Get Current Location
```javascript
window.postMessage({
  type: 'natively.location.getCurrent'
}, '*');

// Response:
{
  type: 'LOCATION_CURRENT_RESPONSE',
  location: {
    latitude: number,
    longitude: number,
    altitude: number,
    accuracy: number
  }
}
```

### Add Geofence
```javascript
window.postMessage({
  type: 'natively.geofence.add',
  store: {
    id: 'store-123',
    name: 'Costco',
    latitude: 37.7749,
    longitude: -122.4194,
    radius: 100,
    listId: 'list-456',
    listName: 'Weekly Groceries',
    reservationNumber: 'RES-789'
  }
}, '*');

// Response:
{
  type: 'GEOFENCE_ADD_RESPONSE',
  success: true,
  storeId: 'store-123'
}
```

### Open Location Manager
```javascript
window.postMessage({
  type: 'natively.geofence.openManager'
}, '*');
```

## UI Components

### Floating Location Button
- Positioned at bottom-right of screen
- Blue circular button with location pin icon
- Badge shows number of monitored stores
- Tapping opens Location Manager

### Location Manager Modal
- Full-screen modal with sections:
  - **Status**: Shows geofencing status, permission status, store count
  - **Setup**: Permission request button (if not granted)
  - **Controls**: Start/Stop monitoring button
  - **Store Locations**: List of all monitored stores with details
  - **Add Form**: Form to add new store locations
  - **Info**: How-to guide

## Backend Integration (TODO)

The following backend endpoints are needed for full functionality:

### Lists
```
GET /api/lists/:id
- Returns list details with items
- Used when user taps notification

POST /api/lists
- Creates a new list
- Associates with store location

GET /api/lists
- Returns all user lists
- Used to populate location manager
```

### Reservations
```
GET /api/reservations/:number
- Returns reservation details
- Used when user taps notification

POST /api/reservations
- Creates a new reservation
- Associates with store location

GET /api/reservations
- Returns all user reservations
- Used to populate location manager
```

### Store Locations
```
GET /api/stores
- Returns known store locations
- Used to suggest stores to user

POST /api/user-locations
- Saves user's monitored locations to cloud
- Syncs across devices

GET /api/user-locations
- Retrieves user's monitored locations
- Restores on new device
```

## Testing

### iOS Testing
1. Build app with location permissions
2. Install on physical device (geofencing doesn't work in simulator)
3. Grant location permissions (Always)
4. Add a store location at current position
5. Start monitoring
6. Walk away from location (>100m)
7. Walk back to location
8. Notification should appear

### Android Testing
1. Build app with location permissions
2. Install on physical device
3. Grant location permissions (Allow all the time)
4. Add a store location at current position
5. Start monitoring
6. Walk away from location (>100m)
7. Walk back to location
8. Notification should appear

### Simulator Testing (Limited)
- Location permissions can be tested
- UI can be tested
- Geofencing will NOT trigger in simulator
- Use physical device for full testing

## Best Practices

### Battery Optimization
- Use appropriate radius (100-200m recommended)
- Don't monitor too many locations (< 20 recommended)
- Stop monitoring when not needed
- Use significant location changes, not continuous tracking

### User Experience
- Always explain why location permission is needed
- Show clear status indicators
- Allow easy enable/disable of monitoring
- Provide feedback when locations are added/removed
- Include helpful information in notifications

### Privacy
- Only request location when needed
- Explain data usage clearly
- Store location data locally (not sent to server without consent)
- Allow users to delete all location data
- Respect user's permission choices

## Troubleshooting

### Notifications Not Appearing
1. Check location permissions (must be "Always")
2. Verify geofencing is active
3. Ensure store locations are added
4. Check notification permissions
5. Verify background modes are enabled
6. Test on physical device (not simulator)

### Permission Issues
1. iOS: Check Info.plist has location usage descriptions
2. Android: Check AndroidManifest.xml has location permissions
3. Verify expo-location plugin is configured
4. Check app.json has correct permission strings

### Geofencing Not Triggering
1. Verify radius is appropriate (not too small)
2. Check device location services are enabled
3. Ensure app has background location permission
4. Test with larger radius (500m) first
5. Check device battery optimization settings

## Future Enhancements

### Planned Features
- [ ] Smart radius adjustment based on store size
- [ ] Time-based geofencing (only during store hours)
- [ ] Multiple lists per store
- [ ] Notification customization
- [ ] Geofence analytics
- [ ] Cloud sync of locations
- [ ] Suggested stores based on lists
- [ ] Route optimization for multiple stores

### Integration Opportunities
- Calendar integration for reservations
- Maps integration for directions
- Siri shortcuts for quick access
- Apple Wallet integration for loyalty cards
- Google Assistant integration

## Resources

- [Expo Location Documentation](https://docs.expo.dev/versions/latest/sdk/location/)
- [Expo Task Manager Documentation](https://docs.expo.dev/versions/latest/sdk/task-manager/)
- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [iOS Background Modes](https://developer.apple.com/documentation/bundleresources/information_property_list/uibackgroundmodes)
- [Android Background Location](https://developer.android.com/training/location/background)
