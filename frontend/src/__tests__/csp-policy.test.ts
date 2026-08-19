import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * CSP 강화 계약 (GAP-FE-001 Phase 2).
 *
 * `script-src-attr 'none'` 은 inline 이벤트 핸들러(onclick= 등)를 차단한다 — 반사형 XSS 가
 * 주입하는 대표 벡터이며 React 는 전혀 쓰지 않는 기능이다. 이 계약은 두 방향을 함께 고정한다:
 *   ① 정책이 조용히 완화되지 못하게 (next.config.ts 에서 지시어가 사라지면 red)
 *   ② 정책이 깨뜨릴 대상이 재유입되지 못하게 (public/ 정적 HTML 의 inline 핸들러가 늘면 red)
 * ①만 있으면 핸들러 재유입 시 페이지가 조용히 죽고, ②만 있으면 정책 완화가 조용히 지나간다.
 */
describe('CSP script-src-attr 계약', () => {
  const nextConfig = readFileSync(join(FRONTEND_DIR, 'next.config.ts'), 'utf8');

  it("prod/dev CSP 모두 script-src-attr 'none' 을 유지한다", () => {
    // ⚠ 파일 전체에서 문구를 세면 안 된다 — 주석에 같은 문구가 있어서, prod 정책에서 지시어를
    //   지워도 '주석 1 + dev 1 = 2' 로 통과한다(2026-08-20 위반 주입에서 실제로 그렇게 뚫렸다).
    //   반드시 정책 리터럴 자체를 뽑아 각각 검사한다.
    const policies = Object.fromEntries(
      [...nextConfig.matchAll(/const (cspProd|cspDev) = `([^`]+)`/g)].map((m) => [m[1], m[2]]),
    );

    for (const name of ['cspProd', 'cspDev'] as const) {
      expect(policies[name], `next.config.ts 에서 ${name} 정책 리터럴을 찾지 못했습니다 — 추출이 깨지면 이 계약은 vacuous 합니다`).toBeTruthy();
      expect(
        policies[name],
        `${name} 에 script-src-attr 'none' 이 있어야 합니다. ` +
          '완화하려면 inline 핸들러가 실제로 필요해진 근거를 이 테스트와 같은 변경에서 제시하십시오.',
      ).toContain("script-src-attr 'none'");
    }
  });

  it('public/ 정적 HTML 에 inline 이벤트 핸들러가 없다', () => {
    const publicDir = join(FRONTEND_DIR, 'public');
    const htmlFiles = readdirSync(publicDir).filter((name) => name.endsWith('.html'));
    expect(htmlFiles.length, 'public/ HTML 스캔이 비면 이 계약은 vacuous 하다').toBeGreaterThan(0);

    const offenders = htmlFiles.flatMap((name) => {
      const source = readFileSync(join(publicDir, name), 'utf8');
      return [...source.matchAll(/\son(?:click|change|submit|load|input|mouseover|focus|blur|keydown|keyup)\s*=/gi)]
        .map((match) => ({
          file: name,
          line: source.slice(0, match.index).split('\n').length,
        }));
    });

    expect(
      offenders,
      [
        "script-src-attr 'none' 아래에서 inline 핸들러는 조용히 죽습니다. addEventListener 로 배선하십시오:",
        ...offenders.map(({ file, line }) => `  public/${file}:${line}`),
      ].join('\n'),
    ).toEqual([]);
  });
});
