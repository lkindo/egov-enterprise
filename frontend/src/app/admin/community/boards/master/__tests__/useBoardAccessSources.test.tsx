import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  permissions: [] as string[],
  getMenuStructure: vi.fn(),
  getGrantMatrix: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin', permissions: mocks.permissions, authorizationVersion: 'v1' }, loading: false }),
}));
vi.mock('@/services/foundation/system/MenuAdminService', () => ({ menuAdminService: { getMenuStructure: mocks.getMenuStructure } }));
vi.mock('@/services/foundation/system/AuthorizationAdminService', () => ({
  authorizationAdminService: { getGrantMatrix: mocks.getGrantMatrix },
}));

import { useBoardAccessSources } from '../useBoardAccessSources';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/**
 * 메뉴 연결 판정의 원천(ADR-0040 결정 8). 권한이 없으면 조회를 보내지 않는다 — 보내면 서버에 403 거부 기록이 남는다.
 */
describe('useBoardAccessSources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMenuStructure.mockResolvedValue({ version: 'v1', menus: [] });
    mocks.getGrantMatrix.mockResolvedValue({ catalogVersion: 'c', groups: [] });
  });

  it('메뉴 조회·그룹 조회 권한이 없으면 두 조회를 보내지 않고 확인 권한 없음이다', async () => {
    mocks.permissions = ['BBS_MST_READ'];
    const { result } = renderHook(() => useBoardAccessSources(), { wrapper });
    expect(result.current.menuSource).toEqual({ status: 'no-permission' });
    expect(result.current.groupSource).toEqual({ status: 'no-permission' });
    expect(mocks.getMenuStructure).not.toHaveBeenCalled();
    expect(mocks.getGrantMatrix).not.toHaveBeenCalled();
  });

  it('권한이 있으면 두 원천을 읽는다', async () => {
    mocks.permissions = ['BBS_MST_READ', 'MENU_READ', 'AUTHRT_READ'];
    const { result } = renderHook(() => useBoardAccessSources(), { wrapper });
    await waitFor(() => expect(result.current.menuSource).toEqual({ status: 'ready', menus: [] }));
    await waitFor(() => expect(result.current.groupSource).toEqual({ status: 'ready', groups: [] }));
  });

  it('서버가 403 으로 거부하면 확인 권한 없음, 그 밖의 실패는 확인 불가다', async () => {
    mocks.permissions = ['MENU_READ', 'AUTHRT_READ'];
    mocks.getMenuStructure.mockRejectedValue({ isAxiosError: true, response: { status: 403, data: {} } });
    mocks.getGrantMatrix.mockRejectedValue({ isAxiosError: true, response: { status: 500, data: {} } });
    const { result } = renderHook(() => useBoardAccessSources(), { wrapper });
    await waitFor(() => expect(result.current.menuSource).toEqual({ status: 'no-permission' }));
    await waitFor(() => expect(result.current.groupSource).toEqual({ status: 'failed' }));
  });
});
