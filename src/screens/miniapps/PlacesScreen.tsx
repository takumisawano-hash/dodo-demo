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
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

// ==================== TYPES ====================
type PlaceCategory = 'restaurant' | 'cafe' | 'shop' | 'tourism' | 'entertainment' | 'nature' | 'hotel' | 'other';
type ViewMode = 'list' | 'map' | 'grid';
type SortType = 'recent' | 'rating' | 'visits' | 'name';
type FilterType = 'all' | 'favorites' | 'visited' | 'want_to_go';

interface Photo {
  id: string;
  uri: string;
  caption?: string;
  takenAt: Date;
}

interface Visit {
  id: string;
  visitedAt: Date;
  rating?: number;
  memo?: string;
  photos: Photo[];
  expense?: number;
  companions?: string[];
}

interface Place {
  id: string;
  name: string;
  address: string;
  category: PlaceCategory;
  latitude?: number;
  longitude?: number;
  phone?: string;
  website?: string;
  rating: number;
  visits: Visit[];
  photos: Photo[];
  memo?: string;
  tags: string[];
  isFavorite: boolean;
  wantToGo: boolean;
  createdAt: Date;
  updatedAt: Date;
  priceRange?: 1 | 2 | 3 | 4;
  businessHours?: string;
}

interface PlaceCollection {
  id: string;
  name: string;
  icon: string;
  color: string;
  placeIds: string[];
}

// ==================== CONSTANTS ====================
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLORS = {
  primary: '#FF6B35',
  primaryLight: '#FF8F5C',
  primaryDark: '#E55A2B',
  background: '#FFF5E6',
  white: '#FFFFFF',
  text: '#333333',
  textSecondary: '#666666',
  textMuted: '#999999',
  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  success: '#4CAF50',
  danger: '#F44336',
  warning: '#FFC107',
  gold: '#FFD700',
  star: '#FFC107',
  mapPin: '#FF6B35',
};

const CATEGORY_CONFIG: Record<PlaceCategory, { label: string; icon: string; color: string }> = {
  restaurant: { label: '飲食店', icon: '🍽️', color: '#E53935' },
  cafe: { label: 'カフェ', icon: '☕', color: '#795548' },
  shop: { label: 'ショップ', icon: '🛍️', color: '#9C27B0' },
  tourism: { label: '観光', icon: '🏛️', color: '#1976D2' },
  entertainment: { label: 'エンタメ', icon: '🎬', color: '#FF9800' },
  nature: { label: '自然', icon: '🌲', color: '#4CAF50' },
  hotel: { label: '宿泊', icon: '🏨', color: '#607D8B' },
  other: { label: 'その他', icon: '📍', color: '#9E9E9E' },
};

const PRICE_LABELS = ['', '¥', '¥¥', '¥¥¥', '¥¥¥¥'];

const DEFAULT_COLLECTIONS: PlaceCollection[] = [
  { id: 'favorites', name: 'お気に入り', icon: '❤️', color: '#F44336', placeIds: [] },
  { id: 'want_to_go', name: 'また行きたい', icon: '🎯', color: '#FF6B35', placeIds: [] },
  { id: 'date_spots', name: 'デートスポット', icon: '💑', color: '#E91E63', placeIds: [] },
  { id: 'solo', name: 'ひとりで行く', icon: '🚶', color: '#607D8B', placeIds: [] },
  { id: 'family', name: '家族向け', icon: '👨‍👩‍👧‍👦', color: '#4CAF50', placeIds: [] },
];

const DEFAULT_TAGS = [
  '静か', '賑やか', '落ち着く', 'おしゃれ', 'リーズナブル',
  '駅近', '駐車場あり', 'Wi-Fi', 'テラス', 'ペット可', '子連れOK',
];

// ==================== UTILITY FUNCTIONS ====================
const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const formatDate = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return '今日';
  if (days === 1) return '昨日';
  if (days < 7) return `${days}日前`;
  if (days < 30) return `${Math.floor(days / 7)}週間前`;
  if (days < 365) return `${Math.floor(days / 30)}ヶ月前`;
  return `${Math.floor(days / 365)}年前`;
};

const formatFullDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  return `${year}/${month}/${day}(${dayNames[date.getDay()]})`;
};

const getVisitCount = (place: Place): number => place.visits.length;

const getLastVisitDate = (place: Place): Date | null => {
  if (place.visits.length === 0) return null;
  return place.visits.reduce((latest, visit) => 
    visit.visitedAt > latest.visitedAt ? visit : latest
  ).visitedAt;
};

const getAverageRating = (place: Place): number => {
  const ratings = place.visits.filter(v => v.rating).map(v => v.rating!);
  if (ratings.length === 0) return place.rating;
  return ratings.reduce((a, b) => a + b, 0) / ratings.length;
};

// ==================== SAMPLE DATA ====================
const createSamplePlaces = (): Place[] => {
  const now = new Date();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const lastWeek = new Date(now); lastWeek.setDate(now.getDate() - 7);
  const lastMonth = new Date(now); lastMonth.setMonth(now.getMonth() - 1);
  const twoMonthsAgo = new Date(now); twoMonthsAgo.setMonth(now.getMonth() - 2);

  return [
    {
      id: generateId(),
      name: 'カフェ モーニング',
      address: '東京都渋谷区神宮前1-2-3',
      category: 'cafe',
      latitude: 35.6702,
      longitude: 139.7025,
      phone: '03-1234-5678',
      rating: 4.5,
      visits: [
        { id: generateId(), visitedAt: yesterday, rating: 5, memo: 'ラテアートが最高！', photos: [], expense: 850 },
        { id: generateId(), visitedAt: lastMonth, rating: 4, memo: '', photos: [] },
        { id: generateId(), visitedAt: twoMonthsAgo, rating: 4.5, memo: 'モーニングセットがお得', photos: [] },
      ],
      photos: [],
      memo: '静かで作業に最適。電源・Wi-Fi完備。',
      tags: ['静か', 'Wi-Fi', 'おしゃれ'],
      isFavorite: true,
      wantToGo: false,
      createdAt: twoMonthsAgo,
      updatedAt: yesterday,
      priceRange: 2,
      businessHours: '8:00-20:00',
    },
    {
      id: generateId(),
      name: '焼肉 炎',
      address: '東京都新宿区歌舞伎町2-3-4',
      category: 'restaurant',
      latitude: 35.6938,
      longitude: 139.7034,
      phone: '03-2345-6789',
      rating: 4.0,
      visits: [
        { id: generateId(), visitedAt: lastWeek, rating: 4, memo: '肉質最高', photos: [], expense: 5500, companions: ['田中', '佐藤'] },
      ],
      photos: [],
      memo: '予約必須。特選カルビがおすすめ。',
      tags: ['賑やか', '駅近'],
      isFavorite: false,
      wantToGo: true,
      createdAt: lastWeek,
      updatedAt: lastWeek,
      priceRange: 3,
      businessHours: '17:00-24:00',
    },
    {
      id: generateId(),
      name: '浅草寺',
      address: '東京都台東区浅草2-3-1',
      category: 'tourism',
      latitude: 35.7147,
      longitude: 139.7966,
      rating: 4.8,
      visits: [
        { id: generateId(), visitedAt: lastMonth, rating: 5, memo: '人形焼き美味しかった', photos: [] },
      ],
      photos: [],
      memo: '早朝がおすすめ。人が少ない。',
      tags: [],
      isFavorite: true,
      wantToGo: false,
      createdAt: lastMonth,
      updatedAt: lastMonth,
    },
    {
      id: generateId(),
      name: 'SHIBUYA 109',
      address: '東京都渋谷区道玄坂2-29-1',
      category: 'shop',
      latitude: 35.6591,
      longitude: 139.6994,
      rating: 3.5,
      visits: [],
      photos: [],
      memo: '',
      tags: ['駅近'],
      isFavorite: false,
      wantToGo: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      name: '代々木公園',
      address: '東京都渋谷区代々木神園町2-1',
      category: 'nature',
      latitude: 35.6715,
      longitude: 139.6951,
      rating: 4.3,
      visits: [
        { id: generateId(), visitedAt: yesterday, rating: 4, memo: 'ピクニック最高', photos: [] },
        { id: generateId(), visitedAt: lastMonth, rating: 4.5, memo: '紅葉が綺麗だった', photos: [] },
      ],
      photos: [],
      memo: '週末はフリマやってることも',
      tags: ['自然', 'ペット可', '子連れOK'],
      isFavorite: true,
      wantToGo: false,
      createdAt: twoMonthsAgo,
      updatedAt: yesterday,
    },
    {
      id: generateId(),
      name: 'TOHOシネマズ 新宿',
      address: '東京都新宿区歌舞伎町1-19-1',
      category: 'entertainment',
      latitude: 35.6946,
      longitude: 139.7016,
      phone: '050-6868-5063',
      website: 'https://hlo.tohotheater.jp/net/schedule/076/TNPI2000J01.do',
      rating: 4.2,
      visits: [
        { id: generateId(), visitedAt: lastWeek, rating: 4, memo: 'IMAXで観た', photos: [], expense: 2200 },
      ],
      photos: [],
      memo: 'ゴジラヘッドが目印',
      tags: ['駅近', '賑やか'],
      isFavorite: false,
      wantToGo: false,
      createdAt: lastWeek,
      updatedAt: lastWeek,
      priceRange: 2,
    },
  ];
};

// ==================== COMPONENTS ====================

// Star Rating Component
const StarRating: React.FC<{
  rating: number;
  size?: number;
  editable?: boolean;
  onRate?: (rating: number) => void;
}> = ({ rating, size = 16, editable = false, onRate }) => {
  const stars = [1, 2, 3, 4, 5];
  
  return (
    <View style={styles.starContainer}>
      {stars.map((star) => (
        <TouchableOpacity
          key={star}
          disabled={!editable}
          onPress={() => onRate?.(star)}
          style={{ padding: editable ? 4 : 0 }}
        >
          <Text style={{ fontSize: size }}>
            {rating >= star ? '★' : rating >= star - 0.5 ? '⯨' : '☆'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Category Badge
const CategoryBadge: React.FC<{ category: PlaceCategory; small?: boolean }> = ({ category, small }) => {
  const config = CATEGORY_CONFIG[category];
  return (
    <View style={[
      styles.categoryBadge, 
      { backgroundColor: config.color + '20' },
      small && styles.categoryBadgeSmall
    ]}>
      <Text style={{ fontSize: small ? 10 : 12 }}>{config.icon}</Text>
      <Text style={[
        styles.categoryBadgeText, 
        { color: config.color },
        small && { fontSize: 10 }
      ]}>{config.label}</Text>
    </View>
  );
};

// Visit Count Badge
const VisitCountBadge: React.FC<{ count: number }> = ({ count }) => {
  if (count === 0) return null;
  return (
    <View style={styles.visitCountBadge}>
      <Text style={styles.visitCountText}>
        {count}回訪問
      </Text>
    </View>
  );
};

// Place Card Component
const PlaceCard: React.FC<{
  place: Place;
  onPress: () => void;
  onFavoriteToggle: () => void;
  viewMode: ViewMode;
}> = ({ place, onPress, onFavoriteToggle, viewMode }) => {
  const visitCount = getVisitCount(place);
  const lastVisit = getLastVisitDate(place);
  const avgRating = getAverageRating(place);
  const config = CATEGORY_CONFIG[place.category];

  if (viewMode === 'grid') {
    return (
      <TouchableOpacity style={styles.gridCard} onPress={onPress}>
        <View style={[styles.gridCardImage, { backgroundColor: config.color + '30' }]}>
          <Text style={styles.gridCardIcon}>{config.icon}</Text>
          <TouchableOpacity 
            style={styles.gridFavoriteButton}
            onPress={(e) => { e.stopPropagation(); onFavoriteToggle(); }}
          >
            <Text style={{ fontSize: 18 }}>{place.isFavorite ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.gridCardContent}>
          <Text style={styles.gridCardName} numberOfLines={1}>{place.name}</Text>
          <View style={styles.gridCardMeta}>
            <StarRating rating={avgRating} size={12} />
            {visitCount > 0 && (
              <Text style={styles.gridVisitCount}>{visitCount}回</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.placeCard} onPress={onPress}>
      <View style={styles.placeCardLeft}>
        <View style={[styles.placeIcon, { backgroundColor: config.color + '20' }]}>
          <Text style={styles.placeIconText}>{config.icon}</Text>
        </View>
      </View>
      <View style={styles.placeCardCenter}>
        <View style={styles.placeCardHeader}>
          <Text style={styles.placeName} numberOfLines={1}>{place.name}</Text>
          {place.wantToGo && <Text style={styles.wantToGoIcon}>🎯</Text>}
        </View>
        <Text style={styles.placeAddress} numberOfLines={1}>{place.address}</Text>
        <View style={styles.placeCardMeta}>
          <CategoryBadge category={place.category} small />
          <StarRating rating={avgRating} size={12} />
          <Text style={styles.ratingText}>{avgRating.toFixed(1)}</Text>
          {place.priceRange && (
            <Text style={styles.priceRange}>{PRICE_LABELS[place.priceRange]}</Text>
          )}
        </View>
        <View style={styles.placeCardFooter}>
          {visitCount > 0 ? (
            <>
              <VisitCountBadge count={visitCount} />
              <Text style={styles.lastVisitText}>
                最終: {lastVisit ? formatDate(lastVisit) : '-'}
              </Text>
            </>
          ) : (
            <Text style={styles.notVisitedText}>未訪問</Text>
          )}
          {place.tags.length > 0 && (
            <View style={styles.tagPreview}>
              {place.tags.slice(0, 2).map(tag => (
                <Text key={tag} style={styles.tagPreviewText}>#{tag}</Text>
              ))}
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity 
        style={styles.favoriteButton}
        onPress={(e) => { e.stopPropagation(); onFavoriteToggle(); }}
      >
        <Text style={{ fontSize: 22 }}>{place.isFavorite ? '❤️' : '🤍'}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

// Mini Map View (Placeholder)
const MiniMapView: React.FC<{ places: Place[]; onPlaceSelect: (place: Place) => void }> = ({ places, onPlaceSelect }) => {
  // In real implementation, use react-native-maps
  const centerLat = places.length > 0 
    ? places.filter(p => p.latitude).reduce((sum, p) => sum + (p.latitude || 0), 0) / places.filter(p => p.latitude).length
    : 35.6762;
  const centerLng = places.length > 0
    ? places.filter(p => p.longitude).reduce((sum, p) => sum + (p.longitude || 0), 0) / places.filter(p => p.longitude).length
    : 139.6503;

  return (
    <View style={styles.mapContainer}>
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapPlaceholderIcon}>🗺️</Text>
        <Text style={styles.mapPlaceholderText}>地図表示</Text>
        <Text style={styles.mapCoords}>
          {centerLat.toFixed(4)}, {centerLng.toFixed(4)}
        </Text>
      </View>
      <ScrollView horizontal style={styles.mapPinList} showsHorizontalScrollIndicator={false}>
        {places.filter(p => p.latitude && p.longitude).map(place => (
          <TouchableOpacity 
            key={place.id}
            style={styles.mapPinCard}
            onPress={() => onPlaceSelect(place)}
          >
            <View style={[styles.mapPinIcon, { backgroundColor: CATEGORY_CONFIG[place.category].color }]}>
              <Text style={{ fontSize: 14 }}>{CATEGORY_CONFIG[place.category].icon}</Text>
            </View>
            <Text style={styles.mapPinName} numberOfLines={1}>{place.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

// ==================== MAIN COMPONENT ====================
const PlacesScreen: React.FC = () => {
  const navigation = useNavigation();
  
  // State
  const [places, setPlaces] = useState<Place[]>(createSamplePlaces);
  const [collections] = useState<PlaceCollection[]>(DEFAULT_COLLECTIONS);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PlaceCategory | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  // New Place Form State
  const [newPlace, setNewPlace] = useState<Partial<Place>>({
    name: '',
    address: '',
    category: 'restaurant',
    rating: 3,
    tags: [],
    memo: '',
    wantToGo: false,
  });
  
  // New Visit Form State
  const [newVisit, setNewVisit] = useState<Partial<Visit>>({
    rating: 4,
    memo: '',
    expense: undefined,
  });

  // Stats
  const stats = useMemo(() => {
    const totalPlaces = places.length;
    const visitedPlaces = places.filter(p => p.visits.length > 0).length;
    const totalVisits = places.reduce((sum, p) => sum + p.visits.length, 0);
    const favorites = places.filter(p => p.isFavorite).length;
    const wantToGo = places.filter(p => p.wantToGo).length;
    
    const categoryCounts = Object.keys(CATEGORY_CONFIG).reduce((acc, cat) => {
      acc[cat as PlaceCategory] = places.filter(p => p.category === cat).length;
      return acc;
    }, {} as Record<PlaceCategory, number>);
    
    return { totalPlaces, visitedPlaces, totalVisits, favorites, wantToGo, categoryCounts };
  }, [places]);

  // Filtered & Sorted Places
  const filteredPlaces = useMemo(() => {
    let result = [...places];
    
    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.address.toLowerCase().includes(query) ||
        p.tags.some(t => t.includes(query)) ||
        p.memo?.toLowerCase().includes(query)
      );
    }
    
    // Category filter
    if (selectedCategory) {
      result = result.filter(p => p.category === selectedCategory);
    }
    
    // Filter type
    switch (filter) {
      case 'favorites':
        result = result.filter(p => p.isFavorite);
        break;
      case 'visited':
        result = result.filter(p => p.visits.length > 0);
        break;
      case 'want_to_go':
        result = result.filter(p => p.wantToGo);
        break;
    }
    
    // Sort
    switch (sortBy) {
      case 'recent':
        result.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        break;
      case 'rating':
        result.sort((a, b) => getAverageRating(b) - getAverageRating(a));
        break;
      case 'visits':
        result.sort((a, b) => getVisitCount(b) - getVisitCount(a));
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
        break;
    }
    
    return result;
  }, [places, searchQuery, selectedCategory, filter, sortBy]);

  // Handlers
  const handleAddPlace = useCallback(() => {
    if (!newPlace.name || !newPlace.address) {
      Alert.alert('入力エラー', '店名と住所は必須です');
      return;
    }
    
    const place: Place = {
      id: generateId(),
      name: newPlace.name,
      address: newPlace.address,
      category: newPlace.category as PlaceCategory,
      rating: newPlace.rating || 3,
      visits: [],
      photos: [],
      memo: newPlace.memo,
      tags: newPlace.tags || [],
      isFavorite: false,
      wantToGo: newPlace.wantToGo || false,
      createdAt: new Date(),
      updatedAt: new Date(),
      priceRange: newPlace.priceRange,
    };
    
    setPlaces(prev => [place, ...prev]);
    setShowAddModal(false);
    setNewPlace({
      name: '',
      address: '',
      category: 'restaurant',
      rating: 3,
      tags: [],
      memo: '',
      wantToGo: false,
    });
  }, [newPlace]);

  const handleAddVisit = useCallback(() => {
    if (!selectedPlace) return;
    
    const visit: Visit = {
      id: generateId(),
      visitedAt: new Date(),
      rating: newVisit.rating,
      memo: newVisit.memo,
      photos: [],
      expense: newVisit.expense,
    };
    
    setPlaces(prev => prev.map(p => {
      if (p.id === selectedPlace.id) {
        return {
          ...p,
          visits: [...p.visits, visit],
          updatedAt: new Date(),
          wantToGo: false, // 訪問したら「行きたい」から外す
        };
      }
      return p;
    }));
    
    setShowVisitModal(false);
    setNewVisit({ rating: 4, memo: '', expense: undefined });
  }, [selectedPlace, newVisit]);

  const handleToggleFavorite = useCallback((placeId: string) => {
    setPlaces(prev => prev.map(p => {
      if (p.id === placeId) {
        return { ...p, isFavorite: !p.isFavorite };
      }
      return p;
    }));
  }, []);

  const handleToggleWantToGo = useCallback((placeId: string) => {
    setPlaces(prev => prev.map(p => {
      if (p.id === placeId) {
        return { ...p, wantToGo: !p.wantToGo };
      }
      return p;
    }));
  }, []);

  const handleDeletePlace = useCallback((placeId: string) => {
    Alert.alert(
      '削除確認',
      'この場所を削除しますか？訪問記録も全て削除されます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '削除', 
          style: 'destructive',
          onPress: () => {
            setPlaces(prev => prev.filter(p => p.id !== placeId));
            setShowDetailModal(false);
            setSelectedPlace(null);
          }
        },
      ]
    );
  }, []);

  // Render Header
  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>← 戻る</Text>
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>📍 訪問記録</Text>
        <Text style={styles.headerSubtitle}>{stats.totalPlaces}件の場所</Text>
      </View>
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => setShowAddModal(true)}
      >
        <Text style={styles.addButtonText}>＋</Text>
      </TouchableOpacity>
    </View>
  );

  // Render Stats Bar
  const renderStatsBar = () => (
    <View style={styles.statsBar}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.totalVisits}</Text>
        <Text style={styles.statLabel}>総訪問数</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.visitedPlaces}</Text>
        <Text style={styles.statLabel}>訪問済み</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.favorites}</Text>
        <Text style={styles.statLabel}>お気に入り</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{stats.wantToGo}</Text>
        <Text style={styles.statLabel}>行きたい</Text>
      </View>
    </View>
  );

  // Render Search & Filter
  const renderSearchFilter = () => (
    <View style={styles.searchFilterContainer}>
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="場所を検索..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearButton}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {/* View Mode */}
          <View style={styles.viewModeButtons}>
            {(['list', 'grid', 'map'] as ViewMode[]).map(mode => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.viewModeButton,
                  viewMode === mode && styles.viewModeButtonActive
                ]}
                onPress={() => setViewMode(mode)}
              >
                <Text style={styles.viewModeIcon}>
                  {mode === 'list' ? '≡' : mode === 'grid' ? '⊞' : '🗺️'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Filter Chips */}
          {(['all', 'favorites', 'visited', 'want_to_go'] as FilterType[]).map(f => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip,
                filter === f && styles.filterChipActive
              ]}
              onPress={() => setFilter(f)}
            >
              <Text style={[
                styles.filterChipText,
                filter === f && styles.filterChipTextActive
              ]}>
                {f === 'all' ? '全て' : 
                 f === 'favorites' ? '❤️ お気に入り' : 
                 f === 'visited' ? '✓ 訪問済み' : 
                 '🎯 行きたい'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {/* Category Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            !selectedCategory && styles.categoryChipActive
          ]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={styles.categoryChipIcon}>📍</Text>
          <Text style={[
            styles.categoryChipText,
            !selectedCategory && styles.categoryChipTextActive
          ]}>全て</Text>
        </TouchableOpacity>
        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.categoryChip,
              selectedCategory === key && styles.categoryChipActive
            ]}
            onPress={() => setSelectedCategory(selectedCategory === key ? null : key as PlaceCategory)}
          >
            <Text style={styles.categoryChipIcon}>{config.icon}</Text>
            <Text style={[
              styles.categoryChipText,
              selectedCategory === key && styles.categoryChipTextActive
            ]}>{config.label}</Text>
            <Text style={styles.categoryCount}>
              {stats.categoryCounts[key as PlaceCategory]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Sort Options */}
      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>並び替え:</Text>
        {(['recent', 'rating', 'visits', 'name'] as SortType[]).map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.sortButton, sortBy === s && styles.sortButtonActive]}
            onPress={() => setSortBy(s)}
          >
            <Text style={[
              styles.sortButtonText,
              sortBy === s && styles.sortButtonTextActive
            ]}>
              {s === 'recent' ? '新しい順' : 
               s === 'rating' ? '評価順' : 
               s === 'visits' ? '訪問数' : 
               '名前順'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // Render Places List
  const renderPlacesList = () => {
    if (viewMode === 'map') {
      return (
        <MiniMapView 
          places={filteredPlaces}
          onPlaceSelect={(place) => {
            setSelectedPlace(place);
            setShowDetailModal(true);
          }}
        />
      );
    }

    if (filteredPlaces.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📍</Text>
          <Text style={styles.emptyTitle}>場所が見つかりません</Text>
          <Text style={styles.emptyText}>
            {searchQuery ? '検索条件を変更してみてください' : '右上の＋ボタンから場所を追加しましょう'}
          </Text>
        </View>
      );
    }

    if (viewMode === 'grid') {
      return (
        <View style={styles.gridContainer}>
          {filteredPlaces.map(place => (
            <PlaceCard
              key={place.id}
              place={place}
              viewMode="grid"
              onPress={() => {
                setSelectedPlace(place);
                setShowDetailModal(true);
              }}
              onFavoriteToggle={() => handleToggleFavorite(place.id)}
            />
          ))}
        </View>
      );
    }

    return (
      <View style={styles.listContainer}>
        {filteredPlaces.map(place => (
          <PlaceCard
            key={place.id}
            place={place}
            viewMode="list"
            onPress={() => {
              setSelectedPlace(place);
              setShowDetailModal(true);
            }}
            onFavoriteToggle={() => handleToggleFavorite(place.id)}
          />
        ))}
      </View>
    );
  };

  // Render Add Place Modal
  const renderAddModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAddModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>📍 新しい場所を追加</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            {/* Name */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>店名・場所名 *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="例: カフェ モーニング"
                placeholderTextColor={COLORS.textMuted}
                value={newPlace.name}
                onChangeText={(text) => setNewPlace(prev => ({ ...prev, name: text }))}
              />
            </View>
            
            {/* Address */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>住所 *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="例: 東京都渋谷区神宮前1-2-3"
                placeholderTextColor={COLORS.textMuted}
                value={newPlace.address}
                onChangeText={(text) => setNewPlace(prev => ({ ...prev, address: text }))}
              />
            </View>
            
            {/* Category */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>カテゴリ</Text>
              <View style={styles.categorySelect}>
                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.categoryOption,
                      newPlace.category === key && { backgroundColor: config.color + '30', borderColor: config.color }
                    ]}
                    onPress={() => setNewPlace(prev => ({ ...prev, category: key as PlaceCategory }))}
                  >
                    <Text style={{ fontSize: 20 }}>{config.icon}</Text>
                    <Text style={[
                      styles.categoryOptionText,
                      newPlace.category === key && { color: config.color }
                    ]}>{config.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Rating */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>初期評価</Text>
              <View style={styles.ratingSelect}>
                <StarRating 
                  rating={newPlace.rating || 3} 
                  size={32} 
                  editable 
                  onRate={(r) => setNewPlace(prev => ({ ...prev, rating: r }))}
                />
                <Text style={styles.ratingValue}>{newPlace.rating || 3}.0</Text>
              </View>
            </View>
            
            {/* Price Range */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>価格帯</Text>
              <View style={styles.priceSelect}>
                {[1, 2, 3, 4].map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priceOption,
                      newPlace.priceRange === p && styles.priceOptionActive
                    ]}
                    onPress={() => setNewPlace(prev => ({ 
                      ...prev, 
                      priceRange: prev.priceRange === p ? undefined : p as 1|2|3|4 
                    }))}
                  >
                    <Text style={[
                      styles.priceOptionText,
                      newPlace.priceRange === p && styles.priceOptionTextActive
                    ]}>{PRICE_LABELS[p]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Want to Go */}
            <TouchableOpacity 
              style={styles.wantToGoToggle}
              onPress={() => setNewPlace(prev => ({ ...prev, wantToGo: !prev.wantToGo }))}
            >
              <Text style={styles.wantToGoIcon}>
                {newPlace.wantToGo ? '🎯' : '○'}
              </Text>
              <Text style={styles.wantToGoText}>「行きたい」リストに追加</Text>
            </TouchableOpacity>
            
            {/* Memo */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>メモ</Text>
              <TextInput
                style={[styles.formInput, styles.formTextarea]}
                placeholder="メモを入力..."
                placeholderTextColor={COLORS.textMuted}
                value={newPlace.memo}
                onChangeText={(text) => setNewPlace(prev => ({ ...prev, memo: text }))}
                multiline
                numberOfLines={3}
              />
            </View>
            
            {/* Tags */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>タグ</Text>
              <View style={styles.tagSelect}>
                {DEFAULT_TAGS.map(tag => (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tagOption,
                      newPlace.tags?.includes(tag) && styles.tagOptionActive
                    ]}
                    onPress={() => {
                      setNewPlace(prev => ({
                        ...prev,
                        tags: prev.tags?.includes(tag)
                          ? prev.tags.filter(t => t !== tag)
                          : [...(prev.tags || []), tag]
                      }));
                    }}
                  >
                    <Text style={[
                      styles.tagOptionText,
                      newPlace.tags?.includes(tag) && styles.tagOptionTextActive
                    ]}>#{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowAddModal(false)}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleAddPlace}
            >
              <Text style={styles.saveButtonText}>追加</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Render Detail Modal
  const renderDetailModal = () => {
    if (!selectedPlace) return null;
    
    const avgRating = getAverageRating(selectedPlace);
    const visitCount = getVisitCount(selectedPlace);
    const config = CATEGORY_CONFIG[selectedPlace.category];
    
    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: SCREEN_HEIGHT * 0.9 }]}>
            {/* Header */}
            <View style={[styles.detailHeader, { backgroundColor: config.color }]}>
              <TouchableOpacity 
                style={styles.detailBackButton}
                onPress={() => setShowDetailModal(false)}
              >
                <Text style={styles.detailBackText}>← 戻る</Text>
              </TouchableOpacity>
              <View style={styles.detailHeaderActions}>
                <TouchableOpacity 
                  onPress={() => handleToggleFavorite(selectedPlace.id)}
                  style={styles.detailAction}
                >
                  <Text style={{ fontSize: 24 }}>{selectedPlace.isFavorite ? '❤️' : '🤍'}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => handleToggleWantToGo(selectedPlace.id)}
                  style={styles.detailAction}
                >
                  <Text style={{ fontSize: 24 }}>{selectedPlace.wantToGo ? '🎯' : '○'}</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <ScrollView style={styles.detailBody}>
              {/* Main Info */}
              <View style={styles.detailMainInfo}>
                <Text style={styles.detailIcon}>{config.icon}</Text>
                <Text style={styles.detailName}>{selectedPlace.name}</Text>
                <CategoryBadge category={selectedPlace.category} />
                
                <View style={styles.detailRating}>
                  <StarRating rating={avgRating} size={24} />
                  <Text style={styles.detailRatingValue}>{avgRating.toFixed(1)}</Text>
                  {selectedPlace.priceRange && (
                    <Text style={styles.detailPrice}>・{PRICE_LABELS[selectedPlace.priceRange]}</Text>
                  )}
                </View>
                
                <View style={styles.detailStats}>
                  <View style={styles.detailStat}>
                    <Text style={styles.detailStatValue}>{visitCount}</Text>
                    <Text style={styles.detailStatLabel}>回訪問</Text>
                  </View>
                  {visitCount > 0 && (
                    <View style={styles.detailStat}>
                      <Text style={styles.detailStatValue}>
                        {formatDate(getLastVisitDate(selectedPlace)!)}
                      </Text>
                      <Text style={styles.detailStatLabel}>最終訪問</Text>
                    </View>
                  )}
                </View>
              </View>
              
              {/* Quick Actions */}
              <View style={styles.quickActions}>
                <TouchableOpacity 
                  style={styles.quickActionButton}
                  onPress={() => setShowVisitModal(true)}
                >
                  <Text style={styles.quickActionIcon}>✓</Text>
                  <Text style={styles.quickActionText}>訪問を記録</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickActionButton}>
                  <Text style={styles.quickActionIcon}>📷</Text>
                  <Text style={styles.quickActionText}>写真を追加</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickActionButton}>
                  <Text style={styles.quickActionIcon}>🗺️</Text>
                  <Text style={styles.quickActionText}>地図で見る</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickActionButton}>
                  <Text style={styles.quickActionIcon}>↗️</Text>
                  <Text style={styles.quickActionText}>共有</Text>
                </TouchableOpacity>
              </View>
              
              {/* Info Section */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>📍 基本情報</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>住所</Text>
                  <Text style={styles.infoValue}>{selectedPlace.address}</Text>
                </View>
                {selectedPlace.phone && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>電話</Text>
                    <Text style={[styles.infoValue, styles.linkText]}>{selectedPlace.phone}</Text>
                  </View>
                )}
                {selectedPlace.businessHours && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>営業時間</Text>
                    <Text style={styles.infoValue}>{selectedPlace.businessHours}</Text>
                  </View>
                )}
                {selectedPlace.website && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Web</Text>
                    <Text style={[styles.infoValue, styles.linkText]} numberOfLines={1}>
                      {selectedPlace.website}
                    </Text>
                  </View>
                )}
              </View>
              
              {/* Memo */}
              {selectedPlace.memo && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>📝 メモ</Text>
                  <Text style={styles.memoText}>{selectedPlace.memo}</Text>
                </View>
              )}
              
              {/* Tags */}
              {selectedPlace.tags.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>🏷️ タグ</Text>
                  <View style={styles.tagList}>
                    {selectedPlace.tags.map(tag => (
                      <View key={tag} style={styles.tag}>
                        <Text style={styles.tagText}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              
              {/* Visit History */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>📅 訪問履歴</Text>
                {selectedPlace.visits.length === 0 ? (
                  <Text style={styles.noVisitsText}>まだ訪問記録がありません</Text>
                ) : (
                  selectedPlace.visits
                    .sort((a, b) => b.visitedAt.getTime() - a.visitedAt.getTime())
                    .map(visit => (
                      <View key={visit.id} style={styles.visitCard}>
                        <View style={styles.visitHeader}>
                          <Text style={styles.visitDate}>{formatFullDate(visit.visitedAt)}</Text>
                          {visit.rating && <StarRating rating={visit.rating} size={14} />}
                        </View>
                        {visit.memo && <Text style={styles.visitMemo}>{visit.memo}</Text>}
                        <View style={styles.visitMeta}>
                          {visit.expense && (
                            <Text style={styles.visitExpense}>💰 ¥{visit.expense.toLocaleString()}</Text>
                          )}
                          {visit.companions && visit.companions.length > 0 && (
                            <Text style={styles.visitCompanions}>
                              👥 {visit.companions.join(', ')}
                            </Text>
                          )}
                        </View>
                      </View>
                    ))
                )}
              </View>
            </ScrollView>
            
            {/* Footer */}
            <View style={styles.detailFooter}>
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => handleDeletePlace(selectedPlace.id)}
              >
                <Text style={styles.deleteButtonText}>🗑️ 削除</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.recordVisitButton}
                onPress={() => setShowVisitModal(true)}
              >
                <Text style={styles.recordVisitButtonText}>✓ 訪問を記録</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Render Visit Modal
  const renderVisitModal = () => (
    <Modal
      visible={showVisitModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowVisitModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>✓ 訪問を記録</Text>
            <TouchableOpacity onPress={() => setShowVisitModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            {selectedPlace && (
              <View style={styles.visitPlaceInfo}>
                <Text style={{ fontSize: 24 }}>{CATEGORY_CONFIG[selectedPlace.category].icon}</Text>
                <Text style={styles.visitPlaceName}>{selectedPlace.name}</Text>
              </View>
            )}
            
            {/* Rating */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>今回の評価</Text>
              <View style={styles.ratingSelect}>
                <StarRating 
                  rating={newVisit.rating || 4} 
                  size={36} 
                  editable 
                  onRate={(r) => setNewVisit(prev => ({ ...prev, rating: r }))}
                />
                <Text style={styles.ratingValue}>{newVisit.rating || 4}.0</Text>
              </View>
            </View>
            
            {/* Expense */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>支出金額</Text>
              <View style={styles.expenseInput}>
                <Text style={styles.yenSign}>¥</Text>
                <TextInput
                  style={styles.expenseTextInput}
                  placeholder="0"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  value={newVisit.expense?.toString() || ''}
                  onChangeText={(text) => setNewVisit(prev => ({ 
                    ...prev, 
                    expense: text ? parseInt(text, 10) : undefined 
                  }))}
                />
              </View>
            </View>
            
            {/* Memo */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>メモ・感想</Text>
              <TextInput
                style={[styles.formInput, styles.formTextarea]}
                placeholder="今回の訪問の感想を記録..."
                placeholderTextColor={COLORS.textMuted}
                value={newVisit.memo}
                onChangeText={(text) => setNewVisit(prev => ({ ...prev, memo: text }))}
                multiline
                numberOfLines={4}
              />
            </View>
            
            {/* Photo Button */}
            <TouchableOpacity style={styles.addPhotoButton}>
              <Text style={styles.addPhotoIcon}>📷</Text>
              <Text style={styles.addPhotoText}>写真を追加</Text>
            </TouchableOpacity>
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowVisitModal(false)}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleAddVisit}
            >
              <Text style={styles.saveButtonText}>記録する</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderStatsBar()}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {renderSearchFilter()}
        {renderPlacesList()}
        <View style={{ height: 100 }} />
      </ScrollView>
      
      {renderAddModal()}
      {renderDetailModal()}
      {renderVisitModal()}
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
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: COLORS.primary,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: COLORS.white,
    fontWeight: 'bold',
    marginTop: -2,
  },
  
  // Stats Bar
  statsBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  
  content: {
    flex: 1,
  },
  
  // Search & Filter
  searchFilterContainer: {
    backgroundColor: COLORS.white,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: COLORS.text,
  },
  clearButton: {
    fontSize: 16,
    color: COLORS.textMuted,
    padding: 4,
  },
  
  filterRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingHorizontal: 12,
  },
  viewModeButtons: {
    flexDirection: 'row',
    marginRight: 8,
  },
  viewModeButton: {
    width: 36,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  viewModeButtonActive: {
    backgroundColor: COLORS.primary,
  },
  viewModeIcon: {
    fontSize: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  
  categoryScroll: {
    marginTop: 12,
    paddingHorizontal: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary + '20',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  categoryChipIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  categoryChipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  categoryChipTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  categoryCount: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginLeft: 4,
  },
  
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
  },
  sortLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginRight: 8,
  },
  sortButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
  },
  sortButtonActive: {
    backgroundColor: COLORS.primary + '20',
  },
  sortButtonText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  sortButtonTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  
  // List Container
  listContainer: {
    padding: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  
  // Place Card
  placeCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  placeCardLeft: {
    marginRight: 12,
  },
  placeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeIconText: {
    fontSize: 24,
  },
  placeCardCenter: {
    flex: 1,
  },
  placeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  wantToGoIcon: {
    fontSize: 14,
    marginLeft: 4,
  },
  placeAddress: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  placeCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  ratingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  priceRange: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '600',
  },
  placeCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    flexWrap: 'wrap',
    gap: 8,
  },
  lastVisitText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  notVisitedText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  tagPreview: {
    flexDirection: 'row',
    gap: 4,
  },
  tagPreviewText: {
    fontSize: 10,
    color: COLORS.primary,
  },
  favoriteButton: {
    padding: 8,
    marginLeft: 4,
  },
  
  // Grid Card
  gridCard: {
    width: (SCREEN_WIDTH - 32) / 2 - 8,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    margin: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  gridCardImage: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCardIcon: {
    fontSize: 40,
  },
  gridFavoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  gridCardContent: {
    padding: 10,
  },
  gridCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  gridCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  gridVisitCount: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  
  // Star Rating
  starContainer: {
    flexDirection: 'row',
  },
  
  // Category Badge
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  categoryBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  
  // Visit Count Badge
  visitCountBadge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  visitCountText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  
  // Map
  mapContainer: {
    height: SCREEN_HEIGHT * 0.5,
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#E8F4E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPlaceholderIcon: {
    fontSize: 60,
    marginBottom: 8,
  },
  mapPlaceholderText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  mapCoords: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  mapPinList: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white + 'F0',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  mapPinCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  mapPinIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  mapPinName: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
    maxWidth: 100,
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalClose: {
    fontSize: 24,
    color: COLORS.textMuted,
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  
  // Form
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  formTextarea: {
    height: 100,
    textAlignVertical: 'top',
  },
  
  categorySelect: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryOption: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 70,
  },
  categoryOptionText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  
  ratingSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ratingValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  
  priceSelect: {
    flexDirection: 'row',
    gap: 8,
  },
  priceOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  priceOptionActive: {
    backgroundColor: COLORS.success + '20',
    borderColor: COLORS.success,
  },
  priceOptionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  priceOptionTextActive: {
    color: COLORS.success,
  },
  
  wantToGoToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  wantToGoIcon: {
    fontSize: 24,
  },
  wantToGoText: {
    fontSize: 16,
    color: COLORS.text,
  },
  
  tagSelect: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.background,
  },
  tagOptionActive: {
    backgroundColor: COLORS.primary,
  },
  tagOptionText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  tagOptionTextActive: {
    color: COLORS.white,
  },
  
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: '600',
  },
  
  // Detail Modal
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  detailBackButton: {
    padding: 4,
  },
  detailBackText: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: '600',
  },
  detailHeaderActions: {
    flexDirection: 'row',
    gap: 12,
  },
  detailAction: {
    padding: 4,
  },
  detailBody: {
    flex: 1,
  },
  detailMainInfo: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  detailName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  detailRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  detailRatingValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  detailPrice: {
    fontSize: 16,
    color: COLORS.success,
    fontWeight: '600',
  },
  detailStats: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 32,
  },
  detailStat: {
    alignItems: 'center',
  },
  detailStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  detailStatLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  quickActionButton: {
    alignItems: 'center',
    gap: 4,
  },
  quickActionIcon: {
    fontSize: 24,
  },
  quickActionText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  
  detailSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  infoLabel: {
    width: 80,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  linkText: {
    color: COLORS.primary,
  },
  memoText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 13,
    color: COLORS.primary,
  },
  
  noVisitsText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  visitCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  visitDate: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  visitMemo: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  visitMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  visitExpense: {
    fontSize: 12,
    color: COLORS.success,
  },
  visitCompanions: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  
  detailFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  deleteButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  deleteButtonText: {
    fontSize: 14,
    color: COLORS.danger,
    fontWeight: '600',
  },
  recordVisitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  recordVisitButtonText: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: '600',
  },
  
  // Visit Modal
  visitPlaceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 16,
  },
  visitPlaceName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  expenseInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  yenSign: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginRight: 4,
  },
  expenseTextInput: {
    flex: 1,
    height: 48,
    fontSize: 18,
    color: COLORS.text,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    gap: 8,
  },
  addPhotoIcon: {
    fontSize: 24,
  },
  addPhotoText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
});

export default PlacesScreen;
