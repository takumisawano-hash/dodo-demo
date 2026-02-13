import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  FlatList,
  Dimensions,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

// ==================== 型定義 ====================
type ViewMode = 'month' | 'week' | 'day';
type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
type ReminderType = 'none' | '5min' | '15min' | '30min' | '1hour' | '1day';

interface CalendarEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
  location: string;
  memo: string;
  color: string;
  recurrence: RecurrenceType;
  reminder: ReminderType;
}

// ==================== 定数 ====================
const COLORS = [
  { id: 'red', color: '#E53935', name: '赤' },
  { id: 'orange', color: '#FF6B35', name: 'オレンジ' },
  { id: 'yellow', color: '#FDD835', name: '黄' },
  { id: 'green', color: '#43A047', name: '緑' },
  { id: 'blue', color: '#1E88E5', name: '青' },
  { id: 'purple', color: '#8E24AA', name: '紫' },
  { id: 'pink', color: '#EC407A', name: 'ピンク' },
  { id: 'gray', color: '#757575', name: 'グレー' },
];

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: 'none', label: '繰り返しなし' },
  { value: 'daily', label: '毎日' },
  { value: 'weekly', label: '毎週' },
  { value: 'monthly', label: '毎月' },
  { value: 'yearly', label: '毎年' },
];

const REMINDER_OPTIONS: { value: ReminderType; label: string }[] = [
  { value: 'none', label: 'なし' },
  { value: '5min', label: '5分前' },
  { value: '15min', label: '15分前' },
  { value: '30min', label: '30分前' },
  { value: '1hour', label: '1時間前' },
  { value: '1day', label: '1日前' },
];

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ==================== ユーティリティ関数 ====================
const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const weekday = WEEKDAYS[date.getDay()];
  return `${y}年${m}月${d}日（${weekday}）`;
};

const formatTime = (date: Date): string => {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};

const formatShortDate = (date: Date): string => {
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const isSameDay = (d1: Date, d2: Date): boolean => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

const getMonthDays = (year: number, month: number): Date[] => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];

  // 前月の日付を追加（週の始まりを日曜日に）
  const startPadding = firstDay.getDay();
  for (let i = startPadding - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }

  // 当月の日付
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  // 次月の日付を追加（6行になるように）
  const endPadding = 42 - days.length;
  for (let i = 1; i <= endPadding; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
};

const getWeekDays = (date: Date): Date[] => {
  const days: Date[] = [];
  const day = date.getDay();
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - day);

  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    days.push(d);
  }

  return days;
};

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// サンプルデータ
const createSampleEvents = (): CalendarEvent[] => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  return [
    {
      id: '1',
      title: 'チームミーティング',
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0),
      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0),
      isAllDay: false,
      location: '会議室A',
      memo: '週次報告',
      color: '#1E88E5',
      recurrence: 'weekly',
      reminder: '15min',
    },
    {
      id: '2',
      title: 'ランチ',
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0),
      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 13, 0),
      isAllDay: false,
      location: '',
      memo: '',
      color: '#43A047',
      recurrence: 'none',
      reminder: 'none',
    },
    {
      id: '3',
      title: '歯医者',
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0),
      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0),
      isAllDay: false,
      location: '田中歯科医院',
      memo: '定期検診',
      color: '#E53935',
      recurrence: 'none',
      reminder: '1hour',
    },
    {
      id: '4',
      title: '誕生日',
      startDate: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0),
      endDate: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59),
      isAllDay: true,
      location: '',
      memo: '田中さんの誕生日',
      color: '#EC407A',
      recurrence: 'yearly',
      reminder: '1day',
    },
    {
      id: '5',
      title: 'プロジェクト締切',
      startDate: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 18, 0),
      endDate: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 18, 0),
      isAllDay: false,
      location: '',
      memo: '提出物確認',
      color: '#FF6B35',
      recurrence: 'none',
      reminder: '1hour',
    },
  ];
};

// ==================== コンポーネント ====================

// 今日・明日のサマリー
const UpcomingSummary: React.FC<{
  events: CalendarEvent[];
  onEventPress: (event: CalendarEvent) => void;
}> = ({ events, onEventPress }) => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const todayEvents = events
    .filter((e) => isSameDay(e.startDate, today))
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  const tomorrowEvents = events
    .filter((e) => isSameDay(e.startDate, tomorrow))
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  const renderEventItem = (event: CalendarEvent) => (
    <TouchableOpacity
      key={event.id}
      style={styles.summaryEventItem}
      onPress={() => onEventPress(event)}
    >
      <View style={[styles.summaryEventColor, { backgroundColor: event.color }]} />
      <View style={styles.summaryEventContent}>
        <Text style={styles.summaryEventTime}>
          {event.isAllDay ? '終日' : formatTime(event.startDate)}
        </Text>
        <Text style={styles.summaryEventTitle} numberOfLines={1}>
          {event.title}
        </Text>
      </View>
      {event.recurrence !== 'none' && <Text style={styles.recurrenceIcon}>🔄</Text>}
    </TouchableOpacity>
  );

  return (
    <View style={styles.summaryContainer}>
      {/* 今日 */}
      <View style={styles.summarySection}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>📌 今日</Text>
          <Text style={styles.summaryDate}>{formatShortDate(today)}</Text>
        </View>
        {todayEvents.length > 0 ? (
          todayEvents.map(renderEventItem)
        ) : (
          <Text style={styles.noEventsText}>予定なし ✨</Text>
        )}
      </View>

      {/* 明日 */}
      <View style={styles.summarySection}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>📆 明日</Text>
          <Text style={styles.summaryDate}>{formatShortDate(tomorrow)}</Text>
        </View>
        {tomorrowEvents.length > 0 ? (
          tomorrowEvents.map(renderEventItem)
        ) : (
          <Text style={styles.noEventsText}>予定なし ✨</Text>
        )}
      </View>
    </View>
  );
};

// 月表示カレンダー
const MonthView: React.FC<{
  currentDate: Date;
  events: CalendarEvent[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}> = ({ currentDate, events, selectedDate, onDateSelect }) => {
  const days = getMonthDays(currentDate.getFullYear(), currentDate.getMonth());
  const today = new Date();

  const getEventsForDay = (date: Date) => {
    return events.filter((e) => isSameDay(e.startDate, date));
  };

  return (
    <View style={styles.monthContainer}>
      {/* 曜日ヘッダー */}
      <View style={styles.weekdayHeader}>
        {WEEKDAYS.map((day, index) => (
          <View key={day} style={styles.weekdayCell}>
            <Text
              style={[
                styles.weekdayText,
                index === 0 && styles.sundayText,
                index === 6 && styles.saturdayText,
              ]}
            >
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* 日付グリッド */}
      <View style={styles.daysGrid}>
        {days.map((date, index) => {
          const dayEvents = getEventsForDay(date);
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();
          const isToday = isSameDay(date, today);
          const isSelected = isSameDay(date, selectedDate);
          const dayOfWeek = date.getDay();

          return (
            <TouchableOpacity
              key={index}
              style={[styles.dayCell, isSelected && styles.selectedDayCell]}
              onPress={() => onDateSelect(date)}
            >
              <View style={[styles.dayNumber, isToday && styles.todayNumber]}>
                <Text
                  style={[
                    styles.dayText,
                    !isCurrentMonth && styles.otherMonthText,
                    isToday && styles.todayText,
                    dayOfWeek === 0 && styles.sundayText,
                    dayOfWeek === 6 && styles.saturdayText,
                  ]}
                >
                  {date.getDate()}
                </Text>
              </View>
              {/* イベントドット */}
              <View style={styles.eventDotsContainer}>
                {dayEvents.slice(0, 3).map((event, i) => (
                  <View
                    key={event.id}
                    style={[styles.eventDot, { backgroundColor: event.color }]}
                  />
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// 週表示カレンダー
const WeekView: React.FC<{
  currentDate: Date;
  events: CalendarEvent[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onEventPress: (event: CalendarEvent) => void;
}> = ({ currentDate, events, selectedDate, onDateSelect, onEventPress }) => {
  const days = getWeekDays(currentDate);
  const today = new Date();

  const getEventsForDay = (date: Date) => {
    return events
      .filter((e) => isSameDay(e.startDate, date))
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  };

  return (
    <View style={styles.weekContainer}>
      {/* 曜日・日付ヘッダー */}
      <View style={styles.weekHeader}>
        {days.map((date, index) => {
          const isToday = isSameDay(date, today);
          const isSelected = isSameDay(date, selectedDate);

          return (
            <TouchableOpacity
              key={index}
              style={[styles.weekDayHeader, isSelected && styles.selectedWeekDay]}
              onPress={() => onDateSelect(date)}
            >
              <Text
                style={[
                  styles.weekDayName,
                  index === 0 && styles.sundayText,
                  index === 6 && styles.saturdayText,
                ]}
              >
                {WEEKDAYS[index]}
              </Text>
              <View style={[styles.weekDayNumber, isToday && styles.todayNumber]}>
                <Text style={[styles.weekDayDate, isToday && styles.todayText]}>
                  {date.getDate()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* タイムグリッド */}
      <ScrollView style={styles.weekTimeGrid}>
        {HOURS.map((hour) => (
          <View key={hour} style={styles.weekTimeRow}>
            <Text style={styles.weekTimeLabel}>
              {hour.toString().padStart(2, '0')}:00
            </Text>
            <View style={styles.weekTimeSlots}>
              {days.map((date, dayIndex) => {
                const dayEvents = getEventsForDay(date).filter(
                  (e) => !e.isAllDay && e.startDate.getHours() === hour
                );

                return (
                  <View key={dayIndex} style={styles.weekTimeSlot}>
                    {dayEvents.map((event) => (
                      <TouchableOpacity
                        key={event.id}
                        style={[styles.weekEvent, { backgroundColor: event.color }]}
                        onPress={() => onEventPress(event)}
                      >
                        <Text style={styles.weekEventTitle} numberOfLines={1}>
                          {event.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

// 日表示（タイムライン）
const DayView: React.FC<{
  currentDate: Date;
  events: CalendarEvent[];
  onEventPress: (event: CalendarEvent) => void;
}> = ({ currentDate, events, onEventPress }) => {
  const dayEvents = events
    .filter((e) => isSameDay(e.startDate, currentDate))
    .sort((a, b) => {
      if (a.isAllDay && !b.isAllDay) return -1;
      if (!a.isAllDay && b.isAllDay) return 1;
      return a.startDate.getTime() - b.startDate.getTime();
    });

  const allDayEvents = dayEvents.filter((e) => e.isAllDay);
  const timedEvents = dayEvents.filter((e) => !e.isAllDay);

  return (
    <View style={styles.dayContainer}>
      {/* 終日イベント */}
      {allDayEvents.length > 0 && (
        <View style={styles.allDaySection}>
          <Text style={styles.allDayLabel}>終日</Text>
          <View style={styles.allDayEvents}>
            {allDayEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={[styles.allDayEvent, { backgroundColor: event.color }]}
                onPress={() => onEventPress(event)}
              >
                <Text style={styles.allDayEventTitle}>{event.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* タイムライン */}
      <ScrollView style={styles.timelineContainer}>
        {HOURS.map((hour) => {
          const hourEvents = timedEvents.filter(
            (e) => e.startDate.getHours() === hour
          );

          return (
            <View key={hour} style={styles.timelineRow}>
              <Text style={styles.timelineTime}>
                {hour.toString().padStart(2, '0')}:00
              </Text>
              <View style={styles.timelineContent}>
                <View style={styles.timelineLine} />
                {hourEvents.map((event) => {
                  const durationMinutes =
                    (event.endDate.getTime() - event.startDate.getTime()) / 60000;
                  const height = Math.max(40, (durationMinutes / 60) * 60);

                  return (
                    <TouchableOpacity
                      key={event.id}
                      style={[
                        styles.timelineEvent,
                        { backgroundColor: event.color, minHeight: height },
                      ]}
                      onPress={() => onEventPress(event)}
                    >
                      <Text style={styles.timelineEventTime}>
                        {formatTime(event.startDate)} - {formatTime(event.endDate)}
                      </Text>
                      <Text style={styles.timelineEventTitle}>{event.title}</Text>
                      {event.location && (
                        <Text style={styles.timelineEventLocation}>
                          📍 {event.location}
                        </Text>
                      )}
                      {event.recurrence !== 'none' && (
                        <Text style={styles.timelineEventRecurrence}>
                          🔄{' '}
                          {RECURRENCE_OPTIONS.find((r) => r.value === event.recurrence)?.label}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

// 選択した日のイベント一覧
const SelectedDayEvents: React.FC<{
  date: Date;
  events: CalendarEvent[];
  onEventPress: (event: CalendarEvent) => void;
}> = ({ date, events, onEventPress }) => {
  const dayEvents = events
    .filter((e) => isSameDay(e.startDate, date))
    .sort((a, b) => {
      if (a.isAllDay && !b.isAllDay) return -1;
      if (!a.isAllDay && b.isAllDay) return 1;
      return a.startDate.getTime() - b.startDate.getTime();
    });

  if (dayEvents.length === 0) {
    return (
      <View style={styles.selectedDayEvents}>
        <Text style={styles.selectedDayHeader}>{formatDate(date)}</Text>
        <Text style={styles.noEventsText}>この日の予定はありません</Text>
      </View>
    );
  }

  return (
    <View style={styles.selectedDayEvents}>
      <Text style={styles.selectedDayHeader}>{formatDate(date)}</Text>
      {dayEvents.map((event) => (
        <TouchableOpacity
          key={event.id}
          style={styles.eventCard}
          onPress={() => onEventPress(event)}
        >
          <View style={[styles.eventCardColor, { backgroundColor: event.color }]} />
          <View style={styles.eventCardContent}>
            <Text style={styles.eventCardTitle}>{event.title}</Text>
            <Text style={styles.eventCardTime}>
              {event.isAllDay ? '終日' : `${formatTime(event.startDate)} - ${formatTime(event.endDate)}`}
            </Text>
            {event.location && (
              <Text style={styles.eventCardLocation}>📍 {event.location}</Text>
            )}
          </View>
          <View style={styles.eventCardIcons}>
            {event.recurrence !== 'none' && <Text>🔄</Text>}
            {event.reminder !== 'none' && <Text>🔔</Text>}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// 日時ピッカーモーダル
const DateTimePickerModal: React.FC<{
  visible: boolean;
  value: Date;
  onClose: () => void;
  onSelect: (date: Date) => void;
  mode: 'date' | 'time';
}> = ({ visible, value, onClose, onSelect, mode }) => {
  const [tempDate, setTempDate] = useState(value);
  const [selectedYear, setSelectedYear] = useState(value.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(value.getMonth());
  const [selectedDay, setSelectedDay] = useState(value.getDate());
  const [selectedHour, setSelectedHour] = useState(value.getHours());
  const [selectedMinute, setSelectedMinute] = useState(value.getMinutes());

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i);
  const days = Array.from(
    { length: new Date(selectedYear, selectedMonth + 1, 0).getDate() },
    (_, i) => i + 1
  );
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  const handleConfirm = () => {
    let newDate: Date;
    if (mode === 'date') {
      newDate = new Date(selectedYear, selectedMonth, selectedDay, value.getHours(), value.getMinutes());
    } else {
      newDate = new Date(value.getFullYear(), value.getMonth(), value.getDate(), selectedHour, selectedMinute);
    }
    onSelect(newDate);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.pickerModalOverlay}>
        <View style={styles.pickerModalContent}>
          <View style={styles.pickerModalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.pickerModalCancel}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.pickerModalTitle}>
              {mode === 'date' ? '日付を選択' : '時刻を選択'}
            </Text>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={styles.pickerModalDone}>完了</Text>
            </TouchableOpacity>
          </View>

          {mode === 'date' ? (
            <View style={styles.pickerWheels}>
              <ScrollView style={styles.pickerWheel}>
                {years.map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.pickerItem,
                      selectedYear === year && styles.pickerItemSelected,
                    ]}
                    onPress={() => setSelectedYear(year)}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        selectedYear === year && styles.pickerItemTextSelected,
                      ]}
                    >
                      {year}年
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <ScrollView style={styles.pickerWheel}>
                {months.map((month) => (
                  <TouchableOpacity
                    key={month}
                    style={[
                      styles.pickerItem,
                      selectedMonth === month && styles.pickerItemSelected,
                    ]}
                    onPress={() => setSelectedMonth(month)}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        selectedMonth === month && styles.pickerItemTextSelected,
                      ]}
                    >
                      {month + 1}月
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <ScrollView style={styles.pickerWheel}>
                {days.map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.pickerItem,
                      selectedDay === day && styles.pickerItemSelected,
                    ]}
                    onPress={() => setSelectedDay(day)}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        selectedDay === day && styles.pickerItemTextSelected,
                      ]}
                    >
                      {day}日
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : (
            <View style={styles.pickerWheels}>
              <ScrollView style={styles.pickerWheel}>
                {hours.map((hour) => (
                  <TouchableOpacity
                    key={hour}
                    style={[
                      styles.pickerItem,
                      selectedHour === hour && styles.pickerItemSelected,
                    ]}
                    onPress={() => setSelectedHour(hour)}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        selectedHour === hour && styles.pickerItemTextSelected,
                      ]}
                    >
                      {hour.toString().padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.pickerSeparator}>:</Text>
              <ScrollView style={styles.pickerWheel}>
                {minutes.map((minute) => (
                  <TouchableOpacity
                    key={minute}
                    style={[
                      styles.pickerItem,
                      selectedMinute === minute && styles.pickerItemSelected,
                    ]}
                    onPress={() => setSelectedMinute(minute)}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        selectedMinute === minute && styles.pickerItemTextSelected,
                      ]}
                    >
                      {minute.toString().padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

// イベント作成/編集モーダル
const EventFormModal: React.FC<{
  visible: boolean;
  event?: CalendarEvent | null;
  initialDate?: Date;
  onClose: () => void;
  onSave: (event: CalendarEvent) => void;
  onDelete?: (eventId: string) => void;
}> = ({ visible, event, initialDate, onClose, onSave, onDelete }) => {
  const isEdit = !!event;

  const [title, setTitle] = useState(event?.title || '');
  const [startDate, setStartDate] = useState(event?.startDate || initialDate || new Date());
  const [endDate, setEndDate] = useState(
    event?.endDate || new Date((initialDate || new Date()).getTime() + 60 * 60 * 1000)
  );
  const [isAllDay, setIsAllDay] = useState(event?.isAllDay || false);
  const [location, setLocation] = useState(event?.location || '');
  const [memo, setMemo] = useState(event?.memo || '');
  const [color, setColor] = useState(event?.color || COLORS[1].color);
  const [recurrence, setRecurrence] = useState<RecurrenceType>(event?.recurrence || 'none');
  const [reminder, setReminder] = useState<ReminderType>(event?.reminder || '15min');

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showRecurrencePicker, setShowRecurrencePicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Reset form when modal opens/closes or event changes
  React.useEffect(() => {
    if (visible) {
      setTitle(event?.title || '');
      setStartDate(event?.startDate || initialDate || new Date());
      setEndDate(
        event?.endDate || new Date((initialDate || new Date()).getTime() + 60 * 60 * 1000)
      );
      setIsAllDay(event?.isAllDay || false);
      setLocation(event?.location || '');
      setMemo(event?.memo || '');
      setColor(event?.color || COLORS[1].color);
      setRecurrence(event?.recurrence || 'none');
      setReminder(event?.reminder || '15min');
    }
  }, [visible, event, initialDate]);

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('エラー', 'タイトルを入力してください');
      return;
    }

    const newEvent: CalendarEvent = {
      id: event?.id || generateId(),
      title: title.trim(),
      startDate,
      endDate,
      isAllDay,
      location,
      memo,
      color,
      recurrence,
      reminder,
    };

    onSave(newEvent);
    onClose();
  };

  const handleDelete = () => {
    if (event && onDelete) {
      Alert.alert('予定を削除', 'この予定を削除しますか？', [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            onDelete(event.id);
            onClose();
          },
        },
      ]);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.formModalContainer}>
        {/* ヘッダー */}
        <View style={styles.formModalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.formModalCancel}>キャンセル</Text>
          </TouchableOpacity>
          <Text style={styles.formModalTitle}>{isEdit ? '予定を編集' : '新しい予定'}</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.formModalSave}>保存</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.formContent}>
          {/* タイトル */}
          <View style={styles.formSection}>
            <TextInput
              style={styles.titleInput}
              placeholder="タイトル"
              placeholderTextColor="#999"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* 終日スイッチ */}
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>終日</Text>
            <Switch
              value={isAllDay}
              onValueChange={setIsAllDay}
              trackColor={{ false: '#ddd', true: '#FF6B35' }}
            />
          </View>

          {/* 開始日時 */}
          <View style={styles.formSection}>
            <Text style={styles.formSectionLabel}>開始</Text>
            <View style={styles.dateTimeRow}>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text style={styles.dateTimeButtonText}>{formatDate(startDate)}</Text>
              </TouchableOpacity>
              {!isAllDay && (
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setShowStartTimePicker(true)}
                >
                  <Text style={styles.dateTimeButtonText}>{formatTime(startDate)}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* 終了日時 */}
          <View style={styles.formSection}>
            <Text style={styles.formSectionLabel}>終了</Text>
            <View style={styles.dateTimeRow}>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text style={styles.dateTimeButtonText}>{formatDate(endDate)}</Text>
              </TouchableOpacity>
              {!isAllDay && (
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setShowEndTimePicker(true)}
                >
                  <Text style={styles.dateTimeButtonText}>{formatTime(endDate)}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* 繰り返し */}
          <TouchableOpacity
            style={styles.formRow}
            onPress={() => setShowRecurrencePicker(true)}
          >
            <Text style={styles.formLabel}>🔄 繰り返し</Text>
            <Text style={styles.formValue}>
              {RECURRENCE_OPTIONS.find((r) => r.value === recurrence)?.label}
            </Text>
          </TouchableOpacity>

          {/* リマインダー */}
          <TouchableOpacity
            style={styles.formRow}
            onPress={() => setShowReminderPicker(true)}
          >
            <Text style={styles.formLabel}>🔔 リマインダー</Text>
            <Text style={styles.formValue}>
              {REMINDER_OPTIONS.find((r) => r.value === reminder)?.label}
            </Text>
          </TouchableOpacity>

          {/* 色 */}
          <TouchableOpacity
            style={styles.formRow}
            onPress={() => setShowColorPicker(true)}
          >
            <Text style={styles.formLabel}>🎨 色</Text>
            <View style={styles.colorPreview}>
              <View style={[styles.colorCircle, { backgroundColor: color }]} />
              <Text style={styles.formValue}>
                {COLORS.find((c) => c.color === color)?.name}
              </Text>
            </View>
          </TouchableOpacity>

          {/* 場所 */}
          <View style={styles.formSection}>
            <Text style={styles.formSectionLabel}>📍 場所</Text>
            <TextInput
              style={styles.formInput}
              placeholder="場所を入力"
              placeholderTextColor="#999"
              value={location}
              onChangeText={setLocation}
            />
          </View>

          {/* メモ */}
          <View style={styles.formSection}>
            <Text style={styles.formSectionLabel}>📝 メモ</Text>
            <TextInput
              style={[styles.formInput, styles.memoInput]}
              placeholder="メモを入力"
              placeholderTextColor="#999"
              value={memo}
              onChangeText={setMemo}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* 削除ボタン */}
          {isEdit && onDelete && (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Text style={styles.deleteButtonText}>🗑️ この予定を削除</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* 日時ピッカーモーダル */}
        <DateTimePickerModal
          visible={showStartDatePicker}
          value={startDate}
          mode="date"
          onClose={() => setShowStartDatePicker(false)}
          onSelect={(date) => {
            setStartDate(date);
            if (date > endDate) {
              setEndDate(new Date(date.getTime() + 60 * 60 * 1000));
            }
          }}
        />
        <DateTimePickerModal
          visible={showStartTimePicker}
          value={startDate}
          mode="time"
          onClose={() => setShowStartTimePicker(false)}
          onSelect={(date) => {
            setStartDate(date);
            if (date >= endDate) {
              setEndDate(new Date(date.getTime() + 60 * 60 * 1000));
            }
          }}
        />
        <DateTimePickerModal
          visible={showEndDatePicker}
          value={endDate}
          mode="date"
          onClose={() => setShowEndDatePicker(false)}
          onSelect={setEndDate}
        />
        <DateTimePickerModal
          visible={showEndTimePicker}
          value={endDate}
          mode="time"
          onClose={() => setShowEndTimePicker(false)}
          onSelect={setEndDate}
        />

        {/* 繰り返し選択 */}
        <Modal visible={showRecurrencePicker} transparent animationType="fade">
          <TouchableOpacity
            style={styles.optionModalOverlay}
            activeOpacity={1}
            onPress={() => setShowRecurrencePicker(false)}
          >
            <View style={styles.optionModalContent}>
              <Text style={styles.optionModalTitle}>繰り返し</Text>
              {RECURRENCE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionItem,
                    recurrence === option.value && styles.optionItemSelected,
                  ]}
                  onPress={() => {
                    setRecurrence(option.value);
                    setShowRecurrencePicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.optionItemText,
                      recurrence === option.value && styles.optionItemTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {recurrence === option.value && <Text>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* リマインダー選択 */}
        <Modal visible={showReminderPicker} transparent animationType="fade">
          <TouchableOpacity
            style={styles.optionModalOverlay}
            activeOpacity={1}
            onPress={() => setShowReminderPicker(false)}
          >
            <View style={styles.optionModalContent}>
              <Text style={styles.optionModalTitle}>リマインダー</Text>
              {REMINDER_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionItem,
                    reminder === option.value && styles.optionItemSelected,
                  ]}
                  onPress={() => {
                    setReminder(option.value);
                    setShowReminderPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.optionItemText,
                      reminder === option.value && styles.optionItemTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {reminder === option.value && <Text>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* 色選択 */}
        <Modal visible={showColorPicker} transparent animationType="fade">
          <TouchableOpacity
            style={styles.optionModalOverlay}
            activeOpacity={1}
            onPress={() => setShowColorPicker(false)}
          >
            <View style={styles.optionModalContent}>
              <Text style={styles.optionModalTitle}>色を選択</Text>
              <View style={styles.colorGrid}>
                {COLORS.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.colorOption,
                      { backgroundColor: c.color },
                      color === c.color && styles.colorOptionSelected,
                    ]}
                    onPress={() => {
                      setColor(c.color);
                      setShowColorPicker(false);
                    }}
                  >
                    {color === c.color && <Text style={styles.colorCheck}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
};

// ==================== メインコンポーネント ====================
export default function CalendarScreen() {
  const navigation = useNavigation();

  const [events, setEvents] = useState<CalendarEvent[]>(createSampleEvents);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // ナビゲーション
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(currentDate.getMonth() - 1);
    } else if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() - 7);
    } else {
      newDate.setDate(currentDate.getDate() - 1);
    }
    setCurrentDate(newDate);
    setSelectedDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(currentDate.getMonth() + 1);
    } else if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + 7);
    } else {
      newDate.setDate(currentDate.getDate() + 1);
    }
    setCurrentDate(newDate);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    if (date.getMonth() !== currentDate.getMonth()) {
      setCurrentDate(date);
    }
  };

  const handleEventPress = (event: CalendarEvent) => {
    setEditingEvent(event);
    setShowEventForm(true);
  };

  const handleAddEvent = () => {
    setEditingEvent(null);
    setShowEventForm(true);
  };

  const handleSaveEvent = (event: CalendarEvent) => {
    setEvents((prev) => {
      const existingIndex = prev.findIndex((e) => e.id === event.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = event;
        return updated;
      }
      return [...prev, event];
    });
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  };

  const getHeaderTitle = () => {
    if (viewMode === 'month') {
      return `${currentDate.getFullYear()}年${currentDate.getMonth() + 1}月`;
    } else if (viewMode === 'week') {
      const weekDays = getWeekDays(currentDate);
      return `${formatShortDate(weekDays[0])} - ${formatShortDate(weekDays[6])}`;
    } else {
      return formatDate(currentDate);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📅 予定</Text>
        <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
          <Text style={styles.todayButtonText}>今日</Text>
        </TouchableOpacity>
      </View>

      {/* ビュー切替 */}
      <View style={styles.viewModeSelector}>
        {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[styles.viewModeButton, viewMode === mode && styles.viewModeButtonActive]}
            onPress={() => setViewMode(mode)}
          >
            <Text
              style={[
                styles.viewModeButtonText,
                viewMode === mode && styles.viewModeButtonTextActive,
              ]}
            >
              {mode === 'month' ? '月' : mode === 'week' ? '週' : '日'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 日付ナビゲーション */}
      <View style={styles.dateNavigation}>
        <TouchableOpacity onPress={goToPrevious} style={styles.navButton}>
          <Text style={styles.navButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.currentDateText}>{getHeaderTitle()}</Text>
        <TouchableOpacity onPress={goToNext} style={styles.navButton}>
          <Text style={styles.navButtonText}>›</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 今日・明日のサマリー（月表示時のみ） */}
        {viewMode === 'month' && (
          <UpcomingSummary events={events} onEventPress={handleEventPress} />
        )}

        {/* カレンダービュー */}
        {viewMode === 'month' && (
          <>
            <MonthView
              currentDate={currentDate}
              events={events}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
            />
            <SelectedDayEvents
              date={selectedDate}
              events={events}
              onEventPress={handleEventPress}
            />
          </>
        )}

        {viewMode === 'week' && (
          <WeekView
            currentDate={currentDate}
            events={events}
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            onEventPress={handleEventPress}
          />
        )}

        {viewMode === 'day' && (
          <DayView
            currentDate={selectedDate}
            events={events}
            onEventPress={handleEventPress}
          />
        )}
      </ScrollView>

      {/* 追加ボタン */}
      <TouchableOpacity style={styles.addButton} onPress={handleAddEvent}>
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>

      {/* イベントフォームモーダル */}
      <EventFormModal
        visible={showEventForm}
        event={editingEvent}
        initialDate={selectedDate}
        onClose={() => {
          setShowEventForm(false);
          setEditingEvent(null);
        }}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />
    </SafeAreaView>
  );
}

// ==================== スタイル ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5E6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0e6d9',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#FF6B35',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  todayButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  todayButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  viewModeSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0e6d9',
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: '#f5f5f5',
  },
  viewModeButtonActive: {
    backgroundColor: '#FF6B35',
  },
  viewModeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  viewModeButtonTextActive: {
    color: '#fff',
  },
  dateNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0e6d9',
  },
  navButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 28,
    color: '#FF6B35',
    fontWeight: '300',
  },
  currentDateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
  },

  // サマリー
  summaryContainer: {
    backgroundColor: '#fff',
    margin: 12,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summarySection: {
    marginBottom: 12,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  summaryDate: {
    fontSize: 12,
    color: '#666',
  },
  summaryEventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  summaryEventColor: {
    width: 4,
    height: 24,
    borderRadius: 2,
    marginRight: 10,
  },
  summaryEventContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryEventTime: {
    width: 50,
    fontSize: 12,
    color: '#666',
  },
  summaryEventTitle: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  recurrenceIcon: {
    fontSize: 12,
    marginLeft: 4,
  },
  noEventsText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    paddingVertical: 8,
  },

  // 月表示
  monthContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  weekdayHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0e6d9',
  },
  weekdayCell: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  sundayText: {
    color: '#E53935',
  },
  saturdayText: {
    color: '#1E88E5',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: (SCREEN_WIDTH - 24) / 7,
    height: 52,
    alignItems: 'center',
    paddingTop: 4,
  },
  selectedDayCell: {
    backgroundColor: '#FFF0E6',
  },
  dayNumber: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  todayNumber: {
    backgroundColor: '#FF6B35',
  },
  dayText: {
    fontSize: 14,
    color: '#333',
  },
  otherMonthText: {
    color: '#ccc',
  },
  todayText: {
    color: '#fff',
    fontWeight: '600',
  },
  eventDotsContainer: {
    flexDirection: 'row',
    marginTop: 2,
    height: 8,
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 1,
  },

  // 週表示
  weekContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginHorizontal: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  weekHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0e6d9',
    paddingVertical: 8,
  },
  weekDayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  selectedWeekDay: {
    backgroundColor: '#FFF0E6',
    borderRadius: 8,
  },
  weekDayName: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  weekDayNumber: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  weekDayDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  weekTimeGrid: {
    flex: 1,
    maxHeight: 400,
  },
  weekTimeRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    minHeight: 50,
  },
  weekTimeLabel: {
    width: 50,
    fontSize: 11,
    color: '#999',
    padding: 4,
    textAlign: 'right',
  },
  weekTimeSlots: {
    flex: 1,
    flexDirection: 'row',
  },
  weekTimeSlot: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: '#f5f5f5',
    padding: 2,
  },
  weekEvent: {
    borderRadius: 4,
    padding: 2,
    marginVertical: 1,
  },
  weekEventTitle: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '500',
  },

  // 日表示
  dayContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginHorizontal: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  allDaySection: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0e6d9',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  allDayLabel: {
    width: 50,
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  allDayEvents: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  allDayEvent: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  allDayEventTitle: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  timelineContainer: {
    flex: 1,
    maxHeight: 500,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  timelineTime: {
    width: 50,
    fontSize: 12,
    color: '#999',
    padding: 8,
    textAlign: 'right',
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 8,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#eee',
  },
  timelineEvent: {
    borderRadius: 8,
    padding: 8,
    marginVertical: 4,
    marginRight: 8,
  },
  timelineEventTime: {
    fontSize: 11,
    color: '#fff',
    opacity: 0.9,
  },
  timelineEventTitle: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginTop: 2,
  },
  timelineEventLocation: {
    fontSize: 11,
    color: '#fff',
    opacity: 0.9,
    marginTop: 2,
  },
  timelineEventRecurrence: {
    fontSize: 10,
    color: '#fff',
    opacity: 0.8,
    marginTop: 2,
  },

  // 選択した日のイベント
  selectedDayEvents: {
    margin: 12,
    marginTop: 0,
  },
  selectedDayHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginVertical: 12,
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  eventCardColor: {
    width: 4,
  },
  eventCardContent: {
    flex: 1,
    padding: 12,
  },
  eventCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  eventCardTime: {
    fontSize: 13,
    color: '#666',
  },
  eventCardLocation: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  eventCardIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    gap: 4,
  },

  // 追加ボタン
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addButtonText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
    marginTop: -2,
  },

  // フォームモーダル
  formModalContainer: {
    flex: 1,
    backgroundColor: '#FFF5E6',
  },
  formModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0e6d9',
  },
  formModalCancel: {
    fontSize: 16,
    color: '#666',
  },
  formModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  formModalSave: {
    fontSize: 16,
    color: '#FF6B35',
    fontWeight: '600',
  },
  formContent: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    marginBottom: 20,
  },
  formSectionLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  titleInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#333',
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 15,
    color: '#333',
  },
  formValue: {
    fontSize: 15,
    color: '#666',
  },
  dateTimeRow: {
    flexDirection: 'row',
  },
  dateTimeButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginRight: 8,
  },
  timeButton: {
    width: 80,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  dateTimeButtonText: {
    fontSize: 14,
    color: '#333',
  },
  colorPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  formInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#333',
  },
  memoInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  deleteButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  deleteButtonText: {
    fontSize: 16,
    color: '#E53935',
  },

  // ピッカーモーダル
  pickerModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0e6d9',
  },
  pickerModalCancel: {
    fontSize: 16,
    color: '#666',
  },
  pickerModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  pickerModalDone: {
    fontSize: 16,
    color: '#FF6B35',
    fontWeight: '600',
  },
  pickerWheels: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    height: 200,
  },
  pickerWheel: {
    width: 80,
    maxHeight: 180,
  },
  pickerItem: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  pickerItemSelected: {
    backgroundColor: '#FFF0E6',
    borderRadius: 8,
  },
  pickerItemText: {
    fontSize: 18,
    color: '#666',
  },
  pickerItemTextSelected: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  pickerSeparator: {
    fontSize: 24,
    color: '#333',
    marginHorizontal: 8,
  },

  // オプションモーダル
  optionModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  optionModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  optionModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  optionItemSelected: {
    backgroundColor: '#FFF0E6',
    marginHorizontal: -12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  optionItemText: {
    fontSize: 16,
    color: '#333',
  },
  optionItemTextSelected: {
    color: '#FF6B35',
    fontWeight: '600',
  },

  // 色選択
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#333',
  },
  colorCheck: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
});
