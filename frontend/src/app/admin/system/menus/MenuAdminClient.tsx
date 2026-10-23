'use client';

import { use, useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Search } from 'lucide-react';
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
import { clearMenuFocusHandoff, clearScreenHandoff, useMenuFocusHandoff, useScreenHandoff } from '@/lib/navigation/target-handoff';
import { menuAdminService, type MenuStructure } from '@/services/foundation/system/MenuAdminService';
import {
  isNewMenu,
  menuLabel,
  menuRouteValue,
  menuStructurePayload,
} from './menuDraft';
import { areaOf, menuSearchMatches, nextSearchMatch, resolveBoardDrop } from './menuBoardModel';
import { MenuBoard } from './MenuBoard';
import { MenuInspector } from './MenuInspector';
import { MenuMoveDialog } from './MenuMoveDialog';
import { MenuChangeList } from './MenuChangeList';
import { QUIET, menuSaveGate } from './menuAdminModel';
import { useMenuDraftState } from './useMenuDraftState';
import { useMenuGroupMatrix } from './useMenuGroupMatrix';
import { useMenuStructureReload } from './useMenuStructureReload';
import { useMenuChangePanel } from './useMenuChangePanel';
import { useMenuDraftOperations } from './useMenuDraftOperations';
import { useMenuBoardView } from './useMenuBoardView';
import { buildMenuChangeEntries, buildMenuConflictEntries, buildMenuErrorEntries, groupsUnknownNoteOf } from './menuChangeEntries';
import { MenuAdminStatusBar } from './MenuAdminStatusBar';
import { MenuAdminNotices } from './MenuAdminNotices';
import { MenuAdminToolButtons } from './MenuAdminToolButtons';

/**
 * 서버 조회 결과 봉투.
 * 실패를 빈 구조로 삼켜 "메뉴 0건"으로 위장하지 않기 위해, 사유를 함께 실어 나른다.
 */
export type FetchResult<T> = { data: T; error: string | null };

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
 *
 * [2026-10-18 화면 분해] 한 함수(약 1,160줄)를 동작 변경 없이 나눴다 — 초안 상태(useMenuDraftState)·초안 연산
 * (useMenuDraftOperations)·보드 보기(useMenuBoardView)·그룹 권한(useMenuGroupMatrix)·저장·다시 불러오기 상태(useMenuStructureReload)·
 * 변경 목록 항목(menuChangeEntries)·값과 판정(menuAdminModel)·알림(MenuAdminNotices)·상태 줄(MenuAdminStatusBar)·도구 단추
 * (MenuAdminToolButtons). 서버 쓰기('변경 저장')와 그 단추, 찾기 칸·그룹
 * 미리보기는 이 화면에 둔다(폼 검증 census 의 쓰기 경계).
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
  /** 찾기 칸에서 한글 등을 조합하는 중인가 — 조합 중에는 영역을 저절로 바꾸지 않는다(글자 조합 단계마다 탭이 바뀌지 않게). */
  const composingRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const { matrixQuery, groupState, groups, reloadGroups } = useMenuGroupMatrix({
    userId: user?.id,
    authorizationVersion: user?.authorizationVersion,
    canReadGroups,
    authPending,
  });

  const state = useMenuDraftState({ loadedStructure, groups });
  const {
    baseline,
    baseItems,
    draft,
    undoHistory,
    selectedMenuNo,
    cutItem,
    cutMenuNo,
    moveDialog,
    setMoveDialog,
    draggingRef,
    focusRequest,
    requestFocus,
    clearFocusRequest,
    announcement,
    announce,
    reloadedWhileEditing,
    revealRef,
    focusBoard,
    summary,
    badges,
    hasChanges,
    adopt,
    currentArea,
    selectedItem,
    selectedNo,
    activateArea,
    select,
  } = state;
  const {
    isSaving,
    setIsSaving,
    structureSavePendingRef,
    reloadPending,
    reloadPendingRef,
    staleMessage,
    setStaleMessage,
    saveError,
    setSaveError,
    reloadError,
    reloadStructure,
  } = useMenuStructureReload({ adopt, selectedMenuNo, reloadGroups, announce });

  // 저장하지 않은 변경이 있으면 화면을 떠나기 전에 확인한다.
  useUnsavedChanges({ dirty: hasChanges });
  // 변경 목록 여닫기 — '변경 n건' 단추만 연다(저절로 펼치지 않는다, 변경이 모두 사라지면 접는다).
  const { changePanelId, changeToggleRef, changesOpen, toggleChanges } = useMenuChangePanel(hasChanges);

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

  /*
    [2026-10-23 ADR-0040 결정 8] 게시판 운영 화면이 넘긴 메뉴. 받으면 그 메뉴를 고르고(그 영역 탭이 열린다) 행으로 스크롤한다 —
    한 번만(인계 시각으로 가린다), 적용한 뒤 지운다. 선택은 조회일 뿐이고 활성화·그룹 표시 저장은 서버가 권한을 다시 판정한다.
  */
  const focusHandoff = useMenuFocusHandoff();
  const [handledFocus, setHandledFocus] = useState<{ at: number; menuSn: number | null } | null>(null);
  if (focusHandoff && focusHandoff.at !== handledFocus?.at && !authPending && baseline) {
    const found = areaOf(draft.items, focusHandoff.menuSn) !== null;
    setHandledFocus({ at: focusHandoff.at, menuSn: found ? focusHandoff.menuSn : null });
    if (found) {
      select(focusHandoff.menuSn);
      announce(`넘겨받은 메뉴를 골랐습니다: ${menuLabel(draft.items, focusHandoff.menuSn)}`);
    } else {
      announce('넘겨받은 메뉴를 찾지 못했습니다. 메뉴가 지워졌거나 번호가 바뀌었을 수 있습니다.');
    }
  }
  // 고른 행이 그려진 뒤 스크롤한다(렌더 중에는 ref·DOM 을 건드리지 않는다).
  useEffect(() => {
    if (handledFocus === null) return;
    clearMenuFocusHandoff();
    if (handledFocus.menuSn !== null) {
      document.querySelector<HTMLElement>(`[data-a2-master-item][data-menu-no="${handledFocus.menuSn}"]`)
        ?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [handledFocus]);

  const locked = isSaving || reloadPending;
  // 처음 조회가 실패했어도 다시 불러오기로 구조를 받았으면 그 사유는 더는 사실이 아니다.
  const visibleLoadError = baseline ? null : loadError;

  const view = useMenuBoardView({ draft, groups, badges, selectedMenuNo, selectedNo });
  const { keyword, setKeyword, previewGroup, setPreviewGroup, searching, matches, matchSet } = view;

  // 변경 목록 항목 — 도구 막대의 '변경 n건'·저장 확인의 목록·'모두 되돌리기' 의 건수가 같은 배열을 센다.
  const changeEntries = buildMenuChangeEntries(summary, draft, baseItems);
  const operations = useMenuDraftOperations(state, {
    canUpdate, canCreate, canDelete, canGrant, locked, groups, rootRef,
    confirm, savePendingRef: structureSavePendingRef, changeCount: changeEntries.length,
  });
  const { handleToggleNavigation, handleUndo } = operations;

  const { counts, saveBlockedReason, saveReady } = menuSaveGate(summary, {
    hasBaseline: Boolean(baseline), hasChanges, reloadPending, canUpdate, canCreate, canDelete, canGrant,
  });

  // 거부된 저장의 문구는 변경이 남아 있는 동안만 보인다. 그 뒤 초안이 바뀌었으면 '마지막 저장 시도' 로 말한다.
  const shownSaveError = saveError && hasChanges ? saveError : null;
  const saveErrorCurrent = shownSaveError !== null && shownSaveError.draft === draft;

  const conflictEntries = buildMenuConflictEntries(summary, draft, { groups, canGrant, onToggleNavigation: handleToggleNavigation });
  const errorEntries = buildMenuErrorEntries(summary, draft, (menuNo, field) => {
    select(menuNo);
    requestFocus(menuNo, field);
  });
  const changeNote = `${saveBlockedReason ?? '저장하지 않은 변경이 있습니다. \'변경 저장\'을 눌러야 반영됩니다.'}${groupsUnknownNoteOf(summary, groupState)}`;
  const totalMenus = draft.items.length;

  // 저장을 막는 문제의 수 — '변경 n건' 단추의 배지가 늘 보인다.
  const blockingCount = conflictEntries.length + errorEntries.length;

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
          <MenuAdminNotices
            loadError={(visibleLoadError || reloadError) ? (reloadError ?? visibleLoadError ?? '') : null}
            staleMessage={staleMessage}
            saveError={shownSaveError}
            saveErrorCurrent={saveErrorCurrent}
            hasChanges={hasChanges}
            reloadPending={reloadPending}
            isSaving={isSaving}
            onReload={() => { void reloadStructure(); }}
          />
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
              <MenuAdminToolButtons
                changeToggleRef={changeToggleRef}
                changeCount={changeEntries.length}
                blockingCount={blockingCount}
                changesOpen={changesOpen}
                changePanelId={changePanelId}
                onToggleChanges={toggleChanges}
                undoDisabled={undoHistory.steps.length === 0 || locked}
                onUndo={handleUndo}
              />
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
              onRevert={operations.handleRevertChange}
              onRevertAll={() => { void operations.handleRevertAll(); }}
              onFocusLost={focusBoard}
            />
            <MenuBoard
              items={draft.items}
              deleted={draft.deleted}
              activeArea={currentArea}
              onActivateArea={activateArea}
              areaChangeCounts={view.areaChangeCounts}
              areaCounts={view.areaCounts}
              statusBar={(
                <MenuAdminStatusBar
                  announcement={announcement}
                  searching={searching}
                  matchCount={matches.length}
                  previewCounts={view.previewCounts}
                  previewGroupName={view.previewGroupName}
                  cutMenuName={cutItem ? menuLabel(draft.items, cutItem.menuNo) : null}
                  onCancelCut={operations.cancelCut}
                  canUpdate={canUpdate}
                />
              )}
              selectedMenuNo={selectedNo}
              onSelect={(menuNo) => select(menuNo)}
              viewOf={view.viewOf}
              searchMatches={matchSet}
              cutMenuNo={cutMenuNo}
              movable={canUpdate}
              creatable={canCreate}
              locked={locked}
              onAddArea={() => operations.handleAdd(null)}
              onAddSection={(areaNo) => operations.handleAdd(areaNo)}
              onAddScreen={(sectionNo) => operations.handleAdd(sectionNo)}
              previewDrop={(activeNo, target) => resolveBoardDrop(draft.items, draft.deleted, activeNo, target)}
              onDrop={operations.handleDrop}
              onItemKeyDown={operations.handleItemKeyDown}
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
            verdictOf={view.verdictOf}
            editable={canUpdate}
            creatable={canCreate}
            deletable={canDelete}
            groupsEditable={canGrant}
            locked={locked}
            focusRequest={focusRequest}
            onFocusHandled={clearFocusRequest}
            onEdit={(patch, typing) => operations.handleEdit(selectedItem.menuNo, patch, typing)}
            onShift={(direction) => operations.handleShift(selectedItem.menuNo, direction, false)}
            onOpenMove={() => { if (canUpdate && !locked) setMoveDialog({ kind: 'move', menuNo: selectedItem.menuNo }); }}
            onDelete={() => operations.handleDelete(selectedItem.menuNo, true)}
            onUndelete={() => operations.handleDelete(selectedItem.menuNo, false)}
            onRemoveNew={() => operations.handleRemoveNew(selectedItem.menuNo)}
            onRetryGroups={() => { void matrixQuery.refetch(); }}
            onToggleNavigation={(groupCode, checked) => handleToggleNavigation(groupCode, selectedItem.menuNo, checked)}
            onAddOperations={operations.handleAddOperations}
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
          onClose={operations.handleMoveCancel}
          onConfirm={operations.handleMoveConfirm}
        />
      )}
    </div>
  );
}
