import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunityManageDialog } from '../CommunityManageDialog';

/**
 * 🏘 커뮤니티 관리 다이얼로그 계약 (DEC-OPS-037, 감사 D07-01).
 *
 * 서버 DELETE 는 useYn='N' 논리 삭제라 화면 동사는 '폐쇄' 이고, 폐쇄된 커뮤니티는 '사용 안 함' 으로 남아
 * 다시 폐쇄할 수 없다(버튼 disabled). 등록은 useYn='Y' 를 싣고, 수정은 cmntySn 경로로 사용 여부까지 보낸다.
 * 폐쇄는 확인 후 한 번만 부르고 pending 동안 disabled·aria-busy 이며 실패는 토스트로 드러난다.
 */
const mocks = vi.hoisted(() => ({
  getCommunityList: vi.fn(),
  createCommunity: vi.fn(),
  updateCommunity: vi.fn(),
  deleteCommunity: vi.fn(),
  getTemplateList: vi.fn(),
  confirm: vi.fn(),
  toast: vi.fn(),
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
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: { value?: string; onValueChange: (value: string) => void; children: ReactNode }) => (
    <select data-testid="mock-select" value={value ?? ''} onChange={(event) => onValueChange(event.target.value)}>{children}</select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => <option value={value}>{children}</option>,
}));
vi.mock('@/services/foundation/system/CommunityAdminService', () => ({
  communityAdminService: {
    getCommunityList: mocks.getCommunityList,
    createCommunity: mocks.createCommunity,
    updateCommunity: mocks.updateCommunity,
    deleteCommunity: mocks.deleteCommunity,
  },
}));
vi.mock('@/services/foundation/system/TemplateAdminService', () => ({
  templateAdminService: { getTemplateList: mocks.getTemplateList },
}));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));

const communities = [
  { cmntySn: 11, cmntyNm: '독서 모임', cmntyIntrcn: '책을 읽습니다', useYn: 'Y', tmpltId: 'TMPL01' },
  { cmntySn: 12, cmntyNm: '폐쇄된 모임', cmntyIntrcn: '', useYn: 'N' },
];

function renderDialog() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CommunityManageDialog isOpen onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('CommunityManageDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCommunityList.mockResolvedValue({ list: communities, total: 2, page: 0, size: 10, totalPage: 1 });
    mocks.getTemplateList.mockResolvedValue([{ tmpltId: 'TMPL01', tmpltNm: '기본 템플릿' }]);
    mocks.createCommunity.mockResolvedValue({ cmntySn: 13 });
    mocks.updateCommunity.mockResolvedValue(undefined);
    mocks.deleteCommunity.mockResolvedValue(undefined);
    mocks.confirm.mockResolvedValue(true);
  });

  it('사용 여부를 드러내고, 이미 폐쇄된 커뮤니티는 다시 폐쇄할 수 없다', async () => {
    renderDialog();
    const list = await screen.findByRole('list', { name: '커뮤니티 목록' });
    expect(within(list).getByText('사용')).toBeInTheDocument();
    expect(within(list).getByText('사용 안 함')).toBeInTheDocument();
    expect(within(list).getByRole('button', { name: '폐쇄된 모임 폐쇄' })).toBeDisabled();
    expect(within(list).getByRole('button', { name: '독서 모임 폐쇄' })).not.toBeDisabled();
    expect(mocks.getCommunityList).toHaveBeenCalledWith({ page: 0, size: 10 });
  });

  it('등록은 useYn=Y 를 싣고 빈 소개는 빈 문자열로 보낸다', async () => {
    const user = userEvent.setup();
    renderDialog();
    await screen.findByRole('list', { name: '커뮤니티 목록' });
    await user.type(screen.getByRole('textbox', { name: /커뮤니티 이름/ }), '등산 모임');
    await user.click(screen.getByRole('button', { name: '커뮤니티 등록' }));

    await waitFor(() => expect(mocks.createCommunity).toHaveBeenCalledTimes(1));
    expect(mocks.createCommunity).toHaveBeenCalledWith({ cmntyNm: '등산 모임', cmntyIntroCn: '', tmpltId: undefined, useYn: 'Y' });
    expect(mocks.toast).toHaveBeenCalledWith('커뮤니티를 등록했습니다.', 'success');
  });

  it('빈 이름은 서버를 부르지 않는다', async () => {
    const user = userEvent.setup();
    renderDialog();
    await screen.findByRole('list', { name: '커뮤니티 목록' });
    await user.click(screen.getByRole('button', { name: '커뮤니티 등록' }));
    expect(await screen.findAllByText('커뮤니티 이름을 입력하세요.')).not.toHaveLength(0);
    expect(mocks.createCommunity).not.toHaveBeenCalled();
  });

  it('수정은 cmntySn 경로로 사용 여부까지 보낸다 — 폐쇄된 커뮤니티를 다시 열 수 있다', async () => {
    const user = userEvent.setup();
    renderDialog();
    const list = await screen.findByRole('list', { name: '커뮤니티 목록' });
    await user.click(within(list).getByRole('button', { name: '폐쇄된 모임 수정' }));
    expect(screen.getByRole('form', { name: '커뮤니티 수정' })).toBeInTheDocument();
    const selects = screen.getAllByTestId('mock-select');
    // 첫 select 는 템플릿, 둘째는 사용 여부(수정 모드에서만 나타난다)
    await user.selectOptions(selects[1], 'Y');
    await user.click(screen.getByRole('button', { name: '수정 저장' }));

    await waitFor(() => expect(mocks.updateCommunity).toHaveBeenCalledTimes(1));
    expect(mocks.updateCommunity).toHaveBeenCalledWith(12, { cmntyNm: '폐쇄된 모임', cmntyIntroCn: '', tmpltId: undefined, useYn: 'Y' });
    expect(mocks.createCommunity).not.toHaveBeenCalled();
  });

  it('폐쇄는 확인 뒤 한 번만 부르고 pending 동안 disabled·aria-busy 이며, 실패는 토스트로 드러내고 행을 남긴다', async () => {
    let rejectClose: (reason?: unknown) => void = () => undefined;
    mocks.deleteCommunity.mockImplementation(() => new Promise<void>((_resolve, reject) => { rejectClose = reject; }));
    renderDialog();
    const list = await screen.findByRole('list', { name: '커뮤니티 목록' });
    const closeButton = within(list).getByRole('button', { name: '독서 모임 폐쇄' });
    fireEvent.dblClick(closeButton);
    fireEvent.click(closeButton);

    await waitFor(() => expect(mocks.deleteCommunity).toHaveBeenCalledTimes(1));
    expect(mocks.deleteCommunity).toHaveBeenCalledWith(11);
    expect(closeButton).toBeDisabled();
    expect(closeButton).toHaveAttribute('aria-busy', 'true');
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: '커뮤니티 폐쇄', confirmText: '폐쇄', variant: 'destructive' }));

    await act(async () => rejectClose(new Error('network')));
    // extractErrorMessage 는 서버/오류 원문 메시지를 우선한다 — 문구가 아니라 '오류 토스트가 났다' 는 사실을 본다.
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.any(String), 'error'));
    expect(within(list).getByText('독서 모임')).toBeInTheDocument();
    await waitFor(() => expect(within(list).getByRole('button', { name: '독서 모임 폐쇄' })).not.toBeDisabled());
  });

  it('폐쇄 성공은 토스트를 내고 목록을 다시 읽는다', async () => {
    const user = userEvent.setup();
    renderDialog();
    const list = await screen.findByRole('list', { name: '커뮤니티 목록' });
    await user.click(within(list).getByRole('button', { name: '독서 모임 폐쇄' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('커뮤니티를 폐쇄했습니다.', 'success'));
    await waitFor(() => expect(mocks.getCommunityList).toHaveBeenCalledTimes(2));
  });
});
