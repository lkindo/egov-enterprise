'use client';

import { useCallback, useEffect, useRef, type KeyboardEvent } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/app/components/layout/page-header';
import { AlertTriangle,
  Building2,
  FileCode,
  MapPin,
  LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CmmnClCode, CmmnCode, CmmnDetailCode } from '@/types/foundation/system';
import CommonCodeClient from './CommonCodeClient';
import AdministCodeClient from '../codes/administ/AdministCodeClient';
import InstitutionCodeClient from '../codes/institution/InstitutionCodeClient';

// --- Types ---
type CodeHubTab = 'STANDARD' | 'ADMINIST' | 'INSTITUTION';

const TABS: CodeHubTab[] = ['STANDARD', 'ADMINIST', 'INSTITUTION'];

function resolveTab(raw: string | null): CodeHubTab {
  const upper = (raw || '').toUpperCase() as CodeHubTab;
  return TABS.includes(upper) ? upper : 'STANDARD';
}

export default function CommonCodeHubClient({
  clCodes,
  groups,
  details,
  selectedGroupId,
  fetchError = false
}: {
  clCodes: CmmnClCode[];
  groups: CmmnCode[];
  details: CmmnDetailCode[];
  selectedGroupId: string | null;
  /** [P1-1] 서버 컴포넌트의 초기 조회가 실패했음을 알린다(실패를 '0건'으로 위장하지 않기 위함). */
  fetchError?: boolean;
}) {
  /*
   * [P1-7] 활성 탭을 URL(?tab=) 파생값으로 만든다.
   * 공유·새로고침·뒤로가기가 복원되고 사이드바 활성 표시도 유지된다.
   */
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = resolveTab(searchParams.get('tab'));
  const restoreTabFocusRef = useRef(false);

  const setActiveTab = useCallback((tab: CodeHubTab) => {
    if (tab === activeTab) return;
    restoreTabFocusRef.current = true;
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [activeTab, router, pathname, searchParams]);

  useEffect(() => {
    if (!restoreTabFocusRef.current) return;
    restoreTabFocusRef.current = false;
    document.getElementById(`code-hub-tab-${activeTab.toLowerCase()}`)?.focus();
  }, [activeTab]);

  const handleTabListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;

    const currentTab = (event.target as HTMLElement).closest<HTMLElement>('[role="tab"]');
    if (!currentTab) return;
    const currentIndex = TABS.findIndex((tab) => currentTab.id === `code-hub-tab-${tab.toLowerCase()}`);
    if (currentIndex < 0) return;

    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? TABS.length - 1
        : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;

    event.preventDefault();
    setActiveTab(TABS[nextIndex]);
  };

  const tabNavigation = (
    <div
      role="tablist"
      aria-label="코드 유형 전환"
      onKeyDown={handleTabListKeyDown}
      className="flex flex-wrap gap-2 rounded-md border border-border bg-muted p-2"
    >
      <HubTabButton
        id="code-hub-tab-standard"
        panelId="code-hub-panel"
        icon={FileCode}
        label="표준 코드"
        active={activeTab === 'STANDARD'}
        onClick={() => setActiveTab('STANDARD')}
      />
      <HubTabButton
        id="code-hub-tab-administ"
        panelId="code-hub-panel"
        icon={MapPin}
        label="행정 표준"
        active={activeTab === 'ADMINIST'}
        onClick={() => setActiveTab('ADMINIST')}
      />
      <HubTabButton
        id="code-hub-tab-institution"
        panelId="code-hub-panel"
        icon={Building2}
        label="기관 노드"
        active={activeTab === 'INSTITUTION'}
        onClick={() => setActiveTab('INSTITUTION')}
      />
    </div>
  );

  const fetchNotice = fetchError ? (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive-emphasis"
    >
      <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>
        코드 목록을 불러오지 못했습니다. 목록이 비어 있는 것은 등록된 코드가 없어서가 아니라 조회 실패 때문입니다.
        잠시 후 페이지를 새로고침해 주세요.
      </span>
    </div>
  ) : undefined;

  const activeTabId = `code-hub-tab-${activeTab.toLowerCase()}`;

  return (
    <div className="space-y-4">
      <PageHeader
        title="코드 관리"
        breadcrumbs={[{ label: '시스템관리' }, { label: '코드관리' }, { label: '통합 코드 허브' }]}
        animateEntrance={false}
      />
      {tabNavigation}
      <div
        role="tabpanel"
        id="code-hub-panel"
        aria-labelledby={activeTabId}
      >
        {activeTab === 'STANDARD' ? (
          <CommonCodeClient
            clCodes={clCodes}
            groups={groups}
            details={details}
            selectedGroupId={selectedGroupId}
            notice={fetchNotice}
            loadFailed={fetchError}
            embedded
          />
        ) : activeTab === 'ADMINIST' ? (
          <AdministCodeClient initialData={{ list: [], total: 0 }} embedded />
        ) : (
          <InstitutionCodeClient initialData={{ list: [], total: 0 }} embedded />
        )}
      </div>
    </div>
  );
}

// --- Sub-components ---

function HubTabButton({ id, panelId, icon: Icon, label, active, onClick }: { id: string, panelId: string, icon: LucideIcon, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={active}
      aria-controls={panelId}
      tabIndex={active ? 0 : -1}
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={cn(
        "relative flex items-center gap-3 rounded-md px-5 py-3 text-xs font-semibold transition-colors",
        active
          ? "bg-card text-foreground shadow-2xl ring-1 ring-border"
          : "text-muted-foreground hover:text-foreground hover:bg-card/70"
      )}
    >
      <div className={cn(active ? "text-primary" : "text-muted-foreground")}>
        <Icon size={18} aria-hidden="true" />
      </div>
      <span className="relative z-10">{label}</span>
      {active && (
        <span aria-hidden="true" className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-primary" />
      )}
    </button>
  );
}
