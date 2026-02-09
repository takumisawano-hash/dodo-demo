// ========================================
// DoDo App - Coach Request Service
// コーチリクエストの保存・取得
// ========================================

import AsyncStorage from '@react-native-async-storage/async-storage';

const REQUESTS_KEY = '@dodo_coach_requests';

// ----------------------------------------
// リクエストの型定義
// ----------------------------------------
export interface CoachRequest {
  id: string;
  topic: string;
  timestamp: string;
  userId: string;
  fromCoachId?: string; // どのコーチとの会話から発生したか
  status: 'pending' | 'reviewed' | 'implemented';
}

// ----------------------------------------
// リクエストを保存
// ----------------------------------------
export const saveRequest = async (
  topic: string,
  fromCoachId?: string
): Promise<boolean> => {
  try {
    const existing = await AsyncStorage.getItem(REQUESTS_KEY);
    const requests: CoachRequest[] = existing ? JSON.parse(existing) : [];
    
    // 重複チェック（同じトピックが既にあるか）
    const isDuplicate = requests.some(
      r => r.topic.toLowerCase() === topic.toLowerCase() && r.status === 'pending'
    );
    
    if (isDuplicate) {
      console.log('Request already exists:', topic);
      return false;
    }
    
    const newRequest: CoachRequest = {
      id: Date.now().toString(),
      topic,
      timestamp: new Date().toISOString(),
      userId: 'anonymous', // 後で認証追加時に更新
      fromCoachId,
      status: 'pending',
    };
    
    requests.push(newRequest);
    await AsyncStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
    
    console.log('Request saved:', newRequest);
    return true;
  } catch (error) {
    console.error('Error saving request:', error);
    return false;
  }
};

// ----------------------------------------
// 全リクエストを取得
// ----------------------------------------
export const getRequests = async (): Promise<CoachRequest[]> => {
  try {
    const data = await AsyncStorage.getItem(REQUESTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting requests:', error);
    return [];
  }
};

// ----------------------------------------
// ペンディングのリクエストのみ取得
// ----------------------------------------
export const getPendingRequests = async (): Promise<CoachRequest[]> => {
  const all = await getRequests();
  return all.filter(r => r.status === 'pending');
};

// ----------------------------------------
// リクエストのステータスを更新
// ----------------------------------------
export const updateRequestStatus = async (
  requestId: string,
  status: CoachRequest['status']
): Promise<boolean> => {
  try {
    const requests = await getRequests();
    const index = requests.findIndex(r => r.id === requestId);
    
    if (index === -1) return false;
    
    requests[index].status = status;
    await AsyncStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
    return true;
  } catch (error) {
    console.error('Error updating request status:', error);
    return false;
  }
};

// ----------------------------------------
// リクエストを削除
// ----------------------------------------
export const deleteRequest = async (requestId: string): Promise<boolean> => {
  try {
    const requests = await getRequests();
    const filtered = requests.filter(r => r.id !== requestId);
    await AsyncStorage.setItem(REQUESTS_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting request:', error);
    return false;
  }
};

// ----------------------------------------
// 全リクエストをクリア（開発用）
// ----------------------------------------
export const clearAllRequests = async (): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(REQUESTS_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing requests:', error);
    return false;
  }
};

// ----------------------------------------
// リクエスト統計を取得
// ----------------------------------------
export const getRequestStats = async (): Promise<{
  total: number;
  pending: number;
  topTopics: { topic: string; count: number }[];
}> => {
  const requests = await getRequests();
  
  // トピック別カウント
  const topicCounts: Record<string, number> = {};
  requests.forEach(r => {
    const topic = r.topic.toLowerCase();
    topicCounts[topic] = (topicCounts[topic] || 0) + 1;
  });
  
  const topTopics = Object.entries(topicCounts)
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  return {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    topTopics,
  };
};

export default {
  saveRequest,
  getRequests,
  getPendingRequests,
  updateRequestStatus,
  deleteRequest,
  clearAllRequests,
  getRequestStats,
};
