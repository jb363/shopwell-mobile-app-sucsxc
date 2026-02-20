
import { useEffect, useState } from 'react';
import * as TrackingTransparency from 'expo-tracking-transparency';
import { Platform } from 'react-native';

export function useTrackingPermission() {
  const [trackingStatus, setTrackingStatus] = useState<string>('unknown');
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);

  useEffect(() => {
    // Only request on iOS 14.5+
    if (Platform.OS !== 'ios') {
      console.log('Tracking permission not needed on', Platform.OS);
      setTrackingStatus('not-applicable');
      return;
    }

    requestTrackingPermission();
  }, []);

  const requestTrackingPermission = async () => {
    try {
      console.log('Checking tracking permission status...');
      
      // Get current status
      const { status: currentStatus } = await TrackingTransparency.getTrackingPermissionsAsync();
      console.log('Current tracking status:', currentStatus);
      
      setTrackingStatus(currentStatus);

      // If not determined yet, request permission
      if (currentStatus === 'undetermined') {
        console.log('Requesting tracking permission from user...');
        const { status: newStatus } = await TrackingTransparency.requestTrackingPermissionsAsync();
        console.log('User responded with tracking permission:', newStatus);
        setTrackingStatus(newStatus);
        setHasRequestedPermission(true);
      }
    } catch (error) {
      console.error('Error requesting tracking permission:', error);
      setTrackingStatus('error');
    }
  };

  return {
    trackingStatus,
    hasRequestedPermission,
    requestTrackingPermission,
  };
}
