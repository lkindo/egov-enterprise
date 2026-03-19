'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { absenceAdminService, UserAbsenceDto } from '@/services/admin/user/AbsenceAdminService';
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
 Ghost
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
 // 로컬 상태 업데이트
 setAbsences(prev => {
 const existing = prev.find(a => a.emplyrId === emplyrId);
 if (existing) {
 return prev.map(a => a.emplyrId === emplyrId ? { ...a, userAbsnceAt: newStatus } : a);
 } else {
 return [...prev, { emplyrId, userAbsnceAt: newStatus }];
 }
 });
 toast.success(`${emplyrId} 사용자의 상태가 ${newStatus === 'Y' ? '부재' : '정상'}로 변경되었습니다.`);
 } catch (error) {
 toast.error('상태 변경에 실패했습니다.');
 }
 };

 const columns = [
 {
 header: '사용자 정보',
 accessor: (item: any) => (
 <div className="flex items-center gap-3">
 <div className={cn(
 "w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg transition-all",
 getAbsenceStatus(item.emplyrId) ? "bg-slate-400 rotate-12" : "bg-slate-900"
 )}>
 {getAbsenceStatus(item.emplyrId) ? <Ghost size={18} /> : <User size={18} />}
 </div>
 <div>
 <span className="font-black italic tracking-tighter text-slate-900 block">{item.userNm}</span>
 <span className="text-[9px] font-bold text-slate-400 tracking-tight italic">{item.emplyrId}</span>
 </div>
 </div>
 )
 },
 {
 header: '이메일 / 연락처',
 accessor: (item: any) => (
 <div className="space-y-1">
 <span className="text-[10px] font-bold text-slate-500 block italic">{item.emailAdres || 'N/A'}</span>
 <span className="text-[10px] font-bold text-slate-400 block tracking-tighter">{item.moblphonNo || item.offmTelno || 'N/A'}</span>
 </div>
 )
 },
 {
 header: '부재 상태 (Active Protocol)',
 accessor: (item: any) => {
 const isAbsent = getAbsenceStatus(item.emplyrId);
 return (
 <div className="flex items-center gap-4">
 <div className={cn(
 "flex items-center gap-2 px-3 py-1 rounded-full border transition-all min-w-[100px] justify-center",
 isAbsent ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
 )}>
 {isAbsent ? <Clock size={12} className="animate-pulse" /> : <CheckCircle2 size={12} />}
 <span className="text-[9px] font-black tracking-tight italic">{isAbsent ? 'Absent' : 'Available'}</span>
 </div>
 <Switch 
 checked={isAbsent} 
 onCheckedChange={() => handleToggleAbsence(item.emplyrId, isAbsent)}
 className="data-[state=checked]:bg-rose-500"
 />
 </div>
 );
 }
 }
 ];

 return (
 <div className="max-w-6xl mx-auto space-y-12 px-4 md:px-0 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
 <PageHeader
 title="부재 관리 인텔리전스"
 breadcrumbs={[{ label: '시스템관리' }, { label: '사용자관리' }, { label: '부재관리' }]}
 actions={
 <Button
 variant="outline"
 className="h-14 w-14 rounded-2xl border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-md active:scale-95"
 >
 <RefreshCcw size={18} />
 </Button>
 }
 />

 {/* Luxury Stats Overview */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
 <div className="p-10 rounded-[3rem] bg-white border-2 border-slate-100 shadow-xl shadow-slate-900/5 group hover:scale-[1.02] transition-all cursor-default relative overflow-hidden">
 <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center mb-8 shadow-xl group-hover:rotate-12 transition-transform">
 <User size={24} />
 </div>
 <h4 className="text-4xl font-black tracking-tighter italic tabular-nums text-slate-900">{users.length.toLocaleString()}</h4>
 <p className="text-[10px] font-black text-slate-400 tracking-[0.3em] mt-2 italic flex items-center gap-2">
 <span className="w-4 h-0.5 bg-slate-200" />
 Total Resources
 </p>
 </div>

 <div className="p-10 rounded-[3rem] bg-emerald-50 border-2 border-emerald-100 shadow-xl shadow-emerald-900/5 group hover:scale-[1.02] transition-all cursor-default relative overflow-hidden">
 <div className="w-14 h-14 rounded-2xl bg-white text-emerald-600 flex items-center justify-center mb-8 shadow-sm group-hover:rotate-12 transition-transform">
 <UserCheck size={24} />
 </div>
 <h4 className="text-4xl font-black tracking-tighter italic tabular-nums text-emerald-600">
 {(users.length - absences.filter(a => a.userAbsnceAt === 'Y').length).toLocaleString()}
 </h4>
 <p className="text-[10px] font-black text-emerald-400 tracking-[0.3em] mt-2 italic flex items-center gap-2">
 <span className="w-4 h-0.5 bg-emerald-200" />
 Operational Units
 </p>
 </div>

 <div className="p-10 rounded-[3rem] bg-rose-50 border-2 border-rose-100 shadow-xl shadow-rose-900/5 group hover:scale-[1.02] transition-all cursor-default relative overflow-hidden">
 <div className="w-14 h-14 rounded-2xl bg-white text-rose-600 flex items-center justify-center mb-8 shadow-sm group-hover:rotate-12 transition-transform">
 <UserX size={24} />
 </div>
 <h4 className="text-4xl font-black tracking-tighter italic tabular-nums text-rose-600">
 {absences.filter(a => a.userAbsnceAt === 'Y').length.toLocaleString()}
 </h4>
 <p className="text-[10px] font-black text-rose-400 tracking-[0.3em] mt-2 italic flex items-center gap-2">
 <span className="w-4 h-0.5 bg-rose-200" />
 Standby Protocols
 </p>
 </div>
 </div>

 {/* Main Content Area */}
 <div className="responsive-card p-6 md:p-12 border-2 border-slate-100 bg-white/50 backdrop-blur-xl relative overflow-hidden group">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 relative z-10">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg">
 <ShieldAlert size={24} />
 </div>
 <div>
 <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter italic">Status Matrix</h3>
 <p className="text-[9px] font-black text-slate-400 tracking-[0.3em]">Resource Availability Control</p>
 </div>
 </div>
 <div className="flex items-center gap-4">
 <div className="relative">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
 <Input
 placeholder="FILTER RESOURCES..."
 value={searchKeyword}
 onChange={(e) => setSearchKeyword(e.target.value)}
 className="h-14 pl-12 pr-6 w-full md:w-[300px] rounded-2xl border-2 border-slate-100 font-black text-[10px] tracking-tight focus:ring-4 focus:ring-primary/10 transition-all bg-white"
 />
 </div>
 </div>
 </div>

 <div className="px-2 overflow-x-auto relative z-10">
 <StandardDataTable
 columns={columns}
 data={users}
 loading={loading}
 emptyMessage="리소스 데이터를 분석 중입니다..."
 className="border-none bg-slate-50/50 rounded-[3rem] p-8"
 />
 </div>
 </div>
 </div>
 );
}
