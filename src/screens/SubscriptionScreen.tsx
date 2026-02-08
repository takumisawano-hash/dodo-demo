import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PlanCard, { Plan } from '../components/PlanCard';

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
  const [selectedPlan, setSelectedPlan] = useState<Plan>(PLANS[1]);

  const handleSubscribe = () => {
    if (selectedPlan.id === 'free') {
      Alert.alert(
        '無料プラン',
        '現在のプランを継続します。',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }

    // TODO: Implement actual subscription logic with RevenueCat or similar
    Alert.alert(
      '購入確認',
      `${selectedPlan.name}プラン（¥${selectedPlan.price}/月）を購入しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { 
          text: selectedPlan.id === 'basic' ? '7日間無料で試す' : '購入する',
          onPress: () => {
            Alert.alert('完了', '購入が完了しました！', [
              { text: 'OK', onPress: () => navigation.goBack() }
            ]);
          }
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🦤 プランを選択</Text>
        <Text style={styles.subtitle}>
          あなたに合ったプランを見つけましょう
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Trial Banner */}
        <View style={styles.trialBanner}>
          <Text style={styles.trialEmoji}>🎁</Text>
          <View style={styles.trialTextContainer}>
            <Text style={styles.trialTitle}>7日間無料トライアル</Text>
            <Text style={styles.trialDescription}>
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
        <View style={styles.comparisonTable}>
          <Text style={styles.comparisonTitle}>プラン比較</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.tableHeaderCell, styles.featureCell]}>機能</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCell]}>Free</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCell]}>Basic</Text>
            <Text style={[styles.tableCell, styles.tableHeaderCell]}>Pro</Text>
          </View>
          
          <ComparisonRow feature="メッセージ" values={['3/日', '無制限', '無制限']} />
          <ComparisonRow feature="エージェント" values={['1体', '全て', '全て']} />
          <ComparisonRow feature="サポート" values={['基本', 'メール', '優先']} />
          <ComparisonRow feature="カスタム" values={['✕', '✕', '○']} />
          <ComparisonRow feature="レポート" values={['✕', '✕', '○']} />
        </View>
      </ScrollView>

      {/* Subscribe Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.subscribeButton, { backgroundColor: selectedPlan.color }]}
          onPress={handleSubscribe}
          activeOpacity={0.8}
        >
          <Text style={styles.subscribeButtonText}>
            {selectedPlan.id === 'free' 
              ? '無料プランを継続' 
              : selectedPlan.id === 'basic'
              ? '7日間無料で試す'
              : `¥${selectedPlan.price}/月 で始める`}
          </Text>
        </TouchableOpacity>
        <Text style={styles.footerNote}>
          いつでもキャンセル可能 • 自動更新
        </Text>
      </View>
    </SafeAreaView>
  );
}

function ComparisonRow({ feature, values }: { feature: string; values: string[] }) {
  return (
    <View style={styles.tableRow}>
      <Text style={[styles.tableCell, styles.featureCell]}>{feature}</Text>
      {values.map((value, index) => (
        <Text 
          key={index} 
          style={[
            styles.tableCell, 
            styles.valueCell,
            value === '○' && styles.checkValue,
            value === '✕' && styles.crossValue,
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
});
