'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { useToast } from '@/app/components/ui/toast';
import { ShieldCheck, Users, ChevronRight, Key, Save, Search, Info, CheckCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { deptAdminService, Department } from '@/services/admin/system/DeptAdminService';
import { deptAuthorityAdminService } from '@/services/admin/system/DeptAuthorityAdminService';
import { AuthorInfo, authorAdminService } from '@/services/admin/system/AuthorAdminService';

const DEPTS_KEY = ['admin', 'departments'] as const;
const ROLES_KEY = ['admin', 'authorities'] as const;

export default function DeptAuthorityPage() {
 const queryClient = useQueryClient();
 const { toast } = useToast();
 const [selectedDept, setSelectedDept] = useState<string | null>(null);
 const [searchKeyword, setSearchKeyword] = useState('');
 const [selectedAuthorCode, setSelectedAuthorCode] = useState<string | null>(null);

 // [async-parallel] 독립 API (부서, 권한 목록) 개별 useQuery
 const { data: deptsData, isLoading: deptsLoading } = useQuery({
 queryKey: DEPTS_KEY,
 queryFn: () => deptAdminService.getDeptList(),
 staleTime: 5 * 60 * 1000,
 });

 const { data: rolesData, isLoading: rolesLoading } = useQuery({
 queryKey: ROLES_KEY,
 queryFn: () => authorAdminService.getAuthorList(),
 staleTime: 5 * 60 * 1000,
 });

 const depts: Department[] = (deptsData as any)?.list || (deptsData as any)?.resultList || deptsData || [];
 const roles: AuthorInfo[] = (rolesData as any)?.list || (rolesData as any)?.resultList || rolesData || [];

 const filteredDepts = depts.filter(d =>
 d.orgnztNm.toLocaleLowerCase().includes(searchKeyword.toLocaleLowerCase()) ||
 d.orgnztId.toLocaleLowerCase().includes(searchKeyword.toLocaleLowerCase())
 );

 const loading = deptsLoading || rolesLoading;

 const saveMutation = useMutation({
 mutationFn: (authorCode: string) =>
 deptAuthorityAdminService.updateDeptAuthorities({
 deptId: selectedDept!,
 authorCode,
 allMembers: true
 }),
 onSuccess: () => {
 toast('부서 전체 사용자에게 권한이 일괄 부여되었습니다.', 'success');
 setSelectedAuthorCode(null);
 },
 onError: () => toast('권한 저장 중 오류가 발생했습니다.', 'error')
 });

 const columns = [
 {
 header: '권한 코드',
 accessor: (item: AuthorInfo) => item.authorCode,
 className: 'font-mono text-sm font-bold text-primary truncate'
 },
 {
 header: '권한 명칭',
 accessor: (item: AuthorInfo) => item.authorNm,
 className: 'font-bold text-foreground overflow-hidden whitespace-nowrap overflow-ellipsis'
 },
 {
 header: '부여 선택',
 className: 'text-center w-24',
 accessor: (item: AuthorInfo) => {
 const isSelected = selectedAuthorCode === item.authorCode;
 return (
 <div className="flex justify-center">
 <button
 type="button"
 onClick={(e) => {
 e.stopPropagation();
 setSelectedAuthorCode(item.authorCode);
 }}
 className="relative flex items-center justify-center w-6 h-6 rounded-full transition-all duration-200 outline-none"
 aria-label={isSelected ? "선택됨" : "선택하기"}
 >
 {isSelected ? (
 <CheckCircle className="absolute w-6 h-6 text-primary scale-110 transition-transform" />
 ) : (
 <Circle className="absolute w-6 h-6 text-muted-foreground/30 hover:text-primary/50 transition-colors" />
 )}
 </button>
 </div>
 );
 }
 }
 ];

 const handleSave = () => {
 if (!selectedDept) {
 return toast('설정할 부서를 먼저 선택해 주세요.', 'info');
 }
 if (!selectedAuthorCode) {
 return toast('부여할 권한을 선택해 주세요.', 'info');
 }

 if (confirm(`선택한 부서의 모든 구성원에게 '${selectedAuthorCode}' 권한을 일괄 부여하시겠습니까?`)) {
 saveMutation.mutate(selectedAuthorCode);
 }
 };

 return (
 <div className="space-y-6 pb-20">
 <PageHeader
 title="부서별 권한 일괄 관리"
 breadcrumbs={[{ label: '보안관리' }, { label: '부서권한' }]}
 actions={
 <Button
 onClick={handleSave}
 className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold shadow-md hover:bg-primary/90 transition-all h-11 border-none"
 >
 <Save size={18} />
 <span className="font-black text-primary-foreground">설정 저장</span>
 </Button>
 }
 />

 <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
 {/* Left: Dept List with Search */}
 <div className="lg:col-span-1 space-y-4">
 <div className="relative group">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={16} />
 <Input
 placeholder="부서명 검색..."
 className="pl-11 rounded-2xl border-none bg-muted/80 h-12 focus-visible:ring-primary/20 text-foreground font-medium"
 value={searchKeyword}
 onChange={(e) => setSearchKeyword(e.target.value)}
 />
 </div>

 <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar p-1">
 {filteredDepts.length === 0 ? (
 <div className="bg-card border border-dashed rounded-3xl p-10 text-center">
 <Users size={32} className="mx-auto mb-4 opacity-10" />
 <p className="text-sm font-bold text-muted-foreground">부서 정보가 없습니다.</p>
 </div>
 ) : (
 filteredDepts.map((d) => (
 <button
 key={d.orgnztId}
 onClick={() => {
 setSelectedDept(d.orgnztId);
 setSelectedAuthorCode(null);
 }}
 className={cn(
 "group flex items-center justify-between p-4 mb-2 w-full rounded-2xl border text-left transition-all duration-300",
 selectedDept === d.orgnztId
 ? "bg-primary text-primary-foreground border-primary shadow-xl shadow-primary/30 scale-[1.02] z-10"
 : "bg-card hover:bg-muted border-border hover:border-primary/20 text-foreground"
 )}
 >
 <div className="flex items-center gap-3">
 <div className={cn(
 "p-2.5 rounded-xl transition-colors shrink-0",
 selectedDept === d.orgnztId ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted group-hover:bg-primary/10 text-muted-foreground group-hover:text-primary"
 )}>
 <Users size={16} />
 </div>
 <div className="flex flex-col overflow-hidden">
 <span className={cn(
 "text-sm font-black truncate",
 selectedDept === d.orgnztId ? "text-primary-foreground" : "text-foreground"
 )}>{d.orgnztNm}</span>
 <span className={cn(
 "text-[10px] font-mono",
 selectedDept === d.orgnztId ? "text-primary-foreground/70" : "text-muted-foreground"
 )}>{d.orgnztId}</span>
 </div>
 </div>
 <ChevronRight size={14} className={cn(
 "transition-all shrink-0",
 selectedDept === d.orgnztId ? "opacity-100 translate-x-1 text-primary-foreground" : "opacity-20 translate-x-0 text-foreground"
 )} />
 </button>
 ))
 )}
 </div>
 </div>

 {/* Right: Role Mapping */}
 <div className="lg:col-span-3 space-y-4">
 {!selectedDept ? (
 <div className="h-full min-h-[500px] border-2 border-dashed border-border rounded-[3rem] bg-card flex flex-col items-center justify-center text-muted-foreground p-12 text-center group">
 <div className="w-24 h-24 rounded-full bg-background shadow-xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-700">
 <Key size={48} className="text-primary/20" />
 </div>
 <p className="text-xl font-black text-foreground tracking-tight">부서를 선택해 주세요</p>
 <p className="text-sm mt-3 max-w-xs text-muted-foreground font-medium">관리하고자 하는 부서를 좌측 목록에서 선택하면 해당 부서 전체에 적용할 마스터 권한을 구성할 수 있습니다.</p>
 </div>
 ) : (
 <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-700">
 <div className="p-8 bg-gradient-to-br from-primary/10 via-card to-transparent border border-primary/20 rounded-[2.5rem] flex items-center gap-6 shadow-sm shadow-primary/5">
 <div className="w-16 h-16 bg-background rounded-2xl shadow-xl flex items-center justify-center text-primary border border-border shrink-0">
 <ShieldCheck size={32} />
 </div>
 <div>
 <h4 className="text-sm font-black text-primary/60 tracking-tight mb-1">Batch Policy Setup</h4>
 <div className="flex items-baseline gap-2">
 <p className="text-2xl font-black text-foreground tracking-tight">{depts.find(d => d.orgnztId === selectedDept)?.orgnztNm}</p>
 <span className="text-sm text-muted-foreground font-medium">({selectedDept})</span>
 </div>
 <p className="text-sm text-muted-foreground mt-2 font-semibold">위 부서의 모든 사용자에게 부여할 공통 권한을 선택하세요.</p>
 </div>
 </div>

 <div className="mt-8">
 <StandardDataTable
 columns={columns}
 data={roles}
 loading={loading}
 keyField="authorCode"
 emptyMessage="시스템에 등록된 권한 그룹 정보가 없습니다."
 onRowClick={(item) => setSelectedAuthorCode(item.authorCode)}
 />
 </div>

 <div className="p-5 flex items-center gap-4 text-sm font-bold text-muted-foreground bg-muted/30 rounded-3xl border border-dashed border-border">
 <div className="w-8 h-8 rounded-full bg-background shadow-sm flex items-center justify-center shrink-0 border border-border">
 <Info size={16} className="text-primary" />
 </div>
 <span className="leading-relaxed">일괄 부여를 진행하면 기존 사용자들이 개별적으로 가지고 있던 권한 정보가 사라지고 <span className="text-primary underline decoration-2 underline-offset-4 font-black">선택한 권한으로 전체 교체</span>됩니다. 신중하게 진행하시기 바랍니다.</span>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
