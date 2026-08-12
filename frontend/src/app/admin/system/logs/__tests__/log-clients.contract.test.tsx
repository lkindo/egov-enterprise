import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { components } from '@/types/generated-api';
import type { PageResponse } from '@/types/foundation/system';

interface MockColumn {
  header: string;
  accessor: string | ((item: Record<string, unknown>, index?: number) => ReactNode);
}

interface MockTableProps {
  columns: MockColumn[];
  data: Array<Record<string, unknown>>;
  keyField?: string;
}

const clientHarness = vi.hoisted(() => ({
  queryData: undefined as unknown,
  latestTableProps: undefined as unknown,
  setPage: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: clientHarness.queryData,
    error: null,
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/app/admin/system/logs/use-log-url-state', () => ({
  usePageParam: () => [1, clientHarness.setPage],
}));

vi.mock('@/app/components/layout/page-header', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock('@/components/ui/hub/HubHeader', () => ({
  HubHeader: ({ title, highlight }: { title: string; highlight?: string }) => (
    <header>{title} {highlight}</header>
  ),
}));

vi.mock('@/app/components/ui/data-export-excel', () => ({
  DataExportExcel: () => null,
}));

vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: (rawProps: unknown) => {
    const props = rawProps as MockTableProps;
    clientHarness.latestTableProps = props;

    return (
      <div data-testid="data-table">
        {props.data.map((item, rowIndex) => (
          <div data-testid="data-row" key={`row-${rowIndex}`}>
            {props.columns.map((column, columnIndex) => (
              <span key={`${column.header}-${columnIndex}`}>
                {typeof column.accessor === 'function'
                  ? column.accessor(item, rowIndex)
                  : item[column.accessor] as ReactNode}
              </span>
            ))}
          </div>
        ))}
      </div>
    );
  },
}));

import SystemLogsLoginClient from '../login/SystemLogsLoginClient';
import SystemLogsPrivacyClient from '../privacy/SystemLogsPrivacyClient';
import SystemLogsSystemClient from '../system/SystemLogsSystemClient';
import SystemLogsUserClient from '../user/SystemLogsUserClient';
import SystemLogsWebClient from '../web/SystemLogsWebClient';

type SysLogDto = components['schemas']['SysLogDto'];
type LoginLogDto = components['schemas']['LoginLogDto'];
type UserLogDto = components['schemas']['UserLogDto'];
type WebLogDto = components['schemas']['WebLogDto'];
type PrivacyLogDto = components['schemas']['PrivacyLogDto'];

function pageOf<T>(row: T): PageResponse<T> {
  return {
    list: [row],
    total: 1,
    page: 1,
    size: 10,
    totalPage: 1,
  };
}

function currentTableProps(): MockTableProps {
  if (!clientHarness.latestTableProps) throw new Error('StandardDataTable was not rendered');
  return clientHarness.latestTableProps as MockTableProps;
}

const SYSTEM_ROW = {
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
  logId: 'LGN-001',
  loginId: 'alice',
  loginIp: '10.0.0.2',
  loginMthd: 'LOGIN',
  errOccrrAt: 'Y',
  errorCode: 'E_AUTH',
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
  dmndId: 'WEB-001',
  url: '/api/v1/orders/42',
  dmndUserId: 'web-admin',
  dmndUserIpAddr: '10.0.0.3',
  occrYmd: '20260813101112',
  prcsTm: 37,
} satisfies WebLogDto;

const PRIVACY_ROW = {
  dmndId: 'PRV-001',
  inqDt: '2026-08-13T10:11:12',
  srvcNm: 'ResidentService',
  inqInfo: 'resident-name',
  dmndUserId: 'privacy-admin',
  dmndUserIpAddr: '10.0.0.4',
} satisfies PrivacyLogDto;

describe('dedicated system log clients generated-DTO contracts', () => {
  beforeEach(() => {
    clientHarness.queryData = undefined;
    clientHarness.latestTableProps = undefined;
    clientHarness.setPage.mockReset();
  });

  it('renders the SYS generated DTO fields and uses dmndId as the row key', () => {
    clientHarness.queryData = pageOf(SYSTEM_ROW);
    render(<SystemLogsSystemClient />);

    const table = within(screen.getByTestId('data-table'));
    for (const value of ['SYS-001', '20260813', 'AccountService', 'findAccounts', '12', 'SUCCESS']) {
      expect(table.getByText(value)).toBeInTheDocument();
    }
    expect(currentTableProps().keyField).toBe('dmndId');
  });

  it('renders the LGN generated DTO fields and uses logId as the row key', () => {
    clientHarness.queryData = pageOf(LOGIN_ROW);
    render(<SystemLogsLoginClient />);

    const table = within(screen.getByTestId('data-table'));
    for (const value of ['LGN-001', '2026-08-13 10:11:12', 'alice', '10.0.0.2', 'LOGIN', 'E_AUTH']) {
      expect(table.getByText(value)).toBeInTheDocument();
    }
    expect(currentTableProps().keyField).toBe('logId');
  });

  it('builds a stable USR composite row identifier and renders all aggregate counters', () => {
    clientHarness.queryData = pageOf(USER_ROW);
    render(<SystemLogsUserClient />);

    const table = within(screen.getByTestId('data-table'));
    for (const value of ['20260813', 'UserService', 'updateUser', 'Alice Kim', '1', '2', '3', '4', '5', '6']) {
      expect(table.getByText(value)).toBeInTheDocument();
    }

    const props = currentTableProps();
    expect(props.keyField).toBe('rowKey');
    expect(props.data[0]).toMatchObject({
      rowKey: '20260813:user-001:UserService:updateUser',
    });
  });

  it('renders every WEB generated DTO field instead of legacy aliases', () => {
    clientHarness.queryData = pageOf(WEB_ROW);
    render(<SystemLogsWebClient />);

    const table = within(screen.getByTestId('data-table'));
    for (const value of ['WEB-001', '/api/v1/orders/42', 'web-admin', '37', '10.0.0.3', '20260813101112']) {
      expect(table.getByText(value)).toBeInTheDocument();
    }
    expect(currentTableProps().keyField).toBe('dmndId');
  });

  it('renders the PRV generated DTO fields and uses dmndId as the row key', () => {
    clientHarness.queryData = pageOf(PRIVACY_ROW);
    render(<SystemLogsPrivacyClient />);

    const table = within(screen.getByTestId('data-table'));
    for (const value of ['2026-08-13 10:11:12', 'resident-name', 'ResidentService', 'privacy-admin', '10.0.0.4']) {
      expect(table.getByText(value)).toBeInTheDocument();
    }
    expect(currentTableProps().keyField).toBe('dmndId');
  });
});
