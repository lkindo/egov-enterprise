import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EMPTY_PERIOD,
  PeriodFilter,
  activePresetOf,
  hasAppliedPeriod,
  periodProblem,
  presetToPeriod,
  type PeriodValue,
} from '../period-filter';
import { emptyResultMessage } from '../empty-result-message';

/**
 * [2026-09-26 DIP C6] 조회 기간 컨트롤.
 * - 프리셋은 '전체' 만 눌린 상태로 보였다 — '최근 1주' 를 눌러도 어떤 버튼도 눌리지 않았다.
 * - 한쪽만 입력한 기간은 서버로 보내지 않는데(periodToParams) 화면은 그 사실을 말하지 않았다.
 */
const TODAY = new Date(2026, 8, 26, 10, 0, 0);

describe('period-filter 판정', () => {
  it('값이 어느 프리셋과 같은지 판정한다', () => {
    expect(activePresetOf(EMPTY_PERIOD, TODAY)).toBe('all');
    expect(activePresetOf(presetToPeriod('1w', TODAY), TODAY)).toBe('1w');
    expect(activePresetOf(presetToPeriod('1d', TODAY), TODAY)).toBe('1d');
    expect(activePresetOf({ from: '2026-09-01', to: '2026-09-10' }, TODAY)).toBeNull();
  });

  it('한쪽만 입력했거나 역순이면 이유를 준다', () => {
    expect(periodProblem({ from: '2026-09-01', to: '' })).toMatch(/모두 입력/);
    expect(periodProblem({ from: '', to: '2026-09-01' })).toMatch(/모두 입력/);
    expect(periodProblem({ from: '2026-09-10', to: '2026-09-01' })).toMatch(/시작일이 종료일보다 늦습니다/);
    expect(periodProblem({ from: '2026-09-01', to: '2026-09-01' })).toBeNull();
    expect(periodProblem(EMPTY_PERIOD)).toBeNull();
  });
});

function Harness({ initial = EMPTY_PERIOD }: { initial?: PeriodValue }) {
  const [value, setValue] = useState(initial);
  return <PeriodFilter label="조회 기간" value={value} onChange={setValue} />;
}

describe('PeriodFilter', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(TODAY);
  });
  afterEach(() => vi.useRealTimers());

  it('누른 프리셋이 눌린 상태로 보이고, 다른 프리셋은 풀린다', () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: '전체' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: '최근 1주' }));
    expect(screen.getByRole('button', { name: '최근 1주' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '전체' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('[DIP B5 F6] presets 로 보일 프리셋을 고를 수 있다 — 비우면 전체가 아닌 화면은 전체를 빼고 쓴다', () => {
    render(<PeriodFilter label="집계 기간" value={{ from: '', to: '' }} onChange={() => {}} presets={['1d', '1w', '1m']} />);
    expect(screen.queryByRole('button', { name: '전체' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '최근 1개월' })).toBeInTheDocument();
  });

  it('한쪽만 입력하면 적용되지 않는다고 알리고 입력칸에 연결한다', () => {
    render(<Harness initial={{ from: '2026-09-01', to: '' }} />);
    const hint = screen.getByRole('status');
    expect(hint).toHaveTextContent('시작일과 종료일을 모두 입력해야 기간이 적용됩니다.');
    expect(screen.getByLabelText('조회 기간 시작일')).toHaveAttribute('aria-describedby', hint.id);
  });

  it('[DIP B5 F9] 양쪽을 다 고른 기간만 적용된 기간이고, 기간만 고른 0건은 결과 없음으로 말한다(G15)', () => {
    expect(hasAppliedPeriod({ from: '2026-09-01', to: '2026-09-10' })).toBe(true);
    expect(hasAppliedPeriod({ from: '2026-09-01', to: '' })).toBe(false);
    expect(hasAppliedPeriod(EMPTY_PERIOD)).toBe(false);
    expect(emptyResultMessage('', '조회된 로그가 없습니다.', true)).toBe('선택한 기간에 해당하는 결과가 없습니다. 기간을 넓히거나 초기화해 보세요.');
    expect(emptyResultMessage('', '조회된 로그가 없습니다.', false)).toBe('조회된 로그가 없습니다.');
    expect(emptyResultMessage('admin', '조회된 로그가 없습니다.', true)).toBe('"admin"에 대한 검색 결과가 없습니다.');
  });

  it('역순 기간을 알린다', () => {
    render(<Harness initial={{ from: '2026-09-10', to: '2026-09-01' }} />);
    expect(screen.getByRole('status')).toHaveTextContent('시작일이 종료일보다 늦습니다.');
  });
});
