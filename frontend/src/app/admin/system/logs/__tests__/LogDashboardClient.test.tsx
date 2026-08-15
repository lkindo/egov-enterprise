import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { Suspense, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { components } from '@/types/generated-api';
import type { PageResponse } from '@/types/foundation/system';

type Category = 'SYS' | 'LGN' | 'USR' | 'WEB';

interface MockColumn {
  header: string;
  accessor: string | ((item: Record<string, unknown>, index?: number) => ReactNode);
}

interface MockTableProps {
  columns: MockColumn[];
  data: Array<Record<string, unknown>>;
  onRowClick?: (item: Record<string, unknown>) => void;
}

interface MockQueryOptions {
  queryFn: () => Promise<unknown>;
}

const dashboardHarness = vi.hoisted(() => ({
  activeCategory: 'SYS' as Category,
  page: 1,
  queryData: undefined as unknown,
  latestQueryOptions: undefined as unknown,
  setCategory: vi.fn(),
  setPage: vi.fn(),
  refetch: vi.fn(),
  getSystemLogs: vi.fn(),
  getLoginLogs: vi.fn(),
  getUserLogs: vi.fn(),
  getWebLogs: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: unknown) => {
    dashboardHarness.latestQueryOptions = options;
    return {
      data: dashboardHarness.queryData,
      error: null,
      isFetching: false,
      isLoading: false,
      refetch: dashboardHarness.refetch,
    };
  },
}));

vi.mock('@/services/foundation/system/SystemLogAdminService', () => ({
  systemLogAdminService: {
    getSystemLogs: dashboardHarness.getSystemLogs,
    getLoginLogs: dashboardHarness.getLoginLogs,
    getUserLogs: dashboardHarness.getUserLogs,
    getWebLogs: dashboardHarness.getWebLogs,
  },
}));

vi.mock('@/app/admin/system/logs/use-log-url-state', () => ({
  usePageParam: () => [dashboardHarness.page, dashboardHarness.setPage],
  useTabParam: () => [dashboardHarness.activeCategory, dashboardHarness.setCategory],
}));

vi.mock('@/app/components/layout/page-header', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock('@/components/ui/hub/HubHeader', () => ({
  HubHeader: ({ title, highlight, actions }: { title: string; highlight?: string; actions?: ReactNode }) => (
    <header>{title} {highlight}{actions}</header>
  ),
}));

vi.mock('@/components/ui/hub/HubSectionCard', () => ({
  HubSectionCard: ({ title, children }: { title: string; children: ReactNode }) => (
    <section><h2>{title}</h2>{children}</section>
  ),
}));

vi.mock('@/app/components/ui/standard-modal', () => ({
  StandardModal: ({ isOpen, title, children }: { isOpen: boolean; title: string; children: ReactNode }) => (
    isOpen ? <section role="dialog" aria-label={title}>{children}</section> : null
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: (rawProps: unknown) => {
    const props = rawProps as MockTableProps;
    return (
      <div data-testid="dashboard-table">
        {props.data.map((item, rowIndex) => (
          <div data-testid="dashboard-row" key={`row-${rowIndex}`}>
            {props.columns.map((column, columnIndex) => (
              <span key={`${column.header}-${columnIndex}`}>
                {typeof column.accessor === 'function'
                  ? column.accessor(item, rowIndex)
                  : item[column.accessor] as ReactNode}
              </span>
            ))}
            <button type="button" onClick={() => props.onRowClick?.(item)}>
              {`open row ${rowIndex}`}
            </button>
          </div>
        ))}
      </div>
    );
  },
}));

import LogDashboardClient from '../LogDashboardClient';

type SysLogDto = components['schemas']['SysLogDto'];
type LoginLogDto = components['schemas']['LoginLogDto'];
type UserLogDto = components['schemas']['UserLogDto'];
type WebLogDto = components['schemas']['WebLogDto'];

function pageOf<T>(row: T): PageResponse<T> {
  return {
    list: [row],
    total: 1,
    page: 1,
    size: 10,
    totalPage: 1,
  };
}

const SYSTEM_ROW = {
  sysLogSn: 101,
  dmndId: 'SYS-001',
  srvcNm: 'AccountService',
  methodNm: 'findAccounts',
  prcsSeCd: 'SUCCESS',
  prcsTm: '12',
  dmndUserId: 'system-admin',
  rqesterIp: '10.0.0.1',
  ocrnYmd: '20260813',
} satisfies SysLogDto;

const LOGIN_ROW = {
  lgnSn: 101,
  loginId: 'alice',
  loginIp: '10.0.0.2',
  loginMthd: 'LOGIN',
  errOccrrAt: 'N',
  creatDt: '2026-08-13T10:11:12',
} satisfies LoginLogDto;

const USER_ROW = {
  ocrnYmd: '20260813',
  dmndUserId: 'user-001',
  userNm: 'Alice Kim',
  srvcNm: 'UserService',
  mthdNm: 'updateUser',
  crtCnt: 1,
  mdfcnCnt: 2,
  inqCnt: 3,
  delCnt: 4,
  otptCnt: 5,
  errCnt: 6,
} satisfies UserLogDto;

const WEB_ROW = {
  webLogSn: 101,
  url: '/api/v1/orders/42',
  dmndUserId: 'web-admin',
  dmndUserIpAddr: '10.0.0.3',
  occrYmd: '20260813101112',
  prcsTm: 37,
} satisfies WebLogDto;

async function renderDashboard() {
  const systemLogsPromise = Promise.resolve({
    ok: true as const,
    data: pageOf(SYSTEM_ROW),
  });

  await act(async () => {
    render(
      <Suspense fallback={<div>loading</div>}>
        <LogDashboardClient systemLogsPromise={systemLogsPromise} />
      </Suspense>,
    );
    await systemLogsPromise;
  });
}

function currentQueryOptions(): MockQueryOptions {
  if (!dashboardHarness.latestQueryOptions) throw new Error('useQuery was not called');
  return dashboardHarness.latestQueryOptions as MockQueryOptions;
}

describe('integrated log dashboard contracts', () => {
  beforeEach(() => {
    dashboardHarness.activeCategory = 'SYS';
    dashboardHarness.page = 1;
    dashboardHarness.queryData = pageOf(SYSTEM_ROW);
    dashboardHarness.latestQueryOptions = undefined;
    vi.clearAllMocks();
  });

  it.each([
    ['SYS', 'getSystemLogs', SYSTEM_ROW],
    ['LGN', 'getLoginLogs', LOGIN_ROW],
    ['USR', 'getUserLogs', USER_ROW],
    ['WEB', 'getWebLogs', WEB_ROW],
  ] as const)('routes %s page 3 to %s with zero-based page 2', async (category, serviceName, row) => {
    dashboardHarness.activeCategory = category;
    dashboardHarness.page = 3;
    dashboardHarness.queryData = pageOf(row);
    dashboardHarness[serviceName].mockResolvedValue(pageOf(row));

    await renderDashboard();
    await currentQueryOptions().queryFn();

    expect(dashboardHarness[serviceName]).toHaveBeenCalledWith(expect.objectContaining({
      page: 2,
      searchKeyword: '',
      searchWrd: '',
      size: 10,
    }));
  });

  it('renders every generated WEB field, including processing time', async () => {
    dashboardHarness.activeCategory = 'WEB';
    dashboardHarness.queryData = pageOf(WEB_ROW);

    await renderDashboard();

    const row = within(screen.getByTestId('dashboard-row'));
    for (const value of ['20260813101112', 'web-admin', '/api/v1/orders/42', '10.0.0.3', '37']) {
      expect(row.getByText(value)).toBeInTheDocument();
    }
  });

  it('uses webLogSn as the WEB detail identifier', async () => {
    dashboardHarness.activeCategory = 'WEB';
    dashboardHarness.queryData = pageOf(WEB_ROW);

    await renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: 'open row 0' }));

    expect(screen.getByRole('dialog', { name: '로그 상세 정보' })).toHaveTextContent('101');
  });

  it('uses the USR composite identifier in the detail inspector', async () => {
    dashboardHarness.activeCategory = 'USR';
    dashboardHarness.queryData = pageOf(USER_ROW);

    await renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: 'open row 0' }));

    expect(screen.getByRole('dialog', { name: '로그 상세 정보' })).toHaveTextContent(
      '20260813/user-001/UserService/updateUser',
    );
  });
});
