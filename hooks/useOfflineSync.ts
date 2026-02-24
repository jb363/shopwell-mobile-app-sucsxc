
import { useEffect, useState, useCallback } from 'react';
import { useNetworkState } from 'expo-network';
import { processOfflineQueue, getOfflineQueue } from '@/utils/offlineStorage';

export function useOfflineSync() {
  const networkState = useNetworkState();
  const [isSyncing, setIsSyncing] = useState(false);
  const [queueSize, setQueueSize] = useState(0);

  const updateQueueSize = useCallback(async () => {
    const queue = await getOfflineQueue();
    setQueueSize(queue.length);
  }, []);

  const syncOfflineData = useCallback(async () => {
    if (isSyncing) {
      console.log('Sync already in progress');
      return;
    }

    setIsSyncing(true);
    try {
      console.log('Starting offline sync...');
      await processOfflineQueue();
      await updateQueueSize();
      console.log('Offline sync completed');
    } catch (error) {
      console.error('Error syncing offline data:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, updateQueueSize]);

  useEffect(() => {
    updateQueueSize();
  }, [updateQueueSize]);

  useEffect(() => {
    if (networkState.isConnected && networkState.isInternetReachable && queueSize > 0) {
      console.log('Network connected, syncing offline queue...');
      syncOfflineData();
    }
  }, [networkState.isConnected, networkState.isInternetReachable, queueSize, syncOfflineData]);

  const manualSync = useCallback(async () => {
    if (!networkState.isConnected) {
      console.warn('Cannot sync: No network connection');
      return false;
    }
    await syncOfflineData();
    return true;
  }, [networkState.isConnected, syncOfflineData]);

  return {
    isSyncing,
    queueSize,
    isOnline: networkState.isConnected && networkState.isInternetReachable,
    manualSync,
  };
}
