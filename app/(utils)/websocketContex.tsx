import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client, IMessage } from '@stomp/stompjs';
import axios from 'axios';
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';

// Types
interface LocationUpdate {
  mechanicId: number;
  userId: number;
  lat: number;
  lon: number;
}

interface BookingNotification {
  bookingId: number;
  userId: number;
  mechanicId: number;
  problem: string;
  status: string;
  latitude: number;
  longitude: number;
}

interface WebSocketContextType {
  isConnected: boolean;
  error: string | null;
  lastLocationUpdate: LocationUpdate | null;
  lastBookingNotification: BookingNotification | null;
  subscribeToMechanicLocation: (userId: number, callback: (location: LocationUpdate) => void) => void;
  subscribeToBookingStatus: (userId: number, callback: (notification: BookingNotification) => void) => void;
  subscribeToMechanicBooking: (mechanicId: number, callback: (notification: BookingNotification) => void) => void;
  sendLocationUpdate: (mechanicId: number, userId: number, lat: number, lon: number) => void;
  connect: (userId: string, role: string) => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

const BASE_URL = 'http://192.168.0.42:8080';

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<LocationUpdate | null>(null);
  const [lastBookingNotification, setLastBookingNotification] = useState<BookingNotification | null>(null);
  
  const clientRef = useRef<Client | null>(null);
  const subscriptionsRef = useRef<Map<string, any>>(new Map());

  // Initialize WebSocket connection using SockJS (as configured on backend)
  const initializeConnection = async (userId: string, role: string) => {
    try {
      console.log('Initializing SockJS connection to:', `${BASE_URL}/ws`);
      const token = await AsyncStorage.getItem('authToken');
      
      // Create SockJS connection
      const socket = new SockJS(`${BASE_URL}/ws`);
      
      const client = new Client({
        webSocketFactory: () => socket,
        connectHeaders: {
          // Send token in headers if your backend needs it (optional)
          ...(token && { Authorization: `Bearer ${token}` }),
          userId: userId,
        },
        debug: (str) => {
          console.log('STOMP Debug:', str);
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onConnect: () => {
          console.log('✅ WebSocket Connected successfully');
          setIsConnected(true);
          setError(null);
          
          // Subscribe based on role
          if (role === 'USER') {
            subscribeToUserTopics(userId);
          } else if (role === 'MECHANIC') {
            subscribeToMechanicTopics(userId);
          }
        },
        onStompError: (frame) => {
          console.error('❌ STOMP Error:', frame);
          setError('STOMP connection error');
          setIsConnected(false);
        },
        onDisconnect: () => {
          console.log('🔌 WebSocket Disconnected');
          setIsConnected(false);
        },
        onWebSocketError: (event) => {
          console.error('❌ WebSocket Error:', event);
          setError('WebSocket connection error');
          setIsConnected(false);
        },
      });
      
      client.activate();
      clientRef.current = client;
      
    } catch (err) {
      console.error('Failed to initialize WebSocket:', err);
      setError('Failed to initialize WebSocket connection');
    }
  };

  // Subscribe to user-specific topics (for normal users)
  const subscribeToUserTopics = (userId: string) => {
    if (!clientRef.current || !clientRef.current.connected) return;
    
    console.log('Subscribing to user topics for userId:', userId);
    
    // Subscribe to mechanic location updates
    const locationSubscription = clientRef.current.subscribe(
      `/topic/user/${userId}`,
      (message: IMessage) => {
        try {
          const locationData: LocationUpdate = JSON.parse(message.body);
          console.log('📍 Location update received:', locationData);
          setLastLocationUpdate(locationData);
        } catch (err) {
          console.error('Error parsing location update:', err);
        }
      }
    );
    
    // Subscribe to booking status updates
    const bookingSubscription = clientRef.current.subscribe(
      `/topic/user/${userId}`,
      (message: IMessage) => {
        try {
          const notification: BookingNotification = JSON.parse(message.body);
          if (notification.status) {
            console.log('📝 Booking notification:', notification);
            setLastBookingNotification(notification);
          }
        } catch (err) {
          console.error('Error parsing booking notification:', err);
        }
      }
    );
    
    subscriptionsRef.current.set(`user_location_${userId}`, locationSubscription);
    subscriptionsRef.current.set(`user_booking_${userId}`, bookingSubscription);
  };

  // Subscribe to mechanic-specific topics (for mechanics)
  const subscribeToMechanicTopics = (mechanicId: string) => {
    if (!clientRef.current || !clientRef.current.connected) return;
    
    console.log('Subscribing to mechanic topics for mechanicId:', mechanicId);
    
    // Subscribe to new booking requests
    const bookingRequestSubscription = clientRef.current.subscribe(
      `/topic/mechanic/${mechanicId}`,
      (message: IMessage) => {
        try {
          const notification: BookingNotification = JSON.parse(message.body);
          console.log('🔧 New booking request for mechanic:', notification);
          setLastBookingNotification(notification);
        } catch (err) {
          console.error('Error parsing booking request:', err);
        }
      }
    );
    
    subscriptionsRef.current.set(`mechanic_booking_${mechanicId}`, bookingRequestSubscription);
  };

  // Public method to subscribe to mechanic location updates
  const subscribeToMechanicLocation = (userId: number, callback: (location: LocationUpdate) => void) => {
    if (!clientRef.current || !clientRef.current.connected) {
      console.log('WebSocket not connected, cannot subscribe to location');
      return;
    }
    
    const subscription = clientRef.current.subscribe(
      `/topic/user/${userId}`,
      (message: IMessage) => {
        try {
          const locationData: LocationUpdate = JSON.parse(message.body);
          callback(locationData);
        } catch (err) {
          console.error('Error in location callback:', err);
        }
      }
    );
    
    subscriptionsRef.current.set(`location_callback_${userId}`, subscription);
  };

  // Public method to subscribe to booking status
  const subscribeToBookingStatus = (userId: number, callback: (notification: BookingNotification) => void) => {
    if (!clientRef.current || !clientRef.current.connected) {
      console.log('WebSocket not connected, cannot subscribe to booking status');
      return;
    }
    
    const subscription = clientRef.current.subscribe(
      `/topic/user/${userId}`,
      (message: IMessage) => {
        try {
          const notification: BookingNotification = JSON.parse(message.body);
          if (notification.status) {
            callback(notification);
          }
        } catch (err) {
          console.error('Error in booking callback:', err);
        }
      }
    );
    
    subscriptionsRef.current.set(`booking_callback_${userId}`, subscription);
  };

  // Public method to subscribe to mechanic booking requests
  const subscribeToMechanicBooking = (mechanicId: number, callback: (notification: BookingNotification) => void) => {
    if (!clientRef.current || !clientRef.current.connected) {
      console.log('WebSocket not connected, cannot subscribe to mechanic bookings');
      return;
    }
    
    const subscription = clientRef.current.subscribe(
      `/topic/mechanic/${mechanicId}`,
      (message: IMessage) => {
        try {
          const notification: BookingNotification = JSON.parse(message.body);
          callback(notification);
        } catch (err) {
          console.error('Error in mechanic booking callback:', err);
        }
      }
    );
    
    subscriptionsRef.current.set(`mechanic_booking_callback_${mechanicId}`, subscription);
  };

  // Send location update (mechanic to user) via REST API
  const sendLocationUpdate = (mechanicId: number, userId: number, lat: number, lon: number) => {
    const locationData = {
      mechanicId,
      userId,
      lat,
      lon,
      timestamp: new Date().toISOString()
    };
    
    axios.post(`${BASE_URL}/api/tracking/mechanic-location`, locationData)
      .then(() => {
        console.log('Location update sent successfully');
      })
      .catch((err) => {
        console.error('Failed to send location update:', err);
      });
  };

  // Manual connect function
  const connect = async (userId: string, role: string) => {
    try {
      console.log('Manual connect called with userId:', userId, 'role:', role);
      
      if (clientRef.current && clientRef.current.connected) {
        console.log('WebSocket already connected');
        return;
      }
      
      if (clientRef.current) {
        disconnect();
      }
      
      await initializeConnection(userId, role);
    } catch (err) {
      console.error('Manual connect failed:', err);
      setError('Failed to connect');
      throw err;
    }
  };

  // Reconnect function
  const reconnect = async () => {
    try {
      const userRole = await AsyncStorage.getItem('userRole');
      const userId = await AsyncStorage.getItem('userId');
      
      if (userRole && userId) {
        disconnect();
        await initializeConnection(userId, userRole);
      } else {
        throw new Error('User data not found');
      }
    } catch (err) {
      console.error('Reconnect failed:', err);
      setError('Failed to reconnect');
      throw err;
    }
  };

  // Disconnect WebSocket
  const disconnect = () => {
    if (clientRef.current) {
      subscriptionsRef.current.forEach((subscription) => {
        if (subscription && subscription.unsubscribe) {
          subscription.unsubscribe();
        }
      });
      subscriptionsRef.current.clear();
      
      if (clientRef.current.connected) {
        clientRef.current.deactivate();
      }
      clientRef.current = null;
      setIsConnected(false);
      console.log('WebSocket disconnected manually');
    }
  };

  // Auto-connect when user is logged in
  useEffect(() => {
    const autoConnect = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        const userRole = await AsyncStorage.getItem('userRole');
        const userEmail = await AsyncStorage.getItem('userEmail');
        
        if (token && userRole && userEmail) {
          const userId = await AsyncStorage.getItem('userId');
          if (userId) {
            await initializeConnection(userId, userRole);
          }
        }
      } catch (err) {
        console.error('Auto-connect error:', err);
      }
    };
    
    autoConnect();
    
    return () => {
      disconnect();
    };
  }, []);

  const value = {
    isConnected,
    error,
    lastLocationUpdate,
    lastBookingNotification,
    subscribeToMechanicLocation,
    subscribeToBookingStatus,
    subscribeToMechanicBooking,
    sendLocationUpdate,
    connect,
    disconnect,
    reconnect,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};