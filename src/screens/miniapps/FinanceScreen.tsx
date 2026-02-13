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
  Dimensions,
  Alert,
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
  income: '#4CAF50',
  expense: '#F44336',
};

const CATEGORIES = {
  expense: [
    { id: 'food', name: '食費', icon: '🍚', color: '#FF6B6B' },
    { id: 'dining', name: '外食', icon: '🍽️', color: '#FF8E53' },
    { id: 'transport', name: '交通費', icon: '🚃', color: '#4ECDC4' },
    { id: 'daily', name: '日用品', icon: '🧴', color: '#45B7D1' },
    { id: 'entertainment', name: '娯楽', icon: '🎮', color: '#96CEB4' },
    { id: 'medical', name: '医療', icon: '🏥', color: '#FF6B9D' },
    { id: 'education', name: '教育', icon: '📚', color: '#C9B1FF' },
    { id: 'beauty', name: '美容', icon: '💄', color: '#FFB6C1' },
    { id: 'clothing', name: '衣服', icon: '👕', color: '#DDA0DD' },
    { id: 'housing', name: '住居', icon: '🏠', color: '#98D8C8' },
    { id: 'communication', name: '通信', icon: '📱', color: '#7EC8E3' },
    { id: 'insurance', name: '保険', icon: '🛡️', color: '#B8B8D1' },
    { id: 'tax', name: '税金', icon: '🏛️', color: '#A8A8A8' },
    { id: 'other', name: 'その他', icon: '📦', color: '#CCCCCC' },
  ],
  income: [
    { id: 'salary', name: '給与', icon: '💼', color: '#4CAF50' },
    { id: 'bonus', name: '賞与', icon: '🎁', color: '#66BB6A' },
    { id: 'sidejob', name: '副業', icon: '💻', color: '#81C784' },
    { id: 'investment', name: '投資', icon: '📈', color: '#A5D6A7' },
    { id: 'other_income', name: 'その他', icon: '💰', color: '#C8E6C9' },
  ],
};

const STORAGE_KEY = '@dodo_finance_data';
const BUDGET_KEY = '@dodo_finance_budget';

type TransactionType = 'income' | 'expense';

interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  date: string; // YYYY-MM-DD
  memo: string;
  createdAt: number;
}

interface Budget {
  [categoryId: string]: number;
}

interface MonthlyBudget {
  [monthKey: string]: Budget; // YYYY-MM -> Budget
}

type TabType = 'list' | 'graph' | 'calendar' | 'budget';

// ===== ユーティリティ =====
const formatCurrency = (amount: number): string => {
  return `¥${amount.toLocaleString()}`;
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const getMonthKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

const getCategory = (type: TransactionType, categoryId: string) => {
  const categories = CATEGORIES[type];
  return categories.find(c => c.id === categoryId) || categories[categories.length - 1];
};

// ===== コンポーネント =====

// 収支サマリーカード
const SummaryCard: React.FC<{
  income: number;
  expense: number;
  budget: number;
}> = ({ income, expense, budget }) => {
  const balance = income - expense;
  const budgetRemaining = budget - expense;
  const budgetPercent = budget > 0 ? Math.min((expense / budget) * 100, 100) : 0;

  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>💰 今月の収支</Text>
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>収入</Text>
          <Text style={[styles.summaryValue, { color: COLORS.income }]}>
            {formatCurrency(income)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>支出</Text>
          <Text style={[styles.summaryValue, { color: COLORS.expense }]}>
            {formatCurrency(expense)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>残高</Text>
          <Text style={[styles.summaryValue, { color: balance >= 0 ? COLORS.income : COLORS.expense }]}>
            {formatCurrency(balance)}
          </Text>
        </View>
      </View>
      {budget > 0 && (
        <View style={styles.budgetProgress}>
          <View style={styles.budgetHeader}>
            <Text style={styles.budgetLabel}>予算残り</Text>
            <Text style={[styles.budgetRemaining, { color: budgetRemaining >= 0 ? COLORS.income : COLORS.expense }]}>
              {formatCurrency(budgetRemaining)}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${budgetPercent}%`,
                  backgroundColor: budgetPercent > 80 ? COLORS.danger : COLORS.primary,
                },
              ]}
            />
          </View>
          <Text style={styles.budgetPercent}>{budgetPercent.toFixed(0)}% 使用</Text>
        </View>
      )}
    </View>
  );
};

// タブバー
const TabBar: React.FC<{
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}> = ({ activeTab, onTabChange }) => {
  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'list', label: '一覧', icon: '📋' },
    { key: 'graph', label: 'グラフ', icon: '📊' },
    { key: 'calendar', label: 'カレンダー', icon: '📅' },
    { key: 'budget', label: '予算', icon: '🎯' },
  ];

  return (
    <View style={styles.tabBar}>
      {tabs.map(tab => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.tabActive]}
          onPress={() => onTabChange(tab.key)}
        >
          <Text style={styles.tabIcon}>{tab.icon}</Text>
          <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// 取引リストアイテム
const TransactionItem: React.FC<{
  transaction: Transaction;
  onPress: () => void;
  onDelete: () => void;
}> = ({ transaction, onPress, onDelete }) => {
  const category = getCategory(transaction.type, transaction.categoryId);
  const isIncome = transaction.type === 'income';

  return (
    <TouchableOpacity style={styles.transactionItem} onPress={onPress} onLongPress={onDelete}>
      <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
        <Text style={styles.categoryEmoji}>{category.icon}</Text>
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionCategory}>{category.name}</Text>
        <Text style={styles.transactionMemo}>{transaction.memo || '-'}</Text>
      </View>
      <View style={styles.transactionRight}>
        <Text style={[styles.transactionAmount, { color: isIncome ? COLORS.income : COLORS.expense }]}>
          {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
        </Text>
        <Text style={styles.transactionDate}>{formatDate(transaction.date)}</Text>
      </View>
    </TouchableOpacity>
  );
};

// 一覧タブ
const ListTab: React.FC<{
  transactions: Transaction[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterType: TransactionType | 'all';
  onFilterChange: (type: TransactionType | 'all') => void;
  onTransactionPress: (t: Transaction) => void;
  onTransactionDelete: (id: string) => void;
}> = ({
  transactions,
  searchQuery,
  onSearchChange,
  filterType,
  onFilterChange,
  onTransactionPress,
  onTransactionDelete,
}) => {
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        if (filterType !== 'all' && t.type !== filterType) return false;
        if (searchQuery) {
          const category = getCategory(t.type, t.categoryId);
          const searchLower = searchQuery.toLowerCase();
          return (
            category.name.toLowerCase().includes(searchLower) ||
            t.memo.toLowerCase().includes(searchLower)
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchQuery, filterType]);

  return (
    <View style={styles.tabContent}>
      {/* 検索バー */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 検索..."
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholderTextColor={COLORS.gray}
        />
      </View>

      {/* フィルター */}
      <View style={styles.filterRow}>
        {(['all', 'expense', 'income'] as const).map(type => (
          <TouchableOpacity
            key={type}
            style={[styles.filterButton, filterType === type && styles.filterButtonActive]}
            onPress={() => onFilterChange(type)}
          >
            <Text style={[styles.filterText, filterType === type && styles.filterTextActive]}>
              {type === 'all' ? 'すべて' : type === 'expense' ? '支出' : '収入'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 取引リスト */}
      <FlatList
        data={filteredTransactions}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TransactionItem
            transaction={item}
            onPress={() => onTransactionPress(item)}
            onDelete={() => onTransactionDelete(item.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>取引がありません</Text>
          </View>
        }
      />
    </View>
  );
};

// 円グラフ（SVG不使用のシンプル実装）
const PieChart: React.FC<{
  data: { name: string; value: number; color: string }[];
  total: number;
}> = ({ data, total }) => {
  if (total === 0) {
    return (
      <View style={styles.emptyChart}>
        <Text style={styles.emptyChartText}>データなし</Text>
      </View>
    );
  }

  return (
    <View style={styles.pieChartContainer}>
      <View style={styles.pieChartLegend}>
        {data.slice(0, 6).map((item, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: item.color }]} />
            <Text style={styles.legendText} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.legendValue}>
              {((item.value / total) * 100).toFixed(0)}%
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.pieVisual}>
        {data.map((item, index) => {
          const percent = (item.value / total) * 100;
          return (
            <View key={index} style={styles.pieBar}>
              <View
                style={[
                  styles.pieBarFill,
                  { width: `${percent}%`, backgroundColor: item.color },
                ]}
              />
              <Text style={styles.pieBarLabel}>{item.name}</Text>
              <Text style={styles.pieBarValue}>{formatCurrency(item.value)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// 棒グラフ
const BarChart: React.FC<{
  data: { label: string; income: number; expense: number }[];
}> = ({ data }) => {
  const maxValue = Math.max(...data.flatMap(d => [d.income, d.expense]), 1);

  return (
    <View style={styles.barChartContainer}>
      {data.map((item, index) => (
        <View key={index} style={styles.barGroup}>
          <Text style={styles.barLabel}>{item.label}</Text>
          <View style={styles.barPair}>
            <View style={styles.barWrapper}>
              <View
                style={[
                  styles.bar,
                  styles.barIncome,
                  { height: `${(item.income / maxValue) * 100}%` },
                ]}
              />
            </View>
            <View style={styles.barWrapper}>
              <View
                style={[
                  styles.bar,
                  styles.barExpense,
                  { height: `${(item.expense / maxValue) * 100}%` },
                ]}
              />
            </View>
          </View>
        </View>
      ))}
      <View style={styles.barLegend}>
        <View style={styles.barLegendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.income }]} />
          <Text style={styles.legendLabel}>収入</Text>
        </View>
        <View style={styles.barLegendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.expense }]} />
          <Text style={styles.legendLabel}>支出</Text>
        </View>
      </View>
    </View>
  );
};

// グラフタブ
const GraphTab: React.FC<{
  transactions: Transaction[];
  currentMonth: Date;
}> = ({ transactions, currentMonth }) => {
  const [graphType, setGraphType] = useState<'category' | 'monthly'>('category');

  const categoryData = useMemo(() => {
    const monthKey = getMonthKey(currentMonth);
    const monthTransactions = transactions.filter(
      t => t.date.startsWith(monthKey) && t.type === 'expense'
    );

    const byCategory: { [key: string]: number } = {};
    monthTransactions.forEach(t => {
      byCategory[t.categoryId] = (byCategory[t.categoryId] || 0) + t.amount;
    });

    return Object.entries(byCategory)
      .map(([categoryId, value]) => {
        const category = getCategory('expense', categoryId);
        return { name: category.name, value, color: category.color };
      })
      .sort((a, b) => b.value - a.value);
  }, [transactions, currentMonth]);

  const monthlyData = useMemo(() => {
    const months: { label: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentMonth);
      date.setMonth(date.getMonth() - i);
      const monthKey = getMonthKey(date);
      const monthTransactions = transactions.filter(t => t.date.startsWith(monthKey));

      months.push({
        label: `${date.getMonth() + 1}月`,
        income: monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
        expense: monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
      });
    }
    return months;
  }, [transactions, currentMonth]);

  const totalExpense = categoryData.reduce((sum, d) => sum + d.value, 0);

  return (
    <ScrollView style={styles.tabContent}>
      {/* グラフ切り替え */}
      <View style={styles.graphToggle}>
        <TouchableOpacity
          style={[styles.toggleButton, graphType === 'category' && styles.toggleActive]}
          onPress={() => setGraphType('category')}
        >
          <Text style={[styles.toggleText, graphType === 'category' && styles.toggleTextActive]}>
            カテゴリ別
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, graphType === 'monthly' && styles.toggleActive]}
          onPress={() => setGraphType('monthly')}
        >
          <Text style={[styles.toggleText, graphType === 'monthly' && styles.toggleTextActive]}>
            月別推移
          </Text>
        </TouchableOpacity>
      </View>

      {graphType === 'category' ? (
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>📊 カテゴリ別支出</Text>
          <PieChart data={categoryData} total={totalExpense} />
        </View>
      ) : (
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>📈 月別収支推移</Text>
          <BarChart data={monthlyData} />
        </View>
      )}
    </ScrollView>
  );
};

// カレンダータブ
const CalendarTab: React.FC<{
  transactions: Transaction[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onDayPress: (date: string) => void;
}> = ({ transactions, currentMonth, onMonthChange, onDayPress }) => {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const dailyTotals = useMemo(() => {
    const totals: { [date: string]: { income: number; expense: number } } = {};
    const monthKey = getMonthKey(currentMonth);
    transactions
      .filter(t => t.date.startsWith(monthKey))
      .forEach(t => {
        if (!totals[t.date]) {
          totals[t.date] = { income: 0, expense: 0 };
        }
        if (t.type === 'income') {
          totals[t.date].income += t.amount;
        } else {
          totals[t.date].expense += t.amount;
        }
      });
    return totals;
  }, [transactions, currentMonth]);

  const days = [];
  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  // 空白の日を追加
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
  }

  // 日付を追加
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayData = dailyTotals[dateStr];
    const isToday =
      new Date().toDateString() === new Date(year, month, day).toDateString();

    days.push(
      <TouchableOpacity
        key={day}
        style={[styles.calendarDay, isToday && styles.calendarDayToday]}
        onPress={() => onDayPress(dateStr)}
      >
        <Text style={[styles.calendarDayText, isToday && styles.calendarDayTextToday]}>
          {day}
        </Text>
        {dayData && (
          <View style={styles.calendarDayAmounts}>
            {dayData.income > 0 && (
              <Text style={styles.calendarIncome}>+{(dayData.income / 1000).toFixed(0)}k</Text>
            )}
            {dayData.expense > 0 && (
              <Text style={styles.calendarExpense}>-{(dayData.expense / 1000).toFixed(0)}k</Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  }

  const prevMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    onMonthChange(newDate);
  };

  const nextMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    onMonthChange(newDate);
  };

  return (
    <View style={styles.tabContent}>
      {/* 月選択 */}
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={prevMonth} style={styles.monthArrow}>
          <Text style={styles.monthArrowText}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {year}年{month + 1}月
        </Text>
        <TouchableOpacity onPress={nextMonth} style={styles.monthArrow}>
          <Text style={styles.monthArrowText}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* 曜日ヘッダー */}
      <View style={styles.weekDaysRow}>
        {weekDays.map((day, index) => (
          <View key={day} style={styles.weekDay}>
            <Text
              style={[
                styles.weekDayText,
                index === 0 && styles.sundayText,
                index === 6 && styles.saturdayText,
              ]}
            >
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* カレンダーグリッド */}
      <View style={styles.calendarGrid}>{days}</View>
    </View>
  );
};

// 予算タブ
const BudgetTab: React.FC<{
  transactions: Transaction[];
  budget: Budget;
  onBudgetChange: (categoryId: string, amount: number) => void;
  currentMonth: Date;
}> = ({ transactions, budget, onBudgetChange, currentMonth }) => {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');

  const categorySpending = useMemo(() => {
    const monthKey = getMonthKey(currentMonth);
    const spending: { [key: string]: number } = {};
    transactions
      .filter(t => t.date.startsWith(monthKey) && t.type === 'expense')
      .forEach(t => {
        spending[t.categoryId] = (spending[t.categoryId] || 0) + t.amount;
      });
    return spending;
  }, [transactions, currentMonth]);

  const totalBudget = Object.values(budget).reduce((sum, b) => sum + b, 0);
  const totalSpent = Object.values(categorySpending).reduce((sum, s) => sum + s, 0);

  const handleSaveBudget = () => {
    if (editingCategory && editAmount) {
      onBudgetChange(editingCategory, parseInt(editAmount) || 0);
    }
    setEditingCategory(null);
    setEditAmount('');
  };

  return (
    <ScrollView style={styles.tabContent}>
      {/* 予算サマリー */}
      <View style={styles.budgetSummary}>
        <Text style={styles.budgetSummaryTitle}>🎯 今月の予算</Text>
        <View style={styles.budgetSummaryRow}>
          <View style={styles.budgetSummaryItem}>
            <Text style={styles.budgetSummaryLabel}>予算合計</Text>
            <Text style={styles.budgetSummaryValue}>{formatCurrency(totalBudget)}</Text>
          </View>
          <View style={styles.budgetSummaryItem}>
            <Text style={styles.budgetSummaryLabel}>使用済み</Text>
            <Text style={[styles.budgetSummaryValue, { color: COLORS.expense }]}>
              {formatCurrency(totalSpent)}
            </Text>
          </View>
          <View style={styles.budgetSummaryItem}>
            <Text style={styles.budgetSummaryLabel}>残り</Text>
            <Text
              style={[
                styles.budgetSummaryValue,
                { color: totalBudget - totalSpent >= 0 ? COLORS.income : COLORS.expense },
              ]}
            >
              {formatCurrency(totalBudget - totalSpent)}
            </Text>
          </View>
        </View>
      </View>

      {/* カテゴリ別予算 */}
      <Text style={styles.sectionTitle}>カテゴリ別予算設定</Text>
      {CATEGORIES.expense.map(category => {
        const budgetAmount = budget[category.id] || 0;
        const spent = categorySpending[category.id] || 0;
        const percent = budgetAmount > 0 ? Math.min((spent / budgetAmount) * 100, 100) : 0;
        const isOverBudget = spent > budgetAmount && budgetAmount > 0;

        return (
          <View key={category.id} style={styles.budgetItem}>
            <View style={styles.budgetItemHeader}>
              <View style={styles.budgetItemLeft}>
                <Text style={styles.budgetItemIcon}>{category.icon}</Text>
                <Text style={styles.budgetItemName}>{category.name}</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setEditingCategory(category.id);
                  setEditAmount(budgetAmount.toString());
                }}
              >
                <Text style={styles.budgetItemAmount}>
                  {budgetAmount > 0 ? formatCurrency(budgetAmount) : '設定する'}
                </Text>
              </TouchableOpacity>
            </View>

            {budgetAmount > 0 && (
              <View style={styles.budgetItemProgress}>
                <View style={styles.budgetProgressBar}>
                  <View
                    style={[
                      styles.budgetProgressFill,
                      {
                        width: `${percent}%`,
                        backgroundColor: isOverBudget ? COLORS.danger : COLORS.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.budgetSpent, isOverBudget && { color: COLORS.danger }]}>
                  {formatCurrency(spent)} / {formatCurrency(budgetAmount)}
                </Text>
              </View>
            )}
          </View>
        );
      })}

      {/* 予算編集モーダル */}
      <Modal visible={editingCategory !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>予算を設定</Text>
            <TextInput
              style={styles.modalInput}
              value={editAmount}
              onChangeText={setEditAmount}
              keyboardType="numeric"
              placeholder="金額を入力"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setEditingCategory(null)}
              >
                <Text style={styles.modalButtonText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveBudget}
              >
                <Text style={[styles.modalButtonText, { color: COLORS.white }]}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

// 取引追加/編集モーダル
const TransactionModal: React.FC<{
  visible: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
}> = ({ visible, transaction, onClose, onSave }) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('food');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [memo, setMemo] = useState('');

  React.useEffect(() => {
    if (transaction) {
      setType(transaction.type);
      setAmount(transaction.amount.toString());
      setCategoryId(transaction.categoryId);
      setDate(transaction.date);
      setMemo(transaction.memo);
    } else {
      setType('expense');
      setAmount('');
      setCategoryId('food');
      setDate(new Date().toISOString().split('T')[0]);
      setMemo('');
    }
  }, [transaction, visible]);

  const handleSave = () => {
    if (!amount || parseInt(amount) <= 0) {
      Alert.alert('エラー', '金額を入力してください');
      return;
    }
    onSave({
      type,
      amount: parseInt(amount),
      categoryId,
      date,
      memo,
    });
  };

  const categories = CATEGORIES[type];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.transactionModal}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalCancel}>キャンセル</Text>
          </TouchableOpacity>
          <Text style={styles.modalHeaderTitle}>
            {transaction ? '取引を編集' : '取引を追加'}
          </Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.modalSave}>保存</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody}>
          {/* 収入/支出切り替え */}
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[styles.typeButton, type === 'expense' && styles.typeButtonExpense]}
              onPress={() => {
                setType('expense');
                setCategoryId('food');
              }}
            >
              <Text style={[styles.typeButtonText, type === 'expense' && { color: COLORS.white }]}>
                支出
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, type === 'income' && styles.typeButtonIncome]}
              onPress={() => {
                setType('income');
                setCategoryId('salary');
              }}
            >
              <Text style={[styles.typeButtonText, type === 'income' && { color: COLORS.white }]}>
                収入
              </Text>
            </TouchableOpacity>
          </View>

          {/* 金額入力 */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>金額</Text>
            <View style={styles.amountInput}>
              <Text style={styles.currencySymbol}>¥</Text>
              <TextInput
                style={styles.amountTextInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={COLORS.lightGray}
              />
            </View>
          </View>

          {/* カテゴリ選択 */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>カテゴリ</Text>
            <View style={styles.categoryGrid}>
              {categories.map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryButton,
                    categoryId === category.id && { backgroundColor: category.color + '30' },
                  ]}
                  onPress={() => setCategoryId(category.id)}
                >
                  <Text style={styles.categoryButtonIcon}>{category.icon}</Text>
                  <Text
                    style={[
                      styles.categoryButtonText,
                      categoryId === category.id && { color: category.color },
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 日付入力 */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>日付</Text>
            <TextInput
              style={styles.textInput}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
            />
          </View>

          {/* メモ入力 */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>メモ</Text>
            <TextInput
              style={[styles.textInput, styles.memoInput]}
              value={memo}
              onChangeText={setMemo}
              placeholder="メモを入力..."
              multiline
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

// 日別詳細モーダル
const DayDetailModal: React.FC<{
  visible: boolean;
  date: string;
  transactions: Transaction[];
  onClose: () => void;
}> = ({ visible, date, transactions, onClose }) => {
  const dayTransactions = transactions.filter(t => t.date === date);
  const totalIncome = dayTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = dayTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.dayDetailOverlay}>
        <View style={styles.dayDetailContent}>
          <View style={styles.dayDetailHeader}>
            <Text style={styles.dayDetailTitle}>{date}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.dayDetailClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.dayDetailSummary}>
            <Text style={[styles.dayDetailAmount, { color: COLORS.income }]}>
              収入: {formatCurrency(totalIncome)}
            </Text>
            <Text style={[styles.dayDetailAmount, { color: COLORS.expense }]}>
              支出: {formatCurrency(totalExpense)}
            </Text>
          </View>

          <FlatList
            data={dayTransactions}
            keyExtractor={item => item.id}
            renderItem={({ item }) => {
              const category = getCategory(item.type, item.categoryId);
              return (
                <View style={styles.dayDetailItem}>
                  <Text style={styles.dayDetailIcon}>{category.icon}</Text>
                  <View style={styles.dayDetailInfo}>
                    <Text style={styles.dayDetailCategory}>{category.name}</Text>
                    <Text style={styles.dayDetailMemo}>{item.memo || '-'}</Text>
                  </View>
                  <Text
                    style={[
                      styles.dayDetailItemAmount,
                      { color: item.type === 'income' ? COLORS.income : COLORS.expense },
                    ]}
                  >
                    {item.type === 'income' ? '+' : '-'}
                    {formatCurrency(item.amount)}
                  </Text>
                </View>
              );
            }}
            ListEmptyComponent={
              <Text style={styles.dayDetailEmpty}>取引がありません</Text>
            }
          />
        </View>
      </View>
    </Modal>
  );
};

// ===== メインコンポーネント =====
const FinanceScreen: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budget, setBudget] = useState<Budget>({});
  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // データ読み込み
  const loadData = async () => {
    try {
      const [transData, budgetData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(BUDGET_KEY),
      ]);
      if (transData) setTransactions(JSON.parse(transData));
      if (budgetData) {
        const monthlyBudget: MonthlyBudget = JSON.parse(budgetData);
        const monthKey = getMonthKey(currentMonth);
        setBudget(monthlyBudget[monthKey] || {});
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  // データ保存
  const saveTransactions = async (newTransactions: Transaction[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newTransactions));
      setTransactions(newTransactions);
    } catch (error) {
      console.error('Failed to save transactions:', error);
    }
  };

  const saveBudget = async (newBudget: Budget) => {
    try {
      const budgetData = await AsyncStorage.getItem(BUDGET_KEY);
      const monthlyBudget: MonthlyBudget = budgetData ? JSON.parse(budgetData) : {};
      const monthKey = getMonthKey(currentMonth);
      monthlyBudget[monthKey] = newBudget;
      await AsyncStorage.setItem(BUDGET_KEY, JSON.stringify(monthlyBudget));
      setBudget(newBudget);
    } catch (error) {
      console.error('Failed to save budget:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [currentMonth])
  );

  // 月間サマリー計算
  const monthlySummary = useMemo(() => {
    const monthKey = getMonthKey(currentMonth);
    const monthTransactions = transactions.filter(t => t.date.startsWith(monthKey));
    const income = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalBudget = Object.values(budget).reduce((sum, b) => sum + b, 0);
    return { income, expense, budget: totalBudget };
  }, [transactions, budget, currentMonth]);

  // 取引の保存
  const handleSaveTransaction = (data: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (editingTransaction) {
      // 編集
      const updated = transactions.map(t =>
        t.id === editingTransaction.id
          ? { ...t, ...data }
          : t
      );
      saveTransactions(updated);
    } else {
      // 新規追加
      const newTransaction: Transaction = {
        ...data,
        id: Date.now().toString(),
        createdAt: Date.now(),
      };
      saveTransactions([...transactions, newTransaction]);
    }
    setShowTransactionModal(false);
    setEditingTransaction(null);
  };

  // 取引の削除
  const handleDeleteTransaction = (id: string) => {
    Alert.alert('削除確認', 'この取引を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => {
          const updated = transactions.filter(t => t.id !== id);
          saveTransactions(updated);
        },
      },
    ]);
  };

  // 予算の更新
  const handleBudgetChange = (categoryId: string, amount: number) => {
    const newBudget = { ...budget, [categoryId]: amount };
    saveBudget(newBudget);
  };

  // FABの追加ボタン
  const handleAddPress = () => {
    setEditingTransaction(null);
    setShowTransactionModal(true);
  };

  // 取引の編集
  const handleTransactionPress = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowTransactionModal(true);
  };

  return (
    <View style={styles.container}>
      {/* 収支サマリー */}
      <SummaryCard
        income={monthlySummary.income}
        expense={monthlySummary.expense}
        budget={monthlySummary.budget}
      />

      {/* タブバー */}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* タブコンテンツ */}
      {activeTab === 'list' && (
        <ListTab
          transactions={transactions}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterType={filterType}
          onFilterChange={setFilterType}
          onTransactionPress={handleTransactionPress}
          onTransactionDelete={handleDeleteTransaction}
        />
      )}
      {activeTab === 'graph' && (
        <GraphTab transactions={transactions} currentMonth={currentMonth} />
      )}
      {activeTab === 'calendar' && (
        <CalendarTab
          transactions={transactions}
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
          onDayPress={setSelectedDate}
        />
      )}
      {activeTab === 'budget' && (
        <BudgetTab
          transactions={transactions}
          budget={budget}
          onBudgetChange={handleBudgetChange}
          currentMonth={currentMonth}
        />
      )}

      {/* FABボタン */}
      <TouchableOpacity style={styles.fab} onPress={handleAddPress}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* 取引追加/編集モーダル */}
      <TransactionModal
        visible={showTransactionModal}
        transaction={editingTransaction}
        onClose={() => {
          setShowTransactionModal(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
      />

      {/* 日別詳細モーダル */}
      <DayDetailModal
        visible={selectedDate !== null}
        date={selectedDate || ''}
        transactions={transactions}
        onClose={() => setSelectedDate(null)}
      />
    </View>
  );
};

// ===== スタイル =====
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // サマリーカード
  summaryCard: {
    backgroundColor: COLORS.white,
    margin: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  budgetProgress: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  budgetLabel: {
    fontSize: 12,
    color: COLORS.gray,
  },
  budgetRemaining: {
    fontSize: 14,
    fontWeight: 'bold',
  },
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
  budgetPercent: {
    fontSize: 10,
    color: COLORS.gray,
    marginTop: 4,
    textAlign: 'right',
  },

  // タブバー
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: COLORS.primary + '20',
  },
  tabIcon: {
    fontSize: 16,
  },
  tabLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 2,
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },

  // タブコンテンツ
  tabContent: {
    flex: 1,
    marginTop: 8,
  },

  // 検索バー
  searchBar: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchInput: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },

  // フィルター
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.white,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  filterTextActive: {
    color: COLORS.white,
  },

  // 取引リスト
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryEmoji: {
    fontSize: 20,
  },
  transactionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  transactionCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
  },
  transactionMemo: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionDate: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 2,
  },

  // 空状態
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray,
  },

  // グラフ
  graphToggle: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleActive: {
    backgroundColor: COLORS.primary,
  },
  toggleText: {
    fontSize: 13,
    color: COLORS.gray,
  },
  toggleTextActive: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  chartSection: {
    backgroundColor: COLORS.white,
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 16,
  },
  emptyChart: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    color: COLORS.gray,
  },
  pieChartContainer: {
    paddingVertical: 8,
  },
  pieChartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '45%',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.black,
  },
  legendValue: {
    fontSize: 11,
    color: COLORS.gray,
  },
  pieVisual: {
    gap: 8,
  },
  pieBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    backgroundColor: COLORS.lightGray + '40',
    borderRadius: 4,
    overflow: 'hidden',
  },
  pieBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 4,
  },
  pieBarLabel: {
    marginLeft: 8,
    fontSize: 12,
    color: COLORS.black,
    zIndex: 1,
  },
  pieBarValue: {
    position: 'absolute',
    right: 8,
    fontSize: 12,
    color: COLORS.black,
    fontWeight: '600',
  },

  // 棒グラフ
  barChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 180,
    paddingTop: 20,
  },
  barGroup: {
    flex: 1,
    alignItems: 'center',
  },
  barLabel: {
    fontSize: 10,
    color: COLORS.gray,
    marginTop: 8,
  },
  barPair: {
    flexDirection: 'row',
    height: 120,
    alignItems: 'flex-end',
    gap: 4,
  },
  barWrapper: {
    width: 16,
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  barIncome: {
    backgroundColor: COLORS.income,
  },
  barExpense: {
    backgroundColor: COLORS.expense,
  },
  barLegend: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
  },
  barLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendLabel: {
    fontSize: 10,
    color: COLORS.gray,
  },

  // カレンダー
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  monthArrow: {
    padding: 8,
  },
  monthArrowText: {
    fontSize: 16,
    color: COLORS.primary,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    marginHorizontal: 24,
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 4,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  sundayText: {
    color: COLORS.danger,
  },
  saturdayText: {
    color: '#4A90D9',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 4,
  },
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 4,
    alignItems: 'center',
  },
  calendarDayToday: {
    backgroundColor: COLORS.primary + '20',
    borderRadius: 8,
  },
  calendarDayText: {
    fontSize: 14,
    color: COLORS.black,
  },
  calendarDayTextToday: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  calendarDayAmounts: {
    alignItems: 'center',
    marginTop: 2,
  },
  calendarIncome: {
    fontSize: 8,
    color: COLORS.income,
    fontWeight: '600',
  },
  calendarExpense: {
    fontSize: 8,
    color: COLORS.expense,
    fontWeight: '600',
  },

  // 予算
  budgetSummary: {
    backgroundColor: COLORS.white,
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  budgetSummaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 12,
  },
  budgetSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  budgetSummaryItem: {
    alignItems: 'center',
  },
  budgetSummaryLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginBottom: 4,
  },
  budgetSummaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
    marginLeft: 16,
    marginBottom: 8,
    marginTop: 8,
  },
  budgetItem: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
  },
  budgetItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  budgetItemIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  budgetItemName: {
    fontSize: 14,
    color: COLORS.black,
  },
  budgetItemAmount: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  budgetItemProgress: {
    marginTop: 8,
  },
  budgetProgressBar: {
    height: 6,
    backgroundColor: COLORS.lightGray,
    borderRadius: 3,
    overflow: 'hidden',
  },
  budgetProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  budgetSpent: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 4,
    textAlign: 'right',
  },

  // モーダル共通
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    width: SCREEN_WIDTH - 64,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: COLORS.lightGray,
  },
  modalButtonSave: {
    backgroundColor: COLORS.primary,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // 取引モーダル
  transactionModal: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  modalCancel: {
    fontSize: 14,
    color: COLORS.gray,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  modalSave: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  modalBody: {
    flex: 1,
    padding: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  typeButtonExpense: {
    backgroundColor: COLORS.expense,
  },
  typeButtonIncome: {
    backgroundColor: COLORS.income,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 8,
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 24,
    color: COLORS.gray,
    marginRight: 4,
  },
  amountTextInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.black,
    paddingVertical: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    width: (SCREEN_WIDTH - 48 - 24) / 4,
    aspectRatio: 1,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  categoryButtonIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  categoryButtonText: {
    fontSize: 10,
    color: COLORS.gray,
    textAlign: 'center',
  },
  textInput: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  memoInput: {
    height: 80,
    textAlignVertical: 'top',
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: COLORS.white,
    lineHeight: 32,
  },

  // 日別詳細モーダル
  dayDetailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dayDetailContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    padding: 20,
  },
  dayDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dayDetailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  dayDetailClose: {
    fontSize: 20,
    color: COLORS.gray,
    padding: 4,
  },
  dayDetailSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    marginBottom: 16,
  },
  dayDetailAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  dayDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  dayDetailIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  dayDetailInfo: {
    flex: 1,
  },
  dayDetailCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
  },
  dayDetailMemo: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  dayDetailItemAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  dayDetailEmpty: {
    textAlign: 'center',
    color: COLORS.gray,
    paddingVertical: 20,
  },
});

export default FinanceScreen;
