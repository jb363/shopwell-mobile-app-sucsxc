
import { useState } from 'react';

export type TrackingStatus = 'undetermined' | 'restricted' | 'denied' | 'authorized' | 'unavailable';

export function useTrackingPermission() {
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>('undetermined');
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);

  // DO NOT check permission automatically on mount
  // This prevents crashes on iOS 26.3+ where early permission checks fail
  // Permission will be checked only when user explicitly requests it

  const checkTrackingPermission = async (): Promise<TrackingStatus> => {
    try {
      console.log('Checking tracking permission status...');
      
      // Dynamically import to avoid early initialization
      const TrackingTransparency = await import('expo-tracking-transparency');
      const { status: currentStatus } = await TrackingTransparency.getTrackingPermissionsAsync();
      console.log('Current tracking status:', currentStatus);
      
      setTrackingStatus(currentStatus);
      return currentStatus;
    } catch (error) {
      console.error('Error checking tracking permission:', error);
      setTrackingStatus('unavailable');
      return 'unavailable';
    }
  };

  const requestTrackingPermission = async (): Promise<boolean> => {
    try {
      console.log('Requesting tracking permission from user...');
      
      // Dynamically import to avoid early initialization
      const TrackingTransparency = await import('expo-tracking-transparency');
      const { status: currentStatus } = await TrackingTransparency.getTrackingPermissionsAsync();
      
      if (currentStatus === 'undetermined') {
        const { status: newStatus } = await TrackingTransparency.requestTrackingPermissionsAsync();
        console.log('User responded with tracking permission:', newStatus);
        setTrackingStatus(newStatus);
        setHasRequestedPermission(true);
        return newStatus === 'authorized';
      } else {
        setTrackingStatus(currentStatus);
        return currentStatus === 'authorized';
      }
    } catch (error) {
      console.error('Error requesting tracking permission:', error);
      setTrackingStatus('unavailable');
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
export async function getTrackingStatus(): Promise<TrackingStatus> {
  try {
    console.log('[Tracking] Standalone: Getting tracking status...');
    
    // Check if module is available
    try {
      // Dynamically import to avoid early initialization
      const TrackingTransparency = await import('expo-tracking-transparency');
      
      if (!TrackingTransparency || !TrackingTransparency.getTrackingPermissionsAsync) {
        console.warn('[Tracking] Tracking transparency module not available');
        return 'unavailable';
      }
      
      const { status } = await TrackingTransparency.getTrackingPermissionsAsync();
      console.log('[Tracking] Standalone: Current tracking status:', status);
      return status;
    } catch (importError) {
      console.error('[Tracking] Failed to import tracking transparency module:', importError);
      return 'unavailable';
    }
  } catch (error) {
    console.error('[Tracking] Standalone: Error getting tracking status:', error);
    return 'unavailable';
  }
}

// Export standalone function for use in message handlers
export async function requestTrackingPermission(): Promise<boolean> {
  try {
    console.log('[Tracking] Standalone: Requesting tracking permission from user...');
    
    // Check if module is available
    try {
      // Dynamically import to avoid early initialization
      const TrackingTransparency = await import('expo-tracking-transparency');
      
      if (!TrackingTransparency || !TrackingTransparency.requestTrackingPermissionsAsync) {
        console.warn('[Tracking] Tracking transparency module not available');
        return false;
      }
      
      const { status: currentStatus } = await TrackingTransparency.getTrackingPermissionsAsync();
      
      if (currentStatus === 'undetermined') {
        const { status: newStatus } = await TrackingTransparency.requestTrackingPermissionsAsync();
        console.log('[Tracking] Standalone: User responded with tracking permission:', newStatus);
        return newStatus === 'authorized';
      } else {
        return currentStatus === 'authorized';
      }
    } catch (importError) {
      console.error('[Tracking] Failed to import tracking transparency module:', importError);
      return false;
    }
  } catch (error) {
    console.error('[Tracking] Standalone: Error requesting tracking permission:', error);
    return false;
  }
}
