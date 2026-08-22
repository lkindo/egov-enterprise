import axios from 'axios';
import type { AxiosResponse } from 'axios';

interface ApiEnvelope<T> {
  data: T;
}

interface PagePayload<T> {
  list?: T[];
  content?: T[];
}

interface CleanupUser { userId: string }
interface CleanupBoard { bbsId: string; bbsTtl?: string; bbsNm?: string }
interface CleanupPoll { pollSn: number; pollNm?: string }
interface CleanupPopup { popupSn: number; popupTtlNm?: string }
interface CleanupBanner { bnrSn: number; bnrNm?: string }
interface CleanupPost { pstSn?: number; id?: string | number; pstTtl?: string; title?: string }
interface CleanupMenu { menuNo: number; menuNm: string }
interface CleanupAddress { adbkSn: number; adbkNm?: string }
interface CleanupManual { onlnMnlSn: number; onlnMnlNm?: string }
interface CleanupRole { roleId: string; roleNm?: string }
interface CleanupGroup { groupId: string; groupNm?: string }
interface CleanupAuthority { authrtCd: string; authrtNm?: string }

function extractPage<T>(response: AxiosResponse<ApiEnvelope<PagePayload<T>>>): T[] {
  return response.data.data?.list ?? response.data.data?.content ?? [];
}

export const CLEANUP_STAGES = ['bootstrap', 'auth', 'users', 'boards', 'cleanup'] as const;
export const CLEANUP_HTTP_METHODS = ['GET', 'POST', 'DELETE', 'INTERNAL'] as const;
export const CLEANUP_PATH_CATEGORIES = [
  'cleanup-orchestration',
  'auth-login',
  'users-me',
  'admin-users-collection',
  'admin-user-item',
  'admin-board-masters-collection',
  'admin-board-master-item',
  'polls-collection',
  'poll-item',
  'popups-collection',
  'popup-item',
  'banners-collection',
  'banner-item',
  'board-posts-collection',
  'board-post-item',
  'menus-collection',
  'menu-item',
  'address-books-collection',
  'address-book-item',
  'manuals-collection',
  'manual-item',
  'roles-collection',
  'role-item',
  'groups-collection',
  'group-item',
  'authorities-collection',
  'authority-item',
] as const;
export const CLEANUP_REASON_CODES = [
  'http-4xx',
  'http-5xx',
  'unexpected-http-status',
  'request-timeout',
  'transport-error',
  'missing-required-identifier',
  'unexpected-error',
] as const;

export type CleanupStage = typeof CLEANUP_STAGES[number];
export type CleanupHttpMethod = typeof CLEANUP_HTTP_METHODS[number];
export type CleanupPathCategory = typeof CLEANUP_PATH_CATEGORIES[number];
export type CleanupReasonCode = typeof CLEANUP_REASON_CODES[number];

export interface CleanupOperationContext {
  stage: CleanupStage;
  method: CleanupHttpMethod;
  pathCategory: CleanupPathCategory;
}

export interface CleanupFailure {
  stage: CleanupStage;
  method: CleanupHttpMethod;
  pathCategory: CleanupPathCategory;
  status: number | null;
  reasonCode: CleanupReasonCode;
}

function boundedHttpStatus(error: unknown): number | null {
  if (!axios.isAxiosError(error)) return null;
  const status = error.response?.status;
  return typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599
    ? status
    : null;
}

function classifyCleanupReason(error: unknown, status: number | null): CleanupReasonCode {
  if (status !== null && status >= 400 && status <= 499) return 'http-4xx';
  if (status !== null && status >= 500) return 'http-5xx';
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return 'request-timeout';
    if (error.response) return 'unexpected-http-status';
    return 'transport-error';
  }
  return 'unexpected-error';
}

function formatCleanupFailure(failure: CleanupFailure): string {
  return [
    `stage=${failure.stage}`,
    `method=${failure.method}`,
    `pathCategory=${failure.pathCategory}`,
    `status=${failure.status ?? 'none'}`,
    `reasonCode=${failure.reasonCode}`,
  ].join(' ');
}

function appendCleanupFailure(failures: CleanupFailure[], failure: CleanupFailure): void {
  failures.push(failure);
  console.warn(`  => cleanup failed: ${formatCleanupFailure(failure)}`);
}

export function recordCleanupFailure(
  failures: CleanupFailure[],
  context: CleanupOperationContext,
  error: unknown,
): void {
  const status = boundedHttpStatus(error);
  appendCleanupFailure(failures, {
    ...context,
    status,
    reasonCode: classifyCleanupReason(error, status),
  });
}

function recordCleanupInvariantFailure(
  failures: CleanupFailure[],
  context: CleanupOperationContext,
  reasonCode: Extract<CleanupReasonCode, 'missing-required-identifier'>,
): void {
  appendCleanupFailure(failures, { ...context, status: null, reasonCode });
}

export function assertCleanupSucceeded(failures: CleanupFailure[]): void {
  if (failures.length === 0) return;
  const summary = failures.map(formatCleanupFailure).join('\n');
  throw new AggregateError(
    failures.map((failure) => new Error(formatCleanupFailure(failure))),
    `[DB Cleanup] ${failures.length} cleanup operation(s) failed:\n${summary}`,
  );
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
const ADMIN_ID = 'webmaster';
const ADMIN_PW = '1';

export async function cleanup() {
  const failures: CleanupFailure[] = [];
  let activeContext: CleanupOperationContext = {
    stage: 'bootstrap',
    method: 'INTERNAL',
    pathCategory: 'cleanup-orchestration',
  };
  console.log('\n>>> [DB Cleanup] Starting cleanup of E2E test data...');
  
  try {
    // 1. Authenticate to get token and CSRF
    console.log('>>> Authenticating as admin...');
    activeContext = { stage: 'auth', method: 'POST', pathCategory: 'auth-login' };
    const loginRes = await axios.post<ApiEnvelope<{ accessToken: string }>>(
      `${API_BASE}/auth/login`,
      { userId: ADMIN_ID, password: ADMIN_PW },
    );
    const token = loginRes.data.data.accessToken;
    
    // Fetch endpoint to trigger CSRF token generation
    activeContext = { stage: 'bootstrap', method: 'GET', pathCategory: 'users-me' };
    const meRes = await axios.get(`${API_BASE}/users/me`, { 
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    // Extract XSRF-TOKEN from set-cookie header (from /users/me response instead of login, since login is CSRF bypassed)
    const rawCookies = meRes.headers['set-cookie'] || loginRes.headers['set-cookie'] || [];
    let xsrfToken = '';
    const cookieList = [];

    for (const cookie of rawCookies) {
      const parts = cookie.split(';')[0];
      cookieList.push(parts);
      if (parts.startsWith('XSRF-TOKEN=')) {
        xsrfToken = parts.split('=')[1];
      }
    }

    const headers: Record<string, string> = { 
        'Authorization': `Bearer ${token}`,
        'Cookie': cookieList.join('; '),
        'X-Requested-With': 'XMLHttpRequest'
    };
    
    if (xsrfToken) {
        headers['X-XSRF-TOKEN'] = xsrfToken;
        console.log('>>> CSRF protection header prepared.');
    } else {
        console.log('>>> WARNING: XSRF-TOKEN not found in GET response cookies.');
    }

    console.log('>>> Authentication successful.');

    // 2. Cleanup Users (Prefix: user_)
    console.log('>>> Cleaning up test users...');
    activeContext = { stage: 'users', method: 'GET', pathCategory: 'admin-users-collection' };
    const usersRes = await axios.get<ApiEnvelope<PagePayload<CleanupUser>>>(`${API_BASE}/admin/system/users`, {
      headers,
      params: { searchCondition: '0', searchKeyword: 'user_', page: 0, size: 100 } 
    });
    
    const users = extractPage(usersRes);
    const testUsers = users.filter((u) =>
      u.userId.startsWith('user_') || 
      u.userId.startsWith('e2e_')
    );
    
    for (const user of testUsers) {
      process.stdout.write('  - Deleting test user... ');
      activeContext = { stage: 'users', method: 'DELETE', pathCategory: 'admin-user-item' };
      await axios.delete(`${API_BASE}/admin/system/users/${user.userId}`, { headers });
      console.log('DONE');
    }

    // 3. Cleanup Boards (Prefix: E2E Test Board)
    console.log('>>> Cleaning up test boards...');
    activeContext = { stage: 'boards', method: 'GET', pathCategory: 'admin-board-masters-collection' };
    const boardsRes = await axios.get<ApiEnvelope<PagePayload<CleanupBoard>>>(`${API_BASE}/admin/system/board-masters`, {
      headers,
      params: { searchWrd: 'E2E Test Board', size: 100 } 
    });
    
    const boards = extractPage(boardsRes);
    const testBoards = boards.filter((b) =>
      (b.bbsTtl || b.bbsNm || "").startsWith('E2E Test Board') || 
      (b.bbsTtl || b.bbsNm || "").startsWith('E2E_Wizard_') ||
      (b.bbsTtl || b.bbsNm || "").startsWith('E2E ')
    );
    
    for (const board of testBoards) {
      process.stdout.write('  - Deleting test board... ');
      activeContext = { stage: 'boards', method: 'DELETE', pathCategory: 'admin-board-master-item' };
      await axios.delete(`${API_BASE}/admin/system/board-masters/${board.bbsId}`, { 
        headers,
        params: { userId: ADMIN_ID }
      });
      console.log('DONE');
    }

    // 4. Cleanup Polls (Prefix: E2E Poll, E2E Duplicate Test)
    console.log('>>> Cleaning up test polls (surveys)...');
    try {
      activeContext = { stage: 'cleanup', method: 'GET', pathCategory: 'polls-collection' };
      const pollsRes = await axios.get<ApiEnvelope<PagePayload<CleanupPoll>>>(`${API_BASE}/polls`, {
        headers,
        params: { keyword: 'E2E', size: 100 } 
      });
      const polls = extractPage(pollsRes);
      const testPolls = polls.filter((p) =>
        p.pollNm?.startsWith('E2E Poll') || 
        p.pollNm?.startsWith('E2E Duplicate Test') ||
        p.pollNm?.startsWith('Debug')
      );
      for (const poll of testPolls) {
        process.stdout.write('  - Deleting test poll... ');
        activeContext = { stage: 'cleanup', method: 'DELETE', pathCategory: 'poll-item' };
        await axios.delete(`${API_BASE}/polls/${poll.pollSn}`, { headers });
        console.log('DONE');
      }
      console.log(`  => ${testPolls.length} poll(s) cleaned.`);
    } catch (error: unknown) {
      recordCleanupFailure(failures, activeContext, error);
    }
    
    // 5. Cleanup Popups (Prefix: E2E Popup)
    console.log('>>> Cleaning up test popups...');
    try {
      activeContext = { stage: 'cleanup', method: 'GET', pathCategory: 'popups-collection' };
      const popupsRes = await axios.get<ApiEnvelope<PagePayload<CleanupPopup>>>(`${API_BASE}/admin/system/popups`, {
        headers,
        params: { searchWrd: 'E2E', size: 100 } 
      });
      const popups = extractPage(popupsRes);
      const testPopups = popups.filter((p) => p.popupTtlNm?.startsWith('E2E Popup') || p.popupTtlNm?.startsWith('Debug'));
      for (const popup of testPopups) {
        process.stdout.write('  - Deleting test popup... ');
        activeContext = { stage: 'cleanup', method: 'DELETE', pathCategory: 'popup-item' };
        await axios.delete(`${API_BASE}/admin/system/popups/${popup.popupSn}`, { headers });
        console.log('DONE');
      }
      console.log(`  => ${testPopups.length} popup(s) cleaned.`);
    } catch (error: unknown) {
      recordCleanupFailure(failures, activeContext, error);
    }

    // 6. Cleanup Banners (Prefix: E2E Banner)
    console.log('>>> Cleaning up test banners...');
    try {
      activeContext = { stage: 'cleanup', method: 'GET', pathCategory: 'banners-collection' };
      const bannersRes = await axios.get<ApiEnvelope<PagePayload<CleanupBanner>>>(`${API_BASE}/admin/system/banners`, {
        headers,
        params: { keyword: 'E2E', size: 100 } 
      });
      const banners = extractPage(bannersRes);
      // [2026-07-27 정정] 필드명이 틀려 **한 건도 지워지지 않고 있었다**. BannerDto 의 실제 필드는
      //   `bnrNm`·`bnrSn` 인데 `bannerNm`·`bannerId` 로 필터해 testBanners 가 항상 빈 배열이었고,
      //   그래서 로그는 늘 "0 banner(s) cleaned" 를 찍으며 **청소된 것처럼 보였다**(false-green).
      //   그 결과 E2E 배너가 무한 누적됐고, 메인 배너는 한 번에 1개만 보여주는 캐러셀이라
      //   새로 만든 배너가 뒤로 밀려 05 Portal Promotion Flow 가 결정적으로 실패하게 됐다.
      const testBanners = banners.filter((b) => b.bnrNm?.startsWith('E2E Banner') || b.bnrNm?.startsWith('Debug'));
      for (const banner of testBanners) {
        process.stdout.write('  - Deleting test banner... ');
        activeContext = { stage: 'cleanup', method: 'DELETE', pathCategory: 'banner-item' };
        await axios.delete(`${API_BASE}/admin/system/banners/${banner.bnrSn}`, { headers });
        console.log('DONE');
      }
      console.log(`  => ${testBanners.length} banner(s) cleaned.`);
    } catch (error: unknown) {
      recordCleanupFailure(failures, activeContext, error);
    }

    // 7. Cleanup Board Posts (Prefix: E2E Security FAQ, E2E ...)
    console.log('>>> Cleaning up E2E board posts...');
    const targetBbsIds = ['BBSMSTR_AAAAAAAAAAAA', 'BBSMSTR_DDDDDDDDDDDD', 'BBSMSTR_EEEEEEEEEEEE'];
    for (const bbsId of targetBbsIds) {
      try {
        activeContext = { stage: 'cleanup', method: 'GET', pathCategory: 'board-posts-collection' };
        const postsRes = await axios.get<ApiEnvelope<PagePayload<CleanupPost>>>(`${API_BASE}/boards/${bbsId}`, {
          headers,
          params: { searchCnd: '0', searchWrd: 'E2E', size: 100 }
        });
        const posts = extractPage(postsRes);
        const testPosts = posts.filter((p) =>
          p.pstTtl?.startsWith('E2E') || p.title?.startsWith('E2E')
        );
        for (const post of testPosts) {
          const postId = post.pstSn || post.id;
          if (postId === undefined) {
            recordCleanupInvariantFailure(
              failures,
              { stage: 'cleanup', method: 'DELETE', pathCategory: 'board-post-item' },
              'missing-required-identifier',
            );
            continue;
          }
          process.stdout.write('  - Deleting test board post... ');
          activeContext = { stage: 'cleanup', method: 'DELETE', pathCategory: 'board-post-item' };
          await axios.delete(`${API_BASE}/boards/${bbsId}/posts/${postId}`, { headers });
          console.log('DONE');
        }
        if (testPosts.length > 0) console.log(`  => ${testPosts.length} post(s) cleaned from configured board.`);
      } catch (error: unknown) {
        recordCleanupFailure(failures, activeContext, error);
      }
    }

    // 8. Cleanup Menus (Prefix: Root_ or Menu E2E)
    console.log('>>> Cleaning up test menus...');
    try {
      activeContext = { stage: 'cleanup', method: 'GET', pathCategory: 'menus-collection' };
      const menusRes = await axios.get<ApiEnvelope<CleanupMenu[]>>(`${API_BASE}/admin/system/menus/all`, { headers });
      const menus = menusRes.data.data || [];
      const testMenus = menus.filter((m) =>
        m.menuNm.startsWith('Root_') || 
        m.menuNm.startsWith('Menu E2E') ||
        m.menuNm.startsWith('Menu_E2E')
      );
      
      testMenus.sort((a, b) => b.menuNo - a.menuNo);

      for (const menu of testMenus) {
        process.stdout.write('  - Deleting test menu... ');
        activeContext = { stage: 'cleanup', method: 'DELETE', pathCategory: 'menu-item' };
        await axios.delete(`${API_BASE}/admin/system/menus/${menu.menuNo}`, { headers });
        console.log('DONE');
      }
    } catch (error: unknown) {
      recordCleanupFailure(failures, activeContext, error);
    }

    // 9. Cleanup Address Books (Prefix: Identity_)
    console.log('>>> Cleaning up test address books...');
    try {
      activeContext = { stage: 'cleanup', method: 'GET', pathCategory: 'address-books-collection' };
      const addressRes = await axios.get<ApiEnvelope<PagePayload<CleanupAddress>>>(`${API_BASE}/address-books`, {
        headers,
        params: { searchWrd: 'Identity_', size: 100 } 
      });
      const addresses = extractPage(addressRes);
      const testAddresses = addresses.filter((a) => a.adbkNm?.startsWith('Identity_'));
      for (const address of testAddresses) {
        process.stdout.write('  - Deleting test address book entry... ');
        activeContext = { stage: 'cleanup', method: 'DELETE', pathCategory: 'address-book-item' };
        await axios.delete(`${API_BASE}/address-books/${address.adbkSn}`, { headers });
        console.log('DONE');
      }
      console.log(`  => ${testAddresses.length} address book entry(ies) cleaned.`);
    } catch (error: unknown) {
      recordCleanupFailure(failures, activeContext, error);
    }

    // 10. Cleanup Online Manuals (Prefix: E2E Manual)
    console.log('>>> Cleaning up test online manuals...');
    try {
      activeContext = { stage: 'cleanup', method: 'GET', pathCategory: 'manuals-collection' };
      const manualRes = await axios.get<ApiEnvelope<PagePayload<CleanupManual>>>(`${API_BASE}/help/manuals`, {
        headers,
        params: { keyword: 'E2E Manual', size: 100 } 
      });
      const manuals = extractPage(manualRes);
      const testManuals = manuals.filter((m) => m.onlnMnlNm?.startsWith('E2E Manual'));
      for (const manual of testManuals) {
        process.stdout.write('  - Deleting test manual... ');
        activeContext = { stage: 'cleanup', method: 'DELETE', pathCategory: 'manual-item' };
        await axios.delete(`${API_BASE}/help/manuals/${manual.onlnMnlSn}`, { headers });
        console.log('DONE');
      }
      console.log(`  => ${testManuals.length} manual(s) cleaned.`);
    } catch (error: unknown) {
      recordCleanupFailure(failures, activeContext, error);
    }

    // 11. Cleanup Security Artifacts (Authorities: ROLE_E2E_, Groups: GROUP_E2E_, Roles: URL_E2E_)
    // 02-admin-system.spec.ts 가 생성하는 권한/그룹/롤이 정리 대상에 없어 라이브 DB 에
    // 가비지가 축적됐음(2026-07-17 실측 411+155행 수동 정리). 재축적 방지.
    console.log('>>> Cleaning up test security artifacts (roles/groups/authorities)...');
    try {
      activeContext = { stage: 'cleanup', method: 'GET', pathCategory: 'roles-collection' };
      const rolesRes = await axios.get<ApiEnvelope<PagePayload<CleanupRole>>>(`${API_BASE}/admin/system/roles`, {
        headers,
        params: { size: 100 }
      });
      const roles = extractPage(rolesRes);
      const testRoles = roles.filter((r) =>
        r.roleId?.startsWith('URL_E2E_') || r.roleNm?.startsWith('E2E Role')
      );
      for (const role of testRoles) {
        process.stdout.write('  - Deleting test role... ');
        activeContext = { stage: 'cleanup', method: 'DELETE', pathCategory: 'role-item' };
        await axios.delete(`${API_BASE}/admin/system/roles/${role.roleId}`, { headers });
        console.log('DONE');
      }
      console.log(`  => ${testRoles.length} role(s) cleaned.`);
    } catch (error: unknown) {
      recordCleanupFailure(failures, activeContext, error);
    }
    try {
      activeContext = { stage: 'cleanup', method: 'GET', pathCategory: 'groups-collection' };
      const groupsRes = await axios.get<ApiEnvelope<PagePayload<CleanupGroup>>>(`${API_BASE}/admin/system/groups`, {
        headers,
        params: { searchKeyword: 'E2E' }
      });
      const groups = extractPage(groupsRes);
      const testGroups = groups.filter((g) =>
        g.groupId?.startsWith('GROUP_E2E_') || g.groupNm?.startsWith('E2E Group')
      );
      for (const group of testGroups) {
        process.stdout.write('  - Deleting test group... ');
        activeContext = { stage: 'cleanup', method: 'DELETE', pathCategory: 'group-item' };
        await axios.delete(`${API_BASE}/admin/system/groups/${group.groupId}`, { headers });
        console.log('DONE');
      }
      console.log(`  => ${testGroups.length} group(s) cleaned.`);
    } catch (error: unknown) {
      recordCleanupFailure(failures, activeContext, error);
    }
    try {
      activeContext = { stage: 'cleanup', method: 'GET', pathCategory: 'authorities-collection' };
      const authRes = await axios.get<ApiEnvelope<PagePayload<CleanupAuthority>>>(`${API_BASE}/admin/system/authorities`, {
        headers,
        params: { size: 100 }
      });
      const authorities = extractPage(authRes);
      const testAuths = authorities.filter((a) => a.authrtCd?.startsWith('ROLE_E2E_'));
      for (const auth of testAuths) {
        process.stdout.write('  - Deleting test authority... ');
        activeContext = { stage: 'cleanup', method: 'DELETE', pathCategory: 'authority-item' };
        await axios.delete(`${API_BASE}/admin/system/authorities/${auth.authrtCd}`, { headers });
        console.log('DONE');
      }
      console.log(`  => ${testAuths.length} authority(ies) cleaned.`);
    } catch (error: unknown) {
      recordCleanupFailure(failures, activeContext, error);
    }
  } catch (error: unknown) {
    recordCleanupFailure(failures, activeContext, error);
  }

  if (failures.length === 0) {
    console.log('>>> [DB Cleanup] All test data removed successfully!\n');
  } else {
    console.error(`>>> [DB Cleanup] Completed with ${failures.length} failure(s).`);
  }
  assertCleanupSucceeded(failures);
}

export default async function globalTeardown() {
  await cleanup();
}

// Allow running directly
// Playwright 는 이 TypeScript 파일을 CommonJS 로 변환해 globalTeardown 으로 읽는다.
// package.json 이 CommonJS 인 상태에서 import.meta 를 쓰면 Node 22/24 모두 파싱 단계에서
// 죽는다. CommonJS 의 표준 직접 실행 판정은 Playwright import(false)와 tsx 직접 실행(true)을
// 모두 구분하면서 파일 경로/운영체제에도 의존하지 않는다.
if (require.main === module) {
  void cleanup().catch(() => {
    console.error('[DB Cleanup] Direct execution failed after bounded diagnostics.');
    process.exitCode = 1;
  });
}
