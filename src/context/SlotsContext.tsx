import React, { createContext, useContext, useState, ReactNode } from 'react';

// 15体のエージェント定義
const ALL_AGENTS = [
  { id: 'diet-coach', name: 'ドードー', role: 'ダイエット', color: '#FF9800', emoji: '🦤', description: '無理なく続く食事管理', killerFeature: '週間食事プラン', isSubscribed: false },
  { id: 'language-tutor', name: 'ポリー', role: '語学', color: '#81C784', emoji: '🦜', description: '楽しく言語を学ぶ', killerFeature: '毎日5分レッスン', isSubscribed: false },
  { id: 'habit-coach', name: 'オウル', role: '習慣化', color: '#BA68C8', emoji: '🦉', description: '良い習慣を作る', killerFeature: '連続記録バッジ', isSubscribed: false },
  { id: 'money-coach', name: 'フィンチ', role: 'お金/節約', color: '#FFD54F', emoji: '💰', description: '家計管理と貯金', killerFeature: '月間予算ダッシュボード', isSubscribed: false },
  { id: 'sleep-coach', name: 'コアラ', role: '睡眠', color: '#90A4AE', emoji: '🐨', description: 'ぐっすり眠れる', killerFeature: '睡眠スコア', isSubscribed: false },
  { id: 'mental-coach', name: 'スワン', role: 'メンタル', color: '#F48FB1', emoji: '🦢', description: '心の健康ケア', killerFeature: '気分トラッカー', isSubscribed: false },
  { id: 'career-coach', name: 'イーグル', role: 'キャリア', color: '#FF7043', emoji: '🦅', description: '転職・キャリアアップ', killerFeature: '面接シミュレーション', isSubscribed: false },
  { id: 'study-coach', name: 'ホーク', role: '勉強', color: '#7986CB', emoji: '📚', description: '効率的な学習', killerFeature: '学習進捗ダッシュボード', isSubscribed: false },
  { id: 'fitness-coach', name: 'ゴリラ', role: '筋トレ', color: '#A1887F', emoji: '🦍', description: 'パワフルな体づくり', killerFeature: '週間トレーニングメニュー', isSubscribed: false },
  { id: 'cooking-coach', name: 'ニワトリ', role: '料理', color: '#FFAB91', emoji: '🍳', description: '毎日の食事づくり', killerFeature: '週間献立＋買い物リスト', isSubscribed: false },
  { id: 'parenting-coach', name: 'ペリカン', role: '育児', color: '#80DEEA', emoji: '👶', description: '子育てサポート', killerFeature: '月齢別マイルストーン', isSubscribed: false },
  { id: 'romance-coach', name: 'フラミンゴ', role: '恋愛', color: '#F8BBD9', emoji: '💑', description: '恋愛・婚活サポート', killerFeature: 'デートプラン提案', isSubscribed: false },
  { id: 'organize-coach', name: 'ビーバー', role: '整理整頓', color: '#BCAAA4', emoji: '🏠', description: '片付け・断捨離', killerFeature: '部屋別チェックリスト', isSubscribed: false },
  { id: 'time-coach', name: 'ハチドリ', role: '時間管理', color: '#CE93D8', emoji: '⏰', description: '効率的な時間活用', killerFeature: 'スケジュール最適化', isSubscribed: false },
  { id: 'digital-coach', name: 'パンダ', role: 'デジタル', color: '#B0BEC5', emoji: '📱', description: 'スマホとの付き合い方', killerFeature: 'スクリーンタイム管理', isSubscribed: false },
];

export interface Agent {
  id: string;
  name: string;
  role: string;
  color: string;
  emoji: string;
  description: string;
  killerFeature: string;
  isSubscribed: boolean;
}

interface SlotsContextType {
  assignedAgents: (Agent | null)[];
  setAssignedAgents: (agents: (Agent | null)[]) => void;
  allAgents: Agent[];
  myCoaches: Agent[];
  addToSlot: (agent: Agent, slotIndex?: number) => boolean;
  removeFromSlot: (slotIndex: number) => void;
  isInSlot: (agentId: string) => boolean;
  hasEmptySlot: () => boolean;
}

const SlotsContext = createContext<SlotsContextType | undefined>(undefined);

export function SlotsProvider({ children }: { children: ReactNode }) {
  // 初期状態: 空（オンボーディングで選択）
  const [assignedAgents, setAssignedAgents] = useState<(Agent | null)[]>([
    null,  // 空きスロット
    null,  // 空きスロット
    null,  // 空きスロット
  ]);

  // スロットに入っているコーチ（nullを除外）
  const myCoaches = assignedAgents.filter((a): a is Agent => a !== null);

  // すべてのエージェント（スロット状態を反映）
  const allAgents = ALL_AGENTS.map(agent => ({
    ...agent,
    isSubscribed: assignedAgents.some(a => a?.id === agent.id),
  }));

  // スロットに追加
  const addToSlot = (agent: Agent, slotIndex?: number): boolean => {
    // 既に追加済みチェック
    if (assignedAgents.some(a => a?.id === agent.id)) {
      return false;
    }

    const newAgents = [...assignedAgents];
    
    if (slotIndex !== undefined && newAgents[slotIndex] === null) {
      // 指定スロットに追加
      newAgents[slotIndex] = { ...agent, isSubscribed: true };
      setAssignedAgents(newAgents);
      return true;
    }

    // 空きスロットを探す
    const emptyIndex = newAgents.findIndex(a => a === null);
    if (emptyIndex !== -1) {
      newAgents[emptyIndex] = { ...agent, isSubscribed: true };
      setAssignedAgents(newAgents);
      return true;
    }

    return false; // 空きなし
  };

  // スロットから削除
  const removeFromSlot = (slotIndex: number) => {
    const newAgents = [...assignedAgents];
    newAgents[slotIndex] = null;
    setAssignedAgents(newAgents);
  };

  // スロットに入っているかチェック
  const isInSlot = (agentId: string): boolean => {
    return assignedAgents.some(a => a?.id === agentId);
  };

  // 空きスロットがあるかチェック
  const hasEmptySlot = (): boolean => {
    return assignedAgents.some(a => a === null);
  };

  return (
    <SlotsContext.Provider
      value={{
        assignedAgents,
        setAssignedAgents,
        allAgents,
        myCoaches,
        addToSlot,
        removeFromSlot,
        isInSlot,
        hasEmptySlot,
      }}
    >
      {children}
    </SlotsContext.Provider>
  );
}

export function useSlots() {
  const context = useContext(SlotsContext);
  if (!context) {
    throw new Error('useSlots must be used within a SlotsProvider');
  }
  return context;
}
