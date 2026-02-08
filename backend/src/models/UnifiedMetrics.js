/**
 * UnifiedMetrics.js
 * 統合指標モデル
 * 
 * 全エージェントのデータを統合して
 * ユーザーの総合的な状態を可視化
 */

import { getTodayData, getAgentData } from '../services/DataSync.js';
import { generateCrossInsights, generateDailySummary } from '../services/CrossAgentInsights.js';

// メトリクスカテゴリ定義
export const METRIC_CATEGORIES = {
  health: {
    name: '健康',
    agents: ['sleep-coach', 'fitness-coach', 'diet-coach'],
    weight: 0.35,
  },
  mental: {
    name: 'メンタル',
    agents: ['mental-coach'],
    weight: 0.25,
  },
  finance: {
    name: 'お金',
    agents: ['money-coach'],
    weight: 0.2,
  },
  lifestyle: {
    name: 'ライフスタイル',
    agents: ['digital-coach', 'cooking-coach'],
    weight: 0.2,
  },
};

// スコア計算の閾値
const SCORE_THRESHOLDS = {
  sleep_hours: { optimal: 7, min: 5, max: 9 },
  workout_duration: { optimal: 30, min: 0, max: 120 },
  calories: { optimal: 2000, min: 1200, max: 3000 },
  mood_score: { optimal: 8, min: 1, max: 10 },
  screen_time: { optimal: 120, min: 0, max: 480 },
  savings_rate: { optimal: 20, min: 0, max: 50 },
};

/**
 * 個別メトリクスのスコアを計算（0-100）
 * @param {string} metric - メトリクス名
 * @param {number} value - 値
 * @returns {number} スコア (0-100)
 */
export function calculateMetricScore(metric, value) {
  const threshold = SCORE_THRESHOLDS[metric];
  if (!threshold) return 50; // デフォルト

  const { optimal, min, max } = threshold;

  if (value === optimal) return 100;

  if (value < optimal) {
    // 最小値からoptimalまでの範囲でスコア
    const range = optimal - min;
    const diff = value - min;
    return Math.max(0, Math.min(100, (diff / range) * 100));
  } else {
    // optimalから最大値までの範囲でスコア（超過ペナルティ）
    const range = max - optimal;
    const diff = value - optimal;
    return Math.max(0, Math.min(100, 100 - (diff / range) * 50));
  }
}

/**
 * カテゴリスコアを計算
 * @param {string} category - カテゴリ名
 * @param {Object} data - 統合データ
 * @returns {Object} カテゴリスコア
 */
export function calculateCategoryScore(category, data) {
  const config = METRIC_CATEGORIES[category];
  if (!config) return { score: 0, name: category };

  let totalScore = 0;
  let metricCount = 0;
  const details = [];

  // カテゴリに関連するメトリクスを集計
  const metricMappings = {
    health: ['sleep_hours', 'workout_duration', 'calories'],
    mental: ['mood_score', 'rest_quality'],
    finance: ['savings_rate', 'budget_adherence'],
    lifestyle: ['screen_time', 'cooking_count'],
  };

  const metrics = metricMappings[category] || [];

  for (const metric of metrics) {
    if (data[metric] !== undefined) {
      const score = calculateMetricScore(metric, data[metric]);
      totalScore += score;
      metricCount++;
      details.push({ metric, value: data[metric], score });
    }
  }

  return {
    category,
    name: config.name,
    score: metricCount > 0 ? Math.round(totalScore / metricCount) : 50,
    weight: config.weight,
    details,
  };
}

/**
 * 総合スコアを計算
 * @param {Object} categoryScores - カテゴリごとのスコア
 * @returns {number} 総合スコア (0-100)
 */
export function calculateOverallScore(categoryScores) {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const category of Object.values(categoryScores)) {
    weightedSum += category.score * category.weight;
    totalWeight += category.weight;
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50;
}

/**
 * ユーザーの統合メトリクスを生成
 * @param {string} userId - ユーザーID
 * @returns {Object} 統合メトリクス
 */
export async function getUnifiedMetrics(userId) {
  const todayData = await getTodayData(userId);

  // カテゴリスコア計算
  const categoryScores = {};
  for (const category of Object.keys(METRIC_CATEGORIES)) {
    categoryScores[category] = calculateCategoryScore(category, todayData);
  }

  // 総合スコア
  const overallScore = calculateOverallScore(categoryScores);

  // インサイト生成
  const insights = generateCrossInsights(userId, todayData);
  const summary = generateDailySummary(insights);

  // スコアに基づくステータス
  const status = getStatusFromScore(overallScore);

  return {
    userId,
    date: new Date().toISOString().split('T')[0],
    overallScore,
    status,
    categories: categoryScores,
    insights,
    summary,
    rawData: todayData,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * スコアからステータスを判定
 * @param {number} score - スコア (0-100)
 * @returns {Object} ステータス
 */
export function getStatusFromScore(score) {
  if (score >= 80) {
    return {
      level: 'excellent',
      emoji: '🌟',
      message: '最高の調子！この調子で続けよう！',
    };
  } else if (score >= 60) {
    return {
      level: 'good',
      emoji: '😊',
      message: 'いい感じ！あと少しで完璧！',
    };
  } else if (score >= 40) {
    return {
      level: 'fair',
      emoji: '🙂',
      message: 'まずまず。改善ポイントを見つけよう',
    };
  } else if (score >= 20) {
    return {
      level: 'needs_attention',
      emoji: '😐',
      message: 'ちょっと気をつけて。一つずつ改善しよう',
    };
  } else {
    return {
      level: 'low',
      emoji: '😔',
      message: '今日は休息が必要かも。無理しないで',
    };
  }
}

/**
 * 週間トレンドを計算
 * @param {string} userId - ユーザーID
 * @param {number} days - 日数（デフォルト7日）
 * @returns {Object} トレンドデータ
 */
export async function getWeeklyTrend(userId, days = 7) {
  // TODO: 過去データから週間トレンドを計算
  // 現在はモック実装
  const trend = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    trend.push({
      date: date.toISOString().split('T')[0],
      score: 50 + Math.floor(Math.random() * 30), // モックスコア
    });
  }

  const avgScore = trend.reduce((sum, d) => sum + d.score, 0) / trend.length;
  const lastScore = trend[trend.length - 1].score;
  const firstScore = trend[0].score;
  const changePercent = firstScore > 0 ? ((lastScore - firstScore) / firstScore) * 100 : 0;

  return {
    userId,
    period: `${days} days`,
    trend,
    averageScore: Math.round(avgScore),
    change: {
      value: lastScore - firstScore,
      percent: Math.round(changePercent),
      direction: changePercent >= 0 ? 'up' : 'down',
    },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * エージェント間バランスを分析
 * @param {Object} categoryScores - カテゴリスコア
 * @returns {Object} バランス分析
 */
export function analyzeBalance(categoryScores) {
  const scores = Object.values(categoryScores).map((c) => c.score);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance =
    scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  // 低いカテゴリを特定
  const weakCategories = Object.entries(categoryScores)
    .filter(([, c]) => c.score < avg - stdDev)
    .map(([key, c]) => ({ key, ...c }));

  // 高いカテゴリを特定
  const strongCategories = Object.entries(categoryScores)
    .filter(([, c]) => c.score > avg + stdDev)
    .map(([key, c]) => ({ key, ...c }));

  return {
    averageScore: Math.round(avg),
    standardDeviation: Math.round(stdDev),
    isBalanced: stdDev < 15,
    weakCategories,
    strongCategories,
    recommendation:
      weakCategories.length > 0
        ? `${weakCategories[0].name}に注目してみよう`
        : 'バランス良く頑張ってるね！',
  };
}

export default {
  METRIC_CATEGORIES,
  SCORE_THRESHOLDS,
  calculateMetricScore,
  calculateCategoryScore,
  calculateOverallScore,
  getUnifiedMetrics,
  getStatusFromScore,
  getWeeklyTrend,
  analyzeBalance,
};
