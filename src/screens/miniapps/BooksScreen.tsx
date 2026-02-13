import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Animated,
  Dimensions,
  Image,
  FlatList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

// ==================== TYPES ====================
type ReadingStatus = 'reading' | 'completed' | 'to_read' | 'dropped';
type ViewType = 'shelf' | 'list' | 'stats';
type SortType = 'recent' | 'title' | 'author' | 'rating';
type FilterType = 'all' | ReadingStatus;

interface Book {
  id: string;
  title: string;
  author: string;
  coverImage?: string;
  status: ReadingStatus;
  rating: number; // 0-5
  review?: string;
  totalPages: number;
  currentPage: number;
  startDate?: Date;
  finishDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  genre?: string;
  isbn?: string;
  publisher?: string;
  memo?: string;
}

interface MonthlyStats {
  month: string; // YYYY-MM
  booksCompleted: number;
  pagesRead: number;
}

interface YearlyStats {
  year: number;
  booksCompleted: number;
  pagesRead: number;
  monthlyData: MonthlyStats[];
}

// ==================== CONSTANTS ====================
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOOK_CARD_WIDTH = (SCREEN_WIDTH - 48) / 3;
const BOOK_CARD_HEIGHT = BOOK_CARD_WIDTH * 1.5;

const COLORS = {
  primary: '#FF6B35',
  primaryLight: '#FF8A5C',
  primaryDark: '#E55A25',
  background: '#FFF5E6',
  white: '#FFFFFF',
  text: '#333333',
  textSecondary: '#666666',
  textMuted: '#999999',
  border: '#E0E0E0',
  success: '#4CAF50',
  danger: '#F44336',
  warning: '#FFC107',
  reading: '#2196F3',
  completed: '#4CAF50',
  toRead: '#9C27B0',
  dropped: '#9E9E9E',
  star: '#FFD700',
  starEmpty: '#E0E0E0',
};

const STATUS_CONFIG: Record<ReadingStatus, { label: string; color: string; icon: string }> = {
  reading: { label: '読書中', color: COLORS.reading, icon: '📖' },
  completed: { label: '読了', color: COLORS.completed, icon: '✅' },
  to_read: { label: '積読', color: COLORS.toRead, icon: '📚' },
  dropped: { label: '中断', color: COLORS.dropped, icon: '⏸️' },
};

const GENRE_OPTIONS = [
  '小説', 'ビジネス', '自己啓発', '技術書', 'エッセイ', '歴史',
  'ミステリー', 'SF', 'ファンタジー', '漫画', 'ノンフィクション', 'その他',
];

const SAMPLE_COVERS = [
  '📕', '📗', '📘', '📙', '📓', '📔', '📒', '📚',
];

// ==================== UTILITY FUNCTIONS ====================
const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}/${month}/${day}`;
};

const getProgress = (current: number, total: number): number => {
  if (total === 0) return 0;
  return Math.min(Math.round((current / total) * 100), 100);
};

const getMonthKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const getRandomCover = (): string => {
  return SAMPLE_COVERS[Math.floor(Math.random() * SAMPLE_COVERS.length)];
};

// ==================== SAMPLE DATA ====================
const generateSampleBooks = (): Book[] => {
  const now = new Date();
  return [
    {
      id: generateId(),
      title: '人を動かす',
      author: 'D・カーネギー',
      status: 'completed',
      rating: 5,
      review: '人間関係の本質を学べる名著。何度読み返しても新しい発見がある。',
      totalPages: 320,
      currentPage: 320,
      startDate: new Date(now.getFullYear(), now.getMonth() - 2, 1),
      finishDate: new Date(now.getFullYear(), now.getMonth() - 1, 15),
      createdAt: new Date(now.getFullYear(), now.getMonth() - 2, 1),
      updatedAt: new Date(now.getFullYear(), now.getMonth() - 1, 15),
      genre: 'ビジネス',
      coverImage: '📕',
    },
    {
      id: generateId(),
      title: '思考の整理学',
      author: '外山滋比古',
      status: 'reading',
      rating: 4,
      totalPages: 232,
      currentPage: 156,
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      createdAt: new Date(now.getFullYear(), now.getMonth(), 1),
      updatedAt: now,
      genre: '自己啓発',
      coverImage: '📘',
    },
    {
      id: generateId(),
      title: 'アトミック・ハビット',
      author: 'ジェームズ・クリアー',
      status: 'completed',
      rating: 5,
      review: '習慣化のバイブル。小さな変化の積み重ねが大きな成果を生むことを実感。',
      totalPages: 352,
      currentPage: 352,
      startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      finishDate: new Date(now.getFullYear(), now.getMonth() - 1, 28),
      createdAt: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      updatedAt: new Date(now.getFullYear(), now.getMonth() - 1, 28),
      genre: '自己啓発',
      coverImage: '📙',
    },
    {
      id: generateId(),
      title: 'リーダブルコード',
      author: 'Dustin Boswell',
      status: 'to_read',
      rating: 0,
      totalPages: 260,
      currentPage: 0,
      createdAt: now,
      updatedAt: now,
      genre: '技術書',
      coverImage: '📗',
    },
    {
      id: generateId(),
      title: 'サピエンス全史',
      author: 'ユヴァル・ノア・ハラリ',
      status: 'dropped',
      rating: 3,
      review: '内容は面白いが、分量が多すぎて途中で挫折...',
      totalPages: 536,
      currentPage: 180,
      startDate: new Date(now.getFullYear(), now.getMonth() - 3, 1),
      createdAt: new Date(now.getFullYear(), now.getMonth() - 3, 1),
      updatedAt: new Date(now.getFullYear(), now.getMonth() - 2, 15),
      genre: '歴史',
      coverImage: '📓',
    },
    {
      id: generateId(),
      title: '嫌われる勇気',
      author: '岸見一郎',
      status: 'completed',
      rating: 5,
      review: 'アドラー心理学の入門書として最高。対話形式で読みやすい。',
      totalPages: 296,
      currentPage: 296,
      startDate: new Date(now.getFullYear(), now.getMonth(), 5),
      finishDate: new Date(now.getFullYear(), now.getMonth(), 12),
      createdAt: new Date(now.getFullYear(), now.getMonth(), 5),
      updatedAt: new Date(now.getFullYear(), now.getMonth(), 12),
      genre: '自己啓発',
      coverImage: '📔',
    },
  ];
};

// ==================== COMPONENTS ====================

// Star Rating Component
const StarRating: React.FC<{
  rating: number;
  size?: number;
  editable?: boolean;
  onRatingChange?: (rating: number) => void;
}> = ({ rating, size = 20, editable = false, onRatingChange }) => {
  const handlePress = (star: number) => {
    if (editable && onRatingChange) {
      onRatingChange(star === rating ? 0 : star);
    }
  };

  return (
    <View style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => handlePress(star)}
          disabled={!editable}
          activeOpacity={editable ? 0.7 : 1}
        >
          <Text style={[styles.star, { fontSize: size }]}>
            {star <= rating ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Progress Bar Component
const ProgressBar: React.FC<{
  progress: number;
  height?: number;
  showLabel?: boolean;
}> = ({ progress, height = 8, showLabel = true }) => {
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={styles.progressContainer}>
      <View style={[styles.progressBackground, { height }]}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              height,
              width: animatedWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      {showLabel && (
        <Text style={styles.progressLabel}>{progress}%</Text>
      )}
    </View>
  );
};

// Status Badge Component
const StatusBadge: React.FC<{
  status: ReadingStatus;
  small?: boolean;
}> = ({ status, small = false }) => {
  const config = STATUS_CONFIG[status];
  return (
    <View
      style={[
        styles.statusBadge,
        { backgroundColor: config.color },
        small && styles.statusBadgeSmall,
      ]}
    >
      <Text style={[styles.statusBadgeText, small && styles.statusBadgeTextSmall]}>
        {config.icon} {config.label}
      </Text>
    </View>
  );
};

// Book Card (Grid View)
const BookCard: React.FC<{
  book: Book;
  onPress: () => void;
}> = ({ book, onPress }) => {
  const progress = getProgress(book.currentPage, book.totalPages);

  return (
    <TouchableOpacity
      style={styles.bookCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.bookCover, { backgroundColor: STATUS_CONFIG[book.status].color + '20' }]}>
        <Text style={styles.bookCoverEmoji}>{book.coverImage || '📕'}</Text>
        {book.status === 'reading' && (
          <View style={styles.bookProgress}>
            <View
              style={[
                styles.bookProgressFill,
                { width: `${progress}%` },
              ]}
            />
          </View>
        )}
      </View>
      <Text style={styles.bookCardTitle} numberOfLines={2}>
        {book.title}
      </Text>
      <Text style={styles.bookCardAuthor} numberOfLines={1}>
        {book.author}
      </Text>
      {book.rating > 0 && (
        <View style={styles.bookCardRating}>
          <StarRating rating={book.rating} size={12} />
        </View>
      )}
    </TouchableOpacity>
  );
};

// Book List Item
const BookListItem: React.FC<{
  book: Book;
  onPress: () => void;
}> = ({ book, onPress }) => {
  const progress = getProgress(book.currentPage, book.totalPages);

  return (
    <TouchableOpacity
      style={styles.bookListItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.bookListCover, { backgroundColor: STATUS_CONFIG[book.status].color + '20' }]}>
        <Text style={styles.bookListCoverEmoji}>{book.coverImage || '📕'}</Text>
      </View>
      <View style={styles.bookListInfo}>
        <Text style={styles.bookListTitle} numberOfLines={1}>
          {book.title}
        </Text>
        <Text style={styles.bookListAuthor} numberOfLines={1}>
          {book.author}
        </Text>
        <View style={styles.bookListMeta}>
          <StatusBadge status={book.status} small />
          {book.rating > 0 && (
            <StarRating rating={book.rating} size={12} />
          )}
        </View>
        {book.status === 'reading' && (
          <View style={styles.bookListProgress}>
            <ProgressBar progress={progress} height={4} showLabel={false} />
            <Text style={styles.bookListProgressText}>
              {book.currentPage} / {book.totalPages}ページ ({progress}%)
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// Stats Bar Chart
const BarChart: React.FC<{
  data: { label: string; value: number }[];
  maxValue: number;
  height?: number;
}> = ({ data, maxValue, height = 150 }) => {
  const barWidth = (SCREEN_WIDTH - 80) / data.length - 8;

  return (
    <View style={[styles.barChart, { height }]}>
      <View style={styles.barChartBars}>
        {data.map((item, index) => {
          const barHeight = maxValue > 0 ? (item.value / maxValue) * (height - 30) : 0;
          return (
            <View key={index} style={styles.barChartItem}>
              <Text style={styles.barChartValue}>{item.value}</Text>
              <View
                style={[
                  styles.barChartBar,
                  {
                    height: Math.max(barHeight, 4),
                    width: barWidth,
                  },
                ]}
              />
              <Text style={styles.barChartLabel}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// ==================== MAIN COMPONENT ====================
const BooksScreen: React.FC = () => {
  const navigation = useNavigation();
  
  // State
  const [books, setBooks] = useState<Book[]>(generateSampleBooks);
  const [viewType, setViewType] = useState<ViewType>('shelf');
  const [sortType, setSortType] = useState<SortType>('recent');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // New book form state
  const [newBook, setNewBook] = useState<Partial<Book>>({
    title: '',
    author: '',
    totalPages: 0,
    currentPage: 0,
    status: 'to_read',
    rating: 0,
    genre: '',
    coverImage: getRandomCover(),
  });

  // Computed values
  const filteredBooks = useMemo(() => {
    let result = [...books];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (book) =>
          book.title.toLowerCase().includes(query) ||
          book.author.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filterType !== 'all') {
      result = result.filter((book) => book.status === filterType);
    }

    // Sort
    switch (sortType) {
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title, 'ja'));
        break;
      case 'author':
        result.sort((a, b) => a.author.localeCompare(b.author, 'ja'));
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'recent':
      default:
        result.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        break;
    }

    return result;
  }, [books, searchQuery, filterType, sortType]);

  const stats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const completedBooks = books.filter((b) => b.status === 'completed');
    const readingBooks = books.filter((b) => b.status === 'reading');

    // Monthly stats (last 6 months)
    const monthlyStats: { label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(currentYear, currentMonth - i, 1);
      const monthKey = getMonthKey(targetDate);
      const count = completedBooks.filter((b) => {
        if (!b.finishDate) return false;
        return getMonthKey(b.finishDate) === monthKey;
      }).length;
      monthlyStats.push({
        label: `${targetDate.getMonth() + 1}月`,
        value: count,
      });
    }

    // This month
    const thisMonthKey = getMonthKey(now);
    const thisMonthCompleted = completedBooks.filter((b) => {
      if (!b.finishDate) return false;
      return getMonthKey(b.finishDate) === thisMonthKey;
    }).length;

    // This year
    const thisYearCompleted = completedBooks.filter((b) => {
      if (!b.finishDate) return false;
      return b.finishDate.getFullYear() === currentYear;
    }).length;

    // Total pages read
    const totalPagesRead = completedBooks.reduce((sum, b) => sum + b.totalPages, 0) +
      readingBooks.reduce((sum, b) => sum + b.currentPage, 0);

    return {
      total: books.length,
      reading: readingBooks.length,
      completed: completedBooks.length,
      toRead: books.filter((b) => b.status === 'to_read').length,
      dropped: books.filter((b) => b.status === 'dropped').length,
      thisMonthCompleted,
      thisYearCompleted,
      totalPagesRead,
      monthlyStats,
      avgRating: completedBooks.length > 0
        ? (completedBooks.reduce((sum, b) => sum + b.rating, 0) / completedBooks.length).toFixed(1)
        : '0',
    };
  }, [books]);

  // Handlers
  const handleAddBook = useCallback(() => {
    if (!newBook.title || !newBook.author) {
      Alert.alert('エラー', 'タイトルと著者は必須です');
      return;
    }

    const book: Book = {
      id: generateId(),
      title: newBook.title,
      author: newBook.author,
      coverImage: newBook.coverImage || getRandomCover(),
      status: newBook.status || 'to_read',
      rating: newBook.rating || 0,
      review: newBook.review,
      totalPages: newBook.totalPages || 0,
      currentPage: newBook.currentPage || 0,
      genre: newBook.genre,
      createdAt: new Date(),
      updatedAt: new Date(),
      startDate: newBook.status === 'reading' ? new Date() : undefined,
    };

    setBooks((prev) => [book, ...prev]);
    setShowAddModal(false);
    setNewBook({
      title: '',
      author: '',
      totalPages: 0,
      currentPage: 0,
      status: 'to_read',
      rating: 0,
      genre: '',
      coverImage: getRandomCover(),
    });
  }, [newBook]);

  const handleUpdateBook = useCallback((updatedBook: Book) => {
    setBooks((prev) =>
      prev.map((b) =>
        b.id === updatedBook.id
          ? { ...updatedBook, updatedAt: new Date() }
          : b
      )
    );
    setSelectedBook({ ...updatedBook, updatedAt: new Date() });
  }, []);

  const handleDeleteBook = useCallback((bookId: string) => {
    Alert.alert(
      '削除確認',
      'この本を削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            setBooks((prev) => prev.filter((b) => b.id !== bookId));
            setShowDetailModal(false);
            setSelectedBook(null);
          },
        },
      ]
    );
  }, []);

  const handleUpdateProgress = useCallback((bookId: string, currentPage: number) => {
    setBooks((prev) =>
      prev.map((b) => {
        if (b.id !== bookId) return b;
        
        const updated: Book = {
          ...b,
          currentPage: Math.min(currentPage, b.totalPages),
          updatedAt: new Date(),
        };
        
        // Auto-complete if reached the end
        if (currentPage >= b.totalPages && b.status === 'reading') {
          updated.status = 'completed';
          updated.finishDate = new Date();
        }
        
        return updated;
      })
    );
  }, []);

  const handleChangeStatus = useCallback((bookId: string, status: ReadingStatus) => {
    setBooks((prev) =>
      prev.map((b) => {
        if (b.id !== bookId) return b;
        
        const updated: Book = { ...b, status, updatedAt: new Date() };
        
        if (status === 'reading' && !b.startDate) {
          updated.startDate = new Date();
        } else if (status === 'completed') {
          updated.finishDate = new Date();
          updated.currentPage = b.totalPages;
        }
        
        return updated;
      })
    );
  }, []);

  // Render header
  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>📚 読書記録</Text>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={() => setShowStatsModal(true)}
      >
        <Text style={styles.headerButtonText}>📊</Text>
      </TouchableOpacity>
    </View>
  );

  // Render search bar
  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="本を検索..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.searchClear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setShowFilterModal(true)}
      >
        <Text style={styles.filterButtonText}>
          {filterType === 'all' ? '📋' : STATUS_CONFIG[filterType].icon}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Render view switcher
  const renderViewSwitcher = () => (
    <View style={styles.viewSwitcher}>
      <View style={styles.viewButtons}>
        {(['shelf', 'list'] as ViewType[]).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.viewButton,
              viewType === type && styles.viewButtonActive,
            ]}
            onPress={() => setViewType(type)}
          >
            <Text
              style={[
                styles.viewButtonText,
                viewType === type && styles.viewButtonTextActive,
              ]}
            >
              {type === 'shelf' ? '📚 本棚' : '📝 リスト'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.sortContainer}>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => {
            const sorts: SortType[] = ['recent', 'title', 'author', 'rating'];
            const currentIndex = sorts.indexOf(sortType);
            setSortType(sorts[(currentIndex + 1) % sorts.length]);
          }}
        >
          <Text style={styles.sortButtonText}>
            {sortType === 'recent' && '🕐 最近'}
            {sortType === 'title' && '📖 タイトル'}
            {sortType === 'author' && '👤 著者'}
            {sortType === 'rating' && '⭐ 評価'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render stats summary
  const renderStatsSummary = () => (
    <View style={styles.statsSummary}>
      <View style={styles.statsCard}>
        <Text style={styles.statsCardValue}>{stats.reading}</Text>
        <Text style={styles.statsCardLabel}>読書中</Text>
      </View>
      <View style={styles.statsCard}>
        <Text style={styles.statsCardValue}>{stats.thisMonthCompleted}</Text>
        <Text style={styles.statsCardLabel}>今月読了</Text>
      </View>
      <View style={styles.statsCard}>
        <Text style={styles.statsCardValue}>{stats.thisYearCompleted}</Text>
        <Text style={styles.statsCardLabel}>今年読了</Text>
      </View>
      <View style={styles.statsCard}>
        <Text style={styles.statsCardValue}>{stats.toRead}</Text>
        <Text style={styles.statsCardLabel}>積読</Text>
      </View>
    </View>
  );

  // Render book shelf (grid)
  const renderBookShelf = () => (
    <View style={styles.bookShelf}>
      {filteredBooks.map((book) => (
        <BookCard
          key={book.id}
          book={book}
          onPress={() => {
            setSelectedBook(book);
            setShowDetailModal(true);
          }}
        />
      ))}
      {filteredBooks.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyText}>本がありません</Text>
          <Text style={styles.emptySubtext}>
            「+」ボタンで本を追加しましょう
          </Text>
        </View>
      )}
    </View>
  );

  // Render book list
  const renderBookList = () => (
    <View style={styles.bookList}>
      {filteredBooks.map((book) => (
        <BookListItem
          key={book.id}
          book={book}
          onPress={() => {
            setSelectedBook(book);
            setShowDetailModal(true);
          }}
        />
      ))}
      {filteredBooks.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyText}>本がありません</Text>
        </View>
      )}
    </View>
  );

  // Render add modal
  const renderAddModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowAddModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>📚 新しい本を追加</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Cover Picker */}
            <View style={styles.coverPicker}>
              <Text style={styles.coverPreview}>{newBook.coverImage}</Text>
              <View style={styles.coverOptions}>
                {SAMPLE_COVERS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.coverOption,
                      newBook.coverImage === emoji && styles.coverOptionSelected,
                    ]}
                    onPress={() => setNewBook((prev) => ({ ...prev, coverImage: emoji }))}
                  >
                    <Text style={styles.coverOptionEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>タイトル *</Text>
              <TextInput
                style={styles.input}
                placeholder="本のタイトル"
                placeholderTextColor={COLORS.textMuted}
                value={newBook.title}
                onChangeText={(text) => setNewBook((prev) => ({ ...prev, title: text }))}
              />
            </View>

            {/* Author */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>著者 *</Text>
              <TextInput
                style={styles.input}
                placeholder="著者名"
                placeholderTextColor={COLORS.textMuted}
                value={newBook.author}
                onChangeText={(text) => setNewBook((prev) => ({ ...prev, author: text }))}
              />
            </View>

            {/* Pages */}
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>総ページ数</Text>
                <TextInput
                  style={styles.input}
                  placeholder="300"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="number-pad"
                  value={newBook.totalPages ? String(newBook.totalPages) : ''}
                  onChangeText={(text) =>
                    setNewBook((prev) => ({ ...prev, totalPages: parseInt(text) || 0 }))
                  }
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>現在のページ</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="number-pad"
                  value={newBook.currentPage ? String(newBook.currentPage) : ''}
                  onChangeText={(text) =>
                    setNewBook((prev) => ({ ...prev, currentPage: parseInt(text) || 0 }))
                  }
                />
              </View>
            </View>

            {/* Status */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ステータス</Text>
              <View style={styles.statusPicker}>
                {(Object.keys(STATUS_CONFIG) as ReadingStatus[]).map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusOption,
                      newBook.status === status && {
                        backgroundColor: STATUS_CONFIG[status].color,
                      },
                    ]}
                    onPress={() => setNewBook((prev) => ({ ...prev, status }))}
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        newBook.status === status && styles.statusOptionTextSelected,
                      ]}
                    >
                      {STATUS_CONFIG[status].icon} {STATUS_CONFIG[status].label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Genre */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ジャンル</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.genrePicker}>
                  {GENRE_OPTIONS.map((genre) => (
                    <TouchableOpacity
                      key={genre}
                      style={[
                        styles.genreOption,
                        newBook.genre === genre && styles.genreOptionSelected,
                      ]}
                      onPress={() => setNewBook((prev) => ({ ...prev, genre }))}
                    >
                      <Text
                        style={[
                          styles.genreOptionText,
                          newBook.genre === genre && styles.genreOptionTextSelected,
                        ]}
                      >
                        {genre}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Rating */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>評価</Text>
              <StarRating
                rating={newBook.rating || 0}
                size={32}
                editable
                onRatingChange={(rating) => setNewBook((prev) => ({ ...prev, rating }))}
              />
            </View>

            {/* Review */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>感想・メモ</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="読んだ感想や気づきを記録..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={4}
                value={newBook.review}
                onChangeText={(text) => setNewBook((prev) => ({ ...prev, review: text }))}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowAddModal(false)}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleAddBook}
            >
              <Text style={styles.saveButtonText}>追加</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Render detail modal
  const renderDetailModal = () => {
    if (!selectedBook) return null;

    const progress = getProgress(selectedBook.currentPage, selectedBook.totalPages);

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📖 本の詳細</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Book Info */}
              <View style={styles.detailHeader}>
                <View style={[styles.detailCover, { backgroundColor: STATUS_CONFIG[selectedBook.status].color + '20' }]}>
                  <Text style={styles.detailCoverEmoji}>{selectedBook.coverImage || '📕'}</Text>
                </View>
                <View style={styles.detailInfo}>
                  <Text style={styles.detailTitle}>{selectedBook.title}</Text>
                  <Text style={styles.detailAuthor}>{selectedBook.author}</Text>
                  {selectedBook.genre && (
                    <Text style={styles.detailGenre}>{selectedBook.genre}</Text>
                  )}
                  <StatusBadge status={selectedBook.status} />
                </View>
              </View>

              {/* Rating */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>評価</Text>
                <StarRating
                  rating={selectedBook.rating}
                  size={28}
                  editable
                  onRatingChange={(rating) =>
                    handleUpdateBook({ ...selectedBook, rating })
                  }
                />
              </View>

              {/* Progress */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>読書進捗</Text>
                <ProgressBar progress={progress} height={12} />
                <View style={styles.progressInput}>
                  <TextInput
                    style={styles.progressInputField}
                    keyboardType="number-pad"
                    value={String(selectedBook.currentPage)}
                    onChangeText={(text) => {
                      const page = parseInt(text) || 0;
                      handleUpdateProgress(selectedBook.id, page);
                      setSelectedBook((prev) =>
                        prev ? { ...prev, currentPage: Math.min(page, prev.totalPages) } : null
                      );
                    }}
                  />
                  <Text style={styles.progressInputText}>
                    / {selectedBook.totalPages} ページ
                  </Text>
                </View>
                <View style={styles.quickProgress}>
                  {[10, 25, 50].map((pages) => (
                    <TouchableOpacity
                      key={pages}
                      style={styles.quickProgressButton}
                      onPress={() => {
                        const newPage = Math.min(
                          selectedBook.currentPage + pages,
                          selectedBook.totalPages
                        );
                        handleUpdateProgress(selectedBook.id, newPage);
                        setSelectedBook((prev) =>
                          prev ? { ...prev, currentPage: newPage } : null
                        );
                      }}
                    >
                      <Text style={styles.quickProgressText}>+{pages}p</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Status Change */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>ステータス変更</Text>
                <View style={styles.statusPicker}>
                  {(Object.keys(STATUS_CONFIG) as ReadingStatus[]).map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusOption,
                        selectedBook.status === status && {
                          backgroundColor: STATUS_CONFIG[status].color,
                        },
                      ]}
                      onPress={() => {
                        handleChangeStatus(selectedBook.id, status);
                        setSelectedBook((prev) =>
                          prev ? { ...prev, status } : null
                        );
                      }}
                    >
                      <Text
                        style={[
                          styles.statusOptionText,
                          selectedBook.status === status && styles.statusOptionTextSelected,
                        ]}
                      >
                        {STATUS_CONFIG[status].icon} {STATUS_CONFIG[status].label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Dates */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>読書記録</Text>
                <View style={styles.dateInfo}>
                  {selectedBook.startDate && (
                    <Text style={styles.dateText}>
                      📅 開始: {formatDate(selectedBook.startDate)}
                    </Text>
                  )}
                  {selectedBook.finishDate && (
                    <Text style={styles.dateText}>
                      ✅ 完了: {formatDate(selectedBook.finishDate)}
                    </Text>
                  )}
                  <Text style={styles.dateText}>
                    🕐 更新: {formatDate(selectedBook.updatedAt)}
                  </Text>
                </View>
              </View>

              {/* Review */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>感想・メモ</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="読んだ感想や気づきを記録..."
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  numberOfLines={4}
                  value={selectedBook.review || ''}
                  onChangeText={(text) =>
                    handleUpdateBook({ ...selectedBook, review: text })
                  }
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteBook(selectedBook.id)}
              >
                <Text style={styles.deleteButtonText}>🗑️ 削除</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => setShowDetailModal(false)}
              >
                <Text style={styles.saveButtonText}>完了</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Render stats modal
  const renderStatsModal = () => (
    <Modal
      visible={showStatsModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowStatsModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>📊 読書統計</Text>
            <TouchableOpacity onPress={() => setShowStatsModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Overview */}
            <View style={styles.statsSection}>
              <Text style={styles.statsSectionTitle}>📚 概要</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statsItem}>
                  <Text style={styles.statsItemValue}>{stats.total}</Text>
                  <Text style={styles.statsItemLabel}>総冊数</Text>
                </View>
                <View style={styles.statsItem}>
                  <Text style={styles.statsItemValue}>{stats.completed}</Text>
                  <Text style={styles.statsItemLabel}>読了</Text>
                </View>
                <View style={styles.statsItem}>
                  <Text style={styles.statsItemValue}>{stats.reading}</Text>
                  <Text style={styles.statsItemLabel}>読書中</Text>
                </View>
                <View style={styles.statsItem}>
                  <Text style={styles.statsItemValue}>{stats.toRead}</Text>
                  <Text style={styles.statsItemLabel}>積読</Text>
                </View>
              </View>
            </View>

            {/* Pages */}
            <View style={styles.statsSection}>
              <Text style={styles.statsSectionTitle}>📄 ページ数</Text>
              <View style={styles.statsHighlight}>
                <Text style={styles.statsHighlightValue}>
                  {stats.totalPagesRead.toLocaleString()}
                </Text>
                <Text style={styles.statsHighlightLabel}>総読書ページ</Text>
              </View>
            </View>

            {/* Rating */}
            <View style={styles.statsSection}>
              <Text style={styles.statsSectionTitle}>⭐ 評価</Text>
              <View style={styles.statsHighlight}>
                <Text style={styles.statsHighlightValue}>{stats.avgRating}</Text>
                <Text style={styles.statsHighlightLabel}>平均評価</Text>
              </View>
            </View>

            {/* Monthly Chart */}
            <View style={styles.statsSection}>
              <Text style={styles.statsSectionTitle}>📈 月間読了冊数（過去6ヶ月）</Text>
              <BarChart
                data={stats.monthlyStats}
                maxValue={Math.max(...stats.monthlyStats.map((s) => s.value), 1)}
                height={180}
              />
            </View>

            {/* Year Progress */}
            <View style={styles.statsSection}>
              <Text style={styles.statsSectionTitle}>🎯 年間目標</Text>
              <View style={styles.yearProgress}>
                <Text style={styles.yearProgressText}>
                  今年の読了: <Text style={styles.yearProgressValue}>{stats.thisYearCompleted}冊</Text>
                </Text>
                <ProgressBar
                  progress={Math.min((stats.thisYearCompleted / 24) * 100, 100)}
                  height={16}
                />
                <Text style={styles.yearGoalText}>目標: 24冊/年（月2冊ペース）</Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => setShowStatsModal(false)}
            >
              <Text style={styles.saveButtonText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Render filter modal
  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      animationType="fade"
      transparent
      onRequestClose={() => setShowFilterModal(false)}
    >
      <TouchableOpacity
        style={styles.filterModalOverlay}
        activeOpacity={1}
        onPress={() => setShowFilterModal(false)}
      >
        <View style={styles.filterModalContent}>
          <Text style={styles.filterModalTitle}>フィルター</Text>
          <TouchableOpacity
            style={[
              styles.filterOption,
              filterType === 'all' && styles.filterOptionSelected,
            ]}
            onPress={() => {
              setFilterType('all');
              setShowFilterModal(false);
            }}
          >
            <Text style={styles.filterOptionText}>📋 すべて</Text>
            <Text style={styles.filterOptionCount}>{stats.total}</Text>
          </TouchableOpacity>
          {(Object.keys(STATUS_CONFIG) as ReadingStatus[]).map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterOption,
                filterType === status && styles.filterOptionSelected,
              ]}
              onPress={() => {
                setFilterType(status);
                setShowFilterModal(false);
              }}
            >
              <Text style={styles.filterOptionText}>
                {STATUS_CONFIG[status].icon} {STATUS_CONFIG[status].label}
              </Text>
              <Text style={styles.filterOptionCount}>
                {books.filter((b) => b.status === status).length}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {renderSearchBar()}
        {renderStatsSummary()}
        {renderViewSwitcher()}
        
        {viewType === 'shelf' ? renderBookShelf() : renderBookList()}
        
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Modals */}
      {renderAddModal()}
      {renderDetailModal()}
      {renderStatsModal()}
      {renderFilterModal()}
    </SafeAreaView>
  );
};

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: COLORS.primary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonText: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  searchClear: {
    fontSize: 16,
    color: COLORS.textMuted,
    padding: 4,
  },
  filterButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonText: {
    fontSize: 20,
  },
  statsSummary: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  statsCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statsCardValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statsCardLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  viewSwitcher: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  viewButtons: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  viewButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  viewButtonActive: {
    backgroundColor: COLORS.primary,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  viewButtonTextActive: {
    color: COLORS.white,
  },
  sortContainer: {},
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sortButtonText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  bookShelf: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  bookCard: {
    width: BOOK_CARD_WIDTH,
    marginBottom: 8,
  },
  bookCover: {
    width: '100%',
    height: BOOK_CARD_HEIGHT,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bookCoverEmoji: {
    fontSize: 48,
  },
  bookProgress: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: COLORS.border,
  },
  bookProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  bookCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 6,
    lineHeight: 16,
  },
  bookCardAuthor: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  bookCardRating: {
    marginTop: 4,
  },
  bookList: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  bookListItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bookListCover: {
    width: 60,
    height: 80,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookListCoverEmoji: {
    fontSize: 32,
  },
  bookListInfo: {
    flex: 1,
    marginLeft: 12,
  },
  bookListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  bookListAuthor: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  bookListMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  bookListProgress: {
    marginTop: 8,
  },
  bookListProgressText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    color: COLORS.white,
    fontWeight: '300',
  },
  bottomPadding: {
    height: 100,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalClose: {
    fontSize: 24,
    color: COLORS.textMuted,
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  coverPicker: {
    alignItems: 'center',
    marginBottom: 20,
  },
  coverPreview: {
    fontSize: 64,
    marginBottom: 12,
  },
  coverOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  coverOption: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverOptionSelected: {
    backgroundColor: COLORS.primary + '30',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  coverOptionEmoji: {
    fontSize: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputRow: {
    flexDirection: 'row',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  statusPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusOptionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statusOptionTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  genrePicker: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  genreOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  genreOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genreOptionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  genreOptionTextSelected: {
    color: COLORS.white,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.danger + '15',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.danger,
  },

  // Detail Modal
  detailHeader: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  detailCover: {
    width: 100,
    height: 140,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCoverEmoji: {
    fontSize: 56,
  },
  detailInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  detailAuthor: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  detailGenre: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  progressInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  progressInputField: {
    width: 80,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  progressInputText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  quickProgress: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  quickProgressButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '15',
  },
  quickProgressText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  dateInfo: {
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  // Stats Modal
  statsSection: {
    marginBottom: 24,
  },
  statsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statsItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statsItemValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statsItemLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statsHighlight: {
    backgroundColor: COLORS.primary + '15',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  statsHighlightValue: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statsHighlightLabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  yearProgress: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
  },
  yearProgressText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  yearProgressValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  yearGoalText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },

  // Bar Chart
  barChart: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
  },
  barChartBars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    flex: 1,
  },
  barChartItem: {
    alignItems: 'center',
  },
  barChartValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  barChartBar: {
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  barChartLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
  },

  // Filter Modal
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    paddingTop: 160,
  },
  filterModalContent: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  filterModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  filterOptionSelected: {
    backgroundColor: COLORS.primary + '15',
  },
  filterOptionText: {
    fontSize: 16,
    color: COLORS.text,
  },
  filterOptionCount: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '600',
  },

  // Star Rating
  starContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  star: {
    color: COLORS.star,
  },

  // Progress Bar
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBackground: {
    flex: 1,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    minWidth: 40,
    textAlign: 'right',
  },

  // Status Badge
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  statusBadgeTextSmall: {
    fontSize: 10,
  },
});

export default BooksScreen;
