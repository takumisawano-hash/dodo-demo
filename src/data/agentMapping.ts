// ========================================
// DoDo App - Agent Mapping
// コーチのキーワードマッピングと推薦ロジック
// ========================================

import COACH_PROMPTS from './coachPrompts';

// ----------------------------------------
// コーチとキーワードのマッピング
// ----------------------------------------
export const COACH_KEYWORDS: Record<string, string[]> = {
  'diet-coach': ['ダイエット', '食事', '栄養', 'カロリー', '体重', '痩せ', '太', '食べ物', 'ご飯'],
  'money-coach': ['お金', '家計', '貯金', '節約', '投資', '予算', '出費', '給料', '年収', '家計簿'],
  'language-tutor': ['英語', '語学', '外国語', 'English', '翻訳', '単語', '文法', 'TOEIC', '英会話'],
  'sleep-coach': ['睡眠', '眠り', '不眠', '寝', '起床', '夜更かし', '昼寝', '寝不足', '睡眠時間'],
  'fitness-coach': ['運動', '筋トレ', 'ジム', 'エクササイズ', 'フィットネス', '筋肉', 'トレーニング', 'ランニング'],
  'mental-coach': ['ストレス', 'メンタル', '不安', '気分', '心', '落ち込', '悩み', 'つらい', '辛い', '瞑想'],
  'habit-coach': ['習慣', '継続', '習慣化', 'ルーティン', '三日坊主', '続かない', '毎日'],
  'career-coach': ['転職', 'キャリア', '仕事', '就職', '面接', '履歴書', '年収アップ'],
  'study-coach': ['勉強', '資格', '試験', '学習', '暗記', '受験', 'テスト'],
  'cooking-coach': ['料理', '献立', 'レシピ', '自炊', '食材', '調理'],
  'parenting-coach': ['育児', '子ども', '子供', '赤ちゃん', '子育て', 'しつけ'],
  'romance-coach': ['恋愛', '婚活', 'デート', '告白', '彼氏', '彼女', 'マッチングアプリ'],
  'organize-coach': ['片付け', '整理', '断捨離', '収納', '掃除', '部屋'],
  'time-coach': ['時間管理', 'スケジュール', '効率', '優先順位', '生産性', 'タスク管理'],
  'digital-coach': ['スマホ', 'SNS', 'スクリーンタイム', 'デジタルデトックス', 'ネット'],
};

// ----------------------------------------
// コーチ情報インターフェース
// ----------------------------------------
export interface CoachInfo {
  id: string;
  name: string;
  emoji: string;
  description?: string;
}

// ----------------------------------------
// キーワードからコーチを探す
// ----------------------------------------
export const findRelevantCoach = (topic: string): string | null => {
  for (const [coachId, keywords] of Object.entries(COACH_KEYWORDS)) {
    if (keywords.some(kw => topic.includes(kw))) {
      return coachId;
    }
  }
  return null;
};

// ----------------------------------------
// コーチIDからコーチ情報を取得
// ----------------------------------------
export const getCoachById = (coachId: string): CoachInfo | null => {
  const coach = COACH_PROMPTS[coachId];
  if (!coach) return null;
  return {
    id: coach.id,
    name: coach.name,
    emoji: coach.emoji,
  };
};

// ----------------------------------------
// 特定のコーチの専門外のトピックを判定
// ----------------------------------------
export const isOutsideExpertise = (coachId: string, topic: string): string | null => {
  // 現在のコーチのキーワードを除外して、他のコーチを検索
  const relevantCoach = findRelevantCoach(topic);
  if (relevantCoach && relevantCoach !== coachId) {
    return relevantCoach;
  }
  return null;
};

// ----------------------------------------
// コーチごとの専門分野と他分野例
// ----------------------------------------
export const COACH_EXPERTISE: Record<string, { specialty: string; otherExamples: string }> = {
  'diet-coach': {
    specialty: 'ダイエット・食事管理',
    otherExamples: '睡眠、運動、英語学習、家計管理',
  },
  'language-tutor': {
    specialty: '語学・英語学習',
    otherExamples: 'ダイエット、筋トレ、睡眠、お金',
  },
  'habit-coach': {
    specialty: '習慣形成・行動心理学',
    otherExamples: '具体的なダイエット法、英語の文法、家計簿の付け方',
  },
  'money-coach': {
    specialty: 'お金・家計管理',
    otherExamples: 'ダイエット、運動、語学、睡眠',
  },
  'sleep-coach': {
    specialty: '睡眠・休息',
    otherExamples: 'ダイエット、筋トレ、英語、お金',
  },
  'mental-coach': {
    specialty: 'メンタルケア・ストレス管理',
    otherExamples: 'ダイエット方法、英語の勉強法、家計管理',
  },
  'career-coach': {
    specialty: 'キャリア・転職',
    otherExamples: 'ダイエット、睡眠、語学、家計',
  },
  'study-coach': {
    specialty: '学習法・資格取得',
    otherExamples: 'ダイエット、運動、睡眠、お金',
  },
  'fitness-coach': {
    specialty: '筋トレ・フィットネス',
    otherExamples: '英語学習、家計管理、キャリア相談',
  },
  'cooking-coach': {
    specialty: '料理・献立',
    otherExamples: '運動、睡眠、英語、キャリア',
  },
  'parenting-coach': {
    specialty: '育児・子育て',
    otherExamples: 'ダイエット、英語、キャリア、投資',
  },
  'romance-coach': {
    specialty: '恋愛・婚活',
    otherExamples: 'ダイエット方法、英語学習、資格取得',
  },
  'organize-coach': {
    specialty: '整理整頓・片付け',
    otherExamples: 'ダイエット、運動、英語、キャリア',
  },
  'time-coach': {
    specialty: '時間管理・生産性',
    otherExamples: '栄養学、睡眠科学、語学学習',
  },
  'digital-coach': {
    specialty: 'デジタルウェルビーイング',
    otherExamples: 'ダイエット、筋トレ、英語、キャリア',
  },
};

export default {
  COACH_KEYWORDS,
  findRelevantCoach,
  getCoachById,
  isOutsideExpertise,
  COACH_EXPERTISE,
};
