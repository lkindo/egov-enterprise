// Compile with the repository's installed Tailwind version; no CDN at runtime.
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const OUTPUT = new URL('./styles.css', import.meta.url);
const COMMAND = 'node tools/migration-workspace-prototype/build-styles.mjs';
// 최소화한 결과라 원본의 줄 끝은 결과에 남지 않는다. 커밋본은 checkout 의 줄 끝 변환과 관계없이 LF 로 비교한다.
const lf = text => text.replace(/\r\n/g, '\n');

/** frontend 에 설치된 Tailwind 로 시안 CSS 를 만든다. frontend 의존성이 없으면 실패한다(설치 후 다시 실행). */
export async function renderStyles() {
  const requireFrontend = createRequire(new URL('../../frontend/package.json', import.meta.url));
  const requirePostcssPlugin = createRequire(requireFrontend.resolve('@tailwindcss/postcss'));
  const postcss = requirePostcssPlugin('postcss');
  const tailwind = requireFrontend('@tailwindcss/postcss');
  const input = new URL('./styles.input.css', import.meta.url);
  const tailwindPath = requireFrontend.resolve('tailwindcss/index.css').replaceAll('\\', '/');
  const css = (await readFile(input, 'utf8')).replace('"tailwindcss"', `"${tailwindPath}"`);
  const result = await postcss([tailwind({ optimize: true })]).process(css, { from: fileURLToPath(input) });
  return result.css;
}

/** 커밋된 styles.css 가 지금의 원본(styles.input.css·index.html·app.js·premium.css·설치된 Tailwind)으로 만든 결과와 같은지 본다. 쓰지 않는다. */
export async function stylesAreCurrent() {
  return lf(await readFile(OUTPUT, 'utf8')) === lf(await renderStyles());
}

// 가져오기만 하면(시험) 아무것도 쓰지 않는다. --check 는 비교만 하고, 인자가 없을 때만 다시 쓴다.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--check')) {
    console.error(`usage: ${COMMAND} [--check]`);
    process.exitCode = 2;
  } else if (args.includes('--check')) {
    if (!(await stylesAreCurrent())) {
      console.error(`Migration workspace prototype stylesheet is stale; rebuild with ${COMMAND}`);
      process.exitCode = 1;
    }
  } else {
    await writeFile(OUTPUT, await renderStyles());
    console.log('Compiled migration workspace prototype styles.');
  }
}
