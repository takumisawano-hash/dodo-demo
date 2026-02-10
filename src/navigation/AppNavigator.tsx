import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import OnboardingScreen from '../screens/OnboardingScreen';
import TabNavigator from './TabNavigator';
import ChatScreen from '../screens/ChatScreen';
import { useSlots } from '../context/SlotsContext';

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
  const [initialAgent, setInitialAgent] = useState<typeof AGENT_MAP[keyof typeof AGENT_MAP] | null>(null);
  const { addToSlot } = useSlots();
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

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
      const agent = AGENT_MAP[selectedAgentId];
      addToSlot(agent);
      setInitialAgent(agent); // 初回チャット用にエージェントを保存
    }
    
    setShowOnboarding(false);
  };

  // オンボーディング完了後、エージェントが選択されていたらチャット画面に遷移
  // ※一時的に無効化：まずホーム画面を表示してからチャットに行くようにする
  useEffect(() => {
    if (!showOnboarding && initialAgent && navigationRef.current) {
      // ホーム画面を経由してからチャットに遷移（タブバーを表示するため）
      setTimeout(() => {
        navigationRef.current?.navigate('Main');
        // さらに少し待ってからチャット画面に遷移
        setTimeout(() => {
          navigationRef.current?.navigate('Chat', { agent: initialAgent, isFirstChat: true });
          setInitialAgent(null);
        }, 300);
      }, 100);
    }
  }, [showOnboarding, initialAgent]);

  if (isLoading) {
    return null; // またはスプラッシュスクリーン
  }

  return (
    <NavigationContainer ref={navigationRef}>
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
            <Stack.Screen 
              name="Chat" 
              component={ChatScreen}
              options={{
                headerShown: false,
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
