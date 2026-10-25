import type {
  LoginUserInput,
  UserLibraryResponse,
} from '@cozagrac/shared/contracts/api';
import type { ServiceResponse } from '../types/response';
import { fetchApi } from './utils';

export type UserProfile = {
  userId: string;
  steamId: string | null;
};

export const userService = {
  checkAuth: async () =>
    fetchApi<{ userId: string; steamLinked: boolean }>('/api/user/me', { method: 'GET' }),
  login: async (data: LoginUserInput): Promise<ServiceResponse<{ message?: string }>> =>
    fetchApi<{ message?: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  logout: async (): Promise<ServiceResponse<{ message?: string }>> =>
    fetchApi<{ message?: string }>('/api/auth/logout', {
      method: 'POST',
    }),
  register: async (data: LoginUserInput): Promise<ServiceResponse<{ message?: string }>> =>
    fetchApi<{ message?: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  loginBySteam: () => {
    // względna ścieżka: dev -> proxy Vite na backend, prod -> ten sam origin (nginx /api)
    window.location.href = '/api/auth/steam';
  },

  getById: async (userId: string): Promise<ServiceResponse<UserProfile>> =>
    fetchApi<UserProfile>(`/api/user?id=${userId}`, { method: 'GET' }),

  /** PATCH /api/user/:userId - email and/or password */
  updateMe: async (
    userId: string,
    data: { email?: string; password?: string },
  ): Promise<ServiceResponse<UserProfile>> =>
    fetchApi<UserProfile>(`/api/user/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteMe: async (userId: string): Promise<ServiceResponse<null>> =>
    fetchApi<null>(`/api/user/${userId}`, { method: 'DELETE' }),

  getLibrary: async (): Promise<ServiceResponse<UserLibraryResponse>> =>
    fetchApi<UserLibraryResponse>('/api/user/me/library', { method: 'GET' }),
};
