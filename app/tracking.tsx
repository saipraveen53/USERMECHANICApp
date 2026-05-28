import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bike, CreditCard, MapPin, User } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBooking } from './(utils)/BookingContext';
import { useWebSocket } from './(utils)/websocketContex';

const SUCCESS_MESSAGE = "Thank you for choosing our Mechanics! Your service is successfully completed.";

export default function LiveTrackingScreen() {
  const { clearActiveBooking, activeBooking } = useBooking();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lastLocationUpdate, isConnected, lastBookingNotification } = useWebSocket();
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  const [waiting, setWaiting] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [mechanicLocation, setMechanicLocation] = useState<{ lat: number; lon: number } | null>(null);
  const mapRef = useRef<MapView>(null);

  // ఈ స్క్రీన్ ఏ బుకింగ్ కోసం ఓపెన్ అయ్యిందో ఆ ID ని లాక్ చేయడానికి (పాత స్క్రీన్స్ డూప్లికేట్ అవ్వకుండా)
  const screenBookingId = useRef<number | undefined>(activeBooking?.bookingId);

  // Bill modal state
  const [billModalVisible, setBillModalVisible] = useState(false);
  const [billDetails, setBillDetails] = useState<{ problem: string; totalAmount: number } | null>(null);
  const [paying, setPaying] = useState(false);

  // Completion modal state
  const [completionModalVisible, setCompletionModalVisible] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');

  const lastShownBillId = useRef<number | null>(null);
  const lastShownCompletionId = useRef<number | null>(null);

  useEffect(() => {
    // ఒకవేళ మొదటి రెండర్ లో ID లేకపోతే, అప్‌డేట్ చేయడానికి
    if (activeBooking?.bookingId && !screenBookingId.current) {
      screenBookingId.current = activeBooking.bookingId;
    }
  }, [activeBooking]);

  // Get user location
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation({ lat: loc.coords.latitude, lon: loc.coords.longitude });
      }
    })();
  }, []);

  // Handle BILL_GENERATED
  useEffect(() => {
    if (
      lastBookingNotification &&
      lastBookingNotification.status === 'BILL_GENERATED' &&
      activeBooking &&
      lastBookingNotification.bookingId === activeBooking.bookingId
    ) {
      const bookingId = lastBookingNotification.bookingId;

      // ముఖ్యమైన కండిషన్: ఈ నోటిఫికేషన్ వేరే బుకింగ్ ది అయితే, పాత స్క్రీన్ దాన్ని ఇగ్నోర్ చేస్తుంది
      if (screenBookingId.current && screenBookingId.current !== bookingId) {
        return;
      }

      if (lastShownBillId.current === bookingId) return;
      lastShownBillId.current = bookingId;

      setBillDetails({
        problem: lastBookingNotification.problem,
        totalAmount: lastBookingNotification.totalAmount || 0,
      });
      setBillModalVisible(true);
    }
  }, [lastBookingNotification, activeBooking]);

  // Handle COMPLETED
  useEffect(() => {
    if (
      lastBookingNotification &&
      lastBookingNotification.status === 'COMPLETED' &&
      lastBookingNotification.problem === SUCCESS_MESSAGE &&
      activeBooking &&
      lastBookingNotification.bookingId === activeBooking.bookingId
    ) {
      const bookingId = lastBookingNotification.bookingId;

      // ముఖ్యమైన కండిషన్: ఈ నోటిఫికేషన్ వేరే బుకింగ్ ది అయితే, పాత స్క్రీన్ దాన్ని ఇగ్నోర్ చేస్తుంది
      if (screenBookingId.current && screenBookingId.current !== bookingId) {
        return;
      }

      if (lastShownCompletionId.current === bookingId) return;
      lastShownCompletionId.current = bookingId;

      setCompletionMessage(lastBookingNotification.problem);
      setCompletionModalVisible(true);
    }
  }, [lastBookingNotification, activeBooking]);

  // Update mechanic location
  useEffect(() => {
    if (lastLocationUpdate?.lat && lastLocationUpdate?.lon) {
      setMechanicLocation({ lat: lastLocationUpdate.lat, lon: lastLocationUpdate.lon });
      setWaiting(false);
      setLastUpdateTime(new Date());
    }
  }, [lastLocationUpdate]);

  // Auto-fit map
  useEffect(() => {
    if (userLocation && mechanicLocation && mapRef.current) {
      mapRef.current.fitToCoordinates(
        [
          { latitude: userLocation.lat, longitude: userLocation.lon },
          { latitude: mechanicLocation.lat, longitude: mechanicLocation.lon },
        ],
        { edgePadding: { top: 70, right: 70, bottom: 70, left: 70 }, animated: true }
      );
    }
  }, [userLocation, mechanicLocation]);

  // Mock payment handler
  const handleMockPayment = async () => {
    if (!activeBooking) return;
    setPaying(true);
    try {
      Alert.alert(
        'Payment Successful',
        'Your payment has been processed. Service completed.',
        [
          {
            text: 'OK',
            onPress: async () => {
              setBillModalVisible(false);
              await clearActiveBooking();
              
              // పాత స్టాక్ ని క్లియర్ చేయడానికి router.back వాడాలి
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(drawer)/(tabs)/home');
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Payment Failed', 'Please try again.');
    } finally {
      setPaying(false);
    }
  };

  // Navigate to home when OK is pressed on completion modal
  const handleCompletionOk = () => {
    setCompletionModalVisible(false);
    clearActiveBooking();
    
    // పాత స్టాక్ ని క్లియర్ చేయడానికి router.back వాడాలి
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(drawer)/(tabs)/home');
    }
  };

  if (!isConnected) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.waitingText}>Connecting to WebSocket...</Text>
      </View>
    );
  }

  if (waiting || !userLocation) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
        <MapPin size={48} color="#007AFF" />
        <Text style={styles.waitingText}>Waiting for mechanic's location...</Text>
        <Text style={styles.subText}>The mechanic will share live location once they start moving.</Text>
      </View>
    );
  }

  if (!mechanicLocation) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.waitingText}>Loading map...</Text>
      </View>
    );
  }

  const userLatLng = { latitude: userLocation.lat, longitude: userLocation.lon };
  const mechanicLatLng = { latitude: mechanicLocation.lat, longitude: mechanicLocation.lon };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Tracking</Text>
        <View style={{ width: 40 }} />
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: userLocation.lat,
          longitude: userLocation.lon,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={false}
        showsMyLocationButton={true}
      >
        <UrlTile urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} zIndex={-1} />

        <Marker coordinate={userLatLng} title="You">
          <View style={styles.userMarker}><User size={18} color="#fff" /></View>
        </Marker>
        <Marker coordinate={mechanicLatLng} title="Mechanic">
          <View style={styles.mechanicMarker}><Bike size={18} color="#fff" /></View>
        </Marker>
        <Polyline coordinates={[userLatLng, mechanicLatLng]} strokeColor="#007AFF" strokeWidth={4} lineDashPattern={[5, 10]} />
      </MapView>

      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          🏍️ Mechanic is {calculateDistance(userLocation, mechanicLocation).toFixed(1)} km away.
          {'\n'}⏱️ Last update: {lastUpdateTime?.toLocaleTimeString()}
        </Text>
      </View>

      {/* Bill Modal */}
      <Modal visible={billModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.billModalContent}>
            <Text style={styles.billTitle}>💰 Bill Generated</Text>
            <View style={styles.billDetailsContainer}>
              <Text style={styles.billDetailsText}>{billDetails?.problem || 'No details'}</Text>
              <Text style={styles.totalAmountText}>Total Amount: ₹{billDetails?.totalAmount?.toFixed(2) || '0.00'}</Text>
            </View>
            <TouchableOpacity style={[styles.payButton, paying && styles.payButtonDisabled]} onPress={handleMockPayment} disabled={paying}>
              {paying ? <ActivityIndicator color="#fff" /> : <><CreditCard size={20} color="#fff" /><Text style={styles.payButtonText}>Pay Now (Mock)</Text></>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBillButton} onPress={() => setBillModalVisible(false)}>
              <Text style={styles.cancelBillText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Completion Modal */}
      <Modal visible={completionModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.completionModalContent}>
            <Text style={styles.completionTitle}>✅ Service Completed</Text>
            <Text style={styles.completionMessage}>{completionMessage}</Text>
            <TouchableOpacity style={styles.completionOkButton} onPress={handleCompletionOk}>
              <Text style={styles.completionOkButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function calculateDistance(p1: { lat: number; lon: number }, p2: { lat: number; lon: number }): number {
  const R = 6371;
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLon = ((p2.lon - p1.lon) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((p1.lat * Math.PI) / 180) * Math.cos((p2.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa', padding: 20 },
  waitingText: { fontSize: 18, fontWeight: '600', color: '#334155', marginTop: 20, textAlign: 'center' },
  subText: { fontSize: 14, color: '#666', marginTop: 8, textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e0e0e0' },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#000' },
  map: { flex: 1, margin: 12, borderRadius: 20, overflow: 'hidden' },
  userMarker: { backgroundColor: '#007AFF', padding: 8, borderRadius: 20, borderWidth: 2, borderColor: 'white', elevation: 4 },
  mechanicMarker: { backgroundColor: '#28a745', padding: 8, borderRadius: 20, borderWidth: 2, borderColor: 'white', elevation: 4 },
  infoCard: { backgroundColor: '#fff', borderRadius: 16, padding: 12, marginHorizontal: 12, marginBottom: 20, elevation: 3 },
  infoText: { fontSize: 14, color: '#1565C0', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  billModalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '85%', alignItems: 'center', elevation: 5 },
  billTitle: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 },
  billDetailsContainer: { backgroundColor: '#f8f9fa', borderRadius: 12, padding: 16, width: '100%', marginBottom: 20 },
  billDetailsText: { fontSize: 14, color: '#334155', marginBottom: 12, lineHeight: 20 },
  totalAmountText: { fontSize: 20, fontWeight: 'bold', color: '#007AFF', textAlign: 'center', marginTop: 8 },
  payButton: { backgroundColor: '#28a745', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 40, width: '100%', gap: 8, marginBottom: 12 },
  payButtonDisabled: { backgroundColor: '#a5d6a7' },
  payButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cancelBillButton: { paddingVertical: 10 },
  cancelBillText: { color: '#666', fontSize: 16 },
  completionModalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '80%', alignItems: 'center', elevation: 5 },
  completionTitle: { fontSize: 22, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 },
  completionMessage: { fontSize: 16, color: '#334155', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  completionOkButton: { backgroundColor: '#007AFF', paddingVertical: 12, paddingHorizontal: 40, borderRadius: 40, alignItems: 'center' },
  completionOkButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});