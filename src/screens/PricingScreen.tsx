import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { t, useI18n, formatCurrency } from '../i18n';
import { useTheme } from '../theme';
import { purchaseService, PRODUCT_IDS } from '../services/purchases';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Plan {
  id: string;
  nameKey: string;
  monthlyPrice: number;
  yearlyPrice: number;
  slots: number | 'unlimited';
  dailyLimit: number;
  featureKeys: string[];
  isPopular?: boolean;
  isTrial?: boolean;
  isBestValue?: boolean;
  color: string;
  icon: string;
}

const PLANS: Plan[] = [
  {
    id: 'trial',
    nameKey: 'Free Trial',
    monthlyPrice: 0,
    yearlyPrice: 0,
    slots: 1,
    dailyLimit: 20,
    featureKeys: [
      'pricing.features.oneAgent',
      'pricing.features.basicChat',
      'pricing.features.trialAllFeatures',
    ],
    isTrial: true,
    color: '#78909C',
    icon: '🆓',
  },
  {
    id: 'starter',
    nameKey: 'Starter',
    monthlyPrice: 480,
    yearlyPrice: 4608,
    slots: 1,
    dailyLimit: 50,
    featureKeys: [
      'pricing.features.oneAgent',
      'pricing.features.progressDashboard',
      'pricing.features.customReminders',
    ],
    color: '#4CAF50',
    icon: '🌱',
  },
  {
    id: 'basic',
    nameKey: 'Basic',
    monthlyPrice: 980,
    yearlyPrice: 9408,
    slots: 3,
    dailyLimit: 100,
    featureKeys: [
      'pricing.features.threeAgents',
      'pricing.features.progressDashboard',
      'pricing.features.customReminders',
      'pricing.features.dataExport',
    ],
    isPopular: true,
    color: '#FF9800',
    icon: '⭐',
  },
  {
    id: 'pro',
    nameKey: 'Pro',
    monthlyPrice: 1980,
    yearlyPrice: 19008,
    slots: 'unlimited',
    dailyLimit: 200,
    featureKeys: [
      'pricing.features.allAgents',
      'pricing.features.advancedAnalytics',
      'pricing.features.prioritySupport',
      'pricing.features.dataExport',
      'pricing.features.apiAccess',
    ],
    isBestValue: true,
    color: '#BA68C8',
    icon: '👑',
  },
];

// Feature comparison data
const COMPARISON_FEATURES = [
  { key: 'agents', label: 'エージェント数', values: ['1', '1', '3', '無制限'] },
  { key: 'messages', label: '1日のメッセージ', values: ['20', '50', '100', '200'] },
  { key: 'dashboard', label: '進捗ダッシュボード', values: ['✕', '○', '○', '○'] },
  { key: 'reminders', label: 'カスタムリマインダー', values: ['✕', '○', '○', '○'] },
  { key: 'export', label: 'データエクスポート', values: ['✕', '✕', '○', '○'] },
  { key: 'analytics', label: '詳細分析', values: ['✕', '✕', '✕', '○'] },
  { key: 'support', label: 'サポート', values: ['基本', '基本', 'メール', '優先'] },
];

interface Props {
  navigation: any;
  route?: { params?: { fromSlotFull?: boolean; pendingAgent?: any } };
}

export default function PricingScreen({ navigation, route }: Props) {
  const { colors, isDark } = useTheme();
  const { language } = useI18n();
  const [currentPlan, setCurrentPlan] = useState('trial');
  const [isYearly, setIsYearly] = useState(true); // Default to yearly for savings
  const [isLoading, setIsLoading] = useState(false);
  const [purchasingPlan, setPurchasingPlan] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  
  const animatedValue = useRef(new Animated.Value(0)).current;
  
  // スロット満杯から来た場合のフラグ
  const fromSlotFull = route?.params?.fromSlotFull;
  const pendingAgent = route?.params?.pendingAgent;

  // Load current subscription status
  useEffect(() => {
    loadCurrentPlan();
  }, []);

  // Animate best value badge
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(animatedValue, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const loadCurrentPlan = async () => {
    try {
      await purchaseService.initialize();
      const status = await purchaseService.getSubscriptionStatus();
      if (status.currentPlan) {
        setCurrentPlan(status.currentPlan === 'free' ? 'trial' : status.currentPlan);
      }
    } catch (error) {
      console.error('Failed to load subscription status:', error);
    }
  };

  const getPrice = (plan: Plan) => {
    if (plan.isTrial) return 0;
    return isYearly ? plan.yearlyPrice : plan.monthlyPrice;
  };

  const getMonthlyEquivalent = (plan: Plan) => {
    if (plan.isTrial) return 0;
    return isYearly ? Math.floor(plan.yearlyPrice / 12) : plan.monthlyPrice;
  };

  const getSavingsPercent = (plan: Plan) => {
    if (plan.isTrial || plan.monthlyPrice === 0) return 0;
    const yearlyMonthly = plan.yearlyPrice / 12;
    return Math.round((1 - yearlyMonthly / plan.monthlyPrice) * 100);
  };

  const formatPrice = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  const handleSelectPlan = async (planId: string) => {
    if (planId === currentPlan) return;
    
    const plan = PLANS.find(p => p.id === planId);
    if (!plan) return;

    if (plan.isTrial) {
      Alert.alert(
        t('pricing.changePlan'),
        t('pricing.downgradeTo'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { 
            text: t('pricing.change'), 
            onPress: () => {
              Alert.alert(
                'サブスクリプション管理',
                'ダウングレードはApp Store/Google Playのサブスクリプション設定から行ってください。',
                [{ text: 'OK' }]
              );
            }
          },
        ]
      );
    } else {
      const price = getPrice(plan);
      const period = isYearly ? t('pricing.perYear') : t('pricing.perMonth');
      const savings = isYearly ? `\n\n💰 年間${formatPrice(plan.monthlyPrice * 12 - plan.yearlyPrice)}お得！` : '';
      
      Alert.alert(
        `${plan.icon} ${plan.nameKey}プラン`,
        `${formatPrice(price)}${period}${savings}`,
        [
          { text: t('common.cancel'), style: 'cancel' },
          { 
            text: isYearly ? '年払いで始める' : '月払いで始める', 
            onPress: () => executePurchase(planId)
          },
        ]
      );
    }
  };

  const executePurchase = async (planId: string) => {
    setPurchasingPlan(planId);
    setIsLoading(true);
    
    try {
      await purchaseService.initialize();
      const result = await purchaseService.purchasePlan(planId);
      
      if (result.success) {
        setCurrentPlan(planId);
        Alert.alert(
          '🎉 アップグレード完了！',
          `${PLANS.find(p => p.id === planId)?.nameKey}プランへようこそ！\n新機能をお楽しみください。`,
          [
            { 
              text: '始める', 
              onPress: () => {
                if (fromSlotFull && pendingAgent) {
                  navigation.goBack();
                }
              }
            }
          ]
        );
      } else if (result.cancelled) {
        // User cancelled
      } else {
        Alert.alert('エラー', result.error || '購入に失敗しました。もう一度お試しください。');
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      Alert.alert('エラー', error.message || '購入処理中にエラーが発生しました。');
    } finally {
      setIsLoading(false);
      setPurchasingPlan(null);
    }
  };

  const pulseScale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.headerSection}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>🦤 {t('pricing.title')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('pricing.subtitle')}</Text>
        </View>

        {/* スロット満杯からの誘導メッセージ */}
        {fromSlotFull && (
          <View style={[styles.slotFullBanner, { backgroundColor: isDark ? '#3D2E00' : '#FFF3E0' }]}>
            <View style={styles.slotFullIcon}>
              <Text style={{ fontSize: 24 }}>🔒</Text>
            </View>
            <View style={styles.slotFullTextContainer}>
              <Text style={[styles.slotFullTitle, { color: isDark ? '#FFB74D' : '#E65100' }]}>スロットがいっぱいです</Text>
              <Text style={[styles.slotFullText, { color: isDark ? '#FFA726' : '#F57C00' }]}>
                {pendingAgent?.name ? `${pendingAgent.name}を追加するには、` : '新しいコーチを追加するには、'}
                プランをアップグレードしてください。
              </Text>
            </View>
          </View>
        )}

        {/* Billing Toggle */}
        <View style={[styles.billingToggleContainer, { backgroundColor: colors.card }]}>
          <TouchableOpacity 
            style={[
              styles.billingOption, 
              !isYearly && styles.billingOptionActive,
              { backgroundColor: !isYearly ? colors.primary : 'transparent' }
            ]}
            onPress={() => setIsYearly(false)}
          >
            <Text style={[
              styles.billingOptionText,
              { color: !isYearly ? '#FFFFFF' : colors.textSecondary }
            ]}>
              月払い
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.billingOption, 
              isYearly && styles.billingOptionActive,
              { backgroundColor: isYearly ? colors.primary : 'transparent' }
            ]}
            onPress={() => setIsYearly(true)}
          >
            <Text style={[
              styles.billingOptionText,
              { color: isYearly ? '#FFFFFF' : colors.textSecondary }
            ]}>
              年払い
            </Text>
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>20%OFF</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Plan Cards */}
        {PLANS.map((plan) => {
          const isCurrentPlan = currentPlan === plan.id;
          const savings = getSavingsPercent(plan);
          
          return (
            <Animated.View
              key={plan.id}
              style={[
                plan.isBestValue && isYearly && { transform: [{ scale: pulseScale }] }
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.planCard,
                  { borderColor: colors.border, backgroundColor: colors.card },
                  plan.isPopular && { borderColor: plan.color, borderWidth: 2 },
                  plan.isBestValue && isYearly && { borderColor: plan.color, borderWidth: 2 },
                  isCurrentPlan && [styles.currentPlanCard, { backgroundColor: plan.color + '10' }],
                ]}
                onPress={() => handleSelectPlan(plan.id)}
                activeOpacity={0.8}
                disabled={isLoading}
              >
                {/* Badges */}
                {plan.isPopular && (
                  <View style={[styles.planBadge, { backgroundColor: plan.color }]}>
                    <Text style={styles.planBadgeText}>👆 人気No.1</Text>
                  </View>
                )}

                {plan.isBestValue && isYearly && !plan.isPopular && (
                  <View style={[styles.planBadge, { backgroundColor: '#E91E63' }]}>
                    <Text style={styles.planBadgeText}>💎 最もお得</Text>
                  </View>
                )}

                {plan.isTrial && (
                  <View style={[styles.planBadge, { backgroundColor: '#78909C' }]}>
                    <Text style={styles.planBadgeText}>🆓 無料</Text>
                  </View>
                )}
                
                {isCurrentPlan && (
                  <View style={[styles.currentBadge, { backgroundColor: colors.success }]}>
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                    <Text style={styles.currentBadgeText}>現在のプラン</Text>
                  </View>
                )}

                {/* Plan Header */}
                <View style={styles.planHeader}>
                  <View style={styles.planNameRow}>
                    <Text style={styles.planIcon}>{plan.icon}</Text>
                    <Text style={[styles.planName, { color: plan.color }]}>{plan.nameKey}</Text>
                  </View>
                  <View style={styles.priceContainer}>
                    {plan.isTrial ? (
                      <View>
                        <Text style={[styles.priceText, { color: colors.text }]}>¥0</Text>
                        <Text style={[styles.trialPeriod, { color: plan.color }]}>{t('pricing.trialPeriod')}</Text>
                      </View>
                    ) : isYearly ? (
                      <View style={styles.yearlyPriceWrapper}>
                        <View style={styles.yearlyPriceRow}>
                          <Text style={[styles.priceText, { color: colors.text }]}>{formatPrice(plan.yearlyPrice)}</Text>
                          <Text style={[styles.priceUnit, { color: colors.textSecondary }]}>/年</Text>
                        </View>
                        <View style={styles.monthlyBreakdown}>
                          <Text style={[styles.monthlyEquivalent, { color: colors.success }]}>
                            月額 {formatPrice(getMonthlyEquivalent(plan))}
                          </Text>
                          {savings > 0 && (
                            <View style={[styles.savingsTag, { backgroundColor: colors.success + '20' }]}>
                              <Text style={[styles.savingsTagText, { color: colors.success }]}>{savings}% OFF</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    ) : (
                      <View style={styles.priceRow}>
                        <Text style={[styles.priceText, { color: colors.text }]}>{formatPrice(plan.monthlyPrice)}</Text>
                        <Text style={[styles.priceUnit, { color: colors.textSecondary }]}>/月</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Slot Info */}
                <View style={styles.slotInfo}>
                  <View style={[styles.slotBadge, { backgroundColor: plan.color + '20' }]}>
                    <Ionicons name="people" size={14} color={plan.color} />
                    <Text style={[styles.slotText, { color: plan.color }]}>
                      {plan.slots === 'unlimited' ? '無制限エージェント' : `${plan.slots}エージェント`}
                    </Text>
                  </View>
                  <View style={[styles.messageBadge, { backgroundColor: plan.color + '10' }]}>
                    <Ionicons name="chatbubbles" size={14} color={plan.color} />
                    <Text style={[styles.messageText, { color: plan.color }]}>
                      {plan.dailyLimit}メッセージ/日
                    </Text>
                  </View>
                </View>

                {/* Feature List */}
                <View style={styles.featureList}>
                  {plan.featureKeys.map((featureKey, index) => (
                    <View key={index} style={styles.featureItem}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                      <Text style={[styles.featureText, { color: colors.text }]}>{t(featureKey)}</Text>
                    </View>
                  ))}
                </View>

                {/* Select Button */}
                <TouchableOpacity
                  style={[
                    styles.selectButton,
                    { backgroundColor: isCurrentPlan ? colors.border : plan.color },
                    (isLoading && purchasingPlan === plan.id) && styles.buttonDisabled,
                  ]}
                  onPress={() => handleSelectPlan(plan.id)}
                  disabled={isCurrentPlan || isLoading}
                >
                  {isLoading && purchasingPlan === plan.id ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={[
                      styles.selectButtonText,
                      isCurrentPlan && { color: colors.textSecondary }
                    ]}>
                      {isCurrentPlan 
                        ? '現在のプラン' 
                        : plan.isTrial 
                          ? '無料で始める' 
                          : isYearly 
                            ? '年払いで始める' 
                            : '月払いで始める'}
                    </Text>
                  )}
                </TouchableOpacity>
              </TouchableOpacity>
            </Animated.View>
          );
        })}

        {/* Comparison Table Toggle */}
        <TouchableOpacity 
          style={[styles.comparisonToggle, { backgroundColor: colors.card }]}
          onPress={() => setShowComparison(!showComparison)}
        >
          <Text style={[styles.comparisonToggleText, { color: colors.text }]}>
            📊 プラン比較表
          </Text>
          <Ionicons 
            name={showComparison ? 'chevron-up' : 'chevron-down'} 
            size={20} 
            color={colors.textSecondary} 
          />
        </TouchableOpacity>

        {/* Comparison Table */}
        {showComparison && (
          <View style={[styles.comparisonTable, { backgroundColor: colors.card }]}>
            <View style={[styles.comparisonHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.comparisonCell, styles.comparisonHeaderCell, styles.featureCell, { color: colors.text }]}>機能</Text>
              {PLANS.map(plan => (
                <Text key={plan.id} style={[styles.comparisonCell, styles.comparisonHeaderCell, { color: plan.color }]}>
                  {plan.icon}
                </Text>
              ))}
            </View>
            
            {COMPARISON_FEATURES.map((feature, index) => (
              <View key={feature.key} style={[styles.comparisonRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.comparisonCell, styles.featureCell, { color: colors.text }]}>{feature.label}</Text>
                {feature.values.map((value, idx) => (
                  <Text 
                    key={idx} 
                    style={[
                      styles.comparisonCell, 
                      { color: colors.textSecondary },
                      value === '○' && { color: colors.success },
                      value === '✕' && { color: colors.error + '60' },
                    ]}
                  >
                    {value}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerItem}>
            <Ionicons name="shield-checkmark" size={18} color={colors.success} />
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>{t('pricing.footer.secure')}</Text>
          </View>
          <View style={styles.footerItem}>
            <Ionicons name="refresh" size={18} color={colors.textSecondary} />
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>{t('pricing.footer.cancelAnytime')}</Text>
          </View>
          <View style={styles.footerItem}>
            <Ionicons name="card" size={18} color={colors.textSecondary} />
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>Apple Pay / Google Pay対応</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  
  // Header
  headerSection: { marginBottom: 24 },
  backButton: { 
    width: 40, 
    height: 40, 
    justifyContent: 'center', 
    marginBottom: 12 
  },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', marginTop: 8 },
  
  // Slot Full Banner
  slotFullBanner: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  slotFullIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  slotFullTextContainer: { flex: 1 },
  slotFullTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  slotFullText: { fontSize: 14, lineHeight: 20 },
  
  // Billing Toggle
  billingToggleContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  billingOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  billingOptionActive: {},
  billingOptionText: { fontSize: 15, fontWeight: '600' },
  savingsBadge: {
    backgroundColor: '#E91E63',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  savingsText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },

  // Plan Card
  planCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  currentPlanCard: {},
  planBadge: {
    position: 'absolute',
    top: -12,
    left: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  planBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  currentBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  currentBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  
  // Plan Header
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    marginTop: 8,
  },
  planNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planIcon: { fontSize: 24 },
  planName: { fontSize: 22, fontWeight: 'bold' },
  priceContainer: { alignItems: 'flex-end' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline' },
  priceText: { fontSize: 28, fontWeight: 'bold' },
  priceUnit: { fontSize: 14, marginLeft: 4 },
  trialPeriod: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  yearlyPriceWrapper: { alignItems: 'flex-end' },
  yearlyPriceRow: { flexDirection: 'row', alignItems: 'baseline' },
  monthlyBreakdown: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  monthlyEquivalent: { fontSize: 12, fontWeight: '600' },
  savingsTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  savingsTagText: { fontSize: 10, fontWeight: 'bold' },
  
  // Slot Info
  slotInfo: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  slotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  slotText: { fontSize: 13, fontWeight: '600' },
  messageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  messageText: { fontSize: 13, fontWeight: '600' },
  
  // Feature List
  featureList: { marginBottom: 16, gap: 8 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 14, flex: 1 },
  
  // Select Button
  selectButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  selectButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.7 },
  
  // Comparison Toggle
  comparisonToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  comparisonToggleText: { fontSize: 16, fontWeight: '600' },
  
  // Comparison Table
  comparisonTable: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 24,
  },
  comparisonHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    paddingBottom: 8,
    marginBottom: 8,
  },
  comparisonRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  comparisonCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
  },
  comparisonHeaderCell: { fontWeight: 'bold', fontSize: 14 },
  featureCell: { textAlign: 'left', fontWeight: '500', flex: 1.5 },
  
  // Footer
  footer: { marginTop: 8, gap: 12 },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerText: { fontSize: 13 },
});
