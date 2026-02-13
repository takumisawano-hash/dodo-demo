import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.greeting}>🦤 おはよう！</Text>
          <Text style={styles.date}>2026年2月13日（木）</Text>
        </View>

        {/* 今日のサマリー */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 今日のサマリー</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryIcon}>💰</Text>
              <Text style={styles.summaryValue}>¥2,340</Text>
              <Text style={styles.summaryLabel}>今日の支出</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryIcon}>📅</Text>
              <Text style={styles.summaryValue}>3件</Text>
              <Text style={styles.summaryLabel}>今日の予定</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryIcon}>✅</Text>
              <Text style={styles.summaryValue}>2/5</Text>
              <Text style={styles.summaryLabel}>タスク</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryIcon}>🔥</Text>
              <Text style={styles.summaryValue}>7日</Text>
              <Text style={styles.summaryLabel}>継続日数</Text>
            </View>
          </View>
        </View>

        {/* 今日の予定 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 今日の予定</Text>
          <View style={styles.eventCard}>
            <View style={[styles.eventColor, { backgroundColor: '#4CAF50' }]} />
            <View style={styles.eventContent}>
              <Text style={styles.eventTime}>14:00</Text>
              <Text style={styles.eventTitle}>歯医者</Text>
            </View>
          </View>
          <View style={styles.eventCard}>
            <View style={[styles.eventColor, { backgroundColor: '#2196F3' }]} />
            <View style={styles.eventContent}>
              <Text style={styles.eventTime}>18:00</Text>
              <Text style={styles.eventTitle}>ジム</Text>
            </View>
          </View>
        </View>

        {/* 健康 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💪 健康</Text>
          <View style={styles.healthCard}>
            <View style={styles.healthItem}>
              <Text style={styles.healthIcon}>⚖️</Text>
              <Text style={styles.healthValue}>62.5kg</Text>
              <Text style={styles.healthChange}>-0.3kg</Text>
            </View>
            <View style={styles.healthItem}>
              <Text style={styles.healthIcon}>🔥</Text>
              <Text style={styles.healthValue}>1,245</Text>
              <Text style={styles.healthLabel}>kcal</Text>
            </View>
            <View style={styles.healthItem}>
              <Text style={styles.healthIcon}>💧</Text>
              <Text style={styles.healthValue}>4/8</Text>
              <Text style={styles.healthLabel}>杯</Text>
            </View>
          </View>
        </View>

        {/* やることリスト */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✅ やること</Text>
          {['牛乳を買う', 'レポート提出', '部屋の掃除'].map((task, i) => (
            <TouchableOpacity key={i} style={styles.taskItem}>
              <View style={styles.taskCheckbox} />
              <Text style={styles.taskText}>{task}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
    padding: 20,
    backgroundColor: '#FF6B35',
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  date: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  eventColor: {
    width: 4,
  },
  eventContent: {
    flex: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 16,
  },
  eventTitle: {
    fontSize: 16,
    color: '#333',
  },
  healthCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  healthItem: {
    alignItems: 'center',
  },
  healthIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  healthValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  healthChange: {
    fontSize: 12,
    color: '#4CAF50',
  },
  healthLabel: {
    fontSize: 12,
    color: '#666',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  taskCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF6B35',
    marginRight: 12,
  },
  taskText: {
    fontSize: 16,
    color: '#333',
  },
});
