// ========================================
// DoDo App - Authentication Service
// ========================================

import { api, tokenManager, ApiClientError } from './api';
import {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
} from '../types';

// ----------------------------------------
// Auth Service
// ----------------------------------------
export const authService = {
  /**
   * Login with email and password
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials, false);
    
    // Save tokens
    await tokenManager.setTokens(response.accessToken, response.refreshToken);
    
    return response;
  },

  /**
   * Register a new user account
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data, false);
    
    // Save tokens after registration
    await tokenManager.setTokens(response.accessToken, response.refreshToken);
    
    return response;
  },

  /**
   * Logout and clear tokens
   */
  async logout(): Promise<void> {
    try {
      // Notify server about logout
      await api.post('/auth/logout', {}, true);
    } catch (error) {
      // Ignore errors during logout - we'll clear tokens anyway
      console.warn('Logout request failed:', error);
    } finally {
      await tokenManager.clearTokens();
    }
  },

  /**
   * Get the current authenticated user
   */
  async getCurrentUser(): Promise<User> {
    return api.get<User>('/auth/me');
  },

  /**
   * Check if user is authenticated (has valid token)
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await tokenManager.getAccessToken();
    if (!token) return false;

    try {
      // Verify token by fetching current user
      await this.getCurrentUser();
      return true;
    } catch (error) {
      if (error instanceof ApiClientError && error.code === 'SESSION_EXPIRED') {
        return false;
      }
      // For other errors, assume token might still be valid
      return true;
    }
  },

  /**
   * Request password reset email
   */
  async requestPasswordReset(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email }, false);
  },

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await api.post('/auth/reset-password', { token, newPassword }, false);
  },

  /**
   * Change password (requires current password)
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post('/auth/change-password', { currentPassword, newPassword });
  },

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<void> {
    await api.post('/auth/verify-email', { token }, false);
  },

  /**
   * Resend verification email
   */
  async resendVerificationEmail(): Promise<void> {
    await api.post('/auth/resend-verification');
  },

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<string | null> {
    const refreshToken = await tokenManager.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const response = await api.post<{ accessToken: string; refreshToken: string }>(
        '/auth/refresh',
        { refreshToken },
        false
      );
      
      await tokenManager.setTokens(response.accessToken, response.refreshToken);
      return response.accessToken;
    } catch {
      await tokenManager.clearTokens();
      return null;
    }
  },

  /**
   * Delete account
   */
  async deleteAccount(password: string): Promise<void> {
    await api.delete('/auth/account');
    await tokenManager.clearTokens();
  },
};

export default authService;
