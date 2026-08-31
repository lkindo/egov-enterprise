import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * [크로스 스택 계약 배치 가드]
 *
 * `src/__tests__/cross-stack/` 는 백엔드 소스(Java·Gradle)를 함께 감사하는 계약의
 * 전용 위치다. CI 는 이 디렉터리를 frontend 축과 별개로 backend 축에서도 실행한다
 * (secret-scan job — 백엔드-only PR 에서 frontend-scope 가 skip 되어도 크로스 스택
 * 계약은 돌아야 한다. 종전에는 `ocrnYmd.desc()` 를 `.asc()` 로 바꾸는 백엔드-only
 * 변경에서, 정확히 그 드리프트를 잡으려고 만든 계약이 한 번도 실행되지 않았다).
 *
 * 이 가드는 그 실행 경로 분리가 배치 착오로 무력화되는 것을 양방향으로 막는다:
 *  - 루트 `__tests__` 파일이 백엔드 경로를 참조하면 red — cross-stack/ 으로 옮겨야
 *    backend 축 실행이 보장된다.
 *  - cross-stack/ 파일이 백엔드 경로를 참조하지 않으면 red — 프론트 전용 계약이
 *    비싼 이중 실행 경로에 무임승차하지 않는다.
 *
 * 실행 결속 자체(pre-push·verify.mjs·ci.yml 의 명령 라인)는
 * config/governance/gates.json 의 GATESET-CROSS-STACK-CONTRACTS 가 동결한다.
 */

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const CROSS_STACK_DIR = join(TESTS_DIR, 'cross-stack');
const GUARD_FILE = 'cross-stack-boundary.test.ts';

/** 백엔드 소스 참조로 간주하는 토큰 — 모듈 루트 경로와 Gradle 정본. */
const BACKEND_MARKERS = [
  'api-server',
  'business-core',
  'business-app',
  'migration-tool',
  'settings.gradle',
  'foundation/src/',
];

function testFilesIn(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.test\.tsx?$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

function backendMarkersIn(filePath: string): string[] {
  const source = readFileSync(filePath, 'utf8');
  return BACKEND_MARKERS.filter((marker) => source.includes(marker));
}

describe('cross-stack contract placement', () => {
  const rootFiles = testFilesIn(TESTS_DIR).filter((name) => name !== GUARD_FILE);
  const crossStackFiles = testFilesIn(CROSS_STACK_DIR);

  it('scans a real population (vacuity floor)', () => {
    // 스캔이 무너지면 통과가 아니라 실패다. 하한 아래로 줄어드는 정당한 변경은
    // 이 상수를 같은 변경에서 낮추고 사유를 리뷰에 남긴다.
    expect(rootFiles.length).toBeGreaterThanOrEqual(20);
    expect(crossStackFiles.length).toBeGreaterThanOrEqual(7);
  });

  it('root-level contracts must not audit backend sources — move them to cross-stack/', () => {
    const misplaced = rootFiles
      .map((name) => ({ name, markers: backendMarkersIn(join(TESTS_DIR, name)) }))
      .filter(({ markers }) => markers.length > 0);

    expect(
      misplaced.map(({ name, markers }) => `${name} → ${markers.join(', ')}`),
      '루트 __tests__ 파일이 백엔드 경로를 참조합니다. backend-only PR 에서는 이 파일이 '
      + '실행되지 않으므로(frontend 축 skip), src/__tests__/cross-stack/ 으로 옮겨 '
      + 'backend 축 실행을 받으세요.',
    ).toEqual([]);
  });

  it('cross-stack contracts must actually reference backend sources — no free riders', () => {
    const freeRiders = crossStackFiles
      .filter((name) => backendMarkersIn(join(CROSS_STACK_DIR, name)).length === 0);

    expect(
      freeRiders,
      'cross-stack/ 파일이 백엔드 경로를 참조하지 않습니다. 프론트 전용 계약은 루트 '
      + '__tests__ 로 옮기세요 — 이 디렉터리는 backend 축에서도 실행되는 비용을 집니다.',
    ).toEqual([]);
  });
});
