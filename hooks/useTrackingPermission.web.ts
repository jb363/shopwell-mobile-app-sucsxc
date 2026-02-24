
import { useEffect, useState } from 'react';

// Web doesn't require App Tracking Transparency
// This is a no-op implementation for Web
export function useTrackingPermission() {
  const [trackingStatus, setTrackingStatus] = useState<string>('not-applicable');
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);

  useEffect(() => {
    console.log('Tracking permission not needed on Web');
    setTrackingStatus('not-applicable');
  }, []);

  const requestTrackingPermission = async () => {
    console.log('Tracking permission not applicable on Web');
    setTrackingStatus('not-applicable');
  };

  return {
    trackingStatus,
    hasRequestedPermission,
    requestTrackingPermission,
  };
}
