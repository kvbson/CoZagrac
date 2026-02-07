import fs from 'fs';
import path from 'path';

const LOG_DIR = path.resolve(process.cwd(), 'logs');
const NODE_ENV = process.env.NODE_ENV ?? 'development';

type LogTypes = 'debug' | 'info' | 'warn' | 'error';

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function write(file: string, payload: object) {
  fs.appendFile(
    path.join(LOG_DIR, file),
    JSON.stringify(payload) + '\n',
    { encoding: 'utf8' },
    () => {},
  );
}

function basePayload(type: LogTypes, msg: string) {
  return {
    type,
    ts: new Date().toISOString(),
    msg,
    env: NODE_ENV,
    pid: process.pid,
  };
}

function consoleOut(type: LogTypes, msg: string, ctx?: unknown) {
  if (NODE_ENV === 'production') return;

  const fn =
    type === 'error'
      ? console.error
      : type === 'warn'
        ? console.warn
        : type === 'debug'
          ? console.debug
          : console.log;

  fn(msg, ctx ?? '');
}

function serializeError(err?: unknown) {
  if (!err) return undefined;

  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }

  return { value: String(err) };
}

export const logger = {
  debug(msg: string, ctx?: Record<string, unknown>) {
    const payload = {
      ...basePayload('debug', msg),
      ctx,
    };

    consoleOut('debug', msg, ctx);
    write('debug.log', payload);
  },

  info(msg: string, ctx?: Record<string, unknown>) {
    const payload = {
      ...basePayload('info', msg),
      ctx,
    };

    consoleOut('info', msg, ctx);
    write('info.log', payload);
  },

  warn(msg: string, ctx?: Record<string, unknown>) {
    const payload = {
      ...basePayload('warn', msg),
      ctx,
    };

    consoleOut('warn', msg, ctx);
    write('warn.log', payload);
  },

  error(msg: string, err?: unknown, ctx?: Record<string, unknown>) {
    const payload = {
      ...basePayload('error', msg),
      error: serializeError(err),
      ctx,
    };

    consoleOut('error', msg, payload.error);
    write('error.log', payload);
  },

  /**
   * Track appIds that failed during processing
   */
  failedApp(appid: number, reason?: unknown, ctx?: Record<string, unknown>) {
    write('failed_appids.log', {
      ts: new Date().toISOString(),
      appid,
      reason: serializeError(reason),
      ctx,
    });
  },

  /**
   * Simple progress tracking for long-running jobs
   */
  checkpoint(label: string | number, ctx?: Record<string, unknown>) {
    write('checkpoint.log', {
      ts: new Date().toISOString(),
      checkpoint: label,
      ctx,
    });
  },
};
