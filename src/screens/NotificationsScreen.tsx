import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NotificationItem, { 
  NotificationData, 
  NotificationType 
} from '../components/NotificationItem';

// Mock notification data
const MOCK_NOTIFICATIONS: NotificationData[] = [
  {
    id: '1',
    type: 'goal_achieved',
    title: '目標達成おめでとう！🎉',
    message: '今日の歩数目標10,000歩を達成しました。素晴らしい努力です！',
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 mins ago
    isRead: false,
  },
  {
    id: '2',
    type: 'streak',
    title: '7日間連続ストリーク達成！',
    message: '1週間毎日ログインしています。この調子で続けましょう！',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
    isRead: false,
  },
  {
    id: '3',
    type: 'agent_message',
    title: 'ドードーからのメッセージ',
    message: '今日の食事記録はまだですね。忘れずに記録しましょう！',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    isRead: false,
    agentName: 'ドードー',
    agentEmoji: '🦤',
  },
  {
    id: '4',
    type: 'special_offer',
    title: '期間限定オファー',
    message: 'Proプランが今なら30%オフ！この機会をお見逃しなく。',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
    isRead: true,
  },
  {
    id: '5',
    type: 'weekly_report',
    title: '週間レポートが届きました',
    message: '先週の活動サマリーを確認しましょう。目標達成率は85%でした！',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    isRead: true,
  },
  {
    id: '6',
    type: 'agent_message',
    title: 'オウルからのメッセージ',
    message: '新しい習慣「毎朝の瞑想」を始めて3日目ですね。順調です！',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    isRead: true,
    agentName: 'オウル',
    agentEmoji: '🦉',
  },
  {
    id: '7',
    type: 'goal_achieved',
    title: '水分補給目標達成！',
    message: '今日は2リットルの水分補給ができました。',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
    isRead: true,
  },
  {
    id: '8',
    type: 'streak',
    title: '30日間ストリーク達成！🏆',
    message: '1ヶ月間毎日続けられました！特別なバッジを獲得しました。',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72), // 3 days ago
    isRead: true,
  },
];

interface Props {
  navigation: any;
}

// Group notifications by date
const groupByDate = (notifications: NotificationData[]) => {
  const groups: { [key: string]: NotificationData[] } = {};
  
  notifications.forEach((notification) => {
    const date = notification.timestamp;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    
    let dateKey: string;
    const notificationDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (notificationDate.getTime() === today.getTime()) {
      dateKey = '今日';
    } else if (notificationDate.getTime() === yesterday.getTime()) {
      dateKey = '昨日';
    } else {
      dateKey = date.toLocaleDateString('ja-JP', { 
        month: 'long', 
        day: 'numeric',
        weekday: 'short',
      });
    }
    
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(notification);
  });
  
  return groups;
};

export default function NotificationsScreen({ navigation }: Props) {
  const [notifications, setNotifications] = useState<NotificationData[]>(MOCK_NOTIFICATIONS);
  const [refreshing, setRefreshing] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const groupedNotifications = useMemo(() => {
    const groups = groupByDate(notifications);
    const result: { type: 'header' | 'notification'; data: string | NotificationData }[] = [];
    
    Object.entries(groups).forEach(([dateKey, items]) => {
      result.push({ type: 'header', data: dateKey });
      items.forEach((item) => {
        result.push({ type: 'notification', data: item });
      });
    });
    
    return result;
  }, [notifications]);

  const handleMarkAllAsRead = useCallback(() => {
    if (unreadCount === 0) return;
    
    Alert.alert(
      'すべて既読にする',
      `${unreadCount}件の未読通知を既読にしますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '既読にする',
          onPress: () => {
            setNotifications((prev) =>
              prev.map((n) => ({ ...n, isRead: true }))
            );
          },
        },
      ]
    );
  }, [unreadCount]);

  const handleNotificationPress = useCallback((notification: NotificationData) => {
    // Navigate based on notification type
    switch (notification.type) {
      case 'agent_message':
        // Navigate to chat with agent
        console.log('Navigate to chat:', notification.agentName);
        break;
      case 'weekly_report':
        // Navigate to progress/stats
        console.log('Navigate to progress');
        break;
      case 'special_offer':
        // Navigate to subscription
        console.log('Navigate to subscription');
        break;
      default:
        console.log('Notification pressed:', notification.id);
    }
  }, []);

  const handleDelete = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleMarkAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: { type: 'header' | 'notification'; data: string | NotificationData } }) => {
      if (item.type === 'header') {
        return (
          <View style={styles.dateHeader}>
            <Text style={styles.dateHeaderText}>{item.data as string}</Text>
          </View>
        );
      }
      
      const notification = item.data as NotificationData;
      return (
        <NotificationItem
          notification={notification}
          onPress={handleNotificationPress}
          onDelete={handleDelete}
          onMarkAsRead={handleMarkAsRead}
        />
      );
    },
    [handleNotificationPress, handleDelete, handleMarkAsRead]
  );

  const keyExtractor = useCallback(
    (item: { type: 'header' | 'notification'; data: string | NotificationData }, index: number) => {
      if (item.type === 'header') {
        return `header-${item.data}`;
      }
      return (item.data as NotificationData).id;
    },
    []
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>通知</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.markAllButton,
            unreadCount === 0 && styles.markAllButtonDisabled,
          ]}
          onPress={handleMarkAllAsRead}
          disabled={unreadCount === 0}
        >
          <Text
            style={[
              styles.markAllText,
              unreadCount === 0 && styles.markAllTextDisabled,
            ]}
          >
            すべて既読
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notification List */}
      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>通知はありません</Text>
          <Text style={styles.emptyMessage}>
            新しい通知が届くとここに表示されます
          </Text>
        </View>
      ) : (
        <FlatList
          data={groupedNotifications}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#FF9800"
              colors={['#FF9800']}
            />
          }
        />
      )}

      {/* Swipe hint */}
      {notifications.length > 0 && (
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>← 左にスワイプで削除</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  backIcon: {
    fontSize: 20,
    color: '#333',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  badge: {
    backgroundColor: '#FF5252',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  markAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  markAllButtonDisabled: {
    opacity: 0.5,
  },
  markAllText: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '600',
  },
  markAllTextDisabled: {
    color: '#AAA',
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 60,
  },
  dateHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingTop: 16,
  },
  dateHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  hintContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 12,
    color: '#AAA',
    backgroundColor: 'rgba(250, 250, 250, 0.9)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
});
