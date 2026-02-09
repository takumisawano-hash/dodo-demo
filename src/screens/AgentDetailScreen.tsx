import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { purchaseService, SubscriptionStatus } from '../services/purchases';
import { useTheme } from '../theme';
import { AGENT_IMAGES } from '../data/agentImages';

const { width } = Dimensions.get('window');

// Sample reviews data
const SAMPLE_REVIEWS = [
  {
    id: '1',
    user: 'ゆうこ',
    avatar: '👩',
    rating: 5,
    date: '2025年1月15日',
    content: '毎日の食事管理がとても楽になりました！優しく励ましてくれるので続けられています。',
  },
  {
    id: '2',
    user: 'たかし',
    avatar: '👨',
    rating: 4,
    date: '2025年1月10日',
    content: '3ヶ月で5kg減量できました。アドバイスが具体的で実践しやすいです。',
  },
  {
    id: '3',
    user: 'まいこ',
    avatar: '👩‍🦰',
    rating: 5,
    date: '2025年1月5日',
    content: '栄養バランスの知識が増えました。料理のレパートリーも広がって嬉しいです！',
  },
];

// Features for each agent - using Ionicons names
const AGENT_FEATURES = [
  { iconName: 'chatbubbles', title: '24時間チャット', description: 'いつでも相談できる' },
  { iconName: 'stats-chart', title: '進捗トラッキング', description: '目標達成をサポート' },
  { iconName: 'flag', title: 'パーソナライズ', description: 'あなた専用のアドバイス' },
  { iconName: 'notifications', title: 'リマインダー', description: '習慣化をお手伝い' },
];

// Similar coaches data
const SIMILAR_COACHES = [
  { id: 'fitness-coach', name: 'ゴリラ', role: '筋トレコーチ', emoji: '🦍', color: '#8B4513' },
  { id: 'sleep-coach', name: 'コアラ', role: '睡眠コーチ', emoji: '🐨', color: '#607D8B' },
  { id: 'mental-coach', name: 'スワン', role: 'メンタルコーチ', emoji: '🦢', color: '#E91E63' },
];

interface Agent {
  id: string;
  name: string;
  nameEn: string;
  role: string;
  category?: string;
  color: string;
  bgGradient: string[];
  emoji: string;
  description: string;
  rating?: number;
  reviews?: number;
  price?: number;
  isPopular?: boolean;
  subscribers?: number;
}

interface Props {
  route: {
    params: {
      agent: Agent;
    };
  };
  navigation: any;
}

export default function AgentDetailScreen({ route, navigation }: Props) {
  const { colors, isDark } = useTheme();
  const { agent } = route.params;
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTrialLoading, setIsTrialLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);

  // Default values for agents from HomeScreen
  const rating = agent.rating ?? 4.5;
  const reviewCount = agent.reviews ?? 100;
  const price = agent.price ?? 980;
  const subscribers = agent.subscribers ?? 1000;

  // Check subscription status on mount
  useEffect(() => {
    const checkSubscription = async () => {
      await purchaseService.initialize();
      const status = await purchaseService.getSubscriptionStatus();
      setSubscriptionStatus(status);
    };
    checkSubscription();
  }, []);

  const handleSubscribe = async () => {
    Alert.alert(
      'プレミアムプラン',
      `${agent.name}のプレミアムプラン（¥${price.toLocaleString()}/月）を購入しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '購入する',
          onPress: async () => {
            setIsLoading(true);
            try {
              // Use 'basic' plan for agent subscription (or could be 'pro' depending on price)
              const planId = price >= 980 ? 'pro' : 'basic';
              const result = await purchaseService.purchasePlan(planId);
              
              if (result.success) {
                const newStatus = await purchaseService.getSubscriptionStatus();
                setSubscriptionStatus(newStatus);
                Alert.alert(
                  '🎉 購入完了',
                  `${agent.name}のサブスクリプションが開始されました！`,
                  [{ text: 'OK' }]
                );
              } else if (result.cancelled) {
                // User cancelled, do nothing
              } else {
                Alert.alert('エラー', result.error || '購入に失敗しました');
              }
            } catch (error) {
              console.error('Subscription error:', error);
              Alert.alert('エラー', '購入処理中にエラーが発生しました');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleStartTrial = async () => {
    Alert.alert(
      '7日間無料トライアル',
      `${agent.name}を7日間無料でお試しいただけます。\n期間中はいつでもキャンセル可能です。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '無料で試す',
          onPress: async () => {
            setIsTrialLoading(true);
            try {
              const result = await purchaseService.startFreeTrial();
              
              if (result.success) {
                const newStatus = await purchaseService.getSubscriptionStatus();
                setSubscriptionStatus(newStatus);
                Alert.alert(
                  '🎉 トライアル開始',
                  '7日間の無料トライアルが開始されました！',
                  [{ text: 'OK', onPress: () => navigation.navigate('Chat', { agent }) }]
                );
              } else if (result.cancelled) {
                // User cancelled, do nothing
              } else {
                Alert.alert('エラー', result.error || 'トライアル開始に失敗しました');
              }
            } catch (error) {
              console.error('Trial error:', error);
              Alert.alert('エラー', 'トライアル開始中にエラーが発生しました');
            } finally {
              setIsTrialLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderStars = (r: number) => {
    const fullStars = Math.floor(r);
    let stars = '★'.repeat(fullStars);
    if (r % 1 >= 0.5 && fullStars < 5) stars += '☆';
    while (stars.length < 5) stars += '☆';
    return stars;
  };

  const displayedReviews = showAllReviews ? SAMPLE_REVIEWS : SAMPLE_REVIEWS.slice(0, 2);
  
  // Check if user already has an active subscription
  const hasActiveSubscription = subscriptionStatus?.isActive || false;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={[styles.heroSection, { backgroundColor: agent.bgGradient[0] }]}>
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backText, { color: colors.textSecondary }]}>← 戻る</Text>
          </TouchableOpacity>

          {AGENT_IMAGES[agent.id] ? (
            <Image source={{ uri: AGENT_IMAGES[agent.id] }} style={styles.heroImage} />
          ) : (
            <Text style={styles.heroEmoji}>{agent.emoji}</Text>
          )}
          <Text style={[styles.heroName, { color: agent.color }]}>{agent.name}</Text>
          <Text style={styles.heroRole}>{agent.role}</Text>
          
          {/* Rating */}
          <View style={styles.heroRating}>
            <Text style={[styles.heroStars, { color: agent.color }]}>
              {renderStars(rating)}
            </Text>
            <Text style={styles.heroRatingText}>
              {rating} ({reviewCount.toLocaleString()}件のレビュー)
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="people" size={16} color="#888" style={{ marginRight: 6 }} />
            <Text style={styles.heroSubscribers}>
              {subscribers.toLocaleString()}人が利用中
            </Text>
          </View>
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Ionicons name="document-text" size={20} color={colors.text} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>紹介</Text>
          </View>
          <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
            {agent.description}
            {'\n\n'}
            {agent.name}は、あなたの{agent.role}として、毎日の目標達成をサポートします。
            AIならではの24時間対応で、いつでも相談可能。パーソナライズされたアドバイスで、
            効果的に目標に向かって進むことができます。
          </Text>
        </View>

        {/* Features Section */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Ionicons name="sparkles" size={20} color={colors.text} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>機能</Text>
          </View>
          <View style={styles.featuresGrid}>
            {AGENT_FEATURES.map((feature, index) => (
              <View 
                key={index} 
                style={[styles.featureCard, { borderColor: agent.color + '30', backgroundColor: colors.card }]}
              >
                <Ionicons name={feature.iconName as any} size={28} color={agent.color} style={{ marginBottom: 8 }} />
                <Text style={[styles.featureTitle, { color: agent.color }]}>
                  {feature.title}
                </Text>
                <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>{feature.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Reviews Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="chatbubbles" size={20} color={colors.text} style={{ marginRight: 6 }} />
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>レビュー</Text>
            </View>
            <View style={styles.overallRating}>
              <Text style={[styles.overallStars, { color: agent.color }]}>
                {renderStars(rating)}
              </Text>
              <Text style={[styles.overallText, { color: colors.text }]}>{rating}</Text>
            </View>
          </View>

          {displayedReviews.map((review) => (
            <View key={review.id} style={[styles.reviewCard, { backgroundColor: colors.card }]}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewAvatar}>{review.avatar}</Text>
                <View style={styles.reviewMeta}>
                  <Text style={[styles.reviewUser, { color: colors.text }]}>{review.user}</Text>
                  <Text style={[styles.reviewDate, { color: colors.textSecondary }]}>{review.date}</Text>
                </View>
                <Text style={[styles.reviewStars, { color: agent.color }]}>
                  {renderStars(review.rating)}
                </Text>
              </View>
              <Text style={[styles.reviewContent, { color: colors.textSecondary }]}>{review.content}</Text>
            </View>
          ))}

          {!showAllReviews && SAMPLE_REVIEWS.length > 2 && (
            <TouchableOpacity 
              style={styles.showMoreButton}
              onPress={() => setShowAllReviews(true)}
            >
              <Text style={[styles.showMoreText, { color: agent.color }]}>
                すべてのレビューを見る →
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Pricing Section */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Ionicons name="diamond" size={20} color={colors.text} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>プラン</Text>
          </View>
          
          {/* Free Trial Card */}
          <View style={[styles.pricingCard, { backgroundColor: colors.card }]}>
            <View style={styles.pricingHeader}>
              <Text style={[styles.pricingTitle, { color: colors.text }]}>無料トライアル</Text>
              <Text style={[styles.pricingBadge, { backgroundColor: isDark ? '#333' : '#f0f0f0', color: colors.textSecondary }]}>7日間</Text>
            </View>
            <Text style={[styles.pricingPrice, { color: colors.text }]}>¥0</Text>
            <Text style={[styles.pricingDesc, { color: colors.textSecondary }]}>
              すべての機能を7日間無料でお試しいただけます
            </Text>
            <View style={[styles.pricingFeatures, { borderTopColor: isDark ? '#333' : '#f0f0f0' }]}>
              <Text style={[styles.pricingFeature, { color: colors.textSecondary }]}>✓ 無制限チャット</Text>
              <Text style={[styles.pricingFeature, { color: colors.textSecondary }]}>✓ 進捗トラッキング</Text>
              <Text style={[styles.pricingFeature, { color: colors.textSecondary }]}>✓ パーソナライズ機能</Text>
            </View>
          </View>

          {/* Premium Card */}
          <View style={[styles.pricingCard, styles.pricingCardPremium, { borderColor: agent.color, backgroundColor: colors.card }]}>
            <View style={[styles.premiumBadge, { backgroundColor: agent.color }]}>
              <Text style={styles.premiumBadgeText}>おすすめ</Text>
            </View>
            <View style={styles.pricingHeader}>
              <Text style={[styles.pricingTitle, { color: colors.text }]}>プレミアム</Text>
              <Text style={[styles.pricingBadge, { backgroundColor: isDark ? '#333' : '#f0f0f0', color: colors.textSecondary }]}>月額</Text>
            </View>
            <Text style={[styles.pricingPrice, { color: agent.color }]}>
              ¥{price.toLocaleString()}
            </Text>
            <Text style={[styles.pricingDesc, { color: colors.textSecondary }]}>
              継続的なサポートで目標達成を加速
            </Text>
            <View style={[styles.pricingFeatures, { borderTopColor: isDark ? '#333' : '#f0f0f0' }]}>
              <Text style={[styles.pricingFeature, { color: colors.textSecondary }]}>✓ 無制限チャット</Text>
              <Text style={[styles.pricingFeature, { color: colors.textSecondary }]}>✓ 進捗トラッキング</Text>
              <Text style={[styles.pricingFeature, { color: colors.textSecondary }]}>✓ パーソナライズ機能</Text>
              <Text style={[styles.pricingFeature, { color: colors.textSecondary }]}>✓ 優先サポート</Text>
              <Text style={[styles.pricingFeature, { color: colors.textSecondary }]}>✓ 高度な分析機能</Text>
            </View>
          </View>
        </View>

        {/* Similar Coaches */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Ionicons name="people" size={20} color={colors.text} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>類似コーチ</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.similarCoachesRow}>
            {SIMILAR_COACHES.filter(c => c.id !== agent.id).map((coach) => (
              <TouchableOpacity
                key={coach.id}
                style={[styles.similarCoachCard, { backgroundColor: colors.card }]}
                onPress={() => navigation.push('AgentDetail', { agent: coach })}
              >
                <Text style={styles.similarCoachEmoji}>{coach.emoji}</Text>
                <Text style={[styles.similarCoachName, { color: coach.color }]}>{coach.name}</Text>
                <Text style={[styles.similarCoachRole, { color: colors.textSecondary }]}>{coach.role}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Spacer for bottom buttons */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Fixed Bottom Buttons */}
      <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: isDark ? '#333' : '#f0f0f0' }]}>
        {hasActiveSubscription ? (
          // Already subscribed - just show chat button
          <TouchableOpacity 
            style={[styles.subscribedButton, { backgroundColor: agent.color }]}
            onPress={() => navigation.navigate('Chat', { agent })}
          >
            <Text style={styles.subscribeButtonText}>💬 チャットを開始</Text>
          </TouchableOpacity>
        ) : (
          // Not subscribed - show trial and subscribe buttons
          <>
            <TouchableOpacity 
              style={[styles.tryButton, { backgroundColor: isDark ? '#333' : '#f0f0f0' }, isTrialLoading && styles.buttonDisabled]}
              onPress={handleStartTrial}
              disabled={isTrialLoading || isLoading}
            >
              {isTrialLoading ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Text style={[styles.tryButtonText, { color: colors.text }]}>無料で試す</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.subscribeButton, 
                { backgroundColor: agent.color },
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleSubscribe}
              disabled={isLoading || isTrialLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.subscribeButtonText}>
                  サブスク開始 ¥{price.toLocaleString()}/月
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 32,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    padding: 8,
  },
  backText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  heroEmoji: {
    fontSize: 80,
    marginBottom: 12,
  },
  heroImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  heroName: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  heroRole: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  heroRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  heroStars: {
    fontSize: 16,
    marginRight: 8,
  },
  heroRatingText: {
    fontSize: 14,
    color: '#666',
  },
  heroSubscribers: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 24,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: (width - 52) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  featureIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 12,
    color: '#888',
  },
  overallRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overallStars: {
    fontSize: 14,
    marginRight: 6,
  },
  overallText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewAvatar: {
    fontSize: 32,
    marginRight: 12,
  },
  reviewMeta: {
    flex: 1,
  },
  reviewUser: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  reviewDate: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  reviewStars: {
    fontSize: 12,
  },
  reviewContent: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
  },
  showMoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pricingCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  pricingCardPremium: {
    borderWidth: 2,
    position: 'relative',
  },
  premiumBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pricingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  pricingBadge: {
    fontSize: 12,
    color: '#888',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pricingPrice: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  pricingDesc: {
    fontSize: 13,
    color: '#888',
    marginBottom: 16,
  },
  pricingFeatures: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 16,
  },
  pricingFeature: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 10,
  },
  tryButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginRight: 12,
  },
  tryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  subscribeButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  subscribeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  subscribedButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  similarCoachesRow: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  similarCoachCard: {
    width: 110,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginRight: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  similarCoachEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  similarCoachName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  similarCoachRole: {
    fontSize: 11,
    color: '#888',
  },
});
