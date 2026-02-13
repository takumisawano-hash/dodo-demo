import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';

// Screens
import ChatScreen from '../screens/ChatScreen';
import DashboardScreen from '../screens/DashboardScreen';
import MiniAppsScreen from '../screens/MiniAppsScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Mini App Screens
import FinanceScreen from '../screens/miniapps/FinanceScreen';
import CalendarScreen from '../screens/miniapps/CalendarScreen';
import HealthScreen from '../screens/miniapps/HealthScreen';
import TasksScreen from '../screens/miniapps/TasksScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Chat: '🦤',
    Dashboard: '📊',
    MiniApps: '📁',
    Settings: '⚙️',
  };
  return (
    <Text style={{ fontSize: 24, opacity: focused ? 1 : 0.5 }}>
      {icons[name] || '📱'}
    </Text>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Chat" component={ChatScreen} options={{ title: 'チャット' }} />
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'ダッシュボード' }} />
      <Tab.Screen name="MiniApps" component={MiniAppsScreen} options={{ title: 'アプリ' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: '設定' }} />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="Finance" component={FinanceScreen} options={{ title: '💰 家計簿' }} />
        <Stack.Screen name="Calendar" component={CalendarScreen} options={{ title: '📅 予定' }} />
        <Stack.Screen name="Health" component={HealthScreen} options={{ title: '💪 健康' }} />
        <Stack.Screen name="Tasks" component={TasksScreen} options={{ title: '✅ タスク' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
