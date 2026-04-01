'부재';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import { absenceAdminService, UserAbsenceDto } from '@/services/foundation/user/AbsenceAdminService';
import {
  UserX,
  UserCheck,
  Search,
  RefreshCcw,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Ghost,
  Activity,
  Zap,
  Fingerprint,
  Mail,
  Phone,
  Settings,
  ShieldCheck,
  SearchCode,
  ArrowUpRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

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
      // 濡쒖뺄 ?곹깭 ?낅뜲?댄듃
      setAbsences(prev => {
        const existing = prev.find(a => a.emplyrId === emplyrId);
        if (existing) {
          return prev.map(a => a.emplyrId === emplyrId ? { ...a, userAbsnceAt: newStatus } : a);
        } else {
          return [...prev, { emplyrId, userAbsnceAt: newStatus }];
        }
      });
      toast.success(`${emplyrId} ?ъ슜?먯쓽 ?꾨줈?좎퐳님${newStatus === 'Y' ? '遺님紐⑤뱶' : '활성 紐⑤뱶'}濡님꾪솚?섏뿀?듬땲님`);
    } catch {
      toast.error('?꾨줈?좎퐳 ?숆린님以님ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.');
    }
  };

  const columns: Column<any>[] = [
    {
      header: '?꾩씠?댄떚님由ъ냼님,
      accessor: (item: any) => {
        const isAbsent = getAbsenceStatus(item.emplyrId);
        return (
          <div className="flex items-center gap-6 py-4">
            <div className={cn(
              "w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl transition-all duration-700 relative overflow-hidden group-hover:scale-110",
              isAbsent ? "bg-slate-400 rotate-12" : "bg-slate-900 -rotate-3 group-hover:rotate-0"
            )}>
              {isAbsent ? <Ghost size={24} className="text-white animate-pulse" /> : <User size={24} className="text-primary" />}
              {isAbsent && (
                <div className="absolute inset-0 bg-white/10 blur-xl animate-pulse" />
              )}
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-black text-muted-foreground/40 tracking-[0.4em] uppercase font-mono italic">RES_UID: {item.emplyrId}</span>
              <h4 className="text-lg font-black tracking-tighter text-foreground uppercase leading-none">{item.userNm}</h4>
            </div>
          </div>
        );
      },
      className: 'w-72'
    },
    {
      header: '而ㅻ님덉님댁뀡 ?붾뱶?ъ씤님,
      accessor: (item: any) => (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Mail size={12} className="text-muted-foreground/30" />
            <span className="text-[10px] font-bold text-muted-foreground tracking-tight uppercase ">{item.emailAdres || 'NOT_DECLARED'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone size={12} className="text-muted-foreground/30" />
            <span className="text-[10px] font-black text-muted-foreground/60 tracking-tighter">{item.moblphonNo || item.offmTelno || 'PROBING...'}</span>
          </div>
        </div>
      )
    },
    {
      header: '이메일 / 연락처',
      accessor: (item: any) => {
        const isAbsent = getAbsenceStatus(item.emplyrId);
        return (
          <div className="flex items-center gap-6">
            <div className={cn(
              "flex items-center gap-3 px-6 py-2.5 rounded-2xl border-2 transition-all min-w-[140px] justify-center shadow-sm",
              isAbsent ? "bg-rose-50 text-rose-600 border-rose-100/50" : "bg-emerald-50 text-emerald-600 border-emerald-100/50"
            )}>
              {isAbsent ? <Clock size={16} className="animate-pulse" /> : <CheckCircle2 size={16} />}
              <span className="text-[10px] font-black tracking-widest uppercase ">{isAbsent ? 'STANDBY' : 'ONLINE'}</span>
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
        title="遺님愿由님ㅽ띁?덉씠님
        breadcrumbs={[{ label: '?쒖뒪?쒓?由? }, { label: '?ъ슜?먭?由? }, { label: '遺님愿由? }]}
      />

      <HubHeader
        title="媛?⑹꽦"
        highlight="Matrix"
        subtitle="?꾩궗 ?몄쟻 由ъ냼?ㅼ쓽 실시간媛?⑹꽦 諛?遺님?꾨줈?좎퐳 ?듯빀 ?쒖뼱 ?쒖뒪님
        icon={UserX}
        actions={
          <div className="flex gap-4 p-2 items-center">
            <Button
              variant="ghost"
              className="h-14 w-14 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-xl group active:scale-95"
            >
              <RefreshCcw size={22} className="group-hover:rotate-180 transition-transform duration-700" />
            </Button>
            <Button
              size="lg"
              className="h-14 px-10 rounded-2xl bg-slate-900 border-none text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3 group"
            >
              <Zap size={20} className="group-hover:animate-pulse" /> 媛?⑹꽦 ?꾨줈?좎퐳 ?숆린님              <ArrowUpRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="TOTAL_RESOURCES" value={users.length} icon={User} color="primary" />
        <HubMetricCard title="OPERATIONAL_UNITS" value={users.length - totalAbsents} icon={UserCheck} color="emerald" status="ONLINE" />
        <HubMetricCard title="STANDBY_UNITS" value={totalAbsents} icon={Ghost} color="rose" status={totalAbsents > 0 ? "ALERT" : "?덉젙"} />
        <HubMetricCard title="SYSTEM_INTEGRITY" value="100%" icon={ShieldCheck} color="indigo" />
      </HubMetricGrid>

      <div className="grid grid-cols-12 gap-12">
        {/* Statistics & Search Panel */}
        <div className="col-span-12 lg:col-span-4 h-full">
          <div className="rounded-[3.5rem] p-12 bg-slate-900 text-white shadow-2xl relative overflow-hidden group h-full border-none">
            <div className="absolute top-0 right-0 p-16 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
              <Fingerprint size={240} className="text-primary" />
            </div>
            <div className="relative z-10 space-y-12">
              <div className="space-y-3">
                <div className="w-16 h-16 rounded-[1.5rem] bg-white/10 flex items-center justify-center border border-white/5 shadow-inner">
                  <Activity size={32} className="text-primary" />
                </div>
                <h4 className="text-3xl font-black tracking-tighter leading-tight uppercase text-primary">媛?⑹꽦<br />?명뀛由ъ쟾님/h4>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-white/30 tracking-[0.4em] px-2 uppercase font-mono">Resource_Query_Probe</label>
                  <div className="relative group/search">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within/search:text-primary transition-colors" size={20} />
                    <input
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      value={searchKeyword}
                      className="w-full h-16 pl-16 pr-8 bg-white/5 border-2 border-white/5 rounded-2xl focus:border-primary/50 focus:bg-white/10 transition-all text-xs font-black tracking-widest text-white outline-none placeholder:text-white/10 uppercase"
                      placeholder="由ъ냼님紐낆묶 ?먮뒗 UID ?꾪꽣留?
                    />
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-500 leading-relaxed italic uppercase opacity-60 max-w-[200px]">
                  * 紐⑤뱺 遺님?꾨줈?좎퐳 蹂寃쎌궗님? ?묒뾽 留ㅽ듃由?뒪님利됱떆 ?숆린?붾맗?덈떎.
                </p>
                <Button
                  className="h-12 px-8 rounded-2xl bg-white text-slate-900 border-none font-black text-[10px] tracking-widest uppercase shadow-xl hover:bg-primary hover:text-white transition-all hover:-translate-y-1"
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
            title="由ъ냼님媛?⑹꽦 ?곹깭 留ㅽ듃由?뒪"
            description="?몄쟻 由ъ냼?ㅼ쓽 ?ㅼ떆媛님쒖꽦/遺님?곹깭瑜님ㅼ떆媛꾩쑝濡?紐⑤땲?곕쭅?섍퀬 ?쒖뼱?⑸땲님"
            icon={SearchCode}
          >
            <div className="overflow-hidden">
              <StandardDataTable
                columns={columns}
                data={users.filter((u: any) => u.userNm.includes(searchKeyword) || u.emplyrId.includes(searchKeyword))}
                loading={loading}
                emptyMessage="리소스 데이터를 분석 중입니다..."
                className="border-none bg-transparent"
              />
            </div>
          </HubSectionCard>
        </div>
      </div>
    </div>
  );
}

