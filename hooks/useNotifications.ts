
import { Platform, Alert } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import Constants from 'expo-constants';

// Conditional import for expo-notifications
let Notifications: any;
try {
  Notifications = require('expo-notifications');
  
  // CRITICAL: setNotificationHandler MUST be called at module level (outside any component).
  // Without this, iOS will not show alerts for foreground notifications.
  if (Notifications && Notifications.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async (notification: any) => {
        console.log('[NotificationHandler] Handling notification:', notification.request.identifier);
        console.log('[NotificationHandler] Content:', notification.request.content);
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        };
      },
    });
    console.log('[useNotifications] ✅ Notification handler set at module level');
  }
} catch (error) {
  console.warn('[useNotifications] expo-notifications not available:', error);
}

// Derive projectId and experienceId from app config (required for iOS push tokens)
const PROJECT_ID: string =
  Constants.expoConfig?.extra?.eas?.projectId ?? 'e7626989-42f0-4892-8690-78e62394d076';
const EXPERIENCE_ID: string =
  `@${Constants.expoConfig?.owner ?? 'natively'}/${Constants.expoConfig?.slug ?? 'shopwell-mobile-app-sucsxc'}`;

// Handle notification data and deep linking
function handleNotificationData(data: any) {
  console.log('[useNotifications] Handling notification data:', data);
  if (!data) return;

  if (data.type === 'geofence') {
    console.log('[useNotifications] Geofence notification:', data.storeName);
    if (data.listId) {
      console.log('[useNotifications] Navigating to list:', data.listId);
    } else if (data.reservationNumber) {
      console.log('[useNotifications] Navigating to reservation:', data.reservationNumber);
    }
  }

  if (data.url) {
    console.log('[useNotifications] Opening URL from notification:', data.url);
  }
}

// Helper: request permission then get push token
async function getTokenAfterPermission(
  setExpoPushToken: (t: string) => void,
  setPermissionStatus: (s: 'granted' | 'denied' | 'undetermined') => void,
): Promise<void> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('[useNotifications] Existing permission status:', existingStatus);

    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      console.log('[useNotifications] 📱 Requesting notification permissions...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('[useNotifications] Permission result:', finalStatus);
    }

    const mapped: 'granted' | 'denied' | 'undetermined' =
      finalStatus === 'granted' ? 'granted' : finalStatus === 'denied' ? 'denied' : 'undetermined';
    setPermissionStatus(mapped);

    if (finalStatus !== 'granted') {
      console.warn('[useNotifications] ⚠️ Notification permission not granted:', finalStatus);
      return;
    }

    console.log('[useNotifications] ✅ Permission granted — fetching push token...');
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: PROJECT_ID,
      experienceId: EXPERIENCE_ID,
    });
    console.log('[useNotifications] 📲 Push token:', tokenData.data);
    setExpoPushToken(tokenData.data);
  } catch (error) {
    console.error('[useNotifications] ❌ Error in getTokenAfterPermission:', error);
  }
}

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string>();
  const [notification, setNotification] = useState<any>();
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    let isMounted = true;

    if (Platform.OS === 'web') {
      console.log('[useNotifications] Notifications are not supported on web');
      return;
    }

    if (!Notifications) {
      console.warn('[useNotifications] Notifications module not available');
      return;
    }

    console.log('[useNotifications] 🔔 Initializing notification system...');

    // Request permissions and get token immediately (no artificial delay)
    getTokenAfterPermission(
      (token) => { if (isMounted) setExpoPushToken(token); },
      (status) => { if (isMounted) setPermissionStatus(status); },
    ).catch((err) => console.error('[useNotifications] ❌ Unhandled error in init:', err));

    // Check for cold-start notification tap
    Notifications.getLastNotificationResponseAsync()
      .then((response: any) => {
        if (!isMounted || !response) return;
        console.log('[useNotifications] 🚀 App opened from notification:', response);
        handleNotificationData(response.notification.request.content.data);
      })
      .catch((error: any) => {
        console.error('[useNotifications] ❌ Error checking last notification:', error);
      });

    // Register listeners immediately — no setTimeout
    try {
      notificationListener.current = Notifications.addNotificationReceivedListener((notif: any) => {
        console.log('[useNotifications] 📬 Notification received in foreground:', notif.request.identifier);
        if (isMounted) setNotification(notif);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener((response: any) => {
        console.log('[useNotifications] 👆 User tapped notification:', response.notification.request.identifier);
        handleNotificationData(response.notification.request.content.data);
      });

      console.log('[useNotifications] ✅ Notification listeners registered');
    } catch (error) {
      console.error('[useNotifications] ❌ Error setting up notification listeners:', error);
    }

    return () => {
      isMounted = false;
      try {
        notificationListener.current?.remove();
        responseListener.current?.remove();
        console.log('[useNotifications] 🧹 Notification listeners cleaned up');
      } catch (error) {
        console.error('[useNotifications] ❌ Error removing notification listeners:', error);
      }
    };
  }, []);

  const schedulePushNotification = async () => {
    if (Platform.OS === 'web' || !Notifications) {
      console.warn('[useNotifications] Push notifications not supported');
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "ShopWell.ai Notification! 📬",
          body: 'Here is the notification body',
          data: { data: 'goes here' },
        },
        trigger: { seconds: 1 },
      });
      console.log('[useNotifications] ✅ Notification scheduled');
    } catch (error) {
      console.error('[useNotifications] ❌ Error scheduling notification:', error);
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'web' || !Notifications) {
      console.log('[useNotifications] Push notifications not available');
      return false;
    }

    try {
      console.log('[useNotifications] 🔔 Requesting notification permissions from user');

      const { status: currentStatus } = await Notifications.getPermissionsAsync();
      console.log('[useNotifications] Current status before request:', currentStatus);

      if (currentStatus === 'denied') {
        console.log('[useNotifications] ⚠️ Permission previously denied');
        Alert.alert(
          'Notifications Disabled',
          'Notifications are currently disabled. Please enable them in your device settings to receive alerts.',
          [{ text: 'OK' }]
        );
        return false;
      }

      let finalStatus = currentStatus;
      if (currentStatus !== 'granted') {
        console.log('[useNotifications] 📱 Showing permission dialog...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('[useNotifications] Permission result:', finalStatus);
      }

      const granted = finalStatus === 'granted';
      setPermissionStatus(granted ? 'granted' : 'denied');

      if (granted) {
        console.log('[useNotifications] ✅ Permission granted, getting token');
        try {
          const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: PROJECT_ID,
            experienceId: EXPERIENCE_ID,
          });
          setExpoPushToken(tokenData.data);
          console.log('[useNotifications] 📲 Push token:', tokenData.data);
        } catch (tokenError) {
          console.error('[useNotifications] ❌ Error getting push token:', tokenError);
        }
        return true;
      } else {
        console.warn('[useNotifications] ❌ Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('[useNotifications] ❌ Error requesting permissions:', error);
      return false;
    }
  };

  return { 
    schedulePushNotification, 
    expoPushToken, 
    notification,
    permissionStatus,
    requestPermissions
  };
}

export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  if (Platform.OS === 'web' || !Notifications) {
    console.log('[registerForPushNotifications] Push notifications not available');
    return undefined;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      console.log('[registerForPushNotifications] Requesting notification permissions from user');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[registerForPushNotifications] Failed to get push token — permission not granted');
      return undefined;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: PROJECT_ID,
      experienceId: EXPERIENCE_ID,
    });
    console.log('[registerForPushNotifications] Expo push token:', tokenData.data);
    return tokenData.data;
  } catch (error) {
    console.error('[registerForPushNotifications] Error:', error);
    return undefined;
  }
}

// Android notification channel setup
if (Platform.OS === 'android' && Notifications) {
  try {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      showBadge: true,
      enableVibrate: true,
      enableLights: true,
    });
    
    // Create a channel for location-based notifications
    Notifications.setNotificationChannelAsync('location', {
      name: 'Location Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#007aff',
      description: 'Notifications when you are near stores with active lists',
      showBadge: true,
      enableVibrate: true,
      enableLights: true,
    });
    
    console.log('[useNotifications] ✅ Android notification channels configured');
  } catch (error) {
    console.error('[useNotifications] ❌ Error setting up Android notification channels:', error);
  }
}
