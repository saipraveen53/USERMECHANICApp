import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Mail, MapPin, Navigation, Phone, Star, Wrench } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { rootApi } from '../../(utils)/axiosInstance';
import { useBooking } from '../../(utils)/BookingContext';
import { useWebSocket } from '../../(utils)/websocketContex';

interface Mechanic {
  id: number;
  name: string;
  phoneNo: string;
  email: string;
  latitude: number;
  longitude: number;
  distance: number;
  exp?: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const { lastBookingNotification } = useWebSocket();
  const { activeBooking, setActiveBooking } = useBooking();
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [waitingModalVisible, setWaitingModalVisible] = useState(false);
  const [pendingBookingId, setPendingBookingId] = useState<number | null>(null);
  const [selectedMechanicName, setSelectedMechanicName] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [problem, setProblem] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [selectedMechanic, setSelectedMechanic] = useState<Mechanic | null>(null);

  const processedRejections = useRef<Set<number>>(new Set());

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const loadUserId = async () => {
      const id = await AsyncStorage.getItem('userId');
      if (id) setUserId(parseInt(id));
    };
    loadUserId();
    checkLocationPermission();

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const checkLocationPermission = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === 'granted') {
      setLocationGranted(true);
      fetchNearbyMechanics();
    }
  };

  const requestLocationAndFetch = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location access is required to find nearby mechanics.');
      return;
    }
    setLocationGranted(true);
    await fetchNearbyMechanics();
  };

  const fetchNearbyMechanics = async () => {
    setLoading(true);
    try {
      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      setCurrentLocation({ lat: latitude, lon: longitude });
      const response = await rootApi.get('/api/mechanic/get', {
        params: { lat: latitude, lon: longitude },
      });
      setMechanics(response.data);
      if (response.data.length === 0) Alert.alert('No mechanics found');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to fetch mechanics');
    } finally {
      setLoading(false);
    }
  };

  const submitBooking = async () => {
    if (!selectedMechanic || !userId || !currentLocation) {
      Alert.alert('Error', 'Missing information');
      return;
    }
    if (!problem.trim()) {
      Alert.alert('Problem Required', 'Please describe your vehicle problem.');
      return;
    }

    // ✅ Set the mechanic name BEFORE showing the waiting modal
    setSelectedMechanicName(selectedMechanic.name || 'Mechanic');

    setBookingLoading(true);
    try {
      const response = await rootApi.post('/api/booking/mechanic', {
        userId,
        mechanicId: selectedMechanic.id,
        problem: problem.trim(),
        lat: currentLocation.lat,
        lon: currentLocation.lon,
      });
      const newBooking = response.data;
      const bookingId = newBooking.id || newBooking.bookingId || newBooking.booking_id;
      if (bookingId) setPendingBookingId(bookingId);
      else setPendingBookingId(Date.now());
      setModalVisible(false);
      setWaitingModalVisible(true);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to book mechanic');
    } finally {
      setBookingLoading(false);
    }
  };

  const cancelWaitingBooking = async () => {
    if (!pendingBookingId) return;
    try {
      await rootApi.post(`/api/booking/cancel/${pendingBookingId}`);
      setWaitingModalVisible(false);
      setPendingBookingId(null);
      Alert.alert('Cancelled', 'Booking request cancelled.');
    } catch (err) {
      Alert.alert('Error', 'Could not cancel booking');
    }
  };

  useEffect(() => {
    if (lastBookingNotification && lastBookingNotification.status === 'ACCEPTED') {
      setWaitingModalVisible(false);
      const mechanic = mechanics.find(m => m.id === lastBookingNotification.mechanicId);
      setActiveBooking({
        bookingId: lastBookingNotification.bookingId,
        mechanicId: lastBookingNotification.mechanicId,
        mechanicName: mechanic?.name || 'Mechanic',
        status: 'ACCEPTED',
      });
      setPendingBookingId(null);
      router.push('/tracking');
    }
  }, [lastBookingNotification]);

  useEffect(() => {
    if (lastBookingNotification && lastBookingNotification.status === 'REJECTED') {
      const bookingId = lastBookingNotification.bookingId;
      
      if (processedRejections.current.has(bookingId)) {
        return;
      }
      
      processedRejections.current.add(bookingId);
      
      if (waitingModalVisible) {
        setWaitingModalVisible(false);
      }
      setPendingBookingId(null);
      Alert.alert(
        'Booking Rejected',
        lastBookingNotification.problem || 'Your booking request was rejected by the mechanic.'
      );
    }
  }, [lastBookingNotification, waitingModalVisible]);

  const AnimatedCard = ({ item, index }: { item: Mechanic; index: number }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const cardFade = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(cardFade, {
        toValue: 1,
        duration: 350,
        delay: index * 80,
        useNativeDriver: true,
      }).start();
    }, []);

    const handlePressIn = () => {
      Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, speed: 50 }).start();
    };
    const handlePressOut = () => {
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50 }).start();
    };

    // Common function to open booking modal
    const openBookingModal = () => {
      setSelectedMechanic(item);
      setProblem('');
      setModalVisible(true);
    };

    return (
      <TouchableWithoutFeedback
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={openBookingModal}  // card tap also opens modal
      >
        <Animated.View
          style={[
            styles.card,
            { opacity: cardFade, transform: [{ scale: scaleAnim }, { translateY: slideAnim }] },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.iconBg}>
              <Wrench size={20} color="#007AFF" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.name}>{item.name}</Text>
              <View style={styles.experienceBadge}>
                <Star size={12} color="#FFA500" fill="#FFA500" />
                <Text style={styles.expText}>{item.exp || '2'} yrs exp</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Phone size={14} color="#64748b" />
              <Text style={styles.detailText}>{item.phoneNo}</Text>
            </View>
            <View style={styles.detailItem}>
              <Navigation size={14} color="#64748b" />
              <Text style={styles.detailText}>{item.distance.toFixed(1)} km</Text>
            </View>
            <View style={styles.detailItem}>
              <Mail size={14} color="#64748b" />
              <Text style={styles.detailText} numberOfLines={1}>{item.email}</Text>
            </View>
          </View>

          {/* Book Now button with its own onPress */}
          <TouchableOpacity
            style={styles.bookButton}
            activeOpacity={0.8}
            onPress={openBookingModal}
          >
            <Text style={styles.bookButtonText}>Book Now →</Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableWithoutFeedback>
    );
  };

  return (
    <View style={styles.container}>
      {!locationGranted && (
        <TouchableOpacity style={styles.locationButton} onPress={requestLocationAndFetch}>
          <MapPin size={20} color="#fff" />
          <Text style={styles.locationButtonText}>Enable Location & Find Mechanics</Text>
        </TouchableOpacity>
      )}

      {loading && <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />}

      {mechanics.length > 0 && (
        <Animated.FlatList
          data={mechanics}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item, index }) => <AnimatedCard item={item} index={index} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          style={{ opacity: fadeAnim }}
        />
      )}

      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Book {selectedMechanic?.name}</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Describe your vehicle problem..."
              value={problem}
              onChangeText={setProblem}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={submitBooking} disabled={bookingLoading}>
                {bookingLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmButtonText}>Confirm</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={waitingModalVisible} transparent={false} animationType="fade">
        <View style={styles.fullScreenWaiting}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.waitingTitle}>Booking Request Sent</Text>
          <Text style={styles.waitingText}>Waiting for {selectedMechanicName} to accept...</Text>
          <TouchableOpacity style={styles.cancelWaitingButton} onPress={cancelWaitingBooking}>
            <Text style={styles.cancelWaitingText}>Cancel Request</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingTop: 12 },
  locationButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 40,
    gap: 8,
    marginBottom: 20,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  locationButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  list: { paddingBottom: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#eef2f6',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  iconBg: {
    backgroundColor: '#eef2ff',
    padding: 8,
    borderRadius: 40,
  },
  headerText: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  experienceBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  expText: { fontSize: 11, color: '#d97706', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 8 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 10 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '45%' },
  detailText: { fontSize: 12, color: '#475569', flexShrink: 1 },
  bookButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    borderRadius: 40,
    alignItems: 'center',
    marginTop: 4,
  },
  bookButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 28, padding: 24, width: '85%', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 10 },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 20, textAlign: 'center', color: '#0f172a' },
  textInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 14, fontSize: 16, minHeight: 100, textAlignVertical: 'top', marginBottom: 24, backgroundColor: '#f8fafc' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 40, alignItems: 'center' },
  cancelButton: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  confirmButton: { backgroundColor: '#007AFF' },
  cancelButtonText: { color: '#475569', fontWeight: '600' },
  confirmButtonText: { color: '#fff', fontWeight: '700' },
  fullScreenWaiting: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', padding: 20 },
  waitingTitle: { fontSize: 26, fontWeight: '800', marginTop: 24, color: '#0f172a' },
  waitingText: { fontSize: 16, color: '#64748b', marginTop: 10, textAlign: 'center' },
  cancelWaitingButton: { marginTop: 48, paddingVertical: 14, paddingHorizontal: 32, backgroundColor: '#ef4444', borderRadius: 40, shadowColor: '#ef4444', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  cancelWaitingText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});