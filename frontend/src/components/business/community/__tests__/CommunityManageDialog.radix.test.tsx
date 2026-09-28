import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunityManageDialog } from '../CommunityManageDialog';

const mocks = vi.hoisted(() => ({ updateCommunity: vi.fn(), getTemplateList: vi.fn() }));
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
  },
}));
vi.mock('@/services/foundation/system/TemplateAdminService', () => ({
  templateAdminService: { getTemplateList: mocks.getTemplateList },
}));

describe('CommunityManageDialog 실제 Radix 템플릿 선택', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateCommunity.mockResolvedValue(undefined);
    mocks.getTemplateList.mockResolvedValue([
      { tmpltId: 'ACTIVE', tmpltNm: '활성 템플릿', useYn: 'Y' },
      { tmpltId: 'OLD_OFF', tmpltNm: '비활성 템플릿', useYn: 'N' },
    ]);
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
});
