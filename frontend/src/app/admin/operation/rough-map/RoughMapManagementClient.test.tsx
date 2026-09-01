import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.hoisted(() => ({
  useQuery: vi.fn(() => ({
    data: { list: [], total: 0 },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

vi.mock('@tanstack/react-query', () => ({ useQuery: query.useQuery }));
vi.mock('@/lib/hooks/use-debounced-value', () => ({
  useDebouncedValue: (value: string) => value,
}));
vi.mock('@/app/components/layout/DynamicBreadcrumb', () => ({
  DynamicBreadcrumb: () => <nav aria-label="현재 위치" />,
}));

import RoughMapManagementClient from './RoughMapManagementClient';

describe('RoughMapManagementClient', () => {
  beforeEach(() => vi.clearAllMocks());

  it('존재하지 않는 API를 호출하지 않고 백엔드 미지원 상태를 명확히 안내한다', () => {
    render(<RoughMapManagementClient />);

    expect(query.useQuery).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('약도 관리 백엔드가 아직 제공되지 않습니다.');
    expect(screen.getByText(/조회·등록·수정·삭제 기능을 사용할 수 없습니다/)).toBeVisible();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
