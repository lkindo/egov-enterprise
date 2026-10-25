import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const OUTPUT = new URL('./public/styles.css', import.meta.url);
const COMMAND = 'node tools/migration-workspace/build-styles.mjs';
// Git 의 줄 끝 변환(autocrlf)과 관계없이 같은 결과가 나오게 LF 로 만들고 LF 로 비교한다.
const lf = text => text.replace(/\r\n/g, '\n');

// Reuse the application's semantic Premium tokens without a separate dependency install.
export async function renderStyles() {
  const tokens = await readFile(new URL('../../frontend/src/styles/themes/premium.css', import.meta.url), 'utf8');
  const styles = await readFile(new URL('./styles.input.css', import.meta.url), 'utf8');
  return lf(`/* Generated from frontend/src/styles/themes/premium.css and tools/migration-workspace/styles.input.css. */\n${tokens}\n${styles}`).replace(/[\t ]+$/gm, '');
}

/** 커밋된 public/styles.css 가 지금의 원본(premium.css·styles.input.css)으로 만든 결과와 같은지 본다. 쓰지 않는다. */
export async function stylesAreCurrent() {
  return lf(await readFile(OUTPUT, 'utf8')) === await renderStyles();
}

// 가져오기만 하면(시험) 아무것도 쓰지 않는다. --check 는 비교만 하고, 인자가 없을 때만 다시 쓴다.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--check')) {
    console.error(`usage: ${COMMAND} [--check]`);
    process.exitCode = 2;
  } else if (args.includes('--check')) {
    if (!(await stylesAreCurrent())) {
      console.error(`Migration workspace stylesheet is stale; rebuild with ${COMMAND}`);
      process.exitCode = 1;
    }
  } else await writeFile(OUTPUT, await renderStyles(), 'utf8');
}
