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
import {
  buildBoardDraftStorageKey,
  boardDraftMemoryStorage,
  purgeBoardDraftStorage,
  type BoardDraftScope,
} from '@/lib/drafts/board-draft-storage';

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const SCOPE: BoardDraftScope = {
  ownerId: 'user-1',
  boardId: 'BBS_001',
  action: 'create',
  recordId: 'new',
};
const FULL_KEY = buildBoardDraftStorageKey(SCOPE);
const NOW = new Date('2026-08-30T00:00:00.000Z');

/** 최소 길이(기본 10)를 넘는 본문. */
const LONG = { title: '제목입니다', content: '본문 내용입니다' };

function setup(overrides: Partial<Parameters<typeof useAutoSaveDraft>[0]> = {}) {
  const getData = vi.fn(() => LONG);
  const onRestore = vi.fn();
  const hook = renderHook(() =>
    useAutoSaveDraft({ scope: SCOPE, getData, onRestore, ...overrides })
  );
  return { ...hook, getData, onRestore };
}

function storedDraft(overrides: Record<string, unknown> = {}) {
  return {
    version: 2,
    title: '이전 제목',
    content: '이전 본문',
    savedAt: NOW.toISOString(),
    expiresAt: NOW.getTime() + 60_000,
    ...overrides,
  };
}

describe('useAutoSaveDraft', () => {
  beforeEach(() => {
    boardDraftMemoryStorage.clear();
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
    boardDraftMemoryStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('저장', () => {
    it('최소 길이를 넘으면 현재 탭의 메모리에 보관한다', () => {
      const { result } = setup();

      act(() => {
        result.current.saveDraft();
      });

      const raw = boardDraftMemoryStorage.getItem(FULL_KEY);
      expect(raw).not.toBeNull();
      const saved = JSON.parse(raw!);
      expect(saved.title).toBe(LONG.title);
      expect(saved.content).toBe(LONG.content);
      expect(saved.savedAt).toBeTruthy();
      expect(saved.expiresAt).toBe(NOW.getTime() + 24 * 60 * 60 * 1000);
      expect(result.current.lastSavedAt).toBe(saved.savedAt);
    });

    it('최소 길이 미만이면 저장하지 않는다 — 빈 초안이 쌓이지 않게 한다', () => {
      const { result } = setup({ getData: () => ({ title: 'a', content: 'b' }) });

      act(() => {
        result.current.saveDraft();
      });

      // 이 가드가 뒤집히면 글자 한 두 개마다 초안이 쓰이고, 반대로 항상 막히면 아무것도 저장되지 않는다.
      expect(boardDraftMemoryStorage.getItem(FULL_KEY)).toBeNull();
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
      expect(boardDraftMemoryStorage.getItem(FULL_KEY)).not.toBeNull();
    });

    it('영속 저장소 쓰기가 금지돼도 메모리 보관과 편집은 계속된다', () => {
      const { result } = setup();
      const persist = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });

      // 여기서 예외가 새면 **글을 쓰던 화면이 통째로 죽는다.**
      expect(() => act(() => { result.current.saveDraft(); })).not.toThrow();
      expect(persist).not.toHaveBeenCalled();
      expect(result.current.restoreDraft()).toMatchObject(LONG);
    });

    it('저장할 때마다 현재 데이터를 다시 읽는다 — 스냅샷을 붙들지 않는다', () => {
      let content = '처음 내용입니다';
      const { result } = setup({ getData: () => ({ title: '제목입니다', content }) });

      act(() => { result.current.saveDraft(); });
      content = '나중에 바꾼 내용입니다';
      act(() => { result.current.saveDraft(); });

      // getData 를 한 번만 읽어 캐시하면 **수정분이 영원히 저장되지 않는다.**
      expect(JSON.parse(boardDraftMemoryStorage.getItem(FULL_KEY)!).content).toBe('나중에 바꾼 내용입니다');
    });
  });

  describe('복원', () => {
    it('과거 localStorage 본문은 읽거나 복원하지 않고 삭제한다', () => {
      localStorage.setItem(FULL_KEY, JSON.stringify(storedDraft()));
      localStorage.setItem('unrelated-preference', 'keep');
      const read = vi.spyOn(Storage.prototype, 'getItem');
      const { result, onRestore } = setup();
      expect(read).not.toHaveBeenCalled();
      expect(result.current.hasDraft).toBe(false);
      expect(onRestore).not.toHaveBeenCalled();
      expect(localStorage.getItem(FULL_KEY)).toBeNull();
      expect(localStorage.getItem('unrelated-preference')).toBe('keep');
    });

    it.each([
      ['사용자', { ...SCOPE, ownerId: 'user-2' }],
      ['게시판', { ...SCOPE, boardId: 'BBS-2' }],
    ])('같은 탭의 본문과 File은 복원하되 %s 범위가 다르면 복원되지 않는다', (_label, otherScope) => {
      const file = new File(['draft image'], 'draft.png', { type: 'image/png' });
      const persist = vi.spyOn(Storage.prototype, 'setItem');
      const first = setup({ getFiles: () => [file] });
      act(() => first.result.current.saveDraft());
      first.unmount();
      const otherRestoreFiles = vi.fn();
      const other = setup({ scope: otherScope, onRestoreFiles: otherRestoreFiles });
      expect(other.result.current.restoreDraft()).toBeNull();
      expect(other.onRestore).not.toHaveBeenCalled();
      expect(otherRestoreFiles).not.toHaveBeenCalled();
      other.unmount();
      const restoreFiles = vi.fn();
      const same = setup({ onRestoreFiles: restoreFiles });
      expect(restoreFiles).not.toHaveBeenCalled();
      expect(same.result.current.restoreDraft()).toMatchObject(LONG);
      expect(same.onRestore).toHaveBeenCalledWith(LONG);
      expect(restoreFiles).toHaveBeenCalledTimes(1);
      expect(restoreFiles.mock.calls[0][0][0]).toBe(file);
      expect(persist).not.toHaveBeenCalled();
    });

    it('저장된 초안은 마운트 시 존재만 감지하고 사용자가 선택할 때 복원한다', () => {
      boardDraftMemoryStorage.setItem(FULL_KEY, JSON.stringify(storedDraft()));

      const { result, onRestore } = setup();

      expect(result.current.hasDraft).toBe(true);
      expect(result.current.lastSavedAt).toBe(NOW.toISOString());
      expect(onRestore).not.toHaveBeenCalled();

      act(() => { result.current.restoreDraft(); });
      expect(onRestore).toHaveBeenCalledWith({ title: '이전 제목', content: '이전 본문' });
    });

    it('TTL이 지난 초안은 첨부와 함께 삭제하고 복원하지 않는다', () => {
      boardDraftMemoryStorage.setItem(FULL_KEY, JSON.stringify(storedDraft({ expiresAt: NOW.getTime() - 1 })));
      boardDraftMemoryStorage.setFiles(FULL_KEY, [new File(['expired'], 'expired.png', { type: 'image/png' })]);
      const onRestoreFiles = vi.fn();

      const { result, onRestore } = setup({ onRestoreFiles });

      expect(result.current.hasDraft).toBe(false);
      expect(result.current.restoreDraft()).toBeNull();
      expect(boardDraftMemoryStorage.getItem(FULL_KEY)).toBeNull();
      expect(boardDraftMemoryStorage.getFiles(FULL_KEY)).toEqual([]);
      expect(onRestore).not.toHaveBeenCalled();
      expect(onRestoreFiles).not.toHaveBeenCalled();
    });

    it('편집 중에도 TTL 경계에 도달하면 본문과 첨부를 복원하지 않는다', () => {
      const file = new File(['expired'], 'expired.webm', { type: 'video/webm' });
      const onRestoreFiles = vi.fn();
      const { result, onRestore } = setup({ ttlMs: 1000, interval: 10_000, getFiles: () => [file], onRestoreFiles });
      act(() => result.current.saveDraft());
      expect(boardDraftMemoryStorage.getFiles(FULL_KEY)[0]).toBe(file);

      act(() => vi.advanceTimersByTime(1000));

      expect(result.current.restoreDraft()).toBeNull();
      expect(boardDraftMemoryStorage.getItem(FULL_KEY)).toBeNull();
      expect(boardDraftMemoryStorage.getFiles(FULL_KEY)).toEqual([]);
      expect(onRestore).not.toHaveBeenCalled();
      expect(onRestoreFiles).not.toHaveBeenCalled();
    });

    it('legacy 공유 키는 복원하지 않고 즉시 제거한다', () => {
      const legacyKey = 'egov-draft-board_insert_BBS_001';
      localStorage.setItem(legacyKey, JSON.stringify({
        title: '다른 사용자 제목', content: '다른 사용자 본문', savedAt: NOW.toISOString(),
      }));

      const { result, onRestore } = setup();

      expect(localStorage.getItem(legacyKey)).toBeNull();
      expect(result.current.hasDraft).toBe(false);
      expect(onRestore).not.toHaveBeenCalled();
    });

    it('저장된 초안이 없으면 hasDraft 가 false 다', () => {
      const { result, onRestore } = setup();

      expect(result.current.hasDraft).toBe(false);
      expect(result.current.lastSavedAt).toBeNull();
      expect(onRestore).not.toHaveBeenCalled();
    });

    it('깨진 JSON 은 null 로 처리한다 — 글쓰기 화면이 죽으면 안 된다', () => {
      boardDraftMemoryStorage.setItem(FULL_KEY, '{이건 JSON 이 아니다');

      const { result } = setup();

      // 파싱 예외가 새면 초안 하나 때문에 그 게시판 글쓰기가 영구히 열리지 않는다.
      expect(result.current.hasDraft).toBe(false);
      expect(result.current.restoreDraft()).toBeNull();
      expect(boardDraftMemoryStorage.getItem(FULL_KEY)).toBeNull();
    });

    it('onRestore 를 주지 않아도 복원값을 돌려준다', () => {
      boardDraftMemoryStorage.setItem(FULL_KEY, JSON.stringify(storedDraft({ title: 'T', content: 'C' })));

      const { result } = renderHook(() =>
        useAutoSaveDraft({ scope: SCOPE, getData: () => LONG })
      );

      expect(result.current.restoreDraft()).toMatchObject({ title: 'T', content: 'C' });
    });

    it('본문 콜백 없이 파일 복원 콜백만 전달해도 같은 초안의 File을 복원한다', () => {
      const file = new File(['draft'], 'draft.png', { type: 'image/png' });
      boardDraftMemoryStorage.setItem(FULL_KEY, JSON.stringify(storedDraft()));
      boardDraftMemoryStorage.setFiles(FULL_KEY, [file]);
      const onRestoreFiles = vi.fn();
      const { result } = setup({ onRestore: undefined, onRestoreFiles });
      expect(onRestoreFiles).not.toHaveBeenCalled();

      expect(result.current.restoreDraft()).toMatchObject({ title: '이전 제목', content: '이전 본문' });

      expect(onRestoreFiles).toHaveBeenCalledTimes(1);
      expect(onRestoreFiles.mock.calls[0][0][0]).toBe(file);
    });
  });

  describe('삭제', () => {
    it('로그아웃 후 늦은 타이머·복원 콜백은 이전 초안을 되살리지 않는다', () => {
      const file = new File(['old'], 'old.png', { type: 'image/png' });
      const onRestoreFiles = vi.fn();
      const { result, onRestore } = setup({ interval: 1000, getFiles: () => [file], onRestoreFiles });
      act(() => result.current.saveDraft());
      expect(boardDraftMemoryStorage.getFiles(FULL_KEY)[0]).toBe(file);
      const lateSave = result.current.saveDraft;
      act(() => purgeBoardDraftStorage());
      act(() => {
        vi.advanceTimersByTime(3000);
        lateSave();
      });
      expect(result.current.restoreDraft()).toBeNull();
      expect(boardDraftMemoryStorage.getItem(FULL_KEY)).toBeNull();
      expect(boardDraftMemoryStorage.getFiles(FULL_KEY)).toEqual([]);
      expect(onRestore).not.toHaveBeenCalled();
      expect(onRestoreFiles).not.toHaveBeenCalled();
    });

    it('로그아웃 전 훅의 늦은 저장은 새 세션이 보관한 본문과 첨부를 덮어쓰지 않는다', () => {
      const oldFile = new File(['old'], 'old.png', { type: 'image/png' });
      const oldHook = setup({ interval: 1000, getFiles: () => [oldFile] });
      act(() => oldHook.result.current.saveDraft());
      act(() => purgeBoardDraftStorage());

      const newFile = new File(['new'], 'new.webm', { type: 'video/webm' });
      const newData = { title: '새 세션의 제목', content: '새 세션에서 작성한 본문' };
      const onRestoreFiles = vi.fn();
      const current = setup({ getData: () => newData, getFiles: () => [newFile], onRestoreFiles });
      act(() => current.result.current.saveDraft());
      act(() => {
        vi.advanceTimersByTime(2000);
        oldHook.result.current.saveDraft();
      });

      expect(oldHook.result.current.restoreDraft()).toBeNull();
      expect(current.result.current.restoreDraft()).toMatchObject(newData);
      expect(onRestoreFiles.mock.calls[0][0][0]).toBe(newFile);
      expect(boardDraftMemoryStorage.getFiles(FULL_KEY)).toEqual([newFile]);
    });

    it('이전 세션의 늦은 제출 완료가 같은 사용자의 새 초안과 File을 삭제하지 않는다', () => {
      const oldHook = setup();
      act(() => oldHook.result.current.saveDraft());
      const lateClear = oldHook.result.current.clearDraft;
      oldHook.unmount();
      act(() => purgeBoardDraftStorage());

      const file = new File(['new session'], 'new.png', { type: 'image/png' });
      const data = { title: '재로그인 뒤 제목', content: '재로그인 뒤 작성한 본문' };
      const onRestoreFiles = vi.fn();
      const current = setup({ getData: () => data, getFiles: () => [file], onRestoreFiles });
      act(() => current.result.current.saveDraft());
      const saved = boardDraftMemoryStorage.getItem(FULL_KEY);

      act(() => lateClear());

      expect(boardDraftMemoryStorage.getItem(FULL_KEY)).toBe(saved);
      expect(boardDraftMemoryStorage.getFiles(FULL_KEY)[0]).toBe(file);
      expect(current.result.current.hasDraft).toBe(true);
      expect(current.result.current.restoreDraft()).toMatchObject(data);
      expect(onRestoreFiles.mock.calls[0][0][0]).toBe(file);
    });

    it('정상 제출 뒤 같은 입력을 자동 저장하거나 이탈 경고하지 않는다', () => {
      const file = new File(['submitted'], 'submitted.png', { type: 'image/png' });
      const { result } = setup({ interval: 1000, getFiles: () => [file] });
      act(() => result.current.saveDraft());
      act(() => result.current.clearDraft());
      act(() => vi.advanceTimersByTime(3000));
      const event = new Event('beforeunload', { cancelable: true });
      act(() => window.dispatchEvent(event));
      expect(event.defaultPrevented).toBe(false);
      expect(boardDraftMemoryStorage.getItem(FULL_KEY)).toBeNull();
      expect(boardDraftMemoryStorage.getFiles(FULL_KEY)).toEqual([]);
    });
    it('정상 제출 후 초안을 지우고 상태도 되돌린다', () => {
      boardDraftMemoryStorage.setItem(FULL_KEY, JSON.stringify(storedDraft({ title: 'T', content: 'C' })));
      const { result } = setup();
      expect(result.current.hasDraft).toBe(true);

      act(() => { result.current.clearDraft(); });

      // 지우지 않으면 다음 글쓰기에서 **이미 올린 글이 초안으로 되살아난다.**
      expect(boardDraftMemoryStorage.getItem(FULL_KEY)).toBeNull();
      expect(result.current.hasDraft).toBe(false);
      expect(result.current.lastSavedAt).toBeNull();
    });

    it('다른 게시판의 초안은 건드리지 않는다', () => {
      const otherKey = buildBoardDraftStorageKey({ ...SCOPE, boardId: 'OTHER' });
      boardDraftMemoryStorage.setItem(otherKey, JSON.stringify(storedDraft({ title: 'x', content: 'y' })));
      const { result } = setup();

      act(() => { result.current.clearDraft(); });

      // 키에 boardId 가 안 섞이면 한 게시판 제출이 다른 게시판 초안을 지운다.
      expect(boardDraftMemoryStorage.getItem(otherKey)).not.toBeNull();
    });
  });

  describe('주기 저장과 정리', () => {
    it('복구 결정 중에는 기존 본문과 File을 덮지 않고 결정 후 주기 저장을 재개한다', () => {
      const draft = storedDraft();
      const file = new File(['draft'], 'draft.png', { type: 'image/png' });
      const nextFile = new File(['next'], 'next.webm', { type: 'video/webm' });
      boardDraftMemoryStorage.setItem(FULL_KEY, JSON.stringify(draft));
      boardDraftMemoryStorage.setFiles(FULL_KEY, [file]);
      const onRestore = vi.fn();
      const onRestoreFiles = vi.fn();
      const { result, rerender } = renderHook(({ enabled }) => useAutoSaveDraft({
        scope: SCOPE, enabled, getData: () => LONG, getFiles: () => [nextFile],
        onRestore, onRestoreFiles,
      }), { initialProps: { enabled: false } });

      act(() => {
        vi.advanceTimersByTime(6000);
        window.dispatchEvent(new Event('beforeunload', { cancelable: true }));
        result.current.saveDraft();
      });

      expect(JSON.parse(boardDraftMemoryStorage.getItem(FULL_KEY)!)).toEqual(draft);
      expect(boardDraftMemoryStorage.getFiles(FULL_KEY)[0]).toBe(file);
      act(() => { result.current.restoreDraft(); });
      expect(onRestore).toHaveBeenCalledWith({ title: draft.title, content: draft.content });
      expect(onRestoreFiles.mock.calls[0][0][0]).toBe(file);

      rerender({ enabled: true });
      act(() => vi.advanceTimersByTime(3000));
      expect(JSON.parse(boardDraftMemoryStorage.getItem(FULL_KEY)!)).toMatchObject(LONG);
      expect(boardDraftMemoryStorage.getFiles(FULL_KEY)[0]).toBe(nextFile);
    });

    it('미제출 입력의 문서 이탈을 확인하고 pagehide에서 메모리를 비운다', () => {
      const file = new File(['draft'], 'draft.png', { type: 'image/png' });
      const { result } = setup({ getFiles: () => [file] });
      const event = new Event('beforeunload', { cancelable: true });
      act(() => window.dispatchEvent(event));
      expect(event.defaultPrevented).toBe(true);
      expect(result.current.restoreDraft()).toMatchObject(LONG);
      expect(boardDraftMemoryStorage.getFiles(FULL_KEY)[0]).toBe(file);
      act(() => window.dispatchEvent(new Event('pagehide')));
      expect(boardDraftMemoryStorage.getItem(FULL_KEY)).toBeNull();
      expect(boardDraftMemoryStorage.getFiles(FULL_KEY)).toEqual([]);
      expect(result.current.restoreDraft()).toBeNull();
    });
    it('지정한 간격마다 자동 저장한다', () => {
      const { getData } = setup({ interval: 1000 });
      const before = getData.mock.calls.length;

      act(() => { vi.advanceTimersByTime(3000); });

      // 간격을 무시하면 저장이 아예 안 되거나 매 틱마다 쓴다.
      expect(getData.mock.calls.length).toBeGreaterThan(before);
      expect(boardDraftMemoryStorage.getItem(FULL_KEY)).not.toBeNull();
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
      expect(boardDraftMemoryStorage.getItem(FULL_KEY)).toBeNull();

      act(() => { window.dispatchEvent(new Event('beforeunload')); });

      // 마지막 주기 이후에 쓴 내용은 이 저장이 없으면 통째로 사라진다.
      expect(boardDraftMemoryStorage.getItem(FULL_KEY)).not.toBeNull();
      expect(result.current.lastSavedAt).not.toBeNull();
    });

    it('언마운트하면 beforeunload 리스너를 뗀다', () => {
      const { unmount } = setup();
      unmount();
      boardDraftMemoryStorage.clear();
    localStorage.clear();

      act(() => { window.dispatchEvent(new Event('beforeunload')); });

      // 리스너가 남으면 화면을 떠난 뒤에도 옛 내용이 다시 쓰인다.
      expect(boardDraftMemoryStorage.getItem(FULL_KEY)).toBeNull();
    });
  });
});
