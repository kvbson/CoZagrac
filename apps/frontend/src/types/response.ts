export type ServiceResponse<T> = {
  success: boolean;
  status: number;
  userData: T | null;
  error?: { message?: string };
};
