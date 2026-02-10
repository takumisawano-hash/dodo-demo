import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '../screens/ChatScreen';
import DashboardScreen from '../screens/DashboardScreen';
import AgentDashboardScreen from '../screens/AgentDashboardScreen';
import AgentDetailScreen from '../screens/AgentDetailScreen';
import AgentProfileScreen from '../screens/AgentProfileScreen';
import MySlotsScreen from '../screens/MySlotsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PricingScreen from '../screens/PricingScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import ProfileScreen from '../screens/ProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import RemindersScreen from '../screens/RemindersScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const DashboardStack = createNativeStackNavigator();
const MySlotsStack = createNativeStackNavigator();
const SettingsStack = createNativeStackNavigator();

// タブアイコンコンポーネント
interface TabIconProps {
  emoji: string;
  focused: boolean;
  color: string;
}

function TabIcon({ emoji, focused }: TabIconProps) {
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
      <Text style={[styles.iconEmoji, focused && styles.iconEmojiFocused]}>
        {emoji}
      </Text>
    </View>
  );
}

// Home Stack
function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen as any} />
      <HomeStack.Screen name="Chat" component={ChatScreen as any} />
      <HomeStack.Screen name="AgentDetail" component={AgentDetailScreen as any} />
      <HomeStack.Screen name="AgentProfile" component={AgentProfileScreen as any} />
    </HomeStack.Navigator>
  );
}

// Dashboard Stack
function DashboardStackScreen() {
  return (
    <DashboardStack.Navigator>
      <DashboardStack.Screen 
        name="DashboardMain" 
        component={DashboardScreen as any}
        options={{ headerShown: false }}
      />
      <DashboardStack.Screen 
        name="AgentDashboard" 
        component={AgentDashboardScreen as any}
        options={({ route }: any) => ({ 
          title: route.params?.agentName || '詳細' 
        })}
      />
      <DashboardStack.Screen 
        name="Chat" 
        component={ChatScreen as any}
        options={{ headerShown: false }}
      />
    </DashboardStack.Navigator>
  );
}

// MySlots Stack
function MySlotsStackScreen() {
  return (
    <MySlotsStack.Navigator screenOptions={{ headerShown: false }}>
      <MySlotsStack.Screen name="MySlotsMain" component={MySlotsScreen as any} />
      <MySlotsStack.Screen name="Pricing" component={PricingScreen as any} />
      <MySlotsStack.Screen name="Chat" component={ChatScreen as any} />
      <MySlotsStack.Screen name="AgentProfile" component={AgentProfileScreen as any} />
    </MySlotsStack.Navigator>
  );
}

// Settings Stack
function SettingsStackScreen() {
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name="SettingsMain" component={SettingsScreen as any} />
      <SettingsStack.Screen name="Pricing" component={PricingScreen as any} />
      <SettingsStack.Screen name="Subscription" component={SubscriptionScreen as any} />
      <SettingsStack.Screen name="Profile" component={ProfileScreen as any} />
      <SettingsStack.Screen name="Notifications" component={NotificationsScreen as any} />
      <SettingsStack.Screen name="Reminders" component={RemindersScreen as any} />
    </SettingsStack.Navigator>
  );
}

export default function TabNavigator() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          ...styles.tabBar,
          paddingBottom: Math.max(insets.bottom, 20),
          height: 70 + Math.max(insets.bottom, 20),
        },
        tabBarActiveTintColor: '#FF9800',
        tabBarInactiveTintColor: '#999',
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackScreen}
        options={{
          tabBarLabel: 'ホーム',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="🏠" focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="DashboardTab"
        component={DashboardStackScreen}
        options={{
          tabBarLabel: 'ダッシュボード',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="📊" focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MySlotsTab"
        component={MySlotsStackScreen}
        options={{
          tabBarLabel: 'マイスロット',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="👑" focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStackScreen}
        options={{
          tabBarLabel: '設定',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="⚙️" focused={focused} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 10,
    paddingBottom: 20,
    height: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 12,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  iconContainerFocused: {
    backgroundColor: '#FFF3E0',
  },
  iconEmoji: {
    fontSize: 24,
    opacity: 0.6,
  },
  iconEmojiFocused: {
    fontSize: 26,
    opacity: 1,
  },
});
