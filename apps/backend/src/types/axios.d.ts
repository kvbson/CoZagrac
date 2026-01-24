import 'axios';

declare module 'axios' {
  export interface AxiosInstance {
    get<T = unknown>(url: string, config?: unknown): Promise<T>;
    post<T = unknown>(url: string, data?: unknown, config?: unknown): Promise<T>;
    put<T = unknown>(url: string, data?: unknown, config?: unknown): Promise<T>;
    delete<T = unknown>(url: string, config?: unknown): Promise<T>;
  }
}
