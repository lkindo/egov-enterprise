import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function filesEndingWith(directory: string, suffix: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return filesEndingWith(path, suffix);
    return entry.name.endsWith(suffix) ? [path] : [];
  });
}

function withoutComments(source: string): string {
  // ⚠ [2026-08-31] 줄 주석(콜론 가드)을 **먼저** 지운다 — 블록 주석을 먼저 지우면 줄 주석 안의
  //   블록 여는 기호가 저 아래 닫는 기호까지 이어져 실행 코드가 통째로 사라진다
  //   (실측: work-list-adoption-census 가 기록한 WorkHubClient.tsx 1,781자 소실과 같은 순서 결함).
  //   콜론 가드는 URL 의 `//` 오인 방지용이다(csp-policy 가 기록한 결함).
  return source
    .replace(/(^|[^:])\/\/[^\n]*/gm, '$1')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * `click({ force: true })` 는 Playwright 의 actionability 검사(가시성·안정성·enabled·
 * 포인터 이벤트 수신)를 통째로 건너뛴다. 즉 **오버레이에 가려 실제 사용자는 누를 수 없는 버튼도
 * 테스트는 통과시킨다** — 이 저장소가 반복해서 제거해 온 false-green 계열이다.
 *
 * 이미 있는 사용처를 한 번에 걷어내는 것은 별개의 작업이므로, blind-wait 과 같은 방식으로
 * **하향 전용 래칫**을 건다: 늘리면 red, 줄이면 상수를 낮춰 되돌릴 수 없게 만든다.
 * 정말 force 가 필요한 자리가 생기면 상수를 올리지 말고, 왜 정상 클릭이 불가능한지를 먼저 밝힐 것.
 */
const FORCE_CLICK_BASELINE = 12;

describe('E2E force-click 하향 래칫', () => {
  it('force 클릭 사용처가 baseline 을 넘지 않는다', () => {
    const offenders = filesEndingWith(join(FRONTEND_DIR, 'e2e'), '.ts').flatMap(path => {
      const source = withoutComments(readFileSync(path, 'utf8'));
      return [...source.matchAll(/force\s*:\s*true/g)].map(match => ({
        file: path.replace(FRONTEND_DIR, '').replace(/\\/g, '/'),
        line: source.slice(0, match.index).split('\n').length,
      }));
    });

    expect(
      offenders.length,
      [
        `force 클릭이 baseline(${FORCE_CLICK_BASELINE})을 넘었습니다: ${offenders.length}건.`,
        'force 는 actionability 검사를 건너뛰므로, 실제로는 누를 수 없는 요소도 통과시킵니다.',
        '정상 클릭이 불가능한 원인(오버레이·애니메이션·hover 노출)을 먼저 해결할 것:',
        ...offenders.map(({ file, line }) => `  ${file}:${line}`),
      ].join('\n'),
    ).toBeLessThanOrEqual(FORCE_CLICK_BASELINE);

    // 개선분을 정본에 반영하지 않으면 래칫이 조용히 되감긴다.
    expect(
      offenders.length,
      `force 클릭이 ${offenders.length}건으로 줄었습니다 — FORCE_CLICK_BASELINE 을 그 값으로 낮추십시오.`,
    ).toBe(FORCE_CLICK_BASELINE);
  });
});

describe('E2E harness dead-asset contract', () => {
  it('소비자가 없는 POM/fixture를 다시 싣지 않는다', () => {
    const removedAssets = [
      'e2e/pages/BBSPage.ts',
      'e2e/pages/UserAdminPage.ts',
      'e2e/fixtures/self-healing-agent.ts',
      'e2e/fixtures/layout-breathing-guard.ts',
    ];

    expect(removedAssets.filter((asset) => existsSync(join(FRONTEND_DIR, asset)))).toEqual([]);

    const baseFixture = readFileSync(join(FRONTEND_DIR, 'e2e/fixtures/base-test.ts'), 'utf8');
    expect(baseFixture).not.toMatch(/\b(?:BBSPage|UserAdminPage|SelfHealingAgent|LayoutBreathingGuard)\b/);
    expect(baseFixture).not.toMatch(/\b(?:bbsPage|userAdminPage|healingAgent|layoutGuard)\s*:/);
  });

  it('E2E skip은 플랫폼 한정 visual baseline 한 건만 허용한다', () => {
    const usages = filesEndingWith(join(FRONTEND_DIR, 'e2e'), '.spec.ts').flatMap(path => {
      const source = withoutComments(readFileSync(path, 'utf8'));
      const forbiddenCall = new RegExp(`\\btest(?:\\.describe)?\\s*\\.\\s*(?:${['sk', 'ip'].join('')}|fixme|fail|only)\\s*\\(`, 'g');
      return [...source.matchAll(forbiddenCall)].map(match => ({
        file: path.slice(FRONTEND_DIR.length + 1).replaceAll('\\', '/'),
        call: match[0].replace(/\s+/g, ''),
      }));
    });

    expect(usages).toEqual([{
      file: 'e2e/04-quality-resilience.spec.ts',
      call: ['test', 'skip('].join('.'),
    }]);
    const visualSpec = readFileSync(join(FRONTEND_DIR, 'e2e/04-quality-resilience.spec.ts'), 'utf8');
    expect(visualSpec).toContain("process.platform !== 'linux'");
    expect(visualSpec).toContain('비주얼 회귀는 CI(리눅스) 전용이다');
  });

  it('로그인 VRT는 admin fixture를 상속하지 않는 익명 context와 고정 URL을 사용한다', () => {
    const visualSpec = readFileSync(join(FRONTEND_DIR, 'e2e/04-quality-resilience.spec.ts'), 'utf8');
    const anonymousCapture = visualSpec.match(
      /const anonContext = await browser\.newContext\(\{[\s\S]*?await anonGuard\.verify\(\);/,
    )?.[0];

    expect(anonymousCapture, '로그인 VRT 익명 캡처 블록을 찾지 못했습니다').toBeDefined();
    expect(anonymousCapture).toMatch(/storageState:\s*\{\s*cookies:\s*\[\],\s*origins:\s*\[\]\s*\}/);
    expect(anonymousCapture).toMatch(
      /goto\('\/login\?e2e=true'\)[\s\S]*?toHaveURL\(\/\\\/login\\\?e2e=true\$\/\)[\s\S]*?toHaveScreenshot\('login-page-baseline\.png'/,
    );
    expect(anonymousCapture?.match(/toHaveURL\(\/\\\/login\\\?e2e=true\$\/\)/g)).toHaveLength(2);
  });
});
