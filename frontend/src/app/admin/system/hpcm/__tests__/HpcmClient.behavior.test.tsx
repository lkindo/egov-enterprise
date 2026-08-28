import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HpcmClient from '../HpcmClient';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  confirm: vi.fn(),
  replace: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
  usePathname: () => '/admin/system/hpcm',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('next/dynamic', () => ({
  default: () => function TestModal({ isOpen, title, children, footer }: {
    isOpen: boolean;
    title: string;
    children: ReactNode;
    footer?: ReactNode;
  }) {
    return isOpen ? <section aria-label={title}>{children}{footer}</section> : null;
  },
}));
vi.mock('@/services/foundation/system/HpcmAdminService', () => ({
  hpcmAdminService: {
    getHpcmList: (...args: unknown[]) => mocks.list(...args),
    createHpcm: (...args: unknown[]) => mocks.create(...args),
    updateHpcm: (...args: unknown[]) => mocks.update(...args),
    deleteHpcm: (...args: unknown[]) => mocks.remove(...args),
  },
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ title, actions, filter, totalCount, children }: {
    title: string;
    actions?: ReactNode;
    filter?: ReactNode;
    totalCount?: number;
    children: ReactNode;
  }) => (
    <main>
      <h1>{title}</h1>
      <span data-testid="total-count">{totalCount === undefined ? '없음' : String(totalCount)}</span>
      {actions}{filter}{children}
    </main>
  ),
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ columns, data, error, pagination }: {
    columns: Array<{ header: string; accessor: (item: Record<string, unknown>) => ReactNode }>;
    data: Array<Record<string, unknown>>;
    error?: Error | null;
    pagination?: { currentPage: number; totalPages: number; onPageChange: (n: number) => void };
  }) => (
    <div>
      {error ? <p role="alert">{error.message}</p> : null}
      <div data-testid="headers">{columns.map((c) => c.header).join('|')}</div>
      {data.map((item, row) => (
        <div key={row}>{columns.map((column, index) => (
          <span key={`${row}-${index}`}>{column.accessor(item)}</span>
        ))}</div>
      ))}
      {pagination ? (
        <nav data-testid="pager">
          <span data-testid="total-pages">{pagination.totalPages}</span>
          <button type="button" onClick={() => pagination.onPageChange(pagination.currentPage + 1)}>다음 페이지</button>
        </nav>
      ) : null}
    </div>
  ),
}));

const ROW = { hlpSn: 7, hlpSeCd: 'BBS', hlpDfn: '게시판 삭제 가이드', hlpExpln: '물리 삭제 절차' };

const PAGE = { list: [ROW], total: 42, page: 0, size: 10, totalPage: 5 };

/**
 * 폼 조회는 모달 안으로 좁힌다.
 *
 * 조회 조건 입력의 라벨도 '도움말 명칭' 이다(서버가 hlpDfn 만 검색하므로 그 범위를 그대로
 * 말한 것이다 — 카탈로그 G15). 화면 전체에서 이름으로 찾으면 두 컨트롤이 함께 잡힌다.
 */
const modal = (title: '도움말 콘텐츠 등록' | '도움말 콘텐츠 수정') =>
  within(screen.getByRole('region', { name: title }));

function fillValidForm() {
  const form = modal('도움말 콘텐츠 등록');
  fireEvent.change(form.getByRole('textbox', { name: /^분류 구분/ }), { target: { value: 'BBS' } });
  fireEvent.change(form.getByRole('textbox', { name: /^도움말 명칭/ }), { target: { value: '입력한 도움말' } });
  fireEvent.change(form.getByRole('textbox', { name: /^도움말 상세 설명/ }), { target: { value: '입력한 상세 설명' } });
}

const renderClient = (props: Partial<Parameters<typeof HpcmClient>[0]> = {}) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <HpcmClient initialData={{ list: [], total: 0 }} {...props} />
    </QueryClientProvider>,
  );
};

describe('HpcmClient validation behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue({ list: [], total: 0, totalPage: 1 });
    mocks.create.mockResolvedValue(1);
    mocks.confirm.mockResolvedValue(true);
  });

  it('invalid 등록을 write하지 않고 summary와 첫 필드로 연결한다', async () => {
    renderClient();
    fireEvent.click(screen.getByRole('button', { name: /콘텐츠 등록/ }));
    const first = screen.getByRole('textbox', { name: /^분류 구분/ });

    fireEvent.click(screen.getByRole('button', { name: /최종 등록/ }));

    expect(await screen.findByText('분류 구분을 입력해 주세요.')).toBeVisible();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(first).toHaveAttribute('aria-required', 'true');
    expect(first).toHaveAttribute('aria-invalid', 'true');
    expect(document.querySelector('[data-form-error-summary="true"]')).toHaveTextContent(/입력 오류/);
    await waitFor(() => expect(first).toHaveFocus());
  });

  it('structured server field 오류를 inline으로 표시하고 입력값과 모달을 보존한다', async () => {
    const message = '이미 등록된 도움말 명칭입니다.';
    mocks.create.mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'hlpDfn', message }] } },
    });
    renderClient();
    fireEvent.click(screen.getByRole('button', { name: /콘텐츠 등록/ }));
    fillValidForm();
    const target = modal('도움말 콘텐츠 등록').getByRole('textbox', { name: /^도움말 명칭/ });

    fireEvent.click(screen.getByRole('button', { name: /최종 등록/ }));

    expect(await screen.findByText(message)).toBeVisible();
    expect(target).toHaveValue('입력한 도움말');
    expect(target).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(target).toHaveFocus());
    expect(screen.getByRole('region', { name: '도움말 콘텐츠 등록' })).toBeInTheDocument();
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.any(String), 'error');
  });
});

/**
 * 등록한 도움말을 고치고 지울 수 있다.
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * 서버는 `PUT /help/hpcm/{hlpSn}`·`DELETE /help/hpcm/{hlpSn}` 를 갖췄고 프런트 서비스에도
 * `updateHpcm`·`deleteHpcm` 이 있었는데 **소비처가 0건**이었다. 목록에 '관리' 열 자체가 없어,
 * 도움말을 한 번 등록하면 오타 하나도 고칠 수 없고 지울 수도 없었다. 같은 컨트롤러를 쓰는
 * 형제 화면(온라인 매뉴얼)은 수정·삭제를 모두 갖추고 있어 비대칭이 분명했다.
 */
describe('도움말 콘텐츠 — 수정과 삭제', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue(PAGE);
    mocks.update.mockResolvedValue(undefined);
    mocks.remove.mockResolvedValue(undefined);
    mocks.confirm.mockResolvedValue(true);
  });

  it('목록에 관리 열이 있다 — 종전에는 열 자체가 없었다', async () => {
    renderClient({ initialData: { list: [ROW], total: 42 } });

    // 부분 일치로 검사하면 '관리_무엇' 같은 이름으로 바뀌어도 통과한다 — 열 이름을 정확히 본다.
    const headers = (await screen.findByTestId('headers')).textContent?.split('|') ?? [];
    expect(headers).toContain('관리');
    expect(screen.getByRole('button', { name: '게시판 삭제 가이드 수정' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '게시판 삭제 가이드 삭제' })).toBeEnabled();
  });

  it('수정을 열면 기존 값이 채워지고 저장은 update 로 나간다', async () => {
    renderClient({ initialData: { list: [ROW], total: 42 } });

    fireEvent.click(await screen.findByRole('button', { name: '게시판 삭제 가이드 수정' }));

    expect(await screen.findByRole('region', { name: '도움말 콘텐츠 수정' })).toBeInTheDocument();
    const form = modal('도움말 콘텐츠 수정');
    expect(form.getByRole('textbox', { name: /^도움말 명칭/ })).toHaveValue('게시판 삭제 가이드');
    expect(form.getByRole('textbox', { name: /^도움말 상세 설명/ })).toHaveValue('물리 삭제 절차');

    fireEvent.change(form.getByRole('textbox', { name: /^도움말 명칭/ }), { target: { value: '고친 명칭' } });
    fireEvent.click(screen.getByRole('button', { name: /수정 저장/ }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    expect(mocks.update.mock.calls[0][0]).toBe(7);
    expect(mocks.update.mock.calls[0][1]).toMatchObject({ hlpSn: 7, hlpDfn: '고친 명칭' });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('삭제 확인은 대상 이름과 되돌릴 수 없다는 사실을 말한다', async () => {
    renderClient({ initialData: { list: [ROW], total: 42 } });

    fireEvent.click(await screen.findByRole('button', { name: '게시판 삭제 가이드 삭제' }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    const message = String(mocks.confirm.mock.calls[0][0].message);
    expect(message).toContain('게시판 삭제 가이드');
    expect(message).toContain('되돌릴 수 없습니다');
  });

  it('확인을 취소하면 삭제하지 않는다', async () => {
    mocks.confirm.mockResolvedValue(false);
    renderClient({ initialData: { list: [ROW], total: 42 } });

    fireEvent.click(await screen.findByRole('button', { name: '게시판 삭제 가이드 삭제' }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  /**
   * 삭제 액션의 세 성질을 **한 테스트에서** 함께 증명한다.
   * 나눠 놓으면 각각은 통과하는데 조합이 깨질 수 있다 — 진행 중 재클릭이 두 번째 삭제를
   * 보내면서도 실패 안내는 정상으로 보이는 상태가 가능하다.
   */
  it('삭제 중에는 한 번만 보내고 상태를 드러내며, 실패 사유를 보여 준다', async () => {
    // 대상: HpcmClient.handleDelete → hpcmAdminService.deleteHpcm
    let rejectDelete!: (reason?: unknown) => void;
    mocks.remove.mockReturnValueOnce(new Promise((_resolve, reject) => { rejectDelete = reject; }));
    renderClient({ initialData: { list: [ROW], total: 42 } });

    const trigger = await screen.findByRole('button', { name: '게시판 삭제 가이드 삭제' });
    fireEvent.click(trigger);

    const pending = await screen.findByRole('button', { name: '게시판 삭제 가이드 삭제 중…' });
    expect(pending).toBeDisabled();
    expect(pending).toHaveAttribute('aria-busy', 'true');
    // 수정 버튼도 함께 잠긴다 — 삭제 중에 같은 행을 편집하면 사라진 대상을 저장하게 된다.
    expect(screen.getByRole('button', { name: '게시판 삭제 가이드 수정' })).toBeDisabled();

    fireEvent.click(pending);
    expect(mocks.remove).toHaveBeenCalledTimes(1);

    rejectDelete(new Error('도움말 삭제 권한이 없습니다.'));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('도움말 삭제 권한이 없습니다.', 'error'));
    // 실패했으므로 다시 시도할 수 있어야 한다.
    await waitFor(() => expect(screen.getByRole('button', { name: '게시판 삭제 가이드 삭제' })).toBeEnabled());
  });

  it('등록 진입은 직전 편집 값을 물고 가지 않는다', async () => {
    renderClient({ initialData: { list: [ROW], total: 42 } });

    fireEvent.click(await screen.findByRole('button', { name: '게시판 삭제 가이드 수정' }));
    await screen.findByDisplayValue('게시판 삭제 가이드');

    fireEvent.click(screen.getByRole('button', { name: /콘텐츠 등록/ }));

    expect(await screen.findByRole('region', { name: '도움말 콘텐츠 등록' })).toBeInTheDocument();
    expect(screen.queryByDisplayValue('게시판 삭제 가이드')).not.toBeInTheDocument();
  });
});

/**
 * 11건째부터 사라지던 축.
 *
 * 서버는 기본 10건만 내려주는데 화면에는 페이저도 검색도 없었고, 상단 '총 N건'은 현재 페이지의
 * 행 수(항상 10)를 그대로 썼다. 그래서 11번째 도움말은 볼 방법이 없고 총건수는 사용자를 오도했다.
 *
 * 페이저를 다는 것과 정렬을 고정하는 것은 같은 변경이어야 한다 — 서버의 파생 질의는 Sort 를
 * 주지 않으면 순서가 정해지지 않아, 2페이지에서 1페이지 행이 되풀이될 수 있다.
 */
describe('도움말 콘텐츠 — 목록 조회', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue(PAGE);
    mocks.confirm.mockResolvedValue(true);
  });

  it('총건수는 현재 페이지 행 수가 아니라 서버가 준 전체 건수다', async () => {
    renderClient({ initialData: { list: [ROW], total: 42 } });

    expect(await screen.findByTestId('total-count')).toHaveTextContent('42');
  });

  it('페이저가 있고 페이지를 넘기면 서버에 0-base 로 요청한다', async () => {
    renderClient({ initialData: { list: [ROW], total: 42 } });

    expect(await screen.findByTestId('pager')).toBeInTheDocument();
    expect(screen.getByTestId('total-pages')).toHaveTextContent('5');

    fireEvent.click(screen.getByRole('button', { name: '다음 페이지' }));

    await waitFor(() => expect(mocks.list).toHaveBeenCalled());
    const last = mocks.list.mock.calls[mocks.list.mock.calls.length - 1][0];
    expect(last).toMatchObject({ page: 1, size: 10 });
  });

  it('조회는 결정적 정렬을 명시한다 — 없으면 페이지마다 순서가 흔들린다', async () => {
    renderClient({ initialData: { list: [ROW], total: 42 } });

    fireEvent.click(await screen.findByRole('button', { name: '다음 페이지' }));

    await waitFor(() => expect(mocks.list).toHaveBeenCalled());
    const last = mocks.list.mock.calls[mocks.list.mock.calls.length - 1][0];
    expect(last.sort).toBe('hlpSn,DESC');
  });

  it('검색어는 서버로 나가고 1페이지로 되돌린다', async () => {
    renderClient({ initialData: { list: [ROW], total: 42 } });

    fireEvent.change(await screen.findByLabelText(/도움말 명칭/), { target: { value: '게시판' } });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));

    await waitFor(() => {
      const last = mocks.list.mock.calls[mocks.list.mock.calls.length - 1][0];
      expect(last).toMatchObject({ keyword: '게시판', page: 0 });
    });
  });
});

/**
 * 조회 실패를 '데이터 없음'으로 위장하지 않는다.
 *
 * 종전 page.tsx 는 `catch { console.error(...) }` 로 실패를 빈 배열로 삼켜, 화면이
 * '등록된 도움말 콘텐츠가 없습니다' 라고 말했다. 사용자에게 두 상황은 전혀 다르다.
 */
describe('도움말 콘텐츠 — 조회 실패', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue({ list: [], total: 0, totalPage: 1 });
    mocks.confirm.mockResolvedValue(true);
  });

  it('서버 렌더가 실패하면 사유를 표로 드러내고 총건수를 지어내지 않는다', async () => {
    renderClient({ fetchError: '도움말 콘텐츠를 불러오지 못했습니다.' });

    // useAppForm 이 document.body 에 sr-only 오류 알림(role="alert")을 하나 더 붙이므로
    // role 만으로는 유일하지 않다 — 표가 그린 오류 문단으로 범위를 좁힌다.
    const shown = await screen.findByText('도움말 콘텐츠를 불러오지 못했습니다.');
    expect(shown).toHaveAttribute('role', 'alert');
    expect(screen.getByTestId('total-count')).toHaveTextContent('없음');
  });
});
