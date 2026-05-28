import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useBooking } from '../(utils)/BookingContext';
import { useWebSocket } from '../(utils)/websocketContex';

export default function PendingOrderFAB() {
  const { activeBooking } = useBooking();
  const { lastLocationUpdate } = useWebSocket();
  const router = useRouter();
  const pathname = usePathname();

  // Show only if:
  // 1. activeBooking exists (ACCEPTED)
  // 2. mechanic location update received
  // 3. NOT already on tracking screen
  const shouldShow =
    activeBooking &&
    lastLocationUpdate &&
    pathname !== '/tracking';   // ← fixed the path

  if (!shouldShow) return null;

  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={() => router.push('/tracking')}
      activeOpacity={0.8}
    >
      <Text style={styles.fabText}>🔧 Pending Order</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 40,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 1000,
  },
  fabText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});