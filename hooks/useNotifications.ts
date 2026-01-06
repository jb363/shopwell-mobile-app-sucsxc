
import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const useNotifications = () => {
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [notification, setNotification] = useState<Notifications.Notification | undefined>();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
        console.log('Expo Push Token:', token);
        // TODO: Backend Integration - Send push token to backend for storing user's device token
      }
    });

    // Listen for notifications received while app is running
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      setNotification(notification);
    });

    // Listen for notification interactions (taps)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      const data = response.notification.request.content.data;
      
      // Handle deep linking based on notification data
      if (data?.url) {
        const url = data.url as string;
        if (url.startsWith('http')) {
          Linking.openURL(url);
        } else {
          // Internal route
          router.push(url as any);
        }
      }
    });

    // Check for notification that opened the app
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) {
        console.log('App opened from notification:', response);
        const data = response.notification.request.content.data;
        if (data?.url) {
          const url = data.url as string;
          if (url.startsWith('http')) {
            Linking.openURL(url);
          } else {
            router.push(url as any);
          }
        }
      }
    });

    return () => {
      // FIXED: In Expo 54, call .remove() on the subscription object directly
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  const schedulePushNotification = async (title: string, body: string, data?: any) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: true,
        },
        trigger: {
          seconds: 1,
        },
      });
      console.log('Notification scheduled:', title);
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  };

  return { expoPushToken, notification, schedulePushNotification };
};

async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices');
    return;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push notification permissions');
      return;
    }

    // Set up notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // Get Expo push token
    // TODO: Backend Integration - Replace 'your-project-id' with actual project ID from backend configuration
    const token = (await Notifications.getExpoPushTokenAsync({
      projectId: 'your-project-id', // Replace with your actual project ID
    })).data;
    
    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return undefined;
  }
}
