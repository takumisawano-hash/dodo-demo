import React from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Text,
  Modal,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  fullScreen?: boolean;
}

export function LoadingOverlay({ visible, message, fullScreen = true }: LoadingOverlayProps) {
  const { colors, isDark } = useTheme();

  if (!visible) return null;

  const content = (
    <View style={[
      styles.container,
      fullScreen && styles.fullScreen,
      { backgroundColor: fullScreen ? colors.overlay : 'transparent' }
    ]}>
      <View style={[styles.loadingBox, { backgroundColor: colors.surface }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        {message && (
          <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
        )}
      </View>
    </View>
  );

  if (fullScreen) {
    return (
      <Modal transparent visible={visible} animationType="fade">
        {content}
      </Modal>
    );
  }

  return content;
}

// Inline loading indicator for lists/cards
interface LoadingIndicatorProps {
  size?: 'small' | 'large';
  message?: string;
  style?: any;
}

export function LoadingIndicator({ size = 'large', message, style }: LoadingIndicatorProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.inlineContainer, style]}>
      <ActivityIndicator size={size} color={colors.primary} />
      {message && (
        <Text style={[styles.inlineMessage, { color: colors.textSecondary }]}>
          {message}
        </Text>
      )}
    </View>
  );
}

// Skeleton placeholder for loading states
interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: isDark ? '#333333' : '#E0E0E0',
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  loadingBox: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  inlineContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  inlineMessage: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
});
