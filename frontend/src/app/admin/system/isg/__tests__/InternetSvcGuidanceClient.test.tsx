import type { ReactElement, ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InternetSvcGuidanceClient from '../InternetSvcGuidanceClient';

/**
 * 🌐 인터넷 서비스 안내 — 배선 계약.
 *
 * <p>[2026-09-07] 이 도메인은 백엔드 5본이 완비돼 있었는데 저장소 전체에 프런트 호출부가 0 이었다.
 * 화면이 없으니 등록 경로도 없어 {@code tb_intrn_svc} 는 구조적으로 항상 비어 있었고, 그 사이
 * 결함 3건(빈 목록만 반환하는 스텁, DTO↔엔티티 어휘 불일치, 설명 상한 1000 vs 컬럼 4000)이
 * 노출되지 않아 드러나지 않았다. 이 계약은 "배선됐다"를 sink 호출로 증명한다 — 화면 존재만으로는
 * 같은 사각이 다시 열린다.
 */
const mocks = vi.hoisted(() => ({
  getGuidanceList: vi.fn(),
  createGuidance: vi.fn(),
  updateGuidance: vi.fn(),
  deleteGuidance: vi.fn(),
  confirm: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/system/isg',
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/dynamic', () => ({
  default: () => function TestModal({
    children, footer, isOpen, onClose, title,
  }: { children: ReactNode; footer?: ReactNode; isOpen: boolean; onClose?: () => void; title: string }) {
    return isOpen ? (
      <section aria-label={title}>
        <button type="button" onClick={onClose}>모달 닫기 요청</button>
        {children}{footer}
      </section>
    ) : null;
  },
}));

vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ actions, children, filter, title }: { actions?: ReactNode; children: ReactNode; filter?: ReactNode; title: string }) => (
    <main><h1>{title}</h1>{actions}{filter}{children}</main>
  ),
}));

vi.mock('@/app/components/patterns/keyword-filter', () => ({
  KeywordFilter: ({ label }: { label: string }) => <input aria-label={label} />,
}));

// 행 액션은 표의 열 accessor 안에 산다 — 열을 실제로 렌더하는 표 mock 이어야 버튼이 보인다.
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ columns, data }: {
    columns: Array<{ header: string; accessor: string | ((item: never, index: number) => ReactNode) }>;
    data: Array<Record<string, unknown>>;
  }) => (
    <table>
      <tbody>
        {data.map((item, rowIndex) => (
          <tr key={rowIndex}>
            {columns.map((column, columnIndex) => (
              <td key={columnIndex}>
                {typeof column.accessor === 'function'
                  ? column.accessor(item as never, rowIndex)
                  : String(item[column.accessor] ?? '')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/services/foundation/system/InternetSvcGuidanceAdminService', () => ({
  internetSvcGuidanceAdminService: {
    getGuidanceList: (...args: unknown[]) => mocks.getGuidanceList(...args),
    createGuidance: (...args: unknown[]) => mocks.createGuidance(...args),
    updateGuidance: (...args: unknown[]) => mocks.updateGuidance(...args),
    deleteGuidance: (...args: unknown[]) => mocks.deleteGuidance(...args),
  },
}));

const GUIDANCE = {
  itntSrvcSn: 3,
  itntSvcNm: '민원 전자 접수',
  itntSvcExpln: '온라인으로 민원을 접수합니다.',
  rfltYn: 'Y',
  lastMdfrId: 'ADMIN',
  mdfcnDt: '2026-09-01T10:00:00',
};

function pageOf<T>(item: T) {
  return { list: [item], total: 1, page: 1, size: 10, totalPage: 1 };
}

function renderWithClient(node: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>);
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((next, nextReject) => { resolve = next; reject = nextReject; });
  return { promise, resolve, reject };
}

describe('InternetSvcGuidanceClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getGuidanceList.mockResolvedValue(pageOf(GUIDANCE));
    mocks.createGuidance.mockResolvedValue(9);
    mocks.updateGuidance.mockResolvedValue(undefined);
    mocks.deleteGuidance.mockResolvedValue(undefined);
    mocks.confirm.mockResolvedValue(true);
  });

  it('목록을 서버 계약(0-based page)으로 조회해 렌더한다', async () => {
    renderWithClient(<InternetSvcGuidanceClient initialPage={pageOf(GUIDANCE)} />);

    expect(await screen.findByText('민원 전자 접수')).toBeInTheDocument();
    expect(screen.getByText('반영')).toBeInTheDocument();
    await waitFor(() => expect(mocks.getGuidanceList).toHaveBeenCalled());
    expect(mocks.getGuidanceList).toHaveBeenCalledWith(
      expect.objectContaining({ page: 0, size: 10 }),
    );
  });

  it('등록은 readOnly 감사 필드를 보내지 않고 createGuidance 를 부른다', async () => {
    renderWithClient(<InternetSvcGuidanceClient initialPage={pageOf(GUIDANCE)} />);
    fireEvent.click(await screen.findByRole('button', { name: /서비스 안내 등록/ }));

    const modal = await screen.findByRole('region', { name: '인터넷 서비스 안내 등록' });
    const scope = within(modal);
    fireEvent.change(scope.getByRole('textbox', { name: /서비스 명칭/ }), { target: { value: '전자 증명 발급' } });
    fireEvent.change(scope.getByRole('textbox', { name: /서비스 설명/ }), { target: { value: '증명서를 온라인 발급합니다.' } });
    fireEvent.click(scope.getByRole('button', { name: '등록' }));

    await waitFor(() => expect(mocks.createGuidance).toHaveBeenCalledTimes(1));
    const [body] = mocks.createGuidance.mock.calls[0];
    expect(body).toEqual({
      itntSvcNm: '전자 증명 발급',
      itntSvcExpln: '증명서를 온라인 발급합니다.',
      rfltYn: 'Y',
    });
    // 서버 소유 감사 필드를 화면이 위조해 보내지 않는다.
    expect(body).not.toHaveProperty('itntSrvcSn');
    expect(body).not.toHaveProperty('lastMdfrId');
    expect(body).not.toHaveProperty('mdfcnDt');
    expect(mocks.toast).toHaveBeenCalledWith('인터넷 서비스 안내를 등록했습니다.', 'success');
  });

  it('필수 입력이 비면 제출을 막고 sink 를 부르지 않는다 — 서버 400 을 기다리지 않는다', async () => {
    renderWithClient(<InternetSvcGuidanceClient initialPage={pageOf(GUIDANCE)} />);
    fireEvent.click(await screen.findByRole('button', { name: /서비스 안내 등록/ }));

    const modal = await screen.findByRole('region', { name: '인터넷 서비스 안내 등록' });
    fireEvent.click(within(modal).getByRole('button', { name: '등록' }));

    expect(await within(modal).findByText('인터넷 서비스 명칭을 입력하세요.')).toBeInTheDocument();
    expect(mocks.createGuidance).not.toHaveBeenCalled();
  });

  it('수정을 누르면 값이 채워진 모달이 열리고 저장은 일련번호로 updateGuidance 를 부른다', async () => {
    renderWithClient(<InternetSvcGuidanceClient initialPage={pageOf(GUIDANCE)} />);
    fireEvent.click(await screen.findByRole('button', { name: '민원 전자 접수 수정' }));

    const modal = await screen.findByRole('region', { name: '인터넷 서비스 안내 수정' });
    const scope = within(modal);
    expect(scope.getByRole('textbox', { name: /서비스 명칭/ })).toHaveValue('민원 전자 접수');
    expect(scope.getByRole('combobox', { name: /반영 여부/ })).toHaveValue('Y');

    fireEvent.change(scope.getByRole('textbox', { name: /서비스 명칭/ }), { target: { value: '민원 온라인 접수' } });
    fireEvent.click(scope.getByRole('button', { name: '수정 저장' }));

    await waitFor(() => expect(mocks.updateGuidance).toHaveBeenCalledTimes(1));
    expect(mocks.updateGuidance).toHaveBeenCalledWith(3, expect.objectContaining({ itntSvcNm: '민원 온라인 접수' }));
    expect(mocks.createGuidance).not.toHaveBeenCalled();
  });

  /*
    [폼 검증 census — destructive action] 중복 차단·pending(disabled·aria-busy)·실패 피드백은
    한 테스트 안에서 함께 증명해야 한다. 셋을 나누면 "각각은 되는데 실제 흐름에서는 깨지는" 조합을
    아무도 보지 않는다(frontend-form-validation-census: INCOMPLETE_ACTION_TEST_EVIDENCE).
  */
  it('삭제는 확인 후 delete 를 한 번만 부르고, pending 동안 disabled·aria-busy 이며, 실패는 토스트로 드러낸다', async () => {
    const pending = deferred<void>();
    mocks.deleteGuidance.mockReturnValue(pending.promise);
    renderWithClient(<InternetSvcGuidanceClient initialPage={pageOf(GUIDANCE)} />);
    const remove = await screen.findByRole('button', { name: '민원 전자 접수 삭제' });

    fireEvent.click(remove);
    fireEvent.click(remove);

    await waitFor(() => expect(mocks.deleteGuidance).toHaveBeenCalledTimes(1));
    expect(mocks.deleteGuidance).toHaveBeenCalledWith(3);
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    const busy = screen.getByRole('button', { name: '민원 전자 접수 삭제 중' });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');

    await act(async () => pending.reject(new Error('안내 서버 오류')));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('안내 서버 오류', 'error'));
  });

  it('확인을 취소하면 삭제를 부르지 않는다', async () => {
    mocks.confirm.mockResolvedValue(false);
    renderWithClient(<InternetSvcGuidanceClient initialPage={pageOf(GUIDANCE)} />);

    fireEvent.click(await screen.findByRole('button', { name: '민원 전자 접수 삭제' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.deleteGuidance).not.toHaveBeenCalled();
  });

  it('반영 여부가 Y/N 어휘 밖이면 뭉개지 않고 원문을 드러낸다', async () => {
    const odd = { ...GUIDANCE, rfltYn: 'X' };
    mocks.getGuidanceList.mockResolvedValue(pageOf(odd));
    renderWithClient(<InternetSvcGuidanceClient initialPage={pageOf(odd)} />);

    expect(await screen.findByText('알 수 없음 (X)')).toBeInTheDocument();
  });
});
