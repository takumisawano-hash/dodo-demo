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
} from 'react-native';

// =====================================================
// 😴 DoDo Life 睡眠記録ミニアプリ
// Sleep Cycle機能80%再現 - フル機能実装
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
  sleep: '#7E57C2',
  sleepLight: '#B39DDB',
  sleepDark: '#5E35B1',
  night: '#1A237E',
  morning: '#FFB74D',
  excellent: '#4CAF50',
  good: '#8BC34A',
  fair: '#FFC107',
  poor: '#FF9800',
  bad: '#F44336',
};

// =====================================================
// 型定義
// =====================================================

interface SleepRecord {
  id: string;
  date: string;
  bedTime: string; // HH:MM形式
  wakeTime: string; // HH:MM形式
  quality: 1 | 2 | 3 | 4 | 5;
  duration: number; // 時間（小数）
  notes?: string;
  tags?: string[];
}

interface SleepGoals {
  targetHours: number;
  targetBedTime: string;
  targetWakeTime: string;
  weeklyGoalDays: number; // 週何日目標達成を目指すか
}

interface SleepStats {
  averageDuration: number;
  averageQuality: number;
  totalDebt: number;
  streakDays: number;
  bestDay: string;
  worstDay: string;
}

type ViewMode = 'today' | 'week' | 'month' | 'trends';
type ModalType = 'record' | 'goals' | 'details' | null;

// =====================================================
// ユーティリティ関数
// =====================================================

const generateId = (): string => Math.random().toString(36).substr(2, 9);

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const getToday = (): string => formatDate(new Date());

const parseTimeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const formatMinutesToTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const calculateSleepDuration = (bedTime: string, wakeTime: string): number => {
  let bedMinutes = parseTimeToMinutes(bedTime);
  let wakeMinutes = parseTimeToMinutes(wakeTime);
  
  // 翌日起床の場合
  if (wakeMinutes < bedMinutes) {
    wakeMinutes += 24 * 60;
  }
  
  return (wakeMinutes - bedMinutes) / 60;
};

const formatDuration = (hours: number): string => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}時間${m > 0 ? `${m}分` : ''}`;
};

const formatDurationShort = (hours: number): string => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h${m > 0 ? `${m}m` : ''}`;
};

const getQualityLabel = (quality: number): string => {
  const labels = ['', '悪い', 'やや悪い', '普通', '良い', '最高'];
  return labels[quality] || '';
};

const getQualityEmoji = (quality: number): string => {
  const emojis = ['', '😫', '😴', '😐', '😊', '🌟'];
  return emojis[quality] || '';
};

const getQualityColor = (quality: number): string => {
  const colors = [COLORS.textMuted, COLORS.bad, COLORS.poor, COLORS.fair, COLORS.good, COLORS.excellent];
  return colors[quality] || COLORS.textMuted;
};

const getDayOfWeek = (dateStr: string): string => {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const date = new Date(dateStr);
  return days[date.getDay()];
};

const getDateLabel = (dateStr: string): string => {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const getLast7Days = (): string[] => {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push(formatDate(date));
  }
  return days;
};

const getLast30Days = (): string[] => {
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push(formatDate(date));
  }
  return days;
};

// =====================================================
// サンプルデータ
// =====================================================

const generateSampleData = (): SleepRecord[] => {
  const records: SleepRecord[] = [];
  const now = new Date();
  
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // 週末は遅めの就寝
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    
    const baseBedHour = isWeekend ? 24 : 23;
    const bedVariation = Math.floor(Math.random() * 90) - 30;
    const bedMinutes = baseBedHour * 60 + bedVariation;
    
    const baseWakeHour = isWeekend ? 8 : 7;
    const wakeVariation = Math.floor(Math.random() * 60) - 30;
    const wakeMinutes = baseWakeHour * 60 + wakeVariation;
    
    const bedTime = formatMinutesToTime(bedMinutes);
    const wakeTime = formatMinutesToTime(wakeMinutes);
    const duration = calculateSleepDuration(bedTime, wakeTime);
    
    // 品質は睡眠時間に相関させる
    let quality: 1 | 2 | 3 | 4 | 5;
    if (duration >= 7.5) quality = 5;
    else if (duration >= 7) quality = 4;
    else if (duration >= 6) quality = 3;
    else if (duration >= 5) quality = 2;
    else quality = 1;
    
    // ランダム要素を追加
    const qualityVariation = Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0;
    quality = Math.max(1, Math.min(5, quality + qualityVariation)) as 1 | 2 | 3 | 4 | 5;
    
    records.push({
      id: generateId(),
      date: formatDate(date),
      bedTime,
      wakeTime,
      quality,
      duration,
      notes: '',
      tags: [],
    });
  }
  
  return records;
};

// =====================================================
// カスタムグラフコンポーネント
// =====================================================

interface BarChartProps {
  data: { label: string; value: number; quality?: number }[];
  height?: number;
  targetValue?: number;
  maxValue?: number;
  showTarget?: boolean;
}

const BarChart: React.FC<BarChartProps> = ({
  data,
  height = 200,
  targetValue = 8,
  maxValue = 12,
  showTarget = true,
}) => {
  if (data.length === 0) {
    return (
      <View style={[styles.chartContainer, { height }]}>
        <Text style={styles.noDataText}>データがありません</Text>
      </View>
    );
  }

  const chartHeight = height - 50;
  const barWidth = Math.max(20, (SCREEN_WIDTH - 100) / data.length - 8);
  const targetY = chartHeight - (targetValue / maxValue) * chartHeight;

  return (
    <View style={[styles.chartContainer, { height }]}>
      <View style={styles.chartInner}>
        {/* Y軸ラベル */}
        <View style={styles.yAxisLabels}>
          <Text style={styles.axisLabel}>{maxValue}h</Text>
          <Text style={styles.axisLabel}>{maxValue / 2}h</Text>
          <Text style={styles.axisLabel}>0h</Text>
        </View>

        {/* グラフエリア */}
        <View style={[styles.chartArea, { height: chartHeight }]}>
          {/* 目標ライン */}
          {showTarget && (
            <View style={[styles.targetLine, { top: targetY }]}>
              <View style={styles.targetLineDash} />
              <Text style={styles.targetLabel}>目標 {targetValue}h</Text>
            </View>
          )}

          {/* バー */}
          <View style={styles.barsContainer}>
            {data.map((item, index) => {
              const barHeight = (item.value / maxValue) * chartHeight;
              const isAboveTarget = item.value >= targetValue;
              const qualityColor = item.quality ? getQualityColor(item.quality) : COLORS.primary;
              
              return (
                <View key={index} style={styles.barWrapper}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barHeight,
                        width: barWidth,
                        backgroundColor: isAboveTarget ? COLORS.success : qualityColor,
                        opacity: isAboveTarget ? 1 : 0.7,
                      },
                    ]}
                  >
                    <Text style={styles.barValue}>
                      {formatDurationShort(item.value)}
                    </Text>
                  </View>
                  <Text style={styles.barLabel}>{item.label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
};

interface QualityChartProps {
  data: { label: string; quality: number }[];
  height?: number;
}

const QualityChart: React.FC<QualityChartProps> = ({ data, height = 150 }) => {
  if (data.length === 0) {
    return (
      <View style={[styles.chartContainer, { height }]}>
        <Text style={styles.noDataText}>データがありません</Text>
      </View>
    );
  }

  const chartHeight = height - 50;
  const dotSize = 12;
  const lineHeight = chartHeight / 5;

  return (
    <View style={[styles.chartContainer, { height }]}>
      <View style={styles.chartInner}>
        {/* Y軸ラベル */}
        <View style={styles.yAxisLabels}>
          <Text style={styles.axisLabel}>🌟</Text>
          <Text style={styles.axisLabel}>😐</Text>
          <Text style={styles.axisLabel}>😫</Text>
        </View>

        {/* グラフエリア */}
        <View style={[styles.chartArea, { height: chartHeight }]}>
          {/* グリッドライン */}
          {[1, 2, 3, 4, 5].map((level) => (
            <View
              key={level}
              style={[
                styles.gridLine,
                { top: chartHeight - level * lineHeight + lineHeight / 2 },
              ]}
            />
          ))}

          {/* ドット */}
          <View style={styles.dotsContainer}>
            {data.map((item, index) => {
              const y = chartHeight - item.quality * lineHeight + lineHeight / 2;
              return (
                <View key={index} style={styles.dotWrapper}>
                  <View
                    style={[
                      styles.qualityDot,
                      {
                        width: dotSize,
                        height: dotSize,
                        backgroundColor: getQualityColor(item.quality),
                        top: y - dotSize / 2,
                      },
                    ]}
                  />
                  <Text style={styles.barLabel}>{item.label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
};

// =====================================================
// 睡眠サイクルビジュアライゼーション
// =====================================================

interface SleepCycleProps {
  bedTime: string;
  wakeTime: string;
  quality: number;
}

const SleepCycleVisual: React.FC<SleepCycleProps> = ({ bedTime, wakeTime, quality }) => {
  const duration = calculateSleepDuration(bedTime, wakeTime);
  const cycles = Math.floor(duration / 1.5); // 約90分サイクル
  
  return (
    <View style={styles.sleepCycleContainer}>
      <View style={styles.sleepCycleHeader}>
        <View style={styles.sleepTimeBlock}>
          <Text style={styles.sleepTimeIcon}>🌙</Text>
          <Text style={styles.sleepTimeLabel}>就寝</Text>
          <Text style={styles.sleepTimeValue}>{bedTime}</Text>
        </View>
        
        <View style={styles.sleepDurationBlock}>
          <Text style={styles.sleepDurationValue}>{formatDuration(duration)}</Text>
          <View style={styles.sleepCycleIndicators}>
            {Array.from({ length: Math.min(cycles, 6) }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.cycleIndicator,
                  { backgroundColor: i < 4 ? COLORS.sleep : COLORS.sleepLight },
                ]}
              />
            ))}
          </View>
          <Text style={styles.cycleText}>{cycles}サイクル</Text>
        </View>
        
        <View style={styles.sleepTimeBlock}>
          <Text style={styles.sleepTimeIcon}>☀️</Text>
          <Text style={styles.sleepTimeLabel}>起床</Text>
          <Text style={styles.sleepTimeValue}>{wakeTime}</Text>
        </View>
      </View>
      
      <View style={styles.qualityIndicator}>
        <Text style={styles.qualityText}>睡眠品質</Text>
        <View style={styles.qualityStars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Text
              key={star}
              style={[
                styles.qualityStar,
                { opacity: star <= quality ? 1 : 0.3 },
              ]}
            >
              ⭐
            </Text>
          ))}
        </View>
        <Text style={[styles.qualityLabel, { color: getQualityColor(quality) }]}>
          {getQualityEmoji(quality)} {getQualityLabel(quality)}
        </Text>
      </View>
    </View>
  );
};

// =====================================================
// 睡眠負債カード
// =====================================================

interface SleepDebtCardProps {
  debt: number;
  targetHours: number;
}

const SleepDebtCard: React.FC<SleepDebtCardProps> = ({ debt, targetHours }) => {
  const isPositive = debt >= 0;
  const absDebt = Math.abs(debt);
  
  return (
    <View style={[
      styles.debtCard,
      { backgroundColor: isPositive ? '#E8F5E9' : '#FFEBEE' },
    ]}>
      <View style={styles.debtHeader}>
        <Text style={styles.debtIcon}>{isPositive ? '✅' : '⚠️'}</Text>
        <Text style={styles.debtTitle}>週間睡眠負債</Text>
      </View>
      
      <View style={styles.debtContent}>
        <Text style={[
          styles.debtValue,
          { color: isPositive ? COLORS.success : COLORS.error },
        ]}>
          {isPositive ? '+' : '-'}{formatDuration(absDebt)}
        </Text>
        <Text style={styles.debtDescription}>
          {isPositive
            ? `目標(${targetHours}h×7)を達成しています！`
            : `目標まであと${formatDuration(absDebt)}必要です`}
        </Text>
      </View>
      
      {!isPositive && (
        <View style={styles.debtTip}>
          <Text style={styles.debtTipIcon}>💡</Text>
          <Text style={styles.debtTipText}>
            今週中に{formatDuration(absDebt / Math.max(1, 7 - new Date().getDay()))}ずつ多く寝ると取り戻せます
          </Text>
        </View>
      )}
    </View>
  );
};

// =====================================================
// 記録入力モーダル
// =====================================================

interface RecordModalProps {
  visible: boolean;
  record: Partial<SleepRecord>;
  onSave: (record: SleepRecord) => void;
  onClose: () => void;
  isEdit?: boolean;
}

const RecordModal: React.FC<RecordModalProps> = ({
  visible,
  record,
  onSave,
  onClose,
  isEdit = false,
}) => {
  const [bedTime, setBedTime] = useState(record.bedTime || '23:00');
  const [wakeTime, setWakeTime] = useState(record.wakeTime || '07:00');
  const [quality, setQuality] = useState<1 | 2 | 3 | 4 | 5>(record.quality || 3);
  const [notes, setNotes] = useState(record.notes || '');

  const handleSave = () => {
    const duration = calculateSleepDuration(bedTime, wakeTime);
    
    if (duration < 0.5 || duration > 24) {
      Alert.alert('エラー', '睡眠時間が正しくありません');
      return;
    }

    const newRecord: SleepRecord = {
      id: record.id || generateId(),
      date: record.date || getToday(),
      bedTime,
      wakeTime,
      quality,
      duration,
      notes,
      tags: record.tags || [],
    };

    onSave(newRecord);
    onClose();
  };

  const adjustTime = (current: string, minutes: number): string => {
    const totalMinutes = parseTimeToMinutes(current) + minutes;
    return formatMinutesToTime((totalMinutes + 24 * 60) % (24 * 60));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalCancel}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {isEdit ? '睡眠記録を編集' : '睡眠を記録'}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.modalSave}>保存</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* 就寝時刻 */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>🌙 就寝時刻</Text>
              <View style={styles.timeInputContainer}>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setBedTime(adjustTime(bedTime, -15))}
                >
                  <Text style={styles.timeButtonText}>-15</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.timeInput}
                  value={bedTime}
                  onChangeText={setBedTime}
                  placeholder="23:00"
                  keyboardType="numbers-and-punctuation"
                />
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setBedTime(adjustTime(bedTime, 15))}
                >
                  <Text style={styles.timeButtonText}>+15</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 起床時刻 */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>☀️ 起床時刻</Text>
              <View style={styles.timeInputContainer}>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setWakeTime(adjustTime(wakeTime, -15))}
                >
                  <Text style={styles.timeButtonText}>-15</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.timeInput}
                  value={wakeTime}
                  onChangeText={setWakeTime}
                  placeholder="07:00"
                  keyboardType="numbers-and-punctuation"
                />
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setWakeTime(adjustTime(wakeTime, 15))}
                >
                  <Text style={styles.timeButtonText}>+15</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.durationPreview}>
                睡眠時間: {formatDuration(calculateSleepDuration(bedTime, wakeTime))}
              </Text>
            </View>

            {/* 睡眠品質 */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>⭐ 睡眠品質</Text>
              <View style={styles.qualitySelector}>
                {([1, 2, 3, 4, 5] as const).map((q) => (
                  <TouchableOpacity
                    key={q}
                    style={[
                      styles.qualityOption,
                      quality === q && styles.qualityOptionSelected,
                      quality === q && { borderColor: getQualityColor(q) },
                    ]}
                    onPress={() => setQuality(q)}
                  >
                    <Text style={styles.qualityOptionEmoji}>{getQualityEmoji(q)}</Text>
                    <Text style={[
                      styles.qualityOptionLabel,
                      quality === q && { color: getQualityColor(q) },
                    ]}>
                      {getQualityLabel(q)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* メモ */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>📝 メモ（任意）</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="夢を見た、途中で起きた、など"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* クイック入力ボタン */}
            <View style={styles.quickButtons}>
              <Text style={styles.quickButtonsLabel}>クイック入力</Text>
              <View style={styles.quickButtonsRow}>
                {[
                  { bed: '22:00', wake: '06:00' },
                  { bed: '23:00', wake: '07:00' },
                  { bed: '00:00', wake: '08:00' },
                  { bed: '01:00', wake: '09:00' },
                ].map((preset, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.quickButton}
                    onPress={() => {
                      setBedTime(preset.bed);
                      setWakeTime(preset.wake);
                    }}
                  >
                    <Text style={styles.quickButtonText}>
                      {preset.bed}→{preset.wake}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// =====================================================
// 目標設定モーダル
// =====================================================

interface GoalsModalProps {
  visible: boolean;
  goals: SleepGoals;
  onSave: (goals: SleepGoals) => void;
  onClose: () => void;
}

const GoalsModal: React.FC<GoalsModalProps> = ({
  visible,
  goals,
  onSave,
  onClose,
}) => {
  const [targetHours, setTargetHours] = useState(goals.targetHours.toString());
  const [targetBedTime, setTargetBedTime] = useState(goals.targetBedTime);
  const [targetWakeTime, setTargetWakeTime] = useState(goals.targetWakeTime);

  const handleSave = () => {
    const hours = parseFloat(targetHours);
    if (isNaN(hours) || hours < 4 || hours > 12) {
      Alert.alert('エラー', '目標睡眠時間は4〜12時間で設定してください');
      return;
    }

    onSave({
      ...goals,
      targetHours: hours,
      targetBedTime,
      targetWakeTime,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalCancel}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>睡眠目標を設定</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.modalSave}>保存</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>🎯 目標睡眠時間</Text>
              <View style={styles.goalInputRow}>
                <TouchableOpacity
                  style={styles.goalButton}
                  onPress={() => setTargetHours((h) => Math.max(4, parseFloat(h) - 0.5).toString())}
                >
                  <Text style={styles.goalButtonText}>−</Text>
                </TouchableOpacity>
                <View style={styles.goalValueContainer}>
                  <Text style={styles.goalValue}>{targetHours}</Text>
                  <Text style={styles.goalUnit}>時間</Text>
                </View>
                <TouchableOpacity
                  style={styles.goalButton}
                  onPress={() => setTargetHours((h) => Math.min(12, parseFloat(h) + 0.5).toString())}
                >
                  <Text style={styles.goalButtonText}>＋</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>🌙 目標就寝時刻</Text>
              <TextInput
                style={styles.goalTimeInput}
                value={targetBedTime}
                onChangeText={setTargetBedTime}
                placeholder="23:00"
              />
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>☀️ 目標起床時刻</Text>
              <TextInput
                style={styles.goalTimeInput}
                value={targetWakeTime}
                onChangeText={setTargetWakeTime}
                placeholder="07:00"
              />
            </View>

            <View style={styles.recommendationCard}>
              <Text style={styles.recommendationTitle}>💡 推奨睡眠時間</Text>
              <View style={styles.recommendationList}>
                <Text style={styles.recommendationItem}>• 成人（18-64歳）: 7-9時間</Text>
                <Text style={styles.recommendationItem}>• 高齢者（65歳以上）: 7-8時間</Text>
                <Text style={styles.recommendationItem}>• 若年層（18-25歳）: 7-9時間</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// =====================================================
// メインコンポーネント
// =====================================================

const SleepScreen: React.FC = () => {
  // State
  const [records, setRecords] = useState<SleepRecord[]>(generateSampleData);
  const [goals, setGoals] = useState<SleepGoals>({
    targetHours: 7.5,
    targetBedTime: '23:00',
    targetWakeTime: '06:30',
    weeklyGoalDays: 5,
  });
  const [viewMode, setViewMode] = useState<ViewMode>('today');
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedRecord, setSelectedRecord] = useState<SleepRecord | null>(null);

  // 今日の記録
  const todayRecord = useMemo(() => {
    return records.find((r) => r.date === getToday());
  }, [records]);

  // 週間データ
  const weeklyData = useMemo(() => {
    const last7Days = getLast7Days();
    return last7Days.map((date) => {
      const record = records.find((r) => r.date === date);
      return {
        label: getDayOfWeek(date),
        value: record?.duration || 0,
        quality: record?.quality || 0,
        date,
      };
    });
  }, [records]);

  // 月間データ
  const monthlyData = useMemo(() => {
    const last30Days = getLast30Days();
    // 週ごとに集計
    const weeks: { label: string; value: number; quality: number }[] = [];
    for (let i = 0; i < 4; i++) {
      const weekDays = last30Days.slice(i * 7, (i + 1) * 7);
      const weekRecords = weekDays
        .map((date) => records.find((r) => r.date === date))
        .filter(Boolean) as SleepRecord[];
      
      const avgDuration = weekRecords.length > 0
        ? weekRecords.reduce((sum, r) => sum + r.duration, 0) / weekRecords.length
        : 0;
      const avgQuality = weekRecords.length > 0
        ? Math.round(weekRecords.reduce((sum, r) => sum + r.quality, 0) / weekRecords.length)
        : 0;
      
      weeks.push({
        label: `${i + 1}週`,
        value: avgDuration,
        quality: avgQuality,
      });
    }
    return weeks;
  }, [records]);

  // 統計計算
  const stats = useMemo((): SleepStats => {
    const last7Days = getLast7Days();
    const weekRecords = last7Days
      .map((date) => records.find((r) => r.date === date))
      .filter(Boolean) as SleepRecord[];

    const totalDuration = weekRecords.reduce((sum, r) => sum + r.duration, 0);
    const totalQuality = weekRecords.reduce((sum, r) => sum + r.quality, 0);
    
    const targetTotal = goals.targetHours * 7;
    const debt = totalDuration - targetTotal;

    // ストリーク計算
    let streak = 0;
    const sortedRecords = [...records].sort((a, b) => b.date.localeCompare(a.date));
    for (const record of sortedRecords) {
      if (record.duration >= goals.targetHours) {
        streak++;
      } else {
        break;
      }
    }

    // ベスト/ワースト日
    const last30DaysRecords = records.filter((r) => {
      const date = new Date(r.date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return date >= thirtyDaysAgo;
    });

    const bestRecord = last30DaysRecords.reduce((best, r) => 
      r.duration > (best?.duration || 0) ? r : best, null as SleepRecord | null);
    const worstRecord = last30DaysRecords.reduce((worst, r) => 
      r.duration < (worst?.duration || 24) ? r : worst, null as SleepRecord | null);

    return {
      averageDuration: weekRecords.length > 0 ? totalDuration / weekRecords.length : 0,
      averageQuality: weekRecords.length > 0 ? totalQuality / weekRecords.length : 0,
      totalDebt: debt,
      streakDays: streak,
      bestDay: bestRecord ? getDayOfWeek(bestRecord.date) : '-',
      worstDay: worstRecord ? getDayOfWeek(worstRecord.date) : '-',
    };
  }, [records, goals.targetHours]);

  // ハンドラー
  const handleAddRecord = useCallback(() => {
    setSelectedRecord(null);
    setModalType('record');
  }, []);

  const handleEditRecord = useCallback((record: SleepRecord) => {
    setSelectedRecord(record);
    setModalType('record');
  }, []);

  const handleSaveRecord = useCallback((newRecord: SleepRecord) => {
    setRecords((prev) => {
      const existing = prev.findIndex((r) => r.id === newRecord.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newRecord;
        return updated;
      }
      return [...prev, newRecord];
    });
  }, []);

  const handleDeleteRecord = useCallback((id: string) => {
    Alert.alert(
      '削除確認',
      'この記録を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            setRecords((prev) => prev.filter((r) => r.id !== id));
          },
        },
      ]
    );
  }, []);

  // レンダリング
  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>😴 睡眠記録</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setModalType('goals')}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* ビューモード切り替え */}
      <View style={styles.viewModeContainer}>
        {(['today', 'week', 'month', 'trends'] as ViewMode[]).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.viewModeButton,
              viewMode === mode && styles.viewModeButtonActive,
            ]}
            onPress={() => setViewMode(mode)}
          >
            <Text
              style={[
                styles.viewModeText,
                viewMode === mode && styles.viewModeTextActive,
              ]}
            >
              {mode === 'today' ? '今日' : mode === 'week' ? '週間' : mode === 'month' ? '月間' : '傾向'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 今日ビュー */}
        {viewMode === 'today' && (
          <View>
            {todayRecord ? (
              <TouchableOpacity onPress={() => handleEditRecord(todayRecord)}>
                <SleepCycleVisual
                  bedTime={todayRecord.bedTime}
                  wakeTime={todayRecord.wakeTime}
                  quality={todayRecord.quality}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.noRecordCard} onPress={handleAddRecord}>
                <Text style={styles.noRecordIcon}>🌙</Text>
                <Text style={styles.noRecordText}>今日の睡眠を記録しましょう</Text>
                <View style={styles.noRecordButton}>
                  <Text style={styles.noRecordButtonText}>＋ 記録する</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* 今週のサマリー */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>📊 今週のサマリー</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{formatDuration(stats.averageDuration)}</Text>
                  <Text style={styles.summaryLabel}>平均睡眠</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{stats.averageQuality.toFixed(1)}</Text>
                  <Text style={styles.summaryLabel}>平均品質</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{stats.streakDays}日</Text>
                  <Text style={styles.summaryLabel}>連続達成</Text>
                </View>
              </View>
            </View>

            {/* 睡眠負債 */}
            <SleepDebtCard debt={stats.totalDebt} targetHours={goals.targetHours} />
          </View>
        )}

        {/* 週間ビュー */}
        {viewMode === 'week' && (
          <View>
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>📈 週間睡眠時間</Text>
              <BarChart
                data={weeklyData}
                targetValue={goals.targetHours}
                height={220}
              />
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>⭐ 週間睡眠品質</Text>
              <QualityChart
                data={weeklyData.map((d) => ({ label: d.label, quality: d.quality }))}
                height={160}
              />
            </View>

            {/* 週間記録リスト */}
            <View style={styles.recordsList}>
              <Text style={styles.recordsListTitle}>📝 記録一覧</Text>
              {weeklyData.map((day) => {
                const record = records.find((r) => r.date === day.date);
                return (
                  <TouchableOpacity
                    key={day.date}
                    style={styles.recordItem}
                    onPress={() => record && handleEditRecord(record)}
                  >
                    <View style={styles.recordItemLeft}>
                      <Text style={styles.recordItemDay}>{day.label}</Text>
                      <Text style={styles.recordItemDate}>{getDateLabel(day.date)}</Text>
                    </View>
                    {record ? (
                      <View style={styles.recordItemRight}>
                        <Text style={styles.recordItemDuration}>
                          {formatDuration(record.duration)}
                        </Text>
                        <Text style={styles.recordItemQuality}>
                          {getQualityEmoji(record.quality)}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.recordItemEmpty}>未記録</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* 月間ビュー */}
        {viewMode === 'month' && (
          <View>
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>📈 月間平均睡眠時間（週別）</Text>
              <BarChart
                data={monthlyData}
                targetValue={goals.targetHours}
                height={220}
              />
            </View>

            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>⭐ 月間平均品質（週別）</Text>
              <QualityChart
                data={monthlyData.map((d) => ({ label: d.label, quality: d.quality }))}
                height={160}
              />
            </View>

            {/* 月間統計 */}
            <View style={styles.monthlyStats}>
              <Text style={styles.monthlyStatsTitle}>📊 月間統計</Text>
              <View style={styles.monthlyStatsGrid}>
                <View style={styles.monthlyStatItem}>
                  <Text style={styles.monthlyStatIcon}>⏰</Text>
                  <Text style={styles.monthlyStatValue}>
                    {formatDuration(monthlyData.reduce((s, d) => s + d.value, 0) / 4)}
                  </Text>
                  <Text style={styles.monthlyStatLabel}>平均睡眠</Text>
                </View>
                <View style={styles.monthlyStatItem}>
                  <Text style={styles.monthlyStatIcon}>🏆</Text>
                  <Text style={styles.monthlyStatValue}>{stats.bestDay}</Text>
                  <Text style={styles.monthlyStatLabel}>ベスト曜日</Text>
                </View>
                <View style={styles.monthlyStatItem}>
                  <Text style={styles.monthlyStatIcon}>📉</Text>
                  <Text style={styles.monthlyStatValue}>{stats.worstDay}</Text>
                  <Text style={styles.monthlyStatLabel}>要改善曜日</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* 傾向ビュー */}
        {viewMode === 'trends' && (
          <View>
            <View style={styles.trendCard}>
              <Text style={styles.trendTitle}>🎯 目標達成状況</Text>
              <View style={styles.trendContent}>
                <View style={styles.trendCircle}>
                  <Text style={styles.trendCircleValue}>
                    {Math.round(
                      (weeklyData.filter((d) => d.value >= goals.targetHours).length / 7) * 100
                    )}%
                  </Text>
                  <Text style={styles.trendCircleLabel}>今週</Text>
                </View>
                <View style={styles.trendDetails}>
                  <Text style={styles.trendDetailItem}>
                    目標: {goals.targetHours}時間/日
                  </Text>
                  <Text style={styles.trendDetailItem}>
                    達成日数: {weeklyData.filter((d) => d.value >= goals.targetHours).length}/7日
                  </Text>
                  <Text style={styles.trendDetailItem}>
                    連続達成: {stats.streakDays}日
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.trendCard}>
              <Text style={styles.trendTitle}>💤 睡眠パターン分析</Text>
              <View style={styles.patternAnalysis}>
                <View style={styles.patternItem}>
                  <Text style={styles.patternIcon}>🌙</Text>
                  <View style={styles.patternInfo}>
                    <Text style={styles.patternLabel}>平均就寝時刻</Text>
                    <Text style={styles.patternValue}>
                      {records.length > 0
                        ? formatMinutesToTime(
                            Math.round(
                              records.reduce((sum, r) => sum + parseTimeToMinutes(r.bedTime), 0) /
                                records.length
                            )
                          )
                        : '--:--'}
                    </Text>
                  </View>
                </View>
                <View style={styles.patternItem}>
                  <Text style={styles.patternIcon}>☀️</Text>
                  <View style={styles.patternInfo}>
                    <Text style={styles.patternLabel}>平均起床時刻</Text>
                    <Text style={styles.patternValue}>
                      {records.length > 0
                        ? formatMinutesToTime(
                            Math.round(
                              records.reduce((sum, r) => sum + parseTimeToMinutes(r.wakeTime), 0) /
                                records.length
                            )
                          )
                        : '--:--'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>💡 睡眠改善ヒント</Text>
              <View style={styles.tipsList}>
                {stats.averageDuration < goals.targetHours && (
                  <View style={styles.tipItem}>
                    <Text style={styles.tipIcon}>⏰</Text>
                    <Text style={styles.tipText}>
                      目標まであと{formatDuration(goals.targetHours - stats.averageDuration)}
                      必要です。就寝時間を早めてみましょう。
                    </Text>
                  </View>
                )}
                {stats.averageQuality < 3.5 && (
                  <View style={styles.tipItem}>
                    <Text style={styles.tipIcon}>📱</Text>
                    <Text style={styles.tipText}>
                      睡眠品質が低めです。就寝前のスマホ使用を控えてみましょう。
                    </Text>
                  </View>
                )}
                {stats.averageDuration >= goals.targetHours && stats.averageQuality >= 3.5 && (
                  <View style={styles.tipItem}>
                    <Text style={styles.tipIcon}>🎉</Text>
                    <Text style={styles.tipText}>
                      素晴らしい！良い睡眠習慣が身についています。
                      このペースを維持しましょう！
                    </Text>
                  </View>
                )}
                <View style={styles.tipItem}>
                  <Text style={styles.tipIcon}>🧘</Text>
                  <Text style={styles.tipText}>
                    寝る前のストレッチや深呼吸は睡眠の質を高めます。
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* 追加ボタン */}
      <TouchableOpacity style={styles.fab} onPress={handleAddRecord}>
        <Text style={styles.fabIcon}>＋</Text>
      </TouchableOpacity>

      {/* モーダル */}
      <RecordModal
        visible={modalType === 'record'}
        record={selectedRecord || {}}
        onSave={handleSaveRecord}
        onClose={() => {
          setModalType(null);
          setSelectedRecord(null);
        }}
        isEdit={!!selectedRecord}
      />

      <GoalsModal
        visible={modalType === 'goals'}
        goals={goals}
        onSave={setGoals}
        onClose={() => setModalType(null)}
      />
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
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  settingsButton: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 24,
  },
  viewModeContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  viewModeButtonActive: {
    backgroundColor: COLORS.primary,
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  viewModeTextActive: {
    color: COLORS.white,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  
  // 睡眠サイクル表示
  sleepCycleContainer: {
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
  sleepCycleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sleepTimeBlock: {
    alignItems: 'center',
  },
  sleepTimeIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  sleepTimeLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  sleepTimeValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  sleepDurationBlock: {
    alignItems: 'center',
  },
  sleepDurationValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  sleepCycleIndicators: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  cycleIndicator: {
    width: 16,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 2,
  },
  cycleText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  qualityIndicator: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  qualityText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  qualityStars: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  qualityStar: {
    fontSize: 24,
    marginHorizontal: 2,
  },
  qualityLabel: {
    fontSize: 16,
    fontWeight: '600',
  },

  // 記録なしカード
  noRecordCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  noRecordIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  noRecordText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: 16,
  },
  noRecordButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  noRecordButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },

  // サマリーカード
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },

  // 睡眠負債カード
  debtCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  debtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  debtIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  debtTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  debtContent: {
    alignItems: 'center',
    marginBottom: 12,
  },
  debtValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  debtDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  debtTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    padding: 12,
  },
  debtTipIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  debtTipText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
  },

  // グラフ
  chartContainer: {
    justifyContent: 'center',
  },
  chartInner: {
    flexDirection: 'row',
    flex: 1,
  },
  yAxisLabels: {
    width: 40,
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  axisLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'right',
    paddingRight: 8,
  },
  chartArea: {
    flex: 1,
    position: 'relative',
  },
  targetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  targetLineDash: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.primary,
    opacity: 0.5,
    borderStyle: 'dashed',
  },
  targetLabel: {
    fontSize: 10,
    color: COLORS.primary,
    marginLeft: 4,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: '100%',
    paddingBottom: 20,
  },
  barWrapper: {
    alignItems: 'center',
  },
  bar: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 4,
  },
  barValue: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.white,
  },
  barLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    top: 0,
  },
  dotWrapper: {
    alignItems: 'center',
    position: 'relative',
    flex: 1,
  },
  qualityDot: {
    position: 'absolute',
    borderRadius: 50,
  },
  noDataText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
  },

  // チャートカード
  chartCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },

  // 記録リスト
  recordsList: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  recordsListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  recordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  recordItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordItemDay: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    width: 30,
  },
  recordItemDate: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginLeft: 8,
  },
  recordItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordItemDuration: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginRight: 8,
  },
  recordItemQuality: {
    fontSize: 18,
  },
  recordItemEmpty: {
    fontSize: 14,
    color: COLORS.textMuted,
  },

  // 月間統計
  monthlyStats: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  monthlyStatsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  monthlyStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  monthlyStatItem: {
    alignItems: 'center',
  },
  monthlyStatIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  monthlyStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  monthlyStatLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },

  // 傾向カード
  trendCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  trendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  trendContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  trendCircleValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  trendCircleLabel: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.8,
  },
  trendDetails: {
    flex: 1,
  },
  trendDetailItem: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  patternAnalysis: {
    marginTop: 8,
  },
  patternItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  patternIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  patternInfo: {
    flex: 1,
  },
  patternLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  patternValue: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },

  // ヒントカード
  tipsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  tipsList: {
    marginTop: 8,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  tipIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: COLORS.white,
    fontWeight: '300',
  },

  // モーダル
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalCancel: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  modalBody: {
    padding: 20,
  },

  // 入力フィールド
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  timeInput: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginHorizontal: 20,
    minWidth: 120,
  },
  durationPreview: {
    textAlign: 'center',
    fontSize: 14,
    color: COLORS.primary,
    marginTop: 8,
  },
  qualitySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  qualityOption: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    flex: 1,
    marginHorizontal: 2,
  },
  qualityOptionSelected: {
    borderWidth: 2,
    backgroundColor: COLORS.background,
  },
  qualityOptionEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  qualityOptionLabel: {
    fontSize: 10,
    color: COLORS.textLight,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  quickButtons: {
    marginTop: 16,
  },
  quickButtonsLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  quickButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickButton: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  quickButtonText: {
    fontSize: 12,
    color: COLORS.primary,
  },

  // 目標設定
  goalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalButtonText: {
    fontSize: 24,
    color: COLORS.white,
    fontWeight: '600',
  },
  goalValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginHorizontal: 24,
  },
  goalValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  goalUnit: {
    fontSize: 18,
    color: COLORS.textMuted,
    marginLeft: 4,
  },
  goalTimeInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 20,
    textAlign: 'center',
  },
  recommendationCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  recommendationList: {
    marginLeft: 8,
  },
  recommendationItem: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 4,
  },

  bottomSpacer: {
    height: 100,
  },
});

export default SleepScreen;
