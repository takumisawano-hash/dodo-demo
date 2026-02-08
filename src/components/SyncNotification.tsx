import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

// ----------------------------------------
// Types
// ----------------------------------------
interface SyncDestination {
  agentId: string;
  agentEmoji: string;
  field: string;
}

interface Props {
  syncedTo: SyncDestination[];
}

// ----------------------------------------
// SyncNotification Component
// ----------------------------------------
// チャット内に表示する小さな通知カード
// ユーザーが何かを記録した時、他のエージェントにも反映されたことを通知
//
// UI:
// ┌────────────────────────────────┐
// │ ✨ この情報は他のコーチにも共有されました │
// │ 🦤 カロリー消費 → 🐨 運動記録      │
// └────────────────────────────────┘

export default function SyncNotification({ syncedTo }: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  if (!syncedTo || syncedTo.length === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.sparkle}>✨</Text>
        <Text style={styles.headerText}>この情報は他のコーチにも共有されました</Text>
      </View>
      <View style={styles.syncList}>
        {syncedTo.map((dest, index) => (
          <View key={`${dest.agentId}-${index}`} style={styles.syncItem}>
            <Text style={styles.emoji}>{dest.agentEmoji}</Text>
            <Text style={styles.fieldText}>{dest.field}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

// ----------------------------------------
// Styles
// ----------------------------------------
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F5FF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E8E0F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sparkle: {
    fontSize: 14,
    marginRight: 6,
  },
  headerText: {
    fontSize: 12,
    color: '#6B5B95',
    fontWeight: '500',
  },
  syncList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  syncItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#E8E0F8',
  },
  emoji: {
    fontSize: 14,
    marginRight: 4,
  },
  fieldText: {
    fontSize: 12,
    color: '#4A4A4A',
    fontWeight: '500',
  },
});
