import type { ReactElement, ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BannerAdminClient from '../BannerAdminClient';

/*
  [2026-10-20] 이 시험은 셸(BannerAdminClient)을 그려 셸이 조립하는 배너 패널(BannerAssetsPanel·useBannerAssetsPanel)과
  팝업 패널(PopupAssetsPanel·usePopupAssetsPanel)의 폼·삭제 처리기를 함께 판정한다 — 화면을 자산별 파일로 나눴어도 한 화면이다.
*/

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  getBanners: vi.fn(),
  getPopups: vi.fn(),
  query: '',
  replace: vi.fn(),
  saveBanner: vi.fn(),
  savePopup: vi.fn(),
  toast: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  uploadFiles: vi.fn(),
}));

// 쓰기 버튼은 그 동작의 기능 권한으로 보인다 — 폼 검증 계약이 대상이라 배너·팝업 쓰기 권한을 모두 가진 관리자로 렌더한다.
// 배너·팝업은 따로 고르는 홍보 기능이다(DEC-OPS-273). 행정 구역 코드 폼 계약은 core 시험(codes/administ)에 둔다 —
// 한 파일에 섞으면 홍보를 고르지 않은 생성물에서 core 폼 계약까지 연쇄로 사라진다.
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      permissions: ['BANNER_CREATE', 'BANNER_UPDATE', 'BANNER_DELETE', 'POPUP_CREATE', 'POPUP_UPDATE', 'POPUP_DELETE', 'FILE_UPLOAD_ALL'],
      authorizationVersion: 'v1',
    },
  }),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/system/banner',
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams(mocks.query),
}));


vi.mock('next/dynamic', () => ({
  default: () => function TestModal({
    children,
    footer,
    isOpen,
    onClose,
    title,
  }: {
    children: ReactNode;
    footer?: ReactNode;
    isOpen: boolean;
    onClose?: () => void;
    title: string;
  }) {
    return isOpen ? (
      <section aria-label={title}>
        <button type="button" onClick={onClose}>모달 닫기 요청</button>
        {children}{footer}
      </section>
    ) : null;
  },
}));

// 셸의 navigation 슬롯도 그린다(배너·행정 구역 코드 화면은 navigation 을 넘기지 않아 DOM 이 같다). 종전에는 화면 관리의
//   '이전 프로그램' 탭이 이 슬롯에 있었다 — 2026-10-04 그 탭과 프로그램 폼 계약을 걷었다.
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({
    actions,
    children,
    filter,
    navigation,
    title,
    toolbarActions,
  }: {
    actions?: ReactNode;
    children: ReactNode;
    filter?: ReactNode;
    navigation?: ReactNode;
    title: string;
    toolbarActions?: ReactNode;
  }) => <main><h1>{title}</h1>{actions}{navigation}{filter}{toolbarActions}{children}</main>,
}));

vi.mock('@/app/components/patterns/keyword-filter', () => ({
  KeywordFilter: ({ label }: { label: string }) => <input aria-label={label} />,
}));

vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: () => <div data-testid="data-table" />,
}));


vi.mock('@/app/components/ui/standard-file-uploader', () => ({
  StandardFileUploader: () => <input type="file" aria-label="파일 첨부 선택" />,
}));

vi.mock('@/app/components/ui/attachment-image', () => ({
  AttachmentImage: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
  // 팝업 창의 미리보기(공지 팝업 패널)가 첨부 주소를 가려낼 때 쓴다 — 이 시험의 판정 대상은 아니다.
  extractAtchFileSn: () => null,
}));


vi.mock('@/components/ui/hub/HubStatusBadge', () => ({
  HubStatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast, error: mocks.toastError, success: mocks.toastSuccess }),
}));

vi.mock('@/app/components/ui/confirm-modal', () => ({
  useConfirm: () => mocks.confirm,
}));


vi.mock('@/services/foundation/system/BannerAdminService', () => ({
  bannerAdminService: { getBannerList: (...args: unknown[]) => mocks.getBanners(...args) },
}));

vi.mock('@/services/foundation/system/PopupAdminService', () => ({
  popupAdminService: { getPopupList: (...args: unknown[]) => mocks.getPopups(...args) },
}));

vi.mock('@/services/foundation/system/FileAdminService', () => ({
  fileAdminService: { uploadFiles: (...args: unknown[]) => mocks.uploadFiles(...args) },
}));


vi.mock('@/app/actions/promotionActions', () => ({
  deleteBannerAction: vi.fn(),
  deletePopupAction: vi.fn(),
  saveBannerAction: (...args: unknown[]) => mocks.saveBanner(...args),
  savePopupAction: (...args: unknown[]) => mocks.savePopup(...args),
}));

const EMPTY_PAGE = { list: [], total: 0, page: 1, size: 10, totalPage: 1 };

function renderWithClient(node: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>);
}

function fillTextBox(name: RegExp, value: string) {
  fireEvent.change(screen.getByRole('textbox', { name }), { target: { value } });
}

function fillPopupForm() {
  fillTextBox(/팝업 타이틀/, '긴급 공지');
  fillTextBox(/게시 시작 시점/, '20260826');
  fillTextBox(/게시 종료 시점/, '20260827');
}


function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((next, nextReject) => {
    resolve = next;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

describe('BannerAdminClient useAppForm 소비', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query = '';
    mocks.confirm.mockResolvedValue(true);
    mocks.getBanners.mockResolvedValue(EMPTY_PAGE);
    mocks.getPopups.mockResolvedValue(EMPTY_PAGE);
    mocks.saveBanner.mockResolvedValue({ success: true, message: '배너 저장 완료' });
    mocks.savePopup.mockResolvedValue({ success: true, message: '팝업 저장 완료' });
    mocks.uploadFiles.mockResolvedValue({});
  });

  it('Banner: invalid submit은 write 없이 summary와 첫 필드로 연결된다', async () => {
    renderWithClient(<BannerAdminClient initialBanners={[]} initialPopups={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /신규 배너 등록/ }));
    const firstField = screen.getByRole('textbox', { name: /배너 명칭/ });

    fireEvent.click(screen.getByRole('button', { name: /운영 배포/ }));

    await waitFor(() => expect(firstField).toHaveFocus());
    expect(firstField).toHaveAttribute('aria-required', 'true');
    expect(firstField).toHaveAttribute('aria-invalid', 'true');
    expect(firstField).toHaveAttribute('maxlength', '100');
    expect(document.querySelector('[data-form-error-summary="true"]')).toHaveTextContent(/입력 오류/);
    expect(mocks.saveBanner).not.toHaveBeenCalled();
  });

  it('Banner: 랜딩 페이지 입력은 배너가 실제로 여는 주소 모양을 설명으로 읽어 준다(ADR-0042)', async () => {
    renderWithClient(<BannerAdminClient initialBanners={[]} initialPopups={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /신규 배너 등록/ }));

    // 대시보드 배너는 사이트 안 주소를 같은 창, http(s) 주소를 새 창으로 열고 그 밖의 값은 링크로 그리지 않는다.
    expect(screen.getByRole('textbox', { name: /랜딩 페이지/ })).toHaveAccessibleDescription(
      '사이트 안 주소(/pages/… 등) 또는 https 주소를 넣습니다. 사이트 안 주소는 같은 창, https 주소는 새 창으로 열립니다.',
    );
  });

  it('Banner: Server Action fieldErrors를 summary와 필드에 연결한다', async () => {
    const message = '배너 명칭이 중복되었습니다.';
    mocks.saveBanner.mockResolvedValueOnce({
      success: false,
      message: '입력값을 확인하세요.',
      fieldErrors: { bnrNm: message },
    });
    renderWithClient(<BannerAdminClient initialBanners={[]} initialPopups={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /신규 배너 등록/ }));
    fillTextBox(/배너 명칭/, '신규 배너');

    fireEvent.click(screen.getByRole('button', { name: /운영 배포/ }));

    expect(await screen.findByText(message)).toBeVisible();
    const target = screen.getByRole('textbox', { name: /배너 명칭/ });
    await waitFor(() => expect(target).toHaveFocus());
    expect(target).toHaveValue('신규 배너');
    expect(mocks.toast).not.toHaveBeenCalledWith('입력값을 확인하세요.', 'error');
  });

  it('Banner: 같은 tick의 중복 제출을 동기 lock으로 차단한다', async () => {
    const pending = deferred<{ success: boolean; message: string }>();
    mocks.saveBanner.mockReturnValueOnce(pending.promise);
    renderWithClient(<BannerAdminClient initialBanners={[]} initialPopups={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /신규 배너 등록/ }));
    fillTextBox(/배너 명칭/, '신규 배너');
    const submit = screen.getByRole('button', { name: /운영 배포/ });

    act(() => {
      submit.click();
      submit.click();
    });

    await waitFor(() => expect(mocks.saveBanner).toHaveBeenCalledTimes(1));
    await act(async () => pending.resolve({ success: true, message: '저장 완료' }));
  });

  it('Banner: 저장 중 취소·모달 닫기를 막고 structured 오류 뒤에도 값·summary를 보존한다', async () => {
    const pending = deferred<{ success: boolean; message: string; fieldErrors?: Record<string, string> }>();
    mocks.saveBanner.mockReturnValueOnce(pending.promise);
    renderWithClient(<BannerAdminClient initialBanners={[]} initialPopups={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /신규 배너 등록/ }));
    fillTextBox(/배너 명칭/, '보존할 배너');
    const modal = screen.getByRole('region', { name: '신규 비주얼 자산 등록' });
    const submit = screen.getByRole('button', { name: /운영 배포/ });
    const cancel = screen.getByRole('button', { name: '취소' });

    act(() => {
      submit.click();
      cancel.click();
      within(modal).getByRole('button', { name: '모달 닫기 요청' }).click();
    });

    await waitFor(() => expect(mocks.saveBanner).toHaveBeenCalledTimes(1));
    expect(cancel).toBeDisabled();
    expect(screen.getByRole('region', { name: '신규 비주얼 자산 등록' })).toBeVisible();

    await act(async () => pending.resolve({
      success: false,
      message: '입력값을 확인하세요.',
      fieldErrors: { bnrNm: '이미 사용 중인 배너 명칭입니다.' },
    }));

    expect(await screen.findByText('이미 사용 중인 배너 명칭입니다.')).toBeVisible();
    expect(screen.getByRole('textbox', { name: /배너 명칭/ })).toHaveValue('보존할 배너');
    expect(document.querySelector('[data-form-error-summary="true"]')).toHaveTextContent('이미 사용 중인 배너 명칭입니다.');
    expect(screen.getByRole('region', { name: '신규 비주얼 자산 등록' })).toBeVisible();
    expect(cancel).toBeEnabled();
  });

  it('Popup: invalid submit은 write 없이 summary와 첫 필드로 연결된다', async () => {
    mocks.query = 'tab=popup&page=1';
    renderWithClient(<BannerAdminClient initialBanners={[]} initialPopups={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /신규 팝업 등록/ }));
    const firstField = screen.getByRole('textbox', { name: /팝업 타이틀/ });

    fireEvent.click(screen.getByRole('button', { name: /운영 배포/ }));

    await waitFor(() => expect(firstField).toHaveFocus());
    expect(firstField).toHaveAttribute('aria-required', 'true');
    expect(firstField).toHaveAttribute('aria-invalid', 'true');
    expect(firstField).toHaveAttribute('maxlength', '100');
    expect(document.querySelector('[data-form-error-summary="true"]')).toHaveTextContent(/입력 오류/);
    expect(mocks.savePopup).not.toHaveBeenCalled();
  });

  it('Popup: Server Action fieldErrors를 summary와 필드에 연결한다', async () => {
    const message = '팝업 제목이 중복되었습니다.';
    mocks.query = 'tab=popup&page=1';
    mocks.savePopup.mockResolvedValueOnce({
      success: false,
      message: '입력값을 확인하세요.',
      fieldErrors: { popupTtlNm: message },
    });
    renderWithClient(<BannerAdminClient initialBanners={[]} initialPopups={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /신규 팝업 등록/ }));
    fillPopupForm();

    fireEvent.click(screen.getByRole('button', { name: /운영 배포/ }));

    expect(await screen.findByText(message)).toBeVisible();
    const target = screen.getByRole('textbox', { name: /팝업 타이틀/ });
    await waitFor(() => expect(target).toHaveFocus());
    expect(target).toHaveValue('긴급 공지');
    expect(mocks.toast).not.toHaveBeenCalledWith('입력값을 확인하세요.', 'error');
  });

  it('Popup: 같은 tick의 중복 제출을 동기 lock으로 차단한다', async () => {
    const pending = deferred<{ success: boolean; message: string }>();
    mocks.query = 'tab=popup&page=1';
    mocks.savePopup.mockReturnValueOnce(pending.promise);
    renderWithClient(<BannerAdminClient initialBanners={[]} initialPopups={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /신규 팝업 등록/ }));
    fillPopupForm();
    const submit = screen.getByRole('button', { name: /운영 배포/ });

    act(() => {
      submit.click();
      submit.click();
    });

    await waitFor(() => expect(mocks.savePopup).toHaveBeenCalledTimes(1));
    await act(async () => pending.resolve({ success: true, message: '저장 완료' }));
  });

  it('Popup: 저장 중 취소를 막고 structured 오류 뒤에도 값·summary를 보존한다', async () => {
    const pending = deferred<{ success: boolean; message: string; fieldErrors?: Record<string, string> }>();
    mocks.query = 'tab=popup&page=1';
    mocks.savePopup.mockReturnValueOnce(pending.promise);
    renderWithClient(<BannerAdminClient initialBanners={[]} initialPopups={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /신규 팝업 등록/ }));
    fillPopupForm();
    const submit = screen.getByRole('button', { name: /운영 배포/ });
    const cancel = screen.getByRole('button', { name: '취소' });

    act(() => {
      submit.click();
      cancel.click();
    });

    await waitFor(() => expect(mocks.savePopup).toHaveBeenCalledTimes(1));
    expect(cancel).toBeDisabled();
    expect(screen.getByRole('region', { name: '신규 레이어 팝업 설계' })).toBeVisible();

    await act(async () => pending.resolve({
      success: false,
      message: '입력값을 확인하세요.',
      fieldErrors: { popupTtlNm: '이미 사용 중인 팝업 제목입니다.' },
    }));

    expect(await screen.findByText('이미 사용 중인 팝업 제목입니다.')).toBeVisible();
    expect(screen.getByRole('textbox', { name: /팝업 타이틀/ })).toHaveValue('긴급 공지');
    expect(document.querySelector('[data-form-error-summary="true"]')).toHaveTextContent('이미 사용 중인 팝업 제목입니다.');
    expect(screen.getByRole('region', { name: '신규 레이어 팝업 설계' })).toBeVisible();
    expect(cancel).toBeEnabled();
  });
});
