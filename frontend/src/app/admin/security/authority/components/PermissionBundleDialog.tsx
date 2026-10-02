'use client';

import { useId, useMemo, useState } from 'react';
import type { AuthorizationCatalog } from '@/lib/auth/authorization-management-contract';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { Button } from '@/components/ui/button';
import type { PermissionBundle } from '@/types/generated-screen-registry';
import { previewBundle, type BundlePreview, type BundleScreen } from './permission-bundle-model';

type Navigation = AuthorizationCatalog['navigation'][number];

/** 고정 안내 — 묶음은 진입 권한이 빈 화면의 메뉴를 더하지 않는다(결정 위임 2026-10-02, 선택지 ②). */
export const OPEN_SCREEN_NOTICE = '모든 로그인 사용자가 들어갈 수 있는 화면(예: 쪽지함·일정)의 메뉴는 묶음이 더하지 않습니다. 필요하면 화면별 권한 탭에서 메뉴 표시를 고르세요.';
export const PROTECTED_BUNDLE_NOTICE = '보호 권한을 새로 더하는 저장에는 권한 설정과 권한 배정 권한이 모두 필요합니다.';
export const ALL_PRESENT_REASON = '이 묶음의 기능권한과 메뉴 표시가 이미 모두 이 그룹에 있습니다.';

/**
 * 더할 것이 없을 때의 이유. '이미 모두 있음'은 더하지 못한 것이 하나도 없을 때만 쓴다 — 현재 기능 목록에 없는 권한, 사용 안 함
 * 상위 메뉴에 가린 메뉴, 확인하지 못한 메뉴 계층이 남으면 그 사실을 말한다(있지도 않은 메뉴 표시를 '이미 있다'고 하지 않게).
 */
export function nothingToAddReason(preview: BundlePreview): string {
  const withheld = [
    preview.operationsUnknown.length > 0 ? '현재 기능 목록에 없는 권한' : null,
    preview.blockedMenus.length > 0 ? '사용 안 함 상위 메뉴에 가린 메뉴' : null,
    preview.navigationError ? '확인하지 못한 메뉴 계층의 메뉴 표시' : null,
  ].filter((part): part is string => part !== null);
  if (withheld.length === 0) return ALL_PRESENT_REASON;
  return `더할 수 있는 항목이 없습니다. 묶음이 더하지 않는 항목이 있습니다: ${withheld.join(', ')}.`;
}

/** 묶음 화면 한 줄의 메뉴 설명 — 메뉴가 없다는 말은 사용 안 함 상위에 가린 메뉴도 없을 때만 한다. */
function screenMenuNote(screen: BundleScreen): string {
  if (screen.menus.length > 0) return `메뉴: ${screen.menus.map((menu) => menu.name).join(', ')}`;
  if (screen.blockedMenus.length > 0) {
    return screen.blockedMenus.map((menu) => `메뉴 '${menu.name}'가 사용 안 함 상위 메뉴 '${menu.unusedAncestor.name}' 아래에 있어 표시되지 않습니다`).join('. ');
  }
  return screen.dynamic ? '목록에서 항목을 골라 여는 화면이라 메뉴가 없습니다' : '이 화면을 여는 사용 중 메뉴가 없어 주소로만 열립니다';
}

/**
 * '권한 묶음 적용' 대화상자(2026-10-02, 관리 콘솔 UX 3단계 G2). 묶음을 하나 고르면 지금 초안에 무엇이 늘어나는지 미리 보이고,
 * '선택한 묶음을 초안에 추가'가 초안에만 더한다 — 저장은 편집기의 '권한 변경 저장'이다(쓰기 없음).
 *
 * 입력 칸 없이 라디오로 묶음만 고르므로 폼이 아니다 — 닫아도 잃는 입력이 없어 미저장 닫기 확인을 두지 않는다.
 */
export function PermissionBundleDialog({ groupName, bundles, selection, saved, navigation, operationCodes, canAssign, locked = false, onAddToDraft, onClose }: {
  groupName: string;
  bundles: readonly PermissionBundle[];
  /** 지금 초안의 선택(`OPERATION:<code>`·`NAVIGATION:<menu>`). */
  selection: ReadonlySet<string>;
  /** 저장된 기준선의 선택 — 보호 권한 경고는 서버처럼 저장본과 비교한다. */
  saved: ReadonlySet<string>;
  navigation: readonly Navigation[];
  /** 현재 기능 목록의 코드. */
  operationCodes: readonly string[];
  /** 보는 사람에게 권한 배정 권한(AUTHRT_ASSIGN)이 있는가 — 없으면 보호 권한을 더한 초안은 저장할 수 없다고 미리 알린다. */
  canAssign: boolean;
  /** 편집기가 잠겨 있다(저장 중·다시 읽는 중) — 더하기를 막고 이유를 말한다. */
  locked?: boolean;
  onAddToDraft: (bundle: PermissionBundle) => void;
  onClose: () => void;
}) {
  const id = useId();
  const [chosenId, setChosenId] = useState<string | null>(null);
  const chosen = bundles.find((bundle) => bundle.id === chosenId) ?? null;
  const preview = useMemo(() => (chosen ? previewBundle(chosen, selection, navigation, operationCodes, saved) : null), [chosen, selection, navigation, operationCodes, saved]);
  const nothingToAdd = !!preview && preview.operationsToAdd.length === 0 && preview.navigationToAdd.length === 0;
  const reasonId = `${id}-reason`;
  const lockedId = `${id}-locked`;
  const blocked = !chosen || nothingToAdd || locked;
  const describedBy = [!chosen || nothingToAdd ? reasonId : null, locked ? lockedId : null].filter(Boolean).join(' ') || undefined;

  return (
    <StandardModal isOpen onClose={onClose} title="권한 묶음 적용" maxWidth="3xl"
      footer={<>
        <Button type="button" variant="outline" onClick={onClose}>묶음 적용 취소</Button>
        <Button type="button" disabled={blocked} aria-describedby={describedBy}
          onClick={() => { if (chosen && !blocked) onAddToDraft(chosen); }}>선택한 묶음을 초안에 추가</Button>
      </>}>
      <div className="space-y-4">
        <p className="text-sm">대상 그룹: <strong>{groupName}</strong></p>
        {locked && <p id={lockedId} role="status" className="text-sm text-muted-foreground">저장 중이거나 그룹 정보를 다시 읽는 중이라 지금은 더할 수 없습니다. 잠시 뒤 다시 시도하세요.</p>}
        <p className="text-sm text-muted-foreground">묶음은 체크를 대신할 뿐입니다. 고른 묶음의 기능권한과 메뉴 표시를 이 그룹의 저장하지 않은 변경에 더하고, &apos;권한 변경 저장&apos;을 눌러야 반영됩니다. 묶음으로 빼지는 않습니다 — 회수는 표에서 하세요.</p>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold">권한 묶음</legend>
          <ul className="space-y-2">
            {bundles.map((bundle) => {
              const nameId = `${id}-${bundle.id}-name`;
              const descriptionId = `${id}-${bundle.id}-description`;
              return (
                <li key={bundle.id}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <input type="radio" name={`${id}-bundle`} value={bundle.id} checked={chosenId === bundle.id} onChange={() => setChosenId(bundle.id)}
                      aria-labelledby={nameId} aria-describedby={descriptionId} className="mt-1 size-4 shrink-0 accent-primary" />
                    <span className="min-w-0 space-y-1">
                      <span id={nameId} className="flex flex-wrap items-center gap-2 font-medium">{bundle.name}
                        {bundle.protected && <>{' '}<span className="rounded border border-warning/40 bg-warning/10 px-1 text-xs font-normal text-foreground">보호 권한 포함</span></>}
                      </span>
                      <span id={descriptionId} className="block text-sm text-muted-foreground">{bundle.description} · 기능권한 {bundle.permissions.length}개 · 여는 화면 {bundle.screens.length}개</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
        <section aria-label="묶음 미리보기" className="space-y-2 rounded-md border border-border p-3 text-sm">
          {/* 라디오를 화살표로 옮길 때마다 바뀌는 것은 요약 한 줄과 더할 것이 없다는 이유뿐이다 — 알림은 그것만 읽는다. 화면 목록·안내는
              알림 밖에 두어 사용자가 필요할 때 Tab·가상 커서로 읽는다. */}
          <div aria-live="polite" aria-atomic="true" className="space-y-2">
            {!preview ? <p id={reasonId} className="text-muted-foreground">묶음을 고르면 이 그룹에 더해지는 권한과 메뉴를 미리 보입니다.</p> : <>
              <p className="font-medium">기능권한 추가 {preview.operationsToAdd.length}개(이미 있음 {preview.operationsPresent.length}개) · 메뉴 표시 추가 {preview.navigationToAdd.length}개</p>
              {nothingToAdd && <p id={reasonId}>{nothingToAddReason(preview)}</p>}
            </>}
          </div>
          {preview && <>
            {preview.operationsUnknown.length > 0 && <p className="text-muted-foreground">현재 기능 목록에 없는 권한 {preview.operationsUnknown.length}개({preview.operationsUnknown.join(', ')})는 더하지 않습니다. 다시 조회해 주세요.</p>}
            {preview.navigationError && <p role="alert" className="text-destructive">{preview.navigationError} 메뉴 표시는 더하지 않습니다.</p>}
            <div>
              <p className="font-medium">묶음이 여는 화면 {preview.screens.length}개</p>
              <ul className="list-disc space-y-1 pl-5">
                {preview.screens.map((screen) => (
                  <li key={screen.route}>{screen.label}
                    <span className="text-muted-foreground"> — {screenMenuNote(screen)}</span>
                  </li>
                ))}
              </ul>
            </div>
            {preview.blockedMenus.length > 0 && <div>
              <p className="font-medium">사용 안 함 상위 메뉴 때문에 표시하지 않는 메뉴</p>
              <ul className="list-disc space-y-1 pl-5">
                {preview.blockedMenus.map((menu) => <li key={menu.code}>{menu.name} <span className="text-muted-foreground">(상위 메뉴 &apos;{menu.unusedAncestor.name}&apos; 사용 안 함)</span></li>)}
              </ul>
            </div>}
            <p className="text-muted-foreground">{OPEN_SCREEN_NOTICE}</p>
            {chosen?.protected && <p>{PROTECTED_BUNDLE_NOTICE}</p>}
            {preview.protectedToAdd.length > 0 && !canAssign && <p role="alert" className="text-destructive">지금 계정에는 권한 배정 권한이 없어, 보호 권한({preview.protectedToAdd.join(', ')})을 더한 변경은 저장할 수 없습니다.</p>}
          </>}
        </section>
      </div>
    </StandardModal>
  );
}
