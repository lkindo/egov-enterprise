// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const requireFromFrontend = createRequire(join(FRONTEND_DIR, 'package.json'));

/**
 * Next ESLint 플러그인의 fast-glob 을 tinyglobby 로 바꾼 override(package.json pnpm.overrides)가
 * 의미를 바꾸지 않는 조건을 고정한다.
 *
 * braces(GHSA-vfj7-8cjw-p6xm)는 패치가 없고, 유일한 유입이 @next/eslint-plugin-next 가 정확 고정한
 * fast-glob 3.3.1 이다. 플러그인은 no-html-link-for-pages 규칙이 settings.next.rootDir 를 펼칠 때만
 * globSync 를 부른다. tinyglobby 는 같은 이름의 globSync 를 내지만 디렉터리 펼치기 기본값이 달라
 * rootDir 를 glob 할 때 결과가 갈린다. 그래서 설정에 rootDir 가 없고 플러그인이 globSync 만 쓰는
 * 동안에만 이 대체가 안전하다. 어느 쪽이 깨져도 override 를 다시 판정한다.
 */
function pluginDir(): string {
  const configEntry = requireFromFrontend.resolve('eslint-config-next');
  return dirname(createRequire(configEntry).resolve('@next/eslint-plugin-next/package.json'));
}

function jsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return jsFiles(path);
    return entry.name.endsWith('.js') ? [path] : [];
  });
}

/** 플러그인 배포 코드가 fast-glob 모듈에서 꺼내 쓰는 멤버 이름. */
function fastGlobMembers(): Set<string> {
  const members = new Set<string>();
  for (const file of jsFiles(join(pluginDir(), 'dist'))) {
    const source = readFileSync(file, 'utf8');
    for (const binding of source.matchAll(/(\w+)\s*=\s*require\(["']fast-glob["']\)/g)) {
      for (const use of source.matchAll(new RegExp(`\\b${binding[1]}\\.(\\w+)`, 'g'))) {
        members.add(use[1]);
      }
    }
  }
  return members;
}

describe('Next ESLint 플러그인의 fast-glob 대체(braces 걷기)', () => {
  it('플러그인의 fast-glob 은 tinyglobby 로 해석된다', () => {
    const resolved = createRequire(join(pluginDir(), 'package.json')).resolve('fast-glob/package.json');
    const manifest = JSON.parse(readFileSync(resolved, 'utf8')) as { name: string };
    expect(manifest.name, 'override 가 빠졌다 — braces 가 다시 설치된다').toBe('tinyglobby');
  });

  it('플러그인은 fast-glob 에서 globSync 하나만 쓴다', () => {
    expect(
      [...fastGlobMembers()],
      '플러그인이 fast-glob 을 다르게 쓴다 — 걷었으면 override 와 이 시험을 지우고, 늘었으면 tinyglobby 와 의미를 다시 대조한다',
    ).toEqual(['globSync']);
  });

  it('ESLint 설정이 settings.next.rootDir 를 두지 않는다', async () => {
    const eslint = new ESLint({ cwd: FRONTEND_DIR });
    for (const file of ['src/app/layout.tsx', 'e2e/fixtures/csrf.ts']) {
      const config = await eslint.calculateConfigForFile(join(FRONTEND_DIR, file));
      expect(
        config.settings?.next?.rootDir,
        `${file}: rootDir 를 두면 tinyglobby 의 디렉터리 펼치기가 결과를 바꾼다 — override 를 다시 판정한다`,
      ).toBeUndefined();
    }
  }, 60_000);
});
