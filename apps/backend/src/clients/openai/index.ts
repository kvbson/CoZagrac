import OpenAI from 'openai';
import { logger } from '../../utils/logger.js';

const openAiLogger = {
  debug: (msg: string, ...rest: unknown[]) => logger.debug(msg, rest.length ? { rest } : undefined),

  info: (msg: string, ...rest: unknown[]) => logger.info(msg, rest.length ? { rest } : undefined),

  warn: (msg: string, ...rest: unknown[]) => logger.warn(msg, rest.length ? { rest } : undefined),

  error: (msg: string, ...rest: unknown[]) => logger.error(msg, rest[0]),
};

export const openAiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  logger: openAiLogger,
});

export const model = 'text-embedding-3-small';
