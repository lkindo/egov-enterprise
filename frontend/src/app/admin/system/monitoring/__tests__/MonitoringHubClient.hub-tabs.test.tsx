import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Zap } from 'lucide-react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 감시 허브 셸의 기여 탭 호스트 계약(허브 분해 H3). 셸 고유 탭은 로그 셋·가동 상태이고 부가 탭은 hub-tabs-monitoring 레지스트리에서 온다 —
 * 여기서는 레지스트리를 가짜 기여로 바꿔 셸이 하는 일만 본다. 실제 하네스 탭은 허브 시험과 동등성 그물이 실제 레지스트리로 본다.
 */

const CORE_TABS = ['시스템 로그(감사 보기)', '시스템 로그', '로그인 시도 이력', '가동 상태'];

const mocks = vi.hoisted(() => ({ query: '', replace: vi.fn(), tabs: [] as unknown[] }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, push: vi.fn() }),
  usePathname: () => '/admin/system/monitoring/hub',
  useSearchParams: () => new URLSearchParams(mocks.query),
}));
vi.mock('@/contexts/AuthContext', () => {
  const auth = () => ({ user: { id: 'u', permissions: ['OPS_READ', 'SYS_LOG_READ'], authorizationVersion: 'v1' } });
  return { useAuth: auth, useOptionalAuth: auth };
});
vi.mock('next/dynamic', () => ({ default: () => function DynamicPanel() { return <div />; } }));
const page = (list: unknown[]) => ({ list, total: list.length, totalPage: 1 });
vi.mock('@/services/foundation/system/AuditAdminService', () => ({ auditAdminService: { getAuditLogs: async () => page([]) } }));
vi.mock('@/services/foundation/system/SystemLogAdminService', () => ({
  systemLogAdminService: { getSystemLogs: async () => page([]), getLoginLogs: async () => page([]) },
}));
vi.mock('@/services/foundation/system/MonitoringAdminService', () => ({
  monitoringAdminService: { getHealth: async () => ({ status: 'UP', components: {} }), getCpuUsage: async () => 1, getMemoryUsage: async () => 1 },
}));
vi.mock('@/services/foundation/system/AttachmentIntegrityService', () => ({ attachmentIntegrityService: { scan: vi.fn() } }));
vi.mock('@/extensions/generated-hub-tabs-monitoring', () => ({ hubTabsMonitoring: [mocks.tabs] }));

import MonitoringHubClient from '../MonitoringHubClient';

/** 가짜 기여 탭. 항목 하나를 고르는 버튼을 그리고, 그 항목의 상세를 낸다. sample 이면 셸이 샘플 고지를 단다. */
const tab = (id: string, order: number, label: string, itemId: string, sample?: boolean) => ({
  id, order, label, visibleWhen: { always: '시험' },
  view: {
    description: `${label} 설명`,
    icon: Zap,
    ...(sample === undefined ? {} : { sample }),
    render: ({ onSelect }: { onSelect: (id: string) => void }) => <button type="button" onClick={() => onSelect(itemId)}>{`${label} 항목 고르기`}</button>,
    overview: () => <p>{`${label} 개요`}</p>,
    find: (selected: string) => (selected === itemId ? { itemId } : null),
    detail: (item: unknown) => ((item as { itemId?: string }).itemId === itemId ? { title: `${label} 상세`, view: <p>{`${label} 상세 본문`}</p> } : null),
  },
});

function renderHub(query: string) {
  mocks.query = query;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MonitoringHubClient /></QueryClientProvider>);
}
const tabState = () => within(screen.getByRole('tablist', { name: '모니터링 허브 영역 선택' })).getAllByRole('tab').map((element) => {
  const label = element.cloneNode(true) as HTMLElement;
  label.querySelectorAll('svg, [data-testid^="icon-"]').forEach((icon) => icon.remove());
  return [label.textContent, element.getAttribute('aria-selected')];
});

beforeEach(() => {
  vi.clearAllMocks();
  // 대역 모듈이 같은 배열을 들고 있어 제자리에서 바꾼다. 레지스트리는 감시 허브 전용이라(GAP-SLOT-001) 다른 허브의 탭이 섞일 수 없다.
  mocks.tabs.splice(0, Infinity, tab('SAMPLE_TAB', 20, '표본 탭', 's1', true), tab('REAL_TAB', 10, '실측 탭', 'r1'));
});

describe('감시 허브 셸의 기여 탭', () => {
  it('셸의 로그·가동 상태 탭 뒤에 자기 허브의 기여 탭을 order 순으로 놓고, 기여 탭 제목 아래 그 뷰의 설명을 보인다', () => {
    renderHub('tab=real_tab');
    const labels = [...CORE_TABS, '실측 탭', '표본 탭'];
    expect(tabState()).toEqual(labels.map((label) => [label, String(label === '실측 탭')]));
    expect(screen.getByRole('heading', { level: 1, name: '실측 탭' })).toBeInTheDocument();
    expect(screen.getByText('실측 탭 설명')).toBeInTheDocument();
    expect(screen.getByText('실측 탭 개요')).toBeInTheDocument();
  });

  it('상세의 샘플 고지는 그 기여 뷰가 sample 일 때만 붙는다', () => {
    const real = renderHub('tab=real_tab');
    fireEvent.click(screen.getByRole('button', { name: '실측 탭 항목 고르기' }));
    const detail = screen.getByRole('region', { name: '선택 항목 상세' });
    expect(within(detail).getByText('실측 탭 상세 본문')).toBeInTheDocument();
    expect(within(detail).queryByText(/샘플 데이터/)).toBeNull();
    real.unmount();

    renderHub('tab=sample_tab');
    fireEvent.click(screen.getByRole('button', { name: '표본 탭 항목 고르기' }));
    const sampleDetail = screen.getByRole('region', { name: '선택 항목 상세' });
    expect(within(sampleDetail).getByText('표본 탭 상세 본문')).toBeInTheDocument();
    expect(within(sampleDetail).getByText(/샘플 데이터/)).toBeInTheDocument();
  });

  it('기여가 없는 구성에서는 셸 고유 탭만 있고, 기여 탭 값은 기본 탭으로 떨어진다', () => {
    mocks.tabs.splice(0, Infinity);
    renderHub('tab=harness');
    const labels = CORE_TABS;
    expect(tabState()).toEqual(labels.map((label) => [label, String(label === '시스템 로그(감사 보기)')]));
  });
});
