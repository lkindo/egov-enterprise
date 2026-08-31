import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { components } from '@/types/generated-api';
import type { PageResponse } from '@/types/foundation/system';

interface MockColumn {
  header: string;
  accessor: string | ((item: Record<string, unknown>, index?: number) => ReactNode);
  sortKey?: string;
}

interface MockPagination {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalCount?: number;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

interface MockSearch {
  value?: string;
  onSearch: (keyword: string) => void;
  onClear?: () => void;
}

interface MockTableProps {
  columns: MockColumn[];
  data: Array<Record<string, unknown>>;
  keyField?: string;
  pagination?: MockPagination;
  search?: MockSearch;
}

const clientHarness = vi.hoisted(() => ({
  queryData: undefined as unknown,
  latestTableProps: undefined as unknown,
  latestQueryOptions: undefined as unknown,
  setPage: vi.fn(),
}));

const toastHarness = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}));

const downloadHarness = vi.hoisted(() => ({
  navigateToDownload: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: unknown) => {
    clientHarness.latestQueryOptions = options;
    return {
      data: clientHarness.queryData,
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    };
  },
}));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
    success: toastHarness.success,
    error: toastHarness.error,
    removeToast: () => {},
  }),
}));

vi.mock('@/lib/navigation/full-result-download', () => ({
  navigateToDownload: downloadHarness.navigateToDownload,
}));

vi.mock('@/app/admin/system/logs/use-log-url-state', () => ({
  usePageParam: () => [1, clientHarness.setPage],
}));

vi.mock('@/app/components/layout/page-header', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock('@/components/ui/hub/HubHeader', () => ({
  HubHeader: ({ title, highlight, actions }: { title: string; highlight?: string; actions?: ReactNode }) => (
    <header>{title} {highlight}{actions}</header>
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
import { metadata as userLogMetadata } from '../user/page';
import { systemLogAdminService } from '@/services/foundation/system/SystemLogAdminService';
import {
  exportLoginLogsOperation,
  exportPrivacyLogsOperation,
  exportSystemLogsOperation,
  exportUserLogsOperation,
  exportWebLogsOperation,
} from '@/types/generated-operations';

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
  webLogSn: 101,
  url: '/api/v1/orders/42',
  dmndUserId: 'web-admin',
  dmndUserIpAddr: '10.0.0.3',
  occrYmd: '20260813101112',
  prcsTm: 37,
} satisfies WebLogDto;

const PRIVACY_ROW = {
  prvcLogSn: 101,
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

  it('publishes a stable descriptive document title for the user-log route', () => {
    expect(userLogMetadata.title).toBe('사용자 로그 | 전자정부 엔터프라이즈 포털');
    expect(userLogMetadata.description).toBeTruthy();
  });

  it('renders the SYS generated DTO fields and uses sysLogSn as the row key', () => {
    clientHarness.queryData = pageOf(SYSTEM_ROW);
    render(<SystemLogsSystemClient />);

    const table = within(screen.getByTestId('data-table'));
    for (const value of ['SYS-001', '20260813', 'AccountService', 'findAccounts', '12', 'SUCCESS']) {
      expect(table.getByText(value)).toBeInTheDocument();
    }
    expect(currentTableProps().keyField).toBe('sysLogSn');
  });

  it('renders the LGN generated DTO fields and uses lgnSn as the row key', () => {
    clientHarness.queryData = pageOf(LOGIN_ROW);
    render(<SystemLogsLoginClient />);

    const table = within(screen.getByTestId('data-table'));
    for (const value of ['101', '2026-08-13 10:11:12', 'alice', '10.0.0.2', 'LOGIN', 'E_AUTH']) {
      expect(table.getByText(value)).toBeInTheDocument();
    }
    expect(currentTableProps().keyField).toBe('lgnSn');
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

  it('renders every WEB generated DTO field and uses webLogSn as the row key', () => {
    clientHarness.queryData = pageOf(WEB_ROW);
    render(<SystemLogsWebClient />);

    const table = within(screen.getByTestId('data-table'));
    for (const value of ['101', '/api/v1/orders/42', 'web-admin', '37', '10.0.0.3', '20260813101112']) {
      expect(table.getByText(value)).toBeInTheDocument();
    }
    expect(currentTableProps().keyField).toBe('webLogSn');
  });

  it('renders the PRV generated DTO fields and uses prvcLogSn as the row key', () => {
    clientHarness.queryData = pageOf(PRIVACY_ROW);
    render(<SystemLogsPrivacyClient />);

    const table = within(screen.getByTestId('data-table'));
    for (const value of ['2026-08-13 10:11:12', 'resident-name', 'ResidentService', 'privacy-admin', '10.0.0.4']) {
      expect(table.getByText(value)).toBeInTheDocument();
    }
    expect(currentTableProps().keyField).toBe('prvcLogSn');
  });
});

type LogServiceMethod = 'getLoginLogs' | 'getSystemLogs' | 'getUserLogs' | 'getWebLogs' | 'getPrivacyLogs';

interface ClusterCase {
  name: string;
  Component: () => ReactNode;
  row: Record<string, unknown>;
  method: LogServiceMethod;
  /** header → 원시 정렬 키(sortKey). 현재 페이지 클라이언트 정렬 계약(StandardDataTable). */
  sortKeys: Record<string, string>;
}

const CLUSTER_CASES: ClusterCase[] = [
  {
    name: 'LGN',
    Component: SystemLogsLoginClient,
    row: LOGIN_ROW,
    method: 'getLoginLogs',
    sortKeys: { 발생시점: 'creatDt', 사용자ID: 'loginId', 구분: 'loginMthd' },
  },
  {
    name: 'SYS',
    Component: SystemLogsSystemClient,
    row: SYSTEM_ROW,
    method: 'getSystemLogs',
    sortKeys: { 발생일자: 'ocrnYmd', 서비스설명: 'srvcNm', 처리구분: 'prcsSeCd' },
  },
  {
    name: 'USR',
    Component: SystemLogsUserClient,
    row: USER_ROW,
    method: 'getUserLogs',
    sortKeys: { 발생일자: 'ocrnYmd', 요청자: 'dmndUserId', 서비스설명: 'srvcNm' },
  },
  {
    name: 'WEB',
    Component: SystemLogsWebClient,
    row: WEB_ROW,
    method: 'getWebLogs',
    sortKeys: { 발생일자: 'occrYmd', 요청자: 'dmndUserId', 응답시간: 'prcsTm' },
  },
  {
    name: 'PRV',
    Component: SystemLogsPrivacyClient,
    row: PRIVACY_ROW,
    method: 'getPrivacyLogs',
    sortKeys: { 조회일시: 'inqDt', 조회자: 'dmndUserId', 서비스명: 'srvcNm' },
  },
];

function currentQueryFn(): () => Promise<unknown> {
  const options = clientHarness.latestQueryOptions as { queryFn?: () => Promise<unknown> } | undefined;
  if (!options?.queryFn) throw new Error('useQuery options were not captured');
  return options.queryFn;
}

describe('logs cluster modernization (m-1): page-size opt-in and current-page sorting', () => {
  beforeEach(() => {
    clientHarness.queryData = undefined;
    clientHarness.latestTableProps = undefined;
    clientHarness.latestQueryOptions = undefined;
    clientHarness.setPage.mockReset();
    vi.restoreAllMocks();
  });

  it.each(CLUSTER_CASES)(
    '$name client opts into the page-size selector and forwards the chosen size to the service',
    async ({ Component, row, method }) => {
      clientHarness.queryData = pageOf(row);
      render(<Component />);

      const { pagination } = currentTableProps();
      expect(pagination?.pageSize).toBe(10);
      expect(pagination?.pageSizeOptions).toEqual([10, 20, 50, 100]);
      expect(typeof pagination?.onPageSizeChange).toBe('function');

      act(() => pagination?.onPageSizeChange?.(50));

      // 페이지 크기 변경은 1페이지로 복귀해야 한다(범위를 벗어난 현재 페이지 방지).
      expect(clientHarness.setPage).toHaveBeenCalledWith(1);
      expect(currentTableProps().pagination?.pageSize).toBe(50);

      // 최신 렌더의 queryFn 이 바뀐 size 를 서비스에 전달한다
      // (size→pageUnit 변환은 SystemLogAdminService.test.ts 가 별도 검증).
      const spy = vi
        .spyOn(systemLogAdminService, method)
        .mockResolvedValue(pageOf(row) as never);
      await currentQueryFn()();
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ size: 50 }));
    },
  );

  it.each(CLUSTER_CASES)(
    '$name client marks date/user/type columns sortable via sortKey (current-page sorting)',
    ({ Component, row, sortKeys }) => {
      clientHarness.queryData = pageOf(row);
      render(<Component />);

      const { columns } = currentTableProps();
      for (const [header, sortKey] of Object.entries(sortKeys)) {
        const column = columns.find((candidate) => candidate.header === header);
        expect(column, `${header} column`).toBeDefined();
        expect(column?.sortKey, `${header} sortKey`).toBe(sortKey);
      }
      // 정렬은 opt-in 이다 — 지정한 열 밖에는 sortKey 가 새지 않아야 한다.
      const sortableHeaders = columns.filter((c) => c.sortKey !== undefined).map((c) => c.header);
      expect(sortableHeaders.sort()).toEqual(Object.keys(sortKeys).sort());
    },
  );
});

describe('logs cluster modernization (m-1): LGN full-result xlsx export wiring', () => {
  beforeEach(() => {
    clientHarness.queryData = undefined;
    clientHarness.latestTableProps = undefined;
    clientHarness.latestQueryOptions = undefined;
    clientHarness.setPage.mockReset();
    toastHarness.error.mockReset();
    downloadHarness.navigateToDownload.mockReset();
  });

  it.each([
    ['LGN', SystemLogsLoginClient, LOGIN_ROW, exportLoginLogsOperation],
    ['SYS', SystemLogsSystemClient, SYSTEM_ROW, exportSystemLogsOperation],
    ['USR', SystemLogsUserClient, USER_ROW, exportUserLogsOperation],
    ['WEB', SystemLogsWebClient, WEB_ROW, exportWebLogsOperation],
    ['PRV', SystemLogsPrivacyClient, PRIVACY_ROW, exportPrivacyLogsOperation],
  ] as const)(
    '%s client binds its download to the exact generated binary operation',
    (_name, Component, row, operation) => {
      clientHarness.queryData = pageOf(row);
      render(<Component />);

      fireEvent.click(screen.getByRole('button', { name: '전체 결과 엑셀 다운로드' }));

      expect(downloadHarness.navigateToDownload).toHaveBeenCalledWith(operation, undefined);
    },
  );

  it('carries the current search keyword into the export URL', () => {
    clientHarness.queryData = pageOf(LOGIN_ROW);
    render(<SystemLogsLoginClient />);

    // [2026-08-24 A1 이행] 조회 조건이 표 내부 검색창에서 WorkListPage 조회 조건 영역으로 올라갔다.
    //   검사 의도(적용된 검색어가 export URL 로 전달되는가)는 그대로이고 입력 경로만 바뀐다.
    fireEvent.change(screen.getByRole('textbox', { name: '사용자ID · 접속IP' }), {
      target: { value: 'alice' },
    });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    fireEvent.click(screen.getByRole('button', { name: '전체 결과 엑셀 다운로드' }));

    expect(downloadHarness.navigateToDownload).toHaveBeenCalledWith(
      exportLoginLogsOperation,
      { searchKeyword: 'alice' },
    );
  });

  it('blocks navigation and explains the server row cap when the result set exceeds it', () => {
    clientHarness.queryData = { ...pageOf(LOGIN_ROW), total: 100_001 };
    render(<SystemLogsLoginClient />);

    fireEvent.click(screen.getByRole('button', { name: '전체 결과 엑셀 다운로드' }));

    expect(downloadHarness.navigateToDownload).not.toHaveBeenCalled();
    expect(toastHarness.error).toHaveBeenCalledWith(expect.stringContaining('100,000'));
  });

  /*
   * [2026-08-26] 종전 이 테스트는 **엔드포인트가 없다는 사실**을 고정하고 있었다 — 로그인 로그
   * 외에는 서버측 전량 export 가 없었으므로 "가짜 버튼을 만들지 마라"가 옳은 계약이었다.
   * 나머지 4종에도 `/export.xlsx` 가 생겼으므로(DEC-OPS-016 census 등재) 계약을 뒤집는다:
   * 이제 **다섯 화면 모두** 전량 export 를 제공해야 하고, 그 버튼이 사라지면 red 다.
   */
  it('다섯 로그 화면 모두 서버측 전량 export 를 제공한다', () => {
    for (const { Component, row } of CLUSTER_CASES) {
      clientHarness.queryData = pageOf(row);
      const { unmount } = render(<Component />);
      expect(screen.getByRole('button', { name: '전체 결과 엑셀 다운로드' })).toBeInTheDocument();
      unmount();
    }
  });
});
