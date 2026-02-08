/**
 * CrossAgentInsights.js
 * エージェント間の相関分析とインサイト生成
 * 
 * 睡眠・運動・食事・お金・デジタルなど、
 * 各エージェントのデータを横断的に分析して
 * ユーザーに有益なインサイトを提供
 */

// エージェント間の相関定義
export const CORRELATIONS = {
  // 睡眠 → 他への影響
  'sleep-diet': {
    trigger: 'sleep_hours < 6',
    insight: '睡眠不足の日は食欲が増えやすいよ。軽めの食事を心がけて',
    affectedAgents: ['diet-coach'],
    category: 'sleep',
  },
  'sleep-mental': {
    trigger: 'sleep_hours < 6',
    insight: '睡眠が足りないと気分が落ちやすいよ。今日は無理しないで',
    affectedAgents: ['mental-coach'],
    category: 'sleep',
  },
  'sleep-fitness': {
    trigger: 'sleep_hours < 6',
    insight: '睡眠不足での激しい運動は怪我のもと。軽めにしよう',
    affectedAgents: ['fitness-coach'],
    category: 'sleep',
  },

  // 運動 → 他への影響
  'fitness-sleep': {
    trigger: 'workout_done = true',
    insight: '今日運動したから、ぐっすり眠れそう！',
    affectedAgents: ['sleep-coach'],
    category: 'fitness',
  },
  'fitness-mental': {
    trigger: 'workout_done = true',
    insight: '運動後はエンドルフィンで気分UP！いい調子！',
    affectedAgents: ['mental-coach'],
    category: 'fitness',
  },
  'fitness-diet': {
    trigger: 'workout_done = true',
    insight: '運動で約300kcal消費。タンパク質しっかり摂ろう',
    affectedAgents: ['diet-coach'],
    category: 'fitness',
  },

  // 食事 → 他への影響
  'diet-sleep': {
    trigger: 'late_eating = true',
    insight: '遅い食事は睡眠の質を下げるよ。寝る3時間前までに',
    affectedAgents: ['sleep-coach'],
    category: 'diet',
  },
  'diet-mental': {
    trigger: 'healthy_meal = true',
    insight: '栄養バランス良い食事は心の安定にも効果的！',
    affectedAgents: ['mental-coach'],
    category: 'diet',
  },

  // お金 → 他への影響
  'money-mental': {
    trigger: 'overspending = true',
    insight: '今月の支出が多めだけど、必要な出費もある。深呼吸して',
    affectedAgents: ['mental-coach'],
    category: 'money',
  },
  'money-fitness': {
    trigger: 'gym_expense = true',
    insight: 'ジム代は自己投資！健康への支出は惜しまないで正解',
    affectedAgents: ['money-coach', 'fitness-coach'],
    category: 'money',
  },

  // デジタル → 他への影響
  'digital-sleep': {
    trigger: 'screen_time_night > 60',
    insight: '寝る前のスマホは睡眠の質を下げるよ。ブルーライトに注意',
    affectedAgents: ['sleep-coach'],
    category: 'digital',
  },
  'digital-mental': {
    trigger: 'sns_time > 120',
    insight: 'SNS長時間は気分に影響することも。たまにはオフラインで',
    affectedAgents: ['mental-coach'],
    category: 'digital',
  },
};

// 優先度マッピング
const PRIORITY_MAP = {
  'sleep-mental': 'high',
  'sleep-fitness': 'high',
  'sleep-diet': 'medium',
  'fitness-sleep': 'medium',
  'fitness-mental': 'low',
  'fitness-diet': 'medium',
  'diet-sleep': 'high',
  'diet-mental': 'low',
  'money-mental': 'medium',
  'money-fitness': 'low',
  'digital-sleep': 'high',
  'digital-mental': 'medium',
};

/**
 * トリガー条件を評価
 * @param {string} trigger - トリガー式 (例: "sleep_hours < 6")
 * @param {Object} data - 今日のデータ
 * @returns {boolean}
 */
export function evaluateTrigger(trigger, data) {
  // パース: "field operator value"
  const match = trigger.match(/^(\w+)\s*(=|<|>|<=|>=|!=)\s*(.+)$/);
  if (!match) return false;

  const [, field, operator, rawValue] = match;
  const fieldValue = data[field];

  if (fieldValue === undefined) return false;

  // 値のパース
  let value;
  if (rawValue === 'true') value = true;
  else if (rawValue === 'false') value = false;
  else if (!isNaN(Number(rawValue))) value = Number(rawValue);
  else value = rawValue;

  // 比較
  switch (operator) {
    case '=':
      return fieldValue === value;
    case '!=':
      return fieldValue !== value;
    case '<':
      return fieldValue < value;
    case '>':
      return fieldValue > value;
    case '<=':
      return fieldValue <= value;
    case '>=':
      return fieldValue >= value;
    default:
      return false;
  }
}

/**
 * 優先度を取得
 * @param {string} key - 相関キー
 * @returns {string} - 'high' | 'medium' | 'low'
 */
export function getPriority(key) {
  return PRIORITY_MAP[key] || 'low';
}

/**
 * 横断インサイトを生成
 * @param {string} userId - ユーザーID
 * @param {Object} todayData - 今日の統合データ
 * @returns {Array} インサイト配列
 */
export function generateCrossInsights(userId, todayData) {
  const insights = [];

  for (const [key, correlation] of Object.entries(CORRELATIONS)) {
    if (evaluateTrigger(correlation.trigger, todayData)) {
      insights.push({
        id: key,
        message: correlation.insight,
        affectedAgents: correlation.affectedAgents,
        priority: getPriority(key),
        category: correlation.category,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // 優先度でソート (high > medium > low)
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return insights;
}

/**
 * 特定エージェント向けのインサイトをフィルタ
 * @param {Array} insights - 全インサイト
 * @param {string} agentId - エージェントID
 * @returns {Array} フィルタされたインサイト
 */
export function getInsightsForAgent(insights, agentId) {
  return insights.filter((insight) =>
    insight.affectedAgents.includes(agentId)
  );
}

/**
 * 今日のサマリーを生成
 * @param {Array} insights - 生成されたインサイト
 * @returns {Object} サマリー
 */
export function generateDailySummary(insights) {
  const highPriority = insights.filter((i) => i.priority === 'high');
  const categories = [...new Set(insights.map((i) => i.category))];

  return {
    totalInsights: insights.length,
    highPriorityCount: highPriority.length,
    categories,
    topMessage: highPriority[0]?.message || insights[0]?.message || null,
    generatedAt: new Date().toISOString(),
  };
}

export default {
  CORRELATIONS,
  evaluateTrigger,
  getPriority,
  generateCrossInsights,
  getInsightsForAgent,
  generateDailySummary,
};
