
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
    // Only run on native platforms
    if (Platform.OS === 'web') {
      console.log('Notifications are not supported on web');
      return;
    }

    registerForPushNotificationsAsync().then(token => {
      setExpoPushToken(token);
      console.log('Push token:', token);
    });

    // Check for notification that opened the app
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) {
        console.log('App opened from notification:', response);
        const data = response.notification.request.content.data;
        handleNotificationData(data);
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      const data = response.notification.request.content.data;
      handleNotificationData(data);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  const schedulePushNotification = async () => {
    if (Platform.OS === 'web') {
      console.warn('Push notifications not supported on web');
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "ShopWell.ai Notification! 📬",
        body: 'Here is the notification body',
        data: { data: 'goes here' },
      },
      trigger: { seconds: 1 },
    });
  };

  return { schedulePushNotification, expoPushToken, notification };
}

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') {
    console.log('Push notifications not available on web');
    return undefined;
  }

  let token;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
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
}

// Android notification channel setup
if (Platform.OS === 'android') {
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
}
