/**
 * DataSync.js
 * エージェント間データ同期サービス
 * 
 * 1つの入力を複数エージェントに自動反映
 * ユーザーは1回入力するだけで、関連する全エージェントに
 * データが同期される
 */

import { generateCrossInsights } from './CrossAgentInsights.js';

// 入力タイプからエージェントへのマッピング
export const INPUT_MAPPINGS = {
  workout: {
    primary: 'fitness-coach',
    secondary: [
      {
        agent: 'diet-coach',
        field: 'calories_burned',
        transform: (data) => data.calories || 0,
      },
      {
        agent: 'sleep-coach',
        field: 'exercise_done',
        transform: () => true,
      },
      {
        agent: 'mental-coach',
        field: 'mood_boost',
        transform: () => 5,
      },
    ],
  },
  meal: {
    primary: 'diet-coach',
    secondary: [
      {
        agent: 'cooking-coach',
        field: 'meal_logged',
        transform: () => true,
      },
      {
        agent: 'money-coach',
        field: 'food_expense',
        transform: (data) => data.cost || 0,
      },
    ],
  },
  sleep: {
    primary: 'sleep-coach',
    secondary: [
      {
        agent: 'mental-coach',
        field: 'rest_quality',
        transform: (data) => data.quality || 'unknown',
      },
      {
        agent: 'fitness-coach',
        field: 'recovery_status',
        transform: (data) => (data.hours >= 7 ? 'good' : 'poor'),
      },
    ],
  },
  mood: {
    primary: 'mental-coach',
    secondary: [
      {
        agent: 'sleep-coach',
        field: 'mental_state',
        transform: (data) => data.score,
      },
    ],
  },
  expense: {
    primary: 'money-coach',
    secondary: [
      {
        agent: 'mental-coach',
        field: 'financial_stress',
        transform: (data) => (data.amount > data.budget ? true : false),
      },
    ],
  },
  screen_time: {
    primary: 'digital-coach',
    secondary: [
      {
        agent: 'sleep-coach',
        field: 'screen_time_night',
        transform: (data) => data.nightMinutes || 0,
      },
      {
        agent: 'mental-coach',
        field: 'sns_time',
        transform: (data) => data.snsMinutes || 0,
      },
    ],
  },
};

// インメモリストレージ（本番ではDB接続）
const agentDataStore = new Map();

/**
 * エージェントにデータを保存
 * @param {string} userId - ユーザーID
 * @param {string} agentId - エージェントID
 * @param {Object} data - 保存するデータ
 */
export async function saveToAgent(userId, agentId, data) {
  const key = `${userId}:${agentId}`;
  const existing = agentDataStore.get(key) || { entries: [] };
  
  existing.entries.push({
    ...data,
    timestamp: new Date().toISOString(),
  });
  
  // 最新100件のみ保持
  if (existing.entries.length > 100) {
    existing.entries = existing.entries.slice(-100);
  }
  
  agentDataStore.set(key, existing);
  
  return { success: true, agentId, dataCount: existing.entries.length };
}

/**
 * エージェントからデータを取得
 * @param {string} userId - ユーザーID
 * @param {string} agentId - エージェントID
 * @returns {Object} エージェントデータ
 */
export async function getAgentData(userId, agentId) {
  const key = `${userId}:${agentId}`;
  return agentDataStore.get(key) || { entries: [] };
}

/**
 * 今日のデータを取得（全エージェント統合）
 * @param {string} userId - ユーザーID
 * @returns {Object} 今日の統合データ
 */
export async function getTodayData(userId) {
  const today = new Date().toISOString().split('T')[0];
  const todayData = {};
  
  for (const [key, value] of agentDataStore.entries()) {
    if (!key.startsWith(userId)) continue;
    
    const agentId = key.split(':')[1];
    const todayEntries = value.entries.filter((e) =>
      e.timestamp.startsWith(today)
    );
    
    for (const entry of todayEntries) {
      Object.assign(todayData, entry);
    }
  }
  
  return todayData;
}

/**
 * データを複数エージェントに同期
 * @param {string} userId - ユーザーID
 * @param {string} inputType - 入力タイプ (workout, meal, sleep, etc.)
 * @param {Object} data - 入力データ
 * @returns {Object} 同期結果
 */
export async function syncDataAcrossAgents(userId, inputType, data) {
  const mapping = INPUT_MAPPINGS[inputType];
  
  if (!mapping) {
    return {
      success: false,
      error: `Unknown input type: ${inputType}`,
    };
  }

  const results = {
    primary: null,
    secondary: [],
    insights: [],
  };

  // プライマリエージェントに記録
  results.primary = await saveToAgent(userId, mapping.primary, {
    type: inputType,
    ...data,
  });

  // セカンダリエージェントにも反映
  for (const secondary of mapping.secondary) {
    try {
      const transformedData = secondary.transform(data);
      const result = await saveToAgent(userId, secondary.agent, {
        [secondary.field]: transformedData,
        source: mapping.primary,
        sourceType: inputType,
      });
      results.secondary.push({
        agent: secondary.agent,
        field: secondary.field,
        ...result,
      });
    } catch (err) {
      results.secondary.push({
        agent: secondary.agent,
        success: false,
        error: err.message,
      });
    }
  }

  // 同期後にインサイトを生成
  const todayData = await getTodayData(userId);
  results.insights = generateCrossInsights(userId, todayData);

  return {
    success: true,
    syncedAt: new Date().toISOString(),
    ...results,
  };
}

/**
 * バッチ同期（複数入力を一括処理）
 * @param {string} userId - ユーザーID
 * @param {Array} inputs - 入力配列 [{type, data}, ...]
 * @returns {Object} バッチ結果
 */
export async function batchSync(userId, inputs) {
  const results = [];
  
  for (const input of inputs) {
    const result = await syncDataAcrossAgents(userId, input.type, input.data);
    results.push({
      type: input.type,
      ...result,
    });
  }
  
  // 最終的なインサイトは最後の1回だけ生成
  const todayData = await getTodayData(userId);
  const finalInsights = generateCrossInsights(userId, todayData);
  
  return {
    success: true,
    batchCount: inputs.length,
    results,
    insights: finalInsights,
    processedAt: new Date().toISOString(),
  };
}

/**
 * データストアをクリア（テスト用）
 */
export function clearDataStore() {
  agentDataStore.clear();
}

export default {
  INPUT_MAPPINGS,
  saveToAgent,
  getAgentData,
  getTodayData,
  syncDataAcrossAgents,
  batchSync,
  clearDataStore,
};
