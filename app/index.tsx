import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { jwtDecode } from 'jwt-decode';
import React, { useState } from 'react';
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
import { useAuth } from './(utils)/AuthContext';

const BASE_URL = 'https://live-tracking-kpuj.onrender.com';

interface DecodedToken {
  role: Array<{ authority: string }>;
  sub: string;
  userId: number;
  iat: number;
  exp: number;
}

interface UserData {
  id?: number;
  email?: string;
  name?: string;
  phone?: string;
  role?: string;
}

const Index = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isMechanic, setIsMechanic] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const { setIsAuthenticated } = useAuth();

  const checkUserRoleAndGetId = (token: string): { isValid: boolean; userId?: number } => {
    try {
      const decoded: DecodedToken = jwtDecode(token);
      console.log('Decoded Token:', decoded);
      const hasUserRole = decoded.role?.some(role => role.authority === 'ROLE_USER');
      if (hasUserRole) {
        const userId = decoded.userId;
        console.log('Extracted userId from token:', userId);
        return { isValid: true, userId };
      } else {
        const roleName = decoded.role?.[0]?.authority || 'Unknown';
        Alert.alert(
          'Access Denied',
          `You are logged in as ${roleName}. This app is only for regular users. Please use the appropriate app.`
        );
        return { isValid: false };
      }
    } catch (error) {
      console.log('Token decode error:', error);
      Alert.alert('Error', 'Invalid token format');
      return { isValid: false };
    }
  };

  const storeUserData = async (token: string, userId: number) => {
    try {
      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('userId', userId.toString());
      const decoded: DecodedToken = jwtDecode(token);
      await AsyncStorage.setItem('userRole', decoded.role?.[0]?.authority || '');
      await AsyncStorage.setItem('userEmail', decoded.sub);
      const userData: UserData = { id: userId, email: decoded.sub, role: 'USER' };
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      console.log('User data stored successfully. userId:', userId);
    } catch (error) {
      console.log('Error storing user data:', error);
    }
  };

  const handleUserRegister = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${BASE_URL}/api/auth/register`, { email, password });
      Alert.alert('Success', 'User registered successfully! Please login.');
      setIsLogin(true);
      clearForm();
    } catch (error: any) {
      console.log('Registration Error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleMechanicRegister = async () => {
    if (!name || !email || !password || !phone) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${BASE_URL}/api/auth/mechRegister`, {
        name,
        email,
        password,
        phone,
        latitude: 17.385044,
        longitude: 78.486671,
      });
      Alert.alert('Success', 'Mechanic registered successfully! Please wait for admin approval.');
      setIsLogin(true);
      clearForm();
    } catch (error: any) {
      console.log('Mechanic Registration Error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/login`, { email, password });
      const token = response.data;
      if (!token) {
        Alert.alert('Error', 'No token received');
        setLoading(false);
        return;
      }
      const { isValid, userId } = checkUserRoleAndGetId(token);
      if (isValid && userId) {
        await storeUserData(token, userId);
        setIsAuthenticated(true);
        Alert.alert('Success', 'Logged in successfully!', [
          { text: 'OK', onPress: () => router.replace('/(drawer)/(tabs)/home') },
        ]);
      } else {
        setLoading(false);
      }
    } catch (error: any) {
      console.log('Login Error:', error);
      if (error.response?.status === 401) Alert.alert('Login Failed', 'Invalid email or password');
      else if (error.response?.status === 403) Alert.alert('Login Failed', 'Account not approved yet.');
      else Alert.alert('Error', error.response?.data || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setPhone('');
  };

  const handleSubmit = () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    if (isLogin) handleLogin();
    else {
      if (isMechanic) {
        if (!name || !phone) {
          Alert.alert('Error', 'Please fill all fields');
          return;
        }
        handleMechanicRegister();
      } else {
        handleUserRegister();
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>
            {isLogin ? 'Login' : isMechanic ? 'Mechanic Registration' : 'User Registration'}
          </Text>

          {!isLogin && isMechanic && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={name}
                onChangeText={setName}
              />
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </>
          )}

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {!isLogin && (
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setIsMechanic(!isMechanic)}
            >
              <View style={[styles.checkbox, isMechanic && styles.checkboxChecked]} />
              <Text style={styles.checkboxLabel}>Register as Mechanic</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{isLogin ? 'Login' : 'Register'}</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setIsLogin(!isLogin);
              clearForm();
              setIsMechanic(false);
            }}
          >
            <Text style={styles.switchText}>
              {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center' },
  formContainer: { padding: 20, marginTop: 40 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 30, color: '#333' },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  button: { backgroundColor: '#007AFF', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 10 },
  buttonDisabled: { backgroundColor: '#999' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  checkbox: { width: 20, height: 20, borderWidth: 2, borderColor: '#007AFF', borderRadius: 4, marginRight: 10 },
  checkboxChecked: { backgroundColor: '#007AFF' },
  checkboxLabel: { fontSize: 16, color: '#333' },
  switchText: { textAlign: 'center', marginTop: 20, color: '#007AFF', fontSize: 16 },
});

export default Index;