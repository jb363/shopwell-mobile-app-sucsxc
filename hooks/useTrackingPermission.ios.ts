
import { useEffect, useState } from 'react';
import * as TrackingTransparency from 'expo-tracking-transparency';

export function useTrackingPermission() {
  const [trackingStatus, setTrackingStatus] = useState<string>('unknown');
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);

  useEffect(() => {
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
