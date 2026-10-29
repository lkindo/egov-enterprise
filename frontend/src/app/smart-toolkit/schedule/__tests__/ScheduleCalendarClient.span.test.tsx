import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeptSchedule } from '@/types/business/schedule';

const mocks = vi.hoisted(() => ({
  rows: [] as DeptSchedule[],
  query: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: (options: unknown) => {
    mocks.query(options);
    return { data: mocks.rows, isLoading: false, isError: false, error: null, refetch: vi.fn() };
  },
}));
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
}));
vi.mock('@/components/business/work-hub/work-hub-tabs', () => ({
  useWorkHubTabStrip: () => ({ strip: null, panel: (children: React.ReactNode) => children }),
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ data }: { data: DeptSchedule[] }) => (
    <ul aria-label="표시 일정">{data.map(row => <li key={row.schdlSn}>{row.schdlNm}</li>)}</ul>
  ),
}));
vi.mock('@/app/components/ui/standard-modal', () => ({ StandardModal: () => null }));
vi.mock('@/components/business/schedule/ScheduleCreateForm', () => ({ ScheduleCreateForm: () => null }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => vi.fn() }));
vi.mock('@/services/business/schedule/deptScheduleService', () => ({
  getDeptScheduleMonthList: vi.fn(),
  createDeptSchedule: vi.fn(),
  updateDeptSchedule: vi.fn(),
  deleteDeptSchedule: vi.fn(),
}));

// Calendar와 scheduleSpanDates는 실제 구현을 사용해 modifier가 실제 날짜 셀에 도달하는지 본다.
import ScheduleCalendarClient from '../ScheduleCalendarClient';

const markedDaysInMonth = (container: HTMLElement, month: string) =>
  Array.from(container.querySelectorAll<HTMLElement>(`[role="gridcell"][data-day^="${month}-"]`))
    .filter(cell => cell.classList.contains('underline'))
    .map(cell => cell.dataset.day);

const daysInMonth = (month: string, count: number) =>
  Array.from({ length: count }, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`);
const scheduleFields = { schdlSeCd: '2', schdlDeptId: 'TEST_DEPT', schdlCn: '' };

describe('ScheduleCalendarClient 장기 일정 표시', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rows = [];
  });

  it.each(['20281231', '20991231'])('2026년에 시작해 %s에 끝나는 일정의 2027년 2월 마커와 선택일 목록이 일치한다', (end) => {
    mocks.rows = [
      { ...scheduleFields, schdlSn: 1, schdlNm: '장기 점검', schdlBgngYmd: '20260101', schdlEndYmd: end },
      { ...scheduleFields, schdlSn: 2, schdlNm: '16일 회의', schdlBgngYmd: '20270216', schdlEndYmd: '20270216' },
    ];
    const { container } = render(<ScheduleCalendarClient initialYmd="20270201" />);

    expect(markedDaysInMonth(container, '2027-02')).toEqual(daysInMonth('2027-02', 28));
    const selectedCell = container.querySelector<HTMLElement>('[role="gridcell"][data-day="2027-02-15"]');
    expect(selectedCell).not.toBeNull();
    fireEvent.click(within(selectedCell!).getByRole('button'));

    expect(screen.getByRole('heading', { level: 2, name: /2027년 2월 15일/ })).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: '표시 일정' })).getAllByRole('listitem')
      .map(row => row.textContent)).toEqual(['장기 점검']);
  });

  it('같은 일정 배열을 재사용해도 월을 이동하면 새 표시월의 마커를 다시 계산한다', () => {
    mocks.rows = [{ ...scheduleFields, schdlSn: 1, schdlNm: '장기 점검', schdlBgngYmd: '20260101', schdlEndYmd: '20281231' }];
    const { container } = render(<ScheduleCalendarClient initialYmd="20270201" />);
    expect(markedDaysInMonth(container, '2027-02')).toEqual(daysInMonth('2027-02', 28));

    fireEvent.click(screen.getByRole('button', { name: 'Go to the Next Month' }));

    expect(screen.getByRole('heading', { level: 2, name: '2027년 3월 전체 일정' })).toBeInTheDocument();
    expect(markedDaysInMonth(container, '2027-03')).toEqual(daysInMonth('2027-03', 31));
    expect(mocks.query).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: ['work-schedules', '202703'] }));
  });

  it('실제 42칸 전체와 앞뒤 달 선택일 목록의 일정 표시가 일치한다', () => {
    mocks.rows = [
      { ...scheduleFields, schdlSn: 1, schdlNm: '장기 점검', schdlBgngYmd: '20260101', schdlEndYmd: '20281231' },
      { ...scheduleFields, schdlSn: 2, schdlNm: '전달 경계 점검', schdlBgngYmd: '20270130', schdlEndYmd: '20270201' },
      { ...scheduleFields, schdlSn: 3, schdlNm: '다음 달 경계 점검', schdlBgngYmd: '20270228', schdlEndYmd: '20270303' },
    ];
    const { container } = render(<ScheduleCalendarClient initialYmd="20270201" />);
    const cells = Array.from(container.querySelectorAll<HTMLElement>('[role="gridcell"][data-day]'));

    expect(cells.map(cell => cell.dataset.day))
      .toEqual(['2027-01-31', ...daysInMonth('2027-02', 28), ...daysInMonth('2027-03', 13)]);
    expect(cells.filter(cell => cell.classList.contains('underline'))).toHaveLength(42);
    for (const [day, expected] of [
      ['2027-01-31', ['장기 점검', '전달 경계 점검']],
      ['2027-03-01', ['장기 점검', '다음 달 경계 점검']],
    ] as const) {
      const cell = container.querySelector<HTMLElement>(`[role="gridcell"][data-day="${day}"]`);
      expect(cell).not.toBeNull();
      expect(cell).toHaveClass('underline');
      fireEvent.click(within(cell!).getByRole('button'));
      expect(within(screen.getByRole('list', { name: '표시 일정' })).getAllByRole('listitem')
        .map(row => row.textContent)).toEqual(expected);
    }
    expect(mocks.query).toHaveBeenLastCalledWith(expect.objectContaining({ queryKey: ['work-schedules', '202702'] }));
  });

  it('윤년 2월 말에서 다음 달로 이어지는 일정도 실제 해당 셀과 선택일 목록에 표시한다', () => {
    mocks.rows = [{ ...scheduleFields, schdlSn: 1, schdlNm: '윤년 점검', schdlBgngYmd: '20280228', schdlEndYmd: '20280301' }];
    const { container } = render(<ScheduleCalendarClient initialYmd="20280201" />);

    expect(markedDaysInMonth(container, '2028-02')).toEqual(['2028-02-28', '2028-02-29']);
    fireEvent.click(screen.getByRole('button', { name: 'Go to the Next Month' }));
    expect(markedDaysInMonth(container, '2028-03')).toEqual(['2028-03-01']);
    const selectedCell = container.querySelector<HTMLElement>('[role="gridcell"][data-day="2028-03-01"]');
    expect(selectedCell).not.toBeNull();
    fireEvent.click(within(selectedCell!).getByRole('button'));
    expect(within(screen.getByRole('list', { name: '표시 일정' })).getAllByRole('listitem')
      .map(row => row.textContent)).toEqual(['윤년 점검']);
  });
});
