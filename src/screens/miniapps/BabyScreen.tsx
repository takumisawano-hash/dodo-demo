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
// 👶 DoDo Life 育児記録ミニアプリ
// ぴよログ機能80%再現 - フル機能実装
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
  milk: '#42A5F5',
  breast: '#F48FB1',
  diaper: '#8BC34A',
  poop: '#8D6E63',
  sleep: '#7E57C2',
  growth: '#26A69A',
  bath: '#29B6F6',
  medicine: '#EF5350',
  temperature: '#FF7043',
};

// =====================================================
// 型定義
// =====================================================

interface BabyProfile {
  id: string;
  name: string;
  birthDate: string;
  gender: 'male' | 'female';
  bloodType?: string;
  photoUrl?: string;
}

interface MilkRecord {
  id: string;
  date: string;
  time: string;
  type: 'formula' | 'breast_left' | 'breast_right' | 'breast_both' | 'pumped';
  amount?: number; // ml (ミルク用)
  duration?: number; // 分 (母乳用)
  memo?: string;
}

interface DiaperRecord {
  id: string;
  date: string;
  time: string;
  type: 'wet' | 'dirty' | 'both' | 'dry';
  poopColor?: 'yellow' | 'green' | 'brown' | 'black' | 'white' | 'red';
  poopConsistency?: 'liquid' | 'soft' | 'normal' | 'hard';
  memo?: string;
}

interface SleepRecord {
  id: string;
  date: string;
  startTime: string;
  endTime?: string;
  duration?: number; // 分
  isNap: boolean;
  memo?: string;
}

interface GrowthRecord {
  id: string;
  date: string;
  height?: number; // cm
  weight?: number; // kg
  headCircumference?: number; // cm
  memo?: string;
}

interface TemperatureRecord {
  id: string;
  date: string;
  time: string;
  temperature: number; // 度
  memo?: string;
}

interface BathRecord {
  id: string;
  date: string;
  time: string;
  duration?: number; // 分
  memo?: string;
}

interface MedicineRecord {
  id: string;
  date: string;
  time: string;
  name: string;
  dose?: string;
  memo?: string;
}

interface TimelineEvent {
  id: string;
  date: string;
  time: string;
  type: 'milk' | 'diaper' | 'sleep' | 'growth' | 'temperature' | 'bath' | 'medicine';
  data: MilkRecord | DiaperRecord | SleepRecord | GrowthRecord | TemperatureRecord | BathRecord | MedicineRecord;
}

type TabType = 'timeline' | 'milk' | 'diaper' | 'sleep' | 'growth' | 'stats';
type ModalType = 'milk' | 'diaper' | 'sleep' | 'growth' | 'temperature' | 'bath' | 'medicine' | 'profile' | null;

// =====================================================
// ユーティリティ関数
// =====================================================

const generateId = (): string => Math.random().toString(36).substr(2, 9);

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const formatTime = (date: Date): string => {
  return date.toTimeString().slice(0, 5);
};

const getToday = (): string => formatDate(new Date());

const getNow = (): string => formatTime(new Date());

const calculateAge = (birthDate: string): { months: number; days: number; text: string } => {
  const birth = new Date(birthDate);
  const now = new Date();
  const diff = now.getTime() - birth.getTime();
  const totalDays = Math.floor(diff / (1000 * 60 * 60 * 24));
  const months = Math.floor(totalDays / 30);
  const days = totalDays % 30;
  
  if (months === 0) {
    return { months: 0, days, text: `生後${days}日` };
  } else if (months < 12) {
    return { months, days, text: `生後${months}ヶ月${days}日` };
  } else {
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return { months, days, text: `${years}歳${remainingMonths}ヶ月` };
  }
};

const getMilkTypeLabel = (type: MilkRecord['type']): string => {
  const labels = {
    formula: 'ミルク',
    breast_left: '左おっぱい',
    breast_right: '右おっぱい',
    breast_both: '両方',
    pumped: '搾乳',
  };
  return labels[type];
};

const getMilkTypeIcon = (type: MilkRecord['type']): string => {
  const icons = {
    formula: '🍼',
    breast_left: '🤱',
    breast_right: '🤱',
    breast_both: '🤱',
    pumped: '🥛',
  };
  return icons[type];
};

const getDiaperTypeLabel = (type: DiaperRecord['type']): string => {
  const labels = { wet: 'おしっこ', dirty: 'うんち', both: '両方', dry: '空振り' };
  return labels[type];
};

const getDiaperTypeIcon = (type: DiaperRecord['type']): string => {
  const icons = { wet: '💧', dirty: '💩', both: '💧💩', dry: '✨' };
  return icons[type];
};

const getPoopColorLabel = (color: DiaperRecord['poopColor']): string => {
  const labels = {
    yellow: '黄色',
    green: '緑',
    brown: '茶色',
    black: '黒',
    white: '白',
    red: '赤',
  };
  return color ? labels[color] : '';
};

const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}分`;
  return `${hours}時間${mins > 0 ? `${mins}分` : ''}`;
};

// =====================================================
// カスタムコンポーネント
// =====================================================

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  children?: React.ReactNode;
}

const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 100,
  strokeWidth = 10,
  color = COLORS.primary,
  backgroundColor = COLORS.border,
  children,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(progress, 1) * circumference);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute' }}>
        {/* Background circle */}
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: backgroundColor,
          }}
        />
      </View>
      <View style={{ position: 'absolute' }}>
        {/* Progress circle */}
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: color,
            borderTopColor: 'transparent',
            borderRightColor: progress > 0.25 ? color : 'transparent',
            borderBottomColor: progress > 0.5 ? color : 'transparent',
            borderLeftColor: progress > 0.75 ? color : 'transparent',
            transform: [{ rotate: '-90deg' }],
          }}
        />
      </View>
      {children}
    </View>
  );
};

interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  unit?: string;
}

const SimpleLineChart: React.FC<LineChartProps> = ({
  data,
  height = 150,
  color = COLORS.primary,
  unit = '',
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

  const getY = (value: number): number => {
    return chartHeight - ((value - minValue) / range) * chartHeight;
  };

  return (
    <View style={[styles.chartContainer, { height }]}>
      <View style={styles.chartYAxis}>
        <Text style={styles.axisLabel}>{maxValue.toFixed(1)}{unit}</Text>
        <Text style={styles.axisLabel}>{minValue.toFixed(1)}{unit}</Text>
      </View>
      <View style={styles.chartArea}>
        {/* Grid lines */}
        <View style={[styles.gridLine, { top: 0 }]} />
        <View style={[styles.gridLine, { top: chartHeight / 2 }]} />
        <View style={[styles.gridLine, { top: chartHeight }]} />
        
        {/* Data points */}
        {data.map((d, i) => {
          const x = data.length > 1 ? (i / (data.length - 1)) * chartWidth : chartWidth / 2;
          const y = getY(d.value);
          return (
            <View key={i}>
              <View
                style={[
                  styles.dataPoint,
                  {
                    left: x - 5,
                    top: y - 5,
                    backgroundColor: color,
                  },
                ]}
              />
              {/* Connect with previous point */}
              {i > 0 && (
                <View
                  style={[
                    styles.dataLine,
                    {
                      left: ((i - 1) / (data.length - 1)) * chartWidth,
                      top: getY(data[i - 1].value),
                      width: chartWidth / (data.length - 1),
                      backgroundColor: color,
                      transform: [
                        {
                          rotate: `${Math.atan2(
                            y - getY(data[i - 1].value),
                            chartWidth / (data.length - 1)
                          )}rad`,
                        },
                      ],
                    },
                  ]}
                />
              )}
            </View>
          );
        })}
      </View>
      <View style={styles.chartXAxis}>
        {data.slice(0, 7).map((d, i) => (
          <Text key={i} style={styles.axisLabel}>{d.label}</Text>
        ))}
      </View>
    </View>
  );
};

// =====================================================
// メインコンポーネント
// =====================================================

const BabyScreen: React.FC = () => {
  // 状態管理
  const [selectedTab, setSelectedTab] = useState<TabType>('timeline');
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedDate, setSelectedDate] = useState<string>(getToday());
  
  // 赤ちゃんプロフィール
  const [babyProfile, setBabyProfile] = useState<BabyProfile>({
    id: generateId(),
    name: 'あかちゃん',
    birthDate: '2024-06-15',
    gender: 'female',
  });
  
  // 各種記録
  const [milkRecords, setMilkRecords] = useState<MilkRecord[]>([
    { id: generateId(), date: getToday(), time: '06:30', type: 'breast_both', duration: 15 },
    { id: generateId(), date: getToday(), time: '09:00', type: 'formula', amount: 120 },
    { id: generateId(), date: getToday(), time: '12:00', type: 'breast_left', duration: 10 },
    { id: generateId(), date: getToday(), time: '15:30', type: 'formula', amount: 140 },
  ]);
  
  const [diaperRecords, setDiaperRecords] = useState<DiaperRecord[]>([
    { id: generateId(), date: getToday(), time: '07:00', type: 'wet' },
    { id: generateId(), date: getToday(), time: '09:30', type: 'dirty', poopColor: 'yellow', poopConsistency: 'soft' },
    { id: generateId(), date: getToday(), time: '13:00', type: 'both', poopColor: 'yellow' },
    { id: generateId(), date: getToday(), time: '16:00', type: 'wet' },
  ]);
  
  const [sleepRecords, setSleepRecords] = useState<SleepRecord[]>([
    { id: generateId(), date: getToday(), startTime: '00:00', endTime: '06:00', duration: 360, isNap: false },
    { id: generateId(), date: getToday(), startTime: '10:00', endTime: '11:30', duration: 90, isNap: true },
    { id: generateId(), date: getToday(), startTime: '14:00', endTime: '15:00', duration: 60, isNap: true },
  ]);
  
  const [growthRecords, setGrowthRecords] = useState<GrowthRecord[]>([
    { id: generateId(), date: '2024-06-15', height: 50, weight: 3.2, headCircumference: 33 },
    { id: generateId(), date: '2024-07-15', height: 54, weight: 4.1, headCircumference: 36 },
    { id: generateId(), date: '2024-08-15', height: 58, weight: 5.2, headCircumference: 38 },
    { id: generateId(), date: '2024-09-15', height: 62, weight: 6.0, headCircumference: 40 },
    { id: generateId(), date: '2024-10-15', height: 65, weight: 6.8, headCircumference: 41 },
    { id: generateId(), date: '2024-11-15', height: 68, weight: 7.5, headCircumference: 43 },
    { id: generateId(), date: '2024-12-15', height: 70, weight: 8.0, headCircumference: 44 },
  ]);

  const [temperatureRecords, setTemperatureRecords] = useState<TemperatureRecord[]>([
    { id: generateId(), date: getToday(), time: '08:00', temperature: 36.5 },
  ]);

  const [bathRecords, setBathRecords] = useState<BathRecord[]>([
    { id: generateId(), date: getToday(), time: '19:00', duration: 10 },
  ]);

  const [medicineRecords, setMedicineRecords] = useState<MedicineRecord[]>([]);
  
  // フォーム状態
  const [milkForm, setMilkForm] = useState<Partial<MilkRecord>>({
    type: 'formula',
    amount: 120,
    duration: 10,
  });
  const [diaperForm, setDiaperForm] = useState<Partial<DiaperRecord>>({ type: 'wet' });
  const [sleepForm, setSleepForm] = useState<Partial<SleepRecord>>({ isNap: true });
  const [growthForm, setGrowthForm] = useState<Partial<GrowthRecord>>({});
  const [temperatureForm, setTemperatureForm] = useState<Partial<TemperatureRecord>>({ temperature: 36.5 });
  const [bathForm, setBathForm] = useState<Partial<BathRecord>>({ duration: 10 });
  const [medicineForm, setMedicineForm] = useState<Partial<MedicineRecord>>({});

  // 計算値
  const babyAge = useMemo(() => calculateAge(babyProfile.birthDate), [babyProfile.birthDate]);
  
  const todayMilkRecords = useMemo(() => 
    milkRecords.filter(r => r.date === selectedDate),
    [milkRecords, selectedDate]
  );
  
  const todayDiaperRecords = useMemo(() => 
    diaperRecords.filter(r => r.date === selectedDate),
    [diaperRecords, selectedDate]
  );
  
  const todaySleepRecords = useMemo(() => 
    sleepRecords.filter(r => r.date === selectedDate),
    [sleepRecords, selectedDate]
  );

  const todayStats = useMemo(() => {
    const totalMilk = todayMilkRecords
      .filter(r => r.type === 'formula' || r.type === 'pumped')
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    
    const totalBreastfeeding = todayMilkRecords
      .filter(r => r.type.startsWith('breast'))
      .reduce((sum, r) => sum + (r.duration || 0), 0);
    
    const wetCount = todayDiaperRecords.filter(r => r.type === 'wet' || r.type === 'both').length;
    const dirtyCount = todayDiaperRecords.filter(r => r.type === 'dirty' || r.type === 'both').length;
    
    const totalSleep = todaySleepRecords.reduce((sum, r) => sum + (r.duration || 0), 0);
    const napTime = todaySleepRecords.filter(r => r.isNap).reduce((sum, r) => sum + (r.duration || 0), 0);
    
    return {
      totalMilk,
      totalBreastfeeding,
      wetCount,
      dirtyCount,
      totalSleep,
      napTime,
      milkCount: todayMilkRecords.length,
      diaperCount: todayDiaperRecords.length,
    };
  }, [todayMilkRecords, todayDiaperRecords, todaySleepRecords]);

  // タイムライン生成
  const timelineEvents = useMemo((): TimelineEvent[] => {
    const events: TimelineEvent[] = [];
    
    todayMilkRecords.forEach(r => {
      events.push({ id: r.id, date: r.date, time: r.time, type: 'milk', data: r });
    });
    
    todayDiaperRecords.forEach(r => {
      events.push({ id: r.id, date: r.date, time: r.time, type: 'diaper', data: r });
    });
    
    todaySleepRecords.forEach(r => {
      events.push({ id: r.id, date: r.date, time: r.startTime, type: 'sleep', data: r });
    });

    temperatureRecords.filter(r => r.date === selectedDate).forEach(r => {
      events.push({ id: r.id, date: r.date, time: r.time, type: 'temperature', data: r });
    });

    bathRecords.filter(r => r.date === selectedDate).forEach(r => {
      events.push({ id: r.id, date: r.date, time: r.time, type: 'bath', data: r });
    });

    medicineRecords.filter(r => r.date === selectedDate).forEach(r => {
      events.push({ id: r.id, date: r.date, time: r.time, type: 'medicine', data: r });
    });
    
    return events.sort((a, b) => b.time.localeCompare(a.time));
  }, [todayMilkRecords, todayDiaperRecords, todaySleepRecords, temperatureRecords, bathRecords, medicineRecords, selectedDate]);

  // 記録追加
  const handleAddMilk = useCallback(() => {
    const newRecord: MilkRecord = {
      id: generateId(),
      date: selectedDate,
      time: getNow(),
      type: milkForm.type || 'formula',
      amount: milkForm.type === 'formula' || milkForm.type === 'pumped' ? milkForm.amount : undefined,
      duration: milkForm.type?.startsWith('breast') ? milkForm.duration : undefined,
      memo: milkForm.memo,
    };
    setMilkRecords(prev => [...prev, newRecord]);
    setModalType(null);
    setMilkForm({ type: 'formula', amount: 120, duration: 10 });
  }, [selectedDate, milkForm]);

  const handleAddDiaper = useCallback(() => {
    const newRecord: DiaperRecord = {
      id: generateId(),
      date: selectedDate,
      time: getNow(),
      type: diaperForm.type || 'wet',
      poopColor: diaperForm.type === 'dirty' || diaperForm.type === 'both' ? diaperForm.poopColor : undefined,
      poopConsistency: diaperForm.type === 'dirty' || diaperForm.type === 'both' ? diaperForm.poopConsistency : undefined,
      memo: diaperForm.memo,
    };
    setDiaperRecords(prev => [...prev, newRecord]);
    setModalType(null);
    setDiaperForm({ type: 'wet' });
  }, [selectedDate, diaperForm]);

  const handleAddSleep = useCallback(() => {
    const startTime = sleepForm.startTime || getNow();
    const endTime = sleepForm.endTime;
    let duration: number | undefined;
    
    if (startTime && endTime) {
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);
      duration = (endH * 60 + endM) - (startH * 60 + startM);
      if (duration < 0) duration += 24 * 60; // 日をまたぐ場合
    }
    
    const newRecord: SleepRecord = {
      id: generateId(),
      date: selectedDate,
      startTime,
      endTime,
      duration,
      isNap: sleepForm.isNap ?? true,
      memo: sleepForm.memo,
    };
    setSleepRecords(prev => [...prev, newRecord]);
    setModalType(null);
    setSleepForm({ isNap: true });
  }, [selectedDate, sleepForm]);

  const handleAddGrowth = useCallback(() => {
    const newRecord: GrowthRecord = {
      id: generateId(),
      date: selectedDate,
      height: growthForm.height,
      weight: growthForm.weight,
      headCircumference: growthForm.headCircumference,
      memo: growthForm.memo,
    };
    setGrowthRecords(prev => [...prev, newRecord]);
    setModalType(null);
    setGrowthForm({});
  }, [selectedDate, growthForm]);

  const handleAddTemperature = useCallback(() => {
    const newRecord: TemperatureRecord = {
      id: generateId(),
      date: selectedDate,
      time: getNow(),
      temperature: temperatureForm.temperature || 36.5,
      memo: temperatureForm.memo,
    };
    setTemperatureRecords(prev => [...prev, newRecord]);
    setModalType(null);
    setTemperatureForm({ temperature: 36.5 });
  }, [selectedDate, temperatureForm]);

  const handleAddBath = useCallback(() => {
    const newRecord: BathRecord = {
      id: generateId(),
      date: selectedDate,
      time: getNow(),
      duration: bathForm.duration,
      memo: bathForm.memo,
    };
    setBathRecords(prev => [...prev, newRecord]);
    setModalType(null);
    setBathForm({ duration: 10 });
  }, [selectedDate, bathForm]);

  const handleAddMedicine = useCallback(() => {
    if (!medicineForm.name) {
      Alert.alert('エラー', '薬の名前を入力してください');
      return;
    }
    const newRecord: MedicineRecord = {
      id: generateId(),
      date: selectedDate,
      time: getNow(),
      name: medicineForm.name,
      dose: medicineForm.dose,
      memo: medicineForm.memo,
    };
    setMedicineRecords(prev => [...prev, newRecord]);
    setModalType(null);
    setMedicineForm({});
  }, [selectedDate, medicineForm]);

  // 記録削除
  const handleDeleteRecord = useCallback((type: string, id: string) => {
    Alert.alert(
      '削除確認',
      'この記録を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            switch (type) {
              case 'milk':
                setMilkRecords(prev => prev.filter(r => r.id !== id));
                break;
              case 'diaper':
                setDiaperRecords(prev => prev.filter(r => r.id !== id));
                break;
              case 'sleep':
                setSleepRecords(prev => prev.filter(r => r.id !== id));
                break;
              case 'growth':
                setGrowthRecords(prev => prev.filter(r => r.id !== id));
                break;
              case 'temperature':
                setTemperatureRecords(prev => prev.filter(r => r.id !== id));
                break;
              case 'bath':
                setBathRecords(prev => prev.filter(r => r.id !== id));
                break;
              case 'medicine':
                setMedicineRecords(prev => prev.filter(r => r.id !== id));
                break;
            }
          },
        },
      ]
    );
  }, []);

  // 日付変更
  const handleDateChange = useCallback((direction: 'prev' | 'next') => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + (direction === 'prev' ? -1 : 1));
    if (date <= new Date()) {
      setSelectedDate(formatDate(date));
    }
  }, [selectedDate]);

  // =====================================================
  // レンダリング関数
  // =====================================================

  // ヘッダー
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.babyInfo}>
        <View style={styles.babyAvatar}>
          <Text style={styles.babyAvatarText}>
            {babyProfile.gender === 'female' ? '👧' : '👦'}
          </Text>
        </View>
        <View style={styles.babyDetails}>
          <Text style={styles.babyName}>{babyProfile.name}</Text>
          <Text style={styles.babyAge}>{babyAge.text}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.profileButton}
        onPress={() => setModalType('profile')}
      >
        <Text style={styles.profileButtonText}>⚙️</Text>
      </TouchableOpacity>
    </View>
  );

  // 日付セレクター
  const renderDateSelector = () => {
    const isToday = selectedDate === getToday();
    const displayDate = new Date(selectedDate);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    
    return (
      <View style={styles.dateSelector}>
        <TouchableOpacity
          style={styles.dateArrow}
          onPress={() => handleDateChange('prev')}
        >
          <Text style={styles.dateArrowText}>◀</Text>
        </TouchableOpacity>
        <View style={styles.dateDisplay}>
          <Text style={styles.dateText}>
            {displayDate.getMonth() + 1}月{displayDate.getDate()}日
            ({weekdays[displayDate.getDay()]})
          </Text>
          {isToday && <Text style={styles.todayBadge}>今日</Text>}
        </View>
        <TouchableOpacity
          style={[styles.dateArrow, isToday && styles.dateArrowDisabled]}
          onPress={() => handleDateChange('next')}
          disabled={isToday}
        >
          <Text style={[styles.dateArrowText, isToday && styles.dateArrowTextDisabled]}>▶</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // クイックアクションボタン
  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <TouchableOpacity
        style={[styles.quickActionButton, { backgroundColor: COLORS.milk }]}
        onPress={() => setModalType('milk')}
      >
        <Text style={styles.quickActionIcon}>🍼</Text>
        <Text style={styles.quickActionLabel}>ミルク</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.quickActionButton, { backgroundColor: COLORS.diaper }]}
        onPress={() => setModalType('diaper')}
      >
        <Text style={styles.quickActionIcon}>👶</Text>
        <Text style={styles.quickActionLabel}>おむつ</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.quickActionButton, { backgroundColor: COLORS.sleep }]}
        onPress={() => setModalType('sleep')}
      >
        <Text style={styles.quickActionIcon}>😴</Text>
        <Text style={styles.quickActionLabel}>睡眠</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.quickActionButton, { backgroundColor: COLORS.growth }]}
        onPress={() => setModalType('growth')}
      >
        <Text style={styles.quickActionIcon}>📏</Text>
        <Text style={styles.quickActionLabel}>成長</Text>
      </TouchableOpacity>
    </View>
  );

  // サブアクションボタン
  const renderSubActions = () => (
    <View style={styles.subActions}>
      <TouchableOpacity
        style={styles.subActionButton}
        onPress={() => setModalType('temperature')}
      >
        <Text style={styles.subActionIcon}>🌡️</Text>
        <Text style={styles.subActionLabel}>体温</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.subActionButton}
        onPress={() => setModalType('bath')}
      >
        <Text style={styles.subActionIcon}>🛁</Text>
        <Text style={styles.subActionLabel}>お風呂</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.subActionButton}
        onPress={() => setModalType('medicine')}
      >
        <Text style={styles.subActionIcon}>💊</Text>
        <Text style={styles.subActionLabel}>薬</Text>
      </TouchableOpacity>
    </View>
  );

  // 今日のサマリー
  const renderTodaySummary = () => (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>📊 今日のまとめ</Text>
      <View style={styles.summaryGrid}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryIcon}>🍼</Text>
          <Text style={styles.summaryValue}>
            {todayStats.totalMilk > 0 ? `${todayStats.totalMilk}ml` : '-'}
          </Text>
          <Text style={styles.summaryLabel}>ミルク</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryIcon}>🤱</Text>
          <Text style={styles.summaryValue}>
            {todayStats.totalBreastfeeding > 0 ? `${todayStats.totalBreastfeeding}分` : '-'}
          </Text>
          <Text style={styles.summaryLabel}>授乳</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryIcon}>💧</Text>
          <Text style={styles.summaryValue}>{todayStats.wetCount}回</Text>
          <Text style={styles.summaryLabel}>おしっこ</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryIcon}>💩</Text>
          <Text style={styles.summaryValue}>{todayStats.dirtyCount}回</Text>
          <Text style={styles.summaryLabel}>うんち</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryIcon}>😴</Text>
          <Text style={styles.summaryValue}>
            {todayStats.totalSleep > 0 ? formatDuration(todayStats.totalSleep) : '-'}
          </Text>
          <Text style={styles.summaryLabel}>睡眠</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryIcon}>💤</Text>
          <Text style={styles.summaryValue}>
            {todayStats.napTime > 0 ? formatDuration(todayStats.napTime) : '-'}
          </Text>
          <Text style={styles.summaryLabel}>お昼寝</Text>
        </View>
      </View>
    </View>
  );

  // タイムラインアイテム
  const renderTimelineItem = (event: TimelineEvent) => {
    let icon = '';
    let title = '';
    let subtitle = '';
    let bgColor = COLORS.primary;

    switch (event.type) {
      case 'milk': {
        const milk = event.data as MilkRecord;
        icon = getMilkTypeIcon(milk.type);
        title = getMilkTypeLabel(milk.type);
        subtitle = milk.amount ? `${milk.amount}ml` : milk.duration ? `${milk.duration}分` : '';
        bgColor = milk.type === 'formula' || milk.type === 'pumped' ? COLORS.milk : COLORS.breast;
        break;
      }
      case 'diaper': {
        const diaper = event.data as DiaperRecord;
        icon = getDiaperTypeIcon(diaper.type);
        title = getDiaperTypeLabel(diaper.type);
        subtitle = diaper.poopColor ? getPoopColorLabel(diaper.poopColor) : '';
        bgColor = diaper.type === 'dirty' || diaper.type === 'both' ? COLORS.poop : COLORS.diaper;
        break;
      }
      case 'sleep': {
        const sleep = event.data as SleepRecord;
        icon = sleep.isNap ? '💤' : '🌙';
        title = sleep.isNap ? 'お昼寝' : '就寝';
        subtitle = sleep.duration ? formatDuration(sleep.duration) : sleep.endTime ? '' : '睡眠中...';
        bgColor = COLORS.sleep;
        break;
      }
      case 'temperature': {
        const temp = event.data as TemperatureRecord;
        icon = '🌡️';
        title = '体温';
        subtitle = `${temp.temperature}℃`;
        bgColor = temp.temperature >= 37.5 ? COLORS.error : COLORS.temperature;
        break;
      }
      case 'bath': {
        const bath = event.data as BathRecord;
        icon = '🛁';
        title = 'お風呂';
        subtitle = bath.duration ? `${bath.duration}分` : '';
        bgColor = COLORS.bath;
        break;
      }
      case 'medicine': {
        const med = event.data as MedicineRecord;
        icon = '💊';
        title = med.name;
        subtitle = med.dose || '';
        bgColor = COLORS.medicine;
        break;
      }
    }

    return (
      <TouchableOpacity
        key={event.id}
        style={styles.timelineItem}
        onLongPress={() => handleDeleteRecord(event.type, event.id)}
      >
        <View style={styles.timelineTime}>
          <Text style={styles.timelineTimeText}>{event.time}</Text>
        </View>
        <View style={[styles.timelineIcon, { backgroundColor: bgColor }]}>
          <Text style={styles.timelineIconText}>{icon}</Text>
        </View>
        <View style={styles.timelineContent}>
          <Text style={styles.timelineTitle}>{title}</Text>
          {subtitle ? <Text style={styles.timelineSubtitle}>{subtitle}</Text> : null}
        </View>
      </TouchableOpacity>
    );
  };

  // タイムラインビュー
  const renderTimeline = () => (
    <View style={styles.timelineContainer}>
      <Text style={styles.sectionTitle}>📝 タイムライン</Text>
      {timelineEvents.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>📋</Text>
          <Text style={styles.emptyStateText}>まだ記録がありません</Text>
          <Text style={styles.emptyStateHint}>上のボタンから記録を追加しましょう</Text>
        </View>
      ) : (
        <View style={styles.timelineList}>
          {timelineEvents.map(renderTimelineItem)}
        </View>
      )}
    </View>
  );

  // タブナビゲーション
  const renderTabs = () => (
    <View style={styles.tabBar}>
      {[
        { key: 'timeline', label: '記録', icon: '📝' },
        { key: 'milk', label: 'ミルク', icon: '🍼' },
        { key: 'diaper', label: 'おむつ', icon: '👶' },
        { key: 'sleep', label: '睡眠', icon: '😴' },
        { key: 'growth', label: '成長', icon: '📏' },
        { key: 'stats', label: '統計', icon: '📊' },
      ].map(tab => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.tabItem,
            selectedTab === tab.key && styles.tabItemActive,
          ]}
          onPress={() => setSelectedTab(tab.key as TabType)}
        >
          <Text style={styles.tabIcon}>{tab.icon}</Text>
          <Text
            style={[
              styles.tabLabel,
              selectedTab === tab.key && styles.tabLabelActive,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // ミルク記録一覧
  const renderMilkTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>🍼 ミルク・授乳記録</Text>
      
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{todayStats.milkCount}回</Text>
          <Text style={styles.statLabel}>授乳回数</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{todayStats.totalMilk}ml</Text>
          <Text style={styles.statLabel}>ミルク量</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{todayStats.totalBreastfeeding}分</Text>
          <Text style={styles.statLabel}>母乳時間</Text>
        </View>
      </View>

      {todayMilkRecords.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>今日の記録はありません</Text>
        </View>
      ) : (
        <View style={styles.recordList}>
          {todayMilkRecords
            .sort((a, b) => b.time.localeCompare(a.time))
            .map(record => (
              <TouchableOpacity
                key={record.id}
                style={styles.recordItem}
                onLongPress={() => handleDeleteRecord('milk', record.id)}
              >
                <Text style={styles.recordIcon}>{getMilkTypeIcon(record.type)}</Text>
                <View style={styles.recordContent}>
                  <Text style={styles.recordTitle}>{getMilkTypeLabel(record.type)}</Text>
                  <Text style={styles.recordSubtitle}>
                    {record.amount ? `${record.amount}ml` : record.duration ? `${record.duration}分` : ''}
                  </Text>
                </View>
                <Text style={styles.recordTime}>{record.time}</Text>
              </TouchableOpacity>
            ))}
        </View>
      )}
    </View>
  );

  // おむつ記録一覧
  const renderDiaperTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>👶 おむつ記録</Text>
      
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{todayStats.diaperCount}回</Text>
          <Text style={styles.statLabel}>交換回数</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{todayStats.wetCount}回</Text>
          <Text style={styles.statLabel}>おしっこ</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{todayStats.dirtyCount}回</Text>
          <Text style={styles.statLabel}>うんち</Text>
        </View>
      </View>

      {todayDiaperRecords.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>今日の記録はありません</Text>
        </View>
      ) : (
        <View style={styles.recordList}>
          {todayDiaperRecords
            .sort((a, b) => b.time.localeCompare(a.time))
            .map(record => (
              <TouchableOpacity
                key={record.id}
                style={styles.recordItem}
                onLongPress={() => handleDeleteRecord('diaper', record.id)}
              >
                <Text style={styles.recordIcon}>{getDiaperTypeIcon(record.type)}</Text>
                <View style={styles.recordContent}>
                  <Text style={styles.recordTitle}>{getDiaperTypeLabel(record.type)}</Text>
                  {record.poopColor && (
                    <Text style={styles.recordSubtitle}>
                      {getPoopColorLabel(record.poopColor)}
                    </Text>
                  )}
                </View>
                <Text style={styles.recordTime}>{record.time}</Text>
              </TouchableOpacity>
            ))}
        </View>
      )}
    </View>
  );

  // 睡眠記録一覧
  const renderSleepTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>😴 睡眠記録</Text>
      
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {todayStats.totalSleep > 0 ? formatDuration(todayStats.totalSleep) : '-'}
          </Text>
          <Text style={styles.statLabel}>合計睡眠</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {todayStats.napTime > 0 ? formatDuration(todayStats.napTime) : '-'}
          </Text>
          <Text style={styles.statLabel}>お昼寝</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{todaySleepRecords.length}回</Text>
          <Text style={styles.statLabel}>睡眠回数</Text>
        </View>
      </View>

      {todaySleepRecords.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>今日の記録はありません</Text>
        </View>
      ) : (
        <View style={styles.recordList}>
          {todaySleepRecords
            .sort((a, b) => b.startTime.localeCompare(a.startTime))
            .map(record => (
              <TouchableOpacity
                key={record.id}
                style={styles.recordItem}
                onLongPress={() => handleDeleteRecord('sleep', record.id)}
              >
                <Text style={styles.recordIcon}>{record.isNap ? '💤' : '🌙'}</Text>
                <View style={styles.recordContent}>
                  <Text style={styles.recordTitle}>
                    {record.isNap ? 'お昼寝' : '就寝'}
                  </Text>
                  <Text style={styles.recordSubtitle}>
                    {record.startTime} → {record.endTime || '睡眠中'}
                    {record.duration && ` (${formatDuration(record.duration)})`}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
        </View>
      )}
    </View>
  );

  // 成長記録
  const renderGrowthTab = () => {
    const latestGrowth = growthRecords[growthRecords.length - 1];
    const weightData = growthRecords
      .filter(r => r.weight)
      .slice(-7)
      .map(r => ({
        label: new Date(r.date).getDate().toString(),
        value: r.weight!,
      }));
    const heightData = growthRecords
      .filter(r => r.height)
      .slice(-7)
      .map(r => ({
        label: new Date(r.date).getDate().toString(),
        value: r.height!,
      }));

    return (
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>📏 成長記録</Text>
        
        {latestGrowth && (
          <View style={styles.latestGrowthCard}>
            <Text style={styles.latestGrowthTitle}>最新の記録</Text>
            <Text style={styles.latestGrowthDate}>
              {new Date(latestGrowth.date).toLocaleDateString('ja-JP')}
            </Text>
            <View style={styles.growthStatsRow}>
              {latestGrowth.height && (
                <View style={styles.growthStatItem}>
                  <Text style={styles.growthStatValue}>{latestGrowth.height} cm</Text>
                  <Text style={styles.growthStatLabel}>身長</Text>
                </View>
              )}
              {latestGrowth.weight && (
                <View style={styles.growthStatItem}>
                  <Text style={styles.growthStatValue}>{latestGrowth.weight} kg</Text>
                  <Text style={styles.growthStatLabel}>体重</Text>
                </View>
              )}
              {latestGrowth.headCircumference && (
                <View style={styles.growthStatItem}>
                  <Text style={styles.growthStatValue}>{latestGrowth.headCircumference} cm</Text>
                  <Text style={styles.growthStatLabel}>頭囲</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>体重の推移</Text>
          <SimpleLineChart data={weightData} color={COLORS.primary} unit="kg" />
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>身長の推移</Text>
          <SimpleLineChart data={heightData} color={COLORS.growth} unit="cm" />
        </View>

        <View style={styles.recordList}>
          {growthRecords
            .slice()
            .reverse()
            .map(record => (
              <TouchableOpacity
                key={record.id}
                style={styles.recordItem}
                onLongPress={() => handleDeleteRecord('growth', record.id)}
              >
                <Text style={styles.recordIcon}>📊</Text>
                <View style={styles.recordContent}>
                  <Text style={styles.recordTitle}>
                    {new Date(record.date).toLocaleDateString('ja-JP')}
                  </Text>
                  <Text style={styles.recordSubtitle}>
                    {[
                      record.height && `身長 ${record.height}cm`,
                      record.weight && `体重 ${record.weight}kg`,
                      record.headCircumference && `頭囲 ${record.headCircumference}cm`,
                    ]
                      .filter(Boolean)
                      .join(' / ')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
        </View>
      </View>
    );
  };

  // 統計タブ
  const renderStatsTab = () => {
    // 過去7日間の統計
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return formatDate(date);
    });

    const milkByDay = last7Days.map(date => {
      const records = milkRecords.filter(r => r.date === date);
      const total = records
        .filter(r => r.type === 'formula' || r.type === 'pumped')
        .reduce((sum, r) => sum + (r.amount || 0), 0);
      return { label: new Date(date).getDate().toString(), value: total };
    });

    const diaperByDay = last7Days.map(date => {
      const count = diaperRecords.filter(r => r.date === date).length;
      return { label: new Date(date).getDate().toString(), value: count };
    });

    const sleepByDay = last7Days.map(date => {
      const total = sleepRecords
        .filter(r => r.date === date)
        .reduce((sum, r) => sum + (r.duration || 0), 0);
      return { label: new Date(date).getDate().toString(), value: total / 60 }; // 時間に変換
    });

    return (
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>📊 週間統計</Text>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>ミルク量 (ml)</Text>
          <SimpleLineChart data={milkByDay} color={COLORS.milk} unit="ml" />
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>おむつ交換回数</Text>
          <SimpleLineChart data={diaperByDay} color={COLORS.diaper} unit="回" />
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>睡眠時間 (時間)</Text>
          <SimpleLineChart data={sleepByDay} color={COLORS.sleep} unit="h" />
        </View>
      </View>
    );
  };

  // タブコンテンツ
  const renderTabContent = () => {
    switch (selectedTab) {
      case 'timeline':
        return (
          <>
            {renderQuickActions()}
            {renderSubActions()}
            {renderTodaySummary()}
            {renderTimeline()}
          </>
        );
      case 'milk':
        return renderMilkTab();
      case 'diaper':
        return renderDiaperTab();
      case 'sleep':
        return renderSleepTab();
      case 'growth':
        return renderGrowthTab();
      case 'stats':
        return renderStatsTab();
    }
  };

  // =====================================================
  // モーダル
  // =====================================================

  // ミルク記録モーダル
  const renderMilkModal = () => (
    <Modal
      visible={modalType === 'milk'}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setModalType(null)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>🍼 ミルク・授乳を記録</Text>

          <Text style={styles.inputLabel}>種類</Text>
          <View style={styles.typeSelector}>
            {[
              { key: 'formula', label: '🍼 ミルク' },
              { key: 'breast_left', label: '🤱 左' },
              { key: 'breast_right', label: '🤱 右' },
              { key: 'breast_both', label: '🤱 両方' },
              { key: 'pumped', label: '🥛 搾乳' },
            ].map(type => (
              <TouchableOpacity
                key={type.key}
                style={[
                  styles.typeButton,
                  milkForm.type === type.key && styles.typeButtonActive,
                ]}
                onPress={() => setMilkForm(prev => ({ ...prev, type: type.key as MilkRecord['type'] }))}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    milkForm.type === type.key && styles.typeButtonTextActive,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {(milkForm.type === 'formula' || milkForm.type === 'pumped') && (
            <>
              <Text style={styles.inputLabel}>量 (ml)</Text>
              <View style={styles.amountSelector}>
                {[60, 80, 100, 120, 140, 160, 180, 200].map(amount => (
                  <TouchableOpacity
                    key={amount}
                    style={[
                      styles.amountButton,
                      milkForm.amount === amount && styles.amountButtonActive,
                    ]}
                    onPress={() => setMilkForm(prev => ({ ...prev, amount }))}
                  >
                    <Text
                      style={[
                        styles.amountButtonText,
                        milkForm.amount === amount && styles.amountButtonTextActive,
                      ]}
                    >
                      {amount}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.input}
                placeholder="その他の量を入力"
                keyboardType="number-pad"
                value={milkForm.amount?.toString()}
                onChangeText={(text) =>
                  setMilkForm(prev => ({ ...prev, amount: parseInt(text) || 0 }))
                }
              />
            </>
          )}

          {milkForm.type?.startsWith('breast') && (
            <>
              <Text style={styles.inputLabel}>授乳時間 (分)</Text>
              <View style={styles.amountSelector}>
                {[5, 10, 15, 20, 25, 30].map(duration => (
                  <TouchableOpacity
                    key={duration}
                    style={[
                      styles.amountButton,
                      milkForm.duration === duration && styles.amountButtonActive,
                    ]}
                    onPress={() => setMilkForm(prev => ({ ...prev, duration }))}
                  >
                    <Text
                      style={[
                        styles.amountButtonText,
                        milkForm.duration === duration && styles.amountButtonTextActive,
                      ]}
                    >
                      {duration}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Text style={styles.inputLabel}>メモ（任意）</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="例：よく飲んだ"
            multiline
            value={milkForm.memo}
            onChangeText={(text) => setMilkForm(prev => ({ ...prev, memo: text }))}
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setModalType(null)}
            >
              <Text style={styles.modalCancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleAddMilk}
            >
              <Text style={styles.modalSaveButtonText}>記録する</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // おむつ記録モーダル
  const renderDiaperModal = () => (
    <Modal
      visible={modalType === 'diaper'}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setModalType(null)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>👶 おむつを記録</Text>

          <Text style={styles.inputLabel}>種類</Text>
          <View style={styles.typeSelector}>
            {[
              { key: 'wet', label: '💧 おしっこ' },
              { key: 'dirty', label: '💩 うんち' },
              { key: 'both', label: '💧💩 両方' },
              { key: 'dry', label: '✨ 空振り' },
            ].map(type => (
              <TouchableOpacity
                key={type.key}
                style={[
                  styles.typeButton,
                  diaperForm.type === type.key && styles.typeButtonActive,
                ]}
                onPress={() => setDiaperForm(prev => ({ ...prev, type: type.key as DiaperRecord['type'] }))}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    diaperForm.type === type.key && styles.typeButtonTextActive,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {(diaperForm.type === 'dirty' || diaperForm.type === 'both') && (
            <>
              <Text style={styles.inputLabel}>うんちの色</Text>
              <View style={styles.colorSelector}>
                {[
                  { key: 'yellow', label: '黄色', color: '#FFD700' },
                  { key: 'green', label: '緑', color: '#4CAF50' },
                  { key: 'brown', label: '茶色', color: '#8D6E63' },
                  { key: 'black', label: '黒', color: '#333333' },
                  { key: 'white', label: '白', color: '#E0E0E0' },
                  { key: 'red', label: '赤', color: '#F44336' },
                ].map(color => (
                  <TouchableOpacity
                    key={color.key}
                    style={[
                      styles.colorButton,
                      { backgroundColor: color.color },
                      diaperForm.poopColor === color.key && styles.colorButtonActive,
                    ]}
                    onPress={() =>
                      setDiaperForm(prev => ({ ...prev, poopColor: color.key as DiaperRecord['poopColor'] }))
                    }
                  >
                    {diaperForm.poopColor === color.key && (
                      <Text style={styles.colorButtonCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>うんちの状態</Text>
              <View style={styles.typeSelector}>
                {[
                  { key: 'liquid', label: '水っぽい' },
                  { key: 'soft', label: 'やわらかい' },
                  { key: 'normal', label: 'ふつう' },
                  { key: 'hard', label: 'かたい' },
                ].map(consistency => (
                  <TouchableOpacity
                    key={consistency.key}
                    style={[
                      styles.typeButton,
                      diaperForm.poopConsistency === consistency.key && styles.typeButtonActive,
                    ]}
                    onPress={() =>
                      setDiaperForm(prev => ({
                        ...prev,
                        poopConsistency: consistency.key as DiaperRecord['poopConsistency'],
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        diaperForm.poopConsistency === consistency.key && styles.typeButtonTextActive,
                      ]}
                    >
                      {consistency.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Text style={styles.inputLabel}>メモ（任意）</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="例：おむつかぶれ気味"
            multiline
            value={diaperForm.memo}
            onChangeText={(text) => setDiaperForm(prev => ({ ...prev, memo: text }))}
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setModalType(null)}
            >
              <Text style={styles.modalCancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleAddDiaper}
            >
              <Text style={styles.modalSaveButtonText}>記録する</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // 睡眠記録モーダル
  const renderSleepModal = () => (
    <Modal
      visible={modalType === 'sleep'}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setModalType(null)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>😴 睡眠を記録</Text>

          <Text style={styles.inputLabel}>種類</Text>
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                sleepForm.isNap && styles.typeButtonActive,
              ]}
              onPress={() => setSleepForm(prev => ({ ...prev, isNap: true }))}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  sleepForm.isNap && styles.typeButtonTextActive,
                ]}
              >
                💤 お昼寝
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                !sleepForm.isNap && styles.typeButtonActive,
              ]}
              onPress={() => setSleepForm(prev => ({ ...prev, isNap: false }))}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  !sleepForm.isNap && styles.typeButtonTextActive,
                ]}
              >
                🌙 夜の睡眠
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>開始時刻</Text>
          <TextInput
            style={styles.input}
            placeholder="例：14:00"
            value={sleepForm.startTime}
            onChangeText={(text) => setSleepForm(prev => ({ ...prev, startTime: text }))}
          />

          <Text style={styles.inputLabel}>終了時刻（睡眠中なら空欄）</Text>
          <TextInput
            style={styles.input}
            placeholder="例：15:30"
            value={sleepForm.endTime}
            onChangeText={(text) => setSleepForm(prev => ({ ...prev, endTime: text }))}
          />

          <Text style={styles.inputLabel}>メモ（任意）</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="例：ぐっすり眠った"
            multiline
            value={sleepForm.memo}
            onChangeText={(text) => setSleepForm(prev => ({ ...prev, memo: text }))}
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setModalType(null)}
            >
              <Text style={styles.modalCancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleAddSleep}
            >
              <Text style={styles.modalSaveButtonText}>記録する</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // 成長記録モーダル
  const renderGrowthModal = () => (
    <Modal
      visible={modalType === 'growth'}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setModalType(null)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>📏 成長を記録</Text>

          <Text style={styles.inputLabel}>身長 (cm)</Text>
          <TextInput
            style={styles.input}
            placeholder="例：70.5"
            keyboardType="decimal-pad"
            value={growthForm.height?.toString()}
            onChangeText={(text) =>
              setGrowthForm(prev => ({ ...prev, height: parseFloat(text) || undefined }))
            }
          />

          <Text style={styles.inputLabel}>体重 (kg)</Text>
          <TextInput
            style={styles.input}
            placeholder="例：8.2"
            keyboardType="decimal-pad"
            value={growthForm.weight?.toString()}
            onChangeText={(text) =>
              setGrowthForm(prev => ({ ...prev, weight: parseFloat(text) || undefined }))
            }
          />

          <Text style={styles.inputLabel}>頭囲 (cm)</Text>
          <TextInput
            style={styles.input}
            placeholder="例：44"
            keyboardType="decimal-pad"
            value={growthForm.headCircumference?.toString()}
            onChangeText={(text) =>
              setGrowthForm(prev => ({ ...prev, headCircumference: parseFloat(text) || undefined }))
            }
          />

          <Text style={styles.inputLabel}>メモ（任意）</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="例：健診で計測"
            multiline
            value={growthForm.memo}
            onChangeText={(text) => setGrowthForm(prev => ({ ...prev, memo: text }))}
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setModalType(null)}
            >
              <Text style={styles.modalCancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleAddGrowth}
            >
              <Text style={styles.modalSaveButtonText}>記録する</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // 体温記録モーダル
  const renderTemperatureModal = () => (
    <Modal
      visible={modalType === 'temperature'}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setModalType(null)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>🌡️ 体温を記録</Text>

          <Text style={styles.inputLabel}>体温 (℃)</Text>
          <View style={styles.temperatureSelector}>
            {[36.0, 36.5, 37.0, 37.5, 38.0, 38.5].map(temp => (
              <TouchableOpacity
                key={temp}
                style={[
                  styles.temperatureButton,
                  temperatureForm.temperature === temp && styles.temperatureButtonActive,
                  temp >= 37.5 && styles.temperatureButtonWarning,
                ]}
                onPress={() => setTemperatureForm(prev => ({ ...prev, temperature: temp }))}
              >
                <Text
                  style={[
                    styles.temperatureButtonText,
                    temperatureForm.temperature === temp && styles.temperatureButtonTextActive,
                  ]}
                >
                  {temp.toFixed(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="その他の体温を入力"
            keyboardType="decimal-pad"
            value={temperatureForm.temperature?.toString()}
            onChangeText={(text) =>
              setTemperatureForm(prev => ({ ...prev, temperature: parseFloat(text) || 36.5 }))
            }
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setModalType(null)}
            >
              <Text style={styles.modalCancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleAddTemperature}
            >
              <Text style={styles.modalSaveButtonText}>記録する</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // お風呂記録モーダル
  const renderBathModal = () => (
    <Modal
      visible={modalType === 'bath'}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setModalType(null)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>🛁 お風呂を記録</Text>

          <Text style={styles.inputLabel}>入浴時間 (分)</Text>
          <View style={styles.amountSelector}>
            {[5, 10, 15, 20, 25, 30].map(duration => (
              <TouchableOpacity
                key={duration}
                style={[
                  styles.amountButton,
                  bathForm.duration === duration && styles.amountButtonActive,
                ]}
                onPress={() => setBathForm(prev => ({ ...prev, duration }))}
              >
                <Text
                  style={[
                    styles.amountButtonText,
                    bathForm.duration === duration && styles.amountButtonTextActive,
                  ]}
                >
                  {duration}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>メモ（任意）</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="例：機嫌よく入浴"
            multiline
            value={bathForm.memo}
            onChangeText={(text) => setBathForm(prev => ({ ...prev, memo: text }))}
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setModalType(null)}
            >
              <Text style={styles.modalCancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleAddBath}
            >
              <Text style={styles.modalSaveButtonText}>記録する</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // 薬記録モーダル
  const renderMedicineModal = () => (
    <Modal
      visible={modalType === 'medicine'}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setModalType(null)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>💊 薬を記録</Text>

          <Text style={styles.inputLabel}>薬の名前</Text>
          <TextInput
            style={styles.input}
            placeholder="例：解熱剤"
            value={medicineForm.name}
            onChangeText={(text) => setMedicineForm(prev => ({ ...prev, name: text }))}
          />

          <Text style={styles.inputLabel}>用量（任意）</Text>
          <TextInput
            style={styles.input}
            placeholder="例：5ml"
            value={medicineForm.dose}
            onChangeText={(text) => setMedicineForm(prev => ({ ...prev, dose: text }))}
          />

          <Text style={styles.inputLabel}>メモ（任意）</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="例：食後に服用"
            multiline
            value={medicineForm.memo}
            onChangeText={(text) => setMedicineForm(prev => ({ ...prev, memo: text }))}
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setModalType(null)}
            >
              <Text style={styles.modalCancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleAddMedicine}
            >
              <Text style={styles.modalSaveButtonText}>記録する</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // プロフィール設定モーダル
  const renderProfileModal = () => (
    <Modal
      visible={modalType === 'profile'}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setModalType(null)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>👶 赤ちゃんの情報</Text>

          <Text style={styles.inputLabel}>名前</Text>
          <TextInput
            style={styles.input}
            placeholder="名前を入力"
            value={babyProfile.name}
            onChangeText={(text) =>
              setBabyProfile(prev => ({ ...prev, name: text }))
            }
          />

          <Text style={styles.inputLabel}>生年月日</Text>
          <TextInput
            style={styles.input}
            placeholder="例：2024-06-15"
            value={babyProfile.birthDate}
            onChangeText={(text) =>
              setBabyProfile(prev => ({ ...prev, birthDate: text }))
            }
          />

          <Text style={styles.inputLabel}>性別</Text>
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                babyProfile.gender === 'female' && styles.typeButtonActive,
              ]}
              onPress={() => setBabyProfile(prev => ({ ...prev, gender: 'female' }))}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  babyProfile.gender === 'female' && styles.typeButtonTextActive,
                ]}
              >
                👧 女の子
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                babyProfile.gender === 'male' && styles.typeButtonActive,
              ]}
              onPress={() => setBabyProfile(prev => ({ ...prev, gender: 'male' }))}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  babyProfile.gender === 'male' && styles.typeButtonTextActive,
                ]}
              >
                👦 男の子
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={() => setModalType(null)}
            >
              <Text style={styles.modalSaveButtonText}>保存</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // =====================================================
  // メインレンダリング
  // =====================================================

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderDateSelector()}
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderTabContent()}
      </ScrollView>

      {renderTabs()}

      {/* モーダル */}
      {renderMilkModal()}
      {renderDiaperModal()}
      {renderSleepModal()}
      {renderGrowthModal()}
      {renderTemperatureModal()}
      {renderBathModal()}
      {renderMedicineModal()}
      {renderProfileModal()}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // ヘッダー
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
  },
  babyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  babyAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  babyAvatarText: {
    fontSize: 28,
  },
  babyDetails: {
    marginLeft: 12,
  },
  babyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  babyAge: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
  },
  profileButton: {
    padding: 8,
  },
  profileButtonText: {
    fontSize: 24,
  },

  // 日付セレクター
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dateArrow: {
    padding: 12,
  },
  dateArrowDisabled: {
    opacity: 0.3,
  },
  dateArrowText: {
    fontSize: 16,
    color: COLORS.primary,
  },
  dateArrowTextDisabled: {
    color: COLORS.textMuted,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  todayBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    fontSize: 12,
    color: COLORS.white,
    overflow: 'hidden',
  },

  // クイックアクション
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: COLORS.white,
    marginBottom: 8,
  },
  quickActionButton: {
    width: 70,
    height: 70,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionIcon: {
    fontSize: 28,
  },
  quickActionLabel: {
    fontSize: 12,
    color: COLORS.white,
    marginTop: 4,
    fontWeight: '600',
  },

  // サブアクション
  subActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    marginBottom: 8,
  },
  subActionButton: {
    alignItems: 'center',
    padding: 8,
  },
  subActionIcon: {
    fontSize: 24,
  },
  subActionLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 4,
  },

  // サマリーカード
  summaryCard: {
    backgroundColor: COLORS.white,
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // タイムライン
  timelineContainer: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
    marginTop: 8,
  },
  timelineList: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  timelineTime: {
    width: 50,
  },
  timelineTimeText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  timelineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  timelineIconText: {
    fontSize: 20,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  timelineSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },

  // 空状態
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: COLORS.white,
    borderRadius: 16,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  emptyStateHint: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 8,
  },

  // タブバー
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: 20,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabItemActive: {
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
  },
  tabIcon: {
    fontSize: 20,
  },
  tabLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  // タブコンテンツ
  tabContent: {
    padding: 16,
  },

  // 統計行
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },

  // 記録リスト
  recordList: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  recordIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  recordContent: {
    flex: 1,
  },
  recordTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  recordSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  recordTime: {
    fontSize: 14,
    color: COLORS.textMuted,
  },

  // 成長記録
  latestGrowthCard: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  latestGrowthTitle: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  latestGrowthDate: {
    fontSize: 16,
    color: COLORS.text,
    marginTop: 4,
    marginBottom: 16,
  },
  growthStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  growthStatItem: {
    alignItems: 'center',
  },
  growthStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  growthStatLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },

  // チャート
  chartCard: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartYAxis: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 20,
    justifyContent: 'space-between',
    width: 40,
  },
  chartArea: {
    flex: 1,
    marginLeft: 45,
    marginRight: 5,
    position: 'relative',
  },
  chartXAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 45,
    marginTop: 5,
  },
  axisLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dataPoint: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dataLine: {
    position: 'absolute',
    height: 2,
    transformOrigin: 'left center',
  },
  noDataText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },

  // モーダル
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },

  // 種類セレクター
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  typeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeButtonText: {
    fontSize: 14,
    color: COLORS.text,
  },
  typeButtonTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },

  // 量セレクター
  amountSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  amountButton: {
    width: 60,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  amountButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  amountButtonText: {
    fontSize: 14,
    color: COLORS.text,
  },
  amountButtonTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },

  // 色セレクター
  colorSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorButtonActive: {
    borderColor: COLORS.text,
  },
  colorButtonCheck: {
    fontSize: 20,
    color: COLORS.white,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  // 体温セレクター
  temperatureSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  temperatureButton: {
    width: 55,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  temperatureButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  temperatureButtonWarning: {
    borderColor: COLORS.warning,
  },
  temperatureButtonText: {
    fontSize: 14,
    color: COLORS.text,
  },
  temperatureButtonTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },

  // モーダルボタン
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: '600',
  },
});

export default BabyScreen;
