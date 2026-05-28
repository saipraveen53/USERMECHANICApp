import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../(utils)/AuthContext';
import { rootApi } from '../../(utils)/axiosInstance';
import { useWebSocket } from '../../(utils)/websocketContex';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  phone: string;
  experience: string;
  isAvailable: boolean;
  latitude: number;
  longitude: number;
  approvalStatus: boolean;
}

export default function ProfileScreen() {
  const { isConnected, disconnect } = useWebSocket();
  const { logout } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editExperience, setEditExperience] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await rootApi.get('/api/user/profile');
      const userData = response.data as UserProfile;
      setProfile(userData);
      setEditName(userData.name || '');
      setEditPhone(userData.phone || '');
      setEditExperience(userData.experience || '');
    } catch (error: any) {
      console.error('Failed to fetch profile:', error);
      Alert.alert('Error', error.response?.data?.message || 'Could not load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const payload: any = {
        name: editName,
        phoneNo: editPhone,
      };
      if (profile.role === 'MECHANIC') {
        payload.experience = editExperience;
      }
      await rootApi.put('/api/user/profile/update', payload);
      Alert.alert('Success', 'Profile updated successfully');
      setEditMode(false);
      await fetchProfile();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
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
            disconnect();
            await logout();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Failed to load profile</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchProfile}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Profile Card */}
          <View style={styles.profileCard}>
            {!editMode ? (
              <>
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{profile.name?.charAt(0) || 'U'}</Text>
                </View>
                <View style={styles.infoSection}>
                  {/* WebSocket status row */}
                  <View style={styles.statusRow}>
                    <Text style={styles.label}>Connection</Text>
                    <View style={styles.statusBadge}>
                      <View style={[styles.statusDot, isConnected ? styles.statusConnected : styles.statusDisconnected]} />
                      <Text style={[styles.statusText, isConnected ? styles.connected : styles.disconnected]}>
                        {isConnected ? 'Connected' : 'Disconnected'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.divider} />

                  <View style={styles.detailRow}>
                    <Text style={styles.label}>Name</Text>
                    <Text style={styles.value}>{profile.name || '—'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.label}>Email</Text>
                    <Text style={styles.value}>{profile.email}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.label}>Phone</Text>
                    <Text style={styles.value}>{profile.phone || '—'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.label}>Role</Text>
                    <Text style={styles.value}>{profile.role}</Text>
                  </View>
                  {profile.role === 'MECHANIC' && (
                    <>
                      <View style={styles.detailRow}>
                        <Text style={styles.label}>Experience</Text>
                        <Text style={styles.value}>{profile.experience ? `${profile.experience} yrs` : '—'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.label}>Availability</Text>
                        <Text style={[styles.value, profile.isAvailable ? styles.available : styles.unavailable]}>
                          {profile.isAvailable ? 'Available' : 'Unavailable'}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.label}>Approval</Text>
                        <Text style={[styles.value, profile.approvalStatus ? styles.approved : styles.pending]}>
                          {profile.approvalStatus ? 'Approved' : 'Pending'}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
                <TouchableOpacity style={styles.editButton} onPress={() => setEditMode(true)}>
                  <Text style={styles.editButtonText}>Edit Profile</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.editTitle}>Edit Profile</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  value={editName}
                  onChangeText={setEditName}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number"
                  value={editPhone}
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                />
                {profile.role === 'MECHANIC' && (
                  <TextInput
                    style={styles.input}
                    placeholder="Experience (years)"
                    value={editExperience}
                    onChangeText={setEditExperience}
                    keyboardType="numeric"
                  />
                )}
                <View style={styles.editActions}>
                  <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={() => setEditMode(false)}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.saveButton]}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveButtonText}>Save</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 40,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eef2ff',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#3b82f6',
  },
  infoSection: {
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusConnected: {
    backgroundColor: '#22c55e',
  },
  statusDisconnected: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  connected: {
    color: '#22c55e',
  },
  disconnected: {
    color: '#ef4444',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748b',
  },
  value: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0f172a',
    maxWidth: '60%',
    textAlign: 'right',
  },
  available: { color: '#22c55e' },
  unavailable: { color: '#ef4444' },
  approved: { color: '#22c55e' },
  pending: { color: '#f59e0b' },
  editButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 40,
    alignItems: 'center',
    marginTop: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  editTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
    color: '#0f172a',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
    color: '#0f172a',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 40,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  saveButton: {
    backgroundColor: '#22c55e',
  },
  cancelButtonText: {
    color: '#475569',
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#fee2e2',
    paddingVertical: 14,
    borderRadius: 40,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '700',
  },
});