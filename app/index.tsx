import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { jwtDecode } from 'jwt-decode';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert, ScrollView,
  StyleSheet,
  Text,
  TextInput, TouchableOpacity,
  View
} from 'react-native';

const BASE_URL = 'http://192.168.0.42:8080';

// Interface for decoded token with userId
interface DecodedToken {
  role: Array<{ authority: string }>;
  sub: string;
  userId: number;
  iat: number;
  exp: number;
}

// Interface for user data
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

  // Function to decode and check role, and extract userId
  const checkUserRoleAndGetId = (token: string): { isValid: boolean; userId?: number } => {
    try {
      // Decode the token
      const decoded: DecodedToken = jwtDecode(token);
      console.log('Decoded Token:', decoded);
      
      // Check if user has ROLE_USER authority
      const hasUserRole = decoded.role?.some(
        role => role.authority === 'ROLE_USER'
      );
      
      if (hasUserRole) {
        // Extract userId from token claims
        const userId = decoded.userId;
        console.log('Extracted userId from token:', userId);
        return { isValid: true, userId };
      } else {
        // Check if it's ADMIN or MECHANIC
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

  // Store user data after login
  const storeUserData = async (token: string, userId: number) => {
    try {
      await AsyncStorage.setItem('authToken', token);
      
      // Store userId
      await AsyncStorage.setItem('userId', userId.toString());
      console.log('Stored userId:', userId);
      
      // Store decoded user info
      const decoded: DecodedToken = jwtDecode(token);
      await AsyncStorage.setItem('userRole', decoded.role?.[0]?.authority || '');
      await AsyncStorage.setItem('userEmail', decoded.sub);
      
      // Store user object
      const userData: UserData = {
        id: userId,
        email: decoded.sub,
        role: 'USER'
      };
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      
      console.log('User data stored successfully. userId:', userId);
    } catch (error) {
      console.log('Error storing user data:', error);
    }
  };

  // User Registration
  const handleUserRegister = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/register`, {
        email: email,
        password: password
      });
      
      console.log('User Registration Response:', response.data);
      Alert.alert('Success', 'User registered successfully! Please login.');
      setIsLogin(true);
      clearForm();
    } catch (error: any) {
      console.log('Registration Error:', error);
      if (error.response?.data?.message) {
        Alert.alert('Error', error.response.data.message);
      } else if (error.response?.data) {
        Alert.alert('Error', error.response.data);
      } else {
        Alert.alert('Error', 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Mechanic Registration
  const handleMechanicRegister = async () => {
    if (!name || !email || !password || !phone) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/mechRegister`, {
        name: name,
        email: email,
        password: password,
        phone: phone,
        latitude: 17.385044,
        longitude: 78.486671
      });
      
      console.log('Mechanic Registration Response:', response.data);
      Alert.alert('Success', 'Mechanic registered successfully! Please wait for admin approval.');
      setIsLogin(true);
      clearForm();
    } catch (error: any) {
      console.log('Mechanic Registration Error:', error);
      if (error.response?.data?.message) {
        Alert.alert('Error', error.response.data.message);
      } else if (error.response?.data) {
        Alert.alert('Error', error.response.data);
      } else {
        Alert.alert('Error', 'Mechanic registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Login API - Check role and navigate
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: email,
        password: password
      });
      
      console.log('Login Response:', response.data);
      
      const token = response.data;
      
      if (!token) {
        Alert.alert('Error', 'No token received from server');
        setLoading(false);
        return;
      }
      
      // Check user role and get userId from token
      const { isValid, userId } = checkUserRoleAndGetId(token);
      
      if (isValid && userId) {
        // Store token and user data with userId
        await storeUserData(token, userId);
        
        Alert.alert('Success', 'Logged in successfully!', [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/(tabs)/home');
            }
          }
        ]);
      } else {
        setLoading(false);
      }
      
    } catch (error: any) {
      console.log('Login Error:', error);
      
      if (error.response?.status === 401) {
        Alert.alert('Login Failed', 'Invalid email or password');
      } else if (error.response?.status === 403) {
        Alert.alert('Login Failed', 'Account not approved yet. Please wait for admin approval.');
      } else if (error.response?.data) {
        Alert.alert('Login Failed', error.response.data);
      } else if (error.message) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'Network error. Please check your connection.');
      }
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
    
    if (isLogin) {
      handleLogin();
    } else {
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
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>
          {isLogin ? 'Login' : (isMechanic ? 'Mechanic Registration' : 'User Registration')}
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
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {isLogin ? 'Login' : 'Register'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => {
            setIsLogin(!isLogin);
            clearForm();
            setIsMechanic(false);
          }}
        >
          <Text style={styles.switchText}>
            {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  formContainer: {
    padding: 20,
    marginTop: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 4,
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
  },
  switchText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#007AFF',
    fontSize: 16,
  },
});

export default Index;