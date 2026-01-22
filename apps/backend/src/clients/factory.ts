import axios, { AxiosInstance } from 'axios';

export const createApiClient = (baseURL: string): AxiosInstance => {
  if (!process.env.STEAM_API_KEY) {
    throw new Error('STEAM_API_KEY is not defined');
  }
  const api = axios.create({
    baseURL,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'CoZagrac/0.0.0',
    },
    params: {
      key: process.env.STEAM_API_KEY,
    },
  });

  api.interceptors.request.use((config) => {
    const fullUrl = `${config.baseURL}${config.url}`;
    console.log(`Making request to ${fullUrl}`);
    return config;
  });

  api.interceptors.response.use(
    (res) => res.data,
    (error) => {
      const status = error.response?.status;
      const url = error.config?.url;
      const data = error.response?.data;

      throw Object.assign(new Error(`Steam API error (${status ?? 'NO_STATUS'}) on ${url}`), {
        data,
        status,
      });
    },
  );

  return api;
};
