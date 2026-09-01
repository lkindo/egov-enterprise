/**
 * 화면은 **집행자가 없는 인가**를 주장하지 않는다.
 *
 * ── 무엇이 있었나 ──────────────────────────────────────────────────────────────
 * 지식 허브가 비관리자에게 "접근 권한 없음 · 시스템 관리자에게 권한을 요청하십시오" 를
 * 띄웠다. 그런데 그 벽을 집행하는 지점이 **어디에도 없었다**.
 *
 * - 서버: `BoardApiController` 는 클래스 레벨 인증뿐이고 GET 핸들러에 역할 인가가 없다.
 *   `rbac.db-auth.secure-paths` 에도 `/api/v1/boards` 가 없다.
 * - 제품: 비관리자 게시판 폴백 목록이 같은 게시판(WIKI)을 '일정 게시판' 으로 **의도적으로
 *   포함**하고, 같은 사용자가 `/admin/community/board` 에서 같은 엔드포인트를 부른다.
 * - 화면 자신: 벽 바로 옆 사이드바가 그 게시판의 제목·조회수를 렌더하고 상세까지 열었다.
 *
 * 즉 보호는 0이고 안내는 거짓이었다. 요청할 권한 자체가 존재하지 않는다.
 *
 * ── 왜 문자열 금지로는 부족한가 ────────────────────────────────────────────────
 * `not.toContain('접근 권한 없음')` 은 세 방향에서 샌다.
 * ① 다른 문구('열람 권한이 없습니다')로 바꾸면 통과한다.
 * ② 다른 화면에서 같은 결함이 재발해도 못 본다.
 * ③ **방향이 반대일 때 틀린다** — 나중에 진짜 board ACL 이 생기면 정직한 차단 문구가
 *    필요해지는데, 문자열 금지는 그 옳은 코드를 red 로 만든다. 그러면 다음 사람은 계약을 지운다.
 *
 * 그래서 **서버의 현재 상태를 계약의 입력으로 삼는다** — 서버가 열려 있는 동안에만 화면의
 * 거부 주장을 금지하고, 서버가 닫히는 순간 재판정을 요구하며 red 가 된다.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8');

const BOARD_CONTROLLER = 'api-server/src/main/java/nuri/api/controller/business/board/BoardApiController.java';
const APPLICATION_YML = 'api-server/src/main/resources/application.yml';

/** 거부 상태를 뜻하는 어휘 — 단일 문자열이 아니라 집합으로 둔다. */
const DENIAL_VOCABULARY = [
  '접근 권한',
  '권한이 없',
  '권한을 요청',
  '접근할 수 없',
  '열람 권한',
  'Forbidden',
];

/** 역할 **부정** 술어. `isAdmin` 자체(기능 노출)는 대상이 아니다 — 거부는 부정형에서 나온다. */
const ROLE_NEGATION = /![\s]*(?:isAdmin\b|isAdministrativeRole\s*\()/;

/**
 * 서버가 게시판 읽기를 인증만으로 허용하는가.
 *
 * 상수로 박지 않고 매번 실측한다 — 이 값이 계약의 방향을 뒤집는다.
 */
function boardReadIsOpenToAnyAuthenticatedUser(): boolean {
  const controller = read(BOARD_CONTROLLER);
  const methodAuthz = /@(?:PreAuthorize|AdminOrSystem|AdminOnly|Secured|RolesAllowed)\b/.test(controller);

  const securePaths = read(APPLICATION_YML).match(/secure-paths:\s*"([^"]*)"/);
  expect(securePaths, 'rbac.db-auth.secure-paths 를 읽지 못했다 — 계약이 vacuous 하다').not.toBeNull();
  const urlGated = securePaths![1].split(',').some((entry) => entry.trim().startsWith('/api/v1/boards'));

  return !methodAuthz && !urlGated;
}

/**
 * 소스에서 "역할 부정 술어 아래에 거부 어휘가 있는" 지점을 찾는다.
 *
 * 술어와 어휘가 **같은 삼항 분기 안**에 있을 때만 위반으로 본다 — 파일 어딘가에 두 낱말이
 * 따로 존재하는 것은 결함이 아니다.
 */
export function findUnenforcedDenial(source: string): string[] {
  const stripped = source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ');

  const hits: string[] = [];
  for (const match of stripped.matchAll(/\{([^{}]*?)\?([\s\S]{0,1600}?)\}\s*\n/g)) {
    const [, condition, branch] = match;
    if (!ROLE_NEGATION.test(condition)) continue;
    const word = DENIAL_VOCABULARY.find((token) => branch.includes(token));
    if (word) hits.push(`${condition.trim().slice(0, 60)} → "${word}"`);
  }

  // 술어가 변수로 한 번 우회하는 흔한 형태도 잡는다: const x = !isAdmin && ...; {x ? (...)}
  for (const match of stripped.matchAll(/const\s+([A-Za-z_$][\w$]*)\s*=\s*([^;]*![\s]*isAdmin[^;]*);/g)) {
    const [, name] = match;
    const branch = stripped.split(new RegExp(`\{\s*${name}\s*\?`))[1];
    if (!branch) continue;
    const word = DENIAL_VOCABULARY.find((token) => branch.slice(0, 1600).includes(token));
    if (word) hits.push(`${name} (= !isAdmin …) → "${word}"`);
  }
  return hits;
}

/** 게시판 읽기를 소비하는 화면들. */
const BOARD_READ_SCREENS = [
  'frontend/src/app/admin/help/KnowledgeHubClient.tsx',
  'frontend/src/app/admin/community/board/CommunityBoardClient.tsx',
  'frontend/src/app/admin/community/boards/detail/BoardDetailClient.tsx',
];

describe('집행자 없는 인가 주장 금지', () => {
  it('게시판 읽기의 서버 인가 상태를 실측한다', () => {
    // 이 단언이 깨지는 것은 실패가 아니라 **재판정 신호**다 — 아래 규칙의 방향이 뒤집힌다.
    expect(
      boardReadIsOpenToAnyAuthenticatedUser(),
      '게시판 읽기에 서버 인가가 생겼다. 이제 화면이 정직한 차단을 보여 줄 수 있고 보여 줘야 한다 — '
      + '이 파일의 규칙을 "차단 금지"에서 "차단 필수"로 다시 판정하라.',
    ).toBe(true);
  });

  it('서버가 열려 있는 동안 화면은 거부를 주장하지 않는다', () => {
    if (!boardReadIsOpenToAnyAuthenticatedUser()) return;

    for (const screen of BOARD_READ_SCREENS) {
      const hits = findUnenforcedDenial(read(screen));
      expect(
        hits,
        `${screen} 가 역할 부정 술어로 거부 상태를 렌더한다. 서버는 같은 데이터를 인증 사용자 `
        + `누구에게나 준다 — 이 벽은 보호하지 않고 사용자에게 없는 권한을 요청하게 만든다.`,
      ).toEqual([]);
    }
  });

  /**
   * 위 검사는 현재 실제 위반이 0건이라 **탐지기가 고장 나도 통과한다**. 합성 소스로
   * 탐지기 자체가 살아 있음을 증명한다(H5 — 의도적 위반이 red 가 되는지 확인).
   */
  it('탐지기가 합성 위반을 실제로 잡는다', () => {
    const inlineTernary = `
      export function Screen() {
        return <div>{!isAdmin ? (<p>접근 권한 없음</p>) : (<Stream />)}</div>;
      }
    `;
    expect(findUnenforcedDenial(inlineTernary)).not.toEqual([]);

    const viaVariable = `
      const isAccessRestricted = !isAdmin && (tab === 'WIKI');
      export function Screen() {
        return <div>{isAccessRestricted ? (<p>열람 권한이 없습니다</p>) : (<Stream />)}</div>;
      }
    `;
    expect(findUnenforcedDenial(viaVariable)).not.toEqual([]);

    // 거부 어휘가 없으면 위반이 아니다 — 역할로 기능을 나누는 것 자체는 정상이다.
    const featureGate = `
      export function Screen() {
        return <div>{!isAdmin ? null : (<button>게시판 관리</button>)}</div>;
      }
    `;
    expect(findUnenforcedDenial(featureGate)).toEqual([]);
  });
});
