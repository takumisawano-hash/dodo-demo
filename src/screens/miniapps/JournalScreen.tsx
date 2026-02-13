import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Dimensions,
  Alert,
  Image,
  FlatList,
} from 'react-native';

// =====================================================
// 📝 DoDo Life 日記ミニアプリ
// Day One機能80%再現 - フル機能実装
// =====================================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// テーマカラー
const COLORS = {
  primary: '#FF6B35',
  primaryLight: '#FF8A5C',
  primaryDark: '#E55A2B',
  background: '#FFF5E6',
  white: '#FFFFFF',
  text: '#333333',
  textLight: '#666666',
  textMuted: '#999999',
  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  success: '#4CAF50',
  warning: '#FFC107',
  error: '#F44336',
  cardShadow: 'rgba(0,0,0,0.08)',
};

// 気分タグ定義
const MOOD_TAGS = [
  { id: 'great', emoji: '😊', label: '最高', color: '#4CAF50' },
  { id: 'good', emoji: '🙂', label: '良い', color: '#8BC34A' },
  { id: 'neutral', emoji: '😐', label: '普通', color: '#FFC107' },
  { id: 'sad', emoji: '😢', label: '悲しい', color: '#2196F3' },
  { id: 'angry', emoji: '😤', label: '怒り', color: '#F44336' },
  { id: 'anxious', emoji: '😰', label: '不安', color: '#9C27B0' },
  { id: 'tired', emoji: '😴', label: '疲れた', color: '#607D8B' },
  { id: 'excited', emoji: '🤩', label: '興奮', color: '#FF9800' },
  { id: 'grateful', emoji: '🙏', label: '感謝', color: '#E91E63' },
  { id: 'love', emoji: '🥰', label: '愛情', color: '#F06292' },
];

// 活動タグ
const ACTIVITY_TAGS = [
  { id: 'work', emoji: '💼', label: '仕事' },
  { id: 'exercise', emoji: '🏃', label: '運動' },
  { id: 'food', emoji: '🍽️', label: '食事' },
  { id: 'travel', emoji: '✈️', label: '旅行' },
  { id: 'family', emoji: '👨‍👩‍👧', label: '家族' },
  { id: 'friends', emoji: '👥', label: '友人' },
  { id: 'hobby', emoji: '🎨', label: '趣味' },
  { id: 'music', emoji: '🎵', label: '音楽' },
  { id: 'reading', emoji: '📚', label: '読書' },
  { id: 'movie', emoji: '🎬', label: '映画' },
  { id: 'shopping', emoji: '🛍️', label: '買い物' },
  { id: 'nature', emoji: '🌳', label: '自然' },
];

// 天気タグ
const WEATHER_TAGS = [
  { id: 'sunny', emoji: '☀️', label: '晴れ' },
  { id: 'cloudy', emoji: '☁️', label: '曇り' },
  { id: 'rainy', emoji: '🌧️', label: '雨' },
  { id: 'snowy', emoji: '❄️', label: '雪' },
  { id: 'stormy', emoji: '⛈️', label: '雷' },
  { id: 'windy', emoji: '💨', label: '風' },
];

// =====================================================
// 型定義
// =====================================================

interface JournalEntry {
  id: string;
  date: string;
  time: string;
  title: string;
  content: string;
  mood: string | null;
  activities: string[];
  weather: string | null;
  location: string | null;
  photos: string[];
  isFavorite: boolean;
  tags: string[];
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

interface DayStats {
  date: string;
  entryCount: number;
  moods: string[];
  wordCount: number;
}

type ViewMode = 'timeline' | 'calendar' | 'gallery' | 'stats';
type ModalType = 'entry' | 'search' | 'filter' | 'detail' | null;

// =====================================================
// ユーティリティ関数
// =====================================================

const generateId = (): string => Math.random().toString(36).substr(2, 9);

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const formatTime = (date: Date): string => {
  return date.toTimeString().slice(0, 5);
};

const getToday = (): string => formatDate(new Date());

const formatDisplayDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekDay = weekDays[date.getDay()];
  return `${month}月${day}日（${weekDay}）`;
};

const formatFullDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}年${month}月${day}日`;
};

const getRelativeDate = (dateStr: string): string => {
  const today = new Date();
  const date = new Date(dateStr);
  const diffTime = today.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return '今日';
  if (diffDays === 1) return '昨日';
  if (diffDays === 2) return '一昨日';
  if (diffDays < 7) return `${diffDays}日前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}週間前`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}ヶ月前`;
  return `${Math.floor(diffDays / 365)}年前`;
};

const countWords = (text: string): number => {
  // 日本語と英語の単語数をカウント
  const japaneseChars = (text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length;
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
  return japaneseChars + englishWords;
};

const getMoodById = (id: string) => MOOD_TAGS.find(m => m.id === id);
const getActivityById = (id: string) => ACTIVITY_TAGS.find(a => a.id === id);
const getWeatherById = (id: string) => WEATHER_TAGS.find(w => w.id === id);

// =====================================================
// サンプルデータ
// =====================================================

const generateSampleEntries = (): JournalEntry[] => {
  const today = new Date();
  const entries: JournalEntry[] = [];
  
  const sampleContents = [
    {
      title: '素晴らしい一日',
      content: '今日は久しぶりに友人と会った。カフェでゆっくり話して、近況を共有した。やっぱり直接会って話すのは楽しい。\n\n午後は公園を散歩して、夕焼けがとても綺麗だった。明日も頑張ろう。',
      mood: 'great',
      activities: ['friends', 'food'],
      weather: 'sunny',
    },
    {
      title: 'プロジェクト完了！',
      content: '3ヶ月間取り組んでいたプロジェクトがついに完了した。チーム全員で乾杯して、達成感がすごい。\n\n次は新しいチャレンジが待っている。休む間もないけど、成長できている実感がある。',
      mood: 'excited',
      activities: ['work'],
      weather: 'cloudy',
    },
    {
      title: '読書の秋',
      content: '新しい本を3冊購入した。最近は読書時間を確保するのが難しかったけど、今日は2時間も読めた。\n\n知識が増えていく感覚が心地よい。週末は一冊読み切りたい。',
      mood: 'good',
      activities: ['reading', 'shopping'],
      weather: 'rainy',
    },
    {
      title: '家族との時間',
      content: '両親と一緒に夕食を食べた。母の手料理はやっぱり最高。父の仕事の話も面白かった。\n\n家族の大切さを改めて感じた日。感謝の気持ちを忘れないようにしよう。',
      mood: 'grateful',
      activities: ['family', 'food'],
      weather: 'sunny',
    },
    {
      title: '疲れた一日',
      content: '会議が5つもあって、本当に疲れた。話し続けて喉も痛い。\n\nでも、重要な決定がいくつかできたので、前進はしている。明日は少し楽になるといいな。',
      mood: 'tired',
      activities: ['work'],
      weather: 'cloudy',
    },
    {
      title: '新しい趣味',
      content: 'ヨガを始めてみた。体が硬くて最初は辛かったけど、終わった後の爽快感がすごい。\n\n続けられるか不安だけど、まずは週1回から始めてみよう。',
      mood: 'good',
      activities: ['exercise', 'hobby'],
      weather: 'sunny',
    },
  ];
  
  for (let i = 0; i < 20; i++) {
    const daysAgo = Math.floor(Math.random() * 60);
    const entryDate = new Date(today);
    entryDate.setDate(entryDate.getDate() - daysAgo);
    
    const sample = sampleContents[i % sampleContents.length];
    const dateStr = formatDate(entryDate);
    const timeStr = `${String(Math.floor(Math.random() * 14) + 8).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`;
    
    entries.push({
      id: generateId(),
      date: dateStr,
      time: timeStr,
      title: sample.title,
      content: sample.content,
      mood: sample.mood,
      activities: sample.activities,
      weather: sample.weather,
      location: Math.random() > 0.5 ? '東京都渋谷区' : null,
      photos: [],
      isFavorite: Math.random() > 0.7,
      tags: [],
      wordCount: countWords(sample.content),
      createdAt: entryDate.toISOString(),
      updatedAt: entryDate.toISOString(),
    });
  }
  
  return entries.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.time.localeCompare(a.time);
  });
};

// =====================================================
// カレンダーコンポーネント
// =====================================================

interface CalendarProps {
  currentMonth: Date;
  entries: JournalEntry[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onChangeMonth: (direction: -1 | 1) => void;
}

const Calendar: React.FC<CalendarProps> = ({
  currentMonth,
  entries,
  selectedDate,
  onSelectDate,
  onChangeMonth,
}) => {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  
  // 月の最初と最後
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startWeekDay = firstDay.getDay();
  
  // カレンダーの日付配列を生成
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startWeekDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }
  
  // 各日のエントリー数を計算
  const entryCountByDate = useMemo(() => {
    const counts: { [key: string]: { count: number; moods: string[] } } = {};
    entries.forEach(entry => {
      if (!counts[entry.date]) {
        counts[entry.date] = { count: 0, moods: [] };
      }
      counts[entry.date].count++;
      if (entry.mood && !counts[entry.date].moods.includes(entry.mood)) {
        counts[entry.date].moods.push(entry.mood);
      }
    });
    return counts;
  }, [entries]);
  
  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
  
  return (
    <View style={styles.calendarContainer}>
      {/* ヘッダー */}
      <View style={styles.calendarHeader}>
        <TouchableOpacity onPress={() => onChangeMonth(-1)} style={styles.calendarNavBtn}>
          <Text style={styles.calendarNavText}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.calendarTitle}>{year}年{month + 1}月</Text>
        <TouchableOpacity onPress={() => onChangeMonth(1)} style={styles.calendarNavBtn}>
          <Text style={styles.calendarNavText}>▶</Text>
        </TouchableOpacity>
      </View>
      
      {/* 曜日ヘッダー */}
      <View style={styles.calendarWeekHeader}>
        {weekDays.map((day, index) => (
          <View key={day} style={styles.calendarWeekDay}>
            <Text style={[
              styles.calendarWeekDayText,
              index === 0 && styles.sundayText,
              index === 6 && styles.saturdayText,
            ]}>{day}</Text>
          </View>
        ))}
      </View>
      
      {/* 日付グリッド */}
      <View style={styles.calendarGrid}>
        {calendarDays.map((day, index) => {
          if (day === null) {
            return <View key={`empty-${index}`} style={styles.calendarDay} />;
          }
          
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayData = entryCountByDate[dateStr];
          const isSelected = selectedDate === dateStr;
          const isToday = dateStr === getToday();
          const weekDay = (startWeekDay + day - 1) % 7;
          
          return (
            <TouchableOpacity
              key={dateStr}
              style={[
                styles.calendarDay,
                isSelected && styles.calendarDaySelected,
                isToday && styles.calendarDayToday,
              ]}
              onPress={() => onSelectDate(dateStr)}
            >
              <Text style={[
                styles.calendarDayText,
                isSelected && styles.calendarDayTextSelected,
                weekDay === 0 && styles.sundayText,
                weekDay === 6 && styles.saturdayText,
              ]}>{day}</Text>
              
              {dayData && (
                <View style={styles.calendarDayIndicator}>
                  {dayData.moods.slice(0, 3).map((mood, i) => {
                    const moodData = getMoodById(mood);
                    return (
                      <Text key={i} style={styles.calendarDayMood}>
                        {moodData?.emoji || '📝'}
                      </Text>
                    );
                  })}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// =====================================================
// 統計コンポーネント
// =====================================================

interface StatsProps {
  entries: JournalEntry[];
}

const Stats: React.FC<StatsProps> = ({ entries }) => {
  const stats = useMemo(() => {
    const totalEntries = entries.length;
    const totalWords = entries.reduce((sum, e) => sum + e.wordCount, 0);
    const favoriteCount = entries.filter(e => e.isFavorite).length;
    
    // 気分統計
    const moodCounts: { [key: string]: number } = {};
    entries.forEach(e => {
      if (e.mood) {
        moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
      }
    });
    
    // 活動統計
    const activityCounts: { [key: string]: number } = {};
    entries.forEach(e => {
      e.activities.forEach(a => {
        activityCounts[a] = (activityCounts[a] || 0) + 1;
      });
    });
    
    // 連続日数（ストリーク）
    const dates = [...new Set(entries.map(e => e.date))].sort().reverse();
    let currentStreak = 0;
    let today = new Date();
    
    for (let i = 0; i < dates.length; i++) {
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      const expectedDateStr = formatDate(expectedDate);
      
      if (dates.includes(expectedDateStr)) {
        currentStreak++;
      } else {
        break;
      }
    }
    
    // 月間統計
    const thisMonth = new Date().toISOString().slice(0, 7);
    const thisMonthEntries = entries.filter(e => e.date.startsWith(thisMonth));
    
    return {
      totalEntries,
      totalWords,
      favoriteCount,
      moodCounts,
      activityCounts,
      currentStreak,
      thisMonthEntries: thisMonthEntries.length,
      avgWordsPerEntry: totalEntries > 0 ? Math.round(totalWords / totalEntries) : 0,
    };
  }, [entries]);
  
  const topMoods = Object.entries(stats.moodCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
    
  const topActivities = Object.entries(stats.activityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  return (
    <ScrollView style={styles.statsContainer} showsVerticalScrollIndicator={false}>
      {/* 概要カード */}
      <View style={styles.statsOverview}>
        <View style={styles.statsCard}>
          <Text style={styles.statsCardValue}>{stats.totalEntries}</Text>
          <Text style={styles.statsCardLabel}>総エントリー数</Text>
        </View>
        <View style={styles.statsCard}>
          <Text style={styles.statsCardValue}>{stats.currentStreak}</Text>
          <Text style={styles.statsCardLabel}>連続日数 🔥</Text>
        </View>
        <View style={styles.statsCard}>
          <Text style={styles.statsCardValue}>{stats.thisMonthEntries}</Text>
          <Text style={styles.statsCardLabel}>今月の記録</Text>
        </View>
      </View>
      
      {/* 詳細統計 */}
      <View style={styles.statsSection}>
        <Text style={styles.statsSectionTitle}>📊 記録の統計</Text>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>総文字数</Text>
          <Text style={styles.statsValue}>{stats.totalWords.toLocaleString()}文字</Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>平均文字数/エントリー</Text>
          <Text style={styles.statsValue}>{stats.avgWordsPerEntry}文字</Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>お気に入り</Text>
          <Text style={styles.statsValue}>{stats.favoriteCount}件 ⭐</Text>
        </View>
      </View>
      
      {/* 気分ランキング */}
      <View style={styles.statsSection}>
        <Text style={styles.statsSectionTitle}>😊 気分ランキング</Text>
        {topMoods.map(([moodId, count], index) => {
          const mood = getMoodById(moodId);
          if (!mood) return null;
          const percentage = Math.round((count / stats.totalEntries) * 100);
          
          return (
            <View key={moodId} style={styles.statsRankItem}>
              <Text style={styles.statsRankNumber}>{index + 1}</Text>
              <Text style={styles.statsRankEmoji}>{mood.emoji}</Text>
              <Text style={styles.statsRankLabel}>{mood.label}</Text>
              <View style={styles.statsRankBar}>
                <View style={[styles.statsRankBarFill, { width: `${percentage}%`, backgroundColor: mood.color }]} />
              </View>
              <Text style={styles.statsRankValue}>{count}回</Text>
            </View>
          );
        })}
        {topMoods.length === 0 && (
          <Text style={styles.noDataText}>データがありません</Text>
        )}
      </View>
      
      {/* 活動ランキング */}
      <View style={styles.statsSection}>
        <Text style={styles.statsSectionTitle}>🏃 活動ランキング</Text>
        {topActivities.map(([actId, count], index) => {
          const activity = getActivityById(actId);
          if (!activity) return null;
          const percentage = Math.round((count / stats.totalEntries) * 100);
          
          return (
            <View key={actId} style={styles.statsRankItem}>
              <Text style={styles.statsRankNumber}>{index + 1}</Text>
              <Text style={styles.statsRankEmoji}>{activity.emoji}</Text>
              <Text style={styles.statsRankLabel}>{activity.label}</Text>
              <View style={styles.statsRankBar}>
                <View style={[styles.statsRankBarFill, { width: `${percentage}%`, backgroundColor: COLORS.primary }]} />
              </View>
              <Text style={styles.statsRankValue}>{count}回</Text>
            </View>
          );
        })}
        {topActivities.length === 0 && (
          <Text style={styles.noDataText}>データがありません</Text>
        )}
      </View>
      
      <View style={{ height: 100 }} />
    </ScrollView>
  );
};

// =====================================================
// エントリーカードコンポーネント
// =====================================================

interface EntryCardProps {
  entry: JournalEntry;
  onPress: () => void;
  onToggleFavorite: () => void;
  compact?: boolean;
}

const EntryCard: React.FC<EntryCardProps> = ({ entry, onPress, onToggleFavorite, compact = false }) => {
  const mood = entry.mood ? getMoodById(entry.mood) : null;
  const weather = entry.weather ? getWeatherById(entry.weather) : null;
  
  if (compact) {
    return (
      <TouchableOpacity style={styles.entryCardCompact} onPress={onPress}>
        <View style={styles.entryCardCompactLeft}>
          <Text style={styles.entryCardCompactMood}>{mood?.emoji || '📝'}</Text>
        </View>
        <View style={styles.entryCardCompactContent}>
          <Text style={styles.entryCardCompactTitle} numberOfLines={1}>{entry.title}</Text>
          <Text style={styles.entryCardCompactText} numberOfLines={1}>{entry.content}</Text>
        </View>
        <Text style={styles.entryCardCompactTime}>{entry.time}</Text>
      </TouchableOpacity>
    );
  }
  
  return (
    <TouchableOpacity style={styles.entryCard} onPress={onPress} activeOpacity={0.7}>
      {/* ヘッダー */}
      <View style={styles.entryCardHeader}>
        <View style={styles.entryCardMeta}>
          <Text style={styles.entryCardTime}>{entry.time}</Text>
          {weather && <Text style={styles.entryCardWeather}>{weather.emoji}</Text>}
          {entry.location && (
            <Text style={styles.entryCardLocation} numberOfLines={1}>
              📍 {entry.location}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={onToggleFavorite} style={styles.favoriteBtn}>
          <Text style={styles.favoriteBtnText}>{entry.isFavorite ? '⭐' : '☆'}</Text>
        </TouchableOpacity>
      </View>
      
      {/* タイトル & 気分 */}
      <View style={styles.entryCardTitleRow}>
        {mood && (
          <View style={[styles.moodBadge, { backgroundColor: mood.color + '20' }]}>
            <Text style={styles.moodBadgeEmoji}>{mood.emoji}</Text>
            <Text style={[styles.moodBadgeText, { color: mood.color }]}>{mood.label}</Text>
          </View>
        )}
        <Text style={styles.entryCardTitle}>{entry.title}</Text>
      </View>
      
      {/* 本文プレビュー */}
      <Text style={styles.entryCardContent} numberOfLines={3}>
        {entry.content}
      </Text>
      
      {/* 写真プレビュー */}
      {entry.photos.length > 0 && (
        <View style={styles.entryCardPhotos}>
          {entry.photos.slice(0, 3).map((photo, index) => (
            <View key={index} style={styles.entryCardPhoto}>
              <Text style={styles.photoPlaceholder}>🖼️</Text>
            </View>
          ))}
          {entry.photos.length > 3 && (
            <View style={styles.entryCardPhotoMore}>
              <Text style={styles.photoMoreText}>+{entry.photos.length - 3}</Text>
            </View>
          )}
        </View>
      )}
      
      {/* 活動タグ */}
      {entry.activities.length > 0 && (
        <View style={styles.entryCardTags}>
          {entry.activities.map(actId => {
            const activity = getActivityById(actId);
            if (!activity) return null;
            return (
              <View key={actId} style={styles.activityTag}>
                <Text style={styles.activityTagText}>{activity.emoji} {activity.label}</Text>
              </View>
            );
          })}
        </View>
      )}
      
      {/* フッター */}
      <View style={styles.entryCardFooter}>
        <Text style={styles.entryCardWordCount}>{entry.wordCount}文字</Text>
      </View>
    </TouchableOpacity>
  );
};

// =====================================================
// メインコンポーネント
// =====================================================

const JournalScreen: React.FC = () => {
  // State
  const [entries, setEntries] = useState<JournalEntry[]>(generateSampleEntries);
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMood, setFilterMood] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  // 新規/編集エントリー用のstate
  const [editEntry, setEditEntry] = useState<Partial<JournalEntry>>({
    title: '',
    content: '',
    mood: null,
    activities: [],
    weather: null,
    location: null,
    photos: [],
    tags: [],
  });
  
  // フィルタリングされたエントリー
  const filteredEntries = useMemo(() => {
    let result = [...entries];
    
    // 検索
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(query) ||
        e.content.toLowerCase().includes(query) ||
        e.tags.some(t => t.toLowerCase().includes(query))
      );
    }
    
    // 気分フィルター
    if (filterMood) {
      result = result.filter(e => e.mood === filterMood);
    }
    
    // 日付フィルター（カレンダービュー）
    if (selectedDate && viewMode === 'calendar') {
      result = result.filter(e => e.date === selectedDate);
    }
    
    return result;
  }, [entries, searchQuery, filterMood, selectedDate, viewMode]);
  
  // 日付でグループ化
  const groupedEntries = useMemo(() => {
    const groups: { [date: string]: JournalEntry[] } = {};
    filteredEntries.forEach(entry => {
      if (!groups[entry.date]) {
        groups[entry.date] = [];
      }
      groups[entry.date].push(entry);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredEntries]);
  
  // エントリー保存
  const saveEntry = useCallback(() => {
    if (!editEntry.title?.trim() && !editEntry.content?.trim()) {
      Alert.alert('エラー', 'タイトルまたは本文を入力してください');
      return;
    }
    
    const now = new Date();
    const newEntry: JournalEntry = {
      id: selectedEntry?.id || generateId(),
      date: selectedEntry?.date || formatDate(now),
      time: selectedEntry?.time || formatTime(now),
      title: editEntry.title?.trim() || '無題',
      content: editEntry.content?.trim() || '',
      mood: editEntry.mood || null,
      activities: editEntry.activities || [],
      weather: editEntry.weather || null,
      location: editEntry.location || null,
      photos: editEntry.photos || [],
      isFavorite: selectedEntry?.isFavorite || false,
      tags: editEntry.tags || [],
      wordCount: countWords(editEntry.content || ''),
      createdAt: selectedEntry?.createdAt || now.toISOString(),
      updatedAt: now.toISOString(),
    };
    
    if (selectedEntry) {
      setEntries(prev => prev.map(e => e.id === selectedEntry.id ? newEntry : e));
    } else {
      setEntries(prev => [newEntry, ...prev]);
    }
    
    setModalType(null);
    setSelectedEntry(null);
    setEditEntry({
      title: '',
      content: '',
      mood: null,
      activities: [],
      weather: null,
      location: null,
      photos: [],
      tags: [],
    });
  }, [editEntry, selectedEntry]);
  
  // エントリー削除
  const deleteEntry = useCallback((id: string) => {
    Alert.alert(
      '削除確認',
      'このエントリーを削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            setEntries(prev => prev.filter(e => e.id !== id));
            setModalType(null);
            setSelectedEntry(null);
          },
        },
      ]
    );
  }, []);
  
  // お気に入り切り替え
  const toggleFavorite = useCallback((id: string) => {
    setEntries(prev => prev.map(e =>
      e.id === id ? { ...e, isFavorite: !e.isFavorite } : e
    ));
  }, []);
  
  // 月変更
  const changeMonth = useCallback((direction: -1 | 1) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(newMonth.getMonth() + direction);
      return newMonth;
    });
  }, []);
  
  // 新規エントリー開始
  const startNewEntry = useCallback(() => {
    setSelectedEntry(null);
    setEditEntry({
      title: '',
      content: '',
      mood: null,
      activities: [],
      weather: null,
      location: null,
      photos: [],
      tags: [],
    });
    setModalType('entry');
  }, []);
  
  // エントリー詳細表示
  const showEntryDetail = useCallback((entry: JournalEntry) => {
    setSelectedEntry(entry);
    setModalType('detail');
  }, []);
  
  // エントリー編集開始
  const startEditEntry = useCallback((entry: JournalEntry) => {
    setSelectedEntry(entry);
    setEditEntry({
      title: entry.title,
      content: entry.content,
      mood: entry.mood,
      activities: entry.activities,
      weather: entry.weather,
      location: entry.location,
      photos: entry.photos,
      tags: entry.tags,
    });
    setModalType('entry');
  }, []);
  
  // 活動タグ切り替え
  const toggleActivity = useCallback((activityId: string) => {
    setEditEntry(prev => {
      const activities = prev.activities || [];
      if (activities.includes(activityId)) {
        return { ...prev, activities: activities.filter(a => a !== activityId) };
      } else {
        return { ...prev, activities: [...activities, activityId] };
      }
    });
  }, []);

  // =====================================================
  // レンダリング
  // =====================================================

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📝 日記</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerBtn}
            onPress={() => setModalType('search')}
          >
            <Text style={styles.headerBtnText}>🔍</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* ビューモード切り替え */}
      <View style={styles.viewModeBar}>
        {[
          { mode: 'timeline' as ViewMode, icon: '📋', label: 'タイムライン' },
          { mode: 'calendar' as ViewMode, icon: '📅', label: 'カレンダー' },
          { mode: 'stats' as ViewMode, icon: '📊', label: '統計' },
        ].map(({ mode, icon, label }) => (
          <TouchableOpacity
            key={mode}
            style={[styles.viewModeBtn, viewMode === mode && styles.viewModeBtnActive]}
            onPress={() => setViewMode(mode)}
          >
            <Text style={styles.viewModeIcon}>{icon}</Text>
            <Text style={[
              styles.viewModeLabel,
              viewMode === mode && styles.viewModeLabelActive
            ]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* フィルターバー */}
      {viewMode === 'timeline' && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterBar}
          contentContainerStyle={styles.filterBarContent}
        >
          <TouchableOpacity
            style={[styles.filterChip, !filterMood && styles.filterChipActive]}
            onPress={() => setFilterMood(null)}
          >
            <Text style={[styles.filterChipText, !filterMood && styles.filterChipTextActive]}>
              すべて
            </Text>
          </TouchableOpacity>
          {MOOD_TAGS.map(mood => (
            <TouchableOpacity
              key={mood.id}
              style={[styles.filterChip, filterMood === mood.id && styles.filterChipActive]}
              onPress={() => setFilterMood(filterMood === mood.id ? null : mood.id)}
            >
              <Text style={styles.filterChipEmoji}>{mood.emoji}</Text>
              <Text style={[
                styles.filterChipText,
                filterMood === mood.id && styles.filterChipTextActive
              ]}>{mood.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      
      {/* メインコンテンツ */}
      {viewMode === 'timeline' && (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {groupedEntries.map(([date, dayEntries]) => (
            <View key={date} style={styles.dateGroup}>
              <View style={styles.dateHeader}>
                <Text style={styles.dateHeaderText}>{formatDisplayDate(date)}</Text>
                <Text style={styles.dateHeaderRelative}>{getRelativeDate(date)}</Text>
              </View>
              {dayEntries.map(entry => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  onPress={() => showEntryDetail(entry)}
                  onToggleFavorite={() => toggleFavorite(entry.id)}
                />
              ))}
            </View>
          ))}
          
          {filteredEntries.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📝</Text>
              <Text style={styles.emptyStateTitle}>
                {searchQuery || filterMood ? '該当するエントリーがありません' : '日記がありません'}
              </Text>
              <Text style={styles.emptyStateText}>
                {searchQuery || filterMood 
                  ? '検索条件を変更してみてください'
                  : '最初のエントリーを書いてみましょう！'}
              </Text>
            </View>
          )}
          
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
      
      {viewMode === 'calendar' && (
        <View style={styles.content}>
          <Calendar
            currentMonth={currentMonth}
            entries={entries}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onChangeMonth={changeMonth}
          />
          
          {/* 選択日のエントリー */}
          {selectedDate && (
            <View style={styles.selectedDateEntries}>
              <Text style={styles.selectedDateTitle}>
                {formatFullDate(selectedDate)}のエントリー
              </Text>
              <ScrollView style={styles.selectedDateList} showsVerticalScrollIndicator={false}>
                {filteredEntries.length > 0 ? (
                  filteredEntries.map(entry => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      onPress={() => showEntryDetail(entry)}
                      onToggleFavorite={() => toggleFavorite(entry.id)}
                      compact
                    />
                  ))
                ) : (
                  <Text style={styles.noEntriesText}>この日の記録はありません</Text>
                )}
              </ScrollView>
            </View>
          )}
        </View>
      )}
      
      {viewMode === 'stats' && <Stats entries={entries} />}
      
      {/* FAB（新規エントリー） */}
      <TouchableOpacity style={styles.fab} onPress={startNewEntry}>
        <Text style={styles.fabText}>✏️</Text>
      </TouchableOpacity>
      
      {/* 検索モーダル */}
      <Modal visible={modalType === 'search'} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.searchModal}>
            <View style={styles.searchHeader}>
              <TextInput
                style={styles.searchInput}
                placeholder="日記を検索..."
                placeholderTextColor={COLORS.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              <TouchableOpacity
                style={styles.searchCloseBtn}
                onPress={() => {
                  setModalType(null);
                  setSearchQuery('');
                }}
              >
                <Text style={styles.searchCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.searchResults}>
              {searchQuery && filteredEntries.map(entry => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  onPress={() => {
                    setModalType(null);
                    showEntryDetail(entry);
                  }}
                  onToggleFavorite={() => toggleFavorite(entry.id)}
                  compact
                />
              ))}
              {searchQuery && filteredEntries.length === 0 && (
                <Text style={styles.noResultsText}>「{searchQuery}」の検索結果はありません</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* エントリー詳細モーダル */}
      <Modal visible={modalType === 'detail'} animationType="slide">
        <View style={styles.detailModal}>
          <View style={styles.detailHeader}>
            <TouchableOpacity
              style={styles.detailCloseBtn}
              onPress={() => {
                setModalType(null);
                setSelectedEntry(null);
              }}
            >
              <Text style={styles.detailCloseBtnText}>← 戻る</Text>
            </TouchableOpacity>
            <View style={styles.detailActions}>
              <TouchableOpacity
                style={styles.detailActionBtn}
                onPress={() => selectedEntry && startEditEntry(selectedEntry)}
              >
                <Text style={styles.detailActionBtnText}>編集</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.detailActionBtn, styles.deleteBtn]}
                onPress={() => selectedEntry && deleteEntry(selectedEntry.id)}
              >
                <Text style={styles.deleteBtnText}>削除</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {selectedEntry && (
            <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
              <View style={styles.detailMeta}>
                <Text style={styles.detailDate}>{formatFullDate(selectedEntry.date)}</Text>
                <Text style={styles.detailTime}>{selectedEntry.time}</Text>
                {selectedEntry.weather && (
                  <Text style={styles.detailWeather}>
                    {getWeatherById(selectedEntry.weather)?.emoji}
                  </Text>
                )}
              </View>
              
              {selectedEntry.mood && (
                <View style={styles.detailMoodRow}>
                  {(() => {
                    const mood = getMoodById(selectedEntry.mood);
                    return mood ? (
                      <View style={[styles.detailMoodBadge, { backgroundColor: mood.color + '20' }]}>
                        <Text style={styles.detailMoodEmoji}>{mood.emoji}</Text>
                        <Text style={[styles.detailMoodText, { color: mood.color }]}>{mood.label}</Text>
                      </View>
                    ) : null;
                  })()}
                </View>
              )}
              
              <Text style={styles.detailTitle}>{selectedEntry.title}</Text>
              <Text style={styles.detailBody}>{selectedEntry.content}</Text>
              
              {selectedEntry.activities.length > 0 && (
                <View style={styles.detailTags}>
                  {selectedEntry.activities.map(actId => {
                    const activity = getActivityById(actId);
                    return activity ? (
                      <View key={actId} style={styles.detailTag}>
                        <Text style={styles.detailTagText}>{activity.emoji} {activity.label}</Text>
                      </View>
                    ) : null;
                  })}
                </View>
              )}
              
              {selectedEntry.location && (
                <View style={styles.detailLocation}>
                  <Text style={styles.detailLocationText}>📍 {selectedEntry.location}</Text>
                </View>
              )}
              
              <View style={styles.detailFooter}>
                <Text style={styles.detailWordCount}>{selectedEntry.wordCount}文字</Text>
                <TouchableOpacity onPress={() => toggleFavorite(selectedEntry.id)}>
                  <Text style={styles.detailFavorite}>
                    {selectedEntry.isFavorite ? '⭐ お気に入り' : '☆ お気に入りに追加'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
      
      {/* エントリー編集モーダル */}
      <Modal visible={modalType === 'entry'} animationType="slide">
        <View style={styles.editModal}>
          <View style={styles.editHeader}>
            <TouchableOpacity
              style={styles.editCancelBtn}
              onPress={() => {
                setModalType(null);
                setSelectedEntry(null);
              }}
            >
              <Text style={styles.editCancelBtnText}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.editHeaderTitle}>
              {selectedEntry ? '編集' : '新規エントリー'}
            </Text>
            <TouchableOpacity style={styles.editSaveBtn} onPress={saveEntry}>
              <Text style={styles.editSaveBtnText}>保存</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.editContent} showsVerticalScrollIndicator={false}>
            {/* タイトル */}
            <TextInput
              style={styles.editTitleInput}
              placeholder="タイトル"
              placeholderTextColor={COLORS.textMuted}
              value={editEntry.title}
              onChangeText={text => setEditEntry(prev => ({ ...prev, title: text }))}
            />
            
            {/* 気分選択 */}
            <Text style={styles.editSectionTitle}>今の気分</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.moodSelector}
            >
              {MOOD_TAGS.map(mood => (
                <TouchableOpacity
                  key={mood.id}
                  style={[
                    styles.moodOption,
                    editEntry.mood === mood.id && styles.moodOptionSelected,
                    editEntry.mood === mood.id && { borderColor: mood.color },
                  ]}
                  onPress={() => setEditEntry(prev => ({ 
                    ...prev, 
                    mood: prev.mood === mood.id ? null : mood.id 
                  }))}
                >
                  <Text style={styles.moodOptionEmoji}>{mood.emoji}</Text>
                  <Text style={[
                    styles.moodOptionLabel,
                    editEntry.mood === mood.id && { color: mood.color },
                  ]}>{mood.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {/* 天気選択 */}
            <Text style={styles.editSectionTitle}>天気</Text>
            <View style={styles.weatherSelector}>
              {WEATHER_TAGS.map(weather => (
                <TouchableOpacity
                  key={weather.id}
                  style={[
                    styles.weatherOption,
                    editEntry.weather === weather.id && styles.weatherOptionSelected,
                  ]}
                  onPress={() => setEditEntry(prev => ({ 
                    ...prev, 
                    weather: prev.weather === weather.id ? null : weather.id 
                  }))}
                >
                  <Text style={styles.weatherOptionEmoji}>{weather.emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* 本文 */}
            <Text style={styles.editSectionTitle}>本文</Text>
            <TextInput
              style={styles.editContentInput}
              placeholder="今日あったことを書いてみよう..."
              placeholderTextColor={COLORS.textMuted}
              value={editEntry.content}
              onChangeText={text => setEditEntry(prev => ({ ...prev, content: text }))}
              multiline
              textAlignVertical="top"
            />
            
            {/* 活動タグ */}
            <Text style={styles.editSectionTitle}>活動</Text>
            <View style={styles.activitySelector}>
              {ACTIVITY_TAGS.map(activity => (
                <TouchableOpacity
                  key={activity.id}
                  style={[
                    styles.activityOption,
                    editEntry.activities?.includes(activity.id) && styles.activityOptionSelected,
                  ]}
                  onPress={() => toggleActivity(activity.id)}
                >
                  <Text style={styles.activityOptionEmoji}>{activity.emoji}</Text>
                  <Text style={[
                    styles.activityOptionLabel,
                    editEntry.activities?.includes(activity.id) && styles.activityOptionLabelSelected,
                  ]}>{activity.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* 写真追加（UI only） */}
            <Text style={styles.editSectionTitle}>写真</Text>
            <TouchableOpacity style={styles.addPhotoBtn}>
              <Text style={styles.addPhotoBtnIcon}>📷</Text>
              <Text style={styles.addPhotoBtnText}>写真を追加</Text>
            </TouchableOpacity>
            
            {/* 場所（UI only） */}
            <Text style={styles.editSectionTitle}>場所</Text>
            <TouchableOpacity style={styles.addLocationBtn}>
              <Text style={styles.addLocationBtnIcon}>📍</Text>
              <Text style={styles.addLocationBtnText}>現在地を追加</Text>
            </TouchableOpacity>
            
            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

// =====================================================
// スタイル
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  // ヘッダー
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtnText: {
    fontSize: 20,
  },
  
  // ビューモード
  viewModeBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  viewModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },
  viewModeBtnActive: {
    backgroundColor: COLORS.primary + '15',
  },
  viewModeIcon: {
    fontSize: 16,
  },
  viewModeLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  viewModeLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  
  // フィルターバー
  filterBar: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  filterBarContent: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipEmoji: {
    fontSize: 14,
  },
  filterChipText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  filterChipTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  
  // コンテンツ
  content: {
    flex: 1,
  },
  
  // 日付グループ
  dateGroup: {
    marginBottom: 15,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  dateHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  dateHeaderRelative: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  
  // エントリーカード
  entryCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 16,
    padding: 16,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  entryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  entryCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  entryCardTime: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  entryCardWeather: {
    fontSize: 14,
  },
  entryCardLocation: {
    fontSize: 11,
    color: COLORS.textMuted,
    maxWidth: 150,
  },
  favoriteBtn: {
    padding: 5,
  },
  favoriteBtnText: {
    fontSize: 18,
  },
  entryCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  moodBadgeEmoji: {
    fontSize: 12,
  },
  moodBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  entryCardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  entryCardContent: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  entryCardPhotos: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  entryCardPhoto: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholder: {
    fontSize: 24,
  },
  entryCardPhotoMore: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoMoreText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '600',
  },
  entryCardTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 6,
  },
  activityTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.background,
  },
  activityTagText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  entryCardFooter: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  entryCardWordCount: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  
  // コンパクトカード
  entryCardCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: 15,
    marginBottom: 8,
    borderRadius: 12,
    padding: 12,
  },
  entryCardCompactLeft: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  entryCardCompactMood: {
    fontSize: 20,
  },
  entryCardCompactContent: {
    flex: 1,
  },
  entryCardCompactTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  entryCardCompactText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  entryCardCompactTime: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  
  // 空の状態
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  
  // カレンダー
  calendarContainer: {
    backgroundColor: COLORS.white,
    margin: 15,
    borderRadius: 16,
    padding: 15,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  calendarNavBtn: {
    padding: 10,
  },
  calendarNavText: {
    fontSize: 16,
    color: COLORS.primary,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  calendarWeekHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  calendarWeekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
  },
  calendarWeekDayText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  sundayText: {
    color: '#E57373',
  },
  saturdayText: {
    color: '#64B5F6',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: `${100/7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  calendarDaySelected: {
    backgroundColor: COLORS.primary + '20',
    borderRadius: 8,
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 8,
  },
  calendarDayText: {
    fontSize: 14,
    color: COLORS.text,
  },
  calendarDayTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  calendarDayIndicator: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  calendarDayMood: {
    fontSize: 8,
  },
  selectedDateEntries: {
    flex: 1,
    paddingHorizontal: 15,
  },
  selectedDateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
  },
  selectedDateList: {
    flex: 1,
  },
  noEntriesText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  
  // 統計
  statsContainer: {
    flex: 1,
    padding: 15,
  },
  statsOverview: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statsCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  statsCardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statsCardLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  statsSection: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
  },
  statsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 15,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  statsLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  statsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  statsRankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  statsRankNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
    width: 20,
  },
  statsRankEmoji: {
    fontSize: 20,
  },
  statsRankLabel: {
    fontSize: 14,
    color: COLORS.text,
    width: 60,
  },
  statsRankBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  statsRankBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  statsRankValue: {
    fontSize: 12,
    color: COLORS.textMuted,
    width: 40,
    textAlign: 'right',
  },
  noDataText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  
  // FAB
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  fabText: {
    fontSize: 24,
  },
  
  // 検索モーダル
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  searchModal: {
    flex: 1,
    backgroundColor: COLORS.background,
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 15,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.background,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
  },
  searchCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  searchCloseBtnText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  searchResults: {
    flex: 1,
    paddingTop: 10,
  },
  noResultsText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 40,
  },
  
  // 詳細モーダル
  detailModal: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  detailCloseBtn: {
    padding: 5,
  },
  detailCloseBtnText: {
    fontSize: 16,
    color: COLORS.primary,
  },
  detailActions: {
    flexDirection: 'row',
    gap: 15,
  },
  detailActionBtn: {
    padding: 5,
  },
  detailActionBtnText: {
    fontSize: 16,
    color: COLORS.primary,
  },
  deleteBtn: {},
  deleteBtnText: {
    fontSize: 16,
    color: COLORS.error,
  },
  detailContent: {
    flex: 1,
    padding: 20,
  },
  detailMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },
  detailDate: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  detailTime: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  detailWeather: {
    fontSize: 18,
  },
  detailMoodRow: {
    marginBottom: 15,
  },
  detailMoodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  detailMoodEmoji: {
    fontSize: 16,
  },
  detailMoodText: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
  },
  detailBody: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 26,
  },
  detailTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 20,
    gap: 8,
  },
  detailTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '15',
  },
  detailTagText: {
    fontSize: 13,
    color: COLORS.primary,
  },
  detailLocation: {
    marginTop: 20,
    padding: 12,
    backgroundColor: COLORS.white,
    borderRadius: 10,
  },
  detailLocationText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  detailFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  detailWordCount: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  detailFavorite: {
    fontSize: 14,
    color: COLORS.primary,
  },
  
  // 編集モーダル
  editModal: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  editCancelBtn: {
    padding: 5,
  },
  editCancelBtnText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  editHeaderTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  editSaveBtn: {
    padding: 5,
  },
  editSaveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  editContent: {
    flex: 1,
    padding: 20,
  },
  editTitleInput: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.text,
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  editSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 10,
    marginTop: 10,
  },
  moodSelector: {
    marginBottom: 10,
  },
  moodOption: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginRight: 10,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  moodOptionSelected: {
    backgroundColor: COLORS.white,
  },
  moodOptionEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  moodOptionLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  weatherSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  weatherOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  weatherOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  weatherOptionEmoji: {
    fontSize: 22,
  },
  editContentInput: {
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 12,
    minHeight: 150,
    marginBottom: 10,
  },
  activitySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  activityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    gap: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activityOptionSelected: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  activityOptionEmoji: {
    fontSize: 14,
  },
  activityOptionLabel: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  activityOptionLabelSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  addPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    gap: 10,
    marginBottom: 10,
  },
  addPhotoBtnIcon: {
    fontSize: 24,
  },
  addPhotoBtnText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  addLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 12,
    gap: 10,
  },
  addLocationBtnIcon: {
    fontSize: 18,
  },
  addLocationBtnText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
});

export default JournalScreen;
