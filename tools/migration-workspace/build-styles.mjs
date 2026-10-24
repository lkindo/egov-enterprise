import { readFile, writeFile } from 'node:fs/promises';

// Reuse the application's semantic Premium tokens without a separate dependency install.
const tokens = await readFile(new URL('../../frontend/src/styles/themes/premium.css', import.meta.url), 'utf8');
const styles = await readFile(new URL('./styles.input.css', import.meta.url), 'utf8');
await writeFile(new URL('./public/styles.css', import.meta.url), `/* Generated from frontend/src/styles/themes/premium.css and tools/migration-workspace/styles.input.css. */\n${tokens}\n${styles}`.replace(/[\t ]+$/gm, ''), 'utf8');
