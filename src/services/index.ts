// ========================================
// DoDo App - Services Index
// ========================================

// Base API
export { api, tokenManager, ApiClientError, API_BASE_URL } from './api';

// Purchases (RevenueCat)
export {
  purchaseService,
  PRODUCT_IDS,
  ENTITLEMENTS,
  PLAN_TO_PRODUCT,
  type SubscriptionStatus,
  type PurchaseResult,
} from './purchases';

// Services
export { authService } from './authService';
export { chatService } from './chatService';
export { userService, type UserSettings } from './userService';

// AI Service
export {
  sendChatMessage,
  streamChatMessage,
  configureAI,
  setApiKeys,
  testConnection,
  getAIStatus,
  type ChatMessage,
  type AIResponse,
  type StreamCallbacks,
  type AIConfig,
} from './ai';

// Supabase
export {
  supabase,
  signUp,
  signIn,
  signOut,
  getSession,
  getCurrentUser,
  refreshSession,
  resetPassword,
  updatePassword,
  onAuthStateChange,
  isAuthError,
  isSessionExpired,
  type AuthResult,
  type SignUpData,
  type SignInData,
} from './supabase';

// Database CRUD
export {
  // User Profiles
  getUserProfile,
  createUserProfile,
  updateUserProfile,
  deleteUserProfile,
  // Conversations
  getConversations,
  getConversation,
  createConversation,
  updateConversationTitle,
  deleteConversation,
  // Messages
  getMessages,
  addMessage,
  addMessages,
  deleteMessages,
  // Slot Configs
  getSlotConfigs,
  getSlotConfig,
  getSlotConfigById,
  createSlotConfig,
  updateSlotConfig,
  deleteSlotConfig,
  setActiveSlot,
  getActiveSlot,
  initializeDefaultSlots,
  // Types
  type UserProfile as DbUserProfile,
  type UserProfileInsert,
  type UserProfileUpdate,
  type Conversation as DbConversation,
  type ConversationInsert,
  type ConversationMessage,
  type ConversationMessageInsert,
  type SlotConfig,
  type SlotConfigInsert,
  type SlotConfigUpdate,
  type DbResult,
} from './database';

// Re-export types for convenience
export type {
  // User
  User,
  UserProfile,
  UserUpdateRequest,
  // Auth
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  TokenPayload,
  // Chat
  Message,
  Conversation,
  ConversationParticipant,
  SendMessageRequest,
  CreateConversationRequest,
  // API
  ApiResponse,
  ApiError,
  PaginatedResponse,
  PaginationParams,
  // WebSocket
  WSEvent,
  NewMessageEvent,
  TypingEvent,
  PresenceEvent,
} from '../types';
