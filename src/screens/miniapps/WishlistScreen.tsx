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
  Image,
  FlatList,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

// ==================== TYPES ====================
type Priority = 'high' | 'medium' | 'low';
type ViewType = 'grid' | 'list';
type SortType = 'priority' | 'price' | 'date' | 'name';
type FilterType = 'all' | 'pending' | 'purchased' | Priority;

interface WishlistItem {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  productUrl?: string;
  priority: Priority;
  isPurchased: boolean;
  category: string;
  memo?: string;
  createdAt: Date;
  updatedAt: Date;
  purchasedAt?: Date;
}

interface CategoryStats {
  category: string;
  count: number;
  total: number;
  purchasedCount: number;
}

// ==================== CONSTANTS ====================
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;
const GRID_CARD_HEIGHT = GRID_CARD_WIDTH * 1.3;

const COLORS = {
  primary: '#FF6B35',
  primaryLight: '#FF8A5C',
  primaryDark: '#E55A25',
  background: '#FFF5E6',
  white: '#FFFFFF',
  text: '#333333',
  textSecondary: '#666666',
  textMuted: '#999999',
  border: '#E0E0E0',
  success: '#4CAF50',
  danger: '#F44336',
  warning: '#FFC107',
  highPriority: '#F44336',
  mediumPriority: '#FF9800',
  lowPriority: '#4CAF50',
  purchased: '#9E9E9E',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; icon: string }> = {
  high: { label: '高', color: COLORS.highPriority, icon: '🔥' },
  medium: { label: '中', color: COLORS.mediumPriority, icon: '⭐' },
  low: { label: '低', color: COLORS.lowPriority, icon: '💤' },
};

const CATEGORY_OPTIONS = [
  { id: 'electronics', name: '電子機器', icon: '📱' },
  { id: 'fashion', name: 'ファッション', icon: '👕' },
  { id: 'home', name: '家具・インテリア', icon: '🏠' },
  { id: 'beauty', name: '美容・健康', icon: '💄' },
  { id: 'hobby', name: '趣味・娯楽', icon: '🎮' },
  { id: 'books', name: '本・マンガ', icon: '📚' },
  { id: 'food', name: '食品・グルメ', icon: '🍕' },
  { id: 'travel', name: '旅行', icon: '✈️' },
  { id: 'sports', name: 'スポーツ', icon: '⚽' },
  { id: 'other', name: 'その他', icon: '📦' },
];

const SAMPLE_IMAGES = ['🎁', '📦', '🛍️', '💝', '🎀', '✨', '💎', '🌟'];

// ==================== UTILITY FUNCTIONS ====================
const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const formatPrice = (price: number): string => {
  return `¥${price.toLocaleString()}`;
};

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}/${month}/${day}`;
};

const getCategoryIcon = (categoryId: string): string => {
  const category = CATEGORY_OPTIONS.find(c => c.id === categoryId);
  return category?.icon || '📦';
};

const getCategoryName = (categoryId: string): string => {
  const category = CATEGORY_OPTIONS.find(c => c.id === categoryId);
  return category?.name || 'その他';
};

const getRandomImage = (): string => {
  return SAMPLE_IMAGES[Math.floor(Math.random() * SAMPLE_IMAGES.length)];
};

// ==================== SAMPLE DATA ====================
const generateSampleItems = (): WishlistItem[] => {
  const now = new Date();
  return [
    {
      id: generateId(),
      name: 'AirPods Pro 第2世代',
      price: 39800,
      imageUrl: '🎧',
      productUrl: 'https://www.apple.com/jp/airpods-pro/',
      priority: 'high',
      isPurchased: false,
      category: 'electronics',
      memo: 'ノイズキャンセリング付きでリモートワークに最適',
      createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7),
      updatedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7),
    },
    {
      id: generateId(),
      name: 'スタンディングデスク',
      price: 45000,
      imageUrl: '🖥️',
      productUrl: 'https://example.com/desk',
      priority: 'medium',
      isPurchased: false,
      category: 'home',
      memo: '高さ調節可能なもの。健康のために',
      createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14),
      updatedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14),
    },
    {
      id: generateId(),
      name: 'ランニングシューズ',
      price: 15800,
      imageUrl: '👟',
      priority: 'high',
      isPurchased: true,
      category: 'sports',
      memo: 'マラソン大会用',
      createdAt: new Date(now.getFullYear(), now.getMonth() - 1, 15),
      updatedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3),
      purchasedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3),
    },
    {
      id: generateId(),
      name: 'Kindle Paperwhite',
      price: 16980,
      imageUrl: '📖',
      productUrl: 'https://www.amazon.co.jp/kindle',
      priority: 'medium',
      isPurchased: false,
      category: 'electronics',
      createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 21),
      updatedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 21),
    },
    {
      id: generateId(),
      name: '観葉植物セット',
      price: 8500,
      imageUrl: '🌿',
      priority: 'low',
      isPurchased: false,
      category: 'home',
      memo: 'オフィスに緑を',
      createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5),
      updatedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5),
    },
    {
      id: generateId(),
      name: 'ワイヤレス充電器',
      price: 4980,
      imageUrl: '🔋',
      priority: 'low',
      isPurchased: true,
      category: 'electronics',
      createdAt: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      updatedAt: new Date(now.getFullYear(), now.getMonth() - 1, 10),
      purchasedAt: new Date(now.getFullYear(), now.getMonth() - 1, 10),
    },
    {
      id: generateId(),
      name: 'コーヒーメーカー',
      price: 25000,
      imageUrl: '☕',
      productUrl: 'https://example.com/coffee',
      priority: 'medium',
      isPurchased: false,
      category: 'home',
      memo: '全自動エスプレッソマシン',
      createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2),
      updatedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2),
    },
    {
      id: generateId(),
      name: 'Switch ゲームソフト',
      price: 7480,
      imageUrl: '🎮',
      priority: 'low',
      isPurchased: false,
      category: 'hobby',
      createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 10),
      updatedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 10),
    },
  ];
};

// ==================== COMPONENTS ====================

// Star Rating Component
const PrioritySelector: React.FC<{
  priority: Priority;
  onSelect: (priority: Priority) => void;
  size?: number;
}> = ({ priority, onSelect, size = 32 }) => {
  const priorities: Priority[] = ['low', 'medium', 'high'];
  
  return (
    <View style={styles.prioritySelector}>
      {priorities.map((p) => (
        <TouchableOpacity
          key={p}
          onPress={() => onSelect(p)}
          style={[
            styles.priorityButton,
            priority === p && { backgroundColor: PRIORITY_CONFIG[p].color + '20' },
          ]}
        >
          <Text style={{ fontSize: size * 0.6 }}>{PRIORITY_CONFIG[p].icon}</Text>
          <Text
            style={[
              styles.priorityButtonText,
              priority === p && { color: PRIORITY_CONFIG[p].color, fontWeight: 'bold' },
            ]}
          >
            {PRIORITY_CONFIG[p].label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Category Selector Component
const CategorySelector: React.FC<{
  selected: string;
  onSelect: (category: string) => void;
}> = ({ selected, onSelect }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoryScrollView}
      contentContainerStyle={styles.categoryScrollContent}
    >
      {CATEGORY_OPTIONS.map((cat) => (
        <TouchableOpacity
          key={cat.id}
          onPress={() => onSelect(cat.id)}
          style={[
            styles.categoryChip,
            selected === cat.id && styles.categoryChipSelected,
          ]}
        >
          <Text style={styles.categoryChipIcon}>{cat.icon}</Text>
          <Text
            style={[
              styles.categoryChipText,
              selected === cat.id && styles.categoryChipTextSelected,
            ]}
          >
            {cat.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

// Grid Item Card Component
const GridItemCard: React.FC<{
  item: WishlistItem;
  onPress: () => void;
  onTogglePurchased: () => void;
}> = ({ item, onPress, onTogglePurchased }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

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
    <Animated.View style={[styles.gridCard, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={styles.gridCardContent}
      >
        {/* Image Area */}
        <View style={[styles.gridImageContainer, item.isPurchased && styles.purchasedOverlay]}>
          <Text style={styles.gridImage}>{item.imageUrl || getRandomImage()}</Text>
          {item.isPurchased && (
            <View style={styles.purchasedBadge}>
              <Text style={styles.purchasedBadgeText}>✓ 購入済み</Text>
            </View>
          )}
          <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_CONFIG[item.priority].color }]}>
            <Text style={styles.priorityBadgeText}>{PRIORITY_CONFIG[item.priority].icon}</Text>
          </View>
        </View>

        {/* Info Area */}
        <View style={styles.gridInfoContainer}>
          <Text style={[styles.gridItemName, item.isPurchased && styles.purchasedText]} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.gridBottomRow}>
            <Text style={[styles.gridPrice, item.isPurchased && styles.purchasedText]}>
              {formatPrice(item.price)}
            </Text>
            <Text style={styles.gridCategory}>{getCategoryIcon(item.category)}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Quick Purchase Toggle */}
      <TouchableOpacity
        style={[styles.quickPurchaseButton, item.isPurchased && styles.quickPurchaseButtonActive]}
        onPress={onTogglePurchased}
      >
        <Text style={styles.quickPurchaseIcon}>{item.isPurchased ? '↩️' : '🛒'}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// List Item Card Component
const ListItemCard: React.FC<{
  item: WishlistItem;
  onPress: () => void;
  onTogglePurchased: () => void;
}> = ({ item, onPress, onTogglePurchased }) => {
  return (
    <TouchableOpacity
      style={[styles.listCard, item.isPurchased && styles.listCardPurchased]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.listImageContainer, item.isPurchased && styles.purchasedOverlay]}>
        <Text style={styles.listImage}>{item.imageUrl || getRandomImage()}</Text>
      </View>

      <View style={styles.listInfoContainer}>
        <View style={styles.listHeaderRow}>
          <Text style={[styles.listItemName, item.isPurchased && styles.purchasedText]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={[styles.listPriorityTag, { backgroundColor: PRIORITY_CONFIG[item.priority].color + '20' }]}>
            <Text style={{ color: PRIORITY_CONFIG[item.priority].color, fontSize: 12 }}>
              {PRIORITY_CONFIG[item.priority].icon} {PRIORITY_CONFIG[item.priority].label}
            </Text>
          </View>
        </View>

        <View style={styles.listMiddleRow}>
          <Text style={[styles.listPrice, item.isPurchased && styles.purchasedText]}>
            {formatPrice(item.price)}
          </Text>
          <Text style={styles.listCategory}>
            {getCategoryIcon(item.category)} {getCategoryName(item.category)}
          </Text>
        </View>

        {item.memo && (
          <Text style={styles.listMemo} numberOfLines={1}>
            {item.memo}
          </Text>
        )}

        <Text style={styles.listDate}>
          {item.isPurchased ? `購入日: ${formatDate(item.purchasedAt!)}` : `追加: ${formatDate(item.createdAt)}`}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.listPurchaseButton, item.isPurchased && styles.listPurchaseButtonActive]}
        onPress={onTogglePurchased}
      >
        <Text style={styles.listPurchaseIcon}>{item.isPurchased ? '↩️' : '🛒'}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

// Stats Summary Component
const StatsSummary: React.FC<{
  items: WishlistItem[];
  filter: FilterType;
}> = ({ items, filter }) => {
  const stats = useMemo(() => {
    const pending = items.filter(i => !i.isPurchased);
    const purchased = items.filter(i => i.isPurchased);
    const pendingTotal = pending.reduce((sum, i) => sum + i.price, 0);
    const purchasedTotal = purchased.reduce((sum, i) => sum + i.price, 0);
    const highPriorityCount = pending.filter(i => i.priority === 'high').length;

    return {
      totalCount: items.length,
      pendingCount: pending.length,
      purchasedCount: purchased.length,
      pendingTotal,
      purchasedTotal,
      highPriorityCount,
    };
  }, [items]);

  return (
    <View style={styles.statsContainer}>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>欲しいもの</Text>
          <Text style={styles.statValue}>{stats.pendingCount}</Text>
          <Text style={styles.statSublabel}>件</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>合計金額</Text>
          <Text style={[styles.statValue, styles.statValueLarge]}>{formatPrice(stats.pendingTotal)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>購入済み</Text>
          <Text style={styles.statValue}>{stats.purchasedCount}</Text>
          <Text style={styles.statSublabel}>件</Text>
        </View>
      </View>
      {stats.highPriorityCount > 0 && (
        <View style={styles.highPriorityAlert}>
          <Text style={styles.highPriorityAlertText}>
            🔥 高優先度のアイテムが{stats.highPriorityCount}件あります
          </Text>
        </View>
      )}
    </View>
  );
};

// Filter & Sort Bar Component
const FilterSortBar: React.FC<{
  filter: FilterType;
  sort: SortType;
  viewType: ViewType;
  onFilterChange: (filter: FilterType) => void;
  onSortChange: (sort: SortType) => void;
  onViewChange: (view: ViewType) => void;
}> = ({ filter, sort, viewType, onFilterChange, onSortChange, onViewChange }) => {
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  const filterOptions: { value: FilterType; label: string; icon: string }[] = [
    { value: 'all', label: 'すべて', icon: '📋' },
    { value: 'pending', label: '欲しいもの', icon: '🎁' },
    { value: 'purchased', label: '購入済み', icon: '✅' },
    { value: 'high', label: '高優先度', icon: '🔥' },
    { value: 'medium', label: '中優先度', icon: '⭐' },
    { value: 'low', label: '低優先度', icon: '💤' },
  ];

  const sortOptions: { value: SortType; label: string; icon: string }[] = [
    { value: 'priority', label: '優先度順', icon: '🔥' },
    { value: 'price', label: '価格順', icon: '💰' },
    { value: 'date', label: '追加日順', icon: '📅' },
    { value: 'name', label: '名前順', icon: '🔤' },
  ];

  const currentFilter = filterOptions.find(f => f.value === filter);
  const currentSort = sortOptions.find(s => s.value === sort);

  return (
    <View style={styles.filterSortBar}>
      <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
        <Text style={styles.filterButtonIcon}>{currentFilter?.icon}</Text>
        <Text style={styles.filterButtonText}>{currentFilter?.label}</Text>
        <Text style={styles.filterButtonArrow}>▼</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.sortButton} onPress={() => setShowSortModal(true)}>
        <Text style={styles.sortButtonIcon}>{currentSort?.icon}</Text>
        <Text style={styles.sortButtonText}>{currentSort?.label}</Text>
        <Text style={styles.sortButtonArrow}>▼</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.viewToggle} onPress={() => onViewChange(viewType === 'grid' ? 'list' : 'grid')}>
        <Text style={styles.viewToggleIcon}>{viewType === 'grid' ? '📋' : '🔲'}</Text>
      </TouchableOpacity>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <View style={styles.dropdownModal}>
            <Text style={styles.dropdownTitle}>フィルター</Text>
            {filterOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.dropdownOption, filter === option.value && styles.dropdownOptionSelected]}
                onPress={() => {
                  onFilterChange(option.value);
                  setShowFilterModal(false);
                }}
              >
                <Text style={styles.dropdownOptionIcon}>{option.icon}</Text>
                <Text style={[styles.dropdownOptionText, filter === option.value && styles.dropdownOptionTextSelected]}>
                  {option.label}
                </Text>
                {filter === option.value && <Text style={styles.dropdownCheckmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Sort Modal */}
      <Modal visible={showSortModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.dropdownModal}>
            <Text style={styles.dropdownTitle}>並び替え</Text>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.dropdownOption, sort === option.value && styles.dropdownOptionSelected]}
                onPress={() => {
                  onSortChange(option.value);
                  setShowSortModal(false);
                }}
              >
                <Text style={styles.dropdownOptionIcon}>{option.icon}</Text>
                <Text style={[styles.dropdownOptionText, sort === option.value && styles.dropdownOptionTextSelected]}>
                  {option.label}
                </Text>
                {sort === option.value && <Text style={styles.dropdownCheckmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// Add/Edit Item Modal Component
const ItemFormModal: React.FC<{
  visible: boolean;
  item?: WishlistItem | null;
  onClose: () => void;
  onSave: (item: Omit<WishlistItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
}> = ({ visible, item, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState('other');
  const [memo, setMemo] = useState('');

  useEffect(() => {
    if (item) {
      setName(item.name);
      setPrice(item.price.toString());
      setImageUrl(item.imageUrl || '');
      setProductUrl(item.productUrl || '');
      setPriority(item.priority);
      setCategory(item.category);
      setMemo(item.memo || '');
    } else {
      resetForm();
    }
  }, [item, visible]);

  const resetForm = () => {
    setName('');
    setPrice('');
    setImageUrl('');
    setProductUrl('');
    setPriority('medium');
    setCategory('other');
    setMemo('');
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('エラー', '商品名を入力してください');
      return;
    }
    const priceNum = parseInt(price) || 0;
    if (priceNum < 0) {
      Alert.alert('エラー', '価格は0以上で入力してください');
      return;
    }

    onSave({
      name: name.trim(),
      price: priceNum,
      imageUrl: imageUrl.trim() || getRandomImage(),
      productUrl: productUrl.trim() || undefined,
      priority,
      isPurchased: item?.isPurchased || false,
      category,
      memo: memo.trim() || undefined,
      purchasedAt: item?.purchasedAt,
    });

    resetForm();
    onClose();
  };

  const selectEmoji = () => {
    const emojis = ['🎧', '📱', '💻', '⌚', '🎮', '📷', '🖥️', '🔋', '👟', '👕', '👜', '💄', '🌿', '☕', '🍕', '📚', '✈️', '⚽', '🎁', '💎'];
    Alert.alert(
      'アイコン選択',
      '商品のアイコンを選んでください',
      emojis.map(emoji => ({
        text: emoji,
        onPress: () => setImageUrl(emoji),
      })).concat([{ text: 'キャンセル', style: 'cancel' }] as any),
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.formModalContainer}>
        <View style={styles.formModalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.formModalCancel}>キャンセル</Text>
          </TouchableOpacity>
          <Text style={styles.formModalTitle}>{item ? '編集' : '新規登録'}</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.formModalSave}>保存</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.formContent} showsVerticalScrollIndicator={false}>
          {/* Icon Selection */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>アイコン</Text>
            <TouchableOpacity style={styles.iconSelector} onPress={selectEmoji}>
              <Text style={styles.iconSelectorEmoji}>{imageUrl || '🎁'}</Text>
              <Text style={styles.iconSelectorText}>タップして変更</Text>
            </TouchableOpacity>
          </View>

          {/* Name Input */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>商品名 *</Text>
            <TextInput
              style={styles.formInput}
              value={name}
              onChangeText={setName}
              placeholder="例: AirPods Pro"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          {/* Price Input */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>価格</Text>
            <View style={styles.priceInputContainer}>
              <Text style={styles.pricePrefix}>¥</Text>
              <TextInput
                style={styles.priceInput}
                value={price}
                onChangeText={setPrice}
                placeholder="0"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* Priority */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>優先度</Text>
            <PrioritySelector priority={priority} onSelect={setPriority} />
          </View>

          {/* Category */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>カテゴリ</Text>
            <CategorySelector selected={category} onSelect={setCategory} />
          </View>

          {/* URL Input */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>商品URL（任意）</Text>
            <TextInput
              style={styles.formInput}
              value={productUrl}
              onChangeText={setProductUrl}
              placeholder="https://..."
              placeholderTextColor={COLORS.textMuted}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>

          {/* Memo Input */}
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>メモ（任意）</Text>
            <TextInput
              style={[styles.formInput, styles.memoInput]}
              value={memo}
              onChangeText={setMemo}
              placeholder="メモを入力..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// Item Detail Modal Component
const ItemDetailModal: React.FC<{
  visible: boolean;
  item: WishlistItem | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePurchased: () => void;
}> = ({ visible, item, onClose, onEdit, onDelete, onTogglePurchased }) => {
  if (!item) return null;

  const handleOpenUrl = () => {
    if (item.productUrl) {
      Linking.openURL(item.productUrl).catch(() => {
        Alert.alert('エラー', 'URLを開けませんでした');
      });
    }
  };

  const handleDelete = () => {
    Alert.alert(
      '削除確認',
      `「${item.name}」を削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: onDelete },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.detailModalContainer}>
        <View style={styles.detailModalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.detailModalClose}>閉じる</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onEdit}>
            <Text style={styles.detailModalEdit}>編集</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
          {/* Image */}
          <View style={styles.detailImageContainer}>
            <Text style={styles.detailImage}>{item.imageUrl || getRandomImage()}</Text>
            {item.isPurchased && (
              <View style={styles.detailPurchasedBadge}>
                <Text style={styles.detailPurchasedBadgeText}>✓ 購入済み</Text>
              </View>
            )}
          </View>

          {/* Name & Price */}
          <View style={styles.detailMainInfo}>
            <Text style={styles.detailName}>{item.name}</Text>
            <Text style={styles.detailPrice}>{formatPrice(item.price)}</Text>
          </View>

          {/* Priority & Category */}
          <View style={styles.detailTags}>
            <View style={[styles.detailTag, { backgroundColor: PRIORITY_CONFIG[item.priority].color + '20' }]}>
              <Text style={{ color: PRIORITY_CONFIG[item.priority].color }}>
                {PRIORITY_CONFIG[item.priority].icon} {PRIORITY_CONFIG[item.priority].label}優先度
              </Text>
            </View>
            <View style={styles.detailTag}>
              <Text style={styles.detailTagText}>
                {getCategoryIcon(item.category)} {getCategoryName(item.category)}
              </Text>
            </View>
          </View>

          {/* Memo */}
          {item.memo && (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>📝 メモ</Text>
              <Text style={styles.detailMemo}>{item.memo}</Text>
            </View>
          )}

          {/* URL */}
          {item.productUrl && (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>🔗 商品リンク</Text>
              <TouchableOpacity style={styles.detailUrlButton} onPress={handleOpenUrl}>
                <Text style={styles.detailUrlButtonText}>商品ページを開く</Text>
                <Text style={styles.detailUrlButtonIcon}>↗️</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Dates */}
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>📅 日付</Text>
            <View style={styles.detailDateRow}>
              <Text style={styles.detailDateLabel}>追加日:</Text>
              <Text style={styles.detailDateValue}>{formatDate(item.createdAt)}</Text>
            </View>
            {item.isPurchased && item.purchasedAt && (
              <View style={styles.detailDateRow}>
                <Text style={styles.detailDateLabel}>購入日:</Text>
                <Text style={styles.detailDateValue}>{formatDate(item.purchasedAt)}</Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.detailActions}>
            <TouchableOpacity
              style={[styles.detailActionButton, item.isPurchased ? styles.detailUnpurchaseButton : styles.detailPurchaseButton]}
              onPress={onTogglePurchased}
            >
              <Text style={styles.detailActionButtonIcon}>{item.isPurchased ? '↩️' : '🛒'}</Text>
              <Text style={[styles.detailActionButtonText, !item.isPurchased && { color: COLORS.white }]}>
                {item.isPurchased ? '未購入に戻す' : '購入済みにする'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.detailDeleteButton} onPress={handleDelete}>
              <Text style={styles.detailDeleteButtonIcon}>🗑️</Text>
              <Text style={styles.detailDeleteButtonText}>削除</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// ==================== MAIN SCREEN ====================
const WishlistScreen: React.FC = () => {
  const navigation = useNavigation();
  const [items, setItems] = useState<WishlistItem[]>(generateSampleItems());
  const [viewType, setViewType] = useState<ViewType>('grid');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('priority');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WishlistItem | null>(null);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);

  // Filter and Sort Items
  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.memo?.toLowerCase().includes(query) ||
        getCategoryName(item.category).toLowerCase().includes(query)
      );
    }

    // Status/Priority filter
    switch (filter) {
      case 'pending':
        result = result.filter(item => !item.isPurchased);
        break;
      case 'purchased':
        result = result.filter(item => item.isPurchased);
        break;
      case 'high':
      case 'medium':
      case 'low':
        result = result.filter(item => item.priority === filter && !item.isPurchased);
        break;
    }

    // Sort
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    switch (sort) {
      case 'priority':
        result.sort((a, b) => {
          if (a.isPurchased !== b.isPurchased) return a.isPurchased ? 1 : -1;
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
        break;
      case 'price':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'date':
        result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
        break;
    }

    return result;
  }, [items, filter, sort, searchQuery]);

  // Handlers
  const handleAddItem = useCallback(() => {
    setEditingItem(null);
    setShowFormModal(true);
  }, []);

  const handleSaveItem = useCallback((itemData: Omit<WishlistItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date();
    if (editingItem) {
      setItems(prev => prev.map(item =>
        item.id === editingItem.id
          ? { ...item, ...itemData, updatedAt: now }
          : item
      ));
    } else {
      const newItem: WishlistItem = {
        ...itemData,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      };
      setItems(prev => [newItem, ...prev]);
    }
  }, [editingItem]);

  const handleItemPress = useCallback((item: WishlistItem) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  }, []);

  const handleEditItem = useCallback(() => {
    if (selectedItem) {
      setEditingItem(selectedItem);
      setShowDetailModal(false);
      setShowFormModal(true);
    }
  }, [selectedItem]);

  const handleDeleteItem = useCallback(() => {
    if (selectedItem) {
      setItems(prev => prev.filter(item => item.id !== selectedItem.id));
      setShowDetailModal(false);
      setSelectedItem(null);
    }
  }, [selectedItem]);

  const handleTogglePurchased = useCallback((itemId: string) => {
    const now = new Date();
    setItems(prev => prev.map(item =>
      item.id === itemId
        ? {
            ...item,
            isPurchased: !item.isPurchased,
            purchasedAt: !item.isPurchased ? now : undefined,
            updatedAt: now,
          }
        : item
    ));
  }, []);

  const handleToggleSelectedPurchased = useCallback(() => {
    if (selectedItem) {
      handleTogglePurchased(selectedItem.id);
      setSelectedItem(prev => prev ? { ...prev, isPurchased: !prev.isPurchased, purchasedAt: !prev.isPurchased ? new Date() : undefined } : null);
    }
  }, [selectedItem, handleTogglePurchased]);

  // Render Grid
  const renderGridItem = useCallback(({ item }: { item: WishlistItem }) => (
    <GridItemCard
      item={item}
      onPress={() => handleItemPress(item)}
      onTogglePurchased={() => handleTogglePurchased(item.id)}
    />
  ), [handleItemPress, handleTogglePurchased]);

  // Render List
  const renderListItem = useCallback(({ item }: { item: WishlistItem }) => (
    <ListItemCard
      item={item}
      onPress={() => handleItemPress(item)}
      onTogglePurchased={() => handleTogglePurchased(item.id)}
    />
  ), [handleItemPress, handleTogglePurchased]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerEmoji}>🎁</Text>
          <Text style={styles.headerTitle}>ウィッシュリスト</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
          <Text style={styles.addButtonText}>＋</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="検索..."
            placeholderTextColor={COLORS.textMuted}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats Summary */}
      <StatsSummary items={items} filter={filter} />

      {/* Filter & Sort Bar */}
      <FilterSortBar
        filter={filter}
        sort={sort}
        viewType={viewType}
        onFilterChange={setFilter}
        onSortChange={setSort}
        onViewChange={setViewType}
      />

      {/* Item List */}
      {filteredAndSortedItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🎁</Text>
          <Text style={styles.emptyTitle}>アイテムがありません</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery ? '検索条件に一致するアイテムがありません' : '「＋」ボタンから欲しいものを追加しましょう'}
          </Text>
        </View>
      ) : viewType === 'grid' ? (
        <FlatList
          data={filteredAndSortedItems}
          renderItem={renderGridItem}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={filteredAndSortedItems}
          renderItem={renderListItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleAddItem}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      {/* Modals */}
      <ItemFormModal
        visible={showFormModal}
        item={editingItem}
        onClose={() => {
          setShowFormModal(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
      />

      <ItemDetailModal
        visible={showDetailModal}
        item={selectedItem}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedItem(null);
        }}
        onEdit={handleEditItem}
        onDelete={handleDeleteItem}
        onTogglePurchased={handleToggleSelectedPurchased}
      />
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
    color: COLORS.primary,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: COLORS.white,
    fontWeight: '300',
  },

  // Search
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  searchClear: {
    fontSize: 16,
    color: COLORS.textMuted,
    padding: 4,
  },

  // Stats
  statsContainer: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statValueLarge: {
    fontSize: 20,
  },
  statSublabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  highPriorityAlert: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  highPriorityAlertText: {
    fontSize: 14,
    color: COLORS.highPriority,
    textAlign: 'center',
  },

  // Filter & Sort
  filterSortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterButtonIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  filterButtonText: {
    fontSize: 14,
    color: COLORS.text,
  },
  filterButtonArrow: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginLeft: 4,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  sortButtonIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  sortButtonText: {
    fontSize: 14,
    color: COLORS.text,
  },
  sortButtonArrow: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginLeft: 4,
  },
  viewToggle: {
    marginLeft: 'auto',
    backgroundColor: COLORS.white,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewToggleIcon: {
    fontSize: 18,
  },

  // Modal Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownModal: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    width: SCREEN_WIDTH * 0.8,
    maxWidth: 300,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  dropdownOptionSelected: {
    backgroundColor: COLORS.primary + '10',
  },
  dropdownOptionIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  dropdownOptionText: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  dropdownOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  dropdownCheckmark: {
    fontSize: 16,
    color: COLORS.primary,
  },

  // Grid View
  gridContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  gridCard: {
    width: GRID_CARD_WIDTH,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  gridCardContent: {
    flex: 1,
  },
  gridImageContainer: {
    width: '100%',
    height: GRID_CARD_WIDTH * 0.7,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  gridImage: {
    fontSize: 48,
  },
  purchasedOverlay: {
    opacity: 0.5,
  },
  purchasedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  purchasedBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  priorityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityBadgeText: {
    fontSize: 14,
  },
  gridInfoContainer: {
    padding: 12,
  },
  gridItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    height: 36,
  },
  purchasedText: {
    color: COLORS.textMuted,
    textDecorationLine: 'line-through',
  },
  gridBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  gridCategory: {
    fontSize: 16,
  },
  quickPurchaseButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  quickPurchaseButtonActive: {
    backgroundColor: COLORS.success + '20',
    borderColor: COLORS.success,
  },
  quickPurchaseIcon: {
    fontSize: 16,
  },

  // List View
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  listCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  listCardPurchased: {
    opacity: 0.7,
  },
  listImageContainer: {
    width: 60,
    height: 60,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listImage: {
    fontSize: 32,
  },
  listInfoContainer: {
    flex: 1,
    marginLeft: 12,
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  listItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  listPriorityTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  listMiddleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  listPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginRight: 12,
  },
  listCategory: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  listMemo: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  listDate: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  listPurchaseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginLeft: 8,
  },
  listPurchaseButtonActive: {
    backgroundColor: COLORS.success + '20',
  },
  listPurchaseIcon: {
    fontSize: 18,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    fontSize: 28,
    color: COLORS.white,
    fontWeight: '300',
  },

  // Form Modal
  formModalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  formModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  formModalCancel: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  formModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  formModalSave: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  formContent: {
    flex: 1,
    padding: 16,
  },
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
  memoInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  iconSelector: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconSelectorEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  iconSelectorText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pricePrefix: {
    fontSize: 18,
    color: COLORS.text,
    paddingLeft: 16,
    fontWeight: '600',
  },
  priceInput: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 12,
    fontSize: 18,
    color: COLORS.text,
  },
  prioritySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priorityButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  priorityButtonText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  categoryScrollView: {
    marginHorizontal: -16,
  },
  categoryScrollContent: {
    paddingHorizontal: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipSelected: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  categoryChipIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  categoryChipText: {
    fontSize: 14,
    color: COLORS.text,
  },
  categoryChipTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Detail Modal
  detailModalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  detailModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailModalClose: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  detailModalEdit: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  detailContent: {
    flex: 1,
    padding: 16,
  },
  detailImageContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  detailImage: {
    fontSize: 80,
  },
  detailPurchasedBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: COLORS.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  detailPurchasedBadgeText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  detailMainInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  detailName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  detailPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  detailTags: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  detailTag: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  detailTagText: {
    fontSize: 14,
    color: COLORS.text,
  },
  detailSection: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  detailMemo: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  detailUrlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary + '10',
    borderRadius: 12,
    paddingVertical: 12,
  },
  detailUrlButtonText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  detailUrlButtonIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
  detailDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailDateLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  detailDateValue: {
    fontSize: 14,
    color: COLORS.text,
  },
  detailActions: {
    marginTop: 8,
    marginBottom: 32,
  },
  detailActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 12,
  },
  detailPurchaseButton: {
    backgroundColor: COLORS.primary,
  },
  detailUnpurchaseButton: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.textMuted,
  },
  detailActionButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  detailActionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  detailDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger + '10',
    borderRadius: 16,
    paddingVertical: 16,
  },
  detailDeleteButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  detailDeleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.danger,
  },
});

export default WishlistScreen;
