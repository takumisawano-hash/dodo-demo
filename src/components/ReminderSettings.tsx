/**
 * DoDo Life - リマインダー設定画面コンポーネント
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { useSmartReminders, MiniAppType } from '../services/smartReminders';
import DateTimePicker from '@react-native-community/datetimepicker';

// ミニアプリの設定情報
const MINI_APP_INFO: Record<MiniAppType, { name: string; icon: string; description: string }> = {
  meal: { name: '食事記録', icon: '🍽️', description: '朝8時・昼13時・夜19時' },
  weight: { name: '体重記録', icon: '⚖️', description: '朝7時' },
  sleep: { name: '睡眠記録', icon: '😴', description: '夜22時・朝7:30' },
  medicine: { name: '服薬リマインド', icon: '💊', description: '設定した時間' },
  habit: { name: '習慣チェック', icon: '🎯', description: '夜21時' },
  water: { name: '水分補給', icon: '💧', description: '3時間おき (9〜21時)' },
  task: { name: 'タスク', icon: '✅', description: '朝9時' },
  budget: { name: '家計簿', icon: '💰', description: '夜20時' },
};

export default function ReminderSettings() {
  const {
    config,
    medicineTimes,
    loading,
    toggleApp,
    setMedicineTimes,
    sendTestNotification,
  } = useSmartReminders();

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());

  if (loading || !config) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  const handleAddMedicineTime = () => {
    setSelectedTime(new Date());
    setShowTimePicker(true);
  };

  const handleTimeSelected = (event: any, date?: Date) => {
    setShowTimePicker(false);
    if (date) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;
      
      if (!medicineTimes.includes(timeString)) {
        setMedicineTimes([...medicineTimes, timeString].sort());
      }
    }
  };

  const handleRemoveMedicineTime = (time: string) => {
    Alert.alert(
      '確認',
      `${time} のリマインダーを削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => setMedicineTimes(medicineTimes.filter(t => t !== time)),
        },
      ]
    );
  };

  const handleTestNotification = (appType: MiniAppType) => {
    sendTestNotification(appType);
    Alert.alert('テスト通知', 'テスト通知を送信しました！📱');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🐦</Text>
        <Text style={styles.headerTitle}>スマートリマインダー</Text>
        <Text style={styles.headerSubtitle}>
          ドードーが適切なタイミングでお知らせするよ！
        </Text>
      </View>

      {(Object.keys(MINI_APP_INFO) as MiniAppType[]).map((appType) => (
        <View key={appType} style={styles.reminderItem}>
          <View style={styles.reminderHeader}>
            <Text style={styles.reminderIcon}>{MINI_APP_INFO[appType].icon}</Text>
            <View style={styles.reminderInfo}>
              <Text style={styles.reminderName}>{MINI_APP_INFO[appType].name}</Text>
              <Text style={styles.reminderDescription}>
                {MINI_APP_INFO[appType].description}
              </Text>
            </View>
            <Switch
              value={config[appType]?.enabled || false}
              onValueChange={(enabled) => toggleApp(appType, enabled)}
              trackColor={{ false: '#E0E0E0', true: '#FFB5B5' }}
              thumbColor={config[appType]?.enabled ? '#FF6B6B' : '#BDBDBD'}
            />
          </View>

          {/* 服薬の時間設定 */}
          {appType === 'medicine' && config[appType]?.enabled && (
            <View style={styles.medicineTimesContainer}>
              <Text style={styles.medicineTimesLabel}>リマインド時間:</Text>
              <View style={styles.medicineTimesList}>
                {medicineTimes.map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={styles.medicineTimeChip}
                    onLongPress={() => handleRemoveMedicineTime(time)}
                  >
                    <Text style={styles.medicineTimeText}>{time}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.addTimeButton}
                  onPress={handleAddMedicineTime}
                >
                  <Text style={styles.addTimeButtonText}>+ 追加</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.medicineTimesHint}>
                長押しで削除できます
              </Text>
            </View>
          )}

          {/* テスト通知ボタン */}
          {config[appType]?.enabled && (
            <TouchableOpacity
              style={styles.testButton}
              onPress={() => handleTestNotification(appType)}
            >
              <Text style={styles.testButtonText}>テスト通知を送る</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      {/* 時間選択モーダル */}
      {showTimePicker && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          is24Hour={true}
          display="spinner"
          onChange={handleTimeSelected}
        />
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💡 リマインダーはいつでもON/OFFできます
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FF6B6B',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  reminderItem: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  reminderDescription: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  medicineTimesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  medicineTimesLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  medicineTimesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  medicineTimeChip: {
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  medicineTimeText: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  addTimeButton: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDD',
    borderStyle: 'dashed',
  },
  addTimeButtonText: {
    color: '#888',
  },
  medicineTimesHint: {
    fontSize: 11,
    color: '#AAA',
    marginTop: 8,
  },
  testButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  testButtonText: {
    fontSize: 13,
    color: '#FF6B6B',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#888',
  },
});
