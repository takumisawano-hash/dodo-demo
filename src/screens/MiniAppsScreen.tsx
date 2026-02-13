import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const MINI_APPS = [
  { id: 'finance', icon: '💰', name: '家計簿', description: '収支を記録', screen: 'Finance' },
  { id: 'calendar', icon: '📅', name: '予定', description: 'スケジュール管理', screen: 'Calendar' },
  { id: 'health', icon: '💪', name: '健康', description: '体重・食事・運動', screen: 'Health' },
  { id: 'tasks', icon: '✅', name: 'タスク', description: 'やることリスト', screen: 'Tasks' },
  { id: 'books', icon: '📚', name: '読書', description: '読んだ本を記録' },
  { id: 'movies', icon: '🎬', name: '映画', description: '観た作品を記録' },
  { id: 'places', icon: '📍', name: '訪問記録', description: '行った場所を記録' },
  { id: 'exercise', icon: '🏃', name: '運動', description: 'ワークアウト記録' },
  { id: 'sleep', icon: '😴', name: '睡眠', description: '睡眠時間を記録' },
  { id: 'medication', icon: '💊', name: '服薬', description: '薬・サプリ管理' },
  { id: 'habits', icon: '🎯', name: '習慣', description: '習慣トラッキング' },
  { id: 'journal', icon: '📝', name: '日記', description: '日々の記録' },
  { id: 'shopping', icon: '🛒', name: '買い物', description: '買い物リスト' },
  { id: 'wishlist', icon: '🎁', name: 'ほしいもの', description: 'ウィッシュリスト' },
  { id: 'travel', icon: '✈️', name: '旅行', description: '旅行計画' },
  { id: 'car', icon: '🚗', name: '車', description: '給油・メンテナンス' },
  { id: 'points', icon: '💳', name: 'ポイント', description: 'ポイントカード' },
  { id: 'baby', icon: '👶', name: '育児', description: '育児記録' },
  { id: 'pet', icon: '🐕', name: 'ペット', description: 'ペット記録' },
  { id: 'plant', icon: '🌱', name: '植物', description: 'ガーデニング' },
];

export default function MiniAppsScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📁 ミニアプリ</Text>
        <Text style={styles.headerSubtitle}>タップして開く、チャットで記録</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.grid}>
        {MINI_APPS.map((app) => (
          <TouchableOpacity
            key={app.id}
            style={styles.appCard}
            onPress={() => {
              if (app.screen) {
                navigation.navigate(app.screen as never);
              }
            }}
          >
            <Text style={styles.appIcon}>{app.icon}</Text>
            <Text style={styles.appName}>{app.name}</Text>
            <Text style={styles.appDesc}>{app.description}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5E6',
  },
  header: {
    padding: 16,
    backgroundColor: '#FF6B35',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  appCard: {
    width: '31%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    margin: '1%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  appIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  appName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  appDesc: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
});
