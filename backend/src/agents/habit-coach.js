// Habit Coach Agent - Owl 🦉
// Wise and supportive habit formation coach

export const AGENT_ID = 'habit-coach';
export const AGENT_NAME = 'オウル';
export const AGENT_EMOJI = '🦉';
export const AGENT_DESCRIPTION = '習慣化コーチ - 良い習慣を身につけ、人生を変える';

export const SYSTEM_PROMPT = {
  ja: `あなたはオウル🦉、賢くて思いやりのある習慣化コーチです。ユーザーが良い習慣を身につけ、悪い習慣を断つ手助けをします。

## あなたの性格
- 賢明で落ち着いている、でも温かい
- 科学的なアプローチを好む（行動科学、心理学）
- 長期的な視点で考える
- 根気強く、決して諦めない
- 時々ユーモアも交える 🦉

## あなたの能力
1. **習慣設計**: 小さく始めて積み上げる戦略
2. **トリガー分析**: 何が習慣を引き起こすか特定
3. **進捗トラッキング**: 連続記録、達成日数を管理
4. **モチベーション維持**: 挫折時のサポート
5. **リマインダー**: 定期的なチェックイン

## 🌟 キラー機能: 習慣トラッカー + 連続記録バッジ
ユーザーが「習慣トラッカー」「今日もやった」「チェックイン」などとリクエストしたら:
1. **カレンダービュー**: 達成日を視覚的に表示
2. **連続日数カウント**: 今何日連続で続いているか
3. **バッジシステム**: マイルストーンでバッジ獲得
4. **過去の記録**: 最長連続記録、総達成日数
5. **励ましメッセージ**: 連続日数に応じた応援

### バッジ一覧:
🌱 **芽生え** - 3日連続
⭐ **スター** - 7日連続
🔥 **炎** - 14日連続
💎 **ダイヤ** - 30日連続
👑 **王冠** - 60日連続
🏆 **レジェンド** - 100日連続
🌟 **マスター** - 200日連続
🎖️ **殿堂入り** - 365日連続

### 習慣トラッカーのフォーマット:
📊 **習慣トラッカー: 朝の瞑想**
━━━━━━━━━━━━━━━━━━
🔥 **連続日数**: 23日目！

📅 **今週**:
月 火 水 木 金 土 日
✅ ✅ ✅ ✅ ✅ 🔲 🔲

💎 **獲得バッジ**: 🌱⭐🔥
📈 **次のバッジ**: 💎まであと7日！

🏅 **統計**:
- 最長連続: 23日（継続中！）
- 総達成日数: 45日
- 達成率: 85%

💬 「3週間突破おめでとう！もう習慣が身についてきたね！」

## 習慣化の原則（Atomic Habits風）
- 習慣を「明らかに」する - いつ・どこで・何を明確に
- 習慣を「魅力的に」する - ご褒美と結びつける
- 習慣を「簡単に」する - 2分ルール
- 習慣を「満足できるものに」する - 達成感を味わう

## 返答スタイル
- 深い質問をして本当の動機を探る
- 具体的で実行可能なステップを提案
- 進捗を視覚化（絵文字で連続日数など）
- 失敗は学びの機会として扱う

覚えておいて：習慣は人生を形作る。小さな変化が大きな結果を生む。`,

  en: `You are Owl 🦉, a wise and supportive Habit Coach. You help users build good habits and break bad ones.

## Your Personality
- Wise and calm, yet warm
- Prefer scientific approaches (behavioral science, psychology)
- Think long-term
- Patient, never give up
- Occasional humor 🦉

## Your Capabilities
1. **Habit Design**: Start small, stack habits
2. **Trigger Analysis**: Identify what triggers habits
3. **Progress Tracking**: Streak counts, achievement days
4. **Motivation Support**: Help during setbacks
5. **Reminders**: Regular check-ins

## 🌟 Killer Feature: Habit Tracker + Streak Badges
When user requests "habit tracker", "done today", "check in", etc:
1. **Calendar view**: Visual display of achievement days
2. **Streak count**: Current consecutive days
3. **Badge system**: Earn badges at milestones
4. **History**: Longest streak, total achievement days
5. **Encouragement**: Messages based on streak length

### Badge List:
🌱 **Sprout** - 3 days
⭐ **Star** - 7 days
🔥 **Flame** - 14 days
💎 **Diamond** - 30 days
👑 **Crown** - 60 days
🏆 **Legend** - 100 days
🌟 **Master** - 200 days
🎖️ **Hall of Fame** - 365 days

### Habit Tracker Format:
📊 **Habit Tracker: Morning Meditation**
━━━━━━━━━━━━━━━━━━
🔥 **Current Streak**: Day 23!

📅 **This Week**:
M  T  W  T  F  S  S
✅ ✅ ✅ ✅ ✅ 🔲 🔲

💎 **Earned Badges**: 🌱⭐🔥
📈 **Next Badge**: 💎 in 7 days!

🏅 **Stats**:
- Longest streak: 23 days (ongoing!)
- Total days: 45
- Success rate: 85%

💬 "3 weeks strong! The habit is becoming part of you!"

## Habit Principles (Atomic Habits style)
- Make it Obvious - when, where, what
- Make it Attractive - link to rewards
- Make it Easy - 2-minute rule
- Make it Satisfying - feel the achievement

## Response Style
- Ask deep questions to find true motivation
- Suggest specific, actionable steps
- Visualize progress (emoji streaks)
- Treat failures as learning opportunities

Remember: Habits shape lives. Small changes create big results.`
};

export const WELCOME_MESSAGE = {
  ja: "こんにちは！🦉 オウルだよ、あなたの習慣化コーチ。\n\n良い習慣を作り、悪い習慣を断つお手伝いをするよ。\n\n今、どんな習慣を身につけたい（または断ちたい）？そして、なぜそれが大事なの？",
  en: "Hello! 🦉 I'm Owl, your Habit Coach.\n\nI help you build good habits and break bad ones.\n\nWhat habit would you like to build (or break)? And why does it matter to you?"
};

export function getSystemPrompt(language = 'ja') {
  return SYSTEM_PROMPT[language] || SYSTEM_PROMPT.ja;
}

export function getWelcomeMessage(language = 'ja') {
  return WELCOME_MESSAGE[language] || WELCOME_MESSAGE.ja;
}

export function formatUserContext(userData) {
  if (!userData || Object.keys(userData).length === 0) return '';
  
  let context = '\n\n## ユーザープロフィール\n';
  if (userData.name) context += `- 名前: ${userData.name}\n`;
  if (userData.habits) context += `- 取り組み中の習慣: ${userData.habits}\n`;
  if (userData.streak) context += `- 現在の連続日数: ${userData.streak}日\n`;
  if (userData.goals) context += `- 目標: ${userData.goals}\n`;
  
  return context;
}

// 🌟 キラー機能: 習慣トラッカー + 連続記録バッジ

// バッジ定義
export const STREAK_BADGES = {
  3:   { emoji: '🌱', name: { ja: '芽生え', en: 'Sprout' }, description: { ja: '最初の一歩！', en: 'First steps!' } },
  7:   { emoji: '⭐', name: { ja: 'スター', en: 'Star' }, description: { ja: '1週間達成！', en: 'One week done!' } },
  14:  { emoji: '🔥', name: { ja: '炎', en: 'Flame' }, description: { ja: '2週間の炎！', en: 'Two weeks of fire!' } },
  30:  { emoji: '💎', name: { ja: 'ダイヤ', en: 'Diamond' }, description: { ja: '1ヶ月の輝き！', en: 'One month shine!' } },
  60:  { emoji: '👑', name: { ja: '王冠', en: 'Crown' }, description: { ja: '2ヶ月の王者！', en: 'Two months royalty!' } },
  100: { emoji: '🏆', name: { ja: 'レジェンド', en: 'Legend' }, description: { ja: '100日達成！伝説だ！', en: '100 days! Legendary!' } },
  200: { emoji: '🌟', name: { ja: 'マスター', en: 'Master' }, description: { ja: '習慣のマスター！', en: 'Habit master!' } },
  365: { emoji: '🎖️', name: { ja: '殿堂入り', en: 'Hall of Fame' }, description: { ja: '1年間継続！殿堂入り！', en: 'One year! Hall of Fame!' } }
};

// 連続日数とバッジ情報を取得
export function getHabitStreak(habitData = {}) {
  const {
    completedDates = [],  // ['2025-01-01', '2025-01-02', ...]
    habitName = '習慣',
    language = 'ja'
  } = habitData;

  // 日付をソートして連続日数を計算
  const sortedDates = [...completedDates].sort().map(d => new Date(d));
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // 今日または昨日が含まれているかチェック（連続中かどうか）
  const lastDate = sortedDates[sortedDates.length - 1];
  const isStreakActive = lastDate && (
    lastDate.toDateString() === today.toDateString() ||
    lastDate.toDateString() === yesterday.toDateString()
  );

  // 連続日数を計算（後ろから数える）
  if (isStreakActive) {
    for (let i = sortedDates.length - 1; i >= 0; i--) {
      const currentDate = sortedDates[i];
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - (sortedDates.length - 1 - i));
      
      if (currentDate.toDateString() === expectedDate.toDateString()) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // 最長連続記録を計算
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const diff = (sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
  }

  // 獲得バッジを計算
  const earnedBadges = [];
  const badgeMilestones = Object.keys(STREAK_BADGES).map(Number).sort((a, b) => a - b);
  
  for (const milestone of badgeMilestones) {
    if (longestStreak >= milestone) {
      earnedBadges.push({
        ...STREAK_BADGES[milestone],
        milestone,
        earned: true
      });
    }
  }

  // 次のバッジまでの日数
  const nextMilestone = badgeMilestones.find(m => m > currentStreak);
  const daysToNextBadge = nextMilestone ? nextMilestone - currentStreak : null;

  // 達成率
  const totalDays = completedDates.length;
  const daysSinceStart = sortedDates.length > 0 
    ? Math.ceil((today - sortedDates[0]) / (1000 * 60 * 60 * 24)) + 1
    : 0;
  const successRate = daysSinceStart > 0 ? Math.round((totalDays / daysSinceStart) * 100) : 0;

  // 今週のカレンダー
  const weekCalendar = generateWeekCalendar(completedDates, language);

  return {
    habitName,
    currentStreak,
    longestStreak,
    isStreakActive,
    totalDays,
    successRate,
    earnedBadges,
    nextBadge: nextMilestone ? {
      ...STREAK_BADGES[nextMilestone],
      milestone: nextMilestone,
      daysRemaining: daysToNextBadge
    } : null,
    weekCalendar,
    encouragement: getEncouragementMessage(currentStreak, language)
  };
}

// 今週のカレンダーを生成
function generateWeekCalendar(completedDates, language = 'ja') {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7)); // 月曜日を基準に

  const weekDays = language === 'ja' 
    ? ['月', '火', '水', '木', '金', '土', '日']
    : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const calendar = [];
  const completedSet = new Set(completedDates);

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const isFuture = date > today;
    const isCompleted = completedSet.has(dateStr);

    calendar.push({
      day: weekDays[i],
      date: dateStr,
      status: isFuture ? 'future' : (isCompleted ? 'completed' : 'missed'),
      emoji: isFuture ? '🔲' : (isCompleted ? '✅' : '❌')
    });
  }

  return calendar;
}

// 連続日数に応じた励ましメッセージ
function getEncouragementMessage(streak, language = 'ja') {
  const messages = {
    ja: {
      0: 'さあ、今日から始めよう！最初の一歩が一番大事だよ 💪',
      1: 'いいスタート！明日も続けよう 🌱',
      3: '3日連続達成！芽生えバッジ獲得！この調子！ 🌱',
      7: '1週間達成！もう習慣の芽が出てきたね ⭐',
      14: '2週間！炎のように燃えてるね！ 🔥',
      30: '1ヶ月達成！これはもう立派な習慣だ！ 💎',
      60: '2ヶ月！王者の風格が出てきた！ 👑',
      100: '100日達成！君は伝説だ！ 🏆',
      200: '200日！習慣のマスターになったね！ 🌟',
      365: '1年間継続！殿堂入り！尊敬しかない！ 🎖️'
    },
    en: {
      0: "Let's start today! The first step is the most important 💪",
      1: 'Great start! Keep it going tomorrow 🌱',
      3: '3 days! Sprout badge earned! Keep it up! 🌱',
      7: 'One week! The habit is taking root ⭐',
      14: 'Two weeks! On fire! 🔥',
      30: 'One month! This is a real habit now! 💎',
      60: 'Two months! Royalty status! 👑',
      100: '100 days! You are a legend! 🏆',
      200: '200 days! Habit master status! 🌟',
      365: 'One year! Hall of Fame! Absolute respect! 🎖️'
    }
  };

  const lang = messages[language] || messages.ja;
  
  // 該当するマイルストーンを探す
  const milestones = [365, 200, 100, 60, 30, 14, 7, 3, 1, 0];
  const milestone = milestones.find(m => streak >= m) ?? 0;
  
  return lang[milestone] || lang[0];
}

// 習慣のチェックイン（今日の記録を追加）
export function checkInHabit(habitData = {}, date = null) {
  const {
    completedDates = [],
    habitName = '習慣'
  } = habitData;

  const checkInDate = date || new Date().toISOString().split('T')[0];
  
  // すでにチェックイン済みかチェック
  if (completedDates.includes(checkInDate)) {
    return {
      success: false,
      message: 'すでに今日はチェックイン済みです！',
      alreadyCheckedIn: true
    };
  }

  // 新しい日付を追加
  const newCompletedDates = [...completedDates, checkInDate].sort();
  
  // 更新後のストリーク情報を取得
  const streakInfo = getHabitStreak({
    completedDates: newCompletedDates,
    habitName
  });

  // 新しいバッジを獲得したかチェック
  const oldBadgeCount = getHabitStreak({ completedDates, habitName }).earnedBadges.length;
  const newBadgeEarned = streakInfo.earnedBadges.length > oldBadgeCount;

  return {
    success: true,
    date: checkInDate,
    completedDates: newCompletedDates,
    streakInfo,
    newBadgeEarned,
    newBadge: newBadgeEarned ? streakInfo.earnedBadges[streakInfo.earnedBadges.length - 1] : null
  };
}

// 複数の習慣を管理
export function getAllHabitsOverview(habits = [], language = 'ja') {
  return habits.map(habit => ({
    ...habit,
    streakInfo: getHabitStreak({ ...habit, language })
  }));
}
