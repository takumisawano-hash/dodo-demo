import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { AGENT_IMAGES } from '../data/agentImages';

// Categories
const CATEGORIES: { id: string; name: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'all', name: 'すべて', icon: 'sparkles' },
  { id: 'health', name: '健康', icon: 'fitness' },
  { id: 'learning', name: '学習', icon: 'book' },
  { id: 'productivity', name: '生産性', icon: 'flash' },
  { id: 'lifestyle', name: 'ライフスタイル', icon: 'leaf' },
  { id: 'finance', name: '資産管理', icon: 'wallet' },
];

// Extended agent data for market
const MARKET_AGENTS = [
  {
    id: 'diet-coach',
    name: 'ドードー',
    nameEn: 'Dodo',
    role: 'ダイエットコーチ',
    category: 'health',
    color: '#FF9800',
    bgGradient: ['#FFF3E0', '#FFE0B2'],
    emoji: '🦤',
    description: '健康的な食事と体重管理をサポート',
    rating: 4.8,
    reviews: 1234,
    price: 980,
    isPopular: true,
    subscribers: 5600,
    addedAt: new Date('2024-01-15'),
    isNew: false,
  },
  {
    id: 'language-tutor',
    name: 'ポリー',
    nameEn: 'Polly',
    role: '語学チューター',
    category: 'learning',
    color: '#81C784',
    bgGradient: ['#E8F5E9', '#C8E6C9'],
    emoji: '🦜',
    description: '楽しく言語を学ぼう',
    rating: 4.9,
    reviews: 2345,
    price: 1280,
    isPopular: true,
    subscribers: 8900,
    addedAt: new Date('2024-02-01'),
    isNew: false,
  },
  {
    id: 'habit-coach',
    name: 'オウル',
    nameEn: 'Owl',
    role: '習慣化コーチ',
    category: 'productivity',
    color: '#BA68C8',
    bgGradient: ['#F3E5F5', '#E1BEE7'],
    emoji: '🦉',
    description: '良い習慣を作るお手伝い',
    rating: 4.7,
    reviews: 890,
    price: 780,
    isPopular: false,
    subscribers: 3200,
    addedAt: new Date('2024-12-01'),
    isNew: true,
  },
  {
    id: 'finance-advisor',
    name: 'フクロウ',
    nameEn: 'Fukuro',
    role: '資産アドバイザー',
    category: 'finance',
    color: '#FFB74D',
    bgGradient: ['#FFF3E0', '#FFE0B2'],
    emoji: '🦅',
    description: '賢いお金の使い方を一緒に考えよう',
    rating: 4.6,
    reviews: 567,
    price: 1480,
    isPopular: true,
    subscribers: 2100,
    addedAt: new Date('2024-11-15'),
    isNew: true,
  },
  {
    id: 'meditation-guide',
    name: 'クレーン',
    nameEn: 'Crane',
    role: '瞑想ガイド',
    category: 'lifestyle',
    color: '#4DD0E1',
    bgGradient: ['#E0F7FA', '#B2EBF2'],
    emoji: '🦢',
    description: '心を落ち着かせ、マインドフルネスを実践',
    rating: 4.9,
    reviews: 1567,
    price: 880,
    isPopular: true,
    subscribers: 7400,
    addedAt: new Date('2024-03-01'),
    isNew: false,
  },
  {
    id: 'fitness-trainer',
    name: 'ファルコン',
    nameEn: 'Falcon',
    role: 'フィットネストレーナー',
    category: 'health',
    color: '#EF5350',
    bgGradient: ['#FFEBEE', '#FFCDD2'],
    emoji: '🦅',
    description: '自宅で効果的なワークアウトをサポート',
    rating: 4.5,
    reviews: 789,
    price: 1180,
    isPopular: false,
    subscribers: 2800,
    addedAt: new Date('2024-10-20'),
    isNew: true,
  },
];

type SortType = 'popular' | 'new' | 'rating' | 'price';

interface Props {
  navigation: any;
}

export default function MarketScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<SortType>('popular');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAgents = MARKET_AGENTS
    .filter(agent => {
      const matchesCategory = selectedCategory === 'all' || agent.category === selectedCategory;
      const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           agent.role.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return b.subscribers - a.subscribers;
        case 'new':
          return b.addedAt.getTime() - a.addedAt.getTime();
        case 'rating':
          return b.rating - a.rating;
        case 'price':
          return a.price - b.price;
        default:
          return 0;
      }
    });

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let stars = '★'.repeat(fullStars);
    if (hasHalfStar && fullStars < 5) stars += '☆';
    return stars;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.logo, { color: colors.text }]}>🏪 マーケット</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>AIエージェントを探す</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: colors.card, color: colors.text }]}
          placeholder="エージェントを検索..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <Text style={styles.searchIcon}>🔍</Text>
      </View>

      {/* Categories */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryChip,
              { backgroundColor: colors.card },
              selectedCategory === cat.id && [styles.categoryChipActive, { backgroundColor: isDark ? '#444' : '#333' }],
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Ionicons 
              name={cat.icon} 
              size={14} 
              color={selectedCategory === cat.id ? '#fff' : colors.textSecondary} 
              style={{ marginRight: 6 }}
            />
            <Text style={[
              styles.categoryText,
              { color: colors.textSecondary },
              selectedCategory === cat.id && styles.categoryTextActive,
            ]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <Text style={[styles.sortLabel, { color: colors.textSecondary }]}>並び替え:</Text>
        {(['popular', 'new', 'rating', 'price'] as SortType[]).map(sort => (
          <TouchableOpacity
            key={sort}
            style={[
              styles.sortChip,
              { backgroundColor: isDark ? '#2A2A2A' : '#f0f0f0' },
              sortBy === sort && [styles.sortChipActive, { backgroundColor: isDark ? '#444' : '#333' }],
            ]}
            onPress={() => setSortBy(sort)}
          >
            <Text style={[
              styles.sortText,
              { color: colors.textSecondary },
              sortBy === sort && styles.sortTextActive,
            ]}>
              {sort === 'popular' ? '人気順' : sort === 'new' ? '新着順' : sort === 'rating' ? '評価順' : '価格順'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results Count */}
      <View style={styles.resultsCount}>
        <Text style={[styles.resultsCountText, { color: colors.textSecondary }]}>
          {filteredAgents.length}件のエージェント
        </Text>
      </View>

      {/* Agent List */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredAgents.map((agent) => (
          <TouchableOpacity
            key={agent.id}
            style={[styles.agentCard, { backgroundColor: isDark ? agent.color + '20' : agent.bgGradient[0] }]}
            onPress={() => navigation.navigate('AgentDetail', { agent })}
            activeOpacity={0.8}
          >
            {/* Popular / New Badge */}
            {agent.isNew ? (
              <View style={[styles.popularBadge, { backgroundColor: '#4CAF50' }]}>
                <Text style={styles.popularText}>✨ 新着</Text>
              </View>
            ) : agent.isPopular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>🔥 人気</Text>
              </View>
            )}

            <View style={styles.agentInfo}>
              {AGENT_IMAGES[agent.id] ? (
                <Image source={{ uri: AGENT_IMAGES[agent.id] }} style={styles.agentImage} />
              ) : (
                <Text style={styles.agentEmoji}>{agent.emoji}</Text>
              )}
              <View style={styles.agentText}>
                <Text style={[styles.agentName, { color: agent.color }]}>
                  {agent.name}
                </Text>
                <Text style={[styles.agentRole, { color: colors.textSecondary }]}>{agent.role}</Text>
                
                {/* Rating */}
                <View style={styles.ratingContainer}>
                  <Text style={[styles.stars, { color: agent.color }]}>
                    {renderStars(agent.rating)}
                  </Text>
                  <Text style={[styles.ratingText, { color: colors.textTertiary }]}>
                    {agent.rating} ({agent.reviews.toLocaleString()}件)
                  </Text>
                </View>

                <Text style={[styles.agentDescription, { color: colors.textTertiary }]}>{agent.description}</Text>
              </View>
            </View>

            {/* Price & Subscribers */}
            <View style={styles.bottomRow}>
              <View style={styles.subscribersInfo}>
                <Text style={[styles.subscribersText, { color: colors.textTertiary }]}>
                  👥 {agent.subscribers.toLocaleString()}人が利用中
                </Text>
              </View>
              <View style={[styles.priceTag, { backgroundColor: agent.color }]}>
                <Text style={styles.priceText}>¥{agent.price.toLocaleString()}/月</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {filteredAgents.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>該当するエージェントが見つかりません</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  searchContainer: {
    marginHorizontal: 20,
    marginBottom: 12,
    position: 'relative',
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingRight: 48,
    fontSize: 16,
    color: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    position: 'absolute',
    right: 16,
    top: 14,
    fontSize: 18,
  },
  categoryScroll: {
    maxHeight: 50,
    marginBottom: 8,
  },
  categoryContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryChipActive: {
    backgroundColor: '#333',
  },
  categoryEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#fff',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sortLabel: {
    fontSize: 13,
    color: '#888',
    marginRight: 8,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 6,
    backgroundColor: '#f0f0f0',
  },
  sortChipActive: {
    backgroundColor: '#333',
  },
  sortText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  sortTextActive: {
    color: '#fff',
  },
  resultsCount: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  resultsCountText: {
    fontSize: 13,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  agentCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  agentInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  agentEmoji: {
    fontSize: 48,
    marginRight: 16,
  },
  agentImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
  },
  agentText: {
    flex: 1,
  },
  agentName: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  agentRole: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  stars: {
    fontSize: 12,
    marginRight: 6,
  },
  ratingText: {
    fontSize: 12,
    color: '#888',
  },
  agentDescription: {
    fontSize: 13,
    color: '#888',
    marginTop: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  subscribersInfo: {
    flex: 1,
  },
  subscribersText: {
    fontSize: 12,
    color: '#888',
  },
  priceTag: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  priceText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#888',
  },
});
