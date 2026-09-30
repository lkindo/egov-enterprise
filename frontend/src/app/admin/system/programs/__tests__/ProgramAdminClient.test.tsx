import { render,  screen,  fireEvent,  waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// 1. Mock Next.js config
vi.mock('next/config', () => ({
  default: () => ({ publicRuntimeConfig: {}, serverRuntimeConfig: {} }),
}));

// 3. Mock Next.js Navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn().mockReturnValue('') }),
  // [2026-08-24 A1 이행] WorkListPage 의 브레드크럼이 현재 경로를 읽는다.
  usePathname: () => '/admin/system/programs',
}));

// 브레드크럼은 메뉴 SSOT 를 조회한다 — 이 테스트의 대상이 아니므로 응답을 고정한다.
vi.mock('@/services/business/user/MenuService', () => ({
  menuService: { getHeadMenus: vi.fn().mockResolvedValue([]) },
}));

// 4. Mock UI components directly
vi.mock('@/components/ui/hub/HubHeader', () => ({
  HubHeader: ({ title, actions }: any) => <div data-testid="hub-header"><h2>{title}</h2>{actions}</div>
}));
vi.mock('@/components/ui/hub/HubSectionCard', () => ({
  HubSectionCard: ({ title, children }: any) => <div data-testid="section-card"><h3>{title}</h3>{children}</div>
}));
vi.mock('@/app/components/layout/page-header', () => ({
  PageHeader: ({ title }: any) => <div data-testid="page-header"><h1>{title}</h1></div>
}));
vi.mock('@/app/components/ui/standard-modal', () => ({
  StandardModal: ({ children, isOpen, title, footer }: any) => isOpen ? (
    <div data-testid="standard-modal">
      <h2>{title}</h2>
      {children}
      <div data-testid="modal-footer">{footer}</div>
    </div>
  ) : null
}));
// 행 액션(수정·삭제)의 표시 판정을 보려면 컬럼 accessor 를 실제로 렌더해야 한다.
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ data, columns }: any) => (
    <div data-testid="data-table">
      {data?.length || 0} items
      {(data || []).map((row: any) => (
        <div key={row.prgrmFileNm}>{columns.map((column: any) => <span key={column.header}>{column.accessor(row)}</span>)}</div>
      ))}
    </div>
  )
}));
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => <>{children}</>,
  TooltipContent: () => null,
}));

// 쓰기 버튼은 그 동작의 기능 권한으로 보인다 — 기본은 모든 쓰기 권한을 가진 관리자이고, 표시 판정 테스트만 권한을 줄인다.
const FULL_PERMISSIONS = ['PROGRAM_READ', 'PROGRAM_CREATE', 'PROGRAM_UPDATE', 'PROGRAM_DELETE'];
const auth = vi.hoisted(() => ({ permissions: [] as string[] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { permissions: auth.permissions, authorizationVersion: 'v1' } }) }));

import ProgramAdminClient from '../ProgramAdminClient';

describe('ProgramAdminClient Component', () => {
  const mockInitialData = {
    list: [
      { prgrmFileNm: 'PROG_1', prgrmKornNm: '프로그램_하나', url: '/url/1', prgrmStrgPath: '/path/1', prgrmExpln: 'Desc 1' },
    ],
    total: 1
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    auth.permissions = FULL_PERMISSIONS;
  });

  it('renders correctly', () => {
    render(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
    // [2026-08-24 A1 이행] HubHeader 대신 WorkListPage 셸이 제목과 결과 툴바를 소유한다.
    expect(screen.getByRole('heading', { level: 1, name: '시스템 프로그램 관리' })).toBeInTheDocument();
    expect(screen.getByTestId('work-list-toolbar')).toBeInTheDocument();
  });

  it('opens registration modal', async () => {
    render(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
    fireEvent.click(screen.getByText(/신규 등록/i));
    
    await waitFor(() => {
      expect(screen.getByTestId('standard-modal')).toBeInTheDocument();
      expect(screen.getByText(/신규 프로그램 등록/i)).toBeInTheDocument();
    });
  });

  /*
   * [2026-10-01] 쓰기 버튼은 그 동작의 기능 권한으로 보인다.
   * 이 화면은 PROGRAM_READ 만으로 들어올 수 있어, 종전에는 조회만 맡은 담당자에게도 등록·수정·삭제가 모두 보였다.
   */
  it('모든 쓰기 권한이 있으면 신규 등록과 행의 수정·삭제가 보인다', () => {
    render(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
    expect(screen.getByRole('button', { name: /신규 등록/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '프로그램_하나 프로그램 수정' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '프로그램_하나 프로그램 삭제' })).toBeInTheDocument();
  });

  it('조회 권한만 있으면 신규 등록·수정·삭제를 보이지 않는다', () => {
    auth.permissions = ['PROGRAM_READ'];
    render(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);

    // 목록은 그대로 읽힌다 — 가리는 것은 쓰기 동작뿐이다.
    expect(screen.getByText('프로그램_하나')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /신규 등록/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '프로그램_하나 프로그램 수정' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '프로그램_하나 프로그램 삭제' })).not.toBeInTheDocument();
  });

  it('수정 권한만 있으면 수정 폼 안의 삭제 버튼도 보이지 않는다', async () => {
    auth.permissions = ['PROGRAM_READ', 'PROGRAM_UPDATE'];
    render(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
    expect(screen.queryByRole('button', { name: '프로그램_하나 프로그램 삭제' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '프로그램_하나 프로그램 수정' }));
    expect(await screen.findByText('프로그램 정보 수정')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /시스템 동기화/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '프로그램 삭제' })).not.toBeInTheDocument();
  });

  it('삭제 권한까지 있으면 수정 폼에 삭제 버튼이 보인다', async () => {
    render(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
    fireEvent.click(screen.getByRole('button', { name: '프로그램_하나 프로그램 수정' }));
    expect(await screen.findByRole('button', { name: '프로그램 삭제' })).toBeInTheDocument();
  });
});
