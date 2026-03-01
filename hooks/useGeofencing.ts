
import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import * as LocationHandler from '@/utils/locationHandler';
import { StoreLocation } from '@/utils/locationHandler';
import * as OfflineStorage from '@/utils/offlineStorage';

const GEOFENCING_TASK = 'SHOPWELL_GEOFENCING_TASK';
const STORE_LOCATIONS_KEY = '@shopwell/store_locations';

// Define the geofencing task (only on native platforms)
if (Platform.OS !== 'web') {
  TaskManager.defineTask(GEOFENCING_TASK, async ({ data, error }) => {
    if (error) {
      console.error('Geofencing task error:', error);
      return;
    }

    if (data) {
      const { eventType, region } = data as any;
      console.log('Geofencing event:', eventType, 'for region:', region.identifier);

      if (eventType === 1) { // Enter event
        console.log('User entered geofence:', region.identifier);
        
        // Get store information from storage
        const storeLocationsData = await OfflineStorage.getItem<StoreLocation[]>(STORE_LOCATIONS_KEY);
        const storeLocations = storeLocationsData || [];
        const store = storeLocations.find(s => s.id === region.identifier);

        if (store) {
          console.log('Triggering notification for store:', store.name);
          
          // Schedule notification
          await Notifications.scheduleNotificationAsync({
            content: {
              title: store.listName ? `📋 ${store.listName}` : `📍 Near ${store.name}`,
              body: store.listName 
                ? `You're near ${store.name}! Tap to view your list.`
                : store.reservationNumber
                ? `Reservation #${store.reservationNumber} - Tap to view details.`
                : `You're near ${store.name}`,
              data: {
                type: 'geofence',
                storeId: store.id,
                storeName: store.name,
                listId: store.listId,
                listName: store.listName,
                reservationNumber: store.reservationNumber,
              },
              sound: true,
              badge: 1,
            },
            trigger: null, // Immediate notification
          });
        }
      }
    }
  });
}

export function useGeofencing() {
  const [isActive, setIsActive] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [storeLocations, setStoreLocations] = useState<StoreLocation[]>([]);

  // Load store locations from storage
  const loadStoreLocations = useCallback(async () => {
    try {
      console.log('[useGeofencing] Loading store locations from storage...');
      const locations = await OfflineStorage.getItem<StoreLocation[]>(STORE_LOCATIONS_KEY);
      const loadedLocations = locations || [];
      console.log('[useGeofencing] Loaded store locations:', loadedLocations.length);
      setStoreLocations(loadedLocations);
      return loadedLocations;
    } catch (error) {
      console.error('[useGeofencing] Error loading store locations:', error);
      return [];
    }
  }, []);

  // Save store locations to storage
  const saveStoreLocations = useCallback(async (locations: StoreLocation[]) => {
    try {
      console.log('[useGeofencing] Saving store locations to storage:', locations.length);
      await OfflineStorage.setItem(STORE_LOCATIONS_KEY, locations);
      setStoreLocations(locations);
    } catch (error) {
      console.error('[useGeofencing] Error saving store locations:', error);
    }
  }, []);

  // Add a store location
  const addStoreLocation = useCallback(async (store: StoreLocation) => {
    try {
      console.log('[useGeofencing] Adding store location:', store.name);
      const currentLocations = await loadStoreLocations();
      const updatedLocations = [...currentLocations, store];
      await saveStoreLocations(updatedLocations);
      
      // Restart geofencing with updated locations (only on native)
      if (Platform.OS !== 'web' && hasPermission && isActive) {
        await LocationHandler.stopGeofencing();
        await LocationHandler.startGeofencing(updatedLocations);
      }
    } catch (error) {
      console.error('[useGeofencing] Error adding store location:', error);
    }
  }, [hasPermission, isActive, loadStoreLocations, saveStoreLocations]);

  // Remove a store location
  const removeStoreLocation = useCallback(async (storeId: string) => {
    try {
      console.log('[useGeofencing] Removing store location:', storeId);
      const currentLocations = await loadStoreLocations();
      const updatedLocations = currentLocations.filter(s => s.id !== storeId);
      await saveStoreLocations(updatedLocations);
      
      // Restart geofencing with updated locations (only on native)
      if (Platform.OS !== 'web' && hasPermission && isActive) {
        await LocationHandler.stopGeofencing();
        if (updatedLocations.length > 0) {
          await LocationHandler.startGeofencing(updatedLocations);
        }
      }
    } catch (error) {
      console.error('[useGeofencing] Error removing store location:', error);
    }
  }, [hasPermission, isActive, loadStoreLocations, saveStoreLocations]);

  // Start geofencing
  const startGeofencing = useCallback(async () => {
    try {
      console.log('[useGeofencing] Starting geofencing...');
      
      // On web, we just simulate it with localStorage
      if (Platform.OS === 'web') {
        console.log('[useGeofencing] Web platform - simulating geofencing with localStorage');
        setHasPermission(true);
        setIsActive(true);
        return true;
      }

      // Check permission (native only)
      const permission = await LocationHandler.hasLocationPermission();
      if (!permission) {
        console.log('[useGeofencing] Requesting location permission...');
        const granted = await LocationHandler.requestLocationPermission();
        if (!granted) {
          console.warn('[useGeofencing] Location permission not granted');
          return false;
        }
      }

      setHasPermission(true);

      // Load store locations
      const locations = await loadStoreLocations();
      
      if (locations.length === 0) {
        console.log('[useGeofencing] No store locations to monitor');
        return false;
      }

      // Start geofencing
      const started = await LocationHandler.startGeofencing(locations);
      setIsActive(started);
      return started;
    } catch (error) {
      console.error('[useGeofencing] Error starting geofencing:', error);
      return false;
    }
  }, [loadStoreLocations]);

  // Stop geofencing
  const stopGeofencing = useCallback(async () => {
    try {
      console.log('[useGeofencing] Stopping geofencing...');
      
      // On web, just update state
      if (Platform.OS === 'web') {
        console.log('[useGeofencing] Web platform - stopping simulated geofencing');
        setIsActive(false);
        return;
      }

      await LocationHandler.stopGeofencing();
      setIsActive(false);
    } catch (error) {
      console.error('[useGeofencing] Error stopping geofencing:', error);
    }
  }, []);

  // CRITICAL FIX: Only load store locations on mount, DO NOT check permissions or status
  // This prevents crashes on Android 16 Beta where early permission checks fail
  useEffect(() => {
    let isMounted = true;
    
    console.log('[useGeofencing] Hook mounted - platform:', Platform.OS);
    
    if (Platform.OS === 'web') {
      console.log('[useGeofencing] Web platform - geofencing available via localStorage');
      if (isMounted) {
        setHasPermission(true); // Web always has "permission"
      }
    }

    // ONLY load store locations (safe operation, no permissions needed)
    // Do NOT check permissions or geofencing status on mount
    loadStoreLocations().catch(error => {
      console.error('[useGeofencing] Error loading store locations on mount:', error);
    });

    console.log('[useGeofencing] Initial mount complete - permissions and status will be checked only when explicitly requested');

    return () => {
      isMounted = false;
    };
  }, [loadStoreLocations]);

  return {
    isActive,
    hasPermission,
    storeLocations,
    startGeofencing,
    stopGeofencing,
    addStoreLocation,
    removeStoreLocation,
    loadStoreLocations,
  };
}
