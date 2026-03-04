
import { useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import * as LocationHandler from '@/utils/locationHandler';
import { StoreLocation } from '@/utils/locationHandler';
import * as OfflineStorage from '@/utils/offlineStorage';

const GEOFENCING_TASK = 'SHOPWELL_GEOFENCING_TASK';
const STORE_LOCATIONS_KEY = '@shopwell/store_locations';

// Define the geofencing task (only on native platforms)
// This is defined at module level, not inside a hook or component
// Wrapped in try-catch to prevent crashes if native modules aren't ready
if (Platform.OS !== 'web') {
  try {
    // Add a delay to ensure TaskManager is fully initialized
    // Increased delay for older iOS devices
    setTimeout(() => {
      try {
        if (typeof TaskManager !== 'undefined' && TaskManager.defineTask) {
          TaskManager.defineTask(GEOFENCING_TASK, async ({ data, error }) => {
            if (error) {
              console.error('[Geofencing Task] Error:', error);
              return;
            }

            if (data) {
              const { eventType, region } = data as any;
              console.log('[Geofencing Task] Event:', eventType, 'Region:', region.identifier);

              if (eventType === 1) { // Enter event
                console.log('[Geofencing Task] User entered geofence:', region.identifier);
                
                try {
                  // Get store information from storage
                  const storeLocationsData = await OfflineStorage.getItem<StoreLocation[]>(STORE_LOCATIONS_KEY);
                  const storeLocations = storeLocationsData || [];
                  const store = storeLocations.find(s => s.id === region.identifier);

                  if (store) {
                    console.log('[Geofencing Task] Triggering notification for store:', store.name);
                    
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
                } catch (taskError) {
                  console.error('[Geofencing Task] Error processing geofence event:', taskError);
                }
              }
            }
          });
          console.log('[useGeofencing] Geofencing task defined successfully');
        } else {
          console.warn('[useGeofencing] TaskManager not available yet');
        }
      } catch (defineError) {
        console.error('[useGeofencing] Error defining geofencing task:', defineError);
      }
    }, 1500); // Increased delay for older iOS devices like iPhone X
  } catch (error) {
    console.error('[useGeofencing] Error in task definition setup:', error);
  }
}

export function useGeofencing() {
  // Simple state - no automatic initialization
  const [isActive, setIsActive] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [storeLocations, setStoreLocations] = useState<StoreLocation[]>([]);

  // Load store locations from storage (safe operation, no permissions needed)
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

  // Load store locations on mount (safe operation, no permissions needed)
  // Add a longer delay to ensure native modules are fully initialized on older devices
  useEffect(() => {
    let isMounted = true;
    
    const timer = setTimeout(() => {
      if (isMounted) {
        console.log('[useGeofencing] Loading store locations on mount...');
        loadStoreLocations().catch((error) => {
          console.error('[useGeofencing] Error loading store locations on mount:', error);
        });
      }
    }, 800); // Increased delay for older iOS devices
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [loadStoreLocations]);

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
      
      // Check if store already exists
      const existingIndex = currentLocations.findIndex(s => s.id === store.id);
      let updatedLocations;
      
      if (existingIndex >= 0) {
        // Update existing store
        updatedLocations = [...currentLocations];
        updatedLocations[existingIndex] = store;
        console.log('[useGeofencing] Updated existing store location');
      } else {
        // Add new store
        updatedLocations = [...currentLocations, store];
        console.log('[useGeofencing] Added new store location');
      }
      
      await saveStoreLocations(updatedLocations);
      
      // Restart geofencing with updated locations (only on native and if already active)
      if (Platform.OS !== 'web' && hasPermission && isActive) {
        console.log('[useGeofencing] Restarting geofencing with updated locations...');
        try {
          await LocationHandler.stopGeofencing();
          await LocationHandler.startGeofencing(updatedLocations);
        } catch (error) {
          console.error('[useGeofencing] Error restarting geofencing:', error);
        }
      }
      
      return true;
    } catch (error) {
      console.error('[useGeofencing] Error adding store location:', error);
      return false;
    }
  }, [hasPermission, isActive, loadStoreLocations, saveStoreLocations]);

  // Remove a store location
  const removeStoreLocation = useCallback(async (storeId: string) => {
    try {
      console.log('[useGeofencing] Removing store location:', storeId);
      const currentLocations = await loadStoreLocations();
      const updatedLocations = currentLocations.filter(s => s.id !== storeId);
      await saveStoreLocations(updatedLocations);
      
      // Restart geofencing with updated locations (only on native and if already active)
      if (Platform.OS !== 'web' && hasPermission && isActive) {
        console.log('[useGeofencing] Restarting geofencing with updated locations...');
        try {
          await LocationHandler.stopGeofencing();
          if (updatedLocations.length > 0) {
            await LocationHandler.startGeofencing(updatedLocations);
          } else {
            console.log('[useGeofencing] No locations left, geofencing stopped');
            setIsActive(false);
          }
        } catch (error) {
          console.error('[useGeofencing] Error restarting geofencing:', error);
        }
      }
      
      return true;
    } catch (error) {
      console.error('[useGeofencing] Error removing store location:', error);
      return false;
    }
  }, [hasPermission, isActive, loadStoreLocations, saveStoreLocations]);

  // Start geofencing - ONLY called when user explicitly requests it
  const startGeofencing = useCallback(async () => {
    try {
      console.log('[useGeofencing] Starting geofencing...');
      
      // On web, we just simulate it
      if (Platform.OS === 'web') {
        console.log('[useGeofencing] Web platform - simulating geofencing');
        setHasPermission(true);
        setIsActive(true);
        return true;
      }

      // Check permission (native only)
      console.log('[useGeofencing] Checking location permission...');
      try {
        const permission = await LocationHandler.hasLocationPermission();
        
        if (!permission) {
          console.log('[useGeofencing] No permission, requesting...');
          const granted = await LocationHandler.requestLocationPermission();
          if (!granted) {
            console.warn('[useGeofencing] Location permission not granted');
            setHasPermission(false);
            return false;
          }
        }

        setHasPermission(true);
      } catch (permError) {
        console.error('[useGeofencing] Error checking/requesting permission:', permError);
        setHasPermission(false);
        return false;
      }

      // Load store locations
      const locations = await loadStoreLocations();
      
      if (locations.length === 0) {
        console.log('[useGeofencing] No store locations to monitor');
        setIsActive(false);
        return false;
      }

      // Start geofencing
      console.log('[useGeofencing] Starting geofencing for', locations.length, 'locations...');
      try {
        const started = await LocationHandler.startGeofencing(locations);
        setIsActive(started);
        
        if (started) {
          console.log('[useGeofencing] ✅ Geofencing started successfully');
        } else {
          console.warn('[useGeofencing] ⚠️ Failed to start geofencing');
        }
        
        return started;
      } catch (startError) {
        console.error('[useGeofencing] Error starting geofencing:', startError);
        setIsActive(false);
        return false;
      }
    } catch (error) {
      console.error('[useGeofencing] Error in startGeofencing:', error);
      setIsActive(false);
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

      try {
        await LocationHandler.stopGeofencing();
        setIsActive(false);
        console.log('[useGeofencing] ✅ Geofencing stopped successfully');
      } catch (stopError) {
        console.error('[useGeofencing] Error stopping geofencing:', stopError);
      }
    } catch (error) {
      console.error('[useGeofencing] Error in stopGeofencing:', error);
    }
  }, []);

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
