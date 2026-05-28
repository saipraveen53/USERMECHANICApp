import AsyncStorage from '@react-native-async-storage/async-storage';
import { Client, IMessage } from '@stomp/stompjs';
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';

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
  latitude?: number;
  longitude?: number;
  totalAmount?: number;
  billingDetails?: string;
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
const BASE_URL = "https://live-tracking-kpuj.onrender.com";

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) throw new Error('useWebSocket must be used within WebSocketProvider');
  return context;
};

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<LocationUpdate | null>(null);
  const [lastBookingNotification, setLastBookingNotification] = useState<BookingNotification | null>(null);

  const clientRef = useRef<Client | null>(null);
  const subscriptionsRef = useRef<Map<string, any>>(new Map());

  const safeParse = (body: string): any => {
    try {
      let parsedBody = body;
      if (typeof parsedBody === 'string' && parsedBody.startsWith('NEW_REQUEST:')) {
        parsedBody = parsedBody.substring('NEW_REQUEST:'.length);
      }
      return JSON.parse(parsedBody);
    } catch (err) {
      console.error('❌ Failed to parse message:', body, err);
      return null;
    }
  };

  const initializeConnection = async (userId: string, role: string) => {
    try {
      console.log('🔌 Initializing WebSocket connection to:', `${BASE_URL}/ws`);
      const token = await AsyncStorage.getItem('authToken');

      const socket = new SockJS(`${BASE_URL}/ws`);
      const client = new Client({
        webSocketFactory: () => socket,
        connectHeaders: {
          ...(token && { Authorization: `Bearer ${token}` }),
          userId: userId,
        },
        debug: (str) => console.log('🐞 STOMP:', str),
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onConnect: () => {
          console.log('✅ WebSocket connected successfully!');
          setIsConnected(true);
          setError(null);

          const normalizedRole = role.replace('ROLE_', '');
          if (normalizedRole === 'USER') {
            console.log('📡 Subscribing to USER topics for userId:', userId);
            subscribeToUserTopics(userId);
          } else if (normalizedRole === 'MECHANIC') {
            console.log('📡 Subscribing to MECHANIC topics for mechanicId:', userId);
            subscribeToMechanicTopics(userId);
          } else {
            console.warn('⚠️ Unknown role, cannot subscribe:', role);
          }
        },
        onStompError: (frame) => {
          console.error('❌ STOMP error:', frame);
          setError('STOMP connection error');
          setIsConnected(false);
        },
        onDisconnect: () => {
          console.log('🔌 WebSocket disconnected');
          setIsConnected(false);
        },
        onWebSocketError: (event) => {
          console.error('❌ WebSocket error:', event);
          setError('WebSocket connection error');
          setIsConnected(false);
        },
      });

      client.activate();
      clientRef.current = client;
    } catch (err) {
      console.error('❌ Failed to initialize WebSocket:', err);
      setError('Failed to initialize WebSocket connection');
    }
  };

  const subscribeToUserTopics = (userId: string) => {
    if (!clientRef.current?.connected) return;
    
    // 📍 1. Main topic /topic/user/{userId}
    const mainSub = clientRef.current.subscribe(`/topic/user/${userId}`, (msg: IMessage) => {
      console.log(`📨 [TOPIC: /topic/user/${userId}] Message received:`, msg.body);
      const data = safeParse(msg.body);
      if (!data) return;
      if (data.lat !== undefined) {
        console.log('📍 Location update received:', data);
        setLastLocationUpdate(data);
      } else if (data.status) {
        console.log(`🔔 Booking notification (${data.status}) received:`, data);
        setLastBookingNotification(data);
      }
    });
    subscriptionsRef.current.set(`user_main_${userId}`, mainSub);
    console.log(`✅ Subscribed to /topic/user/${userId}`);

    // 2. Booking status topic
    const bookingSub = clientRef.current.subscribe(`/topic/user/booking/${userId}`, (msg: IMessage) => {
      console.log(`📨 [TOPIC: /topic/user/booking/${userId}] Message:`, msg.body);
      const data = safeParse(msg.body);
      if (data && data.status) {
        console.log(`✅ Booking ${data.status} notification:`, data);
        setLastBookingNotification(data);
      }
    });
    subscriptionsRef.current.set(`user_booking_${userId}`, bookingSub);
    console.log(`✅ Subscribed to /topic/user/booking/${userId}`);

    // 3. Live tracking topic
    const trackingSub = clientRef.current.subscribe(`/topic/user/tracking/${userId}`, (msg: IMessage) => {
      console.log(`📨 [TOPIC: /topic/user/tracking/${userId}] Location update:`, msg.body);
      const data = safeParse(msg.body);
      if (data && data.lat !== undefined) {
        console.log(`📍 Mechanic location: lat=${data.lat}, lon=${data.lon}`);
        setLastLocationUpdate(data);
      }
    });
    subscriptionsRef.current.set(`user_tracking_${userId}`, trackingSub);
    console.log(`✅ Subscribed to /topic/user/tracking/${userId}`);

    // 4. Complete topic
    const completeSub = clientRef.current.subscribe(`/topic/user/complete/${userId}`, (msg: IMessage) => {
      console.log(`📨 [TOPIC: /topic/user/complete/${userId}] Message:`, msg.body);
      const data = safeParse(msg.body);
      if (data && data.status === 'COMPLETED') {
        console.log('🎉 Service completed notification:', data);
        setLastBookingNotification(data);
      }
    });
    subscriptionsRef.current.set(`user_complete_${userId}`, completeSub);
    console.log(`✅ Subscribed to /topic/user/complete/${userId}`);

    // 5. Bill generation topic
    const billSub = clientRef.current.subscribe(`/topic/user/billGenerate/${userId}`, (msg: IMessage) => {
      console.log(`📨 [TOPIC: /topic/user/billGenerate/${userId}] Bill notification:`, msg.body);
      const data = safeParse(msg.body);
      if (data && data.status === 'BILL_GENERATED') {
        console.log(`💰 Bill generated: Amount ₹${data.totalAmount}`);
        setLastBookingNotification(data);
      }
    });
    subscriptionsRef.current.set(`user_bill_${userId}`, billSub);
    console.log(`✅ Subscribed to /topic/user/billGenerate/${userId}`);

    // 6. Rejection topic
    const rejectSub = clientRef.current.subscribe(`/topic/user/reject/${userId}`, (msg: IMessage) => {
      console.log(`📨 [TOPIC: /topic/user/reject/${userId}] Rejection:`, msg.body);
      const data = safeParse(msg.body);
      if (data && data.status === 'REJECTED') {
        console.log('❌ Booking rejected notification:', data);
        setLastBookingNotification(data);
      }
    });
    subscriptionsRef.current.set(`user_reject_${userId}`, rejectSub);
    console.log(`✅ Subscribed to /topic/user/reject/${userId}`);
  };

  const subscribeToMechanicTopics = (mechanicId: string) => {
    if (!clientRef.current?.connected) return;
    
    console.log(`📡 Subscribing to mechanic topics for mechanicId: ${mechanicId}`);
    const sub = clientRef.current.subscribe(`/topic/mechanic/${mechanicId}`, (msg: IMessage) => {
      console.log(`📨 [TOPIC: /topic/mechanic/${mechanicId}] New booking notification:`, msg.body);
      const data = safeParse(msg.body);
      if (data) {
        console.log(`🔧 New booking request from user ${data.userId}, problem: ${data.problem}`);
        setLastBookingNotification(data);
      }
    });
    subscriptionsRef.current.set(`mechanic_core_${mechanicId}`, sub);
    console.log(`✅ Subscribed to /topic/mechanic/${mechanicId}`);
  };

  const subscribeToMechanicLocation = (userId: number, callback: (location: LocationUpdate) => void) => {
    if (!clientRef.current?.connected) return;
    console.log(`📡 Subscribing to location for userId: ${userId}`);
    const sub = clientRef.current.subscribe(`/topic/user/${userId}`, (msg: IMessage) => {
      const data = safeParse(msg.body);
      if (data && data.lat !== undefined) {
        console.log(`📍 Location callback triggered for user ${userId}`);
        callback(data);
      }
    });
    subscriptionsRef.current.set(`loc_cb_${userId}`, sub);
  };

  const subscribeToBookingStatus = (userId: number, callback: (notification: BookingNotification) => void) => {
    if (!clientRef.current?.connected) return;
    console.log(`📡 Subscribing to booking status for userId: ${userId}`);
    const sub = clientRef.current.subscribe(`/topic/user/${userId}`, (msg: IMessage) => {
      const data = safeParse(msg.body);
      if (data && data.status) {
        console.log(`🔔 Booking status callback: ${data.status} for user ${userId}`);
        callback(data);
      }
    });
    subscriptionsRef.current.set(`booking_cb_${userId}`, sub);
  };

  const subscribeToMechanicBooking = (mechanicId: number, callback: (notification: BookingNotification) => void) => {
    if (!clientRef.current?.connected) return;
    console.log(`📡 Subscribing to mechanic bookings for mechanicId: ${mechanicId}`);
    const sub = clientRef.current.subscribe(`/topic/mechanic/${mechanicId}`, (msg: IMessage) => {
      const data = safeParse(msg.body);
      if (data) {
        console.log(`🔧 Mechanic booking callback: new request for mechanic ${mechanicId}`);
        callback(data);
      }
    });
    subscriptionsRef.current.set(`mech_cb_${mechanicId}`, sub);
  };

  const sendLocationUpdate = (mechanicId: number, userId: number, lat: number, lon: number) => {
    if (!clientRef.current?.connected) {
      console.error('❌ WebSocket not connected, cannot send location');
      return;
    }
    const destination = '/app/mechanic/location';
    const payload = JSON.stringify({ userId, lat, lon });
    clientRef.current.publish({ destination, body: payload });
    console.log(`📤 Sent location via STOMP: mechanicId=${mechanicId}, userId=${userId}, lat=${lat}, lon=${lon}`);
  };

  const connect = async (userId: string, role: string) => {
    if (clientRef.current?.connected) {
      console.log('⚠️ WebSocket already connected');
      return;
    }
    if (clientRef.current) disconnect();
    await initializeConnection(userId, role);
  };

  const reconnect = async () => {
    const userId = await AsyncStorage.getItem('userId');
    const role = await AsyncStorage.getItem('userRole');
    if (userId && role) {
      console.log('🔄 Reconnecting WebSocket...');
      disconnect();
      await initializeConnection(userId, role);
    } else {
      throw new Error('User data not found');
    }
  };

  const disconnect = () => {
    if (clientRef.current) {
      console.log('🔌 Disconnecting WebSocket...');
      subscriptionsRef.current.forEach(sub => sub?.unsubscribe());
      subscriptionsRef.current.clear();
      if (clientRef.current.connected) clientRef.current.deactivate();
      clientRef.current = null;
      setIsConnected(false);
      console.log('✅ WebSocket disconnected');
    }
  };

  useEffect(() => {
    const autoConnect = async () => {
      const token = await AsyncStorage.getItem('authToken');
      const role = await AsyncStorage.getItem('userRole');
      const userId = await AsyncStorage.getItem('userId');
      if (token && role && userId) {
        console.log('🚀 Auto-connecting WebSocket...');
        await initializeConnection(userId, role);
      }
    };
    autoConnect();
    return () => disconnect();
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

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};