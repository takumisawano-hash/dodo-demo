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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

// ==================== TYPES ====================
type CardCategory = 
  | 'supermarket'
  | 'convenience'
  | 'drugstore'
  | 'restaurant'
  | 'cafe'
  | 'fashion'
  | 'electronics'
  | 'travel'
  | 'gas'
  | 'entertainment'
  | 'other';

type CodeType = 'barcode' | 'qr';

type TransactionType = 'earn' | 'redeem' | 'expire' | 'bonus' | 'adjustment';

interface PointCard {
  id: string;
  storeName: string;
  cardNumber: string;
  category: CardCategory;
  currentPoints: number;
  codeType: CodeType;
  codeData: string; // バーコードまたはQRコードのデータ
  codeImage?: string; // Base64またはURI
  color: string;
  icon: string;
  expirationDate?: Date;
  expirationRule?: string; // 例: "最終利用から1年"
  membershipLevel?: string;
  notes?: string;
  createdAt: Date;
  lastUsedAt?: Date;
  isFavorite: boolean;
}

interface PointTransaction {
  id: string;
  cardId: string;
  type: TransactionType;
  points: number;
  balance: number; // 取引後の残高
  description: string;
  date: Date;
  location?: string;
}

interface ExpiringPoints {
  cardId: string;
  points: number;
  expirationDate: Date;
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
  dangerLight: '#FFEBEE',
  warning: '#FFC107',
  warningLight: '#FFF8E1',
  shadow: 'rgba(0, 0, 0, 0.1)',
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;

const CATEGORY_CONFIG: Record<CardCategory, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}> = {
  supermarket: { label: 'スーパー', icon: '🛒', color: '#4CAF50', bgColor: '#E8F5E9' },
  convenience: { label: 'コンビニ', icon: '🏪', color: '#2196F3', bgColor: '#E3F2FD' },
  drugstore: { label: 'ドラッグストア', icon: '💊', color: '#9C27B0', bgColor: '#F3E5F5' },
  restaurant: { label: 'レストラン', icon: '🍽️', color: '#FF5722', bgColor: '#FBE9E7' },
  cafe: { label: 'カフェ', icon: '☕', color: '#795548', bgColor: '#EFEBE9' },
  fashion: { label: 'ファッション', icon: '👗', color: '#E91E63', bgColor: '#FCE4EC' },
  electronics: { label: '家電', icon: '📱', color: '#607D8B', bgColor: '#ECEFF1' },
  travel: { label: '旅行・交通', icon: '✈️', color: '#00BCD4', bgColor: '#E0F7FA' },
  gas: { label: 'ガソリン', icon: '⛽', color: '#FF9800', bgColor: '#FFF3E0' },
  entertainment: { label: 'エンタメ', icon: '🎬', color: '#673AB7', bgColor: '#EDE7F6' },
  other: { label: 'その他', icon: '💳', color: '#9E9E9E', bgColor: '#F5F5F5' },
};

const CARD_COLORS = [
  '#FF6B35', '#4CAF50', '#2196F3', '#9C27B0', '#E91E63',
  '#00BCD4', '#FF9800', '#795548', '#607D8B', '#673AB7',
  '#F44336', '#3F51B5', '#009688', '#FFEB3B', '#8BC34A',
];

const TRANSACTION_CONFIG: Record<TransactionType, {
  label: string;
  icon: string;
  color: string;
}> = {
  earn: { label: '獲得', icon: '➕', color: '#4CAF50' },
  redeem: { label: '使用', icon: '➖', color: '#F44336' },
  expire: { label: '失効', icon: '⏰', color: '#9E9E9E' },
  bonus: { label: 'ボーナス', icon: '🎁', color: '#FF9800' },
  adjustment: { label: '調整', icon: '🔄', color: '#2196F3' },
};

// ==================== SAMPLE DATA ====================
const SAMPLE_CARDS: PointCard[] = [
  {
    id: '1',
    storeName: 'Tポイント',
    cardNumber: '1234-5678-9012-3456',
    category: 'convenience',
    currentPoints: 2543,
    codeType: 'barcode',
    codeData: '1234567890123',
    color: '#007ACC',
    icon: '🔵',
    expirationDate: new Date('2025-03-31'),
    expirationRule: '最終利用から1年',
    membershipLevel: 'ゴールド',
    createdAt: new Date('2023-01-15'),
    lastUsedAt: new Date('2024-02-10'),
    isFavorite: true,
  },
  {
    id: '2',
    storeName: '楽天ポイント',
    cardNumber: '9876-5432-1098-7654',
    category: 'other',
    currentPoints: 15680,
    codeType: 'qr',
    codeData: 'RAKUTEN:9876543210987654',
    color: '#BF0000',
    icon: '🔴',
    expirationDate: new Date('2024-06-30'),
    expirationRule: '最終獲得から1年',
    membershipLevel: 'ダイヤモンド',
    createdAt: new Date('2022-05-20'),
    lastUsedAt: new Date('2024-02-12'),
    isFavorite: true,
  },
  {
    id: '3',
    storeName: 'マツキヨポイント',
    cardNumber: '5555-4444-3333-2222',
    category: 'drugstore',
    currentPoints: 890,
    codeType: 'barcode',
    codeData: '5555444433332222',
    color: '#FF1493',
    icon: '💗',
    expirationDate: new Date('2024-12-31'),
    createdAt: new Date('2023-06-01'),
    lastUsedAt: new Date('2024-01-28'),
    isFavorite: false,
  },
  {
    id: '4',
    storeName: 'スタバリワード',
    cardNumber: 'STARBUCKS-001234',
    category: 'cafe',
    currentPoints: 125,
    codeType: 'qr',
    codeData: 'STARBUCKS:001234',
    color: '#00704A',
    icon: '☕',
    membershipLevel: 'グリーン',
    notes: '50スターでドリンク1杯無料',
    createdAt: new Date('2023-09-10'),
    lastUsedAt: new Date('2024-02-08'),
    isFavorite: true,
  },
  {
    id: '5',
    storeName: 'ヨドバシゴールドポイント',
    cardNumber: 'YODOBASHI-9999-8888',
    category: 'electronics',
    currentPoints: 45230,
    codeType: 'barcode',
    codeData: '99998888777766',
    color: '#E60012',
    icon: '📷',
    expirationDate: new Date('2025-12-31'),
    expirationRule: '最終利用から2年',
    membershipLevel: 'プラチナ',
    createdAt: new Date('2021-03-15'),
    lastUsedAt: new Date('2024-02-01'),
    isFavorite: false,
  },
];

const SAMPLE_TRANSACTIONS: PointTransaction[] = [
  { id: 't1', cardId: '1', type: 'earn', points: 150, balance: 2543, description: 'ファミリーマート 新宿店', date: new Date('2024-02-10'), location: '新宿' },
  { id: 't2', cardId: '1', type: 'redeem', points: -500, balance: 2393, description: 'ENEOS セルフ渋谷', date: new Date('2024-02-05'), location: '渋谷' },
  { id: 't3', cardId: '2', type: 'bonus', points: 1000, balance: 15680, description: 'お買い物マラソン達成ボーナス', date: new Date('2024-02-12') },
  { id: 't4', cardId: '2', type: 'earn', points: 2500, balance: 14680, description: '楽天市場での購入', date: new Date('2024-02-11') },
  { id: 't5', cardId: '3', type: 'earn', points: 89, balance: 890, description: 'マツモトキヨシ 池袋東口店', date: new Date('2024-01-28'), location: '池袋' },
  { id: 't6', cardId: '4', type: 'earn', points: 25, balance: 125, description: 'スターバックス 表参道店', date: new Date('2024-02-08'), location: '表参道' },
  { id: 't7', cardId: '5', type: 'earn', points: 4523, balance: 45230, description: 'ヨドバシカメラ秋葉原 カメラ購入', date: new Date('2024-02-01'), location: '秋葉原' },
  { id: 't8', cardId: '1', type: 'expire', points: -200, balance: 2893, description: '有効期限切れ', date: new Date('2024-01-31') },
];

// ==================== COMPONENTS ====================

// バーコード描画コンポーネント
const BarcodeDisplay: React.FC<{ data: string; width?: number; height?: number }> = ({
  data,
  width = 280,
  height = 80,
}) => {
  // シンプルなバーコードビジュアル表示
  const bars = useMemo(() => {
    const result: { width: number; filled: boolean }[] = [];
    const chars = data.split('');
    
    // スタートガード
    result.push({ width: 2, filled: true });
    result.push({ width: 2, filled: false });
    result.push({ width: 2, filled: true });
    
    // データバー
    chars.forEach((char, index) => {
      const code = char.charCodeAt(0);
      result.push({ width: 1 + (code % 3), filled: true });
      result.push({ width: 1 + ((code >> 2) % 3), filled: false });
      result.push({ width: 1 + ((code >> 4) % 2), filled: true });
      result.push({ width: 1 + ((code >> 1) % 2), filled: false });
    });
    
    // エンドガード
    result.push({ width: 2, filled: true });
    result.push({ width: 2, filled: false });
    result.push({ width: 2, filled: true });
    
    return result;
  }, [data]);

  const totalWidth = bars.reduce((sum, bar) => sum + bar.width, 0);
  const scale = width / totalWidth;

  return (
    <View style={[styles.barcodeContainer, { width, height: height + 30 }]}>
      <View style={[styles.barcodeInner, { height }]}>
        {bars.map((bar, index) => (
          <View
            key={index}
            style={{
              width: bar.width * scale,
              height: '100%',
              backgroundColor: bar.filled ? '#000000' : '#FFFFFF',
            }}
          />
        ))}
      </View>
      <Text style={styles.barcodeText}>{data}</Text>
    </View>
  );
};

// QRコード描画コンポーネント
const QRCodeDisplay: React.FC<{ data: string; size?: number }> = ({
  data,
  size = 200,
}) => {
  // シンプルなQRコードビジュアル
  const matrix = useMemo(() => {
    const gridSize = 21;
    const grid: boolean[][] = Array(gridSize).fill(null).map(() => 
      Array(gridSize).fill(false)
    );
    
    // ファインダーパターン（角の四角）
    const drawFinder = (startX: number, startY: number) => {
      for (let x = 0; x < 7; x++) {
        for (let y = 0; y < 7; y++) {
          const isOuter = x === 0 || x === 6 || y === 0 || y === 6;
          const isInner = x >= 2 && x <= 4 && y >= 2 && y <= 4;
          grid[startY + y][startX + x] = isOuter || isInner;
        }
      }
    };
    
    drawFinder(0, 0);
    drawFinder(14, 0);
    drawFinder(0, 14);
    
    // データパターン（擬似的）
    let charIndex = 0;
    for (let y = 8; y < gridSize - 1; y++) {
      for (let x = 8; x < gridSize - 1; x++) {
        if (data.length > 0) {
          const code = data.charCodeAt(charIndex % data.length);
          grid[y][x] = ((code + x + y) % 3) === 0;
          charIndex++;
        }
      }
    }
    
    return grid;
  }, [data]);

  const cellSize = size / 21;

  return (
    <View style={[styles.qrContainer, { width: size, height: size }]}>
      {matrix.map((row, y) => (
        <View key={y} style={styles.qrRow}>
          {row.map((cell, x) => (
            <View
              key={x}
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: cell ? '#000000' : '#FFFFFF',
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
};

// ポイントカード表示コンポーネント
const PointCardItem: React.FC<{
  card: PointCard;
  onPress: () => void;
  onLongPress: () => void;
}> = ({ card, onPress, onLongPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isExpiringSoon = card.expirationDate && 
    new Date(card.expirationDate).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
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
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.cardContainer,
          { backgroundColor: card.color },
          isExpiringSoon && styles.cardExpiringSoon,
        ]}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        {/* カード上部 */}
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardIcon}>{card.icon}</Text>
            <Text style={styles.cardStoreName}>{card.storeName}</Text>
            {card.isFavorite && <Text style={styles.favoriteIcon}>⭐</Text>}
          </View>
          {card.membershipLevel && (
            <View style={styles.membershipBadge}>
              <Text style={styles.membershipText}>{card.membershipLevel}</Text>
            </View>
          )}
        </View>

        {/* ポイント表示 */}
        <View style={styles.cardPointsContainer}>
          <Text style={styles.cardPointsLabel}>ポイント</Text>
          <Text style={styles.cardPointsValue}>
            {card.currentPoints.toLocaleString()}
            <Text style={styles.cardPointsUnit}> pt</Text>
          </Text>
        </View>

        {/* カード下部 */}
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.cardNumber}>{card.cardNumber}</Text>
            <View style={styles.cardCategory}>
              <Text style={styles.cardCategoryText}>
                {CATEGORY_CONFIG[card.category].icon} {CATEGORY_CONFIG[card.category].label}
              </Text>
            </View>
          </View>
          {card.expirationDate && (
            <View style={[
              styles.expirationBadge,
              isExpiringSoon && styles.expirationBadgeWarning,
            ]}>
              <Text style={[
                styles.expirationText,
                isExpiringSoon && styles.expirationTextWarning,
              ]}>
                {isExpiringSoon ? '⚠️ ' : ''}
                有効期限: {new Date(card.expirationDate).toLocaleDateString('ja-JP')}
              </Text>
            </View>
          )}
        </View>

        {/* デコレーション */}
        <View style={styles.cardDecoration} />
      </TouchableOpacity>
    </Animated.View>
  );
};

// 取引履歴アイテム
const TransactionItem: React.FC<{ transaction: PointTransaction; card: PointCard }> = ({
  transaction,
  card,
}) => {
  const config = TRANSACTION_CONFIG[transaction.type];
  const isPositive = transaction.points > 0;

  return (
    <View style={styles.transactionItem}>
      <View style={[styles.transactionIcon, { backgroundColor: `${config.color}20` }]}>
        <Text style={styles.transactionIconText}>{config.icon}</Text>
      </View>
      <View style={styles.transactionContent}>
        <View style={styles.transactionHeader}>
          <Text style={styles.transactionDescription} numberOfLines={1}>
            {transaction.description}
          </Text>
          <Text style={[
            styles.transactionPoints,
            { color: isPositive ? COLORS.success : COLORS.danger },
          ]}>
            {isPositive ? '+' : ''}{transaction.points.toLocaleString()} pt
          </Text>
        </View>
        <View style={styles.transactionFooter}>
          <Text style={styles.transactionDate}>
            {new Date(transaction.date).toLocaleDateString('ja-JP')}
          </Text>
          {transaction.location && (
            <Text style={styles.transactionLocation}>📍 {transaction.location}</Text>
          )}
          <Text style={styles.transactionBalance}>
            残高: {transaction.balance.toLocaleString()} pt
          </Text>
        </View>
      </View>
    </View>
  );
};

// ==================== MAIN COMPONENT ====================
export default function PointsScreen() {
  const navigation = useNavigation();
  
  // State
  const [cards, setCards] = useState<PointCard[]>(SAMPLE_CARDS);
  const [transactions, setTransactions] = useState<PointTransaction[]>(SAMPLE_TRANSACTIONS);
  const [selectedCard, setSelectedCard] = useState<PointCard | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'cards' | 'history' | 'expiring'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CardCategory | 'all'>('all');
  
  // Add/Edit form state
  const [formData, setFormData] = useState({
    storeName: '',
    cardNumber: '',
    category: 'other' as CardCategory,
    currentPoints: '',
    codeType: 'barcode' as CodeType,
    codeData: '',
    color: CARD_COLORS[0],
    icon: '💳',
    expirationDate: '',
    expirationRule: '',
    membershipLevel: '',
    notes: '',
  });

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Computed values
  const totalPoints = useMemo(() => 
    cards.reduce((sum, card) => sum + card.currentPoints, 0),
    [cards]
  );

  const expiringCards = useMemo(() => 
    cards.filter(card => {
      if (!card.expirationDate) return false;
      const daysUntilExpiration = Math.ceil(
        (new Date(card.expirationDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      );
      return daysUntilExpiration > 0 && daysUntilExpiration <= 60;
    }).sort((a, b) => 
      new Date(a.expirationDate!).getTime() - new Date(b.expirationDate!).getTime()
    ),
    [cards]
  );

  const filteredCards = useMemo(() => {
    let result = cards;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(card =>
        card.storeName.toLowerCase().includes(query) ||
        card.cardNumber.toLowerCase().includes(query)
      );
    }
    
    if (selectedCategory !== 'all') {
      result = result.filter(card => card.category === selectedCategory);
    }
    
    // お気に入りを上に
    return result.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return (b.lastUsedAt?.getTime() || 0) - (a.lastUsedAt?.getTime() || 0);
    });
  }, [cards, searchQuery, selectedCategory]);

  const cardTransactions = useMemo(() => {
    if (!selectedCard) return [];
    return transactions
      .filter(t => t.cardId === selectedCard.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedCard, transactions]);

  // Handlers
  const handleAddCard = useCallback(() => {
    if (!formData.storeName.trim() || !formData.cardNumber.trim()) {
      Alert.alert('入力エラー', '店舗名とカード番号は必須です');
      return;
    }

    const newCard: PointCard = {
      id: Date.now().toString(),
      storeName: formData.storeName.trim(),
      cardNumber: formData.cardNumber.trim(),
      category: formData.category,
      currentPoints: parseInt(formData.currentPoints) || 0,
      codeType: formData.codeType,
      codeData: formData.codeData || formData.cardNumber.replace(/-/g, ''),
      color: formData.color,
      icon: formData.icon,
      expirationDate: formData.expirationDate ? new Date(formData.expirationDate) : undefined,
      expirationRule: formData.expirationRule || undefined,
      membershipLevel: formData.membershipLevel || undefined,
      notes: formData.notes || undefined,
      createdAt: new Date(),
      isFavorite: false,
    };

    setCards(prev => [newCard, ...prev]);
    setShowAddModal(false);
    resetForm();
    Vibration.vibrate(50);
  }, [formData]);

  const handleUpdateCard = useCallback(() => {
    if (!selectedCard || !formData.storeName.trim() || !formData.cardNumber.trim()) {
      Alert.alert('入力エラー', '店舗名とカード番号は必須です');
      return;
    }

    setCards(prev => prev.map(card => {
      if (card.id !== selectedCard.id) return card;
      return {
        ...card,
        storeName: formData.storeName.trim(),
        cardNumber: formData.cardNumber.trim(),
        category: formData.category,
        currentPoints: parseInt(formData.currentPoints) || 0,
        codeType: formData.codeType,
        codeData: formData.codeData || formData.cardNumber.replace(/-/g, ''),
        color: formData.color,
        icon: formData.icon,
        expirationDate: formData.expirationDate ? new Date(formData.expirationDate) : undefined,
        expirationRule: formData.expirationRule || undefined,
        membershipLevel: formData.membershipLevel || undefined,
        notes: formData.notes || undefined,
      };
    }));

    setShowEditModal(false);
    setSelectedCard(null);
    resetForm();
  }, [selectedCard, formData]);

  const handleDeleteCard = useCallback((card: PointCard) => {
    Alert.alert(
      'カードを削除',
      `「${card.storeName}」を削除しますか？\n削除すると履歴も消去されます。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            setCards(prev => prev.filter(c => c.id !== card.id));
            setTransactions(prev => prev.filter(t => t.cardId !== card.id));
            Vibration.vibrate(100);
          },
        },
      ]
    );
  }, []);

  const handleToggleFavorite = useCallback((cardId: string) => {
    setCards(prev => prev.map(card => {
      if (card.id !== cardId) return card;
      return { ...card, isFavorite: !card.isFavorite };
    }));
    Vibration.vibrate(30);
  }, []);

  const handleAddPoints = useCallback((card: PointCard) => {
    Alert.prompt(
      'ポイント追加',
      `${card.storeName}に追加するポイント数を入力`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '追加',
          onPress: (value) => {
            const points = parseInt(value || '0');
            if (points <= 0) return;
            
            const newBalance = card.currentPoints + points;
            setCards(prev => prev.map(c => 
              c.id === card.id 
                ? { ...c, currentPoints: newBalance, lastUsedAt: new Date() }
                : c
            ));
            
            const newTransaction: PointTransaction = {
              id: Date.now().toString(),
              cardId: card.id,
              type: 'earn',
              points,
              balance: newBalance,
              description: '手動追加',
              date: new Date(),
            };
            setTransactions(prev => [newTransaction, ...prev]);
            Vibration.vibrate(50);
          },
        },
      ],
      'plain-text',
      '',
      'number-pad'
    );
  }, []);

  const handleUsePoints = useCallback((card: PointCard) => {
    Alert.prompt(
      'ポイント使用',
      `${card.storeName}から使用するポイント数を入力\n(残高: ${card.currentPoints.toLocaleString()} pt)`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '使用',
          onPress: (value) => {
            const points = parseInt(value || '0');
            if (points <= 0 || points > card.currentPoints) {
              Alert.alert('エラー', 'ポイントが不足しています');
              return;
            }
            
            const newBalance = card.currentPoints - points;
            setCards(prev => prev.map(c => 
              c.id === card.id 
                ? { ...c, currentPoints: newBalance, lastUsedAt: new Date() }
                : c
            ));
            
            const newTransaction: PointTransaction = {
              id: Date.now().toString(),
              cardId: card.id,
              type: 'redeem',
              points: -points,
              balance: newBalance,
              description: '手動使用',
              date: new Date(),
            };
            setTransactions(prev => [newTransaction, ...prev]);
            Vibration.vibrate(50);
          },
        },
      ],
      'plain-text',
      '',
      'number-pad'
    );
  }, []);

  const resetForm = () => {
    setFormData({
      storeName: '',
      cardNumber: '',
      category: 'other',
      currentPoints: '',
      codeType: 'barcode',
      codeData: '',
      color: CARD_COLORS[0],
      icon: '💳',
      expirationDate: '',
      expirationRule: '',
      membershipLevel: '',
      notes: '',
    });
  };

  const openEditModal = (card: PointCard) => {
    setSelectedCard(card);
    setFormData({
      storeName: card.storeName,
      cardNumber: card.cardNumber,
      category: card.category,
      currentPoints: card.currentPoints.toString(),
      codeType: card.codeType,
      codeData: card.codeData,
      color: card.color,
      icon: card.icon,
      expirationDate: card.expirationDate 
        ? new Date(card.expirationDate).toISOString().split('T')[0]
        : '',
      expirationRule: card.expirationRule || '',
      membershipLevel: card.membershipLevel || '',
      notes: card.notes || '',
    });
    setShowEditModal(true);
  };

  const showCardCode = (card: PointCard) => {
    setSelectedCard(card);
    setShowCodeModal(true);
    
    // 最終使用日を更新
    setCards(prev => prev.map(c => 
      c.id === card.id ? { ...c, lastUsedAt: new Date() } : c
    ));
  };

  const showCardHistory = (card: PointCard) => {
    setSelectedCard(card);
    setShowHistoryModal(true);
  };

  // Render
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
        <Text style={styles.headerTitle}>💳 ポイントカード</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>＋</Text>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <Animated.View 
        style={[
          styles.summaryContainer,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>合計ポイント</Text>
          <Text style={styles.summaryValue}>
            {totalPoints.toLocaleString()}
            <Text style={styles.summaryUnit}> pt</Text>
          </Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatValue}>{cards.length}</Text>
              <Text style={styles.summaryStatLabel}>カード数</Text>
            </View>
            <View style={styles.summaryStatDivider} />
            <View style={styles.summaryStatItem}>
              <Text style={[
                styles.summaryStatValue,
                expiringCards.length > 0 && { color: COLORS.warning },
              ]}>
                {expiringCards.length}
              </Text>
              <Text style={styles.summaryStatLabel}>期限注意</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {[
          { key: 'cards', label: 'カード一覧', icon: '💳' },
          { key: 'history', label: '履歴', icon: '📊' },
          { key: 'expiring', label: '期限注意', icon: '⚠️' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && styles.tabActive,
            ]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab.key && styles.tabTextActive,
            ]}>
              {tab.icon} {tab.label}
            </Text>
            {tab.key === 'expiring' && expiringCards.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{expiringCards.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'cards' && (
          <>
            {/* Search */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="🔍 カード検索..."
                placeholderTextColor={COLORS.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Category Filter */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.categoryFilter}
            >
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  selectedCategory === 'all' && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory('all')}
              >
                <Text style={[
                  styles.categoryChipText,
                  selectedCategory === 'all' && styles.categoryChipTextActive,
                ]}>
                  すべて
                </Text>
              </TouchableOpacity>
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.categoryChip,
                    selectedCategory === key && styles.categoryChipActive,
                  ]}
                  onPress={() => setSelectedCategory(key as CardCategory)}
                >
                  <Text style={[
                    styles.categoryChipText,
                    selectedCategory === key && styles.categoryChipTextActive,
                  ]}>
                    {config.icon} {config.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Cards List */}
            {filteredCards.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>💳</Text>
                <Text style={styles.emptyStateText}>
                  {searchQuery ? '検索結果がありません' : 'カードを登録しましょう'}
                </Text>
                {!searchQuery && (
                  <TouchableOpacity
                    style={styles.emptyStateButton}
                    onPress={() => setShowAddModal(true)}
                  >
                    <Text style={styles.emptyStateButtonText}>＋ カードを追加</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.cardsList}>
                {filteredCards.map(card => (
                  <PointCardItem
                    key={card.id}
                    card={card}
                    onPress={() => showCardCode(card)}
                    onLongPress={() => {
                      Vibration.vibrate(50);
                      Alert.alert(
                        card.storeName,
                        `ポイント: ${card.currentPoints.toLocaleString()} pt`,
                        [
                          { text: '閉じる', style: 'cancel' },
                          { text: '履歴', onPress: () => showCardHistory(card) },
                          { text: '編集', onPress: () => openEditModal(card) },
                          { text: card.isFavorite ? 'お気に入り解除' : 'お気に入り', 
                            onPress: () => handleToggleFavorite(card.id) },
                          { text: 'ポイント追加', onPress: () => handleAddPoints(card) },
                          { text: 'ポイント使用', onPress: () => handleUsePoints(card) },
                          { text: '削除', style: 'destructive', 
                            onPress: () => handleDeleteCard(card) },
                        ]
                      );
                    }}
                  />
                ))}
              </View>
            )}
          </>
        )}

        {activeTab === 'history' && (
          <View style={styles.historyContainer}>
            <Text style={styles.sectionTitle}>📊 最近の取引履歴</Text>
            {transactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>📝</Text>
                <Text style={styles.emptyStateText}>履歴がありません</Text>
              </View>
            ) : (
              transactions.slice(0, 20).map(transaction => {
                const card = cards.find(c => c.id === transaction.cardId);
                if (!card) return null;
                return (
                  <TransactionItem 
                    key={transaction.id} 
                    transaction={transaction}
                    card={card}
                  />
                );
              })
            )}
          </View>
        )}

        {activeTab === 'expiring' && (
          <View style={styles.expiringContainer}>
            <Text style={styles.sectionTitle}>⚠️ 有効期限が近いカード</Text>
            {expiringCards.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>✅</Text>
                <Text style={styles.emptyStateText}>期限の近いカードはありません</Text>
              </View>
            ) : (
              expiringCards.map(card => {
                const daysUntil = Math.ceil(
                  (new Date(card.expirationDate!).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
                );
                return (
                  <TouchableOpacity
                    key={card.id}
                    style={styles.expiringCard}
                    onPress={() => showCardCode(card)}
                  >
                    <View style={styles.expiringCardHeader}>
                      <Text style={styles.expiringCardIcon}>{card.icon}</Text>
                      <View style={styles.expiringCardInfo}>
                        <Text style={styles.expiringCardName}>{card.storeName}</Text>
                        <Text style={styles.expiringCardPoints}>
                          {card.currentPoints.toLocaleString()} pt
                        </Text>
                      </View>
                      <View style={[
                        styles.expiringBadge,
                        daysUntil <= 7 && styles.expiringBadgeCritical,
                      ]}>
                        <Text style={[
                          styles.expiringBadgeText,
                          daysUntil <= 7 && styles.expiringBadgeTextCritical,
                        ]}>
                          {daysUntil <= 7 ? '🔥 ' : ''}
                          あと{daysUntil}日
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.expiringCardDate}>
                      有効期限: {new Date(card.expirationDate!).toLocaleDateString('ja-JP')}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Add Card Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💳 カードを追加</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Store Name */}
              <Text style={styles.inputLabel}>店舗名 *</Text>
              <TextInput
                style={styles.input}
                placeholder="例: Tポイント"
                placeholderTextColor={COLORS.textMuted}
                value={formData.storeName}
                onChangeText={(text) => setFormData(prev => ({ ...prev, storeName: text }))}
              />

              {/* Card Number */}
              <Text style={styles.inputLabel}>カード番号 *</Text>
              <TextInput
                style={styles.input}
                placeholder="例: 1234-5678-9012-3456"
                placeholderTextColor={COLORS.textMuted}
                value={formData.cardNumber}
                onChangeText={(text) => setFormData(prev => ({ ...prev, cardNumber: text }))}
              />

              {/* Category */}
              <Text style={styles.inputLabel}>カテゴリ</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categorySelector}>
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.categorySelectorItem,
                        formData.category === key && styles.categorySelectorItemActive,
                      ]}
                      onPress={() => setFormData(prev => ({ 
                        ...prev, 
                        category: key as CardCategory,
                        icon: config.icon,
                      }))}
                    >
                      <Text style={styles.categorySelectorIcon}>{config.icon}</Text>
                      <Text style={[
                        styles.categorySelectorText,
                        formData.category === key && styles.categorySelectorTextActive,
                      ]}>
                        {config.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Points */}
              <Text style={styles.inputLabel}>現在のポイント</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
                value={formData.currentPoints}
                onChangeText={(text) => setFormData(prev => ({ ...prev, currentPoints: text }))}
              />

              {/* Code Type */}
              <Text style={styles.inputLabel}>コードタイプ</Text>
              <View style={styles.codeTypeSelector}>
                <TouchableOpacity
                  style={[
                    styles.codeTypeButton,
                    formData.codeType === 'barcode' && styles.codeTypeButtonActive,
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, codeType: 'barcode' }))}
                >
                  <Text style={styles.codeTypeIcon}>|||</Text>
                  <Text style={[
                    styles.codeTypeText,
                    formData.codeType === 'barcode' && styles.codeTypeTextActive,
                  ]}>バーコード</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.codeTypeButton,
                    formData.codeType === 'qr' && styles.codeTypeButtonActive,
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, codeType: 'qr' }))}
                >
                  <Text style={styles.codeTypeIcon}>⊞</Text>
                  <Text style={[
                    styles.codeTypeText,
                    formData.codeType === 'qr' && styles.codeTypeTextActive,
                  ]}>QRコード</Text>
                </TouchableOpacity>
              </View>

              {/* Code Data */}
              <Text style={styles.inputLabel}>コードデータ（空欄ならカード番号を使用）</Text>
              <TextInput
                style={styles.input}
                placeholder="スキャン用データ"
                placeholderTextColor={COLORS.textMuted}
                value={formData.codeData}
                onChangeText={(text) => setFormData(prev => ({ ...prev, codeData: text }))}
              />

              {/* Color */}
              <Text style={styles.inputLabel}>カードカラー</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.colorSelector}>
                  {CARD_COLORS.map(color => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorItem,
                        { backgroundColor: color },
                        formData.color === color && styles.colorItemActive,
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, color }))}
                    >
                      {formData.color === color && (
                        <Text style={styles.colorItemCheck}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Expiration Date */}
              <Text style={styles.inputLabel}>有効期限（任意）</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.textMuted}
                value={formData.expirationDate}
                onChangeText={(text) => setFormData(prev => ({ ...prev, expirationDate: text }))}
              />

              {/* Expiration Rule */}
              <Text style={styles.inputLabel}>有効期限ルール（任意）</Text>
              <TextInput
                style={styles.input}
                placeholder="例: 最終利用から1年"
                placeholderTextColor={COLORS.textMuted}
                value={formData.expirationRule}
                onChangeText={(text) => setFormData(prev => ({ ...prev, expirationRule: text }))}
              />

              {/* Membership Level */}
              <Text style={styles.inputLabel}>会員ランク（任意）</Text>
              <TextInput
                style={styles.input}
                placeholder="例: ゴールド"
                placeholderTextColor={COLORS.textMuted}
                value={formData.membershipLevel}
                onChangeText={(text) => setFormData(prev => ({ ...prev, membershipLevel: text }))}
              />

              {/* Notes */}
              <Text style={styles.inputLabel}>メモ（任意）</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="その他の情報"
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={3}
                value={formData.notes}
                onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
              >
                <Text style={styles.cancelButtonText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddCard}
              >
                <Text style={styles.saveButtonText}>追加</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Card Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ カードを編集</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Same form fields as Add Modal */}
              <Text style={styles.inputLabel}>店舗名 *</Text>
              <TextInput
                style={styles.input}
                value={formData.storeName}
                onChangeText={(text) => setFormData(prev => ({ ...prev, storeName: text }))}
              />

              <Text style={styles.inputLabel}>カード番号 *</Text>
              <TextInput
                style={styles.input}
                value={formData.cardNumber}
                onChangeText={(text) => setFormData(prev => ({ ...prev, cardNumber: text }))}
              />

              <Text style={styles.inputLabel}>カテゴリ</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categorySelector}>
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.categorySelectorItem,
                        formData.category === key && styles.categorySelectorItemActive,
                      ]}
                      onPress={() => setFormData(prev => ({ 
                        ...prev, 
                        category: key as CardCategory,
                        icon: config.icon,
                      }))}
                    >
                      <Text style={styles.categorySelectorIcon}>{config.icon}</Text>
                      <Text style={[
                        styles.categorySelectorText,
                        formData.category === key && styles.categorySelectorTextActive,
                      ]}>
                        {config.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.inputLabel}>現在のポイント</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={formData.currentPoints}
                onChangeText={(text) => setFormData(prev => ({ ...prev, currentPoints: text }))}
              />

              <Text style={styles.inputLabel}>コードタイプ</Text>
              <View style={styles.codeTypeSelector}>
                <TouchableOpacity
                  style={[
                    styles.codeTypeButton,
                    formData.codeType === 'barcode' && styles.codeTypeButtonActive,
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, codeType: 'barcode' }))}
                >
                  <Text style={styles.codeTypeIcon}>|||</Text>
                  <Text style={[
                    styles.codeTypeText,
                    formData.codeType === 'barcode' && styles.codeTypeTextActive,
                  ]}>バーコード</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.codeTypeButton,
                    formData.codeType === 'qr' && styles.codeTypeButtonActive,
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, codeType: 'qr' }))}
                >
                  <Text style={styles.codeTypeIcon}>⊞</Text>
                  <Text style={[
                    styles.codeTypeText,
                    formData.codeType === 'qr' && styles.codeTypeTextActive,
                  ]}>QRコード</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>コードデータ</Text>
              <TextInput
                style={styles.input}
                value={formData.codeData}
                onChangeText={(text) => setFormData(prev => ({ ...prev, codeData: text }))}
              />

              <Text style={styles.inputLabel}>カードカラー</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.colorSelector}>
                  {CARD_COLORS.map(color => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorItem,
                        { backgroundColor: color },
                        formData.color === color && styles.colorItemActive,
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, color }))}
                    >
                      {formData.color === color && (
                        <Text style={styles.colorItemCheck}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={styles.inputLabel}>有効期限</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={formData.expirationDate}
                onChangeText={(text) => setFormData(prev => ({ ...prev, expirationDate: text }))}
              />

              <Text style={styles.inputLabel}>有効期限ルール</Text>
              <TextInput
                style={styles.input}
                value={formData.expirationRule}
                onChangeText={(text) => setFormData(prev => ({ ...prev, expirationRule: text }))}
              />

              <Text style={styles.inputLabel}>会員ランク</Text>
              <TextInput
                style={styles.input}
                value={formData.membershipLevel}
                onChangeText={(text) => setFormData(prev => ({ ...prev, membershipLevel: text }))}
              />

              <Text style={styles.inputLabel}>メモ</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                multiline
                numberOfLines={3}
                value={formData.notes}
                onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowEditModal(false);
                  setSelectedCard(null);
                  resetForm();
                }}
              >
                <Text style={styles.cancelButtonText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdateCard}
              >
                <Text style={styles.saveButtonText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Code Display Modal */}
      <Modal
        visible={showCodeModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowCodeModal(false)}
      >
        <View style={styles.codeModalOverlay}>
          <View style={styles.codeModalContent}>
            {selectedCard && (
              <>
                <View style={styles.codeModalHeader}>
                  <Text style={styles.codeModalIcon}>{selectedCard.icon}</Text>
                  <Text style={styles.codeModalTitle}>{selectedCard.storeName}</Text>
                  <TouchableOpacity 
                    style={styles.codeModalClose}
                    onPress={() => setShowCodeModal(false)}
                  >
                    <Text style={styles.codeModalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.codeModalPoints}>
                  <Text style={styles.codeModalPointsLabel}>ポイント残高</Text>
                  <Text style={styles.codeModalPointsValue}>
                    {selectedCard.currentPoints.toLocaleString()} pt
                  </Text>
                </View>

                <View style={styles.codeDisplayArea}>
                  {selectedCard.codeType === 'barcode' ? (
                    <BarcodeDisplay 
                      data={selectedCard.codeData || selectedCard.cardNumber.replace(/-/g, '')} 
                    />
                  ) : (
                    <QRCodeDisplay 
                      data={selectedCard.codeData || selectedCard.cardNumber.replace(/-/g, '')} 
                    />
                  )}
                </View>

                <Text style={styles.codeModalCardNumber}>
                  {selectedCard.cardNumber}
                </Text>

                {selectedCard.membershipLevel && (
                  <View style={styles.codeModalMembership}>
                    <Text style={styles.codeModalMembershipText}>
                      {selectedCard.membershipLevel}会員
                    </Text>
                  </View>
                )}

                {selectedCard.notes && (
                  <Text style={styles.codeModalNotes}>💡 {selectedCard.notes}</Text>
                )}

                <View style={styles.codeModalActions}>
                  <TouchableOpacity
                    style={styles.codeModalActionButton}
                    onPress={() => handleAddPoints(selectedCard)}
                  >
                    <Text style={styles.codeModalActionIcon}>➕</Text>
                    <Text style={styles.codeModalActionText}>追加</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.codeModalActionButton}
                    onPress={() => handleUsePoints(selectedCard)}
                  >
                    <Text style={styles.codeModalActionIcon}>➖</Text>
                    <Text style={styles.codeModalActionText}>使用</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.codeModalActionButton}
                    onPress={() => {
                      setShowCodeModal(false);
                      showCardHistory(selectedCard);
                    }}
                  >
                    <Text style={styles.codeModalActionIcon}>📊</Text>
                    <Text style={styles.codeModalActionText}>履歴</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.codeModalActionButton}
                    onPress={() => handleToggleFavorite(selectedCard.id)}
                  >
                    <Text style={styles.codeModalActionIcon}>
                      {selectedCard.isFavorite ? '⭐' : '☆'}
                    </Text>
                    <Text style={styles.codeModalActionText}>
                      {selectedCard.isFavorite ? 'お気に入り' : '登録'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.codeModalHint}>
                  📱 画面の明るさを上げてスキャンしてください
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* History Modal */}
      <Modal
        visible={showHistoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                📊 {selectedCard?.storeName} の履歴
              </Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {cardTransactions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateIcon}>📝</Text>
                  <Text style={styles.emptyStateText}>履歴がありません</Text>
                </View>
              ) : (
                cardTransactions.map(transaction => (
                  <TransactionItem 
                    key={transaction.id} 
                    transaction={transaction}
                    card={selectedCard!}
                  />
                ))
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => setShowHistoryModal(false)}
              >
                <Text style={styles.saveButtonText}>閉じる</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

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
    borderBottomColor: COLORS.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: COLORS.text,
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
    fontWeight: 'bold',
  },
  summaryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  summaryCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
  },
  summaryValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 4,
  },
  summaryUnit: {
    fontSize: 18,
    fontWeight: 'normal',
  },
  summaryStats: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  summaryStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  summaryStatLabel: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.8,
    marginTop: 2,
  },
  summaryStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.white,
  },
  tabBadge: {
    backgroundColor: COLORS.warning,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchContainer: {
    marginVertical: 12,
  },
  searchInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  categoryFilter: {
    marginBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: COLORS.white,
  },
  cardsList: {
    gap: 16,
  },
  cardContainer: {
    borderRadius: 16,
    padding: 20,
    minHeight: 180,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardExpiringSoon: {
    borderWidth: 2,
    borderColor: COLORS.warning,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardIcon: {
    fontSize: 24,
  },
  cardStoreName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  favoriteIcon: {
    fontSize: 16,
  },
  membershipBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  membershipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  cardPointsContainer: {
    marginTop: 16,
  },
  cardPointsLabel: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.8,
  },
  cardPointsValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: 2,
  },
  cardPointsUnit: {
    fontSize: 16,
    fontWeight: 'normal',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 'auto',
    paddingTop: 12,
  },
  cardNumber: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cardCategory: {
    marginTop: 4,
  },
  cardCategoryText: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.8,
  },
  expirationBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  expirationBadgeWarning: {
    backgroundColor: COLORS.warning,
  },
  expirationText: {
    fontSize: 11,
    color: COLORS.white,
  },
  expirationTextWarning: {
    color: COLORS.text,
    fontWeight: '600',
  },
  cardDecoration: {
    position: 'absolute',
    right: -30,
    top: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginBottom: 16,
  },
  emptyStateButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  historyContainer: {
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionIconText: {
    fontSize: 18,
  },
  transactionContent: {
    flex: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionDescription: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  transactionPoints: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionFooter: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 12,
  },
  transactionDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  transactionLocation: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  transactionBalance: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: 'auto',
  },
  expiringContainer: {
    paddingTop: 8,
  },
  expiringCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  expiringCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expiringCardIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  expiringCardInfo: {
    flex: 1,
  },
  expiringCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  expiringCardPoints: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  expiringBadge: {
    backgroundColor: COLORS.warningLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  expiringBadgeCritical: {
    backgroundColor: COLORS.dangerLight,
  },
  expiringBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.warning,
  },
  expiringBadgeTextCritical: {
    color: COLORS.danger,
  },
  expiringCardDate: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 8,
  },
  bottomSpacer: {
    height: 100,
  },
  // Modal Styles
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
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
    padding: 20,
    maxHeight: 500,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categorySelector: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  categorySelectorItem: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    minWidth: 70,
  },
  categorySelectorItemActive: {
    backgroundColor: COLORS.primary,
  },
  categorySelectorIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  categorySelectorText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  categorySelectorTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  codeTypeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  codeTypeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
  },
  codeTypeButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  codeTypeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  codeTypeText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  codeTypeTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  colorSelector: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
  },
  colorItem: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorItemActive: {
    borderWidth: 3,
    borderColor: COLORS.white,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  colorItemCheck: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.background,
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
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  // Code Modal
  codeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  codeModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  codeModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  codeModalIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  codeModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  codeModalClose: {
    padding: 8,
  },
  codeModalCloseText: {
    fontSize: 24,
    color: COLORS.textMuted,
  },
  codeModalPoints: {
    alignItems: 'center',
    marginBottom: 20,
  },
  codeModalPointsLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  codeModalPointsValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  codeDisplayArea: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  barcodeContainer: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 8,
  },
  barcodeInner: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  barcodeText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: COLORS.text,
    letterSpacing: 2,
  },
  qrContainer: {
    backgroundColor: COLORS.white,
    padding: 8,
  },
  qrRow: {
    flexDirection: 'row',
  },
  codeModalCardNumber: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: 12,
  },
  codeModalMembership: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  codeModalMembershipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  codeModalNotes: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  codeModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  codeModalActionButton: {
    alignItems: 'center',
    padding: 8,
  },
  codeModalActionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  codeModalActionText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  codeModalHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 16,
    textAlign: 'center',
  },
});
