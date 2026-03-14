import { useEffect, useState } from 'react';
import {
  requestTrackingPermissionsAsync,
  getTrackingPermissionsAsync,
} from 'expo-tracking-transparency';

export type TrackingStatus = 'undetermined' | 'restricted' | 'denied' | 'granted' | 'unavailable';

export interface TrackingPermissionResult {
  status: TrackingStatus;
  isGranted: boolean;
}

export function useTrackingPermission(): TrackingPermissionResult {
  const [status, setStatus] = useState<TrackingStatus>('undetermined');

  useEffect(() => {
    let cancelled = false;

    async function initTracking() {
      try {
        console.log('[ATT] Checking current tracking permission status...');
        const { status: currentStatus } = await getTrackingPermissionsAsync();
        console.log('[ATT] Current tracking status:', currentStatus);

        if (cancelled) return;

        if (currentStatus === 'undetermined') {
          console.log('[ATT] Status undetermined — requesting ATT permission from user...');
          const { status: requestedStatus } = await requestTrackingPermissionsAsync();
          console.log('[ATT] User responded with tracking permission:', requestedStatus);
          if (!cancelled) setStatus(requestedStatus as TrackingStatus);
        } else {
          setStatus(currentStatus as TrackingStatus);
        }
      } catch (error) {
        console.error('[ATT] Error during tracking permission init:', error);
        if (!cancelled) setStatus('unavailable');
      }
    }

    initTracking();

    return () => {
      cancelled = true;
    };
  }, []);

  const isGranted = status === 'granted';
  return { status, isGranted };
}

// Standalone helpers kept for backward compatibility with message handlers

export async function getTrackingStatus(): Promise<TrackingStatus> {
  try {
    console.log('[ATT] Standalone: getting tracking status...');
    const { status } = await getTrackingPermissionsAsync();
    console.log('[ATT] Standalone: current status:', status);
    return status as TrackingStatus;
  } catch (error) {
    console.error('[ATT] Standalone: error getting tracking status:', error);
    return 'unavailable';
  }
}

export async function requestTrackingPermission(): Promise<boolean> {
  try {
    console.log('[ATT] Standalone: requesting tracking permission...');
    const { status: current } = await getTrackingPermissionsAsync();

    if (current === 'undetermined') {
      const { status: next } = await requestTrackingPermissionsAsync();
      console.log('[ATT] Standalone: user responded:', next);
      return next === 'granted';
    }

    console.log('[ATT] Standalone: already determined:', current);
    return current === 'granted';
  } catch (error) {
    console.error('[ATT] Standalone: error requesting tracking permission:', error);
    return false;
  }
}
