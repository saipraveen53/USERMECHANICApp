import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

export default function HistoryScreen() {
  // Sample data - replace with actual API data
  const bookings = [
    { id: '1', mechanic: 'John Garage', date: '2024-01-15', status: 'Completed' },
    { id: '2', mechanic: 'Mike Auto', date: '2024-01-10', status: 'Completed' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Booking History</Text>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.mechanicName}>{item.mechanic}</Text>
            <Text style={styles.date}>{item.date}</Text>
            <Text style={styles.status}>{item.status}</Text>
          </View>
        )}
      />
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mechanicName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  status: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 5,
  },
});