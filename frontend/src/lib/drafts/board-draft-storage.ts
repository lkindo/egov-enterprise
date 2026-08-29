export const BOARD_DRAFT_PREFIX = 'egov-board-draft:v2:';

const LEGACY_BOARD_DRAFT_PREFIX = 'egov-draft-board_';
const LEGACY_BOARD_AUTOSAVE_KEY = 'autosave_bbs_write';

export interface BoardDraftScope {
  /** 현재 인증 사용자/세션의 불투명 식별자. 익명·빈 값은 허용하지 않는다. */
  ownerId: string;
  boardId: string;
  action: 'create' | 'update';
  /** 신규 작성은 `new`, 수정은 실제 게시글 식별자를 사용한다. */
  recordId: string;
}

function segment(value: string, name: keyof BoardDraftScope): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`게시글 초안 ${name} 범위가 비어 있습니다.`);
  return encodeURIComponent(normalized);
}

/** 사용자/게시판/작업/레코드가 모두 다른 localStorage namespace를 소유한다. */
export function buildBoardDraftStorageKey(scope: BoardDraftScope): string {
  return [
    BOARD_DRAFT_PREFIX.slice(0, -1),
    segment(scope.ownerId, 'ownerId'),
    segment(scope.boardId, 'boardId'),
    scope.action,
    segment(scope.recordId, 'recordId'),
  ].join(':');
}

function removeMatching(storage: Storage, predicate: (key: string) => boolean): void {
  try {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
      .filter((key): key is string => key !== null && predicate(key));
    for (const key of keys) storage.removeItem(key);
  } catch {
    // Safari private mode·storage policy 등으로 접근이 거부돼도 로그아웃/화면 렌더를 막지 않는다.
  }
}

function isLegacyBoardDraftKey(key: string): boolean {
  return key.startsWith(LEGACY_BOARD_DRAFT_PREFIX) || key === LEGACY_BOARD_AUTOSAVE_KEY;
}

/** 호출자가 알고 있는 legacy key만 제거하되 게시글 초안 namespace 밖은 절대 지우지 않는다. */
export function removeLegacyBoardDraftKeys(storage: Storage, keys: readonly string[]): void {
  const allowlist = new Set(keys.filter(isLegacyBoardDraftKey));
  removeMatching(storage, (key) => allowlist.has(key));
}

/** 공유 namespace였던 구 구현은 소유자를 판별할 수 없으므로 복원하지 않고 제거한다. */
export function purgeLegacyBoardDraftStorage(storage: Storage): void {
  removeMatching(
    storage,
    isLegacyBoardDraftKey,
  );
}

/** 로그아웃 시 모든 게시글 초안과 판별 불가능한 legacy 초안을 제거한다. */
export function purgeBoardDraftStorage(storage: Storage): void {
  removeMatching(
    storage,
    (key) => key.startsWith(BOARD_DRAFT_PREFIX)
      || isLegacyBoardDraftKey(key),
  );
}
