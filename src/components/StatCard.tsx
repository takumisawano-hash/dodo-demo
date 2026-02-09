import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  iconName?: string;
  color: string;
  bgColor: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconName,
  color,
  bgColor,
  trend,
  trendValue,
}: StatCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      default:
        return '→';
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return '#4CAF50';
      case 'down':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: bgColor }]}>
      <View style={styles.header}>
        {iconName ? (
          <Ionicons name={iconName as any} size={18} color={color} style={{ marginRight: 6 }} />
        ) : icon ? (
          <Text style={styles.icon}>{icon}</Text>
        ) : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={[styles.value, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {trend && trendValue && (
        <View style={styles.trendContainer}>
          <Text style={[styles.trendIcon, { color: getTrendColor() }]}>
            {getTrendIcon()}
          </Text>
          <Text style={[styles.trendValue, { color: getTrendColor() }]}>
            {trendValue}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 18,
    marginRight: 6,
  },
  title: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  value: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  trendIcon: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 4,
  },
  trendValue: {
    fontSize: 12,
    fontWeight: '600',
  },
});
