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
import { Ionicons } from '@expo/vector-icons';
import StatCard from '../components/StatCard';
import SimpleChart from '../components/SimpleChart';
import { useTheme, getAgentCardBackground } from '../theme';
import { AGENT_IMAGES } from '../data/agentImages';

// Agent data matching HomeScreen
const AGENTS = [
  { id: 'diet-coach', name: 'ドードー', color: '#FF9800', bgColor: '#FFF3E0' },
  { id: 'language-tutor', name: 'ポリー', color: '#81C784', bgColor: '#E8F5E9' },
  { id: 'habit-coach', name: 'オウル', color: '#BA68C8', bgColor: '#F3E5F5' },
];

// Mock data
const WEEKLY_DATA = [
  { label: '月', value: 5 },
  { label: '火', value: 8 },
  { label: '水', value: 3 },
  { label: '木', value: 12 },
  { label: '金', value: 7 },
  { label: '土', value: 15 },
  { label: '日', value: 9 },
];

const AGENT_STATS = [
  { id: 'diet-coach', sessions: 23, messages: 156, streak: 7 },
  { id: 'language-tutor', sessions: 15, messages: 89, streak: 3 },
  { id: 'habit-coach', sessions: 31, messages: 203, streak: 12 },
];

const GOALS = [
  { label: '週間目標（5セッション）', value: 80 },
  { label: '月間目標（30セッション）', value: 65 },
  { label: '習慣達成率', value: 73 },
];

const BADGES = [
  { id: '1', iconName: 'flame', name: '7日連続', achieved: true },
  { id: '2', iconName: 'checkmark-done', name: '100メッセージ', achieved: true },
  { id: '3', iconName: 'star', name: 'オールスター', achieved: false },
  { id: '4', iconName: 'trophy', name: '30日マスター', achieved: false },
  { id: '5', iconName: 'rocket', name: 'ロケットスタート', achieved: true },
  { id: '6', iconName: 'flag', name: '目標達成', achieved: true },
];

type Period = 'week' | 'month';

export default function ProgressScreen() {
  const { colors, isDark } = useTheme();
  const [period, setPeriod] = useState<Period>('week');

  const getAgentById = (id: string) => AGENTS.find((a) => a.id === id);

  const totalSessions = AGENT_STATS.reduce((sum, a) => sum + a.sessions, 0);
  const totalMessages = AGENT_STATS.reduce((sum, a) => sum + a.messages, 0);
  const maxStreak = Math.max(...AGENT_STATS.map((a) => a.streak));
  const achievedBadges = BADGES.filter((b) => b.achieved).length;

  return (
    <SafeAreaView edges={["top"]} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>進捗レポート</Text>
        <View style={[styles.periodToggle, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]}>
          <TouchableOpacity
            style={[
              styles.periodButton,
              period === 'week' && [styles.periodButtonActive, { backgroundColor: colors.card }],
            ]}
            onPress={() => setPeriod('week')}
          >
            <Text
              style={[
                styles.periodText,
                { color: colors.textSecondary },
                period === 'week' && [styles.periodTextActive, { color: colors.text }],
              ]}
            >
              今週
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.periodButton,
              period === 'month' && [styles.periodButtonActive, { backgroundColor: colors.card }],
            ]}
            onPress={() => setPeriod('month')}
          >
            <Text
              style={[
                styles.periodText,
                { color: colors.textSecondary },
                period === 'month' && [styles.periodTextActive, { color: colors.text }],
              ]}
            >
              今月
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Stats */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>サマリー</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="セッション"
            value={totalSessions}
            subtitle={period === 'week' ? '今週' : '今月'}
            iconName="chatbubble"
            color="#FF9800"
            bgColor="#FFF3E0"
            trend="up"
            trendValue="+23%"
          />
          <StatCard
            title="メッセージ"
            value={totalMessages}
            subtitle="合計"
            iconName="mail"
            color="#81C784"
            bgColor="#E8F5E9"
            trend="up"
            trendValue="+15%"
          />
        </View>
        <View style={styles.statsGrid}>
          <StatCard
            title="最長ストリーク"
            value={`${maxStreak}日`}
            iconName="flame"
            color="#FF7043"
            bgColor="#FBE9E7"
            trend="neutral"
            trendValue="継続中"
          />
          <StatCard
            title="バッジ獲得"
            value={`${achievedBadges}/${BADGES.length}`}
            iconName="ribbon"
            color="#FFB300"
            bgColor="#FFF8E1"
          />
        </View>

        {/* Weekly Activity Chart */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>今週の活動</Text>
        <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
          <SimpleChart data={WEEKLY_DATA} color="#FF9800" height={100} />
        </View>

        {/* Agent Stats */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>エージェント別</Text>
        {AGENT_STATS.map((stat) => {
          const agent = getAgentById(stat.id);
          if (!agent) return null;
          const cardBg = getAgentCardBackground(agent.color, isDark);
          return (
            <View
              key={stat.id}
              style={[styles.agentCard, { backgroundColor: cardBg }]}
            >
              <View style={styles.agentHeader}>
                {AGENT_IMAGES[agent.id] ? (
                  <Image source={{ uri: AGENT_IMAGES[agent.id] }} style={styles.agentImage} />
                ) : (
                  <View style={[styles.agentImagePlaceholder, { backgroundColor: agent.color + '40' }]}>
                    <Text style={styles.agentInitial}>{agent.name[0]}</Text>
                  </View>
                )}
                <View style={styles.agentInfo}>
                  <Text style={[styles.agentName, { color: agent.color }]}>
                    {agent.name}
                  </Text>
                  <View style={styles.agentMeta}>
                    <Text style={[styles.agentStat, { color: colors.textSecondary }]}>
                      {stat.sessions}セッション · {stat.messages}メッセージ
                    </Text>
                  </View>
                </View>
                <View style={[styles.streakBadge, { backgroundColor: isDark ? '#3D2200' : '#FFF3E0', flexDirection: 'row', alignItems: 'center' }]}>
                  <Ionicons name="flame" size={14} color={isDark ? '#FFB74D' : '#E65100'} style={{ marginRight: 4 }} />
                  <Text style={[styles.streakText, { color: isDark ? '#FFB74D' : '#E65100' }]}>{stat.streak}</Text>
                </View>
              </View>
            </View>
          );
        })}

        {/* Goals Progress */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>目標達成率</Text>
        <View style={[styles.goalsCard, { backgroundColor: colors.card }]}>
          <SimpleChart data={GOALS} color="#BA68C8" type="progress" />
        </View>

        {/* Badges */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>バッジコレクション</Text>
        <View style={styles.badgesGrid}>
          {BADGES.map((badge) => (
            <View
              key={badge.id}
              style={[
                styles.badgeItem,
                { backgroundColor: colors.card },
                !badge.achieved && [styles.badgeItemLocked, { backgroundColor: isDark ? '#1A1A1A' : '#F5F5F5' }],
              ]}
            >
              <Ionicons 
                name={badge.iconName as any} 
                size={28} 
                color={badge.achieved ? colors.text : colors.textSecondary} 
                style={[{ marginBottom: 6 }, !badge.achieved && { opacity: 0.4 }]} 
              />
              <Text style={[styles.badgeName, { color: colors.text }, !badge.achieved && [styles.badgeNameLocked, { color: colors.textSecondary }]]}>
                {badge.name}
              </Text>
              {!badge.achieved && (
                <Ionicons name="lock-closed" size={10} color={colors.textSecondary} style={{ position: 'absolute', top: 6, right: 6 }} />
              )}
            </View>
          ))}
        </View>

        {/* Motivation */}
        <View style={[styles.motivationCard, { backgroundColor: isDark ? '#1B3D1B' : '#E8F5E9' }]}>
          <View style={styles.motivationIconContainer}>
            <Ionicons name="trophy" size={32} color={isDark ? '#81C784' : '#2E7D32'} />
          </View>
          <View style={styles.motivationContent}>
            <Text style={[styles.motivationTitle, { color: isDark ? '#A5D6A7' : '#1B5E20' }]}>
              素晴らしい調子です！ 🎉
            </Text>
            <Text style={[styles.motivationText, { color: isDark ? '#81C784' : '#2E7D32' }]}>
              あと{7 - (maxStreak % 7)}日で次のマイルストーン達成！{'\n'}
              この調子で続けましょう！
            </Text>
          </View>
        </View>

        {/* Weekly Summary */}
        <View style={[styles.weeklySummaryCard, { backgroundColor: isDark ? '#2D1F3D' : '#F3E5F5' }]}>
          <View style={styles.weeklySummaryHeader}>
            <Ionicons name="calendar" size={20} color={isDark ? '#BA68C8' : '#7B1FA2'} style={{ marginRight: 8 }} />
            <Text style={[styles.weeklySummaryTitle, { color: isDark ? '#CE93D8' : '#6A1B9A' }]}>
              {period === 'week' ? '今週' : '今月'}のサマリー
            </Text>
          </View>
          <View style={styles.weeklySummaryStats}>
            <View style={styles.weeklySummaryStat}>
              <Text style={[styles.weeklySummaryValue, { color: isDark ? '#CE93D8' : '#7B1FA2' }]}>{totalSessions}</Text>
              <Text style={[styles.weeklySummaryLabel, { color: colors.textSecondary }]}>セッション</Text>
            </View>
            <View style={[styles.weeklySummaryDivider, { backgroundColor: isDark ? '#4A2D5C' : '#E1BEE7' }]} />
            <View style={styles.weeklySummaryStat}>
              <Text style={[styles.weeklySummaryValue, { color: isDark ? '#CE93D8' : '#7B1FA2' }]}>{maxStreak}日</Text>
              <Text style={[styles.weeklySummaryLabel, { color: colors.textSecondary }]}>連続</Text>
            </View>
            <View style={[styles.weeklySummaryDivider, { backgroundColor: isDark ? '#4A2D5C' : '#E1BEE7' }]} />
            <View style={styles.weeklySummaryStat}>
              <Text style={[styles.weeklySummaryValue, { color: isDark ? '#CE93D8' : '#7B1FA2' }]}>85%</Text>
              <Text style={[styles.weeklySummaryLabel, { color: colors.textSecondary }]}>目標達成</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  periodToggle: {
    flexDirection: 'row',
    backgroundColor: '#E0E0E0',
    borderRadius: 20,
    padding: 3,
  },
  periodButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 17,
  },
  periodButtonActive: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  periodText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  periodTextActive: {
    color: '#333',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  chartCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  agentCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  agentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agentImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  agentImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  agentInitial: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  agentMeta: {
    marginTop: 4,
  },
  agentStat: {
    fontSize: 13,
    color: '#666',
  },
  streakBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
  },
  goalsCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeItem: {
    width: '30%',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
    position: 'relative',
  },
  badgeItemLocked: {
    backgroundColor: '#F5F5F5',
  },
  badgeEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  badgeEmojiLocked: {
    opacity: 0.4,
  },
  badgeName: {
    fontSize: 11,
    color: '#333',
    fontWeight: '500',
    textAlign: 'center',
  },
  badgeNameLocked: {
    color: '#999',
  },
  badgeLockIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
    fontSize: 10,
  },
  motivationCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  motivationIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(129, 199, 132, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  motivationContent: {
    flex: 1,
  },
  motivationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  motivationText: {
    fontSize: 14,
    color: '#2E7D32',
    lineHeight: 20,
  },
  weeklySummaryCard: {
    backgroundColor: '#F3E5F5',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    marginBottom: 30,
  },
  weeklySummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  weeklySummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  weeklySummaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  weeklySummaryStat: {
    alignItems: 'center',
    flex: 1,
  },
  weeklySummaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  weeklySummaryLabel: {
    fontSize: 12,
    color: '#888',
  },
  weeklySummaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E1BEE7',
  },
});
