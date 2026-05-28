import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

export interface ActiveBooking {
  bookingId: number;
  mechanicId: number;
  mechanicName: string;
  status: 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED';
}

interface BookingContextType {
  activeBooking: ActiveBooking | null;
  setActiveBooking: (booking: ActiveBooking | null) => Promise<void>;
  clearActiveBooking: () => Promise<void>;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const useBooking = () => {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used within BookingProvider');
  return ctx;
};

export const BookingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeBooking, setActiveBookingState] = useState<ActiveBooking | null>(null);

  useEffect(() => {
    loadStoredBooking();
  }, []);

  const loadStoredBooking = async () => {
    const stored = await AsyncStorage.getItem('activeBooking');
    if (stored) {
      const booking = JSON.parse(stored);
      if (booking.status !== 'COMPLETED') setActiveBookingState(booking);
      else await AsyncStorage.removeItem('activeBooking');
    }
  };

  const setActiveBooking = async (booking: ActiveBooking | null) => {
    if (booking) {
      await AsyncStorage.setItem('activeBooking', JSON.stringify(booking));
      setActiveBookingState(booking);
    } else {
      await AsyncStorage.removeItem('activeBooking');
      setActiveBookingState(null);
    }
  };

  const clearActiveBooking = async () => {
    await AsyncStorage.removeItem('activeBooking');
    setActiveBookingState(null);
  };

  return (
    <BookingContext.Provider value={{ activeBooking, setActiveBooking, clearActiveBooking }}>
      {children}
    </BookingContext.Provider>
  );
};