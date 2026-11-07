import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 로그 화면 넷(웹·로그인·개인정보·시스템)이 셸 툴바에 넘기는 총 건수.
 *
 * [2026-11-07 화면 용어 원장 검토·독립 검토] 사용자 로그와 같은 식(`Number(data?.total || 0)`, 오류일 때만 비움)이라 조회가 끝나기
 * 전에는 '총 0건' 을 보이고 aria-live 로 읽어 줬다. 받은 값이 없으면(조회 중·오프라인 일시 정지) 비운다. 사용자 로그는
 * user/__tests__/SystemLogsUserClient.total-count.test.tsx 가 본다.
 */
const mocks = vi.hoisted(() => ({
  getWebLogs: vi.fn(),
  getLoginLogs: vi.fn(),
  getPrivacyLogs: vi.fn(),
  getSystemLogs: vi.fn(),
}));

vi.mock('@/services/foundation/system/SystemLogAdminService', () => ({ systemLogAdminService: mocks }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/system/logs',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ totalCount, children }: React.PropsWithChildren<{ totalCount?: number }>) => (
    <main>
      <output data-testid="shell-total-count">{totalCount === undefined ? '없음' : String(totalCount)}</output>
      {children}
    </main>
  ),
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({ StandardDataTable: () => <div /> }));

const SCREENS = [
  { name: '웹 로그', method: 'getWebLogs', load: () => import('../web/SystemLogsWebClient') },
  { name: '로그인 로그', method: 'getLoginLogs', load: () => import('../login/SystemLogsLoginClient') },
  { name: '개인정보 로그', method: 'getPrivacyLogs', load: () => import('../privacy/SystemLogsPrivacyClient') },
  { name: '시스템 로그', method: 'getSystemLogs', load: () => import('../system/SystemLogsSystemClient') },
] as const;

async function renderScreen(load: (typeof SCREENS)[number]['load']) {
  const { default: Client } = await load();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Client />
    </QueryClientProvider>,
  );
}

describe.each(SCREENS)('$name — 셸 툴바의 총 건수', ({ method, load }) => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('조회가 끝나기 전에는 총 건수를 내지 않는다 — 0건이라고 말하지 않는다', async () => {
    mocks[method].mockReturnValue(new Promise(() => undefined));
    await renderScreen(load);

    await waitFor(() => expect(mocks[method]).toHaveBeenCalled());
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음');
  });

  it('조회가 끝나면 서버가 센 총 건수를 낸다', async () => {
    mocks[method].mockResolvedValue({ list: [], total: 9, totalPage: 1 });
    await renderScreen(load);

    await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('9'));
  });
});
