# 🦤 DoDo - AI Life Coach App

15人のAIコーチがあなたの目標達成をサポートするライフコーチングアプリ。

## ✨ Features

- 15種類の専門AIコーチ（ダイエット、睡眠、メンタル、お金など）
- データ連携（睡眠→食欲→体重の相関分析）
- パステルカラーのかわいいUI
- 日本語・英語対応

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)

### Setup

1. Clone and install
\`\`\`bash
git clone https://github.com/takumisawano-hash/dodo-app.git
cd dodo-app
npm install
\`\`\`

2. Configure environment
\`\`\`bash
cp .env.example .env
# Edit .env with your credentials
\`\`\`

3. Run development
\`\`\`bash
# Frontend (Expo)
npx expo start

# Backend (separate terminal)
cd backend
npm install
npm run dev
\`\`\`

## 📱 Build

### Web
\`\`\`bash
npx expo export --platform web
\`\`\`

### iOS/Android
\`\`\`bash
npx eas build --platform ios
npx eas build --platform android
\`\`\`

## 🏗 Tech Stack

- **Frontend**: Expo / React Native
- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **AI**: Claude API (Anthropic)
- **Payments**: RevenueCat

## 📄 License

Private - All Rights Reserved

## 🔗 Links

- Demo: https://takumisawano-hash.github.io/dodo-demo/
- Support: support@getdodo.app
