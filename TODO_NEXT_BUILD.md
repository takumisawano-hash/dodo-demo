# 次回ビルド時の変更点

## 反映待ちの変更（2026-02-10）

### 1. 料金プランのシンプル化
- Free: 1スロット / 10メッセージ/日
- Basic: 3スロット / 50メッセージ/日 (¥480/月)
- Pro: 10スロット / 200メッセージ/日 (¥980/月)

### 2. RevenueCat APIキー
- テストキー設定済み: `test_aMNQCUCmgtlpXTMPWfctSONvgRM`
- 本番キーに変更必要

### 3. AI Edge Function
- Supabase Edge Function デプロイ済み
- Haiku/Sonnet 自動切り替え実装済み

## 次回アクション
- [ ] EAS月額リセット後に再ビルド（3月1日以降）
- [ ] または EASアップグレード
- [ ] Google Play Consoleでアップデート申請

## ビルドコマンド
```bash
cd /home/takumi-personal/clawd/projects/dodo-app
npx eas-cli build --platform android --profile production
```
