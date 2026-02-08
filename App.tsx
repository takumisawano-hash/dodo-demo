import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { SlotsProvider } from './src/context/SlotsContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <SlotsProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </SlotsProvider>
    </SafeAreaProvider>
  );
}
