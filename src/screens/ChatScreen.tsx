import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Clipboard,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { t, useI18n, formatDate } from '../i18n';
import SyncNotification from '../components/SyncNotification';
import { AGENT_IMAGES } from '../data/agentImages';
import { sendChatMessage, sendChatMessageWithImage, ChatMessage as AIChatMessage } from '../services/ai';
import { useTheme } from '../theme';
import { getCoachById } from '../data/agentMapping';
import { saveRequest } from '../services/requests';
import COACH_PROMPTS from '../data/coachPrompts';

// ----------------------------------------
// Types
// ----------------------------------------
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isRead?: boolean;
  syncNotification?: SyncDestination[];
  isStreaming?: boolean;
  recommendedCoachId?: string | null;
  requestTopic?: string | null;
}

interface SyncDestination {
  agentId: string;
  agentEmoji: string;
  field: string;
}

interface Agent {
  id: string;
  name: string;
  emoji: string;
  color: string;
  role?: string;
  description?: string;
  killerFeature?: string;
}

interface Props {
  route: { params: { agent: Agent; isFirstChat?: boolean } };
  navigation: any;
}

// リマインダー促し用キー
const REMINDER_PROMPT_KEY = '@dodo_reminder_prompt_shown';

// ----------------------------------------
// 入力検知パターン（自動同期用）
// ----------------------------------------
const INPUT_PATTERNS: Record<string, RegExp> = {
  workout: /トレーニング|筋トレ|運動|ジム|ワークアウト|走った|泳いだ|歩いた|スクワット|腕立て/,
  meal: /食べた|食事|朝食|昼食|夕食|カロリー|ご飯|ランチ|ディナー/,
  sleep: /寝た|起きた|睡眠|時間寝た|眠れ|就寝|起床/,
  expense: /使った|買った|支払った|円|¥|お金|出費|購入/,
};

// ----------------------------------------
// 同期先マッピング
// ----------------------------------------
const SYNC_DESTINATIONS: Record<string, SyncDestination[]> = {
  workout: [
    { agentId: 'diet-coach', agentEmoji: '🦤', field: 'カロリー消費' },
    { agentId: 'sleep-coach', agentEmoji: '🐨', field: '運動記録' },
    { agentId: 'mental-coach', agentEmoji: '🦢', field: '気分ブースト' },
  ],
  meal: [
    { agentId: 'cooking-coach', agentEmoji: '🍳', field: '食事記録' },
    { agentId: 'money-coach', agentEmoji: '💰', field: '食費' },
  ],
  sleep: [
    { agentId: 'mental-coach', agentEmoji: '🦢', field: '休息状態' },
    { agentId: 'fitness-coach', agentEmoji: '🦍', field: 'リカバリー' },
  ],
  expense: [
    { agentId: 'habit-coach', agentEmoji: '🦉', field: '支出習慣' },
  ],
};

// ----------------------------------------
// 入力タイプ検知関数
// ----------------------------------------
function detectInputType(message: string): string | null {
  for (const [type, pattern] of Object.entries(INPUT_PATTERNS)) {
    if (pattern.test(message)) return type;
  }
  return null;
}

// ----------------------------------------
// AI応答解析（専門外推薦/リクエストタグ抽出）
// ----------------------------------------
interface ParsedAIResponse {
  text: string;
  recommendedCoachId: string | null;
  requestTopic: string | null;
}

function parseAIResponse(response: string): ParsedAIResponse {
  const recommendMatch = response.match(/\[RECOMMEND:([^\]]+)\]/);
  const requestMatch = response.match(/\[REQUEST:([^\]]+)\]/);
  const cleanResponse = response
    .replace(/\[RECOMMEND:[^\]]+\]/g, '')
    .replace(/\[REQUEST:[^\]]+\]/g, '');
  return {
    text: cleanResponse.trim(),
    recommendedCoachId: recommendMatch?.[1] || null,
    requestTopic: requestMatch?.[1] || null,
  };
}

// ----------------------------------------
// エージェント別クイックアクション定義
// ----------------------------------------
interface QuickAction {
  id: string;
  labelKey: string;
  messageKey: string;
}

const AGENT_QUICK_ACTIONS: Record<string, QuickAction[]> = {
  'diet-coach': [
    { id: 'log-meal', labelKey: 'quickActions.diet-coach.logMeal', messageKey: '今日の食事を記録したい' },
    { id: 'log-weight', labelKey: 'quickActions.diet-coach.logWeight', messageKey: '体重を記録したい' },
    { id: 'weekly-plan', labelKey: 'quickActions.diet-coach.weeklyPlan', messageKey: '今週の食事プランを作って' },
    { id: 'set-reminder', labelKey: 'quickActions.diet-coach.setReminder', messageKey: '毎日のリマインダーを設定したい' },
  ],
  'language-tutor': [
    { id: 'daily-lesson', labelKey: 'quickActions.language-tutor.dailyLesson', messageKey: '今日のレッスンを始めよう' },
    { id: 'vocab-test', labelKey: 'quickActions.language-tutor.vocabTest', messageKey: '単語テストをしたい' },
    { id: 'conversation', labelKey: 'quickActions.language-tutor.conversation', messageKey: '会話の練習をしたい' },
    { id: 'set-reminder', labelKey: 'quickActions.language-tutor.setReminder', messageKey: '学習リマインダーを設定したい' },
  ],
  'default': [
    { id: 'get-started', labelKey: 'quickActions.default.getStarted', messageKey: '何ができるか教えて' },
    { id: 'set-goal', labelKey: 'quickActions.default.setGoal', messageKey: '目標を設定したい' },
    { id: 'check-progress', labelKey: 'quickActions.default.checkProgress', messageKey: '進捗を確認したい' },
    { id: 'set-reminder', labelKey: 'quickActions.default.setReminder', messageKey: 'リマインダーを設定したい' },
  ],
};

const getQuickActions = (agentId: string): QuickAction[] => {
  return AGENT_QUICK_ACTIONS[agentId] || AGENT_QUICK_ACTIONS['default'];
};

// ----------------------------------------
// 推薦カードコンポーネント
// ----------------------------------------
const RecommendCard = ({ 
  coachId, 
  onPress,
  colors,
}: { 
  coachId: string; 
  onPress: (agent: any) => void;
  colors: any;
}) => {
  const coach = COACH_PROMPTS[coachId];
  if (!coach) return null;

  const recommendedAgent = {
    id: coach.id,
    name: coach.name,
    emoji: coach.emoji,
    color: '#6366F1', // デフォルトカラー
  };

  return (
    <View style={[styles.recommendCard, { backgroundColor: colors.card, borderColor: '#6366F1' }]}>
      <Text style={styles.recommendCardEmoji}>💡</Text>
      <View style={styles.recommendCardContent}>
        <Text style={[styles.recommendCardTitle, { color: colors.text }]}>
          {coach.emoji} {coach.name}がお手伝いできるかも！
        </Text>
        <TouchableOpacity 
          style={styles.recommendCardButton}
          onPress={() => onPress(recommendedAgent)}
        >
          <Text style={styles.recommendCardButtonText}>詳しく見る →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ----------------------------------------
// リクエストカードコンポーネント
// ----------------------------------------
const RequestCard = ({ 
  topic,
  fromCoachId,
  colors,
}: { 
  topic: string;
  fromCoachId: string;
  colors: any;
}) => {
  const [requested, setRequested] = React.useState(false);

  const handleRequest = async () => {
    const success = await saveRequest(topic, fromCoachId);
    if (success) {
      setRequested(true);
      Alert.alert(
        'リクエスト送信完了！',
        `「${topic}」のコーチリクエストを受け付けました。今後のアップデートでお届けします！✨`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'すでにリクエスト済み',
        `「${topic}」のリクエストは既に送信されています。`,
        [{ text: 'OK' }]
      );
      setRequested(true);
    }
  };

  if (requested) {
    return (
      <View style={[styles.requestCard, styles.requestCardDone, { backgroundColor: colors.card }]}>
        <Text style={styles.requestCardEmoji}>✅</Text>
        <Text style={[styles.requestCardDoneText, { color: colors.textSecondary }]}>
          リクエストを送信しました！
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.requestCard, { backgroundColor: colors.card, borderColor: '#F59E0B' }]}>
      <Text style={styles.requestCardEmoji}>💭</Text>
      <View style={styles.requestCardContent}>
        <Text style={[styles.requestCardTitle, { color: colors.text }]}>
          「{topic}」のコーチがほしいですか？
        </Text>
        <TouchableOpacity 
          style={styles.requestCardButton}
          onPress={handleRequest}
        >
          <Text style={styles.requestCardButtonText}>リクエストを送る</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ----------------------------------------
// タイピングインジケーターコンポーネント
// ----------------------------------------
const TypingIndicator = ({ color, emoji }: { color: string; emoji: string }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = animateDot(dot1, 0);
    const anim2 = animateDot(dot2, 150);
    const anim3 = animateDot(dot3, 300);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1, dot2, dot3]);

  const getDotStyle = (anim: Animated.Value) => ({
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -6],
        }),
      },
    ],
  });

  return (
    <View style={styles.typingMessageWrapper}>
      <View style={styles.typingAvatar}>
        <Text style={styles.typingAvatarEmoji}>{emoji}</Text>
      </View>
      <View style={[styles.typingContainer, { backgroundColor: color + '20' }]}>
        <Animated.View style={[styles.typingDot, { backgroundColor: color }, getDotStyle(dot1)]} />
        <Animated.View style={[styles.typingDot, { backgroundColor: color }, getDotStyle(dot2)]} />
        <Animated.View style={[styles.typingDot, { backgroundColor: color }, getDotStyle(dot3)]} />
      </View>
    </View>
  );
};

// ----------------------------------------
// クイックアクションコンポーネント
// ----------------------------------------
const QuickActions = ({
  agentId,
  color,
  onSelect,
  isFirstTime,
  colors,
  isDark,
}: {
  agentId: string;
  color: string;
  onSelect: (message: string) => void;
  isFirstTime: boolean;
  colors: any;
  isDark: boolean;
}) => {
  const actions = getQuickActions(agentId);

  if (isFirstTime) {
    return (
      <View style={[styles.quickActionsFirstTimeWrapper, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.quickActionsFirstTimeHeader}>
          <Text style={[styles.quickActionsFirstTimeTitle, { color: colors.text }]}>
            {t('chat.quickActions.firstTimeTitle')}
          </Text>
          <Text style={[styles.quickActionsFirstTimeSubtitle, { color: colors.textSecondary }]}>
            {t('chat.quickActions.firstTimeSubtitle')}
          </Text>
        </View>
        <View style={styles.quickActionsFirstTimeGrid}>
          {actions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[
                styles.quickActionButtonLarge,
                { borderColor: color, backgroundColor: color + '08' },
              ]}
              onPress={() => onSelect(action.messageKey)}
              activeOpacity={0.7}
            >
              <Text style={[styles.quickActionTextLarge, { color }]}>
                {t(action.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.quickActionsWrapper, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickActionsContainer}
      >
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[styles.quickActionButton, { borderColor: color, backgroundColor: colors.card }]}
            onPress={() => onSelect(action.messageKey)}
            activeOpacity={0.7}
          >
            <Text style={[styles.quickActionText, { color }]}>{t(action.labelKey)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

// ----------------------------------------
// 時刻フォーマット
// ----------------------------------------
const formatTime = (date: Date) => {
  return date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ----------------------------------------
// ウェルカムメッセージ生成（強化版）
// ----------------------------------------
const generateWelcomeMessage = (agent: Agent, isFirstChat: boolean = false): Message => {
  const hour = new Date().getHours();
  let greetingKey = 'greetings.afternoon';
  if (hour < 6) greetingKey = 'greetings.evening';
  else if (hour < 12) greetingKey = 'greetings.morning';
  else if (hour >= 18) greetingKey = 'greetings.evening';

  const agentName = t(`agents.${agent.id}.name`);
  const agentDescription = t(`agents.${agent.id}.description`);
  const killerFeature = t(`agents.${agent.id}.killerFeature`);

  let content = '';

  if (isFirstChat) {
    // 初回チャット用：より親しみやすいメッセージ
    content = `${t(greetingKey)}！${agent.emoji}\n\n`;
    content += `はじめまして！私は${agentName}です。\n`;
    content += `あなたの${agent.role || ''}を一緒にサポートしていくよ！\n\n`;
    content += `✨ 私の得意なこと: ${killerFeature}\n\n`;
    content += `何でも気軽に聞いてね！\n`;
    content += `下のボタンから始めるか、自由にメッセージを送ってみて 👇`;
  } else {
    // 通常のウェルカムメッセージ
    content = t('chat.welcomeGreeting', { greeting: t(greetingKey), emoji: agent.emoji }) + '\n\n';
    content += t('chat.welcomeIntro', { name: agentName, description: agentDescription }) + '\n\n';
    content += t('chat.welcomeFeature', { feature: killerFeature }) + '\n\n';
    content += t('chat.welcomeFooter');
  }

  return {
    id: 'welcome',
    role: 'assistant',
    content,
    timestamp: new Date(),
    isRead: true,
  };
};

// ----------------------------------------
// メインコンポーネント
// ----------------------------------------
export default function ChatScreen({ route, navigation }: Props) {
  const { colors, isDark } = useTheme();
  const { agent, isFirstChat = false } = route.params;
  const { language } = useI18n();

  const [messages, setMessages] = useState<Message[]>(() => [
    generateWelcomeMessage(agent, isFirstChat),
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [isOnline] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [userMessageCount, setUserMessageCount] = useState(0);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // ========================================
  // 会話履歴の読み込み（初回のみ）
  // ========================================
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const { getChatHistory } = await import('../services/chatHistory');
        const history = await getChatHistory(agent.id);
        if (history.length > 0) {
          // 履歴があれば復元
          const restoredMessages: Message[] = history.map(h => ({
            id: h.id,
            text: h.content,
            isUser: h.role === 'user',
            timestamp: new Date(h.timestamp),
            imageUri: h.imageUri,
          }));
          setMessages(restoredMessages);
        }
        setHistoryLoaded(true);
      } catch (error) {
        console.warn('Failed to load chat history:', error);
        setHistoryLoaded(true);
      }
    };
    loadChatHistory();
  }, [agent.id]);

  // ========================================
  // 会話履歴の保存（メッセージ変更時）
  // ========================================
  useEffect(() => {
    if (!historyLoaded) return; // 履歴読み込み前は保存しない
    
    const saveChatHistoryAsync = async () => {
      try {
        const { saveChatHistory, StoredMessage } = await import('../services/chatHistory');
        const storedMessages = messages.map(m => ({
          id: m.id,
          role: m.isUser ? 'user' as const : 'assistant' as const,
          content: m.text,
          timestamp: m.timestamp.toISOString(),
          imageUri: m.imageUri,
        }));
        await saveChatHistory(agent.id, storedMessages);
      } catch (error) {
        console.warn('Failed to save chat history:', error);
      }
    };
    saveChatHistoryAsync();
  }, [messages, agent.id, historyLoaded]);

  // リマインダー設定の促しチェック（改善4）
  useEffect(() => {
    const checkReminderPrompt = async () => {
      // ユーザーが3メッセージ送った後にリマインダー促しを表示
      if (userMessageCount === 3) {
        try {
          const shown = await AsyncStorage.getItem(REMINDER_PROMPT_KEY);
          if (shown !== 'true') {
            setShowReminderModal(true);
          }
        } catch (error) {
          // AsyncStorage使用不可時はスキップ
        }
      }
    };
    checkReminderPrompt();
  }, [userMessageCount]);

  const handleReminderResponse = async (setReminder: boolean) => {
    try {
      await AsyncStorage.setItem(REMINDER_PROMPT_KEY, 'true');
    } catch (error) {
      // AsyncStorage使用不可時はスキップ
    }
    setShowReminderModal(false);
    if (setReminder) {
      navigation.navigate('Settings', { openReminders: true });
    }
  };

  const isFirstConversation = useMemo(
    () => messages.length === 1 && messages[0].id === 'welcome',
    [messages]
  );

  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    setShowScrollButton(distanceFromBottom > 100);
  }, []);

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  // 画像ピッカー
  const pickImage = async (useCamera: boolean = false) => {
    setIsPickingImage(true);
    try {
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('カメラへのアクセスが必要です');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
          base64: true,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('写真ライブラリへのアクセスが必要です');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
          base64: true,
        });
      }

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('画像の選択に失敗しました');
    } finally {
      setIsPickingImage(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      '画像を追加',
      'どこから画像を選びますか？',
      [
        { text: 'カメラ', onPress: () => pickImage(true) },
        { text: 'ライブラリ', onPress: () => pickImage(false) },
        { text: 'キャンセル', style: 'cancel' },
      ]
    );
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
  };

  // 会話履歴をAI用フォーマットに変換
  const getConversationHistory = useCallback((): AIChatMessage[] => {
    return messages
      .filter((m) => m.id !== 'welcome') // ウェルカムメッセージを除外
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
  }, [messages]);

  const sendMessage = useCallback(
    async (text?: string) => {
      const messageText = (text || inputText).trim();
      const hasImage = !!selectedImage;
      if ((!messageText && !hasImage) || isLoading) return;

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: messageText,
        timestamp: new Date(),
        isRead: false,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputText('');
      setUserMessageCount((prev) => prev + 1); // ユーザーメッセージカウント増加
      const imageToSend = selectedImage;
      setSelectedImage(null);
      setIsLoading(true);

      // 既読マークを更新
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) => (m.id === userMessage.id ? { ...m, isRead: true } : m))
        );
      }, 500);

      // アシスタントメッセージのプレースホルダーを追加
      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isRead: true,
        isStreaming: true,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      try {
        // AI APIを呼び出し
        const conversationHistory = getConversationHistory();
        
        // 画像がある場合はVision APIを使用
        if (imageToSend) {
          // 画像をbase64に変換
          const response = await fetch(imageToSend);
          const blob = await response.blob();
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });

          const result = await sendChatMessageWithImage(
            agent.id,
            messageText || 'この画像について教えてください。',
            base64,
            conversationHistory,
            {
              callbacks: {
                onComplete: (fullText: string) => {
                  const inputType = detectInputType(messageText);
                  const syncNotification = inputType ? SYNC_DESTINATIONS[inputType] : undefined;
                  const parsed = parseAIResponse(fullText);
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessageId
                        ? { 
                            ...m, 
                            content: parsed.text, 
                            isStreaming: false, 
                            syncNotification,
                            recommendedCoachId: parsed.recommendedCoachId,
                            requestTopic: parsed.requestTopic,
                          }
                        : m
                    )
                  );
                  setIsLoading(false);
                },
                onError: (error: Error) => {
                  console.error('AI Vision Error:', error);
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessageId
                        ? { ...m, content: `${agent.emoji} 画像の解析に失敗しました。もう一度試してください。`, isStreaming: false }
                        : m
                    )
                  );
                  setIsLoading(false);
                },
              },
            }
          );
          return;
        }

        // テキストのみの場合はストリーミング
        await sendChatMessage(
          agent.id,
          messageText,
          conversationHistory,
          {
            stream: true,
            callbacks: {
              onStart: () => {
                // ストリーミング開始
              },
              onToken: (token: string) => {
                // トークンを受信するたびにメッセージを更新
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, content: m.content + token }
                      : m
                  )
                );
              },
              onComplete: (fullText: string) => {
                // 入力タイプを検知して同期通知を追加
                const inputType = detectInputType(messageText);
                const syncNotification = inputType ? SYNC_DESTINATIONS[inputType] : undefined;

                // 専門外推薦/リクエストタグを解析
                const parsed = parseAIResponse(fullText);

                // ストリーミング完了
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { 
                          ...m, 
                          content: parsed.text, 
                          isStreaming: false, 
                          syncNotification,
                          recommendedCoachId: parsed.recommendedCoachId,
                          requestTopic: parsed.requestTopic,
                        }
                      : m
                  )
                );
                setIsLoading(false);
              },
              onError: (error: Error) => {
                console.error('AI Error:', error);
                // エラー時はフォールバックメッセージを表示
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? {
                          ...m,
                          content: `${agent.emoji} ごめんなさい、少し調子が悪いみたい...もう一度試してくれますか？`,
                          isStreaming: false,
                        }
                      : m
                  )
                );
                setIsLoading(false);
              },
            },
          }
        );
      } catch (error) {
        console.error('Send message error:', error);
        // エラー時はフォールバックメッセージを表示
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  content: `${agent.emoji} 接続に問題がありました。もう一度お試しください。`,
                  isStreaming: false,
                }
              : m
          )
        );
        setIsLoading(false);
      }
    },
    [inputText, isLoading, agent, getConversationHistory, selectedImage]
  );

  const handleLongPress = (message: Message) => {
    setSelectedMessageId(message.id);
    Alert.alert(
      t('chat.messageOptions'),
      undefined,
      [
        {
          text: t('chat.copyMessage'),
          onPress: () => {
            Clipboard.setString(message.content);
            setSelectedMessageId(null);
          },
        },
        {
          text: t('chat.deleteMessage'),
          style: 'destructive',
          onPress: () => {
            setMessages((prev) => prev.filter((m) => m.id !== message.id));
            setSelectedMessageId(null);
          },
        },
        {
          text: t('common.cancel'),
          style: 'cancel',
          onPress: () => setSelectedMessageId(null),
        },
      ],
      { cancelable: true, onDismiss: () => setSelectedMessageId(null) }
    );
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isUser = item.role === 'user';
    const isSelected = item.id === selectedMessageId;

    const prevMessage = messages[index - 1];
    const showTimestamp =
      !prevMessage ||
      prevMessage.role !== item.role ||
      item.timestamp.getTime() - prevMessage.timestamp.getTime() > 5 * 60 * 1000;

    return (
      <View style={styles.messageContainer}>
        {showTimestamp && (
          <Text style={styles.timestampHeader}>{formatTime(item.timestamp)}</Text>
        )}

        <TouchableOpacity
          activeOpacity={0.7}
          onLongPress={() => handleLongPress(item)}
          delayLongPress={500}
          style={[
            styles.messageRow,
            isUser ? styles.userRow : styles.assistantRow,
          ]}
        >
          {!isUser && (
            <View style={[styles.avatarBubble, { backgroundColor: agent.color + '30' }]}>
              {AGENT_IMAGES[agent.id] ? (
                <Image source={{ uri: AGENT_IMAGES[agent.id] }} style={styles.avatarBubbleImage} />
              ) : (
                <Text style={styles.avatarBubbleEmoji}>{agent.emoji}</Text>
              )}
            </View>
          )}

          <View
            style={[
              styles.messageBubble,
              isUser ? [styles.userBubble, { backgroundColor: agent.color }] : [styles.assistantBubble, { backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0' }],
              isSelected && styles.selectedBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                isUser ? styles.userText : [styles.assistantText, { color: colors.text }],
              ]}
            >
              {item.content}
              {item.isStreaming && <Text style={styles.streamingCursor}>▌</Text>}
            </Text>
          </View>
        </TouchableOpacity>

        {isUser && (
          <View style={styles.messageMetaUser}>
            <Text style={styles.metaText}>
              {item.isRead ? t('chat.read') : t('chat.sent')} {formatTime(item.timestamp)}
            </Text>
          </View>
        )}

        {/* 同期通知カード */}
        {!isUser && item.syncNotification && item.syncNotification.length > 0 && (
          <SyncNotification syncedTo={item.syncNotification} />
        )}

        {/* 専門外推薦カード */}
        {!isUser && item.recommendedCoachId && (
          <RecommendCard 
            coachId={item.recommendedCoachId} 
            onPress={(recommendedAgent) => navigation.navigate('AgentProfile', { agent: recommendedAgent })}
            colors={colors}
          />
        )}

        {/* リクエストカード */}
        {!isUser && item.requestTopic && (
          <RequestCard 
            topic={item.requestTopic}
            fromCoachId={agent.id}
            colors={colors}
          />
        )}
      </View>
    );
  };

  const canSend = (inputText.trim().length > 0 || selectedImage) && !isLoading;
  const agentName = t(`agents.${agent.id}.name`);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* ヘッダー */}
      <View style={[styles.header, { backgroundColor: agent.color }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerCenter} activeOpacity={0.8}>
          <View style={styles.headerAvatarContainer}>
            {AGENT_IMAGES[agent.id] ? (
              <Image source={{ uri: AGENT_IMAGES[agent.id] }} style={styles.headerAvatarImage} />
            ) : (
              <Text style={styles.headerAvatarEmoji}>{agent.emoji}</Text>
            )}
            <View
              style={[
                styles.onlineIndicator,
                { backgroundColor: isOnline ? '#4CAF50' : '#9E9E9E' },
              ]}
            />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{agentName}</Text>
            <Text style={styles.headerSubtitle}>
              {isOnline 
                ? (isLoading ? t('common.typing') : t('common.online')) 
                : t('common.offline')}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => Alert.alert(
            'メニュー',
            undefined,
            [
              { text: '会話をクリア', onPress: () => setMessages([generateWelcomeMessage(agent)]) },
              { text: 'コーチ情報', onPress: () => navigation.navigate('AgentDetail', { agent }) },
              { text: '設定', onPress: () => navigation.navigate('Settings') },
              { text: 'キャンセル', style: 'cancel' },
            ]
          )}
        >
          <Text style={styles.menuButtonText}>⋮</Text>
        </TouchableOpacity>
      </View>

      {/* クイックアクション */}
      <QuickActions
        agentId={agent.id}
        color={agent.color}
        onSelect={(message) => sendMessage(message)}
        isFirstTime={isFirstConversation}
        colors={colors}
        isDark={isDark}
      />

      {/* メッセージリスト */}
      <View style={[styles.chatContainer, { backgroundColor: colors.background }]}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onContentSizeChange={() => {
            if (!showScrollButton) {
              flatListRef.current?.scrollToEnd({ animated: true });
            }
          }}
          showsVerticalScrollIndicator={false}
        />

        {isLoading && !messages.some(m => m.isStreaming && m.content.length > 0) && (
          <View style={styles.typingWrapper}>
            <TypingIndicator color={agent.color} emoji={agent.emoji} />
          </View>
        )}

        {showScrollButton && (
          <TouchableOpacity
            style={[styles.scrollButton, { backgroundColor: agent.color }]}
            onPress={scrollToBottom}
          >
            <Text style={styles.scrollButtonText}>↓</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 入力エリア */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* 選択された画像のプレビュー */}
        {selectedImage && (
          <View style={[styles.imagePreviewContainer, { backgroundColor: isDark ? '#1A1A1A' : '#FAFAFA', borderTopColor: isDark ? '#333' : '#EEEEEE' }]}>
            <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
            <TouchableOpacity style={styles.removeImageButton} onPress={clearSelectedImage}>
              <Text style={styles.removeImageText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1A1A1A' : '#FAFAFA', borderTopColor: isDark ? '#333' : '#EEEEEE' }]}>
          <TouchableOpacity
            style={[styles.attachButton, { backgroundColor: selectedImage ? agent.color + '30' : (isDark ? '#333' : '#E8E8E8') }]}
            onPress={showImageOptions}
            disabled={isPickingImage}
          >
            {isPickingImage ? (
              <ActivityIndicator size="small" color={agent.color} />
            ) : (
              <Text style={[styles.attachButtonText, selectedImage && { color: agent.color }]}>📷</Text>
            )}
          </TouchableOpacity>

          <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: isDark ? '#444' : '#E0E0E0' }]}>
            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder={selectedImage ? '画像について質問...' : t('chat.inputPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={2000}
              textAlignVertical="center"
            />
          </View>

          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: canSend ? agent.color : '#E0E0E0' },
            ]}
            onPress={() => sendMessage()}
            disabled={!canSend}
            activeOpacity={0.7}
          >
            <Text style={[styles.sendButtonIcon, { opacity: canSend ? 1 : 0.5 }]}>
              ↑
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* リマインダー設定促しモーダル（改善4） */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showReminderModal}
        onRequestClose={() => handleReminderResponse(false)}
      >
        <View style={styles.reminderModalOverlay}>
          <View style={[styles.reminderModalContent, { backgroundColor: colors.card }]}>
            <Text style={styles.reminderModalEmoji}>⏰</Text>
            <Text style={[styles.reminderModalTitle, { color: colors.text }]}>
              リマインダーを設定しよう！
            </Text>
            <Text style={[styles.reminderModalDesc, { color: colors.textSecondary }]}>
              毎日決まった時間に{agent.emoji}{t(`agents.${agent.id}.name`)}から
              リマインダーが届くよ！習慣化に効果的✨
            </Text>
            <View style={styles.reminderModalButtons}>
              <TouchableOpacity
                style={[styles.reminderModalButton, styles.reminderModalButtonSecondary]}
                onPress={() => handleReminderResponse(false)}
              >
                <Text style={[styles.reminderModalButtonText, { color: colors.textSecondary }]}>
                  あとで
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reminderModalButton, { backgroundColor: agent.color }]}
                onPress={() => handleReminderResponse(true)}
              >
                <Text style={[styles.reminderModalButtonText, { color: 'white' }]}>
                  設定する
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ----------------------------------------
// Styles
// ----------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
    width: 44,
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 32,
    fontWeight: '300',
    marginTop: -4,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 44,
  },
  headerAvatarContainer: {
    position: 'relative',
    marginRight: 10,
  },
  headerAvatarEmoji: {
    fontSize: 32,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 20,
    width: 40,
    height: 40,
    textAlign: 'center',
    lineHeight: 40,
    overflow: 'hidden',
  },
  headerAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  headerInfo: {
    alignItems: 'flex-start',
  },
  headerTitle: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 1,
  },
  menuButton: {
    padding: 8,
    width: 44,
    alignItems: 'center',
  },
  menuButtonText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },

  quickActionsWrapper: {
    // backgroundColor set dynamically
    borderBottomWidth: 1,
    // borderBottomColor set dynamically
  },
  quickActionsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  quickActionButton: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    // backgroundColor set dynamically
    marginRight: 8,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '500',
  },

  quickActionsFirstTimeWrapper: {
    // backgroundColor set dynamically
    borderBottomWidth: 1,
    // borderBottomColor set dynamically
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  quickActionsFirstTimeHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionsFirstTimeTitle: {
    fontSize: 16,
    fontWeight: '600',
    // color set dynamically
    marginBottom: 4,
  },
  quickActionsFirstTimeSubtitle: {
    fontSize: 12,
    // color set dynamically
  },
  quickActionsFirstTimeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  quickActionButtonLarge: {
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    minWidth: '45%',
    alignItems: 'center',
  },
  quickActionTextLarge: {
    fontSize: 15,
    fontWeight: '600',
  },

  chatContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  messageList: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    paddingBottom: 20,
  },

  messageContainer: {
    marginBottom: 8,
  },
  timestampHeader: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginVertical: 12,
    fontWeight: '500',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },

  avatarBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarBubbleEmoji: {
    fontSize: 20,
  },
  avatarBubbleImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },

  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    borderBottomLeftRadius: 6,
  },
  selectedBubble: {
    opacity: 0.7,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: 'white',
  },
  assistantText: {
    color: '#1A1A1A',
  },
  streamingCursor: {
    color: '#007AFF',
    opacity: 0.7,
  },

  messageMetaUser: {
    alignItems: 'flex-end',
    marginTop: 4,
    marginRight: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#999',
  },

  typingWrapper: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  typingMessageWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  typingAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  typingAvatarEmoji: {
    fontSize: 20,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 2,
  },

  scrollButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  scrollButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  imagePreviewContainer: {
    padding: 12,
    paddingBottom: 0,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    position: 'relative',
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    left: 76,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  attachButtonText: {
    fontSize: 22,
    color: '#666',
    fontWeight: '300',
    marginTop: -2,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 8,
    minHeight: 36,
    maxHeight: 120,
    justifyContent: 'center',
  },
  textInput: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 16,
    color: '#1A1A1A',
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonIcon: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // 推薦カードスタイル
  recommendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 44,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  recommendCardEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  recommendCardContent: {
    flex: 1,
  },
  recommendCardTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  recommendCardButton: {
    alignSelf: 'flex-start',
  },
  recommendCardButtonText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },

  // リクエストカードスタイル
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 44,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  requestCardDone: {
    borderLeftColor: '#10B981',
  },
  requestCardEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  requestCardContent: {
    flex: 1,
  },
  requestCardTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  requestCardButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  requestCardButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  requestCardDoneText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // リマインダーモーダルスタイル（改善4）
  reminderModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  reminderModalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  reminderModalEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  reminderModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  reminderModalDesc: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  reminderModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  reminderModalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  reminderModalButtonSecondary: {
    backgroundColor: '#F0F0F0',
  },
  reminderModalButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
