import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import OnboardingScreen from '../screens/OnboardingScreen';
import TabNavigator from './TabNavigator';
// TODO: ChatScreen実装後にimport
// import ChatScreen from '../screens/ChatScreen';

const Stack = createNativeStackNavigator();

const ONBOARDING_KEY = '@dodo_onboarding_complete';

export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_KEY);
      setShowOnboarding(value !== 'true');
    } catch (error) {
      // AsyncStorageが使えない場合（Web等）はオンボーディングを表示
      console.log('AsyncStorage not available, showing onboarding');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingComplete = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (error) {
      console.log('Could not save onboarding status');
    }
    setShowOnboarding(false);
  };

  if (isLoading) {
    return null; // またはスプラッシュスクリーン
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {showOnboarding ? (
          <Stack.Screen name="Onboarding">
            {(props) => (
              <OnboardingScreen
                {...props}
                onComplete={handleOnboardingComplete}
              />
            )}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            {/* 
            TODO: ChatScreen実装後に追加
            <Stack.Screen 
              name="Chat" 
              component={ChatScreen}
              options={{
                headerShown: true,
                headerBackTitle: '戻る',
              }}
            /> 
            */}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
