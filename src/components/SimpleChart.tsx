import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface DataPoint {
  label: string;
  value: number;
}

interface SimpleChartProps {
  data: DataPoint[];
  color: string;
  height?: number;
  showLabels?: boolean;
  type?: 'bar' | 'progress';
}

export default function SimpleChart({
  data,
  color,
  height = 120,
  showLabels = true,
  type = 'bar',
}: SimpleChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  if (type === 'progress') {
    return (
      <View style={styles.progressContainer}>
        {data.map((item, index) => (
          <View key={index} style={styles.progressItem}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>{item.label}</Text>
              <Text style={[styles.progressValue, { color }]}>
                {item.value}%
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: color,
                    width: `${Math.min(item.value, 100)}%`,
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.chartArea, { height }]}>
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * height * 0.85;
          return (
            <View key={index} style={styles.barContainer}>
              <Text style={styles.barValue}>{item.value}</Text>
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(barHeight, 4),
                    backgroundColor: color,
                    opacity: 0.7 + (index / data.length) * 0.3,
                  },
                ]}
              />
              {showLabels && (
                <Text style={styles.barLabel}>{item.label}</Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 20,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  bar: {
    width: '70%',
    borderRadius: 6,
    minWidth: 20,
  },
  barValue: {
    fontSize: 10,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  barLabel: {
    fontSize: 10,
    color: '#888',
    marginTop: 6,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
  },
  progressItem: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
});
