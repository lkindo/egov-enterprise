/** 화면의 거부/허용 안내는 현재 기능 권한과 서버 자원 경계를 근거로 한다.
 * 소스 연결 검사는 Java HTTP/메서드 보안 통합 테스트를 대신하지 않는다.
 * 과거 인증만으로 열린 게시판을 전제로 한 검사는 현재 exact operation 정책으로 전환했다.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { canPermission } from '@/lib/auth/permissions';

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
  ['POST', '/api/v1/boards/posts', 'createPost', 'BOARD_CREATE'],
  ['GET', '/api/v1/boards/public-faqs', 'getPublicFaqs', 'BOARD_READ'],
  ['GET', '/api/v1/boards/public-faqs/{pstSn}', 'getPublicFaqDetail', 'BOARD_READ'],
  ['GET', '/api/v1/boards/search', 'searchPosts', 'BOARD_READ'],
  ['GET', '/api/v1/boards/{bbsId}', 'getPosts', 'BOARD_READ'],
  ['POST', '/api/v1/boards/{bbsId}/posts/with-files', 'createPostWithFiles', 'BOARD_CREATE'],
  ['DELETE', '/api/v1/boards/{bbsId}/posts/{pstSn}', 'deletePost', 'BOARD_DELETE'],
  ['GET', '/api/v1/boards/{bbsId}/posts/{pstSn}', 'getPost', 'BOARD_READ'],
  ['PUT', '/api/v1/boards/{bbsId}/posts/{pstSn}', 'updatePost', 'BOARD_UPDATE'],
  ['PATCH', '/api/v1/boards/{bbsId}/posts/{pstSn}/like', 'likePost', 'BOARD_LIKE'],
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
 */
export function findUnenforcedDenial(source: string): string[] {
  const stripped = source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ');

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

const BOARD_READ_SCREENS = [
  'frontend/src/app/admin/help/KnowledgeHubClient.tsx',
  'frontend/src/app/admin/community/board/CommunityBoardClient.tsx',
  'frontend/src/app/admin/community/boards/detail/BoardDetailClient.tsx',
];

describe('현재 집행되는 인가와 화면 안내의 정합', () => {
  it('게시판 읽기·쓰기 전체는 exact HTTP binding과 같은 PermissionPolicy handler를 사용한다', () => {
    assertBoardContract(read(BOARD_CONTROLLER), bindings());
    const config = read('api-server/src/main/java/nuri/api/config/ApiSecurityConfig.java');
    expect(config).toContain('auth.anyRequest().access(new nuri.business.security.authorization.OperationAuthorizationManager(');
    const manager = read('business-core/src/main/java/nuri/business/security/authorization/OperationAuthorizationManager.java');
    expect(manager).toContain('e.binding().method().equals(method) && e.pattern().matches(path)');
    expect(manager).toContain('policy.allows(authentication.get(),e.binding())');
    expect(manager).toContain('.orElseGet(() -> new AuthorizationDecision(false))');
    expect(read(POLICY)).toContain('"PERMISSION".equals(binding.access()) && has(authentication, binding.permission())');
  });

  it('그룹 이름이나 읽기 권한이 쓰기 권한을 만들지 않고 회수하면 표시 권한도 닫힌다', () => {
    const reader = { groups: ['OPERATIONS_TEAM'], permissions: ['BOARD_READ'], authorizationVersion: 'current' };
    expect(canPermission(reader, 'BOARD_READ')).toBe(true);
    for (const code of ['BOARD_CREATE', 'BOARD_UPDATE', 'BOARD_DELETE', 'BOARD_READ_ALL']) expect(canPermission(reader, code)).toBe(false);
    const revoked = { ...reader, groups: ['ROLE_ADMIN', 'ROLE_SYSTEM'], permissions: [] };
    expect(canPermission(revoked, 'BOARD_READ')).toBe(false);
    expect(canPermission({ permissions: ['BOARD_READ'] }, 'BOARD_READ')).toBe(false);
    expect(canPermission(reader, 'UNKNOWN')).toBe(false);
  });

  it('비밀글·커뮤니티·소유자 축과 SYSTEM 개인정보 배제는 기능 권한과 별도로 유지한다', () => {
    const service = read(BOARD_SERVICE);
    const detail = methodBody(service, 'getPostDetail');
    expect(detail).toContain('assertCommunityAccess(bbsId)');
    expect(detail).toContain('if ("Y".equalsIgnoreCase(detail.getScrtYn()))');
    expect(detail).toContain('SecurityUtil.assertOwnerOrPermissionByEsntlId(detail.getUserId(), "BOARD_READ_ALL")');
    expect(methodBody(service, 'findOwnedPost')).toContain('SecurityUtil.assertOwnerOrPermissionByEsntlId(board.getUserId(), "BOARD_UPDATE_ALL")');
    expect(methodBody(service, 'deletePost')).toContain('SecurityUtil.assertOwnerOrPermissionByEsntlId(board.getUserId(), "BOARD_DELETE_ALL")');
    const privacy = bindings().filter(row => row.handler.includes('PrivacyLogApiController#'));
    expect(privacy.map(row => row.permission).sort()).toEqual(['PRIVACY_EXPORT', 'PRIVACY_READ']);
    expect(privacy.every(row => row.access === 'PERMISSION' && row.excludedGroups?.join() === 'ROLE_SYSTEM')).toBe(true);
    const policy = read(POLICY);
    expect(policy).toContain('user.getGroups().stream().anyMatch(binding.excludedGroups()::contains)) return false');
    expect(policy.indexOf('binding.excludedGroups()')).toBeLessThan(policy.indexOf('"PERMISSION".equals(binding.access())'));
  });

  it('기능 권한·실제 오류로 안내하며 역할 이름만으로 게시판 읽기 거부를 만들지 않는다', () => {
    for (const screen of BOARD_READ_SCREENS) expect(findUnenforcedDenial(read(screen)), screen).toEqual([]);
  });

  it('누락된 handler 가드·잘못된 permission·공개 완화는 red다', () => {
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
    }`)).not.toEqual([]);
    expect(findUnenforcedDenial(`const restricted = !isAdmin && tab === 'WIKI';
      export function Screen() { return <div>{restricted ? (<p>열람 권한이 없습니다</p>) : (<Stream />)}</div>; }
    `)).not.toEqual([]);
    expect(findUnenforcedDenial(`export function Screen() {
      return <div>{!canPermission(user, 'BOARD_READ') ? (<p>접근 권한 없음</p>) : (<Stream />)}</div>;
    }`)).toEqual([]);
    expect(findUnenforcedDenial(`export function Screen() {
      return <div>{!isAdmin ? null : (<button>게시판 관리</button>)}</div>;
    }`)).toEqual([]);
  });
});
