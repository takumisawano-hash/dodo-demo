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
// 💪 DoDo Life 健康ミニアプリ
// あすけん機能80%再現 - フル機能実装
// =====================================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// テーマカラー
const COLORS = {
  primary: '#FF6B35',
  primaryLight: '#FF8A5C',
  background: '#FFF5E6',
  white: '#FFFFFF',
  text: '#333333',
  textLight: '#666666',
  textMuted: '#999999',
  border: '#E0E0E0',
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',
  water: '#42A5F5',
  sleep: '#7E57C2',
  exercise: '#66BB6A',
  meal: '#FF7043',
};

// =====================================================
// 型定義
// =====================================================

interface WeightRecord {
  id: string;
  date: string;
  weight: number;
  bodyFat?: number;
  muscleMass?: number;
}

interface MealRecord {
  id: string;
  date: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  time: string;
}

interface ExerciseRecord {
  id: string;
  date: string;
  type: string;
  duration: number; // 分
  caloriesBurned: number;
  intensity: 'low' | 'medium' | 'high';
  time: string;
}

interface WaterRecord {
  id: string;
  date: string;
  cups: number; // コップ単位（1コップ=200ml）
}

interface SleepRecord {
  id: string;
  date: string;
  bedTime: string;
  wakeTime: string;
  quality: 1 | 2 | 3 | 4 | 5;
  duration: number; // 時間
}

interface UserGoals {
  targetWeight: number;
  dailyCalories: number;
  dailyWaterCups: number;
  dailySleepHours: number;
  height: number; // cm
}

type TabType = 'summary' | 'weight' | 'meals' | 'exercise' | 'water' | 'sleep' | 'report';
type ModalType = 'weight' | 'meal' | 'exercise' | 'water' | 'sleep' | 'goals' | null;

// =====================================================
// ユーティリティ関数
// =====================================================

const generateId = (): string => Math.random().toString(36).substr(2, 9);

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const getToday = (): string => formatDate(new Date());

const calculateBMI = (weight: number, heightCm: number): number => {
  const heightM = heightCm / 100;
  return Math.round((weight / (heightM * heightM)) * 10) / 10;
};

const getBMICategory = (bmi: number): { label: string; color: string } => {
  if (bmi < 18.5) return { label: '低体重', color: COLORS.warning };
  if (bmi < 25) return { label: '普通体重', color: COLORS.success };
  if (bmi < 30) return { label: '肥満(1度)', color: COLORS.warning };
  return { label: '肥満(2度以上)', color: COLORS.error };
};

const getMealTypeLabel = (type: MealRecord['type']): string => {
  const labels = { breakfast: '朝食', lunch: '昼食', dinner: '夕食', snack: '間食' };
  return labels[type];
};

const getMealTypeIcon = (type: MealRecord['type']): string => {
  const icons = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍪' };
  return icons[type];
};

const getIntensityLabel = (intensity: ExerciseRecord['intensity']): string => {
  const labels = { low: '軽い', medium: '普通', high: 'ハード' };
  return labels[intensity];
};

// =====================================================
// カスタムグラフコンポーネント
// =====================================================

interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  showLabels?: boolean;
  targetValue?: number;
}

const LineChart: React.FC<LineChartProps> = ({
  data,
  height = 150,
  color = COLORS.primary,
  showLabels = true,
  targetValue,
}) => {
  if (data.length === 0) {
    return (
      <View style={[styles.chartContainer, { height }]}>
        <Text style={styles.noDataText}>データがありません</Text>
      </View>
    );
  }

  const values = data.map(d => d.value);
  const minValue = Math.min(...values) * 0.95;
  const maxValue = Math.max(...values) * 1.05;
  const range = maxValue - minValue || 1;

  const chartWidth = SCREEN_WIDTH - 80;
  const chartHeight = height - 40;
  const pointSpacing = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth / 2;

  const getY = (value: number): number => {
    return chartHeight - ((value - minValue) / range) * chartHeight;
  };

  const points = data.map((d, i) => ({
    x: i * pointSpacing,
    y: getY(d.value),
    label: d.label,
    value: d.value,
  }));

  // SVG path for line
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  return (
    <View style={[styles.chartContainer, { height }]}>
      <View style={styles.chartInner}>
        {/* Y軸ラベル */}
        <View style={styles.yAxisLabels}>
          <Text style={styles.axisLabel}>{maxValue.toFixed(1)}</Text>
          <Text style={styles.axisLabel}>{((maxValue + minValue) / 2).toFixed(1)}</Text>
          <Text style={styles.axisLabel}>{minValue.toFixed(1)}</Text>
        </View>

        {/* グラフエリア */}
        <View style={[styles.chartArea, { height: chartHeight }]}>
          {/* 目標ライン */}
          {targetValue && targetValue >= minValue && targetValue <= maxValue && (
            <View
              style={[
                styles.targetLine,
                { top: getY(targetValue) },
              ]}
            >
              <Text style={styles.targetLabel}>目標 {targetValue}kg</Text>
            </View>
          )}

          {/* グリッドライン */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
            <View
              key={i}
              style={[styles.gridLine, { top: chartHeight * ratio }]}
            />
          ))}

          {/* 折れ線 */}
          <View style={styles.lineContainer}>
            {points.map((point, i) => {
              if (i === points.length - 1) return null;
              const nextPoint = points[i + 1];
              const dx = nextPoint.x - point.x;
              const dy = nextPoint.y - point.y;
              const length = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx) * (180 / Math.PI);

              return (
                <View
                  key={i}
                  style={[
                    styles.lineSegment,
                    {
                      left: point.x,
                      top: point.y,
                      width: length,
                      backgroundColor: color,
                      transform: [{ rotate: `${angle}deg` }],
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* データポイント */}
          {points.map((point, i) => (
            <View
              key={i}
              style={[
                styles.dataPoint,
                {
                  left: point.x - 6,
                  top: point.y - 6,
                  backgroundColor: color,
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* X軸ラベル */}
      {showLabels && (
        <View style={styles.xAxisLabels}>
          {data.map((d, i) => (
            <Text
              key={i}
              style={[styles.axisLabel, { width: pointSpacing }]}
              numberOfLines={1}
            >
              {d.label}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

// =====================================================
// プログレスリングコンポーネント
// =====================================================

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  value?: string;
}

const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 80,
  strokeWidth = 8,
  color = COLORS.primary,
  label,
  value,
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (clampedProgress / 100) * circumference;

  return (
    <View style={[styles.progressRingContainer, { width: size, height: size }]}>
      {/* 背景リング */}
      <View
        style={[
          styles.ringBackground,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: `${color}20`,
          },
        ]}
      />
      {/* プログレスリング（簡易版：4分割で表現） */}
      <View style={styles.progressRingInner}>
        {value && <Text style={styles.progressValue}>{value}</Text>}
        {label && <Text style={styles.progressLabel}>{label}</Text>}
      </View>
      {/* プログレス表示 */}
      <View
        style={[
          styles.progressIndicator,
          {
            width: size - strokeWidth * 2,
            height: size - strokeWidth * 2,
            borderRadius: (size - strokeWidth * 2) / 2,
            borderWidth: strokeWidth,
            borderColor: color,
            borderTopColor: clampedProgress > 25 ? color : 'transparent',
            borderRightColor: clampedProgress > 50 ? color : 'transparent',
            borderBottomColor: clampedProgress > 75 ? color : 'transparent',
            borderLeftColor: clampedProgress > 0 ? color : 'transparent',
            transform: [{ rotate: '-45deg' }],
          },
        ]}
      />
    </View>
  );
};

// =====================================================
// メインコンポーネント
// =====================================================

const HealthScreen: React.FC = () => {
  // 状態管理
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [modalType, setModalType] = useState<ModalType>(null);
  const [reportPeriod, setReportPeriod] = useState<'week' | 'month'>('week');

  // ユーザー目標
  const [goals, setGoals] = useState<UserGoals>({
    targetWeight: 65,
    dailyCalories: 2000,
    dailyWaterCups: 8,
    dailySleepHours: 7,
    height: 170,
  });

  // 記録データ
  const [weightRecords, setWeightRecords] = useState<WeightRecord[]>([
    { id: '1', date: '2025-02-07', weight: 68.5, bodyFat: 22.5 },
    { id: '2', date: '2025-02-08', weight: 68.3, bodyFat: 22.3 },
    { id: '3', date: '2025-02-09', weight: 68.0, bodyFat: 22.1 },
    { id: '4', date: '2025-02-10', weight: 67.8, bodyFat: 21.9 },
    { id: '5', date: '2025-02-11', weight: 67.5, bodyFat: 21.7 },
    { id: '6', date: '2025-02-12', weight: 67.3, bodyFat: 21.5 },
    { id: '7', date: '2025-02-13', weight: 67.0, bodyFat: 21.3 },
  ]);

  const [mealRecords, setMealRecords] = useState<MealRecord[]>([
    { id: '1', date: getToday(), type: 'breakfast', name: '玄米ご飯、味噌汁、焼き魚', calories: 450, protein: 25, carbs: 60, fat: 12, time: '07:30' },
    { id: '2', date: getToday(), type: 'lunch', name: '鶏胸肉サラダ、全粒粉パン', calories: 520, protein: 35, carbs: 45, fat: 18, time: '12:00' },
  ]);

  const [exerciseRecords, setExerciseRecords] = useState<ExerciseRecord[]>([
    { id: '1', date: getToday(), type: 'ウォーキング', duration: 30, caloriesBurned: 150, intensity: 'low', time: '06:30' },
    { id: '2', date: getToday(), type: '筋トレ', duration: 45, caloriesBurned: 200, intensity: 'high', time: '18:00' },
  ]);

  const [waterRecords, setWaterRecords] = useState<WaterRecord[]>([
    { id: '1', date: getToday(), cups: 5 },
  ]);

  const [sleepRecords, setSleepRecords] = useState<SleepRecord[]>([
    { id: '1', date: getToday(), bedTime: '23:00', wakeTime: '06:30', quality: 4, duration: 7.5 },
  ]);

  // 入力用ステート
  const [inputWeight, setInputWeight] = useState('');
  const [inputBodyFat, setInputBodyFat] = useState('');
  const [inputMealType, setInputMealType] = useState<MealRecord['type']>('breakfast');
  const [inputMealName, setInputMealName] = useState('');
  const [inputMealCalories, setInputMealCalories] = useState('');
  const [inputMealProtein, setInputMealProtein] = useState('');
  const [inputMealCarbs, setInputMealCarbs] = useState('');
  const [inputMealFat, setInputMealFat] = useState('');
  const [inputExerciseType, setInputExerciseType] = useState('');
  const [inputExerciseDuration, setInputExerciseDuration] = useState('');
  const [inputExerciseCalories, setInputExerciseCalories] = useState('');
  const [inputExerciseIntensity, setInputExerciseIntensity] = useState<ExerciseRecord['intensity']>('medium');
  const [inputBedTime, setInputBedTime] = useState('23:00');
  const [inputWakeTime, setInputWakeTime] = useState('07:00');
  const [inputSleepQuality, setInputSleepQuality] = useState(4);
  const [inputTargetWeight, setInputTargetWeight] = useState('');
  const [inputDailyCalories, setInputDailyCalories] = useState('');
  const [inputHeight, setInputHeight] = useState('');

  // 計算値
  const todayMeals = mealRecords.filter(m => m.date === getToday());
  const todayExercises = exerciseRecords.filter(e => e.date === getToday());
  const todayWater = waterRecords.find(w => w.date === getToday())?.cups || 0;
  const todaySleep = sleepRecords.find(s => s.date === getToday());
  const latestWeight = weightRecords[weightRecords.length - 1]?.weight || 0;

  const todayCaloriesIn = todayMeals.reduce((sum, m) => sum + m.calories, 0);
  const todayCaloriesOut = todayExercises.reduce((sum, e) => sum + e.caloriesBurned, 0);
  const calorieBalance = todayCaloriesIn - todayCaloriesOut;

  const currentBMI = latestWeight > 0 && goals.height > 0 
    ? calculateBMI(latestWeight, goals.height) 
    : 0;
  const bmiCategory = getBMICategory(currentBMI);

  const weightProgress = goals.targetWeight > 0 
    ? Math.max(0, 100 - ((latestWeight - goals.targetWeight) / goals.targetWeight) * 100)
    : 0;

  const calorieProgress = goals.dailyCalories > 0 
    ? (todayCaloriesIn / goals.dailyCalories) * 100 
    : 0;

  const waterProgress = goals.dailyWaterCups > 0 
    ? (todayWater / goals.dailyWaterCups) * 100 
    : 0;

  const sleepProgress = todaySleep && goals.dailySleepHours > 0
    ? (todaySleep.duration / goals.dailySleepHours) * 100
    : 0;

  // グラフデータ
  const weightChartData = weightRecords.slice(-7).map(r => ({
    label: r.date.slice(5),
    value: r.weight,
  }));

  // 週間・月間レポートデータ
  const getReportData = useCallback(() => {
    const now = new Date();
    const days = reportPeriod === 'week' ? 7 : 30;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const periodMeals = mealRecords.filter(m => new Date(m.date) >= startDate);
    const periodExercises = exerciseRecords.filter(e => new Date(e.date) >= startDate);
    const periodWeights = weightRecords.filter(w => new Date(w.date) >= startDate);
    const periodSleep = sleepRecords.filter(s => new Date(s.date) >= startDate);

    const avgCalories = periodMeals.length > 0
      ? Math.round(periodMeals.reduce((sum, m) => sum + m.calories, 0) / Math.min(days, periodMeals.length))
      : 0;

    const avgExerciseCalories = periodExercises.length > 0
      ? Math.round(periodExercises.reduce((sum, e) => sum + e.caloriesBurned, 0) / Math.min(days, periodExercises.length))
      : 0;

    const weightChange = periodWeights.length >= 2
      ? periodWeights[periodWeights.length - 1].weight - periodWeights[0].weight
      : 0;

    const avgSleep = periodSleep.length > 0
      ? Math.round(periodSleep.reduce((sum, s) => sum + s.duration, 0) / periodSleep.length * 10) / 10
      : 0;

    const totalProtein = periodMeals.reduce((sum, m) => sum + (m.protein || 0), 0);
    const totalCarbs = periodMeals.reduce((sum, m) => sum + (m.carbs || 0), 0);
    const totalFat = periodMeals.reduce((sum, m) => sum + (m.fat || 0), 0);

    return {
      avgCalories,
      avgExerciseCalories,
      weightChange,
      avgSleep,
      totalExerciseMinutes: periodExercises.reduce((sum, e) => sum + e.duration, 0),
      macros: { protein: totalProtein, carbs: totalCarbs, fat: totalFat },
    };
  }, [reportPeriod, mealRecords, exerciseRecords, weightRecords, sleepRecords]);

  const reportData = useMemo(() => getReportData(), [getReportData]);

  // =====================================================
  // 記録追加ハンドラー
  // =====================================================

  const handleAddWeight = () => {
    const weight = parseFloat(inputWeight);
    const bodyFat = inputBodyFat ? parseFloat(inputBodyFat) : undefined;

    if (isNaN(weight) || weight <= 0) {
      Alert.alert('エラー', '正しい体重を入力してください');
      return;
    }

    const newRecord: WeightRecord = {
      id: generateId(),
      date: getToday(),
      weight,
      bodyFat,
    };

    setWeightRecords(prev => [...prev.filter(r => r.date !== getToday()), newRecord]);
    setInputWeight('');
    setInputBodyFat('');
    setModalType(null);
  };

  const handleAddMeal = () => {
    const calories = parseInt(inputMealCalories);

    if (!inputMealName.trim() || isNaN(calories) || calories <= 0) {
      Alert.alert('エラー', '食事名とカロリーを入力してください');
      return;
    }

    const newRecord: MealRecord = {
      id: generateId(),
      date: getToday(),
      type: inputMealType,
      name: inputMealName,
      calories,
      protein: inputMealProtein ? parseInt(inputMealProtein) : undefined,
      carbs: inputMealCarbs ? parseInt(inputMealCarbs) : undefined,
      fat: inputMealFat ? parseInt(inputMealFat) : undefined,
      time: new Date().toTimeString().slice(0, 5),
    };

    setMealRecords(prev => [...prev, newRecord]);
    setInputMealName('');
    setInputMealCalories('');
    setInputMealProtein('');
    setInputMealCarbs('');
    setInputMealFat('');
    setModalType(null);
  };

  const handleAddExercise = () => {
    const duration = parseInt(inputExerciseDuration);
    const calories = parseInt(inputExerciseCalories);

    if (!inputExerciseType.trim() || isNaN(duration) || isNaN(calories)) {
      Alert.alert('エラー', '運動種類、時間、消費カロリーを入力してください');
      return;
    }

    const newRecord: ExerciseRecord = {
      id: generateId(),
      date: getToday(),
      type: inputExerciseType,
      duration,
      caloriesBurned: calories,
      intensity: inputExerciseIntensity,
      time: new Date().toTimeString().slice(0, 5),
    };

    setExerciseRecords(prev => [...prev, newRecord]);
    setInputExerciseType('');
    setInputExerciseDuration('');
    setInputExerciseCalories('');
    setModalType(null);
  };

  const handleAddWater = () => {
    const existing = waterRecords.find(w => w.date === getToday());
    if (existing) {
      setWaterRecords(prev =>
        prev.map(w =>
          w.date === getToday() ? { ...w, cups: w.cups + 1 } : w
        )
      );
    } else {
      setWaterRecords(prev => [
        ...prev,
        { id: generateId(), date: getToday(), cups: 1 },
      ]);
    }
  };

  const handleAddSleep = () => {
    // 睡眠時間計算
    const [bedH, bedM] = inputBedTime.split(':').map(Number);
    const [wakeH, wakeM] = inputWakeTime.split(':').map(Number);
    let duration = (wakeH + wakeM / 60) - (bedH + bedM / 60);
    if (duration < 0) duration += 24;

    const newRecord: SleepRecord = {
      id: generateId(),
      date: getToday(),
      bedTime: inputBedTime,
      wakeTime: inputWakeTime,
      quality: inputSleepQuality as 1 | 2 | 3 | 4 | 5,
      duration: Math.round(duration * 10) / 10,
    };

    setSleepRecords(prev => [...prev.filter(r => r.date !== getToday()), newRecord]);
    setModalType(null);
  };

  const handleUpdateGoals = () => {
    const targetWeight = parseFloat(inputTargetWeight) || goals.targetWeight;
    const dailyCalories = parseInt(inputDailyCalories) || goals.dailyCalories;
    const height = parseInt(inputHeight) || goals.height;

    setGoals(prev => ({
      ...prev,
      targetWeight,
      dailyCalories,
      height,
    }));

    setInputTargetWeight('');
    setInputDailyCalories('');
    setInputHeight('');
    setModalType(null);
  };

  const handleDeleteMeal = (id: string) => {
    Alert.alert('削除確認', 'この食事記録を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: () => setMealRecords(prev => prev.filter(m => m.id !== id)) },
    ]);
  };

  const handleDeleteExercise = (id: string) => {
    Alert.alert('削除確認', 'この運動記録を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: () => setExerciseRecords(prev => prev.filter(e => e.id !== id)) },
    ]);
  };

  // =====================================================
  // 運動プリセット
  // =====================================================

  const exercisePresets = [
    { type: 'ウォーキング', calPerMin: 5, intensity: 'low' as const },
    { type: 'ジョギング', calPerMin: 10, intensity: 'medium' as const },
    { type: 'ランニング', calPerMin: 13, intensity: 'high' as const },
    { type: '筋トレ', calPerMin: 6, intensity: 'high' as const },
    { type: 'サイクリング', calPerMin: 8, intensity: 'medium' as const },
    { type: '水泳', calPerMin: 11, intensity: 'high' as const },
    { type: 'ヨガ', calPerMin: 3, intensity: 'low' as const },
    { type: 'ストレッチ', calPerMin: 2, intensity: 'low' as const },
  ];

  const selectExercisePreset = (preset: typeof exercisePresets[0]) => {
    setInputExerciseType(preset.type);
    setInputExerciseIntensity(preset.intensity);
    const duration = parseInt(inputExerciseDuration) || 30;
    setInputExerciseCalories(String(preset.calPerMin * duration));
  };

  // =====================================================
  // 食事プリセット
  // =====================================================

  const mealPresets = [
    { name: 'ご飯（1膳）', calories: 235, protein: 4, carbs: 53, fat: 0 },
    { name: '玄米ご飯（1膳）', calories: 228, protein: 4, carbs: 50, fat: 1 },
    { name: '食パン（1枚）', calories: 158, protein: 5, carbs: 28, fat: 2 },
    { name: '卵（1個）', calories: 91, protein: 7, carbs: 0, fat: 7 },
    { name: '鶏胸肉（100g）', calories: 108, protein: 23, carbs: 0, fat: 2 },
    { name: 'サラダ', calories: 50, protein: 2, carbs: 8, fat: 1 },
    { name: '味噌汁', calories: 40, protein: 3, carbs: 5, fat: 1 },
    { name: 'プロテイン', calories: 120, protein: 25, carbs: 3, fat: 1 },
  ];

  const selectMealPreset = (preset: typeof mealPresets[0]) => {
    setInputMealName(preset.name);
    setInputMealCalories(String(preset.calories));
    setInputMealProtein(String(preset.protein));
    setInputMealCarbs(String(preset.carbs));
    setInputMealFat(String(preset.fat));
  };

  // =====================================================
  // レンダリング
  // =====================================================

  const renderSummaryTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* 今日のサマリー */}
      <View style={styles.summaryHeader}>
        <Text style={styles.dateText}>📅 {new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'long' })}</Text>
        <TouchableOpacity style={styles.goalButton} onPress={() => setModalType('goals')}>
          <Text style={styles.goalButtonText}>⚙️ 目標設定</Text>
        </TouchableOpacity>
      </View>

      {/* BMIカード */}
      <View style={styles.bmiCard}>
        <View style={styles.bmiInfo}>
          <Text style={styles.bmiLabel}>BMI</Text>
          <Text style={styles.bmiValue}>{currentBMI || '-'}</Text>
          <View style={[styles.bmiBadge, { backgroundColor: bmiCategory.color }]}>
            <Text style={styles.bmiBadgeText}>{bmiCategory.label}</Text>
          </View>
        </View>
        <View style={styles.weightInfo}>
          <Text style={styles.currentWeightLabel}>現在</Text>
          <Text style={styles.currentWeight}>{latestWeight || '-'}kg</Text>
          <Text style={styles.targetWeightLabel}>目標 {goals.targetWeight}kg</Text>
          <Text style={styles.weightDiff}>
            {latestWeight > 0 ? (latestWeight > goals.targetWeight ? '▲' : '▼') : ''} 
            {latestWeight > 0 ? Math.abs(latestWeight - goals.targetWeight).toFixed(1) : '-'}kg
          </Text>
        </View>
      </View>

      {/* プログレスリング */}
      <View style={styles.progressRow}>
        <View style={styles.progressItem}>
          <ProgressRing
            progress={calorieProgress}
            color={COLORS.meal}
            value={`${todayCaloriesIn}`}
            label="kcal"
          />
          <Text style={styles.progressTitle}>摂取カロリー</Text>
          <Text style={styles.progressSubtext}>{goals.dailyCalories}中</Text>
        </View>
        <View style={styles.progressItem}>
          <ProgressRing
            progress={waterProgress}
            color={COLORS.water}
            value={`${todayWater}`}
            label="杯"
          />
          <Text style={styles.progressTitle}>水分</Text>
          <Text style={styles.progressSubtext}>{goals.dailyWaterCups}杯中</Text>
        </View>
        <View style={styles.progressItem}>
          <ProgressRing
            progress={sleepProgress}
            color={COLORS.sleep}
            value={`${todaySleep?.duration || 0}`}
            label="時間"
          />
          <Text style={styles.progressTitle}>睡眠</Text>
          <Text style={styles.progressSubtext}>{goals.dailySleepHours}h目標</Text>
        </View>
      </View>

      {/* カロリー収支 */}
      <View style={styles.calorieBalanceCard}>
        <Text style={styles.cardTitle}>📊 カロリー収支</Text>
        <View style={styles.calorieRow}>
          <View style={styles.calorieItem}>
            <Text style={styles.calorieLabel}>摂取</Text>
            <Text style={[styles.calorieValue, { color: COLORS.meal }]}>+{todayCaloriesIn}</Text>
          </View>
          <Text style={styles.calorieMinus}>−</Text>
          <View style={styles.calorieItem}>
            <Text style={styles.calorieLabel}>消費</Text>
            <Text style={[styles.calorieValue, { color: COLORS.exercise }]}>-{todayCaloriesOut}</Text>
          </View>
          <Text style={styles.calorieEquals}>=</Text>
          <View style={styles.calorieItem}>
            <Text style={styles.calorieLabel}>収支</Text>
            <Text style={[styles.calorieValue, { color: calorieBalance > 0 ? COLORS.warning : COLORS.success }]}>
              {calorieBalance > 0 ? '+' : ''}{calorieBalance}
            </Text>
          </View>
        </View>
      </View>

      {/* 体重推移グラフ */}
      <View style={styles.chartCard}>
        <Text style={styles.cardTitle}>📈 体重推移（過去7日）</Text>
        <LineChart data={weightChartData} targetValue={goals.targetWeight} />
      </View>

      {/* 今日の食事 */}
      <View style={styles.mealTimelineCard}>
        <Text style={styles.cardTitle}>🍽️ 今日の食事</Text>
        {todayMeals.length > 0 ? (
          todayMeals.map(meal => (
            <View key={meal.id} style={styles.mealItem}>
              <Text style={styles.mealIcon}>{getMealTypeIcon(meal.type)}</Text>
              <View style={styles.mealInfo}>
                <Text style={styles.mealType}>{getMealTypeLabel(meal.type)} {meal.time}</Text>
                <Text style={styles.mealName}>{meal.name}</Text>
              </View>
              <Text style={styles.mealCalories}>{meal.calories}kcal</Text>
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>まだ記録がありません</Text>
        )}
      </View>

      {/* 今日の運動 */}
      <View style={styles.exerciseCard}>
        <Text style={styles.cardTitle}>🏃 今日の運動</Text>
        {todayExercises.length > 0 ? (
          todayExercises.map(ex => (
            <View key={ex.id} style={styles.exerciseItem}>
              <Text style={styles.exerciseType}>{ex.type}</Text>
              <Text style={styles.exerciseDuration}>{ex.duration}分</Text>
              <Text style={styles.exerciseCalories}>-{ex.caloriesBurned}kcal</Text>
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>まだ記録がありません</Text>
        )}
      </View>
    </ScrollView>
  );

  const renderWeightTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.chartCard}>
        <Text style={styles.cardTitle}>📈 体重推移グラフ</Text>
        <LineChart data={weightChartData} height={200} targetValue={goals.targetWeight} />
      </View>

      <View style={styles.weightStatsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>現在の体重</Text>
          <Text style={styles.statValue}>{latestWeight || '-'}kg</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>目標体重</Text>
          <Text style={styles.statValue}>{goals.targetWeight}kg</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>目標まで</Text>
          <Text style={[styles.statValue, { color: latestWeight > goals.targetWeight ? COLORS.warning : COLORS.success }]}>
            {latestWeight > 0 ? Math.abs(latestWeight - goals.targetWeight).toFixed(1) : '-'}kg
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>BMI</Text>
          <Text style={[styles.statValue, { color: bmiCategory.color }]}>{currentBMI || '-'}</Text>
        </View>
      </View>

      <View style={styles.recordsCard}>
        <Text style={styles.cardTitle}>📋 記録履歴</Text>
        {weightRecords.slice().reverse().map(record => (
          <View key={record.id} style={styles.recordRow}>
            <Text style={styles.recordDate}>{record.date}</Text>
            <Text style={styles.recordWeight}>{record.weight}kg</Text>
            {record.bodyFat && <Text style={styles.recordBodyFat}>体脂肪 {record.bodyFat}%</Text>}
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderMealsTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.macroSummaryCard}>
        <Text style={styles.cardTitle}>🥗 今日のマクロ栄養素</Text>
        <View style={styles.macroRow}>
          <View style={styles.macroItem}>
            <Text style={styles.macroLabel}>タンパク質</Text>
            <Text style={[styles.macroValue, { color: '#E91E63' }]}>
              {todayMeals.reduce((sum, m) => sum + (m.protein || 0), 0)}g
            </Text>
          </View>
          <View style={styles.macroItem}>
            <Text style={styles.macroLabel}>炭水化物</Text>
            <Text style={[styles.macroValue, { color: '#FF9800' }]}>
              {todayMeals.reduce((sum, m) => sum + (m.carbs || 0), 0)}g
            </Text>
          </View>
          <View style={styles.macroItem}>
            <Text style={styles.macroLabel}>脂質</Text>
            <Text style={[styles.macroValue, { color: '#4CAF50' }]}>
              {todayMeals.reduce((sum, m) => sum + (m.fat || 0), 0)}g
            </Text>
          </View>
        </View>
      </View>

      {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(type => {
        const meals = todayMeals.filter(m => m.type === type);
        const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);

        return (
          <View key={type} style={styles.mealCategoryCard}>
            <View style={styles.mealCategoryHeader}>
              <Text style={styles.mealCategoryIcon}>{getMealTypeIcon(type)}</Text>
              <Text style={styles.mealCategoryTitle}>{getMealTypeLabel(type)}</Text>
              <Text style={styles.mealCategoryTotal}>{totalCalories}kcal</Text>
            </View>
            {meals.map(meal => (
              <TouchableOpacity
                key={meal.id}
                style={styles.mealDetailItem}
                onLongPress={() => handleDeleteMeal(meal.id)}
              >
                <View style={styles.mealDetailInfo}>
                  <Text style={styles.mealDetailName}>{meal.name}</Text>
                  <Text style={styles.mealDetailMacro}>
                    P:{meal.protein || 0}g C:{meal.carbs || 0}g F:{meal.fat || 0}g
                  </Text>
                </View>
                <Text style={styles.mealDetailCalories}>{meal.calories}kcal</Text>
              </TouchableOpacity>
            ))}
            {meals.length === 0 && (
              <Text style={styles.noMealText}>まだ記録がありません</Text>
            )}
          </View>
        );
      })}
    </ScrollView>
  );

  const renderExerciseTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.exerciseSummaryCard}>
        <Text style={styles.cardTitle}>🔥 今日の運動サマリー</Text>
        <View style={styles.exerciseSummaryRow}>
          <View style={styles.exerciseSummaryItem}>
            <Text style={styles.exerciseSummaryLabel}>総消費</Text>
            <Text style={styles.exerciseSummaryValue}>{todayCaloriesOut}kcal</Text>
          </View>
          <View style={styles.exerciseSummaryItem}>
            <Text style={styles.exerciseSummaryLabel}>総時間</Text>
            <Text style={styles.exerciseSummaryValue}>
              {todayExercises.reduce((sum, e) => sum + e.duration, 0)}分
            </Text>
          </View>
          <View style={styles.exerciseSummaryItem}>
            <Text style={styles.exerciseSummaryLabel}>種目数</Text>
            <Text style={styles.exerciseSummaryValue}>{todayExercises.length}</Text>
          </View>
        </View>
      </View>

      <View style={styles.exerciseListCard}>
        <Text style={styles.cardTitle}>📋 運動記録</Text>
        {todayExercises.map(ex => (
          <TouchableOpacity
            key={ex.id}
            style={styles.exerciseDetailItem}
            onLongPress={() => handleDeleteExercise(ex.id)}
          >
            <View style={styles.exerciseDetailLeft}>
              <Text style={styles.exerciseDetailType}>{ex.type}</Text>
              <Text style={styles.exerciseDetailTime}>{ex.time}</Text>
            </View>
            <View style={styles.exerciseDetailRight}>
              <Text style={styles.exerciseDetailDuration}>{ex.duration}分</Text>
              <View style={[styles.intensityBadge, { backgroundColor: ex.intensity === 'high' ? COLORS.error : ex.intensity === 'medium' ? COLORS.warning : COLORS.success }]}>
                <Text style={styles.intensityText}>{getIntensityLabel(ex.intensity)}</Text>
              </View>
            </View>
            <Text style={styles.exerciseDetailCalories}>-{ex.caloriesBurned}kcal</Text>
          </TouchableOpacity>
        ))}
        {todayExercises.length === 0 && (
          <Text style={styles.noDataText}>まだ運動記録がありません</Text>
        )}
      </View>
    </ScrollView>
  );

  const renderWaterTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.waterCard}>
        <Text style={styles.cardTitle}>💧 水分摂取</Text>
        <View style={styles.waterVisual}>
          <View style={styles.cupsContainer}>
            {Array.from({ length: goals.dailyWaterCups }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.cup,
                  { backgroundColor: i < todayWater ? COLORS.water : '#E0E0E0' },
                ]}
              >
                <Text style={styles.cupIcon}>🥛</Text>
              </View>
            ))}
          </View>
          <Text style={styles.waterCount}>{todayWater} / {goals.dailyWaterCups} 杯</Text>
          <Text style={styles.waterMl}>{todayWater * 200}ml / {goals.dailyWaterCups * 200}ml</Text>
        </View>
        <TouchableOpacity style={styles.addWaterButton} onPress={handleAddWater}>
          <Text style={styles.addWaterButtonText}>+ 1杯追加</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.waterTipsCard}>
        <Text style={styles.cardTitle}>💡 水分補給のコツ</Text>
        <Text style={styles.tipText}>• 起床時にコップ1杯の水を飲む</Text>
        <Text style={styles.tipText}>• 食事の30分前に水分補給</Text>
        <Text style={styles.tipText}>• 運動前後は多めに摂取</Text>
        <Text style={styles.tipText}>• 1時間に1回を目安に</Text>
      </View>
    </ScrollView>
  );

  const renderSleepTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.sleepCard}>
        <Text style={styles.cardTitle}>😴 今日の睡眠</Text>
        {todaySleep ? (
          <View style={styles.sleepInfo}>
            <View style={styles.sleepMainInfo}>
              <Text style={styles.sleepDuration}>{todaySleep.duration}時間</Text>
              <View style={styles.sleepQualityStars}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Text key={i} style={styles.star}>
                    {i < todaySleep.quality ? '⭐' : '☆'}
                  </Text>
                ))}
              </View>
            </View>
            <View style={styles.sleepTimeRow}>
              <View style={styles.sleepTimeItem}>
                <Text style={styles.sleepTimeLabel}>就寝</Text>
                <Text style={styles.sleepTimeValue}>{todaySleep.bedTime}</Text>
              </View>
              <Text style={styles.sleepArrow}>→</Text>
              <View style={styles.sleepTimeItem}>
                <Text style={styles.sleepTimeLabel}>起床</Text>
                <Text style={styles.sleepTimeValue}>{todaySleep.wakeTime}</Text>
              </View>
            </View>
          </View>
        ) : (
          <Text style={styles.noDataText}>まだ記録がありません</Text>
        )}
      </View>

      <View style={styles.sleepHistoryCard}>
        <Text style={styles.cardTitle}>📋 睡眠履歴（過去7日）</Text>
        {sleepRecords.slice(-7).reverse().map(record => (
          <View key={record.id} style={styles.sleepHistoryItem}>
            <Text style={styles.sleepHistoryDate}>{record.date}</Text>
            <Text style={styles.sleepHistoryDuration}>{record.duration}h</Text>
            <View style={styles.sleepHistoryQuality}>
              {Array.from({ length: record.quality }).map((_, i) => (
                <Text key={i} style={styles.miniStar}>⭐</Text>
              ))}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderReportTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.periodSelector}>
        <TouchableOpacity
          style={[styles.periodButton, reportPeriod === 'week' && styles.periodButtonActive]}
          onPress={() => setReportPeriod('week')}
        >
          <Text style={[styles.periodButtonText, reportPeriod === 'week' && styles.periodButtonTextActive]}>
            週間
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, reportPeriod === 'month' && styles.periodButtonActive]}
          onPress={() => setReportPeriod('month')}
        >
          <Text style={[styles.periodButtonText, reportPeriod === 'month' && styles.periodButtonTextActive]}>
            月間
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.reportCard}>
        <Text style={styles.cardTitle}>📊 {reportPeriod === 'week' ? '週間' : '月間'}レポート</Text>
        
        <View style={styles.reportGrid}>
          <View style={styles.reportItem}>
            <Text style={styles.reportLabel}>平均摂取カロリー</Text>
            <Text style={styles.reportValue}>{reportData.avgCalories}kcal/日</Text>
          </View>
          <View style={styles.reportItem}>
            <Text style={styles.reportLabel}>平均消費カロリー</Text>
            <Text style={styles.reportValue}>{reportData.avgExerciseCalories}kcal/日</Text>
          </View>
          <View style={styles.reportItem}>
            <Text style={styles.reportLabel}>体重変化</Text>
            <Text style={[styles.reportValue, { color: reportData.weightChange < 0 ? COLORS.success : COLORS.warning }]}>
              {reportData.weightChange > 0 ? '+' : ''}{reportData.weightChange.toFixed(1)}kg
            </Text>
          </View>
          <View style={styles.reportItem}>
            <Text style={styles.reportLabel}>平均睡眠時間</Text>
            <Text style={styles.reportValue}>{reportData.avgSleep}時間</Text>
          </View>
          <View style={styles.reportItem}>
            <Text style={styles.reportLabel}>総運動時間</Text>
            <Text style={styles.reportValue}>{reportData.totalExerciseMinutes}分</Text>
          </View>
        </View>
      </View>

      <View style={styles.macroReportCard}>
        <Text style={styles.cardTitle}>🥗 栄養バランス（累計）</Text>
        <View style={styles.macroPieRow}>
          <View style={styles.macroPieItem}>
            <View style={[styles.macroDot, { backgroundColor: '#E91E63' }]} />
            <Text style={styles.macroPieLabel}>タンパク質</Text>
            <Text style={styles.macroPieValue}>{reportData.macros.protein}g</Text>
          </View>
          <View style={styles.macroPieItem}>
            <View style={[styles.macroDot, { backgroundColor: '#FF9800' }]} />
            <Text style={styles.macroPieLabel}>炭水化物</Text>
            <Text style={styles.macroPieValue}>{reportData.macros.carbs}g</Text>
          </View>
          <View style={styles.macroPieItem}>
            <View style={[styles.macroDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.macroPieLabel}>脂質</Text>
            <Text style={styles.macroPieValue}>{reportData.macros.fat}g</Text>
          </View>
        </View>
      </View>

      <View style={styles.achievementsCard}>
        <Text style={styles.cardTitle}>🏆 達成状況</Text>
        <View style={styles.achievementItem}>
          <Text style={styles.achievementIcon}>🎯</Text>
          <Text style={styles.achievementText}>
            カロリー目標達成: {Math.round((reportData.avgCalories / goals.dailyCalories) * 100)}%
          </Text>
        </View>
        <View style={styles.achievementItem}>
          <Text style={styles.achievementIcon}>💪</Text>
          <Text style={styles.achievementText}>
            運動継続: {exerciseRecords.filter(e => new Date(e.date) >= new Date(Date.now() - (reportPeriod === 'week' ? 7 : 30) * 24 * 60 * 60 * 1000)).length}回
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  // タブコンテンツのレンダリング
  const renderTabContent = () => {
    switch (activeTab) {
      case 'summary': return renderSummaryTab();
      case 'weight': return renderWeightTab();
      case 'meals': return renderMealsTab();
      case 'exercise': return renderExerciseTab();
      case 'water': return renderWaterTab();
      case 'sleep': return renderSleepTab();
      case 'report': return renderReportTab();
      default: return renderSummaryTab();
    }
  };

  // モーダルのレンダリング
  const renderModal = () => {
    if (!modalType) return null;

    return (
      <Modal visible={true} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setModalType(null)}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>

            {modalType === 'weight' && (
              <>
                <Text style={styles.modalTitle}>⚖️ 体重を記録</Text>
                <TextInput
                  style={styles.input}
                  placeholder="体重 (kg)"
                  keyboardType="decimal-pad"
                  value={inputWeight}
                  onChangeText={setInputWeight}
                />
                <TextInput
                  style={styles.input}
                  placeholder="体脂肪率 (%) - 任意"
                  keyboardType="decimal-pad"
                  value={inputBodyFat}
                  onChangeText={setInputBodyFat}
                />
                <TouchableOpacity style={styles.submitButton} onPress={handleAddWeight}>
                  <Text style={styles.submitButtonText}>記録する</Text>
                </TouchableOpacity>
              </>
            )}

            {modalType === 'meal' && (
              <>
                <Text style={styles.modalTitle}>🍽️ 食事を記録</Text>
                
                {/* 食事タイプ選択 */}
                <View style={styles.mealTypeSelector}>
                  {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.mealTypeButton, inputMealType === type && styles.mealTypeButtonActive]}
                      onPress={() => setInputMealType(type)}
                    >
                      <Text style={styles.mealTypeIcon}>{getMealTypeIcon(type)}</Text>
                      <Text style={[styles.mealTypeLabel, inputMealType === type && styles.mealTypeLabelActive]}>
                        {getMealTypeLabel(type)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* プリセット */}
                <Text style={styles.presetLabel}>よく使う食品:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
                  {mealPresets.map((preset, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.presetChip}
                      onPress={() => selectMealPreset(preset)}
                    >
                      <Text style={styles.presetChipText}>{preset.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TextInput
                  style={styles.input}
                  placeholder="食事名"
                  value={inputMealName}
                  onChangeText={setInputMealName}
                />
                <TextInput
                  style={styles.input}
                  placeholder="カロリー (kcal)"
                  keyboardType="number-pad"
                  value={inputMealCalories}
                  onChangeText={setInputMealCalories}
                />
                <View style={styles.macroInputRow}>
                  <TextInput
                    style={[styles.input, styles.macroInput]}
                    placeholder="P (g)"
                    keyboardType="number-pad"
                    value={inputMealProtein}
                    onChangeText={setInputMealProtein}
                  />
                  <TextInput
                    style={[styles.input, styles.macroInput]}
                    placeholder="C (g)"
                    keyboardType="number-pad"
                    value={inputMealCarbs}
                    onChangeText={setInputMealCarbs}
                  />
                  <TextInput
                    style={[styles.input, styles.macroInput]}
                    placeholder="F (g)"
                    keyboardType="number-pad"
                    value={inputMealFat}
                    onChangeText={setInputMealFat}
                  />
                </View>
                <TouchableOpacity style={styles.submitButton} onPress={handleAddMeal}>
                  <Text style={styles.submitButtonText}>記録する</Text>
                </TouchableOpacity>
              </>
            )}

            {modalType === 'exercise' && (
              <>
                <Text style={styles.modalTitle}>🏃 運動を記録</Text>
                
                {/* 運動プリセット */}
                <Text style={styles.presetLabel}>運動種類:</Text>
                <View style={styles.exercisePresetGrid}>
                  {exercisePresets.map((preset, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.exercisePresetButton, inputExerciseType === preset.type && styles.exercisePresetButtonActive]}
                      onPress={() => selectExercisePreset(preset)}
                    >
                      <Text style={styles.exercisePresetText}>{preset.type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="運動種類（手入力）"
                  value={inputExerciseType}
                  onChangeText={setInputExerciseType}
                />
                <TextInput
                  style={styles.input}
                  placeholder="時間 (分)"
                  keyboardType="number-pad"
                  value={inputExerciseDuration}
                  onChangeText={(text) => {
                    setInputExerciseDuration(text);
                    const preset = exercisePresets.find(p => p.type === inputExerciseType);
                    if (preset) {
                      setInputExerciseCalories(String(preset.calPerMin * parseInt(text || '0')));
                    }
                  }}
                />
                <TextInput
                  style={styles.input}
                  placeholder="消費カロリー (kcal)"
                  keyboardType="number-pad"
                  value={inputExerciseCalories}
                  onChangeText={setInputExerciseCalories}
                />

                {/* 強度選択 */}
                <View style={styles.intensitySelector}>
                  {(['low', 'medium', 'high'] as const).map(intensity => (
                    <TouchableOpacity
                      key={intensity}
                      style={[styles.intensityButton, inputExerciseIntensity === intensity && styles.intensityButtonActive]}
                      onPress={() => setInputExerciseIntensity(intensity)}
                    >
                      <Text style={[styles.intensityButtonText, inputExerciseIntensity === intensity && styles.intensityButtonTextActive]}>
                        {getIntensityLabel(intensity)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.submitButton} onPress={handleAddExercise}>
                  <Text style={styles.submitButtonText}>記録する</Text>
                </TouchableOpacity>
              </>
            )}

            {modalType === 'sleep' && (
              <>
                <Text style={styles.modalTitle}>😴 睡眠を記録</Text>
                <View style={styles.timeInputRow}>
                  <View style={styles.timeInputItem}>
                    <Text style={styles.timeInputLabel}>就寝時刻</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="23:00"
                      value={inputBedTime}
                      onChangeText={setInputBedTime}
                    />
                  </View>
                  <View style={styles.timeInputItem}>
                    <Text style={styles.timeInputLabel}>起床時刻</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="07:00"
                      value={inputWakeTime}
                      onChangeText={setInputWakeTime}
                    />
                  </View>
                </View>
                <Text style={styles.qualityLabel}>睡眠の質:</Text>
                <View style={styles.qualitySelector}>
                  {[1, 2, 3, 4, 5].map(q => (
                    <TouchableOpacity
                      key={q}
                      style={styles.qualityStar}
                      onPress={() => setInputSleepQuality(q)}
                    >
                      <Text style={styles.qualityStarText}>
                        {q <= inputSleepQuality ? '⭐' : '☆'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={styles.submitButton} onPress={handleAddSleep}>
                  <Text style={styles.submitButtonText}>記録する</Text>
                </TouchableOpacity>
              </>
            )}

            {modalType === 'goals' && (
              <>
                <Text style={styles.modalTitle}>⚙️ 目標設定</Text>
                <TextInput
                  style={styles.input}
                  placeholder={`目標体重 (現在: ${goals.targetWeight}kg)`}
                  keyboardType="decimal-pad"
                  value={inputTargetWeight}
                  onChangeText={setInputTargetWeight}
                />
                <TextInput
                  style={styles.input}
                  placeholder={`1日の目標カロリー (現在: ${goals.dailyCalories}kcal)`}
                  keyboardType="number-pad"
                  value={inputDailyCalories}
                  onChangeText={setInputDailyCalories}
                />
                <TextInput
                  style={styles.input}
                  placeholder={`身長 (現在: ${goals.height}cm)`}
                  keyboardType="number-pad"
                  value={inputHeight}
                  onChangeText={setInputHeight}
                />
                <TouchableOpacity style={styles.submitButton} onPress={handleUpdateGoals}>
                  <Text style={styles.submitButtonText}>保存する</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💪 健康管理</Text>
      </View>

      {/* タブバー */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        {[
          { key: 'summary', label: '📊 サマリー' },
          { key: 'weight', label: '⚖️ 体重' },
          { key: 'meals', label: '🍽️ 食事' },
          { key: 'exercise', label: '🏃 運動' },
          { key: 'water', label: '💧 水分' },
          { key: 'sleep', label: '😴 睡眠' },
          { key: 'report', label: '📈 レポート' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key as TabType)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* タブコンテンツ */}
      {renderTabContent()}

      {/* 記録ボタン群 */}
      <View style={styles.recordButtons}>
        <TouchableOpacity style={styles.recordButton} onPress={() => setModalType('weight')}>
          <Text style={styles.recordButtonIcon}>⚖️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.recordButton} onPress={() => setModalType('meal')}>
          <Text style={styles.recordButtonIcon}>🍽️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.recordButton} onPress={() => setModalType('exercise')}>
          <Text style={styles.recordButtonIcon}>🏃</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.recordButton} onPress={handleAddWater}>
          <Text style={styles.recordButtonIcon}>💧</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.recordButton} onPress={() => setModalType('sleep')}>
          <Text style={styles.recordButtonIcon}>😴</Text>
        </TouchableOpacity>
      </View>

      {/* モーダル */}
      {renderModal()}
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
    backgroundColor: COLORS.primary,
    padding: 16,
    paddingTop: 48,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
  },
  tabBar: {
    backgroundColor: COLORS.white,
    maxHeight: 50,
  },
  tabBarContent: {
    paddingHorizontal: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 20,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },

  // サマリーヘッダー
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  goalButton: {
    padding: 8,
  },
  goalButtonText: {
    fontSize: 14,
    color: COLORS.primary,
  },

  // BMIカード
  bmiCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bmiInfo: {
    alignItems: 'center',
  },
  bmiLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  bmiValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  bmiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  bmiBadgeText: {
    fontSize: 11,
    color: COLORS.white,
    fontWeight: '600',
  },
  weightInfo: {
    alignItems: 'flex-end',
  },
  currentWeightLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  currentWeight: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  targetWeightLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  weightDiff: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // プログレスリング
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  progressItem: {
    alignItems: 'center',
  },
  progressRingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringBackground: {
    position: 'absolute',
  },
  progressRingInner: {
    alignItems: 'center',
  },
  progressValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  progressLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  progressIndicator: {
    position: 'absolute',
  },
  progressTitle: {
    fontSize: 12,
    color: COLORS.text,
    marginTop: 8,
    fontWeight: '500',
  },
  progressSubtext: {
    fontSize: 10,
    color: COLORS.textMuted,
  },

  // カード共通
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },

  // カロリー収支
  calorieBalanceCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  calorieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  calorieItem: {
    alignItems: 'center',
  },
  calorieLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  calorieValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  calorieMinus: {
    fontSize: 24,
    color: COLORS.textMuted,
  },
  calorieEquals: {
    fontSize: 24,
    color: COLORS.textMuted,
  },

  // グラフ
  chartCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  chartContainer: {
    marginTop: 8,
  },
  chartInner: {
    flexDirection: 'row',
  },
  yAxisLabels: {
    width: 40,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  chartArea: {
    flex: 1,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  targetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.success,
    flexDirection: 'row',
    alignItems: 'center',
  },
  targetLabel: {
    fontSize: 10,
    color: COLORS.success,
    marginLeft: 4,
  },
  lineContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
    transformOrigin: 'left center',
  },
  dataPoint: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  xAxisLabels: {
    flexDirection: 'row',
    marginLeft: 40,
    marginTop: 8,
  },
  axisLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  noDataText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    padding: 20,
  },

  // 食事タイムライン
  mealTimelineCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  mealIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  mealInfo: {
    flex: 1,
  },
  mealType: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  mealName: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  mealCalories: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },

  // 運動カード
  exerciseCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 100,
  },
  exerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  exerciseType: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    flex: 1,
  },
  exerciseDuration: {
    fontSize: 14,
    color: COLORS.textLight,
    marginRight: 8,
  },
  exerciseCalories: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.exercise,
  },

  // 記録ボタン群
  recordButtons: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  recordButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  recordButtonIcon: {
    fontSize: 24,
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
    padding: 24,
    maxHeight: '80%',
  },
  modalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  modalCloseText: {
    fontSize: 24,
    color: COLORS.textMuted,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: COLORS.background,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },

  // 食事タイプ選択
  mealTypeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  mealTypeButton: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
  },
  mealTypeButtonActive: {
    backgroundColor: `${COLORS.primary}20`,
  },
  mealTypeIcon: {
    fontSize: 24,
  },
  mealTypeLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  mealTypeLabelActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },

  // プリセット
  presetLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
  },
  presetScroll: {
    marginBottom: 12,
  },
  presetChip: {
    backgroundColor: `${COLORS.primary}20`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  presetChipText: {
    fontSize: 12,
    color: COLORS.primary,
  },

  // マクロ入力
  macroInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  macroInput: {
    flex: 1,
  },

  // 運動プリセット
  exercisePresetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  exercisePresetButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: `${COLORS.primary}20`,
  },
  exercisePresetButtonActive: {
    backgroundColor: COLORS.primary,
  },
  exercisePresetText: {
    fontSize: 12,
    color: COLORS.primary,
  },

  // 強度選択
  intensitySelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  intensityButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  intensityButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  intensityButtonText: {
    fontSize: 14,
    color: COLORS.text,
  },
  intensityButtonTextActive: {
    color: COLORS.white,
    fontWeight: 'bold',
  },

  // 睡眠入力
  timeInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  timeInputItem: {
    flex: 1,
  },
  timeInputLabel: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 4,
  },
  qualityLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  qualitySelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  qualityStar: {
    padding: 8,
  },
  qualityStarText: {
    fontSize: 32,
  },

  // 体重タブ
  weightStatsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 4,
  },
  recordsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 100,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  recordDate: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  recordWeight: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  recordBodyFat: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  // 食事タブ
  macroSummaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  macroValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  mealCategoryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  mealCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealCategoryIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  mealCategoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  mealCategoryTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  mealDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  mealDetailInfo: {
    flex: 1,
  },
  mealDetailName: {
    fontSize: 14,
    color: COLORS.text,
  },
  mealDetailMacro: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  mealDetailCalories: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  noMealText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 8,
  },

  // 運動タブ
  exerciseSummaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  exerciseSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  exerciseSummaryItem: {
    alignItems: 'center',
  },
  exerciseSummaryLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  exerciseSummaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.exercise,
    marginTop: 4,
  },
  exerciseListCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 100,
  },
  exerciseDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  exerciseDetailLeft: {
    flex: 1,
  },
  exerciseDetailType: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  exerciseDetailTime: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  exerciseDetailRight: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  exerciseDetailDuration: {
    fontSize: 14,
    color: COLORS.text,
  },
  intensityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  intensityText: {
    fontSize: 10,
    color: COLORS.white,
    fontWeight: '600',
  },
  exerciseDetailCalories: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.exercise,
  },

  // 水分タブ
  waterCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  waterVisual: {
    alignItems: 'center',
    marginVertical: 16,
  },
  cupsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cup: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cupIcon: {
    fontSize: 20,
  },
  waterCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.water,
  },
  waterMl: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  addWaterButton: {
    backgroundColor: COLORS.water,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  addWaterButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  waterTipsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 100,
  },
  tipText: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 20,
  },

  // 睡眠タブ
  sleepCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sleepInfo: {
    alignItems: 'center',
  },
  sleepMainInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  sleepDuration: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.sleep,
  },
  sleepQualityStars: {
    flexDirection: 'row',
    marginTop: 8,
  },
  star: {
    fontSize: 24,
  },
  sleepTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sleepTimeItem: {
    alignItems: 'center',
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
  sleepArrow: {
    fontSize: 24,
    color: COLORS.textMuted,
    marginHorizontal: 16,
  },
  sleepHistoryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 100,
  },
  sleepHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sleepHistoryDate: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  sleepHistoryDuration: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.sleep,
    marginRight: 12,
  },
  sleepHistoryQuality: {
    flexDirection: 'row',
  },
  miniStar: {
    fontSize: 12,
  },

  // レポートタブ
  periodSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 12,
  },
  periodButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  periodButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  periodButtonText: {
    fontSize: 14,
    color: COLORS.text,
  },
  periodButtonTextActive: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  reportCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  reportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  reportItem: {
    width: '50%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  reportLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  reportValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 4,
  },
  macroReportCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  macroPieRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroPieItem: {
    alignItems: 'center',
  },
  macroDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  macroPieLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  macroPieValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 2,
  },
  achievementsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 100,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  achievementIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  achievementText: {
    fontSize: 14,
    color: COLORS.text,
  },
});

export default HealthScreen;
