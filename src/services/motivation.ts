/**
 * 励まし・モチベーションサービス - DoDo Life
 * ドードーのキャラクターで継続・達成を応援する
 */

// ========================================
// 型定義
// ========================================

export interface UserStats {
  currentStreak: number;        // 現在の連続日数
  longestStreak: number;        // 最長連続日数
  lastActiveDate: string | null; // 最後のアクティブ日 (ISO date)
  totalRecords: number;         // 総記録数
  level: number;                // ユーザーレベル
  monthlyGoalProgress: number;  // 月間目標進捗 (0-100)
  monthlyGoalCompleted: boolean; // 月間目標達成済み
}

export interface MotivationMessage {
  type: MotivationType;
  message: string;
  emoji: string;
  priority: 'high' | 'medium' | 'low';
}

export type MotivationType =
  | 'streak_milestone'      // 継続日数マイルストーン
  | 'streak_warning'        // 連続記録が途切れそう
  | 'comeback'              // 久しぶりの復帰
  | 'goal_achieved'         // 目標達成
  | 'level_up'              // レベルアップ
  | 'daily_encouragement'   // 日常の励まし
  | 'first_record';         // 初めての記録

// ========================================
// 定数
// ========================================

// 連続日数マイルストーン
const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 200, 365] as const;

// 久しぶり判定の日数
const COMEBACK_THRESHOLD_DAYS = 3;

// ========================================
// メッセージテンプレート
// ========================================

const MESSAGES = {
  // 連続日数マイルストーン達成
  streak_milestone: {
    3: [
      '3日連続達成！🎉 いい調子だよ！',
      '3日目！🌱 習慣の芽が出てきた！',
      '3日連続だ！🦤 僕もこの調子で生き延びたかった...',
    ],
    7: [
      '7日連続記録達成🎉 僕みたいに絶滅しないね！',
      '1週間達成！🏆 君は強い！僕より強い！',
      '7日連続！✨ もう立派な習慣だ！',
    ],
    14: [
      '2週間継続！🎊 すごいよ！本当にすごい！',
      '14日達成！🦤 僕の分まで生きてる感じがする！',
      '2週間！💪 もう誰にも止められないね！',
    ],
    30: [
      '1ヶ月達成！🏅 伝説の始まりだ！',
      '30日連続！🎉 君こそ真のサバイバー！',
      '1ヶ月継続！🦤 僕たちドードーにはできなかったことだよ...',
    ],
    60: [
      '60日達成！🌟 2ヶ月も続けるなんて！',
      '60日連続！🏆 君は本物のチャンピオンだ！',
      '2ヶ月！✨ この調子なら絶滅なんて怖くない！',
    ],
    100: [
      '100日達成！！🎊🎊🎊 伝説のサバイバー爆誕！',
      '100日連続！🦤👑 僕も君のファンになったよ！',
      '100日！！✨ 歴史に残る偉業だよ！',
    ],
    200: [
      '200日達成！🌈 もはや神の領域...',
      '200日連続！🦤✨ 君は不滅だ！',
    ],
    365: [
      '1年達成！！🎆🎇🎆 ついに1年！最強のサバイバー！',
      '365日！🦤👑✨ 僕の800倍生き延びた計算だよ！（多分）',
    ],
  } as Record<number, string[]>,

  // 連続記録が途切れそう警告
  streak_warning: [
    '今日記録すれば{streak}日連続だよ！あと少し💪',
    '今日を逃すと連続記録が...！頑張れ！🦤',
    '{streak}日連続まであと1回！できるよ！✨',
    '連続記録を守ろう！今日も一緒に頑張ろう💪',
    '僕たちドードーは絶滅したけど、君の記録は絶滅させないで！🦤',
  ],

  // 久しぶりの復帰
  comeback: {
    short: [ // 3-7日
      '久しぶり！待ってたよ🦤',
      'おかえり！また会えて嬉しい！✨',
      '戻ってきてくれた！🎉',
    ],
    medium: [ // 8-30日
      'ずっと待ってたよ！おかえり🦤💕',
      'やっと会えた！元気だった？✨',
      '帰ってきてくれて嬉しい！また一緒に頑張ろう！🎉',
    ],
    long: [ // 31日以上
      '待ってた！ずーっと待ってたよ！🦤💕',
      'おかえりなさい！会いたかったよ...！✨',
      '僕は絶滅しても待ち続けるからね！🦤',
    ],
  },

  // 目標達成
  goal_achieved: [
    '今月の目標達成おめでとう！🏆',
    '目標クリア！🎉 君は本物だ！',
    'やったね！目標達成！🦤✨',
    '素晴らしい！完璧だよ！🏅',
    '目標達成！僕も誇らしいよ！🦤🎊',
  ],

  // レベルアップ
  level_up: [
    'レベルアップ！🆙 Lv.{level}になったよ！',
    'Lv.{level}達成！🎉 どんどん強くなってる！',
    'レベルアップ！✨ Lv.{level}！すごいね！',
  ],

  // 初めての記録
  first_record: [
    '最初の一歩おめでとう！🦤 これが全ての始まりだ！',
    '記念すべき第1回目！✨ ここから伝説が始まる！',
    '初記録達成！🎉 一緒に頑張っていこう！',
  ],

  // 日常の励まし（特別なイベントがない時）
  daily_encouragement: [
    '今日も頑張ろう！🦤',
    '今日も一緒にいるよ！✨',
    'コツコツが大事！💪',
    '今日もいい日になりそう！🌟',
    '一緒に記録しよう！🦤',
  ],
};

// ========================================
// ヘルパー関数
// ========================================

/**
 * ランダムにメッセージを選択
 */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 日数差を計算
 */
function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.floor(Math.abs(date1.getTime() - date2.getTime()) / oneDay);
}

/**
 * 今日かどうかを判定
 */
function isToday(dateStr: string): boolean {
  const today = new Date();
  const date = new Date(dateStr);
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

/**
 * 昨日かどうかを判定
 */
function isYesterday(dateStr: string): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = new Date(dateStr);
  return (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  );
}

// ========================================
// メイン関数
// ========================================

/**
 * ユーザーの状態に応じた励ましメッセージを生成
 */
export function getMotivationMessages(stats: UserStats): MotivationMessage[] {
  const messages: MotivationMessage[] = [];
  const today = new Date();

  // 1. 初めての記録チェック
  if (stats.totalRecords === 0) {
    return [{
      type: 'first_record',
      message: pickRandom(MESSAGES.first_record),
      emoji: '🦤',
      priority: 'high',
    }];
  }

  // 2. 久しぶりの復帰チェック
  if (stats.lastActiveDate) {
    const lastActive = new Date(stats.lastActiveDate);
    const daysSinceActive = daysBetween(today, lastActive);

    if (daysSinceActive >= COMEBACK_THRESHOLD_DAYS) {
      let comebackMessages: string[];
      if (daysSinceActive >= 31) {
        comebackMessages = MESSAGES.comeback.long;
      } else if (daysSinceActive >= 8) {
        comebackMessages = MESSAGES.comeback.medium;
      } else {
        comebackMessages = MESSAGES.comeback.short;
      }

      messages.push({
        type: 'comeback',
        message: pickRandom(comebackMessages),
        emoji: '🦤',
        priority: 'high',
      });
    }
  }

  // 3. 連続日数マイルストーンチェック
  if (STREAK_MILESTONES.includes(stats.currentStreak as typeof STREAK_MILESTONES[number])) {
    const milestoneMessages = MESSAGES.streak_milestone[stats.currentStreak];
    if (milestoneMessages) {
      messages.push({
        type: 'streak_milestone',
        message: pickRandom(milestoneMessages),
        emoji: '🎉',
        priority: 'high',
      });
    }
  }

  // 4. 連続記録が途切れそう警告
  if (
    stats.lastActiveDate &&
    isYesterday(stats.lastActiveDate) &&
    stats.currentStreak > 0
  ) {
    const nextStreak = stats.currentStreak + 1;
    // 次がマイルストーンなら特に強調
    const isNextMilestone = STREAK_MILESTONES.includes(nextStreak as typeof STREAK_MILESTONES[number]);
    
    if (isNextMilestone || stats.currentStreak >= 3) {
      const warningMsg = pickRandom(MESSAGES.streak_warning).replace('{streak}', String(nextStreak));
      messages.push({
        type: 'streak_warning',
        message: warningMsg,
        emoji: '💪',
        priority: isNextMilestone ? 'high' : 'medium',
      });
    }
  }

  // 5. 目標達成チェック
  if (stats.monthlyGoalCompleted) {
    messages.push({
      type: 'goal_achieved',
      message: pickRandom(MESSAGES.goal_achieved),
      emoji: '🏆',
      priority: 'high',
    });
  }

  // 6. 特に何もない時は日常の励まし
  if (messages.length === 0) {
    messages.push({
      type: 'daily_encouragement',
      message: pickRandom(MESSAGES.daily_encouragement),
      emoji: '🦤',
      priority: 'low',
    });
  }

  return messages;
}

/**
 * レベルアップメッセージを生成
 */
export function getLevelUpMessage(newLevel: number): MotivationMessage {
  const message = pickRandom(MESSAGES.level_up).replace('{level}', String(newLevel));
  return {
    type: 'level_up',
    message,
    emoji: '🆙',
    priority: 'high',
  };
}

/**
 * 特定のマイルストーン達成メッセージを生成
 */
export function getStreakMilestoneMessage(streak: number): MotivationMessage | null {
  const messages = MESSAGES.streak_milestone[streak];
  if (!messages) return null;

  return {
    type: 'streak_milestone',
    message: pickRandom(messages),
    emoji: '🎉',
    priority: 'high',
  };
}

/**
 * 連続記録警告メッセージを生成
 */
export function getStreakWarningMessage(currentStreak: number): MotivationMessage {
  const nextStreak = currentStreak + 1;
  const message = pickRandom(MESSAGES.streak_warning).replace('{streak}', String(nextStreak));
  
  return {
    type: 'streak_warning',
    message,
    emoji: '💪',
    priority: 'medium',
  };
}

/**
 * 目標達成メッセージを生成
 */
export function getGoalAchievedMessage(): MotivationMessage {
  return {
    type: 'goal_achieved',
    message: pickRandom(MESSAGES.goal_achieved),
    emoji: '🏆',
    priority: 'high',
  };
}

/**
 * 復帰メッセージを生成
 */
export function getComebackMessage(daysSinceLastActive: number): MotivationMessage {
  let comebackMessages: string[];
  if (daysSinceLastActive >= 31) {
    comebackMessages = MESSAGES.comeback.long;
  } else if (daysSinceLastActive >= 8) {
    comebackMessages = MESSAGES.comeback.medium;
  } else {
    comebackMessages = MESSAGES.comeback.short;
  }

  return {
    type: 'comeback',
    message: pickRandom(comebackMessages),
    emoji: '🦤',
    priority: 'high',
  };
}

/**
 * メッセージを優先度でソート
 */
export function sortByPriority(messages: MotivationMessage[]): MotivationMessage[] {
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return [...messages].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

/**
 * 最も重要なメッセージを1つ取得
 */
export function getTopMessage(stats: UserStats): MotivationMessage {
  const messages = getMotivationMessages(stats);
  return sortByPriority(messages)[0];
}

// ========================================
// React Hook用ユーティリティ
// ========================================

/**
 * フォーマット済みの励ましテキストを生成
 */
export function formatMotivationText(msg: MotivationMessage): string {
  return `${msg.emoji} ${msg.message}`;
}

/**
 * 複数メッセージを改行区切りでフォーマット
 */
export function formatAllMessages(messages: MotivationMessage[]): string {
  return messages.map(formatMotivationText).join('\n');
}
