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
  Image,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { AGENT_IMAGES } from '../data/agentImages';

interface Props {
  navigation: any;
}

interface Reminder {
  id: string;
  agentId: string;
  agentName: string;
  agentColor: string;
  time: string;
  days: string[];
  message: string;
  enabled: boolean;
}

// Available agents for reminder creation
const AVAILABLE_AGENTS = [
  { id: 'diet-coach', name: 'ドードー', color: '#FF9800' },
  { id: 'language-tutor', name: 'ポリー', color: '#81C784' },
  { id: 'habit-coach', name: 'オウル', color: '#BA68C8' },
  { id: 'fitness-coach', name: 'ゴリラ', color: '#A1887F' },
  { id: 'sleep-coach', name: 'コアラ', color: '#90A4AE' },
  { id: 'mental-coach', name: 'スワン', color: '#F48FB1' },
];

// モックデータ
const initialReminders: Reminder[] = [
  {
    id: '1',
    agentId: 'diet-coach',
    agentName: 'ドードー',
    agentColor: '#FF9800',
    time: '08:00',
    days: ['everyday'],
    message: '体重を測ろう！',
    enabled: true,
  },
  {
    id: '2',
    agentId: 'fitness-coach',
    agentName: 'ゴリラ',
    agentColor: '#A1887F',
    time: '12:00',
    days: ['mon', 'wed', 'fri'],
    message: 'ストレッチの時間だよ！',
    enabled: true,
  },
  {
    id: '3',
    agentId: 'habit-coach',
    agentName: 'オウル',
    agentColor: '#BA68C8',
    time: '22:00',
    days: ['everyday'],
    message: '今日の振り返りをしよう',
    enabled: false,
  },
  {
    id: '4',
    agentId: 'sleep-coach',
    agentName: 'コアラ',
    agentColor: '#90A4AE',
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
  const { colors, isDark } = useTheme();
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [editTime, setEditTime] = useState('');
  const [editMessage, setEditMessage] = useState('');
  
  // New reminder state
  const [newAgentId, setNewAgentId] = useState('');
  const [newTime, setNewTime] = useState('08:00');
  const [newMessage, setNewMessage] = useState('');
  const [newDays, setNewDays] = useState<string[]>(['everyday']);

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

  // Open add modal
  const handleAddReminder = () => {
    setNewAgentId('');
    setNewTime('08:00');
    setNewMessage('');
    setNewDays(['everyday']);
    setAddModalVisible(true);
  };

  // Save new reminder
  const saveNewReminder = () => {
    // Validation
    const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (!newAgentId) {
      Alert.alert('エラー', 'エージェントを選択してください');
      return;
    }
    if (!timeRegex.test(newTime)) {
      Alert.alert('エラー', '時間は HH:MM 形式で入力してください（例: 08:00）');
      return;
    }
    if (!newMessage.trim()) {
      Alert.alert('エラー', 'メッセージを入力してください');
      return;
    }

    const selectedAgent = AVAILABLE_AGENTS.find(a => a.id === newAgentId);
    if (!selectedAgent) return;

    const newReminder: Reminder = {
      id: Date.now().toString(),
      agentId: selectedAgent.id,
      agentName: selectedAgent.name,
      agentColor: selectedAgent.color,
      time: newTime,
      days: newDays,
      message: newMessage.trim(),
      enabled: true,
    };

    setReminders(prev => [newReminder, ...prev]);
    setAddModalVisible(false);
  };

  // Toggle day selection
  const toggleDay = (day: string) => {
    if (day === 'everyday') {
      setNewDays(['everyday']);
    } else {
      const newDaysList = newDays.filter(d => d !== 'everyday');
      if (newDaysList.includes(day)) {
        setNewDays(newDaysList.filter(d => d !== day));
      } else {
        setNewDays([...newDaysList, day]);
      }
    }
  };

  // リマインダーカードのレンダリング
  const renderReminderCard = ({ item }: { item: Reminder }) => (
    <View style={[styles.card, { backgroundColor: colors.card }, !item.enabled && [styles.cardDisabled, { backgroundColor: isDark ? '#1A1A1A' : '#F8F8F8' }]]}>
      {/* ヘッダー: エージェント名 + スイッチ */}
      <View style={styles.cardHeader}>
        <View style={styles.agentInfo}>
          {AGENT_IMAGES[item.agentId] ? (
            <Image 
              source={{ uri: AGENT_IMAGES[item.agentId] }} 
              style={[styles.agentImage, !item.enabled && styles.imageDisabled]} 
            />
          ) : (
            <View style={[styles.agentImagePlaceholder, { backgroundColor: item.agentColor + '40' }]}>
              <Text style={styles.agentInitial}>{item.agentName[0]}</Text>
            </View>
          )}
          <Text style={[styles.agentName, { color: item.agentColor }, !item.enabled && [styles.textDisabled, { color: colors.textSecondary }]]}>
            {item.agentName}
          </Text>
        </View>
        <Switch
          value={item.enabled}
          onValueChange={() => toggleReminder(item.id)}
          trackColor={{ false: isDark ? '#444' : '#E0E0E0', true: '#81C784' }}
          thumbColor={item.enabled ? '#4CAF50' : '#FFFFFF'}
        />
      </View>

      {/* 時間と曜日 */}
      <View style={styles.scheduleRow}>
        <Text style={styles.scheduleIcon}>⏰</Text>
        <Text style={[styles.scheduleText, { color: colors.textSecondary }, !item.enabled && styles.textDisabled]}>
          {formatDays(item.days)} {formatTime(item.time)}
        </Text>
      </View>

      {/* メッセージ */}
      <Text style={[styles.message, { color: colors.text }, !item.enabled && [styles.textDisabled, { color: colors.textSecondary }]]}>
        「{item.message}」
      </Text>

      {/* アクションボタン */}
      <View style={[styles.actions, { borderTopColor: isDark ? '#333' : '#F0F0F0' }]}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5' }]}
          onPress={() => openEditModal(item)}
        >
          <Text style={styles.actionIcon}>✏️</Text>
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>編集</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton, { backgroundColor: isDark ? '#3D1B1B' : '#FFF0F0' }]}
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
      <Text style={[styles.emptyTitle, { color: colors.text }]}>リマインダーはまだありません</Text>
      <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
        エージェントからの通知を設定して{'\n'}
        日々の習慣をサポートしましょう
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={handleAddReminder}>
        <Text style={styles.emptyButtonText}>+ リマインダーを追加</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ヘッダー */}
      <View style={[styles.header, { borderBottomColor: isDark ? '#333' : '#F0F0F0' }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backIcon, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>リマインダー</Text>
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
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>リマインダーを編集</Text>

            {editingReminder && (
              <View style={styles.modalAgent}>
                {AGENT_IMAGES[editingReminder.agentId] ? (
                  <Image 
                    source={{ uri: AGENT_IMAGES[editingReminder.agentId] }} 
                    style={styles.modalAgentImage} 
                  />
                ) : (
                  <View style={[styles.modalAgentPlaceholder, { backgroundColor: editingReminder.agentColor + '40' }]}>
                    <Text style={styles.modalAgentInitial}>{editingReminder.agentName[0]}</Text>
                  </View>
                )}
                <Text style={[styles.modalAgentName, { color: editingReminder.agentColor }]}>
                  {editingReminder.agentName}
                </Text>
              </View>
            )}

            {/* 時間入力 */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>時間 (HH:MM)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5', color: colors.text }]}
                value={editTime}
                onChangeText={setEditTime}
                placeholder="08:00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>

            {/* メッセージ入力 */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>メッセージ</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5', color: colors.text }]}
                value={editMessage}
                onChangeText={setEditMessage}
                placeholder="リマインダーメッセージ"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* モーダルボタン */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' }]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>キャンセル</Text>
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

      {/* 新規追加モーダル */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.addModalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>新規リマインダー</Text>

            {/* エージェント選択 */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>エージェント</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.agentSelector}>
                {AVAILABLE_AGENTS.map(agent => (
                  <TouchableOpacity
                    key={agent.id}
                    style={[
                      styles.agentOption,
                      { borderColor: agent.color, backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5' },
                      newAgentId === agent.id && { backgroundColor: agent.color + '30', borderWidth: 2 },
                    ]}
                    onPress={() => setNewAgentId(agent.id)}
                  >
                    {AGENT_IMAGES[agent.id] ? (
                      <Image source={{ uri: AGENT_IMAGES[agent.id] }} style={styles.agentOptionImage} />
                    ) : (
                      <View style={[styles.agentOptionPlaceholder, { backgroundColor: agent.color + '40' }]}>
                        <Text style={styles.agentOptionInitial}>{agent.name[0]}</Text>
                      </View>
                    )}
                    <Text style={[styles.agentOptionName, { color: newAgentId === agent.id ? agent.color : colors.text }]}>
                      {agent.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* 時間入力 */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>時間 (HH:MM)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5', color: colors.text }]}
                value={newTime}
                onChangeText={setNewTime}
                placeholder="08:00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>

            {/* 曜日選択 */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>曜日</Text>
              <View style={styles.daysSelector}>
                <TouchableOpacity
                  style={[
                    styles.dayOption,
                    { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5' },
                    newDays.includes('everyday') && styles.dayOptionSelected,
                  ]}
                  onPress={() => toggleDay('everyday')}
                >
                  <Text style={[styles.dayOptionText, { color: colors.text }, newDays.includes('everyday') && styles.dayOptionTextSelected]}>毎日</Text>
                </TouchableOpacity>
                {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayOption,
                      styles.dayOptionSmall,
                      { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5' },
                      newDays.includes(day) && styles.dayOptionSelected,
                    ]}
                    onPress={() => toggleDay(day)}
                  >
                    <Text style={[styles.dayOptionText, { color: colors.text }, newDays.includes(day) && styles.dayOptionTextSelected]}>{dayLabels[day]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* メッセージ入力 */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>メッセージ</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5', color: colors.text }]}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="リマインダーメッセージを入力..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* モーダルボタン */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' }]}
                onPress={() => setAddModalVisible(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveNewReminder}
              >
                <Text style={styles.saveButtonText}>追加</Text>
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
    backgroundColor: '#667eea',
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
  agentImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  imageDisabled: {
    opacity: 0.5,
  },
  agentImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  agentInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
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
    backgroundColor: '#667eea',
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
  modalAgentImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 10,
  },
  modalAgentPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalAgentInitial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
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
    backgroundColor: '#667eea',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Add modal styles
  addModalContent: {
    maxHeight: '85%',
  },
  agentSelector: {
    flexDirection: 'row',
    marginTop: 8,
  },
  agentOption: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 70,
  },
  agentOptionImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 6,
  },
  agentOptionPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  agentOptionInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  agentOptionName: {
    fontSize: 12,
    fontWeight: '500',
  },
  daysSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  dayOption: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  dayOptionSmall: {
    paddingHorizontal: 12,
  },
  dayOptionSelected: {
    backgroundColor: '#667eea',
  },
  dayOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dayOptionTextSelected: {
    color: '#FFFFFF',
  },
});
