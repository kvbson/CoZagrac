export const isDev = process.env.NODE_ENV === 'development';

export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

export const domain = isDev ? `http://localhost:${PORT}` : 'https://co-zagrac.pl';
