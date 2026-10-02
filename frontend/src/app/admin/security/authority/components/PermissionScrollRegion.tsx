'use client';

import type { ReactNode } from 'react';
import { useOverflowRegion } from '@/components/ui/table';

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
 */
export function PermissionScrollRegion({ label, children }: { label: string; children: ReactNode }) {
  const regionProps = useOverflowRegion<HTMLDivElement>(label);
  return (
    <div
      {...regionProps}
      className="max-h-[min(70vh,48rem)] overflow-auto rounded-md border border-border outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
    >
      {children}
    </div>
  );
}
