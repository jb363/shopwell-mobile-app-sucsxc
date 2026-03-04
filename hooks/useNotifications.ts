
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Handle notification data and deep linking
function handleNotificationData(data: any) {
  console.log('Handling notification data:', data);
  
  if (!data) return;

  // Handle geofence notifications
  if (data.type === 'geofence') {
    console.log('Geofence notification:', data.storeName);
    
    if (data.listId) {
      // Navigate to list detail
      console.log('Navigating to list:', data.listId);
      // TODO: Backend Integration - Navigate to list detail screen when backend provides list endpoints
      // router.push(`/lists/${data.listId}`);
    } else if (data.reservationNumber) {
      // Navigate to reservation detail
      console.log('Navigating to reservation:', data.reservationNumber);
      // TODO: Backend Integration - Navigate to reservation detail screen when backend provides reservation endpoints
      // router.push(`/reservations/${data.reservationNumber}`);
    }
  }
  
  // Handle other notification types
  // Add more handlers as needed
}

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string>();
  const [notification, setNotification] = useState<Notifications.Notification>();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    let isMounted = true;
    
    // Only run on native platforms
    if (Platform.OS === 'web') {
      console.log('[useNotifications] Notifications are not supported on web');
      return;
    }

    // DO NOT automatically request notification permissions on mount
    // This was causing the permission prompt to appear immediately when the app opens
    // Instead, we only check if we already have permission and get the token if we do
    console.log('[useNotifications] Checking existing notification permissions (not requesting)');
    
    // Wrap in try-catch to handle native module unavailability
    // Add delay to ensure native modules are fully initialized
    const checkPermissions = async () => {
      try {
        // Small delay to ensure native modules are ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!isMounted) return;
        
        const { status } = await Notifications.getPermissionsAsync();
        if (status === 'granted') {
          console.log('[useNotifications] Already have notification permission, getting token');
          try {
            const tokenData = await Notifications.getExpoPushTokenAsync();
            if (isMounted) {
              setExpoPushToken(tokenData.data);
              console.log('[useNotifications] Push token:', tokenData.data);
            }
          } catch (tokenError) {
            console.error('[useNotifications] Error getting push token:', tokenError);
          }
        } else {
          console.log('[useNotifications] No notification permission yet - will request when user enables notifications');
        }
      } catch (error) {
        console.error('[useNotifications] Error checking notification permissions:', error);
      }
    };

    checkPermissions();

    // Check for notification that opened the app
    const checkLastNotification = async () => {
      try {
        // Small delay to ensure native modules are ready
        await new Promise(resolve => setTimeout(resolve, 700));
        
        if (!isMounted) return;
        
        const response = await Notifications.getLastNotificationResponseAsync();
        if (response) {
          console.log('App opened from notification:', response);
          const data = response.notification.request.content.data;
          handleNotificationData(data);
        }
      } catch (error) {
        console.error('[useNotifications] Error checking last notification:', error);
      }
    };

    checkLastNotification();

    // Set up notification listeners with error handling
    // Add delay to ensure native modules are ready
    setTimeout(() => {
      if (!isMounted) return;
      
      try {
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
          console.log('Notification received:', notification);
          if (isMounted) {
            setNotification(notification);
          }
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
          console.log('Notification response:', response);
          const data = response.notification.request.content.data;
          handleNotificationData(data);
        });
      } catch (error) {
        console.error('[useNotifications] Error setting up notification listeners:', error);
      }
    }, 800);

    return () => {
      isMounted = false;
      try {
        notificationListener.current?.remove();
        responseListener.current?.remove();
      } catch (error) {
        console.error('[useNotifications] Error removing notification listeners:', error);
      }
    };
  }, []);

  const schedulePushNotification = async () => {
    if (Platform.OS === 'web') {
      console.warn('Push notifications not supported on web');
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
    } catch (error) {
      console.error('[useNotifications] Error scheduling notification:', error);
    }
  };

  return { schedulePushNotification, expoPushToken, notification };
}

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') {
    console.log('Push notifications not available on web');
    return undefined;
  }

  try {
    let token;
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      console.log('[registerForPushNotifications] Requesting notification permissions from user');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return;
    }
    
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Expo push token:', token);
    
    return token;
  } catch (error) {
    console.error('[registerForPushNotifications] Error:', error);
    return undefined;
  }
}

// Android notification channel setup
if (Platform.OS === 'android') {
  try {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
    
    // Create a channel for location-based notifications
    Notifications.setNotificationChannelAsync('location', {
      name: 'Location Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#007aff',
      description: 'Notifications when you are near stores with active lists',
    });
  } catch (error) {
    console.error('[useNotifications] Error setting up Android notification channels:', error);
  }
}
