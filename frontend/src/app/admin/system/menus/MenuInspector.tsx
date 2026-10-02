'use client';

import { useEffect, useId, useRef } from 'react';
import { ArrowDown, ArrowUp, MoveRight, Trash2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { FlattenedItem } from './treeUtils';
import {
  ancestorIds,
  descendantIds,
  isNewMenu,
  MENU_LIMITS,
  menuLabel,
  type MenuDraft,
  type MenuFieldErrors,
  type MenuGroup,
  type MenuPropertyPatch,
} from './menuDraft';
import { MenuScreenPicker, RouteFacts } from './MenuScreenPicker';
import { MenuGroupVisibility, type GroupMatrixState } from './MenuGroupVisibility';

/** 상세의 어느 칸으로 포커스를 옮길지 — 새 메뉴를 만든 직후(이름), 입력 오류의 '고치기'(그 오류 칸). */
export type MenuFocusField = 'menuNm' | 'modernRoute' | 'menuExpln';

/**
 * 한 번만 쓰는 포커스 요청. 받는 상세(menuNo 가 같은 상세)가 포커스를 옮긴 뒤 onFocusHandled 로 지운다 — 남겨 두면 상세가
 * 닫혔다 다시 열릴 때마다(다른 영역 탭, 새 메뉴 지우기 뒤 다시 고르기, 끌기 시작) 포커스가 그 칸으로 끌려간다.
 */
export interface MenuFocusRequest {
  menuNo: number;
  field: MenuFocusField;
  seq: number;
}

/**
 * [2026-10-02 D1·D2] 보드 오른쪽 칸 — 고른 메뉴의 위치·속성·보이는 그룹·삭제. 모든 편집은 초안에 바로 반영되고 '변경 저장'
 * 한 번으로 저장된다(즉시 저장하는 수정 창은 없다). 쓰기 동작은 이 파일에 없다 — 콜백만 부른다.
 */
export interface MenuInspectorProps {
  item: FlattenedItem;
  draft: MenuDraft;
  /** 저장할 메뉴의 입력 오류(초안 요약이 계산한다). */
  errors: MenuFieldErrors;
  groups: readonly MenuGroup[];
  groupState: GroupMatrixState;
  /** 순서·위치·속성을 바꿀 수 있는가(MENU_UPDATE). */
  editable: boolean;
  /** 새 메뉴를 만들 수 있는가(MENU_CREATE·MENU_UPDATE) — 새 메뉴 지우기에 쓴다. */
  creatable: boolean;
  /** 삭제 예정으로 표시할 수 있는가(MENU_DELETE·MENU_UPDATE). */
  deletable: boolean;
  /** 메뉴 표시를 바꿀 수 있는가(AUTHRT_GRANT·MENU_UPDATE). */
  groupsEditable: boolean;
  locked: boolean;
  /** 포커스 요청(이 메뉴의 것일 때만 따른다). */
  focusRequest: MenuFocusRequest | null;
  onFocusHandled: () => void;
  onEdit: (patch: MenuPropertyPatch) => void;
  onShift: (direction: -1 | 1) => void;
  onOpenMove: () => void;
  onDelete: () => void;
  onUndelete: () => void;
  onRemoveNew: () => void;
  onRetryGroups: () => void;
  onToggleNavigation: (groupCode: string, checked: boolean) => void;
  onAddOperations: (groupCode: string, codes: readonly string[]) => void;
}

export function MenuInspector(props: MenuInspectorProps) {
  const {
    item, draft, errors, groups, groupState, editable, creatable, deletable, groupsEditable, locked, focusRequest, onFocusHandled,
    onEdit, onShift, onOpenMove, onDelete, onUndelete, onRemoveNew, onRetryGroups, onToggleNavigation, onAddOperations,
  } = props;
  const baseId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const routeRef = useRef<HTMLInputElement>(null);
  const explnRef = useRef<HTMLTextAreaElement>(null);
  const isNew = isNewMenu(item.menuNo);
  const deleted = draft.deleted.has(item.menuNo);
  const fieldsEditable = editable && !deleted;
  const path = [...ancestorIds(draft.items, item.menuNo), item.menuNo].map((id) => menuLabel(draft.items, id)).join(' › ');
  /*
    지울 수 없게 막는 하위. 기존 메뉴는 남는(삭제 예정이 아닌) 하위만 막는다 — 하위를 함께 삭제 예정으로 두면 된다.
    새 메뉴는 삭제 예정인 하위도 막는다 — 초안에서 지우면 그 하위가 갈 곳이 없다(removeNewMenu 와 같은 판정).
  */
  const blockingChildren = [...descendantIds(draft.items, item.menuNo)].filter((id) => isNew || !draft.deleted.has(id));
  const blockedByDeleted = blockingChildren.some((id) => draft.deleted.has(id));
  const ownRequest = focusRequest !== null && focusRequest.menuNo === item.menuNo ? focusRequest : null;
  const route = (item.modernRoute ?? '').trim() || null;
  const deleteReasonId = `${baseId}-delete-reason`;
  const placementReasonId = `${baseId}-placement-reason`;

  // 새 메뉴를 만든 직후 이름 칸, 입력 오류의 '고치기' 면 그 오류 칸으로 간다. 대화상자에서 만들었으면 대화상자가 닫히며
  // 포커스를 여는 단추로 되돌리므로 그 다음 차례(타이머)에 옮긴다. 옮긴 뒤 요청을 지운다(한 번만 쓴다).
  useEffect(() => {
    if (ownRequest === null) return undefined;
    const timer = window.setTimeout(() => {
      const target = ownRequest.field === 'modernRoute' ? routeRef.current : ownRequest.field === 'menuExpln' ? explnRef.current : null;
      (target ?? nameRef.current)?.focus();
      onFocusHandled();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [ownRequest, onFocusHandled]);

  return (
    <div className="space-y-5">
      <section aria-labelledby={`${baseId}-place`} className="space-y-2">
        <h3 id={`${baseId}-place`} className="text-xs font-semibold text-muted-foreground">위치</h3>
        <p className="text-sm text-foreground">{path}</p>
        <p className="text-xs text-muted-foreground">
          {item.depth + 1}단계 · {isNew ? 'ID: 저장 전' : `ID: ${item.menuNo}`}
          {item.prgrmFileNm ? ` · 이전 프로그램 연결: ${item.prgrmFileNm}` : ''}
        </p>
        {editable && (
          <>
            {deleted && <p id={placementReasonId} className="text-xs text-muted-foreground">삭제 예정 메뉴는 옮길 수 없습니다. 삭제를 먼저 취소하세요.</p>}
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" disabled={deleted || locked}
                aria-describedby={deleted ? placementReasonId : undefined} onClick={() => onShift(-1)}>
                <ArrowUp aria-hidden="true" />한 칸 위로
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={deleted || locked}
                aria-describedby={deleted ? placementReasonId : undefined} onClick={() => onShift(1)}>
                <ArrowDown aria-hidden="true" />한 칸 아래로
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={deleted || locked}
                aria-describedby={deleted ? placementReasonId : undefined} onClick={onOpenMove}>
                <MoveRight aria-hidden="true" />다른 곳으로 옮기기…
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              보드에서 손잡이를 끌거나, 항목에서 Alt+↑·Alt+↓(한 칸), Ctrl+X 로 잘라 놓을 곳을 고른 뒤 Ctrl+V 로도 옮길 수 있습니다.
            </p>
          </>
        )}
      </section>

      <section aria-labelledby={`${baseId}-props`} className="space-y-3">
        <h3 id={`${baseId}-props`} className="text-xs font-semibold text-muted-foreground">메뉴 속성</h3>
        {fieldsEditable ? (
          <>
            <div className="space-y-1">
              <label htmlFor={`${baseId}-name`} className="text-xs font-medium text-foreground">메뉴 이름</label>
              <Input
                ref={nameRef}
                id={`${baseId}-name`}
                value={item.menuNm ?? ''}
                maxLength={MENU_LIMITS.name}
                aria-invalid={errors.menuNm ? true : undefined}
                aria-describedby={errors.menuNm ? `${baseId}-name-error` : undefined}
                onChange={(event) => onEdit({ menuNm: event.target.value })}
              />
              {errors.menuNm && <p id={`${baseId}-name-error`} className="text-xs text-destructive-emphasis">{errors.menuNm}</p>}
            </div>
            <MenuScreenPicker
              key={item.menuNo}
              route={item.modernRoute ?? null}
              editable
              error={errors.modernRoute}
              onChange={(next) => onEdit({ modernRoute: next })}
              routeInputRef={routeRef}
              directRequest={ownRequest?.field === 'modernRoute' ? ownRequest.seq : 0}
            />
            <div className="space-y-1">
              <label htmlFor={`${baseId}-expln`} className="text-xs font-medium text-foreground">설명</label>
              <Textarea
                ref={explnRef}
                id={`${baseId}-expln`}
                value={item.menuExpln ?? ''}
                rows={2}
                aria-invalid={errors.menuExpln ? true : undefined}
                aria-describedby={errors.menuExpln ? `${baseId}-expln-error` : undefined}
                onChange={(event) => onEdit({ menuExpln: event.target.value })}
              />
              {errors.menuExpln && <p id={`${baseId}-expln-error`} className="text-xs text-destructive-emphasis">{errors.menuExpln}</p>}
            </div>
            <div className="flex items-center gap-2">
              <input
                id={`${baseId}-use`}
                type="checkbox"
                aria-labelledby={`${baseId}-use-label`}
                className="size-4 accent-primary"
                checked={item.useYn !== 'N'}
                onChange={(event) => onEdit({ useYn: event.target.checked ? 'Y' : 'N' })}
              />
              <label id={`${baseId}-use-label`} htmlFor={`${baseId}-use`} className="text-sm text-foreground">메뉴 사용</label>
              <span className="text-xs text-muted-foreground">끄면 모든 그룹의 사이드바에서 이 메뉴와 하위 메뉴가 숨겨집니다.</span>
            </div>
          </>
        ) : (
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">메뉴 이름</dt>
              <dd className="text-foreground">{menuLabel(draft.items, item.menuNo)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">연결 경로</dt>
              <dd className="break-all text-foreground">{route ?? '연결 없음'}</dd>
              <dd><RouteFacts route={route} /></dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">설명</dt>
              <dd className="whitespace-pre-wrap text-foreground">{item.menuExpln || '등록된 설명이 없습니다.'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">사용 상태</dt>
              <dd className="text-foreground">{item.useYn === 'N' ? '사용 안 함' : '사용'}</dd>
            </div>
          </dl>
        )}
      </section>

      <section aria-labelledby={`${baseId}-groups`} className="space-y-2">
        <h3 id={`${baseId}-groups`} className="text-xs font-semibold text-muted-foreground">보이는 그룹</h3>
        <MenuGroupVisibility
          key={item.menuNo}
          menuNo={item.menuNo}
          name={menuLabel(draft.items, item.menuNo)}
          route={route}
          isNew={isNew}
          deleted={deleted}
          groups={groups}
          draft={draft}
          state={groupState}
          editable={groupsEditable}
          locked={locked}
          onRetry={onRetryGroups}
          onToggle={onToggleNavigation}
          onAddOperations={onAddOperations}
        />
      </section>

      {(isNew ? creatable : deletable) && (
        <section aria-labelledby={`${baseId}-delete`} className="space-y-2">
          <h3 id={`${baseId}-delete`} className="text-xs font-semibold text-muted-foreground">삭제</h3>
          {/*
            삭제·삭제 취소는 같은 자리의 같은 단추다(이름과 동작만 바뀐다) — 단추를 갈아 끼우면 누른 단추가 사라져 포커스가
            문서 밖으로 빠진다.
          */}
          {!deleted && blockingChildren.length > 0 && (
            <p id={deleteReasonId} className="text-xs text-muted-foreground">
              하위 메뉴 {blockingChildren.length.toLocaleString()}개{blockedByDeleted ? '(삭제 예정 포함)' : ''}가 있어 {isNew ? '지울' : '삭제할'} 수 없습니다.
              {' '}{isNew
                ? `하위 메뉴를 먼저 다른 곳으로 옮기세요.${blockedByDeleted ? ' 삭제 예정 하위 메뉴는 삭제를 취소한 뒤 옮기세요.' : ''}`
                : '하위 메뉴를 먼저 옮기거나 삭제하세요.'}
            </p>
          )}
          <Button
            type="button"
            size="sm"
            variant={deleted ? 'outline' : 'destructive'}
            disabled={locked || (!deleted && blockingChildren.length > 0)}
            aria-describedby={!deleted && blockingChildren.length > 0 ? deleteReasonId : undefined}
            onClick={deleted ? onUndelete : isNew ? onRemoveNew : onDelete}
          >
            {deleted ? <Undo2 aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
            {deleted ? '삭제 취소' : isNew ? '새 메뉴 지우기' : '메뉴 삭제'}
          </Button>
          {!deleted && !isNew && <p className="text-xs text-muted-foreground">삭제 예정으로 표시합니다. &lsquo;변경 저장&rsquo;을 눌러야 지워집니다.</p>}
        </section>
      )}
    </div>
  );
}
