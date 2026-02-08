import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';

interface Props {
  type: 'reminder' | 'goal' | 'setting';
  title: string;
  details: {
    icon: string;
    label: string;
    message?: string;
  };
  primaryAction?: {
    label: string;
    onPress: () => void;
  };
  onClose: () => void;
}

const TYPE_CONFIG = {
  reminder: {
    accentColor: '#10B981',
    bgAccent: '#ECFDF5',
    checkBg: '#D1FAE5',
  },
  goal: {
    accentColor: '#059669',
    bgAccent: '#D1FAE5',
    checkBg: '#A7F3D0',
  },
  setting: {
    accentColor: '#34D399',
    bgAccent: '#ECFDF5',
    checkBg: '#D1FAE5',
  },
};

export default function ConfirmationCard({
  type,
  title,
  details,
  primaryAction,
  onClose,
}: Props) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  const config = TYPE_CONFIG[type];

  useEffect(() => {
    // Entrance animation sequence
    Animated.sequence([
      // Fade in card
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      // Pop in checkmark with bounce
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }),
      // Small bounce for emphasis
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -4,
          duration: 100,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 100,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: fadeAnim,
          transform: [{ translateY: bounceAnim }],
        },
      ]}
    >
      {/* Success Header */}
      <View style={styles.header}>
        <Animated.View
          style={[
            styles.checkCircle,
            {
              backgroundColor: config.checkBg,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={[styles.checkMark, { color: config.accentColor }]}>
            ✓
          </Text>
        </Animated.View>
        <Text style={styles.title}>{title}</Text>
      </View>

      {/* Details Section */}
      <View style={[styles.detailsBox, { backgroundColor: config.bgAccent }]}>
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>{details.icon}</Text>
          <Text style={styles.detailLabel}>{details.label}</Text>
        </View>
        {details.message && (
          <Text style={styles.detailMessage}>「{details.message}」</Text>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {primaryAction && (
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: config.accentColor }]}
            onPress={primaryAction.onPress}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>{primaryAction.label}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Text style={styles.closeButtonText}>閉じる</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 8,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
    maxWidth: 320,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkMark: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  detailsBox: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  detailMessage: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 6,
    paddingLeft: 26,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  primaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  closeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  closeButtonText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '500',
  },
});
