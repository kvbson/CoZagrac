import { sleep, withRetry } from './retry.js';

const STEAM_REQUEST_DELAY = 1600;

let lastRequestAt = 0;

async function steamRequest<T>(fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const diff = now - lastRequestAt;

  if (diff < STEAM_REQUEST_DELAY) {
    await sleep(STEAM_REQUEST_DELAY - diff);
  }

  lastRequestAt = Date.now();

  return withRetry(fn);
}

export { steamRequest };
