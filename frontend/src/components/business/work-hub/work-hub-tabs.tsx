'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Tab, TabList, TabPanel } from '@/app/components/ui/standard-tabs';
import { shellLinks } from '@/extensions/generated-shell-links';
import type { ShellLink } from '@/extensions/slots';
import { useSlotEntries } from '@/extensions/use-slot-entries';

/**
 * 나의 업무 탭 줄(core, 업무 허브 분해 W1).
 *
 * 나의 업무의 탭은 `?tab=` 이 아니라 경로 탭이다 — 탭마다 자기 화면이 있고(업무 관리 /smart-toolkit/dept-job, 업무 보고
 * /smart-toolkit/work-report, 일정 /smart-toolkit/schedule), 공유되는 것은 탭 줄뿐이다. 그래서 탭 줄은 core 인 이 파일이 그리고,
 * 업무 보고·일정 탭은 각 기능이 shell-links 의 work-hub 배치로 기여한다. 기능이 빠진 구성에서는 기여 파일이 기능과 함께 지워져
 * 그 탭만 사라진다. 이 파일은 기능 디렉터리를 import 하지 않는다 — core 투영에서 연쇄로 지워지면 나의 업무와 업무 관리 목록이
 * 함께 사라진다(도달성 census 의 core 생존 목록이 이 파일을 지킨다).
 *
 * 탭 하나짜리 탭 줄은 그리지 않는다 — 기여 탭이 없으면(core·collaboration) 업무 관리 목록만 보인다. 그때 tabpanel 도 두지 않는다
 * (가리키는 탭이 없는 tabpanel 을 남기지 않는다). 마크업(접근 이름·탭 id·aria-controls)은 분해 전 업무 허브와 같다 — e2e 와
 * 동등성 그물이 이것을 본다.
 */
const CORE_TAB = { id: 'job', href: '/smart-toolkit/dept-job', label: '업무 관리' } as const;
const TABPANEL_ID = 'work-hub-tabpanel';
const tabDomId = (id: string) => `work-hub-tab-${id}`;

// 배치를 리터럴로 거른다 — URL-state census 가 기여의 라우트 맥락을 이 비교로 이 소비자에 귀속한다.
const isWorkHubTab = (link: ShellLink) => link.placement === 'work-hub';
const isWorkReportLink = (link: ShellLink) => link.placement === 'work-report';

export interface WorkHubTabStrip {
  /** 탭 줄. 기여 탭이 없으면 null 이다. */
  readonly strip: React.ReactNode;
  /** 탭 줄이 있을 때만 내용을 tabpanel 로 감싼다. */
  readonly panel: (children: React.ReactNode) => React.ReactNode;
}

/**
 * 나의 업무 탭 줄. activeHref 는 지금 화면의 경로다(업무 관리 화면은 core 탭 경로). 탭을 누르면 그 탭의 화면 경로로 간다.
 */
export function useWorkHubTabStrip(activeHref: string): WorkHubTabStrip {
  const router = useRouter();
  const contributed = useSlotEntries(shellLinks, isWorkHubTab);
  return useMemo(() => {
    if (contributed.length === 0) return { strip: null, panel: (children: React.ReactNode) => children };
    const tabs = [CORE_TAB, ...contributed.map(({ id, href, label }) => ({ id, href, label }))];
    const activeId = (tabs.find(tab => tab.href === activeHref) ?? CORE_TAB).id;
    const strip = (
      // 탭을 고르면 다른 페이지로 간다 — 방향키는 포커스만 옮기고 Enter·Space 로 고른다(manual).
      <TabList activation="manual" aria-label="업무 영역 선택" className="flex rounded-md border border-border p-0.5">
        {tabs.map(tab => (
          <Tab
            key={tab.id}
            id={tabDomId(tab.id)}
            selected={tab.id === activeId}
            aria-controls={TABPANEL_ID}
            onClick={() => router.push(tab.href, { scroll: false })}
            className={cn(
              'flex h-[var(--control-h-sm)] items-center rounded px-4 text-xs font-bold transition-colors',
              tab.id === activeId ? 'bg-muted text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </Tab>
        ))}
      </TabList>
    );
    const panel = (children: React.ReactNode) => (
      <TabPanel id={TABPANEL_ID} aria-labelledby={tabDomId(activeId)}>
        {children}
      </TabPanel>
    );
    return { strip, panel };
  }, [contributed, activeHref, router]);
}

/**
 * 업무 보고 화면 머리의 링크(shell-links 의 work-report 배치). 레지스트리를 읽는 곳을 이 core 파일 하나로 둔다 — 기능 화면이
 * 레지스트리를 직접 읽지 않는다(경계 계약의 소비자 표).
 */
export function useWorkReportLinks(): ShellLink[] {
  return useSlotEntries(shellLinks, isWorkReportLink);
}
