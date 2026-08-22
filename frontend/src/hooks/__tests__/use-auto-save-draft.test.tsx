/**
 * 게시글 자동 임시저장 훅 테스트.
 *
 * [2026-08-09 신설] 커버리지 0% 였다(47줄 전량 미커버).
 *
 * 이 훅이 지키는 것은 **사용자가 쓰던 글**이다. 여기서 조용히 어긋나면 결과가 둘 중 하나다:
 *   · 저장이 안 됐는데 됐다고 믿는다 → 브라우저가 닫히면 글이 사라진다
 *   · 지웠는데 안 지워졌다 → 다음 글쓰기에 남의 초안이 되살아난다
 * 둘 다 예외가 나지 않아서 타입검사·빌드로는 잡히지 않는다.
 *
 * 특히 이 훅은 **정리(cleanup)가 검증 대상**이다. setInterval 과 beforeunload 리스너를
 * 붙이는데, 언마운트 후에도 살아 있으면 사라진 화면의 내용을 계속 쓴다.
 * (같은 세션에서 useAppForm 의 미정리 타이머가 CI 를 빨갛게 만든 전례가 있다.)
 */

vi.mock('next/config', () => ({
  default: () => ({ publicRuntimeConfig: {}, serverRuntimeConfig: {} }),
}));

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useAutoSaveDraft } from '../use-auto-save-draft';

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const KEY = 'BBS_001';
const FULL_KEY = `egov-draft-${KEY}`;

/** 최소 길이(기본 10)를 넘는 본문. */
const LONG = { title: '제목입니다', content: '본문 내용입니다' };

function setup(overrides: Partial<Parameters<typeof useAutoSaveDraft>[0]> = {}) {
  const getData = vi.fn(() => LONG);
  const onRestore = vi.fn();
  const hook = renderHook(() =>
    useAutoSaveDraft({ storageKey: KEY, getData, onRestore, ...overrides })
  );
  return { ...hook, getData, onRestore };
}

describe('useAutoSaveDraft', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('저장', () => {
    it('최소 길이를 넘으면 localStorage 에 저장한다', () => {
      const { result } = setup();

      act(() => {
        result.current.saveDraft();
      });

      const raw = localStorage.getItem(FULL_KEY);
      expect(raw).not.toBeNull();
      const saved = JSON.parse(raw!);
      expect(saved.title).toBe(LONG.title);
      expect(saved.content).toBe(LONG.content);
      expect(saved.savedAt).toBeTruthy();
      expect(result.current.lastSavedAt).toBe(saved.savedAt);
    });

    it('최소 길이 미만이면 저장하지 않는다 — 빈 초안이 쌓이지 않게 한다', () => {
      const { result } = setup({ getData: () => ({ title: 'a', content: 'b' }) });

      act(() => {
        result.current.saveDraft();
      });

      // 이 가드가 뒤집히면 글자 한 두 개마다 초안이 쓰이고, 반대로 항상 막히면 아무것도 저장되지 않는다.
      expect(localStorage.getItem(FULL_KEY)).toBeNull();
      expect(result.current.lastSavedAt).toBeNull();
    });

    it('경계: 제목+본문 합이 정확히 최소 길이면 저장한다', () => {
      const { result } = setup({
        minLength: 5,
        getData: () => ({ title: 'ab', content: 'cde' }),   // 합 5
      });

      act(() => {
        result.current.saveDraft();
      });

      // `< minLength` 의 경계를 옮긴 뮤턴트가 여기서 죽는다.
      expect(localStorage.getItem(FULL_KEY)).not.toBeNull();
    });

    it('localStorage 가 거부해도 편집을 막지 않는다 (용량 초과 등)', () => {
      const { result } = setup();
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });

      // 여기서 예외가 새면 **글을 쓰던 화면이 통째로 죽는다.**
      expect(() => act(() => { result.current.saveDraft(); })).not.toThrow();
    });

    it('저장할 때마다 현재 데이터를 다시 읽는다 — 스냅샷을 붙들지 않는다', () => {
      let content = '처음 내용입니다';
      const { result } = setup({ getData: () => ({ title: '제목입니다', content }) });

      act(() => { result.current.saveDraft(); });
      content = '나중에 바꾼 내용입니다';
      act(() => { result.current.saveDraft(); });

      // getData 를 한 번만 읽어 캐시하면 **수정분이 영원히 저장되지 않는다.**
      expect(JSON.parse(localStorage.getItem(FULL_KEY)!).content).toBe('나중에 바꾼 내용입니다');
    });
  });

  describe('복원', () => {
    it('저장된 초안이 있으면 마운트 시 감지하고 콜백으로 넘긴다', () => {
      localStorage.setItem(FULL_KEY, JSON.stringify({
        title: '이전 제목', content: '이전 본문', savedAt: '2026-08-09T00:00:00.000Z',
      }));

      const { result, onRestore } = setup();

      expect(result.current.hasDraft).toBe(true);
      expect(result.current.lastSavedAt).toBe('2026-08-09T00:00:00.000Z');
      expect(onRestore).toHaveBeenCalledWith({ title: '이전 제목', content: '이전 본문' });
    });

    it('저장된 초안이 없으면 hasDraft 가 false 다', () => {
      const { result, onRestore } = setup();

      expect(result.current.hasDraft).toBe(false);
      expect(result.current.lastSavedAt).toBeNull();
      expect(onRestore).not.toHaveBeenCalled();
    });

    it('깨진 JSON 은 null 로 처리한다 — 글쓰기 화면이 죽으면 안 된다', () => {
      localStorage.setItem(FULL_KEY, '{이건 JSON 이 아니다');

      const { result } = setup();

      // 파싱 예외가 새면 초안 하나 때문에 그 게시판 글쓰기가 영구히 열리지 않는다.
      expect(result.current.hasDraft).toBe(false);
      expect(result.current.restoreDraft()).toBeNull();
    });

    it('onRestore 를 주지 않아도 복원값을 돌려준다', () => {
      localStorage.setItem(FULL_KEY, JSON.stringify({
        title: 'T', content: 'C', savedAt: '2026-08-09T00:00:00.000Z',
      }));

      const { result } = renderHook(() =>
        useAutoSaveDraft({ storageKey: KEY, getData: () => LONG })
      );

      expect(result.current.restoreDraft()).toMatchObject({ title: 'T', content: 'C' });
    });
  });

  describe('삭제', () => {
    it('정상 제출 후 초안을 지우고 상태도 되돌린다', () => {
      localStorage.setItem(FULL_KEY, JSON.stringify({
        title: 'T', content: 'C', savedAt: '2026-08-09T00:00:00.000Z',
      }));
      const { result } = setup();
      expect(result.current.hasDraft).toBe(true);

      act(() => { result.current.clearDraft(); });

      // 지우지 않으면 다음 글쓰기에서 **이미 올린 글이 초안으로 되살아난다.**
      expect(localStorage.getItem(FULL_KEY)).toBeNull();
      expect(result.current.hasDraft).toBe(false);
      expect(result.current.lastSavedAt).toBeNull();
    });

    it('다른 게시판의 초안은 건드리지 않는다', () => {
      localStorage.setItem('egov-draft-OTHER', JSON.stringify({ title: 'x', content: 'y' }));
      const { result } = setup();

      act(() => { result.current.clearDraft(); });

      // 키에 storageKey 가 안 섞이면 한 게시판 제출이 다른 게시판 초안을 지운다.
      expect(localStorage.getItem('egov-draft-OTHER')).not.toBeNull();
    });
  });

  describe('주기 저장과 정리', () => {
    it('지정한 간격마다 자동 저장한다', () => {
      const { getData } = setup({ interval: 1000 });
      const before = getData.mock.calls.length;

      act(() => { vi.advanceTimersByTime(3000); });

      // 간격을 무시하면 저장이 아예 안 되거나 매 틱마다 쓴다.
      expect(getData.mock.calls.length).toBeGreaterThan(before);
      expect(localStorage.getItem(FULL_KEY)).not.toBeNull();
    });

    it('언마운트하면 주기 저장을 멈춘다 — 사라진 화면의 내용을 계속 쓰면 안 된다', () => {
      const { unmount, getData } = setup({ interval: 1000 });

      act(() => { vi.advanceTimersByTime(1000); });
      const afterMounted = getData.mock.calls.length;

      unmount();
      act(() => { vi.advanceTimersByTime(5000); });

      // clearInterval 이 빠지면 언마운트 뒤에도 계속 돈다(누수 + 사라진 상태 참조).
      expect(getData.mock.calls.length).toBe(afterMounted);
    });

    it('페이지 이탈 직전에 한 번 더 저장한다', () => {
      const { result } = setup();
      expect(localStorage.getItem(FULL_KEY)).toBeNull();

      act(() => { window.dispatchEvent(new Event('beforeunload')); });

      // 마지막 주기 이후에 쓴 내용은 이 저장이 없으면 통째로 사라진다.
      expect(localStorage.getItem(FULL_KEY)).not.toBeNull();
      expect(result.current.lastSavedAt).not.toBeNull();
    });

    it('언마운트하면 beforeunload 리스너를 뗀다', () => {
      const { unmount } = setup();
      unmount();
      localStorage.clear();

      act(() => { window.dispatchEvent(new Event('beforeunload')); });

      // 리스너가 남으면 화면을 떠난 뒤에도 옛 내용이 다시 쓰인다.
      expect(localStorage.getItem(FULL_KEY)).toBeNull();
    });
  });
});
