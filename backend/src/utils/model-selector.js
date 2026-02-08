/**
 * AI Model Selector - メッセージの複雑さに応じてモデルを自動選択
 * 
 * Haiku: 簡単な質問、短い会話 → コスト効率重視
 * Sonnet: 深い相談、複雑なタスク → 品質重視
 */

// モデル設定
const MODEL_CONFIG = {
  haiku: 'claude-3-haiku-20240307',     // 基本モデル（安い）
  sonnet: 'claude-3-5-sonnet-20241022'  // 高度モデル（賢い）
};

// Sonnetに切り替えるトリガーワード
const SONNET_TRIGGERS = [
  // 深い相談
  '悩んでる', '悩んでいる', '辛い', 'つらい', '困っている',
  '相談したい', 'アドバイス', '助けて',
  // 分析・計画
  '分析して', '計画を立てて', 'プランを作って',
  '週間', '月間', 'スケジュール',
  // 複雑なタスク
  '献立', 'レシピ', 'トレーニングメニュー',
  '面接', 'キャリア', '転職',
  // 長文要求
  '詳しく', '具体的に', 'ステップバイステップ'
];

/**
 * メッセージの複雑さに基づいて適切なモデルを選択
 * @param {string} message - ユーザーのメッセージ
 * @param {Array} conversationHistory - 会話履歴（各要素がメッセージ）
 * @returns {string} - 使用するモデルID
 */
function selectModel(message, conversationHistory = []) {
  // 1. トリガーワードチェック
  const hasTrigger = SONNET_TRIGGERS.some(trigger => message.includes(trigger));
  
  // 2. メッセージの長さ（長い = 複雑な可能性）
  const isLongMessage = message.length > 200;
  
  // 3. 会話の深さ（10往復以上 = 深い相談）
  const isDeepConversation = conversationHistory.length > 20;
  
  // いずれかに該当 → Sonnet
  if (hasTrigger || isLongMessage || isDeepConversation) {
    return MODEL_CONFIG.sonnet;
  }
  
  return MODEL_CONFIG.haiku;
}

/**
 * モデル選択の理由を取得（デバッグ/ログ用）
 * @param {string} message - ユーザーのメッセージ
 * @param {Array} conversationHistory - 会話履歴
 * @returns {Object} - { model, reasons }
 */
function selectModelWithReason(message, conversationHistory = []) {
  const reasons = [];
  
  // トリガーワードチェック
  const matchedTriggers = SONNET_TRIGGERS.filter(t => message.includes(t));
  if (matchedTriggers.length > 0) {
    reasons.push(`trigger: ${matchedTriggers.join(', ')}`);
  }
  
  // メッセージ長
  if (message.length > 200) {
    reasons.push(`long_message: ${message.length}chars`);
  }
  
  // 会話の深さ
  if (conversationHistory.length > 20) {
    reasons.push(`deep_conversation: ${conversationHistory.length}msgs`);
  }
  
  const model = reasons.length > 0 ? MODEL_CONFIG.sonnet : MODEL_CONFIG.haiku;
  
  return {
    model,
    reasons: reasons.length > 0 ? reasons : ['default: simple query']
  };
}

module.exports = {
  MODEL_CONFIG,
  SONNET_TRIGGERS,
  selectModel,
  selectModelWithReason
};
