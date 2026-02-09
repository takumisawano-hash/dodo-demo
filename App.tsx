import React, { useEffect, useCallback } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { SlotsProvider } from './src/context/SlotsContext';
import { ThemeProvider, useTheme } from './src/theme';
import { useNotifications, notificationService } from './src/services/notifications';

function AppContent() {
  const { isDark } = useTheme();

  // Handle notification responses (when user taps notification)
  const handleNotificationResponse = useCallback((response: any) => {
    const data = response.notification.request.content.data;
    console.log('Notification tapped:', data);
    // Navigation handling can be added here based on data.screen
  }, []);

  // Initialize notifications
  useNotifications(undefined, handleNotificationResponse);

  useEffect(() => {
    // Initialize notification service on app start
    notificationService.initialize();
  }, []);

  return (
    <>
      <AppNavigator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SlotsProvider>
          <AppContent />
        </SlotsProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
