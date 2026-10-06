'use client';

import { use, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ChevronDown, Loader2, RefreshCcw, Save, Search, Undo2 } from 'lucide-react';
import { MasterDetailPage } from '@/app/components/patterns/master-detail-page';
import { WORK_FILL_REGION_CLASS } from '@/app/components/patterns/work-fill';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUnsavedChanges } from '@/contexts/UnsavedChangesContext';
import { failureMessage } from '@/lib/safe-error-log';
import { isConflictError } from '@/lib/query/list-query-defaults';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { clearScreenHandoff, useScreenHandoff } from '@/lib/navigation/target-handoff';
import {
  MENU_HIDDEN_REASON_LABELS,
  menuPreviewKey,
  previewMenuVisibility,
  type MenuVisibilityPreview,
} from '@/lib/navigation/menu-visibility-preview';
import { menuAdminService, type MenuStructure } from '@/services/foundation/system/MenuAdminService';
import { authorizationAdminService } from '@/services/foundation/system/AuthorizationAdminService';
import type { FlattenedItem } from './treeUtils';
import {
  addMenu,
  addOperations,
  draftCounts,
  editMenu,
  groupGrants,
  isNewMenu,
  markDeleted,
  menuBadges,
  menuGroupsOf,
  menuLabel,
  menuRef,
  menuRouteValue,
  menuStructurePayload,
  menuUseValue,
  moveMenu,
  parentKeyOf,
  parentPathLabel,
  removeNewMenu,
  revertGroup,
  revertPlacement,
  revertProperties,
  setNavigation,
  shiftMenu,
  siblingOrder,
  startDraft,
  structureItems,
  summarizeDraft,
  type DraftResult,
  type MenuDraft,
  type MenuEditableField,
  type MenuGroup,
  type MenuParentKey,
  type MenuPropertyPatch,
} from './menuDraft';
import { areaOf, menuSearchMatches, nextSearchMatch, pasteTarget, resolveBoardDrop, type BoardDropTarget } from './menuBoardModel';
import { MenuBoard, type MenuBoardAreaCount } from './MenuBoard';
import { MenuInspector, type MenuFocusField, type MenuFocusRequest } from './MenuInspector';
import { MenuMoveDialog, type MenuMoveDialogMode, type MenuMovePosition } from './MenuMoveDialog';
import { MenuChangeList, type MenuChangeConflict, type MenuChangeEntry, type MenuChangeError } from './MenuChangeList';
import type { GroupMatrixState, GroupMenuVerdict } from './MenuGroupVisibility';
import { EMPTY_MENU_UNDO, endMenuUndoGroup, recordMenuUndo, takeMenuUndo, type MenuUndoHistory } from './menuUndo';

/**
 * 서버 조회 결과 봉투.
 * 실패를 빈 구조로 삼켜 "메뉴 0건"으로 위장하지 않기 위해, 사유를 함께 실어 나른다.
 */
export type FetchResult<T> = { data: T; error: string | null };

/*
 * 이 화면의 조회·저장 실패는 화면이 배너·알림으로 말한다. 전역 실패 토스트까지 켜면 같은 실패가 두 번 보인다.
 */
const QUIET = { suppressErrorToast: true } as const;
const NO_ITEMS: readonly FlattenedItem[] = [];

const FIELD_LABEL: Record<MenuEditableField, string> = {
  menuNm: '이름',
  modernRoute: '연결 화면',
  menuExpln: '설명',
  useYn: '사용 여부',
};

interface Baseline {
  version: string;
  items: readonly FlattenedItem[];
}

const toBaseline = (structure: MenuStructure): Baseline => ({ version: structure.version, items: structureItems(structure.menus) });
const firstArea = (items: readonly FlattenedItem[]): number | null => items.find((item) => item.depth === 0)?.menuNo ?? null;

/** 형제 안 자리 문장 — '나의 업무 아래 5개 중 2번째', '최상위 4개 중 1번째'. */
function placementText(items: readonly FlattenedItem[], menuNo: number): string {
  const parent = parentKeyOf(items.find((item) => item.menuNo === menuNo)?.parentId);
  const siblings = siblingOrder(items).get(parent) ?? [];
  const where = parent === null ? '최상위' : `${parentPathLabel(items, parent)} 아래`;
  return `${where} ${siblings.length.toLocaleString()}개 중 ${(siblings.indexOf(menuNo) + 1).toLocaleString()}번째`;
}

/**
 * 한 그룹이 저장 전 초안 기준으로 사이드바에서 무엇을 보는가(사이드바와 같은 판정 — previewMenuVisibility). 보드의 그룹 미리보기와
 * 상세의 그룹별 결과 칩이 같은 함수를 쓴다. 삭제 예정 메뉴는 넣지 않는다(저장하면 사라진다).
 */
function draftVisibility(draft: MenuDraft, group: MenuGroup): MenuVisibilityPreview {
  const grants = [...groupGrants(draft, group)];
  const live = draft.items.filter((item) => !draft.deleted.has(item.menuNo));
  return previewMenuVisibility({
    menus: live.map((item) => ({
      menuNo: menuRef(item.menuNo),
      menuNm: menuLabel(draft.items, item.menuNo),
      upMenuSn: item.parentId === null ? null : menuRef(item.parentId),
      menuOrdr: item.index,
      modernRoute: menuRouteValue(item),
      useYn: menuUseValue(item),
    })),
    navigation: grants.filter((key) => key.startsWith('NAVIGATION:')).map((key) => key.slice('NAVIGATION:'.length)),
    operations: grants.filter((key) => key.startsWith('OPERATION:')).map((key) => key.slice('OPERATION:'.length)),
  });
}

/** 글자를 넣는 칸인가 — Ctrl+Z 를 브라우저 기본 동작(입력 되돌리기)에 맡긴다. */
function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  return target instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'submit', 'reset'].includes(target.type);
}

/**
 * [2026-10-02 D1·D2] 시스템 메뉴 관리 — 보드형 메뉴 구조 편집기.
 *
 * 영역(최상위 메뉴) 탭 → 2단계 카드 → 3단계 줄로 메뉴를 보이고, 위치·새 메뉴·삭제·이름·연결 화면·설명·사용 여부·그룹별 메뉴
 * 표시와 진입 권한 추가를 **한 초안**에 모아 '변경 저장' 한 번으로 저장한다(PUT /menus/structure, 메뉴 구조 버전 확인).
 * 종전의 즉시 저장 수정 창(메뉴 등록·수정·삭제)은 없다 — 수정 창의 저장이 서버에 바로 반영돼 구조 초안과 엇갈렸다.
 *
 * 인가 의미는 바꾸지 않는다(H3). 메뉴 표시(NAVIGATION)와 기능권한(OPERATION)은 다른 권한이고, 상위 메뉴 표시를 묵시로 주지
 * 않는다(화면이 초안에 명시적으로 넣고 변경 목록에 보인다). 옮긴 메뉴가 어떤 그룹에서 숨겨지면 저장 전에 경고하고 해결 단추를 둔다.
 * 쓰기 단추 노출은 동작의 기능 권한으로 판정할 뿐이다 — 서버가 같은 권한을 다시 집행한다.
 *
 * [2026-10-05 시안 밀도 복원] 업무면 fill 셸로 남은 높이를 채운다(페이지는 스크롤하지 않고 보드·상세가 각자 스크롤한다).
 * 마스터 머리의 도구는 한 줄이다 — 찾기 · 그룹 미리보기 · '변경 n건'(변경 목록 여닫기) · '되돌리기'(직전 변경, Ctrl+Z). 키보드로
 * 옮기는 법은 보드 아래 상태 줄의 접는 도움말이다. 영역 탭은 하위 수(미리보기 중 보임/전체, 찾는 중 일치 수)를 보이고, 찾는
 * 말이 지금 영역에 없고 다른 영역에 있으면 그 영역을 연다. 저장 확인 대화상자는 변경 목록을 함께 보인다.
 *
 * [2026-10-05 리뷰 반영] 도구 줄은 상태가 바뀌어도 폭이 바뀌지 않는다 — '변경 n건' 단추는 늘 그리고(변경이 없으면 '변경 0건'
 * 으로 막힌다), 저장을 막는 문제의 수는 그 단추 모서리의 배지(폭에 들지 않는다)로, 찾기 일치 수는 상태 줄로 옮겼다. 종전에는
 * 첫 변경에서 '변경 1건' 단추가 새로 생기며 도구 줄이 제목 아래로 내려가 보드가 밀렸다.
 *
 * [2026-10-05 2차 리뷰 반영 — 1440 이하에서 보드가 보이지 않던 문제] 셸의 fill 조건 압축(칸 여백 12px·칸 설명은 제목 옆·도구
 * 줄 줄바꿈 없음·A2 바닥값 22rem)과 함께, 보드만 스크롤하게 높이 사슬을 잇는다(masterFillChild → 마스터 묶음 → MenuBoard 의 보드
 * 스크롤 상자). 찾기 칸은 7~11rem 사이에서 줄어들어 도구가 제목 옆에 들어갈 자리를 먼저 내준다. 변경 목록은 저절로 펼치지 않고,
 * 펼치면 높이 10rem 안에서 스스로 스크롤한다. 측정 기록은 2차 수정 보고에 있다.
 */
export default function MenuAdminClient({
  structurePromise,
}: {
  structurePromise: Promise<FetchResult<MenuStructure | null>>;
}) {
  const { data: loadedStructure, error: loadError } = use(structurePromise);
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();
  const { user, loading: authLoading } = useAuth();
  // 쓰기 단추는 그 동작의 기능 권한으로 보인다(표시 판정일 뿐 서버 인가는 그대로다). 저장은 언제나 MENU_UPDATE 이고, 새 메뉴는
  // MENU_CREATE, 삭제는 MENU_DELETE, 그룹 메뉴 표시·진입 권한은 AUTHRT_GRANT 가 더 필요하다(서버 MenuService#saveMenuStructure).
  const canUpdate = canPermission(user, 'MENU_UPDATE');
  const canCreate = canPermission(user, 'MENU_CREATE') && canUpdate;
  const canDelete = canPermission(user, 'MENU_DELETE') && canUpdate;
  const canReadGroups = canPermission(user, 'AUTHRT_READ');
  const canGrant = canPermission(user, 'AUTHRT_GRANT') && canUpdate;
  const authPending = Boolean(authLoading) && !user;
  const noteId = useId();
  const changePanelId = useId();

  const [initial] = useState<Baseline | null>(() => (loadedStructure ? toBaseline(loadedStructure) : null));
  const [baseline, setBaseline] = useState<Baseline | null>(initial);
  const [draft, setDraft] = useState<MenuDraft>(() => startDraft(initial?.items ?? NO_ITEMS));
  /** 직전 변경 되돌리기 이력(저장·다시 불러오기에서 비운다). */
  const [undoHistory, setUndoHistory] = useState<MenuUndoHistory>(EMPTY_MENU_UNDO);
  const [selectedMenuNo, setSelectedMenuNo] = useState<number | null>(null);
  const [activeArea, setActiveArea] = useState<number | null>(() => firstArea(initial?.items ?? NO_ITEMS));
  const [keyword, setKeyword] = useState('');
  const [previewGroup, setPreviewGroup] = useState('');
  const [cutMenuNo, setCutMenuNo] = useState<number | null>(null);
  const [moveDialog, setMoveDialog] = useState<MenuMoveDialogMode | null>(null);
  /**
   * 변경 목록을 펼쳤는가 — '변경 n건' 단추만 연다. [2026-10-05 2차 리뷰] 저장을 막는 문제가 생겨도 저절로 펼치지 않는다 — 저절로
   * 펼친 목록(변경 3건이면 약 258px)이 보드 위에서 보드를 밀어, 방금 끌어 놓은 줄이 시야 밖으로 나갔다(Chromium 실측 1920×950
   * 보이는 항목 12→0). 대신 '변경 n건' 단추의 배지(저장 전 해결 n건)와 '변경 저장' 의 설명이 이유를 말하고, 옮기기로 숨겨지는
   * 메뉴가 생기면 결과 안내가 그 사실을 함께 말한다(conflictNotice).
   */
  const [changesOpen, setChangesOpen] = useState(false);
  /** 찾기 칸에서 한글 등을 조합하는 중인가 — 조합 중에는 영역을 저절로 바꾸지 않는다(글자 조합 단계마다 탭이 바뀌지 않게). */
  const composingRef = useRef(false);
  /** 보드에서 끄는 중인가 — 끄는 동안 Ctrl+Z·되돌리기로 초안을 바꾸면 끄는 메뉴가 사라지거나 놓을 자리 판정이 어긋난다. */
  const draggingRef = useRef(false);
  const changeToggleRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  /** 상세의 칸으로 한 번만 포커스를 옮기는 요청(새 메뉴의 이름 칸, 입력 오류의 '고치기'). 상세가 쓰고 지운다. */
  const [focusRequest, setFocusRequest] = useState<MenuFocusRequest | null>(null);
  const requestFocus = (menuNo: number, field: MenuFocusField) => {
    setFocusRequest((current) => ({ menuNo, field, seq: (current?.seq ?? 0) + 1 }));
  };
  const clearFocusRequest = useCallback(() => setFocusRequest(null), []);
  /*
    옮기기·만들기·되돌리기·찾기 결과 문장. 화면의 aria-live 영역 하나가 말한다. 문장마다 번호를 매겨 새 요소로 그린다 — 같은
    문장을 다시 넣으면 React 가 DOM 을 건드리지 않아, 같은 방향으로 두 번 옮기거나 끝에서 거듭 누를 때 두 번째부터 읽히지 않는다.
  */
  const [announcement, setAnnouncement] = useState<{ text: string; seq: number }>({ text: '', seq: 0 });
  const announce = (text: string) => setAnnouncement((current) => ({ text, seq: current.seq + 1 }));

  const [isSaving, setIsSaving] = useState(false);
  const structureSavePendingRef = useRef(false);
  const [reloadPending, setReloadPending] = useState(false);
  const reloadPendingRef = useRef(false);
  /** 409 — 다른 곳에서 메뉴 구조나 그룹 권한이 바뀌었다. 초안은 지우지 않는다. */
  const [staleMessage, setStaleMessage] = useState<string | null>(null);
  /** 400 등 — 서버 문구 그대로. 거부된 초안을 함께 둔다 — 그 뒤 초안이 바뀌면 '마지막 저장 시도' 로 말한다. */
  const [saveError, setSaveError] = useState<{ message: string; draft: MenuDraft } | null>(null);
  const [reloadError, setReloadError] = useState<string | null>(null);
  /** 저장하지 않은 변경이 있는 동안 서버 구조가 다시 읽혔는가(DIP C5). */
  const [reloadedWhileEditing, setReloadedWhileEditing] = useState(false);
  /** 옮긴 줄에 포커스를 되돌린다 — 줄이 자리를 바꾸면 포커스가 사라질 수 있다. */
  const focusAfterMoveRef = useRef<number | null>(null);
  /** 찾기로 고른 메뉴를 보이게 스크롤한다. */
  const revealRef = useRef<number | null>(null);
  /** 누른 단추가 사라지고 옮길 곳도 없을 때 — 보드의 고른 항목(없으면 탭 순서에 든 항목)으로 포커스를 옮긴다. */
  const focusBoard = () => {
    const item = document.querySelector<HTMLElement>('[data-a2-master-item][aria-current="true"]')
      ?? document.querySelector<HTMLElement>('[data-a2-master-item][tabindex="0"]');
    item?.focus();
  };

  const queryClient = useQueryClient();
  const matrixKey = ['admin-menus', 'grant-matrix', user?.id, user?.authorizationVersion];
  const matrixQuery = useQuery({
    queryKey: matrixKey,
    queryFn: () => authorizationAdminService.getGrantMatrix(QUIET),
    enabled: canReadGroups,
    retry: false,
    throwOnError: false,
  });
  /*
    그룹 권한을 '안다' 고 할 때만 ready 다. 다시 읽기가 실패하면 앞서 읽은 값이 남아 있어도 오류다 — 낡은 버전·권한으로
    판정하지 않는다. 오류·불러오는 중에는 그룹을 편집할 수 없고, 숨김 검사는 하지 못한다고 변경 목록이 말한다.
  */
  const groupState: GroupMatrixState = authPending
    ? 'loading'
    : !canReadGroups ? 'no-permission' : matrixQuery.isError ? 'error' : matrixQuery.data ? 'ready' : 'loading';
  const groupsReady = groupState === 'ready';
  const groups = useMemo(
    () => (groupsReady && matrixQuery.data ? menuGroupsOf(matrixQuery.data.groups) : []),
    [groupsReady, matrixQuery.data],
  );
  /*
    저장·다시 불러오기 뒤에는 그룹 권한을 비우고 다시 읽는다(refetch 가 아니라 reset). 다시 읽는 동안 앞의 값이 남아 있으면
    그 사이 그룹 메뉴 표시를 바꿀 때 저장 전 버전·권한을 기준으로 잡아, 방금 한 저장 때문에 409 가 나고 체크도 저장 전
    상태로 보인다.
  */
  const reloadGroups = () => {
    if (canReadGroups) void queryClient.resetQueries({ queryKey: matrixKey, exact: true });
  };

  const baseItems = baseline?.items ?? NO_ITEMS;
  const summary = useMemo(() => summarizeDraft(baseItems, draft, groups), [baseItems, draft, groups]);
  const badges = useMemo(() => menuBadges(summary), [summary]);
  const hasChanges = summary.hasChanges;

  const adopt = (structure: MenuStructure, keep: number | null) => {
    const next = toBaseline(structure);
    setBaseline(next);
    setDraft(startDraft(next.items));
    // 쌓인 초안은 옛 기준선의 것이다 — 저장·다시 불러오기 뒤에는 되돌릴 단계가 없다.
    setUndoHistory(EMPTY_MENU_UNDO);
    setCutMenuNo(null);
    setReloadedWhileEditing(false);
    const kept = keep !== null && next.items.some((item) => item.menuNo === keep) ? keep : null;
    setSelectedMenuNo(kept);
    setActiveArea((current) => (kept !== null
      ? areaOf(next.items, kept)
      : next.items.some((item) => item.depth === 0 && item.menuNo === current) ? current : firstArea(next.items)));
  };

  /*
    [DIP C5] 서버 구조가 다시 읽혔을 때(router.refresh) 저장하지 않은 변경이 있으면 초안을 덮지 않고 알린다. 지금 기준선과 같은
    버전이면(방금 저장한 결과가 돌아온 것) 아무것도 하지 않는다. 변경이 없으면 최신 구조를 그대로 받는다.
  */
  const [prevLoaded, setPrevLoaded] = useState(loadedStructure);
  if (loadedStructure !== prevLoaded) {
    setPrevLoaded(loadedStructure);
    if (loadedStructure && loadedStructure.version !== baseline?.version) {
      if (hasChanges) setReloadedWhileEditing(true);
      else adopt(loadedStructure, selectedMenuNo);
    }
  } else if (reloadedWhileEditing && !hasChanges && loadedStructure) {
    // 배너가 떠 있는 동안 변경을 하나씩 되돌려 0 이 되면 지킬 초안이 없다 — 최신 구조로 맞춘다.
    adopt(loadedStructure, selectedMenuNo);
  }

  // 저장하지 않은 변경이 있으면 화면을 떠나기 전에 확인한다.
  useUnsavedChanges({ dirty: hasChanges });

  /*
    [D3] 화면 관리의 '메뉴에 추가' 가 넘긴 화면. 받으면 '새 메뉴 위치 고르기' 대화상자를 연다(한 번만 — 인계 시각으로 가린다).
    인계는 적용한 뒤 지운다(URL 에 싣지 않는다 — target-handoff).
  */
  const handoff = useScreenHandoff('menu-add-screen');
  const [handledHandoff, setHandledHandoff] = useState<number | null>(null);
  if (handoff && handoff.at !== handledHandoff && !authPending && baseline) {
    setHandledHandoff(handoff.at);
    if (canCreate) setMoveDialog({ kind: 'create', route: handoff.route, label: handoff.label });
    else announce('화면을 메뉴에 추가하려면 메뉴 등록 권한과 메뉴 수정 권한이 모두 필요합니다.');
  }
  useEffect(() => {
    if (handledHandoff !== null) clearScreenHandoff('menu-add-screen');
  }, [handledHandoff]);

  const areas = draft.items.filter((item) => item.depth === 0);
  const currentArea = areas.some((item) => item.menuNo === activeArea) ? activeArea : areas[0]?.menuNo ?? null;
  const selectedItem = selectedMenuNo !== null && areaOf(draft.items, selectedMenuNo) === currentArea
    ? draft.items.find((item) => item.menuNo === selectedMenuNo) ?? null
    : null;
  const selectedNo = selectedItem?.menuNo ?? null;
  /*
    다른 메뉴를 고르면 '이어 입력' 묶음을 끝낸다 — 묶음 키에는 메뉴 번호가 들어 있지만, B 를 골랐다가 A 로 돌아와 다시 친 이름은
    앞의 입력과 다른 일이다(그 사이 기록이 없으면 키가 같아 한 단계로 붙었다).
  */
  const [undoGroupMenu, setUndoGroupMenu] = useState<number | null>(null);
  if (selectedNo !== undoGroupMenu) {
    setUndoGroupMenu(selectedNo);
    const ended = endMenuUndoGroup(undoHistory);
    if (ended !== undoHistory) setUndoHistory(ended);
  }
  const cutItem = cutMenuNo === null ? null : draft.items.find((item) => item.menuNo === cutMenuNo) ?? null;
  const locked = isSaving || reloadPending;
  // 처음 조회가 실패했어도 다시 불러오기로 구조를 받았으면 그 사유는 더는 사실이 아니다.
  const visibleLoadError = baseline ? null : loadError;

  useEffect(() => {
    const menuNo = focusAfterMoveRef.current;
    if (menuNo === null) return;
    focusAfterMoveRef.current = null;
    const row = document.querySelector<HTMLElement>(`[data-a2-master-item][data-menu-no="${menuNo}"]`);
    if (row && document.activeElement !== row) row.focus();
  }, [draft, currentArea]);

  useEffect(() => {
    const menuNo = revealRef.current;
    if (menuNo === null) return;
    revealRef.current = null;
    document.querySelector<HTMLElement>(`[data-a2-master-item][data-menu-no="${menuNo}"]`)?.scrollIntoView?.({ block: 'nearest' });
  }, [selectedMenuNo, currentArea]);

  // ─── 찾기·미리보기 ─────────────────────────────────────────────────────────────────────────────

  const searching = keyword.trim() !== '';
  const matches = useMemo(() => menuSearchMatches(draft.items, keyword), [draft.items, keyword]);
  const matchSet = useMemo(() => (searching ? new Set(matches) : null), [searching, matches]);

  const preview: MenuVisibilityPreview | null = useMemo(() => {
    const group = groups.find((candidate) => candidate.code === previewGroup);
    return group ? draftVisibility(draft, group) : null;
  }, [groups, previewGroup, draft]);
  const previewCounts = useMemo(() => {
    if (!preview) return null;
    const verdicts = [...preview.byMenu.values()];
    return { shown: verdicts.filter((verdict) => verdict.visible).length, hidden: verdicts.filter((verdict) => !verdict.visible).length };
  }, [preview]);

  /*
    그룹마다 저장 전 초안 기준 사이드바 판정(상세의 결과 칩). 고른 메뉴가 있을 때만 계산하고, 미리보기 중인 그룹은 그 결과를
    다시 쓴다. 고른 메뉴의 결과는 아래 verdictOf 가 꺼낸다.
  */
  const groupVisibilities = useMemo(() => {
    if (selectedMenuNo === null || groups.length === 0) return null;
    return new Map(groups.map((group) => [group.code, group.code === previewGroup && preview ? preview : draftVisibility(draft, group)] as const));
  }, [selectedMenuNo, groups, previewGroup, preview, draft]);
  const verdictOf = (groupCode: string): GroupMenuVerdict | null => {
    if (selectedNo === null) return null;
    const visibility = groupVisibilities?.get(groupCode)?.byMenu.get(menuPreviewKey(menuRef(selectedNo)));
    if (!visibility) return null;
    return { visible: visibility.visible, reason: visibility.visible ? null : MENU_HIDDEN_REASON_LABELS[visibility.reason] };
  };

  const viewOf = (menuNo: number) => {
    const verdict = preview?.byMenu.get(menuPreviewKey(menuRef(menuNo)));
    return {
      badges: badges.get(menuNo) ?? [],
      hiddenReason: verdict && !verdict.visible ? MENU_HIDDEN_REASON_LABELS[verdict.reason] : null,
    };
  };

  const areaChangeCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const menuNo of badges.keys()) {
      const area = areaOf(draft.items, menuNo);
      if (area !== null) counts.set(area, (counts.get(area) ?? 0) + 1);
    }
    return counts;
  }, [badges, draft.items]);

  /** 영역 탭의 개수 — 하위 메뉴 수, 미리보기 중 보이는 하위 수, 찾는 중 일치 수(영역 자신 포함). 초안은 선순회 순서다. */
  const areaCounts = useMemo(() => {
    const counts = new Map<number, MenuBoardAreaCount>();
    let current: MenuBoardAreaCount | null = null;
    for (const item of draft.items) {
      if (item.depth === 0) {
        current = { total: 0, shown: preview ? 0 : null, matched: matchSet ? 0 : null };
        counts.set(item.menuNo, current);
      } else if (current) {
        current.total += 1;
        if (current.shown !== null && preview?.byMenu.get(menuPreviewKey(menuRef(item.menuNo)))?.visible) current.shown += 1;
      }
      if (current && current.matched !== null && matchSet?.has(item.menuNo)) current.matched += 1;
    }
    return counts;
  }, [draft.items, preview, matchSet]);

  // ─── 초안 연산 ─────────────────────────────────────────────────────────────────────────────────

  /**
   * 초안을 바꾼다. 바꾸기 전 초안을 '직전 변경 되돌리기' 이력에 쌓는다(label 은 되돌렸다는 안내에 쓴다). coalesceKey 가 직전
   * 기록과 같으면(같은 칸을 이어 입력) 새 단계를 쌓지 않는다.
   */
  const commit = (next: MenuDraft, label: string, coalesceKey: string | null = null) => {
    if (next === draft) return;
    setUndoHistory((history) => recordMenuUndo(history, draft, label, coalesceKey));
    setDraft(next);
  };

  /** 영역 탭을 연다. 고른 메뉴가 그 영역에 없으면 선택을 푼다. */
  const activateArea = (areaNo: number) => {
    setActiveArea(areaNo);
    setSelectedMenuNo((current) => (current !== null && areaOf(draft.items, current) === areaNo ? current : null));
  };

  /** 메뉴를 고른다. 그 메뉴의 영역 탭을 연다. */
  const select = (menuNo: number, items: readonly FlattenedItem[] = draft.items) => {
    setSelectedMenuNo(menuNo);
    const area = areaOf(items, menuNo);
    if (area !== null) setActiveArea(area);
  };

  /**
   * 바꾼 초안에서 '저장하면 메뉴가 숨겨지는 그룹'이 늘었으면 그 사실을 말하는 문장(결과 안내 뒤에 붙인다). 변경 목록을 저절로
   * 펼치지 않으므로, 옮긴 직후 저장이 막힌 이유를 여기서 말한다. 그룹 권한을 모르면(summary 가 빈 그룹으로 계산) 늘지 않는다.
   */
  const conflictNotice = (next: MenuDraft): string => {
    const after = summarizeDraft(baseItems, next, groups).conflicts.length;
    const added = after - summary.conflicts.length;
    return added > 0
      ? ` 그 결과 메뉴가 숨겨지는 그룹이 ${added.toLocaleString()}건 생겨 저장할 수 없습니다 — '변경' 목록에서 해결하세요.`
      : '';
  };

  /** 초안 연산 결과를 반영한다. 바꾼 메뉴를 고르고(영역을 열고), 결과 문장을 말한다. 바뀐 것이 없으면 false. */
  const apply = (result: DraftResult, label: string, message?: (next: MenuDraft) => string, focus = false): boolean => {
    if (!result.ok) {
      announce(result.reason);
      return false;
    }
    if (result.draft === draft) return false;
    commit(result.draft, label);
    if (result.menuNo !== undefined) {
      select(result.menuNo, result.draft.items);
      if (focus) focusAfterMoveRef.current = result.menuNo;
    }
    const text = `${message ? message(result.draft) : ''}${conflictNotice(result.draft)}`.trim();
    if (text) announce(text);
    return true;
  };

  const handleShift = (menuNo: number, direction: -1 | 1, fromKeyboard: boolean) => {
    if (!canUpdate || locked) return;
    const where = direction < 0 ? '위로' : '아래로';
    const name = menuLabel(draft.items, menuNo);
    apply(
      shiftMenu(draft, menuNo, direction),
      `${name} 한 칸 ${where}`,
      (next) => `${menuLabel(next.items, menuNo)} 메뉴를 한 칸 ${where} 옮겼습니다(${placementText(next.items, menuNo)}). 변경 저장을 눌러야 반영됩니다.`,
      fromKeyboard,
    );
  };

  const handleDrop = (activeNo: number, target: BoardDropTarget) => {
    if (!canUpdate || locked) return;
    const result = resolveBoardDrop(draft.items, draft.deleted, activeNo, target);
    const name = menuLabel(draft.items, activeNo);
    if (result.kind === 'none') return;
    if (result.kind === 'reject') {
      announce(`${name} 메뉴를 그 자리로 옮길 수 없습니다. ${result.reason}`);
      return;
    }
    apply(
      moveMenu(draft, activeNo, result.parent, result.index),
      `${name} 옮기기`,
      (next) => `${name} 메뉴를 옮겼습니다(${placementText(next.items, activeNo)}). 변경 저장을 눌러야 반영됩니다.`,
    );
  };

  const handleCut = (menuNo: number) => {
    if (draft.deleted.has(menuNo)) {
      announce('삭제 예정 메뉴는 옮길 수 없습니다. 삭제를 먼저 취소하세요.');
      return;
    }
    setCutMenuNo(menuNo);
    announce(`${menuLabel(draft.items, menuNo)} 메뉴를 잘라 냈습니다. 놓을 곳을 고른 뒤 Ctrl+V 를 누르세요. 취소는 Esc 입니다.`);
  };

  const cancelCut = () => {
    if (cutMenuNo === null) return;
    setCutMenuNo(null);
    announce('잘라내기를 취소했습니다.');
  };

  const handlePaste = (targetNo: number) => {
    if (cutMenuNo === null || !canUpdate || locked) return;
    const name = menuLabel(draft.items, cutMenuNo);
    const target = pasteTarget(draft.items, targetNo);
    if (!target || targetNo === cutMenuNo) {
      announce(`${name} 메뉴 자신에는 붙여 넣을 수 없습니다. 다른 곳을 고르세요.`);
      return;
    }
    const result = resolveBoardDrop(draft.items, draft.deleted, cutMenuNo, target);
    if (result.kind === 'reject') {
      announce(`${name} 메뉴를 그 자리로 옮길 수 없습니다. ${result.reason}`);
      return;
    }
    const moved = cutMenuNo;
    setCutMenuNo(null);
    if (result.kind === 'none') {
      announce(`${name} 메뉴는 이미 그 자리에 있습니다.`);
      return;
    }
    apply(
      moveMenu(draft, moved, result.parent, result.index),
      `${name} 붙여넣기`,
      (next) => `${name} 메뉴를 붙여 넣었습니다(${placementText(next.items, moved)}). 변경 저장을 눌러야 반영됩니다.`,
      true,
    );
  };

  const handleItemKeyDown = (menuNo: number, event: React.KeyboardEvent<HTMLButtonElement>) => {
    const modifier = event.ctrlKey || event.metaKey;
    if (event.altKey && !modifier && !event.shiftKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      if (!canUpdate) return;
      event.preventDefault();
      handleShift(menuNo, event.key === 'ArrowUp' ? -1 : 1, true);
      return;
    }
    if (modifier && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'x') {
      if (!canUpdate) return;
      event.preventDefault();
      handleCut(menuNo);
      return;
    }
    if (modifier && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'v') {
      if (!canUpdate || cutMenuNo === null) return;
      event.preventDefault();
      handlePaste(menuNo);
      return;
    }
    if (event.key === 'Escape' && cutMenuNo !== null) {
      event.preventDefault();
      cancelCut();
    }
  };

  const handleAdd = (parent: MenuParentKey) => {
    if (!canCreate || locked) return;
    const result = addMenu(draft, parent, Number.POSITIVE_INFINITY);
    if (apply(result, `${parentPathLabel(draft.items, parent)} 새 메뉴 만들기`,
      (next) => `새 메뉴를 ${parentPathLabel(next.items, parent)} 맨 끝에 만들었습니다. 이름을 입력하세요.`)
      && result.ok && result.menuNo !== undefined) {
      requestFocus(result.menuNo, 'menuNm');
    }
  };

  const handleMoveConfirm = (parent: MenuParentKey, position: MenuMovePosition) => {
    const mode = moveDialog;
    setMoveDialog(null);
    if (!mode || locked) return;
    const index = position === 'first' ? 0 : Number.POSITIVE_INFINITY;
    if (mode.kind === 'create') {
      if (!canCreate) return;
      const at = position === 'first' ? '맨 앞에' : '맨 뒤에';
      const result = addMenu(draft, parent, index, { menuNm: mode.label ?? '', modernRoute: mode.route });
      if (apply(result, `${mode.label ?? '새'} 메뉴 만들기`,
        (next) => `${mode.label ?? '새'} 메뉴를 ${parentPathLabel(next.items, parent)} ${at} 만들었습니다. 이름을 확인하고 변경 저장을 누르세요.`)
        && result.ok && result.menuNo !== undefined) {
        requestFocus(result.menuNo, 'menuNm');
      }
      return;
    }
    if (!canUpdate) return;
    const name = menuLabel(draft.items, mode.menuNo);
    const result = moveMenu(draft, mode.menuNo, parent, index);
    if (result.ok && result.draft === draft) {
      announce(`${name} 메뉴는 이미 그 자리에 있습니다.`);
      return;
    }
    const to = position === 'first' ? '맨 앞으로' : '맨 뒤로';
    apply(result, `${name} 옮기기`, (next) => `${name} 메뉴를 ${parentPathLabel(next.items, parent)} ${to} 옮겼습니다. 변경 저장을 눌러야 반영됩니다.`);
  };

  const handleMoveCancel = () => {
    const mode = moveDialog;
    setMoveDialog(null);
    if (mode?.kind === 'create') announce('화면을 메뉴에 추가하지 않았습니다.');
  };

  /**
   * 속성을 바꾼다. typing(글자를 이어 넣는 칸 — 이름·설명·경로 직접 입력)이면 같은 칸을 이어 친 것을 한 단계로 묶는다. 화면
   * 목록에서 고르기·연결 해제·사용 여부는 누를 때마다 한 단계다 — 화면 A 를 고른 뒤 B 를 고르고 되돌리면 A 로 돌아간다.
   */
  const handleEdit = (menuNo: number, patch: MenuPropertyPatch, typing = false) => {
    if (!canUpdate || locked) return;
    const result = editMenu(draft, menuNo, patch);
    if (!result.ok) {
      announce(result.reason);
      return;
    }
    const fields = Object.keys(patch) as MenuEditableField[];
    commit(
      result.draft,
      `${menuLabel(draft.items, menuNo)} ${fields.map((field) => FIELD_LABEL[field]).join('·')} 수정`,
      typing && fields.length === 1 ? `edit:${menuNo}:${fields[0]}` : null,
    );
  };

  const handleDelete = (menuNo: number, deleted: boolean) => {
    if (!canDelete || locked) return;
    const name = menuLabel(draft.items, menuNo);
    apply(markDeleted(draft, menuNo, deleted), deleted ? `${name} 삭제 표시` : `${name} 삭제 취소`, () => (deleted
      ? `${name} 메뉴를 삭제 예정으로 표시했습니다. 변경 저장을 눌러야 지워집니다.`
      : `${name} 메뉴의 삭제를 취소했습니다.`));
  };

  /**
   * 새 메뉴를 초안에서 지운다. 지운 메뉴를 고르고 있었으면 바로 앞 메뉴(없으면 뒤 메뉴)를 고른다 — 상세가 통째로 사라지면
   * 누른 단추와 함께 포커스가 문서 밖으로 빠진다. 상세에서 지웠으면 고른 메뉴의 보드 항목으로 포커스를 옮기고, 변경 목록에서
   * 되돌렸으면 포커스는 변경 목록이 맡는다(focusBoardItem=false).
   */
  const handleRemoveNew = (menuNo: number, focusBoardItem = true) => {
    if (!canCreate || locked) return;
    const name = menuLabel(draft.items, menuNo);
    const index = draft.items.findIndex((item) => item.menuNo === menuNo);
    const result = removeNewMenu(draft, menuNo);
    if (!result.ok) {
      announce(result.reason);
      return;
    }
    commit(result.draft, `${name} 새 메뉴 지우기`);
    if (selectedMenuNo === menuNo) {
      const neighbor = result.draft.items[Math.max(0, index - 1)] ?? null;
      if (neighbor) {
        select(neighbor.menuNo, result.draft.items);
        if (focusBoardItem) focusAfterMoveRef.current = neighbor.menuNo;
      } else {
        setSelectedMenuNo(null);
      }
    }
    if (cutMenuNo === menuNo) setCutMenuNo(null);
    announce(`${name}을(를) 초안에서 지웠습니다.`);
  };

  const handleToggleNavigation = (groupCode: string, menuNo: number, checked: boolean) => {
    const group = groups.find((candidate) => candidate.code === groupCode);
    if (!group || !canGrant || locked) return;
    const before = groupGrants(draft, group);
    const result = setNavigation(draft, group, menuNo, checked);
    if (!result.ok) {
      announce(result.reason);
      return;
    }
    const after = groupGrants(result.draft, group);
    const extra = checked
      ? [...after].filter((key) => !before.has(key)).length > 1 ? ' 상위 메뉴 표시도 함께 켰습니다.' : ''
      : [...before].filter((key) => !after.has(key)).length > 1 ? ' 하위 메뉴 표시도 함께 껐습니다.' : '';
    const name = menuLabel(draft.items, menuNo);
    commit(result.draft, `${group.name} 그룹 ${name} 메뉴 표시 ${checked ? '켜기' : '끄기'}`);
    announce(`${group.name} 그룹에 ${name} 메뉴 표시를 ${checked ? '켰' : '껐'}습니다.${extra} 변경 저장을 눌러야 반영됩니다.`);
  };

  const handleAddOperations = (groupCode: string, codes: readonly string[]) => {
    const group = groups.find((candidate) => candidate.code === groupCode);
    if (!group || !canGrant || locked || codes.length === 0) return;
    const result = addOperations(draft, group, codes);
    if (!result.ok) {
      announce(result.reason);
      return;
    }
    commit(result.draft, `${group.name} 그룹 진입 권한 추가`);
    announce(`${group.name} 그룹에 진입 권한(${codes.join(', ')})을 추가했습니다. 변경 저장을 눌러야 반영됩니다.`);
  };

  /**
   * 직전 변경을 되돌린다(도구 막대 '되돌리기'·Ctrl+Z). 되돌린 뒤에도 고른 메뉴가 있으면 계속 고르고 그 메뉴의 영역을 연다 —
   * 옮기기를 되돌리면 메뉴가 원래 영역으로 돌아가므로, 지금 탭에 남아 있으면 상세가 이유 없이 닫힌다.
   */
  const handleUndo = () => {
    if (!canUpdate || locked) return;
    if (draggingRef.current) {
      announce('끌기를 마치거나 취소한 뒤 되돌리세요.');
      return;
    }
    const taken = takeMenuUndo(undoHistory);
    if (!taken) {
      announce('되돌릴 변경이 없습니다.');
      return;
    }
    const restored = taken.step.draft;
    setUndoHistory(taken.history);
    setDraft(restored);
    if (cutMenuNo !== null && !restored.items.some((item) => item.menuNo === cutMenuNo)) setCutMenuNo(null);
    if (selectedMenuNo !== null) {
      const area = areaOf(restored.items, selectedMenuNo);
      if (area === null) setSelectedMenuNo(null);
      else setActiveArea(area);
    }
    announce(`직전 변경(${taken.step.label})을 되돌렸습니다.`);
    // 되돌린 일로 포커스가 있던 항목(새 메뉴 등)이 사라졌으면 보드의 고른 항목으로 옮긴다.
    window.setTimeout(() => {
      const active = document.activeElement;
      if (!active || active === document.body || !active.isConnected) focusBoard();
    }, 0);
  };

  /*
    Ctrl+Z(맥은 Cmd+Z) — 이 화면 안에서 직전 변경을 되돌린다. 글자를 넣는 칸에서는 브라우저의 입력 되돌리기에 맡긴다. 화면
    밖(머리글 검색 등)과 포털로 그린 대화상자에서 누른 키는 이 요소를 거치지 않는다(DOM 이벤트가 이 요소로 올라오지 않는다).
    렌더마다 최신 처리기로 다시 단다(처리기가 지금 초안·이력을 본다). 보드에서 끄는 중(키보드 끌기 포함)에는 키를 그대로
    두고 되돌리지 않는다 — 끄는 메뉴를 만든 단계를 되돌리면 놓을 때 판정과 끌기 안내가 어긋난다.
  */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.shiftKey || !(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() !== 'z' || isTextEntry(event.target) || !canUpdate || draggingRef.current) return;
      event.preventDefault();
      handleUndo();
    };
    root.addEventListener('keydown', onKeyDown);
    return () => root.removeEventListener('keydown', onKeyDown);
  });

  const handleRevertAll = async () => {
    if (structureSavePendingRef.current || locked || !hasChanges || !baseline) return;
    // 도구 막대의 '변경 n건' 과 같은 원천에서 센다(변경 목록 항목은 요약의 다섯 배열을 한 건씩 옮긴 것이다).
    const total = changeEntries.length;
    const confirmed = await confirm({
      title: '변경 모두 되돌리기',
      message: `저장하지 않은 변경 ${total.toLocaleString()}건을 모두 되돌립니다. 바로 뒤라면 도구 막대의 '되돌리기'(Ctrl+Z)로 다시 살릴 수 있습니다.`,
      confirmText: '모두 되돌리기',
      variant: 'destructive',
    });
    if (!confirmed) return;
    commit(startDraft(baseline.items), '변경 모두 되돌리기');
    setCutMenuNo(null);
    setSelectedMenuNo((current) => (current !== null && baseline.items.some((item) => item.menuNo === current) ? current : null));
    announce('저장하지 않은 변경을 모두 되돌렸습니다.');
    // 변경 목록이 통째로 사라져 누른 단추도 없다 — 확인 대화상자가 닫힌 다음 차례에 보드 항목으로 포커스를 옮긴다.
    window.setTimeout(focusBoard, 0);
  };

  // ─── 다시 불러오기·저장 ────────────────────────────────────────────────────────────────────────

  /** 최신 메뉴 구조와 그룹 권한을 다시 읽는다. 지금 초안은 버린다(409 배너·DIP C5 배너·조회 실패의 다시 불러오기). */
  const reloadStructure = async () => {
    if (reloadPendingRef.current || structureSavePendingRef.current) return;
    reloadPendingRef.current = true;
    setReloadPending(true);
    setReloadError(null);
    try {
      const latest = await menuAdminService.getMenuStructure(QUIET);
      adopt(latest, selectedMenuNo);
      setStaleMessage(null);
      setSaveError(null);
      reloadGroups();
      announce('메뉴 구조를 다시 불러왔습니다.');
    } catch (error) {
      setReloadError(failureMessage(error, '메뉴 구조를 다시 불러오지 못했습니다. 잠시 뒤 다시 시도하세요.'));
    } finally {
      reloadPendingRef.current = false;
      setReloadPending(false);
    }
  };

  const counts = draftCounts(summary);
  const permissionProblem = !canUpdate
    ? '메뉴 수정 권한이 없어 저장할 수 없습니다.'
    : counts.created > 0 && !canCreate ? '새 메뉴를 저장하려면 메뉴 등록 권한이 필요합니다.'
      : counts.deleted > 0 && !canDelete ? '메뉴 삭제를 저장하려면 메뉴 삭제 권한이 필요합니다.'
        : counts.groups > 0 && !canGrant ? '그룹 배정을 저장하려면 권한 설정 권한이 필요합니다.'
          : null;
  const saveBlockedReason = !baseline
    ? '메뉴 구조를 불러오지 못해 저장할 수 없습니다. 다시 불러오세요.'
    : summary.conflicts.length > 0
      ? `메뉴가 숨겨지는 그룹 ${summary.conflicts.length.toLocaleString()}건을 해결해야 저장할 수 있습니다.`
      : summary.errors.size > 0
        ? `입력 오류 ${summary.errors.size.toLocaleString()}건을 고쳐야 저장할 수 있습니다.`
        : permissionProblem;
  const saveReady = hasChanges && saveBlockedReason === null && !reloadPending;

  // ─── 변경 목록 ─────────────────────────────────────────────────────────────────────────────────

  /** 위치 변경을 되돌릴 수 없는 이유(원래 상위가 삭제 예정 등). 되돌릴 수 있으면 undefined. */
  const placementRevertProblem = (menuNo: number): string | undefined => {
    const reverted = revertPlacement(draft, baseItems, menuNo);
    return reverted.ok ? undefined : reverted.reason;
  };
  // 거부된 저장의 문구는 변경이 남아 있는 동안만 보인다. 그 뒤 초안이 바뀌었으면 '마지막 저장 시도' 로 말한다.
  const shownSaveError = saveError && hasChanges ? saveError : null;
  const saveErrorCurrent = shownSaveError !== null && shownSaveError.draft === draft;

  const nameOf = (menuNo: number) => menuLabel(draft.items, menuNo);
  /** 변경 목록의 항목 하나를 되돌린다. 항목 키는 '종류:대상'(new·del·place·props 는 메뉴 번호, group 은 그룹 코드)이다. */
  const handleRevertChange = (id: string) => {
    if (locked) return;
    const at = id.indexOf(':');
    const kind = id.slice(0, at);
    const value = id.slice(at + 1);
    if (kind === 'group') {
      const name = summary.groups.find((group) => group.code === value)?.name ?? value;
      commit(revertGroup(draft, value), `${name} 그룹 배정 되돌리기`);
      announce(`${name} 그룹의 배정 변경을 되돌렸습니다.`);
      return;
    }
    const menuNo = Number(value);
    const name = nameOf(menuNo);
    if (kind === 'new') handleRemoveNew(menuNo, false);
    else if (kind === 'del') apply(markDeleted(draft, menuNo, false), `${name} 삭제 취소`, () => `${name} 메뉴의 삭제를 취소했습니다.`);
    else if (kind === 'place') apply(revertPlacement(draft, baseItems, menuNo), `${name} 위치 되돌리기`, () => `${name} 메뉴의 위치를 되돌렸습니다.`);
    else if (kind === 'props') apply(revertProperties(draft, baseItems, menuNo), `${name} 속성 되돌리기`, () => `${name} 메뉴의 속성을 되돌렸습니다.`);
  };
  const changeEntries: MenuChangeEntry[] = [
    ...summary.created.map((menuNo) => ({
      id: `new:${menuNo}`,
      text: `${nameOf(menuNo)} — 새 메뉴(${parentPathLabel(draft.items, parentKeyOf(draft.items.find((item) => item.menuNo === menuNo)?.parentId))})`,
      revertLabel: `${nameOf(menuNo)} 새 메뉴 추가 되돌리기`,
      revertBlockedReason: draft.items.some((item) => item.parentId === menuNo) ? '하위 메뉴가 있어 지울 수 없습니다. 하위 메뉴를 먼저 옮기거나 지우세요.' : undefined,
    })),
    ...summary.deleted.map((menuNo) => {
      const parent = parentKeyOf(draft.items.find((item) => item.menuNo === menuNo)?.parentId);
      return {
        id: `del:${menuNo}`,
        text: `${nameOf(menuNo)} — 삭제 예정`,
        revertLabel: `${nameOf(menuNo)} 삭제 표시 되돌리기`,
        revertBlockedReason: parent !== null && draft.deleted.has(parent) ? '상위 메뉴의 삭제를 먼저 취소하세요.' : undefined,
      };
    }),
    ...summary.structure.map((change) => ({
      id: `place:${change.menuNo}`,
      text: change.kind === 'move'
        ? `${nameOf(change.menuNo)} — ${parentPathLabel(baseItems, change.fromParent)} → ${parentPathLabel(draft.items, change.toParent)}`
        : `${nameOf(change.menuNo)} — 순서 변경(${parentPathLabel(draft.items, change.toParent)})`,
      revertLabel: `${nameOf(change.menuNo)} 위치 변경 되돌리기`,
      revertBlockedReason: placementRevertProblem(change.menuNo),
    })),
    ...summary.properties.map((change) => ({
      id: `props:${change.menuNo}`,
      text: `${nameOf(change.menuNo)} — ${change.fields.map((field) => FIELD_LABEL[field]).join('·')} 수정`,
      revertLabel: `${nameOf(change.menuNo)} 속성 변경 되돌리기`,
    })),
    ...summary.groups.map((group) => ({
      id: `group:${group.code}`,
      text: `${group.name} 그룹 — ${[
        group.navigationAdd.length > 0 ? `메뉴 표시 추가 ${group.navigationAdd.map(nameOf).join(', ')}` : '',
        group.navigationRemove.length > 0 ? `메뉴 표시 회수 ${group.navigationRemove.map(nameOf).join(', ')}` : '',
        group.operationAdd.length > 0 ? `기능권한 추가 ${group.operationAdd.join(', ')}` : '',
      ].filter(Boolean).join(' · ')}`,
      revertLabel: `${group.name} 그룹 배정 변경 되돌리기`,
    })),
  ];
  const movedMenus = new Set(summary.structure.filter((change) => change.kind === 'move').map((change) => change.menuNo));
  const conflictEntries: MenuChangeConflict[] = summary.conflicts.map((conflict) => ({
    id: `conflict-${conflict.menuNo}-${conflict.groupCode}`,
    // 옮긴 기존 메뉴면 옮겨서 숨겨지는 것이고, 아니면(새 메뉴·상위가 옮겨진 메뉴) 그 그룹에 표시하려면 상위도 표시해야 한다.
    text: movedMenus.has(conflict.menuNo)
      ? `'${nameOf(conflict.menuNo)}'을(를) 옮기면 ${conflict.groupName} 그룹에서 상위 메뉴 '${nameOf(conflict.parentNo)}'가 표시되지 않아 숨겨집니다.`
      : `'${nameOf(conflict.menuNo)}'을(를) ${conflict.groupName} 그룹에 표시하려면 지금 상위 메뉴 '${nameOf(conflict.parentNo)}'도 그 그룹에 표시해야 합니다.`,
    actions: canGrant && groups.some((group) => group.code === conflict.groupCode)
      ? [
        { label: `${conflict.groupName}에 상위 메뉴 표시 추가`, onClick: () => handleToggleNavigation(conflict.groupCode, conflict.parentNo, true) },
        { label: `${conflict.groupName}에서 이 메뉴 표시 회수`, onClick: () => handleToggleNavigation(conflict.groupCode, conflict.menuNo, false) },
      ]
      : [],
    note: canGrant ? undefined : '권한 설정 권한이 없어 여기서 해결할 수 없습니다. 메뉴를 원래 자리로 되돌리거나 권한 설정 권한이 있는 관리자에게 요청하세요.',
  }));
  const errorEntries: MenuChangeError[] = [...summary.errors].map(([menuNo, errors]) => ({
    id: `error-${menuNo}`,
    text: `${nameOf(menuNo)}: ${Object.values(errors).join(' ')}`,
    selectLabel: `${nameOf(menuNo)} 고치기`,
    onSelect: () => {
      select(menuNo);
      // 첫 오류 칸으로 간다(이름 → 연결 경로 → 설명 순).
      requestFocus(menuNo, (['menuNm', 'modernRoute', 'menuExpln'] as const).find((field) => errors[field]) ?? 'menuNm');
    },
  }));
  // 숨김 검사는 그룹 권한을 알 때만 한다. 모르면(권한 없음·불러오는 중·불러오기 실패) 그 사실을 저장 전에 말한다.
  const visibilityAtRisk = summary.structure.some((change) => change.kind === 'move') || summary.groups.length > 0;
  const groupsUnknownNote = !visibilityAtRisk || groupState === 'ready'
    ? ''
    : groupState === 'no-permission'
      ? ' 그룹 권한을 볼 수 없어 옮긴 메뉴가 숨겨지는 그룹을 미리 알려 줄 수 없습니다 — 저장할 때 서버가 확인합니다.'
      : groupState === 'error'
        ? ' 그룹 권한을 불러오지 못해 메뉴가 숨겨지는 그룹을 미리 확인하지 못했습니다 — 저장할 때 서버가 확인합니다. 상세의 그룹 권한 다시 불러오기로 다시 읽을 수 있습니다.'
        : ' 그룹 권한을 불러오는 중이라 메뉴가 숨겨지는 그룹을 아직 확인하지 못했습니다 — 저장할 때 서버가 확인합니다.';
  const changeNote = `${saveBlockedReason ?? '저장하지 않은 변경이 있습니다. \'변경 저장\'을 눌러야 반영됩니다.'}${groupsUnknownNote}`;
  const totalMenus = draft.items.length;
  const previewGroupName = groups.find((group) => group.code === previewGroup)?.name;

  /*
    변경 목록 여닫기 — '변경 n건' 단추만 연다(저절로 펼치지 않는다 — 위 changesOpen). 저장을 막는 문제의 수는 그 단추의 배지가
    늘 보인다. 변경이 모두 사라지면 접는다(다음 변경 때 펼친 채 나타나 보드를 밀지 않는다).
  */
  const blockingCount = conflictEntries.length + errorEntries.length;
  if (!hasChanges && changesOpen) setChangesOpen(false);
  /*
    목록이 저절로 접힐 때 포커스가 그 안(해결 단추 등)에 있었으면 '변경 n건' 단추로 옮긴다 — 숨겨진 요소의 포커스는 브라우저가
    문서 밖으로 내보낸다. 그리기 전에(useLayoutEffect) 옮겨, 목록 안의 포커스 이어받기(MenuChangeList)가 문서 밖 포커스를 보지 않게
    한다.
  */
  useLayoutEffect(() => {
    if (changesOpen) return;
    const panel = document.getElementById(changePanelId);
    const active = document.activeElement;
    if (panel && active instanceof HTMLElement && panel.contains(active)) changeToggleRef.current?.focus();
  }, [changesOpen, changePanelId]);

  const handleSaveChanges = async () => {
    if (structureSavePendingRef.current || reloadPendingRef.current) return;
    if (!baseline || !saveReady) return;
    structureSavePendingRef.current = true;
    const body = menuStructurePayload(baseline.version, baseline.items, draft, summary);
    const keep = selectedMenuNo;
    const keptItem = keep === null ? null : draft.items.find((item) => item.menuNo === keep) ?? null;
    const knownNos = new Set(baseline.items.map((item) => item.menuNo));
    try {
      const confirmed = await confirm({
        title: '메뉴 구조 저장',
        message: `새 메뉴 ${counts.created.toLocaleString()}개 · 삭제 ${counts.deleted.toLocaleString()}개 · 위치 ${counts.placed.toLocaleString()}개 · `
          + `속성 ${counts.properties.toLocaleString()}개 · 그룹 배정 ${counts.grants.toLocaleString()}건(그룹 ${counts.groups.toLocaleString()}개)을 저장합니다.`,
        confirmText: '변경 저장',
        // 저장 전에 무엇이 바뀌는지 항목으로 보인다(카탈로그 §5 A2 페이지 저장 — 변경 목록은 접혀 있을 수 있다).
        detailsLabel: '저장할 변경 목록',
        details: (
          <ul className="space-y-1 text-xs text-foreground">
            {changeEntries.map((entry) => <li key={entry.id}>{entry.text}</li>)}
          </ul>
        ),
      });
      if (!confirmed) return;
      setIsSaving(true);
      setSaveError(null);
      const saved = await menuAdminService.saveMenuStructure(body, QUIET);
      // 저장한 새 메뉴를 계속 고르고 있게 한다 — 응답은 새 번호를 알려 주지 않으므로 이름·경로가 같은 새 행을 찾는다.
      let nextSelection = keep;
      if (keep !== null && keptItem && isNewMenu(keep)) {
        nextSelection = saved.menus.find((menu) => !knownNos.has(menu.menuNo)
          && menu.menuNm === keptItem.menuNm.trim()
          && (menu.modernRoute ?? '') === (menuRouteValue(keptItem) ?? ''))?.menuNo ?? null;
      }
      adopt(saved, nextSelection);
      setStaleMessage(null);
      toast('메뉴 구조를 저장했습니다.', 'success');
      announce('');
      reloadGroups();
      router.refresh();
    } catch (error) {
      if (isConflictError(error)) {
        setStaleMessage(failureMessage(error, '메뉴 구조가 다른 곳에서 바뀌었습니다. 다시 불러온 뒤 저장해 주세요.'));
      } else {
        setSaveError({ message: failureMessage(error, '메뉴 구조를 저장하지 못했습니다. 잠시 뒤 다시 시도하세요.'), draft });
      }
    } finally {
      structureSavePendingRef.current = false;
      setIsSaving(false);
    }
  };

  /*
    보드 아래 상태 줄 — 결과 안내(aria-live)·찾기 일치 수·미리보기 요약·잘라 낸 메뉴·도움말. [2026-10-05 2차 리뷰] 종전에는 탭 줄
    아래(보드 위)에 두 줄 높이를 잡아 두었는데, 좁은 창에서 안내가 서너 줄이 되면 보드가 16~36px 씩 오르내렸다. 이제 fill 조건에서
    보드 스크롤 밖 맨 아래에 있어, 안내가 길어져도 보드의 위쪽(첫 줄 자리)은 그대로이고 보드가 아래에서 조금 줄어들 뿐이다.
  */
  const statusBar = (
    <div className="flex flex-wrap items-start gap-x-3 gap-y-1 border-t border-border pt-1.5 text-xs" data-menu-status="">
      <p aria-live="polite" className="min-w-[10rem] flex-1 text-muted-foreground">
        {announcement.text && <span key={announcement.seq}>{announcement.text}</span>}
      </p>
      {searching && (
        <span data-search-count="" className="shrink-0 font-semibold text-foreground">일치 {matches.length.toLocaleString()}개</span>
      )}
      {preview && previewCounts && previewGroupName && (
        <span className="shrink-0 text-muted-foreground">
          <span aria-hidden="true">{`${previewGroupName} · 보임 ${previewCounts.shown.toLocaleString()} · 숨김 ${previewCounts.hidden.toLocaleString()}`}</span>
          <span className="sr-only">
            {`${previewGroupName} 그룹 미리보기 — 저장 전 초안 기준 보이는 메뉴 ${previewCounts.shown.toLocaleString()}개, 숨는 메뉴 ${previewCounts.hidden.toLocaleString()}개(숨는 메뉴는 흐리게 표시하고 이유를 붙였습니다).`}
          </span>
        </span>
      )}
      {cutItem && (
        <span data-cut-chip="" className="inline-flex max-w-full shrink-0 items-center gap-1 rounded-md border border-dashed border-primary pl-2">
          <span className="min-w-0 truncate">잘라 낸 메뉴: <span className="font-semibold">{menuLabel(draft.items, cutItem.menuNo)}</span></span>
          <Button type="button" size="xs" variant="ghost" onClick={cancelCut}>잘라내기 취소</Button>
        </span>
      )}
      <details className="shrink-0 open:basis-full">
        <summary className="cursor-pointer rounded text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          키보드로 옮기는 법
        </summary>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
          <li>보드 항목에서 ↑·↓ 로 항목을 옮겨 다니고, 고른 항목에서 Tab 을 누르면 상세로 갑니다.</li>
          <li>찾기 칸에서 Enter 를 누르면 다음 일치 메뉴를 고릅니다.</li>
          {canUpdate && (
            <>
              <li>Alt+↑·Alt+↓ 로 같은 상위 안에서 한 칸 옮깁니다.</li>
              <li>Ctrl+X 로 잘라 놓을 곳을 고른 뒤 Ctrl+V 로 붙입니다(취소: Esc).</li>
              <li>고른 항목에서 Shift+Tab 으로 끌기 손잡이에 가서 Space 를 누르면 방향키로 끌어 옮깁니다. 상세의 &lsquo;옮기기…&rsquo;로 목적지를 골라 옮길 수도 있습니다.</li>
              <li>Ctrl+Z 는 직전 변경을 되돌리고, Ctrl+S 는 변경을 저장합니다.</li>
            </>
          )}
        </ul>
      </details>
    </div>
  );

  /** 찾는 말이 지금 영역에 없고 다른 영역에 있으면 첫 일치 영역을 연다(Enter 를 누르기 전에 어디 있는지 보인다). */
  const openMatchArea = (value: string) => {
    const found = menuSearchMatches(draft.items, value);
    if (found.length === 0 || currentArea === null) return;
    if (found.some((menuNo) => areaOf(draft.items, menuNo) === currentArea)) return;
    const area = areaOf(draft.items, found[0]);
    if (area === null || area === currentArea) return;
    // 탭을 누른 것과 같다 — 고른 메뉴가 그 영역에 없으면 선택을 푼다(보드에 없는 메뉴의 상세를 남기지 않는다, A2).
    activateArea(area);
    announce(`찾는 메뉴가 있는 ${menuLabel(draft.items, area)} 영역을 열었습니다.`);
  };

  return (
    <div ref={rootRef}>
      <MasterDetailPage
        fill
        title="시스템 메뉴 관리"
        description="메뉴 영역·섹션·화면의 배치와 이름·연결 화면·보이는 그룹을 한 초안에서 고치고 한 번에 저장합니다."
        breadcrumbItems={[{ label: '시스템 관리' }, { label: '메뉴 관리' }]}
        actions={canUpdate ? (
          <Button
            type="button"
            onClick={handleSaveChanges}
            disabled={!saveReady || isSaving}
            aria-busy={isSaving || undefined}
            aria-describedby={hasChanges ? noteId : undefined}
            aria-keyshortcuts="Control+S"
            className="gap-2 font-semibold"
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
            {isSaving ? '변경 저장 중…' : '변경 저장'}
          </Button>
        ) : undefined}
        notice={(visibleLoadError || reloadError || staleMessage || shownSaveError) ? (
          <div className="space-y-2">
            {(visibleLoadError || reloadError) && (
              <div role="alert" className="flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="mt-0.5 shrink-0 text-destructive-emphasis" aria-hidden="true" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-destructive-emphasis">메뉴 구조를 불러오지 못했습니다</p>
                    <p className="text-xs text-muted-foreground">{reloadError ?? visibleLoadError} — 아래 보드는 비어 있거나 최신 상태가 아닐 수 있습니다.</p>
                  </div>
                </div>
                <Button type="button" variant="outline" disabled={reloadPending} aria-busy={reloadPending || undefined}
                  onClick={() => { void reloadStructure(); }} className="shrink-0 gap-2 font-semibold">
                  <RefreshCcw size={16} aria-hidden="true" /> 메뉴 구조 다시 불러오기
                </Button>
              </div>
            )}
            {staleMessage && (
              <div role="alert" className="flex flex-col gap-3 rounded-md border border-warning/40 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">다른 곳에서 메뉴 구조나 그룹 권한이 바뀌었습니다</p>
                  <p className="text-xs text-foreground">
                    {staleMessage}{' '}
                    {hasChanges
                      ? '지금 변경은 지우지 않았습니다. 다시 불러오면 지금 변경은 사라집니다.'
                      : '저장하지 않은 변경은 이제 없습니다. 최신 구조를 보려면 다시 불러오세요.'}
                  </p>
                </div>
                <Button type="button" variant="outline" disabled={reloadPending || isSaving} aria-busy={reloadPending || undefined}
                  onClick={() => { void reloadStructure(); }} className="shrink-0 gap-2 font-semibold">
                  <RefreshCcw size={16} aria-hidden="true" /> 다시 불러오기
                </Button>
              </div>
            )}
            {shownSaveError && (
              <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-sm font-semibold text-destructive-emphasis">
                  {saveErrorCurrent ? '변경을 저장하지 못했습니다' : '마지막 저장 시도를 서버가 거부했습니다'}
                </p>
                <p className="mt-1 text-xs text-foreground">
                  {shownSaveError.message}
                  {saveErrorCurrent ? '' : ' 그 뒤 초안을 바꿨습니다. 다시 저장하면 서버가 다시 확인합니다.'}
                </p>
              </div>
            )}
          </div>
        ) : undefined}
        masterTitle="메뉴 구조"
        masterDescription={`메뉴 ${totalMenus.toLocaleString()}개${canUpdate ? '' : ' · 조회 전용'}`}
        masterTools={(
          <>
            {/* 찾기 칸은 7rem 을 기본으로 남는 자리를 받아 11rem 까지 넓어진다 — 도구 줄의 최소 폭(제목 옆에 들어가는지)이 상태와
                무관한 고정값이 되고, 넓은 창에서는 넉넉하다. */}
            <div className="relative w-28 max-w-44 grow">
              <Search size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="메뉴 검색"
                value={keyword}
                onChange={(event) => {
                  const value = event.target.value;
                  setKeyword(value);
                  // 한글 조합 중에는 글자 단계마다 탭이 바뀌지 않게 조합이 끝난 뒤에 연다.
                  if (!composingRef.current) openMatchArea(value);
                }}
                onCompositionStart={() => { composingRef.current = true; }}
                onCompositionEnd={(event) => {
                  composingRef.current = false;
                  openMatchArea(event.currentTarget.value);
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' || composingRef.current) return;
                  event.preventDefault();
                  const next = nextSearchMatch(matches, selectedMenuNo);
                  if (next === null) {
                    if (searching) announce('일치하는 메뉴가 없습니다.');
                    return;
                  }
                  select(next);
                  revealRef.current = next;
                  announce(`일치 ${matches.length.toLocaleString()}개 중 ${(matches.indexOf(next) + 1).toLocaleString()}번째: ${menuLabel(draft.items, next)}`);
                }}
                placeholder="이름·ID·경로"
                className="h-[var(--control-h-sm)] w-full pl-9"
              />
            </div>
            {canReadGroups && (
              <select
                aria-label="그룹 미리보기"
                value={previewGroup}
                disabled={groupState !== 'ready'}
                onChange={(event) => setPreviewGroup(event.target.value)}
                className="h-[var(--control-h-sm)] w-36 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">그룹 미리보기 안 함</option>
                {groups.map((group) => <option key={group.code} value={group.code}>{group.name} ({group.code})</option>)}
              </select>
            )}
            {canUpdate && (
              <Button
                ref={changeToggleRef}
                type="button"
                size="sm"
                variant="outline"
                disabled={changeEntries.length === 0}
                aria-expanded={changesOpen}
                aria-controls={changePanelId}
                onClick={() => {
                  const opening = !changesOpen;
                  setChangesOpen(opening);
                  // 칸이 통째로 스크롤하는 좁은 화면(fill 조건 밖)에서 칸을 내려 둔 채 열면 목록이 보이지 않는다 — 보이게 옮긴다.
                  if (opening) window.requestAnimationFrame(() => document.getElementById(changePanelId)?.scrollIntoView?.({ block: 'nearest' }));
                }}
                // 늘 그리고 폭을 미리 잡는다(두 자리 수까지) — 변경·저장을 막는 문제가 생기고 사라질 때 도구 줄의 폭이 바뀌지 않는다.
                className="relative min-w-[7rem] tabular-nums"
              >
                <ChevronDown aria-hidden="true" className={cn('transition-transform', changesOpen && 'rotate-180')} />
                변경 {changeEntries.length.toLocaleString()}건
                {blockingCount > 0 && (
                  <>
                    {' '}
                    {/* 저장을 막는 문제의 수는 단추 모서리에 겹쳐 그린다(absolute) — 단추 폭에 들지 않아 도구 줄이 접히지 않는다
                        (2차 리뷰: 두 자리 수 배지가 단추를 153px 로 늘려 도구 줄이 제목 아래로 내려갔다). */}
                    <span
                      data-blocking-badge=""
                      className="absolute -right-2 -top-2 inline-flex items-center gap-0.5 rounded-full border border-warning/50 bg-card px-1 text-xs font-semibold leading-4 text-warning-emphasis tabular-nums"
                    >
                      <AlertTriangle aria-hidden="true" className="size-3" />
                      <span aria-hidden="true">{blockingCount > 99 ? '99+' : blockingCount.toLocaleString()}</span>
                      <span className="sr-only">{`저장 전 해결 ${blockingCount.toLocaleString()}건`}</span>
                    </span>
                  </>
                )}
              </Button>
            )}
            {canUpdate && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label="직전 변경 되돌리기"
                aria-keyshortcuts="Control+Z"
                // disabled 가 아니라 aria-disabled 다 — 마지막 단계를 이 단추로 되돌리면 단추가 막히는데, disabled 면 브라우저가
                // 포커스를 문서 밖으로 내보내 키보드 사용자가 자리를 잃는다. 막힌 동안 누르면 되돌릴 것이 없다고 말한다.
                aria-disabled={undoHistory.steps.length === 0 || locked || undefined}
                onClick={handleUndo}
                className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
              >
                <Undo2 aria-hidden="true" />되돌리기
              </Button>
            )}
          </>
        )}
        master={(
          // fill 조건에서 마스터 칸이 넘긴 남은 높이를 보드(MenuBoard 의 보드 스크롤 상자)까지 잇는 중간 고리다.
          <div className={cn('space-y-2', WORK_FILL_REGION_CLASS)}>
            {reloadedWhileEditing && (
              <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
                <span>저장하지 않은 변경이 있는 동안 메뉴 구조가 다시 읽혔습니다. 저장하면 다른 곳의 변경과 겹쳐 거부될 수 있고, 변경을 취소하면 최신 구조로 돌아갑니다.</span>
                <Button type="button" size="sm" variant="outline" onClick={() => { void reloadStructure(); }} disabled={locked}>변경 취소</Button>
              </div>
            )}
            <MenuChangeList
              entries={changeEntries}
              conflicts={conflictEntries}
              errors={errorEntries}
              open={changesOpen}
              panelId={changePanelId}
              toggleRef={changeToggleRef}
              noteId={noteId}
              note={changeNote}
              disabled={locked}
              onRevert={handleRevertChange}
              onRevertAll={() => { void handleRevertAll(); }}
              onFocusLost={focusBoard}
            />
            <MenuBoard
              items={draft.items}
              deleted={draft.deleted}
              activeArea={currentArea}
              onActivateArea={activateArea}
              areaChangeCounts={areaChangeCounts}
              areaCounts={areaCounts}
              statusBar={statusBar}
              selectedMenuNo={selectedNo}
              onSelect={(menuNo) => select(menuNo)}
              viewOf={viewOf}
              searchMatches={matchSet}
              cutMenuNo={cutMenuNo}
              movable={canUpdate}
              creatable={canCreate}
              locked={locked}
              onAddArea={() => handleAdd(null)}
              onAddSection={(areaNo) => handleAdd(areaNo)}
              onAddScreen={(sectionNo) => handleAdd(sectionNo)}
              previewDrop={(activeNo, target) => resolveBoardDrop(draft.items, draft.deleted, activeNo, target)}
              onDrop={handleDrop}
              onItemKeyDown={handleItemKeyDown}
              onDraggingChange={(dragging) => { draggingRef.current = dragging; }}
            />
          </div>
        )}
        masterSize="wide"
        masterFillChild
        selectedItemLabel={selectedItem ? menuLabel(draft.items, selectedItem.menuNo) : undefined}
        detailTitle="메뉴 상세"
        detailDescription={selectedItem ? (isNewMenu(selectedItem.menuNo) ? '저장 전 새 메뉴' : `메뉴 ID ${selectedItem.menuNo}`) : undefined}
        detail={selectedItem ? (
          <MenuInspector
            item={selectedItem}
            draft={draft}
            errors={summary.errors.get(selectedItem.menuNo) ?? {}}
            groups={groups}
            groupState={groupState}
            verdictOf={verdictOf}
            editable={canUpdate}
            creatable={canCreate}
            deletable={canDelete}
            groupsEditable={canGrant}
            locked={locked}
            focusRequest={focusRequest}
            onFocusHandled={clearFocusRequest}
            onEdit={(patch, typing) => handleEdit(selectedItem.menuNo, patch, typing)}
            onShift={(direction) => handleShift(selectedItem.menuNo, direction, false)}
            onOpenMove={() => { if (canUpdate && !locked) setMoveDialog({ kind: 'move', menuNo: selectedItem.menuNo }); }}
            onDelete={() => handleDelete(selectedItem.menuNo, true)}
            onUndelete={() => handleDelete(selectedItem.menuNo, false)}
            onRemoveNew={() => handleRemoveNew(selectedItem.menuNo)}
            onRetryGroups={() => { void matrixQuery.refetch(); }}
            onToggleNavigation={(groupCode, checked) => handleToggleNavigation(groupCode, selectedItem.menuNo, checked)}
            onAddOperations={handleAddOperations}
          />
        ) : undefined}
        emptyDetailTitle="메뉴를 선택하세요"
        emptyDetailDescription="보드에서 영역·섹션·화면을 선택하면 위치·보이는 그룹·이름·연결 화면을 편집할 수 있습니다."
        onSaveShortcut={hasChanges ? handleSaveChanges : undefined}
        saveShortcutScope="page"
        saveShortcutDisabled={!saveReady || isSaving}
      />

      {moveDialog && (
        <MenuMoveDialog
          mode={moveDialog}
          items={draft.items}
          deleted={draft.deleted}
          onClose={handleMoveCancel}
          onConfirm={handleMoveConfirm}
        />
      )}
    </div>
  );
}
