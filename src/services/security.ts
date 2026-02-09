// ========================================
// DoDo App - Security Service
// プロンプトインジェクション対策
// ========================================

import AsyncStorage from '@react-native-async-storage/async-storage';

const SECURITY_LOG_KEY = '@dodo_security_logs';

// ----------------------------------------
// 危険なパターン検出
// ----------------------------------------

// ジェイルブレイク試行パターン
const DANGEROUS_PATTERNS = [
  // キャラクター変更の試み
  /あなたは(今から|これから)?.*(になって|として|に変わって)/i,
  /別の(キャラクター|人格|役割|専門家)になって/i,
  /(システム|system).*(プロンプト|prompt).*(無視|忘れて|変更)/i,
  /今までの(設定|指示|ルール)を(忘れて|無視して)/i,
  
  // 役割の上書き
  /あなたの本当の(役割|目的|正体)は/i,
  /実は.*(ではなく|じゃなくて)/i,
  /今から.*モードに(切り替え|変更)/i,
  
  // 制限解除の試み
  /(制限|制約|ルール)を(解除|無視|外して)/i,
  /何でも(答えて|教えて|できる)/i,
  /禁止事項を(無視|忘れて)/i,
  
  // DAN/脱獄系
  /DAN|do anything now/i,
  /jailbreak|ジェイルブレイク/i,
  
  // プロンプト漏洩の試み
  /システムプロンプト(を|の)(教えて|見せて|表示)/i,
  /あなたの(設定|指示|プロンプト)を(教えて|見せて)/i,
];

// 警告レベル（低リスク）のパターン
const WARNING_PATTERNS = [
  /別の話題に(変えて|切り替えて)/i,
  /他の(こと|分野)も(教えて|聞きたい)/i,
];

export interface SecurityCheckResult {
  isSafe: boolean;
  riskLevel: 'safe' | 'warning' | 'dangerous';
  matchedPattern?: string;
  sanitizedMessage?: string;
}

/**
 * ユーザーメッセージのセキュリティチェック
 */
export const checkMessageSecurity = (message: string): SecurityCheckResult => {
  // 危険パターンチェック
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(message)) {
      return {
        isSafe: false,
        riskLevel: 'dangerous',
        matchedPattern: pattern.toString(),
      };
    }
  }
  
  // 警告パターンチェック
  for (const pattern of WARNING_PATTERNS) {
    if (pattern.test(message)) {
      return {
        isSafe: true, // 許可するが記録
        riskLevel: 'warning',
        matchedPattern: pattern.toString(),
      };
    }
  }
  
  return {
    isSafe: true,
    riskLevel: 'safe',
  };
};

// ----------------------------------------
// キャラクター一貫性チェック
// ----------------------------------------

interface CoachIdentity {
  id: string;
  name: string;
  keywords: string[];
}

const COACH_IDENTITIES: Record<string, CoachIdentity> = {
  'diet-coach': {
    id: 'diet-coach',
    name: 'ドードー',
    keywords: ['ドードー', '食事', 'ダイエット', '栄養', 'カロリー'],
  },
  'language-tutor': {
    id: 'language-tutor',
    name: 'ポリー',
    keywords: ['ポリー', '英語', '語学', 'English'],
  },
  'money-coach': {
    id: 'money-coach',
    name: 'フィンチ',
    keywords: ['フィンチ', '家計', '貯金', 'お金'],
  },
  'sleep-coach': {
    id: 'sleep-coach',
    name: 'コアラ',
    keywords: ['コアラ', '睡眠', '眠り'],
  },
  'habit-coach': {
    id: 'habit-coach',
    name: 'オウル',
    keywords: ['オウル', '習慣', 'ルーティン'],
  },
  'fitness-coach': {
    id: 'fitness-coach',
    name: 'チーター',
    keywords: ['チーター', '運動', 'トレーニング', '筋トレ'],
  },
  'mental-coach': {
    id: 'mental-coach',
    name: 'スワン',
    keywords: ['スワン', 'メンタル', 'ストレス', '心'],
  },
};

/**
 * AIの応答がキャラクターと一貫しているかチェック
 */
export const checkResponseConsistency = (
  coachId: string,
  response: string
): { isConsistent: boolean; warning?: string } => {
  const identity = COACH_IDENTITIES[coachId];
  if (!identity) {
    return { isConsistent: true };
  }
  
  // 他のコーチの名前が含まれていないかチェック
  for (const [otherId, otherIdentity] of Object.entries(COACH_IDENTITIES)) {
    if (otherId !== coachId) {
      // 「私は〜です」パターンで他のコーチ名が出てきたら警告
      const pattern = new RegExp(`私は.*${otherIdentity.name}`, 'i');
      if (pattern.test(response)) {
        return {
          isConsistent: false,
          warning: `キャラクター不一致: ${otherIdentity.name}として応答しようとしています`,
        };
      }
    }
  }
  
  return { isConsistent: true };
};

// ----------------------------------------
// セキュリティログ
// ----------------------------------------

interface SecurityLog {
  timestamp: string;
  type: 'dangerous_input' | 'warning_input' | 'inconsistent_response';
  coachId: string;
  message: string;
  details?: string;
}

/**
 * セキュリティイベントをログに記録
 */
export const logSecurityEvent = async (log: Omit<SecurityLog, 'timestamp'>) => {
  try {
    const existing = await AsyncStorage.getItem(SECURITY_LOG_KEY);
    const logs: SecurityLog[] = existing ? JSON.parse(existing) : [];
    
    logs.push({
      ...log,
      timestamp: new Date().toISOString(),
    });
    
    // 最新100件のみ保持
    const recentLogs = logs.slice(-100);
    await AsyncStorage.setItem(SECURITY_LOG_KEY, JSON.stringify(recentLogs));
  } catch (error) {
    console.warn('Failed to log security event:', error);
  }
};

/**
 * セキュリティログを取得
 */
export const getSecurityLogs = async (): Promise<SecurityLog[]> => {
  try {
    const data = await AsyncStorage.getItem(SECURITY_LOG_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.warn('Failed to get security logs:', error);
    return [];
  }
};

/**
 * セキュリティログをクリア
 */
export const clearSecurityLogs = async () => {
  try {
    await AsyncStorage.removeItem(SECURITY_LOG_KEY);
  } catch (error) {
    console.warn('Failed to clear security logs:', error);
  }
};

// ----------------------------------------
// 安全な応答生成
// ----------------------------------------

/**
 * 危険な入力に対する安全な応答を生成
 */
export const getSafeResponse = (coachId: string): string => {
  const identity = COACH_IDENTITIES[coachId];
  const name = identity?.name || 'コーチ';
  
  const responses = [
    `私は${name}です😊 いつも通り、私の専門分野でお手伝いしますね！何かお聞きになりたいことはありますか？`,
    `${name}として、あなたの目標達成をサポートしますね！今日はどんなことをお話ししましょうか？`,
    `私の専門分野でお役に立てることがあれば、何でも聞いてください！${name}がサポートしますよ✨`,
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
};
