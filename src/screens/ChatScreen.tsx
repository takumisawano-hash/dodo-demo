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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { t, useI18n, formatDate } from '../i18n';
import SyncNotification from '../components/SyncNotification';
import { AGENT_IMAGES } from '../data/agentImages';
import { sendChatMessage, ChatMessage as AIChatMessage } from '../services/ai';

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
  route: { params: { agent: Agent } };
  navigation: any;
}

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
}: {
  agentId: string;
  color: string;
  onSelect: (message: string) => void;
  isFirstTime: boolean;
}) => {
  const actions = getQuickActions(agentId);

  if (isFirstTime) {
    return (
      <View style={styles.quickActionsFirstTimeWrapper}>
        <View style={styles.quickActionsFirstTimeHeader}>
          <Text style={styles.quickActionsFirstTimeTitle}>
            {t('chat.quickActions.firstTimeTitle')}
          </Text>
          <Text style={styles.quickActionsFirstTimeSubtitle}>
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
    <View style={styles.quickActionsWrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickActionsContainer}
      >
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[styles.quickActionButton, { borderColor: color }]}
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
// ウェルカムメッセージ生成
// ----------------------------------------
const generateWelcomeMessage = (agent: Agent): Message => {
  const hour = new Date().getHours();
  let greetingKey = 'greetings.afternoon';
  if (hour < 6) greetingKey = 'greetings.evening';
  else if (hour < 12) greetingKey = 'greetings.morning';
  else if (hour >= 18) greetingKey = 'greetings.evening';

  const agentName = t(`agents.${agent.id}.name`);
  const agentDescription = t(`agents.${agent.id}.description`);
  const killerFeature = t(`agents.${agent.id}.killerFeature`);

  let content = t('chat.welcomeGreeting', { greeting: t(greetingKey), emoji: agent.emoji }) + '\n\n';
  content += t('chat.welcomeIntro', { name: agentName, description: agentDescription }) + '\n\n';
  content += t('chat.welcomeFeature', { feature: killerFeature }) + '\n\n';
  content += t('chat.welcomeFooter');

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
  const { agent } = route.params;
  const { language } = useI18n();

  const [messages, setMessages] = useState<Message[]>(() => [
    generateWelcomeMessage(agent),
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [isOnline] = useState(true);

  const flatListRef = useRef<FlatList>(null);

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
      if (!messageText || isLoading) return;

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: messageText,
        timestamp: new Date(),
        isRead: false,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputText('');
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
        // AI APIを呼び出し（ストリーミング）
        const conversationHistory = getConversationHistory();
        
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

                // ストリーミング完了
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, content: fullText, isStreaming: false, syncNotification }
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
    [inputText, isLoading, agent, getConversationHistory]
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
              isUser ? styles.userBubble : [styles.assistantBubble, { backgroundColor: '#F0F0F0' }],
              isSelected && styles.selectedBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                isUser ? styles.userText : styles.assistantText,
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
      </View>
    );
  };

  const canSend = inputText.trim().length > 0 && !isLoading;
  const agentName = t(`agents.${agent.id}.name`);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
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
          onPress={() => Alert.alert(t('chat.menu'), t('chat.menuPreparing'))}
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
      />

      {/* メッセージリスト */}
      <View style={styles.chatContainer}>
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
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={() => Alert.alert(t('chat.attachImage'), t('chat.attachPreparing'))}
          >
            <Text style={styles.attachButtonText}>+</Text>
          </TouchableOpacity>

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder={t('chat.inputPlaceholder')}
              placeholderTextColor="#999"
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
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
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
    backgroundColor: 'white',
    marginRight: 8,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '500',
  },

  quickActionsFirstTimeWrapper: {
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
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
    color: '#333',
    marginBottom: 4,
  },
  quickActionsFirstTimeSubtitle: {
    fontSize: 12,
    color: '#888',
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
});
