import { env } from '../env.js';

export const isDev = env.NODE_ENV === 'development';

export const PORT = Number(env.PORT);

export const domain = isDev ? `http://localhost:${PORT}` : 'https://co-zagrac.pl';

export const frontendUrl = env.FRONTEND_URL;
