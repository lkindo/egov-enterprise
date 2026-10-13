import { beforeEach, describe, expect, it } from 'vitest';
import {
  BOARD_DRAFT_PREFIX,
  boardDraftMemoryStorage,
  buildBoardDraftStorageKey,
  purgeBoardDraftStorage,
  purgePersistedBoardDraftStorage,
  type BoardDraftScope,
} from '../board-draft-storage';

const BASE_SCOPE: BoardDraftScope = {
  ownerId: 'user-1',
  boardId: 'BBS-1',
  action: 'create',
  recordId: 'new',
};

describe('board draft storage namespace', () => {
  beforeEach(() => {
    boardDraftMemoryStorage.clear();
    localStorage.clear();
  });

  it('사용자·게시판·action·record가 하나라도 다르면 서로 다른 키를 만든다', () => {
    const base = buildBoardDraftStorageKey(BASE_SCOPE);
    const variants = [
      { ...BASE_SCOPE, ownerId: 'user-2' },
      { ...BASE_SCOPE, boardId: 'BBS-2' },
      { ...BASE_SCOPE, action: 'update' as const },
      { ...BASE_SCOPE, recordId: '31' },
    ].map(buildBoardDraftStorageKey);

    expect(base.startsWith(BOARD_DRAFT_PREFIX)).toBe(true);
    expect(new Set([base, ...variants]).size).toBe(5);
  });

  it('빈 scope segment는 공유 키를 만들지 않고 거부한다', () => {
    expect(() => buildBoardDraftStorageKey({ ...BASE_SCOPE, ownerId: ' ' })).toThrow();
    expect(() => buildBoardDraftStorageKey({ ...BASE_SCOPE, boardId: '' })).toThrow();
    expect(() => buildBoardDraftStorageKey({ ...BASE_SCOPE, recordId: '' })).toThrow();
  });

  it('첨부는 File 객체를 유지하고 입력·반환 배열의 수정으로 보관본이 바뀌지 않는다', () => {
    const key = buildBoardDraftStorageKey(BASE_SCOPE);
    const file = new File(['draft image'], 'draft.png', { type: 'image/png' });
    const selected = [file];
    boardDraftMemoryStorage.setItem(key, 'draft');
    boardDraftMemoryStorage.setFiles(key, selected);
    selected.length = 0;

    const restored = boardDraftMemoryStorage.getFiles(key);
    expect(restored).toHaveLength(1);
    expect(restored[0]).toBe(file);
    restored.length = 0;
    expect(boardDraftMemoryStorage.getFiles(key)).toEqual([file]);
    expect(localStorage.length).toBe(0);
  });

  it.each([
    ['다른 사용자', { ...BASE_SCOPE, ownerId: 'user-2' }],
    ['다른 게시판', { ...BASE_SCOPE, boardId: 'BBS-2' }],
  ])('%s의 파일은 분리하고 한 초안을 삭제해도 다른 첨부는 보존한다', (_label, otherScope) => {
    const key = buildBoardDraftStorageKey(BASE_SCOPE);
    const otherKey = buildBoardDraftStorageKey(otherScope);
    const file = new File(['first'], 'first.png', { type: 'image/png' });
    const otherFile = new File(['second'], 'second.webm', { type: 'video/webm' });
    boardDraftMemoryStorage.setItem(key, 'first draft');
    boardDraftMemoryStorage.setFiles(key, [file]);
    expect(boardDraftMemoryStorage.getFiles(otherKey)).toEqual([]);
    boardDraftMemoryStorage.setItem(otherKey, 'second draft');
    boardDraftMemoryStorage.setFiles(otherKey, [otherFile]);

    boardDraftMemoryStorage.removeItem(key);

    expect(boardDraftMemoryStorage.getItem(key)).toBeNull();
    expect(boardDraftMemoryStorage.getFiles(key)).toEqual([]);
    expect(boardDraftMemoryStorage.getItem(otherKey)).toBe('second draft');
    expect(boardDraftMemoryStorage.getFiles(otherKey)[0]).toBe(otherFile);
  });

  it('초안이 없거나 이미 삭제됐으면 첨부만 따로 되살리지 않는다', () => {
    const key = buildBoardDraftStorageKey(BASE_SCOPE);
    const file = new File(['draft'], 'draft.png', { type: 'image/png' });
    boardDraftMemoryStorage.setFiles(key, [file]);
    expect(boardDraftMemoryStorage.getFiles(key)).toEqual([]);

    boardDraftMemoryStorage.setItem(key, 'draft');
    boardDraftMemoryStorage.setFiles(key, [file]);
    boardDraftMemoryStorage.removeItem(key);
    boardDraftMemoryStorage.setFiles(key, [file]);
    expect(boardDraftMemoryStorage.getFiles(key)).toEqual([]);
  });

  it('영속 초안 정리는 알려진 legacy 게시글 키만 제거하고 무관한 저장값은 보존한다', () => {
    localStorage.setItem('egov-draft-board_insert_BBS-1', 'legacy');
    localStorage.setItem('autosave_bbs_write', 'legacy');
    localStorage.setItem('unrelated-preference', 'keep');

    purgePersistedBoardDraftStorage(localStorage);

    expect(localStorage.getItem('egov-draft-board_insert_BBS-1')).toBeNull();
    expect(localStorage.getItem('autosave_bbs_write')).toBeNull();
    expect(localStorage.getItem('unrelated-preference')).toBe('keep');
  });

  it('logout purge는 v2와 legacy 게시글 초안만 제거한다', () => {
    localStorage.setItem(buildBoardDraftStorageKey(BASE_SCOPE), 'v2');
    localStorage.setItem('egov-draft-board_insert_BBS-1', 'legacy');
    localStorage.setItem('autosave_bbs_write', 'legacy');
    localStorage.setItem('unrelated-preference', 'keep');

    purgeBoardDraftStorage(localStorage);

    expect(localStorage.getItem(buildBoardDraftStorageKey(BASE_SCOPE))).toBeNull();
    expect(localStorage.getItem('egov-draft-board_insert_BBS-1')).toBeNull();
    expect(localStorage.getItem('autosave_bbs_write')).toBeNull();
    expect(localStorage.getItem('unrelated-preference')).toBe('keep');
  });

  it('로그아웃은 모든 사용자·게시판의 메모리 초안과 File 참조를 함께 비운다', () => {
    const keys = [
      BASE_SCOPE,
      { ...BASE_SCOPE, ownerId: 'user-2' },
      { ...BASE_SCOPE, boardId: 'BBS-2' },
    ].map(buildBoardDraftStorageKey);
    const file = new File(['draft'], 'draft.png', { type: 'image/png' });
    for (const key of keys) {
      boardDraftMemoryStorage.setItem(key, 'draft');
      boardDraftMemoryStorage.setFiles(key, [file]);
    }

    purgeBoardDraftStorage(localStorage);

    for (const key of keys) {
      expect(boardDraftMemoryStorage.getItem(key)).toBeNull();
      expect(boardDraftMemoryStorage.getFiles(key)).toEqual([]);
    }
  });
});
