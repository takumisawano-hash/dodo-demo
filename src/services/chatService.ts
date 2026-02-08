// ========================================
// DoDo App - Chat Service
// ========================================

import { api } from './api';
import {
  Message,
  Conversation,
  SendMessageRequest,
  CreateConversationRequest,
  PaginatedResponse,
  PaginationParams,
} from '../types';

// ----------------------------------------
// Chat Service
// ----------------------------------------
export const chatService = {
  // ----------------------------------------
  // Conversations
  // ----------------------------------------

  /**
   * Get all conversations for the current user
   */
  async getConversations(
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<Conversation>> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.pageSize) query.set('pageSize', params.pageSize.toString());
    if (params.cursor) query.set('cursor', params.cursor);

    const queryString = query.toString();
    const endpoint = `/conversations${queryString ? `?${queryString}` : ''}`;
    
    return api.get<PaginatedResponse<Conversation>>(endpoint);
  },

  /**
   * Get a single conversation by ID
   */
  async getConversation(conversationId: string): Promise<Conversation> {
    return api.get<Conversation>(`/conversations/${conversationId}`);
  },

  /**
   * Create a new conversation
   */
  async createConversation(data: CreateConversationRequest): Promise<Conversation> {
    return api.post<Conversation>('/conversations', data);
  },

  /**
   * Get or create a direct conversation with a user
   */
  async getOrCreateDirectConversation(userId: string): Promise<Conversation> {
    return api.post<Conversation>('/conversations/direct', { userId });
  },

  /**
   * Leave a conversation (for group chats)
   */
  async leaveConversation(conversationId: string): Promise<void> {
    await api.post(`/conversations/${conversationId}/leave`);
  },

  /**
   * Add participants to a group conversation
   */
  async addParticipants(conversationId: string, userIds: string[]): Promise<Conversation> {
    return api.post<Conversation>(`/conversations/${conversationId}/participants`, { userIds });
  },

  /**
   * Remove a participant from a group conversation
   */
  async removeParticipant(conversationId: string, userId: string): Promise<void> {
    await api.delete(`/conversations/${conversationId}/participants/${userId}`);
  },

  /**
   * Update conversation details (name, etc.)
   */
  async updateConversation(
    conversationId: string,
    data: { name?: string }
  ): Promise<Conversation> {
    return api.patch<Conversation>(`/conversations/${conversationId}`, data);
  },

  // ----------------------------------------
  // Messages
  // ----------------------------------------

  /**
   * Get messages for a conversation
   */
  async getMessages(
    conversationId: string,
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<Message>> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.pageSize) query.set('pageSize', params.pageSize.toString());
    if (params.cursor) query.set('cursor', params.cursor);

    const queryString = query.toString();
    const endpoint = `/conversations/${conversationId}/messages${queryString ? `?${queryString}` : ''}`;
    
    return api.get<PaginatedResponse<Message>>(endpoint);
  },

  /**
   * Send a new message
   */
  async sendMessage(data: SendMessageRequest): Promise<Message> {
    return api.post<Message>(`/conversations/${data.conversationId}/messages`, {
      content: data.content,
      messageType: data.messageType || 'text',
    });
  },

  /**
   * Mark messages as read up to a specific message
   */
  async markAsRead(conversationId: string, messageId?: string): Promise<void> {
    await api.post(`/conversations/${conversationId}/read`, { messageId });
  },

  /**
   * Delete a message
   */
  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    await api.delete(`/conversations/${conversationId}/messages/${messageId}`);
  },

  /**
   * Edit a message
   */
  async editMessage(
    conversationId: string,
    messageId: string,
    content: string
  ): Promise<Message> {
    return api.patch<Message>(
      `/conversations/${conversationId}/messages/${messageId}`,
      { content }
    );
  },

  // ----------------------------------------
  // Typing Indicators
  // ----------------------------------------

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(conversationId: string, isTyping: boolean): Promise<void> {
    await api.post(`/conversations/${conversationId}/typing`, { isTyping });
  },

  // ----------------------------------------
  // Search
  // ----------------------------------------

  /**
   * Search messages across all conversations
   */
  async searchMessages(
    query: string,
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<Message & { conversation: Conversation }>> {
    const searchParams = new URLSearchParams();
    searchParams.set('q', query);
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());

    return api.get<PaginatedResponse<Message & { conversation: Conversation }>>(
      `/messages/search?${searchParams.toString()}`
    );
  },

  // ----------------------------------------
  // Unread Count
  // ----------------------------------------

  /**
   * Get total unread message count
   */
  async getUnreadCount(): Promise<{ total: number; byConversation: Record<string, number> }> {
    return api.get<{ total: number; byConversation: Record<string, number> }>('/messages/unread');
  },
};

export default chatService;
