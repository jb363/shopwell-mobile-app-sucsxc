// Cross-platform fallback — Android and Web do not require ATT.
// iOS uses hooks/useTrackingPermission.ios.ts instead.

export type TrackingStatus = 'granted' | 'unavailable';

export interface TrackingPermissionResult {
  status: TrackingStatus;
  isGranted: boolean;
}

export function useTrackingPermission(): TrackingPermissionResult {
  return { status: 'granted', isGranted: true };
}

export async function getTrackingStatus(): Promise<TrackingStatus> {
  return 'granted';
}

export async function requestTrackingPermission(): Promise<boolean> {
  return true;
}
