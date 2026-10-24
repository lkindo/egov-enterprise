#!/usr/bin/env node
/**
 * 저장소 밖 화면 시안용 토큰 키트를 만든다(DEC-OPS-382).
 *
 * 저장소 밖 시안(비규범 아티팩트)이 색을 새로 고르면 앱과 다른 대비가 나온다 — 2026-10-24 슬라이드 시안이 어두운 배경에
 * 손으로 고른 회색 글자를 써서 읽히지 않았다. 앱의 대비는 브랜드 프로필 CSS 의 값과 시맨틱 짝(bg-x + x-foreground)이
 * 보장한다(status-token-contrast 계약). 이 키트는 그 값을 그대로 묶어, 시안이 같은 이름·같은 값을 쓰게 한다.
 *
 * 출력은 커밋하지 않는 build/prototype-kit/ 이다. 값을 새로 만들지 않는다 — 프로필 CSS 두 장을 그대로 싣고, globals.css
 * @theme 의 `--color-*` 매핑을 일반 CSS 변수로 옮길 뿐이다. 입력 경로와 sha256 을 머리에 남기고 생성 시각은 싣지 않는다.
 *
 * 사용: pnpm -C frontend run prototype:kit
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = join(FRONTEND_DIR, '..');
export const PROFILE_FILES = ['src/styles/themes/premium.css', 'src/styles/themes/krds-aligned.css'];
export const GLOBALS_FILE = 'src/app/globals.css';
export const OUTPUT_DIR = join(REPO_ROOT, 'build', 'prototype-kit');

/** globals.css 의 첫 `@theme { … }` 블록 안의 `--color-*` 선언을 순서대로 돌려준다. */
export function themeColorDeclarations(globalsCss) {
  const start = globalsCss.indexOf('@theme {');
  if (start < 0) throw new Error('globals.css 에 @theme 블록이 없습니다.');
  let depth = 0;
  let end = -1;
  for (let index = globalsCss.indexOf('{', start); index < globalsCss.length; index += 1) {
    if (globalsCss[index] === '{') depth += 1;
    if (globalsCss[index] === '}') {
      depth -= 1;
      if (depth === 0) { end = index; break; }
    }
  }
  if (end < 0) throw new Error('globals.css 의 @theme 블록이 닫히지 않았습니다.');
  const body = globalsCss.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, '');
  return [...body.matchAll(/(--color-[a-z0-9-]+)\s*:\s*([^;]+);/g)].map((match) => ({ name: match[1], value: match[2].trim() }));
}

const sha256 = (text) => createHash('sha256').update(text).digest('hex');

/**
 * 키트 파일 내용을 만든다. 입력 CSS 문자열만 쓰는 순수 함수다.
 * @param {{ profiles: { path: string, css: string }[], globals: { path: string, css: string } }} input
 */
export function buildPrototypeTokenKit({ profiles, globals }) {
  const colors = themeColorDeclarations(globals.css);
  if (colors.length === 0) throw new Error('@theme 블록에 --color-* 선언이 없습니다.');
  const sources = [...profiles, globals].map(({ path, css }) => `   - ${path} sha256:${sha256(css)}`).join('\n');
  const header = [
    '/*',
    ' * eGov Enterprise 시안 토큰 키트 — 생성물, 직접 고치지 않는다(pnpm -C frontend run prototype:kit).',
    ' * 값의 정본은 아래 원본이다. 이 파일은 그 값을 그대로 옮긴다.',
    sources.replace(/^ {3}/gm, ' *   '),
    ' * 쓰는 법: <html data-brand-theme="premium"> 또는 "krds-aligned", 다크는 class="dark".',
    ' *   배경과 글자는 시맨틱 짝(예: var(--color-primary) 위에 var(--color-primary-foreground))으로만 쓰고 hex 를 새로 고르지 않는다.',
    ' */',
  ].join('\n');
  const profileCss = profiles.map(({ path, css }) => `/* ===== ${path} ===== */\n${css.trim()}\n`).join('\n');
  const mapping = [
    `/* ===== ${globals.path} @theme 의 색 매핑(Tailwind 없이 쓰도록 일반 변수로 옮김) ===== */`,
    ':root {',
    ...colors.map(({ name, value }) => `  ${name}: ${value};`),
    '}',
    'body { background: var(--color-background); color: var(--color-foreground); }',
  ].join('\n');
  const tokensCss = `${header}\n\n${profileCss}\n${mapping}\n`;

  const readme = [
    '# 시안 토큰 키트',
    '',
    '저장소 밖 화면 시안(비규범 아티팩트)이 앱과 같은 색·대비를 쓰게 하는 생성물이다. 커밋하지 않는다.',
    '',
    '- `tokens.css` 를 시안 HTML 의 `<style>` 에 그대로 넣는다.',
    '- 루트에 `data-brand-theme="premium"`(기본) 또는 `"krds-aligned"` 를 두고, 다크는 `class="dark"` 를 더한다.',
    '- 색은 `var(--color-…)` 시맨틱 이름으로만 쓴다. 배경과 글자는 짝으로 쓴다(예: `--color-card` 위 `--color-card-foreground`, `--color-muted` 위 `--color-muted-foreground`). 짝 목록의 정본은 `docs/03-guides/design-tokens.md` §2 다.',
    '- hex 를 새로 고르지 않는다. 필요한 색이 없으면 시안이 아니라 토큰 원장을 바꾸는 일이다.',
    '- 시안 확인은 스키마·코어 데이터·인가 의미·IA 처분·메뉴 노출·운영 적용의 승인이 아니다(SOP §7).',
    '',
    `색 매핑 ${colors.length}개, 원본:`,
    '',
    ...[...profiles, globals].map(({ path, css }) => `- \`frontend/${path}\` sha256 \`${sha256(css)}\``),
    '',
  ].join('\n');

  return { 'tokens.css': tokensCss, 'README.md': readme };
}

export function readKitInputs(frontendDir = FRONTEND_DIR) {
  return {
    profiles: PROFILE_FILES.map((path) => ({ path, css: readFileSync(join(frontendDir, path), 'utf8').replace(/\r\n/g, '\n') })),
    globals: { path: GLOBALS_FILE, css: readFileSync(join(frontendDir, GLOBALS_FILE), 'utf8').replace(/\r\n/g, '\n') },
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const files = buildPrototypeTokenKit(readKitInputs());
  mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const [name, content] of Object.entries(files)) writeFileSync(join(OUTPUT_DIR, name), content);
  console.log(`시안 토큰 키트: ${relative(REPO_ROOT, OUTPUT_DIR).replace(/\\/g, '/')}/ (${Object.keys(files).join(', ')})`);
}
