/**
 * 외부인사 목록 — 어느 행사 소속인지 화면이 말한다.
 *
 * ── 무엇이 틀려 있었나 ──────────────────────────────────────────────────────────
 * 등록할 때는 '소속 행사' 를 **필수로 고르게** 해 놓고, 목록에는 그 값을 보여 주는 열이 없었다
 * (번호·성명·소속기관·연락처·이메일·생년월일 6개뿐). 관리자는 자기가 방금 어느 행사에 등록한
 * 사람인지 목록에서 확인할 수 없었다.
 *
 * 새 API 는 필요 없었다 — 조인에 필요한 두 축이 이미 화면 안에 있다. 목록 행이 `evntSn` 을
 * 싣고 오고(`ExternalHrService.convertToDto`), 행사 이름 목록은 '소속 행사' 선택지용 쿼리가
 * 이미 들고 있다.
 *
 * ── 폴백이 중요한 이유 ──────────────────────────────────────────────────────────
 * 이름이 사전에 없을 때 '미지정' 이라고 쓰면 **거짓말**이다. 물리 FK(V2_80)가 행사의 실재를
 * 보장하므로, 이름이 안 잡히는 것은 "행사가 없다" 가 아니라 "이 화면이 아직 이름을 모른다"
 * 다(선택지 조회가 200건 한 페이지라 그 밖의 행사는 사전에 없다). 번호를 그대로 보여 주면
 * 사용자가 행사 관리 화면에서 대조할 수 있다.
 */

import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getEvents: vi.fn(),
  getExternalHrList: vi.fn(),
  createExternalHr: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/operation/external-hr',
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/lib/hooks/use-debounced-value', () => ({ useDebouncedValue: (v: string) => v }));
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ children }: { children: ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/app/components/patterns/keyword-filter', () => ({ KeywordFilter: () => <div /> }));
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ columns, data }: {
    columns: Array<{ header: string; accessor: (item: Record<string, unknown>, index?: number) => ReactNode }>;
    data: Array<Record<string, unknown>>;
  }) => (
    <div>
      <div data-testid="headers">{columns.map((c) => c.header).join('|')}</div>
      {data.map((item, row) => (
        <div key={row}>{columns.map((column, index) => (
          <span key={`${row}-${index}`}>{column.accessor(item, row)}</span>
        ))}</div>
      ))}
    </div>
  ),
}));
vi.mock('@/services/foundation/operation/eventService', () => ({
  eventService: { getEvents: (...args: unknown[]) => mocks.getEvents(...args) },
}));
vi.mock('@/services/foundation/operation/OperationAdminService', () => ({
  operationAdminService: {
    getExternalHrList: (...args: unknown[]) => mocks.getExternalHrList(...args),
    createExternalHr: (...args: unknown[]) => mocks.createExternalHr(...args),
  },
}));

import ExternalHrClient from '../ExternalHrClient';

const PERSON = {
  otsdHrSn: 1,
  evntSn: 7,
  otsdHrNm: '홍길동',
  ogdpInstNm: '한국대학교',
  telno: '010-0000-0000',
  eml: 'hong@example.com',
};

const page = (list: Record<string, unknown>[]) => ({
  list, total: list.length, page: 1, size: 10, totalPage: 1,
});

function renderClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ExternalHrClient initialPage={page([PERSON]) as never} />
    </QueryClientProvider>,
  );
}

describe('외부인사 목록 — 소속 행사 열', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getExternalHrList.mockResolvedValue(page([PERSON]));
    mocks.getEvents.mockResolvedValue({
      list: [{ evntSn: 7, evntNm: '가을 워크숍' }], total: 1, totalPage: 1,
    });
  });

  it('소속 행사 열이 있다 — 종전에는 목록에서 확인할 방법이 없었다', async () => {
    renderClient();

    const headers = (await screen.findByTestId('headers')).textContent?.split('|') ?? [];
    expect(headers).toContain('소속 행사');
  });

  it('행사 번호를 행사명으로 옮겨 보여 준다', async () => {
    renderClient();

    expect(await screen.findByText('가을 워크숍')).toBeVisible();
  });

  it('이름을 모르면 번호를 그대로 보여 준다 — "미지정" 으로 지어내지 않는다', async () => {
    /*
     * 선택지 조회는 200건 한 페이지다. 그 밖의 행사는 사전에 없다 — 그래도 FK 가 실재를
     * 보장하므로 '미지정' 은 거짓이다. 번호를 보여 주면 행사 관리 화면에서 대조할 수 있다.
     */
    mocks.getEvents.mockResolvedValue({ list: [], total: 0, totalPage: 1 });
    renderClient();

    expect(await screen.findByText('행사 #7')).toBeVisible();
    expect(screen.queryByText('행사 미지정')).not.toBeInTheDocument();
  });

  it('행사 번호 자체가 없을 때만 값 없음으로 표시한다', async () => {
    const noEvent = { ...PERSON, evntSn: undefined };
    mocks.getExternalHrList.mockResolvedValue(page([noEvent]));
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ExternalHrClient initialPage={page([noEvent]) as never} />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('headers')).toBeInTheDocument());
    expect(screen.queryByText(/행사 #/)).not.toBeInTheDocument();
  });
});
