import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RefreshCcw } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { expectNoAxeViolations, JSDOM_UNJUDGEABLE_AXE_RULES } from './axe';

/** frontend 루트 — 이 파일(frontend/src/test-utils)의 두 단계 위. */
const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * 컴포넌트 axe 도우미(axe.ts)의 계약.
 *
 * ① 판 일치 — jsdom 의 axe 와 E2E 의 axe 는 같은 판이어야 한다. 판이 갈리면 한쪽이 통과시킨 규칙을 다른 쪽이 붉히고(axe 4.14 의
 *    label-content-name-mismatch 가 그랬다), "컴포넌트 시험에서 먼저 잡는다"가 성립하지 않는다. `axe-core` 직접 의존은 정확한 판으로
 *    적고, 그 판이 lockfile 에서 @axe-core/playwright 가 해석한 axe-core 판과 같아야 한다. Dependabot 이 @axe-core/playwright 만 올리면
 *    이 시험이 붉어져 둘을 함께 올리게 한다.
 * ② 도우미가 실제로 잡는다 — 보이는 글자가 이름에 없는 단추를 놓치면 이 도우미는 신호가 아니다.
 */

type AxeCoreVersions = { manifest: string | undefined; importer: string | undefined; playwright: string | undefined };

/** package.json 과 pnpm-lock.yaml 본문에서 axe-core 의 세 판(직접 의존 선언·직접 의존 해석·@axe-core/playwright 의 해석)을 읽는다. */
function axeCoreVersions(packageJson: string, lockfile: string): AxeCoreVersions {
  const manifest = (JSON.parse(packageJson) as { devDependencies?: Record<string, string> }).devDependencies?.['axe-core'];
  const lines = lockfile.split(/\r?\n/);
  const importerEntry = (name: string) => {
    const start = lines.indexOf(`      ${name}:`);
    if (start < 0) return undefined;
    return lines.slice(start + 1, start + 3).find(line => line.startsWith('        version: '))?.slice('        version: '.length).trim();
  };
  const importer = importerEntry('axe-core');
  const playwrightKey = importerEntry("'@axe-core/playwright'");
  let playwright: string | undefined;
  const snapshotStart = playwrightKey ? lines.indexOf(`  '@axe-core/playwright@${playwrightKey}':`) : -1;
  if (snapshotStart >= 0) {
    for (const line of lines.slice(snapshotStart + 1)) {
      if (!line.startsWith('    ')) break;
      if (line.startsWith('      axe-core: ')) playwright = line.slice('      axe-core: '.length).trim();
    }
  }
  return { manifest, importer, playwright };
}

function expectAligned(versions: AxeCoreVersions): void {
  expect(versions.manifest, 'package.json devDependencies 의 axe-core 는 범위가 아니라 정확한 판이어야 한다').toMatch(/^\d+\.\d+\.\d+$/);
  expect(versions.importer, 'lockfile 이 직접 의존 axe-core 를 선언한 판으로 해석하지 않았다').toBe(versions.manifest);
  expect(versions.playwright, 'jsdom axe-core 판이 E2E(@axe-core/playwright)가 해석한 axe-core 판과 다르다 — 둘을 같은 판으로 올린다')
    .toBe(versions.manifest);
}

describe('컴포넌트 axe 와 E2E axe 의 판 일치', () => {
  const packageJson = readFileSync(join(FRONTEND_DIR, 'package.json'), 'utf8');
  const lockfile = readFileSync(join(FRONTEND_DIR, 'pnpm-lock.yaml'), 'utf8');

  it('axe-core 직접 의존은 @axe-core/playwright 가 해석한 판과 같은 정확한 판이다', () => {
    expectAligned(axeCoreVersions(packageJson, lockfile));
  });

  it.each([
    ['직접 의존을 범위로 적음', (pkg: string, lock: string) => [pkg.replace(/"axe-core": "([\d.]+)"/, '"axe-core": "^$1"'), lock]],
    ['@axe-core/playwright 만 다른 axe-core 로 해석', (pkg: string, lock: string) =>
      [pkg, lock.replace(/(\n {2}'@axe-core\/playwright@[^\n]+\n {4}dependencies:\n {6}axe-core: )[\d.]+/, '$1999.0.0')]],
    ['직접 의존이 lockfile 에 없음', (pkg: string, lock: string) => [pkg, lock.replace(/\n {6}axe-core:\n {8}specifier: [^\n]+\n {8}version: [^\n]+/, '')]],
  ])('%s 이면 붉어진다', (_name, mutate) => {
    const [pkg, lock] = mutate(packageJson, lockfile.replace(/\r\n/g, '\n'));
    expect(pkg + lock).not.toBe(packageJson + lockfile.replace(/\r\n/g, '\n'));
    expect(() => expectAligned(axeCoreVersions(pkg, lock))).toThrow();
  });
});

describe('expectNoAxeViolations', () => {
  it('jsdom 이 판정할 수 없는 규칙만 끈다', () => {
    expect(Object.keys(JSDOM_UNJUDGEABLE_AXE_RULES).sort()).toEqual(['color-contrast', 'link-in-text-block', 'target-size']);
  });

  it('보이는 글자가 접근 가능한 이름에 없는 단추를 잡는다(axe 4.14 label-content-name-mismatch)', async () => {
    const { container } = render(
      <button type="button" aria-label="계정 메뉴"><span>홍길동</span>{' '}<span>사용자</span></button>,
    );
    await expect(expectNoAxeViolations(container)).rejects.toThrow(/label-content-name-mismatch/);
  });

  it('아이콘 대역의 글자는 보이는 글자로 세지 않고, 감사 뒤 대역 글자와 canvas 를 그대로 되돌린다', async () => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    const { container } = render(
      <button type="button" aria-label="문서 목록 새로고침"><RefreshCcw aria-hidden="true" /> 새로고침</button>,
    );
    await expectNoAxeViolations(container);
    expect(screen.getByTestId('icon-refreshccw')).toHaveTextContent('RefreshCcw');
    expect(HTMLCanvasElement.prototype.getContext).toBe(getContext);
  });

  it('판정할 노드가 없는 빈 렌더는 통과로 보지 않는다', async () => {
    const { container } = render(<div />);
    await expect(expectNoAxeViolations(container)).rejects.toThrow(/판정한 규칙이 없다/);
  });
});
