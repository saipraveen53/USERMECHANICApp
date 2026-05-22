import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { WebSocketProvider } from './(utils)/websocketContex';

export default function RootLayout() {
  return (
    <WebSocketProvider>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen 
          name="index" 
          options={{ 
            headerShown: false,
            title: 'Login'
          }} 
        />
        <Stack.Screen 
          name="(tabs)" 
          options={{ 
            headerShown: false,
            title: 'Main'
          }} 
        />
      </Stack>
    </WebSocketProvider>
  );
}