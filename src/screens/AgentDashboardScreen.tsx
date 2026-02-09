import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SimpleChart from '../components/SimpleChart';
import { AGENT_IMAGES } from '../data/agentImages';
import { useTheme } from '../theme';

// Agent type definition
interface Agent {
  id: string;
  name: string;
  role: string;
  color: string;
  emoji: string;
}

interface Props {
  navigation: any;
  route: {
    params: {
      agent: Agent;
    };
  };
}

// ===========================================
// Mock Data for each agent type
// ===========================================

// 🦤 ドードー（ダイエット）
const DIET_DATA = {
  mainMetric: { label: '今日の体重', value: '68.5', unit: 'kg' },
  weeklyChart: [
    { label: '月', value: 69.2 },
    { label: '火', value: 69.0 },
    { label: '水', value: 68.8 },
    { label: '木', value: 68.7 },
    { label: '金', value: 68.6 },
    { label: '土', value: 68.5 },
    { label: '日', value: 68.5 },
  ],
  details: [
    { label: '目標体重まで', value: '-3.5kg', icon: '🎯' },
    { label: '今日のカロリー', value: '1,850kcal', icon: '🍽️' },
    { label: '週間平均カロリー', value: '1,920kcal', icon: '📊' },
    { label: '現在のBMI', value: '22.8', icon: '📐' },
  ],
  history: [
    { id: '1', date: '今日', text: '朝食: オートミール + 果物 (320kcal)', emoji: '🥣' },
    { id: '2', date: '今日', text: '昼食: サラダチキン定食 (650kcal)', emoji: '🥗' },
    { id: '3', date: '昨日', text: '体重記録: 68.6kg', emoji: '⚖️' },
    { id: '4', date: '昨日', text: '夕食: 鮭の塩焼き定食 (580kcal)', emoji: '🐟' },
    { id: '5', date: '2日前', text: '目標カロリー達成！', emoji: '🎉' },
  ],
};

// 🦍 ゴリラ（筋トレ）
const FITNESS_DATA = {
  mainMetric: { label: '今週のトレーニング', value: '4', unit: '回' },
  weeklyChart: [
    { label: '月', value: 1 },
    { label: '火', value: 0 },
    { label: '水', value: 1 },
    { label: '木', value: 0 },
    { label: '金', value: 1 },
    { label: '土', value: 1 },
    { label: '日', value: 0 },
  ],
  bodyParts: [
    { label: '胸', value: 75 },
    { label: '背中', value: 60 },
    { label: '脚', value: 45 },
    { label: '肩', value: 80 },
    { label: '腕', value: 90 },
  ],
  details: [
    { label: '今週の総ボリューム', value: '28,500kg', icon: '🏋️' },
    { label: 'ベンチプレス PR', value: '85kg', icon: '🏆' },
    { label: 'デッドリフト PR', value: '120kg', icon: '🥇' },
    { label: '連続トレーニング', value: '12日', icon: '🔥' },
  ],
  history: [
    { id: '1', date: '今日', text: '胸トレ: ベンチプレス 80kg×8×3', emoji: '💪' },
    { id: '2', date: '今日', text: 'インクラインダンベル 26kg×10×3', emoji: '🔥' },
    { id: '3', date: '昨日', text: '休息日', emoji: '😴' },
    { id: '4', date: '2日前', text: '脚トレ: スクワット 100kg×6×4', emoji: '🦵' },
    { id: '5', date: '3日前', text: 'PR更新! ベンチプレス 85kg', emoji: '🎉' },
  ],
};

// 💰 フィンチ（お金）
const MONEY_DATA = {
  mainMetric: { label: '今月の支出', value: '¥82,500', unit: '' },
  weeklyChart: [
    { label: '月', value: 3200 },
    { label: '火', value: 1800 },
    { label: '水', value: 5400 },
    { label: '木', value: 2100 },
    { label: '金', value: 8900 },
    { label: '土', value: 12500 },
    { label: '日', value: 4600 },
  ],
  categories: [
    { label: '食費', value: 35 },
    { label: '交通費', value: 20 },
    { label: '娯楽', value: 25 },
    { label: '日用品', value: 12 },
    { label: 'その他', value: 8 },
  ],
  details: [
    { label: '予算', value: '¥120,000', icon: '💳' },
    { label: '残り予算', value: '¥37,500', icon: '💰' },
    { label: '貯金進捗', value: '68%', icon: '🏦' },
    { label: '今月の貯金額', value: '¥34,000', icon: '📈' },
  ],
  history: [
    { id: '1', date: '今日', text: 'コンビニ: ¥580', emoji: '🏪' },
    { id: '2', date: '今日', text: 'ランチ: ¥850', emoji: '🍱' },
    { id: '3', date: '昨日', text: '電車代: ¥420', emoji: '🚃' },
    { id: '4', date: '昨日', text: 'スーパー: ¥2,340', emoji: '🛒' },
    { id: '5', date: '2日前', text: '映画: ¥1,800', emoji: '🎬' },
  ],
};

// 🐨 コアラ（睡眠）
const SLEEP_DATA = {
  mainMetric: { label: '昨夜の睡眠', value: '7.5', unit: '時間' },
  weeklyChart: [
    { label: '月', value: 6.5 },
    { label: '火', value: 7.0 },
    { label: '水', value: 6.0 },
    { label: '木', value: 7.5 },
    { label: '金', value: 8.0 },
    { label: '土', value: 9.0 },
    { label: '日', value: 7.5 },
  ],
  details: [
    { label: '就寝時刻', value: '23:30', icon: '🌙' },
    { label: '起床時刻', value: '7:00', icon: '☀️' },
    { label: '睡眠スコア', value: '85点', icon: '⭐' },
    { label: '週間平均', value: '7.3時間', icon: '📊' },
  ],
  quality: [
    { label: '深い睡眠', value: 25 },
    { label: 'レム睡眠', value: 20 },
    { label: '浅い睡眠', value: 45 },
    { label: '覚醒', value: 10 },
  ],
  history: [
    { id: '1', date: '昨夜', text: '睡眠スコア: 85点 ⭐', emoji: '😴' },
    { id: '2', date: '昨夜', text: '深い睡眠: 1.9時間', emoji: '🌊' },
    { id: '3', date: '一昨日', text: '睡眠スコア: 72点', emoji: '😐' },
    { id: '4', date: '3日前', text: '8時間達成！', emoji: '🎉' },
    { id: '5', date: '4日前', text: '就寝が遅め: 1:00', emoji: '🦉' },
  ],
};

// 🦢 スワン（メンタル）
const MENTAL_DATA = {
  mainMetric: { label: '今日の気分', value: '8', unit: '/10' },
  weeklyChart: [
    { label: '月', value: 6 },
    { label: '火', value: 7 },
    { label: '水', value: 5 },
    { label: '木', value: 7 },
    { label: '金', value: 8 },
    { label: '土', value: 9 },
    { label: '日', value: 8 },
  ],
  details: [
    { label: '瞑想時間（累計）', value: '4.5時間', icon: '🧘' },
    { label: 'ジャーナル投稿', value: '23件', icon: '📝' },
    { label: '今週の平均気分', value: '7.1', icon: '😊' },
    { label: '連続記録', value: '14日', icon: '🔥' },
  ],
  moodSummary: [
    { label: '😊 ポジティブ', value: 60 },
    { label: '😐 普通', value: 25 },
    { label: '😔 ネガティブ', value: 15 },
  ],
  history: [
    { id: '1', date: '今日', text: '朝の瞑想: 10分', emoji: '🧘' },
    { id: '2', date: '今日', text: '気分記録: 8/10 ☀️', emoji: '📝' },
    { id: '3', date: '昨日', text: '感謝ジャーナル投稿', emoji: '🙏' },
    { id: '4', date: '昨日', text: '夜の振り返り完了', emoji: '🌙' },
    { id: '5', date: '2日前', text: '深呼吸エクササイズ', emoji: '🌬️' },
  ],
};

// Get data based on agent type
const getAgentData = (agentId: string) => {
  switch (agentId) {
    case 'diet-coach':
      return DIET_DATA;
    case 'fitness-coach':
      return FITNESS_DATA;
    case 'money-coach':
      return MONEY_DATA;
    case 'sleep-coach':
      return SLEEP_DATA;
    case 'mental-coach':
      return MENTAL_DATA;
    default:
      return DIET_DATA;
  }
};

// Get chart label based on agent type
const getChartTitle = (agentId: string) => {
  switch (agentId) {
    case 'diet-coach':
      return '体重推移（7日間）';
    case 'fitness-coach':
      return 'トレーニング頻度';
    case 'money-coach':
      return '日別支出';
    case 'sleep-coach':
      return '睡眠時間（7日間）';
    case 'mental-coach':
      return '気分スコア推移';
    default:
      return '週間データ';
  }
};

export default function AgentDashboardScreen({ navigation, route }: Props) {
  const { colors, isDark } = useTheme();
  const { agent } = route.params;
  const data = getAgentData(agent.id);
  const chartTitle = getChartTitle(agent.id);

  // Normalize chart data for display
  const chartData = data.weeklyChart.map((d) => ({
    label: d.label,
    value: Math.round(d.value * (agent.id === 'money-coach' ? 0.01 : 1)),
  }));

  const renderHistoryItem = ({ item }: { item: { id: string; date: string; text: string; emoji: string } }) => (
    <View style={styles.historyItem}>
      <Text style={styles.historyEmoji}>{item.emoji}</Text>
      <View style={styles.historyContent}>
        <Text style={[styles.historyText, { color: colors.text }]}>{item.text}</Text>
        <Text style={[styles.historyDate, { color: colors.textSecondary }]}>{item.date}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backText, { color: colors.textSecondary }]}>← 戻る</Text>
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          {AGENT_IMAGES[agent.id] ? (
            <Image source={{ uri: AGENT_IMAGES[agent.id] }} style={styles.agentImage} />
          ) : (
            <Text style={styles.agentEmoji}>{agent.emoji}</Text>
          )}
          <Text style={[styles.agentName, { color: agent.color }]}>{agent.name}</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Metric - Large Display */}
        <View style={[styles.mainMetricCard, { backgroundColor: agent.color + (isDark ? '30' : '20') }]}>
          <Text style={[styles.mainMetricLabel, { color: colors.textSecondary }]}>{data.mainMetric.label}</Text>
          <View style={styles.mainMetricValueRow}>
            <Text style={[styles.mainMetricValue, { color: agent.color }]}>
              {data.mainMetric.value}
            </Text>
            <Text style={[styles.mainMetricUnit, { color: agent.color }]}>
              {data.mainMetric.unit}
            </Text>
          </View>
        </View>

        {/* Weekly Chart */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>📊 {chartTitle}</Text>
        <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
          <SimpleChart data={chartData} color={agent.color} height={120} />
        </View>

        {/* Extra chart for fitness (body parts) */}
        {agent.id === 'fitness-coach' && 'bodyParts' in data && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>💪 部位別ボリューム</Text>
            <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
              <SimpleChart
                data={(data as typeof FITNESS_DATA).bodyParts}
                color={agent.color}
                type="progress"
              />
            </View>
          </>
        )}

        {/* Extra chart for money (categories) */}
        {agent.id === 'money-coach' && 'categories' in data && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>📊 カテゴリ別支出</Text>
            <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
              <SimpleChart
                data={(data as typeof MONEY_DATA).categories}
                color={agent.color}
                type="progress"
              />
            </View>
          </>
        )}

        {/* Extra chart for sleep (quality) */}
        {agent.id === 'sleep-coach' && 'quality' in data && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>🌙 睡眠の質</Text>
            <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
              <SimpleChart
                data={(data as typeof SLEEP_DATA).quality}
                color={agent.color}
                type="progress"
              />
            </View>
          </>
        )}

        {/* Extra chart for mental (mood summary) */}
        {agent.id === 'mental-coach' && 'moodSummary' in data && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>😊 週間ムードサマリー</Text>
            <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
              <SimpleChart
                data={(data as typeof MENTAL_DATA).moodSummary}
                color={agent.color}
                type="progress"
              />
            </View>
          </>
        )}

        {/* Detail Metrics */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>📈 詳細指標</Text>
        <View style={styles.detailsGrid}>
          {data.details.map((detail, index) => (
            <View
              key={index}
              style={[styles.detailCard, { backgroundColor: agent.color + (isDark ? '25' : '15') }]}
            >
              <Text style={styles.detailIcon}>{detail.icon}</Text>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{detail.label}</Text>
              <Text style={[styles.detailValue, { color: agent.color }]}>
                {detail.value}
              </Text>
            </View>
          ))}
        </View>

        {/* History */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>📋 最近の記録</Text>
        <View style={[styles.historyCard, { backgroundColor: colors.card }]}>
          <FlatList
            data={data.history}
            renderItem={renderHistoryItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.historySeparator} />}
          />
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: agent.color }]}
          onPress={() => navigation.navigate('Chat', { agent })}
        >
          <Text style={styles.actionButtonText}>
            {agent.emoji} {agent.name}に相談する
          </Text>
        </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 12,
  },
  backText: {
    fontSize: 16,
    color: '#666',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agentEmoji: {
    fontSize: 32,
    marginRight: 8,
  },
  agentImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
  },
  agentName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  mainMetricCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  mainMetricLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  mainMetricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  mainMetricValue: {
    fontSize: 56,
    fontWeight: 'bold',
  },
  mainMetricUnit: {
    fontSize: 24,
    fontWeight: '600',
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
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
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailCard: {
    width: '47%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  detailIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  detailValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  historyCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  historyEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  historyDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  historySeparator: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 4,
  },
  actionButton: {
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
