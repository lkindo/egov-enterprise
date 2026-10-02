'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PROTECTED_PERMISSIONS } from '@/types/generated-screen-registry';
import type { EntryFix } from '@/app/admin/security/authority/components/operation-permission-matrix-model';
import { describeRoute, entryFixFor, permissionText } from './menuScreens';
import { groupGrants, menuRef, navigationKey, type MenuDraft, type MenuGroup } from './menuDraft';

export type GroupMatrixState = 'no-permission' | 'loading' | 'error' | 'ready';

/**
 * [2026-10-02 D1·D2] 고른 메뉴를 어느 그룹이 보는가 — 그룹마다 '메뉴 표시' 체크(AUTHRT_GRANT). 하위를 켜면 상위를 명시적으로
 * 함께 켜고, 상위를 끄면 하위도 끈다(권한 편집기의 메뉴 표시 규칙과 같다). 메뉴 표시가 있는데 그 그룹의 기능권한으로 화면에
 * 들어갈 수 없으면 '{그룹} 진입 권한 추가'(1단계와 같은 ANY/ALL 처리)를 둔다. 모두 초안에만 반영되고 '변경 저장' 으로 저장된다.
 * 메뉴 표시와 기능권한은 다른 권한이다(H3) — 메뉴 표시를 켜도 기능권한은 생기지 않는다.
 *
 * 후보 선택(choices)은 그 메뉴의 것이다 — 부르는 쪽이 메뉴마다 key 를 바꿔 새로 그린다. 그래도 고른 값이 지금 후보에 없으면
 * (같은 메뉴의 연결 화면을 바꾼 경우) 고른 값을 버리고 기본 후보를 쓴다 — 화면에 보이는 후보와 다른 권한을 넣지 않는다(H3).
 */
export function MenuGroupVisibility({
  menuNo,
  name,
  route,
  isNew,
  deleted,
  groups,
  draft,
  state,
  editable,
  locked,
  onRetry,
  onToggle,
  onAddOperations,
}: {
  menuNo: number;
  name: string;
  route: string | null;
  isNew: boolean;
  deleted: boolean;
  groups: readonly MenuGroup[];
  draft: MenuDraft;
  state: GroupMatrixState;
  /** 메뉴 표시를 바꿀 수 있는가(AUTHRT_GRANT·MENU_UPDATE). */
  editable: boolean;
  locked: boolean;
  onRetry: () => void;
  onToggle: (groupCode: string, checked: boolean) => void;
  onAddOperations: (groupCode: string, codes: readonly string[]) => void;
}) {
  const baseId = useId();
  const [choices, setChoices] = useState<Record<string, string>>({});
  /*
    '{그룹} 진입 권한 추가' 를 누르면 그 단추가 사라진다(진입 권한이 생겼다). 포커스가 문서 밖으로 빠지지 않게 같은 그룹의
    '메뉴 표시' 체크로 옮긴다.
  */
  const focusAfterAddRef = useRef<string | null>(null);
  useEffect(() => {
    const code = focusAfterAddRef.current;
    if (code === null) return;
    focusAfterAddRef.current = null;
    const active = document.activeElement;
    if (active && active !== document.body && active.isConnected) return;
    document.getElementById(`${baseId}-${code}`)?.focus();
  });
  const described = describeRoute(route);
  const screen = described.kind === 'screen' ? described.screen : null;

  if (state === 'no-permission') {
    return <p className="text-sm text-muted-foreground">권한 조회 권한이 없습니다. 이 메뉴를 어느 그룹이 보는지 확인하려면 권한 그룹 조회 권한이 필요합니다.</p>;
  }
  if (state === 'loading') return <p className="text-sm text-muted-foreground">그룹 권한을 불러오는 중…</p>;
  if (state === 'error') {
    return (
      <div role="alert" className="space-y-2 text-sm">
        <p className="text-destructive-emphasis">그룹 권한을 불러오지 못했습니다.</p>
        <Button type="button" size="sm" variant="outline" onClick={onRetry}>그룹 권한 다시 불러오기</Button>
      </div>
    );
  }

  const fixText = (fix: EntryFix): string => {
    if (fix.kind === 'unfixable') return fix.reason;
    if (fix.kind === 'auto') return `필요한 권한: ${fix.codes.map((code) => permissionText(code, screen)).join(', ')}${fix.menu.mode === 'ALL' && fix.codes.length > 1 ? ' (모두 필요)' : ''}`;
    return `다음 중 하나가 필요합니다: ${fix.candidates.map((code) => permissionText(code, screen)).join(', ')}`;
  };

  return (
    <div className="space-y-2">
      {isNew && (
        <p className="text-xs text-muted-foreground">
          새 메뉴는 저장 전에는 어느 그룹에도 보이지 않습니다. 저장하면 관리자 그룹(ROLE_ADMIN)에는 상위 메뉴가 모두 보이는 경우 자동으로
          표시됩니다. 다른 그룹은 여기서 &lsquo;메뉴 표시&rsquo;를 켜세요.
        </p>
      )}
      {deleted && <p className="text-xs text-muted-foreground">삭제 예정 메뉴의 표시는 바꿀 수 없습니다. 저장하면 모든 그룹에서 이 메뉴의 표시가 함께 지워집니다.</p>}
      {!editable && !deleted && (
        <p className="text-xs text-muted-foreground">메뉴 표시를 바꾸려면 메뉴 수정 권한과 권한 설정 권한이 모두 필요합니다.</p>
      )}
      <ul className="space-y-1">
        {groups.map((group) => {
          const grants = groupGrants(draft, group);
          const checked = grants.has(navigationKey(menuNo));
          const changed = checked !== group.grants.has(navigationKey(menuNo));
          const operations = [...grants].filter((key) => key.startsWith('OPERATION:')).map((key) => key.slice('OPERATION:'.length));
          const fix = checked && !deleted ? entryFixFor({ code: menuRef(menuNo), name, route }, operations) : null;
          const checkboxId = `${baseId}-${group.code}`;
          const anonymous = group.code === 'ROLE_ANONYMOUS';
          const protectedFix = fix !== null && fix.kind !== 'unfixable'
            && (fix.kind === 'auto' ? fix.codes : fix.candidates).some((code) => (PROTECTED_PERMISSIONS as readonly string[]).includes(code));
          const chosen = choices[group.code];
          const choice = fix?.kind === 'choose' ? (chosen !== undefined && fix.candidates.includes(chosen) ? chosen : fix.preferred) : null;
          const codesToAdd = fix?.kind === 'auto' ? fix.codes : choice !== null ? [choice] : [];
          return (
            <li key={group.code} className="space-y-1 rounded-md border border-border px-2 py-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  id={checkboxId}
                  type="checkbox"
                  aria-labelledby={`${checkboxId}-label`}
                  className="size-4 accent-primary"
                  checked={checked}
                  disabled={!editable || deleted || locked}
                  onChange={(event) => onToggle(group.code, event.target.checked)}
                />
                <label id={`${checkboxId}-label`} htmlFor={checkboxId} className="text-sm text-foreground">
                  {group.name} 메뉴 표시<span className="ml-1 text-xs text-muted-foreground">({group.code})</span>
                </label>
                {changed && (
                  <span className="rounded bg-primary/10 px-1.5 text-xs font-semibold text-primary">
                    <span className="sr-only">저장 전 </span>{checked ? '표시 켬' : '표시 끔'}
                  </span>
                )}
              </div>
              {fix && (
                <div className="flex flex-wrap items-center gap-2 pl-6 text-xs">
                  <span className="text-warning-emphasis">진입 권한 없음 — {fixText(fix)}</span>
                  {editable && !locked && fix.kind !== 'unfixable' && (anonymous
                    ? <span className="text-muted-foreground">공개 메뉴용 그룹에는 기능 권한을 줄 수 없습니다.</span>
                    : protectedFix
                      ? <span className="text-muted-foreground">보호 권한이 들어 있어 권한 그룹 화면에서 추가하세요.</span>
                      : (
                        <>
                          {fix.kind === 'choose' && (
                            <select
                              aria-label={`${group.name} 진입 권한 선택`}
                              className="h-[var(--control-h-sm)] rounded-md border border-input bg-background px-2"
                              value={choice ?? ''}
                              onChange={(event) => setChoices((previous) => ({ ...previous, [group.code]: event.target.value }))}
                            >
                              {fix.candidates.map((code) => <option key={code} value={code}>{permissionText(code, screen)}</option>)}
                            </select>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              focusAfterAddRef.current = group.code;
                              onAddOperations(group.code, codesToAdd);
                            }}
                          >
                            {group.name} 진입 권한 추가
                          </Button>
                        </>
                      ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {groups.length === 0 && <p className="text-sm text-muted-foreground">권한 그룹이 없습니다.</p>}
    </div>
  );
}
