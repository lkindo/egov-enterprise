'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { permissionActionLabel, permissionDomainLabel } from '@/lib/auth/permission-labels';
import type { MenuMissingEntryPermission } from '@/lib/auth/navigation-permission-tree';
import { planEntryFixes, type EntryFix, type MatrixOperation } from './operation-permission-matrix-model';

/**
 * 진입 권한 경고와 고치기(2026-10-02, 관리 콘솔 UX 1단계 → 2단계에서 '화면별 권한' 표로 옮김).
 *
 * 메뉴마다 고치는 컨트롤은 표의 '상태' 칸에({@link EntryFixControl}), 전체 안내·'진입 권한 모두 추가'·결과 안내는 표 위에
 * ({@link EntryPermissionSummary}) 둔다. 둘은 {@link useEntryPermissionFixes} 하나의 상태를 나눠 쓴다 — 어느 쪽에서 더해도
 * 결과 안내가 한 곳에 남는다.
 *
 * 버튼은 초안에 기능권한을 더할 뿐 저장하지 않는다 — 기능권한과 메뉴 표시는 같은 '권한 변경 저장'으로 함께 저장된다.
 * 메뉴 표시와 화면 진입은 서로 다른 권한이 판정하므로 이것은 저장을 막는 오류가 아니라 안내다(다른 그룹이 줄 수 있다).
 */
export interface EntryPermissionFixState {
  missing: readonly MenuMissingEntryPermission[];
  fixes: readonly EntryFix[];
  fixByMenu: ReadonlyMap<string, EntryFix>;
  /** 권한 설정 권한이 있고 지금 편집할 수 있는가. 아니면 안내만 보인다. */
  editable: boolean;
  /** 일시 잠금(저장 중 등). */
  disabled: boolean;
  describe: (code: string) => string;
  choiceOf: (fix: Extract<EntryFix, { kind: 'choose' }>) => string;
  choose: (menuCode: string, code: string) => void;
  /**
   * 초안에 더하고, 실제로 새로 더한 코드만 결과 안내에 싣는다(이미 선택된 코드는 추가한 것이 아니다).
   * origin 은 표의 줄(메뉴 번호)에서 더했을 때 그 메뉴다 — 표가 포커스를 그 줄에 둔다. 없으면 결과 문장으로 옮긴다.
   */
  add: (codes: readonly string[], describeResult: (added: readonly string[]) => string, origin?: string) => void;
  /** 지금도 사실인 결과 안내. 아니면 null. */
  notice: string | null;
  /** 결과 안내가 새로 생길 때마다 바뀐다 — 포커스를 옮기는 쪽의 신호다. */
  noticeSequence: number;
  /** 마지막 결과 안내를 만든 줄(메뉴 번호). 표 위의 '모두 추가'처럼 줄 밖에서 더했으면 null. */
  noticeOrigin: string | null;
}

export function useEntryPermissionFixes({ missing, operations, selectedCodes, savedCodes, editable, disabled, onAdd }: {
  missing: readonly MenuMissingEntryPermission[];
  operations: readonly MatrixOperation[];
  /** 지금 초안에 선택된 기능권한 코드. 결과 안내가 아직 사실인지(추가한 권한이 남아 있는지) 판정한다. */
  selectedCodes: ReadonlySet<string>;
  /** 저장된(기준선) 기능권한 코드. 추가한 권한이 모두 저장됐으면 '저장하세요' 안내는 더는 사실이 아니다. */
  savedCodes: ReadonlySet<string>;
  editable: boolean;
  disabled: boolean;
  /** 초안에 기능권한을 더한다. 저장하지 않는다. */
  onAdd: (codes: readonly string[]) => void;
}): EntryPermissionFixState {
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ text: string; codes: readonly string[]; sequence: number; origin: string | null } | null>(null);
  // 결과 안내는 '추가했으니 저장하라'는 말이다 — 편집할 수 없게 됐거나, 추가한 권한을 다시 끄거나, 모두 저장했으면 더는 사실이 아니므로 숨긴다.
  const noticeCurrent = notice !== null && editable
    && notice.codes.every((code) => selectedCodes.has(code))
    && notice.codes.some((code) => !savedCodes.has(code));

  const byCode = useMemo(() => new Map(operations.map((operation) => [operation.code, operation])), [operations]);
  const fixes = useMemo(() => planEntryFixes(missing, new Set(byCode.keys())), [missing, byCode]);
  const fixByMenu = useMemo(() => new Map(fixes.map((fix) => [fix.menu.code, fix])), [fixes]);
  const describe = (code: string) => {
    const operation = byCode.get(code);
    return operation ? `${permissionDomainLabel(operation.domain)} × ${permissionActionLabel(operation.action)} (${code})` : code;
  };
  const add = (codes: readonly string[], describeResult: (added: readonly string[]) => string, origin?: string) => {
    if (disabled || codes.length === 0) return;
    const added = codes.filter((code) => !selectedCodes.has(code));
    onAdd(codes);
    if (added.length === 0) return;
    setNotice((previous) => ({ text: describeResult(added), codes: added, sequence: (previous?.sequence ?? 0) + 1, origin: origin ?? null }));
  };
  return {
    missing, fixes, fixByMenu, editable, disabled, describe, add,
    choiceOf: (fix) => choices[fix.menu.code] ?? fix.preferred,
    choose: (menuCode, code) => setChoices((previous) => ({ ...previous, [menuCode]: code })),
    notice: noticeCurrent ? notice.text : null,
    noticeSequence: notice?.sequence ?? 0,
    noticeOrigin: notice?.origin ?? null,
  };
}

const addedNotice = (menuName: string) => (added: readonly string[]) =>
  `${menuName} 진입 권한(${added.join(', ')})을 추가했습니다. '권한 변경 저장'으로 저장하세요.`;

/** 메뉴 하나를 고치는 컨트롤 — 정해진 권한은 버튼, 후보가 여럿이면 고르는 칸과 버튼, 고칠 수 없으면 이유. */
export function EntryFixControl({ state, fix }: { state: EntryPermissionFixState; fix: EntryFix }) {
  if (fix.kind === 'unfixable') return <span className="text-xs text-muted-foreground">{fix.reason}</span>;
  if (fix.kind === 'auto') {
    return (
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">필요한 권한: {fix.codes.map(state.describe).join(', ')}{fix.menu.mode === 'ALL' && fix.codes.length > 1 ? ' (모두 필요)' : ''}</span>
        {state.editable && <Button type="button" variant="outline" size="sm" disabled={state.disabled}
          onClick={() => state.add(fix.codes, addedNotice(fix.menu.name), fix.menu.code)}>
          {fix.menu.name} 진입 권한 추가
        </Button>}
      </span>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">다음 중 하나가 필요합니다: {fix.candidates.map(state.describe).join(', ')}</span>
      {state.editable && <>
        <select aria-label={`${fix.menu.name} 진입 권한 선택`} className="h-[var(--control-h-sm)] rounded-md border border-input bg-background px-2 text-xs"
          value={state.choiceOf(fix)} disabled={state.disabled}
          onChange={(event) => state.choose(fix.menu.code, event.target.value)}>
          {fix.candidates.map((code) => <option key={code} value={code}>{state.describe(code)}</option>)}
        </select>
        <Button type="button" variant="outline" size="sm" disabled={state.disabled}
          onClick={() => state.add([state.choiceOf(fix)], addedNotice(fix.menu.name), fix.menu.code)}>
          {fix.menu.name} 진입 권한 추가
        </Button>
      </>}
    </span>
  );
}

/**
 * 표 위의 전체 안내 — 진입 권한이 없는 메뉴 수, '진입 권한 모두 추가', 결과 안내. 결과 안내는 늘 있는 알림 영역
 * (aria-live)에 그려 어디서 더했든 읽힌다.
 */
export function EntryPermissionSummary({ state }: { state: EntryPermissionFixState }) {
  const noticeRef = useRef<HTMLParagraphElement>(null);
  // '진입 권한 모두 추가'를 누르면 그 버튼이 사라진다 — 포커스를 바로 옆 결과 문장으로 옮겨 키보드 사용자가 길을 잃지 않게 한다.
  // 표의 줄에서 더했으면 표가 그 줄에 포커스를 둔다(여기서 옮기지 않는다).
  const { noticeSequence, noticeOrigin } = state;
  useEffect(() => { if (noticeSequence > 0 && noticeOrigin === null) noticeRef.current?.focus(); }, [noticeSequence, noticeOrigin]);
  const automatic = state.fixes.filter((fix): fix is Extract<EntryFix, { kind: 'auto' }> => fix.kind === 'auto');
  const choosing = state.fixes.filter((fix) => fix.kind === 'choose');
  return (
    <div className="space-y-2">
      {state.missing.length > 0 && (
        <section aria-label="진입 권한이 없는 메뉴" className="space-y-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
          <p role="status">이 그룹의 기능권한만으로는 들어갈 수 없는 화면의 메뉴가 {state.missing.length}개 있습니다: {state.missing.map((menu) => menu.name).join(', ')}. 다른 그룹이 그 화면의 조회 기능을 주지 않으면 사용자에게 이 메뉴가 보이지 않습니다.{state.editable ? ' 표의 \'상태\' 칸에서 진입 권한을 더하면 \'권한 변경 저장\'으로 함께 저장됩니다.' : ' 필요한 조회 기능을 함께 선택하세요.'}</p>
          {state.editable && automatic.length + choosing.length >= 2 && automatic.length > 0 && <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" disabled={state.disabled}
              onClick={() => state.add([...new Set(automatic.flatMap((fix) => fix.codes))], () => `메뉴 ${automatic.length}개의 진입 권한을 추가했습니다. '권한 변경 저장'으로 저장하세요.`)}>
              진입 권한 모두 추가
            </Button>
            {choosing.length > 0 && <span className="text-muted-foreground">후보가 여럿인 메뉴 {choosing.length}개는 모두 추가에서 빠집니다. 각 메뉴에서 권한을 골라 추가하세요.</span>}
          </div>}
        </section>
      )}
      <div aria-live="polite">
        {state.notice && <p ref={noticeRef} tabIndex={-1} className="text-sm text-muted-foreground">{state.notice}</p>}
      </div>
    </div>
  );
}
