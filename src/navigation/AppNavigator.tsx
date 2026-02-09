import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import OnboardingScreen from '../screens/OnboardingScreen';
import TabNavigator from './TabNavigator';
import { useSlots } from '../context/SlotsContext';
// TODO: ChatScreen実装後にimport
// import ChatScreen from '../screens/ChatScreen';

const Stack = createNativeStackNavigator();

const ONBOARDING_KEY = '@dodo_onboarding_complete';

// エージェントIDからエージェント情報を取得するマップ
const AGENT_MAP: Record<string, { id: string; name: string; role: string; color: string; emoji: string; description: string; killerFeature: string; isSubscribed: boolean }> = {
  'diet-coach': { id: 'diet-coach', name: 'ドードー', role: 'ダイエット', color: '#FF9800', emoji: '🦤', description: '無理なく続く食事管理', killerFeature: '週間食事プラン', isSubscribed: false },
  'sleep-coach': { id: 'sleep-coach', name: 'コアラ', role: '睡眠', color: '#90A4AE', emoji: '🐨', description: 'ぐっすり眠れる', killerFeature: '睡眠スコア', isSubscribed: false },
  'mental-coach': { id: 'mental-coach', name: 'スワン', role: 'メンタル', color: '#F48FB1', emoji: '🦢', description: '心の健康ケア', killerFeature: '気分トラッカー', isSubscribed: false },
};

export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const { addToSlot } = useSlots();

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

  const handleOnboardingComplete = async (selectedAgentId?: string) => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (error) {
      console.log('Could not save onboarding status');
    }
    
    // 選択されたエージェントをスロットに追加
    if (selectedAgentId && AGENT_MAP[selectedAgentId]) {
      addToSlot(AGENT_MAP[selectedAgentId]);
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
