function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3, baseDelay = 500): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;

      if (attempt > retries) throw err;

      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(`[RETRY ${attempt}] waiting ${delay}ms`);
      await sleep(delay);
    }
  }
}

export { withRetry, sleep };
