# RevenueCat セットアップガイド

## 1. RevenueCatアカウント作成

1. https://www.revenuecat.com/ にアクセス
2. 「Get Started Free」でアカウント作成
3. ダッシュボードにログイン

## 2. プロジェクト作成

1. 「Create New Project」
2. プロジェクト名: `DoDo`

## 3. アプリ追加

### iOS (App Store Connect)
1. 「Apps」→「+ New App」
2. Platform: iOS
3. App Store Connect API設定:
   - App Store Connect → Users and Access → Keys
   - 新しいAPIキー作成（Admin権限）
   - Key ID, Issuer ID, Private Key (.p8) をRevenueCatに入力

### Android (Google Play Console)
1. 「+ New App」
2. Platform: Android
3. Google Play Console設定:
   - Google Cloud Console → Service Account作成
   - Play Console → API Access → Service Account連携
   - JSON鍵をRevenueCatにアップロード

## 4. 商品作成

### App Store Connect で商品作成
```
サブスクリプション商品:
- dodo_starter_monthly  ¥480/月
- dodo_starter_yearly   ¥4,608/年
- dodo_basic_monthly    ¥980/月
- dodo_basic_yearly     ¥9,408/年
- dodo_pro_monthly      ¥1,980/月
- dodo_pro_yearly       ¥19,008/年

消耗型商品:
- dodo_slot_addon       ¥300 (スロット追加)
- dodo_messages_50      ¥200 (会話50回)
```

### Google Play Console で商品作成
同じ商品IDで作成

## 5. RevenueCat Products設定

1. RevenueCat Dashboard → Products
2. 各商品をインポート
3. Entitlements作成:
   - `starter` → starter商品に紐付け
   - `basic` → basic商品に紐付け
   - `pro` → pro商品に紐付け

## 6. Offerings設定

1. 「Offerings」→「Create Offering」
2. Identifier: `default`
3. Packages追加:
   - `$rc_monthly` → monthly商品
   - `$rc_annual` → yearly商品

## 7. APIキー取得

1. 「API Keys」
2. iOS用: Public API Key (appl_XXXX)
3. Android用: Public API Key (goog_XXXX)

## 8. コード更新

`src/services/purchases.ts` のAPIキーを更新:
```typescript
const REVENUECAT_API_KEY_IOS = 'appl_実際のキー';
const REVENUECAT_API_KEY_ANDROID = 'goog_実際のキー';
```

## 9. テスト

### iOS
- Sandbox Tester追加（App Store Connect → Sandbox Testers）
- TestFlightでテスト

### Android
- 内部テストトラック使用
- ライセンステスター追加

## 価格表

| プラン | 月額 | 年額 | 年額割引 |
|--------|------|------|----------|
| Starter | ¥480 | ¥4,608 | 20% |
| Basic | ¥980 | ¥9,408 | 20% |
| Pro | ¥1,980 | ¥19,008 | 20% |

| アドオン | 価格 |
|----------|------|
| スロット追加 | ¥300/個 |
| 会話50回 | ¥200 |
