import { Ionicons } from '@expo/vector-icons';
import { Drawer } from 'expo-router/drawer';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import PendingOrderFAB from '../components/PendingOrderFAB'; // ← kotha line

export default function DrawerLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Drawer
          screenOptions={{
            headerShown: true,
            drawerActiveTintColor: '#007AFF',
            drawerInactiveTintColor: '#666',
            headerStyle: { backgroundColor: '#fff' },
            headerTintColor: '#000',
          }}
        >
          <Drawer.Screen name="(tabs)" options={{ drawerLabel: 'Home', title: 'Home', drawerIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }} />
          <Drawer.Screen name="extra-stack" options={{ drawerLabel: 'Extra', title: 'Extra', drawerIcon: ({ color, size }) => <Ionicons name="star-outline" size={size} color={color} /> }} />
          <Drawer.Screen name="screen" options={{ drawerLabel: 'Screen 3', title: 'Screen 3', drawerIcon: ({ color, size }) => <Ionicons name="star-outline" size={size} color={color} /> }} />
        </Drawer>
        {/* Global FAB */}
        <PendingOrderFAB />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
});