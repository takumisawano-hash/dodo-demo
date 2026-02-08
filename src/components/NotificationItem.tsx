import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = -80;

export type NotificationType = 
  | 'goal_achieved'      // 🎯 目標達成
  | 'streak'             // 🔥 ストリーク継続
  | 'agent_message'      // 💬 エージェントからのメッセージ
  | 'special_offer'      // 🎁 特別オファー
  | 'weekly_report';     // 📊 週間レポート

export interface NotificationData {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  agentName?: string;
  agentEmoji?: string;
}

interface Props {
  notification: NotificationData;
  onPress: (notification: NotificationData) => void;
  onDelete: (id: string) => void;
  onMarkAsRead: (id: string) => void;
}

const NOTIFICATION_CONFIG: Record<NotificationType, { emoji: string; color: string; bgColor: string }> = {
  goal_achieved: { emoji: '🎯', color: '#4CAF50', bgColor: '#E8F5E9' },
  streak: { emoji: '🔥', color: '#FF9800', bgColor: '#FFF3E0' },
  agent_message: { emoji: '💬', color: '#FF9800', bgColor: '#FFF3E0' },
  special_offer: { emoji: '🎁', color: '#E91E63', bgColor: '#FCE4EC' },
  weekly_report: { emoji: '📊', color: '#9C27B0', bgColor: '#F3E5F5' },
};

export default function NotificationItem({
  notification,
  onPress,
  onDelete,
  onMarkAsRead,
}: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const deleteOpacity = useRef(new Animated.Value(0)).current;

  const config = NOTIFICATION_CONFIG[notification.type];
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal swipes
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(Math.max(gestureState.dx, -120));
          deleteOpacity.setValue(Math.min(Math.abs(gestureState.dx) / 80, 1));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < SWIPE_THRESHOLD) {
          // Swipe to delete
          Animated.timing(translateX, {
            toValue: -SCREEN_WIDTH,
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            onDelete(notification.id);
          });
        } else {
          // Reset position
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
          }).start();
          Animated.timing(deleteOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'たった今';
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;
    
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
  };

  const handlePress = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
    onPress(notification);
  };

  return (
    <View style={styles.container}>
      {/* Delete button behind */}
      <Animated.View style={[styles.deleteBackground, { opacity: deleteOpacity }]}>
        <Text style={styles.deleteIcon}>🗑️</Text>
        <Text style={styles.deleteText}>削除</Text>
      </Animated.View>

      {/* Notification card */}
      <Animated.View
        style={[
          styles.cardWrapper,
          { transform: [{ translateX }] },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={[
            styles.card,
            !notification.isRead && styles.unreadCard,
          ]}
          onPress={handlePress}
          activeOpacity={0.7}
        >
          {/* Unread indicator */}
          {!notification.isRead && (
            <View style={[styles.unreadDot, { backgroundColor: config.color }]} />
          )}

          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
            <Text style={styles.icon}>
              {notification.agentEmoji || config.emoji}
            </Text>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.titleRow}>
              <Text 
                style={[
                  styles.title,
                  !notification.isRead && styles.unreadTitle,
                ]}
                numberOfLines={1}
              >
                {notification.title}
              </Text>
              <Text style={styles.time}>{formatTime(notification.timestamp)}</Text>
            </View>
            <Text 
              style={[
                styles.message,
                !notification.isRead && styles.unreadMessage,
              ]}
              numberOfLines={2}
            >
              {notification.message}
            </Text>
            {notification.agentName && (
              <Text style={[styles.agentName, { color: config.color }]}>
                {notification.agentEmoji} {notification.agentName}より
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 2,
  },
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 2,
    width: 100,
    backgroundColor: '#FF5252',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginRight: 16,
  },
  deleteIcon: {
    fontSize: 24,
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  cardWrapper: {
    backgroundColor: '#FAFAFA',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    paddingLeft: 20,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  unreadCard: {
    backgroundColor: '#FEFEFE',
    shadowOpacity: 0.1,
    elevation: 2,
  },
  unreadDot: {
    position: 'absolute',
    left: 8,
    top: '50%',
    marginTop: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 22,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
    color: '#555',
    flex: 1,
    marginRight: 8,
  },
  unreadTitle: {
    fontWeight: '600',
    color: '#333',
  },
  time: {
    fontSize: 12,
    color: '#AAA',
  },
  message: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
  },
  unreadMessage: {
    color: '#666',
  },
  agentName: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
  },
});
