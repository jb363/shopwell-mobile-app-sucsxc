
import { useEffect, useState } from 'react';
import * as TrackingTransparency from 'expo-tracking-transparency';

export function useTrackingPermission() {
  const [trackingStatus, setTrackingStatus] = useState<string>('unknown');
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);

  useEffect(() => {
    // Delay the permission check to ensure app is fully initialized
    const timer = setTimeout(() => {
      checkTrackingPermission();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const checkTrackingPermission = async () => {
    try {
      console.log('Checking tracking permission status...');
      
      // Get current status
      const { status: currentStatus } = await TrackingTransparency.getTrackingPermissionsAsync();
      console.log('Current tracking status:', currentStatus);
      
      setTrackingStatus(currentStatus);

      // Don't automatically request permission - let the user trigger it
      // This prevents crashes on iOS 26.3+ where automatic permission requests can fail
      if (currentStatus === 'undetermined') {
        console.log('Tracking permission not determined yet - waiting for user action');
      }
    } catch (error) {
      console.error('Error checking tracking permission:', error);
      setTrackingStatus('denied');
    }
  };

  const requestTrackingPermission = async () => {
    try {
      console.log('Requesting tracking permission from user...');
      
      // Get current status first
      const { status: currentStatus } = await TrackingTransparency.getTrackingPermissionsAsync();
      
      if (currentStatus === 'undetermined') {
        const { status: newStatus } = await TrackingTransparency.requestTrackingPermissionsAsync();
        console.log('User responded with tracking permission:', newStatus);
        setTrackingStatus(newStatus);
        setHasRequestedPermission(true);
        return newStatus === 'granted';
      } else {
        setTrackingStatus(currentStatus);
        return currentStatus === 'granted';
      }
    } catch (error) {
      console.error('Error requesting tracking permission:', error);
      setTrackingStatus('denied');
      return false;
    }
  };

  return {
    trackingStatus,
    hasRequestedPermission,
    requestTrackingPermission,
  };
}
