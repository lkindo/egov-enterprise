'use client';

import type { ReactNode } from 'react';
import { useOverflowRegion } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { WORK_FILL_SCROLL_CLASS } from '@/app/components/patterns/work-fill';

/**
 * 권한 작업대 표의 스크롤 상자(2026-10-02). '화면별 권한'·'기능별 권한' 표가 쓴다.
 *
 * 넘치면 키보드로 스크롤할 수 있는 이름 있는 영역이 된다(WCAG 2.1.1, axe scrollable-region-focusable). 권한 설정 권한이
 * 없거나 저장 중이라 칸이 모두 비활성이면 상자 안에 포커스할 요소가 거의 없어, 오른쪽 열이나 아래 줄을 키보드로 볼 수 없었다.
 * 넘치지 않으면 영역 속성을 붙이지 않는다(쓸모없는 탭 정지를 만들지 않는다).
 *
 * ⚠ 훅은 상자와 같은 컴포넌트에서 부른다. 두 표 모두 결과가 없으면 상자 대신 안내 문장을 그려 상자가 늦게 마운트되는데,
 *   `useOverflowRegion` 의 측정 effect 는 deps 가 고정이라 표 컴포넌트 맨 위에서 부르면 늦게 생긴 상자를 다시 재지 않는다
 *   (상세 패널 DetailScrollArea·그룹 비교 ComparisonScrollRegion 과 같은 이유).
 *
 * [2026-10-05] 상자는 `relative` 다. 셀마다 둔 sr-only(position:absolute) 문장의 기준 상자가 이 상자 바깥(앱 프레임)이면
 *   상자가 그 문장을 잘라 내지 못하고, 내용이 끝난 뒤에도 문서가 1,155~1,625px 더 스크롤됐다(1366 에서는 가로로도 71px).
 *   `fill` 은 업무면 fill 셸(카탈로그 §4) 안에서 70vh 대신 부모가 준 남은 높이를 채운다 — 부모는 세로 flex 여야 한다.
 *   사슬이 끊겨 남은 높이를 못 받아도 상한(셸 높이)이 남아 상자 안에서 스크롤하고 고정 머리글·첫 열을 유지한다.
 *   조건 밖에서는 기본과 같은 70vh 상자이고, 인쇄에서는 높이 제한 없이 펼친다. 이름·키보드 스크롤은 두 변형이 같다.
 *
 * [2026-10-05 한 화면 압축] `scrollPaddingClassName` 은 표의 고정 머리글 높이·고정 첫 열 폭만큼 스크롤 여백(scroll-padding)을
 *   준다. 방향키·Tab 으로 칸을 옮기면 브라우저가 그 칸이 보이도록 상자를 스크롤하는데, 여백이 없으면 칸이 고정 머리글·첫 열
 *   밑에 가려진 채 멈춘다(WCAG 2.4.11 포커스 가림). 값은 표마다 머리글·첫 열 크기가 달라 쓰는 표가 완전한 리터럴로 넘긴다.
 */
export function PermissionScrollRegion({ label, children, fill = false, scrollPaddingClassName }: {
  label: string;
  children: ReactNode;
  fill?: boolean;
  /** 고정 머리글·첫 열에 칸이 가리지 않게 하는 scroll-padding 클래스(예: 'scroll-pt-8 scroll-pl-[15rem]'). */
  scrollPaddingClassName?: string;
}) {
  const regionProps = useOverflowRegion<HTMLDivElement>(label);
  return (
    <div
      {...regionProps}
      className={cn(
        'relative max-h-[min(70vh,48rem)] overflow-auto rounded-md border border-border outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        fill && WORK_FILL_SCROLL_CLASS,
        scrollPaddingClassName,
      )}
    >
      {children}
    </div>
  );
}
