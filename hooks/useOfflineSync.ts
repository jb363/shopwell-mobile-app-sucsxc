
import { useEffect, useState, useCallback } from 'react';
import { useNetworkState } from 'expo-network';
import { processOfflineQueue, getOfflineQueue } from '@/utils/offlineStorage';

export function useOfflineSync() {
  const networkState = useNetworkState();
  const [isSyncing, setIsSyncing] = useState(false);
  const [queueSize, setQueueSize] = useState(0);

  const updateQueueSize = useCallback(async () => {
    try {
      const queue = await getOfflineQueue();
      setQueueSize(queue.length);
    } catch (error) {
      console.error('[useOfflineSync] Error updating queue size:', error);
      setQueueSize(0);
    }
  }, []);

  const syncOfflineData = useCallback(async () => {
    if (isSyncing) {
      console.log('[useOfflineSync] Sync already in progress');
      return;
    }

    setIsSyncing(true);
    try {
      console.log('[useOfflineSync] Starting offline sync...');
      await processOfflineQueue();
      await updateQueueSize();
      console.log('[useOfflineSync] Offline sync completed');
    } catch (error) {
      console.error('[useOfflineSync] Error syncing offline data:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, updateQueueSize]);

  useEffect(() => {
    let isMounted = true;
    
    // Add delay to ensure storage is ready
    const timer = setTimeout(() => {
      if (isMounted) {
        updateQueueSize().catch((error) => {
          console.error('[useOfflineSync] Error in initial queue size update:', error);
        });
      }
    }, 300);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [updateQueueSize]);

  useEffect(() => {
    let isMounted = true;
    
    if (networkState.isConnected && networkState.isInternetReachable && queueSize > 0) {
      console.log('[useOfflineSync] Network connected, syncing offline queue...');
      
      // Add delay before syncing
      const timer = setTimeout(() => {
        if (isMounted) {
          syncOfflineData().catch((error) => {
            console.error('[useOfflineSync] Error in auto-sync:', error);
          });
        }
      }, 500);
      
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
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
