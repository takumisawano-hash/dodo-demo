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
  Animated,
} from 'react-native';

// =====================================================
// 🏃 DoDo Life 運動ワークアウトミニアプリ
// Nike Run機能80%再現 - フル機能実装
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
  running: '#FF6B35',
  walking: '#66BB6A',
  strength: '#7E57C2',
  yoga: '#42A5F5',
  swimming: '#00BCD4',
  cycling: '#FF9800',
  hiit: '#F44336',
  streak: '#FFD700',
};

// =====================================================
// 型定義
// =====================================================

interface WorkoutRecord {
  id: string;
  date: string;
  type: WorkoutType;
  duration: number; // 分
  distance?: number; // km
  calories: number;
  intensity: 'light' | 'moderate' | 'intense';
  heartRateAvg?: number;
  notes?: string;
  time: string;
}

type WorkoutType = 
  | 'running'
  | 'walking'
  | 'strength'
  | 'yoga'
  | 'swimming'
  | 'cycling'
  | 'hiit'
  | 'other';

interface UserGoals {
  weeklyWorkouts: number;
  weeklyMinutes: number;
  weeklyCalories: number;
  weeklyDistance: number; // km
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  requirement: { type: string; value: number };
}

type TabType = 'dashboard' | 'record' | 'history' | 'stats' | 'achievements';
type ModalType = 'workout' | 'goals' | 'detail' | null;
type PeriodType = 'week' | 'month' | 'year';

// =====================================================
// 運動種類データ
// =====================================================

const WORKOUT_TYPES: {
  [key in WorkoutType]: {
    label: string;
    icon: string;
    color: string;
    metLow: number;
    metMod: number;
    metHigh: number;
    hasDistance: boolean;
  };
} = {
  running: {
    label: 'ランニング',
    icon: '🏃',
    color: COLORS.running,
    metLow: 6.0,
    metMod: 9.8,
    metHigh: 12.0,
    hasDistance: true,
  },
  walking: {
    label: 'ウォーキング',
    icon: '🚶',
    color: COLORS.walking,
    metLow: 2.5,
    metMod: 3.5,
    metHigh: 5.0,
    hasDistance: true,
  },
  strength: {
    label: '筋トレ',
    icon: '💪',
    color: COLORS.strength,
    metLow: 3.5,
    metMod: 5.0,
    metHigh: 6.0,
    hasDistance: false,
  },
  yoga: {
    label: 'ヨガ',
    icon: '🧘',
    color: COLORS.yoga,
    metLow: 2.0,
    metMod: 3.0,
    metHigh: 4.0,
    hasDistance: false,
  },
  swimming: {
    label: '水泳',
    icon: '🏊',
    color: COLORS.swimming,
    metLow: 4.8,
    metMod: 7.0,
    metHigh: 10.0,
    hasDistance: true,
  },
  cycling: {
    label: 'サイクリング',
    icon: '🚴',
    color: COLORS.cycling,
    metLow: 4.0,
    metMod: 6.8,
    metHigh: 10.0,
    hasDistance: true,
  },
  hiit: {
    label: 'HIIT',
    icon: '🔥',
    color: COLORS.hiit,
    metLow: 6.0,
    metMod: 8.0,
    metHigh: 12.0,
    hasDistance: false,
  },
  other: {
    label: 'その他',
    icon: '⚡',
    color: COLORS.textLight,
    metLow: 3.0,
    metMod: 5.0,
    metHigh: 7.0,
    hasDistance: false,
  },
};

// =====================================================
// アチーブメント定義
// =====================================================

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_workout',
    title: '初めの一歩',
    description: '最初のワークアウトを完了',
    icon: '🎯',
    requirement: { type: 'total_workouts', value: 1 },
  },
  {
    id: 'week_warrior',
    title: 'ウィークウォリアー',
    description: '週7日連続でワークアウト',
    icon: '🔥',
    requirement: { type: 'streak', value: 7 },
  },
  {
    id: 'month_master',
    title: 'マンスリーマスター',
    description: '30日連続でワークアウト',
    icon: '👑',
    requirement: { type: 'streak', value: 30 },
  },
  {
    id: 'calorie_burner_1k',
    title: 'カロリーバーナー',
    description: '合計1,000kcal消費',
    icon: '🔥',
    requirement: { type: 'total_calories', value: 1000 },
  },
  {
    id: 'calorie_burner_10k',
    title: 'メガバーナー',
    description: '合計10,000kcal消費',
    icon: '💥',
    requirement: { type: 'total_calories', value: 10000 },
  },
  {
    id: 'runner_5k',
    title: '5Kランナー',
    description: '1回で5km走破',
    icon: '🏃',
    requirement: { type: 'single_distance', value: 5 },
  },
  {
    id: 'runner_10k',
    title: '10Kランナー',
    description: '1回で10km走破',
    icon: '🏅',
    requirement: { type: 'single_distance', value: 10 },
  },
  {
    id: 'marathon_total',
    title: 'マラソンアチーブ',
    description: '累計42.195km走破',
    icon: '🎖️',
    requirement: { type: 'total_distance', value: 42.195 },
  },
  {
    id: 'workout_10',
    title: '10回達成',
    description: 'ワークアウト10回完了',
    icon: '⭐',
    requirement: { type: 'total_workouts', value: 10 },
  },
  {
    id: 'workout_50',
    title: '50回達成',
    description: 'ワークアウト50回完了',
    icon: '🌟',
    requirement: { type: 'total_workouts', value: 50 },
  },
  {
    id: 'workout_100',
    title: 'センチュリオン',
    description: 'ワークアウト100回完了',
    icon: '💎',
    requirement: { type: 'total_workouts', value: 100 },
  },
  {
    id: 'variety_master',
    title: 'バラエティマスター',
    description: '5種類以上の運動を記録',
    icon: '🎨',
    requirement: { type: 'workout_types', value: 5 },
  },
];

// =====================================================
// ユーティリティ関数
// =====================================================

const generateId = (): string => Math.random().toString(36).substr(2, 9);

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const getToday = (): string => formatDate(new Date());

const parseDate = (dateStr: string): Date => new Date(dateStr);

const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}時間${mins > 0 ? `${mins}分` : ''}`;
  }
  return `${mins}分`;
};

const formatDistance = (km: number): string => {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(2)}km`;
};

const formatPace = (minutes: number, km: number): string => {
  if (km <= 0) return '--';
  const paceMin = minutes / km;
  const mins = Math.floor(paceMin);
  const secs = Math.round((paceMin - mins) * 60);
  return `${mins}'${secs.toString().padStart(2, '0')}"`;
};

// カロリー計算（MET値ベース）
// カロリー = MET × 体重(kg) × 時間(h)
const calculateCalories = (
  type: WorkoutType,
  intensity: WorkoutRecord['intensity'],
  durationMin: number,
  weightKg: number = 65
): number => {
  const workout = WORKOUT_TYPES[type];
  let met: number;
  
  switch (intensity) {
    case 'light':
      met = workout.metLow;
      break;
    case 'moderate':
      met = workout.metMod;
      break;
    case 'intense':
      met = workout.metHigh;
      break;
    default:
      met = workout.metMod;
  }
  
  const hours = durationMin / 60;
  return Math.round(met * weightKg * hours);
};

// ストリーク計算
const calculateStreak = (records: WorkoutRecord[]): number => {
  if (records.length === 0) return 0;
  
  const sortedDates = [...new Set(records.map(r => r.date))]
    .sort((a, b) => b.localeCompare(a));
  
  const today = getToday();
  const yesterday = formatDate(new Date(Date.now() - 86400000));
  
  // 今日または昨日に記録がないとストリークは0
  if (sortedDates[0] !== today && sortedDates[0] !== yesterday) {
    return 0;
  }
  
  let streak = 1;
  let currentDate = parseDate(sortedDates[0]);
  
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    
    if (sortedDates[i] === formatDate(prevDate)) {
      streak++;
      currentDate = parseDate(sortedDates[i]);
    } else {
      break;
    }
  }
  
  return streak;
};

const getWeekDates = (): string[] => {
  const dates: string[] = [];
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(formatDate(date));
  }
  
  return dates;
};

const getDayLabel = (dateStr: string): string => {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const date = parseDate(dateStr);
  return days[date.getDay()];
};

// =====================================================
// カスタムグラフコンポーネント
// =====================================================

interface BarChartProps {
  data: { label: string; value: number; date?: string }[];
  height?: number;
  color?: string;
  showLabels?: boolean;
  maxValue?: number;
  unit?: string;
}

const BarChart: React.FC<BarChartProps> = ({
  data,
  height = 150,
  color = COLORS.primary,
  showLabels = true,
  maxValue,
  unit = '',
}) => {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);
  
  return (
    <View style={[styles.chartContainer, { height }]}>
      <View style={styles.barsContainer}>
        {data.map((item, index) => {
          const barHeight = (item.value / max) * (height - 30);
          const isToday = item.date === getToday();
          
          return (
            <View key={index} style={styles.barWrapper}>
              <View style={styles.barValueContainer}>
                {item.value > 0 && (
                  <Text style={styles.barValue}>
                    {item.value}{unit}
                  </Text>
                )}
              </View>
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(barHeight, 4),
                    backgroundColor: isToday ? color : `${color}99`,
                  },
                ]}
              />
              {showLabels && (
                <Text style={[
                  styles.barLabel,
                  isToday && styles.barLabelToday
                ]}>
                  {item.label}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};

interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  showDots?: boolean;
  fillGradient?: boolean;
}

const LineChart: React.FC<LineChartProps> = ({
  data,
  height = 120,
  color = COLORS.primary,
  showDots = true,
  fillGradient = true,
}) => {
  if (data.length === 0) return null;
  
  const max = Math.max(...data.map(d => d.value), 1);
  const min = Math.min(...data.map(d => d.value), 0);
  const range = max - min || 1;
  
  const chartWidth = SCREEN_WIDTH - 60;
  const chartHeight = height - 30;
  const stepX = chartWidth / (data.length - 1 || 1);
  
  const points = data.map((item, i) => ({
    x: i * stepX,
    y: chartHeight - ((item.value - min) / range) * chartHeight,
  }));
  
  return (
    <View style={[styles.lineChartContainer, { height }]}>
      <View style={styles.lineChartInner}>
        {/* Grid lines */}
        {[0, 1, 2].map(i => (
          <View
            key={i}
            style={[
              styles.gridLine,
              { top: (chartHeight / 2) * i }
            ]}
          />
        ))}
        
        {/* Area fill */}
        {fillGradient && (
          <View
            style={[
              styles.areaFill,
              {
                height: chartHeight,
                backgroundColor: `${color}20`,
              }
            ]}
          />
        )}
        
        {/* Line segments */}
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
                  width: length,
                  left: point.x,
                  top: point.y,
                  transform: [{ rotate: `${angle}deg` }],
                  backgroundColor: color,
                }
              ]}
            />
          );
        })}
        
        {/* Dots */}
        {showDots && points.map((point, i) => (
          <View
            key={i}
            style={[
              styles.lineDot,
              {
                left: point.x - 4,
                top: point.y - 4,
                backgroundColor: color,
              }
            ]}
          />
        ))}
      </View>
      
      {/* Labels */}
      <View style={styles.lineLabels}>
        {data.map((item, i) => (
          <Text
            key={i}
            style={[
              styles.lineLabel,
              { width: stepX }
            ]}
          >
            {item.label}
          </Text>
        ))}
      </View>
    </View>
  );
};

// =====================================================
// サブコンポーネント
// =====================================================

interface WorkoutCardProps {
  workout: WorkoutRecord;
  onPress: () => void;
}

const WorkoutCard: React.FC<WorkoutCardProps> = ({ workout, onPress }) => {
  const typeInfo = WORKOUT_TYPES[workout.type];
  
  return (
    <TouchableOpacity
      style={[styles.workoutCard, { borderLeftColor: typeInfo.color }]}
      onPress={onPress}
    >
      <View style={styles.workoutCardLeft}>
        <Text style={styles.workoutCardIcon}>{typeInfo.icon}</Text>
        <View>
          <Text style={styles.workoutCardType}>{typeInfo.label}</Text>
          <Text style={styles.workoutCardTime}>{workout.time}</Text>
        </View>
      </View>
      <View style={styles.workoutCardRight}>
        <View style={styles.workoutCardStat}>
          <Text style={styles.workoutCardStatValue}>
            {formatDuration(workout.duration)}
          </Text>
          <Text style={styles.workoutCardStatLabel}>時間</Text>
        </View>
        {workout.distance && typeInfo.hasDistance && (
          <View style={styles.workoutCardStat}>
            <Text style={styles.workoutCardStatValue}>
              {formatDistance(workout.distance)}
            </Text>
            <Text style={styles.workoutCardStatLabel}>距離</Text>
          </View>
        )}
        <View style={styles.workoutCardStat}>
          <Text style={[styles.workoutCardStatValue, { color: COLORS.primary }]}>
            {workout.calories}
          </Text>
          <Text style={styles.workoutCardStatLabel}>kcal</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

interface StreakBadgeProps {
  streak: number;
}

const StreakBadge: React.FC<StreakBadgeProps> = ({ streak }) => {
  const getStreakMessage = (): string => {
    if (streak === 0) return '今日から始めよう！';
    if (streak < 3) return 'いい調子！';
    if (streak < 7) return '素晴らしい！';
    if (streak < 14) return '絶好調！🔥';
    if (streak < 30) return 'すごい継続力！';
    return '伝説級！👑';
  };
  
  return (
    <View style={styles.streakContainer}>
      <View style={styles.streakBadge}>
        <Text style={styles.streakFlame}>🔥</Text>
        <Text style={styles.streakNumber}>{streak}</Text>
        <Text style={styles.streakLabel}>日連続</Text>
      </View>
      <Text style={styles.streakMessage}>{getStreakMessage()}</Text>
    </View>
  );
};

interface AchievementCardProps {
  achievement: Achievement;
  unlocked: boolean;
  progress?: number;
}

const AchievementCard: React.FC<AchievementCardProps> = ({
  achievement,
  unlocked,
  progress = 0,
}) => {
  return (
    <View style={[
      styles.achievementCard,
      !unlocked && styles.achievementCardLocked
    ]}>
      <View style={[
        styles.achievementIcon,
        unlocked && styles.achievementIconUnlocked
      ]}>
        <Text style={styles.achievementIconText}>
          {unlocked ? achievement.icon : '🔒'}
        </Text>
      </View>
      <View style={styles.achievementInfo}>
        <Text style={[
          styles.achievementTitle,
          !unlocked && styles.achievementTitleLocked
        ]}>
          {achievement.title}
        </Text>
        <Text style={styles.achievementDesc}>
          {achievement.description}
        </Text>
        {!unlocked && progress > 0 && (
          <View style={styles.achievementProgress}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(progress * 100, 100)}%` }
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
        )}
      </View>
      {unlocked && (
        <Text style={styles.achievementCheck}>✓</Text>
      )}
    </View>
  );
};

// =====================================================
// メインコンポーネント
// =====================================================

const ExerciseScreen: React.FC = () => {
  // ステート
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('week');
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutRecord | null>(null);
  
  // ワークアウト記録
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([
    {
      id: '1',
      date: getToday(),
      type: 'running',
      duration: 35,
      distance: 5.2,
      calories: 380,
      intensity: 'moderate',
      time: '07:30',
      notes: '朝ラン気持ちよかった！',
    },
    {
      id: '2',
      date: formatDate(new Date(Date.now() - 86400000)),
      type: 'strength',
      duration: 45,
      calories: 250,
      intensity: 'intense',
      time: '18:00',
    },
    {
      id: '3',
      date: formatDate(new Date(Date.now() - 86400000 * 2)),
      type: 'yoga',
      duration: 30,
      calories: 100,
      intensity: 'light',
      time: '21:00',
    },
    {
      id: '4',
      date: formatDate(new Date(Date.now() - 86400000 * 3)),
      type: 'cycling',
      duration: 60,
      distance: 20,
      calories: 450,
      intensity: 'moderate',
      time: '10:00',
    },
    {
      id: '5',
      date: formatDate(new Date(Date.now() - 86400000 * 4)),
      type: 'swimming',
      duration: 40,
      distance: 1.5,
      calories: 320,
      intensity: 'moderate',
      time: '12:00',
    },
  ]);
  
  // ユーザー目標
  const [goals, setGoals] = useState<UserGoals>({
    weeklyWorkouts: 5,
    weeklyMinutes: 150,
    weeklyCalories: 2000,
    weeklyDistance: 20,
  });
  
  // フォーム用ステート
  const [formType, setFormType] = useState<WorkoutType>('running');
  const [formDuration, setFormDuration] = useState('30');
  const [formDistance, setFormDistance] = useState('');
  const [formIntensity, setFormIntensity] = useState<WorkoutRecord['intensity']>('moderate');
  const [formNotes, setFormNotes] = useState('');
  
  // 目標フォーム
  const [goalWorkouts, setGoalWorkouts] = useState(goals.weeklyWorkouts.toString());
  const [goalMinutes, setGoalMinutes] = useState(goals.weeklyMinutes.toString());
  const [goalCalories, setGoalCalories] = useState(goals.weeklyCalories.toString());
  const [goalDistance, setGoalDistance] = useState(goals.weeklyDistance.toString());
  
  // =====================================================
  // 計算・統計
  // =====================================================
  
  const streak = useMemo(() => calculateStreak(workouts), [workouts]);
  
  const todayWorkouts = useMemo(() => {
    return workouts.filter(w => w.date === getToday());
  }, [workouts]);
  
  const todayStats = useMemo(() => {
    return {
      count: todayWorkouts.length,
      duration: todayWorkouts.reduce((sum, w) => sum + w.duration, 0),
      calories: todayWorkouts.reduce((sum, w) => sum + w.calories, 0),
      distance: todayWorkouts.reduce((sum, w) => sum + (w.distance || 0), 0),
    };
  }, [todayWorkouts]);
  
  const weekDates = useMemo(() => getWeekDates(), []);
  
  const weeklyStats = useMemo(() => {
    const weekWorkouts = workouts.filter(w => weekDates.includes(w.date));
    return {
      workouts: weekWorkouts.length,
      duration: weekWorkouts.reduce((sum, w) => sum + w.duration, 0),
      calories: weekWorkouts.reduce((sum, w) => sum + w.calories, 0),
      distance: weekWorkouts.reduce((sum, w) => sum + (w.distance || 0), 0),
    };
  }, [workouts, weekDates]);
  
  const weeklyProgress = useMemo(() => ({
    workouts: Math.min(weeklyStats.workouts / goals.weeklyWorkouts, 1),
    duration: Math.min(weeklyStats.duration / goals.weeklyMinutes, 1),
    calories: Math.min(weeklyStats.calories / goals.weeklyCalories, 1),
    distance: Math.min(weeklyStats.distance / goals.weeklyDistance, 1),
  }), [weeklyStats, goals]);
  
  const weeklyChartData = useMemo(() => {
    return weekDates.map(date => {
      const dayWorkouts = workouts.filter(w => w.date === date);
      return {
        label: getDayLabel(date),
        value: dayWorkouts.reduce((sum, w) => sum + w.calories, 0),
        date,
      };
    });
  }, [weekDates, workouts]);
  
  const monthlyStats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthWorkouts = workouts.filter(w => parseDate(w.date) >= startOfMonth);
    
    return {
      workouts: monthWorkouts.length,
      duration: monthWorkouts.reduce((sum, w) => sum + w.duration, 0),
      calories: monthWorkouts.reduce((sum, w) => sum + w.calories, 0),
      distance: monthWorkouts.reduce((sum, w) => sum + (w.distance || 0), 0),
    };
  }, [workouts]);
  
  const workoutTypeStats = useMemo(() => {
    const stats: { [key in WorkoutType]?: number } = {};
    workouts.forEach(w => {
      stats[w.type] = (stats[w.type] || 0) + 1;
    });
    return stats;
  }, [workouts]);
  
  // アチーブメント判定
  const unlockedAchievements = useMemo(() => {
    const totalWorkouts = workouts.length;
    const totalCalories = workouts.reduce((sum, w) => sum + w.calories, 0);
    const totalDistance = workouts.reduce((sum, w) => sum + (w.distance || 0), 0);
    const maxSingleDistance = Math.max(...workouts.map(w => w.distance || 0), 0);
    const workoutTypes = new Set(workouts.map(w => w.type)).size;
    
    return ACHIEVEMENTS.map(achievement => {
      let unlocked = false;
      let progress = 0;
      
      switch (achievement.requirement.type) {
        case 'total_workouts':
          unlocked = totalWorkouts >= achievement.requirement.value;
          progress = totalWorkouts / achievement.requirement.value;
          break;
        case 'streak':
          unlocked = streak >= achievement.requirement.value;
          progress = streak / achievement.requirement.value;
          break;
        case 'total_calories':
          unlocked = totalCalories >= achievement.requirement.value;
          progress = totalCalories / achievement.requirement.value;
          break;
        case 'total_distance':
          unlocked = totalDistance >= achievement.requirement.value;
          progress = totalDistance / achievement.requirement.value;
          break;
        case 'single_distance':
          unlocked = maxSingleDistance >= achievement.requirement.value;
          progress = maxSingleDistance / achievement.requirement.value;
          break;
        case 'workout_types':
          unlocked = workoutTypes >= achievement.requirement.value;
          progress = workoutTypes / achievement.requirement.value;
          break;
      }
      
      return { ...achievement, unlocked, progress };
    });
  }, [workouts, streak]);
  
  // =====================================================
  // ハンドラー
  // =====================================================
  
  const handleAddWorkout = useCallback(() => {
    const duration = parseInt(formDuration) || 0;
    if (duration <= 0) {
      Alert.alert('エラー', '運動時間を入力してください');
      return;
    }
    
    const distance = formDistance ? parseFloat(formDistance) : undefined;
    const calories = calculateCalories(formType, formIntensity, duration);
    
    const now = new Date();
    const newWorkout: WorkoutRecord = {
      id: generateId(),
      date: getToday(),
      type: formType,
      duration,
      distance,
      calories,
      intensity: formIntensity,
      time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
      notes: formNotes || undefined,
    };
    
    setWorkouts(prev => [newWorkout, ...prev]);
    setModalType(null);
    resetForm();
    
    Alert.alert('記録完了！', `${WORKOUT_TYPES[formType].label}を記録しました\n消費カロリー: ${calories}kcal`);
  }, [formType, formDuration, formDistance, formIntensity, formNotes]);
  
  const handleDeleteWorkout = useCallback((id: string) => {
    Alert.alert(
      '削除確認',
      'この運動記録を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            setWorkouts(prev => prev.filter(w => w.id !== id));
            setModalType(null);
            setSelectedWorkout(null);
          },
        },
      ]
    );
  }, []);
  
  const handleSaveGoals = useCallback(() => {
    setGoals({
      weeklyWorkouts: parseInt(goalWorkouts) || 5,
      weeklyMinutes: parseInt(goalMinutes) || 150,
      weeklyCalories: parseInt(goalCalories) || 2000,
      weeklyDistance: parseInt(goalDistance) || 20,
    });
    setModalType(null);
    Alert.alert('保存完了', '目標を更新しました');
  }, [goalWorkouts, goalMinutes, goalCalories, goalDistance]);
  
  const resetForm = () => {
    setFormType('running');
    setFormDuration('30');
    setFormDistance('');
    setFormIntensity('moderate');
    setFormNotes('');
  };
  
  const openWorkoutDetail = (workout: WorkoutRecord) => {
    setSelectedWorkout(workout);
    setModalType('detail');
  };
  
  // =====================================================
  // タブ別レンダリング
  // =====================================================
  
  // ダッシュボード
  const renderDashboard = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* ストリーク */}
      <StreakBadge streak={streak} />
      
      {/* 今日のサマリー */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 今日のサマリー</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{todayStats.count}</Text>
            <Text style={styles.statLabel}>ワークアウト</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{formatDuration(todayStats.duration)}</Text>
            <Text style={styles.statLabel}>運動時間</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: COLORS.primary }]}>
              {todayStats.calories}
            </Text>
            <Text style={styles.statLabel}>消費kcal</Text>
          </View>
          {todayStats.distance > 0 && (
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{formatDistance(todayStats.distance)}</Text>
              <Text style={styles.statLabel}>距離</Text>
            </View>
          )}
        </View>
      </View>
      
      {/* 週間目標進捗 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🎯 週間目標</Text>
          <TouchableOpacity onPress={() => setModalType('goals')}>
            <Text style={styles.editButton}>編集</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.progressItem}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              ワークアウト回数 ({weeklyStats.workouts}/{goals.weeklyWorkouts}回)
            </Text>
            <Text style={styles.progressPercent}>
              {Math.round(weeklyProgress.workouts * 100)}%
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${weeklyProgress.workouts * 100}%` }
              ]}
            />
          </View>
        </View>
        
        <View style={styles.progressItem}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              運動時間 ({weeklyStats.duration}/{goals.weeklyMinutes}分)
            </Text>
            <Text style={styles.progressPercent}>
              {Math.round(weeklyProgress.duration * 100)}%
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${weeklyProgress.duration * 100}%` }
              ]}
            />
          </View>
        </View>
        
        <View style={styles.progressItem}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              消費カロリー ({weeklyStats.calories}/{goals.weeklyCalories}kcal)
            </Text>
            <Text style={styles.progressPercent}>
              {Math.round(weeklyProgress.calories * 100)}%
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${weeklyProgress.calories * 100}%` }
              ]}
            />
          </View>
        </View>
      </View>
      
      {/* 週間カロリーチャート */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📈 今週の消費カロリー</Text>
        <BarChart
          data={weeklyChartData}
          height={160}
          color={COLORS.primary}
          unit=""
        />
      </View>
      
      {/* 今日のワークアウト */}
      {todayWorkouts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏃 今日のワークアウト</Text>
          {todayWorkouts.map(workout => (
            <WorkoutCard
              key={workout.id}
              workout={workout}
              onPress={() => openWorkoutDetail(workout)}
            />
          ))}
        </View>
      )}
      
      {/* クイックスタート */}
      <TouchableOpacity
        style={styles.quickStartButton}
        onPress={() => setModalType('workout')}
      >
        <Text style={styles.quickStartIcon}>➕</Text>
        <Text style={styles.quickStartText}>ワークアウトを記録</Text>
      </TouchableOpacity>
      
      <View style={{ height: 100 }} />
    </ScrollView>
  );
  
  // 記録画面
  const renderRecord = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏋️ 運動を選択</Text>
        <View style={styles.workoutTypeGrid}>
          {(Object.keys(WORKOUT_TYPES) as WorkoutType[]).map(type => {
            const info = WORKOUT_TYPES[type];
            const isSelected = formType === type;
            
            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.workoutTypeButton,
                  isSelected && { backgroundColor: info.color, borderColor: info.color }
                ]}
                onPress={() => setFormType(type)}
              >
                <Text style={styles.workoutTypeIcon}>{info.icon}</Text>
                <Text style={[
                  styles.workoutTypeLabel,
                  isSelected && { color: COLORS.white }
                ]}>
                  {info.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⏱️ 運動時間（分）</Text>
        <View style={styles.durationPicker}>
          {[15, 30, 45, 60, 90].map(min => (
            <TouchableOpacity
              key={min}
              style={[
                styles.durationButton,
                formDuration === min.toString() && styles.durationButtonActive
              ]}
              onPress={() => setFormDuration(min.toString())}
            >
              <Text style={[
                styles.durationButtonText,
                formDuration === min.toString() && styles.durationButtonTextActive
              ]}>
                {min}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.input}
          placeholder="または直接入力"
          placeholderTextColor={COLORS.textMuted}
          value={formDuration}
          onChangeText={setFormDuration}
          keyboardType="number-pad"
        />
      </View>
      
      {WORKOUT_TYPES[formType].hasDistance && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📏 距離（km）</Text>
          <TextInput
            style={styles.input}
            placeholder="例: 5.5"
            placeholderTextColor={COLORS.textMuted}
            value={formDistance}
            onChangeText={setFormDistance}
            keyboardType="decimal-pad"
          />
        </View>
      )}
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💪 強度</Text>
        <View style={styles.intensityPicker}>
          {(['light', 'moderate', 'intense'] as const).map(level => {
            const labels = { light: '軽い', moderate: '普通', intense: 'ハード' };
            const icons = { light: '😊', moderate: '💪', intense: '🔥' };
            const isSelected = formIntensity === level;
            
            return (
              <TouchableOpacity
                key={level}
                style={[
                  styles.intensityButton,
                  isSelected && styles.intensityButtonActive
                ]}
                onPress={() => setFormIntensity(level)}
              >
                <Text style={styles.intensityIcon}>{icons[level]}</Text>
                <Text style={[
                  styles.intensityLabel,
                  isSelected && styles.intensityLabelActive
                ]}>
                  {labels[level]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📝 メモ（任意）</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="気づいたことなど..."
          placeholderTextColor={COLORS.textMuted}
          value={formNotes}
          onChangeText={setFormNotes}
          multiline
          numberOfLines={3}
        />
      </View>
      
      {/* カロリープレビュー */}
      <View style={styles.caloriePreview}>
        <Text style={styles.caloriePreviewLabel}>推定消費カロリー</Text>
        <Text style={styles.caloriePreviewValue}>
          {calculateCalories(formType, formIntensity, parseInt(formDuration) || 0)}
          <Text style={styles.caloriePreviewUnit}> kcal</Text>
        </Text>
      </View>
      
      <TouchableOpacity
        style={styles.recordButton}
        onPress={handleAddWorkout}
      >
        <Text style={styles.recordButtonText}>💾 記録する</Text>
      </TouchableOpacity>
      
      <View style={{ height: 100 }} />
    </ScrollView>
  );
  
  // 履歴画面
  const renderHistory = () => {
    const groupedWorkouts = useMemo(() => {
      const groups: { [date: string]: WorkoutRecord[] } = {};
      workouts.forEach(w => {
        if (!groups[w.date]) groups[w.date] = [];
        groups[w.date].push(w);
      });
      return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
    }, [workouts]);
    
    const formatDateLabel = (dateStr: string): string => {
      const today = getToday();
      const yesterday = formatDate(new Date(Date.now() - 86400000));
      
      if (dateStr === today) return '今日';
      if (dateStr === yesterday) return '昨日';
      
      const date = parseDate(dateStr);
      return `${date.getMonth() + 1}/${date.getDate()} (${getDayLabel(dateStr)})`;
    };
    
    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {groupedWorkouts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏃</Text>
            <Text style={styles.emptyText}>まだ運動記録がありません</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setActiveTab('record')}
            >
              <Text style={styles.emptyButtonText}>運動を記録する</Text>
            </TouchableOpacity>
          </View>
        ) : (
          groupedWorkouts.map(([date, dayWorkouts]) => (
            <View key={date} style={styles.historyGroup}>
              <View style={styles.historyDateHeader}>
                <Text style={styles.historyDate}>{formatDateLabel(date)}</Text>
                <Text style={styles.historyDaySummary}>
                  {dayWorkouts.reduce((sum, w) => sum + w.calories, 0)} kcal
                </Text>
              </View>
              {dayWorkouts.map(workout => (
                <WorkoutCard
                  key={workout.id}
                  workout={workout}
                  onPress={() => openWorkoutDetail(workout)}
                />
              ))}
            </View>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    );
  };
  
  // 統計画面
  const renderStats = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* 期間選択 */}
      <View style={styles.periodPicker}>
        {(['week', 'month', 'year'] as PeriodType[]).map(period => {
          const labels = { week: '週間', month: '月間', year: '年間' };
          return (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.periodButtonTextActive
              ]}>
                {labels[period]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* 統計サマリー */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          📊 {selectedPeriod === 'week' ? '週間' : selectedPeriod === 'month' ? '月間' : '年間'}統計
        </Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBoxLarge}>
            <Text style={styles.statValueLarge}>
              {selectedPeriod === 'week' ? weeklyStats.workouts : monthlyStats.workouts}
            </Text>
            <Text style={styles.statLabel}>ワークアウト</Text>
          </View>
          <View style={styles.statBoxLarge}>
            <Text style={styles.statValueLarge}>
              {formatDuration(selectedPeriod === 'week' ? weeklyStats.duration : monthlyStats.duration)}
            </Text>
            <Text style={styles.statLabel}>運動時間</Text>
          </View>
          <View style={styles.statBoxLarge}>
            <Text style={[styles.statValueLarge, { color: COLORS.primary }]}>
              {selectedPeriod === 'week' ? weeklyStats.calories : monthlyStats.calories}
            </Text>
            <Text style={styles.statLabel}>消費kcal</Text>
          </View>
          <View style={styles.statBoxLarge}>
            <Text style={styles.statValueLarge}>
              {formatDistance(selectedPeriod === 'week' ? weeklyStats.distance : monthlyStats.distance)}
            </Text>
            <Text style={styles.statLabel}>総距離</Text>
          </View>
        </View>
      </View>
      
      {/* 運動種類別 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏋️ 運動種類別</Text>
        <View style={styles.typeStats}>
          {(Object.entries(workoutTypeStats) as [WorkoutType, number][])
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => {
              const info = WORKOUT_TYPES[type];
              const percentage = Math.round((count / workouts.length) * 100);
              
              return (
                <View key={type} style={styles.typeStatRow}>
                  <View style={styles.typeStatLeft}>
                    <Text style={styles.typeStatIcon}>{info.icon}</Text>
                    <Text style={styles.typeStatLabel}>{info.label}</Text>
                  </View>
                  <View style={styles.typeStatRight}>
                    <View style={styles.typeStatBar}>
                      <View
                        style={[
                          styles.typeStatBarFill,
                          {
                            width: `${percentage}%`,
                            backgroundColor: info.color,
                          }
                        ]}
                      />
                    </View>
                    <Text style={styles.typeStatCount}>{count}回</Text>
                  </View>
                </View>
              );
            })}
        </View>
      </View>
      
      {/* 週間トレンド */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📈 カロリートレンド</Text>
        <BarChart
          data={weeklyChartData}
          height={180}
          color={COLORS.primary}
        />
      </View>
      
      <View style={{ height: 100 }} />
    </ScrollView>
  );
  
  // アチーブメント画面
  const renderAchievements = () => {
    const unlockedCount = unlockedAchievements.filter(a => a.unlocked).length;
    
    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        <View style={styles.achievementHeader}>
          <Text style={styles.achievementHeaderIcon}>🏆</Text>
          <Text style={styles.achievementHeaderTitle}>アチーブメント</Text>
          <Text style={styles.achievementHeaderCount}>
            {unlockedCount} / {ACHIEVEMENTS.length} 達成
          </Text>
        </View>
        
        <View style={styles.achievementList}>
          {unlockedAchievements
            .sort((a, b) => (b.unlocked ? 1 : 0) - (a.unlocked ? 1 : 0))
            .map(achievement => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                unlocked={achievement.unlocked}
                progress={achievement.progress}
              />
            ))}
        </View>
        
        <View style={{ height: 100 }} />
      </ScrollView>
    );
  };
  
  // =====================================================
  // モーダル
  // =====================================================
  
  const renderWorkoutDetailModal = () => {
    if (!selectedWorkout) return null;
    
    const typeInfo = WORKOUT_TYPES[selectedWorkout.type];
    
    return (
      <Modal
        visible={modalType === 'detail'}
        animationType="slide"
        transparent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, { backgroundColor: typeInfo.color }]}>
              <Text style={styles.modalHeaderIcon}>{typeInfo.icon}</Text>
              <Text style={styles.modalHeaderTitle}>{typeInfo.label}</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setModalType(null);
                  setSelectedWorkout(null);
                }}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>📅 日付</Text>
                <Text style={styles.detailValue}>{selectedWorkout.date}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>⏰ 時間</Text>
                <Text style={styles.detailValue}>{selectedWorkout.time}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>⏱️ 運動時間</Text>
                <Text style={styles.detailValue}>
                  {formatDuration(selectedWorkout.duration)}
                </Text>
              </View>
              {selectedWorkout.distance && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>📏 距離</Text>
                  <Text style={styles.detailValue}>
                    {formatDistance(selectedWorkout.distance)}
                  </Text>
                </View>
              )}
              {selectedWorkout.distance && selectedWorkout.duration > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>⚡ ペース</Text>
                  <Text style={styles.detailValue}>
                    {formatPace(selectedWorkout.duration, selectedWorkout.distance)} /km
                  </Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>🔥 消費カロリー</Text>
                <Text style={[styles.detailValue, { color: COLORS.primary, fontWeight: 'bold' }]}>
                  {selectedWorkout.calories} kcal
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>💪 強度</Text>
                <Text style={styles.detailValue}>
                  {{ light: '軽い 😊', moderate: '普通 💪', intense: 'ハード 🔥' }[selectedWorkout.intensity]}
                </Text>
              </View>
              {selectedWorkout.notes && (
                <View style={styles.detailNotesContainer}>
                  <Text style={styles.detailLabel}>📝 メモ</Text>
                  <Text style={styles.detailNotes}>{selectedWorkout.notes}</Text>
                </View>
              )}
            </ScrollView>
            
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteWorkout(selectedWorkout.id)}
            >
              <Text style={styles.deleteButtonText}>🗑️ 削除</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };
  
  const renderGoalsModal = () => (
    <Modal
      visible={modalType === 'goals'}
      animationType="slide"
      transparent
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🎯 週間目標設定</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalType(null)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <View style={styles.goalInput}>
              <Text style={styles.goalInputLabel}>ワークアウト回数</Text>
              <TextInput
                style={styles.input}
                value={goalWorkouts}
                onChangeText={setGoalWorkouts}
                keyboardType="number-pad"
                placeholder="5"
              />
            </View>
            
            <View style={styles.goalInput}>
              <Text style={styles.goalInputLabel}>運動時間（分）</Text>
              <TextInput
                style={styles.input}
                value={goalMinutes}
                onChangeText={setGoalMinutes}
                keyboardType="number-pad"
                placeholder="150"
              />
            </View>
            
            <View style={styles.goalInput}>
              <Text style={styles.goalInputLabel}>消費カロリー（kcal）</Text>
              <TextInput
                style={styles.input}
                value={goalCalories}
                onChangeText={setGoalCalories}
                keyboardType="number-pad"
                placeholder="2000"
              />
            </View>
            
            <View style={styles.goalInput}>
              <Text style={styles.goalInputLabel}>走行距離（km）</Text>
              <TextInput
                style={styles.input}
                value={goalDistance}
                onChangeText={setGoalDistance}
                keyboardType="decimal-pad"
                placeholder="20"
              />
            </View>
          </ScrollView>
          
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveGoals}
          >
            <Text style={styles.saveButtonText}>💾 保存</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
  
  // =====================================================
  // メインレンダー
  // =====================================================
  
  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🏃</Text>
        <Text style={styles.headerTitle}>ワークアウト</Text>
        <View style={styles.headerStreak}>
          <Text style={styles.headerStreakIcon}>🔥</Text>
          <Text style={styles.headerStreakText}>{streak}</Text>
        </View>
      </View>
      
      {/* タブ */}
      <View style={styles.tabs}>
        {[
          { id: 'dashboard' as TabType, icon: '📊', label: 'ホーム' },
          { id: 'record' as TabType, icon: '➕', label: '記録' },
          { id: 'history' as TabType, icon: '📅', label: '履歴' },
          { id: 'stats' as TabType, icon: '📈', label: '統計' },
          { id: 'achievements' as TabType, icon: '🏆', label: '達成' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={styles.tabIcon}>{tab.icon}</Text>
            <Text style={[
              styles.tabLabel,
              activeTab === tab.id && styles.tabLabelActive
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* コンテンツ */}
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'record' && renderRecord()}
      {activeTab === 'history' && renderHistory()}
      {activeTab === 'stats' && renderStats()}
      {activeTab === 'achievements' && renderAchievements()}
      
      {/* モーダル */}
      {renderWorkoutDetailModal()}
      {renderGoalsModal()}
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
  
  // ヘッダー
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: COLORS.primary,
  },
  headerIcon: {
    fontSize: 28,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    flex: 1,
  },
  headerStreak: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  headerStreakIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  headerStreakText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  
  // タブ
  tabs: {
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
    color: COLORS.textMuted,
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  
  // コンテンツ
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  
  // セクション
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  editButton: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  
  // ストリーク
  streakContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.streak}20`,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    marginBottom: 8,
  },
  streakFlame: {
    fontSize: 32,
    marginRight: 8,
  },
  streakNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  streakLabel: {
    fontSize: 16,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  streakMessage: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  
  // 統計グリッド
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statBox: {
    width: '50%',
    padding: 6,
  },
  statBoxLarge: {
    width: '50%',
    padding: 8,
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statValueLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  
  // プログレス
  progressItem: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginLeft: 8,
  },
  
  // チャート
  chartContainer: {
    width: '100%',
    marginTop: 8,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '100%',
    paddingBottom: 24,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barValueContainer: {
    marginBottom: 4,
  },
  barValue: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  bar: {
    width: '60%',
    borderRadius: 4,
    minWidth: 20,
  },
  barLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 6,
  },
  barLabelToday: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  
  // ラインチャート
  lineChartContainer: {
    width: '100%',
    marginTop: 8,
  },
  lineChartInner: {
    flex: 1,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: COLORS.border,
  },
  areaFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
    transformOrigin: 'left center',
  },
  lineDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  lineLabels: {
    flexDirection: 'row',
    marginTop: 8,
  },
  lineLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  
  // ワークアウトカード
  workoutCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  workoutCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workoutCardIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  workoutCardType: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  workoutCardTime: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  workoutCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workoutCardStat: {
    alignItems: 'center',
    marginLeft: 16,
  },
  workoutCardStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  workoutCardStatLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  
  // クイックスタート
  quickStartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 18,
    marginTop: 8,
  },
  quickStartIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  quickStartText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  
  // 運動種類グリッド
  workoutTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  workoutTypeButton: {
    width: '25%',
    padding: 6,
    alignItems: 'center',
  },
  workoutTypeIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  workoutTypeLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  
  // 時間ピッカー
  durationPicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  durationButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    alignItems: 'center',
  },
  durationButtonActive: {
    backgroundColor: COLORS.primary,
  },
  durationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  durationButtonTextActive: {
    color: COLORS.white,
  },
  
  // 強度ピッカー
  intensityPicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  intensityButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 16,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    alignItems: 'center',
  },
  intensityButtonActive: {
    backgroundColor: COLORS.primary,
  },
  intensityIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  intensityLabel: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  intensityLabelActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  
  // 入力
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  
  // カロリープレビュー
  caloriePreview: {
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  caloriePreviewLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  caloriePreviewValue: {
    fontSize: 42,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  caloriePreviewUnit: {
    fontSize: 18,
    fontWeight: 'normal',
  },
  
  // 記録ボタン
  recordButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  recordButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  
  // 空状態
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  
  // 履歴
  historyGroup: {
    marginBottom: 20,
  },
  historyDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  historyDaySummary: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  
  // 期間ピッカー
  periodPicker: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: COLORS.primary,
  },
  periodButtonText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  periodButtonTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  
  // 種類別統計
  typeStats: {
    marginTop: 8,
  },
  typeStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeStatLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
  },
  typeStatIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  typeStatLabel: {
    fontSize: 13,
    color: COLORS.text,
  },
  typeStatRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeStatBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 10,
  },
  typeStatBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  typeStatCount: {
    fontSize: 12,
    color: COLORS.textMuted,
    width: 40,
    textAlign: 'right',
  },
  
  // アチーブメント
  achievementHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 16,
  },
  achievementHeaderIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  achievementHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  achievementHeaderCount: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  achievementList: {
    marginBottom: 16,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  achievementCardLocked: {
    opacity: 0.7,
  },
  achievementIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  achievementIconUnlocked: {
    backgroundColor: `${COLORS.streak}30`,
  },
  achievementIconText: {
    fontSize: 24,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  achievementTitleLocked: {
    color: COLORS.textMuted,
  },
  achievementDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  achievementProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  achievementCheck: {
    fontSize: 18,
    color: COLORS.success,
    fontWeight: 'bold',
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalHeaderIcon: {
    fontSize: 28,
    marginRight: 10,
  },
  modalHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: COLORS.white,
  },
  modalBody: {
    padding: 20,
  },
  
  // 詳細
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  detailValue: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  detailNotesContainer: {
    paddingVertical: 12,
  },
  detailNotes: {
    fontSize: 14,
    color: COLORS.text,
    marginTop: 8,
    lineHeight: 20,
  },
  
  // 削除・保存ボタン
  deleteButton: {
    margin: 20,
    padding: 16,
    backgroundColor: COLORS.error,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  saveButton: {
    margin: 20,
    padding: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  
  // 目標入力
  goalInput: {
    marginBottom: 16,
  },
  goalInputLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 8,
  },
});

export default ExerciseScreen;
