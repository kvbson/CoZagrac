import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
/** src/functions/evaluation/ -> repo root docs/pomiary/ */
const OUTPUT_DIR = path.resolve(HERE, '../../../../docs/pomiary');

/** Writes a markdown report with today's date; returns the output path. */
export async function writeReport(name: string, markdown: string): Promise<string> {
  const date = new Date().toISOString().slice(0, 10);
  const file = path.join(OUTPUT_DIR, `${name}-${date}.md`);

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(file, markdown, 'utf8');

  console.log(`[REPORT] written: ${file}`);
  return file;
}
