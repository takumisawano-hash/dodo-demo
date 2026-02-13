import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Alert,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

// ===== 定数・型定義 =====
const COLORS = {
  primary: '#FF6B35',
  primaryLight: '#FF8C5A',
  primaryDark: '#E55A2B',
  background: '#FFF5E6',
  white: '#FFFFFF',
  black: '#1A1A1A',
  gray: '#666666',
  lightGray: '#E0E0E0',
  success: '#4CAF50',
  danger: '#F44336',
  warning: '#FFA726',
  info: '#42A5F5',
  flight: '#2196F3',
  hotel: '#9C27B0',
  transport: '#00BCD4',
  activity: '#8BC34A',
};

const STORAGE_KEYS = {
  trips: '@dodo_travel_trips',
  reservations: '@dodo_travel_reservations',
  packingLists: '@dodo_travel_packing',
  budgets: '@dodo_travel_budgets',
};

const RESERVATION_TYPES = [
  { id: 'flight', name: '航空券', icon: '✈️', color: COLORS.flight },
  { id: 'hotel', name: 'ホテル', icon: '🏨', color: COLORS.hotel },
  { id: 'train', name: '電車', icon: '🚄', color: COLORS.transport },
  { id: 'bus', name: 'バス', icon: '🚌', color: COLORS.transport },
  { id: 'car', name: 'レンタカー', icon: '🚗', color: COLORS.transport },
  { id: 'restaurant', name: 'レストラン', icon: '🍽️', color: '#FF5722' },
  { id: 'activity', name: 'アクティビティ', icon: '🎡', color: COLORS.activity },
  { id: 'other', name: 'その他', icon: '📋', color: COLORS.gray },
];

const DEFAULT_PACKING_ITEMS = [
  { category: '基本', items: ['パスポート', '財布', 'スマホ', '充電器', 'イヤホン'] },
  { category: '衣類', items: ['下着', '靴下', 'Tシャツ', 'ズボン', 'パジャマ'] },
  { category: '洗面', items: ['歯ブラシ', '歯磨き粉', 'シャンプー', '日焼け止め'] },
  { category: '医薬品', items: ['常備薬', '絆創膏', '胃薬'] },
];

const EXPENSE_CATEGORIES = [
  { id: 'flight', name: '航空券', icon: '✈️' },
  { id: 'hotel', name: '宿泊', icon: '🏨' },
  { id: 'transport', name: '交通', icon: '🚃' },
  { id: 'food', name: '食事', icon: '🍽️' },
  { id: 'activity', name: '観光', icon: '🎡' },
  { id: 'shopping', name: '買い物', icon: '🛍️' },
  { id: 'other', name: 'その他', icon: '💰' },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ===== 型定義 =====
interface Trip {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  coverEmoji: string;
  notes: string;
  createdAt: number;
}

interface Reservation {
  id: string;
  tripId: string;
  type: string;
  title: string;
  date: string;
  time: string;
  endDate?: string;
  endTime?: string;
  location: string;
  confirmationNumber: string;
  notes: string;
  amount: number;
  createdAt: number;
}

interface PackingItem {
  id: string;
  tripId: string;
  name: string;
  category: string;
  packed: boolean;
}

interface Expense {
  id: string;
  tripId: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  createdAt: number;
}

interface TripBudget {
  tripId: string;
  totalBudget: number;
  expenses: Expense[];
}

type TabType = 'trips' | 'timeline' | 'reservations' | 'packing' | 'budget';

// ===== ユーティリティ =====
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const formatFullDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return `${date.getMonth() + 1}月${date.getDate()}日(${weekdays[date.getDay()]})`;
};

const formatCurrency = (amount: number): string => {
  return `¥${amount.toLocaleString()}`;
};

const getDaysBetween = (start: string, end: string): number => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = endDate.getTime() - startDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const getReservationType = (typeId: string) => {
  return RESERVATION_TYPES.find(t => t.id === typeId) || RESERVATION_TYPES[RESERVATION_TYPES.length - 1];
};

const getExpenseCategory = (categoryId: string) => {
  return EXPENSE_CATEGORIES.find(c => c.id === categoryId) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
};

// ===== コンポーネント =====

// 旅行カード
const TripCard: React.FC<{
  trip: Trip;
  reservationCount: number;
  onPress: () => void;
  onDelete: () => void;
}> = ({ trip, reservationCount, onPress, onDelete }) => {
  const days = getDaysBetween(trip.startDate, trip.endDate);
  const today = new Date().toISOString().split('T')[0];
  const isUpcoming = trip.startDate > today;
  const isOngoing = trip.startDate <= today && trip.endDate >= today;
  const isPast = trip.endDate < today;

  return (
    <TouchableOpacity style={styles.tripCard} onPress={onPress} onLongPress={onDelete}>
      <View style={styles.tripHeader}>
        <Text style={styles.tripEmoji}>{trip.coverEmoji}</Text>
        <View style={styles.tripInfo}>
          <Text style={styles.tripDestination}>{trip.destination}</Text>
          <Text style={styles.tripDates}>
            {formatFullDate(trip.startDate)} 〜 {formatFullDate(trip.endDate)}
          </Text>
          <Text style={styles.tripMeta}>
            {days}日間 • 予約{reservationCount}件
          </Text>
        </View>
        <View style={[
          styles.tripBadge,
          isOngoing && styles.tripBadgeOngoing,
          isPast && styles.tripBadgePast,
        ]}>
          <Text style={styles.tripBadgeText}>
            {isOngoing ? '旅行中' : isPast ? '完了' : '予定'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// タブバー
const TabBar: React.FC<{
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  hasSelectedTrip: boolean;
}> = ({ activeTab, onTabChange, hasSelectedTrip }) => {
  const tabs: { key: TabType; label: string; icon: string; requiresTrip: boolean }[] = [
    { key: 'trips', label: '旅行', icon: '🗺️', requiresTrip: false },
    { key: 'timeline', label: '日程', icon: '📅', requiresTrip: true },
    { key: 'reservations', label: '予約', icon: '📋', requiresTrip: true },
    { key: 'packing', label: '持ち物', icon: '🧳', requiresTrip: true },
    { key: 'budget', label: '予算', icon: '💰', requiresTrip: true },
  ];

  return (
    <View style={styles.tabBar}>
      {tabs.map(tab => {
        const disabled = tab.requiresTrip && !hasSelectedTrip;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && styles.tabActive,
              disabled && styles.tabDisabled,
            ]}
            onPress={() => !disabled && onTabChange(tab.key)}
            disabled={disabled}
          >
            <Text style={[styles.tabIcon, disabled && styles.tabIconDisabled]}>{tab.icon}</Text>
            <Text style={[
              styles.tabLabel,
              activeTab === tab.key && styles.tabLabelActive,
              disabled && styles.tabLabelDisabled,
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// 旅行一覧タブ
const TripsTab: React.FC<{
  trips: Trip[];
  reservations: Reservation[];
  onSelectTrip: (trip: Trip) => void;
  onCreateTrip: () => void;
  onDeleteTrip: (trip: Trip) => void;
}> = ({ trips, reservations, onSelectTrip, onCreateTrip, onDeleteTrip }) => {
  const upcomingTrips = trips.filter(t => t.startDate >= new Date().toISOString().split('T')[0]);
  const pastTrips = trips.filter(t => t.endDate < new Date().toISOString().split('T')[0]);

  const handleDelete = (trip: Trip) => {
    Alert.alert(
      '旅行を削除',
      `「${trip.destination}」を削除しますか？\n関連する予約・持ち物リストも削除されます。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: () => onDeleteTrip(trip) },
      ]
    );
  };

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.createButton} onPress={onCreateTrip}>
        <Text style={styles.createButtonIcon}>✈️</Text>
        <Text style={styles.createButtonText}>新しい旅行を作成</Text>
      </TouchableOpacity>

      {upcomingTrips.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>📍 予定の旅行</Text>
          {upcomingTrips.map(trip => (
            <TripCard
              key={trip.id}
              trip={trip}
              reservationCount={reservations.filter(r => r.tripId === trip.id).length}
              onPress={() => onSelectTrip(trip)}
              onDelete={() => handleDelete(trip)}
            />
          ))}
        </>
      )}

      {pastTrips.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>📚 過去の旅行</Text>
          {pastTrips.map(trip => (
            <TripCard
              key={trip.id}
              trip={trip}
              reservationCount={reservations.filter(r => r.tripId === trip.id).length}
              onPress={() => onSelectTrip(trip)}
              onDelete={() => handleDelete(trip)}
            />
          ))}
        </>
      )}

      {trips.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🌍</Text>
          <Text style={styles.emptyTitle}>旅行がありません</Text>
          <Text style={styles.emptyText}>
            新しい旅行を作成して{'\n'}計画を始めましょう
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

// タイムライン（日程表）タブ
const TimelineTab: React.FC<{
  trip: Trip;
  reservations: Reservation[];
  onAddReservation: () => void;
}> = ({ trip, reservations, onAddReservation }) => {
  const days: string[] = useMemo(() => {
    const result: string[] = [];
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      result.push(d.toISOString().split('T')[0]);
    }
    return result;
  }, [trip.startDate, trip.endDate]);

  const getReservationsForDay = (date: string) => {
    return reservations
      .filter(r => r.date === date)
      .sort((a, b) => a.time.localeCompare(b.time));
  };

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.tripHeaderBanner}>
        <Text style={styles.tripHeaderEmoji}>{trip.coverEmoji}</Text>
        <Text style={styles.tripHeaderTitle}>{trip.destination}</Text>
        <Text style={styles.tripHeaderDates}>
          {formatFullDate(trip.startDate)} 〜 {formatFullDate(trip.endDate)}
        </Text>
      </View>

      {days.map((date, index) => {
        const dayReservations = getReservationsForDay(date);
        const today = new Date().toISOString().split('T')[0];
        const isToday = date === today;

        return (
          <View key={date} style={styles.timelineDay}>
            <View style={[styles.timelineDayHeader, isToday && styles.timelineDayHeaderToday]}>
              <Text style={styles.timelineDayNumber}>Day {index + 1}</Text>
              <Text style={[styles.timelineDayDate, isToday && styles.timelineDayDateToday]}>
                {formatFullDate(date)}
                {isToday && ' (今日)'}
              </Text>
            </View>

            {dayReservations.length > 0 ? (
              dayReservations.map(reservation => {
                const type = getReservationType(reservation.type);
                return (
                  <View key={reservation.id} style={styles.timelineItem}>
                    <View style={styles.timelineTime}>
                      <Text style={styles.timelineTimeText}>{reservation.time}</Text>
                    </View>
                    <View style={[styles.timelineLine, { backgroundColor: type.color }]} />
                    <View style={styles.timelineContent}>
                      <View style={[styles.timelineIcon, { backgroundColor: type.color }]}>
                        <Text style={styles.timelineIconText}>{type.icon}</Text>
                      </View>
                      <View style={styles.timelineDetails}>
                        <Text style={styles.timelineTitle}>{reservation.title}</Text>
                        {reservation.location && (
                          <Text style={styles.timelineLocation}>📍 {reservation.location}</Text>
                        )}
                        {reservation.endTime && (
                          <Text style={styles.timelineEndTime}>〜 {reservation.endTime}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.timelineEmpty}>
                <Text style={styles.timelineEmptyText}>予定なし</Text>
              </View>
            )}
          </View>
        );
      })}

      <TouchableOpacity style={styles.addButton} onPress={onAddReservation}>
        <Text style={styles.addButtonText}>＋ 予約を追加</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// 予約一覧タブ
const ReservationsTab: React.FC<{
  trip: Trip;
  reservations: Reservation[];
  onAddReservation: () => void;
  onDeleteReservation: (reservation: Reservation) => void;
}> = ({ trip, reservations, onAddReservation, onDeleteReservation }) => {
  const sortedReservations = useMemo(() => {
    return [...reservations]
      .filter(r => r.tripId === trip.id)
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.time.localeCompare(b.time);
      });
  }, [reservations, trip.id]);

  const groupedByType = useMemo(() => {
    const groups: { [key: string]: Reservation[] } = {};
    sortedReservations.forEach(r => {
      if (!groups[r.type]) groups[r.type] = [];
      groups[r.type].push(r);
    });
    return groups;
  }, [sortedReservations]);

  const handleDelete = (reservation: Reservation) => {
    Alert.alert(
      '予約を削除',
      `「${reservation.title}」を削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: () => onDeleteReservation(reservation) },
      ]
    );
  };

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.addButton} onPress={onAddReservation}>
        <Text style={styles.addButtonText}>＋ 予約を追加</Text>
      </TouchableOpacity>

      {Object.entries(groupedByType).map(([typeId, items]) => {
        const type = getReservationType(typeId);
        return (
          <View key={typeId}>
            <View style={styles.reservationTypeHeader}>
              <Text style={styles.reservationTypeIcon}>{type.icon}</Text>
              <Text style={styles.reservationTypeName}>{type.name}</Text>
              <Text style={styles.reservationTypeCount}>{items.length}件</Text>
            </View>

            {items.map(reservation => (
              <TouchableOpacity
                key={reservation.id}
                style={styles.reservationCard}
                onLongPress={() => handleDelete(reservation)}
              >
                <View style={[styles.reservationBorder, { backgroundColor: type.color }]} />
                <View style={styles.reservationContent}>
                  <Text style={styles.reservationTitle}>{reservation.title}</Text>
                  <Text style={styles.reservationDate}>
                    📅 {formatFullDate(reservation.date)} {reservation.time}
                    {reservation.endDate && ` 〜 ${formatFullDate(reservation.endDate)}`}
                  </Text>
                  {reservation.location && (
                    <Text style={styles.reservationLocation}>📍 {reservation.location}</Text>
                  )}
                  {reservation.confirmationNumber && (
                    <Text style={styles.reservationConfirm}>
                      🔖 確認番号: {reservation.confirmationNumber}
                    </Text>
                  )}
                  {reservation.amount > 0 && (
                    <Text style={styles.reservationAmount}>
                      💰 {formatCurrency(reservation.amount)}
                    </Text>
                  )}
                  {reservation.notes && (
                    <Text style={styles.reservationNotes}>📝 {reservation.notes}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        );
      })}

      {sortedReservations.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>予約がありません</Text>
          <Text style={styles.emptyText}>
            航空券やホテルの{'\n'}予約を追加しましょう
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

// 持ち物チェックリストタブ
const PackingTab: React.FC<{
  trip: Trip;
  packingItems: PackingItem[];
  onToggleItem: (item: PackingItem) => void;
  onAddItem: (category: string, name: string) => void;
  onDeleteItem: (item: PackingItem) => void;
  onAddDefaultItems: () => void;
}> = ({ trip, packingItems, onToggleItem, onAddItem, onDeleteItem, onAddDefaultItems }) => {
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const tripItems = packingItems.filter(item => item.tripId === trip.id);
  
  const groupedItems = useMemo(() => {
    const groups: { [key: string]: PackingItem[] } = {};
    tripItems.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [tripItems]);

  const packedCount = tripItems.filter(item => item.packed).length;
  const totalCount = tripItems.length;
  const progress = totalCount > 0 ? (packedCount / totalCount) * 100 : 0;

  const handleAdd = () => {
    if (newItemCategory.trim() && newItemName.trim()) {
      onAddItem(newItemCategory.trim(), newItemName.trim());
      setNewItemName('');
      setShowAddForm(false);
    }
  };

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* 進捗バー */}
      <View style={styles.packingProgress}>
        <View style={styles.packingProgressHeader}>
          <Text style={styles.packingProgressTitle}>🧳 パッキング進捗</Text>
          <Text style={styles.packingProgressCount}>
            {packedCount} / {totalCount}
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress}%`, backgroundColor: progress === 100 ? COLORS.success : COLORS.primary },
            ]}
          />
        </View>
        {progress === 100 && (
          <Text style={styles.packingComplete}>✅ 準備完了！</Text>
        )}
      </View>

      {/* カテゴリ別リスト */}
      {Object.entries(groupedItems).map(([category, items]) => (
        <View key={category} style={styles.packingCategory}>
          <Text style={styles.packingCategoryTitle}>{category}</Text>
          {items.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.packingItem}
              onPress={() => onToggleItem(item)}
              onLongPress={() => {
                Alert.alert(
                  'アイテムを削除',
                  `「${item.name}」を削除しますか？`,
                  [
                    { text: 'キャンセル', style: 'cancel' },
                    { text: '削除', style: 'destructive', onPress: () => onDeleteItem(item) },
                  ]
                );
              }}
            >
              <View style={[styles.packingCheckbox, item.packed && styles.packingCheckboxChecked]}>
                {item.packed && <Text style={styles.packingCheckmark}>✓</Text>}
              </View>
              <Text style={[styles.packingItemName, item.packed && styles.packingItemNameChecked]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}

      {/* アイテム追加フォーム */}
      {showAddForm ? (
        <View style={styles.addItemForm}>
          <TextInput
            style={styles.addItemInput}
            placeholder="カテゴリ（例: 衣類）"
            value={newItemCategory}
            onChangeText={setNewItemCategory}
            placeholderTextColor={COLORS.gray}
          />
          <TextInput
            style={styles.addItemInput}
            placeholder="アイテム名"
            value={newItemName}
            onChangeText={setNewItemName}
            placeholderTextColor={COLORS.gray}
          />
          <View style={styles.addItemButtons}>
            <TouchableOpacity
              style={styles.addItemCancel}
              onPress={() => setShowAddForm(false)}
            >
              <Text style={styles.addItemCancelText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addItemConfirm} onPress={handleAdd}>
              <Text style={styles.addItemConfirmText}>追加</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.packingActions}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddForm(true)}
          >
            <Text style={styles.addButtonText}>＋ アイテムを追加</Text>
          </TouchableOpacity>
          
          {tripItems.length === 0 && (
            <TouchableOpacity
              style={[styles.addButton, styles.addDefaultButton]}
              onPress={onAddDefaultItems}
            >
              <Text style={styles.addButtonText}>📦 基本アイテムを追加</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {tripItems.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🧳</Text>
          <Text style={styles.emptyTitle}>持ち物リストが空です</Text>
          <Text style={styles.emptyText}>
            パッキングリストを作成して{'\n'}忘れ物を防ぎましょう
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

// 予算管理タブ
const BudgetTab: React.FC<{
  trip: Trip;
  budget: TripBudget;
  onSetBudget: (amount: number) => void;
  onAddExpense: () => void;
  onDeleteExpense: (expense: Expense) => void;
}> = ({ trip, budget, onSetBudget, onAddExpense, onDeleteExpense }) => {
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(budget.totalBudget.toString());

  const totalExpenses = budget.expenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = budget.totalBudget - totalExpenses;
  const usagePercent = budget.totalBudget > 0 
    ? Math.min((totalExpenses / budget.totalBudget) * 100, 100) 
    : 0;

  const expensesByCategory = useMemo(() => {
    const groups: { [key: string]: number } = {};
    budget.expenses.forEach(e => {
      groups[e.category] = (groups[e.category] || 0) + e.amount;
    });
    return groups;
  }, [budget.expenses]);

  const handleSaveBudget = () => {
    const amount = parseInt(budgetInput) || 0;
    onSetBudget(amount);
    setEditingBudget(false);
  };

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* 予算サマリー */}
      <View style={styles.budgetSummary}>
        <Text style={styles.budgetSummaryTitle}>💰 旅行予算</Text>
        
        {editingBudget ? (
          <View style={styles.budgetEditForm}>
            <TextInput
              style={styles.budgetInput}
              value={budgetInput}
              onChangeText={setBudgetInput}
              keyboardType="numeric"
              placeholder="予算額"
              placeholderTextColor={COLORS.gray}
            />
            <TouchableOpacity style={styles.budgetSaveButton} onPress={handleSaveBudget}>
              <Text style={styles.budgetSaveButtonText}>保存</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setEditingBudget(true)}>
            <Text style={styles.budgetTotal}>{formatCurrency(budget.totalBudget)}</Text>
            <Text style={styles.budgetEditHint}>タップして編集</Text>
          </TouchableOpacity>
        )}

        <View style={styles.budgetStats}>
          <View style={styles.budgetStatItem}>
            <Text style={styles.budgetStatLabel}>使用済み</Text>
            <Text style={[styles.budgetStatValue, { color: COLORS.danger }]}>
              {formatCurrency(totalExpenses)}
            </Text>
          </View>
          <View style={styles.budgetStatItem}>
            <Text style={styles.budgetStatLabel}>残り</Text>
            <Text style={[styles.budgetStatValue, { color: remaining >= 0 ? COLORS.success : COLORS.danger }]}>
              {formatCurrency(remaining)}
            </Text>
          </View>
        </View>

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${usagePercent}%`,
                backgroundColor: usagePercent > 80 ? COLORS.danger : COLORS.primary,
              },
            ]}
          />
        </View>
        <Text style={styles.budgetPercent}>{usagePercent.toFixed(0)}% 使用</Text>
      </View>

      {/* カテゴリ別支出 */}
      {Object.keys(expensesByCategory).length > 0 && (
        <View style={styles.categoryBreakdown}>
          <Text style={styles.sectionTitle}>📊 カテゴリ別</Text>
          {Object.entries(expensesByCategory)
            .sort((a, b) => b[1] - a[1])
            .map(([categoryId, amount]) => {
              const category = getExpenseCategory(categoryId);
              const percent = budget.totalBudget > 0 ? (amount / budget.totalBudget) * 100 : 0;
              return (
                <View key={categoryId} style={styles.categoryItem}>
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <View style={styles.categoryBar}>
                    <View
                      style={[styles.categoryBarFill, { width: `${percent}%` }]}
                    />
                  </View>
                  <Text style={styles.categoryAmount}>{formatCurrency(amount)}</Text>
                </View>
              );
            })}
        </View>
      )}

      {/* 支出追加ボタン */}
      <TouchableOpacity style={styles.addButton} onPress={onAddExpense}>
        <Text style={styles.addButtonText}>＋ 支出を追加</Text>
      </TouchableOpacity>

      {/* 支出履歴 */}
      {budget.expenses.length > 0 && (
        <View style={styles.expenseList}>
          <Text style={styles.sectionTitle}>📝 支出履歴</Text>
          {budget.expenses
            .sort((a, b) => b.createdAt - a.createdAt)
            .map(expense => {
              const category = getExpenseCategory(expense.category);
              return (
                <TouchableOpacity
                  key={expense.id}
                  style={styles.expenseItem}
                  onLongPress={() => {
                    Alert.alert(
                      '支出を削除',
                      `「${expense.description}」を削除しますか？`,
                      [
                        { text: 'キャンセル', style: 'cancel' },
                        { text: '削除', style: 'destructive', onPress: () => onDeleteExpense(expense) },
                      ]
                    );
                  }}
                >
                  <Text style={styles.expenseIcon}>{category.icon}</Text>
                  <View style={styles.expenseDetails}>
                    <Text style={styles.expenseDescription}>{expense.description}</Text>
                    <Text style={styles.expenseDate}>{formatFullDate(expense.date)}</Text>
                  </View>
                  <Text style={styles.expenseAmount}>{formatCurrency(expense.amount)}</Text>
                </TouchableOpacity>
              );
            })}
        </View>
      )}
    </ScrollView>
  );
};

// 旅行作成モーダル
const CreateTripModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSave: (trip: Omit<Trip, 'id' | 'createdAt'>) => void;
}> = ({ visible, onClose, onSave }) => {
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [coverEmoji, setCoverEmoji] = useState('✈️');
  const [notes, setNotes] = useState('');

  const emojis = ['✈️', '🏖️', '🗻', '🏰', '🎢', '🗼', '🌴', '🎿', '🚢', '🏕️', '🌸', '🗽'];

  const handleSave = () => {
    if (!destination.trim() || !startDate || !endDate) {
      Alert.alert('エラー', '行き先と日程を入力してください');
      return;
    }
    if (startDate > endDate) {
      Alert.alert('エラー', '終了日は開始日より後にしてください');
      return;
    }
    onSave({
      destination: destination.trim(),
      startDate,
      endDate,
      coverEmoji,
      notes: notes.trim(),
    });
    // Reset form
    setDestination('');
    setStartDate('');
    setEndDate('');
    setCoverEmoji('✈️');
    setNotes('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>✈️ 新しい旅行</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>行き先</Text>
            <TextInput
              style={styles.textInput}
              value={destination}
              onChangeText={setDestination}
              placeholder="例: ハワイ、京都、パリ"
              placeholderTextColor={COLORS.gray}
            />

            <Text style={styles.inputLabel}>アイコン</Text>
            <View style={styles.emojiPicker}>
              {emojis.map(emoji => (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.emojiOption, coverEmoji === emoji && styles.emojiOptionSelected]}
                  onPress={() => setCoverEmoji(emoji)}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>開始日 (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.textInput}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="2025-03-01"
              placeholderTextColor={COLORS.gray}
            />

            <Text style={styles.inputLabel}>終了日 (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.textInput}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="2025-03-07"
              placeholderTextColor={COLORS.gray}
            />

            <Text style={styles.inputLabel}>メモ（任意）</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="旅行の目的やメモなど"
              placeholderTextColor={COLORS.gray}
              multiline
              numberOfLines={3}
            />
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalCancelButton} onPress={onClose}>
              <Text style={styles.modalCancelText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSaveButton} onPress={handleSave}>
              <Text style={styles.modalSaveText}>作成</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// 予約追加モーダル
const AddReservationModal: React.FC<{
  visible: boolean;
  trip: Trip | null;
  onClose: () => void;
  onSave: (reservation: Omit<Reservation, 'id' | 'tripId' | 'createdAt'>) => void;
}> = ({ visible, trip, onClose, onSave }) => {
  const [type, setType] = useState('flight');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [amount, setAmount] = useState('');

  const handleSave = () => {
    if (!title.trim() || !date || !time) {
      Alert.alert('エラー', 'タイトル、日付、時間を入力してください');
      return;
    }
    onSave({
      type,
      title: title.trim(),
      date,
      time,
      endDate: endDate || undefined,
      endTime: endTime || undefined,
      location: location.trim(),
      confirmationNumber: confirmationNumber.trim(),
      notes: notes.trim(),
      amount: parseInt(amount) || 0,
    });
    // Reset form
    setType('flight');
    setTitle('');
    setDate('');
    setTime('');
    setEndDate('');
    setEndTime('');
    setLocation('');
    setConfirmationNumber('');
    setNotes('');
    setAmount('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>📋 予約を追加</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>種類</Text>
            <View style={styles.typeSelector}>
              {RESERVATION_TYPES.map(t => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.typeOption, type === t.id && { backgroundColor: t.color }]}
                  onPress={() => setType(t.id)}
                >
                  <Text style={styles.typeIcon}>{t.icon}</Text>
                  <Text style={[styles.typeName, type === t.id && styles.typeNameSelected]}>
                    {t.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>タイトル</Text>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder="例: JAL 成田→ホノルル"
              placeholderTextColor={COLORS.gray}
            />

            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>日付</Text>
                <TextInput
                  style={styles.textInput}
                  value={date}
                  onChangeText={setDate}
                  placeholder="2025-03-01"
                  placeholderTextColor={COLORS.gray}
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>時間</Text>
                <TextInput
                  style={styles.textInput}
                  value={time}
                  onChangeText={setTime}
                  placeholder="10:00"
                  placeholderTextColor={COLORS.gray}
                />
              </View>
            </View>

            {(type === 'hotel' || type === 'car') && (
              <View style={styles.rowInputs}>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>終了日</Text>
                  <TextInput
                    style={styles.textInput}
                    value={endDate}
                    onChangeText={setEndDate}
                    placeholder="2025-03-07"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>チェックアウト</Text>
                  <TextInput
                    style={styles.textInput}
                    value={endTime}
                    onChangeText={setEndTime}
                    placeholder="11:00"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
              </View>
            )}

            <Text style={styles.inputLabel}>場所</Text>
            <TextInput
              style={styles.textInput}
              value={location}
              onChangeText={setLocation}
              placeholder="ホテル名、空港など"
              placeholderTextColor={COLORS.gray}
            />

            <Text style={styles.inputLabel}>確認番号（任意）</Text>
            <TextInput
              style={styles.textInput}
              value={confirmationNumber}
              onChangeText={setConfirmationNumber}
              placeholder="ABC123456"
              placeholderTextColor={COLORS.gray}
            />

            <Text style={styles.inputLabel}>金額（任意）</Text>
            <TextInput
              style={styles.textInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="50000"
              placeholderTextColor={COLORS.gray}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>メモ（任意）</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="座席番号、部屋タイプなど"
              placeholderTextColor={COLORS.gray}
              multiline
              numberOfLines={2}
            />
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalCancelButton} onPress={onClose}>
              <Text style={styles.modalCancelText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSaveButton} onPress={handleSave}>
              <Text style={styles.modalSaveText}>追加</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// 支出追加モーダル
const AddExpenseModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSave: (expense: Omit<Expense, 'id' | 'tripId' | 'createdAt'>) => void;
}> = ({ visible, onClose, onSave }) => {
  const [category, setCategory] = useState('food');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSave = () => {
    if (!amount || parseInt(amount) <= 0) {
      Alert.alert('エラー', '金額を入力してください');
      return;
    }
    onSave({
      category,
      amount: parseInt(amount),
      description: description.trim() || getExpenseCategory(category).name,
      date,
    });
    setCategory('food');
    setAmount('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>💰 支出を追加</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>カテゴリ</Text>
            <View style={styles.categorySelector}>
              {EXPENSE_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryOption, category === cat.id && styles.categoryOptionSelected]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Text style={styles.categoryOptionIcon}>{cat.icon}</Text>
                  <Text style={[styles.categoryOptionName, category === cat.id && styles.categoryOptionNameSelected]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>金額</Text>
            <TextInput
              style={styles.textInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="1000"
              placeholderTextColor={COLORS.gray}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>説明（任意）</Text>
            <TextInput
              style={styles.textInput}
              value={description}
              onChangeText={setDescription}
              placeholder="ランチ代など"
              placeholderTextColor={COLORS.gray}
            />

            <Text style={styles.inputLabel}>日付</Text>
            <TextInput
              style={styles.textInput}
              value={date}
              onChangeText={setDate}
              placeholder="2025-03-01"
              placeholderTextColor={COLORS.gray}
            />
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalCancelButton} onPress={onClose}>
              <Text style={styles.modalCancelText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSaveButton} onPress={handleSave}>
              <Text style={styles.modalSaveText}>追加</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ===== メインコンポーネント =====
const TravelScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('trips');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [packingItems, setPackingItems] = useState<PackingItem[]>([]);
  const [budgets, setBudgets] = useState<{ [tripId: string]: TripBudget }>({});

  // モーダル状態
  const [showCreateTrip, setShowCreateTrip] = useState(false);
  const [showAddReservation, setShowAddReservation] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);

  // データ読み込み
  const loadData = useCallback(async () => {
    try {
      const [tripsData, reservationsData, packingData, budgetsData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.trips),
        AsyncStorage.getItem(STORAGE_KEYS.reservations),
        AsyncStorage.getItem(STORAGE_KEYS.packingLists),
        AsyncStorage.getItem(STORAGE_KEYS.budgets),
      ]);

      if (tripsData) setTrips(JSON.parse(tripsData));
      if (reservationsData) setReservations(JSON.parse(reservationsData));
      if (packingData) setPackingItems(JSON.parse(packingData));
      if (budgetsData) setBudgets(JSON.parse(budgetsData));
    } catch (error) {
      console.error('Failed to load travel data:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // データ保存
  const saveTrips = async (newTrips: Trip[]) => {
    setTrips(newTrips);
    await AsyncStorage.setItem(STORAGE_KEYS.trips, JSON.stringify(newTrips));
  };

  const saveReservations = async (newReservations: Reservation[]) => {
    setReservations(newReservations);
    await AsyncStorage.setItem(STORAGE_KEYS.reservations, JSON.stringify(newReservations));
  };

  const savePackingItems = async (newItems: PackingItem[]) => {
    setPackingItems(newItems);
    await AsyncStorage.setItem(STORAGE_KEYS.packingLists, JSON.stringify(newItems));
  };

  const saveBudgets = async (newBudgets: { [tripId: string]: TripBudget }) => {
    setBudgets(newBudgets);
    await AsyncStorage.setItem(STORAGE_KEYS.budgets, JSON.stringify(newBudgets));
  };

  // 旅行操作
  const handleCreateTrip = (tripData: Omit<Trip, 'id' | 'createdAt'>) => {
    const newTrip: Trip = {
      ...tripData,
      id: generateId(),
      createdAt: Date.now(),
    };
    saveTrips([...trips, newTrip]);
    
    // 初期予算を作成
    const newBudgets = {
      ...budgets,
      [newTrip.id]: { tripId: newTrip.id, totalBudget: 0, expenses: [] },
    };
    saveBudgets(newBudgets);
  };

  const handleSelectTrip = (trip: Trip) => {
    setSelectedTrip(trip);
    setActiveTab('timeline');
  };

  const handleDeleteTrip = (trip: Trip) => {
    // 旅行と関連データを削除
    saveTrips(trips.filter(t => t.id !== trip.id));
    saveReservations(reservations.filter(r => r.tripId !== trip.id));
    savePackingItems(packingItems.filter(p => p.tripId !== trip.id));
    
    const newBudgets = { ...budgets };
    delete newBudgets[trip.id];
    saveBudgets(newBudgets);

    if (selectedTrip?.id === trip.id) {
      setSelectedTrip(null);
      setActiveTab('trips');
    }
  };

  // 予約操作
  const handleAddReservation = (reservationData: Omit<Reservation, 'id' | 'tripId' | 'createdAt'>) => {
    if (!selectedTrip) return;
    const newReservation: Reservation = {
      ...reservationData,
      id: generateId(),
      tripId: selectedTrip.id,
      createdAt: Date.now(),
    };
    saveReservations([...reservations, newReservation]);
  };

  const handleDeleteReservation = (reservation: Reservation) => {
    saveReservations(reservations.filter(r => r.id !== reservation.id));
  };

  // 持ち物操作
  const handleTogglePackingItem = (item: PackingItem) => {
    const newItems = packingItems.map(i =>
      i.id === item.id ? { ...i, packed: !i.packed } : i
    );
    savePackingItems(newItems);
  };

  const handleAddPackingItem = (category: string, name: string) => {
    if (!selectedTrip) return;
    const newItem: PackingItem = {
      id: generateId(),
      tripId: selectedTrip.id,
      name,
      category,
      packed: false,
    };
    savePackingItems([...packingItems, newItem]);
  };

  const handleDeletePackingItem = (item: PackingItem) => {
    savePackingItems(packingItems.filter(i => i.id !== item.id));
  };

  const handleAddDefaultPackingItems = () => {
    if (!selectedTrip) return;
    const newItems: PackingItem[] = [];
    DEFAULT_PACKING_ITEMS.forEach(cat => {
      cat.items.forEach(itemName => {
        newItems.push({
          id: generateId(),
          tripId: selectedTrip.id,
          name: itemName,
          category: cat.category,
          packed: false,
        });
      });
    });
    savePackingItems([...packingItems, ...newItems]);
  };

  // 予算操作
  const handleSetBudget = (amount: number) => {
    if (!selectedTrip) return;
    const currentBudget = budgets[selectedTrip.id] || {
      tripId: selectedTrip.id,
      totalBudget: 0,
      expenses: [],
    };
    const newBudgets = {
      ...budgets,
      [selectedTrip.id]: { ...currentBudget, totalBudget: amount },
    };
    saveBudgets(newBudgets);
  };

  const handleAddExpense = (expenseData: Omit<Expense, 'id' | 'tripId' | 'createdAt'>) => {
    if (!selectedTrip) return;
    const newExpense: Expense = {
      ...expenseData,
      id: generateId(),
      tripId: selectedTrip.id,
      createdAt: Date.now(),
    };
    const currentBudget = budgets[selectedTrip.id] || {
      tripId: selectedTrip.id,
      totalBudget: 0,
      expenses: [],
    };
    const newBudgets = {
      ...budgets,
      [selectedTrip.id]: {
        ...currentBudget,
        expenses: [...currentBudget.expenses, newExpense],
      },
    };
    saveBudgets(newBudgets);
  };

  const handleDeleteExpense = (expense: Expense) => {
    if (!selectedTrip) return;
    const currentBudget = budgets[selectedTrip.id];
    if (!currentBudget) return;
    const newBudgets = {
      ...budgets,
      [selectedTrip.id]: {
        ...currentBudget,
        expenses: currentBudget.expenses.filter(e => e.id !== expense.id),
      },
    };
    saveBudgets(newBudgets);
  };

  // 現在の旅行の予算
  const currentBudget = selectedTrip
    ? budgets[selectedTrip.id] || { tripId: selectedTrip.id, totalBudget: 0, expenses: [] }
    : { tripId: '', totalBudget: 0, expenses: [] };

  // 現在の旅行の予約
  const currentReservations = selectedTrip
    ? reservations.filter(r => r.tripId === selectedTrip.id)
    : [];

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        {selectedTrip && activeTab !== 'trips' ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setSelectedTrip(null);
              setActiveTab('trips');
            }}
          >
            <Text style={styles.backButtonText}>← 旅行一覧</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.headerTitle}>✈️ 旅行計画</Text>
        )}
      </View>

      {/* タブバー */}
      <TabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasSelectedTrip={!!selectedTrip}
      />

      {/* コンテンツ */}
      {activeTab === 'trips' && (
        <TripsTab
          trips={trips}
          reservations={reservations}
          onSelectTrip={handleSelectTrip}
          onCreateTrip={() => setShowCreateTrip(true)}
          onDeleteTrip={handleDeleteTrip}
        />
      )}

      {activeTab === 'timeline' && selectedTrip && (
        <TimelineTab
          trip={selectedTrip}
          reservations={currentReservations}
          onAddReservation={() => setShowAddReservation(true)}
        />
      )}

      {activeTab === 'reservations' && selectedTrip && (
        <ReservationsTab
          trip={selectedTrip}
          reservations={currentReservations}
          onAddReservation={() => setShowAddReservation(true)}
          onDeleteReservation={handleDeleteReservation}
        />
      )}

      {activeTab === 'packing' && selectedTrip && (
        <PackingTab
          trip={selectedTrip}
          packingItems={packingItems}
          onToggleItem={handleTogglePackingItem}
          onAddItem={handleAddPackingItem}
          onDeleteItem={handleDeletePackingItem}
          onAddDefaultItems={handleAddDefaultPackingItems}
        />
      )}

      {activeTab === 'budget' && selectedTrip && (
        <BudgetTab
          trip={selectedTrip}
          budget={currentBudget}
          onSetBudget={handleSetBudget}
          onAddExpense={() => setShowAddExpense(true)}
          onDeleteExpense={handleDeleteExpense}
        />
      )}

      {/* モーダル */}
      <CreateTripModal
        visible={showCreateTrip}
        onClose={() => setShowCreateTrip(false)}
        onSave={handleCreateTrip}
      />

      <AddReservationModal
        visible={showAddReservation}
        trip={selectedTrip}
        onClose={() => setShowAddReservation(false)}
        onSave={handleAddReservation}
      />

      <AddExpenseModal
        visible={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        onSave={handleAddExpense}
      />
    </View>
  );
};

// ===== スタイル =====
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  backButton: {
    paddingVertical: 4,
  },
  backButtonText: {
    fontSize: 16,
    color: COLORS.white,
  },

  // タブバー
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabDisabled: {
    opacity: 0.4,
  },
  tabIcon: {
    fontSize: 20,
  },
  tabIconDisabled: {
    opacity: 0.5,
  },
  tabLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 4,
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  tabLabelDisabled: {
    color: COLORS.lightGray,
  },

  // タブコンテンツ
  tabContent: {
    flex: 1,
    padding: 16,
  },

  // セクションタイトル
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    marginTop: 20,
    marginBottom: 12,
  },

  // 旅行カード
  tripCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  tripEmoji: {
    fontSize: 40,
    marginRight: 12,
  },
  tripInfo: {
    flex: 1,
  },
  tripDestination: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 4,
  },
  tripDates: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 2,
  },
  tripMeta: {
    fontSize: 12,
    color: COLORS.gray,
  },
  tripBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tripBadgeOngoing: {
    backgroundColor: COLORS.success,
  },
  tripBadgePast: {
    backgroundColor: COLORS.gray,
  },
  tripBadgeText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
  },

  // 作成ボタン
  createButton: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  createButtonIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  createButtonText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // 追加ボタン
  addButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginVertical: 8,
  },
  addDefaultButton: {
    backgroundColor: COLORS.primaryLight,
  },
  addButtonText: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: '600',
  },

  // 空状態
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
  },

  // 旅行ヘッダーバナー
  tripHeaderBanner: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  tripHeaderEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  tripHeaderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  tripHeaderDates: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
  },

  // タイムライン
  timelineDay: {
    marginBottom: 16,
  },
  timelineDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  timelineDayHeaderToday: {
    backgroundColor: COLORS.primaryLight,
  },
  timelineDayNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginRight: 8,
  },
  timelineDayDate: {
    fontSize: 14,
    color: COLORS.black,
  },
  timelineDayDateToday: {
    color: COLORS.white,
    fontWeight: '600',
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginLeft: 16,
    marginBottom: 12,
  },
  timelineTime: {
    width: 50,
  },
  timelineTimeText: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  timelineLine: {
    width: 2,
    height: '100%',
    marginHorizontal: 8,
    minHeight: 60,
    borderRadius: 1,
  },
  timelineContent: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
  },
  timelineIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  timelineIconText: {
    fontSize: 18,
  },
  timelineDetails: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 4,
  },
  timelineLocation: {
    fontSize: 12,
    color: COLORS.gray,
  },
  timelineEndTime: {
    fontSize: 12,
    color: COLORS.gray,
  },
  timelineEmpty: {
    marginLeft: 74,
    paddingVertical: 12,
  },
  timelineEmptyText: {
    fontSize: 14,
    color: COLORS.lightGray,
    fontStyle: 'italic',
  },

  // 予約カード
  reservationTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  reservationTypeIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  reservationTypeName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    flex: 1,
  },
  reservationTypeCount: {
    fontSize: 14,
    color: COLORS.gray,
  },
  reservationCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  reservationBorder: {
    width: 4,
  },
  reservationContent: {
    flex: 1,
    padding: 12,
  },
  reservationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 6,
  },
  reservationDate: {
    fontSize: 13,
    color: COLORS.gray,
    marginBottom: 4,
  },
  reservationLocation: {
    fontSize: 13,
    color: COLORS.gray,
    marginBottom: 4,
  },
  reservationConfirm: {
    fontSize: 12,
    color: COLORS.primary,
    marginBottom: 4,
  },
  reservationAmount: {
    fontSize: 14,
    color: COLORS.black,
    fontWeight: '500',
    marginBottom: 4,
  },
  reservationNotes: {
    fontSize: 12,
    color: COLORS.gray,
    fontStyle: 'italic',
  },

  // パッキングリスト
  packingProgress: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  packingProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  packingProgressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
  },
  packingProgressCount: {
    fontSize: 14,
    color: COLORS.gray,
  },
  packingComplete: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
    color: COLORS.success,
    fontWeight: '600',
  },
  packingCategory: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  packingCategoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
  },
  packingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  packingCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  packingCheckboxChecked: {
    backgroundColor: COLORS.primary,
  },
  packingCheckmark: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  packingItemName: {
    fontSize: 14,
    color: COLORS.black,
  },
  packingItemNameChecked: {
    color: COLORS.gray,
    textDecorationLine: 'line-through',
  },
  packingActions: {
    marginTop: 8,
  },
  addItemForm: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  addItemInput: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    fontSize: 14,
    color: COLORS.black,
  },
  addItemButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  addItemCancel: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  addItemCancelText: {
    color: COLORS.gray,
    fontSize: 14,
  },
  addItemConfirm: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addItemConfirmText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },

  // 予算
  budgetSummary: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  budgetSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 8,
  },
  budgetTotal: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    marginVertical: 8,
  },
  budgetEditHint: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 8,
  },
  budgetEditForm: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  budgetInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    marginRight: 8,
    color: COLORS.black,
  },
  budgetSaveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  budgetSaveButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  budgetStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 12,
  },
  budgetStatItem: {
    alignItems: 'center',
  },
  budgetStatLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 4,
  },
  budgetStatValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  budgetPercent: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 8,
  },

  // プログレスバー
  progressBar: {
    height: 8,
    backgroundColor: COLORS.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },

  // カテゴリ内訳
  categoryBreakdown: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIcon: {
    fontSize: 20,
    width: 30,
  },
  categoryName: {
    fontSize: 14,
    color: COLORS.black,
    width: 60,
  },
  categoryBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.lightGray,
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  categoryAmount: {
    fontSize: 14,
    color: COLORS.black,
    fontWeight: '500',
    width: 80,
    textAlign: 'right',
  },

  // 支出リスト
  expenseList: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  expenseIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  expenseDetails: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: 14,
    color: COLORS.black,
  },
  expenseDate: {
    fontSize: 12,
    color: COLORS.gray,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.danger,
  },

  // モーダル
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: COLORS.lightGray,
  },
  modalCancelText: {
    fontSize: 16,
    color: COLORS.gray,
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    marginLeft: 8,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  modalSaveText: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: '600',
  },

  // フォーム
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 8,
    marginTop: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.black,
    backgroundColor: COLORS.white,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },

  // 絵文字ピッカー
  emojiPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emojiOption: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    margin: 4,
    backgroundColor: COLORS.lightGray,
  },
  emojiOptionSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  emojiText: {
    fontSize: 24,
  },

  // タイプセレクター
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    margin: 4,
  },
  typeIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  typeName: {
    fontSize: 12,
    color: COLORS.black,
  },
  typeNameSelected: {
    color: COLORS.white,
  },

  // カテゴリセレクター
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
    margin: 4,
  },
  categoryOptionSelected: {
    backgroundColor: COLORS.primary,
  },
  categoryOptionIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  categoryOptionName: {
    fontSize: 12,
    color: COLORS.black,
  },
  categoryOptionNameSelected: {
    color: COLORS.white,
  },
});

export default TravelScreen;
