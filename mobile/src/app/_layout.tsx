import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { HabitProvider } from '@/context/HabitContext';
import '../global.css';

export default function RootLayout() {
  return (
    <HabitProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#0f172a',
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: '#020617',
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'HabitPulse',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="add"
          options={{
            title: 'New Habit',
            presentation: 'modal',
            headerShown: false,
          }}
        />
      </Stack>
    </HabitProvider>
  );
}
