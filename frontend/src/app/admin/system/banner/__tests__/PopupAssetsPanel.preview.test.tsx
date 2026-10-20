import type { ReactElement, ReactNode } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BannerAdminClient from '../BannerAdminClient';
import { NOTICE_POPUP_FRAME_CLASS, NOTICE_POPUP_PANEL_CLASS } from '@/app/components/dashboard/PopupManager';
import type { Popup } from '@/types/foundation/banner';

/**
 * [2026-10-20] 팝업 편집의 사용자 화면 미리보기.
 *
 * 종전에는 좌표·크기를 숫자로만 받아 실제 모습을 알 수 없었다. 미리보기는 사용자 화면의 대화상자가 그리는 패널(NoticePopupPanel)을
 * 그대로 데스크톱·휴대폰 크기의 틀에 넣는다 — 이 시험은 같은 패널·같은 자리 규칙을 쓰는지, 입력 중인 값을 따라가는지, 그림일 뿐이라
 * 조작·보조기술 대상이 아닌지를 고정한다.
 */
const mocks = vi.hoisted(() => ({
  query: 'tab=popup',
  getBanners: vi.fn(),
  getPopups: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { permissions: ['POPUP_CREATE', 'POPUP_UPDATE', 'POPUP_DELETE', 'FILE_UPLOAD_ALL'], authorizationVersion: 'v1' } }),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/system/banner',
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(mocks.query),
}));
vi.mock('next/dynamic', () => ({
  default: () => function TestModal({ children, footer, isOpen, title }: { children: ReactNode; footer?: ReactNode; isOpen: boolean; title: string }) {
    return isOpen ? <section aria-label={title}>{children}{footer}</section> : null;
  },
}));
vi.mock('next/image', () => ({ default: ({ alt, src }: { alt: string; src: string }) => <span data-testid="preview-image" data-src={src}>{alt}</span> }));
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ actions, children, title }: { actions?: ReactNode; children: ReactNode; title: string }) => <main><h1>{title}</h1>{actions}{children}</main>,
}));
// 행의 수정 단추는 표의 열 accessor 안에 산다 — 열을 실제로 그리는 표 대역이어야 수정 창을 열 수 있다.
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ columns, data }: {
    columns: Array<{ accessor: string | ((item: never, index: number) => ReactNode) }>;
    data: Array<Record<string, unknown>>;
  }) => (
    <table>
      <tbody>
        {data.map((item, rowIndex) => (
          <tr key={rowIndex}>
            {columns.map((column, columnIndex) => (
              <td key={columnIndex}>
                {typeof column.accessor === 'function' ? column.accessor(item as never, rowIndex) : String(item[column.accessor] ?? '')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));
vi.mock('@/app/components/ui/standard-file-uploader', () => ({
  StandardFileUploader: () => <input type="file" aria-label="파일 첨부 선택" />,
}));
vi.mock('@/app/components/ui/attachment-image', () => ({
  AttachmentImage: ({ alt, atchFileSn }: { alt: string; atchFileSn: number }) => <span data-testid="preview-attachment" data-sn={atchFileSn}>{alt}</span>,
  extractAtchFileSn: (url?: string | null) => {
    const match = /^\/api\/v1\/files\/(\d+)$/.exec(url ?? '');
    return match ? Number(match[1]) : null;
  },
}));
// 실제 Radix Select 는 jsdom 에서 닫힌 상태의 숨은 select 가 기본값이 아닌 값을 빈 값으로 되돌린다(브라우저와 다르다) — 배너 시험처럼 대역을 둔다.
vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span>선택값</span>,
}));
vi.mock('@/components/ui/hub/HubStatusBadge', () => ({ HubStatusBadge: ({ status }: { status: string }) => <span>{status}</span> }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => vi.fn() }));
vi.mock('@/services/foundation/system/BannerAdminService', () => ({
  bannerAdminService: { getBannerList: (...args: unknown[]) => mocks.getBanners(...args) },
}));
vi.mock('@/services/foundation/system/PopupAdminService', () => ({
  popupAdminService: { getPopupList: (...args: unknown[]) => mocks.getPopups(...args) },
}));
vi.mock('@/services/foundation/system/FileAdminService', () => ({ fileAdminService: { uploadFiles: vi.fn() } }));
vi.mock('@/app/actions/promotionActions', () => ({
  deleteBannerAction: vi.fn(), deletePopupAction: vi.fn(), saveBannerAction: vi.fn(), savePopupAction: vi.fn(),
}));

const EMPTY_PAGE = { list: [], total: 0, page: 1, size: 20, totalPage: 1 };
const SAVED_POPUP: Popup = {
  popupSn: 5, popupTtlNm: '저장된 공지', fileUrl: '/api/v1/files/77', popupWdthPstn: '30', popupVrtcPstn: '40',
  popupWdthSz: '500', popupVrtcSz: '350', ntceBgnde: '2026-10-01', ntceEndde: '2026-10-31', stopvewSetupYn: 'N', ntceYn: 'Y', version: 1,
};

function renderWithClient(node: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>);
}

const frame = (id: 'desktop' | 'phone') => screen.getByTestId(`popup-preview-${id}-frame`);

describe('팝업 편집 미리보기', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getBanners.mockResolvedValue(EMPTY_PAGE);
    mocks.getPopups.mockResolvedValue({ ...EMPTY_PAGE, list: [SAVED_POPUP], total: 1 });
  });

  it('사용자 화면과 같은 패널을 데스크톱·휴대폰 크기의 틀에 그리고, 입력 중인 제목·좌표·크기를 따라간다', () => {
    renderWithClient(<BannerAdminClient initialBanners={[]} initialPopups={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /신규 팝업 등록/ }));
    const modal = screen.getByRole('region', { name: '신규 레이어 팝업 설계' });
    expect(within(modal).getByRole('region', { name: '사용자 화면 미리보기' })).toBeInTheDocument();

    fireEvent.change(within(modal).getByRole('textbox', { name: /팝업 타이틀/ }), { target: { value: '긴급 점검 공지' } });
    fireEvent.change(within(modal).getByRole('spinbutton', { name: /가로 좌표/ }), { target: { value: '2000' } });
    fireEvent.change(within(modal).getByRole('spinbutton', { name: /가로 폭/ }), { target: { value: '640' } });

    for (const [id, width, height] of [['desktop', 1280, 800], ['phone', 360, 740]] as const) {
      const box = frame(id);
      // 틀은 패널 자리의 기준(size 컨테이너)이고, 줄이기 전 화면 크기를 그대로 갖는다.
      expect(box.className).toContain(NOTICE_POPUP_FRAME_CLASS);
      expect(box.style.width).toBe(`${width}px`);
      expect(box.style.height).toBe(`${height}px`);
      const panel = within(box).getByTestId('notice-popup-panel');
      expect(panel.className).toBe(NOTICE_POPUP_PANEL_CLASS);
      expect(panel).toHaveTextContent('긴급 점검 공지');
      expect(panel.style.getPropertyValue('--popup-x')).toBe('2000px');
      expect(panel.style.getPropertyValue('--popup-w')).toBe('640px');
    }
  });

  it('미리보기는 그림일 뿐이다 — 단추를 누를 수 없고 보조기술에 두 번 읽히지 않는다', () => {
    renderWithClient(<BannerAdminClient initialBanners={[]} initialPopups={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /신규 팝업 등록/ }));
    const modal = screen.getByRole('region', { name: '신규 레이어 팝업 설계' });

    for (const id of ['desktop', 'phone'] as const) {
      expect(frame(id)).toHaveAttribute('aria-hidden', 'true');
      expect(frame(id)).toHaveAttribute('inert');
    }
    // 창의 단추는 저장·취소뿐이다 — 미리보기 패널의 닫기·오늘 하루 보지 않기는 역할 조회에 잡히지 않는다.
    expect(within(modal).queryByRole('button', { name: '오늘 하루 보지 않기' })).not.toBeInTheDocument();
    expect(within(modal).queryByRole('button', { name: '닫기' })).not.toBeInTheDocument();
    expect(screen.getByText(/데스크톱 화면 \(1280×800\)/)).toBeInTheDocument();
    expect(screen.getByText(/휴대폰 화면 \(360×740\)/)).toBeInTheDocument();
  });

  it('수정 창의 미리보기는 저장된 그림과 다시보지않기 설정을 그대로 그린다', async () => {
    renderWithClient(<BannerAdminClient initialBanners={[]} initialPopups={[SAVED_POPUP]} />);
    fireEvent.click(await screen.findByRole('button', { name: '저장된 공지 팝업 수정' }));
    expect(screen.getByRole('region', { name: '팝업 아키텍처 수정' })).toBeInTheDocument();
    const panel = within(frame('desktop')).getByTestId('notice-popup-panel');

    expect(within(panel).getByTestId('preview-attachment')).toHaveAttribute('data-sn', '77');
    // 관리자가 다시보지않기 처리를 껐다 — 사용자 화면처럼 '오늘 하루 보지 않기' 가 없다. 창을 열 때 폼을 저장값으로 채운 뒤에 그린다.
    await waitFor(() => expect(within(frame('desktop')).getByTestId('notice-popup-panel')).not.toHaveTextContent('오늘 하루 보지 않기'));
    expect(within(frame('desktop')).getByTestId('notice-popup-panel').style.getPropertyValue('--popup-h')).toBe('350px');
  });
});
