// Android does not require App Tracking Transparency — always return granted.

export type TrackingStatus = 'granted';

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
