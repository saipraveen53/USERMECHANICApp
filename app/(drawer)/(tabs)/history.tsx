import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { rootApi } from '../../(utils)/axiosInstance';

interface BookingHistoryItem {
  bookingId: number;
  bookedTime: string;
  problem: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED';
  mechanicName: string;
  mechanicPhone: string;
  totalAmount: number;
}

type StatusFilter = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED';

export default function HistoryScreen() {
  const [bookings, setBookings] = useState<BookingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING'); // Default: PENDING

  useEffect(() => {
    fetchHistory();
  }, [statusFilter]);

  const fetchHistory = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const params: { status: string } = {
        status: statusFilter, // Always send status (no 'ALL' case)
      };
      const response = await rootApi.get('/api/user/history', { params });
      setBookings(response.data);
    } catch (err: any) {
      console.error('Failed to fetch history:', err);
      setError(err.response?.data?.message || 'Failed to load booking history');
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return '#28a745';
      case 'ACCEPTED':
      case 'IN_PROGRESS':
        return '#007AFF';
      case 'PENDING':
        return '#FFA500';
      case 'REJECTED':
        return '#FF3B30';
      default:
        return '#666';
    }
  };

  const renderItem = ({ item }: { item: BookingHistoryItem }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.mechanicName}>{item.mechanicName || 'Mechanic'}</Text>
        <Text style={[styles.status, { color: getStatusColor(item.status) }]}>{item.status}</Text>
      </View>
      <Text style={styles.problem} numberOfLines={2}>
        Problem: {item.problem}
      </Text>
      <Text style={styles.date}>{formatDate(item.bookedTime)}</Text>
      {item.totalAmount > 0 && (
        <Text style={styles.amount}>Amount: ₹{item.totalAmount.toFixed(2)}</Text>
      )}
      {item.mechanicPhone && (
        <Text style={styles.phone}>📞 {item.mechanicPhone}</Text>
      )}
    </View>
  );

  const filterTabs: { label: string; value: StatusFilter }[] = [
    { label: 'Pending', value: 'PENDING' },
    { label: 'Accepted', value: 'ACCEPTED' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Rejected', value: 'REJECTED' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Booking History</Text>

      {/* Filter tabs (no reset button) */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filterTabs}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterTab, statusFilter === item.value && styles.activeFilterTab]}
              onPress={() => setStatusFilter(item.value)}
            >
              <Text style={[styles.filterText, statusFilter === item.value && styles.activeFilterText]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchHistory()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No bookings found</Text>
          <Text style={styles.emptySubtext}>
            No {statusFilter.toLowerCase()} bookings
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.bookingId.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007AFF']} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    margin: 20,
    marginBottom: 10,
    color: '#1e293b',
  },
  filterContainer: {
    marginBottom: 12,
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activeFilterTab: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#fff',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mechanicName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
  },
  problem: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  amount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 4,
  },
  phone: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
  },
});