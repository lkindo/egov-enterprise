import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunityManageDialog } from '../CommunityManageDialog';

const mocks = vi.hoisted(() => ({ updateCommunity: vi.fn(), getTemplateOptions: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { permissions: ['COMMUNITY_READ_ALL', 'COMMUNITY_UPDATE_ALL'], authorizationVersion: 'v1' } }),
}));
vi.mock('next/dynamic', () => ({
  default: () => function TestModal({ children, footer, isOpen }: { children: ReactNode; footer?: ReactNode; isOpen: boolean }) {
    return isOpen ? <section>{children}{footer}</section> : null;
  },
}));
vi.mock('@/services/foundation/system/CommunityAdminService', () => ({
  communityAdminService: {
    getCommunityList: vi.fn().mockResolvedValue({
      list: [{ cmntySn: 11, cmntyNm: '기존 모임', cmntyIntrcn: '소개', useYn: 'Y', tmpltId: 'OLD_OFF', editable: true }],
      total: 1, page: 0, size: 10, totalPage: 1,
    }),
    updateCommunity: mocks.updateCommunity,
    getTemplateOptions: mocks.getTemplateOptions,
  },
}));

describe('CommunityManageDialog 실제 Radix 템플릿 선택', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateCommunity.mockResolvedValue(undefined);
    // 후보는 서버가 사용 중인 항목만 준다(DEC-OPS-280). 기존 비활성 값 OLD_OFF 는 후보에 없다.
    mocks.getTemplateOptions.mockResolvedValue({ available: true, templates: [{ tmpltId: 'ACTIVE', tmpltNm: '활성 템플릿' }] });
  });

  it('편집 때 동적으로 나타나는 비활성 기존 항목이 native select 이벤트로 지워지지 않고 그대로 저장된다', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const rendered = render(<QueryClientProvider client={client}><CommunityManageDialog isOpen onClose={vi.fn()} /></QueryClientProvider>);
    fireEvent.click(await screen.findByRole('button', { name: '기존 모임 수정' }));
    await waitFor(() => expect(screen.getByRole('combobox', { name: '템플릿' })).toHaveTextContent('OLD_OFF'));
    // 실제 Radix의 hidden native bridge가 동적 항목 등록 전 보내는 비선택 빈 값.
    // 브라우저 E2E의 기존 값 소실을 이 이벤트 경계에서 직접 재현한다.
    const nativeSelect = rendered.container.querySelector('select[aria-hidden="true"]');
    expect(nativeSelect).not.toBeNull();
    fireEvent.change(nativeSelect!, { target: { value: '' } });
    await waitFor(() => expect(screen.getByRole('combobox', { name: '템플릿' })).toHaveTextContent('OLD_OFF'));
    fireEvent.click(screen.getByRole('button', { name: '수정 저장' }));
    await waitFor(() => expect(mocks.updateCommunity).toHaveBeenCalledWith(11,
      expect.objectContaining({ tmpltId: 'OLD_OFF' })));
  });

  it('명시적으로 템플릿 없음을 고르면 기존 값을 해제할 수 있다', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><CommunityManageDialog isOpen onClose={vi.fn()} /></QueryClientProvider>);
    fireEvent.click(await screen.findByRole('button', { name: '기존 모임 수정' }));
    const select = screen.getByRole('combobox', { name: '템플릿' });
    await waitFor(() => expect(select).toHaveTextContent('OLD_OFF'));
    fireEvent.click(select);
    fireEvent.click(await screen.findByRole('option', { name: '템플릿 없음' }));
    await waitFor(() => expect(select).toHaveTextContent('템플릿 없음'));
    fireEvent.click(screen.getByRole('button', { name: '수정 저장' }));
    await waitFor(() => expect(mocks.updateCommunity).toHaveBeenCalledWith(11,
      expect.objectContaining({ tmpltId: undefined })));
  });

  it('대량 후보에서 렌더링을 제한하고 검색으로 뒷부분의 값을 선택해 저장한다', async () => {
    mocks.getTemplateOptions.mockResolvedValue({
      available: true,
      templates: Array.from({ length: 9000 }, (_, index) => ({
        tmpltId: `OPTION_${index + 1}`,
        tmpltNm: `템플릿 ${index + 1}`,
      })),
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const rendered = render(<QueryClientProvider client={client}><CommunityManageDialog isOpen onClose={vi.fn()} /></QueryClientProvider>);
    fireEvent.click(await screen.findByRole('button', { name: '기존 모임 수정' }));
    const search = await screen.findByRole('textbox', { name: '템플릿 이름 또는 ID 검색' });
    const select = screen.getByRole('combobox', { name: '템플릿' });
    expect(select).toHaveTextContent('OLD_OFF');

    fireEvent.click(select);
    expect(await screen.findByRole('option', { name: /^템플릿 1$/ })).toBeVisible();
    expect(screen.getAllByRole('option')).toHaveLength(52);
    expect(rendered.container.querySelectorAll('select:has(option[value="__none__"]) option')).toHaveLength(52);
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: '템플릿 목록 다음 페이지' }));
    fireEvent.click(select);
    expect(await screen.findByRole('option', { name: /^템플릿 51$/ })).toBeVisible();
    expect(screen.queryByRole('option', { name: /^템플릿 1$/ })).toBeNull();
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });

    fireEvent.change(search, { target: { value: 'option_9000' } });
    fireEvent.click(select);
    fireEvent.click(await screen.findByRole('option', { name: '템플릿 9000' }));
    fireEvent.change(search, { target: { value: 'OPTION_1' } });
    expect(select).toHaveTextContent('템플릿 9000');
    fireEvent.click(screen.getByRole('button', { name: '수정 저장' }));
    await waitFor(() => expect(mocks.updateCommunity).toHaveBeenCalledWith(11,
      expect.objectContaining({ tmpltId: 'OPTION_9000' })));
  });
});
