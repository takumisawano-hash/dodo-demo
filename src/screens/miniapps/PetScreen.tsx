import React, { useState, useCallback, useMemo, useRef } from 'react';
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
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

// ==================== TYPES ====================
type ViewMode = 'pets' | 'meals' | 'walks' | 'health' | 'photos';
type PetType = 'dog' | 'cat' | 'bird' | 'fish' | 'hamster' | 'rabbit' | 'other';
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
type HealthRecordType = 'weight' | 'vet_visit' | 'vaccination' | 'medication' | 'grooming';

interface Pet {
  id: string;
  name: string;
  type: PetType;
  breed?: string;
  birthday: string; // YYYY-MM-DD
  icon: string;
  color: string;
  photoUrl?: string;
  notes?: string;
  createdAt: Date;
}

interface MealRecord {
  id: string;
  petId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  type: MealType;
  food: string;
  amount?: string;
  notes?: string;
}

interface WalkRecord {
  id: string;
  petId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  duration: number; // minutes
  distance?: number; // km
  notes?: string;
  mood?: '😊' | '😐' | '😫';
}

interface HealthRecord {
  id: string;
  petId: string;
  date: string; // YYYY-MM-DD
  type: HealthRecordType;
  value?: string; // weight in kg, etc.
  clinic?: string;
  doctor?: string;
  diagnosis?: string;
  treatment?: string;
  cost?: number;
  nextVisit?: string;
  notes?: string;
}

interface PhotoRecord {
  id: string;
  petId: string;
  date: string;
  uri: string;
  caption?: string;
  isFavorite: boolean;
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
  info: '#2196F3',
  cardShadow: 'rgba(0, 0, 0, 0.1)',
};

const PET_TYPES: Record<PetType, { label: string; icon: string }> = {
  dog: { label: '犬', icon: '🐕' },
  cat: { label: '猫', icon: '🐈' },
  bird: { label: '鳥', icon: '🐦' },
  fish: { label: '魚', icon: '🐠' },
  hamster: { label: 'ハムスター', icon: '🐹' },
  rabbit: { label: 'うさぎ', icon: '🐰' },
  other: { label: 'その他', icon: '🐾' },
};

const PET_COLORS = [
  '#FF6B35', '#4CAF50', '#2196F3', '#9C27B0', '#F44336',
  '#00BCD4', '#FF9800', '#795548', '#607D8B', '#E91E63',
];

const MEAL_TYPES: Record<MealType, { label: string; icon: string }> = {
  breakfast: { label: '朝ごはん', icon: '🌅' },
  lunch: { label: '昼ごはん', icon: '☀️' },
  dinner: { label: '夜ごはん', icon: '🌙' },
  snack: { label: 'おやつ', icon: '🍖' },
};

const HEALTH_RECORD_TYPES: Record<HealthRecordType, { label: string; icon: string }> = {
  weight: { label: '体重測定', icon: '⚖️' },
  vet_visit: { label: '通院', icon: '🏥' },
  vaccination: { label: 'ワクチン', icon: '💉' },
  medication: { label: '投薬', icon: '💊' },
  grooming: { label: 'トリミング', icon: '✂️' },
};

const VIEW_TABS: { key: ViewMode; label: string; icon: string }[] = [
  { key: 'pets', label: 'ペット', icon: '🐾' },
  { key: 'meals', label: '食事', icon: '🍽️' },
  { key: 'walks', label: '散歩', icon: '🚶' },
  { key: 'health', label: '健康', icon: '❤️' },
  { key: 'photos', label: '写真', icon: '📷' },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ==================== UTILITY FUNCTIONS ====================
const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTime = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const parseDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const getDateLabel = (dateStr: string): string => {
  const date = parseDate(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (dateStr === formatDate(today)) return '今日';
  if (dateStr === formatDate(yesterday)) return '昨日';
  
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
};

const calculateAge = (birthday: string): string => {
  const birth = parseDate(birthday);
  const today = new Date();
  
  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  if (today.getDate() < birth.getDate()) {
    months--;
    if (months < 0) {
      years--;
      months += 12;
    }
  }
  
  if (years > 0) {
    return months > 0 ? `${years}歳${months}ヶ月` : `${years}歳`;
  }
  return `${months}ヶ月`;
};

// ==================== SAMPLE DATA ====================
const SAMPLE_PETS: Pet[] = [
  {
    id: '1',
    name: 'ポチ',
    type: 'dog',
    breed: '柴犬',
    birthday: '2020-05-15',
    icon: '🐕',
    color: '#FF6B35',
    notes: '元気いっぱいの柴犬',
    createdAt: new Date('2023-01-01'),
  },
  {
    id: '2',
    name: 'ミケ',
    type: 'cat',
    breed: '三毛猫',
    birthday: '2021-08-20',
    icon: '🐈',
    color: '#9C27B0',
    notes: 'のんびり屋さん',
    createdAt: new Date('2023-02-01'),
  },
];

const SAMPLE_MEALS: MealRecord[] = [
  {
    id: '1',
    petId: '1',
    date: formatDate(new Date()),
    time: '08:00',
    type: 'breakfast',
    food: 'ドッグフード',
    amount: '100g',
  },
  {
    id: '2',
    petId: '1',
    date: formatDate(new Date()),
    time: '12:00',
    type: 'lunch',
    food: 'ドッグフード',
    amount: '80g',
  },
];

const SAMPLE_WALKS: WalkRecord[] = [
  {
    id: '1',
    petId: '1',
    date: formatDate(new Date()),
    startTime: '07:30',
    duration: 30,
    distance: 2.5,
    mood: '😊',
    notes: '公園で他の犬と遊んだ',
  },
];

const SAMPLE_HEALTH: HealthRecord[] = [
  {
    id: '1',
    petId: '1',
    date: '2024-01-15',
    type: 'weight',
    value: '8.5',
    notes: '少し増えた',
  },
  {
    id: '2',
    petId: '1',
    date: '2024-01-10',
    type: 'vet_visit',
    clinic: 'どうぶつ病院',
    doctor: '田中先生',
    diagnosis: '定期健診',
    cost: 5000,
    nextVisit: '2024-04-10',
  },
];

const SAMPLE_PHOTOS: PhotoRecord[] = [
  {
    id: '1',
    petId: '1',
    date: formatDate(new Date()),
    uri: 'https://placekitten.com/300/300',
    caption: '朝の散歩',
    isFavorite: true,
  },
  {
    id: '2',
    petId: '1',
    date: formatDate(new Date()),
    uri: 'https://placekitten.com/301/301',
    caption: 'お昼寝中',
    isFavorite: false,
  },
];

// ==================== MAIN COMPONENT ====================
const PetScreen: React.FC = () => {
  const navigation = useNavigation();
  
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('pets');
  const [pets, setPets] = useState<Pet[]>(SAMPLE_PETS);
  const [meals, setMeals] = useState<MealRecord[]>(SAMPLE_MEALS);
  const [walks, setWalks] = useState<WalkRecord[]>(SAMPLE_WALKS);
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>(SAMPLE_HEALTH);
  const [photos, setPhotos] = useState<PhotoRecord[]>(SAMPLE_PHOTOS);
  
  const [selectedPetId, setSelectedPetId] = useState<string | null>(pets[0]?.id || null);
  const [showPetModal, setShowPetModal] = useState(false);
  const [showMealModal, setShowMealModal] = useState(false);
  const [showWalkModal, setShowWalkModal] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [editingMeal, setEditingMeal] = useState<MealRecord | null>(null);
  const [editingWalk, setEditingWalk] = useState<WalkRecord | null>(null);
  const [editingHealth, setEditingHealth] = useState<HealthRecord | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoRecord | null>(null);
  
  // Animation
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const selectedPet = useMemo(() => 
    pets.find(p => p.id === selectedPetId),
    [pets, selectedPetId]
  );

  // Filter records by selected pet
  const filteredMeals = useMemo(() => 
    meals.filter(m => m.petId === selectedPetId).sort((a, b) => 
      `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`)
    ),
    [meals, selectedPetId]
  );

  const filteredWalks = useMemo(() => 
    walks.filter(w => w.petId === selectedPetId).sort((a, b) => 
      `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`)
    ),
    [walks, selectedPetId]
  );

  const filteredHealth = useMemo(() => 
    healthRecords.filter(h => h.petId === selectedPetId).sort((a, b) => 
      b.date.localeCompare(a.date)
    ),
    [healthRecords, selectedPetId]
  );

  const filteredPhotos = useMemo(() => 
    photos.filter(p => p.petId === selectedPetId).sort((a, b) => 
      b.date.localeCompare(a.date)
    ),
    [photos, selectedPetId]
  );

  // Handlers
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0.5, duration: 100, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    setViewMode(mode);
  }, [fadeAnim]);

  // Pet CRUD
  const handleSavePet = useCallback((petData: Partial<Pet>) => {
    if (editingPet) {
      setPets(prev => prev.map(p => 
        p.id === editingPet.id ? { ...p, ...petData } : p
      ));
    } else {
      const newPet: Pet = {
        id: generateId(),
        name: petData.name || '',
        type: petData.type || 'dog',
        breed: petData.breed,
        birthday: petData.birthday || formatDate(new Date()),
        icon: PET_TYPES[petData.type || 'dog'].icon,
        color: petData.color || COLORS.primary,
        notes: petData.notes,
        createdAt: new Date(),
      };
      setPets(prev => [...prev, newPet]);
      setSelectedPetId(newPet.id);
    }
    setShowPetModal(false);
    setEditingPet(null);
  }, [editingPet]);

  const handleDeletePet = useCallback((petId: string) => {
    Alert.alert(
      '削除確認',
      'このペットを削除しますか？関連するすべての記録も削除されます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            setPets(prev => prev.filter(p => p.id !== petId));
            setMeals(prev => prev.filter(m => m.petId !== petId));
            setWalks(prev => prev.filter(w => w.petId !== petId));
            setHealthRecords(prev => prev.filter(h => h.petId !== petId));
            setPhotos(prev => prev.filter(p => p.petId !== petId));
            if (selectedPetId === petId) {
              setSelectedPetId(pets.find(p => p.id !== petId)?.id || null);
            }
          },
        },
      ]
    );
  }, [pets, selectedPetId]);

  // Meal CRUD
  const handleSaveMeal = useCallback((mealData: Partial<MealRecord>) => {
    if (editingMeal) {
      setMeals(prev => prev.map(m => 
        m.id === editingMeal.id ? { ...m, ...mealData } : m
      ));
    } else {
      const newMeal: MealRecord = {
        id: generateId(),
        petId: selectedPetId!,
        date: mealData.date || formatDate(new Date()),
        time: mealData.time || formatTime(new Date()),
        type: mealData.type || 'breakfast',
        food: mealData.food || '',
        amount: mealData.amount,
        notes: mealData.notes,
      };
      setMeals(prev => [...prev, newMeal]);
    }
    setShowMealModal(false);
    setEditingMeal(null);
  }, [editingMeal, selectedPetId]);

  const handleDeleteMeal = useCallback((mealId: string) => {
    Alert.alert('削除確認', 'この食事記録を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => setMeals(prev => prev.filter(m => m.id !== mealId)),
      },
    ]);
  }, []);

  // Walk CRUD
  const handleSaveWalk = useCallback((walkData: Partial<WalkRecord>) => {
    if (editingWalk) {
      setWalks(prev => prev.map(w => 
        w.id === editingWalk.id ? { ...w, ...walkData } : w
      ));
    } else {
      const newWalk: WalkRecord = {
        id: generateId(),
        petId: selectedPetId!,
        date: walkData.date || formatDate(new Date()),
        startTime: walkData.startTime || formatTime(new Date()),
        duration: walkData.duration || 30,
        distance: walkData.distance,
        mood: walkData.mood,
        notes: walkData.notes,
      };
      setWalks(prev => [...prev, newWalk]);
    }
    setShowWalkModal(false);
    setEditingWalk(null);
  }, [editingWalk, selectedPetId]);

  const handleDeleteWalk = useCallback((walkId: string) => {
    Alert.alert('削除確認', 'この散歩記録を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => setWalks(prev => prev.filter(w => w.id !== walkId)),
      },
    ]);
  }, []);

  // Health CRUD
  const handleSaveHealth = useCallback((healthData: Partial<HealthRecord>) => {
    if (editingHealth) {
      setHealthRecords(prev => prev.map(h => 
        h.id === editingHealth.id ? { ...h, ...healthData } : h
      ));
    } else {
      const newHealth: HealthRecord = {
        id: generateId(),
        petId: selectedPetId!,
        date: healthData.date || formatDate(new Date()),
        type: healthData.type || 'weight',
        value: healthData.value,
        clinic: healthData.clinic,
        doctor: healthData.doctor,
        diagnosis: healthData.diagnosis,
        treatment: healthData.treatment,
        cost: healthData.cost,
        nextVisit: healthData.nextVisit,
        notes: healthData.notes,
      };
      setHealthRecords(prev => [...prev, newHealth]);
    }
    setShowHealthModal(false);
    setEditingHealth(null);
  }, [editingHealth, selectedPetId]);

  const handleDeleteHealth = useCallback((healthId: string) => {
    Alert.alert('削除確認', 'この健康記録を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => setHealthRecords(prev => prev.filter(h => h.id !== healthId)),
      },
    ]);
  }, []);

  // Photo handlers
  const handleToggleFavorite = useCallback((photoId: string) => {
    setPhotos(prev => prev.map(p => 
      p.id === photoId ? { ...p, isFavorite: !p.isFavorite } : p
    ));
  }, []);

  const handleDeletePhoto = useCallback((photoId: string) => {
    Alert.alert('削除確認', 'この写真を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => setPhotos(prev => prev.filter(p => p.id !== photoId)),
      },
    ]);
  }, []);

  // Get today's stats
  const todayStats = useMemo(() => {
    const today = formatDate(new Date());
    const todayMeals = meals.filter(m => m.petId === selectedPetId && m.date === today);
    const todayWalks = walks.filter(w => w.petId === selectedPetId && w.date === today);
    const totalWalkTime = todayWalks.reduce((sum, w) => sum + w.duration, 0);
    const totalWalkDistance = todayWalks.reduce((sum, w) => sum + (w.distance || 0), 0);
    
    return {
      mealCount: todayMeals.length,
      walkCount: todayWalks.length,
      totalWalkTime,
      totalWalkDistance,
    };
  }, [meals, walks, selectedPetId]);

  // ==================== RENDER FUNCTIONS ====================

  // Header
  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={handleBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>🐾 ペット記録</Text>
      <View style={styles.headerRight} />
    </View>
  );

  // Pet Selector
  const renderPetSelector = () => (
    <View style={styles.petSelector}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.petSelectorContent}>
        {pets.map(pet => (
          <TouchableOpacity
            key={pet.id}
            style={[
              styles.petChip,
              selectedPetId === pet.id && styles.petChipSelected,
              { borderColor: pet.color }
            ]}
            onPress={() => setSelectedPetId(pet.id)}
            onLongPress={() => {
              setEditingPet(pet);
              setShowPetModal(true);
            }}
          >
            <Text style={styles.petChipIcon}>{pet.icon}</Text>
            <Text style={[
              styles.petChipName,
              selectedPetId === pet.id && styles.petChipNameSelected
            ]}>
              {pet.name}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={styles.addPetChip}
          onPress={() => {
            setEditingPet(null);
            setShowPetModal(true);
          }}
        >
          <Text style={styles.addPetChipText}>+ 追加</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  // Tab Bar
  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {VIEW_TABS.map(tab => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, viewMode === tab.key && styles.tabActive]}
          onPress={() => handleViewModeChange(tab.key)}
        >
          <Text style={styles.tabIcon}>{tab.icon}</Text>
          <Text style={[styles.tabLabel, viewMode === tab.key && styles.tabLabelActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Pet Profile Card
  const renderPetProfile = () => {
    if (!selectedPet) return null;
    
    return (
      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={[styles.profileAvatar, { backgroundColor: selectedPet.color + '20' }]}>
            <Text style={styles.profileAvatarText}>{selectedPet.icon}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{selectedPet.name}</Text>
            <Text style={styles.profileBreed}>
              {PET_TYPES[selectedPet.type].label}
              {selectedPet.breed && ` • ${selectedPet.breed}`}
            </Text>
            <Text style={styles.profileAge}>
              🎂 {calculateAge(selectedPet.birthday)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.profileEditButton}
            onPress={() => {
              setEditingPet(selectedPet);
              setShowPetModal(true);
            }}
          >
            <Text style={styles.profileEditButtonText}>✏️</Text>
          </TouchableOpacity>
        </View>
        
        {/* Today's Stats */}
        <View style={styles.todayStats}>
          <View style={styles.todayStatItem}>
            <Text style={styles.todayStatIcon}>🍽️</Text>
            <Text style={styles.todayStatValue}>{todayStats.mealCount}</Text>
            <Text style={styles.todayStatLabel}>食事</Text>
          </View>
          <View style={styles.todayStatDivider} />
          <View style={styles.todayStatItem}>
            <Text style={styles.todayStatIcon}>🚶</Text>
            <Text style={styles.todayStatValue}>{todayStats.walkCount}</Text>
            <Text style={styles.todayStatLabel}>散歩</Text>
          </View>
          <View style={styles.todayStatDivider} />
          <View style={styles.todayStatItem}>
            <Text style={styles.todayStatIcon}>⏱️</Text>
            <Text style={styles.todayStatValue}>{todayStats.totalWalkTime}</Text>
            <Text style={styles.todayStatLabel}>分</Text>
          </View>
          <View style={styles.todayStatDivider} />
          <View style={styles.todayStatItem}>
            <Text style={styles.todayStatIcon}>📍</Text>
            <Text style={styles.todayStatValue}>{todayStats.totalWalkDistance.toFixed(1)}</Text>
            <Text style={styles.todayStatLabel}>km</Text>
          </View>
        </View>
      </View>
    );
  };

  // Pets View
  const renderPetsView = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {renderPetProfile()}
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🐾 登録ペット一覧</Text>
        {pets.map(pet => (
          <TouchableOpacity
            key={pet.id}
            style={[
              styles.petCard,
              selectedPetId === pet.id && styles.petCardSelected,
            ]}
            onPress={() => setSelectedPetId(pet.id)}
          >
            <View style={[styles.petCardAvatar, { backgroundColor: pet.color + '20' }]}>
              <Text style={styles.petCardAvatarText}>{pet.icon}</Text>
            </View>
            <View style={styles.petCardInfo}>
              <Text style={styles.petCardName}>{pet.name}</Text>
              <Text style={styles.petCardDetail}>
                {PET_TYPES[pet.type].label}
                {pet.breed && ` • ${pet.breed}`}
              </Text>
              <Text style={styles.petCardAge}>🎂 {calculateAge(pet.birthday)}</Text>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeletePet(pet.id)}
            >
              <Text style={styles.deleteButtonText}>🗑️</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  // Meals View
  const renderMealsView = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {renderPetProfile()}
      
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🍽️ 食事記録</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setEditingMeal(null);
              setShowMealModal(true);
            }}
          >
            <Text style={styles.addButtonText}>+ 追加</Text>
          </TouchableOpacity>
        </View>
        
        {filteredMeals.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🍽️</Text>
            <Text style={styles.emptyStateText}>食事記録がありません</Text>
          </View>
        ) : (
          filteredMeals.map(meal => (
            <TouchableOpacity
              key={meal.id}
              style={styles.recordCard}
              onPress={() => {
                setEditingMeal(meal);
                setShowMealModal(true);
              }}
            >
              <View style={styles.recordIcon}>
                <Text style={styles.recordIconText}>{MEAL_TYPES[meal.type].icon}</Text>
              </View>
              <View style={styles.recordInfo}>
                <View style={styles.recordHeader}>
                  <Text style={styles.recordTitle}>{MEAL_TYPES[meal.type].label}</Text>
                  <Text style={styles.recordDate}>
                    {getDateLabel(meal.date)} {meal.time}
                  </Text>
                </View>
                <Text style={styles.recordDetail}>{meal.food}</Text>
                {meal.amount && (
                  <Text style={styles.recordMeta}>量: {meal.amount}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteMeal(meal.id)}
              >
                <Text style={styles.deleteButtonText}>🗑️</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </View>
      
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  // Walks View
  const renderWalksView = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {renderPetProfile()}
      
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🚶 散歩記録</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setEditingWalk(null);
              setShowWalkModal(true);
            }}
          >
            <Text style={styles.addButtonText}>+ 追加</Text>
          </TouchableOpacity>
        </View>
        
        {filteredWalks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🚶</Text>
            <Text style={styles.emptyStateText}>散歩記録がありません</Text>
          </View>
        ) : (
          filteredWalks.map(walk => (
            <TouchableOpacity
              key={walk.id}
              style={styles.recordCard}
              onPress={() => {
                setEditingWalk(walk);
                setShowWalkModal(true);
              }}
            >
              <View style={styles.recordIcon}>
                <Text style={styles.recordIconText}>🚶</Text>
              </View>
              <View style={styles.recordInfo}>
                <View style={styles.recordHeader}>
                  <Text style={styles.recordTitle}>
                    散歩 {walk.mood || ''}
                  </Text>
                  <Text style={styles.recordDate}>
                    {getDateLabel(walk.date)} {walk.startTime}
                  </Text>
                </View>
                <Text style={styles.recordDetail}>
                  {walk.duration}分
                  {walk.distance && ` • ${walk.distance}km`}
                </Text>
                {walk.notes && (
                  <Text style={styles.recordMeta}>{walk.notes}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteWalk(walk.id)}
              >
                <Text style={styles.deleteButtonText}>🗑️</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </View>
      
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  // Health View
  const renderHealthView = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {renderPetProfile()}
      
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>❤️ 健康記録</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setEditingHealth(null);
              setShowHealthModal(true);
            }}
          >
            <Text style={styles.addButtonText}>+ 追加</Text>
          </TouchableOpacity>
        </View>
        
        {filteredHealth.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>❤️</Text>
            <Text style={styles.emptyStateText}>健康記録がありません</Text>
          </View>
        ) : (
          filteredHealth.map(health => (
            <TouchableOpacity
              key={health.id}
              style={styles.recordCard}
              onPress={() => {
                setEditingHealth(health);
                setShowHealthModal(true);
              }}
            >
              <View style={styles.recordIcon}>
                <Text style={styles.recordIconText}>
                  {HEALTH_RECORD_TYPES[health.type].icon}
                </Text>
              </View>
              <View style={styles.recordInfo}>
                <View style={styles.recordHeader}>
                  <Text style={styles.recordTitle}>
                    {HEALTH_RECORD_TYPES[health.type].label}
                  </Text>
                  <Text style={styles.recordDate}>{getDateLabel(health.date)}</Text>
                </View>
                {health.type === 'weight' && health.value && (
                  <Text style={styles.recordDetail}>{health.value}kg</Text>
                )}
                {health.type === 'vet_visit' && (
                  <>
                    {health.clinic && (
                      <Text style={styles.recordDetail}>🏥 {health.clinic}</Text>
                    )}
                    {health.diagnosis && (
                      <Text style={styles.recordMeta}>{health.diagnosis}</Text>
                    )}
                    {health.cost !== undefined && (
                      <Text style={styles.recordMeta}>💰 ¥{health.cost.toLocaleString()}</Text>
                    )}
                  </>
                )}
                {health.notes && (
                  <Text style={styles.recordMeta}>{health.notes}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteHealth(health.id)}
              >
                <Text style={styles.deleteButtonText}>🗑️</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </View>
      
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  // Photos View
  const renderPhotosView = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {renderPetProfile()}
      
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📷 写真アルバム</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              Alert.alert('写真追加', 'カメラロールから選択する機能は実装予定です');
            }}
          >
            <Text style={styles.addButtonText}>+ 追加</Text>
          </TouchableOpacity>
        </View>
        
        {filteredPhotos.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📷</Text>
            <Text style={styles.emptyStateText}>写真がありません</Text>
          </View>
        ) : (
          <View style={styles.photoGrid}>
            {filteredPhotos.map(photo => (
              <TouchableOpacity
                key={photo.id}
                style={styles.photoItem}
                onPress={() => setSelectedPhoto(photo)}
              >
                <Image
                  source={{ uri: photo.uri }}
                  style={styles.photoImage}
                  resizeMode="cover"
                />
                {photo.isFavorite && (
                  <View style={styles.favoriteIcon}>
                    <Text style={styles.favoriteIconText}>❤️</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  // Photo Modal
  const renderPhotoModal = () => (
    <Modal
      visible={selectedPhoto !== null}
      animationType="fade"
      transparent
      onRequestClose={() => setSelectedPhoto(null)}
    >
      <View style={styles.photoModalOverlay}>
        <TouchableOpacity
          style={styles.photoModalClose}
          onPress={() => setSelectedPhoto(null)}
        >
          <Text style={styles.photoModalCloseText}>✕</Text>
        </TouchableOpacity>
        
        {selectedPhoto && (
          <View style={styles.photoModalContent}>
            <Image
              source={{ uri: selectedPhoto.uri }}
              style={styles.photoModalImage}
              resizeMode="contain"
            />
            
            <View style={styles.photoModalInfo}>
              {selectedPhoto.caption && (
                <Text style={styles.photoModalCaption}>{selectedPhoto.caption}</Text>
              )}
              <Text style={styles.photoModalDate}>{getDateLabel(selectedPhoto.date)}</Text>
            </View>
            
            <View style={styles.photoModalActions}>
              <TouchableOpacity
                style={styles.photoModalAction}
                onPress={() => handleToggleFavorite(selectedPhoto.id)}
              >
                <Text style={styles.photoModalActionText}>
                  {selectedPhoto.isFavorite ? '❤️' : '🤍'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoModalAction}
                onPress={() => {
                  handleDeletePhoto(selectedPhoto.id);
                  setSelectedPhoto(null);
                }}
              >
                <Text style={styles.photoModalActionText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );

  // Pet Modal
  const renderPetModal = () => {
    const [name, setName] = useState(editingPet?.name || '');
    const [type, setType] = useState<PetType>(editingPet?.type || 'dog');
    const [breed, setBreed] = useState(editingPet?.breed || '');
    const [birthday, setBirthday] = useState(editingPet?.birthday || formatDate(new Date()));
    const [color, setColor] = useState(editingPet?.color || COLORS.primary);
    const [notes, setNotes] = useState(editingPet?.notes || '');

    return (
      <Modal
        visible={showPetModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPetModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingPet ? 'ペット編集' : 'ペット登録'}
              </Text>
              <TouchableOpacity onPress={() => setShowPetModal(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>名前 *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="ペットの名前"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.inputLabel}>種類</Text>
              <View style={styles.typeSelector}>
                {(Object.entries(PET_TYPES) as [PetType, { label: string; icon: string }][]).map(
                  ([key, value]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.typeOption,
                        type === key && styles.typeOptionSelected,
                      ]}
                      onPress={() => setType(key)}
                    >
                      <Text style={styles.typeOptionIcon}>{value.icon}</Text>
                      <Text style={[
                        styles.typeOptionLabel,
                        type === key && styles.typeOptionLabelSelected,
                      ]}>
                        {value.label}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              <Text style={styles.inputLabel}>犬種/猫種など</Text>
              <TextInput
                style={styles.input}
                value={breed}
                onChangeText={setBreed}
                placeholder="例: 柴犬、トイプードル"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.inputLabel}>誕生日</Text>
              <TextInput
                style={styles.input}
                value={birthday}
                onChangeText={setBirthday}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.inputLabel}>カラー</Text>
              <View style={styles.colorSelector}>
                {PET_COLORS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorOption,
                      { backgroundColor: c },
                      color === c && styles.colorOptionSelected,
                    ]}
                    onPress={() => setColor(c)}
                  />
                ))}
              </View>

              <Text style={styles.inputLabel}>メモ</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={notes}
                onChangeText={setNotes}
                placeholder="メモを入力"
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowPetModal(false)}
              >
                <Text style={styles.cancelButtonText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, !name && styles.saveButtonDisabled]}
                onPress={() => handleSavePet({ name, type, breed, birthday, color, notes })}
                disabled={!name}
              >
                <Text style={styles.saveButtonText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Meal Modal
  const renderMealModal = () => {
    const [date, setDate] = useState(editingMeal?.date || formatDate(new Date()));
    const [time, setTime] = useState(editingMeal?.time || formatTime(new Date()));
    const [type, setType] = useState<MealType>(editingMeal?.type || 'breakfast');
    const [food, setFood] = useState(editingMeal?.food || '');
    const [amount, setAmount] = useState(editingMeal?.amount || '');
    const [notes, setNotes] = useState(editingMeal?.notes || '');

    return (
      <Modal
        visible={showMealModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowMealModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingMeal ? '食事記録編集' : '食事記録'}
              </Text>
              <TouchableOpacity onPress={() => setShowMealModal(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>日付</Text>
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.inputLabel}>時間</Text>
              <TextInput
                style={styles.input}
                value={time}
                onChangeText={setTime}
                placeholder="HH:MM"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.inputLabel}>食事の種類</Text>
              <View style={styles.mealTypeSelector}>
                {(Object.entries(MEAL_TYPES) as [MealType, { label: string; icon: string }][]).map(
                  ([key, value]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.mealTypeOption,
                        type === key && styles.mealTypeOptionSelected,
                      ]}
                      onPress={() => setType(key)}
                    >
                      <Text style={styles.mealTypeOptionIcon}>{value.icon}</Text>
                      <Text style={[
                        styles.mealTypeOptionLabel,
                        type === key && styles.mealTypeOptionLabelSelected,
                      ]}>
                        {value.label}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              <Text style={styles.inputLabel}>フード名 *</Text>
              <TextInput
                style={styles.input}
                value={food}
                onChangeText={setFood}
                placeholder="例: ドッグフード"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.inputLabel}>量</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="例: 100g"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.inputLabel}>メモ</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={notes}
                onChangeText={setNotes}
                placeholder="メモを入力"
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowMealModal(false)}
              >
                <Text style={styles.cancelButtonText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, !food && styles.saveButtonDisabled]}
                onPress={() => handleSaveMeal({ date, time, type, food, amount, notes })}
                disabled={!food}
              >
                <Text style={styles.saveButtonText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Walk Modal
  const renderWalkModal = () => {
    const [date, setDate] = useState(editingWalk?.date || formatDate(new Date()));
    const [startTime, setStartTime] = useState(editingWalk?.startTime || formatTime(new Date()));
    const [duration, setDuration] = useState(editingWalk?.duration?.toString() || '30');
    const [distance, setDistance] = useState(editingWalk?.distance?.toString() || '');
    const [mood, setMood] = useState<WalkRecord['mood']>(editingWalk?.mood);
    const [notes, setNotes] = useState(editingWalk?.notes || '');

    const moods: WalkRecord['mood'][] = ['😊', '😐', '😫'];

    return (
      <Modal
        visible={showWalkModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowWalkModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingWalk ? '散歩記録編集' : '散歩記録'}
              </Text>
              <TouchableOpacity onPress={() => setShowWalkModal(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>日付</Text>
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.inputLabel}>開始時間</Text>
              <TextInput
                style={styles.input}
                value={startTime}
                onChangeText={setStartTime}
                placeholder="HH:MM"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.inputLabel}>時間（分）</Text>
              <TextInput
                style={styles.input}
                value={duration}
                onChangeText={setDuration}
                placeholder="30"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>距離（km）</Text>
              <TextInput
                style={styles.input}
                value={distance}
                onChangeText={setDistance}
                placeholder="2.5"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>気分</Text>
              <View style={styles.moodSelector}>
                {moods.map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.moodOption,
                      mood === m && styles.moodOptionSelected,
                    ]}
                    onPress={() => setMood(mood === m ? undefined : m)}
                  >
                    <Text style={styles.moodOptionText}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>メモ</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={notes}
                onChangeText={setNotes}
                placeholder="散歩の様子を記録"
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowWalkModal(false)}
              >
                <Text style={styles.cancelButtonText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => handleSaveWalk({
                  date,
                  startTime,
                  duration: parseInt(duration) || 30,
                  distance: distance ? parseFloat(distance) : undefined,
                  mood,
                  notes,
                })}
              >
                <Text style={styles.saveButtonText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Health Modal
  const renderHealthModal = () => {
    const [date, setDate] = useState(editingHealth?.date || formatDate(new Date()));
    const [type, setType] = useState<HealthRecordType>(editingHealth?.type || 'weight');
    const [value, setValue] = useState(editingHealth?.value || '');
    const [clinic, setClinic] = useState(editingHealth?.clinic || '');
    const [doctor, setDoctor] = useState(editingHealth?.doctor || '');
    const [diagnosis, setDiagnosis] = useState(editingHealth?.diagnosis || '');
    const [treatment, setTreatment] = useState(editingHealth?.treatment || '');
    const [cost, setCost] = useState(editingHealth?.cost?.toString() || '');
    const [nextVisit, setNextVisit] = useState(editingHealth?.nextVisit || '');
    const [notes, setNotes] = useState(editingHealth?.notes || '');

    return (
      <Modal
        visible={showHealthModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowHealthModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingHealth ? '健康記録編集' : '健康記録'}
              </Text>
              <TouchableOpacity onPress={() => setShowHealthModal(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>日付</Text>
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.inputLabel}>記録の種類</Text>
              <View style={styles.healthTypeSelector}>
                {(Object.entries(HEALTH_RECORD_TYPES) as [HealthRecordType, { label: string; icon: string }][]).map(
                  ([key, val]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.healthTypeOption,
                        type === key && styles.healthTypeOptionSelected,
                      ]}
                      onPress={() => setType(key)}
                    >
                      <Text style={styles.healthTypeOptionIcon}>{val.icon}</Text>
                      <Text style={[
                        styles.healthTypeOptionLabel,
                        type === key && styles.healthTypeOptionLabelSelected,
                      ]}>
                        {val.label}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              {type === 'weight' && (
                <>
                  <Text style={styles.inputLabel}>体重（kg）</Text>
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={setValue}
                    placeholder="8.5"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                  />
                </>
              )}

              {type === 'vet_visit' && (
                <>
                  <Text style={styles.inputLabel}>病院名</Text>
                  <TextInput
                    style={styles.input}
                    value={clinic}
                    onChangeText={setClinic}
                    placeholder="動物病院名"
                    placeholderTextColor={COLORS.textMuted}
                  />

                  <Text style={styles.inputLabel}>担当医</Text>
                  <TextInput
                    style={styles.input}
                    value={doctor}
                    onChangeText={setDoctor}
                    placeholder="先生の名前"
                    placeholderTextColor={COLORS.textMuted}
                  />

                  <Text style={styles.inputLabel}>診断</Text>
                  <TextInput
                    style={styles.input}
                    value={diagnosis}
                    onChangeText={setDiagnosis}
                    placeholder="診断内容"
                    placeholderTextColor={COLORS.textMuted}
                  />

                  <Text style={styles.inputLabel}>治療内容</Text>
                  <TextInput
                    style={styles.input}
                    value={treatment}
                    onChangeText={setTreatment}
                    placeholder="治療や処置"
                    placeholderTextColor={COLORS.textMuted}
                  />

                  <Text style={styles.inputLabel}>費用（円）</Text>
                  <TextInput
                    style={styles.input}
                    value={cost}
                    onChangeText={setCost}
                    placeholder="5000"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                  />

                  <Text style={styles.inputLabel}>次回予約</Text>
                  <TextInput
                    style={styles.input}
                    value={nextVisit}
                    onChangeText={setNextVisit}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </>
              )}

              <Text style={styles.inputLabel}>メモ</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={notes}
                onChangeText={setNotes}
                placeholder="メモを入力"
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowHealthModal(false)}
              >
                <Text style={styles.cancelButtonText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => handleSaveHealth({
                  date,
                  type,
                  value,
                  clinic,
                  doctor,
                  diagnosis,
                  treatment,
                  cost: cost ? parseInt(cost) : undefined,
                  nextVisit,
                  notes,
                })}
              >
                <Text style={styles.saveButtonText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Main Content
  const renderContent = () => {
    switch (viewMode) {
      case 'pets':
        return renderPetsView();
      case 'meals':
        return renderMealsView();
      case 'walks':
        return renderWalksView();
      case 'health':
        return renderHealthView();
      case 'photos':
        return renderPhotosView();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderPetSelector()}
      {renderTabBar()}
      
      <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
        {selectedPetId ? renderContent() : (
          <View style={styles.noPetState}>
            <Text style={styles.noPetStateIcon}>🐾</Text>
            <Text style={styles.noPetStateText}>ペットを登録してください</Text>
            <TouchableOpacity
              style={styles.noPetStateButton}
              onPress={() => {
                setEditingPet(null);
                setShowPetModal(true);
              }}
            >
              <Text style={styles.noPetStateButtonText}>+ ペットを追加</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {renderPetModal()}
      {renderMealModal()}
      {renderWalkModal()}
      {renderHealthModal()}
      {renderPhotoModal()}
    </SafeAreaView>
  );
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    justifyContent: 'center',
    alignItems: 'center',
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
  headerRight: {
    width: 40,
  },
  
  // Pet Selector
  petSelector: {
    backgroundColor: COLORS.white,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  petSelectorContent: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
  },
  petChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 2,
    gap: 6,
  },
  petChipSelected: {
    backgroundColor: COLORS.primary + '15',
  },
  petChipIcon: {
    fontSize: 18,
  },
  petChipName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  petChipNameSelected: {
    color: COLORS.primary,
  },
  addPetChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  addPetChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  
  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabLabelActive: {
    color: COLORS.primary,
  },
  
  // Content
  contentContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  
  // Profile Card
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    fontSize: 32,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  profileBreed: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  profileAge: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  profileEditButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileEditButtonText: {
    fontSize: 18,
  },
  
  // Today Stats
  todayStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  todayStatItem: {
    alignItems: 'center',
  },
  todayStatIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  todayStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  todayStatLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  todayStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  
  // Section
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
  },
  
  // Pet Card
  petCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.cardShadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  petCardSelected: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  petCardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  petCardAvatarText: {
    fontSize: 24,
  },
  petCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  petCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  petCardDetail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  petCardAge: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  
  // Record Card
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.cardShadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  recordIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordIconText: {
    fontSize: 22,
  },
  recordInfo: {
    flex: 1,
    marginLeft: 12,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  recordDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  recordDetail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  recordMeta: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  
  deleteButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 18,
    opacity: 0.6,
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    opacity: 0.5,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 12,
  },
  
  // No Pet State
  noPetState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noPetStateIcon: {
    fontSize: 64,
    opacity: 0.5,
  },
  noPetStateText: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginTop: 16,
  },
  noPetStateButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 24,
  },
  noPetStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  
  // Photo Grid
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  photoItem: {
    width: (SCREEN_WIDTH - 40) / 3,
    height: (SCREEN_WIDTH - 40) / 3,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  favoriteIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  favoriteIconText: {
    fontSize: 12,
  },
  
  // Photo Modal
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  photoModalCloseText: {
    fontSize: 24,
    color: COLORS.white,
    fontWeight: '600',
  },
  photoModalContent: {
    width: '100%',
    alignItems: 'center',
  },
  photoModalImage: {
    width: SCREEN_WIDTH - 40,
    height: SCREEN_WIDTH - 40,
  },
  photoModalInfo: {
    marginTop: 20,
    alignItems: 'center',
  },
  photoModalCaption: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: '600',
    textAlign: 'center',
  },
  photoModalDate: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
  },
  photoModalActions: {
    flexDirection: 'row',
    marginTop: 30,
    gap: 40,
  },
  photoModalAction: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalActionText: {
    fontSize: 24,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalCloseText: {
    fontSize: 24,
    color: COLORS.textMuted,
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  
  // Form
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  
  // Type Selector
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  typeOptionSelected: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  typeOptionIcon: {
    fontSize: 16,
  },
  typeOptionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  typeOptionLabelSelected: {
    color: COLORS.primary,
  },
  
  // Meal Type Selector
  mealTypeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  mealTypeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mealTypeOptionSelected: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  mealTypeOptionIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  mealTypeOptionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  mealTypeOptionLabelSelected: {
    color: COLORS.primary,
  },
  
  // Health Type Selector
  healthTypeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  healthTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  healthTypeOptionSelected: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  healthTypeOptionIcon: {
    fontSize: 14,
  },
  healthTypeOptionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  healthTypeOptionLabelSelected: {
    color: COLORS.primary,
  },
  
  // Mood Selector
  moodSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  moodOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  moodOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '15',
  },
  moodOptionText: {
    fontSize: 24,
  },
  
  // Color Selector
  colorSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: COLORS.text,
  },
  
  // Buttons
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default PetScreen;
