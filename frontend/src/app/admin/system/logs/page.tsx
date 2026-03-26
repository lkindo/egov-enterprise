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
  Zap,
  Lock,
  Globe,
  UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// Mock data for integrated log dashboard
const logCategories = [
  { id: 'SYS', label: '시스템 로그', icon: <Terminal size={20} />, description: '서비스 및 메소드 실행 이력' },
  { id: 'LGN', label: '로그인 로그', icon: <Lock size={20} />, description: '사용자 접속 및 인증 기록' },
  { id: 'USR', label: '사용자 활동', icon: <UserCheck size={20} />, description: '데이터 변경 및 권한 추적' },
  { id: 'WEB', label: '웹 로그', icon: <Globe size={20} />, description: 'HTTP 요청 및 데이터 분석' },
  { id: 'TRS', label: '송수신 로그', icon: <Activity size={20} />, description: '외부 연동 및 배치 결과' },
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
  { id: '4', category: 'SYS', timestamp: '2024-05-20 14:18:33', level: 'ERROR', message: 'Connection timeout on internal-api-node-02', actor: 'BACKEND' },
  { id: '5', category: 'WEB', timestamp: '2024-05-20 14:15:01', level: 'INFO', message: 'GET /api/v1/banners - 200 OK', actor: '192.168.0.12' },
];

export default function LogDashboardPage() {
  const [activeCategory, setCategory] = useState('SYS');

  const columns: Column<LogItem>[] = [
    {
      header: '발생 시각',
      accessor: (item: LogItem) => (
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
      header: '로그 범주',
      accessor: (item: LogItem) => {
        const cat = logCategories.find(c => c.id === item.category);
        return (
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-slate-100 text-slate-400">
               {cat?.icon || <Terminal size={12} />}
            </div>
            <span className="text-[10px] font-black tracking-widest uppercase text-foreground">{cat?.label || '기타'}</span>
          </div>
        );
      },
      className: 'w-32'
    },
    {
      header: '상태 수준',
      accessor: (item: LogItem) => (
        <HubStatusBadge 
          label={item.level} 
          variant={item.level === 'ERROR' ? 'error' : item.level === 'WARN' ? 'warning' : 'success'} 
          className="text-[9px] font-black tracking-widest px-3"
        />
      ),
      className: 'w-24'
    },
    {
      header: '메시지 분석 내역',
      accessor: (item: LogItem) => (
        <div className="max-w-md">
            <p className="text-xs font-bold text-slate-600 truncate tracking-tight">{item.message}</p>
        </div>
      )
    },
    {
        header: '수행 주체',
        accessor: (item: LogItem) => (
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
        title="로그 통합 대시보드"
        breadcrumbs={[{ label: '시스템관리' }, { label: '로그관리' }]}
      />

      <HubHeader 
        title="시스템" 
        highlight="로그 통합 관리" 
        subtitle="시스템 전반에서 발생하는 보안, 접속, 활동, 웹 요청 로그를 통합적으로 모니터링합니다." 
        icon={History} 
        actions={
          <div className="flex gap-4">
             <Button variant="outline" size="lg" className="h-14 px-8 rounded-2xl border-2 font-black text-[10px] tracking-widest uppercase gap-3">
                <SearchCode size={18} /> 상세 로그 검색
             </Button>
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="오늘 전체 로그" value="1,492" icon={Database} color="primary" />
        <HubMetricCard title="보안 위협 로그" value="3" icon={Lock} color="rose" status="이상 징후" />
        <HubMetricCard title="활성 세션" value="84" icon={Activity} color="emerald" status="안전" />
        <HubMetricCard title="평균 지연 속도" value="38ms" icon={Zap} color="amber" />
      </HubMetricGrid>

      <div className="grid grid-cols-12 gap-12">
        <div className="col-span-12 lg:col-span-3">
          <div className="rounded-[3.5rem] bg-white border-2 border-slate-100 shadow-xl p-4 flex flex-col gap-3" id="log-categories">
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
            title="실시간 로그 스트림" 
            description="시스템 노드에서 실시간으로 유입되는 통합 로그의 가시성 스트림 데이터입니다." 
            icon={Activity}
          >
            <StandardDataTable columns={columns} data={recentLogs} className="border-none bg-transparent" />
            <div className="mt-8 flex justify-center">
              <Button variant="ghost" className="font-black text-[10px] tracking-widest uppercase gap-3 hover:bg-slate-900 hover:text-white transition-all h-12 px-10 rounded-xl">
                 전체 로그 아카이빙 조회 <ArrowRight size={16} />
              </Button>
            </div>
          </HubSectionCard>
        </div>
      </div>
    </div>
  );
}
