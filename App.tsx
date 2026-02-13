import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Text, View, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🦤</Text>
      <Text style={styles.title}>DoDo Life</Text>
      <Text style={styles.subtitle}>AI統合ライフログアプリ</Text>
      <Text style={styles.info}>20個のミニアプリ搭載</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  subtitle: {
    fontSize: 18,
    color: '#333',
    marginTop: 10,
  },
  info: {
    fontSize: 14,
    color: '#666',
    marginTop: 20,
  },
});
