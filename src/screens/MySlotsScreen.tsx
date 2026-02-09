import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AGENT_IMAGES } from '../data/agentImages';
import { useSlots, Agent } from '../context/SlotsContext';
import { useTheme } from '../theme';

interface Plan {
  id: string;
  name: string;
  slots: number;
  price: number;
}

const PLANS: Plan[] = [
  { id: 'lite', name: 'Lite', slots: 1, price: 500 },
  { id: 'basic', name: 'Basic', slots: 3, price: 980 },
  { id: 'pro', name: 'Pro', slots: 5, price: 1980 },
  { id: 'unlimited', name: 'Unlimited', slots: 15, price: 2980 },
];

// プラン情報の型定義（後でAPIに置き換え可能な設計）
interface PlanInfo {
  planId: string;
  slots: number;
  usedSlots: number;
  dailyLimit: number;
  usedToday: number;
  trialEndsAt: Date | null;  // Free Trial終了日
  additionalSlots: number;   // 追加購入したスロット数
  additionalMessages: number; // 追加購入した会話回数
}

interface Props {
  navigation: any;
  route: { params?: { addAgent?: Agent; slotIndex?: number; quickAddAgent?: Agent } };
}

// 追加スロット単価
const ADDITIONAL_SLOT_PRICE = 300;
// 追加会話制限単価（50回あたり）
const ADDITIONAL_MESSAGES_PRICE = 200;
const ADDITIONAL_MESSAGES_AMOUNT = 50;

export default function MySlotsScreen({ navigation, route }: Props) {
  const { colors, isDark } = useTheme();
  
  // グローバルスロット状態を使用
  const { assignedAgents, setAssignedAgents, allAgents, addToSlot, removeFromSlot, isInSlot, hasEmptySlot } = useSlots();

  // プラン情報のstate（後でAPIから取得可能な設計）
  const [planInfo, setPlanInfo] = useState<PlanInfo>({
    planId: 'basic',
    slots: 3,
    usedSlots: 2,
    dailyLimit: 100,
    usedToday: 45,
    trialEndsAt: null,  // 例: new Date('2025-02-15') でトライアル表示
    additionalSlots: 0,
    additionalMessages: 0,
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);

  const currentPlan = PLANS.find(p => p.id === planInfo.planId) || PLANS[1];

  // プロフィール画面から戻ってきた時にエージェントを追加
  useEffect(() => {
    if (route.params?.addAgent && route.params?.slotIndex !== undefined) {
      addToSlot(route.params.addAgent, route.params.slotIndex);
      // パラメータをクリア
      navigation.setParams({ addAgent: undefined, slotIndex: undefined });
    }
  }, [route.params?.addAgent]);

  // ホームからクイック追加された場合
  useEffect(() => {
    if (route.params?.quickAddAgent) {
      const agent = route.params.quickAddAgent;
      // 既に追加済みかチェック
      if (isInSlot(agent.id)) {
        if (typeof window !== 'undefined') {
          window.alert(`${agent.name}は既にスロットに追加されています。`);
        }
        navigation.setParams({ quickAddAgent: undefined });
        return;
      }
      // addToSlotを使用
      const success = addToSlot(agent);
      if (success) {
        if (typeof window !== 'undefined') {
          window.alert(`${agent.name}を追加しました！`);
        }
      } else {
        // スロット満杯 → 直接Pricingに誘導
        navigation.navigate('Pricing', { 
          fromSlotFull: true,
          pendingAgent: agent 
        });
      }
      navigation.setParams({ quickAddAgent: undefined });
    }
  }, [route.params?.quickAddAgent]);
  
  // 合計スロット数（基本 + 追加購入分）
  const totalSlots = planInfo.slots + planInfo.additionalSlots;
  const usedSlots = assignedAgents.filter(a => a !== null).length;
  const emptySlots = totalSlots - usedSlots;

  // 使用率の計算
  const dailyUsagePercent = (planInfo.usedToday / planInfo.dailyLimit) * 100;
  const slotUsagePercent = (usedSlots / totalSlots) * 100;

  // Free Trial 残り日数の計算
  const trialDaysRemaining = useMemo(() => {
    if (!planInfo.trialEndsAt) return null;
    const now = new Date();
    const diff = planInfo.trialEndsAt.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }, [planInfo.trialEndsAt]);

  // Proプランではないかチェック
  const isNotProOrHigher = planInfo.planId !== 'pro' && planInfo.planId !== 'unlimited';

  const openSwapModal = (slotIndex: number) => {
    setSelectedSlotIndex(slotIndex);
    setModalVisible(true);
  };

  const assignAgent = (agent: Agent) => {
    if (selectedSlotIndex !== null) {
      addToSlot(agent, selectedSlotIndex);
    }
    setModalVisible(false);
    setSelectedSlotIndex(null);
  };

  const removeAgentFromSlot = (slotIndex: number) => {
    removeFromSlot(slotIndex);
  };

  // スロット追加購入の確認
  const handleAddSlot = () => {
    // Web対応: window.confirmを使用
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        `1スロットを追加購入しますか？\n\n月額 +¥${ADDITIONAL_SLOT_PRICE}/月`
      );
      if (confirmed) {
        // 追加スロットを購入（後でAPI呼び出しに置き換え）
        setPlanInfo(prev => ({
          ...prev,
          additionalSlots: prev.additionalSlots + 1,
        }));
        // スロット配列にnullを追加
        setAssignedAgents([...assignedAgents, null]);
        window.alert('スロットを追加しました！');
      }
    }
  };

  // 会話制限追加購入の確認
  const handleAddMessages = () => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        `会話回数を${ADDITIONAL_MESSAGES_AMOUNT}回追加しますか？\n\n+¥${ADDITIONAL_MESSAGES_PRICE}`
      );
      if (confirmed) {
        setPlanInfo(prev => ({
          ...prev,
          dailyLimit: prev.dailyLimit + ADDITIONAL_MESSAGES_AMOUNT,
          additionalMessages: prev.additionalMessages + ADDITIONAL_MESSAGES_AMOUNT,
        }));
        window.alert(`会話回数を${ADDITIONAL_MESSAGES_AMOUNT}回追加しました！`);
      }
    }
  };

  const availableAgents = allAgents.filter(
    agent => !isInSlot(agent.id)
  );

  // スロット配列をプランに合わせて調整
  const slots = Array.from({ length: totalSlots }, (_, i) => assignedAgents[i] || null);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={[styles.backText, { color: colors.primary }]}>← 戻る</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>マイスロット</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>コーチを自由に入れ替えよう</Text>
        </View>

        {/* Free Trial 残り日数表示 */}
        {trialDaysRemaining !== null && trialDaysRemaining > 0 && (
          <View style={styles.trialBanner}>
            <Text style={styles.trialEmoji}>⏰</Text>
            <View style={styles.trialInfo}>
              <Text style={styles.trialTitle}>Free Trial</Text>
              <Text style={styles.trialDays}>あと{trialDaysRemaining}日</Text>
            </View>
            <TouchableOpacity 
              style={styles.trialButton}
              onPress={() => navigation.navigate('Pricing')}
            >
              <Text style={styles.trialButtonText}>プランを選ぶ</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 現在のプラン表示（強化版） */}
        <View style={styles.planCard}>
          <View style={styles.planHeader}>
            <View style={styles.planInfo}>
              <Text style={styles.planLabel}>現在のプラン</Text>
              <Text style={styles.planName}>{currentPlan.name}</Text>
            </View>
            <TouchableOpacity 
              style={styles.changePlanButton}
              onPress={() => navigation.navigate('Pricing')}
            >
              <Text style={styles.changePlanText}>プラン変更 →</Text>
            </TouchableOpacity>
          </View>

          {/* スロット使用状況 */}
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>スロット</Text>
              <Text style={styles.statValue}>{usedSlots}/{totalSlots}</Text>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${slotUsagePercent}%`, backgroundColor: '#FF9800' }]} />
              </View>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>今日の使用回数</Text>
              <Text style={styles.statValue}>{planInfo.usedToday}/{planInfo.dailyLimit}</Text>
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar, 
                    { 
                      width: `${Math.min(dailyUsagePercent, 100)}%`, 
                      backgroundColor: dailyUsagePercent > 80 ? '#FF7043' : '#4CAF50' 
                    }
                  ]} 
                />
              </View>
            </View>
          </View>

          {/* 追加スロット表示 */}
          {planInfo.additionalSlots > 0 && (
            <View style={styles.additionalSlotsInfo}>
              <Text style={styles.additionalSlotsText}>
                📦 追加スロット: {planInfo.additionalSlots}個 (+¥{planInfo.additionalSlots * ADDITIONAL_SLOT_PRICE}/月)
              </Text>
            </View>
          )}
        </View>

        {/* Proアップグレード誘導バナー */}
        {isNotProOrHigher && (
          <TouchableOpacity 
            style={styles.upgradeBanner}
            onPress={() => navigation.navigate('Pricing')}
          >
            <View style={styles.upgradeBannerContent}>
              <Text style={styles.upgradeBannerEmoji}>🚀</Text>
              <View style={styles.upgradeBannerText}>
                <Text style={styles.upgradeBannerTitle}>Proにアップグレード</Text>
                <Text style={styles.upgradeBannerDesc}>全15体のエージェントが使い放題！</Text>
              </View>
            </View>
            <Text style={styles.upgradeBannerArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* スロット使用状況バー */}
        <View style={styles.usageBarContainer}>
          <View style={styles.usageBar}>
            <View style={[styles.usageFill, { width: `${slotUsagePercent}%` }]} />
          </View>
          <Text style={styles.usageText}>
            {emptySlots}スロット空き
          </Text>
        </View>

        {/* スロット一覧 */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>スロット一覧</Text>
        
        {slots.map((agent, index) => (
          <View key={index} style={[styles.slotCard, { backgroundColor: colors.card }]}>
            <View style={styles.slotNumber}>
              <Text style={styles.slotNumberText}>{index + 1}</Text>
            </View>

            {agent ? (
              <View style={styles.agentSlot}>
                <View style={[styles.agentIcon, { backgroundColor: agent.color + '20' }]}>
                  {AGENT_IMAGES[agent.id] ? (
                    <Image source={{ uri: AGENT_IMAGES[agent.id] }} style={styles.agentImage} />
                  ) : (
                    <Text style={styles.agentEmoji}>{agent.emoji}</Text>
                  )}
                </View>
                <View style={styles.agentInfo}>
                  <Text style={[styles.agentName, { color: agent.color }]}>{agent.name}</Text>
                  <Text style={[styles.agentRole, { color: colors.textSecondary }]}>{agent.role}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="sparkles" size={11} color={colors.textTertiary} style={{ marginRight: 4 }} />
                    <Text style={[styles.agentFeature, { color: colors.textTertiary }]}>{agent.killerFeature}</Text>
                  </View>
                </View>
                <View style={styles.slotActions}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.swapButton]}
                    onPress={() => openSwapModal(index)}
                  >
                    <Text style={styles.swapButtonText}>入れ替え</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.removeButton]}
                    onPress={() => removeAgentFromSlot(index)}
                  >
                    <Text style={styles.removeButtonText}>外す</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.emptySlot}
                onPress={() => openSwapModal(index)}
              >
                <View style={[styles.addIcon, { backgroundColor: isDark ? '#333' : '#F5F5F5', borderColor: colors.border }]}>
                  <Text style={[styles.addIconText, { color: colors.textTertiary }]}>＋</Text>
                </View>
                <Text style={[styles.emptySlotText, { color: colors.textSecondary }]}>コーチを追加</Text>
                <Text style={[styles.emptySlotHint, { color: colors.textTertiary }]}>タップして選択</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {/* スロット追加ボタン（空きスロットがない場合に表示） */}
        {emptySlots === 0 && (
          <TouchableOpacity 
            style={styles.addSlotButton}
            onPress={handleAddSlot}
          >
            <View style={styles.addSlotIcon}>
              <Text style={styles.addSlotIconText}>＋</Text>
            </View>
            <View style={styles.addSlotInfo}>
              <Text style={styles.addSlotTitle}>スロットを追加</Text>
              <Text style={styles.addSlotPrice}>+¥{ADDITIONAL_SLOT_PRICE}/月</Text>
            </View>
            <Text style={styles.addSlotArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* 会話回数追加ボタン */}
        <TouchableOpacity 
          style={[styles.addSlotButton, { backgroundColor: '#E8F5E9' }]}
          onPress={handleAddMessages}
        >
          <View style={[styles.addSlotIcon, { backgroundColor: '#81C784' }]}>
            <Text style={styles.addSlotIconText}>💬</Text>
          </View>
          <View style={styles.addSlotInfo}>
            <Text style={styles.addSlotTitle}>会話回数を追加</Text>
            <Text style={styles.addSlotPrice}>+{ADDITIONAL_MESSAGES_AMOUNT}回 / ¥{ADDITIONAL_MESSAGES_PRICE}</Text>
          </View>
          <Text style={styles.addSlotArrow}>→</Text>
        </TouchableOpacity>

        {/* 追加購入状況 */}
        {(planInfo.additionalSlots > 0 || planInfo.additionalMessages > 0) && (
          <View style={styles.addOnsSummary}>
            <Text style={styles.addOnsSummaryTitle}>📦 追加購入中</Text>
            {planInfo.additionalSlots > 0 && (
              <Text style={styles.addOnsSummaryItem}>
                スロット +{planInfo.additionalSlots}個（+¥{planInfo.additionalSlots * ADDITIONAL_SLOT_PRICE}/月）
              </Text>
            )}
            {planInfo.additionalMessages > 0 && (
              <Text style={styles.addOnsSummaryItem}>
                会話回数 +{planInfo.additionalMessages}回（+¥{Math.floor(planInfo.additionalMessages / ADDITIONAL_MESSAGES_AMOUNT) * ADDITIONAL_MESSAGES_PRICE}）
              </Text>
            )}
          </View>
        )}

        {/* フッター */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            💡 スロットはいつでも入れ替え可能です
          </Text>
        </View>
      </ScrollView>

      {/* エージェント選択モーダル */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>コーチを選択</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={availableAgents}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.agentOption, { backgroundColor: item.color + '15' }]}
                  onPress={() => {
                    setModalVisible(false);
                    navigation.navigate('AgentProfile', { 
                      agent: item, 
                      fromSlotSelection: true, 
                      slotIndex: selectedSlotIndex 
                    });
                  }}
                >
                  {AGENT_IMAGES[item.id] ? (
                    <Image source={{ uri: AGENT_IMAGES[item.id] }} style={styles.optionImage} />
                  ) : (
                    <Text style={styles.optionEmoji}>{item.emoji}</Text>
                  )}
                  <View style={styles.optionInfo}>
                    <Text style={[styles.optionName, { color: item.color }]}>{item.name}</Text>
                    <Text style={styles.optionRole}>{item.role}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="sparkles" size={11} color="#888" style={{ marginRight: 4 }} />
                      <Text style={styles.optionFeature}>{item.killerFeature}</Text>
                    </View>
                  </View>
                  <Text style={styles.selectArrow}>→</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Text style={[styles.emptyListText, { color: colors.textSecondary }]}>すべてのコーチが割り当て済みです</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    paddingTop: 10,
    paddingBottom: 16,
  },
  backButton: {
    marginBottom: 16,
  },
  backText: {
    fontSize: 16,
    color: '#FF9800',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  // Free Trial バナー
  trialBanner: {
    backgroundColor: '#FFF3E0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  trialEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  trialInfo: {
    flex: 1,
  },
  trialTitle: {
    fontSize: 14,
    color: '#E65100',
    fontWeight: '600',
  },
  trialDays: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E65100',
  },
  trialButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  trialButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  // プランカード（強化版）
  planCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planInfo: {
    flex: 1,
  },
  planLabel: {
    fontSize: 12,
    color: '#666',
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  changePlanButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  changePlanText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  // 統計行
  statRow: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 12,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  // 追加スロット情報
  additionalSlotsInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(100, 181, 246, 0.3)',
  },
  additionalSlotsText: {
    fontSize: 12,
    color: '#1976D2',
    textAlign: 'center',
  },
  // アップグレードバナー
  upgradeBanner: {
    // Note: linear-gradient not supported in RN, using solid color
    backgroundColor: '#7C4DFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#7C4DFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  upgradeBannerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  upgradeBannerEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  upgradeBannerText: {
    flex: 1,
  },
  upgradeBannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  upgradeBannerDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  upgradeBannerArrow: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  // 使用状況バー
  usageBarContainer: {
    marginBottom: 20,
  },
  usageBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 6,
  },
  usageFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  usageText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  slotCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  slotNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  slotNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  agentSlot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  agentIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  agentEmoji: {
    fontSize: 28,
  },
  agentImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  agentRole: {
    fontSize: 12,
    color: '#666',
  },
  agentFeature: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  slotActions: {
    flexDirection: 'column',
    gap: 6,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  swapButton: {
    backgroundColor: '#FF9800',
  },
  swapButtonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  removeButton: {
    backgroundColor: '#FFEBEE',
  },
  removeButtonText: {
    color: '#EF5350',
    fontSize: 11,
    fontWeight: '600',
  },
  emptySlot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  addIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addIconText: {
    fontSize: 24,
    color: '#BDBDBD',
  },
  emptySlotText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  emptySlotHint: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  // スロット追加ボタン
  addSlotButton: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
  },
  addSlotIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addSlotIconText: {
    fontSize: 24,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  addSlotInfo: {
    flex: 1,
  },
  addSlotTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  addSlotPrice: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  addSlotArrow: {
    fontSize: 20,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  addOnsSummary: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  addOnsSummaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 8,
  },
  addOnsSummaryItem: {
    fontSize: 13,
    color: '#F57C00',
    marginBottom: 4,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalClose: {
    fontSize: 24,
    color: '#999',
    padding: 4,
  },
  agentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  optionEmoji: {
    fontSize: 36,
    marginRight: 12,
  },
  optionImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  optionRole: {
    fontSize: 12,
    color: '#666',
  },
  optionFeature: {
    fontSize: 11,
    color: '#888',
  },
  selectArrow: {
    fontSize: 18,
    color: '#999',
  },
  emptyList: {
    padding: 40,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 14,
    color: '#999',
  },
});
