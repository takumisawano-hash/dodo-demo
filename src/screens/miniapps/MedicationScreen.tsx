import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Dimensions,
  Alert,
  Switch,
} from 'react-native';

// =====================================================
// 💊 DoDo Life 服薬・サプリミニアプリ
// フル機能実装 - 登録・服用記録・残量管理・カレンダー
// =====================================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// テーマカラー
const COLORS = {
  primary: '#FF6B35',
  primaryLight: '#FF8A5C',
  primaryDark: '#E55A2B',
  background: '#FFF5E6',
  white: '#FFFFFF',
  text: '#333333',
  textLight: '#666666',
  textMuted: '#999999',
  border: '#E0E0E0',
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',
  pill: '#9C27B0',
  supplement: '#00BCD4',
  vitamin: '#8BC34A',
  medicine: '#F44336',
};

// =====================================================
// 型定義
// =====================================================

type MedicationType = 'medicine' | 'supplement' | 'vitamin' | 'other';
type FrequencyType = 'daily' | 'twice_daily' | 'three_times' | 'weekly' | 'as_needed';
type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night' | 'anytime';
type TabType = 'today' | 'medications' | 'calendar' | 'inventory' | 'stats';
type ModalType = 'add' | 'edit' | 'record' | 'refill' | null;

interface Medication {
  id: string;
  name: string;
  type: MedicationType;
  dosage: string;
  unit: string;
  frequency: FrequencyType;
  timesOfDay: TimeOfDay[];
  instructions?: string;
  startDate: string;
  endDate?: string;
  currentStock: number;
  minStock: number;
  reminderEnabled: boolean;
  reminderTimes: string[];
  color: string;
  notes?: string;
  isActive: boolean;
}

interface DoseRecord {
  id: string;
  medicationId: string;
  date: string;
  time: string;
  timeOfDay: TimeOfDay;
  taken: boolean;
  skipped: boolean;
  skipReason?: string;
  notes?: string;
}

interface RefillRecord {
  id: string;
  medicationId: string;
  date: string;
  quantity: number;
  source?: string;
  cost?: number;
}

// =====================================================
// ユーティリティ関数
// =====================================================

const generateId = (): string => Math.random().toString(36).substr(2, 9);

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const getToday = (): string => formatDate(new Date());

const getCurrentTime = (): string => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
};

const formatDateDisplay = (dateStr: string): string => {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
  return `${month}/${day}(${weekday})`;
};

const getTypeLabel = (type: MedicationType): string => {
  const labels = { medicine: '薬', supplement: 'サプリ', vitamin: 'ビタミン', other: 'その他' };
  return labels[type];
};

const getTypeIcon = (type: MedicationType): string => {
  const icons = { medicine: '💊', supplement: '🧪', vitamin: '🍊', other: '📦' };
  return icons[type];
};

const getTypeColor = (type: MedicationType): string => {
  const colors = { medicine: COLORS.medicine, supplement: COLORS.supplement, vitamin: COLORS.vitamin, other: COLORS.textLight };
  return colors[type];
};

const getFrequencyLabel = (frequency: FrequencyType): string => {
  const labels = {
    daily: '1日1回',
    twice_daily: '1日2回',
    three_times: '1日3回',
    weekly: '週1回',
    as_needed: '必要時',
  };
  return labels[frequency];
};

const getTimeOfDayLabel = (time: TimeOfDay): string => {
  const labels = { morning: '朝', afternoon: '昼', evening: '夕', night: '夜', anytime: 'いつでも' };
  return labels[time];
};

const getTimeOfDayIcon = (time: TimeOfDay): string => {
  const icons = { morning: '🌅', afternoon: '☀️', evening: '🌆', night: '🌙', anytime: '⏰' };
  return icons[time];
};

const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month, 1).getDay();
};

// =====================================================
// 進捗サークルコンポーネント
// =====================================================

interface ProgressCircleProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  children?: React.ReactNode;
}

const ProgressCircle: React.FC<ProgressCircleProps> = ({
  progress,
  size = 120,
  strokeWidth = 10,
  color = COLORS.primary,
  backgroundColor = COLORS.border,
  children,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: strokeWidth,
        borderColor: backgroundColor,
      }} />
      <View style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: strokeWidth,
        borderColor: color,
        borderTopColor: 'transparent',
        borderRightColor: progress > 25 ? color : 'transparent',
        borderBottomColor: progress > 50 ? color : 'transparent',
        borderLeftColor: progress > 75 ? color : 'transparent',
        transform: [{ rotate: '-90deg' }],
      }} />
      <View style={{ position: 'absolute', justifyContent: 'center', alignItems: 'center' }}>
        {children}
      </View>
    </View>
  );
};

// =====================================================
// カレンダーコンポーネント
// =====================================================

interface CalendarProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  records: DoseRecord[];
  medications: Medication[];
}

const Calendar: React.FC<CalendarProps> = ({ selectedDate, onSelectDate, records, medications }) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const date = new Date(selectedDate);
    return { year: date.getFullYear(), month: date.getMonth() };
  });

  const daysInMonth = getDaysInMonth(currentMonth.year, currentMonth.month);
  const firstDay = getFirstDayOfMonth(currentMonth.year, currentMonth.month);
  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  const goToPrevMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { ...prev, month: prev.month - 1 };
    });
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { ...prev, month: prev.month + 1 };
    });
  };

  const getDayStatus = (day: number): { taken: number; total: number; color: string } => {
    const dateStr = `${currentMonth.year}-${(currentMonth.month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const dayRecords = records.filter(r => r.date === dateStr);
    const taken = dayRecords.filter(r => r.taken).length;
    const total = dayRecords.length;

    if (total === 0) return { taken: 0, total: 0, color: 'transparent' };
    if (taken === total) return { taken, total, color: COLORS.success };
    if (taken > 0) return { taken, total, color: COLORS.warning };
    return { taken, total, color: COLORS.error };
  };

  const renderDay = (day: number | null, index: number) => {
    if (day === null) {
      return <View key={`empty-${index}`} style={styles.calendarDay} />;
    }

    const dateStr = `${currentMonth.year}-${(currentMonth.month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const isSelected = dateStr === selectedDate;
    const isToday = dateStr === getToday();
    const status = getDayStatus(day);

    return (
      <TouchableOpacity
        key={day}
        style={[
          styles.calendarDay,
          isSelected && styles.calendarDaySelected,
          isToday && !isSelected && styles.calendarDayToday,
        ]}
        onPress={() => onSelectDate(dateStr)}
      >
        <Text style={[
          styles.calendarDayText,
          isSelected && styles.calendarDayTextSelected,
          index % 7 === 0 && styles.calendarDaySunday,
          index % 7 === 6 && styles.calendarDaySaturday,
        ]}>
          {day}
        </Text>
        {status.total > 0 && (
          <View style={[styles.calendarDayIndicator, { backgroundColor: status.color }]} />
        )}
      </TouchableOpacity>
    );
  };

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return (
    <View style={styles.calendarContainer}>
      <View style={styles.calendarHeader}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.calendarNavButton}>
          <Text style={styles.calendarNavText}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.calendarTitle}>
          {currentMonth.year}年{currentMonth.month + 1}月
        </Text>
        <TouchableOpacity onPress={goToNextMonth} style={styles.calendarNavButton}>
          <Text style={styles.calendarNavText}>▶</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.calendarWeekDays}>
        {weekDays.map((day, index) => (
          <Text
            key={day}
            style={[
              styles.calendarWeekDay,
              index === 0 && styles.calendarDaySunday,
              index === 6 && styles.calendarDaySaturday,
            ]}
          >
            {day}
          </Text>
        ))}
      </View>
      <View style={styles.calendarDays}>
        {days.map((day, index) => renderDay(day, index))}
      </View>
      <View style={styles.calendarLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.success }]} />
          <Text style={styles.legendText}>完了</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} />
          <Text style={styles.legendText}>一部</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.error }]} />
          <Text style={styles.legendText}>未服用</Text>
        </View>
      </View>
    </View>
  );
};

// =====================================================
// メインコンポーネント
// =====================================================

const MedicationScreen: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedDate, setSelectedDate] = useState<string>(getToday());
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);

  // データ State
  const [medications, setMedications] = useState<Medication[]>([
    {
      id: '1',
      name: 'ビタミンD',
      type: 'vitamin',
      dosage: '1000',
      unit: 'IU',
      frequency: 'daily',
      timesOfDay: ['morning'],
      instructions: '食後に服用',
      startDate: '2024-01-01',
      currentStock: 45,
      minStock: 10,
      reminderEnabled: true,
      reminderTimes: ['08:00'],
      color: '#8BC34A',
      isActive: true,
    },
    {
      id: '2',
      name: 'オメガ3',
      type: 'supplement',
      dosage: '1000',
      unit: 'mg',
      frequency: 'twice_daily',
      timesOfDay: ['morning', 'evening'],
      instructions: '食事と一緒に',
      startDate: '2024-01-01',
      currentStock: 28,
      minStock: 14,
      reminderEnabled: true,
      reminderTimes: ['08:00', '20:00'],
      color: '#00BCD4',
      isActive: true,
    },
    {
      id: '3',
      name: '血圧の薬',
      type: 'medicine',
      dosage: '5',
      unit: 'mg',
      frequency: 'daily',
      timesOfDay: ['morning'],
      instructions: '朝食前に服用',
      startDate: '2024-02-01',
      currentStock: 8,
      minStock: 7,
      reminderEnabled: true,
      reminderTimes: ['07:30'],
      color: '#F44336',
      isActive: true,
    },
    {
      id: '4',
      name: 'マルチビタミン',
      type: 'vitamin',
      dosage: '1',
      unit: '錠',
      frequency: 'daily',
      timesOfDay: ['morning'],
      startDate: '2024-01-15',
      currentStock: 60,
      minStock: 15,
      reminderEnabled: false,
      reminderTimes: [],
      color: '#FF9800',
      isActive: true,
    },
  ]);

  const [doseRecords, setDoseRecords] = useState<DoseRecord[]>([]);
  const [refillRecords, setRefillRecords] = useState<RefillRecord[]>([]);

  // フォーム State
  const [formData, setFormData] = useState({
    name: '',
    type: 'supplement' as MedicationType,
    dosage: '',
    unit: 'mg',
    frequency: 'daily' as FrequencyType,
    timesOfDay: ['morning'] as TimeOfDay[],
    instructions: '',
    currentStock: '',
    minStock: '10',
    reminderEnabled: true,
    notes: '',
  });

  const [refillQuantity, setRefillQuantity] = useState('');

  // 今日の服用スケジュールを生成
  const todaySchedule = useMemo(() => {
    const today = getToday();
    const schedule: { medication: Medication; timeOfDay: TimeOfDay; record?: DoseRecord }[] = [];

    medications.filter(m => m.isActive).forEach(med => {
      med.timesOfDay.forEach(time => {
        const existingRecord = doseRecords.find(
          r => r.medicationId === med.id && r.date === today && r.timeOfDay === time
        );
        schedule.push({ medication: med, timeOfDay: time, record: existingRecord });
      });
    });

    // 時間順にソート
    const timeOrder: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'night', 'anytime'];
    return schedule.sort((a, b) => timeOrder.indexOf(a.timeOfDay) - timeOrder.indexOf(b.timeOfDay));
  }, [medications, doseRecords]);

  // 今日の進捗
  const todayProgress = useMemo(() => {
    const total = todaySchedule.length;
    const taken = todaySchedule.filter(s => s.record?.taken).length;
    return { total, taken, percentage: total > 0 ? Math.round((taken / total) * 100) : 0 };
  }, [todaySchedule]);

  // 在庫アラート
  const lowStockMedications = useMemo(() => {
    return medications.filter(m => m.isActive && m.currentStock <= m.minStock);
  }, [medications]);

  // =====================================================
  // アクション
  // =====================================================

  const handleTakeDose = useCallback((medication: Medication, timeOfDay: TimeOfDay) => {
    const today = getToday();
    const existingRecord = doseRecords.find(
      r => r.medicationId === medication.id && r.date === today && r.timeOfDay === timeOfDay
    );

    if (existingRecord) {
      // トグル
      setDoseRecords(prev => prev.map(r =>
        r.id === existingRecord.id ? { ...r, taken: !r.taken, skipped: false } : r
      ));
      if (!existingRecord.taken) {
        // 服用したら在庫を減らす
        setMedications(prev => prev.map(m =>
          m.id === medication.id ? { ...m, currentStock: Math.max(0, m.currentStock - 1) } : m
        ));
      } else {
        // 取り消したら在庫を戻す
        setMedications(prev => prev.map(m =>
          m.id === medication.id ? { ...m, currentStock: m.currentStock + 1 } : m
        ));
      }
    } else {
      // 新規記録
      const newRecord: DoseRecord = {
        id: generateId(),
        medicationId: medication.id,
        date: today,
        time: getCurrentTime(),
        timeOfDay,
        taken: true,
        skipped: false,
      };
      setDoseRecords(prev => [...prev, newRecord]);
      // 在庫を減らす
      setMedications(prev => prev.map(m =>
        m.id === medication.id ? { ...m, currentStock: Math.max(0, m.currentStock - 1) } : m
      ));
    }
  }, [doseRecords]);

  const handleSkipDose = useCallback((medication: Medication, timeOfDay: TimeOfDay, reason?: string) => {
    const today = getToday();
    const existingRecord = doseRecords.find(
      r => r.medicationId === medication.id && r.date === today && r.timeOfDay === timeOfDay
    );

    if (existingRecord) {
      setDoseRecords(prev => prev.map(r =>
        r.id === existingRecord.id ? { ...r, taken: false, skipped: true, skipReason: reason } : r
      ));
    } else {
      const newRecord: DoseRecord = {
        id: generateId(),
        medicationId: medication.id,
        date: today,
        time: getCurrentTime(),
        timeOfDay,
        taken: false,
        skipped: true,
        skipReason: reason,
      };
      setDoseRecords(prev => [...prev, newRecord]);
    }
  }, [doseRecords]);

  const handleAddMedication = useCallback(() => {
    if (!formData.name.trim() || !formData.dosage.trim()) {
      Alert.alert('エラー', '名前と用量は必須です');
      return;
    }

    const newMedication: Medication = {
      id: generateId(),
      name: formData.name.trim(),
      type: formData.type,
      dosage: formData.dosage.trim(),
      unit: formData.unit,
      frequency: formData.frequency,
      timesOfDay: formData.timesOfDay,
      instructions: formData.instructions.trim() || undefined,
      startDate: getToday(),
      currentStock: parseInt(formData.currentStock) || 0,
      minStock: parseInt(formData.minStock) || 10,
      reminderEnabled: formData.reminderEnabled,
      reminderTimes: formData.timesOfDay.map(t => {
        const times = { morning: '08:00', afternoon: '12:00', evening: '18:00', night: '21:00', anytime: '12:00' };
        return times[t];
      }),
      color: getTypeColor(formData.type),
      notes: formData.notes.trim() || undefined,
      isActive: true,
    };

    setMedications(prev => [...prev, newMedication]);
    setModalType(null);
    resetForm();
    Alert.alert('完了', `${newMedication.name}を登録しました`);
  }, [formData]);

  const handleUpdateMedication = useCallback(() => {
    if (!selectedMedication) return;

    setMedications(prev => prev.map(m =>
      m.id === selectedMedication.id
        ? {
            ...m,
            name: formData.name.trim(),
            type: formData.type,
            dosage: formData.dosage.trim(),
            unit: formData.unit,
            frequency: formData.frequency,
            timesOfDay: formData.timesOfDay,
            instructions: formData.instructions.trim() || undefined,
            currentStock: parseInt(formData.currentStock) || m.currentStock,
            minStock: parseInt(formData.minStock) || m.minStock,
            reminderEnabled: formData.reminderEnabled,
            notes: formData.notes.trim() || undefined,
          }
        : m
    ));
    setModalType(null);
    setSelectedMedication(null);
    resetForm();
  }, [formData, selectedMedication]);

  const handleRefill = useCallback(() => {
    if (!selectedMedication || !refillQuantity) return;

    const quantity = parseInt(refillQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('エラー', '有効な数量を入力してください');
      return;
    }

    const newRefill: RefillRecord = {
      id: generateId(),
      medicationId: selectedMedication.id,
      date: getToday(),
      quantity,
    };

    setRefillRecords(prev => [...prev, newRefill]);
    setMedications(prev => prev.map(m =>
      m.id === selectedMedication.id
        ? { ...m, currentStock: m.currentStock + quantity }
        : m
    ));
    setModalType(null);
    setSelectedMedication(null);
    setRefillQuantity('');
    Alert.alert('完了', `${selectedMedication.name}を${quantity}個補充しました`);
  }, [selectedMedication, refillQuantity]);

  const handleDeleteMedication = useCallback((medication: Medication) => {
    Alert.alert(
      '削除確認',
      `${medication.name}を削除しますか？\n服用履歴も削除されます。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            setMedications(prev => prev.filter(m => m.id !== medication.id));
            setDoseRecords(prev => prev.filter(r => r.medicationId !== medication.id));
            setRefillRecords(prev => prev.filter(r => r.medicationId !== medication.id));
          },
        },
      ]
    );
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'supplement',
      dosage: '',
      unit: 'mg',
      frequency: 'daily',
      timesOfDay: ['morning'],
      instructions: '',
      currentStock: '',
      minStock: '10',
      reminderEnabled: true,
      notes: '',
    });
  };

  const openEditModal = (medication: Medication) => {
    setSelectedMedication(medication);
    setFormData({
      name: medication.name,
      type: medication.type,
      dosage: medication.dosage,
      unit: medication.unit,
      frequency: medication.frequency,
      timesOfDay: medication.timesOfDay,
      instructions: medication.instructions || '',
      currentStock: medication.currentStock.toString(),
      minStock: medication.minStock.toString(),
      reminderEnabled: medication.reminderEnabled,
      notes: medication.notes || '',
    });
    setModalType('edit');
  };

  const openRefillModal = (medication: Medication) => {
    setSelectedMedication(medication);
    setRefillQuantity('');
    setModalType('refill');
  };

  // =====================================================
  // 統計計算
  // =====================================================

  const stats = useMemo(() => {
    const last30Days: string[] = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      last30Days.push(formatDate(date));
    }

    const recordsLast30 = doseRecords.filter(r => last30Days.includes(r.date));
    const takenCount = recordsLast30.filter(r => r.taken).length;
    const totalCount = recordsLast30.length;
    const adherenceRate = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

    // 連続日数
    let streak = 0;
    for (const dateStr of last30Days) {
      const dayRecords = doseRecords.filter(r => r.date === dateStr);
      const dayMeds = medications.filter(m => m.isActive);
      if (dayMeds.length === 0) break;

      const allTaken = dayMeds.every(med =>
        med.timesOfDay.every(time =>
          dayRecords.some(r => r.medicationId === med.id && r.timeOfDay === time && r.taken)
        )
      );
      if (allTaken) streak++;
      else break;
    }

    return { adherenceRate, streak, takenCount, totalCount };
  }, [doseRecords, medications]);

  // =====================================================
  // レンダリング: タブ
  // =====================================================

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      {[
        { key: 'today', label: '今日', icon: '📋' },
        { key: 'medications', label: '一覧', icon: '💊' },
        { key: 'calendar', label: 'カレンダー', icon: '📅' },
        { key: 'inventory', label: '在庫', icon: '📦' },
        { key: 'stats', label: '統計', icon: '📊' },
      ].map(tab => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.tabActive]}
          onPress={() => setActiveTab(tab.key as TabType)}
        >
          <Text style={styles.tabIcon}>{tab.icon}</Text>
          <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // =====================================================
  // レンダリング: 今日タブ
  // =====================================================

  const renderTodayTab = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* 進捗サマリー */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>今日の服薬状況</Text>
          <Text style={styles.summaryDate}>{formatDateDisplay(getToday())}</Text>
        </View>
        <View style={styles.summaryContent}>
          <ProgressCircle
            progress={todayProgress.percentage}
            size={100}
            strokeWidth={8}
            color={todayProgress.percentage === 100 ? COLORS.success : COLORS.primary}
          >
            <Text style={styles.progressText}>{todayProgress.percentage}%</Text>
            <Text style={styles.progressSubtext}>完了</Text>
          </ProgressCircle>
          <View style={styles.summaryStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{todayProgress.taken}</Text>
              <Text style={styles.statLabel}>服用済み</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{todayProgress.total - todayProgress.taken}</Text>
              <Text style={styles.statLabel}>残り</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.streak}</Text>
              <Text style={styles.statLabel}>連続日数</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 低在庫アラート */}
      {lowStockMedications.length > 0 && (
        <View style={styles.alertCard}>
          <Text style={styles.alertTitle}>⚠️ 在庫少量アラート</Text>
          {lowStockMedications.map(med => (
            <TouchableOpacity
              key={med.id}
              style={styles.alertItem}
              onPress={() => openRefillModal(med)}
            >
              <Text style={styles.alertItemText}>
                {getTypeIcon(med.type)} {med.name}: 残り{med.currentStock}個
              </Text>
              <Text style={styles.alertItemAction}>補充 →</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* 服用スケジュール */}
      <View style={styles.scheduleSection}>
        <Text style={styles.sectionTitle}>今日のスケジュール</Text>
        {todaySchedule.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💊</Text>
            <Text style={styles.emptyText}>服用予定の薬がありません</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setModalType('add')}
            >
              <Text style={styles.emptyButtonText}>薬・サプリを登録</Text>
            </TouchableOpacity>
          </View>
        ) : (
          todaySchedule.map((item, index) => {
            const isTaken = item.record?.taken;
            const isSkipped = item.record?.skipped;

            return (
              <View key={`${item.medication.id}-${item.timeOfDay}-${index}`} style={styles.scheduleItem}>
                <View style={styles.scheduleLeft}>
                  <View style={[styles.scheduleIcon, { backgroundColor: isTaken ? COLORS.success : isSkipped ? COLORS.textMuted : item.medication.color }]}>
                    <Text style={styles.scheduleIconText}>
                      {isTaken ? '✓' : isSkipped ? '✕' : getTimeOfDayIcon(item.timeOfDay)}
                    </Text>
                  </View>
                  <View style={styles.scheduleInfo}>
                    <Text style={[styles.scheduleName, (isTaken || isSkipped) && styles.scheduleNameDone]}>
                      {item.medication.name}
                    </Text>
                    <Text style={styles.scheduleDetails}>
                      {item.medication.dosage}{item.medication.unit} • {getTimeOfDayLabel(item.timeOfDay)}
                    </Text>
                    {item.medication.instructions && (
                      <Text style={styles.scheduleInstructions}>{item.medication.instructions}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.scheduleActions}>
                  {!isSkipped && (
                    <TouchableOpacity
                      style={[styles.checkButton, isTaken && styles.checkButtonActive]}
                      onPress={() => handleTakeDose(item.medication, item.timeOfDay)}
                    >
                      <Text style={[styles.checkButtonText, isTaken && styles.checkButtonTextActive]}>
                        {isTaken ? '✓' : '服用'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {!isTaken && !isSkipped && (
                    <TouchableOpacity
                      style={styles.skipButton}
                      onPress={() => {
                        Alert.alert(
                          'スキップ',
                          '今回の服用をスキップしますか？',
                          [
                            { text: 'キャンセル', style: 'cancel' },
                            { text: 'スキップ', onPress: () => handleSkipDose(item.medication, item.timeOfDay) },
                          ]
                        );
                      }}
                    >
                      <Text style={styles.skipButtonText}>スキップ</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );

  // =====================================================
  // レンダリング: 薬一覧タブ
  // =====================================================

  const renderMedicationsTab = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>登録中の薬・サプリ</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalType('add')}
        >
          <Text style={styles.addButtonText}>+ 追加</Text>
        </TouchableOpacity>
      </View>

      {medications.filter(m => m.isActive).length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💊</Text>
          <Text style={styles.emptyText}>登録された薬がありません</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => setModalType('add')}
          >
            <Text style={styles.emptyButtonText}>最初の薬を登録</Text>
          </TouchableOpacity>
        </View>
      ) : (
        medications.filter(m => m.isActive).map(med => (
          <TouchableOpacity
            key={med.id}
            style={styles.medicationCard}
            onPress={() => openEditModal(med)}
          >
            <View style={[styles.medicationColor, { backgroundColor: med.color }]} />
            <View style={styles.medicationInfo}>
              <View style={styles.medicationHeader}>
                <Text style={styles.medicationName}>
                  {getTypeIcon(med.type)} {med.name}
                </Text>
                <Text style={[styles.medicationType, { color: getTypeColor(med.type) }]}>
                  {getTypeLabel(med.type)}
                </Text>
              </View>
              <Text style={styles.medicationDosage}>
                {med.dosage}{med.unit} • {getFrequencyLabel(med.frequency)}
              </Text>
              <View style={styles.medicationTimes}>
                {med.timesOfDay.map(time => (
                  <View key={time} style={styles.timeTag}>
                    <Text style={styles.timeTagText}>{getTimeOfDayLabel(time)}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.medicationFooter}>
                <Text style={[
                  styles.stockText,
                  med.currentStock <= med.minStock && styles.stockLow
                ]}>
                  在庫: {med.currentStock}個
                  {med.currentStock <= med.minStock && ' ⚠️'}
                </Text>
                {med.reminderEnabled && (
                  <Text style={styles.reminderBadge}>🔔 リマインダーON</Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteMedication(med)}
            >
              <Text style={styles.deleteButtonText}>🗑</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );

  // =====================================================
  // レンダリング: カレンダータブ
  // =====================================================

  const renderCalendarTab = () => {
    const selectedDayRecords = doseRecords.filter(r => r.date === selectedDate);

    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Calendar
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          records={doseRecords}
          medications={medications}
        />

        <View style={styles.selectedDaySection}>
          <Text style={styles.sectionTitle}>
            {formatDateDisplay(selectedDate)}の記録
          </Text>
          {selectedDayRecords.length === 0 ? (
            <Text style={styles.noRecordText}>この日の記録はありません</Text>
          ) : (
            selectedDayRecords.map(record => {
              const med = medications.find(m => m.id === record.medicationId);
              if (!med) return null;
              return (
                <View key={record.id} style={styles.recordItem}>
                  <View style={[
                    styles.recordStatus,
                    { backgroundColor: record.taken ? COLORS.success : record.skipped ? COLORS.textMuted : COLORS.error }
                  ]} />
                  <View style={styles.recordInfo}>
                    <Text style={styles.recordName}>
                      {getTypeIcon(med.type)} {med.name}
                    </Text>
                    <Text style={styles.recordDetails}>
                      {getTimeOfDayLabel(record.timeOfDay)} • {record.time}
                    </Text>
                  </View>
                  <Text style={[
                    styles.recordStatusText,
                    { color: record.taken ? COLORS.success : record.skipped ? COLORS.textMuted : COLORS.error }
                  ]}>
                    {record.taken ? '服用済' : record.skipped ? 'スキップ' : '未服用'}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    );
  };

  // =====================================================
  // レンダリング: 在庫タブ
  // =====================================================

  const renderInventoryTab = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>在庫管理</Text>

      {medications.filter(m => m.isActive).map(med => {
        const stockPercentage = Math.min(100, (med.currentStock / (med.minStock * 3)) * 100);
        const isLow = med.currentStock <= med.minStock;

        return (
          <View key={med.id} style={styles.inventoryCard}>
            <View style={styles.inventoryHeader}>
              <Text style={styles.inventoryName}>
                {getTypeIcon(med.type)} {med.name}
              </Text>
              <TouchableOpacity
                style={styles.refillButton}
                onPress={() => openRefillModal(med)}
              >
                <Text style={styles.refillButtonText}>+ 補充</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inventoryBar}>
              <View style={styles.inventoryBarBg}>
                <View
                  style={[
                    styles.inventoryBarFill,
                    {
                      width: `${stockPercentage}%`,
                      backgroundColor: isLow ? COLORS.error : COLORS.success,
                    }
                  ]}
                />
              </View>
              <Text style={[styles.inventoryCount, isLow && styles.inventoryCountLow]}>
                {med.currentStock}個
              </Text>
            </View>

            <View style={styles.inventoryDetails}>
              <Text style={styles.inventoryMinStock}>
                最低在庫: {med.minStock}個
              </Text>
              {isLow && (
                <Text style={styles.inventoryWarning}>⚠️ 補充が必要です</Text>
              )}
            </View>

            {/* 補充履歴 */}
            {refillRecords.filter(r => r.medicationId === med.id).slice(-3).length > 0 && (
              <View style={styles.refillHistory}>
                <Text style={styles.refillHistoryTitle}>最近の補充</Text>
                {refillRecords
                  .filter(r => r.medicationId === med.id)
                  .slice(-3)
                  .reverse()
                  .map(r => (
                    <Text key={r.id} style={styles.refillHistoryItem}>
                      {formatDateDisplay(r.date)}: +{r.quantity}個
                    </Text>
                  ))}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );

  // =====================================================
  // レンダリング: 統計タブ
  // =====================================================

  const renderStatsTab = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>服用統計</Text>

      {/* 概要カード */}
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statsItem}>
            <ProgressCircle
              progress={stats.adherenceRate}
              size={80}
              strokeWidth={6}
              color={stats.adherenceRate >= 80 ? COLORS.success : stats.adherenceRate >= 50 ? COLORS.warning : COLORS.error}
            >
              <Text style={styles.statsCircleText}>{stats.adherenceRate}%</Text>
            </ProgressCircle>
            <Text style={styles.statsLabel}>服用率（30日）</Text>
          </View>
          <View style={styles.statsItem}>
            <View style={styles.statsNumber}>
              <Text style={styles.statsNumberValue}>{stats.streak}</Text>
              <Text style={styles.statsNumberUnit}>日</Text>
            </View>
            <Text style={styles.statsLabel}>連続達成</Text>
          </View>
          <View style={styles.statsItem}>
            <View style={styles.statsNumber}>
              <Text style={styles.statsNumberValue}>{stats.takenCount}</Text>
              <Text style={styles.statsNumberUnit}>回</Text>
            </View>
            <Text style={styles.statsLabel}>服用回数</Text>
          </View>
        </View>
      </View>

      {/* 薬ごとの統計 */}
      <Text style={styles.sectionSubtitle}>薬・サプリ別の服用率</Text>
      {medications.filter(m => m.isActive).map(med => {
        const medRecords = doseRecords.filter(r => r.medicationId === med.id);
        const takenCount = medRecords.filter(r => r.taken).length;
        const totalCount = medRecords.length;
        const rate = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

        return (
          <View key={med.id} style={styles.medStatCard}>
            <View style={styles.medStatHeader}>
              <Text style={styles.medStatName}>
                {getTypeIcon(med.type)} {med.name}
              </Text>
              <Text style={[
                styles.medStatRate,
                { color: rate >= 80 ? COLORS.success : rate >= 50 ? COLORS.warning : COLORS.error }
              ]}>
                {rate}%
              </Text>
            </View>
            <View style={styles.medStatBar}>
              <View
                style={[
                  styles.medStatBarFill,
                  {
                    width: `${rate}%`,
                    backgroundColor: rate >= 80 ? COLORS.success : rate >= 50 ? COLORS.warning : COLORS.error,
                  }
                ]}
              />
            </View>
            <Text style={styles.medStatCount}>
              {takenCount} / {totalCount} 回服用
            </Text>
          </View>
        );
      })}

      {/* ヒント */}
      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>💡 服薬のコツ</Text>
        <Text style={styles.tipsText}>
          • 毎日同じ時間に服用する習慣をつけましょう{'\n'}
          • リマインダーを設定して飲み忘れを防ぎましょう{'\n'}
          • 在庫が少なくなったら早めに補充しましょう{'\n'}
          • 気になる副作用があれば医師に相談しましょう
        </Text>
      </View>
    </ScrollView>
  );

  // =====================================================
  // レンダリング: 追加/編集モーダル
  // =====================================================

  const renderFormModal = () => (
    <Modal
      visible={modalType === 'add' || modalType === 'edit'}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        setModalType(null);
        setSelectedMedication(null);
        resetForm();
      }}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            onPress={() => {
              setModalType(null);
              setSelectedMedication(null);
              resetForm();
            }}
          >
            <Text style={styles.modalCancel}>キャンセル</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {modalType === 'add' ? '薬・サプリを追加' : '編集'}
          </Text>
          <TouchableOpacity
            onPress={modalType === 'add' ? handleAddMedication : handleUpdateMedication}
          >
            <Text style={styles.modalSave}>保存</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* 名前 */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>名前 *</Text>
            <TextInput
              style={styles.formInput}
              value={formData.name}
              onChangeText={text => setFormData(prev => ({ ...prev, name: text }))}
              placeholder="例: ビタミンD"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          {/* タイプ */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>種類</Text>
            <View style={styles.typeSelector}>
              {(['medicine', 'supplement', 'vitamin', 'other'] as MedicationType[]).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeOption, formData.type === type && styles.typeOptionActive]}
                  onPress={() => setFormData(prev => ({ ...prev, type }))}
                >
                  <Text style={styles.typeOptionIcon}>{getTypeIcon(type)}</Text>
                  <Text style={[styles.typeOptionText, formData.type === type && styles.typeOptionTextActive]}>
                    {getTypeLabel(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 用量 */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>用量 *</Text>
            <View style={styles.dosageRow}>
              <TextInput
                style={[styles.formInput, styles.dosageInput]}
                value={formData.dosage}
                onChangeText={text => setFormData(prev => ({ ...prev, dosage: text }))}
                placeholder="例: 1000"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
              />
              <View style={styles.unitSelector}>
                {['mg', 'IU', 'mcg', '錠', 'ml'].map(unit => (
                  <TouchableOpacity
                    key={unit}
                    style={[styles.unitOption, formData.unit === unit && styles.unitOptionActive]}
                    onPress={() => setFormData(prev => ({ ...prev, unit }))}
                  >
                    <Text style={[styles.unitOptionText, formData.unit === unit && styles.unitOptionTextActive]}>
                      {unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* 頻度 */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>服用頻度</Text>
            <View style={styles.frequencySelector}>
              {(['daily', 'twice_daily', 'three_times', 'weekly', 'as_needed'] as FrequencyType[]).map(freq => (
                <TouchableOpacity
                  key={freq}
                  style={[styles.freqOption, formData.frequency === freq && styles.freqOptionActive]}
                  onPress={() => setFormData(prev => ({ ...prev, frequency: freq }))}
                >
                  <Text style={[styles.freqOptionText, formData.frequency === freq && styles.freqOptionTextActive]}>
                    {getFrequencyLabel(freq)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 服用タイミング */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>服用タイミング</Text>
            <View style={styles.timesSelector}>
              {(['morning', 'afternoon', 'evening', 'night'] as TimeOfDay[]).map(time => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeOption,
                    formData.timesOfDay.includes(time) && styles.timeOptionActive
                  ]}
                  onPress={() => {
                    setFormData(prev => ({
                      ...prev,
                      timesOfDay: prev.timesOfDay.includes(time)
                        ? prev.timesOfDay.filter(t => t !== time)
                        : [...prev.timesOfDay, time]
                    }));
                  }}
                >
                  <Text style={styles.timeOptionIcon}>{getTimeOfDayIcon(time)}</Text>
                  <Text style={[
                    styles.timeOptionText,
                    formData.timesOfDay.includes(time) && styles.timeOptionTextActive
                  ]}>
                    {getTimeOfDayLabel(time)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 服用方法 */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>服用方法・注意事項</Text>
            <TextInput
              style={styles.formInput}
              value={formData.instructions}
              onChangeText={text => setFormData(prev => ({ ...prev, instructions: text }))}
              placeholder="例: 食後に服用"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          {/* 在庫 */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>現在の在庫数</Text>
            <TextInput
              style={styles.formInput}
              value={formData.currentStock}
              onChangeText={text => setFormData(prev => ({ ...prev, currentStock: text }))}
              placeholder="例: 30"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
            />
          </View>

          {/* 最低在庫 */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>最低在庫数（アラート表示）</Text>
            <TextInput
              style={styles.formInput}
              value={formData.minStock}
              onChangeText={text => setFormData(prev => ({ ...prev, minStock: text }))}
              placeholder="例: 10"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
            />
          </View>

          {/* リマインダー */}
          <View style={styles.formGroup}>
            <View style={styles.switchRow}>
              <Text style={styles.formLabel}>リマインダー通知</Text>
              <Switch
                value={formData.reminderEnabled}
                onValueChange={value => setFormData(prev => ({ ...prev, reminderEnabled: value }))}
                trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
                thumbColor={formData.reminderEnabled ? COLORS.primary : COLORS.white}
              />
            </View>
          </View>

          {/* メモ */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>メモ</Text>
            <TextInput
              style={[styles.formInput, styles.formTextarea]}
              value={formData.notes}
              onChangeText={text => setFormData(prev => ({ ...prev, notes: text }))}
              placeholder="その他のメモ"
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  // =====================================================
  // レンダリング: 補充モーダル
  // =====================================================

  const renderRefillModal = () => (
    <Modal
      visible={modalType === 'refill'}
      animationType="slide"
      transparent
      onRequestClose={() => {
        setModalType(null);
        setSelectedMedication(null);
        setRefillQuantity('');
      }}
    >
      <View style={styles.refillModalOverlay}>
        <View style={styles.refillModalContent}>
          <Text style={styles.refillModalTitle}>在庫を補充</Text>
          {selectedMedication && (
            <>
              <Text style={styles.refillModalMed}>
                {getTypeIcon(selectedMedication.type)} {selectedMedication.name}
              </Text>
              <Text style={styles.refillModalCurrent}>
                現在の在庫: {selectedMedication.currentStock}個
              </Text>
              <TextInput
                style={styles.refillModalInput}
                value={refillQuantity}
                onChangeText={setRefillQuantity}
                placeholder="補充する数量"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                autoFocus
              />
              <View style={styles.refillModalButtons}>
                <TouchableOpacity
                  style={styles.refillModalCancel}
                  onPress={() => {
                    setModalType(null);
                    setSelectedMedication(null);
                    setRefillQuantity('');
                  }}
                >
                  <Text style={styles.refillModalCancelText}>キャンセル</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.refillModalConfirm}
                  onPress={handleRefill}
                >
                  <Text style={styles.refillModalConfirmText}>補充する</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  // =====================================================
  // メインレンダリング
  // =====================================================

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💊 服薬・サプリ</Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setModalType('add')}
        >
          <Text style={styles.headerButtonText}>+ 追加</Text>
        </TouchableOpacity>
      </View>

      {/* タブ */}
      {renderTabs()}

      {/* コンテンツ */}
      {activeTab === 'today' && renderTodayTab()}
      {activeTab === 'medications' && renderMedicationsTab()}
      {activeTab === 'calendar' && renderCalendarTab()}
      {activeTab === 'inventory' && renderInventoryTab()}
      {activeTab === 'stats' && renderStatsTab()}

      {/* モーダル */}
      {renderFormModal()}
      {renderRefillModal()}
    </View>
  );
};

// =====================================================
// スタイル
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  headerButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 20,
    marginBottom: 12,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 13,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  summaryDate: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  progressSubtext: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  summaryStats: {
    flex: 1,
    marginLeft: 24,
  },
  statItem: {
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },

  // Alert Card
  alertCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  alertItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  alertItemText: {
    fontSize: 14,
    color: COLORS.text,
  },
  alertItemAction: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Schedule
  scheduleSection: {
    marginTop: 8,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  scheduleLeft: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  scheduleIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scheduleIconText: {
    fontSize: 18,
    color: COLORS.white,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  scheduleNameDone: {
    textDecorationLine: 'line-through',
    color: COLORS.textMuted,
  },
  scheduleDetails: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  scheduleInstructions: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  scheduleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  checkButtonActive: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  checkButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  checkButtonTextActive: {
    color: COLORS.white,
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  skipButtonText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },

  // Medication Card
  medicationCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medicationColor: {
    width: 4,
  },
  medicationInfo: {
    flex: 1,
    padding: 16,
  },
  medicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  medicationType: {
    fontSize: 12,
    fontWeight: '500',
  },
  medicationDosage: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  medicationTimes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  timeTag: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timeTagText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  medicationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  stockLow: {
    color: COLORS.error,
    fontWeight: '500',
  },
  reminderBadge: {
    fontSize: 11,
    color: COLORS.primary,
  },
  deleteButton: {
    padding: 16,
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 18,
  },

  // Calendar
  calendarContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarNavButton: {
    padding: 8,
  },
  calendarNavText: {
    fontSize: 16,
    color: COLORS.primary,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  calendarWeekDays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarWeekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  calendarDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  calendarDaySelected: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
  },
  calendarDayToday: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
  },
  calendarDayText: {
    fontSize: 14,
    color: COLORS.text,
  },
  calendarDayTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  calendarDaySunday: {
    color: COLORS.error,
  },
  calendarDaySaturday: {
    color: '#2196F3',
  },
  calendarDayIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.textLight,
  },

  // Selected Day
  selectedDaySection: {
    marginTop: 8,
  },
  noRecordText: {
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  recordStatus: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  recordInfo: {
    flex: 1,
  },
  recordName: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  recordDetails: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  recordStatusText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Inventory
  inventoryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  inventoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  inventoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  refillButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  refillButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  inventoryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inventoryBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    marginRight: 12,
    overflow: 'hidden',
  },
  inventoryBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  inventoryCount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    minWidth: 50,
    textAlign: 'right',
  },
  inventoryCountLow: {
    color: COLORS.error,
  },
  inventoryDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inventoryMinStock: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  inventoryWarning: {
    fontSize: 12,
    color: COLORS.error,
    fontWeight: '500',
  },
  refillHistory: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  refillHistoryTitle: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  refillHistoryItem: {
    fontSize: 12,
    color: COLORS.textMuted,
    paddingVertical: 2,
  },

  // Stats
  statsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statsItem: {
    alignItems: 'center',
  },
  statsCircleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statsNumber: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statsNumberValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statsNumberUnit: {
    fontSize: 14,
    color: COLORS.textLight,
    marginLeft: 2,
  },
  statsLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 8,
  },
  medStatCard: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  medStatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  medStatName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  medStatRate: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  medStatBar: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    marginBottom: 6,
    overflow: 'hidden',
  },
  medStatBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  medStatCount: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  tipsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 20,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalCancel: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formTextarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeOption: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.background,
  },
  typeOptionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  typeOptionText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  typeOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  dosageRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dosageInput: {
    flex: 1,
  },
  unitSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  unitOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  unitOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.background,
  },
  unitOptionText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  unitOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  frequencySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  freqOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  freqOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  freqOptionText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  freqOptionTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  timesSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  timeOption: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timeOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  timeOptionIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  timeOptionText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  timeOptionTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Refill Modal
  refillModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  refillModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  refillModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  refillModalMed: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  refillModalCurrent: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 16,
  },
  refillModalInput: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  refillModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  refillModalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.background,
  },
  refillModalCancelText: {
    textAlign: 'center',
    color: COLORS.textLight,
    fontWeight: '600',
  },
  refillModalConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  refillModalConfirmText: {
    textAlign: 'center',
    color: COLORS.white,
    fontWeight: '600',
  },
});

export default MedicationScreen;
