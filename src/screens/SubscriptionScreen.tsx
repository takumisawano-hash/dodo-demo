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
      '購入確認',
      `${selectedPlan.name}プラン（¥${selectedPlan.price}/月）を購入しますか？${
        selectedPlan.id === 'basic' ? '\n\n7日間の無料トライアル付き' : ''
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
          Alert.alert('復元完了', `${status.currentPlan.toUpperCase()}プランが復元されました`);
        } else {
          Alert.alert('復元完了', '有効なサブスクリプションは見つかりませんでした');
        }
      }
    } catch (error) {
      Alert.alert('エラー', '購入の復元に失敗しました');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>🦤 プランを選択</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          あなたに合ったプランを見つけましょう
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Trial Banner */}
        <View style={[styles.trialBanner, { backgroundColor: isDark ? '#3D2E00' : '#FFF3E0' }]}>
          <Text style={styles.trialEmoji}>🎁</Text>
          <View style={styles.trialTextContainer}>
            <Text style={[styles.trialTitle, { color: isDark ? '#FFB74D' : '#E65100' }]}>7日間無料トライアル</Text>
            <Text style={[styles.trialDescription, { color: isDark ? '#FFA726' : '#F57C00' }]}>
              Basicプランを無料でお試し！いつでもキャンセル可能
            </Text>
          </View>
        </View>

        {/* Plan Cards */}
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            selected={selectedPlan.id === plan.id}
            onSelect={setSelectedPlan}
          />
        ))}

        {/* Comparison Table */}
        <View style={[styles.comparisonTable, { backgroundColor: colors.card }]}>
          <Text style={[styles.comparisonTitle, { color: colors.text }]}>プラン比較</Text>
          <View style={[styles.tableHeader, { borderBottomColor: isDark ? '#444' : '#E0E0E0' }]}>
            <Text style={[styles.tableCell, styles.tableHeaderCell, styles.featureCell, { color: colors.text }]}>機能</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { color: colors.text }]}>Free</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { color: colors.text }]}>Basic</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCell, { color: colors.text }]}>Pro</Text>
          </View>
          
          <ComparisonRow feature="メッセージ" values={['3/日', '無制限', '無制限']} />
          <ComparisonRow feature="エージェント" values={['1体', '全て', '全て']} />
          <ComparisonRow feature="サポート" values={['基本', 'メール', '優先']} />
          <ComparisonRow feature="カスタム" values={['✕', '✕', '○']} />
          <ComparisonRow feature="レポート" values={['✕', '✕', '○']} />
        </View>
      </ScrollView>

      {/* Subscribe Button */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: isDark ? '#333' : '#E0E0E0' }]}>
        {/* Current subscription badge */}
        {currentSubscription?.currentPlan && currentSubscription.currentPlan !== 'free' && (
          <View style={[styles.currentPlanBadge, { backgroundColor: isDark ? '#1B3D1B' : '#E8F5E9' }]}>
            <Text style={[styles.currentPlanText, { color: isDark ? '#81C784' : '#2E7D32' }]}>
              現在のプラン: {currentSubscription.currentPlan.toUpperCase()}
            </Text>
          </View>
        )}
        
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
            <Text style={styles.subscribeButtonText}>
              {selectedPlan.id === 'free' 
                ? '無料プランを継続' 
                : selectedPlan.id === 'basic'
                ? '7日間無料で試す'
                : `¥${selectedPlan.price}/月 で始める`}
            </Text>
          )}
        </TouchableOpacity>
        
        {/* Restore purchases button */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={isLoading || isRestoring}
        >
          {isRestoring ? (
            <ActivityIndicator size="small" color="#FF9800" />
          ) : (
            <Text style={styles.restoreButtonText}>購入を復元</Text>
          )}
        </TouchableOpacity>
        
        <Text style={[styles.footerNote, { color: colors.textSecondary }]}>
          いつでもキャンセル可能 • 自動更新
        </Text>
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
    backgroundColor: '#FAFAFA',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#FF9800',
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  trialBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  trialEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  trialTextContainer: {
    flex: 1,
  },
  trialTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
  },
  trialDescription: {
    fontSize: 13,
    color: '#F57C00',
    marginTop: 2,
  },
  comparisonTable: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  comparisonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tableCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    color: '#444',
  },
  tableHeaderCell: {
    fontWeight: 'bold',
    color: '#333',
  },
  featureCell: {
    textAlign: 'left',
    fontWeight: '500',
  },
  valueCell: {
    color: '#666',
  },
  checkValue: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  crossValue: {
    color: '#BDBDBD',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  subscribeButton: {
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    marginTop: 8,
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
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '500',
  },
  currentPlanBadge: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 12,
    alignSelf: 'center',
  },
  currentPlanText: {
    color: '#2E7D32',
    fontSize: 13,
    fontWeight: '600',
  },
});
