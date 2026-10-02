import type { ReactElement, ReactNode } from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BannerAdminClient from '../banner/BannerAdminClient';
import AdministCodeClient from '../codes/administ/AdministCodeClient';
import ProgramAdminClient from '../programs/ProgramAdminClient';
import { ProgramForm } from '@/components/admin/system/ProgramForm';

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  createAdministCode: vi.fn(),
  createProgram: vi.fn(),
  deleteProgram: vi.fn(),
  getAdministCodes: vi.fn(),
  getBanners: vi.fn(),
  getPopups: vi.fn(),
  getPrograms: vi.fn(),
  query: '',
  replace: vi.fn(),
  saveBanner: vi.fn(),
  savePopup: vi.fn(),
  toast: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  updateProgram: vi.fn(),
  uploadFiles: vi.fn(),
}));

// 쓰기 버튼은 그 동작의 기능 권한으로 보인다 — 이 파일은 폼 검증 계약이 대상이라, 세 화면(배너·팝업, 행정 구역 코드, 프로그램)의 쓰기 권한을 모두 가진 관리자로 렌더한다.
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      permissions: [
        'BANNER_CREATE', 'BANNER_UPDATE', 'BANNER_DELETE', 'POPUP_CREATE', 'POPUP_UPDATE', 'POPUP_DELETE', 'FILE_UPLOAD_ALL',
        'ADMCODE_CREATE', 'ADMCODE_UPDATE', 'ADMCODE_DELETE', 'PROGRAM_CREATE', 'PROGRAM_UPDATE', 'PROGRAM_DELETE',
      ],
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

// [2026-10-02 D3] 화면 관리(구 프로그램 관리)는 셸의 navigation 슬롯에 탭을 둔다 — 탭을 눌러 '이전 프로그램' 으로 가야
//   프로그램 폼에 닿으므로 그 슬롯도 그린다(배너·행정 구역 코드 화면은 navigation 을 넘기지 않아 DOM 이 같다).
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

vi.mock('@/services/foundation/system/CodeAdminService', () => ({
  codeAdminService: {
    createAdministCode: (...args: unknown[]) => mocks.createAdministCode(...args),
    getAdministCodeList: (...args: unknown[]) => mocks.getAdministCodes(...args),
  },
}));

vi.mock('@/services/foundation/system/ProgramAdminService', () => ({
  programAdminService: {
    createProgram: (...args: unknown[]) => mocks.createProgram(...args),
    deleteProgram: (...args: unknown[]) => mocks.deleteProgram(...args),
    getProgramList: (...args: unknown[]) => mocks.getPrograms(...args),
    updateProgram: (...args: unknown[]) => mocks.updateProgram(...args),
  },
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

function fillAdministCodeForm() {
  fillTextBox(/행정 구역 식별 코드/, '1111051500');
  fillTextBox(/행정 구역 명칭/, '청운효자동');
  fillTextBox(/상위 행정 구역 코드/, '1111000000');
}

/** [2026-10-02 D3] 화면 관리의 기본 탭은 '화면 목록' 이다 — '이전 프로그램' 탭에서 프로그램 등록 폼을 연다. */
function openProgramCreateForm() {
  fireEvent.click(screen.getByRole('tab', { name: '이전 프로그램' }));
  fireEvent.click(screen.getByRole('button', { name: /프로그램 등록/ }));
}

function fillProgramForm() {
  fillTextBox(/프로그램 파일명/, 'TEST_PROGRAM');
  fillTextBox(/프로그램 이름/, '테스트 프로그램');
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

describe('system useAppForm consumers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query = '';
    mocks.confirm.mockResolvedValue(true);
    mocks.createAdministCode.mockResolvedValue({});
    mocks.createProgram.mockResolvedValue({});
    mocks.deleteProgram.mockResolvedValue({});
    mocks.getAdministCodes.mockResolvedValue(EMPTY_PAGE);
    mocks.getBanners.mockResolvedValue(EMPTY_PAGE);
    mocks.getPopups.mockResolvedValue(EMPTY_PAGE);
    mocks.getPrograms.mockResolvedValue(EMPTY_PAGE);
    mocks.saveBanner.mockResolvedValue({ success: true, message: '배너 저장 완료' });
    mocks.savePopup.mockResolvedValue({ success: true, message: '팝업 저장 완료' });
    mocks.updateProgram.mockResolvedValue({});
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

  it('AdministCode: invalid submit은 write 없이 summary와 첫 필드로 연결된다', async () => {
    renderWithClient(<AdministCodeClient initialData={EMPTY_PAGE} />);
    fireEvent.click(screen.getByRole('button', { name: /신규 등록/ }));
    const firstField = screen.getByRole('textbox', { name: /행정 구역 식별 코드/ });

    fireEvent.click(screen.getByRole('button', { name: /최종 등록/ }));

    await waitFor(() => expect(firstField).toHaveFocus());
    expect(firstField).toHaveAttribute('aria-required', 'true');
    expect(firstField).toHaveAttribute('aria-invalid', 'true');
    expect(firstField).toHaveAttribute('maxlength', '10');
    expect(document.querySelector('[data-form-error-summary="true"]')).toHaveTextContent(/입력 오류/);
    expect(mocks.createAdministCode).not.toHaveBeenCalled();
  });

  it('AdministCode: server field error를 summary와 필드에 연결한다', async () => {
    const message = '행정구역 명칭이 중복되었습니다.';
    mocks.createAdministCode.mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'admdstZoneNm', message }] } },
    });
    renderWithClient(<AdministCodeClient initialData={EMPTY_PAGE} />);
    fireEvent.click(screen.getByRole('button', { name: /신규 등록/ }));
    fillAdministCodeForm();

    fireEvent.click(screen.getByRole('button', { name: /최종 등록/ }));

    expect(await screen.findByText(message)).toBeVisible();
    const target = screen.getByRole('textbox', { name: /행정 구역 명칭/ });
    await waitFor(() => expect(target).toHaveFocus());
    expect(target).toHaveValue('청운효자동');
    expect(mocks.toast).not.toHaveBeenCalledWith('코드 등록 중 오류가 발생했습니다.', 'error');
  });

  it('AdministCode: 같은 tick의 중복 제출을 동기 lock으로 차단한다', async () => {
    const pending = deferred<Record<string, never>>();
    mocks.createAdministCode.mockReturnValueOnce(pending.promise);
    renderWithClient(<AdministCodeClient initialData={EMPTY_PAGE} />);
    fireEvent.click(screen.getByRole('button', { name: /신규 등록/ }));
    fillAdministCodeForm();
    const submit = screen.getByRole('button', { name: /최종 등록/ });

    act(() => {
      submit.click();
      submit.click();
    });

    await waitFor(() => expect(mocks.createAdministCode).toHaveBeenCalledTimes(1));
    await act(async () => pending.resolve({}));
  });

  it('AdministCode: native submit을 지원하고 저장 중 닫기를 막아 서버 오류 위치를 보존한다', async () => {
    const pending = deferred<Record<string, never>>();
    mocks.createAdministCode.mockReturnValueOnce(pending.promise);
    renderWithClient(<AdministCodeClient initialData={EMPTY_PAGE} />);
    fireEvent.click(screen.getByRole('button', { name: /신규 등록/ }));
    fillAdministCodeForm();
    const modal = screen.getByRole('region', { name: '행정 구역 코드 등록' });

    fireEvent.submit(modal.querySelector('form')!);

    await waitFor(() => expect(mocks.createAdministCode).toHaveBeenCalledTimes(1));
    const cancel = screen.getByRole('button', { name: '취소' });
    expect(cancel).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '모달 닫기 요청' }));
    expect(screen.getByRole('region', { name: '행정 구역 코드 등록' })).toBeVisible();

    await act(async () => pending.reject({
      response: { data: { errors: [{ field: 'admdstZoneNm', message: '저장할 수 없는 행정 구역 명칭입니다.' }] } },
    }));
    expect(await screen.findByText('저장할 수 없는 행정 구역 명칭입니다.')).toBeVisible();
    expect(screen.getByRole('textbox', { name: /행정 구역 명칭/ })).toHaveValue('청운효자동');
    expect(cancel).toBeEnabled();
  });

  it('ProgramAdmin은 중복 useAppForm 없이 공용 ProgramForm에 validation을 위임한다', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/app/admin/system/programs/ProgramAdminClient.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/useAppForm/);
    expect(source).not.toMatch(/const programSchema/);
    expect(source).toMatch(/<ProgramForm/);
  });

  it('ProgramAdmin의 실제 폼은 invalid summary와 첫 필드 연결을 제공한다', async () => {
    renderWithClient(<ProgramAdminClient initialData={EMPTY_PAGE} searchWrd="" />);
    openProgramCreateForm();
    const firstField = screen.getByRole('textbox', { name: /프로그램 파일명/ });

    fireEvent.click(screen.getByRole('button', { name: /프로그램 저장/ }));

    await waitFor(() => expect(firstField).toHaveFocus());
    expect(firstField).toHaveAttribute('aria-required', 'true');
    expect(firstField).toHaveAttribute('aria-invalid', 'true');
    expect(firstField).toHaveAttribute('maxlength', '300');
    expect(document.querySelector('[data-form-error-summary="true"]')).toHaveTextContent(/입력 오류/);
    expect(mocks.createProgram).not.toHaveBeenCalled();
  });

  it('ProgramForm은 같은 tick의 중복 제출을 동기 lock으로 차단한다', async () => {
    const pending = deferred<Record<string, never>>();
    mocks.createProgram.mockReturnValueOnce(pending.promise);
    renderWithClient(<ProgramAdminClient initialData={EMPTY_PAGE} searchWrd="" />);
    openProgramCreateForm();
    fillProgramForm();
    const submit = screen.getByRole('button', { name: /프로그램 저장/ });

    act(() => {
      submit.click();
      submit.click();
    });

    await waitFor(() => expect(mocks.createProgram).toHaveBeenCalledTimes(1));
    await act(async () => pending.resolve({}));
  });

  it('ProgramForm 제출은 부모 저장 sink를 한 번만 호출하고 pending·structured 오류 뒤 모달과 값을 보존한다', async () => {
    const pending = deferred<Record<string, never>>();
    mocks.createProgram.mockReturnValueOnce(pending.promise);
    renderWithClient(<ProgramAdminClient initialData={EMPTY_PAGE} searchWrd="" />);
    openProgramCreateForm();
    fillProgramForm();
    const modal = screen.getByRole('region', { name: '신규 프로그램 등록' });
    const submit = screen.getByRole('button', { name: /프로그램 저장/ });
    const cancel = screen.getByRole('button', { name: '취소' });

    act(() => {
      submit.click();
      cancel.click();
      within(modal).getByRole('button', { name: '모달 닫기 요청' }).click();
    });

    await waitFor(() => expect(mocks.createProgram).toHaveBeenCalledTimes(1));
    expect(mocks.createProgram).toHaveBeenCalledWith(expect.objectContaining({
      prgrmFileNm: 'TEST_PROGRAM',
      prgrmKornNm: '테스트 프로그램',
    }));
    expect(mocks.deleteProgram).not.toHaveBeenCalled();
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute('aria-busy', 'true');
    expect(cancel).toBeDisabled();
    expect(screen.getByRole('region', { name: '신규 프로그램 등록' })).toBeVisible();

    await act(async () => pending.reject({
      response: { data: { errors: [{ field: 'prgrmKornNm', message: '이미 사용 중인 프로그램 이름입니다.' }] } },
    }));

    expect(await screen.findByText('이미 사용 중인 프로그램 이름입니다.')).toBeVisible();
    expect(screen.getByRole('textbox', { name: /프로그램 이름/ })).toHaveValue('테스트 프로그램');
    expect(document.querySelector('[data-form-error-summary="true"]')).toHaveTextContent('이미 사용 중인 프로그램 이름입니다.');
    expect(screen.getByRole('region', { name: '신규 프로그램 등록' })).toBeVisible();
    expect(cancel).toBeEnabled();
  });

  it('ProgramForm 수정 저장 중 삭제를 막고 structured 오류 뒤 편집 내용을 유지한다', async () => {
    const pending = deferred<Record<string, never>>();
    mocks.updateProgram.mockReturnValueOnce(pending.promise);
    const onOpenChange = vi.fn();
    renderWithClient(
      <ProgramForm
        open
        onOpenChange={onOpenChange}
        onSuccess={vi.fn()}
        data={{
          prgrmFileNm: 'EDIT_PROGRAM',
          prgrmKornNm: '수정 전 설명',
          prgrmStrgPath: '/',
          prgrmExpln: '',
          url: '/edit',
        } as any}
      />,
    );
    const nameField = screen.getByRole('textbox', { name: /프로그램 이름/ });
    fireEvent.change(nameField, { target: { value: '보존할 수정 이름' } });
    const submit = screen.getByRole('button', { name: /프로그램 저장/ });
    const cancel = screen.getByRole('button', { name: '취소' });
    const deleteButton = screen.getByRole('button', { name: '프로그램 삭제' });

    act(() => {
      submit.click();
      cancel.click();
      deleteButton.click();
    });

    await waitFor(() => expect(mocks.updateProgram).toHaveBeenCalledTimes(1));
    expect(cancel).toBeDisabled();
    expect(deleteButton).toBeDisabled();
    expect(mocks.deleteProgram).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();

    await act(async () => pending.reject({
      response: { data: { errors: [{ field: 'prgrmKornNm', message: '수정할 수 없는 프로그램 이름입니다.' }] } },
    }));

    expect(await screen.findByText('수정할 수 없는 프로그램 이름입니다.')).toBeVisible();
    expect(nameField).toHaveValue('보존할 수정 이름');
    expect(cancel).toBeEnabled();
  });

  it('ProgramForm 삭제는 같은 tick 중복 실행을 막고 pending·실패를 안내한다', async () => {
    let rejectDelete!: (reason?: unknown) => void;
    mocks.deleteProgram.mockReturnValueOnce(new Promise((_, reject) => { rejectDelete = reject; }));
    const onOpenChange = vi.fn();
    renderWithClient(
      <ProgramForm
        open
        onOpenChange={onOpenChange}
        onSuccess={vi.fn()}
        data={{
          prgrmFileNm: 'DELETE_PROGRAM',
          prgrmKornNm: '삭제 대상 프로그램',
          prgrmStrgPath: '/',
          prgrmExpln: '',
          url: '/delete',
        } as any}
      />,
    );
    const deleteButton = screen.getByRole('button', { name: '프로그램 삭제' });

    act(() => {
      deleteButton.click();
      deleteButton.click();
    });

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ confirmText: '프로그램 삭제' }));
    await waitFor(() => expect(mocks.deleteProgram).toHaveBeenCalledTimes(1));
    const pendingButton = screen.getByRole('button', { name: '프로그램 삭제 중…' });
    expect(pendingButton).toBeDisabled();
    expect(pendingButton).toHaveAttribute('aria-busy', 'true');
    const submitButton = screen.getByRole('button', { name: /프로그램 저장/ });
    const cancelButton = screen.getByRole('button', { name: '취소' });
    expect(submitButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
    fireEvent.click(submitButton);
    fireEvent.click(cancelButton);
    expect(mocks.updateProgram).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    // 서버 문구가 없는 전송 실패는 원문('Request failed …') 대신 과업 이름이 붙은 기본 안내로 알린다(failureMessage).
    await act(async () => rejectDelete(Object.assign(new Error('Request failed with status code 500'), {
      isAxiosError: true,
      response: { status: 500 },
    })));
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('프로그램을 삭제하지 못했습니다.'));
    expect(submitButton).toBeEnabled();
    expect(cancelButton).toBeEnabled();
  });

  it('ProgramForm 삭제가 연결 메뉴 때문에 거부(409)되면 서버 사유를 그대로 보인다', async () => {
    mocks.deleteProgram.mockRejectedValueOnce({
      response: { status: 409, data: { message: '이 프로그램을 연결한 메뉴가 있어 삭제할 수 없습니다: LINKED_PROGRAM' } },
    });
    const onSuccess = vi.fn();
    renderWithClient(
      <ProgramForm
        open
        onOpenChange={vi.fn()}
        onSuccess={onSuccess}
        data={{
          prgrmFileNm: 'LINKED_PROGRAM',
          prgrmKornNm: '연결된 프로그램',
          prgrmStrgPath: '/',
          prgrmExpln: '',
          url: '/linked',
        } as any}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '프로그램 삭제' }));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith(
      '이 프로그램을 연결한 메뉴가 있어 삭제할 수 없습니다: LINKED_PROGRAM',
    ));
    expect(onSuccess).not.toHaveBeenCalled();
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });

  it('ProgramForm 삭제 확인은 여는 화면이 준 연결 안내를 싣고, 없으면 일반 안내다', async () => {
    mocks.confirm.mockResolvedValue(false);
    const programData = {
      prgrmFileNm: 'NOTICE_PROGRAM',
      prgrmKornNm: '안내 대상 프로그램',
      prgrmStrgPath: '/',
      prgrmExpln: '',
      url: '/notice',
    } as any;
    const { unmount } = renderWithClient(
      <ProgramForm open onOpenChange={vi.fn()} onSuccess={vi.fn()} data={programData} />,
    );

    const deleteButton = screen.getByRole('button', { name: '프로그램 삭제' });
    // 아이콘 전용 버튼의 전경은 전경 전용 토큰이다 — 배경용 destructive 는 다크에서 대비가 1.8:1 이다.
    expect(deleteButton).toHaveClass('text-destructive-emphasis');
    expect(deleteButton).not.toHaveClass('text-destructive');

    fireEvent.click(deleteButton);
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    // [2026-10-02 D3] 화면에 없는 길(메뉴 관리에서 연결 해제)을 권하지 않는다 — 메뉴 구조 편집은 메뉴의 연결 프로그램을
    //   바꾸지 않는다. 일반 안내는 화면 관리의 연결 안내(programDeleteLinkNotice)의 일반 문장과 같다.
    expect(mocks.confirm.mock.calls[0][0].message).toBe(
      '프로그램을 삭제합니다. 이 프로그램을 연결한 메뉴가 있으면 삭제되지 않습니다.',
    );
    unmount();

    renderWithClient(
      <ProgramForm
        open
        onOpenChange={vi.fn()}
        onSuccess={vi.fn()}
        data={programData}
        deleteNotice="불러온 메뉴 구조 기준으로 메뉴 1개(가 화면)가 이 프로그램을 연결하고 있습니다."
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '프로그램 삭제' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(2));
    expect(mocks.confirm.mock.calls[1][0].message).toBe(
      '프로그램을 삭제합니다. 불러온 메뉴 구조 기준으로 메뉴 1개(가 화면)가 이 프로그램을 연결하고 있습니다.',
    );
    expect(mocks.deleteProgram).not.toHaveBeenCalled();
  });
});
