// ========================================
// DoDo App - AI Backend Service
// Supabase Edge Function経由でAI APIを呼び出す
// ========================================

import { supabase } from './supabase';
import { getCoachSystemPrompt } from '../data/coachPrompts';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  model: string;
  tokensUsed?: number;
}

export interface StreamCallbacks {
  onStart?: () => void;
  onToken?: (token: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Supabase Edge Function経由でAIチャットを呼び出す
 */
export async function sendChatMessageViaBackend(
  coachId: string,
  message: string,
  history: ChatMessage[] = [],
  callbacks?: StreamCallbacks
): Promise<AIResponse> {
  callbacks?.onStart?.();

  try {
    const systemPrompt = getCoachSystemPrompt(coachId);
    
    const { data, error } = await supabase.functions.invoke('chat', {
      body: {
        coachId,
        message,
        history,
        systemPrompt,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.success) {
      throw new Error(data.error || 'Unknown error');
    }

    const response: AIResponse = {
      content: data.content,
      model: data.model,
      tokensUsed: data.tokensUsed,
    };

    // シミュレートしたストリーミング（UX向上のため）
    if (callbacks?.onToken) {
      const content = data.content;
      for (let i = 0; i < content.length; i++) {
        callbacks.onToken(content[i]);
        await new Promise(resolve => setTimeout(resolve, 15));
      }
    }

    callbacks?.onComplete?.(data.content);
    return response;

  } catch (error) {
    console.error('AI Backend error:', error);
    callbacks?.onError?.(error as Error);
    throw error;
  }
}

/**
 * ストリーミングチャット（便利関数）
 */
export function streamChatMessageViaBackend(
  coachId: string,
  message: string,
  history: ChatMessage[] = [],
  callbacks: StreamCallbacks
): Promise<AIResponse> {
  return sendChatMessageViaBackend(coachId, message, history, callbacks);
}

/**
 * バックエンド接続テスト
 */
export async function testBackendConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('chat', {
      body: {
        coachId: 'test',
        message: 'Hi',
        history: [],
        systemPrompt: 'Say "OK" only.',
      },
    });

    return !error && data?.success;
  } catch {
    return false;
  }
}
