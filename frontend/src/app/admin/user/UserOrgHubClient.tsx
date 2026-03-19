'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
 Users, 
 Network, 
 UserMinus, 
 ShieldCheck, 
 Search, 
 Plus, 
 Pencil, 
 UserPlus, 
 Building2, 
 FileCheck, 
 Activity, 
 ChevronRight,
 Lock,
 Settings,
 UserCog,
 MapPin,
 Mail,
 Phone,
 RefreshCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { userAdminService } from '@/services/admin/system/UserAdminService';
import { UserManage } from '@/types/user';
import { deptAdminService, Department } from '@/services/admin/system/DeptAdminService';
import { useToast } from '@/app/components/ui/toast';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
type UserOrgTab = 'USERS' | 'DEPTS' | 'ABSENCES' | 'POLICIES';

export default function UserOrgHubClient({ defaultTab = 'USERS' }: { defaultTab?: UserOrgTab }) {
 const queryClient = useQueryClient();
 const { toast } = useToast();
 const [activeTab, setActiveTab] = useState<UserOrgTab>(defaultTab);
 const [searchKeyword, setSearchKeyword] = useState('');
 const [selectedItemId, setSelectedItemId] = useState<string | number | null>(null);

 // --- Queries ---

 // 1. Users
 const { data: usersData, isLoading: isUsersLoading } = useQuery({
 queryKey: ['admin-users', searchKeyword],
 queryFn: () => userAdminService.getUserList({ page번호: 1, searchKeyword }),
 enabled: activeTab === 'USERS' || activeTab === 'ABSENCES'
 });
 const users = usersData?.list || [];

 // 2. Departments
 const { data: deptsData, isLoading: isDeptsLoading } = useQuery({
 queryKey: ['admin-depts', searchKeyword],
 queryFn: () => deptAdminService.getDeptList({ page번호: 1, searchKeyword }),
 enabled: activeTab === 'DEPTS'
 });
 const departments = deptsData?.list || [];

 // --- Handlers ---
 const selectedItem = useMemo(() => {
 if (!selectedItemId) return null;
 if (activeTab === 'USERS' || activeTab === 'ABSENCES') return users.find(u => u.esntlId === selectedItemId);
 if (activeTab === 'DEPTS') return departments.find(d => d.orgnztId === selectedItemId);
 return null;
 }, [selectedItemId, activeTab, users, departments]);

 // --- Renderers ---

 const renderUserList = () => (
 <div className="space-y-3">
 {isUsersLoading && <div className="p-10 text-center opacity-40">사용자 데이터를 불러오는 중...</div>}
 {users.map((user) => (
 <div 
 key={user.esntlId}
 onClick={() => setSelectedItemId(user.esntlId || null)}
 className={cn(
 "group p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer flex items-center justify-between",
 selectedItemId === user.esntlId 
 ? "bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]" 
 : "bg-white border-transparent hover:border-slate-50 text-slate-600 shadow-sm"
 )}
 >
 <div className="flex items-center gap-6">
 <div className={cn(
 "w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg",
 selectedItemId === user.esntlId ? "bg-white/10 text-white" : "bg-slate-100 text-slate-400"
 )}>
 {user.userNm?.[0]}
 </div>
 <div className="space-y-1">
 <h4 className={cn("text-sm font-black italic", selectedItemId === user.esntlId ? "text-white" : "text-slate-900 tracking-tighter")}>
 {user.userNm}
 </h4>
 <p className={cn("text-[9px] font-black tracking-tight opacity-40")}>{user.userId} • {user.orgnztId || '부서 없음'}</p>
 </div>
 </div>
 <ChevronRight size={18} className={cn("transition-transform", selectedItemId === user.esntlId ? "rotate-90 text-primary" : "text-slate-200")} />
 </div>
 ))}
 </div>
 );

 const renderDeptList = () => (
 <div className="space-y-3">
 {isDeptsLoading && <div className="p-10 text-center opacity-40">부서 데이터를 불러오는 중...</div>}
 {departments.map((dept) => (
 <div 
 key={dept.orgnztId}
 onClick={() => setSelectedItemId(dept.orgnztId)}
 className={cn(
 "group p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer flex items-center justify-between",
 selectedItemId === dept.orgnztId 
 ? "bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]" 
 : "bg-white border-transparent hover:border-slate-50 text-slate-600 shadow-sm"
 )}
 >
 <div className="flex items-center gap-6">
 <div className={cn(
 "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg",
 selectedItemId === dept.orgnztId ? "bg-primary/20 text-white" : "bg-indigo-50 text-indigo-400"
 )}>
 <Building2 size={24} />
 </div>
 <div className="space-y-1">
 <h4 className={cn("text-sm font-black italic", selectedItemId === dept.orgnztId ? "text-white" : "text-slate-900 tracking-tighter")}>
 {dept.orgnztNm}
 </h4>
 <p className={cn("text-[8px] font-black tracking-tight opacity-40")}>부서 ID: {dept.orgnztId}</p>
 </div>
 </div>
 <ChevronRight size={18} className={cn("transition-transform", selectedItemId === dept.orgnztId ? "rotate-90 text-primary" : "text-slate-200")} />
 </div>
 ))}
 </div>
 );

 return (
 <div className="space-y-10 pb-20 animate-in fade-in duration-1000">
 {/* --- Header --- */}
 <div className="flex items-center justify-between px-4">
 <div className="flex items-center gap-4">
 <div className="w-14 h-14 bg-slate-900 rounded-3xl flex items-center justify-center shadow-2xl skew-x-2">
 <UserCog size={28} className="text-white" />
 </div>
 <div>
 <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic leading-none">
 기업 조직 허브
 </h2>
 <p className="text-[10px] font-black text-slate-400 tracking-[0.3em] mt-2 italic">
 통합 ID 및 조직 관리 센터
 </p>
 </div>
 </div>
 <div className="flex gap-4">
 <Button variant="outline" className="h-14 px-6 rounded-2xl border-2 font-black tracking-tight gap-2">
 <Settings size={18} /> 허브 설정
 </Button>
 <Button className="h-14 px-8 rounded-2xl bg-indigo-600 text-white font-black tracking-tight shadow-xl shadow-indigo-200 hover:-translate-y-1 transition-all gap-2">
 {activeTab === 'DEPTS' ? <Plus size={20} /> : <UserPlus size={20} />}
 {activeTab === 'DEPTS' ? '신규 부서 등록' : activeTab === 'ABSENCES' ? '부재 등록' : '사용자 등록'}
 </Button>
 </div>
 </div>

 <div className="grid grid-cols-12 gap-8 px-2 min-h-[800px]">
 
 {/* --- Left Column: Navigation (20%) --- */}
 <div className="col-span-12 lg:col-span-3 space-y-6">
 <Card className="rounded-[3rem] border-0 bg-white shadow-2xl p-4 ring-1 ring-slate-100 overflow-hidden">
 <NavButton icon={<Users size={20} />} label="사용자" active={activeTab === 'USERS'} onClick={() => { setActiveTab('USERS'); setSelectedItemId(null); }} />
 <NavButton icon={<Network size={20} />} label="부서 관리" active={activeTab === 'DEPTS'} onClick={() => { setActiveTab('DEPTS'); setSelectedItemId(null); }} />
 <NavButton icon={<UserMinus size={20} />} label="부재 관리" active={activeTab === 'ABSENCES'} onClick={() => { setActiveTab('ABSENCES'); setSelectedItemId(null); }} />
 <NavButton icon={<ShieldCheck size={20} />} label="조직 정책" active={activeTab === 'POLICIES'} onClick={() => { setActiveTab('POLICIES'); setSelectedItemId(null); }} />
 </Card>

 <Card className="rounded-[3rem] border-0 bg-slate-900 text-white shadow-2xl p-10 space-y-6 text-center">
 <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
 <Activity size={32} className="text-primary" />
 </div>
 <h4 className="text-lg font-black italic tracking-tighter leading-tight">전체 인력 분석</h4>
 <p className="text-[9px] text-white/40 font-black tracking-tight">액티브 디렉토리 동기화됨</p>
 </Card>
 </div>

 {/* --- Center Column: Data List (35%) --- */}
 <div className="col-span-12 lg:col-span-4 h-full flex flex-col gap-6">
 <Card className="flex-1 rounded-[3.5rem] border-0 bg-white shadow-2xl overflow-hidden flex flex-col ring-1 ring-slate-100">
 <CardHeader className="bg-slate-50/50 border-b p-10 space-y-8">
 <div className="flex items-center justify-between">
 <CardTitle className="text-[10px] font-black text-slate-400 tracking-[0.4em] italic leading-tight">
 ID 저장소
 </CardTitle>
 <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries()} className="h-8 text-[9px] font-black tracking-tight gap-2">
 <RefreshCcw size={12} /> 동기화
 </Button>
 </div>
 <div className="flex gap-4">
 <div className="relative flex-1 group">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
 <Input 
 className="pl-12 h-14 bg-white border-slate-100 rounded-2xl text-sm font-bold shadow-sm" 
 placeholder="목록 검색..." 
 value={searchKeyword}
 onChange={(e) => setSearchKeyword(e.target.value)}
 />
 </div>
 </div>
 </CardHeader>
 <CardContent className="flex-1 overflow-y-auto p-6">
 <AnimatePresence mode="wait">
 <motion.div
 key={activeTab}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -10 }}
 >
 {activeTab === 'DEPTS' ? renderDeptList() : renderUserList()}
 </motion.div>
 </AnimatePresence>
 </CardContent>
 </Card>
 </div>

 {/* --- Right Column: Detail/Deep Control (45%) --- */}
 <div className="col-span-12 lg:col-span-5 h-full">
 <AnimatePresence mode="wait">
 {selectedItemId ? (
 <motion.div 
 key={selectedItemId}
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -20 }}
 className="h-full flex flex-col gap-8"
 >
 <Card className="flex-1 rounded-[4rem] border-0 bg-white shadow-2xl flex flex-col ring-1 ring-slate-100 overflow-hidden relative">
 <CardHeader className="bg-slate-50/50 p-12 border-b">
 <div className="flex items-start justify-between">
 <div className="flex items-start gap-8">
 <div className="w-24 h-24 bg-slate-900 rounded-[2rem] flex items-center justify-center font-black text-4xl text-white shadow-2xl rotate-3">
 {activeTab === 'DEPTS' ? (selectedItem as Department)?.orgnztNm?.[0] : (selectedItem as UserManage)?.userNm?.[0]}
 </div>
 <div className="space-y-4 pt-2">
 <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic leading-none truncate max-w-[300px]">
 {activeTab === 'DEPTS' ? (selectedItem as Department)?.orgnztNm : (selectedItem as UserManage)?.userNm}
 </h2>
 <div className="flex gap-3">
 <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-3 py-1 rounded-full tracking-tighter italic">기본 정보</span>
 {activeTab === 'ABSENCES' && <span className="bg-amber-50 text-amber-600 text-[10px] font-black px-3 py-1 rounded-full tracking-tighter italic border border-amber-100">부재 상태</span>}
 </div>
 </div>
 </div>
 <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-slate-50"><Pencil size={20} /></Button>
 </div>
 </CardHeader>
 
 <CardContent className="flex-1 p-12 space-y-12 overflow-y-auto">
 <div className="grid grid-cols-2 gap-8">
 <InfoBlock icon={<Mail size={14} />} label="공식 이메일" value={(selectedItem as any)?.email || 'N/A'} />
 <InfoBlock icon={<Phone size={14} />} label="연락처" value={(selectedItem as any)?.moblphonNo || 'N/A'} />
 <InfoBlock icon={<Building2 size={14} />} label="소속 조직" value={(selectedItem as any)?.orgnztId || 'Enterprise'} />
 <InfoBlock icon={<MapPin size={14} />} label="근무지 / 지역" value="본사 클러스터" />
 </div>

 <div className="pt-10 border-t space-y-8">
 <div className="flex items-center justify-between">
 <h4 className="text-[11px] font-black text-slate-400 tracking-[0.3em] flex items-center gap-2 italic">
 <Lock size={14} className="text-primary" /> 활성 권한
 </h4>
 <Button variant="ghost" className="h-8 text-[9px] font-black text-primary gap-2 italic">설정 <ChevronRight size={10} /></Button>
 </div>
 <div className="flex flex-wrap gap-3">
 {['ACCESS_CMS', 'EDIT_WIKI', 'VIEW_METRICS', 'AUTH_ADMIN'].map(p => (
 <div key={p} className="px-4 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl text-[10px] font-black text-slate-600 tracking-tighter">
 {p}
 </div>
 ))}
 </div>
 </div>

 <div className="flex gap-6 mt-auto pt-6">
 <Button className="flex-1 h-14 bg-slate-100 text-slate-900 rounded-2xl font-black tracking-tight text-[10px] hover:bg-slate-200">권한 회수</Button>
 <Button className="flex-[2] h-14 bg-indigo-600 text-white rounded-2xl font-black tracking-[0.3em] text-[10px] shadow-2xl shadow-indigo-900/20">
 ID 설정 저장
 </Button>
 </div>
 </CardContent>
 <div className="h-24 bg-slate-900 flex items-center justify-between px-12">
 <div className="flex gap-1.5">
 {[1,2,3,4,5].map(i => <div key={i} className="w-1 h-3 bg-white/20 rounded-full" />)}
 </div>
 <span className="text-[10px] font-black text-white/30 tracking-[0.5em] italic">ID 프로토콜 v4.0</span>
 </div>
 </Card>
 </motion.div>
 ) : (
 <div className="h-full flex flex-col items-center justify-center p-20 text-center opacity-30 select-none grayscale bg-white rounded-[4rem] border-2 border-dashed border-slate-200">
 <Users size={64} className="mb-8" />
 <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic">항목이 선택되지 않음</h3>
 <p className="text-[10px] font-bold text-slate-400 tracking-[0.5em] mt-2">기업 디렉토리에 접근 중</p>
 </div>
 )}
 </AnimatePresence>
 </div>
 </div>
 </div>
 );
}

// --- Sub-components ---

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
 return (
 <button 
 onClick={onClick}
 className={cn(
 "w-full group p-6 rounded-[2.5rem] border-2 transition-all flex items-center gap-5",
 active 
 ? "bg-slate-900 border-slate-900 text-white shadow-xl" 
 : "bg-white border-transparent hover:border-slate-50 text-slate-500 hover:text-slate-900"
 )}
 >
 <div className={cn(
 "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
 active ? "bg-white/10 text-white" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
 )}>
 {icon}
 </div>
 <span className="text-[11px] font-black tracking-tight italic">{label}</span>
 </button>
 );
}

function InfoBlock({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
 return (
 <div className="space-y-3">
 <h5 className="text-[9px] font-black text-slate-400 tracking-tight italic flex items-center gap-2">
 {icon} {label}
 </h5>
 <p className="text-lg font-black tracking-tighter italic text-slate-900 truncate">
 {value}
 </p>
 </div>
 );
}
