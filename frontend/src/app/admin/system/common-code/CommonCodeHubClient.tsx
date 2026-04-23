'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { 
  Building2, 
  Database, 
  FileCode,
  MapPin,
  ChevronRight,
  ShieldCheck,
  Zap,
  Activity,
  Server,
  Network,
  Code2,
  Layers,
  SearchCode,
  Timer,
  LucideIcon
} from 'lucide-react';
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
        title="留덉뒪???곗씠??嫄곕쾭?뚯뒪" 
        breadcrumbs={[{ label: '?쒖뒪?쒓?由? }, { label: '肄붾뱶愿由? }, { label: '?듯빀 肄붾뱶 ?덈툕' }]} 
      />

      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-10">
        <HubHeader 
          title="肄붾뱶" 
          highlight="?듯빀 ?덈툕" 
          subtitle="?쒖뒪???꾨컲???쒖? 肄붾뱶, ?됱젙 ?쒖? 諛?湲곌? ?몃뱶 ?앸퀎 泥닿퀎???듯빀 嫄곕쾭?뚯뒪 愿由??쇳꽣?낅땲??" 
          icon={Database} 
        />

        {/* --- Multi-Level Hub Switcher --- */}
        <div className="bg-slate-100/80 backdrop-blur-md p-2 rounded-[0.1rem] flex flex-wrap gap-2 border border-slate-200/50 shadow-inner">
          <HubTabButton 
            icon={FileCode} 
            label="?쒖? 肄붾뱶" 
            active={activeTab === 'STANDARD'} 
            onClick={() => setActiveTab('STANDARD')} 
          />
          <HubTabButton 
            icon={MapPin} 
            label="?됱젙 ?쒖?" 
            active={activeTab === 'ADMINIST'} 
            onClick={() => setActiveTab('ADMINIST')} 
          />
          <HubTabButton 
            icon={Building2} 
            label="湲곌? ?몃뱶" 
            active={activeTab === 'INSTITUTION'} 
            onClick={() => setActiveTab('INSTITUTION')} 
          />
        </div>
      </div>

      {/* Code Metrics Section */}
      <HubMetricGrid>
        <HubMetricCard title="?꾩옱 ?깅줉 肄붾뱶" value={groups.length + details.length} icon={Code2} color="primary" />
        <HubMetricCard title="?쒖? ?곹깭 媛?⑹꽦" value="?쒖꽦" icon={ShieldCheck} color="emerald" status="?숆린?붾맖" />
        <HubMetricCard title="硫뷀??곗씠??嫄댁쟾?? value="99.8%" icon={Zap} color="amber" />
        <HubMetricCard title="?몃뱶 ?곕룞 ?띾룄" value="1.2s" icon={Timer} color="indigo" />
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
              <div className="hub-card-section p-4 lg:p-12 border ring-1 ring-slate-100 relative overflow-hidden bg-white/50 backdrop-blur-xl">
                 <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -ml-64 -mt-64 opacity-60 pointer-events-none" />
                 <CommonCodeClient 
                  clCodes={clCodes} 
                  groups={groups} 
                  details={details} 
                  selectedGroupId={selectedGroupId} 
                />
              </div>
            )}
            {activeTab === 'ADMINIST' && (
              <div className="hub-card-section p-4 lg:p-12 border ring-1 ring-slate-100 relative overflow-hidden bg-white/50 backdrop-blur-xl">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -mr-64 -mt-64 opacity-60 pointer-events-none" />
                <AdministCodeClient initialData={{ list: [], total: 0 }} />
              </div>
            )}
            {activeTab === 'INSTITUTION' && (
              <div className="hub-card-section p-4 lg:p-12 border ring-1 ring-slate-100 relative overflow-hidden bg-white/50 backdrop-blur-xl">
                <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] -ml-64 -mt-64 opacity-60 pointer-events-none" />
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
        "relative flex items-center gap-3 px-10 py-4 rounded-[0.1rem] text-[11px] font-black tracking-tight transition active:scale-95 overflow-hidden group",
        active 
          ? "bg-white text-slate-900 shadow-2xl ring-1 ring-slate-200" 
          : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
      )}
    >
      <div className={cn(
        "transition duration-500 group-hover:rotate-12",
        active ? "scale-110 text-primary" : "opacity-70"
      )}>
        <Icon size={18} />
      </div>
      <span className="relative z-10">{label}</span>
      {active && (
        <motion.div 
          layoutId="activeHubIndicator"
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-full mb-1 opacity-80"
        />
      )}
    </button>
  );
}
