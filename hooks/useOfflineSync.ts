
import { useEffect, useState } from 'react';
import { useNetworkState } from 'expo-network';
import { processOfflineQueue, getOfflineQueue } from '@/utils/offlineStorage';

export function useOfflineSync() {
  const networkState = useNetworkState();
  const [isSyncing, setIsSyncing] = useState(false);
  const [queueSize, setQueueSize] = useState(0);

  useEffect(() => {
    updateQueueSize();
  }, []);

  useEffect(() => {
    if (networkState.isConnected && networkState.isInternetReachable && queueSize > 0) {
      console.log('Network connected, syncing offline queue...');
      syncOfflineData();
    }
  }, [networkState.isConnected, networkState.isInternetReachable, queueSize]);

  const updateQueueSize = async () => {
    const queue = await getOfflineQueue();
    setQueueSize(queue.length);
  };

  const syncOfflineData = async () => {
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
  };

  const manualSync = async () => {
    if (!networkState.isConnected) {
      console.warn('Cannot sync: No network connection');
      return false;
    }
    await syncOfflineData();
    return true;
  };

  return {
    isSyncing,
    queueSize,
    isOnline: networkState.isConnected && networkState.isInternetReachable,
    manualSync,
  };
}
