// @vitest-environment node
/** 화면의 거부/허용 안내는 현재 기능 권한과 서버 자원 경계를 근거로 한다.
 * 소스 연결 검사는 Java HTTP/메서드 보안 통합 테스트를 대신하지 않는다.
 * 과거 인증만으로 열린 게시판을 전제로 한 검사는 현재 exact operation 정책으로 전환했다.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { canPermission } from '@/lib/auth/permissions';
import { inProjection, keepInProjection } from '@/test-utils/projection';
import { codeWithoutComments } from '../../../../scripts/code-without-comments.mjs';

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8');
const BOARD_CONTROLLER = 'api-server/src/main/java/nuri/api/controller/business/board/BoardApiController.java';
const BOARD_SERVICE = 'business-app/src/main/java/nuri/business/service/board/BoardService.java';
const POLICY = 'business-core/src/main/java/nuri/business/security/authorization/PermissionPolicy.java';
const HANDLER_PREFIX = 'nuri.api.controller.business.board.BoardApiController#';
interface Binding { method: string; path: string; handler: string; access: string; permission: string | null; excludedGroups?: string[] }
const bindings = (): Binding[] => JSON.parse(read('config/governance/authorization-policies.json')).operationBindings;
const DENIAL_VOCABULARY = ['접근 권한', '권한이 없', '권한을 요청', '접근할 수 없', '열람 권한', 'Forbidden'];
const ROLE_NEGATION = /![\s]*(?:isAdmin\b|isAdministrativeRole\s*\()/;
const BOARD_OPERATIONS = [
  // [2026-10-23 ADR-0040 결정 11] 이용 화면의 게시판 선택지 — 목록과 같은 권한. 사용 여부·커뮤니티 거르기는 서비스가 한다.
  ['GET', '/api/v1/boards/options', 'getBoardOptions', 'BOARD_READ'],
  ['POST', '/api/v1/boards/posts', 'createPost', 'BOARD_CREATE'],
  ['GET', '/api/v1/boards/public-faqs', 'getPublicFaqs', 'BOARD_READ'],
  ['GET', '/api/v1/boards/public-faqs/{pstSn}', 'getPublicFaqDetail', 'BOARD_READ'],
  ['GET', '/api/v1/boards/search', 'searchPosts', 'BOARD_READ'],
  ['GET', '/api/v1/boards/{bbsId}', 'getPosts', 'BOARD_READ'],
  // [2026-09-26 DIP V5] 인증 사용자용 게시판 메타 — 목록과 같은 권한. 커뮤니티 회원 가드는 서비스가 집행한다.
  ['GET', '/api/v1/boards/{bbsId}/meta', 'getBoardMeta', 'BOARD_READ'],
  ['POST', '/api/v1/boards/{bbsId}/posts/with-files', 'createPostWithFiles', 'BOARD_CREATE'],
  ['DELETE', '/api/v1/boards/{bbsId}/posts/{pstSn}', 'deletePost', 'BOARD_DELETE'],
  ['GET', '/api/v1/boards/{bbsId}/posts/{pstSn}', 'getPost', 'BOARD_READ'],
  ['PUT', '/api/v1/boards/{bbsId}/posts/{pstSn}', 'updatePost', 'BOARD_UPDATE'],
  ['PATCH', '/api/v1/boards/{bbsId}/posts/{pstSn}/like', 'likePost', 'BOARD_LIKE'],
  // [2026-10-23 ADR-0040 결정 6] 내 추천 취소 — 추천과 같은 권한. 열람 판정(assertCommentAccess)과 본인 이력만 지우는 판정은 서비스가 한다.
  ['DELETE', '/api/v1/boards/{bbsId}/posts/{pstSn}/like', 'cancelLikePost', 'BOARD_LIKE'],
  // [2026-09-25 DIP I3] Q&A 해결 표시 — 게시글 수정과 같은 권한·같은 소유자 가드(findOwnedPost).
  ['PATCH', '/api/v1/boards/{bbsId}/posts/{pstSn}/solved', 'markQuestionSolved', 'BOARD_UPDATE'],
  ['PUT', '/api/v1/boards/{bbsId}/posts/{pstSn}/with-files', 'updatePostWithFiles', 'BOARD_UPDATE'],
  ['GET', '/api/v1/boards/{bbsId}/stats', 'getStats', 'BOARD_READ'],
] as const;

function assertBoardContract(controller: string, rows: Binding[]): void {
  const actual = rows.filter(row => row.handler.startsWith(HANDLER_PREFIX));
  expect(actual.map(row => [row.method, row.path, row.handler.slice(HANDLER_PREFIX.length), row.permission]).sort())
    .toEqual([...BOARD_OPERATIONS].sort());
  expect(actual.every(row => row.access === 'PERMISSION')).toBe(true);
  const guards = [...controller.matchAll(/@(?:org\.springframework\.security\.access\.prepost\.)?PreAuthorize\("([^"]+)"\)/g)]
    .map(match => match[1]);
  expect(guards.sort()).toEqual(actual.map(row => `@permissionPolicy.allowed(authentication, '${row.handler}')`).sort());
}

function methodBody(source: string, method: string): string {
  const start = source.search(new RegExp(`(?:public|protected|private)\\s+[\\w<>.]+\\s+${method}\\s*\\(`));
  expect(start, `${method} method is missing`).toBeGreaterThanOrEqual(0);
  return source.slice(start).split(/\n\s*(?:public|protected|private)\s/)[0];
}

/**
 * 소스에서 "역할 부정 술어 아래에 거부 어휘가 있는" 지점을 찾는다.
 *
 * 술어와 어휘가 **같은 삼항 분기 안**에 있을 때만 위반으로 본다 — 파일 어딘가에 두 낱말이
 * 따로 존재하는 것은 결함이 아니다.
 *
 * 주석 속 언급은 세지 않는다 — 공용 판정(scripts/code-without-comments.mjs)이 주석만 지운다. 종전 정규식 제거는 문자열 속
 * 주석 기호(게시글 상세가 목록 출처로 적은 와일드카드 경로)에서 블록 주석을 열어 그 뒤 코드를 지웠고, 그 구간의 거부 안내는
 * 넣어도 녹색이었다(FE-CONTRACT-01).
 */
export function findUnenforcedDenial(source: string, fileName: string): string[] {
  const stripped = codeWithoutComments(source, fileName);

  const hits: string[] = [];
  for (const match of stripped.matchAll(/\{([^{}]*?)\?([\s\S]{0,1600}?)\}/g)) {
    const [, condition, branch] = match;
    if (!ROLE_NEGATION.test(condition)) continue;
    const word = DENIAL_VOCABULARY.find((token) => branch.includes(token));
    if (word) hits.push(`${condition.trim().slice(0, 60)} → "${word}"`);
  }

  // 술어가 변수로 한 번 우회하는 흔한 형태도 잡는다: const x = !isAdmin && ...; {x ? (...)}
  for (const match of stripped.matchAll(/const\s+([A-Za-z_$][\w$]*)\s*=\s*([^;]*![\s]*isAdmin[^;]*);/g)) {
    const [, name] = match;
    const branch = stripped.split(new RegExp(String.raw`\{\s*${name}\s*\?`))[1];
    if (!branch) continue;
    const word = DENIAL_VOCABULARY.find((token) => branch.slice(0, 1600).includes(token));
    if (word) hits.push(`${name} (= !isAdmin …) → "${word}"`);
  }
  return hits;
}

// 선택하지 않은 기능의 파일은 생성물에서 투영으로 빠진다 — 원장에 있고 실제로 없는 파일만 뺀다(원본에서는 그대로다).
// 게시판을 고르지 않은 생성물에서는 게시판 컨트롤러·서비스가 빠진다. 게시판과 무관한 인가 기반 단언은 그대로 보고,
//   게시판을 읽는 화면(지식 허브·커뮤니티 게시판·게시글 상세 — 서로 다른 기능과 함께 빠진다)은 파일마다 거른다.
const boardInProjection = inProjection([path.join(ROOT, BOARD_CONTROLLER), path.join(ROOT, BOARD_SERVICE)]);
const BOARD_READ_SCREENS_ALL = [
  'frontend/src/app/admin/help/KnowledgeHubClient.tsx',
  // 지식 허브의 커뮤니티 탭 머리 동작(허브 분해 H2 — 커뮤니티 기여)
  'frontend/src/components/business/community/knowledge-community-tab.tsx',
  'frontend/src/app/admin/community/board/CommunityBoardClient.tsx',
  'frontend/src/app/admin/community/boards/detail/BoardDetailClient.tsx',
];

const BOARD_READ_SCREENS = keepInProjection(BOARD_READ_SCREENS_ALL, screen => path.join(ROOT, screen));

describe('현재 집행되는 인가와 화면 안내의 정합', () => {
  it('게시판 읽기·쓰기 전체는 exact HTTP binding과 같은 PermissionPolicy handler를 사용한다', () => {
    if (boardInProjection) assertBoardContract(read(BOARD_CONTROLLER), bindings());
    const config = read('api-server/src/main/java/nuri/api/config/ApiSecurityConfig.java');
    expect(config).toContain('auth.anyRequest().access(new nuri.business.security.authorization.OperationAuthorizationManager(');
    const manager = read('business-core/src/main/java/nuri/business/security/authorization/OperationAuthorizationManager.java');
    expect(manager).toContain('e.binding().method().equals(method) && e.pattern().matches(path)');
    expect(manager).toContain('policy.allows(authentication.get(),e.binding())');
    expect(manager).toContain('.orElseGet(() -> new AuthorizationDecision(false))');
    expect(read(POLICY)).toContain('"PERMISSION".equals(binding.access()) && has(authentication, binding.permission())');
  });

  // 예시 권한은 core 코드(부서 업무)다 — 생성물은 권한 목록을 구성 코드로 줄이므로(Phase 2 10단계 10b) 게시판이 빠진 구성에서도
  // 같은 뜻으로 돈다. 읽기 권한이 등록·수정·삭제·타인 자료 권한을 만들지 않는다는 판정이다.
  it('그룹 이름이나 읽기 권한이 쓰기 권한을 만들지 않고 회수하면 표시 권한도 닫힌다', () => {
    const reader = { groups: ['OPERATIONS_TEAM'], permissions: ['DEPT_JOB_READ'], authorizationVersion: 'current' };
    expect(canPermission(reader, 'DEPT_JOB_READ')).toBe(true);
    for (const code of ['DEPT_JOB_CREATE', 'DEPT_JOB_UPDATE', 'DEPT_JOB_DELETE', 'DEPT_JOB_UPDATE_ALL']) expect(canPermission(reader, code)).toBe(false);
    const revoked = { ...reader, groups: ['ROLE_ADMIN', 'ROLE_SYSTEM'], permissions: [] };
    expect(canPermission(revoked, 'DEPT_JOB_READ')).toBe(false);
    expect(canPermission({ permissions: ['DEPT_JOB_READ'] }, 'DEPT_JOB_READ')).toBe(false);
    expect(canPermission(reader, 'UNKNOWN')).toBe(false);
  });

  it('비밀글·커뮤니티·소유자 축과 SYSTEM 개인정보 배제는 기능 권한과 별도로 유지한다', () => {
    if (boardInProjection) {
      const service = read(BOARD_SERVICE);
      const detail = methodBody(service, 'getPostDetail');
      // [2026-10-23 ADR-0040 결정 1] 상세는 열람 판정(사용 여부 → 커뮤니티 회원)을 지난다. 커뮤니티 축은 그 판정 안에 있다.
      expect(detail).toContain('loadReadableMaster(bbsId, false)');
      expect(methodBody(service, 'loadReadableMaster')).toContain('assertCommunityAccess(master);');
      expect(detail).toContain('if ("Y".equalsIgnoreCase(detail.getScrtYn()))');
      expect(detail).toContain('SecurityUtil.assertOwnerOrPermissionByEsntlId(detail.getUserId(), "BOARD_READ_ALL")');
      expect(methodBody(service, 'findOwnedPost')).toContain('SecurityUtil.assertOwnerOrPermissionByEsntlId(board.getUserId(), "BOARD_UPDATE_ALL")');
      expect(methodBody(service, 'deletePost')).toContain('SecurityUtil.assertOwnerOrPermissionByEsntlId(board.getUserId(), "BOARD_DELETE_ALL")');
    }
    const privacy = bindings().filter(row => row.handler.includes('PrivacyLogApiController#'));
    expect(privacy.map(row => row.permission).sort()).toEqual(['PRIVACY_EXPORT', 'PRIVACY_READ']);
    expect(privacy.every(row => row.access === 'PERMISSION' && row.excludedGroups?.join() === 'ROLE_SYSTEM')).toBe(true);
    const policy = read(POLICY);
    expect(policy).toContain('user.getGroups().stream().anyMatch(binding.excludedGroups()::contains)) return false');
    expect(policy.indexOf('binding.excludedGroups()')).toBeLessThan(policy.indexOf('"PERMISSION".equals(binding.access())'));
  });

  it('기능 권한·실제 오류로 안내하며 역할 이름만으로 게시판 읽기 거부를 만들지 않는다', () => {
    for (const screen of BOARD_READ_SCREENS) expect(findUnenforcedDenial(read(screen), screen), screen).toEqual([]);
  });

  if (boardInProjection) it('누락된 handler 가드·잘못된 permission·공개 완화는 red다', () => {
    const controller = read(BOARD_CONTROLLER);
    const rows = bindings();
    expect(() => assertBoardContract(controller, rows)).not.toThrow();
    expect(() => assertBoardContract(controller.replace('#getPosts', '#getPost'), rows)).toThrow();
    for (const change of [
      (row: Binding) => { row.permission = 'BOARD_DELETE'; },
      (row: Binding) => { row.access = 'PUBLIC'; },
    ]) {
      const changed = structuredClone(rows);
      const target = changed.find(row => row.handler === `${HANDLER_PREFIX}getPosts`);
      if (!target) throw new Error('getPosts fixture target missing');
      change(target);
      expect(() => assertBoardContract(controller, changed)).toThrow();
    }
  });

  it('거짓 역할 거부는 탐지하고 실제 기능 권한의 정직한 거부는 허용한다', () => {
    expect(findUnenforcedDenial(`export function Screen() {
      return <div>{!isAdmin ? (<p>접근 권한 없음</p>) : (<Stream />)}</div>;
    }`, 'Screen.tsx')).not.toEqual([]);
    expect(findUnenforcedDenial(`const restricted = !isAdmin && tab === 'WIKI';
      export function Screen() { return <div>{restricted ? (<p>열람 권한이 없습니다</p>) : (<Stream />)}</div>; }
    `, 'Screen.tsx')).not.toEqual([]);
    expect(findUnenforcedDenial(`export function Screen() {
      return <div>{!canPermission(user, 'BOARD_READ') ? (<p>접근 권한 없음</p>) : (<Stream />)}</div>;
    }`, 'Screen.tsx')).toEqual([]);
    expect(findUnenforcedDenial(`export function Screen() {
      return <div>{!isAdmin ? null : (<button>게시판 관리</button>)}</div>;
    }`, 'Screen.tsx')).toEqual([]);
  });

  it('문자열 속 주석 기호 뒤의 거짓 거부도 잡고 주석 속 예시는 세지 않는다', () => {
    // 실측 모양(FE-CONTRACT-01): 게시글 상세가 목록 출처로 적은 와일드카드 경로 문자열 뒤, JSX 블록 주석 앞의 코드를 종전 정규식
    //   제거가 통째로 지웠다. 그 구간의 역할 부정 거부가 잡혀야 한다.
    const hidden = `const ORIGINS = ['/admin/help', '/cop/cmy/selectCommunityDetail/*'] as const;
      export function Screen() {
        return <div>{!isAdmin ? (<p>접근 권한 없음</p>) : (<Stream />)}{/* 본문 */}</div>;
      }`;
    expect(findUnenforcedDenial(hidden, 'BoardDetailClient.tsx'), '문자열 속 주석 기호 뒤의 거짓 거부를 놓쳤다').toHaveLength(1);
    expect(findUnenforcedDenial(`// {!isAdmin ? (<p>접근 권한 없음</p>) : null} 같은 분기를 두지 않는다
      export function Screen() { return <Stream />; }`, 'Screen.tsx')).toEqual([]);
  });
});
