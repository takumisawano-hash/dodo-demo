import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { t, useI18n, formatCurrency } from '../i18n';

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
  color: string;
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
    color: '#BA68C8',
  },
];

interface Props {
  navigation: any;
  route?: { params?: { fromSlotFull?: boolean; pendingAgent?: any } };
}

export default function PricingScreen({ navigation, route }: Props) {
  const { language } = useI18n();
  const [currentPlan, setCurrentPlan] = useState('trial');
  const [isYearly, setIsYearly] = useState(false);
  
  // スロット満杯から来た場合のフラグ
  const fromSlotFull = route?.params?.fromSlotFull;
  const pendingAgent = route?.params?.pendingAgent;

  const getPrice = (plan: Plan) => {
    if (plan.isTrial) return 0;
    return isYearly ? plan.yearlyPrice : plan.monthlyPrice;
  };

  const getMonthlyEquivalent = (plan: Plan) => {
    if (plan.isTrial) return 0;
    return isYearly ? Math.floor(plan.yearlyPrice / 12) : plan.monthlyPrice;
  };

  const formatPrice = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  const handleSelectPlan = (planId: string) => {
    if (planId === currentPlan) return;
    
    const plan = PLANS.find(p => p.id === planId);
    if (!plan) return;

    if (plan.isTrial) {
      Alert.alert(
        t('pricing.changePlan'),
        t('pricing.downgradeTo'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('pricing.change'), onPress: () => setCurrentPlan(planId) },
        ]
      );
    } else {
      const price = getPrice(plan);
      const period = isYearly ? t('pricing.perYear') : t('pricing.perMonth');
      Alert.alert(
        t('pricing.changePlan'),
        t('pricing.upgradeTo', { name: plan.nameKey, price: `${formatPrice(price)}${period}` }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('pricing.change'), onPress: () => setCurrentPlan(planId) },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t('pricing.title')}</Text>
        <Text style={styles.subtitle}>{t('pricing.subtitle')}</Text>

        {/* スロット満杯からの誘導メッセージ */}
        {fromSlotFull && (
          <View style={styles.slotFullBanner}>
            <Text style={styles.slotFullTitle}>🔒 スロットがいっぱいです</Text>
            <Text style={styles.slotFullText}>
              {pendingAgent?.name ? `${pendingAgent.name}を追加するには、` : '新しいコーチを追加するには、'}
              プランをアップグレードするか、スロットを追加購入してください。
            </Text>
          </View>
        )}

        {/* 月払い/年払い切り替えトグル */}
        <View style={styles.billingToggle}>
          <Text style={[styles.billingText, !isYearly && styles.billingTextActive]}>
            {t('pricing.monthly')}
          </Text>
          <Switch
            value={isYearly}
            onValueChange={setIsYearly}
            trackColor={{ false: '#E0E0E0', true: '#81C784' }}
            thumbColor={isYearly ? '#4CAF50' : '#BDBDBD'}
          />
          <View style={styles.yearlyLabelContainer}>
            <Text style={[styles.billingText, isYearly && styles.billingTextActive]}>
              {t('pricing.yearly')}
            </Text>
            {isYearly && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>{t('pricing.discount')}</Text>
              </View>
            )}
          </View>
        </View>

        {PLANS.map((plan) => (
          <TouchableOpacity
            key={plan.id}
            style={[
              styles.planCard,
              { borderColor: plan.color + '40' },
              plan.isPopular && { borderColor: plan.color, borderWidth: 2 },
              currentPlan === plan.id && styles.currentPlanCard,
            ]}
            onPress={() => handleSelectPlan(plan.id)}
            activeOpacity={0.8}
          >
            {plan.isPopular && (
              <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
                <Text style={styles.popularText}>{t('pricing.popular')}</Text>
              </View>
            )}

            {plan.isTrial && (
              <View style={[styles.trialBadge, { backgroundColor: '#FF7043' }]}>
                <Text style={styles.trialText}>{t('pricing.freeTrial')}</Text>
              </View>
            )}
            
            {currentPlan === plan.id && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>{t('pricing.currentPlan')}</Text>
              </View>
            )}

            <View style={styles.planHeader}>
              <Text style={[styles.planName, { color: plan.color }]}>{plan.nameKey}</Text>
              <View style={styles.priceContainer}>
                {plan.isTrial ? (
                  <View>
                    <Text style={styles.priceText}>¥0</Text>
                    <Text style={styles.trialPeriod}>{t('pricing.trialPeriod')}</Text>
                  </View>
                ) : isYearly ? (
                  <View style={styles.yearlyPriceWrapper}>
                    <View style={styles.yearlyPriceRow}>
                      <Text style={styles.priceText}>{formatPrice(plan.yearlyPrice)}</Text>
                      <Text style={styles.priceUnit}>{t('pricing.perYear')}</Text>
                    </View>
                    <Text style={styles.monthlyEquivalent}>
                      {t('pricing.monthlyEquivalent', { price: formatPrice(getMonthlyEquivalent(plan)) })}
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.priceText}>{formatPrice(plan.monthlyPrice)}</Text>
                    <Text style={styles.priceUnit}>{t('pricing.perMonth')}</Text>
                  </>
                )}
              </View>
            </View>

            <View style={styles.slotInfo}>
              <View style={[styles.slotBadge, { backgroundColor: plan.color + '20' }]}>
                <Text style={[styles.slotText, { color: plan.color }]}>
                  🤖 {plan.slots === 'unlimited' ? t('pricing.allAgents') : `${plan.slots}`}
                </Text>
              </View>
              <View style={[styles.messageBadge, { backgroundColor: plan.color + '10' }]}>
                <Text style={[styles.messageText, { color: plan.color }]}>
                  💬 {t('pricing.messagesPerDay', { count: plan.dailyLimit })}
                </Text>
              </View>
            </View>

            <View style={styles.featureList}>
              {plan.featureKeys.map((featureKey, index) => (
                <View key={index} style={styles.featureItem}>
                  <Text style={styles.featureCheck}>✅</Text>
                  <Text style={styles.featureText}>{t(featureKey)}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.selectButton,
                { backgroundColor: currentPlan === plan.id ? '#E0E0E0' : plan.color },
              ]}
              onPress={() => handleSelectPlan(plan.id)}
              disabled={currentPlan === plan.id}
            >
              <Text style={[
                styles.selectButtonText,
                currentPlan === plan.id && { color: '#999' }
              ]}>
                {currentPlan === plan.id 
                  ? t('pricing.selected') 
                  : plan.isTrial 
                    ? t('pricing.tryFree') 
                    : t('pricing.selectPlan')}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('pricing.footer.secure')}</Text>
          <Text style={styles.footerText}>{t('pricing.footer.cancelAnytime')}</Text>
          <Text style={styles.footerText}>{t('pricing.footer.yearlyDiscount')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8, marginBottom: 16 },
  
  slotFullBanner: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  slotFullTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 6,
  },
  slotFullText: {
    fontSize: 14,
    color: '#F57C00',
    lineHeight: 20,
  },
  
  billingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 12,
  },
  billingText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  },
  billingTextActive: {
    color: '#333',
    fontWeight: '700',
  },
  yearlyLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  discountBadge: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  discountText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },

  planCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  currentPlanCard: {
    backgroundColor: '#F5F5F5',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  trialBadge: {
    position: 'absolute',
    top: -10,
    left: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trialText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  currentBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  currentBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planName: { fontSize: 24, fontWeight: 'bold' },
  priceContainer: { flexDirection: 'row', alignItems: 'baseline' },
  priceText: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  priceUnit: { fontSize: 14, color: '#666', marginLeft: 4 },
  trialPeriod: { fontSize: 12, color: '#FF7043', fontWeight: '600', textAlign: 'right' },
  yearlyPriceWrapper: { alignItems: 'flex-end' },
  yearlyPriceRow: { flexDirection: 'row', alignItems: 'baseline' },
  monthlyEquivalent: { fontSize: 11, color: '#4CAF50', fontWeight: '600', marginTop: 2 },
  
  slotInfo: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  slotBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  slotText: { fontSize: 14, fontWeight: '600' },
  messageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  messageText: { fontSize: 14, fontWeight: '600' },
  featureList: { marginBottom: 16 },
  featureItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  featureCheck: { fontSize: 14, marginRight: 8 },
  featureText: { fontSize: 14, color: '#555', flex: 1 },
  selectButton: {
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
  },
  selectButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  footer: { marginTop: 20, alignItems: 'center' },
  footerText: { fontSize: 12, color: '#888', marginBottom: 8 },
});
