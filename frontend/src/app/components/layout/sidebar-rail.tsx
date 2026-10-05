'use client';

import { PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { expandSidebarAndFocusCollapse } from '@/lib/layout/use-sidebar-collapsed';
import {
  SIDEBAR_EXPAND_LABEL,
  SIDEBAR_EXPAND_VISIBLE_TEXT,
  SIDEBAR_RAIL_EXPAND_BUTTON_ID,
} from '@/lib/layout/sidebar-collapse-script';

/**
 * 접힘 막대(2026-10-05 DEC-OPS-227). 넓은 화면(lg 이상)에서 사이드바를 접으면 사이드바 자리에 이 좁은 막대가 남아
 * '사이드바 펼치기' 단추를 보인다 — 접은 뒤 되돌리는 길이 머리글의 작은 아이콘 하나뿐이면 사용자가 기능 자체를 찾지
 * 못한다(사용자 보고).
 *
 * 보이고 숨는 일은 전부 CSS 다. 기본은 `hidden` 이고, globals.css 가 `<html data-sidebar-collapsed>` 이면서 lg 이상일 때만
 * 이 표지(`data-app-sidebar-rail`)를 보인다 — 서버·클라이언트가 같은 DOM 을 그리고 뷰포트를 재지 않는다(ADR-0006).
 * 펼친 상태·lg 미만에서는 display:none 이라 탭 순서·접근성 트리에 없다. 인쇄에서도 숨는다 — 같은 접힘 블록 안의 인쇄 규칙이
 * 막대와 그 여백을 함께 거둔다(globals.css, 한 곳).
 *
 * 레이아웃이 사이드바의 Suspense 밖에 둔다 — 메뉴를 읽는 동안에도 펼치기 단추가 있다. 사이드바의 접힌 모습이라 같은 종류의
 * 랜드마크(aside)로 두며, 둘 중 하나만 보이므로 접근성 트리에는 늘 하나만 있다. 이름은 메뉴가 없는 영역을 '메뉴'라 부르지
 * 않도록 '접힌 사이드바'다 — 안의 단추('사이드바 펼치기')와 같은 말이다.
 *
 * 단추는 아이콘 아래에 '펼치기'를 글자로 보인다 — 아이콘만 두면 머리글 아이콘과 같이 찾기 어렵다(사용자 보고). 막대 폭(48px)에
 * '사이드바'까지는 들어가지 않으므로 접근 이름은 aria-label '사이드바 펼치기'로 두고, 보이는 글자 '펼치기'가 그 안에 든다(2.5.3).
 * 숨긴 글자로 '사이드바 '를 앞에 붙이는 방법은 쓰지 않는다 — 이름 계산이 조각 사이 공백을 지워 '사이드바펼치기'가 된다(jsdom 실측).
 * 글자가 보이므로 title 툴팁은 두지 않는다.
 *
 * 단추는 접힌 상태에서만 보이므로 aria-expanded 는 늘 false 다 — 상태 훅을 읽지 않아 하이드레이션 전에도 맞다.
 */
export function SidebarRail() {
  return (
    <aside
      data-app-sidebar-rail=""
      aria-label="접힌 사이드바"
      className="fixed left-0 top-[var(--app-header-height)] z-30 hidden h-[calc(100dvh-var(--app-header-height))] w-[var(--app-sidebar-rail-width)] flex-col items-center border-r bg-card py-3"
    >
      <Button
        id={SIDEBAR_RAIL_EXPAND_BUTTON_ID}
        type="button"
        variant="ghost"
        onClick={expandSidebarAndFocusCollapse}
        aria-label={SIDEBAR_EXPAND_LABEL}
        aria-expanded={false}
        aria-controls="primary-sidebar"
        className="h-auto w-11 px-0.5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        {/* 아이콘과 글자를 세로로 쌓는 일은 안쪽 span 이 한다 — 단추 자신에 flex-col 을 주면 계산값은 column 인데 Chromium 이
            가로로 배치했다(2026-10-05 격리 E2E 실측: 아이콘이 막대 왼쪽 밖으로 밀려 잘림). */}
        <span className="flex flex-col items-center gap-1">
          <PanelLeftOpen aria-hidden="true" className="size-5" />
          {SIDEBAR_EXPAND_VISIBLE_TEXT}
        </span>
      </Button>
    </aside>
  );
}
