import { describe, it, expect } from 'vitest';
import {
  isStorageYmd,
  toStorageYmd,
  toDisplayYmd,
  toDateInputValue,
  fromDateInputValue,
  parseStorageYmd,
} from '../format-date';
import { getPollStatus, isPollActive } from '../poll-status';

describe('format-date (yyyyMMdd 저장 포맷)', () => {
  it('Date → 저장 포맷은 로컬 기준 8자다', () => {
    expect(toStorageYmd(new Date(2026, 6, 22))).toBe('20260722');
    expect(toStorageYmd(new Date(2026, 0, 1))).toBe('20260101');
  });

  it('8자리라도 달력에 없는 날짜는 저장 포맷이 아니다', () => {
    expect(isStorageYmd('20260722')).toBe(true);
    expect(isStorageYmd('20260231')).toBe(false);
    expect(isStorageYmd('20261301')).toBe(false);
  });

  it('손상 값(varchar(8) 절단)과 빈 값을 안전하게 걸러낸다', () => {
    expect(isStorageYmd('2026-05-')).toBe(false);
    expect(isStorageYmd('')).toBe(false);
    expect(isStorageYmd(undefined)).toBe(false);
    expect(isStorageYmd(null)).toBe(false);
    expect(parseStorageYmd('2026-05-')).toBeNull();
  });

  it('표시 변환: 8자 → 하이픈, 손상 값 → fallback', () => {
    expect(toDisplayYmd('20260722')).toBe('2026-07-22');
    expect(toDisplayYmd('20260722', '-', '.')).toBe('2026.07.22');
    expect(toDisplayYmd('2026-07-22')).toBe('2026-07-22'); // 과거 10자 저장분
    expect(toDisplayYmd('2026-05-')).toBe('-');
    expect(toDisplayYmd(undefined)).toBe('-');
  });

  it('input[type=date] 경계 변환은 왕복한다', () => {
    expect(toDateInputValue('20260722')).toBe('2026-07-22');
    expect(fromDateInputValue('2026-07-22')).toBe('20260722');
    expect(toDateInputValue('2026-05-')).toBe(''); // 손상 값은 미입력 처리
    expect(fromDateInputValue('')).toBe('');
    expect(fromDateInputValue('20260722')).toBe(''); // 형식 불일치는 임의 보정하지 않음
  });
});

describe('poll-status', () => {
  const period = { pollBgngYmd: '20260701', pollEndYmd: '20260731', pollDsuseYn: 'N' };

  it('기간 내/전/후를 8자 문자열 비교로 판정한다', () => {
    expect(getPollStatus(period, '20260630')).toBe('scheduled');
    expect(getPollStatus(period, '20260715')).toBe('active');
    expect(getPollStatus(period, '20260801')).toBe('closed');
  });

  it('시작일·종료일 당일은 진행중이다', () => {
    expect(getPollStatus(period, '20260701')).toBe('active');
    expect(getPollStatus(period, '20260731')).toBe('active');
  });

  it('사용중지(pollDsuseYn=Y)는 기간과 무관하게 중지다', () => {
    expect(getPollStatus({ ...period, pollDsuseYn: 'Y' }, '20260715')).toBe('suspended');
  });

  it('손상 값은 unknown 이며 절대 개방하지 않는다', () => {
    expect(getPollStatus({ pollBgngYmd: '2026-05-', pollEndYmd: '2026-06-' }, '20260715')).toBe('unknown');
    expect(isPollActive('2026-05-', '2026-06-', '20260715')).toBe(false);
    expect(isPollActive(undefined, undefined, '20260715')).toBe(false);
    expect(isPollActive('', '', '20260715')).toBe(false);
  });

  it('종전 파손 케이스 회귀: 10자 today 와 비교해도 뒤집히지 않는다', () => {
    // 과거 화면들은 '2026-07-15'(10자)를 기준일로 썼고, 그 문자열 비교가 전건 오판정을 냈다.
    // 유틸은 8자가 아닌 기준일을 신뢰하지 않고 실제 오늘로 대체하므로 여기서는
    // 기간이 확정적으로 과거인 설문이 'active' 로 새지 않는 것만 확인한다.
    expect(getPollStatus({ pollBgngYmd: '20200101', pollEndYmd: '20200131' })).toBe('closed');
  });
});
