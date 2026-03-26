'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import {
  Terminal,
  Activity,
  History,
  ShieldCheck,
  SearchCode,
  ArrowRight,
  Database,
  Clock,
  Fingerprint,
  Layers,
  Zap,
  LayoutGrid,
  Lock,
  Globe,
  UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

// Mock data for integrated log dashboard
const logCategories = [
  { id: 'SYS', label: '?쒖뒪??濡쒓렇', icon: <Terminal size={20} />, description: '?쒕퉬??諛?硫붿냼???ㅽ뻾 ?대젰' },
  { id: 'LGN', label: '濡쒓렇??濡쒓렇', icon: <Lock size={20} />, description: '?ъ슜???묒냽 諛??몄쬆 湲곕줉' },
  { id: 'USR', label: '?ъ슜???쒕룞', icon: <UserCheck size={20} />, description: '?곗씠??蹂寃?諛?沅뚰븳 異붿쟻' },
  { id: 'WEB', label: '??濡쒓렇', icon: <Globe size={20} />, description: 'HTTP ?붿껌 諛??곗씠??遺꾩꽍' },
  { id: 'TRS', label: '?섎컻??濡쒓렇', icon: <Activity size={20} />, description: '?몃? ?곕룞 諛?諛곗튂 寃곌낵' },
];

interface LogItem {
  id: string;
  category: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  actor: string;
}

const recentLogs: LogItem[] = [
  { id: '1', category: 'SYS', timestamp: '2024-05-20 14:22:01', level: 'INFO', message: 'UserAccountService.findUserById executing...', actor: 'SYSTEM' },
  { id: '2', category: 'LGN', timestamp: '2024-05-20 14:21:45', level: 'INFO', message: 'Login successful for user admin', actor: 'admin' },
  { id: '3', category: 'USR', timestamp: '2024-05-20 14:20:12', level: 'WARN', message: 'Priority change detected for Task ID: 882', actor: 'manager_01' },
  { id: '4', category: 'ERROR', timestamp: '2024-05-20 14:18:33', level: 'ERROR', message: 'Connection timeout on internal-api-node-02', actor: 'BACKEND' },
  { id: '5', category: 'WEB', timestamp: '2024-05-20 14:15:01', level: 'INFO', message: 'GET /api/v1/banners - 200 OK', actor: '192.168.0.12' },
];

export default function LogDashboardPage() {
  const [activeCategory, setCategory] = useState('SYS');

  const columns: Column<LogItem>[] = [
    {
      header: '諛쒖깮 ?쒓컖',
      accessor: (item: any) => (
        <div className="flex items-center gap-3 py-3">
             <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white/40 shadow-sm">
                <Clock size={14} />
             </div>
             <span className="text-[11px] font-mono font-black text-slate-500 tracking-tighter italic">
                {item.timestamp}
             </span>
        </div>
      ),
      className: 'w-48'
    },
    {
      header: '濡쒓렇 踰붿＜',
      accessor: (item: any) => {
        const cat = logCategories.find(c => c.id === item.category);
        return (
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-slate-100 text-slate-400">
               {cat?.icon || <Terminal size={12} />}
            </div>
            <span className="text-[10px] font-black tracking-widest uppercase text-foreground">{cat?.label || '湲고?'}</span>
          </div>
        );
      },
      className: 'w-32'
    },
    {
      header: '?곹깭 ?섏?',
      accessor: (item: any) => (
        <HubStatusBadge 
          label={item.level} 
          variant={item.level === 'ERROR' ? 'error' : item.level === 'WARN' ? 'warning' : 'success'} 
          className="text-[9px] font-black tracking-widest px-3"
        />
      ),
      className: 'w-24'
    },
    {
      header: '硫붿떆吏 遺꾩꽍 ?댁뿭',
      accessor: (item: any) => (
        <div className="max-w-md">
            <p className="text-xs font-bold text-slate-600 truncate tracking-tight">{item.message}</p>
        </div>
      )
    },
    {
        header: '?섑뻾 二쇱껜',
        accessor: (item: any) => (
          <div className="px-3 py-1 bg-slate-50 border-2 border-slate-100 rounded-xl text-[10px] font-black tracking-widest text-slate-400 w-fit">
              {item.actor}
          </div>
        ),
        className: 'w-32'
    }
  ];

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="濡쒓렇 ?듯빀 ??쒕낫??
        breadcrumbs={[{ label: '?쒖뒪?쒓?由? }, { label: '濡쒓렇愿由? }]}
      />

      <HubHeader 
        title="?쒖뒪?? 
        highlight="濡쒓렇 ?듯빀 愿由? 
        subtitle="?쒖뒪???꾨컲?먯꽌 諛쒖깮?섎뒗 蹂댁븞, ?묒냽, ?쒕룞, ???붿껌 濡쒓렇瑜??듯빀?곸쑝濡?紐⑤땲?곕쭅?⑸땲??" 
        icon={History} 
        actions={
          <div className="flex gap-4">
             <Button variant="outline" size="lg" className="h-14 px-8 rounded-2xl border-2 font-black text-[10px] tracking-widest uppercase gap-3">
                <SearchCode size={18} /> ?곸꽭 濡쒓렇 寃??             </Button>
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="?ㅻ뒛 ?꾩껜 濡쒓렇" value="1,492" icon={Database} color="primary" />
        <HubMetricCard title="蹂댁븞 ?꾪삊 濡쒓렇" value={3} icon={Lock} color="rose" status="?댁긽 吏뺥썑" />
        <HubMetricCard title="?쒖꽦 ?몄뀡" value={84} icon={Activity} color="emerald" status="?덉젙" />
        <HubMetricCard title="?됯퇏 吏???띾룄" value="38ms" icon={Zap} color="amber" />
      </HubMetricGrid>

      <div className="grid grid-cols-12 gap-12">
        <div className="col-span-12 lg:col-span-3">
          <div className="rounded-[3.5rem] bg-white border-2 border-slate-100 shadow-xl p-4 flex flex-col gap-3">
            {logCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={cn(
                  "w-full group p-6 rounded-[2.5rem] border-2 transition-all flex items-center gap-5 relative overflow-hidden",
                  activeCategory === cat.id 
                    ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.02] z-10" 
                    : "bg-transparent border-transparent hover:bg-slate-100 text-slate-400 hover:text-slate-900"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center transition-all shadow-lg",
                  activeCategory === cat.id ? "bg-white/10 text-white" : "bg-white text-slate-300 group-hover:bg-primary group-hover:text-white"
                )}>
                  {cat.icon}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[11px] font-black tracking-tighter uppercase leading-tight">{cat.label}</span>
                  <span className="text-[7px] font-bold text-slate-400 tracking-widest uppercase opacity-60 truncate max-w-[120px]">{cat.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-9">
          <HubSectionCard 
            title="?ㅼ떆媛?濡쒓렇 ?ㅽ듃由? 
            description="?쒖뒪???몃뱶?먯꽌 ?ㅼ떆媛꾩쑝濡??좎엯?섎뒗 ?듯빀 濡쒓렇??媛???ㅽ듃由??곗씠?곗엯?덈떎." 
            icon={Activity}
          >
            <StandardDataTable columns={columns} data={recentLogs} className="border-none bg-transparent" />
            <div className="mt-8 flex justify-center">
              <Button variant="ghost" className="font-black text-[10px] tracking-widest uppercase gap-3 hover:bg-slate-900 hover:text-white transition-all h-12 px-10 rounded-xl">
                 ?꾩껜 濡쒓렇 ?꾩뭅?대툕 議고쉶 <ArrowRight size={16} />
              </Button>
            </div>
          </HubSectionCard>
        </div>
      </div>
    </div>
  );
}
