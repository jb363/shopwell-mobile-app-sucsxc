
import { useState } from 'react';
import * as TrackingTransparency from 'expo-tracking-transparency';

export function useTrackingPermission() {
  const [trackingStatus, setTrackingStatus] = useState<string>('unknown');
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);

  // DO NOT check permission automatically on mount
  // This prevents crashes on iOS 26.3+ where early permission checks fail
  // Permission will be checked only when user explicitly requests it

  const checkTrackingPermission = async () => {
    try {
      console.log('Checking tracking permission status...');
      
      // Get current status
      const { status: currentStatus } = await TrackingTransparency.getTrackingPermissionsAsync();
      console.log('Current tracking status:', currentStatus);
      
      setTrackingStatus(currentStatus);
      return currentStatus;
    } catch (error) {
      console.error('Error checking tracking permission:', error);
      setTrackingStatus('denied');
      return 'denied';
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
    checkTrackingPermission,
    requestTrackingPermission,
  };
}

// Export standalone function for use in message handlers
export async function requestTrackingPermission() {
  try {
    console.log('Standalone: Requesting tracking permission from user...');
    
    const { status: currentStatus } = await TrackingTransparency.getTrackingPermissionsAsync();
    
    if (currentStatus === 'undetermined') {
      const { status: newStatus } = await TrackingTransparency.requestTrackingPermissionsAsync();
      console.log('Standalone: User responded with tracking permission:', newStatus);
      return newStatus === 'granted';
    } else {
      return currentStatus === 'granted';
    }
  } catch (error) {
    console.error('Standalone: Error requesting tracking permission:', error);
    return false;
  }
}
