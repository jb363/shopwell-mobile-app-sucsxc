
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

const GEOFENCING_TASK = 'SHOPWELL_GEOFENCING_TASK';

export interface StoreLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
  listId?: string;
  listName?: string;
  listImage?: string;
  reservationNumber?: string;
}

// Request location permissions - ONLY called when user explicitly requests it
export async function requestLocationPermission(): Promise<boolean> {
  try {
    console.log('[locationHandler] Requesting location permission...');
    
    // Request foreground permission first
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    
    if (foregroundStatus !== 'granted') {
      console.warn('[locationHandler] Foreground location permission not granted');
      return false;
    }

    console.log('[locationHandler] ✅ Foreground permission granted');

    // Request background location permission for geofencing
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    
    if (backgroundStatus !== 'granted') {
      console.warn('[locationHandler] Background location permission not granted');
      return false;
    }

    console.log('[locationHandler] ✅ Background permission granted');
    return true;
  } catch (error) {
    console.error('[locationHandler] Error requesting location permission:', error);
    return false;
  }
}

// Check if location permissions are granted - ONLY called when explicitly needed
export async function hasLocationPermission(): Promise<boolean> {
  try {
    console.log('[locationHandler] Checking location permission...');
    
    // Check foreground permission
    const foregroundResult = await Location.getForegroundPermissionsAsync();
    const foregroundStatus = foregroundResult.status;
    console.log('[locationHandler] Foreground status:', foregroundStatus);
    
    if (foregroundStatus !== 'granted') {
      return false;
    }
    
    // Check background permission
    const backgroundResult = await Location.getBackgroundPermissionsAsync();
    const backgroundStatus = backgroundResult.status;
    console.log('[locationHandler] Background status:', backgroundStatus);
    
    const hasPermission = foregroundStatus === 'granted' && backgroundStatus === 'granted';
    console.log('[locationHandler] Final permission status:', hasPermission);
    return hasPermission;
  } catch (error) {
    console.error('[locationHandler] Error checking location permission:', error);
    return false;
  }
}

// Get current location
export async function getCurrentLocation(): Promise<Location.LocationObject | null> {
  try {
    console.log('[locationHandler] Getting current location...');
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    console.log('[locationHandler] Current location:', location.coords);
    return location;
  } catch (error) {
    console.error('[locationHandler] Error getting current location:', error);
    return null;
  }
}

// Start geofencing for store locations
export async function startGeofencing(stores: StoreLocation[]): Promise<boolean> {
  try {
    console.log('[locationHandler] Starting geofencing for', stores.length, 'stores...');
    
    if (stores.length === 0) {
      console.log('[locationHandler] No stores to monitor');
      return false;
    }

    // Check if task is defined
    const isTaskDefined = await TaskManager.isTaskDefined(GEOFENCING_TASK);
    if (!isTaskDefined) {
      console.warn('[locationHandler] Geofencing task not defined - it should be defined at module level in useGeofencing.ts');
      return false;
    }

    // Convert stores to geofencing regions
    const regions = stores.map(store => ({
      identifier: store.id,
      latitude: store.latitude,
      longitude: store.longitude,
      radius: store.radius,
      notifyOnEnter: true,
      notifyOnExit: false,
    }));

    console.log('[locationHandler] Starting geofencing with regions:', regions.map(r => r.identifier));
    await Location.startGeofencingAsync(GEOFENCING_TASK, regions);
    console.log('[locationHandler] ✅ Geofencing started successfully');
    return true;
  } catch (error) {
    console.error('[locationHandler] Error starting geofencing:', error);
    return false;
  }
}

// Stop geofencing
export async function stopGeofencing(): Promise<void> {
  try {
    console.log('[locationHandler] Stopping geofencing...');
    const hasStarted = await Location.hasStartedGeofencingAsync(GEOFENCING_TASK);
    
    if (hasStarted) {
      await Location.stopGeofencingAsync(GEOFENCING_TASK);
      console.log('[locationHandler] ✅ Geofencing stopped');
    } else {
      console.log('[locationHandler] Geofencing was not running');
    }
  } catch (error) {
    console.error('[locationHandler] Error stopping geofencing:', error);
  }
}

// Check if geofencing is active - ONLY called when explicitly needed
export async function isGeofencingActive(): Promise<boolean> {
  try {
    console.log('[locationHandler] Checking if geofencing is active...');
    
    // First check if the task is defined
    const isTaskDefined = await TaskManager.isTaskDefined(GEOFENCING_TASK);
    if (!isTaskDefined) {
      console.log('[locationHandler] Geofencing task not defined');
      return false;
    }
    
    const isActive = await Location.hasStartedGeofencingAsync(GEOFENCING_TASK);
    console.log('[locationHandler] Geofencing active:', isActive);
    return isActive;
  } catch (error) {
    console.error('[locationHandler] Error checking geofencing status:', error);
    return false;
  }
}

// Calculate distance between two coordinates (in meters)
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;
  return distance;
}

// Get geofencing task name (for use in TaskManager)
export function getGeofencingTaskName(): string {
  return GEOFENCING_TASK;
}
