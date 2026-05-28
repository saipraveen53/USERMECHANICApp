import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './(utils)/AuthContext';
import { BookingProvider } from './(utils)/BookingContext';
import { NotificationProvider } from './(utils)/NotificationContext'; // <-- add this
import { WebSocketProvider } from './(utils)/websocketContex';

export default function RootLayout() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <BookingProvider>
          <NotificationProvider>   {/* <-- wrap here (order doesn't matter) */}
            <StatusBar style="auto" />
            <Stack>
              <Stack.Screen name="index" options={{ headerShown: false, title: 'Login' }} />
              <Stack.Screen name="(drawer)" options={{ headerShown: false, title: 'Main' }} />
              <Stack.Screen name="testing" options={{ headerShown: false }} />
              <Stack.Screen name="CompletedScreen" options={{ headerShown: false }} />
              <Stack.Screen name="tracking" options={{ headerShown: false }} />
            </Stack>
          </NotificationProvider>
        </BookingProvider>
      </WebSocketProvider>
    </AuthProvider>
  );
}