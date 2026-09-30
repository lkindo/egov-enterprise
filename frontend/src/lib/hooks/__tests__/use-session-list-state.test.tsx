import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSessionListState } from '../use-session-list-state';

/**
 * [2026-10-01] 목록 조건을 이 탭 동안 기억한다 — 상세에 다녀와 목록이 새로 마운트돼도 검색어·페이지·범위가 남는다.
 */
const DEFAULTS = { searchKeyword: '', jobPage: 1, jobScope: 'mine' };

describe('useSessionListState', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('처음에는 기본값이고, 바꾼 조건은 다시 마운트해도 남는다', () => {
    const first = renderHook(() => useSessionListState('dept-job-list:test', DEFAULTS));
    expect(first.result.current[0]).toEqual(DEFAULTS);
    act(() => first.result.current[1]({ searchKeyword: '보고', jobPage: 3 }));
    act(() => first.result.current[1]({ jobScope: 'dept' }));
    expect(first.result.current[0]).toEqual({ searchKeyword: '보고', jobPage: 3, jobScope: 'dept' });
    first.unmount();

    const again = renderHook(() => useSessionListState('dept-job-list:test', DEFAULTS));
    expect(again.result.current[0]).toEqual({ searchKeyword: '보고', jobPage: 3, jobScope: 'dept' });
  });

  it('화면 키가 다르면 섞이지 않는다', () => {
    const a = renderHook(() => useSessionListState('list:a', DEFAULTS));
    act(() => a.result.current[1]({ jobPage: 5 }));
    const b = renderHook(() => useSessionListState('list:b', DEFAULTS));
    expect(b.result.current[0].jobPage).toBe(1);
  });

  it('저장값이 손상됐거나 타입이 다르면 그 항목은 기본값으로 둔다', () => {
    window.sessionStorage.setItem('egov.list-session.v1:list:bad', JSON.stringify({ jobPage: '3', searchKeyword: '가', extra: 1 }));
    const { result } = renderHook(() => useSessionListState('list:bad', DEFAULTS));
    expect(result.current[0]).toEqual({ searchKeyword: '가', jobPage: 1, jobScope: 'mine' });

    window.sessionStorage.setItem('egov.list-session.v1:list:broken', '{not json');
    const broken = renderHook(() => useSessionListState('list:broken', DEFAULTS));
    expect(broken.result.current[0]).toEqual(DEFAULTS);
  });
});
