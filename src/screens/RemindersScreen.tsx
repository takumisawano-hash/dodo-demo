import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  navigation: any;
}

interface Reminder {
  id: string;
  agentId: string;
  agentName: string;
  agentEmoji: string;
  time: string;
  days: string[];
  message: string;
  enabled: boolean;
}

// モックデータ
const initialReminders: Reminder[] = [
  {
    id: '1',
    agentId: 'dodo-1',
    agentName: 'ドードー',
    agentEmoji: '🦤',
    time: '08:00',
    days: ['everyday'],
    message: '体重を測ろう！',
    enabled: true,
  },
  {
    id: '2',
    agentId: 'penguin-1',
    agentName: 'ペンギン',
    agentEmoji: '🐧',
    time: '12:00',
    days: ['mon', 'wed', 'fri'],
    message: 'ストレッチの時間だよ！',
    enabled: true,
  },
  {
    id: '3',
    agentId: 'owl-1',
    agentName: 'ふくろう',
    agentEmoji: '🦉',
    time: '22:00',
    days: ['everyday'],
    message: '今日の振り返りをしよう',
    enabled: false,
  },
  {
    id: '4',
    agentId: 'cat-1',
    agentName: 'ねこ',
    agentEmoji: '🐱',
    time: '07:30',
    days: ['sat', 'sun'],
    message: '週末ランニングの時間！',
    enabled: true,
  },
];

// 曜日の表示変換
const dayLabels: { [key: string]: string } = {
  everyday: '毎日',
  mon: '月',
  tue: '火',
  wed: '水',
  thu: '木',
  fri: '金',
  sat: '土',
  sun: '日',
};

const formatDays = (days: string[]): string => {
  if (days.includes('everyday')) {
    return '毎日';
  }
  return days.map(d => dayLabels[d] || d).join('・');
};

const formatTime = (time: string): string => {
  const [hour, minute] = time.split(':');
  const h = parseInt(hour, 10);
  if (h < 12) {
    return `午前 ${h}:${minute}`;
  } else if (h === 12) {
    return `午後 12:${minute}`;
  } else {
    return `午後 ${h - 12}:${minute}`;
  }
};

export default function RemindersScreen({ navigation }: Props) {
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [editTime, setEditTime] = useState('');
  const [editMessage, setEditMessage] = useState('');

  // リマインダーのON/OFF切り替え
  const toggleReminder = (id: string) => {
    setReminders(prev =>
      prev.map(r =>
        r.id === id ? { ...r, enabled: !r.enabled } : r
      )
    );
  };

  // リマインダー削除
  const handleDelete = (reminder: Reminder) => {
    Alert.alert(
      'リマインダーを削除',
      `「${reminder.message}」を削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            setReminders(prev => prev.filter(r => r.id !== reminder.id));
          },
        },
      ]
    );
  };

  // 編集モーダルを開く
  const openEditModal = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setEditTime(reminder.time);
    setEditMessage(reminder.message);
    setEditModalVisible(true);
  };

  // 編集を保存
  const saveEdit = () => {
    if (!editingReminder) return;
    
    // 時間形式のバリデーション
    const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timeRegex.test(editTime)) {
      Alert.alert('エラー', '時間は HH:MM 形式で入力してください（例: 08:00）');
      return;
    }

    if (!editMessage.trim()) {
      Alert.alert('エラー', 'メッセージを入力してください');
      return;
    }

    setReminders(prev =>
      prev.map(r =>
        r.id === editingReminder.id
          ? { ...r, time: editTime, message: editMessage.trim() }
          : r
      )
    );
    setEditModalVisible(false);
    setEditingReminder(null);
  };

  // 新規追加
  const handleAddReminder = () => {
    Alert.alert(
      '新規リマインダー',
      'この機能は近日公開予定です。\nエージェント詳細画面からリマインダーを設定できるようになります。',
      [{ text: 'OK' }]
    );
  };

  // リマインダーカードのレンダリング
  const renderReminderCard = ({ item }: { item: Reminder }) => (
    <View style={[styles.card, !item.enabled && styles.cardDisabled]}>
      {/* ヘッダー: エージェント名 + スイッチ */}
      <View style={styles.cardHeader}>
        <View style={styles.agentInfo}>
          <Text style={styles.agentEmoji}>{item.agentEmoji}</Text>
          <Text style={[styles.agentName, !item.enabled && styles.textDisabled]}>
            {item.agentName}
          </Text>
        </View>
        <Switch
          value={item.enabled}
          onValueChange={() => toggleReminder(item.id)}
          trackColor={{ false: '#E0E0E0', true: '#81C784' }}
          thumbColor={item.enabled ? '#4CAF50' : '#FFFFFF'}
        />
      </View>

      {/* 時間と曜日 */}
      <View style={styles.scheduleRow}>
        <Text style={styles.scheduleIcon}>⏰</Text>
        <Text style={[styles.scheduleText, !item.enabled && styles.textDisabled]}>
          {formatDays(item.days)} {formatTime(item.time)}
        </Text>
      </View>

      {/* メッセージ */}
      <Text style={[styles.message, !item.enabled && styles.textDisabled]}>
        「{item.message}」
      </Text>

      {/* アクションボタン */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => openEditModal(item)}
        >
          <Text style={styles.actionIcon}>✏️</Text>
          <Text style={styles.actionText}>編集</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item)}
        >
          <Text style={styles.actionIcon}>🗑️</Text>
          <Text style={[styles.actionText, styles.deleteText]}>削除</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // 空の状態
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>🔔</Text>
      <Text style={styles.emptyTitle}>リマインダーはまだありません</Text>
      <Text style={styles.emptyDescription}>
        エージェントからの通知を設定して{'\n'}
        日々の習慣をサポートしましょう
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={handleAddReminder}>
        <Text style={styles.emptyButtonText}>+ リマインダーを追加</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>リマインダー</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddReminder}>
          <Text style={styles.addIcon}>+</Text>
        </TouchableOpacity>
      </View>

      {/* リマインダー一覧 */}
      <FlatList
        data={reminders}
        keyExtractor={item => item.id}
        renderItem={renderReminderCard}
        contentContainerStyle={[
          styles.listContent,
          reminders.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* 編集モーダル */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>リマインダーを編集</Text>

            {editingReminder && (
              <View style={styles.modalAgent}>
                <Text style={styles.modalAgentEmoji}>
                  {editingReminder.agentEmoji}
                </Text>
                <Text style={styles.modalAgentName}>
                  {editingReminder.agentName}
                </Text>
              </View>
            )}

            {/* 時間入力 */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>時間 (HH:MM)</Text>
              <TextInput
                style={styles.input}
                value={editTime}
                onChangeText={setEditTime}
                placeholder="08:00"
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>

            {/* メッセージ入力 */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>メッセージ</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={editMessage}
                onChangeText={setEditMessage}
                placeholder="リマインダーメッセージ"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* モーダルボタン */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveEdit}
              >
                <Text style={styles.saveButtonText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: '#333',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  addButton: {
    width: 40,
    height: 40,
    backgroundColor: '#FF9800',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIcon: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  // List
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  listContentEmpty: {
    flex: 1,
  },
  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardDisabled: {
    backgroundColor: '#F8F8F8',
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  agentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agentEmoji: {
    fontSize: 28,
    marginRight: 10,
  },
  agentName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scheduleIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  scheduleText: {
    fontSize: 15,
    color: '#666',
  },
  message: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
    lineHeight: 22,
  },
  textDisabled: {
    color: '#AAA',
  },
  // Actions
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  deleteButton: {
    backgroundColor: '#FFF0F0',
  },
  actionIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  actionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  deleteText: {
    color: '#E53935',
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalAgent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  modalAgentEmoji: {
    fontSize: 32,
    marginRight: 10,
  },
  modalAgentName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#FF9800',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
