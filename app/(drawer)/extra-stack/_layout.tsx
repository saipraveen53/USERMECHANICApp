import { Stack } from 'expo-router';

export default function ExtraStackLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Extra Screen',
          headerShown:false,
          headerBackTitle: 'Back',
        }}
      />


      <Stack.Screen
        name="tracking"
        options={{
          title: 'Tracking',
          headerShown:false,
          headerBackTitle: 'Back',
        }}
      />
      
    </Stack>
  );
}