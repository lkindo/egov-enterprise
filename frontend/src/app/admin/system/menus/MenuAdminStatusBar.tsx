'use client';

import { Button } from '@/components/ui/button';

/**
 * 보드 아래 상태 줄 — 결과 안내(aria-live)·찾기 일치 수·미리보기 요약·잘라 낸 메뉴·도움말(2026-10-18 화면 분해 때
 * MenuAdminClient 에서 옮겼다 — 마크업·문구 그대로).
 *
 * <p>[2026-10-05 2차 리뷰] 종전에는 탭 줄 아래(보드 위)에 두 줄 높이를 잡아 두었는데, 좁은 창에서 안내가 서너 줄이 되면 보드가
 * 16~36px 씩 오르내렸다. 이제 fill 조건에서 보드 스크롤 밖 맨 아래에 있어, 안내가 길어져도 보드의 위쪽(첫 줄 자리)은 그대로이고
 * 보드가 아래에서 조금 줄어들 뿐이다.
 */
export function MenuAdminStatusBar({
  announcement,
  searching,
  matchCount,
  previewCounts,
  previewGroupName,
  cutMenuName,
  onCancelCut,
  canUpdate,
}: {
  announcement: { text: string; seq: number };
  searching: boolean;
  matchCount: number;
  previewCounts: { shown: number; hidden: number } | null;
  previewGroupName: string | undefined;
  /** 잘라 낸 메뉴의 이름(없으면 null). */
  cutMenuName: string | null;
  onCancelCut: () => void;
  canUpdate: boolean;
}) {
  return (
    <div className="flex flex-wrap items-start gap-x-3 gap-y-1 border-t border-border pt-1.5 text-xs" data-menu-status="">
      <p aria-live="polite" className="min-w-[10rem] flex-1 text-muted-foreground">
        {announcement.text && <span key={announcement.seq}>{announcement.text}</span>}
      </p>
      {searching && (
        <span data-search-count="" className="shrink-0 font-semibold text-foreground">일치 {matchCount.toLocaleString()}개</span>
      )}
      {previewCounts && previewGroupName && (
        <span className="shrink-0 text-muted-foreground">
          <span aria-hidden="true">{`${previewGroupName} · 보임 ${previewCounts.shown.toLocaleString()} · 숨김 ${previewCounts.hidden.toLocaleString()}`}</span>
          <span className="sr-only">
            {`${previewGroupName} 그룹 미리보기 — 저장 전 초안 기준 보이는 메뉴 ${previewCounts.shown.toLocaleString()}개, 숨는 메뉴 ${previewCounts.hidden.toLocaleString()}개(숨는 메뉴는 흐리게 표시하고 이유를 붙였습니다).`}
          </span>
        </span>
      )}
      {cutMenuName !== null && (
        <span data-cut-chip="" className="inline-flex max-w-full shrink-0 items-center gap-1 rounded-md border border-dashed border-primary pl-2">
          <span className="min-w-0 truncate">잘라 낸 메뉴: <span className="font-semibold">{cutMenuName}</span></span>
          <Button type="button" size="xs" variant="ghost" onClick={onCancelCut}>잘라내기 취소</Button>
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
}
