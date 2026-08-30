import { beforeEach, describe, expect, it } from 'vitest';
import {
  BOARD_DRAFT_PREFIX,
  buildBoardDraftStorageKey,
  purgeBoardDraftStorage,
  purgeLegacyBoardDraftStorage,
  type BoardDraftScope,
} from '../board-draft-storage';

const BASE_SCOPE: BoardDraftScope = {
  ownerId: 'user-1',
  boardId: 'BBS-1',
  action: 'create',
  recordId: 'new',
};

describe('board draft storage namespace', () => {
  beforeEach(() => localStorage.clear());

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

  it('legacy 정리는 알려진 게시글 키만 제거하고 무관한 저장값은 보존한다', () => {
    localStorage.setItem('egov-draft-board_insert_BBS-1', 'legacy');
    localStorage.setItem('autosave_bbs_write', 'legacy');
    localStorage.setItem('unrelated-preference', 'keep');

    purgeLegacyBoardDraftStorage(localStorage);

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
});
