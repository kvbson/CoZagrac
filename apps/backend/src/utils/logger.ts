import fs from 'fs';
import path from 'path';

const LOG_DIR = path.resolve(process.cwd(), 'logs');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function write(file: string, message: string) {
  fs.appendFileSync(path.join(LOG_DIR, file), message + '\n', 'utf8');
}

export const logger = {
  info(msg: string) {
    console.log(msg);
    write('sync.log', `[INFO] ${new Date().toISOString()} ${msg}`);
  },

  error(msg: string) {
    console.error(msg);
    write('error.log', `[ERROR] ${new Date().toISOString()} ${msg}`);
  },

  failedApp(appid: number, reason?: unknown) {
    write('failed_appids.log', `${appid}`);
    if (reason) {
      write('failed_details.log', `[${appid}] ${new Date().toISOString()} ${String(reason)}`);
    }
  },

  checkpoint(appid: number) {
    write('checkpoint.log', `${appid}`);
  },
};
