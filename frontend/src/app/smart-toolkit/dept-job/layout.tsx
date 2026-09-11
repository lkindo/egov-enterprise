'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { DeptJobSectionSlotProvider } from '@/components/business/deptJob/dept-job-section-slot';

/**
 * 부서 업무 목록 라우트의 **워크허브 탭 스트립**(demo pack 소유).
 *
 * [왜 레이아웃인가] 목록 화면(`DeptJobListSection`)은 core 소유라 core·collaboration
 * 프로필에도 남아야 하는데, 탭이 가리키는 업무 보고(`/smart-toolkit/work-report`)와
 * 일정(`/smart-toolkit/schedule`)은 demo pack 소유라 그 프로필에 존재하지 않는다.
 * 탭을 화면 안에 두면 core 프로필에서 **죽은 링크 두 개**가 남는다(G10 위반).
 *
 * 그래서 탭 스트립만 이 파일로 분리하고 `config/reusable-base-profiles.json` 의 demo pack
 * `frontend.removePaths` 에 이 경로를 등재했다. core 프로필에서는 이 레이아웃이 통째로
 * 사라져 provider 가 없고, 섹션은 슬롯이 비어 있으므로 탭 없이 목록만 그린다.
 *
 * 마크업·동작은 워크허브(`WorkHubClient`)의 탭 스트립과 같다 — 활성 탭만 `job` 으로 고정된다.
 */
const TAB_LABEL = { job: '업무 관리', report: '업무 보고', calendar: '일정' } as const;

const TAB_ROUTES: Record<'job' | 'report' | 'calendar', string> = {
  job: '/smart-toolkit/dept-job',
  report: '/smart-toolkit/work-report',
  calendar: '/smart-toolkit/schedule',
};

export default function DeptJobLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const activeTab = 'job' as const;

  const tabStrip = (
    <div role="tablist" aria-label="워크허브 영역 선택" className="flex rounded-md border border-border p-0.5">
      {(['job', 'report', 'calendar'] as const).map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          id={`work-hub-tab-${tab}`}
          aria-selected={activeTab === tab}
          aria-controls="work-hub-tabpanel"
          onClick={() => router.push(TAB_ROUTES[tab], { scroll: false })}
          className={cn(
            'flex h-[var(--control-h-sm)] items-center rounded px-4 text-xs font-bold transition-colors',
            activeTab === tab ? 'bg-muted text-primary' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {TAB_LABEL[tab]}
        </button>
      ))}
    </div>
  );

  return <DeptJobSectionSlotProvider value={tabStrip}>{children}</DeptJobSectionSlotProvider>;
}
