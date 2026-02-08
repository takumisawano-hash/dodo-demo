import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { t, useI18n } from '../i18n';
import { AGENT_IMAGES } from '../data/agentImages';
import { useSlots } from '../context/SlotsContext';

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
  const { language } = useI18n(); // Force re-render on language change
  const { myCoaches, allAgents } = useSlots();
  const [greetingKey] = useState(getGreetingKey());
  const [tipKey] = useState(DAILY_TIP_KEYS[Math.floor(Math.random() * DAILY_TIP_KEYS.length)]);
  const userName = 'ユーザー';

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>
            {t('home.welcome', { greeting: t(greetingKey), name: userName })}
          </Text>
          <Text style={styles.logo}>{t('home.logo')}</Text>
        </View>

        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>{t('home.todayProgress')}</Text>
          <View style={styles.progressStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>2/5</Text>
              <Text style={styles.statLabel}>{t('home.goalsAchieved')}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>🔥 7</Text>
              <Text style={styles.statLabel}>{t('home.consecutiveDays')}</Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '40%' }]} />
          </View>
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipEmoji}>💡</Text>
          <Text style={styles.tipText}>{t(tipKey)}</Text>
        </View>

        <Text style={styles.sectionTitle}>{t('home.yourCoaches')}</Text>
        {subscribedAgents.map((agent) => (
          <TouchableOpacity key={agent.id} style={[styles.agentCard, { backgroundColor: agent.color + '20' }]}
            onPress={() => navigation.navigate('Chat', { agent })} activeOpacity={0.8}>
            {/* 吹き出し - 次のアクション */}
            {COACH_NEXT_ACTIONS[agent.id] && (
              <View style={styles.speechBubble}>
                <Text style={styles.speechText}>{COACH_NEXT_ACTIONS[agent.id]}</Text>
                <View style={[styles.speechArrow, { borderTopColor: '#fff' }]} />
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
                <Text style={styles.agentRole}>{agent.role}</Text>
              </View>
              {/* チャットボタン */}
              <View style={[styles.chatIndicator, { backgroundColor: agent.color }]}>
                <Text style={styles.chatIndicatorText}>💬</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>{t('home.recommendedCoaches')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recommendedScroll}>
          {recommendedAgents.map((agent) => (
            <TouchableOpacity key={agent.id} style={[styles.recommendedCard, { backgroundColor: agent.color + '20' }]}
              onPress={() => navigation.navigate('AgentProfile', { agent })}>
              {AGENT_IMAGES[agent.id] ? (
                <Image source={{ uri: AGENT_IMAGES[agent.id] }} style={styles.recommendedImage} />
              ) : (
                <Text style={styles.recommendedEmoji}>{agent.emoji}</Text>
              )}
              <Text style={[styles.recommendedName, { color: agent.color }]}>{agent.name}</Text>
              <Text style={styles.recommendedRole}>{agent.role}</Text>
              <Text style={styles.recommendedKiller}>✨ {agent.killerFeature}</Text>
              <View style={[styles.tryButton, { borderColor: agent.color }]}>
                <Text style={[styles.tryButtonText, { color: agent.color }]}>{t('home.tryAgent')}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>
          {t('home.allAgents', { count: allAgents.length })}
        </Text>
        {allOtherAgents.map((agent) => (
          <TouchableOpacity key={agent.id} style={[styles.agentCardSmall, { backgroundColor: agent.color + '15' }]}
            onPress={() => navigation.navigate('AgentProfile', { agent })} activeOpacity={0.8}>
            {AGENT_IMAGES[agent.id] ? (
              <Image source={{ uri: AGENT_IMAGES[agent.id] }} style={styles.agentImageSmall} />
            ) : (
              <Text style={styles.agentEmojiSmall}>{agent.emoji}</Text>
            )}
            <View style={styles.agentTextSmall}>
              <Text style={[styles.agentNameSmall, { color: agent.color }]}>{agent.name}</Text>
              <Text style={styles.agentRoleSmall}>{agent.role} • {agent.killerFeature}</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, paddingBottom: 16 },
  greeting: { fontSize: 18, color: '#333' },
  logo: { fontSize: 24, fontWeight: 'bold' },
  progressCard: { backgroundColor: '#FFF3E0', borderRadius: 16, padding: 16, marginBottom: 12 },
  progressTitle: { fontSize: 14, color: '#666', marginBottom: 12 },
  progressStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 12, color: '#666' },
  progressBar: { height: 8, backgroundColor: '#FFE0B2', borderRadius: 4 },
  progressFill: { height: '100%', backgroundColor: '#FF9800', borderRadius: 4 },
  tipCard: { backgroundColor: '#FFF9C4', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  tipEmoji: { fontSize: 24, marginRight: 12 },
  tipText: { flex: 1, fontSize: 14, color: '#666' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 8, marginBottom: 12 },
  agentCard: { borderRadius: 20, padding: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  speechBubble: {
    backgroundColor: '#fff',
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
  speechText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
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
    borderTopColor: '#fff',
  },
  agentInfo: { flexDirection: 'row', alignItems: 'center' },
  agentEmoji: { fontSize: 48, marginRight: 16 },
  chatIndicator: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  chatIndicatorText: {
    fontSize: 20,
  },
  agentImage: { width: 60, height: 60, marginRight: 16, borderRadius: 30 },
  agentText: { flex: 1 },
  agentNameRow: { flexDirection: 'row', alignItems: 'center' },
  agentName: { fontSize: 24, fontWeight: 'bold' },
  subscribedBadge: { backgroundColor: '#4CAF50', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginLeft: 8 },
  subscribedText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  agentRole: { fontSize: 14, color: '#666', marginTop: 2 },
  killerFeature: { fontSize: 12, color: '#888', marginTop: 4 },
  chatButton: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 25, alignSelf: 'flex-start' },
  chatButtonText: { color: 'white', fontWeight: '600', fontSize: 14 },
  recommendedScroll: { marginBottom: 20 },
  recommendedCard: { width: 140, borderRadius: 16, padding: 16, marginRight: 12, alignItems: 'center' },
  recommendedEmoji: { fontSize: 40, marginBottom: 8 },
  recommendedImage: { width: 56, height: 56, marginBottom: 8, borderRadius: 28 },
  recommendedName: { fontSize: 16, fontWeight: 'bold' },
  recommendedRole: { fontSize: 11, color: '#666' },
  recommendedKiller: { fontSize: 10, color: '#888', marginTop: 4, marginBottom: 8, textAlign: 'center' },
  tryButton: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  tryButtonText: { fontSize: 11, fontWeight: '600' },
  agentCardSmall: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, marginBottom: 8 },
  agentEmojiSmall: { fontSize: 32, marginRight: 12 },
  agentImageSmall: { width: 40, height: 40, marginRight: 12, borderRadius: 20 },
  agentTextSmall: { flex: 1 },
  agentNameSmall: { fontSize: 16, fontWeight: 'bold' },
  agentRoleSmall: { fontSize: 11, color: '#666' },
  arrow: { fontSize: 18, color: '#999' },
});
