import type { ServiceResponse } from '../types/response';

export const fetchApi = async <T>(
  url: string,
  options: RequestInit,
): Promise<ServiceResponse<T>> => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    return { success: response.ok, userData: response.ok ? await response.json() : null };
  } catch (error: unknown) {
    console.log(error);
    return { success: false, userData: null };
  }
};
