import type { ServiceResponse } from '../types/response';

export const fetchApi = async <T>(
  url: string,
  options: RequestInit = { method: 'GET' },
): Promise<ServiceResponse<T>> => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    });

    const body: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const error =
        body && typeof body === 'object' && 'message' in body
          ? { message: String((body as { message: unknown }).message) }
          : undefined;

      return { success: false, status: response.status, userData: null, error };
    }

    return { success: true, status: response.status, userData: body as T };
  } catch (error: unknown) {
    console.log(error);
    return { success: false, status: 0, userData: null, error: { message: 'Network error' } };
  }
};
