import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

interface NotificationContextType {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within NotificationProvider');
  return context;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  // Configure how notifications appear when app is in foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  const registerForPushNotifications = async () => {
    try {
      // 1. Check permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // 2. Request permission if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      // 3. If denied, show alert and exit
      if (finalStatus !== 'granted') {
        console.warn('❌ Notification permission denied');
        return;
      }

      // 4. Get projectId from app.json / app.config.js
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        console.error('❌ Missing projectId in app.json (extra.eas.projectId)');
        return;
      }

      // 5. Generate Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      const token = tokenData.data;

      console.log('✅ Expo Push Token:', token);
      setExpoPushToken(token);
    } catch (error) {
      console.error('Error generating push token:', error);
    }
  };

  // Android channel configuration (required for Android)
  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
  }, []);

  // Register for token when component mounts (app starts)
  useEffect(() => {
    registerForPushNotifications();
  }, []);

  // Listen for incoming notifications (foreground)
  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('📩 Notification received (foreground):', notification);
      setNotification(notification);
    });

    // Listen for user tapping on notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('👆 User tapped notification:', response);
      // You can navigate to a specific screen here based on response
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  return (
    <NotificationContext.Provider value={{ expoPushToken, notification }}>
      {children}
    </NotificationContext.Provider>
  );
};