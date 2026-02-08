import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

// Features for each agent
const AGENT_FEATURES = [
  { icon: '💬', title: '24時間チャット', description: 'いつでも相談できる' },
  { icon: '📊', title: '進捗トラッキング', description: '目標達成をサポート' },
  { icon: '🎯', title: 'パーソナライズ', description: 'あなた専用のアドバイス' },
  { icon: '🔔', title: 'リマインダー', description: '習慣化をお手伝い' },
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
  const { agent } = route.params;
  const [showAllReviews, setShowAllReviews] = useState(false);

  // Default values for agents from HomeScreen
  const rating = agent.rating ?? 4.5;
  const reviewCount = agent.reviews ?? 100;
  const price = agent.price ?? 980;
  const subscribers = agent.subscribers ?? 1000;

  const renderStars = (r: number) => {
    const fullStars = Math.floor(r);
    let stars = '★'.repeat(fullStars);
    if (r % 1 >= 0.5 && fullStars < 5) stars += '☆';
    while (stars.length < 5) stars += '☆';
    return stars;
  };

  const displayedReviews = showAllReviews ? SAMPLE_REVIEWS : SAMPLE_REVIEWS.slice(0, 2);

  return (
    <SafeAreaView style={styles.container}>
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
            <Text style={styles.backText}>← 戻る</Text>
          </TouchableOpacity>

          <Text style={styles.heroEmoji}>{agent.emoji}</Text>
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

          <Text style={styles.heroSubscribers}>
            👥 {subscribers.toLocaleString()}人が利用中
          </Text>
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 紹介</Text>
          <Text style={styles.descriptionText}>
            {agent.description}
            {'\n\n'}
            {agent.name}は、あなたの{agent.role}として、毎日の目標達成をサポートします。
            AIならではの24時間対応で、いつでも相談可能。パーソナライズされたアドバイスで、
            効果的に目標に向かって進むことができます。
          </Text>
        </View>

        {/* Features Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ 機能</Text>
          <View style={styles.featuresGrid}>
            {AGENT_FEATURES.map((feature, index) => (
              <View 
                key={index} 
                style={[styles.featureCard, { borderColor: agent.color + '30' }]}
              >
                <Text style={styles.featureIcon}>{feature.icon}</Text>
                <Text style={[styles.featureTitle, { color: agent.color }]}>
                  {feature.title}
                </Text>
                <Text style={styles.featureDesc}>{feature.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Reviews Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>💬 レビュー</Text>
            <View style={styles.overallRating}>
              <Text style={[styles.overallStars, { color: agent.color }]}>
                {renderStars(rating)}
              </Text>
              <Text style={styles.overallText}>{rating}</Text>
            </View>
          </View>

          {displayedReviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewAvatar}>{review.avatar}</Text>
                <View style={styles.reviewMeta}>
                  <Text style={styles.reviewUser}>{review.user}</Text>
                  <Text style={styles.reviewDate}>{review.date}</Text>
                </View>
                <Text style={[styles.reviewStars, { color: agent.color }]}>
                  {renderStars(review.rating)}
                </Text>
              </View>
              <Text style={styles.reviewContent}>{review.content}</Text>
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
          <Text style={styles.sectionTitle}>💎 プラン</Text>
          
          {/* Free Trial Card */}
          <View style={styles.pricingCard}>
            <View style={styles.pricingHeader}>
              <Text style={styles.pricingTitle}>無料トライアル</Text>
              <Text style={styles.pricingBadge}>7日間</Text>
            </View>
            <Text style={styles.pricingPrice}>¥0</Text>
            <Text style={styles.pricingDesc}>
              すべての機能を7日間無料でお試しいただけます
            </Text>
            <View style={styles.pricingFeatures}>
              <Text style={styles.pricingFeature}>✓ 無制限チャット</Text>
              <Text style={styles.pricingFeature}>✓ 進捗トラッキング</Text>
              <Text style={styles.pricingFeature}>✓ パーソナライズ機能</Text>
            </View>
          </View>

          {/* Premium Card */}
          <View style={[styles.pricingCard, styles.pricingCardPremium, { borderColor: agent.color }]}>
            <View style={[styles.premiumBadge, { backgroundColor: agent.color }]}>
              <Text style={styles.premiumBadgeText}>おすすめ</Text>
            </View>
            <View style={styles.pricingHeader}>
              <Text style={styles.pricingTitle}>プレミアム</Text>
              <Text style={styles.pricingBadge}>月額</Text>
            </View>
            <Text style={[styles.pricingPrice, { color: agent.color }]}>
              ¥{price.toLocaleString()}
            </Text>
            <Text style={styles.pricingDesc}>
              継続的なサポートで目標達成を加速
            </Text>
            <View style={styles.pricingFeatures}>
              <Text style={styles.pricingFeature}>✓ 無制限チャット</Text>
              <Text style={styles.pricingFeature}>✓ 進捗トラッキング</Text>
              <Text style={styles.pricingFeature}>✓ パーソナライズ機能</Text>
              <Text style={styles.pricingFeature}>✓ 優先サポート</Text>
              <Text style={styles.pricingFeature}>✓ 高度な分析機能</Text>
            </View>
          </View>
        </View>

        {/* Spacer for bottom buttons */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Fixed Bottom Buttons */}
      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={styles.tryButton}
          onPress={() => navigation.navigate('Chat', { agent })}
        >
          <Text style={styles.tryButtonText}>無料で試す</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.subscribeButton, { backgroundColor: agent.color }]}
          onPress={() => {
            // TODO: Implement subscription flow
            alert(`${agent.name}のサブスクリプションを開始します（¥${price.toLocaleString()}/月）`);
          }}
        >
          <Text style={styles.subscribeButtonText}>
            サブスク開始 ¥{price.toLocaleString()}/月
          </Text>
        </TouchableOpacity>
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
});
