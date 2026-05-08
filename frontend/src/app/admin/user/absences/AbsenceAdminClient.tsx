'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { absenceAdminService, UserAbsenceDto } from '@/services/foundation/user/AbsenceAdminService';
import {
  UserX,
  UserCheck,
  Search,
  RefreshCcw,
  User,
  CheckCircle2,
  Clock,
  Ghost,
  Activity,
  Zap,
  Fingerprint,
  Mail,
  Phone,
  ShieldCheck,
  SearchCode,
  ArrowUpRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function AbsenceAdminClient({
  initialUsers,
  initialAbsences
}: {
  initialUsers: any,
  initialAbsences: UserAbsenceDto[]
}) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState(initialUsers.list || []);
  const [absences, setAbsences] = useState(initialAbsences);
  const [searchKeyword, setSearchKeyword] = useState('');

  const getAbsenceStatus = (emplyrId: string) => {
    return absences.find(a => a.emplyrId === emplyrId)?.userAbsnceAt === 'Y';
  };

  const handleToggleAbsence = async (emplyrId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus ? 'Y' : 'N';
    try {
      await absenceAdminService.updateAbsence(emplyrId, newStatus);
      // 로컬 ?�태 ?�데?�트
      setAbsences(prev => {
        const existing = prev.find(a => a.emplyrId === emplyrId);
        if (existing) {
          return prev.map(a => a.emplyrId === emplyrId ? { ...a, userAbsnceAt: newStatus } : a);
        } else {
          return [...prev, { emplyrId, userAbsnceAt: newStatus }];
        }
      });
      toast.success(`${emplyrId} ?�용?�의 ?�로?�이 ${newStatus === 'Y' ? '부??모드' : '?�성 모드'}�??�환?�었?�니??`);
    } catch {
      toast.error('?�로???�기??�??�류가 발생?�습?�다.');
    }
  };

  const columns: Column<any>[] = [
    {
      header: '?�이?�티??리소??,
      accessor: (item: any) => {
        const isAbsent = getAbsenceStatus(item.emplyrId);
        return (
          <div className="flex items-center gap-6 py-4">
            <div className={cn(
              "w-16 h-12 rounded-lg flex items-center justify-center text-white shadow-2xl transition-all duration-700 relative overflow-hidden group-hover:scale-110",
              isAbsent ? "bg-slate-400 rotate-12" : "bg-slate-900 -rotate-3 group-hover:rotate-0"
            )}>
              {isAbsent ? <Ghost size={24} className="text-white animate-pulse" /> : <User size={24} className="text-primary" />}
              {isAbsent && (
                <div className="absolute inset-0 bg-white/10 blur-xl animate-pulse" />
              )}
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-muted-foreground/40 tracking-[0.4em] uppercase font-mono">_ RES_UID: {item.emplyrId}</span>
              <h4 className="text-lg font-bold tracking-tight text-foreground uppercase leading-none">{item.userNm}</h4>
            </div>
          </div>
        );
      },
      className: 'w-72'
    },
    {
      header: '커�??��??�션 ?�드?�인??,
      accessor: (item: any) => (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Mail size={12} className="text-muted-foreground/30" />
            <span className="text-xs font-bold text-muted-foreground tracking-tight uppercase ">{item.emailAdres || 'NOT_DECLARED'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone size={12} className="text-muted-foreground/30" />
            <span className="text-xs font-bold text-muted-foreground/60 tracking-tight">{item.moblphonNo || item.offmTelno || 'PROBING...'}</span>
          </div>
        </div>
      )
    },
    {
      header: '가?�성 ?�로??/ ?�리�?,
      accessor: (item: any) => {
        const isAbsent = getAbsenceStatus(item.emplyrId);
        return (
          <div className="flex items-center gap-6">
            <div className={cn(
              "flex items-center gap-3 px-6 py-2.5 rounded-lg border-2 transition-all min-w-[140px] justify-center shadow-sm",
              isAbsent ? "bg-rose-50 text-rose-600 border-rose-100/50" : "bg-emerald-50 text-emerald-600 border-emerald-100/50"
            )}>
              {isAbsent ? <Clock size={16} className="animate-pulse" /> : <CheckCircle2 size={16} />}
              <span className="text-xs font-bold tracking-widest uppercase ">{isAbsent ? 'STANDBY' : 'ONLINE'}</span>
            </div>
            <Switch
              checked={isAbsent}
              onCheckedChange={() => handleToggleAbsence(item.emplyrId, isAbsent)}
              className="data-[state=checked]:bg-rose-500 scale-125"
            />
          </div>
        );
      }
    }
  ];

  const totalAbsents = absences.filter(a => a.userAbsnceAt === 'Y').length;

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="부??관�??�퍼바이?�"
        breadcrumbs={[{ label: '?�스?��?�? }, { label: '?�용?��?�? }, { label: '부?��?�? }]}
      />

      <HubHeader
        title="가?�성"
        highlight="Matrix"
        subtitle="?�사 ?�적 리소?�의 ?�시�?가?�성 �?부???�로???�합 ?�어 ?�스??
        icon={UserX}
        actions={
          <div className="flex gap-4 p-2 items-center">
            <Button
              variant="ghost"
              className="h-11 w-14 rounded-lg bg-white border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-xl group active:scale-95"
            >
              <RefreshCcw size={22} className="group-hover:rotate-180 transition-transform duration-700" />
            </Button>
            <Button
              size="lg"
              className="h-11 px-10 rounded-lg bg-slate-900 border-none text-white font-bold text-xs tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3 group"
            >
              <Zap size={20} className="group-hover:animate-pulse" /> 가?�성 ?�로???�기??              <ArrowUpRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="TOTAL_RESOURCES" value={users.length} icon={User} color="primary" />
        <HubMetricCard title="OPERATIONAL_UNITS" value={users.length - totalAbsents} icon={UserCheck} color="emerald" status="ONLINE" />
        <HubMetricCard title="STANDBY_UNITS" value={totalAbsents} icon={Ghost} color="rose" status={totalAbsents > 0 ? "ALERT" : "?�정"} />
        <HubMetricCard title="SYSTEM_INTEGRITY" value="100%" icon={ShieldCheck} color="indigo" />
      </HubMetricGrid>

      <div className="grid grid-cols-12 gap-12">
        {/* Statistics & Search Panel */}
        <div className="col-span-12 lg:col-span-4 h-full">
          <div className="rounded-lg p-12 bg-slate-900 text-white shadow-2xl relative overflow-hidden group h-full border-none">
            <div className="absolute top-0 right-0 p-16 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
              <Fingerprint size={240} className="text-primary" />
            </div>
            <div className="relative z-10 space-y-12">
              <div className="space-y-3">
                <div className="w-16 h-12 rounded-lg bg-white/10 flex items-center justify-center border border-white/5 shadow-inner">
                  <Activity size={32} className="text-primary" />
                </div>
                <h4 className="text-3xl font-bold tracking-tight leading-tight uppercase text-primary text-left">가?�성<br />?�텔리전??/h4>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-white/30 tracking-[0.4em] px-2 uppercase font-mono text-left block">Resource_Query_Probe</label>
                  <div className="relative group/search">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within/search:text-primary transition-colors" size={20} />
                    <input
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      value={searchKeyword}
                      className="w-full h-12 pl-16 pr-8 bg-white/5 border-2 border-white/5 rounded-lg focus:border-primary/50 focus:bg-white/10 transition-all text-xs font-bold tracking-widest text-white outline-none placeholder:text-white/10 uppercase"
                      placeholder="리소??명칭 ?�는 UID ?�터�?
                    />
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                <p className="text-xs font-bold text-slate-400 leading-relaxed uppercase opacity-60 max-w-[200px] text-left">
                  * 모든 부???�로??변경사??? ?�업 매트�?��??즉시 ?�기?�됩?�다.
                </p>
                <Button
                  className="h-12 px-8 rounded-lg bg-white text-slate-900 border-none font-bold text-xs tracking-widest uppercase shadow-xl hover:bg-primary hover:text-white transition-all hover:-translate-y-1"
                >
                  SEARCH_RES
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Resources Availability Matrix */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">
          <HubSectionCard
            title="리소??가?�성 ?�태 매트�?��"
            description="?�적 리소?�의 ?�시�??�성/부???�태�??�시간으�?모니?�링?�고 ?�어?�니??
            icon={SearchCode}
          >
            <div className="overflow-hidden">
              <StandardDataTable
                columns={columns}
                data={users.filter((u: any) => String(u.userNm || '').includes(searchKeyword) || String(u.emplyrId || '').includes(searchKeyword))}
                loading={loading}
                emptyMessage="리소???�이?��? 분석 중입?�다..."
                className="border-none bg-transparent"
              />
            </div>
          </HubSectionCard>
        </div>
      </div>
    </div>
  );
}
