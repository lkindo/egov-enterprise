/**
 * 권한 → 롤 할당.
 *
 * ── 무엇이 없었나 ──────────────────────────────────────────────────────────────
 * 롤을 만들어도 **어떤 권한에도 연결할 수 없었다.** 서버는
 * `GET/POST /api/v1/admin/system/authorities/{authrtCd}/roles` 를 갖췄고 계약 생성물까지
 * 발행돼 있었는데(`AuthorRoleProjection`), 프런트 소비자가 전수 grep 0건이었다.
 *
 * ── 이 계약의 핵심: 전체 교체 ──────────────────────────────────────────────────
 * `AuthorRoleManageService.insertAuthorRole` 은 **기존 매핑을 전량 삭제한 뒤 재삽입**한다.
 * 즉 화면이 부분 목록을 보내면 나머지 롤이 **조용히 사라진다**. 페이지를 나눠 받은 뒤
 * 저장하면 보지 못한 페이지의 할당이 전부 지워진다 — 저장은 성공하고 화면도 정상으로
 * 보이므로 아무도 눈치채지 못한다.
 *
 * 그래서 이 파일의 중심은 "저장 버튼이 동작하는가" 가 아니라 **"보낸 것이 전체 집합인가"** 다.
 *
 * ── 초기 선택 축 ────────────────────────────────────────────────────────────
 * 서버는 전체 롤 목록에 left join 으로 할당 표시를 붙여 내려준다
 * (`AuthorityRoleRepositoryImpl`: regYn = 매칭된 authrtCd 가 있으면 'Y'). 즉 목록에는
 * **할당되지 않은 롤도 들어 있다.** 초기 선택을 목록 전체로 잡으면 사용자가 아무것도 건드리지
 * 않고 저장만 눌러도 모든 롤이 그 권한에 부여된다 — 저장은 성공하고 화면도 정상으로 보인다.
 */

import { Suspense, type ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getAuthorList: vi.fn(),
  getAuthorRoles: vi.fn(),
  saveAuthorRoles: vi.fn(),
  getAuthorMenus: vi.fn(),
  getAllMenus: vi.fn(),
  getUsers: vi.fn(),
  confirm: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/security/authority',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/lib/hooks/use-debounced-value', () => ({ useDebouncedValue: (v: string) => v }));
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: () => null,
  TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/ui/hub/HubSectionCard', () => ({
  HubSectionCard: ({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) => (
    <section aria-label={title}>{action}{children}</section>
  ),
}));
/*
  허브는 표를 StandardDataTable 로 그린다. 이 계약이 보려는 것은 표 렌더가 아니라 롤 할당
  경로이므로, 행 선택만 되는 최소 mock 으로 바꾼다.
*/
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ data, onRowClick }: {
    data: Array<Record<string, unknown>>;
    onRowClick?: (item: Record<string, unknown>) => void;
  }) => (
    <div>
      {data.map((item, index) => (
        <button key={index} type="button" onClick={() => onRowClick?.(item)}>
          {String(item.authrtNm ?? item.roleNm ?? index)}
        </button>
      ))}
    </div>
  ),
}));
vi.mock('@/services/foundation/system/MenuAdminService', () => ({
  menuAdminService: { getAllMenus: (...a: unknown[]) => mocks.getAllMenus(...a), saveMenuCreation: vi.fn() },
}));
vi.mock('@/services/foundation/system/UserAuthorityAdminService', () => ({
  userAuthorityAdminService: {
    getUsersByAuthority: (...a: unknown[]) => mocks.getUsers(...a),
    saveUserAuthorities: vi.fn(),
  },
}));
vi.mock('@/services/foundation/system/AuthorAdminService', () => ({
  authorAdminService: {
    getAuthorList: (...a: unknown[]) => mocks.getAuthorList(...a),
    getAuthorRoles: (...a: unknown[]) => mocks.getAuthorRoles(...a),
    saveAuthorRoles: (...a: unknown[]) => mocks.saveAuthorRoles(...a),
    getAuthorMenus: (...a: unknown[]) => mocks.getAuthorMenus(...a),
  },
}));

import SecurityHubClient from '../SecurityHubClient';

/**
 * 롤 6개 중 3개가 이 권한에 할당돼 있다.
 * 서버는 미할당 행도 함께 내려주며 그 행의 `authrtCd` 는 null 이다(left join 미매칭).
 */
const ROLES = [
  { roleId: 'ROLE_A', roleNm: '롤 A', regYn: 'Y', authrtCd: 'AUTH_1' },
  { roleId: 'ROLE_B', roleNm: '롤 B', regYn: 'Y', authrtCd: 'AUTH_1' },
  { roleId: 'ROLE_C', roleNm: '롤 C', regYn: 'Y', authrtCd: 'AUTH_1' },
  { roleId: 'ROLE_D', roleNm: '롤 D', regYn: 'N', authrtCd: null },
  { roleId: 'ROLE_E', roleNm: '롤 E', regYn: 'N', authrtCd: null },
  { roleId: 'ROLE_F', roleNm: '롤 F', regYn: 'N', authrtCd: null },
];

const AUTHORITIES = { list: [{ authrtCd: 'AUTH_1', authrtNm: '관리자 권한' }], total: 1, page: 1, size: 10, totalPage: 1 };

/*
  렌더마다 새 promise 를 만들면 use() 가 영원히 suspend 한다 — 한 번만 만들어 재사용한다.
*/
const AUTHORITIES_PROMISE = Promise.resolve(AUTHORITIES);

function renderHub() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      {/* use(promise) 는 suspend 한다 — 경계가 없으면 아무것도 렌더되지 않는다. */}
      <Suspense fallback={<div>loading</div>}>
        <SecurityHubClient authoritiesPromise={AUTHORITIES_PROMISE as never} />
      </Suspense>
    </QueryClientProvider>,
  );
}

/** 권한 하나를 고른 뒤 롤 할당 카드를 돌려준다. */
async function openRolePanel() {
  renderHub();
  // use(promise) 의 첫 해소를 흘려 보낸다 — 없으면 첫 테스트가 fallback 에서 멈춘다.
  await act(async () => { await AUTHORITIES_PROMISE; });
  fireEvent.click(await screen.findByText('관리자 권한'));
  return screen.findByRole('region', { name: '롤 할당' });
}

describe('권한 → 롤 할당', () => {
  /*
    React 는 use() 가 처음 본 promise 를 suspend 로 처리하고, 해소된 뒤에는 그 promise 에
    결과를 캐시해 동기 반환한다. jsdom 에서는 첫 suspend 의 retry 가 흘러가지 않아 fallback 에
    머무르므로, 첫 테스트 전에 한 번 태워 캐시를 채운다.
  */
  beforeAll(async () => {
    mocks.getAuthorList.mockResolvedValue({ list: [], total: 0, totalPage: 1 });
    mocks.getAuthorMenus.mockResolvedValue([]);
    mocks.getAllMenus.mockResolvedValue([]);
    mocks.getUsers.mockResolvedValue({ list: [], total: 0, totalPage: 1 });
    const view = renderHub();
    await act(async () => { await AUTHORITIES_PROMISE; });
    view.unmount();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthorList.mockResolvedValue({
      list: [{ authrtCd: 'AUTH_1', authrtNm: '관리자 권한' }], total: 1, totalPage: 1,
    });
    mocks.getAuthorRoles.mockResolvedValue({ list: ROLES, total: ROLES.length, totalPage: 1 });
    mocks.saveAuthorRoles.mockResolvedValue(undefined);
    mocks.getAuthorMenus.mockResolvedValue([]);
    mocks.getAllMenus.mockResolvedValue([]);
    mocks.getUsers.mockResolvedValue({ list: [], total: 0, totalPage: 1 });
    mocks.confirm.mockResolvedValue(true);
  });

  it('서버가 표시한 할당분만 초기 선택이 된다 — 목록 전체를 선택하면 전 롤이 부여된다', async () => {
    await openRolePanel();

    expect(await screen.findByRole('button', { name: '롤 A 롤 해제' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '롤 D 롤 부여' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('롤 목록을 한 페이지에 전부 받는다 — 나눠 받으면 저장 시 나머지가 지워진다', async () => {
    await openRolePanel();

    await waitFor(() => expect(mocks.getAuthorRoles).toHaveBeenCalled());
    const params = mocks.getAuthorRoles.mock.calls[0][1];
    expect(params.pageIndex).toBe(1);
    expect(params.pageUnit).toBeGreaterThanOrEqual(ROLES.length * 10);
  });

  /**
   * **이 파일의 핵심.** 저장이 전체 교체이므로, 하나를 토글해도 POST 본문은 항상
   * "지금 선택된 전체 집합" 이어야 한다. 변경분(delta)만 보내면 나머지가 전부 사라진다.
   */
  it('저장은 변경분이 아니라 선택된 전체 집합을 보낸다', async () => {
    await openRolePanel();
    await screen.findByRole('button', { name: '롤 A 롤 해제' });

    // 하나를 새로 켜고, 하나를 끈다.
    fireEvent.click(screen.getByRole('button', { name: '롤 D 롤 부여' }));
    fireEvent.click(screen.getByRole('button', { name: '롤 A 롤 해제' }));

    fireEvent.click(screen.getByRole("button", { name: /롤 할당 저장/ }));

    await waitFor(() => expect(mocks.saveAuthorRoles).toHaveBeenCalledTimes(1));
    const [authrtCd, sent] = mocks.saveAuthorRoles.mock.calls[0];
    expect(authrtCd).toBe('AUTH_1');
    // 기존 B·C 가 그대로 실려야 한다 — 빠지면 서버가 그것들을 지운다.
    expect([...sent].sort()).toEqual(['ROLE_B', 'ROLE_C', 'ROLE_D']);
  });

  it('저장 전에 선택하지 않은 롤이 제거된다는 사실을 말한다', async () => {
    await openRolePanel();
    await screen.findByRole('button', { name: '롤 A 롤 해제' });

    fireEvent.click(screen.getByRole('button', { name: /롤 할당 저장/ }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    const message = String(mocks.confirm.mock.calls[0][0].message);
    expect(message).toContain('제거됩니다');
  });

  it('확인을 취소하면 저장하지 않는다', async () => {
    mocks.confirm.mockResolvedValue(false);
    await openRolePanel();
    await screen.findByRole('button', { name: '롤 A 롤 해제' });

    fireEvent.click(screen.getByRole('button', { name: /롤 할당 저장/ }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.saveAuthorRoles).not.toHaveBeenCalled();
  });

  it('저장에 실패하면 침묵하지 않고 서버 상태를 다시 읽는다', async () => {
    mocks.saveAuthorRoles.mockRejectedValueOnce(new Error('boom'));
    await openRolePanel();
    await screen.findByRole('button', { name: '롤 A 롤 해제' });

    fireEvent.click(screen.getByRole('button', { name: /롤 할당 저장/ }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(
      '롤 할당 저장에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error'));
  });
});
