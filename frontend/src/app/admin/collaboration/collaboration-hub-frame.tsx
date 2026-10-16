'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { WorkListPage } from '@/app/components/patterns/work-list-page';

/**
 * 협업 허브의 core 틀(허브 분해 H1). 제목·경로 표시·조회 조건 저장 키·탭 패널은 틀이 소유하고, 탭 목록과 허브 머리 링크는 셸이
 * 컨텍스트로 넣는다 — 탭 뷰(기능의 hub-tabs-collaboration 기여)는 탭 목록을 모르고 자기 설명·건수·주 동작·조회 조건·표만 넘긴다.
 */
interface CollaborationHubChrome {
  /** 탭 목록(role=tablist). 보이는 탭이 없으면 null. */
  readonly tabList: ReactNode;
  /** 허브 머리 링크(shell-links 의 collaboration-hub 배치). */
  readonly hubLinks: ReactNode;
  /** 열린 탭의 `?tab=` 값. 탭 패널이 이 탭 버튼을 가리킨다. */
  readonly activeTabId: string | null;
}

const CollaborationHubContext = createContext<CollaborationHubChrome>({ tabList: null, hubLinks: null, activeTabId: null });

export const CollaborationHubChromeProvider = CollaborationHubContext.Provider;

export function CollaborationHubFrame({
  description,
  totalCount,
  primaryAction,
  filter,
  toolbarActions,
  children,
}: {
  description: string;
  totalCount?: number;
  primaryAction?: ReactNode;
  filter?: ReactNode;
  toolbarActions?: ReactNode;
  children: ReactNode;
}) {
  const { tabList, hubLinks, activeTabId } = useContext(CollaborationHubContext);
  return (
    <WorkListPage
      title="협업 및 네트워크 허브"
      description={description}
      breadcrumbItems={[{ label: '협업관리' }, { label: '협업 허브' }]}
      filterStateKey="collaboration-hub"
      totalCount={totalCount}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {/* 탭은 조회 조건이 아니라 조회 대상 전환이라 헤더에 둔다(기관 코드 화면과 같은 규약). */}
          {tabList}
          {hubLinks}
          {primaryAction}
        </div>
      }
      filter={filter}
      toolbarActions={toolbarActions}
    >
      {activeTabId ? (
        <div role="tabpanel" id="collab-tabpanel" aria-labelledby={`collab-tab-${activeTabId}`}>
          {children}
        </div>
      ) : children}
    </WorkListPage>
  );
}
