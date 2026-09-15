import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const topology = vi.hoisted(() => ({
  state: {} as Record<string, unknown>,
  refetch: vi.fn(),
}));

vi.mock('@/lib/hooks/use-topology-data', () => ({
  useTopologyData: () => ({ refetch: topology.refetch, ...topology.state }),
}));

// 전역 mock 은 motion.div 계열만 제공한다. 토폴로지는 SVG line·circle 도 motion 으로 그리므로 태그를 모두 통과시킨다.
vi.mock('framer-motion', async () => {
  const { createElement } = await import('react');
  const ANIMATION_PROPS = new Set(['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'layout']);
  const element = (tag: string) => ({ children, ...props }: Record<string, unknown> & { children?: unknown }) => createElement(
    tag,
    Object.fromEntries(Object.entries(props).filter(([key]) => !ANIMATION_PROPS.has(key))),
    children as never,
  );
  return {
    motion: new Proxy({}, { get: (_target, tag) => element(String(tag)) }),
    AnimatePresence: ({ children }: { children?: unknown }) => children,
  };
});

import { TopologyMap } from '../topology-map';

/**
 * [2026-09-15 DEC-OPS-100] 토폴로지는 계측 행이 없는 자리를 정상으로 그리지 않는다.
 *
 * 종전에는 조회 중에도 고정 좌표의 노드 6개를 기본값 'up' 으로 칠했고, 계측 행이 없는 노드와
 * 로드밸런서도 UP 이었으며, 노드에 올리면 정상이면 98.4%·아니면 0.0% 라는 계측 없는 가용률을 보였다.
 * 조회 실패는 빈 목록으로 삼켜 "계측 소스 없음"으로 읽혔다.
 */
describe('TopologyMap 상태 표시', () => {
  beforeEach(() => {
    topology.refetch.mockReset();
    topology.state = {};
  });

  it('조회 중에는 노드를 먼저 그리지 않고 불러오는 중이라고 알린다', () => {
    topology.state = { isLoading: true, isError: false, data: undefined };
    render(<TopologyMap />);

    expect(screen.getByRole('status')).toHaveTextContent('토폴로지 상태를 불러오는 중…');
    expect(screen.queryByText('정상')).toBeNull();
    expect(screen.queryByText('UP')).toBeNull();
  });

  it('조회 실패는 계측 소스 없음과 구분하고 다시 불러올 수 있다', () => {
    topology.state = { isLoading: false, isError: true, data: undefined };
    render(<TopologyMap />);

    expect(screen.getByText('토폴로지 상태를 불러오지 못했습니다.')).toBeInTheDocument();
    expect(screen.queryByText('연동된 토폴로지 계측 소스가 없습니다')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }));
    expect(topology.refetch).toHaveBeenCalledOnce();
  });

  it('계측 행이 없는 노드는 상태 미확인이고 계측 없는 가용률을 보이지 않는다', () => {
    topology.state = {
      isLoading: false,
      isError: false,
      data: [{ id: 'API-A', label: 'API-A', ip: '10.0.0.5', port: '8080', status: 'up', type: 'api' }],
    };
    const { container } = render(<TopologyMap />);

    // api-01 자리만 계측 행이 있다. 노드 여섯 중 정상 1·상태 미확인 5(로드밸런서 포함)이고, 범례가 각 1건씩 더한다.
    // 로드밸런서를 다시 정상으로 칠하거나 계측 행의 상태를 노드에 옮기지 않으면 이 개수가 달라진다.
    expect(screen.getAllByText('정상')).toHaveLength(2);
    expect(screen.getAllByText('상태 미확인')).toHaveLength(6);
    expect(screen.queryByText('UP')).toBeNull();

    fireEvent.mouseEnter(screen.getByText('Cloud Front / LB'));
    expect(container.textContent).not.toMatch(/98\.4%|0\.0%|0\.0\.0\.0|8888/);
  });
});
