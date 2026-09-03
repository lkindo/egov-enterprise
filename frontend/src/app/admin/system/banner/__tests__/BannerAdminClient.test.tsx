import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BannerAdminClient from '../BannerAdminClient';
import type { fileAdminService } from '@/services/foundation/system/FileAdminService';

/**
 * 업로드 mock 이 돌려줄 값. **타입이 실제 서비스 선언에 결속돼 있다** —
 * 여기에 envelope 형태(`{ data: { data: n } }`)를 다시 넣으면 컴파일 오류다.
 *
 * `import type` 이라 런타임에는 지워지므로 아래 `vi.mock` 이 대체하는 모듈을 실제로 부르지 않는다.
 */
const UPLOADED_FILE_SN: Awaited<ReturnType<typeof fileAdminService.uploadFiles>> = 999;

const mocks = vi.hoisted(() => ({
  query: '',
  replace: vi.fn(),
  toast: vi.fn(),
  confirm: vi.fn(),
  getBanners: vi.fn(),
  getPopups: vi.fn(),
  upload: vi.fn(),
  saveBanner: vi.fn(),
  deleteBanner: vi.fn(),
  savePopup: vi.fn(),
  deletePopup: vi.fn(),
  resetBanner: vi.fn(),
  resetPopup: vi.fn(),
}));

const bannerValues = {
  bnrNm: '신규 배너',
  linkUrl: '/new',
  sortOrdr: 1,
  rfltYn: 'Y',
  bnrExpln: '설명',
};
const popupValues = {
  popupTtlNm: '신규 팝업',
  ntceBgnde: '2026-08-15',
  ntceEndde: '2026-08-16',
  popupWdthPstn: 10,
  popupVrtcPstn: 20,
  popupWdthSz: 400,
  popupVrtcSz: 300,
  ntceYn: 'Y',
  stopvewSetupYn: 'N',
};

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
  usePathname: () => '/admin/system/banner',
  useSearchParams: () => new URLSearchParams(mocks.query),
}));

vi.mock('next/dynamic', () => ({
  default: () => function Modal({ isOpen, title, footer, children }: any) {
    return isOpen ? <section aria-label={title}>{children}{footer}</section> : null;
  },
}));

vi.mock('@/hooks/useAppForm', () => ({
  useAppForm: (_schema: unknown, options: any) => {
    const isBanner = Object.hasOwn(options.defaultValues, 'bnrNm');
    const values = isBanner ? bannerValues : popupValues;
    return {
      control: { values },
      reset: isBanner ? mocks.resetBanner : mocks.resetPopup,
      handleSubmit: (submit: (value: any) => unknown) => () => submit(values),
      applyServerErrors: vi.fn(() => false),
      focusError: vi.fn(),
      formState: { isSubmitting: false },
    };
  },
}));

vi.mock('@/components/ui/form', () => ({
  Form: ({ children }: any) => children,
  FormControl: ({ children }: any) => children,
  FormErrorSummary: () => null,
  FormField: ({ control, name, render: renderField }: any) => renderField({
    field: {
      name,
      value: control.values[name],
      onChange: vi.fn(),
    },
  }),
  FormItem: ({ children }: any) => <div>{children}</div>,
  FormLabel: ({ children }: any) => <label>{children}</label>,
  FormMessage: () => null,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children }: any) => <span>{children}</span>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => <span>선택값</span>,
}));

vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));

vi.mock('@/services/foundation/system/BannerAdminService', () => ({
  bannerAdminService: { getBannerList: mocks.getBanners },
}));
vi.mock('@/services/foundation/system/PopupAdminService', () => ({
  popupAdminService: { getPopupList: mocks.getPopups },
}));
vi.mock('@/services/foundation/system/FileAdminService', () => ({
  fileAdminService: { uploadFiles: mocks.upload },
}));
vi.mock('@/app/actions/promotionActions', () => ({
  saveBannerAction: mocks.saveBanner,
  deleteBannerAction: mocks.deleteBanner,
  savePopupAction: mocks.savePopup,
  deletePopupAction: mocks.deletePopup,
}));

vi.mock('@/app/components/layout/page-header', () => ({
  PageHeader: ({ title }: any) => <h1>{title}</h1>,
}));
vi.mock('@/components/ui/hub/HubHeader', () => ({
  HubHeader: ({ title, actions }: any) => <header>{title}{actions}</header>,
}));
vi.mock('@/components/ui/hub/HubSectionCard', () => ({
  HubSectionCard: ({ title, children }: any) => <section><h2>{title}</h2>{children}</section>,
}));
vi.mock('@/components/ui/hub/HubMetrics', () => ({
  HubMetricGrid: ({ children }: any) => <div>{children}</div>,
  HubMetricCard: ({ title, value }: any) => <span>{title}: {value}</span>,
}));
vi.mock('@/components/ui/hub/HubStatusBadge', () => ({
  HubStatusBadge: ({ status }: any) => <span>{status}</span>,
}));
vi.mock('@/app/components/ui/attachment-image', () => ({
  AttachmentImage: ({ alt }: any) => <span role="img" aria-label={alt} />,
}));
vi.mock('@/app/components/ui/standard-file-uploader', () => ({
  StandardFileUploader: ({ onFilesChange }: any) => (
    <button type="button" onClick={() => onFilesChange([new File(['image'], 'asset.png', { type: 'image/png' })])}>
      테스트 파일 선택
    </button>
  ),
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ columns, data, onRetry, pagination }: any) => (
    <div>
      {data.map((item: any, rowIndex: number) => (
        <div key={rowIndex}>
          {columns.map((column: any, columnIndex: number) => (
            <div key={columnIndex}>{column.accessor(item)}</div>
          ))}
        </div>
      ))}
      <button type="button" onClick={onRetry}>목록 재시도</button>
      <button type="button" onClick={() => pagination.onPageChange(2)}>다음 페이지</button>
    </div>
  ),
}));

const banner = {
  bnrSn: 101,
  bnrNm: '메인 배너',
  linkUrl: '/main',
  sortOrdr: 2,
  rfltYn: 'Y',
  bnrExpln: '메인 설명',
  atchFileSn: 77,
  bnrImgNm: 'main.png',
};
const popup = {
  popupSn: 202,
  popupTtlNm: '긴급 공지',
  ntceBgnde: '2026-08-20',
  ntceEndde: '2026-08-31',
  popupWdthPstn: '10',
  popupVrtcPstn: '20',
  popupWdthSz: '500',
  popupVrtcSz: '400',
  ntceYn: 'N',
  stopvewSetupYn: 'Y',
  fileUrl: '/api/v1/files/88',
};

function renderClient(query = '') {
  mocks.query = query;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <BannerAdminClient initialBanners={[]} initialPopups={[]} />
    </QueryClientProvider>,
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

describe('BannerAdminClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query = '';
    mocks.confirm.mockResolvedValue(true);
    mocks.getBanners.mockResolvedValue({ list: [banner], total: 21, totalPage: 2 });
    mocks.getPopups.mockResolvedValue({ list: [popup], total: 12, totalPage: 1 });
    // [2026-09-03] 종전 mock 은 `{ data: { data: 999 } }` 를 돌려줬다 — **서비스가 만들 수 없는
    //   형태**다. `fileAdminService.uploadFiles` 는 `Promise<number>` 로 선언돼 있고
    //   생성 클라이언트(`parseGeneratedOperationResponse`)가 envelope 을 언랩·검증한 뒤 값만
    //   돌려주기 때문이다. 그 mock 때문에 화면의 `?.data?.data || ?.data || uploadRes` 3중 짐작이
    //   **필요한 것처럼 보였고**, 짐작을 지우면 테스트가 깨지는 구조였다(false-green).
    //   계약대로 number 를 돌려주고, 단언(atchFileSn 999 · fileUrl /api/v1/files/999)은 그대로 둔다.
    mocks.upload.mockResolvedValue(UPLOADED_FILE_SN);
    mocks.saveBanner.mockResolvedValue({ success: true, message: '배너 저장 완료' });
    mocks.deleteBanner.mockResolvedValue({ success: true, message: '배너 삭제 완료' });
    mocks.savePopup.mockResolvedValue({ success: true, message: '팝업 저장 완료' });
    mocks.deletePopup.mockResolvedValue({ success: true, message: '팝업 삭제 완료' });
  });

  it('loads banner assets, edits, deletes and preserves one-based URL paging', async () => {
    renderClient();

    expect(await screen.findByText('메인 배너')).toBeInTheDocument();
    // [2026-08-25 A1 이행] 지표 카드 4장이 셸 총계 + 툴바 한 줄 요약으로 수렴했다.
    const toolbar = screen.getByTestId('work-list-toolbar');
    expect(toolbar).toHaveTextContent('총 21건');
    expect(toolbar).toHaveTextContent('배너 21');
    expect(toolbar).toHaveTextContent('팝업 12');
    expect(screen.getByRole('img', { name: '메인 배너 배너 이미지' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '메인 배너 배너 수정' }));
    expect(screen.getByRole('region', { name: '배너 명세 수정' })).toHaveTextContent('기존 파일 식별자');
    fireEvent.click(screen.getByRole('button', { name: '취소' }));

    fireEvent.click(screen.getByRole('button', { name: '메인 배너 배너 삭제' }));
    await waitFor(() => expect(mocks.deleteBanner).toHaveBeenCalledWith(null, 101));
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('메인 배너') }));

    fireEvent.click(screen.getByRole('button', { name: '다음 페이지' }));
    expect(mocks.replace).toHaveBeenCalledWith('/admin/system/banner?tab=banner&page=2', { scroll: false });
    fireEvent.click(screen.getByRole('button', { name: /팝업 설정/ }));
    expect(mocks.replace).toHaveBeenCalledWith('/admin/system/banner?tab=popup&page=1', { scroll: false });
  });

  it('uploads and creates a banner through the validated form action', async () => {
    renderClient();
    fireEvent.click(screen.getByRole('button', { name: /신규 배너 등록/ }));
    fireEvent.click(screen.getByRole('button', { name: '테스트 파일 선택' }));
    fireEvent.click(screen.getByRole('button', { name: /운영 배포/ }));

    await waitFor(() => expect(mocks.saveBanner).toHaveBeenCalledWith(null, expect.objectContaining({
      mode: 'create',
      data: expect.objectContaining({ atchFileSn: 999, bnrImgNm: 'asset.png' }),
    })));
    expect(mocks.toast).toHaveBeenCalledWith('배너 저장 완료', 'success');
  });

  it('loads popup metadata and covers edit, delete and uploaded file save', async () => {
    renderClient('tab=popup&page=1');

    expect(await screen.findByText('긴급 공지')).toBeInTheDocument();
    expect(screen.getByText(/500px x 400px/)).toBeInTheDocument();
    expect(screen.getByText('대기 중')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '긴급 공지 팝업 수정' }));
    expect(screen.getByRole('region', { name: '팝업 아키텍처 수정' })).toHaveTextContent('/api/v1/files/88');
    fireEvent.click(screen.getByRole('button', { name: '취소' }));

    fireEvent.click(screen.getByRole('button', { name: '긴급 공지 팝업 삭제' }));
    await waitFor(() => expect(mocks.deletePopup).toHaveBeenCalledWith(null, 202));

    fireEvent.click(screen.getByRole('button', { name: /신규 팝업 등록/ }));
    fireEvent.click(screen.getByRole('button', { name: '테스트 파일 선택' }));
    fireEvent.click(screen.getByRole('button', { name: /운영 배포/ }));
    await waitFor(() => expect(mocks.savePopup).toHaveBeenCalledWith(null, expect.objectContaining({
      mode: 'create',
      data: expect.objectContaining({ fileUrl: '/api/v1/files/999' }),
    })));
  });

  it('does not delete when confirmation is declined', async () => {
    mocks.confirm.mockResolvedValue(false);
    renderClient();
    expect(await screen.findByText('메인 배너')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '메인 배너 배너 삭제' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalled());
    expect(mocks.deleteBanner).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: '배너',
      query: '',
      buttonName: '메인 배너 배너 삭제',
      pendingName: '메인 배너 배너 삭제 중…',
      editName: '메인 배너 배너 수정',
      createName: /신규 배너 등록/,
      deleteMock: mocks.deleteBanner,
      expectedId: 101,
    },
    {
      label: '팝업',
      query: 'tab=popup&page=1',
      buttonName: '긴급 공지 팝업 삭제',
      pendingName: '긴급 공지 팝업 삭제 중…',
      editName: '긴급 공지 팝업 수정',
      createName: /신규 팝업 등록/,
      deleteMock: mocks.deletePopup,
      expectedId: 202,
    },
  ])('$label 삭제는 같은 tick 중복 실행을 막고 pending·실패를 안내한다', async ({
    query,
    buttonName,
    pendingName,
    editName,
    createName,
    deleteMock,
    expectedId,
  }) => {
    const pending = deferred<{ success: boolean; message: string }>();
    deleteMock.mockReturnValueOnce(pending.promise);
    renderClient(query);
    const deleteButton = await screen.findByRole('button', { name: buttonName });

    act(() => {
      deleteButton.click();
      deleteButton.click();
    });

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(deleteMock).toHaveBeenCalledTimes(1));
    expect(deleteMock).toHaveBeenCalledWith(null, expectedId);
    const pendingButton = screen.getByRole('button', { name: pendingName });
    expect(pendingButton).toBeDisabled();
    expect(pendingButton).toHaveAttribute('aria-busy', 'true');
    const editButton = screen.getByRole('button', { name: editName });
    const createButton = screen.getByRole('button', { name: createName });
    expect(editButton).toBeDisabled();
    expect(createButton).toBeDisabled();
    fireEvent.click(editButton);
    fireEvent.click(createButton);
    expect(screen.queryByRole('region', { name: /수정|등록|설계/ })).not.toBeInTheDocument();

    await act(async () => pending.reject(new Error('delete failed')));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('자산 삭제 처리 중 예외가 발생했습니다.', 'error'));
    expect(editButton).toBeEnabled();
    expect(createButton).toBeEnabled();
  });
});
