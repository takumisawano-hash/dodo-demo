import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PlanCard, { Plan } from '../components/PlanCard';
import { purchaseService, SubscriptionStatus } from '../services/purchases';
import { useTheme } from '../theme';

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: '',
    color: '#9E9E9E',
    features: [
      '1日3メッセージまで',
      '1エージェントのみ利用可能',
      '基本的なサポート',
    ],
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 480,
    period: '月',
    color: '#FF9800',
    recommended: true,
    features: [
      '無制限メッセージ',
      '全エージェント利用可能',
      'メールサポート',
      '7日間無料トライアル',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 980,
    period: '月',
    color: '#BA68C8',
    features: [
      '無制限メッセージ',
      '全エージェント利用可能',
      '優先サポート',
      'カスタムエージェント作成',
      '詳細な進捗レポート',
    ],
  },
];

interface Props {
  navigation: any;
}

export default function SubscriptionScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const [selectedPlan, setSelectedPlan] = useState<Plan>(PLANS[1]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionStatus | null>(null);

  // Initialize RevenueCat and check current subscription
  useEffect(() => {
    const initPurchases = async () => {
      await purchaseService.initialize();
      const status = await purchaseService.getSubscriptionStatus();
      setCurrentSubscription(status);
      
      // Pre-select current plan if subscribed
      if (status.currentPlan && status.currentPlan !== 'free') {
        const currentPlanData = PLANS.find(p => p.id === status.currentPlan);
        if (currentPlanData) {
          setSelectedPlan(currentPlanData);
        }
      }
    };
    initPurchases();
  }, []);

  // Calculate next renewal date (mock)
  const getNextRenewalDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Calculate days until renewal
  const getDaysUntilRenewal = () => {
    const now = new Date();
    const renewal = new Date();
    renewal.setMonth(renewal.getMonth() + 1);
    const diff = renewal.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const handleSubscribe = async () => {
    if (selectedPlan.id === 'free') {
      Alert.alert(
        '無料プラン',
        '現在のプランを継続します。',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }

    // Confirm purchase
    Alert.alert(
      '📋 購入確認',
      `${selectedPlan.name}プラン（¥${selectedPlan.price}/月）を購入しますか？${
        selectedPlan.id === 'basic' ? '\n\n🎁 7日間の無料トライアル付き' : ''
      }`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: selectedPlan.id === 'basic' ? '7日間無料で試す' : '購入する',
          onPress: async () => {
            setIsLoading(true);
            try {
              const result = await purchaseService.purchasePlan(selectedPlan.id);
              
              if (result.success) {
                Alert.alert(
                  '🎉 購入完了',
                  `${selectedPlan.name}プランへのアップグレードが完了しました！`,
                  [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
              } else if (result.cancelled) {
                // User cancelled, do nothing
              } else {
                Alert.alert('エラー', result.error || '購入に失敗しました');
              }
            } catch (error) {
              console.error('Purchase error:', error);
              Alert.alert('エラー', '購入処理中にエラーが発生しました');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const customerInfo = await purchaseService.restorePurchases();
      if (customerInfo) {
        const status = await purchaseService.getSubscriptionStatus();
        setCurrentSubscription(status);
        
        if (status.currentPlan && status.currentPlan !== 'free') {
          Alert.alert('✅ 復元完了', `${status.currentPlan.toUpperCase()}プランが復元されました`);
        } else {
          Alert.alert('ℹ️ 復元完了', '有効なサブスクリプションは見つかりませんでした');
        }
      }
    } catch (error) {
      Alert.alert('エラー', '購入の復元に失敗しました');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleManageSubscription = () => {
    Alert.alert(
      '📱 サブスクリプション管理',
      'App Store / Google Playのサブスクリプション管理画面を開きますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '開く', onPress: () => {
          // In real app, open subscription management
          Alert.alert('管理画面', 'App Store / Google Playのサブスクリプション管理画面へリダイレクトします');
        }},
      ]
    );
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      '⚠️ 解約について',
      '解約をご検討されていますか？\n\n解約すると以下の機能が使えなくなります：\n• 無制限メッセージ\n• 全エージェントへのアクセス\n• 優先サポート\n\n解約はApp Store / Google Playのサブスクリプション管理から行えます。',
      [
        { text: '続ける', style: 'cancel' },
        { 
          text: '解約手順を確認', 
          onPress: handleManageSubscription 
        },
      ]
    );
  };

  const isSubscribed = currentSubscription?.currentPlan && currentSubscription.currentPlan !== 'free';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>🦤 サブスクリプション</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          あなたに合ったプランを見つけましょう
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Subscription Status Card */}
        {isSubscribed && (
          <View style={[styles.currentStatusCard, { backgroundColor: colors.card }]}>
            <View style={styles.statusHeader}>
              <View style={[styles.statusIconBg, { backgroundColor: colors.success + '20' }]}>
                <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              </View>
              <View style={styles.statusInfo}>
                <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>現在のプラン</Text>
                <Text style={[styles.statusPlan, { color: colors.text }]}>
                  {currentSubscription?.currentPlan?.toUpperCase()} プラン
                </Text>
              </View>
              <View style={[styles.activeBadge, { backgroundColor: colors.success }]}>
                <Text style={styles.activeBadgeText}>有効</Text>
              </View>
            </View>
            
            <View style={[styles.renewalInfo, { backgroundColor: isDark ? '#1A1A1A' : '#F5F5F5' }]}>
              <View style={styles.renewalRow}>
                <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                <Text style={[styles.renewalLabel, { color: colors.textSecondary }]}>次回更新日</Text>
                <Text style={[styles.renewalDate, { color: colors.text }]}>{getNextRenewalDate()}</Text>
              </View>
              <View style={styles.renewalRow}>
                <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
                <Text style={[styles.renewalLabel, { color: colors.textSecondary }]}>残り日数</Text>
                <Text style={[styles.renewalDays, { color: colors.primary }]}>{getDaysUntilRenewal()}日</Text>
              </View>
            </View>

            <View style={styles.statusActions}>
              <TouchableOpacity 
                style={[styles.statusActionButton, { backgroundColor: colors.primary + '15' }]}
                onPress={handleManageSubscription}
              >
                <Ionicons name="settings-outline" size={18} color={colors.primary} />
                <Text style={[styles.statusActionText, { color: colors.primary }]}>管理</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.statusActionButton, { backgroundColor: isDark ? '#3D1B1B' : '#FFEBEE' }]}
                onPress={handleCancelSubscription}
              >
                <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                <Text style={[styles.statusActionText, { color: colors.error }]}>解約</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Trial Banner - Only show for non-subscribers */}
        {!isSubscribed && (
          <View style={[styles.trialBanner, { backgroundColor: isDark ? '#3D2E00' : '#FFF3E0' }]}>
            <View style={styles.trialIconContainer}>
              <Text style={styles.trialEmoji}>🎁</Text>
            </View>
            <View style={styles.trialTextContainer}>
              <Text style={[styles.trialTitle, { color: isDark ? '#FFB74D' : '#E65100' }]}>7日間無料トライアル</Text>
              <Text style={[styles.trialDescription, { color: isDark ? '#FFA726' : '#F57C00' }]}>
                Basicプランを無料でお試し！いつでもキャンセル可能
              </Text>
            </View>
          </View>
        )}

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {isSubscribed ? 'プランを変更' : 'プランを選択'}
          </Text>
        </View>

        {/* Plan Cards */}
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            selected={selectedPlan.id === plan.id}
            current={currentSubscription?.currentPlan === plan.id}
            onSelect={setSelectedPlan}
          />
        ))}

        {/* Comparison Table */}
        <View style={[styles.comparisonTable, { backgroundColor: colors.card }]}>
          <Text style={[styles.comparisonTitle, { color: colors.text }]}>📊 プラン比較</Text>
          <View style={[styles.tableHeader, { borderBottomColor: isDark ? '#444' : '#E0E0E0' }]}>
            <Text style={[styles.tableCell, styles.tableHeaderCell, styles.featureCell, { color: colors.text }]}>機能</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { color: colors.text }]}>Free</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { color: '#FF9800' }]}>Basic</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { color: '#BA68C8' }]}>Pro</Text>
          </View>
          
          <ComparisonRow feature="メッセージ" values={['3/日', '無制限', '無制限']} />
          <ComparisonRow feature="エージェント" values={['1体', '全て', '全て']} />
          <ComparisonRow feature="サポート" values={['基本', 'メール', '優先']} />
          <ComparisonRow feature="カスタム" values={['✕', '✕', '○']} />
          <ComparisonRow feature="レポート" values={['✕', '✕', '○']} />
        </View>

        {/* Cancellation Notice */}
        <View style={[styles.cancellationNotice, { backgroundColor: isDark ? '#1A1A1A' : '#F5F5F5' }]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
          <View style={styles.cancellationTextContainer}>
            <Text style={[styles.cancellationTitle, { color: colors.text }]}>解約について</Text>
            <Text style={[styles.cancellationText, { color: colors.textSecondary }]}>
              • いつでもキャンセル可能{'\n'}
              • 解約後も期間終了まで利用可能{'\n'}
              • App Store / Google Playから解約手続き
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Subscribe Button */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: isDark ? '#333' : '#E0E0E0' }]}>
        <TouchableOpacity
          style={[
            styles.subscribeButton, 
            { backgroundColor: selectedPlan.color },
            isLoading && styles.buttonDisabled,
          ]}
          onPress={handleSubscribe}
          activeOpacity={0.8}
          disabled={isLoading || isRestoring}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.subscribeButtonText}>
                {selectedPlan.id === 'free' 
                  ? '無料プランを継続' 
                  : selectedPlan.id === 'basic'
                  ? '🎁 7日間無料で試す'
                  : `¥${selectedPlan.price}/月 で始める`}
              </Text>
              {selectedPlan.id !== 'free' && (
                <Text style={styles.subscribeSubtext}>
                  いつでもキャンセル可能
                </Text>
              )}
            </>
          )}
        </TouchableOpacity>
        
        {/* Restore purchases button */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={isLoading || isRestoring}
        >
          {isRestoring ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.restoreButtonText, { color: colors.primary }]}>
              購入を復元
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function ComparisonRow({ feature, values }: { feature: string; values: string[] }) {
  const { colors, isDark } = useTheme();
  return (
    <View style={[styles.tableRow, { borderBottomColor: isDark ? '#333' : '#F0F0F0' }]}>
      <Text style={[styles.tableCell, styles.featureCell, { color: colors.text }]}>{feature}</Text>
      {values.map((value, index) => (
        <Text 
          key={index} 
          style={[
            styles.tableCell, 
            styles.valueCell,
            { color: colors.textSecondary },
            value === '○' && styles.checkValue,
            value === '✕' && [styles.crossValue, { color: isDark ? '#666' : '#BDBDBD' }],
          ]}
        >
          {value}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  
  // Current Status Card
  currentStatusCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  statusPlan: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  activeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  renewalInfo: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  renewalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  renewalLabel: {
    flex: 1,
    fontSize: 14,
  },
  renewalDate: {
    fontSize: 14,
    fontWeight: '600',
  },
  renewalDays: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusActions: {
    flexDirection: 'row',
    gap: 12,
  },
  statusActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  statusActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Trial Banner
  trialBanner: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  trialIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  trialEmoji: {
    fontSize: 24,
  },
  trialTextContainer: {
    flex: 1,
  },
  trialTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  trialDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  
  // Section Header
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  
  // Comparison Table
  comparisonTable: {
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tableCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
  },
  tableHeaderCell: {
    fontWeight: 'bold',
  },
  featureCell: {
    textAlign: 'left',
    fontWeight: '500',
  },
  valueCell: {},
  checkValue: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  crossValue: {},
  
  // Cancellation Notice
  cancellationNotice: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  cancellationTextContainer: {
    flex: 1,
  },
  cancellationTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  cancellationText: {
    fontSize: 13,
    lineHeight: 20,
  },
  
  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  subscribeButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  subscribeSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  restoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  restoreButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
