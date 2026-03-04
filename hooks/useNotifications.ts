
import * as Notifications from 'expo-notifications';
import { Platform, Alert } from 'react-native';
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
  console.log('[useNotifications] Handling notification data:', data);
  
  if (!data) return;

  // Handle geofence notifications
  if (data.type === 'geofence') {
    console.log('[useNotifications] Geofence notification:', data.storeName);
    
    if (data.listId) {
      // Navigate to list detail
      console.log('[useNotifications] Navigating to list:', data.listId);
      // TODO: Backend Integration - Navigate to list detail screen when backend provides list endpoints
      // router.push(`/lists/${data.listId}`);
    } else if (data.reservationNumber) {
      // Navigate to reservation detail
      console.log('[useNotifications] Navigating to reservation:', data.reservationNumber);
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
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
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
    // Add longer delay to ensure native modules are fully initialized on older devices
    const checkPermissions = async () => {
      try {
        // Longer delay to ensure native modules are ready on older iOS devices
        await new Promise(resolve => setTimeout(resolve, 900));
        
        if (!isMounted) return;
        
        const { status } = await Notifications.getPermissionsAsync();
        setPermissionStatus(status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined');
        
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
        // Longer delay to ensure native modules are ready on older iOS devices
        await new Promise(resolve => setTimeout(resolve, 1100));
        
        if (!isMounted) return;
        
        const response = await Notifications.getLastNotificationResponseAsync();
        if (response) {
          console.log('[useNotifications] App opened from notification:', response);
          const data = response.notification.request.content.data;
          handleNotificationData(data);
        }
      } catch (error) {
        console.error('[useNotifications] Error checking last notification:', error);
      }
    };

    checkLastNotification();

    // Set up notification listeners with error handling
    // Add longer delay to ensure native modules are ready on older devices
    setTimeout(() => {
      if (!isMounted) return;
      
      try {
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
          console.log('[useNotifications] Notification received:', notification);
          if (isMounted) {
            setNotification(notification);
          }
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
          console.log('[useNotifications] Notification response:', response);
          const data = response.notification.request.content.data;
          handleNotificationData(data);
        });
      } catch (error) {
        console.error('[useNotifications] Error setting up notification listeners:', error);
      }
    }, 1200); // Increased delay for older iOS devices

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
      console.warn('[useNotifications] Push notifications not supported on web');
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

  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      console.log('[useNotifications] Push notifications not available on web');
      return false;
    }

    try {
      console.log('[useNotifications] Requesting notification permissions from user');
      
      // On Android 13+, show explanation first
      if (Platform.OS === 'android') {
        const { status: currentStatus } = await Notifications.getPermissionsAsync();
        
        if (currentStatus === 'undetermined') {
          // Show explanation before requesting
          return new Promise((resolve) => {
            Alert.alert(
              'Enable Notifications',
              'Get notified about product alerts, price drops, and shopping reminders.',
              [
                {
                  text: 'Not Now',
                  style: 'cancel',
                  onPress: () => {
                    console.log('[useNotifications] User declined notification permission');
                    setPermissionStatus('denied');
                    resolve(false);
                  }
                },
                {
                  text: 'Enable',
                  onPress: async () => {
                    try {
                      const { status } = await Notifications.requestPermissionsAsync();
                      const granted = status === 'granted';
                      setPermissionStatus(granted ? 'granted' : 'denied');
                      
                      if (granted) {
                        console.log('[useNotifications] Permission granted, getting token');
                        const tokenData = await Notifications.getExpoPushTokenAsync();
                        setExpoPushToken(tokenData.data);
                        console.log('[useNotifications] Push token:', tokenData.data);
                      } else {
                        console.warn('[useNotifications] Notification permission denied');
                      }
                      
                      resolve(granted);
                    } catch (error) {
                      console.error('[useNotifications] Error requesting permission:', error);
                      setPermissionStatus('denied');
                      resolve(false);
                    }
                  }
                }
              ]
            );
          });
        }
      }
      
      // Direct request for iOS or if already determined on Android
      const { status } = await Notifications.requestPermissionsAsync();
      setPermissionStatus(status === 'granted' ? 'granted' : 'denied');
      
      if (status === 'granted') {
        console.log('[useNotifications] Permission granted, getting token');
        const tokenData = await Notifications.getExpoPushTokenAsync();
        setExpoPushToken(tokenData.data);
        console.log('[useNotifications] Push token:', tokenData.data);
        return true;
      } else {
        console.warn('[useNotifications] Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('[useNotifications] Error requesting permissions:', error);
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

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') {
    console.log('[registerForPushNotifications] Push notifications not available on web');
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
      console.warn('[registerForPushNotifications] Failed to get push token for push notification!');
      return;
    }
    
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('[registerForPushNotifications] Expo push token:', token);
    
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
