import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

// Error types with user-friendly messages
export type ErrorType = 
  | 'network'
  | 'auth'
  | 'notFound'
  | 'server'
  | 'timeout'
  | 'unknown';

const ERROR_CONFIG: Record<ErrorType, { emoji: string; titleKey: string; messageKey: string }> = {
  network: {
    emoji: '📡',
    titleKey: 'ネットワークエラー',
    messageKey: 'インターネット接続を確認してください',
  },
  auth: {
    emoji: '🔐',
    titleKey: '認証エラー',
    messageKey: '再度ログインしてください',
  },
  notFound: {
    emoji: '🔍',
    titleKey: '見つかりません',
    messageKey: 'お探しのコンテンツは存在しないようです',
  },
  server: {
    emoji: '🛠️',
    titleKey: 'サーバーエラー',
    messageKey: 'しばらくしてからお試しください',
  },
  timeout: {
    emoji: '⏱️',
    titleKey: 'タイムアウト',
    messageKey: '接続がタイムアウトしました。再試行してください',
  },
  unknown: {
    emoji: '😵',
    titleKey: 'エラーが発生しました',
    messageKey: '問題が発生しました。もう一度お試しください',
  },
};

// Parse error to determine type
export function parseError(error: unknown): ErrorType {
  if (!error) return 'unknown';
  
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return 'network';
  }
  if (message.includes('auth') || message.includes('unauthorized') || message.includes('401')) {
    return 'auth';
  }
  if (message.includes('not found') || message.includes('404')) {
    return 'notFound';
  }
  if (message.includes('timeout') || message.includes('timed out')) {
    return 'timeout';
  }
  if (message.includes('500') || message.includes('server')) {
    return 'server';
  }
  
  return 'unknown';
}

interface ErrorDisplayProps {
  error: unknown;
  onRetry?: () => void;
  onDismiss?: () => void;
  compact?: boolean;
}

export function ErrorDisplay({ error, onRetry, onDismiss, compact = false }: ErrorDisplayProps) {
  const { colors } = useTheme();
  const errorType = parseError(error);
  const config = ERROR_CONFIG[errorType];

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: colors.errorLight }]}>
        <Text style={styles.compactEmoji}>{config.emoji}</Text>
        <View style={styles.compactContent}>
          <Text style={[styles.compactTitle, { color: colors.error }]}>{config.titleKey}</Text>
          <Text style={[styles.compactMessage, { color: colors.textSecondary }]}>
            {config.messageKey}
          </Text>
        </View>
        {onRetry && (
          <TouchableOpacity 
            onPress={onRetry}
            style={[styles.compactRetryButton, { backgroundColor: colors.error }]}
          >
            <Text style={styles.compactRetryText}>再試行</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={styles.emoji}>{config.emoji}</Text>
      <Text style={[styles.title, { color: colors.text }]}>{config.titleKey}</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {config.messageKey}
      </Text>
      
      <View style={styles.buttonRow}>
        {onRetry && (
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={onRetry}
          >
            <Text style={[styles.retryButtonText, { color: colors.textInverse }]}>
              再試行
            </Text>
          </TouchableOpacity>
        )}
        {onDismiss && (
          <TouchableOpacity
            style={[styles.dismissButton, { borderColor: colors.border }]}
            onPress={onDismiss}
          >
            <Text style={[styles.dismissButtonText, { color: colors.textSecondary }]}>
              閉じる
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// Toast-style error notification
interface ErrorToastProps {
  visible: boolean;
  message: string;
  onDismiss: () => void;
  duration?: number;
}

export function ErrorToast({ visible, message, onDismiss, duration = 4000 }: ErrorToastProps) {
  const { colors } = useTheme();

  React.useEffect(() => {
    if (visible) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onDismiss]);

  if (!visible) return null;

  return (
    <TouchableOpacity 
      style={[styles.toast, { backgroundColor: colors.error }]}
      onPress={onDismiss}
      activeOpacity={0.9}
    >
      <Text style={styles.toastEmoji}>⚠️</Text>
      <Text style={styles.toastMessage}>{message}</Text>
    </TouchableOpacity>
  );
}

// Error boundary wrapper hook
export function useErrorHandler() {
  const [error, setError] = React.useState<unknown>(null);

  const handleError = React.useCallback((e: unknown) => {
    console.error('Error caught:', e);
    setError(e);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  const wrapAsync = React.useCallback(<T,>(
    fn: () => Promise<T>
  ): Promise<T | undefined> => {
    return fn().catch((e) => {
      handleError(e);
      return undefined;
    });
  }, [handleError]);

  return { error, handleError, clearError, wrapAsync };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dismissButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
  },
  dismissButtonText: {
    fontSize: 16,
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  compactEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  compactMessage: {
    fontSize: 12,
    marginTop: 2,
  },
  compactRetryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  compactRetryText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  // Toast styles
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  toastEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  toastMessage: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
});
