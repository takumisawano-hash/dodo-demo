import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';

// Simple placeholder screens
function ChatScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🦤</Text>
      <Text style={styles.title}>DoDo Life</Text>
      <Text style={styles.subtitle}>チャット画面</Text>
    </View>
  );
}

function DashboardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>📊</Text>
      <Text style={styles.title}>ダッシュボード</Text>
    </View>
  );
}

function AppsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>📁</Text>
      <Text style={styles.title}>ミニアプリ</Text>
      <Text style={styles.subtitle}>20個のアプリ</Text>
    </View>
  );
}

function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>⚙️</Text>
      <Text style={styles.title}>設定</Text>
    </View>
  );
}

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: '#FF6B35',
          }}
        >
          <Tab.Screen 
            name="Chat" 
            component={ChatScreen}
            options={{
              tabBarLabel: 'チャット',
              tabBarIcon: () => <Text>🦤</Text>,
            }}
          />
          <Tab.Screen 
            name="Dashboard" 
            component={DashboardScreen}
            options={{
              tabBarLabel: 'ダッシュボード',
              tabBarIcon: () => <Text>📊</Text>,
            }}
          />
          <Tab.Screen 
            name="Apps" 
            component={AppsScreen}
            options={{
              tabBarLabel: 'アプリ',
              tabBarIcon: () => <Text>📁</Text>,
            }}
          />
          <Tab.Screen 
            name="Settings" 
            component={SettingsScreen}
            options={{
              tabBarLabel: '設定',
              tabBarIcon: () => <Text>⚙️</Text>,
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
});
