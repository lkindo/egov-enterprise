import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const THEMES_DIR = join(FRONTEND_DIR, 'src', 'styles', 'themes');
const GLOBALS = join(FRONTEND_DIR, 'src', 'app', 'globals.css');

/**
 * 브랜드 프로필 × 컬러 모드 2축 토큰 계약 (ADR-0003 §2, ADR-0006 이후 후속 작업).
 *
 * 시맨틱 이름(--background·--primary·--hub-*·--surface-inverse …)은 3층 토큰 구조의 **2층**이며,
 * 110개 .tsx 소비자와 색 가드 2종(hardcoded-color 78 / status-color 752)이 이 이름에 결속돼 있다.
 * 브랜드 프로필은 그 이름들의 **값만** 갈아끼운다 — 이름을 바꾸는 순간 소비자와 가드가 함께 깨진다.
 *
 * 이 계약이 지키는 것:
 *   ① 프로필 파일이 라이트·다크 두 블록을 모두 갖는다
 *   ② 다크 블록이 `:root[data-brand-theme="…"].dark` 조합 셀렉터를 포함한다 (특이성)
 *   ③ 모든 프로필이 **같은 시맨틱 키 집합**을 완전 정의한다 (프로필 전환 시 미정의 변수 0)
 *   ④ globals.css 의 @theme 블록이 살아 있고 :root 시맨틱 블록이 되돌아오지 않는다
 */

/** `--key: value;` 선언에서 키만 뽑는다. 주석 안의 것은 제외한다. */
function declaredKeys(css: string): Set<string> {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return new Set([...withoutComments.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map((m) => m[1]));
}

/** 여는 셀렉터 줄부터 대응하는 닫는 중괄호까지의 블록 본문을 돌려준다. */
function blockAfter(css: string, selectorPattern: RegExp): string {
  const match = selectorPattern.exec(css);
  if (!match) return '';
  let depth = 0;
  let start = -1;
  for (let i = match.index; i < css.length; i += 1) {
    if (css[i] === '{') {
      depth += 1;
      if (depth === 1) start = i + 1;
    } else if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(start, i);
    }
  }
  return '';
}

const themeFiles = existsSync(THEMES_DIR)
  ? readdirSync(THEMES_DIR).filter((name) => name.endsWith('.css') && !name.startsWith('_'))
  : [];

describe('브랜드 프로필 토큰 계약', () => {
  it('프로필 파일이 최소 1개 존재한다 — 스캔이 비면 이 계약은 vacuous 하다', () => {
    expect(themeFiles.length, `${THEMES_DIR} 에서 프로필 CSS 를 찾지 못했습니다`).toBeGreaterThan(0);
  });

  it.each(themeFiles)('%s 는 라이트·다크 두 블록을 갖고 다크가 브랜드 조합 셀렉터로 특이성을 확보한다', (file) => {
    const css = readFileSync(join(THEMES_DIR, file), 'utf8');
    const profile = file.replace(/\.css$/, '');

    // 라이트: 기본 :root 와 명시 프로필 셀렉터를 함께 걸어 속성 미지정 시에도 동작해야 한다.
    expect(css, `${file} 에 :root[data-brand-theme="${profile}"] 라이트 셀렉터가 없습니다`)
      .toMatch(new RegExp(`:root\\[data-brand-theme="${profile}"\\]\\s*\\{`));

    // 다크: 특이성 함정 — :root[data-brand-theme=…](0,2,0)가 .dark(0,1,0)를 이기므로
    //   조합 셀렉터(0,3,0)가 없으면 브랜드 속성이 켜진 순간 다크 모드가 통째로 무력화된다.
    expect(
      css,
      `${file} 의 다크 블록에 :root[data-brand-theme="${profile}"].dark 조합 셀렉터가 없습니다 — ` +
        '브랜드 속성이 켜지면 라이트 값이 .dark 를 덮어써 다크 모드가 깨집니다.',
    ).toMatch(new RegExp(`:root\\[data-brand-theme="${profile}"\\]\\.dark\\s*\\{`));
  });

  it('모든 프로필이 같은 시맨틱 키 집합을 완전 정의한다', () => {
    // 프로필을 갈아끼웠을 때 어떤 변수가 미정의로 남으면 그 자리는 이전 프로필 값이 그대로
    // 남거나(캐스케이드) 빈 값이 된다. 어느 쪽이든 조용한 시각 파손이다.
    const perProfile = themeFiles.map((file) => {
      const css = readFileSync(join(THEMES_DIR, file), 'utf8');
      return {
        file,
        light: declaredKeys(blockAfter(css, /:root,\s*\n?\s*:root\[data-brand-theme="[^"]+"\]\s*\{/)),
      };
    });

    expect(perProfile.length).toBeGreaterThan(0);
    const [reference, ...rest] = perProfile;
    expect(reference.light.size, `${reference.file} 라이트 블록에서 토큰을 추출하지 못했습니다`)
      .toBeGreaterThan(30);

    for (const profile of rest) {
      const missing = [...reference.light].filter((key) => !profile.light.has(key));
      const extra = [...profile.light].filter((key) => !reference.light.has(key));
      expect(
        { missing, extra },
        `${profile.file} 의 시맨틱 키 집합이 ${reference.file} 과 다릅니다. ` +
          '프로필 전환 시 미정의 변수가 생기면 이전 프로필 값이 남거나 빈 값이 됩니다.',
      ).toEqual({ missing: [], extra: [] });
    }
  });

  it('globals.css 는 @theme 노출면을 유지하고 :root 시맨틱 블록을 되돌리지 않는다', () => {
    const css = readFileSync(GLOBALS, 'utf8');

    // @theme 은 `--color-primary: hsl(var(--primary))` 같은 **간접 참조**를 만드는 층이다.
    // 값이 어느 프로필에서 오든 유틸리티가 동작하게 하는 지점이며, 색 가드 2종이
    // 무손상인 기술적 근거이기도 하다.
    expect(css, 'globals.css 의 @theme 블록이 사라졌습니다 — 유틸리티가 시맨틱 토큰과 끊깁니다.')
      .toMatch(/@theme\s*\{/);
    expect(css).toMatch(/--color-primary:\s*hsl\(var\(--primary\)\)/);

    // 프로필 파일을 두고도 globals.css 가 다시 :root 로 시맨틱을 선언하면 값의 소유자가
    // 두 곳이 되어 어느 쪽이 이기는지가 소스 순서에 좌우된다.
    expect(
      css.replace(/\/\*[\s\S]*?\*\//g, ''),
      'globals.css 에 :root 시맨틱 블록이 되돌아왔습니다 — 값 소유자는 프로필 파일 한 곳이어야 합니다.',
    ).not.toMatch(/:root\s*\{[^}]*--background\s*:/);

    expect(css, '프로필 CSS import 가 사라졌습니다.').toMatch(/@import\s+"\.\.\/styles\/themes\//);
  });
});
