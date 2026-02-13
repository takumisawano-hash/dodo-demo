import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

// ==================== TYPES ====================
type FrequencyType = 'daily' | 'weekly' | 'specific_days';
type ViewMode = 'today' | 'all' | 'calendar' | 'report';
type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime';

interface HabitLog {
  date: string; // YYYY-MM-DD
  completed: boolean;
  value?: number; // For measurable habits
  note?: string;
}

interface Habit {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  frequency: FrequencyType;
  targetDays?: number[]; // 0=Sun, 1=Mon, ... for specific_days
  timesPerWeek?: number; // for weekly frequency
  timeOfDay: TimeOfDay;
  reminderTime?: string;
  createdAt: Date;
  archived: boolean;
  logs: HabitLog[];
  // Gamification
  currentStreak: number;
  bestStreak: number;
  totalCompletions: number;
}

interface WeeklyStats {
  weekStart: Date;
  weekEnd: Date;
  habits: {
    habitId: string;
    habitName: string;
    icon: string;
    completed: number;
    target: number;
    percentage: number;
  }[];
  overallPercentage: number;
  totalCompleted: number;
  totalTarget: number;
}

// ==================== CONSTANTS ====================
const COLORS = {
  primary: '#FF6B35',
  primaryLight: '#FF8F65',
  primaryDark: '#E55A2B',
  background: '#FFF5E6',
  white: '#FFFFFF',
  text: '#333333',
  textSecondary: '#666666',
  textMuted: '#999999',
  border: '#E0E0E0',
  success: '#4CAF50',
  danger: '#F44336',
  warning: '#FFC107',
  // GitHub grass colors
  grass0: '#EBEDF0',
  grass1: '#FFE4C9',
  grass2: '#FFB380',
  grass3: '#FF8F4D',
  grass4: '#FF6B35',
};

const HABIT_ICONS = [
  '💪', '🏃', '🧘', '📚', '💧', '🥗', '😴', '✍️',
  '🎯', '🧠', '💊', '🚶', '🎸', '🎨', '💻', '📝',
  '🌅', '🧹', '💰', '📱', '🚭', '🍎', '☕', '🎵',
  '🏋️', '🚴', '🏊', '⛹️', '🥊', '🧗', '🎾', '⚽',
];

const HABIT_COLORS = [
  '#FF6B35', '#4CAF50', '#2196F3', '#9C27B0', '#F44336',
  '#00BCD4', '#FF9800', '#795548', '#607D8B', '#E91E63',
  '#3F51B5', '#009688', '#FFC107', '#8BC34A', '#673AB7',
];

const TIME_OF_DAY_CONFIG: Record<TimeOfDay, { label: string; icon: string; range: string }> = {
  morning: { label: '朝', icon: '🌅', range: '5:00-12:00' },
  afternoon: { label: '昼', icon: '☀️', range: '12:00-17:00' },
  evening: { label: '夜', icon: '🌙', range: '17:00-24:00' },
  anytime: { label: 'いつでも', icon: '⏰', range: '終日' },
};

const DAYS_OF_WEEK = ['日', '月', '火', '水', '木', '金', '土'];
const DAYS_OF_WEEK_FULL = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ==================== UTILITY FUNCTIONS ====================
const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const getDateLabel = (date: Date): string => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (formatDate(date) === formatDate(today)) return '今日';
  if (formatDate(date) === formatDate(yesterday)) return '昨日';
  
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = DAYS_OF_WEEK[date.getDay()];
  return `${month}/${day}(${dayOfWeek})`;
};

const isSameDay = (d1: Date, d2: Date): boolean => {
  return formatDate(d1) === formatDate(d2);
};

const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getWeekEnd = (date: Date): Date => {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
};

const getDaysInRange = (start: Date, end: Date): Date[] => {
  const days: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
};

const isHabitDueOnDate = (habit: Habit, date: Date): boolean => {
  const dayOfWeek = date.getDay();
  
  switch (habit.frequency) {
    case 'daily':
      return true;
    case 'specific_days':
      return habit.targetDays?.includes(dayOfWeek) ?? false;
    case 'weekly':
      // Weekly habits are always "due" but we track if they've met their goal
      return true;
    default:
      return true;
  }
};

const getHabitCompletionForDate = (habit: Habit, date: Date): boolean => {
  const dateStr = formatDate(date);
  return habit.logs.some(log => log.date === dateStr && log.completed);
};

const calculateStreak = (habit: Habit): { current: number; best: number } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Sort logs by date descending
  const sortedLogs = [...habit.logs]
    .filter(log => log.completed)
    .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
  
  if (sortedLogs.length === 0) {
    return { current: 0, best: 0 };
  }
  
  // Calculate current streak
  let currentStreak = 0;
  let checkDate = new Date(today);
  
  // Check if today is completed or if we should start from yesterday
  const todayStr = formatDate(today);
  const todayCompleted = sortedLogs.some(log => log.date === todayStr);
  
  if (!todayCompleted) {
    checkDate.setDate(checkDate.getDate() - 1);
  }
  
  while (true) {
    const checkDateStr = formatDate(checkDate);
    const isDue = isHabitDueOnDate(habit, checkDate);
    
    if (isDue) {
      const wasCompleted = sortedLogs.some(log => log.date === checkDateStr);
      if (wasCompleted) {
        currentStreak++;
      } else {
        break;
      }
    }
    checkDate.setDate(checkDate.getDate() - 1);
    
    // Safety limit
    if (currentStreak > 365) break;
  }
  
  // Calculate best streak
  let bestStreak = currentStreak;
  let tempStreak = 0;
  let lastDate: Date | null = null;
  
  for (const log of sortedLogs) {
    const logDate = parseDate(log.date);
    
    if (lastDate === null) {
      tempStreak = 1;
    } else {
      // Check for consecutive days (accounting for non-due days)
      const daysDiff = Math.floor((lastDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 1) {
        tempStreak++;
      } else {
        // Check if all days between were non-due days
        let allNonDue = true;
        const checkD = new Date(logDate);
        checkD.setDate(checkD.getDate() + 1);
        while (checkD < lastDate) {
          if (isHabitDueOnDate(habit, checkD)) {
            allNonDue = false;
            break;
          }
          checkD.setDate(checkD.getDate() + 1);
        }
        
        if (allNonDue) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
    }
    
    bestStreak = Math.max(bestStreak, tempStreak);
    lastDate = logDate;
  }
  
  return { current: currentStreak, best: bestStreak };
};

const calculateCompletionRate = (habit: Habit, days: number = 30): number => {
  const today = new Date();
  let totalDue = 0;
  let totalCompleted = 0;
  
  for (let i = 0; i < days; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    
    // Don't count future habits or habits before creation
    if (checkDate < habit.createdAt) continue;
    
    if (isHabitDueOnDate(habit, checkDate)) {
      totalDue++;
      if (getHabitCompletionForDate(habit, checkDate)) {
        totalCompleted++;
      }
    }
  }
  
  return totalDue > 0 ? Math.round((totalCompleted / totalDue) * 100) : 0;
};

const getWeeklyStats = (habits: Habit[], weekStart: Date): WeeklyStats => {
  const weekEnd = getWeekEnd(weekStart);
  const days = getDaysInRange(weekStart, weekEnd);
  
  const habitStats = habits.filter(h => !h.archived).map(habit => {
    let target = 0;
    let completed = 0;
    
    days.forEach(day => {
      if (day > new Date()) return; // Don't count future days
      if (day < habit.createdAt) return;
      
      if (habit.frequency === 'weekly') {
        // For weekly habits, target is timesPerWeek
        target = habit.timesPerWeek || 1;
      } else if (isHabitDueOnDate(habit, day)) {
        target++;
      }
      
      if (getHabitCompletionForDate(habit, day)) {
        completed++;
      }
    });
    
    // For weekly habits, cap target
    if (habit.frequency === 'weekly') {
      target = habit.timesPerWeek || 1;
    }
    
    return {
      habitId: habit.id,
      habitName: habit.name,
      icon: habit.icon,
      completed,
      target,
      percentage: target > 0 ? Math.round((completed / target) * 100) : 0,
    };
  });
  
  const totalTarget = habitStats.reduce((sum, h) => sum + h.target, 0);
  const totalCompleted = habitStats.reduce((sum, h) => sum + h.completed, 0);
  
  return {
    weekStart,
    weekEnd,
    habits: habitStats,
    overallPercentage: totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0,
    totalCompleted,
    totalTarget,
  };
};

// ==================== SAMPLE DATA ====================
const createSampleHabits = (): Habit[] => {
  const today = new Date();
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const oneWeekAgo = new Date(today);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  
  // Generate sample logs
  const generateLogs = (startDate: Date, completionRate: number): HabitLog[] => {
    const logs: HabitLog[] = [];
    const current = new Date(startDate);
    const end = new Date();
    
    while (current <= end) {
      if (Math.random() < completionRate) {
        logs.push({
          date: formatDate(current),
          completed: true,
        });
      }
      current.setDate(current.getDate() + 1);
    }
    
    return logs;
  };
  
  return [
    {
      id: generateId(),
      name: '朝のストレッチ',
      description: '起床後10分間のストレッチ',
      icon: '🧘',
      color: '#4CAF50',
      frequency: 'daily',
      timeOfDay: 'morning',
      createdAt: twoWeeksAgo,
      archived: false,
      logs: generateLogs(twoWeeksAgo, 0.8),
      currentStreak: 0,
      bestStreak: 0,
      totalCompletions: 0,
    },
    {
      id: generateId(),
      name: '読書30分',
      description: 'ビジネス書または技術書',
      icon: '📚',
      color: '#2196F3',
      frequency: 'daily',
      timeOfDay: 'evening',
      createdAt: oneWeekAgo,
      archived: false,
      logs: generateLogs(oneWeekAgo, 0.6),
      currentStreak: 0,
      bestStreak: 0,
      totalCompletions: 0,
    },
    {
      id: generateId(),
      name: '水2L飲む',
      description: '1日2リットル以上の水分補給',
      icon: '💧',
      color: '#00BCD4',
      frequency: 'daily',
      timeOfDay: 'anytime',
      createdAt: twoWeeksAgo,
      archived: false,
      logs: generateLogs(twoWeeksAgo, 0.7),
      currentStreak: 0,
      bestStreak: 0,
      totalCompletions: 0,
    },
    {
      id: generateId(),
      name: 'ジム',
      description: '週3回のトレーニング',
      icon: '🏋️',
      color: '#FF6B35',
      frequency: 'weekly',
      timesPerWeek: 3,
      timeOfDay: 'afternoon',
      createdAt: twoWeeksAgo,
      archived: false,
      logs: generateLogs(twoWeeksAgo, 0.4),
      currentStreak: 0,
      bestStreak: 0,
      totalCompletions: 0,
    },
    {
      id: generateId(),
      name: '瞑想',
      description: '朝10分の瞑想',
      icon: '🧠',
      color: '#9C27B0',
      frequency: 'specific_days',
      targetDays: [1, 2, 3, 4, 5], // Weekdays only
      timeOfDay: 'morning',
      createdAt: oneWeekAgo,
      archived: false,
      logs: generateLogs(oneWeekAgo, 0.5),
      currentStreak: 0,
      bestStreak: 0,
      totalCompletions: 0,
    },
    {
      id: generateId(),
      name: '日記を書く',
      description: '1日の振り返りを記録',
      icon: '✍️',
      color: '#795548',
      frequency: 'daily',
      timeOfDay: 'evening',
      createdAt: threeDaysAgo,
      archived: false,
      logs: generateLogs(threeDaysAgo, 0.9),
      currentStreak: 0,
      bestStreak: 0,
      totalCompletions: 0,
    },
  ];
};

// ==================== COMPONENTS ====================

// Habit Card Component
const HabitCard: React.FC<{
  habit: Habit;
  isCompletedToday: boolean;
  onToggle: () => void;
  onPress: () => void;
  streak: number;
  completionRate: number;
}> = ({ habit, isCompletedToday, onToggle, onPress, streak, completionRate }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const checkAnim = useRef(new Animated.Value(isCompletedToday ? 1 : 0)).current;
  
  useEffect(() => {
    Animated.timing(checkAnim, {
      toValue: isCompletedToday ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isCompletedToday]);
  
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };
  
  return (
    <Animated.View style={[styles.habitCard, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={styles.habitCardContent}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
      >
        <TouchableOpacity
          style={[
            styles.checkButton,
            { borderColor: habit.color },
            isCompletedToday && { backgroundColor: habit.color },
          ]}
          onPress={onToggle}
        >
          <Animated.Text style={[
            styles.checkIcon,
            {
              opacity: checkAnim,
              transform: [{ scale: checkAnim }],
            },
          ]}>
            ✓
          </Animated.Text>
        </TouchableOpacity>
        
        <View style={styles.habitInfo}>
          <View style={styles.habitHeader}>
            <Text style={styles.habitIcon}>{habit.icon}</Text>
            <Text style={[
              styles.habitName,
              isCompletedToday && styles.habitNameCompleted,
            ]}>
              {habit.name}
            </Text>
          </View>
          
          <View style={styles.habitMeta}>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>🔥</Text>
              <Text style={styles.metaText}>{streak}日</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>📊</Text>
              <Text style={styles.metaText}>{completionRate}%</Text>
            </View>
            <View style={[styles.timeTag, { backgroundColor: `${habit.color}20` }]}>
              <Text style={[styles.timeTagText, { color: habit.color }]}>
                {TIME_OF_DAY_CONFIG[habit.timeOfDay].icon} {TIME_OF_DAY_CONFIG[habit.timeOfDay].label}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.habitArrow}>
          <Text style={styles.arrowText}>›</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Calendar Cell Component (GitHub Grass Style)
const CalendarCell: React.FC<{
  date: Date;
  completedHabits: number;
  totalHabits: number;
  isToday: boolean;
  isFuture: boolean;
  onPress: () => void;
}> = ({ date, completedHabits, totalHabits, isToday, isFuture, onPress }) => {
  const percentage = totalHabits > 0 ? completedHabits / totalHabits : 0;
  
  const getGrassColor = () => {
    if (isFuture) return COLORS.grass0;
    if (totalHabits === 0) return COLORS.grass0;
    if (percentage === 0) return COLORS.grass0;
    if (percentage < 0.25) return COLORS.grass1;
    if (percentage < 0.5) return COLORS.grass2;
    if (percentage < 0.75) return COLORS.grass3;
    return COLORS.grass4;
  };
  
  return (
    <TouchableOpacity
      style={[
        styles.calendarCell,
        { backgroundColor: getGrassColor() },
        isToday && styles.calendarCellToday,
      ]}
      onPress={onPress}
      disabled={isFuture}
    >
      <Text style={[
        styles.calendarCellText,
        percentage > 0.5 && styles.calendarCellTextLight,
      ]}>
        {date.getDate()}
      </Text>
    </TouchableOpacity>
  );
};

// Progress Ring Component
const ProgressRing: React.FC<{
  progress: number;
  size: number;
  strokeWidth: number;
  color: string;
}> = ({ progress, size, strokeWidth, color }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
  return (
    <View style={{ width: size, height: size }}>
      <View style={styles.progressRingContainer}>
        {/* Background circle */}
        <View
          style={[
            styles.progressRingCircle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: `${color}30`,
            },
          ]}
        />
        {/* Progress circle (simplified - just show percentage) */}
        <View style={styles.progressRingCenter}>
          <Text style={[styles.progressRingText, { color }]}>{progress}%</Text>
        </View>
      </View>
    </View>
  );
};

// Weekly Report Card
const WeeklyReportCard: React.FC<{
  stats: WeeklyStats;
}> = ({ stats }) => {
  const weekLabel = useMemo(() => {
    const startMonth = stats.weekStart.getMonth() + 1;
    const startDay = stats.weekStart.getDate();
    const endMonth = stats.weekEnd.getMonth() + 1;
    const endDay = stats.weekEnd.getDate();
    return `${startMonth}/${startDay} - ${endMonth}/${endDay}`;
  }, [stats]);
  
  return (
    <View style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <Text style={styles.reportTitle}>週間サマリー</Text>
        <Text style={styles.reportDate}>{weekLabel}</Text>
      </View>
      
      <View style={styles.reportOverview}>
        <ProgressRing
          progress={stats.overallPercentage}
          size={100}
          strokeWidth={10}
          color={COLORS.primary}
        />
        <View style={styles.reportStats}>
          <View style={styles.reportStatItem}>
            <Text style={styles.reportStatValue}>{stats.totalCompleted}</Text>
            <Text style={styles.reportStatLabel}>完了</Text>
          </View>
          <View style={styles.reportStatItem}>
            <Text style={styles.reportStatValue}>{stats.totalTarget}</Text>
            <Text style={styles.reportStatLabel}>目標</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.reportHabits}>
        {stats.habits.map(habit => (
          <View key={habit.habitId} style={styles.reportHabitRow}>
            <View style={styles.reportHabitInfo}>
              <Text style={styles.reportHabitIcon}>{habit.icon}</Text>
              <Text style={styles.reportHabitName} numberOfLines={1}>
                {habit.habitName}
              </Text>
            </View>
            <View style={styles.reportHabitProgress}>
              <View style={styles.reportProgressBar}>
                <View
                  style={[
                    styles.reportProgressFill,
                    {
                      width: `${Math.min(100, habit.percentage)}%`,
                      backgroundColor: habit.percentage >= 100 ? COLORS.success : COLORS.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.reportHabitStats}>
                {habit.completed}/{habit.target}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// ==================== MAIN COMPONENT ====================
const HabitsScreen: React.FC = () => {
  const navigation = useNavigation();
  
  // State
  const [habits, setHabits] = useState<Habit[]>(createSampleHabits);
  const [viewMode, setViewMode] = useState<ViewMode>('today');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Form state for adding/editing habits
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIcon, setFormIcon] = useState('💪');
  const [formColor, setFormColor] = useState(COLORS.primary);
  const [formFrequency, setFormFrequency] = useState<FrequencyType>('daily');
  const [formTimesPerWeek, setFormTimesPerWeek] = useState(3);
  const [formTargetDays, setFormTargetDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [formTimeOfDay, setFormTimeOfDay] = useState<TimeOfDay>('morning');
  
  // Calculate streaks and completion rates
  const habitsWithStats = useMemo(() => {
    return habits.map(habit => {
      const streakData = calculateStreak(habit);
      const completionRate = calculateCompletionRate(habit);
      return {
        ...habit,
        currentStreak: streakData.current,
        bestStreak: streakData.best,
        completionRate,
      };
    });
  }, [habits]);
  
  // Get today's habits (not archived)
  const todayHabits = useMemo(() => {
    const today = new Date();
    return habitsWithStats
      .filter(h => !h.archived)
      .filter(h => isHabitDueOnDate(h, today));
  }, [habitsWithStats]);
  
  // Get all active habits
  const activeHabits = useMemo(() => {
    return habitsWithStats.filter(h => !h.archived);
  }, [habitsWithStats]);
  
  // Weekly stats
  const weeklyStats = useMemo(() => {
    const weekStart = getWeekStart(new Date());
    return getWeeklyStats(habits, weekStart);
  }, [habits]);
  
  // Calendar data
  const calendarData = useMemo(() => {
    const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const lastDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
    const startPadding = firstDay.getDay();
    
    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    
    // Previous month padding
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(firstDay);
      date.setDate(date.getDate() - i - 1);
      days.push({ date, isCurrentMonth: false });
    }
    
    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), i);
      days.push({ date, isCurrentMonth: true });
    }
    
    // Next month padding
    const remaining = 42 - days.length; // 6 rows x 7 days
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(lastDay);
      date.setDate(date.getDate() + i);
      days.push({ date, isCurrentMonth: false });
    }
    
    return days;
  }, [calendarMonth]);
  
  // Handlers
  const handleToggleHabit = useCallback((habitId: string, date: Date = new Date()) => {
    const dateStr = formatDate(date);
    
    setHabits(prev => prev.map(habit => {
      if (habit.id !== habitId) return habit;
      
      const existingLogIndex = habit.logs.findIndex(log => log.date === dateStr);
      let newLogs: HabitLog[];
      
      if (existingLogIndex >= 0) {
        // Toggle existing log
        newLogs = habit.logs.map((log, index) => 
          index === existingLogIndex
            ? { ...log, completed: !log.completed }
            : log
        );
      } else {
        // Add new log
        newLogs = [...habit.logs, { date: dateStr, completed: true }];
      }
      
      return { ...habit, logs: newLogs };
    }));
  }, []);
  
  const handleAddHabit = useCallback(() => {
    if (!formName.trim()) {
      Alert.alert('エラー', '習慣名を入力してください');
      return;
    }
    
    const newHabit: Habit = {
      id: generateId(),
      name: formName.trim(),
      description: formDescription.trim() || undefined,
      icon: formIcon,
      color: formColor,
      frequency: formFrequency,
      timesPerWeek: formFrequency === 'weekly' ? formTimesPerWeek : undefined,
      targetDays: formFrequency === 'specific_days' ? formTargetDays : undefined,
      timeOfDay: formTimeOfDay,
      createdAt: new Date(),
      archived: false,
      logs: [],
      currentStreak: 0,
      bestStreak: 0,
      totalCompletions: 0,
    };
    
    setHabits(prev => [newHabit, ...prev]);
    resetForm();
    setShowAddModal(false);
  }, [formName, formDescription, formIcon, formColor, formFrequency, formTimesPerWeek, formTargetDays, formTimeOfDay]);
  
  const handleDeleteHabit = useCallback((habitId: string) => {
    Alert.alert(
      '習慣を削除',
      'この習慣を削除しますか？この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            setHabits(prev => prev.filter(h => h.id !== habitId));
            setShowDetailModal(false);
            setSelectedHabit(null);
          },
        },
      ]
    );
  }, []);
  
  const handleArchiveHabit = useCallback((habitId: string) => {
    setHabits(prev => prev.map(habit =>
      habit.id === habitId ? { ...habit, archived: !habit.archived } : habit
    ));
    setShowDetailModal(false);
    setSelectedHabit(null);
  }, []);
  
  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormIcon('💪');
    setFormColor(COLORS.primary);
    setFormFrequency('daily');
    setFormTimesPerWeek(3);
    setFormTargetDays([1, 2, 3, 4, 5]);
    setFormTimeOfDay('morning');
  };
  
  const openHabitDetail = (habit: Habit) => {
    setSelectedHabit(habit);
    setShowDetailModal(true);
  };
  
  const navigateMonth = (direction: number) => {
    setCalendarMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(newMonth.getMonth() + direction);
      return newMonth;
    });
  };
  
  // Get completion stats for calendar
  const getDateStats = useCallback((date: Date) => {
    const dateStr = formatDate(date);
    let completed = 0;
    let total = 0;
    
    activeHabits.forEach(habit => {
      if (date < habit.createdAt) return;
      if (isHabitDueOnDate(habit, date)) {
        total++;
        if (habit.logs.some(log => log.date === dateStr && log.completed)) {
          completed++;
        }
      }
    });
    
    return { completed, total };
  }, [activeHabits]);
  
  // Render view mode tabs
  const renderViewTabs = () => (
    <View style={styles.viewTabs}>
      {[
        { key: 'today', label: '今日', icon: '📅' },
        { key: 'all', label: 'すべて', icon: '📋' },
        { key: 'calendar', label: 'カレンダー', icon: '🗓' },
        { key: 'report', label: 'レポート', icon: '📊' },
      ].map(tab => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.viewTab,
            viewMode === tab.key && styles.viewTabActive,
          ]}
          onPress={() => setViewMode(tab.key as ViewMode)}
        >
          <Text style={styles.viewTabIcon}>{tab.icon}</Text>
          <Text style={[
            styles.viewTabLabel,
            viewMode === tab.key && styles.viewTabLabelActive,
          ]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
  
  // Render today's view
  const renderTodayView = () => {
    const today = new Date();
    const completedToday = todayHabits.filter(h => getHabitCompletionForDate(h, today)).length;
    const totalToday = todayHabits.length;
    const percentage = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;
    
    return (
      <View style={styles.todayView}>
        {/* Today's progress */}
        <View style={styles.todayProgress}>
          <View style={styles.todayProgressInfo}>
            <Text style={styles.todayDate}>{getDateLabel(today)}</Text>
            <Text style={styles.todayStats}>
              {completedToday}/{totalToday} 完了
            </Text>
          </View>
          <View style={styles.todayProgressRing}>
            <ProgressRing
              progress={percentage}
              size={60}
              strokeWidth={6}
              color={COLORS.primary}
            />
          </View>
        </View>
        
        {/* Progress bar */}
        <View style={styles.todayProgressBar}>
          <View
            style={[
              styles.todayProgressFill,
              { width: `${percentage}%` },
            ]}
          />
        </View>
        
        {/* Habits list */}
        {todayHabits.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={styles.emptyTitle}>今日の習慣はありません</Text>
            <Text style={styles.emptySubtitle}>新しい習慣を追加してみましょう</Text>
          </View>
        ) : (
          <View style={styles.habitsList}>
            {/* Time of day sections */}
            {(['morning', 'afternoon', 'evening', 'anytime'] as TimeOfDay[]).map(timeOfDay => {
              const habitsForTime = todayHabits.filter(h => h.timeOfDay === timeOfDay);
              if (habitsForTime.length === 0) return null;
              
              return (
                <View key={timeOfDay} style={styles.timeSection}>
                  <Text style={styles.timeSectionTitle}>
                    {TIME_OF_DAY_CONFIG[timeOfDay].icon} {TIME_OF_DAY_CONFIG[timeOfDay].label}
                  </Text>
                  {habitsForTime.map(habit => (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      isCompletedToday={getHabitCompletionForDate(habit, today)}
                      onToggle={() => handleToggleHabit(habit.id)}
                      onPress={() => openHabitDetail(habit)}
                      streak={habit.currentStreak}
                      completionRate={habit.completionRate}
                    />
                  ))}
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };
  
  // Render all habits view
  const renderAllView = () => (
    <View style={styles.allView}>
      {activeHabits.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🎯</Text>
          <Text style={styles.emptyTitle}>習慣がありません</Text>
          <Text style={styles.emptySubtitle}>最初の習慣を追加してみましょう</Text>
        </View>
      ) : (
        <View style={styles.habitsList}>
          {activeHabits.map(habit => (
            <HabitCard
              key={habit.id}
              habit={habit}
              isCompletedToday={getHabitCompletionForDate(habit, new Date())}
              onToggle={() => handleToggleHabit(habit.id)}
              onPress={() => openHabitDetail(habit)}
              streak={habit.currentStreak}
              completionRate={habit.completionRate}
            />
          ))}
        </View>
      )}
    </View>
  );
  
  // Render calendar view (GitHub grass style)
  const renderCalendarView = () => (
    <View style={styles.calendarView}>
      {/* Month navigation */}
      <View style={styles.calendarNav}>
        <TouchableOpacity
          style={styles.calendarNavButton}
          onPress={() => navigateMonth(-1)}
        >
          <Text style={styles.calendarNavText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.calendarNavTitle}>
          {calendarMonth.getFullYear()}年{calendarMonth.getMonth() + 1}月
        </Text>
        <TouchableOpacity
          style={styles.calendarNavButton}
          onPress={() => navigateMonth(1)}
        >
          <Text style={styles.calendarNavText}>›</Text>
        </TouchableOpacity>
      </View>
      
      {/* Day headers */}
      <View style={styles.calendarHeader}>
        {DAYS_OF_WEEK.map(day => (
          <View key={day} style={styles.calendarHeaderCell}>
            <Text style={styles.calendarHeaderText}>{day}</Text>
          </View>
        ))}
      </View>
      
      {/* Calendar grid */}
      <View style={styles.calendarGrid}>
        {calendarData.map((item, index) => {
          const stats = getDateStats(item.date);
          const today = new Date();
          const isToday = isSameDay(item.date, today);
          const isFuture = item.date > today;
          
          return (
            <CalendarCell
              key={index}
              date={item.date}
              completedHabits={stats.completed}
              totalHabits={stats.total}
              isToday={isToday}
              isFuture={isFuture}
              onPress={() => {
                setSelectedDate(item.date);
                setShowDatePicker(true);
              }}
            />
          );
        })}
      </View>
      
      {/* Legend */}
      <View style={styles.calendarLegend}>
        <Text style={styles.legendLabel}>達成率:</Text>
        <View style={styles.legendItems}>
          {[
            { color: COLORS.grass0, label: '0%' },
            { color: COLORS.grass1, label: '25%' },
            { color: COLORS.grass2, label: '50%' },
            { color: COLORS.grass3, label: '75%' },
            { color: COLORS.grass4, label: '100%' },
          ].map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: item.color }]} />
            </View>
          ))}
        </View>
      </View>
      
      {/* Streak highlights */}
      <View style={styles.streakHighlights}>
        <Text style={styles.streakTitle}>🔥 ストリーク上位</Text>
        {habitsWithStats
          .filter(h => !h.archived && h.currentStreak > 0)
          .sort((a, b) => b.currentStreak - a.currentStreak)
          .slice(0, 3)
          .map(habit => (
            <View key={habit.id} style={styles.streakItem}>
              <Text style={styles.streakIcon}>{habit.icon}</Text>
              <Text style={styles.streakName}>{habit.name}</Text>
              <Text style={styles.streakValue}>{habit.currentStreak}日連続</Text>
            </View>
          ))}
      </View>
    </View>
  );
  
  // Render report view
  const renderReportView = () => (
    <View style={styles.reportView}>
      <WeeklyReportCard stats={weeklyStats} />
      
      {/* Achievements */}
      <View style={styles.achievementsCard}>
        <Text style={styles.achievementsTitle}>🏆 記録</Text>
        <View style={styles.achievementsGrid}>
          <View style={styles.achievementItem}>
            <Text style={styles.achievementValue}>
              {Math.max(...habitsWithStats.map(h => h.bestStreak), 0)}
            </Text>
            <Text style={styles.achievementLabel}>最長ストリーク</Text>
          </View>
          <View style={styles.achievementItem}>
            <Text style={styles.achievementValue}>
              {habitsWithStats.reduce((sum, h) => sum + h.logs.filter(l => l.completed).length, 0)}
            </Text>
            <Text style={styles.achievementLabel}>累計チェックイン</Text>
          </View>
          <View style={styles.achievementItem}>
            <Text style={styles.achievementValue}>{activeHabits.length}</Text>
            <Text style={styles.achievementLabel}>アクティブ習慣</Text>
          </View>
          <View style={styles.achievementItem}>
            <Text style={styles.achievementValue}>
              {habitsWithStats.filter(h => h.completionRate >= 80).length}
            </Text>
            <Text style={styles.achievementLabel}>80%以上達成</Text>
          </View>
        </View>
      </View>
      
      {/* Tips */}
      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>💡 習慣化のコツ</Text>
        <Text style={styles.tipText}>
          • 小さく始める - 最初は2分から{'\n'}
          • 既存の習慣に紐付ける{'\n'}
          • 同じ時間・場所で行う{'\n'}
          • 達成したら自分を褒める
        </Text>
      </View>
    </View>
  );
  
  // Render add habit modal
  const renderAddModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowAddModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowAddModal(false)}>
            <Text style={styles.modalCancel}>キャンセル</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>新しい習慣</Text>
          <TouchableOpacity onPress={handleAddHabit}>
            <Text style={styles.modalSave}>保存</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          {/* Name input */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>習慣名 *</Text>
            <TextInput
              style={styles.formInput}
              value={formName}
              onChangeText={setFormName}
              placeholder="例: 朝のストレッチ"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>
          
          {/* Description input */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>説明（任意）</Text>
            <TextInput
              style={[styles.formInput, styles.formTextarea]}
              value={formDescription}
              onChangeText={setFormDescription}
              placeholder="詳細を入力..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>
          
          {/* Icon selection */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>アイコン</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.iconGrid}>
                {HABIT_ICONS.map(icon => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconOption,
                      formIcon === icon && styles.iconOptionSelected,
                    ]}
                    onPress={() => setFormIcon(icon)}
                  >
                    <Text style={styles.iconOptionText}>{icon}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
          
          {/* Color selection */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>カラー</Text>
            <View style={styles.colorGrid}>
              {HABIT_COLORS.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    formColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setFormColor(color)}
                >
                  {formColor === color && (
                    <Text style={styles.colorOptionCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Frequency selection */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>頻度</Text>
            <View style={styles.frequencyOptions}>
              {[
                { key: 'daily', label: '毎日', icon: '📅' },
                { key: 'weekly', label: '週X回', icon: '🗓' },
                { key: 'specific_days', label: '特定曜日', icon: '📆' },
              ].map(option => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.frequencyOption,
                    formFrequency === option.key && styles.frequencyOptionSelected,
                  ]}
                  onPress={() => setFormFrequency(option.key as FrequencyType)}
                >
                  <Text style={styles.frequencyIcon}>{option.icon}</Text>
                  <Text style={[
                    styles.frequencyLabel,
                    formFrequency === option.key && styles.frequencyLabelSelected,
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Weekly times selector */}
            {formFrequency === 'weekly' && (
              <View style={styles.weeklyTimesSelector}>
                <Text style={styles.weeklyTimesLabel}>週に</Text>
                <View style={styles.weeklyTimesButtons}>
                  {[1, 2, 3, 4, 5, 6, 7].map(num => (
                    <TouchableOpacity
                      key={num}
                      style={[
                        styles.weeklyTimesButton,
                        formTimesPerWeek === num && styles.weeklyTimesButtonSelected,
                      ]}
                      onPress={() => setFormTimesPerWeek(num)}
                    >
                      <Text style={[
                        styles.weeklyTimesButtonText,
                        formTimesPerWeek === num && styles.weeklyTimesButtonTextSelected,
                      ]}>
                        {num}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.weeklyTimesLabel}>回</Text>
              </View>
            )}
            
            {/* Specific days selector */}
            {formFrequency === 'specific_days' && (
              <View style={styles.daysSelector}>
                {DAYS_OF_WEEK.map((day, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayOption,
                      formTargetDays.includes(index) && styles.dayOptionSelected,
                    ]}
                    onPress={() => {
                      setFormTargetDays(prev =>
                        prev.includes(index)
                          ? prev.filter(d => d !== index)
                          : [...prev, index].sort()
                      );
                    }}
                  >
                    <Text style={[
                      styles.dayOptionText,
                      formTargetDays.includes(index) && styles.dayOptionTextSelected,
                    ]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          
          {/* Time of day selection */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>時間帯</Text>
            <View style={styles.timeOfDayOptions}>
              {(Object.keys(TIME_OF_DAY_CONFIG) as TimeOfDay[]).map(time => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeOfDayOption,
                    formTimeOfDay === time && styles.timeOfDayOptionSelected,
                  ]}
                  onPress={() => setFormTimeOfDay(time)}
                >
                  <Text style={styles.timeOfDayIcon}>
                    {TIME_OF_DAY_CONFIG[time].icon}
                  </Text>
                  <Text style={[
                    styles.timeOfDayLabel,
                    formTimeOfDay === time && styles.timeOfDayLabelSelected,
                  ]}>
                    {TIME_OF_DAY_CONFIG[time].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
  
  // Render habit detail modal
  const renderDetailModal = () => {
    if (!selectedHabit) return null;
    
    const habitWithStats = habitsWithStats.find(h => h.id === selectedHabit.id);
    if (!habitWithStats) return null;
    
    // Generate last 30 days for mini calendar
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - 29 + i);
      return date;
    });
    
    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDetailModal(false)}>
              <Text style={styles.modalCancel}>閉じる</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>習慣詳細</Text>
            <View style={{ width: 60 }} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            {/* Habit info */}
            <View style={styles.detailHeader}>
              <View style={[styles.detailIconContainer, { backgroundColor: `${habitWithStats.color}20` }]}>
                <Text style={styles.detailIcon}>{habitWithStats.icon}</Text>
              </View>
              <Text style={styles.detailName}>{habitWithStats.name}</Text>
              {habitWithStats.description && (
                <Text style={styles.detailDescription}>{habitWithStats.description}</Text>
              )}
            </View>
            
            {/* Stats grid */}
            <View style={styles.detailStatsGrid}>
              <View style={styles.detailStatCard}>
                <Text style={styles.detailStatIcon}>🔥</Text>
                <Text style={styles.detailStatValue}>{habitWithStats.currentStreak}</Text>
                <Text style={styles.detailStatLabel}>現在のストリーク</Text>
              </View>
              <View style={styles.detailStatCard}>
                <Text style={styles.detailStatIcon}>🏆</Text>
                <Text style={styles.detailStatValue}>{habitWithStats.bestStreak}</Text>
                <Text style={styles.detailStatLabel}>最高ストリーク</Text>
              </View>
              <View style={styles.detailStatCard}>
                <Text style={styles.detailStatIcon}>📊</Text>
                <Text style={styles.detailStatValue}>{habitWithStats.completionRate}%</Text>
                <Text style={styles.detailStatLabel}>達成率(30日)</Text>
              </View>
              <View style={styles.detailStatCard}>
                <Text style={styles.detailStatIcon}>✅</Text>
                <Text style={styles.detailStatValue}>
                  {habitWithStats.logs.filter(l => l.completed).length}
                </Text>
                <Text style={styles.detailStatLabel}>累計完了</Text>
              </View>
            </View>
            
            {/* Mini calendar */}
            <View style={styles.detailCalendar}>
              <Text style={styles.detailCalendarTitle}>過去30日</Text>
              <View style={styles.detailCalendarGrid}>
                {last30Days.map((date, index) => {
                  const completed = getHabitCompletionForDate(habitWithStats, date);
                  const isDue = isHabitDueOnDate(habitWithStats, date);
                  const isToday = isSameDay(date, new Date());
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.detailCalendarCell,
                        completed && { backgroundColor: habitWithStats.color },
                        !isDue && styles.detailCalendarCellDisabled,
                        isToday && styles.detailCalendarCellToday,
                      ]}
                      onPress={() => {
                        if (isDue) handleToggleHabit(habitWithStats.id, date);
                      }}
                    >
                      {completed && <Text style={styles.detailCalendarCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            
            {/* Frequency info */}
            <View style={styles.detailInfo}>
              <Text style={styles.detailInfoTitle}>設定</Text>
              <View style={styles.detailInfoRow}>
                <Text style={styles.detailInfoLabel}>頻度</Text>
                <Text style={styles.detailInfoValue}>
                  {habitWithStats.frequency === 'daily' && '毎日'}
                  {habitWithStats.frequency === 'weekly' && `週${habitWithStats.timesPerWeek}回`}
                  {habitWithStats.frequency === 'specific_days' && 
                    habitWithStats.targetDays?.map(d => DAYS_OF_WEEK[d]).join(', ')}
                </Text>
              </View>
              <View style={styles.detailInfoRow}>
                <Text style={styles.detailInfoLabel}>時間帯</Text>
                <Text style={styles.detailInfoValue}>
                  {TIME_OF_DAY_CONFIG[habitWithStats.timeOfDay].icon} {TIME_OF_DAY_CONFIG[habitWithStats.timeOfDay].label}
                </Text>
              </View>
              <View style={styles.detailInfoRow}>
                <Text style={styles.detailInfoLabel}>開始日</Text>
                <Text style={styles.detailInfoValue}>
                  {getDateLabel(habitWithStats.createdAt)}
                </Text>
              </View>
            </View>
            
            {/* Actions */}
            <View style={styles.detailActions}>
              <TouchableOpacity
                style={styles.detailActionButton}
                onPress={() => handleArchiveHabit(habitWithStats.id)}
              >
                <Text style={styles.detailActionIcon}>📦</Text>
                <Text style={styles.detailActionText}>
                  {habitWithStats.archived ? 'アーカイブ解除' : 'アーカイブ'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.detailActionButton, styles.detailActionButtonDanger]}
                onPress={() => handleDeleteHabit(habitWithStats.id)}
              >
                <Text style={styles.detailActionIcon}>🗑</Text>
                <Text style={[styles.detailActionText, styles.detailActionTextDanger]}>
                  削除
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };
  
  // Render date picker modal for calendar cell
  const renderDatePickerModal = () => (
    <Modal
      visible={showDatePicker}
      animationType="fade"
      transparent
      onRequestClose={() => setShowDatePicker(false)}
    >
      <TouchableOpacity
        style={styles.datePickerOverlay}
        activeOpacity={1}
        onPress={() => setShowDatePicker(false)}
      >
        <View style={styles.datePickerContent}>
          <Text style={styles.datePickerTitle}>{getDateLabel(selectedDate)}</Text>
          <Text style={styles.datePickerSubtitle}>この日の習慣をチェック</Text>
          
          <ScrollView style={styles.datePickerList}>
            {activeHabits
              .filter(h => isHabitDueOnDate(h, selectedDate))
              .map(habit => {
                const completed = getHabitCompletionForDate(habit, selectedDate);
                return (
                  <TouchableOpacity
                    key={habit.id}
                    style={styles.datePickerItem}
                    onPress={() => {
                      handleToggleHabit(habit.id, selectedDate);
                    }}
                  >
                    <View style={[
                      styles.datePickerCheck,
                      { borderColor: habit.color },
                      completed && { backgroundColor: habit.color },
                    ]}>
                      {completed && <Text style={styles.datePickerCheckIcon}>✓</Text>}
                    </View>
                    <Text style={styles.datePickerItemIcon}>{habit.icon}</Text>
                    <Text style={styles.datePickerItemName}>{habit.name}</Text>
                  </TouchableOpacity>
                );
              })}
          </ScrollView>
          
          <TouchableOpacity
            style={styles.datePickerClose}
            onPress={() => setShowDatePicker(false)}
          >
            <Text style={styles.datePickerCloseText}>閉じる</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🎯 習慣トラッカー</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setShowAddModal(true);
          }}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>
      
      {/* View mode tabs */}
      {renderViewTabs()}
      
      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {viewMode === 'today' && renderTodayView()}
        {viewMode === 'all' && renderAllView()}
        {viewMode === 'calendar' && renderCalendarView()}
        {viewMode === 'report' && renderReportView()}
      </ScrollView>
      
      {/* Modals */}
      {renderAddModal()}
      {renderDetailModal()}
      {renderDatePickerModal()}
    </SafeAreaView>
  );
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: COLORS.text,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: COLORS.white,
    fontWeight: '600',
  },
  
  // View tabs
  viewTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  viewTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  viewTabActive: {
    backgroundColor: `${COLORS.primary}15`,
  },
  viewTabIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  viewTabLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  viewTabLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  
  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  
  // Today view
  todayView: {},
  todayProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  todayProgressInfo: {},
  todayDate: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  todayStats: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  todayProgressRing: {},
  todayProgressBar: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  todayProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  
  // Time sections
  timeSection: {
    marginBottom: 16,
  },
  timeSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
    paddingLeft: 4,
  },
  
  // Habits list
  habitsList: {},
  
  // Habit card
  habitCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  habitCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  checkButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkIcon: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: '700',
  },
  habitInfo: {
    flex: 1,
  },
  habitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  habitIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  habitName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  habitNameCompleted: {
    textDecorationLine: 'line-through',
    color: COLORS.textMuted,
  },
  habitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  metaIcon: {
    fontSize: 12,
    marginRight: 2,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  timeTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timeTagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  habitArrow: {
    paddingLeft: 8,
  },
  arrowText: {
    fontSize: 20,
    color: COLORS.textMuted,
  },
  
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  
  // All view
  allView: {},
  
  // Calendar view
  calendarView: {},
  calendarNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  calendarNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarNavText: {
    fontSize: 24,
    color: COLORS.text,
  },
  calendarNavTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  calendarHeader: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  calendarHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  calendarHeaderText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 8,
    marginBottom: 12,
  },
  calendarCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    margin: 1,
  },
  calendarCellToday: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  calendarCellText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  calendarCellTextLight: {
    color: COLORS.white,
  },
  calendarLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  legendLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  legendItems: {
    flexDirection: 'row',
  },
  legendItem: {
    marginHorizontal: 2,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  
  // Streak highlights
  streakHighlights: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
  },
  streakTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  streakItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  streakIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  streakName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  streakValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  
  // Report view
  reportView: {},
  reportCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  reportDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  reportOverview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  reportStats: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginLeft: 20,
  },
  reportStatItem: {
    alignItems: 'center',
  },
  reportStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  reportStatLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  reportHabits: {},
  reportHabitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  reportHabitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
  },
  reportHabitIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  reportHabitName: {
    fontSize: 13,
    color: COLORS.text,
    flex: 1,
  },
  reportHabitProgress: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportProgressBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    marginRight: 12,
    overflow: 'hidden',
  },
  reportProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  reportHabitStats: {
    fontSize: 12,
    color: COLORS.textSecondary,
    width: 32,
    textAlign: 'right',
  },
  
  // Progress ring
  progressRingContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingCircle: {
    position: 'absolute',
  },
  progressRingCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingText: {
    fontSize: 16,
    fontWeight: '700',
  },
  
  // Achievements
  achievementsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  achievementsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  achievementItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  achievementValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
  },
  achievementLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  
  // Tips
  tipsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalCancel: {
    fontSize: 16,
    color: COLORS.textSecondary,
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
  
  // Form
  formSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formTextarea: {
    height: 80,
    textAlignVertical: 'top',
  },
  
  // Icon grid
  iconGrid: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  iconOptionText: {
    fontSize: 24,
  },
  
  // Color grid
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: COLORS.text,
  },
  colorOptionCheck: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 16,
  },
  
  // Frequency options
  frequencyOptions: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  frequencyOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  frequencyOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  frequencyIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  frequencyLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  frequencyLabelSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  
  // Weekly times selector
  weeklyTimesSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  weeklyTimesLabel: {
    fontSize: 14,
    color: COLORS.text,
    marginHorizontal: 8,
  },
  weeklyTimesButtons: {
    flexDirection: 'row',
  },
  weeklyTimesButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  weeklyTimesButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  weeklyTimesButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  weeklyTimesButtonTextSelected: {
    color: COLORS.white,
  },
  
  // Days selector
  daysSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  dayOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  dayOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  dayOptionTextSelected: {
    color: COLORS.white,
  },
  
  // Time of day options
  timeOfDayOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  timeOfDayOption: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginRight: '4%',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  timeOfDayOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  timeOfDayIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  timeOfDayLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  timeOfDayLabelSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  
  // Detail modal
  detailHeader: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  detailIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  detailIcon: {
    fontSize: 36,
  },
  detailName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  detailDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  
  // Detail stats
  detailStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  detailStatCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    margin: '1%',
  },
  detailStatIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  detailStatValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  detailStatLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  
  // Detail calendar
  detailCalendar: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  detailCalendarTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  detailCalendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  detailCalendarCell: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 2,
  },
  detailCalendarCellDisabled: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  detailCalendarCellToday: {
    borderWidth: 2,
    borderColor: COLORS.text,
  },
  detailCalendarCheck: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  
  // Detail info
  detailInfo: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  detailInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  detailInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailInfoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  detailInfoValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  
  // Detail actions
  detailActions: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  detailActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
  },
  detailActionButtonDanger: {
    backgroundColor: `${COLORS.danger}10`,
  },
  detailActionIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  detailActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  detailActionTextDanger: {
    color: COLORS.danger,
  },
  
  // Date picker modal
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  datePickerContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    maxHeight: '70%',
  },
  datePickerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  datePickerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  datePickerList: {
    maxHeight: 300,
  },
  datePickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  datePickerCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  datePickerCheckIcon: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  datePickerItemIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  datePickerItemName: {
    fontSize: 16,
    color: COLORS.text,
  },
  datePickerClose: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  datePickerCloseText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HabitsScreen;
