'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSidebarCollapsed } from '@/lib/layout/use-sidebar-collapsed';
import { SIDEBAR_CONTENT_ID, SIDEBAR_TOGGLE_LABEL } from '@/lib/layout/sidebar-collapse-script';

/**
 * 넓은 화면(lg 이상)의 사이드바 접기·펼치기 — 사이드바 오른쪽 경계선에 반쯤 걸친 원형 아이콘 단추 하나(2026-10-05 DEC-OPS-228).
 *
 * 사용자 결정: 머리글 로고 옆 아이콘은 보지 못했고, 사이드바 맨 위 글자 단추·접힘 막대의 '펼치기'보다 경계선의 아이콘이
 * 직관적이다 — 접기 단추는 이것 하나만 남긴다. 그래서 다음을 지킨다.
 *  - 늘 보인다. 마우스를 올려야 나타나는 방식은 찾기 어렵고 터치 화면에서는 보이지 않는다. 불투명한 카드 배경·그림자와
 *    보조 글자색 50% 의 테두리로 경계선 위에서도 구분된다 — 기본 테두리 토큰은 다크 테마에서 카드와 대비가 약 1.3:1 이라
 *    원이 사라진다. 크기는 --control-h-sm(2rem = 32px, 밀도와 무관 — WCAG 2.5.8 최소 24px. 콘텐츠 가이드의 아이콘 단추
 *    44px 권장보다 작은 것은 사용자와 합의한 예외다 — 카탈로그 §4).
 *  - ghost 변형에 테두리·배경을 직접 준다. outline 변형은 hover 배경(surface-inverse)과 글자색을 짝으로 두는데 글자색만
 *    덮으면 밝은 테마의 hover 에서 아이콘이 배경과 같은 색이 되고(KRDS 1:1), 변형의 dark:bg-input/30 은 Tailwind 기본
 *    dark 변형(OS prefers-color-scheme)이라 앱 테마와 무관하게 배경을 반투명으로 만들어 경계선이 단추 가운데로 비친다.
 *  - 접어도 펴도 같은 높이다. 사이드바 상자(fixed, 위쪽 = 머리글 높이)는 접어도 폭만 줄고 위치는 그대로라, 그 안의 top-4 는
 *    늘 머리글 아래 1rem 이다. 단추는 좌우로만 움직이므로 접은 직후 같은 자리를 다시 눌러 편다.
 *  - 경계선에 걸친다. 상자 오른쪽 끝(right-0)에서 단추 폭의 절반(translate-x-1/2 — 토큰 값과 무관)만큼 밖으로 나가 중심이
 *    경계선 위에 온다. 사이드바 상자는
 *    overflow 를 자르지 않고(스크롤은 안쪽 내용 컨테이너가 한다), z-[100] 이라 본문 위에 그려지며 대화상자 오버레이(z-[1000])
 *    아래에 있다.
 *  - 단추는 상태가 바뀌어도 DOM 에서 사라지지 않는다 — 접으면 globals.css 가 사이드바 상자 폭을 좁은 띠로 줄이고 안쪽 내용
 *    컨테이너만 display:none 으로 숨긴다. 그래서 누른 뒤에도 포커스가 이 단추에 그대로 있다(2.4.3). 단추가 늘 사이드바
 *    랜드마크(aside '주 메뉴') 안에 있어 axe region 규칙에도 걸리지 않는다.
 *
 * 이름은 고정하고 상태는 aria-expanded 로만 알린다(이름까지 바꾸면 상태를 두 번 말한다 — APG disclosure). 툴팁(title)도 이름과
 * 같다 — 이름과 다르면 접근 설명으로 노출돼 상태에서 나온 동작을 한 번 더 말한다. 방향은 아이콘(갈매기)이 말한다. 서버 렌더와
 * 하이드레이션 전의 짧은 동안 aria-expanded 는 펼침(true)으로 나간다(서버 스냅샷) — 접힌 채 새로고침하면 하이드레이션 직후
 * 바로잡히는 알려진 한계다. aria-controls 는 실제로 숨고 보이는 안쪽 내용 컨테이너를 가리킨다. 아이콘은 둘 다 그리고
 * <html data-sidebar-collapsed> 를 보는 CSS(sidebar-collapsed: 변형)가 하나만 보인다 — 새로고침 직후 하이드레이션 전에도 맞다.
 *
 * lg 미만의 서랍형 사이드바에서는 보이지 않는다(hidden lg:inline-flex, CSS 만 — 단일 DOM, ADR-0006). 서랍은 머리글의 '주 메뉴
 * 열기'와 서랍 안 '사이드바 닫기'가 맡는다. 인쇄에서는 globals.css 접힘 블록의 인쇄 규칙이 숨긴다.
 */
export function SidebarEdgeToggle() {
  const { collapsed, toggle } = useSidebarCollapsed();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      data-app-sidebar-edge-toggle=""
      onClick={toggle}
      aria-label={SIDEBAR_TOGGLE_LABEL}
      aria-expanded={!collapsed}
      aria-controls={SIDEBAR_CONTENT_ID}
      title={SIDEBAR_TOGGLE_LABEL}
      className="absolute right-0 top-4 z-10 hidden translate-x-1/2 rounded-full border border-muted-foreground/50 bg-card shadow-md lg:inline-flex"
    >
      <ChevronLeft aria-hidden="true" data-sidebar-icon="collapse" className="size-4 sidebar-collapsed:hidden" />
      <ChevronRight aria-hidden="true" data-sidebar-icon="expand" className="hidden size-4 sidebar-collapsed:block" />
    </Button>
  );
}
