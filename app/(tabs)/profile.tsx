import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWebSocket } from '../(utils)/websocketContex';

export default function ProfileScreen() {
  const router = useRouter();
  const { isConnected, disconnect } = useWebSocket();
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    getUserEmail();
  }, []);

  const getUserEmail = async () => {
    const email = await AsyncStorage.getItem('userEmail');
    setUserEmail(email || '');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            // Disconnect WebSocket
            disconnect();
            
            // Clear stored user data
            await AsyncStorage.removeItem('user');
            await AsyncStorage.removeItem('authToken');
            await AsyncStorage.removeItem('userRole');
            await AsyncStorage.removeItem('userEmail');
            await AsyncStorage.removeItem('userId');
            
            // Redirect to login screen
            router.replace('/');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Profile</Text>
      
      {/* WebSocket Status */}
      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>WebSocket Status:</Text>
        <Text style={[styles.statusValue, isConnected ? styles.connected : styles.disconnected]}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </Text>
      </View>
      
      <View style={styles.infoCard}>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{userEmail}</Text>
      </View>
      
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  statusCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  connected: {
    color: '#4CAF50',
  },
  disconnected: {
    color: '#FF3B30',
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
  value: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 10,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});