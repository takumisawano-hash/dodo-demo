// ========================================
// DoDo App - TypeScript Type Definitions
// ========================================

// ----------------------------------------
// User Types
// ----------------------------------------
export interface User {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

export interface UserUpdateRequest {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}

// ----------------------------------------
// Auth Types
// ----------------------------------------
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface TokenPayload {
  userId: string;
  email: string;
  exp: number;
  iat: number;
}

// ----------------------------------------
// Chat Types
// ----------------------------------------
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'image' | 'voice' | 'system';
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  participants: ConversationParticipant[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationParticipant {
  userId: string;
  user: User;
  joinedAt: string;
  lastReadAt?: string;
}

export interface SendMessageRequest {
  conversationId: string;
  content: string;
  messageType?: 'text' | 'image' | 'voice';
}

export interface CreateConversationRequest {
  type: 'direct' | 'group';
  participantIds: string[];
  name?: string;
}

// ----------------------------------------
// API Response Types
// ----------------------------------------
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
}

// ----------------------------------------
// WebSocket Event Types
// ----------------------------------------
export interface WSEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: string;
}

export interface NewMessageEvent {
  type: 'new_message';
  payload: Message;
}

export interface TypingEvent {
  type: 'typing';
  payload: {
    conversationId: string;
    userId: string;
    isTyping: boolean;
  };
}

export interface PresenceEvent {
  type: 'presence';
  payload: {
    userId: string;
    status: 'online' | 'offline' | 'away';
  };
}
