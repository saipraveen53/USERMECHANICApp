import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
  checkAuthAndRedirect: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuthAndRedirect = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userId = await AsyncStorage.getItem('userId');
      const userRole = await AsyncStorage.getItem('userRole');

      if (token && userId && userRole) {
        setIsAuthenticated(true);
        // ✅ Redirect to the drawer (which will show the first screen – (tabs))
        router.replace('/(drawer)/(tabs)/home');
      } else {
        setIsAuthenticated(false);
        router.replace('/');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
      router.replace('/');
    }
  };

  const logout = async () => {
    await AsyncStorage.clear();
    setIsAuthenticated(false);
    router.replace('/');
  };

  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated, checkAuthAndRedirect, logout }}>
      {children}
    </AuthContext.Provider>
  );
};