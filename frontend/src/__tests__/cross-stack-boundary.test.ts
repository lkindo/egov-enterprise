// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { codeWithoutComments } from '../../../scripts/code-without-comments.mjs';

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
 *  - cross-stack/ 밖의 시험 파일(`src` 아래 어디든 — 기능 디렉터리의 `__tests__` 포함)이
 *    백엔드 경로를 참조하면 red — 그 단언을 cross-stack/ 으로 옮겨야 backend 축 실행이
 *    보장된다. 종전에는 루트 `__tests__` 한 단계만 읽어, 기능 디렉터리에서 백엔드 원본을
 *    읽는 시험 4개(정책 API·SMS 전송 구현체·업무 홈 조각의 서버 권한 바인딩)가 백엔드-only
 *    PR 에서 돌지 않았다(FE-CONTRACT-02).
 *  - cross-stack/ 파일이 백엔드 경로를 참조하지 않으면 red — 프론트 전용 계약이
 *    비싼 이중 실행 경로에 무임승차하지 않는다.
 *
 * 마커는 주석을 뺀 코드에서만 찾는다(공용 판정 scripts/code-without-comments.mjs). 주석에서
 * 모듈 이름을 설명만 하는 시험은 백엔드를 읽지 않으므로 대상이 아니고, 문자열 속 경로는 센다.
 *
 * 실행 결속 자체(pre-push·verify.mjs·ci.yml 의 명령 라인)는
 * config/governance/gates.json 의 GATESET-CROSS-STACK-CONTRACTS 가 동결한다.
 */

const TESTS_DIR = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(TESTS_DIR, '..');
/** `src` 기준 경로. CI backend 축은 이 디렉터리를 재귀로 돈다(`vitest run src/__tests__/cross-stack`). */
const CROSS_STACK_PREFIX = '__tests__/cross-stack/';
const GUARD_FILE = '__tests__/cross-stack-boundary.test.ts';

/** 백엔드 소스 참조로 간주하는 토큰 — 모듈 루트 경로와 Gradle 정본. */
const BACKEND_MARKERS = [
  'api-server',
  'business-core',
  'business-app',
  'migration-tool',
  'settings.gradle',
  'foundation/src/',
];

/** `src` 아래 vitest 시험 파일(vitest include 와 같은 `*.test.ts(x)`)의 `src` 기준 `/` 경로, 정렬. */
function testFilesUnder(directory: string, prefix = ''): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') files.push(...testFilesUnder(join(directory, entry.name), `${prefix}${entry.name}/`));
    } else if (entry.isFile() && /\.test\.tsx?$/.test(entry.name)) {
      files.push(`${prefix}${entry.name}`);
    }
  }
  return files.sort();
}

/** 주석을 뺀 코드에 나오는 백엔드 마커. 파일 이름은 주석 규칙(확장자)을 고르는 데만 쓴다. */
function backendMarkersInSource(source: string, fileName: string): string[] {
  const code = codeWithoutComments(source, fileName);
  return BACKEND_MARKERS.filter((marker) => code.includes(marker));
}

const backendMarkersIn = (file: string) => backendMarkersInSource(readFileSync(join(SRC_DIR, file), 'utf8'), file);

describe('cross-stack contract placement', () => {
  const testFiles = testFilesUnder(SRC_DIR).filter((file) => file !== GUARD_FILE);
  const crossStackFiles = testFiles.filter((file) => file.startsWith(CROSS_STACK_PREFIX));
  const otherFiles = testFiles.filter((file) => !file.startsWith(CROSS_STACK_PREFIX));

  it('scans a real population (vacuity floor)', () => {
    // 스캔이 무너지면 통과가 아니라 실패다. 하한 아래로 줄어드는 정당한 변경은
    // 이 상수를 같은 변경에서 낮추고 사유를 리뷰에 남긴다.
    expect(otherFiles.filter((file) => file.startsWith('__tests__/')).length).toBeGreaterThanOrEqual(20);
    // 루트 밖(기능 디렉터리)까지 내려가는지 — 종전 가드의 사각이 그 자리였다.
    expect(otherFiles.filter((file) => !file.startsWith('__tests__/')).length).toBeGreaterThanOrEqual(100);
    expect(crossStackFiles.length).toBeGreaterThanOrEqual(7);
  });

  it('counts markers in code only — comments are not backend reads, string paths are', () => {
    expect(backendMarkersInSource("// business-core 의 원장과 같은 값이다\nconst x = 1;\n", 'a.test.ts')).toEqual([]);
    expect(backendMarkersInSource('/* api-server 가 내려 준다 */\nexport {};\n', 'a.test.tsx')).toEqual([]);
    expect(backendMarkersInSource("const dir = path.join(ROOT, 'business-app', 'src');\n", 'a.test.ts')).toEqual(['business-app']);
    // 문자열 속 여는 기호가 아래 주석까지 이어져 코드를 지우지 않는다(종전 정규식 제거의 결함).
    expect(backendMarkersInSource("const glob = 'image/*';\nread('api-server/x.java'); // */\n", 'a.test.ts')).toEqual(['api-server']);
  });

  it('contracts outside cross-stack/ must not audit backend sources — move them to cross-stack/', () => {
    const misplaced = otherFiles
      .map((file) => ({ file, markers: backendMarkersIn(file) }))
      .filter(({ markers }) => markers.length > 0);

    expect(
      misplaced.map(({ file, markers }) => `${file} → ${markers.join(', ')}`),
      'cross-stack/ 밖의 시험 파일이 백엔드 경로를 참조합니다. backend-only PR 에서는 이 파일이 '
      + '실행되지 않으므로(frontend 축 skip), 그 단언을 src/__tests__/cross-stack/ 으로 옮겨 '
      + 'backend 축 실행을 받으세요. 화면 렌더 단언은 제자리에 둡니다.',
    ).toEqual([]);
  });

  it('cross-stack contracts must actually reference backend sources — no free riders', () => {
    const freeRiders = crossStackFiles.filter((file) => backendMarkersIn(file).length === 0);

    expect(
      freeRiders,
      'cross-stack/ 파일이 (주석 밖에서) 백엔드 경로를 참조하지 않습니다. 프론트 전용 계약은 '
      + '다른 __tests__ 로 옮기세요 — 이 디렉터리는 backend 축에서도 실행되는 비용을 집니다.',
    ).toEqual([]);
  });
});
