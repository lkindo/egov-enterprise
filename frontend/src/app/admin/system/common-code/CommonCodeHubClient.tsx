'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { Building2,  
  Database,  
  FileCode, 
  MapPin, 
  ShieldCheck, 
  Zap, 
  Code2, 
  Timer, 
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

export default function CommonCodeHubClient({ 
  clCodes, 
  groups, 
  details, 
  selectedGroupId 
}: { 
  clCodes: CmmnClCode[]; 
  groups: CmmnCode[]; 
  details: CmmnDetailCode[]; 
  selectedGroupId: string | null 
}) {
  const [activeTab, setActiveTab] = useState<CodeHubTab>('STANDARD');

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

        {/* --- Multi-Level Hub Switcher --- */}
        <div className="bg-muted/80 backdrop-blur-md p-2 rounded-lg flex flex-wrap gap-2 border border-border/50 shadow-inner">
          <HubTabButton 
            icon={FileCode} 
            label="표준 코드" 
            active={activeTab === 'STANDARD'} 
            onClick={() => setActiveTab('STANDARD')} 
          />
          <HubTabButton 
            icon={MapPin} 
            label="행정 표준" 
            active={activeTab === 'ADMINIST'} 
            onClick={() => setActiveTab('ADMINIST')} 
          />
          <HubTabButton 
            icon={Building2} 
            label="기관 노드" 
            active={activeTab === 'INSTITUTION'} 
            onClick={() => setActiveTab('INSTITUTION')} 
          />
        </div>
      </div>

      {/* Code Metrics Section */}
      <HubMetricGrid>
        <HubMetricCard title="현재 등록 코드" value={groups.length + details.length} icon={Code2} color="primary" />
        <HubMetricCard title="표준 상태 가용성" value="활성" icon={ShieldCheck} color="emerald" status="동기화됨" />
        <HubMetricCard title="메타데이터 건전성" value="99.8%" icon={Zap} color="amber" />
        <HubMetricCard title="노드 연동 속도" value="1.2s" icon={Timer} color="indigo" />
      </HubMetricGrid>

      {/* --- Viewport Content --- */}
      <div className="px-2">
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
                <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-lg blur-[120px] -ml-64 -mt-64 opacity-60 pointer-events-none" />
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

function HubTabButton({ icon: Icon, label, active, onClick }: { icon: LucideIcon, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      type="button"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={cn(
        "relative flex items-center gap-3 px-10 py-4 rounded-lg text-xs font-bold tracking-tight transition-all active:scale-95 overflow-hidden group",
        active 
          ? "bg-white text-foreground shadow-2xl ring-1 ring-border"
          : "text-muted-foreground hover:text-foreground hover:bg-white/50"
      )}
    >
      <div className={cn(
        "transition-all duration-500 group-hover:rotate-12",
        active ? "scale-110 text-primary" : "opacity-70"
      )}>
        <Icon size={18} />
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
