import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  features: string[];
  color: string;
  recommended?: boolean;
}

interface PlanCardProps {
  plan: Plan;
  selected: boolean;
  onSelect: (plan: Plan) => void;
}

export default function PlanCard({ plan, selected, onSelect }: PlanCardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        selected && styles.cardSelected,
        plan.recommended && styles.cardRecommended,
        { borderColor: selected ? plan.color : '#E0E0E0' },
      ]}
      onPress={() => onSelect(plan)}
      activeOpacity={0.8}
    >
      {plan.recommended && (
        <View style={[styles.badge, { backgroundColor: plan.color }]}>
          <Text style={styles.badgeText}>おすすめ</Text>
        </View>
      )}

      <View style={styles.header}>
        <Text style={[styles.planName, { color: plan.color }]}>{plan.name}</Text>
        <View style={styles.priceContainer}>
          {plan.price === 0 ? (
            <Text style={styles.priceText}>無料</Text>
          ) : (
            <>
              <Text style={styles.currency}>¥</Text>
              <Text style={styles.priceText}>{plan.price.toLocaleString()}</Text>
              <Text style={styles.period}>/{plan.period}</Text>
            </>
          )}
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.features}>
        {plan.features.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <Text style={[styles.checkIcon, { color: plan.color }]}>✓</Text>
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      {selected && (
        <View style={[styles.selectedIndicator, { backgroundColor: plan.color }]}>
          <Text style={styles.selectedText}>選択中</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardSelected: {
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  cardRecommended: {
    transform: [{ scale: 1.02 }],
  },
  badge: {
    position: 'absolute',
    top: -10,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currency: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  priceText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  period: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },
  features: {
    marginBottom: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#444',
    flex: 1,
  },
  selectedIndicator: {
    marginTop: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  selectedText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
