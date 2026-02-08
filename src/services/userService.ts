// ========================================
// DoDo App - User Service
// ========================================

import { api } from './api';
import {
  User,
  UserProfile,
  UserUpdateRequest,
  PaginatedResponse,
  PaginationParams,
} from '../types';

// ----------------------------------------
// User Service
// ----------------------------------------
export const userService = {
  // ----------------------------------------
  // Profile
  // ----------------------------------------

  /**
   * Get current user's profile
   */
  async getMyProfile(): Promise<UserProfile> {
    return api.get<UserProfile>('/users/me');
  },

  /**
   * Update current user's profile
   */
  async updateMyProfile(data: UserUpdateRequest): Promise<User> {
    return api.patch<User>('/users/me', data);
  },

  /**
   * Get a user's profile by ID
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    return api.get<UserProfile>(`/users/${userId}`);
  },

  /**
   * Get a user's profile by username
   */
  async getUserByUsername(username: string): Promise<UserProfile> {
    return api.get<UserProfile>(`/users/username/${username}`);
  },

  // ----------------------------------------
  // Avatar
  // ----------------------------------------

  /**
   * Upload avatar image
   * Returns the URL of the uploaded avatar
   */
  async uploadAvatar(imageUri: string): Promise<{ avatarUrl: string }> {
    // Create form data for image upload
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'avatar.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('avatar', {
      uri: imageUri,
      name: filename,
      type,
    } as unknown as Blob);

    // Use fetch directly for multipart form data
    const token = await api.get<string>('/auth/token'); // This won't work as-is
    
    // For file uploads, use direct fetch with FormData
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/users/me/avatar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });

    const data = await response.json();
    return data.data;
  },

  /**
   * Delete current avatar
   */
  async deleteAvatar(): Promise<void> {
    await api.delete('/users/me/avatar');
  },

  // ----------------------------------------
  // Search & Discovery
  // ----------------------------------------

  /**
   * Search users by username or display name
   */
  async searchUsers(
    query: string,
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<User>> {
    const searchParams = new URLSearchParams();
    searchParams.set('q', query);
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString());

    return api.get<PaginatedResponse<User>>(`/users/search?${searchParams.toString()}`);
  },

  /**
   * Get suggested users to follow
   */
  async getSuggestedUsers(limit = 10): Promise<User[]> {
    return api.get<User[]>(`/users/suggested?limit=${limit}`);
  },

  // ----------------------------------------
  // Social: Follow/Unfollow
  // ----------------------------------------

  /**
   * Follow a user
   */
  async followUser(userId: string): Promise<void> {
    await api.post(`/users/${userId}/follow`);
  },

  /**
   * Unfollow a user
   */
  async unfollowUser(userId: string): Promise<void> {
    await api.delete(`/users/${userId}/follow`);
  },

  /**
   * Get followers of a user
   */
  async getFollowers(
    userId: string,
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<User>> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.pageSize) query.set('pageSize', params.pageSize.toString());
    if (params.cursor) query.set('cursor', params.cursor);

    const queryString = query.toString();
    const endpoint = `/users/${userId}/followers${queryString ? `?${queryString}` : ''}`;
    
    return api.get<PaginatedResponse<User>>(endpoint);
  },

  /**
   * Get users that a user is following
   */
  async getFollowing(
    userId: string,
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<User>> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page.toString());
    if (params.pageSize) query.set('pageSize', params.pageSize.toString());
    if (params.cursor) query.set('cursor', params.cursor);

    const queryString = query.toString();
    const endpoint = `/users/${userId}/following${queryString ? `?${queryString}` : ''}`;
    
    return api.get<PaginatedResponse<User>>(endpoint);
  },

  /**
   * Check if current user follows a specific user
   */
  async isFollowing(userId: string): Promise<boolean> {
    const result = await api.get<{ isFollowing: boolean }>(`/users/${userId}/is-following`);
    return result.isFollowing;
  },

  // ----------------------------------------
  // Blocking
  // ----------------------------------------

  /**
   * Block a user
   */
  async blockUser(userId: string): Promise<void> {
    await api.post(`/users/${userId}/block`);
  },

  /**
   * Unblock a user
   */
  async unblockUser(userId: string): Promise<void> {
    await api.delete(`/users/${userId}/block`);
  },

  /**
   * Get blocked users
   */
  async getBlockedUsers(): Promise<User[]> {
    return api.get<User[]>('/users/blocked');
  },

  // ----------------------------------------
  // Settings
  // ----------------------------------------

  /**
   * Get user settings
   */
  async getSettings(): Promise<UserSettings> {
    return api.get<UserSettings>('/users/me/settings');
  },

  /**
   * Update user settings
   */
  async updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    return api.patch<UserSettings>('/users/me/settings', settings);
  },
};

// ----------------------------------------
// Additional Types
// ----------------------------------------
export interface UserSettings {
  notifications: {
    push: boolean;
    email: boolean;
    newMessage: boolean;
    newFollower: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private';
    showOnlineStatus: boolean;
    allowDirectMessages: 'everyone' | 'followers' | 'none';
  };
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
  };
}

export default userService;
