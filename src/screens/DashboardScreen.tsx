import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import SimpleChart from '../components/SimpleChart';
import InsightCard, { Insight } from '../components/InsightCard';
import { t, useI18n, formatNumber } from '../i18n';
import { AGENT_IMAGES } from '../data/agentImages';
import { useTheme, getAgentCardBackground } from '../theme';
import { LoadingIndicator } from '../components/LoadingOverlay';
import { ErrorDisplay, ErrorToast, useErrorHandler } from '../components/ErrorDisplay';

// Types
interface AgentMetrics {
  primaryKey: string;
  primaryValue: string;
  trend?: 'up' | 'down' | 'neutral';
  secondaryKey: string;
  secondaryValue: string;
}

interface AgentDashboard {
  id: string;
  emoji: string;
  color: string;
  bgColor: string;
  metrics: AgentMetrics;
  lastActivity: Date;
}

// Agent Metrics Data
const AGENT_METRICS: Record<string, AgentMetrics> = {
  'diet-coach': {
    primaryKey: 'metrics.weightChange',
    primaryValue: '-1.2kg',
    trend: 'down',
    secondaryKey: 'metrics.calorieAchievement',
    secondaryValue: '85%',
  },
  'language-tutor': {
    primaryKey: 'metrics.learningTime',
    primaryValue: '3.5h',
    trend: 'up',
    secondaryKey: 'metrics.masteredWords',
    secondaryValue: '127',
  },
  'fitness-coach': {
    primaryKey: 'metrics.weeklyWorkouts',
    primaryValue: '3',
    trend: 'up',
    secondaryKey: 'metrics.consecutiveWeeks',
    secondaryValue: '4',
  },
  'money-coach': {
    primaryKey: 'metrics.monthlySavings',
    primaryValue: '¥25,000',
    trend: 'up',
    secondaryKey: 'metrics.budgetAchievement',
    secondaryValue: '92%',
  },
  'sleep-coach': {
    primaryKey: 'metrics.averageSleep',
    primaryValue: '7.2h',
    trend: 'up',
    secondaryKey: 'metrics.sleepScore',
    secondaryValue: '82',
  },
  'mental-coach': {
    primaryKey: 'metrics.averageMood',
    primaryValue: '7.5/10',
    trend: 'up',
    secondaryKey: 'metrics.meditationTime',
    secondaryValue: '45m',
  },
  'habit-coach': {
    primaryKey: 'metrics.habitAchievement',
    primaryValue: '5/6',
    trend: 'neutral',
    secondaryKey: 'metrics.longestStreak',
    secondaryValue: '14',
  },
  'cooking-coach': {
    primaryKey: 'metrics.weeklyMenu',
    primaryValue: '✓',
    trend: 'neutral',
    secondaryKey: 'metrics.dishesCooked',
    secondaryValue: '8',
  },
};

// All agents data
const AGENTS: AgentDashboard[] = [
  { id: 'diet-coach', emoji: '🦤', color: '#FF9800', bgColor: '#FFF3E0', metrics: AGENT_METRICS['diet-coach'], lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000) },
  { id: 'language-tutor', emoji: '🦜', color: '#81C784', bgColor: '#E8F5E9', metrics: AGENT_METRICS['language-tutor'], lastActivity: new Date(Date.now() - 5 * 60 * 60 * 1000) },
  { id: 'habit-coach', emoji: '🦉', color: '#BA68C8', bgColor: '#F3E5F5', metrics: AGENT_METRICS['habit-coach'], lastActivity: new Date(Date.now() - 1 * 60 * 60 * 1000) },
  { id: 'money-coach', emoji: '💰', color: '#FFD54F', bgColor: '#FFF8E1', metrics: AGENT_METRICS['money-coach'], lastActivity: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  { id: 'sleep-coach', emoji: '🐨', color: '#90A4AE', bgColor: '#ECEFF1', metrics: AGENT_METRICS['sleep-coach'], lastActivity: new Date(Date.now() - 8 * 60 * 60 * 1000) },
  { id: 'mental-coach', emoji: '🦢', color: '#F48FB1', bgColor: '#FCE4EC', metrics: AGENT_METRICS['mental-coach'], lastActivity: new Date(Date.now() - 3 * 60 * 60 * 1000) },
  { id: 'fitness-coach', emoji: '🦍', color: '#A1887F', bgColor: '#EFEBE9', metrics: AGENT_METRICS['fitness-coach'], lastActivity: new Date(Date.now() - 6 * 60 * 60 * 1000) },
  { id: 'cooking-coach', emoji: '🍳', color: '#FFAB91', bgColor: '#FBE9E7', metrics: AGENT_METRICS['cooking-coach'], lastActivity: new Date(Date.now() - 12 * 60 * 60 * 1000) },
];

// Weekly activity data
const WEEKLY_DATA = [
  { label: '月', value: 8 },
  { label: '火', value: 12 },
  { label: '水', value: 6 },
  { label: '木', value: 15 },
  { label: '金', value: 10 },
  { label: '土', value: 18 },
  { label: '日', value: 14 },
];

// Summary data
const SUMMARY = { streak: 14, weeklyConversations: 23, goalProgress: 78, badges: 8, totalBadges: 15 };

// Mock insights data
const MOCK_INSIGHTS: Insight[] = [
  { id: '1', message: '今日運動したから、ぐっすり眠れそう！', affectedAgents: ['fitness-coach', 'sleep-coach'], type: 'tip' },
  { id: '2', message: '栄養バランス良い食事は心の安定にも効果的！', affectedAgents: ['diet-coach', 'mental-coach'], type: 'celebration' },
  { id: '3', message: '寝る前のスマホは控えめに。睡眠の質が上がるよ', affectedAgents: ['digital-coach', 'sleep-coach'], type: 'warning' },
];

interface Props {
  navigation: any;
}

export default function DashboardScreen({ navigation }: Props) {
  const { language } = useI18n();
  const { colors, isDark } = useTheme();
  const { error, handleError, clearError } = useErrorHandler();
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (e) {
      setToastMessage('更新に失敗しました');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const getTrendIcon = (trend?: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up': return '↑';
      case 'down': return '↓';
      default: return '→';
    }
  };

  const getTrendColor = (trend?: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up': return colors.success;
      case 'down': return colors.error;
      default: return colors.textTertiary;
    }
  };

  const formatLastActivity = (date: Date) => {
    const diffMs = Date.now() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return t('dashboard.justNow');
    if (diffHours < 24) return t('dashboard.hoursAgo', { hours: diffHours });
    return t('dashboard.daysAgo', { days: diffDays });
  };

  const handleAgentPress = (agent: AgentDashboard) => {
    navigation.navigate('AgentDashboard', { agentId: agent.id, agentName: agent.emoji + ' ' + agent.id, agent });
  };

  // Dynamic styles
  const dynamicStyles = {
    container: { backgroundColor: colors.background },
    text: { color: colors.text },
    textSecondary: { color: colors.textSecondary },
    card: { backgroundColor: colors.card },
    surface: { backgroundColor: colors.surface },
  };

  if (error) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]}>
        <ErrorDisplay error={error} onRetry={clearError} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]}>
      <View style={styles.header}>
        <Text style={[styles.title, dynamicStyles.text]}>{t('dashboard.title')}</Text>
      </View>

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
        {/* Summary Section */}
        <Text style={[styles.sectionTitle, dynamicStyles.text]}>{t('dashboard.integrationSummary')}</Text>
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: colors.progressCardBackground }]}>
            <Text style={styles.summaryEmoji}>🔥</Text>
            <Text style={[styles.summaryValue, dynamicStyles.text]}>{SUMMARY.streak}</Text>
            <Text style={[styles.summaryLabel, dynamicStyles.textSecondary]}>{t('dashboard.consecutiveDays')}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.progressCardBackground }]}>
            <Text style={styles.summaryEmoji}>💬</Text>
            <Text style={[styles.summaryValue, dynamicStyles.text]}>{SUMMARY.weeklyConversations}</Text>
            <Text style={[styles.summaryLabel, dynamicStyles.textSecondary]}>{t('dashboard.weeklyConversations')}</Text>
          </View>
        </View>
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { backgroundColor: colors.successLight }]}>
            <Ionicons name="flag" size={28} color={colors.success} style={{ marginBottom: 8 }} />
            <View style={styles.progressContainer}>
              <Text style={[styles.summaryValue, dynamicStyles.text]}>{SUMMARY.goalProgress}%</Text>
              <View style={[styles.miniProgressBar, { backgroundColor: isDark ? colors.success + '30' : '#C8E6C9' }]}>
                <View style={[styles.miniProgressFill, { width: `${SUMMARY.goalProgress}%`, backgroundColor: colors.success }]} />
              </View>
            </View>
            <Text style={[styles.summaryLabel, dynamicStyles.textSecondary]}>{t('dashboard.goalProgress')}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.warningLight }]}>
            <Text style={styles.summaryEmoji}>🏅</Text>
            <Text style={[styles.summaryValue, dynamicStyles.text]}>{SUMMARY.badges}/{SUMMARY.totalBadges}</Text>
            <Text style={[styles.summaryLabel, dynamicStyles.textSecondary]}>{t('dashboard.earnedBadges')}</Text>
          </View>
        </View>

        {/* Today's Insights Section */}
        <View style={styles.insightSection}>
          <Text style={[styles.sectionTitle, dynamicStyles.text]}>💡 今日のインサイト</Text>
          {MOCK_INSIGHTS.map(insight => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </View>

        {/* Activity Chart with Period Selector */}
        <View style={styles.chartHeaderRow}>
          <Text style={[styles.sectionTitle, dynamicStyles.text, { marginTop: 0 }]}>{t('dashboard.weeklyActivity')}</Text>
          <View style={styles.periodSelector}>
            {(['week', 'month', 'year'] as const).map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  { backgroundColor: isDark ? '#2A2A2A' : '#f0f0f0' },
                  selectedPeriod === period && { backgroundColor: colors.primary },
                ]}
                onPress={() => setSelectedPeriod(period)}
              >
                <Text style={[
                  styles.periodButtonText,
                  { color: colors.textSecondary },
                  selectedPeriod === period && { color: '#fff' },
                ]}>
                  {period === 'week' ? '週' : period === 'month' ? '月' : '年'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={[styles.chartCard, dynamicStyles.card]}>
          <SimpleChart data={WEEKLY_DATA} color={colors.primary} height={100} />
        </View>

        {/* Agent Cards */}
        <Text style={[styles.sectionTitle, dynamicStyles.text]}>{t('dashboard.agentProgress')}</Text>
        {AGENTS.map((agent) => {
          const agentName = t(`agents.${agent.id}.name`);
          const cardBg = getAgentCardBackground(agent.color, isDark);
          return (
            <TouchableOpacity
              key={agent.id}
              style={[styles.agentCard, { backgroundColor: cardBg }]}
              onPress={() => handleAgentPress(agent)}
              activeOpacity={0.8}
            >
              <View style={styles.agentHeader}>
                {AGENT_IMAGES[agent.id] ? (
                  <Image source={{ uri: AGENT_IMAGES[agent.id] }} style={styles.agentImage} />
                ) : (
                  <Text style={styles.agentEmoji}>{agent.emoji}</Text>
                )}
                <View style={styles.agentInfo}>
                  <Text style={[styles.agentName, { color: agent.color }]}>{agentName}</Text>
                  <Text style={[styles.lastActivity, dynamicStyles.textSecondary]}>🕐 {formatLastActivity(agent.lastActivity)}</Text>
                </View>
                <View style={styles.arrowContainer}>
                  <Text style={[styles.arrow, dynamicStyles.textSecondary]}>→</Text>
                </View>
              </View>

              <View style={[styles.metricsRow, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.6)' }]}>
                {/* Primary Metric */}
                <View style={styles.metricBox}>
                  <View style={styles.metricHeader}>
                    <Text style={[styles.metricLabel, dynamicStyles.textSecondary]}>{t(agent.metrics.primaryKey)}</Text>
                    {agent.metrics.trend && (
                      <Text style={[styles.trendIcon, { color: getTrendColor(agent.metrics.trend) }]}>
                        {getTrendIcon(agent.metrics.trend)}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.metricValue, { color: agent.color }]}>{agent.metrics.primaryValue}</Text>
                </View>

                <View style={[styles.metricDivider, { backgroundColor: colors.divider }]} />

                {/* Secondary Metric */}
                <View style={styles.metricBox}>
                  <Text style={[styles.metricLabel, dynamicStyles.textSecondary]}>{t(agent.metrics.secondaryKey)}</Text>
                  <Text style={[styles.metricValue, { color: agent.color }]}>{agent.metrics.secondaryValue}</Text>
                </View>
              </View>

              {/* Mini Chart */}
              <View style={styles.miniChartContainer}>
                <View style={styles.miniChartBar}>
                  {[0.6, 0.8, 0.5, 0.9, 0.7, 0.85, 0.75].map((h, i) => (
                    <View key={i} style={[styles.miniBar, { height: h * 24, backgroundColor: agent.color, opacity: 0.5 + i * 0.07 }]} />
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Motivation Card */}
        <View style={[styles.motivationCard, { backgroundColor: colors.successLight }]}>
          <Text style={styles.motivationEmoji}>🌟</Text>
          <View style={styles.motivationContent}>
            <Text style={[styles.motivationTitle, { color: colors.success }]}>{t('dashboard.weeklyStatus.title')}</Text>
            <Text style={[styles.motivationText, { color: isDark ? colors.success : '#388E3C' }]}>{t('dashboard.weeklyStatus.good')}</Text>
          </View>
        </View>
      </ScrollView>

      <ErrorToast visible={!!toastMessage} message={toastMessage} onDismiss={() => setToastMessage('')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 12 },
  chartHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 12 },
  periodSelector: { flexDirection: 'row', gap: 6 },
  periodButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  periodButtonText: { fontSize: 13, fontWeight: '500' },
  insightSection: { marginTop: 8 },
  summaryGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  summaryCard: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  summaryEmoji: { fontSize: 28, marginBottom: 8 },
  summaryValue: { fontSize: 28, fontWeight: 'bold' },
  summaryLabel: { fontSize: 12, marginTop: 4 },
  progressContainer: { alignItems: 'center', width: '100%' },
  miniProgressBar: { width: '80%', height: 6, borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  miniProgressFill: { height: '100%', borderRadius: 3 },
  chartCard: { borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  agentCard: { borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  agentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  agentEmoji: { fontSize: 40, marginRight: 12 },
  agentImage: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  agentInfo: { flex: 1 },
  agentName: { fontSize: 20, fontWeight: 'bold' },
  lastActivity: { fontSize: 12, marginTop: 2 },
  arrowContainer: { padding: 8 },
  arrow: { fontSize: 20 },
  metricsRow: { flexDirection: 'row', borderRadius: 12, padding: 12 },
  metricBox: { flex: 1, alignItems: 'center' },
  metricHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricLabel: { fontSize: 12 },
  metricValue: { fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  metricDivider: { width: 1, marginHorizontal: 8 },
  trendIcon: { fontSize: 14, fontWeight: 'bold' },
  miniChartContainer: { marginTop: 12, alignItems: 'center' },
  miniChartBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 24 },
  miniBar: { width: 16, borderRadius: 4 },
  motivationCard: { borderRadius: 16, padding: 20, marginTop: 20, marginBottom: 20, flexDirection: 'row', alignItems: 'center' },
  motivationEmoji: { fontSize: 40, marginRight: 16 },
  motivationContent: { flex: 1 },
  motivationTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  motivationText: { fontSize: 14, lineHeight: 20 },
});
