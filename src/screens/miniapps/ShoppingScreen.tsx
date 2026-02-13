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
  FlatList,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

// ==================== TYPES ====================
type ShoppingCategory = 
  | 'food' 
  | 'dairy' 
  | 'meat' 
  | 'vegetable' 
  | 'fruit'
  | 'beverage' 
  | 'snack' 
  | 'frozen'
  | 'household' 
  | 'personal' 
  | 'baby'
  | 'pet'
  | 'other';

type SortType = 'category' | 'added' | 'name' | 'store';

interface ShoppingItem {
  id: string;
  name: string;
  category: ShoppingCategory;
  quantity: number;
  unit: string;
  note?: string;
  checked: boolean;
  checkedAt?: Date;
  createdAt: Date;
  store?: string;
  price?: number;
  image?: string;
  purchaseCount: number; // よく買うもの判定用
  lastPurchased?: Date;
}

interface ShoppingList {
  id: string;
  name: string;
  items: string[]; // item IDs
  createdAt: Date;
  color: string;
  icon: string;
}

interface Store {
  id: string;
  name: string;
  icon: string;
  color: string;
}

// ==================== CONSTANTS ====================
const COLORS = {
  primary: '#FF6B35',
  primaryLight: '#FF8C5A',
  primaryDark: '#E55A2B',
  background: '#FFF5E6',
  white: '#FFFFFF',
  text: '#333333',
  textSecondary: '#666666',
  textMuted: '#999999',
  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  success: '#4CAF50',
  successLight: '#E8F5E9',
  danger: '#F44336',
  warning: '#FFC107',
  checked: '#A5D6A7',
  checkedBg: '#F1F8E9',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

const CATEGORY_CONFIG: Record<ShoppingCategory, { 
  label: string; 
  icon: string; 
  color: string;
  bgColor: string;
}> = {
  food: { label: '主食・穀物', icon: '🍚', color: '#8D6E63', bgColor: '#EFEBE9' },
  dairy: { label: '乳製品・卵', icon: '🥛', color: '#90CAF9', bgColor: '#E3F2FD' },
  meat: { label: '肉・魚', icon: '🥩', color: '#EF5350', bgColor: '#FFEBEE' },
  vegetable: { label: '野菜', icon: '🥬', color: '#66BB6A', bgColor: '#E8F5E9' },
  fruit: { label: 'フルーツ', icon: '🍎', color: '#FF7043', bgColor: '#FBE9E7' },
  beverage: { label: '飲み物', icon: '🧃', color: '#26C6DA', bgColor: '#E0F7FA' },
  snack: { label: 'お菓子', icon: '🍪', color: '#FFA726', bgColor: '#FFF3E0' },
  frozen: { label: '冷凍食品', icon: '🧊', color: '#42A5F5', bgColor: '#E3F2FD' },
  household: { label: '日用品', icon: '🧹', color: '#78909C', bgColor: '#ECEFF1' },
  personal: { label: 'パーソナルケア', icon: '🧴', color: '#AB47BC', bgColor: '#F3E5F5' },
  baby: { label: 'ベビー用品', icon: '👶', color: '#F48FB1', bgColor: '#FCE4EC' },
  pet: { label: 'ペット用品', icon: '🐾', color: '#A1887F', bgColor: '#EFEBE9' },
  other: { label: 'その他', icon: '📦', color: '#9E9E9E', bgColor: '#F5F5F5' },
};

const UNIT_OPTIONS = ['個', 'パック', '袋', '本', 'kg', 'g', 'L', 'ml', '箱', '枚', 'セット', ''];

const DEFAULT_STORES: Store[] = [
  { id: 'any', name: 'どこでも', icon: '🏪', color: '#9E9E9E' },
  { id: 'supermarket', name: 'スーパー', icon: '🛒', color: '#4CAF50' },
  { id: 'convenience', name: 'コンビニ', icon: '🏪', color: '#2196F3' },
  { id: 'drugstore', name: 'ドラッグストア', icon: '💊', color: '#9C27B0' },
  { id: 'costco', name: 'コストコ', icon: '📦', color: '#E53935' },
  { id: 'online', name: 'ネット', icon: '📱', color: '#FF9800' },
];

// よく買うものの初期データ
const FREQUENT_ITEMS: Partial<ShoppingItem>[] = [
  { name: '牛乳', category: 'dairy', unit: '本', purchaseCount: 50 },
  { name: 'パン', category: 'food', unit: '袋', purchaseCount: 45 },
  { name: '卵', category: 'dairy', unit: 'パック', purchaseCount: 40 },
  { name: 'バナナ', category: 'fruit', unit: '房', purchaseCount: 38 },
  { name: '豆腐', category: 'food', unit: '丁', purchaseCount: 35 },
  { name: 'ヨーグルト', category: 'dairy', unit: '個', purchaseCount: 33 },
  { name: '鶏むね肉', category: 'meat', unit: 'パック', purchaseCount: 30 },
  { name: 'お米', category: 'food', unit: 'kg', purchaseCount: 28 },
  { name: 'キャベツ', category: 'vegetable', unit: '玉', purchaseCount: 27 },
  { name: 'にんじん', category: 'vegetable', unit: '本', purchaseCount: 26 },
  { name: '玉ねぎ', category: 'vegetable', unit: '個', purchaseCount: 25 },
  { name: 'トマト', category: 'vegetable', unit: '個', purchaseCount: 24 },
  { name: 'じゃがいも', category: 'vegetable', unit: '個', purchaseCount: 23 },
  { name: '豚バラ肉', category: 'meat', unit: 'g', purchaseCount: 22 },
  { name: 'サーモン', category: 'meat', unit: 'パック', purchaseCount: 20 },
  { name: 'チーズ', category: 'dairy', unit: '袋', purchaseCount: 19 },
  { name: 'バター', category: 'dairy', unit: '個', purchaseCount: 18 },
  { name: 'コーヒー', category: 'beverage', unit: '袋', purchaseCount: 17 },
  { name: 'お茶', category: 'beverage', unit: '本', purchaseCount: 16 },
  { name: 'ジュース', category: 'beverage', unit: '本', purchaseCount: 15 },
  { name: 'ティッシュ', category: 'household', unit: '箱', purchaseCount: 14 },
  { name: 'トイレットペーパー', category: 'household', unit: 'パック', purchaseCount: 13 },
  { name: '洗剤', category: 'household', unit: '本', purchaseCount: 12 },
  { name: 'シャンプー', category: 'personal', unit: '本', purchaseCount: 11 },
  { name: '歯磨き粉', category: 'personal', unit: '本', purchaseCount: 10 },
  { name: 'チョコレート', category: 'snack', unit: '袋', purchaseCount: 9 },
  { name: 'ポテトチップス', category: 'snack', unit: '袋', purchaseCount: 8 },
  { name: 'アイス', category: 'frozen', unit: '個', purchaseCount: 7 },
  { name: '冷凍餃子', category: 'frozen', unit: '袋', purchaseCount: 6 },
  { name: 'ほうれん草', category: 'vegetable', unit: '袋', purchaseCount: 5 },
];

// ==================== UTILITY FUNCTIONS ====================
const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const formatDate = (date: Date): string => {
  const today = new Date();
  if (isSameDay(date, today)) return '今日';
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday)) return '昨日';
  
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
};

const isSameDay = (d1: Date, d2: Date): boolean => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

const hapticFeedback = () => {
  if (Platform.OS !== 'web') {
    Vibration.vibrate(10);
  }
};

// ==================== SAMPLE DATA ====================
const createSampleItems = (): ShoppingItem[] => {
  const now = new Date();
  return [
    {
      id: generateId(),
      name: '牛乳',
      category: 'dairy',
      quantity: 2,
      unit: '本',
      checked: false,
      createdAt: new Date(now.getTime() - 3600000),
      purchaseCount: 50,
    },
    {
      id: generateId(),
      name: '食パン',
      category: 'food',
      quantity: 1,
      unit: '袋',
      checked: false,
      createdAt: new Date(now.getTime() - 7200000),
      purchaseCount: 35,
    },
    {
      id: generateId(),
      name: '鶏むね肉',
      category: 'meat',
      quantity: 300,
      unit: 'g',
      note: '特売日に',
      checked: false,
      createdAt: new Date(now.getTime() - 10800000),
      purchaseCount: 28,
    },
    {
      id: generateId(),
      name: 'バナナ',
      category: 'fruit',
      quantity: 1,
      unit: '房',
      checked: true,
      checkedAt: new Date(now.getTime() - 1800000),
      createdAt: new Date(now.getTime() - 14400000),
      purchaseCount: 40,
    },
    {
      id: generateId(),
      name: 'キャベツ',
      category: 'vegetable',
      quantity: 1,
      unit: '玉',
      checked: false,
      createdAt: new Date(now.getTime() - 18000000),
      purchaseCount: 22,
    },
    {
      id: generateId(),
      name: 'ティッシュ',
      category: 'household',
      quantity: 1,
      unit: '箱',
      checked: false,
      createdAt: now,
      purchaseCount: 15,
      store: 'drugstore',
    },
    {
      id: generateId(),
      name: 'ヨーグルト',
      category: 'dairy',
      quantity: 4,
      unit: '個',
      checked: true,
      checkedAt: new Date(now.getTime() - 900000),
      createdAt: new Date(now.getTime() - 21600000),
      purchaseCount: 33,
    },
  ];
};

// ==================== COMPONENTS ====================

// Category Badge Component
const CategoryBadge: React.FC<{ category: ShoppingCategory; small?: boolean }> = ({ 
  category, 
  small = false 
}) => {
  const config = CATEGORY_CONFIG[category];
  return (
    <View style={[
      styles.categoryBadge, 
      { backgroundColor: config.bgColor },
      small && styles.categoryBadgeSmall
    ]}>
      <Text style={[styles.categoryIcon, small && styles.categoryIconSmall]}>
        {config.icon}
      </Text>
      {!small && (
        <Text style={[styles.categoryLabel, { color: config.color }]}>
          {config.label}
        </Text>
      )}
    </View>
  );
};

// Shopping Item Component
const ShoppingItemCard: React.FC<{
  item: ShoppingItem;
  onToggle: (id: string) => void;
  onEdit: (item: ShoppingItem) => void;
  onDelete: (id: string) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
}> = ({ item, onToggle, onEdit, onDelete, onUpdateQuantity }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const checkAnim = useRef(new Animated.Value(item.checked ? 1 : 0)).current;
  
  useEffect(() => {
    Animated.timing(checkAnim, {
      toValue: item.checked ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [item.checked]);

  const handlePress = () => {
    hapticFeedback();
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    onToggle(item.id);
  };

  const handleLongPress = () => {
    hapticFeedback();
    Alert.alert(
      item.name,
      'アクションを選択',
      [
        { text: '編集', onPress: () => onEdit(item) },
        { text: '削除', onPress: () => onDelete(item.id), style: 'destructive' },
        { text: 'キャンセル', style: 'cancel' },
      ]
    );
  };

  const bgColor = checkAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.white, COLORS.checkedBg],
  });

  const categoryConfig = CATEGORY_CONFIG[item.category];

  return (
    <Animated.View style={[
      styles.itemCard,
      { transform: [{ scale: scaleAnim }], backgroundColor: bgColor }
    ]}>
      <TouchableOpacity
        style={styles.itemContent}
        onPress={handlePress}
        onLongPress={handleLongPress}
        activeOpacity={0.7}
      >
        {/* Checkbox */}
        <TouchableOpacity 
          style={[
            styles.checkbox,
            item.checked && styles.checkboxChecked
          ]}
          onPress={handlePress}
        >
          {item.checked && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>

        {/* Category Icon */}
        <View style={[
          styles.itemCategoryIcon,
          { backgroundColor: categoryConfig.bgColor }
        ]}>
          <Text style={styles.itemCategoryEmoji}>{categoryConfig.icon}</Text>
        </View>

        {/* Item Info */}
        <View style={styles.itemInfo}>
          <Text style={[
            styles.itemName,
            item.checked && styles.itemNameChecked
          ]}>
            {item.name}
          </Text>
          {item.note && (
            <Text style={styles.itemNote}>{item.note}</Text>
          )}
          {item.store && item.store !== 'any' && (
            <View style={styles.storeTag}>
              <Text style={styles.storeTagText}>
                {DEFAULT_STORES.find(s => s.id === item.store)?.icon}{' '}
                {DEFAULT_STORES.find(s => s.id === item.store)?.name}
              </Text>
            </View>
          )}
        </View>

        {/* Quantity Controls */}
        <View style={styles.quantityContainer}>
          <TouchableOpacity 
            style={styles.quantityButton}
            onPress={() => onUpdateQuantity(item.id, -1)}
            disabled={item.quantity <= 1}
          >
            <Text style={[
              styles.quantityButtonText,
              item.quantity <= 1 && styles.quantityButtonDisabled
            ]}>−</Text>
          </TouchableOpacity>
          <Text style={styles.quantityText}>
            {item.quantity}{item.unit}
          </Text>
          <TouchableOpacity 
            style={styles.quantityButton}
            onPress={() => onUpdateQuantity(item.id, 1)}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Category Section Component
const CategorySection: React.FC<{
  category: ShoppingCategory;
  items: ShoppingItem[];
  onToggle: (id: string) => void;
  onEdit: (item: ShoppingItem) => void;
  onDelete: (id: string) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}> = ({ 
  category, 
  items, 
  onToggle, 
  onEdit, 
  onDelete, 
  onUpdateQuantity,
  collapsed = false,
  onToggleCollapse
}) => {
  const config = CATEGORY_CONFIG[category];
  const uncheckedCount = items.filter(i => !i.checked).length;
  const checkedCount = items.filter(i => i.checked).length;

  return (
    <View style={styles.categorySection}>
      <TouchableOpacity 
        style={styles.categorySectionHeader}
        onPress={onToggleCollapse}
        activeOpacity={0.7}
      >
        <View style={[styles.categoryHeaderIcon, { backgroundColor: config.bgColor }]}>
          <Text style={styles.categoryHeaderEmoji}>{config.icon}</Text>
        </View>
        <Text style={styles.categorySectionTitle}>{config.label}</Text>
        <View style={styles.categoryBadges}>
          {uncheckedCount > 0 && (
            <View style={[styles.countBadge, { backgroundColor: COLORS.primary }]}>
              <Text style={styles.countBadgeText}>{uncheckedCount}</Text>
            </View>
          )}
          {checkedCount > 0 && (
            <View style={[styles.countBadge, { backgroundColor: COLORS.success }]}>
              <Text style={styles.countBadgeText}>✓{checkedCount}</Text>
            </View>
          )}
        </View>
        <Text style={styles.collapseIcon}>{collapsed ? '▶' : '▼'}</Text>
      </TouchableOpacity>
      
      {!collapsed && items.map(item => (
        <ShoppingItemCard
          key={item.id}
          item={item}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
          onUpdateQuantity={onUpdateQuantity}
        />
      ))}
    </View>
  );
};

// Quick Add Suggestion Component
const QuickAddSuggestion: React.FC<{
  item: Partial<ShoppingItem>;
  onAdd: (item: Partial<ShoppingItem>) => void;
}> = ({ item, onAdd }) => {
  const categoryConfig = CATEGORY_CONFIG[item.category || 'other'];
  
  return (
    <TouchableOpacity 
      style={styles.suggestionChip}
      onPress={() => onAdd(item)}
      activeOpacity={0.7}
    >
      <Text style={styles.suggestionIcon}>{categoryConfig.icon}</Text>
      <Text style={styles.suggestionText}>{item.name}</Text>
      <Text style={styles.suggestionPlus}>+</Text>
    </TouchableOpacity>
  );
};

// Frequently Bought Section
const FrequentlyBoughtSection: React.FC<{
  items: Partial<ShoppingItem>[];
  currentItems: ShoppingItem[];
  onAdd: (item: Partial<ShoppingItem>) => void;
  searchQuery: string;
}> = ({ items, currentItems, onAdd, searchQuery }) => {
  const currentNames = new Set(currentItems.map(i => i.name.toLowerCase()));
  
  const filteredItems = items
    .filter(item => !currentNames.has(item.name?.toLowerCase() || ''))
    .filter(item => 
      !searchQuery || 
      item.name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => (b.purchaseCount || 0) - (a.purchaseCount || 0))
    .slice(0, 20);

  if (filteredItems.length === 0) return null;

  return (
    <View style={styles.frequentSection}>
      <Text style={styles.frequentTitle}>
        {searchQuery ? '🔍 検索結果' : '⭐ よく買うもの'}
      </Text>
      <View style={styles.suggestionGrid}>
        {filteredItems.map((item, index) => (
          <QuickAddSuggestion 
            key={`${item.name}-${index}`} 
            item={item} 
            onAdd={onAdd} 
          />
        ))}
      </View>
    </View>
  );
};

// Add/Edit Item Modal
const ItemModal: React.FC<{
  visible: boolean;
  item?: ShoppingItem | null;
  onClose: () => void;
  onSave: (item: Partial<ShoppingItem>) => void;
}> = ({ visible, item, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ShoppingCategory>('food');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('個');
  const [note, setNote] = useState('');
  const [store, setStore] = useState('any');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setCategory(item.category);
      setQuantity(item.quantity.toString());
      setUnit(item.unit);
      setNote(item.note || '');
      setStore(item.store || 'any');
    } else {
      setName('');
      setCategory('food');
      setQuantity('1');
      setUnit('個');
      setNote('');
      setStore('any');
    }
  }, [item, visible]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('エラー', '商品名を入力してください');
      return;
    }
    onSave({
      id: item?.id,
      name: name.trim(),
      category,
      quantity: parseInt(quantity) || 1,
      unit,
      note: note.trim() || undefined,
      store: store !== 'any' ? store : undefined,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalCancel}>キャンセル</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {item ? '編集' : '追加'}
          </Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.modalSave}>保存</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>商品名</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="例：牛乳"
              placeholderTextColor={COLORS.textMuted}
              autoFocus={!item}
            />
          </View>

          {/* Category Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>カテゴリ</Text>
            <TouchableOpacity 
              style={styles.categoryPickerButton}
              onPress={() => setShowCategoryPicker(true)}
            >
              <Text style={styles.categoryPickerIcon}>
                {CATEGORY_CONFIG[category].icon}
              </Text>
              <Text style={styles.categoryPickerText}>
                {CATEGORY_CONFIG[category].label}
              </Text>
              <Text style={styles.categoryPickerArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Category Picker Modal */}
          <Modal
            visible={showCategoryPicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowCategoryPicker(false)}
          >
            <TouchableOpacity 
              style={styles.categoryPickerOverlay}
              activeOpacity={1}
              onPress={() => setShowCategoryPicker(false)}
            >
              <View style={styles.categoryPickerModal}>
                <Text style={styles.categoryPickerTitle}>カテゴリを選択</Text>
                <ScrollView>
                  {(Object.keys(CATEGORY_CONFIG) as ShoppingCategory[]).map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryOption,
                        category === cat && styles.categoryOptionSelected
                      ]}
                      onPress={() => {
                        setCategory(cat);
                        setShowCategoryPicker(false);
                      }}
                    >
                      <Text style={styles.categoryOptionIcon}>
                        {CATEGORY_CONFIG[cat].icon}
                      </Text>
                      <Text style={[
                        styles.categoryOptionText,
                        category === cat && styles.categoryOptionTextSelected
                      ]}>
                        {CATEGORY_CONFIG[cat].label}
                      </Text>
                      {category === cat && (
                        <Text style={styles.categoryOptionCheck}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Quantity & Unit */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>数量</Text>
            <View style={styles.quantityRow}>
              <TextInput
                style={[styles.textInput, styles.quantityInput]}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="number-pad"
                placeholder="1"
                placeholderTextColor={COLORS.textMuted}
              />
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.unitScroll}
              >
                {UNIT_OPTIONS.map(u => (
                  <TouchableOpacity
                    key={u || 'none'}
                    style={[
                      styles.unitChip,
                      unit === u && styles.unitChipSelected
                    ]}
                    onPress={() => setUnit(u)}
                  >
                    <Text style={[
                      styles.unitChipText,
                      unit === u && styles.unitChipTextSelected
                    ]}>
                      {u || 'なし'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Store Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>購入先</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {DEFAULT_STORES.map(s => (
                <TouchableOpacity
                  key={s.id}
                  style={[
                    styles.storeChip,
                    store === s.id && styles.storeChipSelected
                  ]}
                  onPress={() => setStore(s.id)}
                >
                  <Text style={styles.storeChipIcon}>{s.icon}</Text>
                  <Text style={[
                    styles.storeChipText,
                    store === s.id && styles.storeChipTextSelected
                  ]}>
                    {s.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Note */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>メモ（任意）</Text>
            <TextInput
              style={[styles.textInput, styles.noteInput]}
              value={note}
              onChangeText={setNote}
              placeholder="例：特売の時に買う"
              placeholderTextColor={COLORS.textMuted}
              multiline
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

// ==================== MAIN COMPONENT ====================
const ShoppingScreen: React.FC = () => {
  const navigation = useNavigation();
  const [items, setItems] = useState<ShoppingItem[]>(createSampleItems);
  const [frequentItems] = useState<Partial<ShoppingItem>[]>(FREQUENT_ITEMS);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('category');
  const [showChecked, setShowChecked] = useState(true);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<ShoppingCategory>>(new Set());
  const [showFrequent, setShowFrequent] = useState(true);

  // Stats
  const stats = useMemo(() => {
    const unchecked = items.filter(i => !i.checked);
    const checked = items.filter(i => i.checked);
    return {
      total: items.length,
      unchecked: unchecked.length,
      checked: checked.length,
      categories: new Set(unchecked.map(i => i.category)).size,
    };
  }, [items]);

  // Grouped & Sorted Items
  const groupedItems = useMemo(() => {
    let filteredItems = items;
    
    // Filter by search
    if (searchQuery) {
      filteredItems = filteredItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        CATEGORY_CONFIG[item.category].label.includes(searchQuery)
      );
    }
    
    // Filter checked items
    if (!showChecked) {
      filteredItems = filteredItems.filter(item => !item.checked);
    }

    // Group by category
    const groups: Record<ShoppingCategory, ShoppingItem[]> = {} as any;
    
    filteredItems.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });

    // Sort within each group
    Object.keys(groups).forEach(cat => {
      groups[cat as ShoppingCategory].sort((a, b) => {
        // Unchecked items first
        if (a.checked !== b.checked) return a.checked ? 1 : -1;
        // Then by name
        return a.name.localeCompare(b.name, 'ja');
      });
    });

    return groups;
  }, [items, searchQuery, showChecked, sortBy]);

  // Handlers
  const handleToggleItem = useCallback((id: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          checked: !item.checked,
          checkedAt: !item.checked ? new Date() : undefined,
          purchaseCount: !item.checked ? item.purchaseCount + 1 : item.purchaseCount,
        };
      }
      return item;
    }));
  }, []);

  const handleUpdateQuantity = useCallback((id: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
    hapticFeedback();
  }, []);

  const handleDeleteItem = useCallback((id: string) => {
    Alert.alert(
      '削除確認',
      'このアイテムを削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: '削除', 
          style: 'destructive',
          onPress: () => setItems(prev => prev.filter(item => item.id !== id))
        },
      ]
    );
  }, []);

  const handleSaveItem = useCallback((itemData: Partial<ShoppingItem>) => {
    if (itemData.id) {
      // Edit existing
      setItems(prev => prev.map(item => {
        if (item.id === itemData.id) {
          return { ...item, ...itemData };
        }
        return item;
      }));
    } else {
      // Add new
      const newItem: ShoppingItem = {
        id: generateId(),
        name: itemData.name!,
        category: itemData.category || 'other',
        quantity: itemData.quantity || 1,
        unit: itemData.unit || '個',
        note: itemData.note,
        store: itemData.store,
        checked: false,
        createdAt: new Date(),
        purchaseCount: 0,
      };
      setItems(prev => [newItem, ...prev]);
    }
  }, []);

  const handleQuickAdd = useCallback((itemData: Partial<ShoppingItem>) => {
    hapticFeedback();
    const newItem: ShoppingItem = {
      id: generateId(),
      name: itemData.name!,
      category: itemData.category || 'other',
      quantity: 1,
      unit: itemData.unit || '個',
      checked: false,
      createdAt: new Date(),
      purchaseCount: itemData.purchaseCount || 0,
    };
    setItems(prev => [newItem, ...prev]);
  }, []);

  const handleClearChecked = useCallback(() => {
    const checkedCount = items.filter(i => i.checked).length;
    if (checkedCount === 0) return;
    
    Alert.alert(
      'チェック済みを削除',
      `${checkedCount}個のアイテムを削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => setItems(prev => prev.filter(item => !item.checked))
        },
      ]
    );
  }, [items]);

  const toggleCategoryCollapse = useCallback((category: ShoppingCategory) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const categoryOrder: ShoppingCategory[] = [
    'vegetable', 'fruit', 'meat', 'dairy', 'food', 
    'beverage', 'snack', 'frozen', 'household', 'personal', 'baby', 'pet', 'other'
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>🛒 買い物リスト</Text>
          <Text style={styles.headerSubtitle}>
            {stats.unchecked > 0 
              ? `残り${stats.unchecked}品 (${stats.categories}カテゴリ)`
              : '全て完了! 🎉'
            }
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => {
            Alert.alert(
              'オプション',
              '',
              [
                { 
                  text: showChecked ? 'チェック済みを隠す' : 'チェック済みを表示',
                  onPress: () => setShowChecked(!showChecked)
                },
                { 
                  text: 'チェック済みを削除',
                  onPress: handleClearChecked,
                  style: 'destructive'
                },
                { text: 'キャンセル', style: 'cancel' },
              ]
            );
          }}
        >
          <Text style={styles.menuButtonText}>⋮</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="商品を検索・追加..."
            placeholderTextColor={COLORS.textMuted}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Frequently Bought / Search Results */}
        {(showFrequent || searchQuery) && (
          <FrequentlyBoughtSection
            items={frequentItems}
            currentItems={items}
            onAdd={handleQuickAdd}
            searchQuery={searchQuery}
          />
        )}

        {/* Shopping Items by Category */}
        {categoryOrder
          .filter(cat => groupedItems[cat]?.length > 0)
          .map(category => (
            <CategorySection
              key={category}
              category={category}
              items={groupedItems[category]}
              onToggle={handleToggleItem}
              onEdit={(item) => {
                setEditingItem(item);
                setShowAddModal(true);
              }}
              onDelete={handleDeleteItem}
              onUpdateQuantity={handleUpdateQuantity}
              collapsed={collapsedCategories.has(category)}
              onToggleCollapse={() => toggleCategoryCollapse(category)}
            />
          ))
        }

        {/* Empty State */}
        {items.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🛒</Text>
            <Text style={styles.emptyTitle}>買い物リストは空です</Text>
            <Text style={styles.emptySubtitle}>
              下のボタンから商品を追加しましょう
            </Text>
          </View>
        )}

        {/* Bottom Spacer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Progress Bar */}
      {stats.total > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${(stats.checked / stats.total) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {stats.checked}/{stats.total} 完了
          </Text>
        </View>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setEditingItem(null);
          setShowAddModal(true);
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <ItemModal
        visible={showAddModal}
        item={editingItem}
        onClose={() => {
          setShowAddModal(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
      />
    </SafeAreaView>
  );
};

// ==================== STYLES ====================
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: COLORS.white,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  menuButton: {
    padding: 8,
  },
  menuButtonText: {
    fontSize: 24,
    color: COLORS.white,
  },

  // Search
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  searchBar: {
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

  // Content
  content: {
    flex: 1,
  },

  // Frequent Section
  frequentSection: {
    padding: 16,
    backgroundColor: COLORS.white,
    marginBottom: 8,
  },
  frequentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  suggestionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  suggestionIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  suggestionText: {
    fontSize: 14,
    color: COLORS.text,
  },
  suggestionPlus: {
    fontSize: 16,
    color: COLORS.primary,
    marginLeft: 6,
    fontWeight: 'bold',
  },

  // Category Section
  categorySection: {
    backgroundColor: COLORS.white,
    marginBottom: 8,
  },
  categorySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  categoryHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryHeaderEmoji: {
    fontSize: 18,
  },
  categorySectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 10,
  },
  categoryBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
  },
  collapseIcon: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: 8,
  },

  // Item Card
  itemCard: {
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  checkmark: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemCategoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  itemCategoryEmoji: {
    fontSize: 20,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: COLORS.textMuted,
  },
  itemNote: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  storeTag: {
    marginTop: 4,
  },
  storeTagText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    color: COLORS.primary,
    fontWeight: '600',
  },
  quantityButtonDisabled: {
    color: COLORS.textMuted,
  },
  quantityText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
    minWidth: 40,
    textAlign: 'center',
  },

  // Category Badge
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryIconSmall: {
    fontSize: 12,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },

  // Progress
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 4,
  },
  progressText: {
    marginLeft: 12,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
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
    color: COLORS.textMuted,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 80,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  fabText: {
    fontSize: 32,
    color: COLORS.white,
    fontWeight: '300',
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
    borderBottomColor: COLORS.borderLight,
  },
  modalCancel: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalSave: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  noteInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityInput: {
    width: 80,
    textAlign: 'center',
    marginRight: 12,
  },
  unitScroll: {
    flexGrow: 0,
  },
  unitChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  unitChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  unitChipText: {
    fontSize: 14,
    color: COLORS.text,
  },
  unitChipTextSelected: {
    color: COLORS.white,
  },
  storeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  storeChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  storeChipIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  storeChipText: {
    fontSize: 14,
    color: COLORS.text,
  },
  storeChipTextSelected: {
    color: COLORS.white,
  },
  categoryPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryPickerIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  categoryPickerText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  categoryPickerArrow: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  categoryPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryPickerModal: {
    width: SCREEN_WIDTH - 48,
    maxHeight: '70%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
  },
  categoryPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  categoryOptionSelected: {
    backgroundColor: COLORS.background,
  },
  categoryOptionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  categoryOptionText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  categoryOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  categoryOptionCheck: {
    fontSize: 18,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
});

export default ShoppingScreen;
