
import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import * as LocationHandler from '@/utils/locationHandler';
import { StoreLocation } from '@/utils/locationHandler';
import * as OfflineStorage from '@/utils/offlineStorage';

const GEOFENCING_TASK = 'SHOPWELL_GEOFENCING_TASK';
const STORE_LOCATIONS_KEY = '@shopwell/store_locations';

// Define the geofencing task
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

export function useGeofencing() {
  const [isActive, setIsActive] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [storeLocations, setStoreLocations] = useState<StoreLocation[]>([]);

  // Load store locations from storage
  const loadStoreLocations = useCallback(async () => {
    try {
      console.log('Loading store locations from storage...');
      const locations = await OfflineStorage.getItem<StoreLocation[]>(STORE_LOCATIONS_KEY);
      const loadedLocations = locations || [];
      console.log('Loaded store locations:', loadedLocations.length);
      setStoreLocations(loadedLocations);
      return loadedLocations;
    } catch (error) {
      console.error('Error loading store locations:', error);
      return [];
    }
  }, []);

  // Save store locations to storage
  const saveStoreLocations = useCallback(async (locations: StoreLocation[]) => {
    try {
      console.log('Saving store locations to storage:', locations.length);
      await OfflineStorage.setItem(STORE_LOCATIONS_KEY, locations);
      setStoreLocations(locations);
    } catch (error) {
      console.error('Error saving store locations:', error);
    }
  }, []);

  // Add a store location
  const addStoreLocation = useCallback(async (store: StoreLocation) => {
    try {
      console.log('Adding store location:', store.name);
      const currentLocations = await loadStoreLocations();
      const updatedLocations = [...currentLocations, store];
      await saveStoreLocations(updatedLocations);
      
      // Restart geofencing with updated locations
      if (hasPermission && isActive) {
        await LocationHandler.stopGeofencing();
        await LocationHandler.startGeofencing(updatedLocations);
      }
    } catch (error) {
      console.error('Error adding store location:', error);
    }
  }, [hasPermission, isActive, loadStoreLocations, saveStoreLocations]);

  // Remove a store location
  const removeStoreLocation = useCallback(async (storeId: string) => {
    try {
      console.log('Removing store location:', storeId);
      const currentLocations = await loadStoreLocations();
      const updatedLocations = currentLocations.filter(s => s.id !== storeId);
      await saveStoreLocations(updatedLocations);
      
      // Restart geofencing with updated locations
      if (hasPermission && isActive) {
        await LocationHandler.stopGeofencing();
        if (updatedLocations.length > 0) {
          await LocationHandler.startGeofencing(updatedLocations);
        }
      }
    } catch (error) {
      console.error('Error removing store location:', error);
    }
  }, [hasPermission, isActive, loadStoreLocations, saveStoreLocations]);

  // Start geofencing
  const startGeofencing = useCallback(async () => {
    try {
      console.log('Starting geofencing...');
      
      // Check permission
      const permission = await LocationHandler.hasLocationPermission();
      if (!permission) {
        console.log('Requesting location permission...');
        const granted = await LocationHandler.requestLocationPermission();
        if (!granted) {
          console.warn('Location permission not granted');
          return false;
        }
      }

      setHasPermission(true);

      // Load store locations
      const locations = await loadStoreLocations();
      
      if (locations.length === 0) {
        console.log('No store locations to monitor');
        return false;
      }

      // Start geofencing
      const started = await LocationHandler.startGeofencing(locations);
      setIsActive(started);
      return started;
    } catch (error) {
      console.error('Error starting geofencing:', error);
      return false;
    }
  }, [loadStoreLocations]);

  // Stop geofencing
  const stopGeofencing = useCallback(async () => {
    try {
      console.log('Stopping geofencing...');
      await LocationHandler.stopGeofencing();
      setIsActive(false);
    } catch (error) {
      console.error('Error stopping geofencing:', error);
    }
  }, []);

  // Check geofencing status on mount
  useEffect(() => {
    if (Platform.OS === 'web') {
      console.log('Geofencing not supported on web');
      return;
    }

    async function checkStatus() {
      const permission = await LocationHandler.hasLocationPermission();
      setHasPermission(permission);

      const active = await LocationHandler.isGeofencingActive();
      setIsActive(active);

      await loadStoreLocations();
    }

    checkStatus();
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
