import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 홍보 배너 캐러셀의 접근성 계약(2026-09-24).
 *
 * - 자동 넘김은 사용자가 멈출 수 있어야 한다(WCAG 2.2.2). 멈춤 버튼 외에 마우스가 올라가 있거나
 *   키보드 포커스가 안에 있는 동안에도 넘기지 않는다(WAI-ARIA 캐러셀 패턴).
 * - 점은 8px 로 보이되 누르는 영역은 24px 다(WCAG 2.5.8). jsdom 은 배치를 계산하지 않으므로
 *   크기는 클래스로 고정한다.
 * - 이전·다음 버튼은 평소에 숨겨 두지만 키보드 포커스가 오면 보인다(WCAG 2.4.7).
 */
const harness = vi.hoisted(() => ({ banners: vi.fn() }));

vi.mock('@/services/business/user/BannerService', () => ({
  bannerService: { getReflectedBanners: harness.banners },
}));
vi.mock('@/app/components/ui/attachment-image', () => ({ AttachmentImage: () => null }));

import { BannerSlider } from '../BannerSlider';

const BANNERS = [1, 2, 3].map((n) => ({
  bnrSn: n,
  bnrNm: `배너 ${n}`,
  linkUrl: '',
  bnrImgNm: '',
  bnrExpln: `설명 ${n}`,
}));

const heading = (name: string) => screen.queryByRole('heading', { name });
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
// 슬라이드가 3장이라 15초(3회)를 넘기면 제자리로 돌아와 "멈췄다" 와 구분되지 않는다 — 멈춤 확인은 10초(2회)로 한다.

describe('홍보 배너 캐러셀 접근성', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    harness.banners.mockResolvedValue(BANNERS);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function renderSlider() {
    render(<BannerSlider />);
    await screen.findByRole('heading', { name: '배너 1' });
    // 제목은 커밋 시점에 보이지만 자동 넘김 타이머는 그 뒤 effect 에서 걸린다 — effect 까지 흘려보낸다.
    await act(async () => {});
    return screen.getByRole('region', { name: '홍보 배너' });
  }

  it('대조군: 아무것도 하지 않으면 5초마다 다음 슬라이드로 넘어가고 그동안 변화를 읽지 않는다', async () => {
    const region = await renderSlider();
    expect(region.querySelector('[aria-live]')).toHaveAttribute('aria-live', 'off');

    advance(5000);
    expect(heading('배너 2')).not.toBeNull();
  });

  it('멈춤 버튼을 누르면 넘기지 않고, 다시 누르면 이어서 넘긴다', async () => {
    const region = await renderSlider();

    fireEvent.click(screen.getByRole('button', { name: '자동 넘김 멈춤' }));
    advance(10000);
    expect(heading('배너 1')).not.toBeNull();
    // 멈춘 동안에는 사용자가 넘긴 슬라이드를 읽어 준다.
    expect(region.querySelector('[aria-live]')).toHaveAttribute('aria-live', 'polite');

    fireEvent.click(screen.getByRole('button', { name: '자동 넘김 시작' }));
    advance(5000);
    expect(heading('배너 2')).not.toBeNull();
  });

  it('키보드 포커스가 안에 있는 동안에는 넘기지 않는다', async () => {
    await renderSlider();
    const secondDot = screen.getByRole('button', { name: '2번 슬라이드로 이동' });

    act(() => { secondDot.focus(); });
    advance(10000);
    expect(heading('배너 1')).not.toBeNull();

    act(() => { secondDot.blur(); });
    advance(5000);
    expect(heading('배너 2')).not.toBeNull();
  });

  it('마우스가 올라가 있는 동안에는 넘기지 않는다', async () => {
    const region = await renderSlider();

    fireEvent.mouseEnter(region);
    advance(10000);
    expect(heading('배너 1')).not.toBeNull();

    fireEvent.mouseLeave(region);
    advance(5000);
    expect(heading('배너 2')).not.toBeNull();
  });

  it('점은 누르는 영역이 24px 이고 현재 슬라이드를 aria-current 로 알린다', async () => {
    await renderSlider();
    const dots = screen.getAllByRole('button', { name: /번 슬라이드로 이동$/ });

    expect(dots).toHaveLength(3);
    for (const dot of dots) {
      expect(dot.className.split(/\s+/)).toEqual(expect.arrayContaining(['h-6', 'min-w-6']));
    }
    expect(dots[0]).toHaveAttribute('aria-current', 'true');
    expect(dots[1]).not.toHaveAttribute('aria-current');

    fireEvent.click(dots[2]);
    expect(heading('배너 3')).not.toBeNull();
    expect(dots[2]).toHaveAttribute('aria-current', 'true');
  });

  it('이전·다음 버튼은 키보드 포커스가 오면 보인다', async () => {
    await renderSlider();
    for (const name of ['이전 슬라이드', '다음 슬라이드']) {
      expect(screen.getByRole('button', { name }).className.split(/\s+/)).toContain('focus-visible:opacity-100');
    }
  });
});
