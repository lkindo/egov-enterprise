import { MenuPropertiesRequestSchema } from '@/types/generated-zod';
import type { MenuStructureItem, MenuStructureSave } from '@/services/foundation/system/MenuAdminService';
import { flattenTree, listToTree, MAX_MENU_DEPTH, type FlattenedItem } from './treeUtils';

/**
 * 메뉴 구조 초안(draft) 모델 — 화면 표현과 분리한 순수 함수다.
 *
 * [2026-10-02 1단계] 작업 표현은 서버 목록을 펼친 선순회 목록(`FlattenedItem[]`, 각 행이 parentId·depth 를 가진다)이다.
 * 메뉴와 그 하위 전체는 목록에서 항상 붙어 있는 한 구간(블록)이며, 옮기기는 언제나 블록 단위다. 종전 끌기는 끈 행 하나만
 * 옮겨 하위가 엉뚱한 상위 밑에 그려지거나, 자기 하위로 옮겨 서버가 400 을 내거나, 4단계가 만들어질 수 있었다.
 *
 * [2026-10-02 2단계 D1·D2] 초안은 구조만이 아니라 새 메뉴·삭제 예정·속성(이름·연결 화면·설명·사용 여부)·그룹별 메뉴 표시와
 * 진입 권한 추가까지 한 묶음이고, 저장도 한 번이다(PUT /menus/structure). 새 메뉴는 아직 번호가 없으므로 음수 번호(-1, -2 …)로
 * 두고, 저장 요청에서는 'new-1', 'new-2' … 키로 보낸다.
 *
 * 변경 여부는 플래그가 아니라 **기준선(서버에서 읽은 구조) 대비 계산값**이다. 그래서 제자리에 놓거나 원래 값으로 되돌리면
 * 변경이 0 이 되고, 행별 변경 표시·변경 목록·항목별 되돌리기·저장 내용이 한 원천에서 나온다.
 *
 * 인가 의미는 바꾸지 않는다(H3) — 메뉴 표시(NAVIGATION)와 기능권한(OPERATION)은 다른 권한이고, 상위 메뉴 표시를 묵시로 주지
 * 않는다. 하위의 표시를 켜면 상위의 표시를 **초안에 명시적으로** 함께 켜고(변경 요약에 보인다), 상위를 끄면 하위도 끈다.
 */

/** 상위 메뉴 키. null 이 최상위다(서버의 0·null 을 하나로 본다). */
export type MenuParentKey = number | null;

export type MenuChangeKind = 'move' | 'order';

export interface MenuChange {
  menuNo: number;
  /** move: 상위가 바뀌었다. order: 같은 상위 안에서 상대 순서가 바뀌었다. */
  kind: MenuChangeKind;
  fromParent: MenuParentKey;
  toParent: MenuParentKey;
}

export const parentKeyOf = (parentId: number | null | undefined): MenuParentKey => (parentId ? parentId : null);

// ─── 새 메뉴 키 ──────────────────────────────────────────────────────────────────────────────────────

/** 저장 전 새 메뉴인가(음수 번호). */
export const isNewMenu = (menuNo: number): boolean => menuNo < 0;

/** 저장 요청의 메뉴 참조. 기존 메뉴는 번호, 새 메뉴는 'new-1' 같은 키다. */
export function menuRef(menuNo: number): string {
  return menuNo < 0 ? `new-${-menuNo}` : String(menuNo);
}

/** 메뉴 참조('12', 'new-1')를 화면 번호(12, -1)로 되돌린다. 알 수 없는 값은 null. */
export function menuNoOfRef(ref: string): number | null {
  const created = /^new-([1-9][0-9]{0,5})$/.exec(ref);
  if (created) return -Number(created[1]);
  return /^[1-9][0-9]{0,15}$/.test(ref) ? Number(ref) : null;
}

/** 그룹 권한 키(권한 카탈로그의 type:code 와 같은 모양). */
export const navigationKey = (menuNo: number): string => `NAVIGATION:${menuRef(menuNo)}`;
export const operationKey = (code: string): string => `OPERATION:${code}`;

// ─── 선순회 목록 기본 연산(1단계) ─────────────────────────────────────────────────────────────────

/** 메뉴와 그 하위 전부가 목록에서 차지하는 구간의 끝(포함하지 않음). */
function blockEnd(items: readonly FlattenedItem[], start: number): number {
  const depth = items[start].depth;
  let end = start + 1;
  while (end < items.length && items[end].depth > depth) end += 1;
  return end;
}

/** 하위 메뉴가 몇 단계 더 내려가는가(하위가 없으면 0). */
export function subtreeHeight(items: readonly FlattenedItem[], menuNo: number): number {
  const start = items.findIndex((item) => item.menuNo === menuNo);
  if (start < 0) return 0;
  const base = items[start].depth;
  let height = 0;
  for (let i = start + 1; i < blockEnd(items, start); i += 1) height = Math.max(height, items[i].depth - base);
  return height;
}

/** 메뉴의 모든 하위(자기 자신 제외) 번호. */
export function descendantIds(items: readonly FlattenedItem[], menuNo: number): Set<number> {
  const start = items.findIndex((item) => item.menuNo === menuNo);
  const ids = new Set<number>();
  if (start < 0) return ids;
  for (let i = start + 1; i < blockEnd(items, start); i += 1) ids.add(items[i].menuNo);
  return ids;
}

/** 상위별 하위 메뉴 순서. 선순회 목록을 그대로 따르므로 열쇠는 최상위(null)부터 나타난 순서다. */
export function siblingOrder(items: readonly FlattenedItem[]): Map<MenuParentKey, number[]> {
  const order = new Map<MenuParentKey, number[]>();
  for (const item of items) {
    const key = parentKeyOf(item.parentId);
    const siblings = order.get(key);
    if (siblings) siblings.push(item.menuNo);
    else order.set(key, [item.menuNo]);
  }
  return order;
}

/** 형제 안 순번(index)을 다시 매긴다. */
function reindex(items: readonly FlattenedItem[]): FlattenedItem[] {
  const next = new Map<MenuParentKey, number>();
  return items.map((item) => {
    const key = parentKeyOf(item.parentId);
    const index = next.get(key) ?? 0;
    next.set(key, index + 1);
    return item.index === index ? item : { ...item, index };
  });
}

/**
 * 메뉴를 하위 전체와 함께 `newParent` 아래 `index` 번째(그 메뉴를 뺀 형제 목록 기준)로 옮긴다.
 *
 * - 자기 자신·자기 하위를 상위로 고르거나, 옮긴 뒤 하위까지 3단계(`MAX_MENU_DEPTH`)를 넘으면 null(거부)이다.
 * - 제자리면 **입력 배열 그대로**를 돌려준다 — 호출부는 `result === items` 로 '바뀐 것 없음' 을 안다.
 * - index 는 0..형제 수로 맞춘다(넘으면 맨 뒤).
 */
export function moveBlock(
  items: readonly FlattenedItem[],
  menuNo: number,
  newParent: MenuParentKey,
  index: number,
): readonly FlattenedItem[] | null {
  const start = items.findIndex((item) => item.menuNo === menuNo);
  if (start < 0) return null;
  const end = blockEnd(items, start);
  const block = items.slice(start, end);
  const target = parentKeyOf(newParent);
  if (target !== null && block.some((item) => item.menuNo === target)) return null;

  const rest = [...items.slice(0, start), ...items.slice(end)];
  let parentIndex = -1;
  let newDepth = 0;
  if (target !== null) {
    parentIndex = rest.findIndex((item) => item.menuNo === target);
    if (parentIndex < 0) return null;
    newDepth = rest[parentIndex].depth + 1;
  }
  const node = items[start];
  const height = block.reduce((max, item) => Math.max(max, item.depth - node.depth), 0);
  if (newDepth + height > MAX_MENU_DEPTH) return null;

  const siblingStarts: number[] = [];
  rest.forEach((item, i) => { if (parentKeyOf(item.parentId) === target) siblingStarts.push(i); });
  const position = Number.isNaN(index)
    ? siblingStarts.length
    : Math.max(0, Math.min(siblingStarts.length, Math.trunc(index)));

  if (parentKeyOf(node.parentId) === target) {
    const original = (siblingOrder(items).get(target) ?? []).indexOf(menuNo);
    if (original === position) return items;
  }

  let insertAt: number;
  if (position < siblingStarts.length) insertAt = siblingStarts[position];
  else insertAt = target === null ? rest.length : blockEnd(rest, parentIndex);

  const delta = newDepth - node.depth;
  const moved = block.map((item, i) => (i === 0
    ? { ...item, parentId: target, depth: newDepth }
    : delta === 0 ? item : { ...item, depth: item.depth + delta }));
  return reindex([...rest.slice(0, insertAt), ...moved, ...rest.slice(insertAt)]);
}

/** 같은 상위 안에서 한 칸 위(-1)·아래(+1) 형제 블록과 자리를 바꾼다. 옮길 형제가 없으면 null 이다. */
export function shiftBlock(
  items: readonly FlattenedItem[],
  menuNo: number,
  direction: -1 | 1,
): readonly FlattenedItem[] | null {
  const node = items.find((item) => item.menuNo === menuNo);
  if (!node) return null;
  const key = parentKeyOf(node.parentId);
  const siblings = siblingOrder(items).get(key) ?? [];
  const target = siblings.indexOf(menuNo) + direction;
  if (target < 0 || target >= siblings.length) return null;
  return moveBlock(items, menuNo, key, target);
}

/**
 * 최장 증가 부분수열에 드는 위치들. 값이 서로 다른 수열에 쓴다. 같은 길이의 해가 여럿이면(인접한 둘의 맞바꿈 등)
 * 결정적으로 하나를 고른다 — 어느 쪽을 표시해도 '상대 순서가 바뀌었다' 는 사실은 같다.
 */
function longestIncreasingPositions(sequence: readonly number[]): Set<number> {
  const tails: number[] = [];
  const previous = new Array<number>(sequence.length).fill(-1);
  sequence.forEach((value, i) => {
    let low = 0;
    let high = tails.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (sequence[tails[mid]] < value) low = mid + 1;
      else high = mid;
    }
    previous[i] = low > 0 ? tails[low - 1] : -1;
    tails[low] = i;
  });
  const positions = new Set<number>();
  for (let i = tails.length > 0 ? tails[tails.length - 1] : -1; i >= 0; i = previous[i]) positions.add(i);
  return positions;
}

/**
 * 기준선 대비 위치가 바뀐 메뉴. 현재 목록 순서로 돌려준다.
 *
 * - 상위가 바뀐 메뉴 = move.
 * - 같은 상위에 남은 메뉴들을 기준선 순번으로 늘어놓았을 때 최장 증가 부분수열 밖의 메뉴 = order. 하나를 맨 앞으로
 *   옮겨도 그 하나만 표시된다(나머지 형제의 상대 순서는 그대로다). 형제가 빠지거나 들어온 것만으로는 표시하지 않는다.
 * - 기준선에 없는 메뉴(새 메뉴)는 위치 변경이 아니다.
 */
export function menuChanges(
  baseline: readonly FlattenedItem[],
  current: readonly FlattenedItem[],
): MenuChange[] {
  const baseParent = new Map<number, MenuParentKey>();
  const baseIndex = new Map<number, number>();
  for (const [key, children] of siblingOrder(baseline)) {
    children.forEach((menuNo, i) => { baseParent.set(menuNo, key); baseIndex.set(menuNo, i); });
  }
  const ordered = new Set<number>();
  for (const [key, children] of siblingOrder(current)) {
    const stayers = children.filter((menuNo) => baseParent.has(menuNo) && baseParent.get(menuNo) === key);
    const keep = longestIncreasingPositions(stayers.map((menuNo) => baseIndex.get(menuNo) as number));
    stayers.forEach((menuNo, i) => { if (!keep.has(i)) ordered.add(menuNo); });
  }
  const changes: MenuChange[] = [];
  for (const item of current) {
    if (!baseParent.has(item.menuNo)) continue;
    const fromParent = baseParent.get(item.menuNo) as MenuParentKey;
    const toParent = parentKeyOf(item.parentId);
    if (fromParent !== toParent) changes.push({ menuNo: item.menuNo, kind: 'move', fromParent, toParent });
    else if (ordered.has(item.menuNo)) changes.push({ menuNo: item.menuNo, kind: 'order', fromParent, toParent });
  }
  return changes;
}

/**
 * 메뉴 하나의 위치 변경을 되돌린다. 기준선 상위 아래, 기준선에서 바로 앞이던 형제 가운데 지금 그 상위 아래에 있는 가장
 * 가까운 메뉴의 뒤(없으면 맨 앞)로 하위와 함께 옮긴다. 되돌릴 자리가 지금 구조와 맞지 않으면(다른 메뉴를 그 하위로
 * 옮겨 3단계를 넘는 등) null 이다 — 다른 변경을 먼저 되돌려야 한다. 바뀐 것이 없으면 입력 배열 그대로다.
 */
export function revertMenu(
  baseline: readonly FlattenedItem[],
  current: readonly FlattenedItem[],
  menuNo: number,
): readonly FlattenedItem[] | null {
  const baseNode = baseline.find((item) => item.menuNo === menuNo);
  if (!baseNode) return null;
  const parent = parentKeyOf(baseNode.parentId);
  const baseSiblings = siblingOrder(baseline).get(parent) ?? [];
  const currentSiblings = (siblingOrder(current).get(parent) ?? []).filter((id) => id !== menuNo);
  let index = 0;
  for (let k = baseSiblings.indexOf(menuNo) - 1; k >= 0; k -= 1) {
    const position = currentSiblings.indexOf(baseSiblings[k]);
    if (position >= 0) { index = position + 1; break; }
  }
  return moveBlock(current, menuNo, parent, index);
}

/** 상위 메뉴들(최상위부터). 자기 자신은 넣지 않는다. */
export function ancestorIds(items: readonly FlattenedItem[], menuNo: number): number[] {
  const parentOf = new Map(items.map((item) => [item.menuNo, parentKeyOf(item.parentId)] as const));
  const chain: number[] = [];
  const seen = new Set<number>([menuNo]);
  for (let parent = parentOf.get(menuNo) ?? null; parent !== null && !seen.has(parent); parent = parentOf.get(parent) ?? null) {
    seen.add(parent);
    chain.unshift(parent);
  }
  return chain;
}

/** 메뉴 이름. 새 메뉴의 이름이 비어 있으면 '이름 없는 새 메뉴' 다. */
export function menuLabel(items: readonly FlattenedItem[], menuNo: number): string {
  const name = items.find((item) => item.menuNo === menuNo)?.menuNm?.trim();
  if (name) return name;
  return isNewMenu(menuNo) ? '이름 없는 새 메뉴' : `ID ${menuNo}`;
}

/** 상위 경로 문구. 최상위면 '최상위', 아니면 '나의 업무 › 결재' 처럼 이어 쓴다. */
export function parentPathLabel(items: readonly FlattenedItem[], parent: MenuParentKey): string {
  if (parent === null) return '최상위';
  return [...ancestorIds(items, parent), parent].map((id) => menuLabel(items, id)).join(' › ');
}

// ─── 서버 구조 → 기준선 ────────────────────────────────────────────────────────────────────────────

/**
 * 메뉴 구조 응답을 선순회 목록으로 편다. 형제는 menuOrdr, 같으면 메뉴 번호 순이다(서버 정렬과 같다). 상위가 목록에 없는
 * 메뉴(고아)는 최상위로 둔다 — 화면에서 사라지지 않게 한다.
 */
export function structureItems(menus: readonly MenuStructureItem[]): FlattenedItem[] {
  return flattenTree(listToTree(menus.map((menu) => ({
    menuNo: menu.menuNo,
    menuNm: menu.menuNm,
    upMenuSn: menu.upMenuSn ?? 0,
    upperMenuId: menu.upMenuSn ?? 0,
    menuOrdr: menu.menuOrdr,
    modernRoute: menu.modernRoute ?? undefined,
    menuExpln: menu.menuExpln ?? undefined,
    useYn: menu.useYn === 'Y' ? 'Y' : 'N',
  }))));
}

// ─── 그룹 ─────────────────────────────────────────────────────────────────────────────────────────

/** 그룹의 저장된 권한(기준선). grants 는 'NAVIGATION:12'·'OPERATION:MENU_READ' 같은 키다. */
export interface MenuGroup {
  code: string;
  name: string;
  version: string;
  grants: ReadonlySet<string>;
}

/** 전체 그룹 권한 응답을 그룹 기준선으로 바꾼다(코드 순 — 서버 순서 그대로). */
export function menuGroupsOf(groups: readonly { code: string; name: string; version: string; grants: readonly { type: string; code: string }[] }[]): MenuGroup[] {
  return groups.map((group) => ({
    code: group.code,
    name: group.name,
    version: group.version,
    grants: new Set(group.grants.map((grant) => `${grant.type}:${grant.code}`)),
  }));
}

/**
 * 한 그룹의 초안. 처음 건드린 시점의 그룹 버전과 권한(base)을 함께 둔다 — 저장은 그 버전으로 보내므로 그 사이 다른 곳에서
 * 권한이 바뀌었으면 서버가 409 로 거부한다(전체 그룹 권한을 다시 읽어도 초안이 남의 변경을 덮지 않는다).
 */
export interface GroupDraft {
  version: string;
  base: ReadonlySet<string>;
  grants: ReadonlySet<string>;
}

// ─── 초안 ─────────────────────────────────────────────────────────────────────────────────────────

export interface MenuDraft {
  /** 지금 구조(선순회). 새 메뉴(음수 번호)와 삭제 예정 메뉴도 들어 있다. 속성(이름·경로·설명·사용)은 초안 값이다. */
  items: readonly FlattenedItem[];
  /** 삭제 예정인 기존 메뉴. */
  deleted: ReadonlySet<number>;
  /** 건드린 그룹의 초안(그룹 코드 → 초안). */
  groups: ReadonlyMap<string, GroupDraft>;
  /** 다음 새 메뉴 키 숫자(새 메뉴 번호는 -nextNew). */
  nextNew: number;
}

export function startDraft(baseline: readonly FlattenedItem[]): MenuDraft {
  return { items: baseline, deleted: new Set(), groups: new Map(), nextNew: 1 };
}

/** 초안 연산의 결과. 바뀐 것이 없으면 같은 draft 를 돌려준다(호출부는 `result.draft === draft` 로 안다). */
export type DraftResult = { ok: true; draft: MenuDraft; menuNo?: number } | { ok: false; reason: string };

const fail = (reason: string): DraftResult => ({ ok: false, reason });

/**
 * 입력 상한 — 이름·경로·설명은 생성 계약(서버 MenuProperties 의 @Size)에서 읽는다. 새 메뉴·삭제 개수 상한(@Size 200)은 생성
 * 계약의 배열 상한과 같다는 것을 단위 테스트가 대조한다(바뀌면 red).
 */
export const MENU_LIMITS = {
  name: MenuPropertiesRequestSchema.shape.menuNm.maxLength ?? 100,
  route: MenuPropertiesRequestSchema.shape.modernRoute.unwrap().unwrap().maxLength ?? 500,
  description: MenuPropertiesRequestSchema.shape.menuExpln.unwrap().unwrap().maxLength ?? 4000,
  creations: 200,
  deletions: 200,
} as const;

const REASON = {
  missing: '그 메뉴를 찾을 수 없습니다. 메뉴 구조를 다시 불러오세요.',
  deletedSelf: '삭제 예정 메뉴는 옮길 수 없습니다. 삭제를 먼저 취소하세요.',
  self: '자기 자신이나 자기 하위 메뉴 아래로는 옮길 수 없습니다.',
  intoDeleted: '삭제 예정 메뉴 아래로는 옮길 수 없습니다.',
  twoLevels: '하위 메뉴가 두 단계까지 있는 메뉴는 영역(최상위)으로만 둘 수 있습니다.',
  oneLevel: '하위가 있는 메뉴는 영역 바로 아래에만 둘 수 있습니다.',
  maxDepth: '메뉴는 3단계까지만 둘 수 있습니다.',
} as const;

/**
 * 메뉴(또는 새 메뉴 = null)를 `parent` 아래에 둘 수 없는 이유. 둘 수 있으면 null 이다. 옮기기·끌기·붙여넣기·'다른 곳으로
 * 옮기기' 대화상자가 같은 판정을 쓴다(서버도 순환·3단계·삭제 예정 상위를 거부한다).
 */
export function placementProblem(
  items: readonly FlattenedItem[],
  deleted: ReadonlySet<number>,
  menuNo: number | null,
  parent: MenuParentKey,
): string | null {
  if (menuNo !== null) {
    if (!items.some((item) => item.menuNo === menuNo)) return REASON.missing;
    if (deleted.has(menuNo)) return REASON.deletedSelf;
  }
  if (parent === null) return null;
  const target = items.find((item) => item.menuNo === parent);
  if (!target) return REASON.missing;
  if (menuNo !== null && (parent === menuNo || descendantIds(items, menuNo).has(parent))) return REASON.self;
  if (deleted.has(parent)) return REASON.intoDeleted;
  const height = menuNo === null ? 0 : subtreeHeight(items, menuNo);
  if (target.depth + 1 + height > MAX_MENU_DEPTH) {
    if (height >= 2) return REASON.twoLevels;
    if (height === 1) return REASON.oneLevel;
    return REASON.maxDepth;
  }
  return null;
}

/** 메뉴를 하위와 함께 `parent` 아래 `index` 번째로 옮긴다(index 가 크면 맨 뒤). */
export function moveMenu(draft: MenuDraft, menuNo: number, parent: MenuParentKey, index: number): DraftResult {
  const problem = placementProblem(draft.items, draft.deleted, menuNo, parent);
  if (problem) return fail(problem);
  const next = moveBlock(draft.items, menuNo, parent, index);
  if (!next) return fail(REASON.maxDepth);
  return { ok: true, draft: next === draft.items ? draft : { ...draft, items: next }, menuNo };
}

/** 같은 상위 안에서 한 칸 옮긴다. 더 갈 자리가 없으면 그 이유를 돌려준다. */
export function shiftMenu(draft: MenuDraft, menuNo: number, direction: -1 | 1): DraftResult {
  if (draft.deleted.has(menuNo)) return fail(REASON.deletedSelf);
  const next = shiftBlock(draft.items, menuNo, direction);
  if (!next) {
    return fail(`${menuLabel(draft.items, menuNo)} 메뉴는 같은 상위 안에서 더 ${direction < 0 ? '위로' : '아래로'} 옮길 수 없습니다.`);
  }
  return { ok: true, draft: { ...draft, items: next }, menuNo };
}

export interface NewMenuValues {
  menuNm?: string;
  modernRoute?: string | null;
}

/**
 * 새 메뉴를 `parent` 아래 `index` 번째(크면 맨 끝)에 초안으로 만든다. 저장 전 새 메뉴는 어느 그룹에도 보이지 않는다 —
 * 그룹 초안에 아무것도 더하지 않는다(서버가 저장할 때 관리자 그룹 호환 배정만 자동으로 한다).
 */
export function addMenu(draft: MenuDraft, parent: MenuParentKey, index: number, values: NewMenuValues = {}): DraftResult {
  if (draft.items.filter((item) => isNewMenu(item.menuNo)).length >= MENU_LIMITS.creations) {
    return fail(`새 메뉴는 한 번에 ${MENU_LIMITS.creations}개까지 만들 수 있습니다. 먼저 저장하세요.`);
  }
  const problem = placementProblem(draft.items, draft.deleted, null, parent);
  if (problem) return fail(problem);
  const menuNo = -draft.nextNew;
  const created: FlattenedItem = {
    menuNo,
    menuNm: values.menuNm ?? '',
    upMenuSn: 0,
    upperMenuId: 0,
    menuOrdr: 0,
    modernRoute: values.modernRoute ?? undefined,
    menuExpln: undefined,
    useYn: 'Y',
    parentId: null,
    depth: 0,
    index: 0,
  };
  const appended = [...draft.items, created];
  const placed = moveBlock(appended, menuNo, parent, index);
  if (!placed) return fail(REASON.maxDepth);
  return { ok: true, draft: { ...draft, items: reindex(placed), nextNew: draft.nextNew + 1 }, menuNo };
}

/** 그룹 초안들에서 이 메뉴 키들의 메뉴 표시를 뺀다(지운 새 메뉴). 기준선과 같아진 그룹 초안은 버린다. */
function withoutNavigation(groups: ReadonlyMap<string, GroupDraft>, keys: ReadonlySet<string>): ReadonlyMap<string, GroupDraft> {
  if (keys.size === 0) return groups;
  const next = new Map<string, GroupDraft>();
  for (const [code, group] of groups) {
    const grants = new Set([...group.grants].filter((key) => !keys.has(key)));
    if (!sameSet(grants, group.base)) next.set(code, { ...group, grants });
  }
  return next;
}

/** 새 메뉴를 초안에서 지운다. 하위가 있으면 지우지 않는다(하위가 기존 메뉴일 수 있다). */
export function removeNewMenu(draft: MenuDraft, menuNo: number): DraftResult {
  if (!isNewMenu(menuNo) || !draft.items.some((item) => item.menuNo === menuNo)) return fail(REASON.missing);
  if (descendantIds(draft.items, menuNo).size > 0) {
    return fail('하위 메뉴가 있어 지울 수 없습니다. 하위 메뉴를 먼저 옮기거나 지우세요.');
  }
  return {
    ok: true,
    draft: {
      ...draft,
      items: reindex(draft.items.filter((item) => item.menuNo !== menuNo)),
      groups: withoutNavigation(draft.groups, new Set([navigationKey(menuNo)])),
    },
    menuNo,
  };
}

/**
 * 기존 메뉴를 삭제 예정으로 표시하거나 표시를 거둔다. 하위가 남아 있으면 삭제할 수 없다(하위를 먼저 옮기거나 함께 삭제한다 —
 * 서버도 남는 하위를 거부한다). 상위가 삭제 예정이면 하위의 삭제를 먼저 거둘 수 없다.
 */
export function markDeleted(draft: MenuDraft, menuNo: number, deleted: boolean): DraftResult {
  const item = draft.items.find((candidate) => candidate.menuNo === menuNo);
  if (!item || isNewMenu(menuNo)) return fail(REASON.missing);
  if (deleted === draft.deleted.has(menuNo)) return { ok: true, draft, menuNo };
  const next = new Set(draft.deleted);
  if (deleted) {
    const remaining = [...descendantIds(draft.items, menuNo)].filter((id) => !draft.deleted.has(id));
    if (remaining.length > 0) return fail('하위 메뉴가 있어 삭제할 수 없습니다. 하위 메뉴를 먼저 옮기거나 삭제하세요.');
    if (next.size >= MENU_LIMITS.deletions) return fail(`메뉴는 한 번에 ${MENU_LIMITS.deletions}개까지 삭제할 수 있습니다. 먼저 저장하세요.`);
    next.add(menuNo);
  } else {
    const parent = parentKeyOf(item.parentId);
    if (parent !== null && draft.deleted.has(parent)) return fail('상위 메뉴의 삭제를 먼저 취소하세요.');
    next.delete(menuNo);
  }
  return { ok: true, draft: { ...draft, deleted: next }, menuNo };
}

export type MenuEditableField = 'menuNm' | 'modernRoute' | 'menuExpln' | 'useYn';
export type MenuPropertyPatch = Partial<{ menuNm: string; modernRoute: string; menuExpln: string; useYn: 'Y' | 'N' }>;

/** 메뉴 속성(이름·연결 화면 경로·설명·사용 여부)을 초안에 반영한다. 검증은 summarizeDraft 가 한다. */
export function editMenu(draft: MenuDraft, menuNo: number, patch: MenuPropertyPatch): DraftResult {
  if (!draft.items.some((item) => item.menuNo === menuNo)) return fail(REASON.missing);
  if (draft.deleted.has(menuNo)) return fail('삭제 예정 메뉴는 고칠 수 없습니다. 삭제를 먼저 취소하세요.');
  return {
    ok: true,
    draft: { ...draft, items: draft.items.map((item) => (item.menuNo === menuNo ? { ...item, ...patch } : item)) },
    menuNo,
  };
}

/** 기존 메뉴의 속성을 기준선 값으로 되돌린다. */
export function revertProperties(draft: MenuDraft, baseline: readonly FlattenedItem[], menuNo: number): DraftResult {
  const base = baseline.find((item) => item.menuNo === menuNo);
  if (!base) return fail(REASON.missing);
  return {
    ok: true,
    draft: {
      ...draft,
      items: draft.items.map((item) => (item.menuNo === menuNo
        ? { ...item, menuNm: base.menuNm, modernRoute: base.modernRoute, menuExpln: base.menuExpln, useYn: base.useYn }
        : item)),
    },
    menuNo,
  };
}

/**
 * 기존 메뉴의 위치를 기준선 자리로 되돌린다. 원래 상위가 지금 삭제 예정이면 되돌리지 않는다 — 삭제 예정 메뉴 아래로는
 * 옮길 수 없고(다른 옮기기와 같은 판정), 서버도 하위가 남은 삭제를 거부한다.
 */
export function revertPlacement(draft: MenuDraft, baseline: readonly FlattenedItem[], menuNo: number): DraftResult {
  const baseParent = parentKeyOf(baseline.find((item) => item.menuNo === menuNo)?.parentId);
  if (baseParent !== null && draft.deleted.has(baseParent)) {
    return fail(`원래 상위 메뉴 '${menuLabel(draft.items, baseParent)}'이(가) 삭제 예정이라 되돌릴 수 없습니다. 그 메뉴의 삭제를 먼저 취소하세요.`);
  }
  const next = revertMenu(baseline, draft.items, menuNo);
  if (!next) return fail(`${menuLabel(draft.items, menuNo)} 메뉴는 다른 변경을 먼저 되돌려야 되돌릴 수 있습니다.`);
  return { ok: true, draft: next === draft.items ? draft : { ...draft, items: next }, menuNo };
}

function sameSet(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

/** 지금 초안 기준 그 그룹의 권한(건드리지 않았으면 기준선). */
export function groupGrants(draft: MenuDraft, group: MenuGroup): ReadonlySet<string> {
  return draft.groups.get(group.code)?.grants ?? group.grants;
}

function withGroupGrants(draft: MenuDraft, group: MenuGroup, grants: Set<string>): MenuDraft {
  const current = draft.groups.get(group.code) ?? { version: group.version, base: group.grants, grants: group.grants };
  const groups = new Map(draft.groups);
  if (sameSet(grants, current.base)) groups.delete(group.code);
  else groups.set(group.code, { ...current, grants });
  return { ...draft, groups };
}

/**
 * 그룹의 메뉴 표시를 켜거나 끈다 — 권한 편집기의 메뉴 표시 규칙(navigation-permission-tree)과 같다. 켜면 지금 초안 구조의
 * 상위들도 함께 켜고(명시적으로 — 변경 목록에 보인다), 끄면 하위 전부를 함께 끈다. 기능권한은 건드리지 않는다.
 */
export function setNavigation(draft: MenuDraft, group: MenuGroup, menuNo: number, checked: boolean): DraftResult {
  if (!draft.items.some((item) => item.menuNo === menuNo)) return fail(REASON.missing);
  if (draft.deleted.has(menuNo)) return fail('삭제 예정 메뉴의 표시는 바꿀 수 없습니다.');
  const grants = new Set(groupGrants(draft, group));
  if (checked) {
    for (const id of [...ancestorIds(draft.items, menuNo), menuNo]) grants.add(navigationKey(id));
  } else {
    for (const id of [menuNo, ...descendantIds(draft.items, menuNo)]) grants.delete(navigationKey(id));
  }
  return { ok: true, draft: withGroupGrants(draft, group, grants), menuNo };
}

/** 그룹에 기능권한(진입 권한)을 더한다. 이 편집기는 기능권한을 빼지 않는다 — 빼기는 권한 작업대에서 한다. */
export function addOperations(draft: MenuDraft, group: MenuGroup, codes: readonly string[]): DraftResult {
  if (group.code === 'ROLE_ANONYMOUS') return fail('공개 메뉴용 그룹에는 기능 권한을 줄 수 없습니다.');
  const grants = new Set(groupGrants(draft, group));
  codes.forEach((code) => grants.add(operationKey(code)));
  return { ok: true, draft: withGroupGrants(draft, group, grants) };
}

/** 그룹 초안을 버린다. */
export function revertGroup(draft: MenuDraft, code: string): MenuDraft {
  if (!draft.groups.has(code)) return draft;
  const groups = new Map(draft.groups);
  groups.delete(code);
  return { ...draft, groups };
}

// ─── 검증 ─────────────────────────────────────────────────────────────────────────────────────────

export interface MenuFieldErrors {
  menuNm?: string;
  modernRoute?: string;
  menuExpln?: string;
}

/** 연결 경로 형식은 서버(MenuDto.MODERN_ROUTE_PATTERN)와 같은 생성 계약의 정규식을 쓴다 — 사본을 두지 않는다. */
const ROUTE_SCHEMA = MenuPropertiesRequestSchema.shape.modernRoute;

export const ROUTE_FORMAT_MESSAGE = '연결 경로 형식이 올바르지 않습니다. /로 시작하는 앱 경로(쿼리는 tab·bbsId 만) 또는 이전 방식 .do 경로를 입력하세요.';

/** 저장 직전의 값 — 이름과 경로는 앞뒤 공백을 떼고, 빈 경로·설명은 null(없음)이다. */
export const menuNameValue = (item: Pick<FlattenedItem, 'menuNm'>): string => (item.menuNm ?? '').trim();
export const menuRouteValue = (item: Pick<FlattenedItem, 'modernRoute'>): string | null => (item.modernRoute ?? '').trim() || null;
export const menuDescriptionValue = (item: Pick<FlattenedItem, 'menuExpln'>): string | null => item.menuExpln || null;
export const menuUseValue = (item: Pick<FlattenedItem, 'useYn'>): 'Y' | 'N' => (item.useYn === 'N' ? 'N' : 'Y');

/** 이름 필수·100자, 경로 서버 형식·500자, 설명 4000자. 오류가 없으면 빈 객체다. */
export function validateMenuFields(item: Pick<FlattenedItem, 'menuNm' | 'modernRoute' | 'menuExpln'>): MenuFieldErrors {
  const errors: MenuFieldErrors = {};
  const name = menuNameValue(item);
  if (!name) errors.menuNm = '메뉴 이름을 입력하세요.';
  else if (name.length > MENU_LIMITS.name) errors.menuNm = `메뉴 이름은 ${MENU_LIMITS.name}자까지 쓸 수 있습니다.`;
  const route = menuRouteValue(item);
  if (route !== null) {
    if (route.length > MENU_LIMITS.route) errors.modernRoute = `연결 경로는 ${MENU_LIMITS.route}자까지 쓸 수 있습니다.`;
    else if (!ROUTE_SCHEMA.safeParse(route).success) errors.modernRoute = ROUTE_FORMAT_MESSAGE;
  }
  if ((item.menuExpln ?? '').length > MENU_LIMITS.description) {
    errors.menuExpln = `설명은 ${MENU_LIMITS.description}자까지 쓸 수 있습니다.`;
  }
  return errors;
}

// ─── 변경 요약 ────────────────────────────────────────────────────────────────────────────────────

export interface PropertyChange {
  menuNo: number;
  fields: MenuEditableField[];
}

export interface GroupChange {
  code: string;
  name: string;
  version: string;
  /** 메뉴 표시를 더할 메뉴(새 메뉴는 음수 번호). 선순회 순서. */
  navigationAdd: number[];
  /** 메뉴 표시를 거둘 기존 메뉴. 번호 순. */
  navigationRemove: number[];
  operationAdd: string[];
}

/**
 * 저장하면 어떤 그룹에서 메뉴가 숨겨지는 경우: 그 그룹은 이 메뉴를 표시하는데 (저장 뒤) 상위 메뉴는 표시하지 않는다.
 * parentNo 는 표시되지 않는 바로 위 상위다 — '상위 메뉴 표시 추가' 는 그 상위와 그 위 상위를 함께 켠다.
 */
export interface VisibilityConflict {
  menuNo: number;
  parentNo: number;
  groupCode: string;
  groupName: string;
}

export interface DraftSummary {
  /** 기존(삭제 예정 아님) 메뉴의 위치 변경. */
  structure: MenuChange[];
  /** 새 메뉴(선순회 순서). */
  created: number[];
  /** 삭제 예정(번호 순). */
  deleted: number[];
  properties: PropertyChange[];
  groups: GroupChange[];
  /** 저장할 메뉴의 입력 오류(새 메뉴·속성을 고친 메뉴). */
  errors: ReadonlyMap<number, MenuFieldErrors>;
  conflicts: VisibilityConflict[];
  hasChanges: boolean;
}

const propertyFields = (base: FlattenedItem, item: FlattenedItem): MenuEditableField[] => {
  const fields: MenuEditableField[] = [];
  if (menuNameValue(base) !== menuNameValue(item)) fields.push('menuNm');
  if (menuRouteValue(base) !== menuRouteValue(item)) fields.push('modernRoute');
  if (menuDescriptionValue(base) !== menuDescriptionValue(item)) fields.push('menuExpln');
  if (menuUseValue(base) !== menuUseValue(item)) fields.push('useYn');
  return fields;
};

function navigationMenuNos(grants: ReadonlySet<string>): Set<number> {
  const ids = new Set<number>();
  for (const key of grants) {
    if (!key.startsWith('NAVIGATION:')) continue;
    const id = menuNoOfRef(key.slice('NAVIGATION:'.length));
    if (id !== null) ids.add(id);
  }
  return ids;
}

/**
 * 저장 뒤 관리자 그룹(ROLE_ADMIN)이 받을 호환 배정을 미리 더한다(서버 MenuStructurePlan.compatibilityCandidates 와 같다).
 * 그 그룹에 명시 배정이 없는 새 메뉴 가운데, 상위가 모두 그 그룹에 보이는 메뉴를 부모 먼저 더한다. 이것을 빼면 '새 폴더를
 * 만들고 관리자 그룹이 보던 메뉴를 그 아래로 옮기기' 가 관리자 그룹에서 숨겨진다는 거짓 경고가 된다.
 */
function withCompatibilityAdmin(shown: Set<number>, items: readonly FlattenedItem[], created: readonly number[]): Set<number> {
  const byDepth = [...created].sort((left, right) => (items.find((item) => item.menuNo === left)?.depth ?? 0)
    - (items.find((item) => item.menuNo === right)?.depth ?? 0));
  for (const menuNo of byDepth) {
    if (shown.has(menuNo)) continue;
    if (ancestorIds(items, menuNo).every((id) => shown.has(id))) shown.add(menuNo);
  }
  return shown;
}

/** 초안 전체의 변경·오류·숨김 경고. 화면의 배지·변경 목록·저장 버튼·저장 요청이 모두 이것을 읽는다. */
export function summarizeDraft(
  baseline: readonly FlattenedItem[],
  draft: MenuDraft,
  groups: readonly MenuGroup[],
): DraftSummary {
  const live = draft.items.filter((item) => !draft.deleted.has(item.menuNo));
  const liveNos = new Set(live.map((item) => item.menuNo));
  const baseByNo = new Map(baseline.map((item) => [item.menuNo, item] as const));
  const structure = menuChanges(baseline, live);
  const created = live.filter((item) => isNewMenu(item.menuNo)).map((item) => item.menuNo);
  const deleted = [...draft.deleted].filter((id) => baseByNo.has(id)).sort((left, right) => left - right);

  const properties: PropertyChange[] = [];
  const errors = new Map<number, MenuFieldErrors>();
  for (const item of live) {
    const base = baseByNo.get(item.menuNo);
    if (base) {
      const fields = propertyFields(base, item);
      if (fields.length === 0) continue;
      properties.push({ menuNo: item.menuNo, fields });
    }
    const itemErrors = validateMenuFields(item);
    if (Object.keys(itemErrors).length > 0) errors.set(item.menuNo, itemErrors);
  }

  const order = new Map(live.map((item, index) => [item.menuNo, index] as const));
  const byCode = new Map(groups.map((group) => [group.code, group] as const));
  const groupChanges: GroupChange[] = [];
  for (const [code, group] of draft.groups) {
    const added = navigationMenuNos(new Set([...group.grants].filter((key) => !group.base.has(key))));
    const removed = navigationMenuNos(new Set([...group.base].filter((key) => !group.grants.has(key))));
    const navigationAdd = [...added].filter((id) => liveNos.has(id))
      .sort((left, right) => (order.get(left) ?? 0) - (order.get(right) ?? 0));
    const navigationRemove = [...removed].filter((id) => id > 0 && liveNos.has(id)).sort((left, right) => left - right);
    const operationAdd = [...group.grants].filter((key) => key.startsWith('OPERATION:') && !group.base.has(key))
      .map((key) => key.slice('OPERATION:'.length)).sort();
    if (navigationAdd.length + navigationRemove.length + operationAdd.length === 0) continue;
    groupChanges.push({ code, name: byCode.get(code)?.name ?? code, version: group.version, navigationAdd, navigationRemove, operationAdd });
  }
  groupChanges.sort((left, right) => left.code.localeCompare(right.code, 'en'));

  /*
    저장하면 숨겨지는 메뉴 — 서버가 400 으로 거부하는 두 검사를 같게 한다.
    ① 옮긴 기존 메뉴(모든 그룹, 서버 navigationVisibilityConflicts): 그 그룹이 메뉴는 보는데 새 상위는 보지 않는다.
    ② 이 저장이 권한을 바꾸는 그룹(서버 normalizeNavigationGrants): 저장 뒤 그 그룹이 표시하는 모든 메뉴의 상위가 모두
       표시돼야 한다. 새 메뉴는 ①의 대상이 아니므로, 표시를 켠 새 메뉴를 그 그룹이 보지 않는 상위로 옮기거나 그 새 메뉴의
       상위(새 섹션)를 다른 영역으로 옮긴 경우는 ②만 잡는다. 이 저장이 상위의 표시를 거두었으면 서버가 그 하위 표시를 조용히
       빼므로(거부하지 않는다) 세지 않는다. 끊긴 지점마다(표시되는 메뉴의 바로 위 상위가 표시되지 않는 곳) 한 건으로 센다.
  */
  const conflicts: VisibilityConflict[] = [];
  const reported = new Set<string>();
  const report = (menuNo: number, parentNo: number, group: MenuGroup) => {
    const key = `${group.code}\u0000${menuNo}`;
    if (reported.has(key)) return;
    reported.add(key);
    conflicts.push({ menuNo, parentNo, groupCode: group.code, groupName: group.name });
  };
  const moved = structure.filter((change) => change.kind === 'move' && change.toParent !== null);
  const touched = new Set(groupChanges.map((change) => change.code));
  const liveParent = new Map(live.map((item) => [item.menuNo, parentKeyOf(item.parentId)] as const));
  for (const group of groups) {
    if (moved.length === 0 && !touched.has(group.code)) continue;
    const shown = navigationMenuNos(groupGrants(draft, group));
    if (group.code === 'ROLE_ADMIN') withCompatibilityAdmin(shown, live, created);
    for (const change of moved) {
      const parentNo = change.toParent as number;
      if (shown.has(change.menuNo) && !shown.has(parentNo)) report(change.menuNo, parentNo, group);
    }
    if (!touched.has(group.code)) continue;
    const final = groupGrants(draft, group);
    const base = draft.groups.get(group.code)?.base ?? group.grants;
    const revoked = navigationMenuNos(new Set([...base].filter((key) => !final.has(key))));
    for (const item of live) {
      if (!shown.has(item.menuNo)) continue;
      const parentNo = liveParent.get(item.menuNo) ?? null;
      if (parentNo === null || shown.has(parentNo)) continue;
      if ([parentNo, ...ancestorIds(live, parentNo)].some((id) => revoked.has(id))) continue;
      report(item.menuNo, parentNo, group);
    }
  }

  return {
    structure,
    created,
    deleted,
    properties,
    groups: groupChanges,
    errors,
    conflicts,
    hasChanges: structure.length + created.length + deleted.length + properties.length + groupChanges.length > 0,
  };
}

/** 메뉴별 배지. 한 메뉴에 여럿이 겹칠 수 있다. */
export type MenuBadgeKind = 'new' | 'deleted' | 'move' | 'order' | 'edited';

export function menuBadges(summary: DraftSummary): Map<number, MenuBadgeKind[]> {
  const badges = new Map<number, MenuBadgeKind[]>();
  const push = (menuNo: number, kind: MenuBadgeKind) => badges.set(menuNo, [...(badges.get(menuNo) ?? []), kind]);
  summary.created.forEach((menuNo) => push(menuNo, 'new'));
  summary.deleted.forEach((menuNo) => push(menuNo, 'deleted'));
  summary.structure.forEach((change) => push(change.menuNo, change.kind));
  summary.properties.forEach((change) => push(change.menuNo, 'edited'));
  return badges;
}

/** 저장 전 요약 숫자. 위치는 위치가 바뀐 기존 메뉴 수, 그룹 배정은 메뉴 표시 추가·회수와 기능권한 추가의 합이다. */
export function draftCounts(summary: DraftSummary): { created: number; deleted: number; placed: number; properties: number; grants: number; groups: number } {
  return {
    created: summary.created.length,
    deleted: summary.deleted.length,
    placed: summary.structure.length,
    properties: summary.properties.length,
    grants: summary.groups.reduce((total, group) => total + group.navigationAdd.length + group.navigationRemove.length + group.operationAdd.length, 0),
    groups: summary.groups.length,
  };
}

// ─── 저장 요청 ────────────────────────────────────────────────────────────────────────────────────

/**
 * 저장 요청(PUT /menus/structure). 서버 MenuStructureSave 그대로다.
 *
 * - creations: 새 메뉴의 이름·경로·설명·사용 여부. 위치는 placements 에 둔다.
 * - placements: 하위 목록(삭제 예정 제외)이 기준선과 다른 상위마다 **그 형제 전체**를 1..n 으로(새 메뉴 포함). 형제의 서버
 *   menu_ordr 는 조밀하다는 보장이 없다(전역 순번 저장 이력, 등록 기본값 999, 동순위) — 바뀐 메뉴만 보내면 A=12·B=13·C=999
 *   에서 B·C 를 맞바꿀 때 C=2·B=3 만 가고 A=12 가 남아 최종 순서가 C,B,A 로 틀어진다.
 * - properties: 속성을 고친 기존 메뉴의 네 칸 전체(서버가 네 칸을 통째로 바꾼다).
 * - deletions: 삭제 예정 메뉴. 삭제할 메뉴는 위치·속성·메뉴 표시에 넣지 않는다(서버가 함께 쓰면 거부한다).
 * - grants: 건드린 그룹마다 처음 읽은 그룹 버전과 메뉴 표시 추가·회수, 기능권한 추가.
 */
export function menuStructurePayload(
  version: string,
  baseline: readonly FlattenedItem[],
  draft: MenuDraft,
  summary: DraftSummary,
): MenuStructureSave {
  const live = draft.items.filter((item) => !draft.deleted.has(item.menuNo));
  const byNo = new Map(live.map((item) => [item.menuNo, item] as const));
  const before = siblingOrder(baseline.filter((item) => !draft.deleted.has(item.menuNo)));
  const placements: MenuStructureSave['placements'] = [];
  for (const [parent, children] of siblingOrder(live)) {
    const previous = before.get(parent) ?? [];
    if (previous.length === children.length && previous.every((menuNo, i) => menuNo === children[i])) continue;
    children.forEach((menuNo, i) => {
      placements.push({ ref: menuRef(menuNo), parentRef: parent === null ? null : menuRef(parent), menuOrdr: i + 1 });
    });
  }
  const fields = (item: FlattenedItem) => ({
    menuNm: menuNameValue(item),
    modernRoute: menuRouteValue(item),
    menuExpln: menuDescriptionValue(item),
    useYn: menuUseValue(item),
  });
  return {
    version,
    creations: summary.created.map((menuNo) => ({ key: menuRef(menuNo), ...fields(byNo.get(menuNo) as FlattenedItem) })),
    placements,
    properties: summary.properties.map(({ menuNo }) => ({ menuNo, ...fields(byNo.get(menuNo) as FlattenedItem) })),
    deletions: summary.deleted,
    grants: summary.groups.map((group) => ({
      groupCode: group.code,
      groupVersion: group.version,
      navigationAdd: group.navigationAdd.map(menuRef),
      navigationRemove: group.navigationRemove,
      operationAdd: group.operationAdd,
    })),
  };
}
