import type { PropsWithChildren } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MemoReportManagementClient from '../MemoReportManagementClient';

/**
 * 메모 보고가 주소를 다시 만들 때 싣는 값(2026-11-08 URL 상태 소급 확인).
 *
 * 화면은 주소의 tab·page 를 해석해 쓴다 — 모르는 tab 이나 일반 사용자의 ALL 은 '받은 보고', 형식이 아닌 page 는 1.
 * 종전에는 페이지만 바꾸면 주소의 원래 tab 을 그대로 옮겨, 화면과 다른 값이 주소에 남았다. 바꾸지 않는 키도 화면이 쓰는 값으로 싣는다.
 */
const mocks = vi.hoisted(() => ({
  query: '',
  replace: vi.fn(),
  permissions: ['MEMO_RPT_READ'] as string[],
  getReceivedReports: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
  usePathname: () => '/admin/operation/memo-reports',
  useSearchParams: () => new URLSearchParams(mocks.query),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'ROLE_USER', esntlId: 'USR_B', permissions: mocks.permissions, authorizationVersion: 'v1' } }),
}));
vi.mock('@/services/business/memoreport/memoReportService', () => ({
  memoReportService: {
    getReceivedReports: mocks.getReceivedReports,
    getMyReports: mocks.getReceivedReports,
    getMemoReports: mocks.getReceivedReports,
    getMemoReport: vi.fn(),
  },
}));
vi.mock('@/services/foundation/file/FileService', () => ({ fileService: { downloadFile: vi.fn() } }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => vi.fn() }));
vi.mock('@/app/components/ui/user-picker', () => ({ UserPicker: () => null }));
vi.mock('@/app/components/ui/standard-modal', () => ({ StandardModal: () => null }));
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ children }: PropsWithChildren) => <main>{children}</main>,
}));
vi.mock('@/app/components/patterns/keyword-filter', () => ({ KeywordFilter: () => null }));
// 이 시험은 페이지 이동이 주소에 싣는 값만 본다 — 표는 페이지 이동 단추 하나로 줄인다.
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ pagination }: { pagination?: { onPageChange: (page: number) => void } }) => (
    <button type="button" onClick={() => pagination?.onPageChange(3)}>3쪽으로</button>
  ),
}));

function renderList(query: string, permissions: string[] = ['MEMO_RPT_READ']) {
  mocks.query = query;
  mocks.permissions = permissions;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoReportManagementClient />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: '3쪽으로' }));
  // 키 순서는 의미가 없다(원래 주소의 순서를 따른다) — 경로와 정렬한 키·값으로 비교한다.
  const target = new URL(String(mocks.replace.mock.calls.at(-1)?.[0]), 'http://localhost');
  return `${target.pathname}?${[...target.searchParams].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('&')}`;
}

describe('메모 보고 — 페이지를 바꿀 때 주소에 싣는 값', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mocks.getReceivedReports.mockReturnValue(new Promise(() => undefined));
  });

  it('모르는 tab 은 옮기지 않는다 — 화면이 연 받은 보고(기본값)라 tab 을 지운다', () => {
    expect(renderList('tab=arbitrary&page=2')).toBe('/admin/operation/memo-reports?page=3');
  });

  it('일반 사용자의 ALL 은 옮기지 않는다 — 권한이 없어 받은 보고를 연다', () => {
    expect(renderList('tab=ALL')).toBe('/admin/operation/memo-reports?page=3');
  });

  it('권한이 있으면 ALL 을 그대로 싣는다', () => {
    expect(renderList('tab=ALL', ['MEMO_RPT_READ', 'MEMO_RPT_READ_ALL'])).toBe('/admin/operation/memo-reports?page=3&tab=ALL');
  });

  it('정상 tab 은 유지하고, 형식이 아닌 page 는 다시 싣지 않는다', () => {
    expect(renderList('tab=MY&page=2.5')).toBe('/admin/operation/memo-reports?page=3&tab=MY');
  });
});
