'use client';

import React, { useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/app/components/layout/page-header';
import { AlertTriangle,
  Building2,
  Database,
  FileCode,
  Layers,
  MapPin,
  PowerOff,
  Code2,
  LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
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

  const setActiveTab = useCallback((tab: CodeHubTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);

  /*
   * [P1-5] 지표는 실제 계산 가능한 값만 노출한다.
   * 종전 '표준 상태 가용성: 활성' / '메타데이터 건전성: 99.8%' / '노드 연동 속도: 1.2s' 는
   * 산출 근거가 없는 고정 문구여서 삭제하고, 분류/그룹/미사용 실측값으로 교체했다.
   */
  const inactiveGroupCount = groups.filter(g => g.useYn === 'N').length;

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader 
        title="마스터 데이터 거버넌스" 
        breadcrumbs={[{ label: '시스템관리' }, { label: '코드관리' }, { label: '통합 코드 허브' }]} 
      />

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <HubHeader 
          title="코드" 
          highlight="통합 허브" 
          subtitle="시스템 전반의 표준 코드, 행정 표준 및 기관 노드 식별 체계의 통합 거버넌스 관리 센터입니다." 
          icon={Database} 
        />

        {/* --- Multi-Level Hub Switcher ([P2] tablist 시맨틱) --- */}
        <div role="tablist" aria-label="코드 유형 전환" className="bg-muted/80 backdrop-blur-md p-2 rounded-lg flex flex-wrap gap-2 border border-border/50 shadow-inner">
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
      </div>

      {/* [P1-1] 서버 초기 조회 실패를 화면에 드러낸다 — 빈 목록을 '0건'으로 오인하지 않도록 */}
      {fetchError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-6 py-4 text-sm font-bold text-destructive"
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            코드 목록을 불러오지 못했습니다. 아래 목록이 비어 있는 것은 등록된 코드가 없어서가 아니라 조회 실패 때문입니다.
            잠시 후 페이지를 새로고침해 주세요.
          </span>
        </div>
      )}

      {/* Code Metrics Section — 전량 실측값 */}
      <HubMetricGrid>
        <HubMetricCard title="코드 분류" value={clCodes.length} icon={Layers} color="primary" />
        <HubMetricCard title="코드 그룹" value={groups.length} icon={Code2} color="indigo" />
        <HubMetricCard title="미사용 그룹" value={inactiveGroupCount} icon={PowerOff} color="amber" />
        <HubMetricCard title="선택 그룹 상세코드" value={selectedGroupId ? details.length : 0} icon={Database} color="emerald" />
      </HubMetricGrid>

      {/* --- Viewport Content --- */}
      <div
        className="px-2"
        role="tabpanel"
        id="code-hub-panel"
        aria-labelledby={
          activeTab === 'STANDARD' ? 'code-hub-tab-standard'
            : activeTab === 'ADMINIST' ? 'code-hub-tab-administ'
              : 'code-hub-tab-institution'
        }
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.98, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.02, y: -30 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {activeTab === 'STANDARD' && (
              <div className="hub-card-section p-4 lg:p-12 border ring-1 ring-border relative overflow-hidden bg-white/50 backdrop-blur-xl">
                 <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-lg blur-[120px] -ml-64 -mt-64 opacity-60 pointer-events-none" />
                 <CommonCodeClient 
                  clCodes={clCodes} 
                  groups={groups} 
                  details={details} 
                  selectedGroupId={selectedGroupId} 
                />
              </div>
            )}
            {activeTab === 'ADMINIST' && (
              <div className="hub-card-section p-4 lg:p-12 border ring-1 ring-border relative overflow-hidden bg-white/50 backdrop-blur-xl">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-lg blur-[120px] -mr-64 -mt-64 opacity-60 pointer-events-none" />
                <AdministCodeClient initialData={{ list: [], total: 0 }} />
              </div>
            )}
            {activeTab === 'INSTITUTION' && (
              <div className="hub-card-section p-4 lg:p-12 border ring-1 ring-border relative overflow-hidden bg-white/50 backdrop-blur-xl">
                <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-hub-indigo/5 rounded-lg blur-[120px] -ml-64 -mt-64 opacity-60 pointer-events-none" />
                <InstitutionCodeClient initialData={{ list: [], total: 0 }} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
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
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={cn(
        "relative flex items-center gap-3 px-10 py-4 rounded-lg text-xs font-bold tracking-tight transition-all active:scale-95 overflow-hidden group",
        active
          ? "bg-card text-foreground shadow-2xl ring-1 ring-border"
          : "text-muted-foreground hover:text-foreground hover:bg-white/50"
      )}
    >
      <div className={cn(
        "transition-all duration-500 group-hover:rotate-12",
        active ? "scale-110 text-primary" : "opacity-70"
      )}>
        <Icon size={18} aria-hidden="true" />
      </div>
      <span className="relative z-10">{label}</span>
      {active && (
        <motion.div 
          layoutId="activeHubIndicator"
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-lg mb-1 opacity-80"
        />
      )}
    </button>
  );
}
