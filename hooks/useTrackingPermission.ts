
import { useState } from 'react';

// Base tracking permission hook for non-iOS platforms
// iOS uses useTrackingPermission.ios.ts
export function useTrackingPermission() {
  const [trackingStatus] = useState<string>('not-available');
  const [hasRequestedPermission] = useState(false);

  const checkTrackingPermission = async () => {
    console.log('Tracking permission not available on this platform');
    return 'not-available';
  };

  const requestTrackingPermission = async () => {
    console.log('Tracking permission not available on this platform');
    return false;
  };

  return {
    trackingStatus,
    hasRequestedPermission,
    checkTrackingPermission,
    requestTrackingPermission,
  };
}

// Export standalone function for consistency
export async function requestTrackingPermission() {
  console.log('Tracking permission not available on this platform');
  return false;
}
