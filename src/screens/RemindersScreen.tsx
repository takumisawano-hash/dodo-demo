import React, { useState, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
  { id: 'diet-coach', name: 'ドードー', color: '#FF9800', icon: '🦤' },
  { id: 'language-tutor', name: 'ポリー', color: '#81C784', icon: '🦜' },
  { id: 'habit-coach', name: 'オウル', color: '#BA68C8', icon: '🦉' },
  { id: 'fitness-coach', name: 'ゴリラ', color: '#A1887F', icon: '🦍' },
  { id: 'sleep-coach', name: 'コアラ', color: '#90A4AE', icon: '🐨' },
  { id: 'mental-coach', name: 'スワン', color: '#F48FB1', icon: '🦢' },
];

// Quick time presets
const TIME_PRESETS = [
  { label: '早朝', time: '06:00', icon: '🌅' },
  { label: '朝', time: '08:00', icon: '☀️' },
  { label: '昼', time: '12:00', icon: '🌤️' },
  { label: '夕方', time: '18:00', icon: '🌆' },
  { label: '夜', time: '21:00', icon: '🌙' },
  { label: '深夜', time: '23:00', icon: '🌃' },
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

// Time picker wheel component
const TimePickerWheel = ({ 
  value, 
  onChange, 
  colors 
}: { 
  value: string; 
  onChange: (time: string) => void;
  colors: any;
}) => {
  const [hour, minute] = value.split(':').map(Number);
  const [selectedHour, setSelectedHour] = useState(hour);
  const [selectedMinute, setSelectedMinute] = useState(minute);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const handleHourChange = (h: number) => {
    setSelectedHour(h);
    onChange(`${h.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`);
  };

  const handleMinuteChange = (m: number) => {
    setSelectedMinute(m);
    onChange(`${selectedHour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  };

  return (
    <View style={styles.timePickerContainer}>
      <View style={styles.timePickerSection}>
        <Text style={[styles.timePickerLabel, { color: colors.textSecondary }]}>時</Text>
        <ScrollView 
          style={styles.timePickerScroll} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.timePickerScrollContent}
        >
          {hours.map((h) => (
            <TouchableOpacity
              key={h}
              style={[
                styles.timeOption,
                selectedHour === h && [styles.timeOptionSelected, { backgroundColor: colors.primary }],
              ]}
              onPress={() => handleHourChange(h)}
            >
              <Text style={[
                styles.timeOptionText,
                { color: colors.text },
                selectedHour === h && styles.timeOptionTextSelected,
              ]}>
                {h.toString().padStart(2, '0')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      <Text style={[styles.timeSeparator, { color: colors.text }]}>:</Text>
      
      <View style={styles.timePickerSection}>
        <Text style={[styles.timePickerLabel, { color: colors.textSecondary }]}>分</Text>
        <ScrollView 
          style={styles.timePickerScroll} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.timePickerScrollContent}
        >
          {minutes.map((m) => (
            <TouchableOpacity
              key={m}
              style={[
                styles.timeOption,
                selectedMinute === m && [styles.timeOptionSelected, { backgroundColor: colors.primary }],
              ]}
              onPress={() => handleMinuteChange(m)}
            >
              <Text style={[
                styles.timeOptionText,
                { color: colors.text },
                selectedMinute === m && styles.timeOptionTextSelected,
              ]}>
                {m.toString().padStart(2, '0')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

export default function RemindersScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [editTime, setEditTime] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [editDays, setEditDays] = useState<string[]>([]);
  
  // New reminder state
  const [newAgentId, setNewAgentId] = useState('');
  const [newTime, setNewTime] = useState('08:00');
  const [newMessage, setNewMessage] = useState('');
  const [newDays, setNewDays] = useState<string[]>(['everyday']);

  // Animation for toggle
  const toggleAnims = useRef<{ [key: string]: Animated.Value }>({}).current;

  const getToggleAnim = (id: string) => {
    if (!toggleAnims[id]) {
      toggleAnims[id] = new Animated.Value(1);
    }
    return toggleAnims[id];
  };

  // リマインダーのON/OFF切り替え
  const toggleReminder = (id: string) => {
    const anim = getToggleAnim(id);
    Animated.sequence([
      Animated.timing(anim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    setReminders(prev =>
      prev.map(r =>
        r.id === id ? { ...r, enabled: !r.enabled } : r
      )
    );
  };

  // リマインダー削除
  const handleDelete = (reminder: Reminder) => {
    Alert.alert(
      '🗑️ リマインダーを削除',
      `「${reminder.message}」を削除しますか？\nこの操作は取り消せません。`,
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
    setEditDays(reminder.days);
    setEditModalVisible(true);
  };

  // 編集を保存
  const saveEdit = () => {
    if (!editingReminder) return;
    
    if (!editMessage.trim()) {
      Alert.alert('エラー', 'メッセージを入力してください');
      return;
    }

    if (editDays.length === 0) {
      Alert.alert('エラー', '曜日を選択してください');
      return;
    }

    setReminders(prev =>
      prev.map(r =>
        r.id === editingReminder.id
          ? { ...r, time: editTime, message: editMessage.trim(), days: editDays }
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
    if (!newAgentId) {
      Alert.alert('エラー', 'エージェントを選択してください');
      return;
    }
    if (!newMessage.trim()) {
      Alert.alert('エラー', 'メッセージを入力してください');
      return;
    }
    if (newDays.length === 0) {
      Alert.alert('エラー', '曜日を選択してください');
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
  const toggleDay = (day: string, isEdit: boolean = false) => {
    const currentDays = isEdit ? editDays : newDays;
    const setDays = isEdit ? setEditDays : setNewDays;

    if (day === 'everyday') {
      setDays(['everyday']);
    } else {
      const newDaysList = currentDays.filter(d => d !== 'everyday');
      if (newDaysList.includes(day)) {
        setDays(newDaysList.filter(d => d !== day));
      } else {
        setDays([...newDaysList, day]);
      }
    }
  };

  // Quick time preset selection
  const selectTimePreset = (time: string, isEdit: boolean = false) => {
    if (isEdit) {
      setEditTime(time);
    } else {
      setNewTime(time);
    }
  };

  // リマインダーカードのレンダリング
  const renderReminderCard = ({ item }: { item: Reminder }) => {
    const scaleAnim = getToggleAnim(item.id);
    const agent = AVAILABLE_AGENTS.find(a => a.id === item.agentId);
    
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <View style={[
          styles.card, 
          { backgroundColor: colors.card }, 
          !item.enabled && [styles.cardDisabled, { backgroundColor: isDark ? '#1A1A1A' : '#F8F8F8' }]
        ]}>
          {/* ヘッダー: エージェント名 + スイッチ */}
          <View style={styles.cardHeader}>
            <View style={styles.agentInfo}>
              {AGENT_IMAGES[item.agentId] ? (
                <Image 
                  source={{ uri: AGENT_IMAGES[item.agentId] }} 
                  style={[styles.agentImage, !item.enabled && styles.imageDisabled]} 
                />
              ) : (
                <View style={[styles.agentImagePlaceholder, { backgroundColor: item.agentColor + '30' }]}>
                  <Text style={styles.agentInitial}>{agent?.icon || item.agentName[0]}</Text>
                </View>
              )}
              <View>
                <Text style={[styles.agentName, { color: item.agentColor }, !item.enabled && { opacity: 0.5 }]}>
                  {item.agentName}
                </Text>
                <View style={styles.scheduleRowInline}>
                  <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                  <Text style={[styles.scheduleTextSmall, { color: colors.textSecondary }]}>
                    {formatTime(item.time)}
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Custom Switch Visual */}
            <TouchableOpacity 
              style={[
                styles.customSwitch,
                { backgroundColor: item.enabled ? colors.success : (isDark ? '#333' : '#E0E0E0') }
              ]}
              onPress={() => toggleReminder(item.id)}
              activeOpacity={0.8}
            >
              <Animated.View style={[
                styles.switchThumb,
                { 
                  backgroundColor: '#FFFFFF',
                  transform: [{ translateX: item.enabled ? 20 : 0 }]
                }
              ]}>
                <Ionicons 
                  name={item.enabled ? 'notifications' : 'notifications-off'} 
                  size={12} 
                  color={item.enabled ? colors.success : colors.textSecondary} 
                />
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* 曜日バッジ */}
          <View style={styles.daysBadgeContainer}>
            {item.days.includes('everyday') ? (
              <View style={[styles.dayBadge, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.dayBadgeText, { color: colors.primary }]}>毎日</Text>
              </View>
            ) : (
              item.days.map(day => (
                <View key={day} style={[styles.dayBadge, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[styles.dayBadgeText, { color: colors.primary }]}>{dayLabels[day]}</Text>
                </View>
              ))
            )}
          </View>

          {/* メッセージ */}
          <View style={[styles.messageContainer, { backgroundColor: isDark ? '#1A1A1A' : '#F8F8F8' }]}>
            <Text style={styles.messageIcon}>💬</Text>
            <Text style={[styles.message, { color: colors.text }, !item.enabled && { opacity: 0.5 }]}>
              {item.message}
            </Text>
          </View>

          {/* アクションボタン */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary + '15' }]}
              onPress={() => openEditModal(item)}
            >
              <Ionicons name="pencil" size={16} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.primary }]}>編集</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton, { backgroundColor: isDark ? '#3D1B1B' : '#FFEBEE' }]}
              onPress={() => handleDelete(item)}
            >
              <Ionicons name="trash-outline" size={16} color={colors.error} />
              <Text style={[styles.actionText, { color: colors.error }]}>削除</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  };

  // 空の状態
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: colors.primary + '15' }]}>
        <Text style={styles.emptyEmoji}>🔔</Text>
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>リマインダーはまだありません</Text>
      <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
        エージェントからの通知を設定して{'\n'}
        日々の習慣をサポートしましょう
      </Text>
      <TouchableOpacity 
        style={[styles.emptyButton, { backgroundColor: colors.primary }]} 
        onPress={handleAddReminder}
      >
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.emptyButtonText}>リマインダーを追加</Text>
      </TouchableOpacity>
    </View>
  );

  // Day selector component
  const DaySelector = ({ selectedDays, onToggle, colors }: { selectedDays: string[]; onToggle: (day: string) => void; colors: any }) => (
    <View style={styles.daysSelector}>
      <TouchableOpacity
        style={[
          styles.dayOption,
          styles.dayOptionWide,
          { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5' },
          selectedDays.includes('everyday') && [styles.dayOptionSelected, { backgroundColor: colors.primary }],
        ]}
        onPress={() => onToggle('everyday')}
      >
        <Text style={[styles.dayOptionText, { color: colors.text }, selectedDays.includes('everyday') && styles.dayOptionTextSelected]}>
          毎日
        </Text>
      </TouchableOpacity>
      <View style={styles.weekdaysRow}>
        {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => (
          <TouchableOpacity
            key={day}
            style={[
              styles.dayOption,
              { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5' },
              selectedDays.includes(day) && [styles.dayOptionSelected, { backgroundColor: colors.primary }],
            ]}
            onPress={() => onToggle(day)}
          >
            <Text style={[styles.dayOptionText, { color: colors.text }, selectedDays.includes(day) && styles.dayOptionTextSelected]}>
              {dayLabels[day]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* ヘッダー */}
      <View style={[styles.header, { borderBottomColor: isDark ? '#333' : '#F0F0F0' }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: colors.text }]}>🔔 リマインダー</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            {reminders.filter(r => r.enabled).length}件アクティブ
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: colors.primary }]} 
          onPress={handleAddReminder}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
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
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>✏️ リマインダーを編集</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {editingReminder && (
              <ScrollView showsVerticalScrollIndicator={false}>
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

                {/* 時間選択 */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>⏰ 時間</Text>
                  <View style={styles.timePresetsRow}>
                    {TIME_PRESETS.map(preset => (
                      <TouchableOpacity
                        key={preset.time}
                        style={[
                          styles.timePreset,
                          { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5' },
                          editTime === preset.time && [styles.timePresetSelected, { backgroundColor: colors.primary }],
                        ]}
                        onPress={() => selectTimePreset(preset.time, true)}
                      >
                        <Text style={styles.timePresetIcon}>{preset.icon}</Text>
                        <Text style={[
                          styles.timePresetLabel,
                          { color: colors.text },
                          editTime === preset.time && styles.timePresetLabelSelected,
                        ]}>{preset.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TimePickerWheel value={editTime} onChange={setEditTime} colors={colors} />
                </View>

                {/* 曜日選択 */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>📅 曜日</Text>
                  <DaySelector 
                    selectedDays={editDays} 
                    onToggle={(day) => toggleDay(day, true)} 
                    colors={colors} 
                  />
                </View>

                {/* メッセージ入力 */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>💬 メッセージ</Text>
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
                    style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.primary }]}
                    onPress={saveEdit}
                  >
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>保存</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
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
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>➕ 新規リマインダー</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* エージェント選択 */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>🤖 エージェント</Text>
                <View style={styles.agentGrid}>
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
                        <View style={[styles.agentOptionPlaceholder, { backgroundColor: agent.color + '30' }]}>
                          <Text style={styles.agentOptionIcon}>{agent.icon}</Text>
                        </View>
                      )}
                      <Text style={[styles.agentOptionName, { color: newAgentId === agent.id ? agent.color : colors.text }]}>
                        {agent.name}
                      </Text>
                      {newAgentId === agent.id && (
                        <View style={[styles.agentCheckmark, { backgroundColor: agent.color }]}>
                          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 時間選択 */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>⏰ 時間</Text>
                <View style={styles.timePresetsRow}>
                  {TIME_PRESETS.map(preset => (
                    <TouchableOpacity
                      key={preset.time}
                      style={[
                        styles.timePreset,
                        { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5' },
                        newTime === preset.time && [styles.timePresetSelected, { backgroundColor: colors.primary }],
                      ]}
                      onPress={() => selectTimePreset(preset.time)}
                    >
                      <Text style={styles.timePresetIcon}>{preset.icon}</Text>
                      <Text style={[
                        styles.timePresetLabel,
                        { color: colors.text },
                        newTime === preset.time && styles.timePresetLabelSelected,
                      ]}>{preset.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TimePickerWheel value={newTime} onChange={setNewTime} colors={colors} />
              </View>

              {/* 曜日選択 */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>📅 曜日</Text>
                <DaySelector selectedDays={newDays} onToggle={(day) => toggleDay(day, false)} colors={colors} />
              </View>

              {/* メッセージ入力 */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>💬 メッセージ</Text>
                <TextInput
                  style={[styles.input, styles.inputMultiline, { backgroundColor: isDark ? '#2A2A2A' : '#F5F5F5', color: colors.text }]}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  placeholder="例: 体重を測ろう！"
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
                  style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.primary }]}
                  onPress={saveNewReminder}
                >
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>追加</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardDisabled: {
    opacity: 0.7,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  imageDisabled: {
    opacity: 0.5,
  },
  agentImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  agentInitial: {
    fontSize: 24,
  },
  agentName: {
    fontSize: 17,
    fontWeight: '600',
  },
  scheduleRowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  scheduleTextSmall: {
    fontSize: 12,
  },
  // Custom Switch
  customSwitch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 2,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  // Days Badge
  daysBadgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  dayBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dayBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Message
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  messageIcon: {
    fontSize: 16,
  },
  message: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  // Actions
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  deleteButton: {},
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    gap: 8,
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '80%',
  },
  addModalContent: {
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalAgent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 10,
  },
  modalAgentImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  modalAgentPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  cancelButton: {},
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {},
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Time Picker
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  timePickerSection: {
    alignItems: 'center',
  },
  timePickerLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  timePickerScroll: {
    height: 120,
    width: 60,
  },
  timePickerScrollContent: {
    paddingVertical: 40,
  },
  timeOption: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
  },
  timeOptionSelected: {
    borderRadius: 8,
  },
  timeOptionText: {
    fontSize: 18,
    fontWeight: '500',
  },
  timeOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
  },
  // Time Presets
  timePresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  timePreset: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  timePresetSelected: {},
  timePresetIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  timePresetLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  timePresetLabelSelected: {
    color: '#FFFFFF',
  },
  // Days Selector
  daysSelector: {
    gap: 10,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  dayOption: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  dayOptionWide: {
    paddingHorizontal: 24,
  },
  dayOptionSelected: {},
  dayOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dayOptionTextSelected: {
    color: '#FFFFFF',
  },
  // Agent Grid
  agentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  agentOption: {
    width: '31%',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    position: 'relative',
  },
  agentOptionImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 8,
  },
  agentOptionPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  agentOptionIcon: {
    fontSize: 24,
  },
  agentOptionName: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  agentCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
