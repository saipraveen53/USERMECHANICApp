import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWebSocket } from '../(utils)/websocketContex';

export default function HomeScreen() {
  const router = useRouter();
  const { 
    isConnected, 
    error,
    lastLocationUpdate, 
    lastBookingNotification,
    subscribeToMechanicLocation,
    subscribeToBookingStatus,
    connect,
    disconnect,
    reconnect
  } = useWebSocket();
  
  const [userId, setUserId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isManualConnecting, setIsManualConnecting] = useState(false);

  useEffect(() => {
    getUserData();
  }, []);

  useEffect(() => {
    if (userId && isConnected) {
      console.log('Setting up subscriptions for userId:', userId);
      // Subscribe to mechanic location updates
      subscribeToMechanicLocation(userId, (location) => {
        console.log('Real-time location update:', location);
        Alert.alert('Location Update', `Mechanic is at: ${location.lat}, ${location.lon}`);
      });

      // Subscribe to booking status updates
      subscribeToBookingStatus(userId, (notification) => {
        console.log('Booking status update:', notification);
        Alert.alert('Booking Update', `Your booking is ${notification.status}`);
      });
    }
  }, [userId, isConnected]);

  const getUserData = async () => {
    try {
      // Get userId from storage
      const id = await AsyncStorage.getItem('userId');
      const role = await AsyncStorage.getItem('userRole');
      const email = await AsyncStorage.getItem('userEmail');
      
      console.log('Retrieved from storage - userId:', id, 'role:', role, 'email:', email);
      
      if (id) {
        setUserId(parseInt(id));
      }
      if (role) {
        setUserRole(role);
      }
    } catch (error) {
      console.log('Error getting user data:', error);
    }
  };

  const handleConnectWebSocket = async () => {
    setIsManualConnecting(true);
    try {
      const userIdStorage = await AsyncStorage.getItem('userId');
      const userRoleStorage = await AsyncStorage.getItem('userRole');
      
      console.log('Connect attempt - userId:', userIdStorage, 'role:', userRoleStorage);
      
      if (userIdStorage && userRoleStorage) {
        await connect(userIdStorage, userRoleStorage);
        Alert.alert('Success', 'WebSocket connected successfully!');
      } else {
        Alert.alert('Error', 'User data not found. Please login again.');
      }
    } catch (err) {
      console.error('Manual connect error:', err);
      Alert.alert('Error', 'Failed to connect WebSocket');
    } finally {
      setIsManualConnecting(false);
    }
  };

  const handleDisconnectWebSocket = () => {
    disconnect();
    Alert.alert('Disconnected', 'WebSocket disconnected successfully');
  };

  const handleReconnectWebSocket = async () => {
    setIsManualConnecting(true);
    try {
      await reconnect();
      Alert.alert('Success', 'WebSocket reconnected successfully!');
    } catch (err) {
      console.error('Reconnect error:', err);
      Alert.alert('Error', 'Failed to reconnect WebSocket');
    } finally {
      setIsManualConnecting(false);
    }
  };

  const handleFindMechanics = () => {
    if (!isConnected) {
      Alert.alert('Warning', 'WebSocket is not connected. Real-time updates may not work.');
    }
    Alert.alert('Searching', 'Looking for nearby mechanics...');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Home Screen!</Text>
      
      {/* User Info */}
      <View style={styles.userInfoCard}>
        <Text style={styles.userInfoText}>User ID: {userId || 'Not loaded'}</Text>
        <Text style={styles.userInfoText}>Role: {userRole || 'Not loaded'}</Text>
      </View>
      
      {/* WebSocket Status Indicator */}
      <View style={styles.statusContainer}>
        <Text style={[styles.statusText, isConnected ? styles.connected : styles.disconnected]}>
          {isConnected ? '● Connected' : '● Disconnected'}
        </Text>
        {error && (
          <Text style={styles.errorText}>
            Error: {error}
          </Text>
        )}
      </View>

      {/* WebSocket Control Buttons */}
      <View style={styles.wsButtonContainer}>
        {!isConnected ? (
          <TouchableOpacity 
            style={[styles.wsButton, styles.connectButton]}
            onPress={handleConnectWebSocket}
            disabled={isManualConnecting}
          >
            <Text style={styles.wsButtonText}>
              {isManualConnecting ? 'Connecting...' : 'Connect WebSocket'}
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity 
              style={[styles.wsButton, styles.disconnectButton]}
              onPress={handleDisconnectWebSocket}
            >
              <Text style={styles.wsButtonText}>Disconnect</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.wsButton, styles.reconnectButton]}
              onPress={handleReconnectWebSocket}
              disabled={isManualConnecting}
            >
              <Text style={styles.wsButtonText}>
                {isManualConnecting ? 'Reconnecting...' : 'Reconnect'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
      
      <Text style={styles.subtitle}>Find nearby mechanics</Text>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={handleFindMechanics}
      >
        <Text style={styles.buttonText}>Find Mechanics Near Me</Text>
      </TouchableOpacity>

      {/* Show last location update if any */}
      {lastLocationUpdate && (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Last Mechanic Location:</Text>
          <Text>Latitude: {lastLocationUpdate.lat}</Text>
          <Text>Longitude: {lastLocationUpdate.lon}</Text>
          <Text style={styles.timestamp}>
            Time: {new Date().toLocaleTimeString()}
          </Text>
        </View>
      )}

      {/* Show last booking notification if any */}
      {lastBookingNotification && (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Last Booking Update:</Text>
          <Text>Status: {lastBookingNotification.status}</Text>
          <Text>Booking ID: {lastBookingNotification.bookingId}</Text>
          {lastBookingNotification.problem && (
            <Text>Problem: {lastBookingNotification.problem}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  userInfoCard: {
    backgroundColor: '#e3f2fd',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  userInfoText: {
    fontSize: 14,
    color: '#1565C0',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  connected: {
    color: '#4CAF50',
  },
  disconnected: {
    color: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 5,
  },
  wsButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  wsButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  connectButton: {
    backgroundColor: '#4CAF50',
  },
  disconnectButton: {
    backgroundColor: '#FF3B30',
  },
  reconnectButton: {
    backgroundColor: '#FF9800',
  },
  wsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    width: '100%',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
});