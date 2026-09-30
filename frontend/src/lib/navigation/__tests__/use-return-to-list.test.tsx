import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { matchesRoute, previousRoute, recordRoute, resetRouteHistory } from '../previous-route';
import { useReturnToList } from '../use-return-to-list';
import { BackToListButton } from '@/app/components/navigation/BackToListButton';

const router = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

/**
 * [2026-10-01] 상세 화면의 '목록으로'. 목록에서 왔으면 뒤로 가 목록의 조건·스크롤을 살리고, 딥링크·새 탭·다른 화면에서
 * 왔으면 목록 경로로 간다 — router.back() 이 앱 밖으로 나가거나 고정 링크가 목록 조건을 잃던 두 결함을 함께 막는다.
 */
describe('앱 안 직전 경로 기록', () => {
  beforeEach(() => resetRouteHistory());

  it('경로가 바뀔 때만 직전 경로를 옮기고, 같은 경로의 재기록은 이동으로 세지 않는다', () => {
    recordRoute('/list');
    expect(previousRoute()).toBeNull();
    recordRoute('/detail/1');
    recordRoute('/detail/1');
    expect(previousRoute()).toBe('/list');
  });

  it('기본은 정확 일치, /* 로 끝나면 하위 경로까지 본다 — 다른 상세를 목록으로 읽지 않는다', () => {
    expect(matchesRoute('/smart-toolkit/dept-job', '/smart-toolkit/dept-job')).toBe(true);
    expect(matchesRoute('/smart-toolkit/dept-job/7', '/smart-toolkit/dept-job')).toBe(false);
    expect(matchesRoute('/cop/cmy/selectCommunityDetail/3', '/cop/cmy/selectCommunityDetail/*')).toBe(true);
    expect(matchesRoute('/cop/cmy/selectCommunityDetailX', '/cop/cmy/selectCommunityDetail/*')).toBe(false);
  });
});

describe('useReturnToList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRouteHistory();
  });

  const options = { fallback: '/list?bbsId=B1', origins: ['/list', '/hub'] } as const;

  it('목록에서 왔으면 뒤로 간다 — 목록의 페이지·검색 조건은 방문 기록이 되살린다', () => {
    recordRoute('/hub');
    recordRoute('/detail/1');
    const { result } = renderHook(() => useReturnToList(options));
    act(() => result.current());
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('딥링크·새 탭으로 열었으면 방문 기록 밖으로 나가지 않고 목록 경로로 간다', () => {
    recordRoute('/detail/1');
    const { result } = renderHook(() => useReturnToList(options));
    act(() => result.current());
    expect(router.push).toHaveBeenCalledWith('/list?bbsId=B1');
    expect(router.back).not.toHaveBeenCalled();
  });

  it('목록이 아닌 화면(대시보드 등)에서 왔으면 목록 경로로 간다 — 버튼 이름이 약속한 곳으로 간다', () => {
    recordRoute('/');
    recordRoute('/detail/1');
    const { result } = renderHook(() => useReturnToList(options));
    act(() => result.current());
    expect(router.push).toHaveBeenCalledWith('/list?bbsId=B1');
  });
});

describe('BackToListButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRouteHistory();
  });

  it('보이는 이름과 접근 가능한 이름이 같은 "목록으로" 이다', async () => {
    render(<BackToListButton fallback="/list" origins={['/list']} />);
    const button = screen.getByRole('button', { name: '목록으로' });
    expect(button).not.toHaveAttribute('aria-label');
    await userEvent.click(button);
    expect(router.push).toHaveBeenCalledWith('/list');
  });
});
