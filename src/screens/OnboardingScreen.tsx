import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { AGENT_IMAGES } from '../data/agentImages';
import { t } from '../i18n';

const { width, height } = Dimensions.get('window');

// 人気エージェント（主要6体）
const POPULAR_AGENTS = [
  {
    id: 'diet-coach',
    name: 'ドードー',
    description: 'ダイエット・食事管理',
    color: '#FF9800',
  },
  {
    id: 'language-tutor',
    name: 'ポリー',
    description: '語学学習',
    color: '#9C27B0',
  },
  {
    id: 'habit-coach',
    name: 'オウル',
    description: '習慣化サポート',
    color: '#3F51B5',
  },
  {
    id: 'money-coach',
    name: 'フィンチ',
    description: 'お金・節約',
    color: '#4CAF50',
  },
  {
    id: 'sleep-coach',
    name: 'コアラ',
    description: '睡眠改善',
    color: '#90A4AE',
  },
  {
    id: 'mental-coach',
    name: 'スワン',
    description: 'メンタルケア',
    color: '#F48FB1',
  },
];

interface OnboardingSlide {
  id: string;
  type: 'welcome' | 'features' | 'howto' | 'select-agent';
  title: string;
  subtitle?: string;
  color: string;
  bgColor: string;
}

const ONBOARDING_DATA: OnboardingSlide[] = [
  {
    id: '1',
    type: 'welcome',
    title: 'onboarding.welcome',
    subtitle: 'onboarding.welcomeSubtitle',
    color: '#FF9800',
    bgColor: '#FFF3E0',
  },
  {
    id: '2',
    type: 'features',
    title: 'onboarding.features',
    color: '#81C784',
    bgColor: '#E8F5E9',
  },
  {
    id: '3',
    type: 'howto',
    title: 'onboarding.howto',
    subtitle: 'onboarding.howtoSubtitle',
    color: '#BA68C8',
    bgColor: '#F3E5F5',
  },
  {
    id: '4',
    type: 'select-agent',
    title: 'onboarding.selectCoach',
    subtitle: 'onboarding.selectCoachSubtitle',
    color: '#FFB74D',
    bgColor: '#FFF3E0',
  },
];

interface Props {
  onComplete: (selectedAgentId?: string) => void;
}

export default function OnboardingScreen({ onComplete }: Props) {
  const { colors, isDark } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else if (selectedAgent) {
      onComplete(selectedAgent);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleAgentSelect = (agentId: string) => {
    setSelectedAgent(agentId);
  };

  const handleAgentSelectAndComplete = (agentId: string) => {
    setSelectedAgent(agentId);
    // 選択確認アニメーションを見せてから完了
    setTimeout(() => {
      onComplete(agentId);
    }, 600);
  };

  // ステップ1: ウェルカム画面
  const renderWelcome = (item: OnboardingSlide) => (
    <View style={[styles.slide, { backgroundColor: isDark ? colors.background : item.bgColor }]}>
      <View style={styles.content}>
        {/* エージェントキャラクター画像 */}
        <View style={styles.agentImagesContainer}>
          <Image 
            source={{ uri: AGENT_IMAGES['sleep-coach'] }} 
            style={styles.agentImageSmall}
          />
          <Image 
            source={{ uri: AGENT_IMAGES['diet-coach'] }} 
            style={styles.agentImageCenter}
          />
          <Image 
            source={{ uri: AGENT_IMAGES['mental-coach'] }} 
            style={styles.agentImageSmall}
          />
        </View>
        <View style={styles.secondaryImages}>
          <Image 
            source={{ uri: AGENT_IMAGES['fitness-coach'] }} 
            style={styles.agentImageTiny}
          />
          <Image 
            source={{ uri: AGENT_IMAGES['habit-coach'] }} 
            style={styles.agentImageTiny}
          />
          <Image 
            source={{ uri: AGENT_IMAGES['language-tutor'] }} 
            style={styles.agentImageTiny}
          />
          <Image 
            source={{ uri: AGENT_IMAGES['money-coach'] }} 
            style={styles.agentImageTiny}
          />
        </View>
        <Text style={[styles.title, { color: item.color }]}>{t(item.title)}</Text>
        <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>{item.subtitle ? t(item.subtitle) : ''}</Text>
      </View>
    </View>
  );

  // ステップ2: 機能紹介
  const renderFeatures = (item: OnboardingSlide) => (
    <View style={[styles.slide, { backgroundColor: isDark ? colors.background : item.bgColor }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: item.color }]}>{t(item.title)}</Text>
        
        <View style={styles.featuresContainer}>
          <View style={[styles.featureRow, { backgroundColor: colors.card }]}>
            <Text style={styles.featureIcon}>📝</Text>
            <View style={styles.featureTextContainer}>
              <Text style={[styles.featureCheck, { color: colors.text }]}>{t('onboarding.featureRecord')}</Text>
              <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>{t('onboarding.featureRecordDesc')}</Text>
            </View>
          </View>
          
          <View style={[styles.featureRow, { backgroundColor: colors.card }]}>
            <Text style={styles.featureIcon}>📅</Text>
            <View style={styles.featureTextContainer}>
              <Text style={[styles.featureCheck, { color: colors.text }]}>{t('onboarding.featurePlan')}</Text>
              <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>{t('onboarding.featurePlanDesc')}</Text>
            </View>
          </View>
          
          <View style={[styles.featureRow, { backgroundColor: colors.card }]}>
            <Text style={styles.featureIcon}>🔔</Text>
            <View style={styles.featureTextContainer}>
              <Text style={[styles.featureCheck, { color: colors.text }]}>{t('onboarding.featureReminder')}</Text>
              <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>{t('onboarding.featureReminderDesc')}</Text>
            </View>
          </View>
          
          <View style={[styles.featureRow, { backgroundColor: colors.card }]}>
            <Text style={styles.featureIcon}>📊</Text>
            <View style={styles.featureTextContainer}>
              <Text style={[styles.featureCheck, { color: colors.text }]}>{t('onboarding.featureProgress')}</Text>
              <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>{t('onboarding.featureProgressDesc')}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  // ステップ3: 使い方
  const renderHowTo = (item: OnboardingSlide) => (
    <View style={[styles.slide, { backgroundColor: isDark ? colors.background : item.bgColor }]}>
      <View style={styles.content}>
        <Text style={styles.howtoEmoji}>💬</Text>
        <Text style={[styles.title, { color: item.color }]}>{t(item.title)}</Text>
        <Text style={[styles.howtoSubtitle, { color: colors.textSecondary }]}>{item.subtitle ? t(item.subtitle) : ''}</Text>
        
        {/* クイックアクションボタンのプレビュー */}
        <View style={[styles.quickActionsPreview, { backgroundColor: colors.card }]}>
          <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>{t('onboarding.oneTap')}</Text>
          <View style={styles.previewButtons}>
            <View style={[styles.previewButton, { backgroundColor: isDark ? colors.primaryLight : '#FFF3E0' }]}>
              <Text style={styles.previewButtonEmoji}>📝</Text>
              <Text style={[styles.previewButtonText, { color: colors.text }]}>{t('onboarding.record')}</Text>
            </View>
            <View style={[styles.previewButton, { backgroundColor: isDark ? colors.primaryLight : '#FFF3E0' }]}>
              <Text style={styles.previewButtonEmoji}>📊</Text>
              <Text style={[styles.previewButtonText, { color: colors.text }]}>{t('onboarding.progress')}</Text>
            </View>
            <View style={[styles.previewButton, { backgroundColor: isDark ? colors.successLight : '#E8F5E9' }]}>
              <Text style={styles.previewButtonEmoji}>💡</Text>
              <Text style={[styles.previewButtonText, { color: colors.text }]}>{t('onboarding.advice')}</Text>
            </View>
            <View style={[styles.previewButton, { backgroundColor: isDark ? colors.primaryLight : '#E3F2FD' }]}>
              <Text style={styles.previewButtonEmoji}>⏰</Text>
              <Text style={[styles.previewButtonText, { color: colors.text }]}>{t('onboarding.remind')}</Text>
            </View>
          </View>
        </View>
        
        <View style={[styles.tipContainer, { backgroundColor: isDark ? 'rgba(186, 104, 200, 0.2)' : 'rgba(186, 104, 200, 0.15)' }]}>
          <Text style={styles.tipIcon}>💡</Text>
          <Text style={[styles.tipText, { color: isDark ? '#CE93D8' : '#7B1FA2' }]}>
            {t('onboarding.tipAsk')}
          </Text>
        </View>
      </View>
    </View>
  );

  // ステップ4: エージェント選択
  const renderSelectAgent = (item: OnboardingSlide) => (
    <View style={[styles.slide, { backgroundColor: isDark ? colors.background : item.bgColor }]}>
      <View style={styles.content}>
        <Image 
          source={{ uri: AGENT_IMAGES['diet-coach'] }} 
          style={styles.selectHeaderImage}
        />
        <Text style={[styles.title, { color: item.color }]}>{t(item.title)}</Text>
        <Text style={[styles.selectSubtitle, { color: colors.textSecondary }]}>{item.subtitle ? t(item.subtitle) : ''}</Text>
        
        <View style={styles.agentsContainer}>
          {POPULAR_AGENTS.map((agent) => (
            <TouchableOpacity
              key={agent.id}
              style={[
                styles.agentCard,
                { backgroundColor: colors.card },
                selectedAgent === agent.id && styles.agentCardSelected,
                selectedAgent === agent.id && { borderColor: agent.color },
              ]}
              onPress={() => handleAgentSelectAndComplete(agent.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.agentAvatarContainer, { backgroundColor: agent.color + '20' }]}>
                <Image 
                  source={{ uri: AGENT_IMAGES[agent.id] }} 
                  style={styles.agentCardImage}
                />
              </View>
              <Text style={[styles.agentName, { color: colors.text }]}>{agent.name}</Text>
              <Text style={[styles.agentDescription, { color: colors.textSecondary }]}>{agent.description}</Text>
              {selectedAgent === agent.id && (
                <View style={[styles.selectedBadge, { backgroundColor: agent.color }]}>
                  <Text style={styles.selectedBadgeText}>✓</Text>
                </View>
              )}
              {selectedAgent === agent.id && (
                <View style={styles.selectedOverlay}>
                  <Text style={styles.selectedOverlayText}>選択中...</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: OnboardingSlide }) => {
    switch (item.type) {
      case 'welcome':
        return renderWelcome(item);
      case 'features':
        return renderFeatures(item);
      case 'howto':
        return renderHowTo(item);
      case 'select-agent':
        return renderSelectAgent(item);
      default:
        return null;
    }
  };

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {ONBOARDING_DATA.map((_, index) => {
        const inputRange = [
          (index - 1) * width,
          index * width,
          (index + 1) * width,
        ];
        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 24, 8],
          extrapolate: 'clamp',
        });
        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                width: dotWidth,
                opacity,
                backgroundColor: ONBOARDING_DATA[currentIndex].color,
              },
            ]}
          />
        );
      })}
    </View>
  );

  const isLastSlide = currentIndex === ONBOARDING_DATA.length - 1;
  const currentColor = ONBOARDING_DATA[currentIndex].color;
  const showNextButton = !isLastSlide; // 最後はエージェント選択で完了

  return (
    <SafeAreaView edges={["top"]} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        {!isLastSlide && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>{t('onboarding.skip')}</Text>
          </TouchableOpacity>
        )}
        {isLastSlide && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>{t('onboarding.selectLater')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={ONBOARDING_DATA}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        scrollEventThrottle={16}
      />

      {renderDots()}

      <View style={styles.footer}>
        {showNextButton && (
          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: currentColor }]}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.nextButtonText}>{t('onboarding.next')}</Text>
          </TouchableOpacity>
        )}
        {isLastSlide && (
          <View style={styles.selectHint}>
            <Text style={styles.selectHintText}>
              {t('onboarding.tapToSelect')}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    height: 50,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    color: '#888',
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    width: '100%',
  },
  
  // ステップ1: ウェルカム
  agentImagesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  agentImageSmall: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginHorizontal: 8,
  },
  agentImageCenter: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  secondaryImages: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  agentImageTiny: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginHorizontal: 6,
    opacity: 0.85,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  welcomeSubtitle: {
    fontSize: 18,
    color: '#555',
    textAlign: 'center',
    lineHeight: 28,
  },
  
  // ステップ2: 機能紹介
  featuresContainer: {
    marginTop: 24,
    width: '100%',
    paddingHorizontal: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureCheck: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
    color: '#888',
  },
  
  // ステップ3: 使い方
  howtoEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  howtoSubtitle: {
    fontSize: 17,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  quickActionsPreview: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 20,
  },
  previewLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
  },
  previewButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  previewButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    width: 80,
  },
  previewButtonEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  previewButtonText: {
    fontSize: 12,
    color: '#555',
    fontWeight: '500',
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(186, 104, 200, 0.15)',
    padding: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  tipIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#7B1FA2',
    lineHeight: 22,
    flex: 1,
  },
  
  // ステップ4: エージェント選択
  selectHeaderImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 12,
  },
  selectSubtitle: {
    fontSize: 15,
    color: '#888',
    marginBottom: 24,
  },
  agentsContainer: {
    width: '100%',
    gap: 12,
  },
  agentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  agentCardSelected: {
    borderWidth: 2,
    transform: [{ scale: 1.02 }],
  },
  agentAvatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  agentCardImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  agentName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  agentDescription: {
    fontSize: 13,
    color: '#888',
    position: 'absolute',
    left: 86,
    bottom: 16,
  },
  selectedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBadgeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectedOverlay: {
    position: 'absolute',
    right: 80,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectedOverlayText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // 共通
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 10,
    minHeight: 90,
  },
  nextButton: {
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  selectHint: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  selectHintText: {
    fontSize: 16,
    color: '#FFB74D',
    fontWeight: '500',
  },
});
