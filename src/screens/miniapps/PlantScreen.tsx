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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

// ==================== TYPES ====================
type ViewMode = 'plants' | 'calendar' | 'reminders';
type CareType = 'water' | 'fertilize' | 'repot' | 'prune' | 'photo';
type PlantHealth = 'thriving' | 'healthy' | 'okay' | 'struggling' | 'critical';
type LightRequirement = 'full_sun' | 'partial_sun' | 'shade' | 'low_light';
type WaterFrequency = 'daily' | 'every_2_days' | 'weekly' | 'biweekly' | 'monthly';

interface CareLog {
  id: string;
  type: CareType;
  date: Date;
  note?: string;
  photoUri?: string;
}

interface GrowthPhoto {
  id: string;
  uri: string;
  date: Date;
  note?: string;
}

interface Reminder {
  id: string;
  plantId: string;
  type: CareType;
  frequency: WaterFrequency;
  nextDueDate: Date;
  enabled: boolean;
  lastCompleted?: Date;
}

interface Plant {
  id: string;
  name: string;
  nickname?: string;
  species?: string;
  location: string;
  photoUri?: string;
  health: PlantHealth;
  lightRequirement: LightRequirement;
  waterFrequency: WaterFrequency;
  fertilizeFrequency?: WaterFrequency;
  acquiredDate: Date;
  careLogs: CareLog[];
  growthPhotos: GrowthPhoto[];
  notes?: string;
  archived: boolean;
  createdAt: Date;
}

interface DaySchedule {
  date: Date;
  tasks: {
    plantId: string;
    plantName: string;
    plantIcon: string;
    type: CareType;
    completed: boolean;
    overdue: boolean;
  }[];
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
  water: '#2196F3',
  fertilizer: '#8BC34A',
  sunlight: '#FFD700',
  plantGreen: '#4CAF50',
  plantGreenLight: '#81C784',
  plantGreenDark: '#388E3C',
};

const PLANT_ICONS = [
  '🌱', '🌿', '🌴', '🌵', '🌸', '🌺', '🌻', '🌷',
  '🌹', '💐', '🪴', '🎋', '🎍', '🍀', '☘️', '🌲',
  '🌳', '🪻', '🪷', '🌼', '🏵️', '🥀', '🌾', '🎄',
];

const PLANT_SPECIES = [
  'モンステラ', 'ポトス', 'サンスベリア', 'パキラ', 'フィカス',
  'アロエ', 'サボテン', '多肉植物', 'ガジュマル', 'ドラセナ',
  'オリーブ', 'ユーカリ', 'シェフレラ', 'アイビー', 'カラテア',
  'ペペロミア', 'フィロデンドロン', 'アグラオネマ', 'スパティフィラム', 'その他',
];

const LOCATIONS = [
  '🪟 窓際', '🛋️ リビング', '🛏️ 寝室', '🍳 キッチン', '🚿 バスルーム',
  '🏢 オフィス', '🌳 ベランダ', '🚪 玄関', '📚 書斎', '🍽️ ダイニング',
];

const CARE_CONFIG: Record<CareType, { label: string; icon: string; color: string }> = {
  water: { label: '水やり', icon: '💧', color: COLORS.water },
  fertilize: { label: '肥料', icon: '🧪', color: COLORS.fertilizer },
  repot: { label: '植え替え', icon: '🪴', color: '#795548' },
  prune: { label: '剪定', icon: '✂️', color: '#9C27B0' },
  photo: { label: '写真', icon: '📸', color: '#FF9800' },
};

const HEALTH_CONFIG: Record<PlantHealth, { label: string; icon: string; color: string }> = {
  thriving: { label: '絶好調', icon: '🌟', color: '#4CAF50' },
  healthy: { label: '元気', icon: '😊', color: '#8BC34A' },
  okay: { label: 'まあまあ', icon: '😐', color: '#FFC107' },
  struggling: { label: '元気がない', icon: '😟', color: '#FF9800' },
  critical: { label: '危険', icon: '🆘', color: '#F44336' },
};

const LIGHT_CONFIG: Record<LightRequirement, { label: string; icon: string }> = {
  full_sun: { label: '直射日光', icon: '☀️' },
  partial_sun: { label: '明るい日陰', icon: '⛅' },
  shade: { label: '日陰', icon: '🌤️' },
  low_light: { label: '暗い場所OK', icon: '🌙' },
};

const FREQUENCY_CONFIG: Record<WaterFrequency, { label: string; days: number }> = {
  daily: { label: '毎日', days: 1 },
  every_2_days: { label: '2日ごと', days: 2 },
  weekly: { label: '週1回', days: 7 },
  biweekly: { label: '2週間ごと', days: 14 },
  monthly: { label: '月1回', days: 30 },
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ==================== UTILITY FUNCTIONS ====================
const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateDisplay = (date: Date): string => {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
};

const getRelativeDate = (date: Date): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return '今日';
  if (diffDays === 1) return '明日';
  if (diffDays === -1) return '昨日';
  if (diffDays > 0 && diffDays <= 7) return `${diffDays}日後`;
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)}日前`;
  return formatDateDisplay(date);
};

const getDaysSince = (date: Date): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
};

const getNextCareDate = (lastDate: Date, frequency: WaterFrequency): Date => {
  const next = new Date(lastDate);
  next.setDate(next.getDate() + FREQUENCY_CONFIG[frequency].days);
  return next;
};

const isOverdue = (nextDueDate: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(nextDueDate);
  due.setHours(0, 0, 0, 0);
  return due < today;
};

const isDueToday = (nextDueDate: Date): boolean => {
  const today = new Date();
  return formatDate(today) === formatDate(nextDueDate);
};

// ==================== SAMPLE DATA ====================
const createSamplePlants = (): Plant[] => {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);

  return [
    {
      id: '1',
      name: 'モンステラ',
      nickname: 'モンちゃん',
      species: 'モンステラ',
      location: '🛋️ リビング',
      health: 'thriving',
      lightRequirement: 'partial_sun',
      waterFrequency: 'weekly',
      fertilizeFrequency: 'monthly',
      acquiredDate: monthAgo,
      careLogs: [
        { id: 'c1', type: 'water', date: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000), note: '土が乾いていた' },
        { id: 'c2', type: 'water', date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000) },
        { id: 'c3', type: 'fertilize', date: twoWeeksAgo, note: '液体肥料を与えた' },
      ],
      growthPhotos: [
        { id: 'g1', uri: '', date: monthAgo, note: 'お迎えした日' },
        { id: 'g2', uri: '', date: twoWeeksAgo, note: '新しい葉が出てきた！' },
      ],
      notes: '新しい葉がどんどん出てきて元気！',
      archived: false,
      createdAt: monthAgo,
    },
    {
      id: '2',
      name: 'サンスベリア',
      nickname: 'サンちゃん',
      species: 'サンスベリア',
      location: '🪟 窓際',
      health: 'healthy',
      lightRequirement: 'partial_sun',
      waterFrequency: 'biweekly',
      acquiredDate: twoWeeksAgo,
      careLogs: [
        { id: 'c4', type: 'water', date: weekAgo },
      ],
      growthPhotos: [],
      archived: false,
      createdAt: twoWeeksAgo,
    },
    {
      id: '3',
      name: 'ポトス',
      nickname: '',
      species: 'ポトス',
      location: '🛏️ 寝室',
      health: 'okay',
      lightRequirement: 'low_light',
      waterFrequency: 'weekly',
      acquiredDate: monthAgo,
      careLogs: [
        { id: 'c5', type: 'water', date: new Date(today.getTime() - 8 * 24 * 60 * 60 * 1000) },
      ],
      growthPhotos: [],
      notes: '葉っぱが少し黄色くなってきた。水やりを見直す。',
      archived: false,
      createdAt: monthAgo,
    },
  ];
};

// ==================== MAIN COMPONENT ====================
const PlantScreen: React.FC = () => {
  const navigation = useNavigation();
  const [viewMode, setViewMode] = useState<ViewMode>('plants');
  const [plants, setPlants] = useState<Plant[]>(createSamplePlants());
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCareModal, setShowCareModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterHealth, setFilterHealth] = useState<PlantHealth | 'all'>('all');

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Calculate reminders
  const reminders = useMemo(() => {
    const today = new Date();
    const tasks: DaySchedule['tasks'] = [];

    plants.filter(p => !p.archived).forEach(plant => {
      // Water reminder
      const lastWater = plant.careLogs
        .filter(log => log.type === 'water')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      const lastWaterDate = lastWater ? new Date(lastWater.date) : plant.acquiredDate;
      const nextWaterDate = getNextCareDate(lastWaterDate, plant.waterFrequency);
      
      if (isDueToday(nextWaterDate) || isOverdue(nextWaterDate)) {
        tasks.push({
          plantId: plant.id,
          plantName: plant.nickname || plant.name,
          plantIcon: '🌿',
          type: 'water',
          completed: isDueToday(nextWaterDate) && lastWater && formatDate(new Date(lastWater.date)) === formatDate(today),
          overdue: isOverdue(nextWaterDate),
        });
      }

      // Fertilize reminder
      if (plant.fertilizeFrequency) {
        const lastFertilize = plant.careLogs
          .filter(log => log.type === 'fertilize')
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        
        const lastFertilizeDate = lastFertilize ? new Date(lastFertilize.date) : plant.acquiredDate;
        const nextFertilizeDate = getNextCareDate(lastFertilizeDate, plant.fertilizeFrequency);
        
        if (isDueToday(nextFertilizeDate) || isOverdue(nextFertilizeDate)) {
          tasks.push({
            plantId: plant.id,
            plantName: plant.nickname || plant.name,
            plantIcon: '🌿',
            type: 'fertilize',
            completed: false,
            overdue: isOverdue(nextFertilizeDate),
          });
        }
      }
    });

    return tasks;
  }, [plants]);

  // Filtered plants
  const filteredPlants = useMemo(() => {
    return plants.filter(plant => {
      if (plant.archived) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!plant.name.toLowerCase().includes(query) && 
            !plant.nickname?.toLowerCase().includes(query) &&
            !plant.species?.toLowerCase().includes(query)) {
          return false;
        }
      }
      if (filterHealth !== 'all' && plant.health !== filterHealth) {
        return false;
      }
      return true;
    });
  }, [plants, searchQuery, filterHealth]);

  // Stats
  const stats = useMemo(() => {
    const activePlants = plants.filter(p => !p.archived);
    const totalWaterings = activePlants.reduce((sum, p) => 
      sum + p.careLogs.filter(l => l.type === 'water').length, 0);
    const totalPhotos = activePlants.reduce((sum, p) => sum + p.growthPhotos.length, 0);
    const healthyCount = activePlants.filter(p => 
      p.health === 'thriving' || p.health === 'healthy').length;
    
    return {
      totalPlants: activePlants.length,
      totalWaterings,
      totalPhotos,
      healthyCount,
      healthPercentage: activePlants.length > 0 
        ? Math.round((healthyCount / activePlants.length) * 100) 
        : 0,
    };
  }, [plants]);

  // Handlers
  const handleAddPlant = useCallback((newPlant: Omit<Plant, 'id' | 'careLogs' | 'growthPhotos' | 'createdAt'>) => {
    const plant: Plant = {
      ...newPlant,
      id: generateId(),
      careLogs: [],
      growthPhotos: [],
      createdAt: new Date(),
    };
    setPlants(prev => [plant, ...prev]);
    setShowAddModal(false);
  }, []);

  const handleAddCareLog = useCallback((plantId: string, type: CareType, note?: string) => {
    const careLog: CareLog = {
      id: generateId(),
      type,
      date: new Date(),
      note,
    };
    
    setPlants(prev => prev.map(p => {
      if (p.id === plantId) {
        return {
          ...p,
          careLogs: [careLog, ...p.careLogs],
        };
      }
      return p;
    }));
  }, []);

  const handleAddGrowthPhoto = useCallback((plantId: string, note?: string) => {
    const photo: GrowthPhoto = {
      id: generateId(),
      uri: '', // In real app, would use image picker
      date: new Date(),
      note,
    };
    
    setPlants(prev => prev.map(p => {
      if (p.id === plantId) {
        return {
          ...p,
          growthPhotos: [photo, ...p.growthPhotos],
        };
      }
      return p;
    }));
  }, []);

  const handleUpdateHealth = useCallback((plantId: string, health: PlantHealth) => {
    setPlants(prev => prev.map(p => {
      if (p.id === plantId) {
        return { ...p, health };
      }
      return p;
    }));
  }, []);

  const handleArchivePlant = useCallback((plantId: string) => {
    Alert.alert(
      '植物をアーカイブ',
      'この植物をアーカイブしますか？後で復元できます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: 'アーカイブ',
          style: 'destructive',
          onPress: () => {
            setPlants(prev => prev.map(p => {
              if (p.id === plantId) {
                return { ...p, archived: true };
              }
              return p;
            }));
            setShowDetailModal(false);
          },
        },
      ]
    );
  }, []);

  const handleQuickWater = useCallback((plantId: string) => {
    handleAddCareLog(plantId, 'water');
    // Haptic feedback would go here
  }, [handleAddCareLog]);

  // ==================== RENDER FUNCTIONS ====================

  // Header Component
  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>🌱 植物記録</Text>
        <Text style={styles.headerSubtitle}>{stats.totalPlants}株の植物</Text>
      </View>
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => setShowAddModal(true)}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );

  // Quick Stats Component
  const renderQuickStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <Text style={styles.statIcon}>🌿</Text>
        <Text style={styles.statValue}>{stats.totalPlants}</Text>
        <Text style={styles.statLabel}>植物</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statIcon}>💧</Text>
        <Text style={styles.statValue}>{stats.totalWaterings}</Text>
        <Text style={styles.statLabel}>水やり</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statIcon}>📸</Text>
        <Text style={styles.statValue}>{stats.totalPhotos}</Text>
        <Text style={styles.statLabel}>写真</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statIcon}>💚</Text>
        <Text style={styles.statValue}>{stats.healthPercentage}%</Text>
        <Text style={styles.statLabel}>元気率</Text>
      </View>
    </View>
  );

  // Today's Tasks Component
  const renderTodaysTasks = () => {
    const overdueTasks = reminders.filter(r => r.overdue && !r.completed);
    const todayTasks = reminders.filter(r => !r.overdue && !r.completed);

    if (overdueTasks.length === 0 && todayTasks.length === 0) {
      return (
        <View style={styles.taskSection}>
          <Text style={styles.sectionTitle}>📋 今日のお世話</Text>
          <View style={styles.emptyTaskCard}>
            <Text style={styles.emptyTaskIcon}>✨</Text>
            <Text style={styles.emptyTaskText}>今日のお世話は完了です！</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.taskSection}>
        <Text style={styles.sectionTitle}>📋 今日のお世話</Text>
        
        {overdueTasks.length > 0 && (
          <View style={styles.overdueSection}>
            <Text style={styles.overdueLabel}>⚠️ 遅れているお世話</Text>
            {overdueTasks.map((task, index) => (
              <TouchableOpacity
                key={`overdue-${task.plantId}-${task.type}-${index}`}
                style={[styles.taskCard, styles.overdueTaskCard]}
                onPress={() => {
                  if (task.type === 'water') {
                    handleQuickWater(task.plantId);
                  } else {
                    handleAddCareLog(task.plantId, task.type);
                  }
                }}
              >
                <Text style={styles.taskIcon}>{CARE_CONFIG[task.type].icon}</Text>
                <View style={styles.taskInfo}>
                  <Text style={styles.taskPlantName}>{task.plantName}</Text>
                  <Text style={styles.taskType}>{CARE_CONFIG[task.type].label}</Text>
                </View>
                <TouchableOpacity 
                  style={[styles.taskCheckButton, styles.overdueCheckButton]}
                  onPress={() => {
                    if (task.type === 'water') {
                      handleQuickWater(task.plantId);
                    } else {
                      handleAddCareLog(task.plantId, task.type);
                    }
                  }}
                >
                  <Text style={styles.taskCheckText}>✓</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {todayTasks.map((task, index) => (
          <TouchableOpacity
            key={`today-${task.plantId}-${task.type}-${index}`}
            style={styles.taskCard}
            onPress={() => {
              if (task.type === 'water') {
                handleQuickWater(task.plantId);
              } else {
                handleAddCareLog(task.plantId, task.type);
              }
            }}
          >
            <Text style={styles.taskIcon}>{CARE_CONFIG[task.type].icon}</Text>
            <View style={styles.taskInfo}>
              <Text style={styles.taskPlantName}>{task.plantName}</Text>
              <Text style={styles.taskType}>{CARE_CONFIG[task.type].label}</Text>
            </View>
            <TouchableOpacity 
              style={styles.taskCheckButton}
              onPress={() => {
                if (task.type === 'water') {
                  handleQuickWater(task.plantId);
                } else {
                  handleAddCareLog(task.plantId, task.type);
                }
              }}
            >
              <Text style={styles.taskCheckText}>✓</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Plant Card Component
  const renderPlantCard = (plant: Plant) => {
    const lastWater = plant.careLogs
      .filter(log => log.type === 'water')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    
    const daysSinceWater = lastWater 
      ? getDaysSince(new Date(lastWater.date))
      : getDaysSince(plant.acquiredDate);

    const nextWaterDate = lastWater 
      ? getNextCareDate(new Date(lastWater.date), plant.waterFrequency)
      : getNextCareDate(plant.acquiredDate, plant.waterFrequency);

    const waterOverdue = isOverdue(nextWaterDate);
    const waterDueToday = isDueToday(nextWaterDate);

    return (
      <TouchableOpacity
        key={plant.id}
        style={styles.plantCard}
        onPress={() => {
          setSelectedPlant(plant);
          setShowDetailModal(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.plantCardHeader}>
          <View style={styles.plantPhotoContainer}>
            {plant.photoUri ? (
              <Image source={{ uri: plant.photoUri }} style={styles.plantPhoto} />
            ) : (
              <View style={styles.plantPhotoPlaceholder}>
                <Text style={styles.plantPhotoEmoji}>🌿</Text>
              </View>
            )}
            <View style={[
              styles.healthBadge, 
              { backgroundColor: HEALTH_CONFIG[plant.health].color }
            ]}>
              <Text style={styles.healthBadgeIcon}>{HEALTH_CONFIG[plant.health].icon}</Text>
            </View>
          </View>
          
          <View style={styles.plantInfo}>
            <Text style={styles.plantName}>{plant.nickname || plant.name}</Text>
            {plant.nickname && (
              <Text style={styles.plantSpecies}>{plant.name}</Text>
            )}
            <Text style={styles.plantLocation}>{plant.location}</Text>
          </View>
        </View>

        <View style={styles.plantCardFooter}>
          <View style={styles.waterStatus}>
            <Text style={[
              styles.waterStatusIcon,
              waterOverdue && styles.waterStatusOverdue,
              waterDueToday && styles.waterStatusToday,
            ]}>💧</Text>
            <Text style={[
              styles.waterStatusText,
              waterOverdue && styles.waterStatusTextOverdue,
              waterDueToday && styles.waterStatusTextToday,
            ]}>
              {waterOverdue 
                ? `${daysSinceWater}日前に水やり` 
                : waterDueToday 
                  ? '今日水やり' 
                  : `次回: ${getRelativeDate(nextWaterDate)}`}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.quickWaterButton,
              waterOverdue && styles.quickWaterButtonOverdue,
              waterDueToday && styles.quickWaterButtonToday,
            ]}
            onPress={(e) => {
              e.stopPropagation();
              handleQuickWater(plant.id);
            }}
          >
            <Text style={styles.quickWaterButtonText}>💧</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Plants Grid
  const renderPlantsGrid = () => (
    <View style={styles.plantsSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>🌿 マイ植物</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterButtonText}>フィルター</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="植物を検索..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearSearchText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Plants Grid */}
      <View style={styles.plantsGrid}>
        {filteredPlants.map(renderPlantCard)}
      </View>

      {filteredPlants.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>🌱</Text>
          <Text style={styles.emptyStateText}>
            {searchQuery ? '植物が見つかりません' : '植物を追加しましょう！'}
          </Text>
          {!searchQuery && (
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.emptyStateButtonText}>+ 植物を追加</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  // Add Plant Modal
  const renderAddPlantModal = () => {
    const [name, setName] = useState('');
    const [nickname, setNickname] = useState('');
    const [species, setSpecies] = useState('');
    const [location, setLocation] = useState(LOCATIONS[0]);
    const [health, setHealth] = useState<PlantHealth>('healthy');
    const [lightRequirement, setLightRequirement] = useState<LightRequirement>('partial_sun');
    const [waterFrequency, setWaterFrequency] = useState<WaterFrequency>('weekly');
    const [fertilizeFrequency, setFertilizeFrequency] = useState<WaterFrequency | undefined>('monthly');
    const [showSpeciesPicker, setShowSpeciesPicker] = useState(false);

    const handleSubmit = () => {
      if (!name.trim()) {
        Alert.alert('エラー', '植物の名前を入力してください');
        return;
      }
      
      handleAddPlant({
        name: name.trim(),
        nickname: nickname.trim() || undefined,
        species: species || undefined,
        location,
        health,
        lightRequirement,
        waterFrequency,
        fertilizeFrequency,
        acquiredDate: new Date(),
        archived: false,
      });

      // Reset form
      setName('');
      setNickname('');
      setSpecies('');
    };

    return (
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🌱 新しい植物を追加</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Photo Section */}
              <TouchableOpacity style={styles.photoPickerSection}>
                <View style={styles.photoPickerPlaceholder}>
                  <Text style={styles.photoPickerIcon}>📷</Text>
                  <Text style={styles.photoPickerText}>写真を追加</Text>
                </View>
              </TouchableOpacity>

              {/* Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>植物の名前 *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="例: モンステラ"
                  placeholderTextColor={COLORS.textMuted}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              {/* Nickname */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ニックネーム</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="例: モンちゃん"
                  placeholderTextColor={COLORS.textMuted}
                  value={nickname}
                  onChangeText={setNickname}
                />
              </View>

              {/* Species */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>種類</Text>
                <TouchableOpacity 
                  style={styles.pickerButton}
                  onPress={() => setShowSpeciesPicker(!showSpeciesPicker)}
                >
                  <Text style={[
                    styles.pickerButtonText,
                    !species && styles.pickerButtonPlaceholder
                  ]}>
                    {species || '種類を選択'}
                  </Text>
                  <Text style={styles.pickerArrow}>▼</Text>
                </TouchableOpacity>
                {showSpeciesPicker && (
                  <View style={styles.pickerOptions}>
                    {PLANT_SPECIES.map(s => (
                      <TouchableOpacity
                        key={s}
                        style={[
                          styles.pickerOption,
                          species === s && styles.pickerOptionSelected
                        ]}
                        onPress={() => {
                          setSpecies(s);
                          setShowSpeciesPicker(false);
                        }}
                      >
                        <Text style={[
                          styles.pickerOptionText,
                          species === s && styles.pickerOptionTextSelected
                        ]}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Location */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>置き場所</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chipGroup}>
                    {LOCATIONS.map(loc => (
                      <TouchableOpacity
                        key={loc}
                        style={[
                          styles.chip,
                          location === loc && styles.chipSelected
                        ]}
                        onPress={() => setLocation(loc)}
                      >
                        <Text style={[
                          styles.chipText,
                          location === loc && styles.chipTextSelected
                        ]}>{loc}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Light Requirement */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>日当たり</Text>
                <View style={styles.chipGroup}>
                  {(Object.keys(LIGHT_CONFIG) as LightRequirement[]).map(light => (
                    <TouchableOpacity
                      key={light}
                      style={[
                        styles.chip,
                        lightRequirement === light && styles.chipSelected
                      ]}
                      onPress={() => setLightRequirement(light)}
                    >
                      <Text style={styles.chipIcon}>{LIGHT_CONFIG[light].icon}</Text>
                      <Text style={[
                        styles.chipText,
                        lightRequirement === light && styles.chipTextSelected
                      ]}>{LIGHT_CONFIG[light].label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Water Frequency */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>💧 水やり頻度</Text>
                <View style={styles.chipGroup}>
                  {(Object.keys(FREQUENCY_CONFIG) as WaterFrequency[]).map(freq => (
                    <TouchableOpacity
                      key={freq}
                      style={[
                        styles.chip,
                        waterFrequency === freq && styles.chipSelected
                      ]}
                      onPress={() => setWaterFrequency(freq)}
                    >
                      <Text style={[
                        styles.chipText,
                        waterFrequency === freq && styles.chipTextSelected
                      ]}>{FREQUENCY_CONFIG[freq].label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Fertilize Frequency */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>🧪 肥料頻度</Text>
                <View style={styles.chipGroup}>
                  <TouchableOpacity
                    style={[
                      styles.chip,
                      !fertilizeFrequency && styles.chipSelected
                    ]}
                    onPress={() => setFertilizeFrequency(undefined)}
                  >
                    <Text style={[
                      styles.chipText,
                      !fertilizeFrequency && styles.chipTextSelected
                    ]}>なし</Text>
                  </TouchableOpacity>
                  {(Object.keys(FREQUENCY_CONFIG) as WaterFrequency[])
                    .filter(f => f !== 'daily' && f !== 'every_2_days')
                    .map(freq => (
                      <TouchableOpacity
                        key={freq}
                        style={[
                          styles.chip,
                          fertilizeFrequency === freq && styles.chipSelected
                        ]}
                        onPress={() => setFertilizeFrequency(freq)}
                      >
                        <Text style={[
                          styles.chipText,
                          fertilizeFrequency === freq && styles.chipTextSelected
                        ]}>{FREQUENCY_CONFIG[freq].label}</Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </View>

              {/* Health Status */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>現在の状態</Text>
                <View style={styles.chipGroup}>
                  {(Object.keys(HEALTH_CONFIG) as PlantHealth[]).map(h => (
                    <TouchableOpacity
                      key={h}
                      style={[
                        styles.chip,
                        { borderColor: HEALTH_CONFIG[h].color },
                        health === h && { backgroundColor: HEALTH_CONFIG[h].color }
                      ]}
                      onPress={() => setHealth(h)}
                    >
                      <Text style={styles.chipIcon}>{HEALTH_CONFIG[h].icon}</Text>
                      <Text style={[
                        styles.chipText,
                        health === h && styles.chipTextSelected
                      ]}>{HEALTH_CONFIG[h].label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.submitButton,
                  !name.trim() && styles.submitButtonDisabled
                ]}
                onPress={handleSubmit}
                disabled={!name.trim()}
              >
                <Text style={styles.submitButtonText}>追加</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Plant Detail Modal
  const renderPlantDetailModal = () => {
    if (!selectedPlant) return null;

    const plant = selectedPlant;
    const sortedCareLogs = [...plant.careLogs].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const sortedPhotos = [...plant.growthPhotos].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.detailModalContent]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                style={styles.modalBackButton}
                onPress={() => setShowDetailModal(false)}
              >
                <Text style={styles.modalBackText}>←</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{plant.nickname || plant.name}</Text>
              <TouchableOpacity 
                style={styles.modalMenuButton}
                onPress={() => {
                  Alert.alert(
                    '操作',
                    '',
                    [
                      { text: '編集', onPress: () => {} },
                      { text: 'アーカイブ', style: 'destructive', onPress: () => handleArchivePlant(plant.id) },
                      { text: 'キャンセル', style: 'cancel' },
                    ]
                  );
                }}
              >
                <Text style={styles.modalMenuText}>⋮</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Plant Hero */}
              <View style={styles.plantHero}>
                <View style={styles.plantHeroPhoto}>
                  <Text style={styles.plantHeroEmoji}>🌿</Text>
                </View>
                <View style={[
                  styles.healthBadgeLarge,
                  { backgroundColor: HEALTH_CONFIG[plant.health].color }
                ]}>
                  <Text style={styles.healthBadgeLargeIcon}>{HEALTH_CONFIG[plant.health].icon}</Text>
                  <Text style={styles.healthBadgeLargeText}>{HEALTH_CONFIG[plant.health].label}</Text>
                </View>
              </View>

              {/* Plant Info */}
              <View style={styles.plantDetailInfo}>
                <Text style={styles.plantDetailName}>{plant.name}</Text>
                {plant.nickname && (
                  <Text style={styles.plantDetailNickname}>"{plant.nickname}"</Text>
                )}
                <View style={styles.plantDetailMeta}>
                  <Text style={styles.plantDetailMetaItem}>{plant.location}</Text>
                  <Text style={styles.plantDetailMetaItem}>{LIGHT_CONFIG[plant.lightRequirement].icon} {LIGHT_CONFIG[plant.lightRequirement].label}</Text>
                </View>
              </View>

              {/* Quick Actions */}
              <View style={styles.quickActions}>
                <TouchableOpacity 
                  style={[styles.quickAction, { backgroundColor: COLORS.water }]}
                  onPress={() => handleAddCareLog(plant.id, 'water')}
                >
                  <Text style={styles.quickActionIcon}>💧</Text>
                  <Text style={styles.quickActionText}>水やり</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.quickAction, { backgroundColor: COLORS.fertilizer }]}
                  onPress={() => handleAddCareLog(plant.id, 'fertilize')}
                >
                  <Text style={styles.quickActionIcon}>🧪</Text>
                  <Text style={styles.quickActionText}>肥料</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.quickAction, { backgroundColor: '#FF9800' }]}
                  onPress={() => handleAddGrowthPhoto(plant.id)}
                >
                  <Text style={styles.quickActionIcon}>📸</Text>
                  <Text style={styles.quickActionText}>写真</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.quickAction, { backgroundColor: '#9C27B0' }]}
                  onPress={() => {}}
                >
                  <Text style={styles.quickActionIcon}>📝</Text>
                  <Text style={styles.quickActionText}>メモ</Text>
                </TouchableOpacity>
              </View>

              {/* Care Schedule */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>📅 お世話スケジュール</Text>
                <View style={styles.scheduleCard}>
                  <View style={styles.scheduleItem}>
                    <Text style={styles.scheduleIcon}>💧</Text>
                    <View style={styles.scheduleInfo}>
                      <Text style={styles.scheduleLabel}>水やり</Text>
                      <Text style={styles.scheduleFrequency}>{FREQUENCY_CONFIG[plant.waterFrequency].label}</Text>
                    </View>
                  </View>
                  {plant.fertilizeFrequency && (
                    <View style={styles.scheduleItem}>
                      <Text style={styles.scheduleIcon}>🧪</Text>
                      <View style={styles.scheduleInfo}>
                        <Text style={styles.scheduleLabel}>肥料</Text>
                        <Text style={styles.scheduleFrequency}>{FREQUENCY_CONFIG[plant.fertilizeFrequency].label}</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {/* Growth Photos */}
              <View style={styles.detailSection}>
                <View style={styles.detailSectionHeader}>
                  <Text style={styles.detailSectionTitle}>📸 成長記録</Text>
                  <TouchableOpacity onPress={() => handleAddGrowthPhoto(plant.id)}>
                    <Text style={styles.detailSectionAction}>+ 追加</Text>
                  </TouchableOpacity>
                </View>
                {sortedPhotos.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.photosRow}>
                      {sortedPhotos.map(photo => (
                        <View key={photo.id} style={styles.growthPhotoCard}>
                          <View style={styles.growthPhotoPlaceholder}>
                            <Text style={styles.growthPhotoEmoji}>📷</Text>
                          </View>
                          <Text style={styles.growthPhotoDate}>{formatDateDisplay(new Date(photo.date))}</Text>
                          {photo.note && (
                            <Text style={styles.growthPhotoNote} numberOfLines={1}>{photo.note}</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                ) : (
                  <View style={styles.emptyPhotoState}>
                    <Text style={styles.emptyPhotoIcon}>📷</Text>
                    <Text style={styles.emptyPhotoText}>成長記録を追加しましょう</Text>
                  </View>
                )}
              </View>

              {/* Care History */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>📋 お世話履歴</Text>
                {sortedCareLogs.length > 0 ? (
                  <View style={styles.careHistoryList}>
                    {sortedCareLogs.slice(0, 10).map(log => (
                      <View key={log.id} style={styles.careHistoryItem}>
                        <View style={[
                          styles.careHistoryIcon,
                          { backgroundColor: CARE_CONFIG[log.type].color + '20' }
                        ]}>
                          <Text>{CARE_CONFIG[log.type].icon}</Text>
                        </View>
                        <View style={styles.careHistoryInfo}>
                          <Text style={styles.careHistoryType}>{CARE_CONFIG[log.type].label}</Text>
                          {log.note && (
                            <Text style={styles.careHistoryNote}>{log.note}</Text>
                          )}
                        </View>
                        <Text style={styles.careHistoryDate}>{getRelativeDate(new Date(log.date))}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyCareState}>
                    <Text style={styles.emptyCareText}>まだお世話記録がありません</Text>
                  </View>
                )}
              </View>

              {/* Notes */}
              {plant.notes && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>📝 メモ</Text>
                  <View style={styles.notesCard}>
                    <Text style={styles.notesText}>{plant.notes}</Text>
                  </View>
                </View>
              )}

              {/* Update Health */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>💚 健康状態を更新</Text>
                <View style={styles.healthUpdateRow}>
                  {(Object.keys(HEALTH_CONFIG) as PlantHealth[]).map(h => (
                    <TouchableOpacity
                      key={h}
                      style={[
                        styles.healthUpdateButton,
                        { borderColor: HEALTH_CONFIG[h].color },
                        plant.health === h && { backgroundColor: HEALTH_CONFIG[h].color }
                      ]}
                      onPress={() => {
                        handleUpdateHealth(plant.id, h);
                        setSelectedPlant(prev => prev ? { ...prev, health: h } : null);
                      }}
                    >
                      <Text style={styles.healthUpdateIcon}>{HEALTH_CONFIG[h].icon}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // Tab Bar
  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, viewMode === 'plants' && styles.tabActive]}
        onPress={() => setViewMode('plants')}
      >
        <Text style={[styles.tabIcon, viewMode === 'plants' && styles.tabIconActive]}>🌿</Text>
        <Text style={[styles.tabText, viewMode === 'plants' && styles.tabTextActive]}>植物</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, viewMode === 'calendar' && styles.tabActive]}
        onPress={() => setViewMode('calendar')}
      >
        <Text style={[styles.tabIcon, viewMode === 'calendar' && styles.tabIconActive]}>📅</Text>
        <Text style={[styles.tabText, viewMode === 'calendar' && styles.tabTextActive]}>カレンダー</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, viewMode === 'reminders' && styles.tabActive]}
        onPress={() => setViewMode('reminders')}
      >
        <Text style={[styles.tabIcon, viewMode === 'reminders' && styles.tabIconActive]}>🔔</Text>
        <Text style={[styles.tabText, viewMode === 'reminders' && styles.tabTextActive]}>リマインダー</Text>
        {reminders.filter(r => r.overdue || !r.completed).length > 0 && (
          <View style={styles.tabBadge}>
            <Text style={styles.tabBadgeText}>
              {reminders.filter(r => r.overdue || !r.completed).length}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  // Calendar View
  const renderCalendarView = () => {
    const today = new Date();
    const [selectedMonth, setSelectedMonth] = useState(today);
    
    const daysInMonth = new Date(
      selectedMonth.getFullYear(),
      selectedMonth.getMonth() + 1,
      0
    ).getDate();
    
    const firstDayOfMonth = new Date(
      selectedMonth.getFullYear(),
      selectedMonth.getMonth(),
      1
    ).getDay();

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => null);

    const getCareForDate = (day: number) => {
      const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day);
      const dateStr = formatDate(date);
      
      const waterLogs = plants.flatMap(p => 
        p.careLogs.filter(l => l.type === 'water' && formatDate(new Date(l.date)) === dateStr)
      );
      const fertilizeLogs = plants.flatMap(p => 
        p.careLogs.filter(l => l.type === 'fertilize' && formatDate(new Date(l.date)) === dateStr)
      );
      
      return { water: waterLogs.length, fertilize: fertilizeLogs.length };
    };

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity 
            onPress={() => {
              const prev = new Date(selectedMonth);
              prev.setMonth(prev.getMonth() - 1);
              setSelectedMonth(prev);
            }}
          >
            <Text style={styles.calendarNavButton}>◀</Text>
          </TouchableOpacity>
          <Text style={styles.calendarTitle}>
            {selectedMonth.getFullYear()}年{selectedMonth.getMonth() + 1}月
          </Text>
          <TouchableOpacity 
            onPress={() => {
              const next = new Date(selectedMonth);
              next.setMonth(next.getMonth() + 1);
              setSelectedMonth(next);
            }}
          >
            <Text style={styles.calendarNavButton}>▶</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.calendarWeekDays}>
          {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
            <Text key={day} style={[
              styles.calendarWeekDay,
              i === 0 && styles.calendarWeekDaySunday,
              i === 6 && styles.calendarWeekDaySaturday,
            ]}>{day}</Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {emptyDays.map((_, i) => (
            <View key={`empty-${i}`} style={styles.calendarDay} />
          ))}
          {days.map(day => {
            const care = getCareForDate(day);
            const isToday = formatDate(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day)) === formatDate(today);
            
            return (
              <View 
                key={day} 
                style={[
                  styles.calendarDay,
                  isToday && styles.calendarDayToday
                ]}
              >
                <Text style={[
                  styles.calendarDayText,
                  isToday && styles.calendarDayTextToday
                ]}>{day}</Text>
                <View style={styles.calendarDayIcons}>
                  {care.water > 0 && <Text style={styles.calendarDayIcon}>💧</Text>}
                  {care.fertilize > 0 && <Text style={styles.calendarDayIcon}>🧪</Text>}
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.calendarLegend}>
          <View style={styles.calendarLegendItem}>
            <Text style={styles.calendarLegendIcon}>💧</Text>
            <Text style={styles.calendarLegendText}>水やり</Text>
          </View>
          <View style={styles.calendarLegendItem}>
            <Text style={styles.calendarLegendIcon}>🧪</Text>
            <Text style={styles.calendarLegendText}>肥料</Text>
          </View>
        </View>
      </View>
    );
  };

  // Reminders View
  const renderRemindersView = () => {
    const overdueTasks = reminders.filter(r => r.overdue);
    const todayTasks = reminders.filter(r => !r.overdue && !r.completed);

    return (
      <View style={styles.remindersContainer}>
        <Text style={styles.remindersTitle}>🔔 お世話リマインダー</Text>

        {overdueTasks.length > 0 && (
          <View style={styles.reminderSection}>
            <Text style={styles.reminderSectionTitle}>⚠️ 遅れているお世話 ({overdueTasks.length})</Text>
            {overdueTasks.map((task, index) => (
              <View key={`overdue-${index}`} style={[styles.reminderCard, styles.reminderCardOverdue]}>
                <View style={styles.reminderCardLeft}>
                  <Text style={styles.reminderIcon}>{CARE_CONFIG[task.type].icon}</Text>
                  <View>
                    <Text style={styles.reminderPlantName}>{task.plantName}</Text>
                    <Text style={styles.reminderType}>{CARE_CONFIG[task.type].label}</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.reminderDoneButton}
                  onPress={() => handleAddCareLog(task.plantId, task.type)}
                >
                  <Text style={styles.reminderDoneText}>完了</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {todayTasks.length > 0 && (
          <View style={styles.reminderSection}>
            <Text style={styles.reminderSectionTitle}>📋 今日のお世話 ({todayTasks.length})</Text>
            {todayTasks.map((task, index) => (
              <View key={`today-${index}`} style={styles.reminderCard}>
                <View style={styles.reminderCardLeft}>
                  <Text style={styles.reminderIcon}>{CARE_CONFIG[task.type].icon}</Text>
                  <View>
                    <Text style={styles.reminderPlantName}>{task.plantName}</Text>
                    <Text style={styles.reminderType}>{CARE_CONFIG[task.type].label}</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.reminderDoneButton}
                  onPress={() => handleAddCareLog(task.plantId, task.type)}
                >
                  <Text style={styles.reminderDoneText}>完了</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {overdueTasks.length === 0 && todayTasks.length === 0 && (
          <View style={styles.emptyReminders}>
            <Text style={styles.emptyRemindersIcon}>🎉</Text>
            <Text style={styles.emptyRemindersText}>すべてのお世話が完了しています！</Text>
          </View>
        )}

        {/* Upcoming Section */}
        <View style={styles.reminderSection}>
          <Text style={styles.reminderSectionTitle}>📆 今後の予定</Text>
          {plants.filter(p => !p.archived).slice(0, 5).map(plant => {
            const lastWater = plant.careLogs
              .filter(log => log.type === 'water')
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            
            const nextWaterDate = lastWater 
              ? getNextCareDate(new Date(lastWater.date), plant.waterFrequency)
              : getNextCareDate(plant.acquiredDate, plant.waterFrequency);

            if (isDueToday(nextWaterDate) || isOverdue(nextWaterDate)) return null;

            return (
              <View key={plant.id} style={styles.upcomingCard}>
                <Text style={styles.upcomingIcon}>🌿</Text>
                <View style={styles.upcomingInfo}>
                  <Text style={styles.upcomingPlantName}>{plant.nickname || plant.name}</Text>
                  <Text style={styles.upcomingType}>💧 水やり</Text>
                </View>
                <Text style={styles.upcomingDate}>{getRelativeDate(nextWaterDate)}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // Main Render
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {viewMode === 'plants' && (
          <>
            {renderQuickStats()}
            {renderTodaysTasks()}
            {renderPlantsGrid()}
          </>
        )}
        
        {viewMode === 'calendar' && renderCalendarView()}
        {viewMode === 'reminders' && renderRemindersView()}
      </ScrollView>

      {renderTabBar()}
      {renderAddPlantModal()}
      {renderPlantDetailModal()}
    </SafeAreaView>
  );
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },

  // Header
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
    fontSize: 20,
    color: COLORS.text,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
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
    fontWeight: '300',
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Tasks
  taskSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  emptyTaskCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyTaskIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTaskText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  overdueSection: {
    marginBottom: 12,
  },
  overdueLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.danger,
    marginBottom: 8,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  overdueTaskCard: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.danger,
  },
  taskIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  taskInfo: {
    flex: 1,
  },
  taskPlantName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  taskType: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  taskCheckButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.plantGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overdueCheckButton: {
    backgroundColor: COLORS.danger,
  },
  taskCheckText: {
    fontSize: 18,
    color: COLORS.white,
    fontWeight: '600',
  },

  // Plants Section
  plantsSection: {
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: COLORS.text,
  },
  clearSearchText: {
    fontSize: 16,
    color: COLORS.textMuted,
    padding: 4,
  },
  plantsGrid: {
    gap: 12,
  },
  plantCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  plantCardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  plantPhotoContainer: {
    position: 'relative',
  },
  plantPhoto: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  plantPhotoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: COLORS.plantGreenLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plantPhotoEmoji: {
    fontSize: 32,
  },
  healthBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  healthBadgeIcon: {
    fontSize: 12,
  },
  plantInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  plantName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  plantSpecies: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  plantLocation: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  plantCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  waterStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  waterStatusIcon: {
    fontSize: 16,
    marginRight: 6,
    opacity: 0.5,
  },
  waterStatusOverdue: {
    opacity: 1,
  },
  waterStatusToday: {
    opacity: 1,
  },
  waterStatusText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  waterStatusTextOverdue: {
    color: COLORS.danger,
    fontWeight: '600',
  },
  waterStatusTextToday: {
    color: COLORS.water,
    fontWeight: '600',
  },
  quickWaterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.water + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickWaterButtonOverdue: {
    backgroundColor: COLORS.danger + '20',
  },
  quickWaterButtonToday: {
    backgroundColor: COLORS.water,
  },
  quickWaterButtonText: {
    fontSize: 18,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  emptyStateButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },

  // Tab Bar
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabActive: {},
  tabIcon: {
    fontSize: 20,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  tabBadge: {
    position: 'absolute',
    top: 4,
    right: '30%',
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    fontSize: 10,
    color: COLORS.white,
    fontWeight: '700',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  detailModalContent: {
    height: '95%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  modalBackButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackText: {
    fontSize: 18,
    color: COLORS.text,
  },
  modalMenuButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalMenuText: {
    fontSize: 20,
    color: COLORS.text,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  // Add Modal Form
  photoPickerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  photoPickerPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
  },
  photoPickerIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  photoPickerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickerButtonText: {
    fontSize: 14,
    color: COLORS.text,
  },
  pickerButtonPlaceholder: {
    color: COLORS.textMuted,
  },
  pickerArrow: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  pickerOptions: {
    marginTop: 8,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerOptionSelected: {
    backgroundColor: COLORS.primary + '20',
  },
  pickerOptionText: {
    fontSize: 14,
    color: COLORS.text,
  },
  pickerOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  chipText: {
    fontSize: 13,
    color: COLORS.text,
  },
  chipTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  submitButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },

  // Plant Detail Modal
  plantHero: {
    alignItems: 'center',
    marginBottom: 20,
  },
  plantHeroPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.plantGreenLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  plantHeroEmoji: {
    fontSize: 56,
  },
  healthBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  healthBadgeLargeIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  healthBadgeLargeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  plantDetailInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  plantDetailName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  plantDetailNickname: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  plantDetailMeta: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  plantDetailMetaItem: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  quickAction: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: 70,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  quickActionText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  detailSectionAction: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  scheduleCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  scheduleIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  scheduleInfo: {},
  scheduleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  scheduleFrequency: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  photosRow: {
    flexDirection: 'row',
    gap: 12,
  },
  growthPhotoCard: {
    width: 100,
  },
  growthPhotoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  growthPhotoEmoji: {
    fontSize: 32,
    opacity: 0.5,
  },
  growthPhotoDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  growthPhotoNote: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  emptyPhotoState: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: COLORS.background,
    borderRadius: 12,
  },
  emptyPhotoIcon: {
    fontSize: 32,
    opacity: 0.5,
    marginBottom: 8,
  },
  emptyPhotoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  careHistoryList: {},
  careHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  careHistoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  careHistoryInfo: {
    flex: 1,
  },
  careHistoryType: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  careHistoryNote: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  careHistoryDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  emptyCareState: {
    paddingVertical: 24,
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
  },
  emptyCareText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  notesCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
  },
  notesText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
  },
  healthUpdateRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  healthUpdateButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  healthUpdateIcon: {
    fontSize: 20,
  },

  // Calendar
  calendarContainer: {
    padding: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  calendarNavButton: {
    fontSize: 18,
    color: COLORS.primary,
    padding: 8,
  },
  calendarTitle: {
    fontSize: 18,
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
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  calendarWeekDaySunday: {
    color: COLORS.danger,
  },
  calendarWeekDaySaturday: {
    color: COLORS.water,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  calendarDayToday: {
    backgroundColor: COLORS.primary + '20',
    borderRadius: 8,
  },
  calendarDayText: {
    fontSize: 14,
    color: COLORS.text,
  },
  calendarDayTextToday: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  calendarDayIcons: {
    flexDirection: 'row',
    marginTop: 2,
    gap: 2,
  },
  calendarDayIcon: {
    fontSize: 8,
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  calendarLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarLegendIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  calendarLegendText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  // Reminders
  remindersContainer: {
    padding: 16,
  },
  remindersTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 20,
  },
  reminderSection: {
    marginBottom: 24,
  },
  reminderSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  reminderCardOverdue: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.danger,
  },
  reminderCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  reminderPlantName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  reminderType: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  reminderDoneButton: {
    backgroundColor: COLORS.plantGreen,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  reminderDoneText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  emptyReminders: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyRemindersIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyRemindersText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  upcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  upcomingIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingPlantName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  upcomingType: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  upcomingDate: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default PlantScreen;
