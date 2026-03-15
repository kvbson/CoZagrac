export type ServiceResponse<T> = {
  success: boolean;
  userData: T | null;
};
