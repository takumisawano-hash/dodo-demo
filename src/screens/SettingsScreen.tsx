import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const [notifications, setNotifications] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚙️ 設定</Text>
      </View>

      <ScrollView>
        {/* アカウント */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>アカウント</Text>
          <TouchableOpacity style={styles.item}>
            <Text style={styles.itemIcon}>👤</Text>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>プロフィール</Text>
              <Text style={styles.itemSubtitle}>名前・メールアドレス</Text>
            </View>
            <Text style={styles.itemArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.item}>
            <Text style={styles.itemIcon}>💎</Text>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>プレミアム</Text>
              <Text style={styles.itemSubtitle}>無料プラン</Text>
            </View>
            <Text style={styles.itemArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 通知 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>通知</Text>
          <View style={styles.item}>
            <Text style={styles.itemIcon}>🔔</Text>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>プッシュ通知</Text>
              <Text style={styles.itemSubtitle}>リマインダー・お知らせ</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#ddd', true: '#FF6B35' }}
            />
          </View>
        </View>

        {/* 表示 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>表示</Text>
          <View style={styles.item}>
            <Text style={styles.itemIcon}>🌙</Text>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>ダークモード</Text>
              <Text style={styles.itemSubtitle}>目に優しい暗い画面</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#ddd', true: '#FF6B35' }}
            />
          </View>
          <TouchableOpacity style={styles.item}>
            <Text style={styles.itemIcon}>🌐</Text>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>言語</Text>
              <Text style={styles.itemSubtitle}>日本語</Text>
            </View>
            <Text style={styles.itemArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* データ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>データ</Text>
          <TouchableOpacity style={styles.item}>
            <Text style={styles.itemIcon}>📤</Text>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>データエクスポート</Text>
              <Text style={styles.itemSubtitle}>CSV形式でダウンロード</Text>
            </View>
            <Text style={styles.itemArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.item}>
            <Text style={styles.itemIcon}>🗑️</Text>
            <View style={styles.itemContent}>
              <Text style={[styles.itemTitle, { color: '#F44336' }]}>データ削除</Text>
              <Text style={styles.itemSubtitle}>すべてのデータを削除</Text>
            </View>
            <Text style={styles.itemArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* その他 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>その他</Text>
          <TouchableOpacity style={styles.item}>
            <Text style={styles.itemIcon}>📋</Text>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>利用規約</Text>
            </View>
            <Text style={styles.itemArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.item}>
            <Text style={styles.itemIcon}>🔒</Text>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>プライバシーポリシー</Text>
            </View>
            <Text style={styles.itemArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.item}>
            <Text style={styles.itemIcon}>❓</Text>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>ヘルプ・お問い合わせ</Text>
            </View>
            <Text style={styles.itemArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>DoDo Life v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF5E6',
  },
  header: {
    padding: 16,
    backgroundColor: '#FF6B35',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    color: '#333',
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  itemArrow: {
    fontSize: 20,
    color: '#ccc',
  },
  version: {
    textAlign: 'center',
    color: '#999',
    padding: 24,
  },
});
