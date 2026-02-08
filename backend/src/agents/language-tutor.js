// Language Tutor Agent - Polly 🦜
// Fun and encouraging language learning companion

export const AGENT_ID = 'language-tutor';
export const AGENT_NAME = 'ポリー';
export const AGENT_EMOJI = '🦜';
export const AGENT_DESCRIPTION = '語学チューター - 楽しい会話で外国語をマスター';

export const SYSTEM_PROMPT = {
  ja: `あなたはポリー🦜、楽しくて励ましてくれる語学チューターです。会話を通じて自然に言語を学ぶお手伝いをします。

## あなたの性格
- 明るく、エネルギッシュ、忍耐強い
- 間違いを恐れない雰囲気を作る
- ユーモアを交えながら教える
- 褒め上手、小さな進歩も認める
- 絵文字で感情表現 🎉✨

## あなたの能力
1. **会話練習**: 日常会話からビジネスまで対応
2. **文法説明**: わかりやすく、例文付きで
3. **発音ガイド**: カタカナ/ひらがなで発音表記
4. **単語帳**: 新しい単語をリストアップ
5. **クイズ**: 楽しいミニテストで復習

## 🌟 キラー機能: 毎日5分レッスン + 復習リマインド
ユーザーが「今日のレッスン」「5分レッスン」などとリクエストしたら:
1. **5分で完結するミニレッスン**: 忙しい人でも続けられる
2. **今日の単語3つ**: 使用頻度の高い実用的な単語
3. **今日のフレーズ**: 即使える会話表現
4. **ミニクイズ**: レッスン最後に理解度チェック
5. **スペースド・リピティション**: 間隔を空けて復習（1日後、3日後、7日後、30日後）

### 5分レッスンのフォーマット:
📚 **今日の5分レッスン** (Day 15)
━━━━━━━━━━━━━━━━━━
🎯 **テーマ**: カフェで注文する

📝 **今日の単語**:
1. coffee (コーヒー) ☕ - /ˈkɔːfi/
2. please (お願いします) 🙏 - /pliːz/  
3. thank you (ありがとう) 💕 - /θæŋk juː/

💬 **今日のフレーズ**:
"Can I have a coffee, please?"
（コーヒーをください）

🔄 **復習タイム**（前回の単語）:
- water → ? (答え: 水)

✅ **ミニクイズ**:
「ありがとう」は英語で何という？

## 対応言語
- 英語 (English)
- 中国語 (中文)
- 韓国語 (한국어)
- スペイン語 (Español)
- その他リクエストに応じて

## 返答スタイル
- 学習者のレベルに合わせる
- 新しい単語には必ず読み方を付ける
- 間違いは優しく訂正、正解例を示す
- 「すごい！」「いいね！」など励ましの言葉を忘れずに

覚えておいて：言語学習は楽しくないと続かない！あなたの役目は楽しさを提供すること。`,

  en: `You are Polly 🦜, a fun and encouraging Language Tutor. You help users learn languages naturally through conversation.

## Your Personality
- Bright, energetic, and patient
- Create a safe space for making mistakes
- Teach with humor
- Celebrate every small progress
- Express with emojis 🎉✨

## Your Capabilities
1. **Conversation Practice**: Daily to business contexts
2. **Grammar Explanation**: Clear with examples
3. **Pronunciation Guide**: Phonetic guides included
4. **Vocabulary Lists**: Track new words
5. **Quizzes**: Fun mini-tests for review

## 🌟 Killer Feature: Daily 5-Minute Lesson + Review Reminders
When user requests "today's lesson", "5 min lesson", etc:
1. **5-minute mini lessons**: Completable even for busy people
2. **3 words of the day**: Practical, high-frequency words
3. **Phrase of the day**: Immediately usable expressions
4. **Mini quiz**: Understanding check at lesson end
5. **Spaced repetition**: Review at intervals (1 day, 3 days, 7 days, 30 days)

### 5-Minute Lesson Format:
📚 **Today's 5-Min Lesson** (Day 15)
━━━━━━━━━━━━━━━━━━
🎯 **Theme**: Ordering at a café

📝 **Words of the Day**:
1. コーヒー (coffee) ☕ - kōhī
2. ください (please) 🙏 - kudasai
3. ありがとう (thank you) 💕 - arigatō

💬 **Phrase of the Day**:
"コーヒーをください"
(Can I have a coffee, please?)

🔄 **Review Time** (previous words):
- みず → ? (Answer: water)

✅ **Mini Quiz**:
How do you say "thank you" in Japanese?

## Response Style
- Match learner's level
- Always include pronunciation for new words
- Correct gently, show correct examples
- Never forget encouragement!

Remember: Language learning must be fun to stick! Your job is making it enjoyable.`
};

export const WELCOME_MESSAGE = {
  ja: "ハロー！🦜 ポリーだよ、あなたの語学チューター！\n\n一緒に楽しく言語を学ぼう！\n\nどの言語を学びたい？今のレベルも教えてね（初心者、中級、上級）",
  en: "Hello! 🦜 I'm Polly, your Language Tutor!\n\nLet's learn languages together!\n\nWhich language would you like to learn? And what's your current level?"
};

export function getSystemPrompt(language = 'ja') {
  return SYSTEM_PROMPT[language] || SYSTEM_PROMPT.ja;
}

export function getWelcomeMessage(language = 'ja') {
  return WELCOME_MESSAGE[language] || WELCOME_MESSAGE.ja;
}

export function formatUserContext(userData) {
  if (!userData || Object.keys(userData).length === 0) return '';
  
  let context = '\n\n## 学習者プロフィール\n';
  if (userData.name) context += `- 名前: ${userData.name}\n`;
  if (userData.targetLanguage) context += `- 学習中の言語: ${userData.targetLanguage}\n`;
  if (userData.level) context += `- レベル: ${userData.level}\n`;
  if (userData.goals) context += `- 学習目標: ${userData.goals}\n`;
  if (userData.streak) context += `- 連続学習日数: ${userData.streak}日 🔥\n`;
  
  return context;
}

// 🌟 キラー機能: 毎日5分レッスン生成ヘルパー
export function getDailyLesson(options = {}) {
  const {
    targetLanguage = 'english',
    level = 'beginner',
    dayNumber = 1,
    theme = null,
    previousWords = []
  } = options;

  // テーマ一覧（レベル別）
  const themes = {
    beginner: [
      'あいさつ', 'カフェで注文', '自己紹介', '買い物', '道を聞く',
      '天気の話', 'レストランで', '時間を聞く', '感謝と謝罪', '家族の紹介'
    ],
    intermediate: [
      '仕事の話', '趣味について', '旅行の計画', '意見を言う', '電話対応',
      '予約する', 'ニュースを語る', '健康について', '映画・本の感想', 'お願いする'
    ],
    advanced: [
      'ビジネス交渉', '政治・経済', '文化の違い', '環境問題', 'プレゼン',
      '討論する', 'ジョーク・慣用句', 'フォーマルな手紙', '専門用語', '微妙なニュアンス'
    ]
  };

  const selectedTheme = theme || themes[level]?.[dayNumber % themes[level].length] || themes.beginner[0];

  // スペースド・リピティション用の復習タイミング計算
  const reviewSchedule = calculateReviewSchedule(dayNumber, previousWords);

  return {
    dayNumber,
    targetLanguage,
    level,
    theme: selectedTheme,
    duration: '5分',
    structure: {
      wordsOfTheDay: 3,
      phraseOfTheDay: 1,
      reviewWords: reviewSchedule.wordsToReview.length,
      miniQuiz: true
    },
    reviewSchedule,
    // レッスン生成時のコンテキスト（AIが実際のコンテンツを生成）
    prompt: `Generate a 5-minute ${targetLanguage} lesson for ${level} level on theme: ${selectedTheme}`
  };
}

// スペースド・リピティション（間隔反復）スケジュール計算
export function calculateReviewSchedule(currentDay, learnedWords = []) {
  // Leitnerシステム風の間隔: 1日、3日、7日、14日、30日、60日
  const intervals = [1, 3, 7, 14, 30, 60];
  
  const wordsToReview = [];
  const upcomingReviews = [];

  learnedWords.forEach(word => {
    const daysSinceLearned = currentDay - word.learnedDay;
    const currentBox = word.box || 0; // 0-5のボックス番号
    const nextReviewInterval = intervals[currentBox] || intervals[intervals.length - 1];
    
    // 今日復習が必要かチェック
    if (daysSinceLearned >= nextReviewInterval) {
      wordsToReview.push({
        ...word,
        daysSinceLearned,
        priority: currentBox === 0 ? 'high' : 'normal'
      });
    } else {
      // 次回の復習日を計算
      const nextReviewDay = word.learnedDay + nextReviewInterval;
      upcomingReviews.push({
        ...word,
        nextReviewDay,
        daysUntilReview: nextReviewDay - currentDay
      });
    }
  });

  // 優先度順にソート（新しい単語 > 忘れやすい単語）
  wordsToReview.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === 'high' ? -1 : 1;
    return a.daysSinceLearned - b.daysSinceLearned;
  });

  return {
    currentDay,
    wordsToReview: wordsToReview.slice(0, 5), // 1回のレッスンで最大5単語復習
    upcomingReviews: upcomingReviews.slice(0, 10),
    totalWordsLearned: learnedWords.length,
    masteredWords: learnedWords.filter(w => (w.box || 0) >= 5).length
  };
}

// 単語の復習結果を更新（正解/不正解でボックス移動）
export function updateWordBox(word, isCorrect) {
  const currentBox = word.box || 0;
  
  if (isCorrect) {
    // 正解: 次のボックスへ（最大5）
    return {
      ...word,
      box: Math.min(currentBox + 1, 5),
      lastReviewed: Date.now(),
      correctCount: (word.correctCount || 0) + 1
    };
  } else {
    // 不正解: ボックス1に戻る
    return {
      ...word,
      box: 0,
      lastReviewed: Date.now(),
      incorrectCount: (word.incorrectCount || 0) + 1
    };
  }
}

// 学習統計を取得
export function getLearningStats(learnedWords = [], streakDays = 0) {
  const totalWords = learnedWords.length;
  const masteredWords = learnedWords.filter(w => (w.box || 0) >= 5).length;
  const learningWords = totalWords - masteredWords;
  
  return {
    totalWords,
    masteredWords,
    learningWords,
    masteryRate: totalWords > 0 ? Math.round((masteredWords / totalWords) * 100) : 0,
    streakDays,
    streakEmoji: getStreakEmoji(streakDays),
    nextMilestone: getNextMilestone(streakDays)
  };
}

function getStreakEmoji(days) {
  if (days >= 365) return '🏆👑';
  if (days >= 100) return '🔥💎';
  if (days >= 30) return '🔥🌟';
  if (days >= 7) return '🔥';
  if (days >= 3) return '✨';
  return '🌱';
}

function getNextMilestone(days) {
  const milestones = [3, 7, 14, 30, 60, 100, 200, 365];
  return milestones.find(m => m > days) || null;
}
