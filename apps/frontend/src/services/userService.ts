import type { LoginUserInput } from '@cozagrac/shared/contracts/api';
import type { ServiceResponse } from '../types/response';
import { fetchApi } from './utils';

export const userService = {
  checkAuth: async () => fetchApi<{ userId?: string }>('/api/user/me', { method: 'GET' }),
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
};
