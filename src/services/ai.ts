// ========================================
// DoDo App - AI Service
// OpenAI API連携 + Claude API連携（フォールバック）
// ========================================

import { getCoachSystemPrompt } from '../data/coachPrompts';
import { 
  checkMessageSecurity, 
  checkResponseConsistency,
  logSecurityEvent,
  getSafeResponse 
} from './security';
import { generateUserContext, extractUserInfoFromMessage, updateUserProfile } from './chatSync';
import { supabase } from './supabase';

// Edge Function経由でAIを呼び出すかどうか
const USE_EDGE_FUNCTION = true;

// ----------------------------------------
// Types
// ----------------------------------------
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  provider: 'openai' | 'anthropic' | 'mock';
  tokensUsed?: number;
}

export interface StreamCallbacks {
  onStart?: () => void;
  onToken?: (token: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

export interface AIConfig {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  openaiModel?: string;
  anthropicModel?: string;
  maxTokens?: number;
  temperature?: number;
}

// ----------------------------------------
// Default Configuration
// ----------------------------------------
const DEFAULT_CONFIG: AIConfig = {
  openaiModel: 'gpt-4o-mini',
  anthropicModel: 'claude-3-haiku-20240307',
  maxTokens: 500,
  temperature: 0.7,
};

// ----------------------------------------
// Haiku/Sonnet 自動切り替えロジック
// ----------------------------------------
const CLAUDE_MODELS = {
  HAIKU: 'claude-3-haiku-20240307',
  SONNET: 'claude-3-5-sonnet-20241022',
};

/**
 * メッセージの複雑さに応じてモデルを自動選択
 * - 簡単な質問 → Haiku (高速・低コスト)
 * - 複雑な質問 → Sonnet (高品質)
 */
function selectAnthropicModel(
  userMessage: string,
  conversationHistory: ChatMessage[]
): string {
  const messageLength = userMessage.length;
  const historyLength = conversationHistory.length;
  
  // 複雑さの判定基準
  const isComplex = 
    messageLength > 300 ||           // 長いメッセージ
    historyLength > 8 ||             // 長い会話履歴
    /計画|プラン|分析|詳し|教えて.*方法|どうすれば|なぜ|理由/i.test(userMessage) || // 複雑な質問パターン
    /plan|analyze|explain|how.*should|why|detail/i.test(userMessage);
  
  const selectedModel = isComplex ? CLAUDE_MODELS.SONNET : CLAUDE_MODELS.HAIKU;
  if (__DEV__) {
    console.log(`[AI] Model selected: ${selectedModel} (complex: ${isComplex}, msgLen: ${messageLength}, history: ${historyLength})`);
  }
  
  return selectedModel;
}

// ----------------------------------------
// API Keys (本番では環境変数から取得)
// ----------------------------------------
let config: AIConfig = { ...DEFAULT_CONFIG };

/**
 * AI設定を更新
 */
export const configureAI = (newConfig: Partial<AIConfig>) => {
  config = { ...config, ...newConfig };
};

/**
 * API Keyを設定
 */
export const setApiKeys = (openaiKey?: string, anthropicKey?: string) => {
  if (openaiKey) config.openaiApiKey = openaiKey;
  if (anthropicKey) config.anthropicApiKey = anthropicKey;
};

// ----------------------------------------
// OpenAI API
// ----------------------------------------
async function callOpenAI(
  messages: ChatMessage[],
  stream: boolean = false,
  callbacks?: StreamCallbacks
): Promise<AIResponse> {
  if (!config.openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: config.openaiModel,
      messages,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      stream,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error: ${response.status} - ${error.error?.message || 'Unknown error'}`);
  }

  if (stream && callbacks) {
    return handleOpenAIStream(response, callbacks);
  }

  const data = await response.json();
  return {
    content: data.choices[0]?.message?.content || '',
    provider: 'openai',
    tokensUsed: data.usage?.total_tokens,
  };
}

async function handleOpenAIStream(
  response: Response,
  callbacks: StreamCallbacks
): Promise<AIResponse> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullText = '';

  callbacks.onStart?.();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const token = parsed.choices[0]?.delta?.content || '';
          if (token) {
            fullText += token;
            callbacks.onToken?.(token);
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }

    callbacks.onComplete?.(fullText);
    return { content: fullText, provider: 'openai' };
  } catch (error) {
    callbacks.onError?.(error as Error);
    throw error;
  }
}

// ----------------------------------------
// Anthropic (Claude) API
// ----------------------------------------
async function callAnthropic(
  messages: ChatMessage[],
  stream: boolean = false,
  callbacks?: StreamCallbacks,
  autoSelectModel: boolean = true
): Promise<AIResponse> {
  if (!config.anthropicApiKey) {
    throw new Error('Anthropic API key not configured');
  }

  // システムメッセージを分離
  const systemMessage = messages.find(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system');
  
  // ユーザーメッセージと会話履歴を取得
  const userMessages = chatMessages.filter(m => m.role === 'user');
  const lastUserMessage = userMessages[userMessages.length - 1]?.content || '';
  
  // モデル自動選択（Haiku/Sonnet）
  const model = autoSelectModel 
    ? selectAnthropicModel(lastUserMessage, chatMessages.slice(0, -1))
    : config.anthropicModel;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.anthropicApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: config.maxTokens,
      system: systemMessage?.content || '',
      messages: chatMessages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      stream,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Anthropic API error: ${response.status} - ${error.error?.message || 'Unknown error'}`);
  }

  if (stream && callbacks) {
    return handleAnthropicStream(response, callbacks);
  }

  const data = await response.json();
  return {
    content: data.content[0]?.text || '',
    provider: 'anthropic',
    tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
  };
}

async function handleAnthropicStream(
  response: Response,
  callbacks: StreamCallbacks
): Promise<AIResponse> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullText = '';

  callbacks.onStart?.();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6);
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'content_block_delta') {
            const token = parsed.delta?.text || '';
            if (token) {
              fullText += token;
              callbacks.onToken?.(token);
            }
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }

    callbacks.onComplete?.(fullText);
    return { content: fullText, provider: 'anthropic' };
  } catch (error) {
    callbacks.onError?.(error as Error);
    throw error;
  }
}

// ----------------------------------------
// Mock Response (開発用・フォールバック)
// ----------------------------------------
function generateMockResponse(
  coachId: string,
  userMessage: string,
  callbacks?: StreamCallbacks
): Promise<AIResponse> {
  // コーチごとのサンプル応答
  const mockResponses: Record<string, string[]> = {
    'diet-coach': [
      `🦤 なるほど！それについて一緒に考えてみましょう！\n\n食事管理で大切なのは、無理なく続けられることですよ。`,
      `🦤 いい質問ですね！バランスの良い食事が基本です。具体的なプランを立ててみましょうか？`,
    ],
    'language-tutor': [
      `Great question! 🦜 Let's practice together! 毎日少しずつ続けることが上達の秘訣ですよ。`,
      `That's wonderful! 🦜 一緒に楽しく学んでいきましょう！`,
    ],
    'habit-coach': [
      `🦉 習慣を作りたいのですね。ポイントは「小さく始める」こと。既存の習慣にくっつけてみましょう。`,
    ],
    'money-coach': [
      `💰 家計管理について考えてますね。まず今月の支出を振り返ることから始めましょう！`,
    ],
    'sleep-coach': [
      `🐨 睡眠のこと、大事だよね。今夜から試せる簡単なコツを教えるね💤`,
    ],
    'mental-coach': [
      `🦢 そうなんですね。その気持ち、よくわかります。一緒に深呼吸しましょうか🌸`,
    ],
    'fitness-coach': [
      `🦍 やるぞ！💪 お前のやる気、最高だぜ！今日は何をやる？`,
    ],
    'cooking-coach': [
      `🍳 料理のこと？任せて！簡単でおいしいレシピ、いっぱい知ってるよ✨`,
    ],
    'career-coach': [
      `🦅 キャリアについて考えているんですね！素晴らしい一歩です！一緒に可能性を探りましょう💼`,
    ],
    'study-coach': [
      `📚 学習のことですね。まず現状を整理して、効率的な計画を立てましょう🎯`,
    ],
    'parenting-coach': [
      `🦩 育児、本当にお疲れさまです。あなたは十分頑張ってますよ💕`,
    ],
    'romance-coach': [
      `🦩 恋愛のこと？ドキドキするよね！一緒に作戦を考えよう💕`,
    ],
    'organize-coach': [
      `🦫 片付けたいんだね。まずは15分だけ、1つの引き出しから始めよう✨`,
    ],
    'time-coach': [
      `⏰ 時間管理ね。まずは今日やることを3つだけ決めてみよう！`,
    ],
    'digital-coach': [
      `🐼 デジタルとの付き合い方、一緒に考えよう。焦らなくて大丈夫🌿`,
    ],
  };

  const responses = mockResponses[coachId] || [
    `ご質問ありがとうございます！一緒に頑張りましょう！💪`,
  ];

  const content = responses[Math.floor(Math.random() * responses.length)];

  return new Promise((resolve) => {
    if (callbacks) {
      callbacks.onStart?.();
      
      // ストリーミング風にトークンを送信
      let index = 0;
      const interval = setInterval(() => {
        if (index < content.length) {
          callbacks.onToken?.(content[index]);
          index++;
        } else {
          clearInterval(interval);
          callbacks.onComplete?.(content);
          resolve({ content, provider: 'mock' });
        }
      }, 30); // 30msごとに1文字
    } else {
      setTimeout(() => {
        resolve({ content, provider: 'mock' });
      }, 500);
    }
  });
}

// ----------------------------------------
// Main Chat Function
// ----------------------------------------

/**
 * コーチにメッセージを送信
 * OpenAI → Anthropic → Mock の順でフォールバック
 */
export async function sendChatMessage(
  coachId: string,
  userMessage: string,
  conversationHistory: ChatMessage[] = [],
  options: {
    stream?: boolean;
    callbacks?: StreamCallbacks;
  } = {}
): Promise<AIResponse> {
  const { stream = false, callbacks } = options;

  // ========================================
  // セキュリティチェック（プロンプトインジェクション対策）
  // ========================================
  const securityCheck = checkMessageSecurity(userMessage);
  
  if (securityCheck.riskLevel === 'dangerous') {
    // 危険な入力をログに記録
    await logSecurityEvent({
      type: 'dangerous_input',
      coachId,
      message: userMessage.substring(0, 200), // 最初の200文字のみ
      details: securityCheck.matchedPattern,
    });
    
    // 安全な応答を返す（AIに送信しない）
    const safeResponse = getSafeResponse(coachId);
    callbacks?.onComplete?.(safeResponse);
    return {
      content: safeResponse,
      provider: 'mock',
    };
  }
  
  if (securityCheck.riskLevel === 'warning') {
    // 警告レベルはログのみ記録、処理は続行
    await logSecurityEvent({
      type: 'warning_input',
      coachId,
      message: userMessage.substring(0, 200),
      details: securityCheck.matchedPattern,
    });
  }

  // ========================================
  // ユーザー情報の抽出と保存
  // ========================================
  try {
    const extractedInfo = extractUserInfoFromMessage(userMessage);
    if (Object.keys(extractedInfo).length > 0) {
      await updateUserProfile(coachId, extractedInfo);
    }
  } catch (error) {
    console.warn('Failed to extract/save user info:', error);
  }

  // ========================================
  // システムプロンプト + ユーザーコンテキスト
  // ========================================
  let systemPrompt = getCoachSystemPrompt(coachId);
  
  try {
    const userContext = await generateUserContext(coachId);
    if (userContext) {
      systemPrompt += userContext;
    }
  } catch (error) {
    console.warn('Failed to get user context:', error);
  }

  // メッセージを構築
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  let response: AIResponse;

  // ========================================
  // Edge Function経由でAIを呼び出す（推奨）
  // ========================================
  if (USE_EDGE_FUNCTION) {
    try {
      callbacks?.onStart?.();
      
      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          message: userMessage,
          history: conversationHistory.map(m => ({
            role: m.role,
            content: m.content,
          })),
          systemPrompt,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Unknown error');

      const content = data.content;
      
      // ストリーミング風に表示
      if (stream && callbacks?.onToken) {
        for (let i = 0; i < content.length; i++) {
          callbacks.onToken(content[i]);
          await new Promise(resolve => setTimeout(resolve, 15));
        }
      }
      
      callbacks?.onComplete?.(content);
      
      response = {
        content,
        provider: 'anthropic',
        tokensUsed: data.tokensUsed,
      };
    } catch (error) {
      console.warn('Edge Function failed, falling back to direct API:', error);
      callbacks?.onError?.(error as Error);
      // フォールバック: 直接API呼び出し
      response = await tryAnthropicOrMock(coachId, userMessage, messages, stream, callbacks);
    }
  }
  // ========================================
  // 直接API呼び出し（フォールバック）
  // ========================================
  else if (config.openaiApiKey) {
    try {
      response = await callOpenAI(messages, stream, callbacks);
    } catch (error) {
      console.warn('OpenAI API failed, falling back to Anthropic:', error);
      response = await tryAnthropicOrMock(coachId, userMessage, messages, stream, callbacks);
    }
  } else {
    response = await tryAnthropicOrMock(coachId, userMessage, messages, stream, callbacks);
  }

  // ========================================
  // 応答の一貫性チェック
  // ========================================
  const consistencyCheck = checkResponseConsistency(coachId, response.content);
  if (!consistencyCheck.isConsistent) {
    await logSecurityEvent({
      type: 'inconsistent_response',
      coachId,
      message: response.content.substring(0, 200),
      details: consistencyCheck.warning,
    });
    // 不一致でも応答は返すが、ログに記録
  }

  return response;
}

// ヘルパー関数：Anthropicまたはモックを試行
async function tryAnthropicOrMock(
  coachId: string,
  userMessage: string,
  messages: ChatMessage[],
  stream: boolean,
  callbacks?: StreamCallbacks
): Promise<AIResponse> {
  // Anthropic APIにフォールバック
  if (config.anthropicApiKey) {
    try {
      return await callAnthropic(messages, stream, callbacks);
    } catch (error) {
      console.warn('Anthropic API failed, falling back to mock:', error);
    }
  }

  // モックレスポンスにフォールバック
  console.warn('No API keys configured, using mock response');
  return generateMockResponse(coachId, userMessage, callbacks);
}

/**
 * ストリーミングチャット（便利関数）
 */
export function streamChatMessage(
  coachId: string,
  userMessage: string,
  conversationHistory: ChatMessage[] = [],
  callbacks: StreamCallbacks
): Promise<AIResponse> {
  return sendChatMessage(coachId, userMessage, conversationHistory, {
    stream: true,
    callbacks,
  });
}

// ----------------------------------------
// Utility Functions
// ----------------------------------------

/**
 * API接続をテスト
 */
export async function testConnection(): Promise<{
  openai: boolean;
  anthropic: boolean;
}> {
  const results = { openai: false, anthropic: false };

  if (config.openaiApiKey) {
    try {
      await callOpenAI([
        { role: 'system', content: 'Test' },
        { role: 'user', content: 'Hi' },
      ]);
      results.openai = true;
    } catch {
      results.openai = false;
    }
  }

  if (config.anthropicApiKey) {
    try {
      await callAnthropic([
        { role: 'system', content: 'Test' },
        { role: 'user', content: 'Hi' },
      ]);
      results.anthropic = true;
    } catch {
      results.anthropic = false;
    }
  }

  return results;
}

/**
 * 現在の設定状態を取得
 */
export function getAIStatus(): {
  hasOpenAI: boolean;
  hasAnthropic: boolean;
  openaiModel: string;
  anthropicModel: string;
} {
  return {
    hasOpenAI: !!config.openaiApiKey,
    hasAnthropic: !!config.anthropicApiKey,
    openaiModel: config.openaiModel || DEFAULT_CONFIG.openaiModel!,
    anthropicModel: config.anthropicModel || DEFAULT_CONFIG.anthropicModel!,
  };
}

// ----------------------------------------
// Vision (Image) Support
// ----------------------------------------

/**
 * 画像付きメッセージを送信（Vision API）
 */
export async function sendChatMessageWithImage(
  coachId: string,
  userMessage: string,
  imageBase64: string,
  conversationHistory: ChatMessage[] = [],
  options: {
    callbacks?: StreamCallbacks;
  } = {}
): Promise<AIResponse> {
  const { callbacks } = options;

  // システムプロンプトを取得
  const systemPrompt = getCoachSystemPrompt(coachId);

  // Anthropic Vision APIを使用（Claude 3はビジョン対応）
  if (config.anthropicApiKey) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307', // Vision対応モデル
          max_tokens: config.maxTokens,
          system: systemPrompt,
          messages: [
            ...conversationHistory.map(m => ({
              role: m.role,
              content: m.content,
            })),
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
                  },
                },
                {
                  type: 'text',
                  text: userMessage || 'この画像について教えてください。',
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`Anthropic Vision API error: ${response.status} - ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const content = data.content[0]?.text || '';

      callbacks?.onComplete?.(content);

      return {
        content,
        provider: 'anthropic',
        tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      };
    } catch (error) {
      console.error('Anthropic Vision API failed:', error);
      callbacks?.onError?.(error as Error);
    }
  }

  // フォールバック: 画像なしで送信
  console.warn('Vision API not available, sending text only');
  return sendChatMessage(coachId, userMessage + ' [画像が添付されていましたが、現在画像解析機能は利用できません]', conversationHistory, options);
}

// ----------------------------------------
// Export
// ----------------------------------------
export default {
  sendChatMessage,
  streamChatMessage,
  configureAI,
  setApiKeys,
  testConnection,
  getAIStatus,
};
