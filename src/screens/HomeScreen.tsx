import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { t, useI18n } from '../i18n';
import { AGENT_IMAGES } from '../data/agentImages';
import { useSlots } from '../context/SlotsContext';
import { useTheme, getAgentCardBackground } from '../theme';
import { LoadingIndicator } from '../components/LoadingOverlay';
import { ErrorDisplay, ErrorToast, useErrorHandler } from '../components/ErrorDisplay';

const getGreetingKey = () => {
  const hour = new Date().getHours();
  if (hour < 6) return 'greetings.night';
  if (hour < 12) return 'greetings.morning';
  if (hour < 18) return 'greetings.afternoon';
  return 'greetings.evening';
};

const DAILY_TIP_KEYS = [
  'home.tips.tip1',
  'home.tips.tip2',
  'home.tips.tip3',
  'home.tips.tip4',
];

// 空スロット誘導カード（改善5）
const AddCoachCard = ({ 
  onPress, 
  emptyCount,
  colors,
  isDark,
}: { 
  onPress: () => void; 
  emptyCount: number;
  colors: any;
  isDark: boolean;
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Animated.View 
        style={[
          styles.addCoachCard,
          { 
            backgroundColor: isDark ? '#2A2A2A' : '#FFF8E1',
            borderColor: '#FF9800',
            transform: [{ scale: pulseAnim }],
          }
        ]}
      >
        <View style={styles.addCoachIcon}>
          <Text style={styles.addCoachIconText}>✨</Text>
        </View>
        <View style={styles.addCoachTextContainer}>
          <Text style={[styles.addCoachTitle, { color: colors.text }]}>
            コーチを追加しよう！
          </Text>
          <Text style={[styles.addCoachDesc, { color: colors.textSecondary }]}>
            あと{emptyCount}人のコーチを追加できます
          </Text>
        </View>
        <View style={styles.addCoachButton}>
          <Text style={styles.addCoachButtonText}>＋</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

// 各コーチの次のアクション（モック - 将来的にはAPIから取得）
const COACH_NEXT_ACTIONS: Record<string, string> = {
  'diet-coach': '昨日の夕食、野菜多めで良かったね！今日のお昼はどうする？🥗',
  'language-tutor': '3日連続レッスン達成！今日も5分だけやってみない？🎯',
  'habit-coach': '朝のストレッチ、7日連続おめでとう！今日も続けよう💪',
  'money-coach': '今月の支出、予算内でいい感じ！週末の予定は？💰',
  'sleep-coach': '昨夜は7時間睡眠だったね。今夜も同じ時間に寝てみよう🌙',
  'mental-coach': '最近調子よさそう！今日の気分を教えて？😊',
  'career-coach': '面接対策の続き、やってみる？自己PRブラッシュアップしよう✨',
  'study-coach': '昨日の復習テスト、80点！今日は次の章に進もう📖',
  'fitness-coach': '筋肉痛は大丈夫？今日は軽めのメニューにしようか💪',
  'cooking-coach': '冷蔵庫の野菜、そろそろ使い切ろう！レシピ提案するよ🍳',
  'parenting-coach': 'お子さんの寝かしつけ、うまくいった？今夜のコツ教えるね👶',
  'romance-coach': 'デートプラン考えてみた！週末どう？💕',
  'organize-coach': 'クローゼット整理、次は引き出しやってみない？🗄️',
  'time-coach': '今週のタスク消化率90%！この調子で頑張ろう⏰',
  'digital-coach': '昨日のスクリーンタイム-30分！いい傾向だね📱',
};

interface Props {
  navigation: any;
}

export default function HomeScreen({ navigation }: Props) {
  const { language } = useI18n();
  const { colors, isDark } = useTheme();
  const { myCoaches, allAgents } = useSlots();
  const { error, handleError, clearError } = useErrorHandler();
  
  const [greetingKey] = useState(getGreetingKey());
  const [tipKey] = useState(DAILY_TIP_KEYS[Math.floor(Math.random() * DAILY_TIP_KEYS.length)]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const userName = 'ユーザー';

  // Simulate initial data loading
  useEffect(() => {
    const loadData = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));
        setLoading(false);
      } catch (e) {
        handleError(e);
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Simulate API refresh
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (e) {
      setToastMessage('更新に失敗しました');
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Get agent with translated fields
  const getAgentData = (agent: any) => ({
    ...agent,
    name: t(`agents.${agent.id}.name`),
    role: t(`agents.${agent.id}.role`),
    description: t(`agents.${agent.id}.description`),
    killerFeature: t(`agents.${agent.id}.killerFeature`),
  });

  // スロットに入っているコーチ
  const subscribedAgents = myCoaches.map(getAgentData);
  // おすすめ（スロットに入っていないもの）
  const recommendedAgents = allAgents.filter(a => !a.isSubscribed).slice(0, 4).map(getAgentData);
  // 全エージェント（スロットに入っていないもの）
  const allOtherAgents = allAgents.filter(a => !a.isSubscribed).map(getAgentData);

  // Dynamic styles based on theme
  const dynamicStyles = {
    container: { backgroundColor: colors.background },
    text: { color: colors.text },
    textSecondary: { color: colors.textSecondary },
    textTertiary: { color: colors.textTertiary },
    card: { backgroundColor: colors.card },
    progressCard: { backgroundColor: colors.progressCardBackground },
    tipCard: { backgroundColor: colors.tipBackground },
    border: { borderColor: colors.border },
  };

  // Show loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <LoadingIndicator message="読み込み中..." />
      </SafeAreaView>
    );
  }

  // Show error state
  if (error) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <ErrorDisplay 
          error={error} 
          onRetry={() => {
            clearError();
            setLoading(true);
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.greeting, dynamicStyles.text]}>
            {t('home.welcome', { greeting: t(greetingKey), name: userName })}
          </Text>
          <Text style={[styles.logo, dynamicStyles.text]}>{t('home.logo')}</Text>
        </View>

        {/* ストリーク表示カード（改善3: 強化版） */}
        <View style={[styles.streakCard, { backgroundColor: colors.card }]}>
          <View style={styles.streakMain}>
            <View style={styles.streakFireContainer}>
              <Text style={styles.streakFireEmoji}>🔥</Text>
            </View>
            <View style={styles.streakTextContainer}>
              <Text style={[styles.streakNumber, dynamicStyles.text]}>14</Text>
              <Text style={[styles.streakLabel, dynamicStyles.textSecondary]}>日連続！</Text>
            </View>
          </View>
          <Text style={[styles.streakMessage, { color: colors.primary }]}>
            すごい！この調子で頑張ろう 💪
          </Text>
          <View style={styles.streakBadges}>
            <View style={[styles.streakBadge, { backgroundColor: '#FFF3E0' }]}>
              <Text style={styles.streakBadgeText}>🏆 最長記録まであと3日</Text>
            </View>
          </View>
        </View>

        <View style={[styles.progressCard, dynamicStyles.progressCard]}>
          <Text style={[styles.progressTitle, dynamicStyles.textSecondary]}>{t('home.todayProgress')}</Text>
          <View style={styles.progressStats}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, dynamicStyles.text]}>2/5</Text>
              <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>{t('home.goalsAchieved')}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, dynamicStyles.text]}>45%</Text>
              <Text style={[styles.statLabel, dynamicStyles.textSecondary]}>達成率</Text>
            </View>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.progressBackground }]}>
            <View style={[styles.progressFill, { width: '40%', backgroundColor: colors.primary }]} />
          </View>
        </View>

        <View style={[styles.tipCard, dynamicStyles.tipCard]}>
          <Text style={styles.tipEmoji}>💡</Text>
          <Text style={[styles.tipText, dynamicStyles.textSecondary]}>{t(tipKey)}</Text>
        </View>

        <Text style={[styles.sectionTitle, dynamicStyles.text]}>{t('home.yourCoaches')}</Text>
        {subscribedAgents.map((agent) => (
          <TouchableOpacity 
            key={agent.id} 
            style={[styles.agentCard, { backgroundColor: getAgentCardBackground(agent.color, isDark) }]}
            onPress={() => navigation.navigate('Chat', { agent })} 
            activeOpacity={0.8}
          >
            {/* 吹き出し - 次のアクション */}
            {COACH_NEXT_ACTIONS[agent.id] && (
              <View style={[styles.speechBubble, { backgroundColor: colors.surface }]}>
                <Text style={[styles.speechText, dynamicStyles.text]}>{COACH_NEXT_ACTIONS[agent.id]}</Text>
                <View style={[styles.speechArrow, { borderTopColor: colors.surface }]} />
              </View>
            )}
            <View style={styles.agentInfo}>
              {AGENT_IMAGES[agent.id] ? (
                <Image source={{ uri: AGENT_IMAGES[agent.id] }} style={styles.agentImage} />
              ) : (
                <Text style={styles.agentEmoji}>{agent.emoji}</Text>
              )}
              <View style={styles.agentText}>
                <View style={styles.agentNameRow}>
                  <Text style={[styles.agentName, { color: agent.color }]}>{agent.name}</Text>
                </View>
                <Text style={[styles.agentRole, dynamicStyles.textSecondary]}>{agent.role}</Text>
              </View>
              {/* チャットボタン */}
              <View style={[styles.chatIndicator, { backgroundColor: agent.color }]}>
                <Text style={styles.chatIndicatorText}>💬</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {/* 空スロット誘導カード（改善5） */}
        {subscribedAgents.length < 3 && (
          <AddCoachCard 
            onPress={() => navigation.navigate('MySlots')}
            emptyCount={3 - subscribedAgents.length}
            colors={colors}
            isDark={isDark}
          />
        )}

        <Text style={[styles.sectionTitle, dynamicStyles.text]}>{t('home.recommendedCoaches')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recommendedScroll}>
          {recommendedAgents.map((agent) => (
            <TouchableOpacity 
              key={agent.id} 
              style={[styles.recommendedCard, { backgroundColor: getAgentCardBackground(agent.color, isDark) }]}
              onPress={() => navigation.navigate('AgentProfile', { agent })}
            >
              {AGENT_IMAGES[agent.id] ? (
                <Image source={{ uri: AGENT_IMAGES[agent.id] }} style={styles.recommendedImage} />
              ) : (
                <Text style={styles.recommendedEmoji}>{agent.emoji}</Text>
              )}
              <Text style={[styles.recommendedName, { color: agent.color }]}>{agent.name}</Text>
              <Text style={[styles.recommendedRole, dynamicStyles.textSecondary]}>{agent.role}</Text>
              <Text style={[styles.recommendedKiller, dynamicStyles.textTertiary]}>✨ {agent.killerFeature}</Text>
              <View style={[styles.tryButton, { borderColor: agent.color }]}>
                <Text style={[styles.tryButtonText, { color: agent.color }]}>{t('home.tryAgent')}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.sectionTitle, dynamicStyles.text]}>
          {t('home.allAgents', { count: allAgents.length })}
        </Text>
        {allOtherAgents.map((agent) => (
          <TouchableOpacity 
            key={agent.id} 
            style={[styles.agentCardSmall, { backgroundColor: getAgentCardBackground(agent.color, isDark) }]}
            onPress={() => navigation.navigate('AgentProfile', { agent })} 
            activeOpacity={0.8}
          >
            {AGENT_IMAGES[agent.id] ? (
              <Image source={{ uri: AGENT_IMAGES[agent.id] }} style={styles.agentImageSmall} />
            ) : (
              <Text style={styles.agentEmojiSmall}>{agent.emoji}</Text>
            )}
            <View style={styles.agentTextSmall}>
              <Text style={[styles.agentNameSmall, { color: agent.color }]}>{agent.name}</Text>
              <Text style={[styles.agentRoleSmall, dynamicStyles.textSecondary]}>{agent.role} • {agent.killerFeature}</Text>
            </View>
            <Text style={[styles.arrow, dynamicStyles.textTertiary]}>→</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Error Toast */}
      <ErrorToast 
        visible={!!toastMessage} 
        message={toastMessage} 
        onDismiss={() => setToastMessage('')} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, paddingBottom: 16 },
  greeting: { fontSize: 18 },
  logo: { fontSize: 24, fontWeight: 'bold' },
  // ストリークカードスタイル（改善3）
  streakCard: { 
    borderRadius: 20, 
    padding: 20, 
    marginBottom: 16,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  streakMain: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    marginBottom: 12,
  },
  streakFireContainer: {
    marginRight: 8,
  },
  streakFireEmoji: { 
    fontSize: 48,
  },
  streakTextContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  streakNumber: { 
    fontSize: 56, 
    fontWeight: 'bold',
  },
  streakLabel: { 
    fontSize: 20, 
    fontWeight: '600',
    marginLeft: 4,
  },
  streakMessage: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  streakBadges: {
    alignItems: 'center',
  },
  streakBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  streakBadgeText: {
    fontSize: 13,
    color: '#F57C00',
    fontWeight: '500',
  },
  progressCard: { borderRadius: 16, padding: 16, marginBottom: 12 },
  progressTitle: { fontSize: 14, marginBottom: 12 },
  progressStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold' },
  statLabel: { fontSize: 12 },
  progressBar: { height: 8, borderRadius: 4 },
  progressFill: { height: '100%', borderRadius: 4 },
  tipCard: { borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  tipEmoji: { fontSize: 24, marginRight: 12 },
  tipText: { flex: 1, fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 8, marginBottom: 12 },
  agentCard: { borderRadius: 20, padding: 20, marginBottom: 12, shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  speechBubble: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  speechText: { fontSize: 14, lineHeight: 20 },
  speechArrow: {
    position: 'absolute',
    bottom: -8,
    left: 24,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  agentInfo: { flexDirection: 'row', alignItems: 'center' },
  agentEmoji: { fontSize: 48, marginRight: 16 },
  chatIndicator: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  chatIndicatorText: { fontSize: 20 },
  agentImage: { width: 60, height: 60, marginRight: 16, borderRadius: 30 },
  agentText: { flex: 1 },
  agentNameRow: { flexDirection: 'row', alignItems: 'center' },
  agentName: { fontSize: 24, fontWeight: 'bold' },
  agentRole: { fontSize: 14, marginTop: 2 },
  recommendedScroll: { marginBottom: 20 },
  recommendedCard: { width: 140, borderRadius: 16, padding: 16, marginRight: 12, alignItems: 'center' },
  recommendedEmoji: { fontSize: 40, marginBottom: 8 },
  recommendedImage: { width: 56, height: 56, marginBottom: 8, borderRadius: 28 },
  recommendedName: { fontSize: 16, fontWeight: 'bold' },
  recommendedRole: { fontSize: 11 },
  recommendedKiller: { fontSize: 10, marginTop: 4, marginBottom: 8, textAlign: 'center' },
  tryButton: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  tryButtonText: { fontSize: 11, fontWeight: '600' },
  agentCardSmall: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, marginBottom: 8 },
  agentEmojiSmall: { fontSize: 32, marginRight: 12 },
  agentImageSmall: { width: 40, height: 40, marginRight: 12, borderRadius: 20 },
  agentTextSmall: { flex: 1 },
  agentNameSmall: { fontSize: 16, fontWeight: 'bold' },
  agentRoleSmall: { fontSize: 11 },
  arrow: { fontSize: 18 },
  // 空スロット誘導カードスタイル（改善5）
  addCoachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  addCoachIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addCoachIconText: {
    fontSize: 24,
  },
  addCoachTextContainer: {
    flex: 1,
  },
  addCoachTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  addCoachDesc: {
    fontSize: 13,
  },
  addCoachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCoachButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: -2,
  },
});
