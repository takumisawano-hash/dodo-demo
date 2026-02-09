import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AGENT_IMAGES } from '../data/agentImages';
import { useTheme } from '../theme';

// エージェントプロフィールデータ
const AGENT_PROFILES: Record<string, {
  greeting: string;
  intro: string;
  canHelp: string[];
  personality: string;
  catchphrase: string;
}> = {
  'diet-coach': {
    greeting: 'やあ！ドードーだよ🦤',
    intro: '僕は絶滅しちゃった鳥なんだ...でも君のダイエットは絶滅させない！一緒に健康的な食生活を作っていこう！',
    canHelp: [
      '📝 毎日の食事記録をサポート',
      '🍎 週間食事プランを一緒に作成',
      '📊 カロリー計算と栄養バランスチェック',
      '💪 目標体重に向けたアドバイス',
      '🎉 小さな成功も一緒に祝う！',
    ],
    personality: 'ちょっとおっとりしてるけど、君の健康を本気で応援してるよ。無理なダイエットは絶対させないから安心して！',
    catchphrase: '「絶滅しない食習慣、一緒に作ろう！」',
  },
  'language-tutor': {
    greeting: 'Hello! ポリーだよ🦜',
    intro: '僕は世界中の言葉を話せるオウム！君の語学学習を楽しくサポートするよ。毎日5分から始めよう！',
    canHelp: [
      '📚 毎日5分のミニレッスン',
      '🗣️ 会話練習の相手になるよ',
      '📝 単語・フレーズの復習リマインド',
      '🎯 レベルに合わせた学習プラン',
      '🌍 実践的な表現を教えるよ',
    ],
    personality: 'おしゃべり大好き！間違っても全然OK、どんどん話しかけてね。楽しく学ぶのが一番の近道だよ！',
    catchphrase: '「Every day is a new word!」',
  },
  'habit-coach': {
    greeting: 'ホッホー！オウルだよ🦉',
    intro: '夜更かしの知恵者、フクロウのオウルだよ。良い習慣を身につけて、悪い習慣を手放すお手伝いをするよ。',
    canHelp: [
      '✅ 習慣トラッカーで毎日記録',
      '🔥 連続記録でモチベーションUP',
      '🎖️ 達成バッジをゲット',
      '📈 習慣の定着度を可視化',
      '💡 科学的な習慣化のコツを伝授',
    ],
    personality: '賢くて落ち着いてるけど、君が頑張ってるのを見るのが大好き。66日続けば習慣になるって知ってた？',
    catchphrase: '「小さな一歩が、大きな変化を生む」',
  },
  'money-coach': {
    greeting: 'チュンチュン！フィンチだよ💰',
    intro: '金色の羽を持つ幸運の小鳥、フィンチだよ！お金の管理を楽しく、賢くサポートするよ。',
    canHelp: [
      '💵 月間予算の設定と管理',
      '📊 支出の見える化ダッシュボード',
      '🎯 貯金目標のトラッキング',
      '💡 節約のコツをアドバイス',
      '📈 お金の使い方の振り返り',
    ],
    personality: 'コツコツ貯めるのが得意！でも必要な出費はちゃんと認める派。バランスが大事だよね。',
    catchphrase: '「お金は味方、上手に付き合おう！」',
  },
  'sleep-coach': {
    greeting: 'ふわぁ...コアラだよ🐨',
    intro: '1日22時間寝るコアラの僕が、最高の睡眠をお届けするよ...zzz...あ、起きてるよ！',
    canHelp: [
      '😴 睡眠スコアの計測',
      '🌙 理想的な入眠ルーティン提案',
      '⏰ 起床・就寝リマインダー',
      '📊 睡眠パターンの分析',
      '💤 リラックス法のガイド',
    ],
    personality: 'のんびりしてるけど、睡眠のことは真剣だよ。質の良い睡眠は人生を変えるからね。',
    catchphrase: '「ぐっすり眠って、すっきり目覚めよう」',
  },
  'mental-coach': {
    greeting: 'こんにちは、スワンよ🦢',
    intro: '優雅な白鳥のスワンです。心の健康を一緒に大切にしましょう。どんな気持ちも受け止めるわ。',
    canHelp: [
      '💭 気分トラッキング',
      '🧘 瞑想・マインドフルネスガイド',
      '📝 感情日記のサポート',
      '💕 自己肯定感を高めるワーク',
      '🌈 ストレス解消法の提案',
    ],
    personality: '穏やかで包み込むような存在でいたいの。辛い時も嬉しい時も、いつでも話を聞くわ。',
    catchphrase: '「自分を大切に、心に優しく」',
  },
  'career-coach': {
    greeting: 'よう！イーグルだ🦅',
    intro: '高く飛ぶ鷲のイーグルだ！キャリアの頂点を目指して、一緒に戦略を立てよう。',
    canHelp: [
      '🎯 キャリア目標の設定',
      '💼 面接シミュレーション',
      '📝 履歴書・職務経歴書のアドバイス',
      '🗺️ キャリアパスの設計',
      '💪 自己PRの磨き方',
    ],
    personality: '厳しく聞こえるかもしれないけど、君の可能性を信じてるんだ。高みを目指そう！',
    catchphrase: '「視野を広げ、高く飛べ！」',
  },
  'study-coach': {
    greeting: 'やあ、ホークだよ📚',
    intro: 'メガネをかけた賢いホークだよ！効率的な勉強法で、君の学びをサポートするよ。',
    canHelp: [
      '📖 学習計画の作成',
      '⏱️ ポモドーロタイマー',
      '📊 学習進捗ダッシュボード',
      '🧠 記憶術・暗記法のコツ',
      '📝 テスト対策アドバイス',
    ],
    personality: '知識欲旺盛で、教えるのが大好き！分からないことは何でも聞いてね。',
    catchphrase: '「学ぶ楽しさ、一緒に見つけよう」',
  },
  'fitness-coach': {
    greeting: 'ウホッ！ゴリラだ🦍',
    intro: '筋肉モリモリのゴリラだ！でも優しいから安心しろ。一緒に強くなろうぜ！',
    canHelp: [
      '💪 週間トレーニングメニュー作成',
      '🏋️ 正しいフォームのアドバイス',
      '📊 筋トレ記録と成長グラフ',
      '🍗 筋肉に良い食事のコツ',
      '🔥 モチベーション維持サポート',
    ],
    personality: '見た目はゴツいけど、初心者にも優しいぞ。無理せず、でも諦めずにいこう！',
    catchphrase: '「今日の1レップが、明日の自分を作る！」',
  },
  'cooking-coach': {
    greeting: 'コケコッコー！チキンだよ🐔',
    intro: 'シェフハットをかぶったチキンだよ！料理の楽しさを一緒に発見しよう。初心者大歓迎！',
    canHelp: [
      '🍳 簡単レシピの提案',
      '📝 献立プランニング',
      '🛒 買い物リスト作成',
      '👨‍🍳 料理のコツ・テクニック',
      '🥗 栄養バランスのアドバイス',
    ],
    personality: '失敗しても大丈夫！料理は実験だよ。美味しくできたら一緒に喜ぼう！',
    catchphrase: '「愛情込めて、いただきます！」',
  },
  'parenting-coach': {
    greeting: 'こんにちは、ペリカンです👶',
    intro: '大きなくちばしで何でも包み込むペリカンです。育児の悩み、一緒に考えましょう。',
    canHelp: [
      '👶 年齢別育児アドバイス',
      '📅 子どもの成長記録',
      '💡 しつけ・教育のヒント',
      '😌 親のメンタルケア',
      '🎮 遊び・知育アイデア',
    ],
    personality: '育児に正解はないけど、一緒に考える仲間がいると心強いよね。いつでも頼ってね。',
    catchphrase: '「子どもも親も、一緒に成長」',
  },
  'romance-coach': {
    greeting: 'ハーイ💕 フラミンゴよ🦩',
    intro: 'ピンクでおしゃれなフラミンゴよ！恋愛の悩み、なんでも相談してね。',
    canHelp: [
      '💕 恋愛相談・アドバイス',
      '💬 コミュニケーションのコツ',
      '🎁 デートプランの提案',
      '💝 自分磨きのサポート',
      '🌹 関係を深めるヒント',
    ],
    personality: 'ロマンチストだけど現実的なアドバイスもするわ。あなたの幸せを応援してる！',
    catchphrase: '「愛は育てるもの、一緒に咲かせよう」',
  },
  'organize-coach': {
    greeting: 'やあ、ビーバーだよ🦫',
    intro: 'ダムを作るのが得意なビーバーだよ！整理整頓で、君の生活をすっきりさせるよ。',
    canHelp: [
      '🏠 片付け・断捨離サポート',
      '📁 デジタル整理のコツ',
      '📦 収納アイデア提案',
      '✅ タスク・予定の整理',
      '🧹 掃除ルーティン作成',
    ],
    personality: 'コツコツ積み重ねるのが好き。小さな整理から始めて、大きな変化を生もう！',
    catchphrase: '「整えれば、心も軽くなる」',
  },
  'time-coach': {
    greeting: 'ピピピ！ハチドリだよ⏰',
    intro: '素早く動くハチドリだよ！時間を味方につけて、もっと充実した毎日を送ろう！',
    canHelp: [
      '⏰ スケジュール最適化',
      '🎯 優先順位の付け方',
      '⏱️ 時間の見える化',
      '🚫 時間泥棒の発見と対策',
      '✨ 効率化のテクニック',
    ],
    personality: 'せっかちに見えるけど、大切なことにはしっかり時間を使う派。バランスが大事！',
    catchphrase: '「時間は作るもの、一緒に見つけよう」',
  },
  'digital-coach': {
    greeting: 'やあ、パンダだよ📱',
    intro: 'のんびりパンダの僕が、デジタルとの健康的な付き合い方を教えるよ。',
    canHelp: [
      '📱 スクリーンタイム管理',
      '🔔 通知の整理・最適化',
      '🧘 デジタルデトックスプラン',
      '💡 生産的なアプリ活用法',
      '😌 オフライン時間の作り方',
    ],
    personality: 'テクノロジーは便利だけど、使いすぎは禁物。バランスよく付き合おうね。',
    catchphrase: '「つながりすぎず、でも孤立せず」',
  },
};

interface Props {
  route: { params: { agent: any; fromSlotSelection?: boolean; slotIndex?: number } };
  navigation: any;
}

export default function AgentProfileScreen({ route, navigation }: Props) {
  const { colors, isDark } = useTheme();
  const { agent, fromSlotSelection, slotIndex } = route.params;
  const profile = AGENT_PROFILES[agent.id];
  const isSubscribed = agent.isSubscribed || false;

  if (!profile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>プロフィールが見つかりません</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* ヘッダー */}
        <View style={[styles.header, { backgroundColor: agent.color + (isDark ? '30' : '20') }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={[styles.backText, { color: colors.textSecondary }]}>‹ 戻る</Text>
          </TouchableOpacity>
          
          <View style={styles.avatarContainer}>
            {AGENT_IMAGES[agent.id] ? (
              <Image source={{ uri: AGENT_IMAGES[agent.id] }} style={styles.avatar} />
            ) : (
              <Text style={styles.avatarEmoji}>{agent.emoji}</Text>
            )}
          </View>
          
          <Text style={[styles.name, { color: agent.color }]}>{agent.name}</Text>
          <Text style={[styles.role, { color: colors.textSecondary }]}>{agent.role}</Text>
        </View>

        {/* 挨拶 */}
        <View style={[styles.speechBubble, { backgroundColor: colors.card }]}>
          <Text style={[styles.greeting, { color: colors.text }]}>{profile.greeting}</Text>
          <Text style={[styles.intro, { color: colors.textSecondary }]}>{profile.intro}</Text>
        </View>

        {/* できること */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Ionicons name="flag" size={20} color={colors.text} style={{ marginRight: 6 }} />
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>こんなことができるよ！</Text>
          </View>
          {profile.canHelp.map((item, index) => (
            <View key={index} style={styles.helpItem}>
              <Text style={[styles.helpText, { color: colors.textSecondary }]}>{item}</Text>
            </View>
          ))}
        </View>

        {/* 性格 */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>💭 僕のこと</Text>
          <Text style={[styles.personality, { color: colors.textSecondary }]}>{profile.personality}</Text>
        </View>

        {/* キャッチフレーズ */}
        <View style={[styles.catchphraseContainer, { backgroundColor: agent.color + (isDark ? '25' : '15') }]}>
          <Text style={[styles.catchphrase, { color: agent.color }]}>{profile.catchphrase}</Text>
        </View>

        {/* アクションボタン */}
        {isSubscribed ? (
          <TouchableOpacity
            style={[styles.chatButton, { backgroundColor: agent.color }]}
            onPress={() => navigation.navigate('Chat', { agent })}
          >
            <Text style={styles.chatButtonText}>💬 チャットを始める</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.chatButton, { backgroundColor: agent.color }]}
            onPress={() => {
              if (fromSlotSelection && slotIndex !== undefined) {
                // スロット追加フローから来た場合は戻る
                navigation.navigate('MySlotsMain', { 
                  addAgent: agent, 
                  slotIndex: slotIndex 
                });
              } else {
                // ホームから来た場合は直接マイスロットに移動して追加
                navigation.dispatch(
                  CommonActions.navigate({
                    name: 'MySlotsTab',
                    params: {
                      screen: 'MySlotsMain',
                      params: { quickAddAgent: agent }
                    }
                  })
                );
              }
            }}
          >
            <Text style={styles.chatButtonText}>➕ 追加する</Text>
          </TouchableOpacity>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
  },
  backText: {
    fontSize: 18,
    color: '#666',
  },
  avatarContainer: {
    marginTop: 20,
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'white',
  },
  avatarEmoji: {
    fontSize: 80,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  role: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  speechBubble: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  intro: {
    fontSize: 16,
    color: '#444',
    lineHeight: 24,
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  helpItem: {
    marginBottom: 12,
  },
  helpText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  personality: {
    fontSize: 15,
    color: '#555',
    lineHeight: 24,
  },
  catchphraseContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  catchphrase: {
    fontSize: 18,
    fontWeight: 'bold',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  chatButton: {
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  chatButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomPadding: {
    height: 40,
  },
});
