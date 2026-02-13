import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Image,
  Dimensions,
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

// ==================== TYPES ====================
type MovieStatus = 'want' | 'watched';
type ViewMode = 'grid' | 'list';
type SortType = 'date' | 'rating' | 'title';
type TabType = 'all' | 'want' | 'watched' | 'stats';

interface Genre {
  id: string;
  name: string;
  icon: string;
}

interface Movie {
  id: string;
  title: string;
  originalTitle?: string;
  posterUrl?: string;
  releaseYear?: number;
  director?: string;
  genres: string[];
  status: MovieStatus;
  rating?: number; // 1-5
  review?: string;
  watchedDate?: Date;
  addedDate: Date;
  runtime?: number; // minutes
  favorite: boolean;
}

interface MonthlyStats {
  month: string;
  count: number;
  totalMinutes: number;
}

// ==================== CONSTANTS ====================
const COLORS = {
  primary: '#FF6B35',
  primaryLight: '#FF8C5A',
  primaryDark: '#E55A2B',
  background: '#FFF5E6',
  white: '#FFFFFF',
  text: '#333333',
  textSecondary: '#666666',
  textMuted: '#999999',
  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  star: '#FFD700',
  starEmpty: '#D0D0D0',
  success: '#4CAF50',
  danger: '#F44336',
  cardShadow: 'rgba(0,0,0,0.1)',
  overlay: 'rgba(0,0,0,0.5)',
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_COLUMNS = 3;
const GRID_SPACING = 12;
const POSTER_WIDTH = (SCREEN_WIDTH - 32 - GRID_SPACING * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
const POSTER_HEIGHT = POSTER_WIDTH * 1.5;

const GENRES: Genre[] = [
  { id: 'action', name: 'アクション', icon: '💥' },
  { id: 'adventure', name: 'アドベンチャー', icon: '🗺️' },
  { id: 'animation', name: 'アニメ', icon: '🎨' },
  { id: 'comedy', name: 'コメディ', icon: '😂' },
  { id: 'crime', name: '犯罪', icon: '🔫' },
  { id: 'documentary', name: 'ドキュメンタリー', icon: '📹' },
  { id: 'drama', name: 'ドラマ', icon: '🎭' },
  { id: 'family', name: 'ファミリー', icon: '👨‍👩‍👧' },
  { id: 'fantasy', name: 'ファンタジー', icon: '🧙' },
  { id: 'horror', name: 'ホラー', icon: '👻' },
  { id: 'mystery', name: 'ミステリー', icon: '🔍' },
  { id: 'romance', name: 'ロマンス', icon: '💕' },
  { id: 'scifi', name: 'SF', icon: '🚀' },
  { id: 'thriller', name: 'スリラー', icon: '😱' },
  { id: 'war', name: '戦争', icon: '⚔️' },
  { id: 'western', name: '西部劇', icon: '🤠' },
  { id: 'music', name: '音楽', icon: '🎵' },
  { id: 'history', name: '歴史', icon: '📜' },
];

const SAMPLE_POSTERS = [
  'https://picsum.photos/seed/movie1/300/450',
  'https://picsum.photos/seed/movie2/300/450',
  'https://picsum.photos/seed/movie3/300/450',
  'https://picsum.photos/seed/movie4/300/450',
  'https://picsum.photos/seed/movie5/300/450',
];

// ==================== UTILITY FUNCTIONS ====================
const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}/${month}/${day}`;
};

const formatDateShort = (date: Date): string => {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
};

const formatRuntime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}分`;
  if (mins === 0) return `${hours}時間`;
  return `${hours}時間${mins}分`;
};

const getMonthKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const getMonthLabel = (key: string): string => {
  const [year, month] = key.split('-');
  return `${year}年${parseInt(month)}月`;
};

// ==================== SAMPLE DATA ====================
const createSampleMovies = (): Movie[] => {
  const today = new Date();
  const lastMonth = new Date(today);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const twoMonthsAgo = new Date(today);
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

  return [
    {
      id: generateId(),
      title: '君の名は。',
      originalTitle: 'Your Name',
      posterUrl: SAMPLE_POSTERS[0],
      releaseYear: 2016,
      director: '新海誠',
      genres: ['animation', 'romance', 'fantasy'],
      status: 'watched',
      rating: 5,
      review: '最高の映画体験でした。映像美と音楽が完璧にマッチしていて、何度見ても感動します。',
      watchedDate: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
      addedDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
      runtime: 107,
      favorite: true,
    },
    {
      id: generateId(),
      title: 'インターステラー',
      originalTitle: 'Interstellar',
      posterUrl: SAMPLE_POSTERS[1],
      releaseYear: 2014,
      director: 'クリストファー・ノーラン',
      genres: ['scifi', 'adventure', 'drama'],
      status: 'watched',
      rating: 5,
      review: '宇宙と時間の壮大なスケール。親子の愛がテーマなのも良い。',
      watchedDate: lastMonth,
      addedDate: new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000),
      runtime: 169,
      favorite: true,
    },
    {
      id: generateId(),
      title: 'パラサイト 半地下の家族',
      originalTitle: 'Parasite',
      posterUrl: SAMPLE_POSTERS[2],
      releaseYear: 2019,
      director: 'ポン・ジュノ',
      genres: ['thriller', 'drama', 'comedy'],
      status: 'watched',
      rating: 4,
      review: '社会風刺とエンタメの完璧なバランス。',
      watchedDate: twoMonthsAgo,
      addedDate: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000),
      runtime: 132,
      favorite: false,
    },
    {
      id: generateId(),
      title: 'オッペンハイマー',
      originalTitle: 'Oppenheimer',
      posterUrl: SAMPLE_POSTERS[3],
      releaseYear: 2023,
      director: 'クリストファー・ノーラン',
      genres: ['drama', 'history', 'thriller'],
      status: 'want',
      addedDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
      runtime: 180,
      favorite: false,
    },
    {
      id: generateId(),
      title: 'ダンケルク',
      originalTitle: 'Dunkirk',
      posterUrl: SAMPLE_POSTERS[4],
      releaseYear: 2017,
      director: 'クリストファー・ノーラン',
      genres: ['war', 'drama', 'action'],
      status: 'want',
      addedDate: today,
      runtime: 106,
      favorite: false,
    },
    {
      id: generateId(),
      title: '千と千尋の神隠し',
      originalTitle: 'Spirited Away',
      releaseYear: 2001,
      director: '宮崎駿',
      genres: ['animation', 'fantasy', 'adventure'],
      status: 'watched',
      rating: 5,
      review: '何度観ても新しい発見がある。日本アニメの最高傑作。',
      watchedDate: new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000),
      addedDate: new Date(today.getTime() - 100 * 24 * 60 * 60 * 1000),
      runtime: 125,
      favorite: true,
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
  const stars = [1, 2, 3, 4, 5];

  return (
    <View style={styles.starContainer}>
      {stars.map((star) => (
        <TouchableOpacity
          key={star}
          disabled={!editable}
          onPress={() => onRatingChange?.(star)}
          style={styles.starButton}
        >
          <Text style={[styles.starText, { fontSize: size }]}>
            {star <= rating ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Movie Poster Component
const MoviePoster: React.FC<{
  posterUrl?: string;
  title: string;
  width?: number;
  height?: number;
}> = ({ posterUrl, title, width = POSTER_WIDTH, height = POSTER_HEIGHT }) => {
  const [imageError, setImageError] = useState(false);

  if (!posterUrl || imageError) {
    return (
      <View style={[styles.posterPlaceholder, { width, height }]}>
        <Text style={styles.posterPlaceholderIcon}>🎬</Text>
        <Text style={styles.posterPlaceholderText} numberOfLines={2}>
          {title}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: posterUrl }}
      style={[styles.poster, { width, height }]}
      resizeMode="cover"
      onError={() => setImageError(true)}
    />
  );
};

// Genre Tag Component
const GenreTag: React.FC<{ genreId: string; small?: boolean }> = ({ genreId, small = false }) => {
  const genre = GENRES.find((g) => g.id === genreId);
  if (!genre) return null;

  return (
    <View style={[styles.genreTag, small && styles.genreTagSmall]}>
      <Text style={[styles.genreTagText, small && styles.genreTagTextSmall]}>
        {genre.icon} {genre.name}
      </Text>
    </View>
  );
};

// Status Badge Component
const StatusBadge: React.FC<{ status: MovieStatus }> = ({ status }) => {
  const isWatched = status === 'watched';
  return (
    <View style={[styles.statusBadge, isWatched ? styles.statusWatched : styles.statusWant]}>
      <Text style={styles.statusBadgeText}>
        {isWatched ? '✓ 観た' : '📌 観たい'}
      </Text>
    </View>
  );
};

// ==================== MAIN COMPONENT ====================
const MoviesScreen: React.FC = () => {
  const navigation = useNavigation();

  // State
  const [movies, setMovies] = useState<Movie[]>(createSampleMovies());
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortType, setSortType] = useState<SortType>('date');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [showGenreFilter, setShowGenreFilter] = useState(false);
  const [showStatsDetail, setShowStatsDetail] = useState(false);

  // Add/Edit Form State
  const [formTitle, setFormTitle] = useState('');
  const [formOriginalTitle, setFormOriginalTitle] = useState('');
  const [formPosterUrl, setFormPosterUrl] = useState('');
  const [formReleaseYear, setFormReleaseYear] = useState('');
  const [formDirector, setFormDirector] = useState('');
  const [formGenres, setFormGenres] = useState<string[]>([]);
  const [formStatus, setFormStatus] = useState<MovieStatus>('want');
  const [formRating, setFormRating] = useState(0);
  const [formReview, setFormReview] = useState('');
  const [formRuntime, setFormRuntime] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Computed Values
  const filteredMovies = useMemo(() => {
    let result = [...movies];

    // Filter by tab
    if (activeTab === 'want') {
      result = result.filter((m) => m.status === 'want');
    } else if (activeTab === 'watched') {
      result = result.filter((m) => m.status === 'watched');
    }

    // Filter by genre
    if (selectedGenre) {
      result = result.filter((m) => m.genres.includes(selectedGenre));
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(query) ||
          m.originalTitle?.toLowerCase().includes(query) ||
          m.director?.toLowerCase().includes(query)
      );
    }

    // Sort
    switch (sortType) {
      case 'date':
        result.sort((a, b) => {
          const dateA = a.watchedDate || a.addedDate;
          const dateB = b.watchedDate || b.addedDate;
          return dateB.getTime() - dateA.getTime();
        });
        break;
      case 'rating':
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title, 'ja'));
        break;
    }

    return result;
  }, [movies, activeTab, selectedGenre, searchQuery, sortType]);

  const stats = useMemo(() => {
    const watched = movies.filter((m) => m.status === 'watched');
    const want = movies.filter((m) => m.status === 'want');
    const favorites = movies.filter((m) => m.favorite);
    const totalRuntime = watched.reduce((sum, m) => sum + (m.runtime || 0), 0);
    const avgRating =
      watched.filter((m) => m.rating).reduce((sum, m) => sum + (m.rating || 0), 0) /
        watched.filter((m) => m.rating).length || 0;

    // Monthly stats
    const monthlyMap = new Map<string, MonthlyStats>();
    watched.forEach((m) => {
      if (m.watchedDate) {
        const key = getMonthKey(m.watchedDate);
        const existing = monthlyMap.get(key) || { month: key, count: 0, totalMinutes: 0 };
        existing.count++;
        existing.totalMinutes += m.runtime || 0;
        monthlyMap.set(key, existing);
      }
    });
    const monthlyStats = Array.from(monthlyMap.values()).sort((a, b) =>
      b.month.localeCompare(a.month)
    );

    // Genre distribution
    const genreCount = new Map<string, number>();
    watched.forEach((m) => {
      m.genres.forEach((g) => {
        genreCount.set(g, (genreCount.get(g) || 0) + 1);
      });
    });
    const topGenres = Array.from(genreCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Current year stats
    const currentYear = new Date().getFullYear();
    const thisYearWatched = watched.filter(
      (m) => m.watchedDate && m.watchedDate.getFullYear() === currentYear
    );
    const thisYearRuntime = thisYearWatched.reduce((sum, m) => sum + (m.runtime || 0), 0);

    return {
      watchedCount: watched.length,
      wantCount: want.length,
      favoritesCount: favorites.length,
      totalRuntime,
      avgRating,
      monthlyStats,
      topGenres,
      thisYearCount: thisYearWatched.length,
      thisYearRuntime,
    };
  }, [movies]);

  // Handlers
  const resetForm = useCallback(() => {
    setFormTitle('');
    setFormOriginalTitle('');
    setFormPosterUrl('');
    setFormReleaseYear('');
    setFormDirector('');
    setFormGenres([]);
    setFormStatus('want');
    setFormRating(0);
    setFormReview('');
    setFormRuntime('');
    setIsEditing(false);
  }, []);

  const openAddModal = useCallback(() => {
    resetForm();
    setShowAddModal(true);
  }, [resetForm]);

  const openEditModal = useCallback((movie: Movie) => {
    setFormTitle(movie.title);
    setFormOriginalTitle(movie.originalTitle || '');
    setFormPosterUrl(movie.posterUrl || '');
    setFormReleaseYear(movie.releaseYear?.toString() || '');
    setFormDirector(movie.director || '');
    setFormGenres(movie.genres);
    setFormStatus(movie.status);
    setFormRating(movie.rating || 0);
    setFormReview(movie.review || '');
    setFormRuntime(movie.runtime?.toString() || '');
    setIsEditing(true);
    setShowDetailModal(false);
    setShowAddModal(true);
  }, []);

  const handleSaveMovie = useCallback(() => {
    if (!formTitle.trim()) {
      Alert.alert('エラー', 'タイトルを入力してください');
      return;
    }

    const movieData: Omit<Movie, 'id' | 'addedDate'> = {
      title: formTitle.trim(),
      originalTitle: formOriginalTitle.trim() || undefined,
      posterUrl: formPosterUrl.trim() || undefined,
      releaseYear: formReleaseYear ? parseInt(formReleaseYear) : undefined,
      director: formDirector.trim() || undefined,
      genres: formGenres,
      status: formStatus,
      rating: formStatus === 'watched' ? formRating || undefined : undefined,
      review: formStatus === 'watched' ? formReview.trim() || undefined : undefined,
      watchedDate: formStatus === 'watched' ? new Date() : undefined,
      runtime: formRuntime ? parseInt(formRuntime) : undefined,
      favorite: false,
    };

    if (isEditing && selectedMovie) {
      setMovies((prev) =>
        prev.map((m) =>
          m.id === selectedMovie.id
            ? {
                ...m,
                ...movieData,
                watchedDate:
                  movieData.status === 'watched' && m.status === 'want'
                    ? new Date()
                    : m.watchedDate,
              }
            : m
        )
      );
    } else {
      const newMovie: Movie = {
        id: generateId(),
        ...movieData,
        addedDate: new Date(),
      };
      setMovies((prev) => [newMovie, ...prev]);
    }

    setShowAddModal(false);
    resetForm();
  }, [
    formTitle,
    formOriginalTitle,
    formPosterUrl,
    formReleaseYear,
    formDirector,
    formGenres,
    formStatus,
    formRating,
    formReview,
    formRuntime,
    isEditing,
    selectedMovie,
    resetForm,
  ]);

  const handleDeleteMovie = useCallback(() => {
    if (!selectedMovie) return;

    Alert.alert(
      '削除確認',
      `「${selectedMovie.title}」を削除しますか？`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            setMovies((prev) => prev.filter((m) => m.id !== selectedMovie.id));
            setShowDetailModal(false);
            setSelectedMovie(null);
          },
        },
      ]
    );
  }, [selectedMovie]);

  const toggleFavorite = useCallback((movieId: string) => {
    setMovies((prev) =>
      prev.map((m) => (m.id === movieId ? { ...m, favorite: !m.favorite } : m))
    );
  }, []);

  const markAsWatched = useCallback((movie: Movie) => {
    setMovies((prev) =>
      prev.map((m) =>
        m.id === movie.id
          ? { ...m, status: 'watched', watchedDate: new Date() }
          : m
      )
    );
  }, []);

  const toggleGenreSelection = useCallback((genreId: string) => {
    setFormGenres((prev) =>
      prev.includes(genreId) ? prev.filter((g) => g !== genreId) : [...prev, genreId]
    );
  }, []);

  // Render Functions
  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Text style={styles.backButtonText}>←</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>🎬 映画記録</Text>
      <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="映画を検索..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearButton}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      {[
        { key: 'all' as TabType, label: '全て', count: movies.length },
        { key: 'want' as TabType, label: '観たい', count: stats.wantCount },
        { key: 'watched' as TabType, label: '観た', count: stats.watchedCount },
        { key: 'stats' as TabType, label: '統計', icon: '📊' },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && styles.tabActive]}
          onPress={() => setActiveTab(tab.key)}
        >
          <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
            {tab.icon || tab.label}
            {tab.count !== undefined && ` (${tab.count})`}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderFilterBar = () => (
    <View style={styles.filterBar}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.filterChip, !selectedGenre && styles.filterChipActive]}
          onPress={() => setSelectedGenre(null)}
        >
          <Text style={[styles.filterChipText, !selectedGenre && styles.filterChipTextActive]}>
            全ジャンル
          </Text>
        </TouchableOpacity>
        {GENRES.slice(0, 8).map((genre) => (
          <TouchableOpacity
            key={genre.id}
            style={[styles.filterChip, selectedGenre === genre.id && styles.filterChipActive]}
            onPress={() => setSelectedGenre(genre.id === selectedGenre ? null : genre.id)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedGenre === genre.id && styles.filterChipTextActive,
              ]}
            >
              {genre.icon} {genre.name}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={styles.filterChip}
          onPress={() => setShowGenreFilter(true)}
        >
          <Text style={styles.filterChipText}>もっと見る ›</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.sortContainer}>
        <TouchableOpacity
          style={styles.viewModeButton}
          onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
        >
          <Text style={styles.viewModeIcon}>{viewMode === 'grid' ? '☷' : '☰'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => {
            const types: SortType[] = ['date', 'rating', 'title'];
            const currentIndex = types.indexOf(sortType);
            setSortType(types[(currentIndex + 1) % types.length]);
          }}
        >
          <Text style={styles.sortButtonText}>
            {sortType === 'date' ? '📅 日付' : sortType === 'rating' ? '⭐ 評価' : '📝 タイトル'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderMovieCard = (movie: Movie) => (
    <TouchableOpacity
      key={movie.id}
      style={viewMode === 'grid' ? styles.gridCard : styles.listCard}
      onPress={() => {
        setSelectedMovie(movie);
        setShowDetailModal(true);
      }}
      activeOpacity={0.8}
    >
      {viewMode === 'grid' ? (
        <View style={styles.gridCardContent}>
          <View style={styles.posterContainer}>
            <MoviePoster posterUrl={movie.posterUrl} title={movie.title} />
            {movie.favorite && (
              <View style={styles.favoriteOverlay}>
                <Text style={styles.favoriteIcon}>❤️</Text>
              </View>
            )}
            {movie.status === 'watched' && movie.rating && (
              <View style={styles.ratingOverlay}>
                <Text style={styles.ratingOverlayText}>★ {movie.rating.toFixed(1)}</Text>
              </View>
            )}
          </View>
          <Text style={styles.gridCardTitle} numberOfLines={2}>
            {movie.title}
          </Text>
          {movie.releaseYear && (
            <Text style={styles.gridCardYear}>{movie.releaseYear}</Text>
          )}
        </View>
      ) : (
        <View style={styles.listCardContent}>
          <MoviePoster
            posterUrl={movie.posterUrl}
            title={movie.title}
            width={80}
            height={120}
          />
          <View style={styles.listCardInfo}>
            <View style={styles.listCardHeader}>
              <Text style={styles.listCardTitle} numberOfLines={1}>
                {movie.title}
              </Text>
              {movie.favorite && <Text style={styles.favoriteIconSmall}>❤️</Text>}
            </View>
            {movie.originalTitle && (
              <Text style={styles.listCardOriginalTitle} numberOfLines={1}>
                {movie.originalTitle}
              </Text>
            )}
            <View style={styles.listCardMeta}>
              {movie.releaseYear && (
                <Text style={styles.listCardMetaText}>{movie.releaseYear}</Text>
              )}
              {movie.director && (
                <Text style={styles.listCardMetaText}>監督: {movie.director}</Text>
              )}
            </View>
            <View style={styles.listCardGenres}>
              {movie.genres.slice(0, 2).map((g) => (
                <GenreTag key={g} genreId={g} small />
              ))}
            </View>
            <View style={styles.listCardFooter}>
              <StatusBadge status={movie.status} />
              {movie.status === 'watched' && movie.rating && (
                <StarRating rating={movie.rating} size={14} />
              )}
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderMovieList = () => {
    if (filteredMovies.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>🎬</Text>
          <Text style={styles.emptyStateText}>
            {searchQuery
              ? '検索結果がありません'
              : activeTab === 'want'
              ? '観たい映画を追加しましょう'
              : activeTab === 'watched'
              ? 'まだ観た映画がありません'
              : '映画を追加しましょう'}
          </Text>
          <TouchableOpacity style={styles.emptyStateButton} onPress={openAddModal}>
            <Text style={styles.emptyStateButtonText}>+ 映画を追加</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={viewMode === 'grid' ? styles.gridContainer : styles.listContainer}>
        {filteredMovies.map(renderMovieCard)}
      </View>
    );
  };

  const renderStats = () => (
    <ScrollView style={styles.statsContainer} showsVerticalScrollIndicator={false}>
      {/* Overview Cards */}
      <View style={styles.statsOverview}>
        <View style={styles.statsCard}>
          <Text style={styles.statsCardIcon}>🎬</Text>
          <Text style={styles.statsCardValue}>{stats.watchedCount}</Text>
          <Text style={styles.statsCardLabel}>観た映画</Text>
        </View>
        <View style={styles.statsCard}>
          <Text style={styles.statsCardIcon}>📌</Text>
          <Text style={styles.statsCardValue}>{stats.wantCount}</Text>
          <Text style={styles.statsCardLabel}>観たい</Text>
        </View>
        <View style={styles.statsCard}>
          <Text style={styles.statsCardIcon}>❤️</Text>
          <Text style={styles.statsCardValue}>{stats.favoritesCount}</Text>
          <Text style={styles.statsCardLabel}>お気に入り</Text>
        </View>
      </View>

      {/* Viewing Time */}
      <View style={styles.statsSection}>
        <Text style={styles.statsSectionTitle}>⏱ 視聴時間</Text>
        <View style={styles.statsSectionContent}>
          <View style={styles.statsRow}>
            <Text style={styles.statsRowLabel}>総視聴時間</Text>
            <Text style={styles.statsRowValue}>{formatRuntime(stats.totalRuntime)}</Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statsRowLabel}>{new Date().getFullYear()}年の視聴</Text>
            <Text style={styles.statsRowValue}>
              {stats.thisYearCount}本 ({formatRuntime(stats.thisYearRuntime)})
            </Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statsRowLabel}>平均評価</Text>
            <Text style={styles.statsRowValue}>
              ★ {stats.avgRating.toFixed(1)}
            </Text>
          </View>
        </View>
      </View>

      {/* Top Genres */}
      <View style={styles.statsSection}>
        <Text style={styles.statsSectionTitle}>🎭 よく観るジャンル</Text>
        <View style={styles.statsSectionContent}>
          {stats.topGenres.map(([genreId, count], index) => {
            const genre = GENRES.find((g) => g.id === genreId);
            if (!genre) return null;
            const percentage = (count / stats.watchedCount) * 100;
            return (
              <View key={genreId} style={styles.genreStatsRow}>
                <Text style={styles.genreStatsRank}>#{index + 1}</Text>
                <Text style={styles.genreStatsIcon}>{genre.icon}</Text>
                <Text style={styles.genreStatsName}>{genre.name}</Text>
                <View style={styles.genreStatsBar}>
                  <View
                    style={[styles.genreStatsBarFill, { width: `${percentage}%` }]}
                  />
                </View>
                <Text style={styles.genreStatsCount}>{count}本</Text>
              </View>
            );
          })}
          {stats.topGenres.length === 0 && (
            <Text style={styles.statsEmptyText}>データがまだありません</Text>
          )}
        </View>
      </View>

      {/* Monthly Stats */}
      <View style={styles.statsSection}>
        <Text style={styles.statsSectionTitle}>📅 月別視聴履歴</Text>
        <View style={styles.statsSectionContent}>
          {stats.monthlyStats.slice(0, 6).map((month) => (
            <View key={month.month} style={styles.monthlyStatsRow}>
              <Text style={styles.monthlyStatsMonth}>{getMonthLabel(month.month)}</Text>
              <View style={styles.monthlyStatsInfo}>
                <Text style={styles.monthlyStatsCount}>{month.count}本</Text>
                <Text style={styles.monthlyStatsTime}>
                  {formatRuntime(month.totalMinutes)}
                </Text>
              </View>
            </View>
          ))}
          {stats.monthlyStats.length === 0 && (
            <Text style={styles.statsEmptyText}>まだ視聴記録がありません</Text>
          )}
        </View>
      </View>

      <View style={styles.statsFooter} />
    </ScrollView>
  );

  // Modals
  const renderAddModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setShowAddModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowAddModal(false)}>
            <Text style={styles.modalCancel}>キャンセル</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {isEditing ? '映画を編集' : '映画を追加'}
          </Text>
          <TouchableOpacity onPress={handleSaveMovie}>
            <Text style={styles.modalSave}>保存</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
          {/* Title */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>タイトル *</Text>
            <TextInput
              style={styles.formInput}
              value={formTitle}
              onChangeText={setFormTitle}
              placeholder="映画のタイトル"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          {/* Original Title */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>原題</Text>
            <TextInput
              style={styles.formInput}
              value={formOriginalTitle}
              onChangeText={setFormOriginalTitle}
              placeholder="Original Title"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          {/* Poster URL */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>ポスター画像URL</Text>
            <TextInput
              style={styles.formInput}
              value={formPosterUrl}
              onChangeText={setFormPosterUrl}
              placeholder="https://..."
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              keyboardType="url"
            />
            {formPosterUrl && (
              <View style={styles.posterPreview}>
                <MoviePoster posterUrl={formPosterUrl} title={formTitle} width={100} height={150} />
              </View>
            )}
          </View>

          {/* Year & Director Row */}
          <View style={styles.formRow}>
            <View style={[styles.formGroup, styles.formGroupHalf]}>
              <Text style={styles.formLabel}>公開年</Text>
              <TextInput
                style={styles.formInput}
                value={formReleaseYear}
                onChangeText={setFormReleaseYear}
                placeholder="2024"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
            <View style={[styles.formGroup, styles.formGroupHalf]}>
              <Text style={styles.formLabel}>上映時間（分）</Text>
              <TextInput
                style={styles.formInput}
                value={formRuntime}
                onChangeText={setFormRuntime}
                placeholder="120"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* Director */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>監督</Text>
            <TextInput
              style={styles.formInput}
              value={formDirector}
              onChangeText={setFormDirector}
              placeholder="監督名"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          {/* Genres */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>ジャンル</Text>
            <View style={styles.genreGrid}>
              {GENRES.map((genre) => (
                <TouchableOpacity
                  key={genre.id}
                  style={[
                    styles.genreOption,
                    formGenres.includes(genre.id) && styles.genreOptionSelected,
                  ]}
                  onPress={() => toggleGenreSelection(genre.id)}
                >
                  <Text
                    style={[
                      styles.genreOptionText,
                      formGenres.includes(genre.id) && styles.genreOptionTextSelected,
                    ]}
                  >
                    {genre.icon} {genre.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Status */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>ステータス</Text>
            <View style={styles.statusToggle}>
              <TouchableOpacity
                style={[
                  styles.statusOption,
                  formStatus === 'want' && styles.statusOptionSelected,
                ]}
                onPress={() => setFormStatus('want')}
              >
                <Text
                  style={[
                    styles.statusOptionText,
                    formStatus === 'want' && styles.statusOptionTextSelected,
                  ]}
                >
                  📌 観たい
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.statusOption,
                  formStatus === 'watched' && styles.statusOptionSelected,
                ]}
                onPress={() => setFormStatus('watched')}
              >
                <Text
                  style={[
                    styles.statusOptionText,
                    formStatus === 'watched' && styles.statusOptionTextSelected,
                  ]}
                >
                  ✓ 観た
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Rating (only for watched) */}
          {formStatus === 'watched' && (
            <>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>評価</Text>
                <View style={styles.ratingSelector}>
                  <StarRating
                    rating={formRating}
                    size={36}
                    editable
                    onRatingChange={setFormRating}
                  />
                  <Text style={styles.ratingValue}>
                    {formRating > 0 ? `${formRating}.0` : '未評価'}
                  </Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>感想・レビュー</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextarea]}
                  value={formReview}
                  onChangeText={setFormReview}
                  placeholder="映画の感想を書いてください..."
                  placeholderTextColor={COLORS.textMuted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </>
          )}

          <View style={styles.formFooter} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderDetailModal = () => {
    if (!selectedMovie) return null;

    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <SafeAreaView style={styles.detailContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header Image */}
            <View style={styles.detailPosterContainer}>
              <MoviePoster
                posterUrl={selectedMovie.posterUrl}
                title={selectedMovie.title}
                width={SCREEN_WIDTH}
                height={SCREEN_WIDTH * 1.2}
              />
              <View style={styles.detailPosterOverlay}>
                <TouchableOpacity
                  style={styles.detailCloseButton}
                  onPress={() => setShowDetailModal(false)}
                >
                  <Text style={styles.detailCloseButtonText}>✕</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.detailFavoriteButton}
                  onPress={() => toggleFavorite(selectedMovie.id)}
                >
                  <Text style={styles.detailFavoriteButtonText}>
                    {selectedMovie.favorite ? '❤️' : '🤍'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Content */}
            <View style={styles.detailContent}>
              <Text style={styles.detailTitle}>{selectedMovie.title}</Text>
              {selectedMovie.originalTitle && (
                <Text style={styles.detailOriginalTitle}>
                  {selectedMovie.originalTitle}
                </Text>
              )}

              {/* Meta Info */}
              <View style={styles.detailMeta}>
                {selectedMovie.releaseYear && (
                  <Text style={styles.detailMetaItem}>📅 {selectedMovie.releaseYear}</Text>
                )}
                {selectedMovie.runtime && (
                  <Text style={styles.detailMetaItem}>
                    ⏱ {formatRuntime(selectedMovie.runtime)}
                  </Text>
                )}
                {selectedMovie.director && (
                  <Text style={styles.detailMetaItem}>🎬 {selectedMovie.director}</Text>
                )}
              </View>

              {/* Genres */}
              <View style={styles.detailGenres}>
                {selectedMovie.genres.map((g) => (
                  <GenreTag key={g} genreId={g} />
                ))}
              </View>

              {/* Status & Rating */}
              <View style={styles.detailStatusSection}>
                <StatusBadge status={selectedMovie.status} />
                {selectedMovie.status === 'watched' && selectedMovie.watchedDate && (
                  <Text style={styles.detailWatchedDate}>
                    視聴日: {formatDate(selectedMovie.watchedDate)}
                  </Text>
                )}
              </View>

              {selectedMovie.status === 'watched' && selectedMovie.rating && (
                <View style={styles.detailRatingSection}>
                  <Text style={styles.detailRatingLabel}>評価</Text>
                  <View style={styles.detailRatingContainer}>
                    <StarRating rating={selectedMovie.rating} size={28} />
                    <Text style={styles.detailRatingValue}>
                      {selectedMovie.rating.toFixed(1)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Review */}
              {selectedMovie.review && (
                <View style={styles.detailReviewSection}>
                  <Text style={styles.detailReviewLabel}>感想・レビュー</Text>
                  <Text style={styles.detailReviewText}>{selectedMovie.review}</Text>
                </View>
              )}

              {/* Actions */}
              <View style={styles.detailActions}>
                {selectedMovie.status === 'want' && (
                  <TouchableOpacity
                    style={styles.detailActionButton}
                    onPress={() => {
                      markAsWatched(selectedMovie);
                      setShowDetailModal(false);
                    }}
                  >
                    <Text style={styles.detailActionButtonText}>✓ 観た！</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.detailActionButton, styles.detailActionButtonSecondary]}
                  onPress={() => openEditModal(selectedMovie)}
                >
                  <Text style={styles.detailActionButtonTextSecondary}>✏️ 編集</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.detailActionButton, styles.detailActionButtonDanger]}
                  onPress={handleDeleteMovie}
                >
                  <Text style={styles.detailActionButtonTextDanger}>🗑 削除</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  const renderGenreFilterModal = () => (
    <Modal
      visible={showGenreFilter}
      animationType="slide"
      transparent
      onRequestClose={() => setShowGenreFilter(false)}
    >
      <View style={styles.genreModalOverlay}>
        <View style={styles.genreModalContent}>
          <View style={styles.genreModalHeader}>
            <Text style={styles.genreModalTitle}>ジャンルを選択</Text>
            <TouchableOpacity onPress={() => setShowGenreFilter(false)}>
              <Text style={styles.genreModalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.genreModalList}>
            <TouchableOpacity
              style={[styles.genreModalItem, !selectedGenre && styles.genreModalItemSelected]}
              onPress={() => {
                setSelectedGenre(null);
                setShowGenreFilter(false);
              }}
            >
              <Text style={styles.genreModalItemText}>全ジャンル</Text>
            </TouchableOpacity>
            {GENRES.map((genre) => (
              <TouchableOpacity
                key={genre.id}
                style={[
                  styles.genreModalItem,
                  selectedGenre === genre.id && styles.genreModalItemSelected,
                ]}
                onPress={() => {
                  setSelectedGenre(genre.id);
                  setShowGenreFilter(false);
                }}
              >
                <Text style={styles.genreModalItemText}>
                  {genre.icon} {genre.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderSearchBar()}
      {renderTabs()}

      {activeTab === 'stats' ? (
        renderStats()
      ) : (
        <>
          {renderFilterBar()}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {renderMovieList()}
            <View style={styles.contentFooter} />
          </ScrollView>
        </>
      )}

      {renderAddModal()}
      {renderDetailModal()}
      {renderGenreFilterModal()}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: COLORS.primary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: COLORS.white,
    fontWeight: 'bold',
  },

  // Search
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
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
  clearButton: {
    fontSize: 16,
    color: COLORS.textMuted,
    padding: 4,
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Filter Bar
  filterBar: {
    backgroundColor: COLORS.white,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    marginLeft: 8,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  sortContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  viewModeButton: {
    padding: 8,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  viewModeIcon: {
    fontSize: 18,
    color: COLORS.textSecondary,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  sortButtonText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // Content
  content: {
    flex: 1,
  },
  contentFooter: {
    height: 40,
  },

  // Grid View
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: GRID_SPACING,
  },
  gridCard: {
    width: POSTER_WIDTH,
  },
  gridCardContent: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  posterContainer: {
    position: 'relative',
  },
  poster: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  posterPlaceholder: {
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  posterPlaceholderIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  posterPlaceholderText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  favoriteOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: 4,
  },
  favoriteIcon: {
    fontSize: 14,
  },
  ratingOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  ratingOverlayText: {
    color: COLORS.star,
    fontSize: 12,
    fontWeight: 'bold',
  },
  gridCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    padding: 8,
    paddingBottom: 2,
  },
  gridCardYear: {
    fontSize: 11,
    color: COLORS.textMuted,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },

  // List View
  listContainer: {
    padding: 16,
  },
  listCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  listCardContent: {
    flexDirection: 'row',
    padding: 12,
  },
  listCardInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  listCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listCardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  favoriteIconSmall: {
    fontSize: 14,
    marginLeft: 4,
  },
  listCardOriginalTitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  listCardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 8,
  },
  listCardMetaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  listCardGenres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 4,
  },
  listCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },

  // Genre Tag
  genreTag: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  genreTagSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  genreTagText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  genreTagTextSmall: {
    fontSize: 10,
  },

  // Status Badge
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusWant: {
    backgroundColor: '#E3F2FD',
  },
  statusWatched: {
    backgroundColor: '#E8F5E9',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Star Rating
  starContainer: {
    flexDirection: 'row',
  },
  starButton: {
    padding: 2,
  },
  starText: {
    color: COLORS.star,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyStateButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },

  // Stats
  statsContainer: {
    flex: 1,
    padding: 16,
  },
  statsOverview: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statsCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  statsCardIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statsCardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statsCardLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statsSection: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  statsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  statsSectionContent: {
    padding: 16,
    paddingTop: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statsRowLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statsRowValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  genreStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  genreStatsRank: {
    width: 28,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  genreStatsIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  genreStatsName: {
    width: 90,
    fontSize: 14,
    color: COLORS.text,
  },
  genreStatsBar: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.borderLight,
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  genreStatsBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  genreStatsCount: {
    width: 40,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  monthlyStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  monthlyStatsMonth: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  monthlyStatsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  monthlyStatsCount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  monthlyStatsTime: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  statsEmptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 16,
  },
  statsFooter: {
    height: 40,
  },

  // Modal - Add/Edit
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalCancel: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalSave: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  formGroupHalf: {
    flex: 1,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formTextarea: {
    minHeight: 120,
    paddingTop: 14,
  },
  posterPreview: {
    marginTop: 12,
    alignItems: 'center',
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  genreOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  genreOptionText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  genreOptionTextSelected: {
    color: COLORS.white,
    fontWeight: '500',
  },
  statusToggle: {
    flexDirection: 'row',
    gap: 12,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  statusOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.background,
  },
  statusOptionText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  statusOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  ratingSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ratingValue: {
    marginLeft: 16,
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  formFooter: {
    height: 40,
  },

  // Modal - Detail
  detailContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  detailPosterContainer: {
    position: 'relative',
  },
  detailPosterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 16,
  },
  detailCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailCloseButtonText: {
    color: COLORS.white,
    fontSize: 20,
  },
  detailFavoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailFavoriteButtonText: {
    fontSize: 22,
  },
  detailContent: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  detailOriginalTitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  detailMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 12,
  },
  detailMetaItem: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  detailGenres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  detailStatusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 12,
  },
  detailWatchedDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  detailRatingSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: COLORS.background,
    borderRadius: 16,
  },
  detailRatingLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  detailRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailRatingValue: {
    marginLeft: 12,
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  detailReviewSection: {
    marginTop: 20,
  },
  detailReviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  detailReviewText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  detailActions: {
    marginTop: 24,
    gap: 12,
  },
  detailActionButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  detailActionButtonSecondary: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailActionButtonDanger: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  detailActionButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  detailActionButtonTextSecondary: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  detailActionButtonTextDanger: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: '600',
  },

  // Genre Filter Modal
  genreModalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  genreModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  genreModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  genreModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  genreModalClose: {
    fontSize: 20,
    color: COLORS.textMuted,
  },
  genreModalList: {
    padding: 8,
  },
  genreModalItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginVertical: 2,
  },
  genreModalItemSelected: {
    backgroundColor: COLORS.background,
  },
  genreModalItemText: {
    fontSize: 16,
    color: COLORS.text,
  },
});

export default MoviesScreen;
