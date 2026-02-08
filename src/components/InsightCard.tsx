import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { AGENT_IMAGES } from '../data/agentImages';

export interface Insight {
  id: string;
  message: string;
  affectedAgents: string[];
  type: 'tip' | 'warning' | 'celebration';
}

interface InsightCardProps {
  insight: Insight;
}

const TYPE_CONFIG = {
  tip: {
    icon: '💡',
    bgColor: '#FFF3E0',
    borderColor: '#FF9800',
    textColor: '#1565C0',
  },
  warning: {
    icon: '⚠️',
    bgColor: '#FFF3E0',
    borderColor: '#FFB74D',
    textColor: '#E65100',
  },
  celebration: {
    icon: '🎉',
    bgColor: '#E8F5E9',
    borderColor: '#81C784',
    textColor: '#2E7D32',
  },
};

export default function InsightCard({ insight }: InsightCardProps) {
  const config = TYPE_CONFIG[insight.type];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: config.bgColor,
          borderLeftColor: config.borderColor,
        },
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.icon}>{config.icon}</Text>
        <View style={styles.textContainer}>
          <Text style={[styles.message, { color: config.textColor }]}>
            {insight.message}
          </Text>
        </View>
      </View>
      
      {/* Agent Flow with Images */}
      <View style={styles.agentFlowContainer}>
        {insight.affectedAgents.map((agentId, index) => (
          <React.Fragment key={agentId}>
            {index > 0 && <Text style={styles.arrow}>→</Text>}
            {AGENT_IMAGES[agentId] ? (
              <Image 
                source={{ uri: AGENT_IMAGES[agentId] }} 
                style={styles.agentIcon} 
              />
            ) : (
              <View style={styles.agentIconPlaceholder}>
                <Text style={styles.agentIconText}>?</Text>
              </View>
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 20,
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  agentFlowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  agentIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
  },
  agentIconPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  agentIconText: {
    fontSize: 12,
    color: '#999',
  },
  arrow: {
    fontSize: 16,
    color: '#888',
    marginHorizontal: 6,
  },
});
