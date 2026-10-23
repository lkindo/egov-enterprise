// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { codeWithoutComments } from '../../../scripts/code-without-comments.mjs';

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function filesEndingWith(directory: string, suffix: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return filesEndingWith(path, suffix);
    return entry.name.endsWith(suffix) ? [path] : [];
  });
}

// ⚠ 주석 속 언급은 세지 않는다 — 공용 판정(scripts/code-without-comments.mjs)이 문자열·정규식 리터럴은 두고 주석만 지운다.
//   종전 정규식 제거는 줄 주석을 먼저 지우게 순서를 바꿨어도(2026-08-31) 정규식 리터럴 /\/ws\// 끝의 `//` 를 줄 주석으로 보아
//   그 줄 뒤를 지웠고(실측 4곳), 그 자리에 둔 force 클릭은 세지 않았다(FE-CONTRACT-01).

/** 한 파일의 `force: true` 줄 번호(1부터). 주석을 같은 길이 공백으로 바꾸므로 줄 번호가 원문과 같다. */
function forceClickLines(source: string, fileName: string): number[] {
  const code = codeWithoutComments(source, fileName);
  return [...code.matchAll(/force\s*:\s*true/g)].map(match => code.slice(0, match.index).split('\n').length);
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
// 자기 가드(바로 위의 toBeEnabled·waitFor visible)를 가진 자리의 force 는 안전을 더하지 않고 신호만 지운다 — 확인한 것과
//   force 가 건너뛰는 것(안정성·오버레이·포인터 수신)이 다르기 때문이다. 남은 자리는 각자 사유가 달라 개별 판단한다(일괄 제거는
//   H4 가 금지하는 기계적 sweep 이다). 하향 이력은 git 에 있다.
const FORCE_CLICK_BASELINE = 6;

describe('E2E force-click 하향 래칫', () => {
  it('force 클릭 사용처가 baseline 을 넘지 않는다', () => {
    const offenders = filesEndingWith(join(FRONTEND_DIR, 'e2e'), '.ts').flatMap(path =>
      forceClickLines(readFileSync(path, 'utf8'), path).map(line => ({
        file: path.replace(FRONTEND_DIR, '').replace(/\\/g, '/'),
        line,
      })));

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

  it('문자열·정규식 리터럴 속 주석 기호 뒤의 force 클릭도 세고 주석 속 언급은 세지 않는다', () => {
    // 실측 모양(FE-CONTRACT-01): 정규식 리터럴 끝의 `//` 를 종전 정규식 제거가 줄 주석으로 보아 그 줄 뒤를 지웠다.
    const source = [
      "await page.getByText(/\\/ws\\//).click({ force: true });",
      '// click({ force: true }) 는 쓰지 않는다',
    ].join('\n');
    expect(forceClickLines(source, 'synthetic.spec.ts'), '리터럴 속 주석 기호 뒤의 force 클릭을 놓쳤다').toEqual([1]);
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
      const source = codeWithoutComments(readFileSync(path, 'utf8'), path);
      const forbiddenCall = new RegExp(`\\btest(?:\\.describe)?\\s*\\.\\s*(?:${['sk', 'ip'].join('')}|fixme|fail|only)\\s*\\(`, 'g');
      return [...source.matchAll(forbiddenCall)].map(match => ({
        file: path.slice(FRONTEND_DIR.length + 1).replaceAll('\\', '/'),
        call: match[0].replace(/\s+/g, ''),
      }));
    });

    expect(usages).toEqual([{
      file: 'e2e/quality/visual-baselines.spec.ts',
      call: ['test', 'skip('].join('.'),
    }]);
    const visualSpec = readFileSync(join(FRONTEND_DIR, 'e2e/quality/visual-baselines.spec.ts'), 'utf8');
    expect(visualSpec).toContain("process.platform !== 'linux'");
    expect(visualSpec).toContain('비주얼 회귀는 CI(리눅스) 전용이다');
  });

  function assertAnonymousLoginCapture(visualSpec: string): void {
    const anonymousCapture = visualSpec.match(
      /const \{ page: anonPage, guard: anonGuard \} = await actorPage\(\{[\s\S]*?await expect\(anonPage\)\.toHaveScreenshot\('login-page-baseline\.png'[\s\S]*?\}\);/,
    )?.[0];

    expect(anonymousCapture, '로그인 VRT 익명 캡처 블록을 찾지 못했습니다').toBeDefined();
    expect(anonymousCapture).toMatch(/storageState:\s*\{\s*cookies:\s*\[\],\s*origins:\s*\[\]\s*\}/);
    expect(anonymousCapture).toMatch(
      /goto\('\/login\?e2e=true'\)[\s\S]*?toHaveURL\(\/\\\/login\\\?e2e=true\$\/\)[\s\S]*?toHaveURL\(\/\\\/login\\\?e2e=true\$\/\)[\s\S]*?toHaveScreenshot\('login-page-baseline\.png'/,
    );
    expect(anonymousCapture?.match(/toHaveURL\(\/\\\/login\\\?e2e=true\$\/\)/g)).toHaveLength(2);
  }

  it('로그인 VRT는 admin fixture를 상속하지 않는 익명 actor와 고정 URL을 사용한다', () => {
    assertAnonymousLoginCapture(readFileSync(join(FRONTEND_DIR, 'e2e/quality/visual-baselines.spec.ts'), 'utf8'));
  });

  it.each([
    ['익명 storageState 제거', 'storageState: { cookies: [], origins: [] },', ''],
    ['URL 재검증 제거', 'await expect(anonPage).toHaveURL(/\\/login\\?e2e=true$/);', ''],
    ['관찰되지 않는 context 생성', '= await actorPage({', '= await browser.newContext({'],
  ])('%s 위반을 탐지한다', (_name, before, after) => {
    const visualSpec = readFileSync(join(FRONTEND_DIR, 'e2e/quality/visual-baselines.spec.ts'), 'utf8');
    // 첫 storageState는 관리자 fixture에 속한다. 익명 actor 블록 안에만 위반을 주입한다.
    const boundary = visualSpec.indexOf('const { page: anonPage, guard: anonGuard }');
    const mutated = visualSpec.slice(0, boundary) + visualSpec.slice(boundary).replace(before, after);
    expect(mutated).not.toBe(visualSpec);
    expect(() => assertAnonymousLoginCapture(mutated)).toThrow();
  });
});
