'use client';

import React from 'react';

/**
 * 부서 업무 목록 섹션의 **선행 액션 슬롯**.
 *
 * [왜 context 인가] `DeptJobListSection` 은 core 소유다 — 부서 업무 테이블
 * (tb_dept_task_info·tb_dept_job_bx)이 core 소유이므로 목록 화면도 core·collaboration
 * 프로필에서 살아남아야 한다. 반면 그 위에 얹히는 **워크허브 탭 스트립**(업무/보고/일정)은
 * 보고·일정 도메인이 demo pack 소유라 core 프로필에 존재할 수 없다.
 *
 * 그래서 섹션은 탭 스트립을 import 하지 않고 슬롯으로만 받는다. demo 프로필에서는
 * `src/app/smart-toolkit/dept-job/layout.tsx`(demo pack removePaths 소유)가 provider 로
 * 탭 스트립을 내려보내고, core 프로필에서는 그 레이아웃 파일이 제거되어 provider 가 없으므로
 * 이 context 는 `null` 을 돌려준다 — 섹션은 탭 없이 목록만 그린다.
 *
 * ⚠ provider 부재가 곧 '탭 없음' 이다. 기본값을 만들거나 탭을 흉내내지 않는다 —
 *   core 프로필에는 보고·일정 라우트 자체가 없으므로 탭을 그리면 죽은 링크가 된다(G10).
 */
const DeptJobSectionSlotContext = React.createContext<React.ReactNode>(null);

export function DeptJobSectionSlotProvider({
  value,
  children,
}: {
  value: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <DeptJobSectionSlotContext.Provider value={value}>{children}</DeptJobSectionSlotContext.Provider>
  );
}

/** provider 가 없으면 `null` — core 프로필에서는 아무것도 그리지 않는다. */
export function useDeptJobSectionSlot(): React.ReactNode {
  return React.useContext(DeptJobSectionSlotContext);
}
