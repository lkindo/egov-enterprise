'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { permissionActionLabel, permissionDomainLabel } from '@/lib/auth/permission-labels';
import type { MenuMissingEntryPermission } from '@/lib/auth/navigation-permission-tree';
import { isBulkEntryFix, planEntryFixes, type EntryFix, type MatrixOperation } from './operation-permission-matrix-model';

/**
 * 진입 권한 경고와 고치기(2026-10-02, 관리 콘솔 UX 1단계 → 2단계에서 '화면별 권한' 표로 옮김).
 *
 * 메뉴마다 고치는 컨트롤은 표의 '상태' 칸에({@link EntryFixControl}), 전체 안내·'진입 권한 모두 추가'·결과 안내는 표 위에
 * ({@link EntryPermissionSummary}) 둔다. 둘은 {@link useEntryPermissionFixes} 하나의 상태를 나눠 쓴다 — 어느 쪽에서 더해도
 * 결과 안내가 한 곳에 남는다.
 *
 * 버튼은 초안에 기능권한을 더할 뿐 저장하지 않는다 — 기능권한과 메뉴 표시는 같은 '권한 변경 저장'으로 함께 저장된다.
 * 메뉴 표시와 화면 진입은 서로 다른 권한이 판정하므로 이것은 저장을 막는 오류가 아니라 안내다(다른 그룹이 줄 수 있다).
 *
 * [2026-10-05 한 화면 압축] 상태 칸을 한 줄로 줄였다. 종전에는 '필요한 권한: …' 문장, 후보 고르는 select, '{메뉴} 진입 권한 추가'
 * 버튼이 세로로 쌓여 문제 줄이 100px 를 넘었다. 이제 짧은 버튼 하나다. 더할 권한이 정해져 있으면 버튼의 보이는 글자가 '+ 권한 이름'
 * 이다 — 누르기 전에 무엇이 더해지는지 마우스·키보드·터치 모두 글자로 본다(헌법 제16조 3항, 반박 리뷰 반영: 종전 '권한 추가'는 더할
 * 권한을 title·설명에만 두었다). 접근 이름은 메뉴 이름과 같은 권한 이름을 싣고(보이는 글자를 포함한다, WCAG 2.5.3), 코드까지 담은
 * '필요한 권한' 문장은 설명(aria-describedby)과 title 이다. 후보가 여럿이면 '권한 추가'가 고르는 창(팝오버)을 열고, 창 안의 후보가
 * 권한 이름을 글자로 보인다.
 *
 * 여러 메뉴를 한 번에 고치는 '진입 권한 모두 추가'(과 표의 섹션 줄 '진입 권한 추가')는 보호 권한·타인 자료 권한(…_ALL)이 필요한
 * 메뉴를 빼고 화면 줄에서 고르게 한다(isBulkEntryFix, H3 — 묶음 칸과 같은 제외 규칙).
 */
export interface EntryPermissionFixState {
  missing: readonly MenuMissingEntryPermission[];
  fixes: readonly EntryFix[];
  fixByMenu: ReadonlyMap<string, EntryFix>;
  /** 권한 설정 권한이 있고 지금 편집할 수 있는가. 아니면 안내만 보인다. */
  editable: boolean;
  /** 일시 잠금(저장 중 등). */
  disabled: boolean;
  /** 권한 코드 → '영역 × 행위 (코드)'. */
  describe: (code: string) => string;
  /** 권한 코드 → 권한 이름(목록에 없으면 코드). 버튼의 접근 이름에 쓴다. */
  nameOf: (code: string) => string;
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
    nameOf: (code) => byCode.get(code)?.name ?? code,
    notice: noticeCurrent ? notice.text : null,
    noticeSequence: notice?.sequence ?? 0,
    noticeOrigin: notice?.origin ?? null,
  };
}

const addedNotice = (menuName: string) => (added: readonly string[]) =>
  `${menuName} 진입 권한(${added.join(', ')})을 추가했습니다. '권한 변경 저장'으로 저장하세요.`;

/**
 * 메뉴 하나를 고치는 컨트롤 — 상태 칸 한 줄에 놓인다.
 *  · auto: '+ 권한 이름' 버튼 하나(정해진 권한을 더한다). 이 화면 하나를 명시적으로 고치는 동작이라 타인 자료 권한도 더한다.
 *  · choose: '권한 추가' 버튼이 후보를 고르는 창을 연다 — 조회(*_READ)를 '권장'으로 먼저 보이되 사람이 고른다.
 *  · unfixable: 고칠 수 없는 이유를 글자로 보인다(드문 경우라 줄바꿈을 허용한다).
 */
export function EntryFixControl({ state, fix }: { state: EntryPermissionFixState; fix: EntryFix }) {
  const requiredId = useId();
  const [open, setOpen] = useState(false);
  if (fix.kind === 'unfixable') return <span className="inline-block max-w-[16rem] whitespace-normal text-xs text-muted-foreground">{fix.reason}</span>;
  // 권한 설정 권한이 없으면 고치는 버튼 대신 무엇이 필요한지만 짧게 글자로 보인다(코드까지 담은 문장은 title·설명).
  if (!state.editable) {
    const codes = fix.kind === 'auto' ? fix.codes : fix.candidates;
    const required = fix.kind === 'auto' ? `필요한 권한: ${codes.map(state.describe).join(', ')}` : `다음 중 하나가 필요합니다: ${codes.map(state.describe).join(', ')}`;
    return <span className="text-xs text-muted-foreground" title={required}>필요: {codes.map(state.nameOf).join(fix.kind === 'auto' ? ', ' : ' 또는 ')}</span>;
  }
  if (fix.kind === 'auto') {
    const required = `필요한 권한: ${fix.codes.map(state.describe).join(', ')}${fix.menu.mode === 'ALL' && fix.codes.length > 1 ? ' (모두 필요)' : ''}`;
    const names = fix.codes.map(state.nameOf).join(', ');
    return (
      <>
        <Button type="button" variant="outline" size="xs" disabled={state.disabled} title={required} aria-describedby={requiredId}
          aria-label={`${fix.menu.name} 진입 권한 추가: ${names}`}
          onClick={() => state.add(fix.codes, addedNotice(fix.menu.name), fix.menu.code)}>
          <Plus aria-hidden="true" />{names}
        </Button>
        <span id={requiredId} className="sr-only">{required}</span>
      </>
    );
  }
  const required = `다음 중 하나가 필요합니다: ${fix.candidates.map(state.describe).join(', ')}`;
  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="xs" disabled={state.disabled} title={required} aria-describedby={requiredId}
            aria-label={`${fix.menu.name} 진입 권한 추가: 후보 ${fix.candidates.length}개 중 고르기`}>
            <Plus aria-hidden="true" />권한 추가
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 space-y-2 p-3" aria-label={`${fix.menu.name} 진입 권한 고르기`}>
          <p className="text-xs text-muted-foreground">하나만 있으면 {fix.menu.name} 화면에 들어갈 수 있습니다. 더할 권한을 고르세요.</p>
          <ul className="space-y-1">
            {fix.candidates.map((code) => (
              <li key={code}>
                <Button type="button" variant="ghost" size="sm" className="h-auto w-full justify-start whitespace-normal py-1 text-left"
                  disabled={state.disabled}
                  onClick={() => { setOpen(false); state.add([code], addedNotice(fix.menu.name), fix.menu.code); }}>
                  {state.describe(code)}{code === fix.preferred ? ' · 권장' : ''}
                </Button>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>
      <span id={requiredId} className="sr-only">{required}</span>
    </>
  );
}

/** 이름 목록 — 처음 셋만 보이고 나머지는 수로 말한다(나머지는 표의 '문제 줄만'으로 모두 보인다). */
function namesPreview(names: readonly string[]): string {
  return names.length <= 3 ? names.join(', ') : `${names.slice(0, 3).join(', ')} 외 ${names.length - 3}개`;
}

/**
 * 표 위의 전체 안내 — 진입 권한이 없는 메뉴가 있을 때만 보이는 한 줄 띠(2026-10-05 압축, 종전 여러 줄 상자).
 * 진입 권한이 없는 메뉴 수와 처음 몇 이름, '진입 권한 모두 추가', 결과 안내. 결과 안내는 늘 있는 알림 영역(aria-live)에 그려
 * 어디서 더했든 읽힌다. 메뉴 전체 목록은 표의 '문제 줄만'이 보인다. 왜 그런지는 표의 '이 표 읽는 법'이 설명한다.
 */
export function EntryPermissionSummary({ state }: { state: EntryPermissionFixState }) {
  const noticeRef = useRef<HTMLParagraphElement>(null);
  // '진입 권한 모두 추가'를 누르면 그 버튼이 사라진다 — 포커스를 바로 옆 결과 문장으로 옮겨 키보드 사용자가 길을 잃지 않게 한다.
  // 표의 줄에서 더했으면 표가 그 줄에 포커스를 둔다(여기서 옮기지 않는다).
  const { noticeSequence, noticeOrigin } = state;
  useEffect(() => { if (noticeSequence > 0 && noticeOrigin === null) noticeRef.current?.focus(); }, [noticeSequence, noticeOrigin]);
  // 일괄로 더할 수 있는 메뉴(정해진 권한, 보호·타인 자료 권한 없음)와 화면 줄에서 직접 골라야 하는 메뉴(후보가 여럿이거나 보호·
  // 타인 자료 권한이 필요). 섹션 줄의 '진입 권한 추가'와 같은 규칙이다(isBulkEntryFix, H3).
  const automatic = state.fixes.filter(isBulkEntryFix);
  const manual = state.fixes.filter((fix) => fix.kind !== 'unfixable' && !isBulkEntryFix(fix));
  return (
    <div className="space-y-1">
      {state.missing.length > 0 && (
        <section aria-label="진입 권한이 없는 메뉴" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-warning/40 bg-warning/10 px-3 py-1.5 text-sm">
          <p role="status" className="min-w-0">이 그룹의 기능권한만으로는 들어갈 수 없는 화면의 메뉴가 {state.missing.length}개 있습니다: {namesPreview(state.missing.map((menu) => menu.name))}.</p>
          {state.editable && automatic.length + manual.length >= 2 && automatic.length > 0 && <>
            <Button type="button" size="xs" disabled={state.disabled}
              onClick={() => state.add([...new Set(automatic.flatMap((fix) => fix.codes))], () => `메뉴 ${automatic.length}개의 진입 권한을 추가했습니다. '권한 변경 저장'으로 저장하세요.`)}>
              진입 권한 모두 추가
            </Button>
            {manual.length > 0 && <span className="text-xs text-muted-foreground">후보가 여럿이거나 보호·타인 자료 권한이 필요한 메뉴 {manual.length}개는 모두 추가에서 빠집니다 — 화면 줄에서 고르세요.</span>}
          </>}
        </section>
      )}
      <div aria-live="polite">
        {state.notice && <p ref={noticeRef} tabIndex={-1} className="text-sm text-muted-foreground">{state.notice}</p>}
      </div>
    </div>
  );
}
