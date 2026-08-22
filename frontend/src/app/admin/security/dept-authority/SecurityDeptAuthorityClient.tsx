'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { ShieldCheck,  
 Users,  
 ChevronRight,  
 Key,  
 Save,  
 Search,  
 CheckCircle, 
 Building2, 
 RefreshCcw, 
 Database, 
 Lock, 
 ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { deptAdminService, Department } from '@/services/foundation/system/DeptAdminService';
import { deptAuthorityAdminService } from '@/services/foundation/system/DeptAuthorityAdminService';
import { AuthorInfo, authorAdminService } from '@/services/foundation/system/AuthorAdminService';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { motion, AnimatePresence } from 'framer-motion';

const DEPTS_KEY = ['admin', 'departments'] as const;
const ROLES_KEY = ['admin', 'authorities'] as const;

/**
 * 부서 선택기는 전량이 있어야 한다(클라이언트 필터로 좁히는 UI). 서버 기본값(size=10)이면
 * 11번째 부서부터는 선택 자체가 불가능하다 — 충분히 큰 size 로 한 번에 받는다.
 */
const DEPT_LIST_SIZE = 1000;
/** 권한 그룹 목록은 서버(BaseSearchDto) 기본 페이지 크기와 동일하게 페이징한다. */
const ROLE_PAGE_SIZE = 10;

export default function SecurityDeptAuthorityClient() {
 const { toast } = useToast();
 const confirm = useConfirm();
 const [selectedDept, setSelectedDept] = useState<string | null>(null);
 const [searchKeyword, setSearchKeyword] = useState('');
 const [selectedAuthorCode, setSelectedAuthorCode] = useState<string | null>(null);
 const [rolePage, setRolePage] = useState(1);

 const { data: deptsData, isLoading: deptsLoading, error: deptsError, refetch: refetchDepts } = useQuery({
 queryKey: [...DEPTS_KEY, DEPT_LIST_SIZE],
 // 서버는 keyword + Spring Pageable(page/size, 0-based)을 읽는다.
 queryFn: () => deptAdminService.getDeptList({ page: 0, size: DEPT_LIST_SIZE }),
 staleTime: 5 * 60 * 1000,
 });

 const { data: rolesData, isLoading: rolesLoading, error: rolesError, refetch: refetchRoles } = useQuery({
 queryKey: [...ROLES_KEY, rolePage],
 // 서버는 @ModelAttribute BaseSearchDto(pageIndex 1-based / pageUnit)로 받는다.
 // pageIndex 직접 계산은 금지 — AuthorAdminService/ApiService 의 page(0-based) 자동 매핑에 위임한다.
 queryFn: () => authorAdminService.getAuthorList({ page: rolePage - 1, pageUnit: ROLE_PAGE_SIZE }),
 staleTime: 5 * 60 * 1000,
 });

 const depts: Department[] = deptsData?.list || [];
 const roles: AuthorInfo[] = rolesData?.list || [];
 const rolesTotalPage = rolesData?.totalPage || 1;

 const filteredDepts = depts.filter(d =>
 String(d.ognzNm || '').toLocaleLowerCase().includes(searchKeyword.toLocaleLowerCase()) ||
 String(d.ognzId || '').toLocaleLowerCase().includes(searchKeyword.toLocaleLowerCase())
 );

 const loading = rolesLoading;

 const saveMutation = useMutation({
 mutationFn: (authrtId: string) =>
 deptAuthorityAdminService.updateDeptAuthorities({
 deptId: selectedDept!,
 authrtId,
 allMembers: true
 }),
 onSuccess: () => {
 toast('부서 전체 사용자에게 보안 정책이 일괄 적용되었습니다.', 'success');
 setSelectedAuthorCode(null);
 },
 onError: () => toast('권한 저장 중 오류가 발생했습니다.', 'error')
 });

 const columns: Column<AuthorInfo>[] = [
    {
      header: '정책 프로파일 ID',
      accessor: (item: AuthorInfo) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold text-muted-foreground/30 tracking-[0.4em] uppercase font-mono leading-none mb-1">POLICY_UID</span>
          <span className="font-mono text-xs font-bold text-primary tracking-widest uppercase">{item.authrtCd}</span>
        </div>
      ),
      className: 'w-48'
    },
    {
      header: '권한 아키텍처 명칭',
      accessor: (item: AuthorInfo) => (
        <div className="flex flex-col gap-0.5 py-2">
          <span className="font-bold text-foreground tracking-tight text-md uppercase leading-tight">{item.authrtNm}</span>
          <span className="text-xs font-bold text-muted-foreground/40 truncate block max-w-[300px] leading-none">{item.authrtExpln || '규정 명세 없음'}</span>
        </div>
      )
    },
    {
      header: '선택',
      className: 'text-center w-32',
      accessor: (item: AuthorInfo) => {
        const isSelected = selectedAuthorCode === item.authrtCd;
        return (
          <div className="flex justify-center">
            <button
              type="button"
              aria-label={`${item.authrtNm || item.authrtCd} 권한 선택`}
              aria-pressed={isSelected}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedAuthorCode(item.authrtCd);
              }}
              className={cn(
                "relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-500 outline-none border-2",
                isSelected ? "bg-primary border-primary shadow-xl shadow-primary/30 rotate-0 scale-110" : "bg-card border-border hover:border-primary/40 rotate-12"
              )}
            >
              <CheckCircle size={16} aria-hidden="true" className={cn("transition-all duration-700", isSelected ? "text-white scale-100 opacity-100 rotate-0" : "text-transparent scale-50 opacity-0 rotate-45")} />
            </button>
          </div>
        );
      }
    }
  ];

 /**
  * 부서 전 구성원의 기존 개별 권한을 파기하는 파괴적 액션이다.
  * native confirm 대신 useConfirm 을 쓰고, 본문에 대상 부서명·권한명을 그대로 노출한다.
  */
 const handleSave = async () => {
 if (!selectedDept) {
 toast('설정할 부서를 먼저 선택해 주세요.', 'info');
 return;
 }
 if (!selectedAuthorCode) {
 toast('부여할 권한을 선택해 주세요.', 'info');
 return;
 }

 const deptName = depts.find(d => d.ognzId === selectedDept)?.ognzNm || selectedDept;
 const roleName = roles.find(r => r.authrtCd === selectedAuthorCode)?.authrtNm || selectedAuthorCode;

 const ok = await confirm({
 title: '조직 권한 일괄 배포',
 message: `'${deptName}' 부서의 모든 구성원에게 '${roleName}'(${selectedAuthorCode}) 권한을 강제 적용합니다. 구성원이 보유한 기존 개별 권한은 파기됩니다. 계속하시겠습니까?`,
 confirmText: '배포',
 variant: 'destructive',
 });
 if (!ok) return;

 saveMutation.mutate(selectedAuthorCode);
 };

 const currentDept = depts.find(d => d.ognzId === selectedDept);

 return (
 <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
 <PageHeader
 title="조직 기반 권한 일괄 프로비저닝"
 breadcrumbs={[{ label: '보안 관리' }, { label: '조직 권한' }, { label: '일괄 관리' }]}
 />

 <HubHeader 
 title="Department" 
 highlight="Batch" 
 subtitle="조직 단위의 보안 역할 강제 배포 및 계정 권한 집합 토폴로지 통합 관리" 
 icon={Building2} 
 actions={
 <div className="flex gap-4 p-2 items-center">
 <Button
 variant="ghost"
 onClick={() => { refetchDepts(); refetchRoles(); }}
 aria-label="부서·권한 목록 새로고침"
 className="h-11 w-14 rounded-lg bg-card border-2 border-border text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all shadow-xl group active:scale-95 px-4"
 >
 <RefreshCcw size={22} aria-hidden="true" className="group-hover:rotate-180 transition-transform duration-700" />
 </Button>
 <Button
 onClick={handleSave}
 className="h-11 px-10 rounded-lg bg-surface-inverse border-none text-surface-inverse-foreground font-bold text-xs tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3 group"
 >
 <Save size={20} className="group-hover:scale-110 transition-transform duration-500" /> 정책 마스터 배포
 </Button>
 </div>
 }
 />

 {/*
   지표는 현재 페이지 길이가 아니라 서버 전체 건수(total) 기준.
   종전의 'SYNC_PROBE(ONLINE)' · 'TOPOLOGY_FLOW=STEADY' 는 산출 근거가 없는 고정 문자열이라 삭제했다.
 */}
 <HubMetricGrid>
 <HubMetricCard title="전체 부서" value={deptsData?.total ?? depts.length} icon={Building2} color="indigo" status="서버 집계" />
 <HubMetricCard title="전체 권한 그룹" value={rolesData?.total ?? roles.length} icon={Lock} color="primary" status="서버 집계" />
 </HubMetricGrid>

 <div className="grid grid-cols-12 gap-12 min-h-[850px]">
 {/* Left: Department Explorer */}
 <div className="col-span-12 lg:col-span-4 h-full flex flex-col gap-8">
 <HubSectionCard title="조직 아키텍처 식별" description="권한 정책 일괄 배포 시스템 내 하위 조직을 식별하세요" icon={Building2}>
 <div className="space-y-8 pt-4">
 <div className="relative group/search">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/search:text-primary transition-colors" size={16} />
 <Input
 aria-label="부서명 검색"
 placeholder="부서명 검색..."
 className="pl-12 h-11 bg-muted/50 border-none rounded-lg text-sm font-bold tracking-tight shadow-inner"
 value={searchKeyword}
 onChange={(e) => setSearchKeyword(e.target.value)}
 />
 </div>

 <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
 <AnimatePresence mode="wait">
 {/*
   테이블이 아닌 목록이라 StandardDataTable 의 error/onRetry 를 쓸 수 없다.
   실패를 '부서 없음'으로 위장하지 않도록 오류/로딩/빈 상태를 각각 구분해 노출한다.
 */}
 {deptsError ? (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="alert" className="p-12 text-center space-y-4">
 <ShieldAlert size={48} className="mx-auto text-rose-500 opacity-60" aria-hidden="true" />
 <p className="text-sm font-bold text-foreground">부서 목록을 불러오지 못했습니다.</p>
 <p className="text-xs font-medium text-muted-foreground">네트워크 상태를 확인한 뒤 다시 시도해 주세요.</p>
 <Button variant="outline" onClick={() => refetchDepts()} className="h-10 px-6 rounded-lg text-xs font-bold">다시 시도</Button>
 </motion.div>
 ) : deptsLoading ? (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-12 text-center space-y-4">
 <p className="text-xs font-bold text-muted-foreground tracking-widest">부서 목록을 불러오는 중…</p>
 </motion.div>
 ) : filteredDepts.length === 0 ? (
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-12 text-center space-y-4">
 <Users size={48} className="mx-auto opacity-10 scale-125" aria-hidden="true" />
 <p className="text-xs font-bold text-muted-foreground">조건에 맞는 부서가 없습니다.</p>
 </motion.div>
 ) : (
 filteredDepts.map((d, idx) => (
 <motion.button
 key={d.ognzId}
 initial={{ opacity: 0, x: -10 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: idx * 0.03 }}
 onClick={() => {
 setSelectedDept(d.ognzId);
 setSelectedAuthorCode(null);
 }}
 className={cn(
 "group flex items-center justify-between p-6 w-full rounded-lg border-2 transition-all duration-300 relative overflow-hidden",
 selectedDept === d.ognzId
 ? "bg-surface-inverse border-surface-inverse-border shadow-2xl"
 : "bg-card border-border hover:border-border"
 )}
 >
 <div className="flex items-center gap-4 relative z-10">
 <div className={cn(
 "w-12 h-12 rounded-lg flex items-center justify-center transition-all",
 selectedDept === d.ognzId ? "bg-white/10 text-surface-inverse-foreground" : "bg-muted text-muted-foreground group-hover:bg-surface-inverse group-hover:text-surface-inverse-foreground"
 )}>
 <Users size={20} />
 </div>
 <div className="flex flex-col text-left">
 <span className={cn(
 "text-xs font-bold tracking-tighter leading-none mb-1",
 selectedDept === d.ognzId ? "text-surface-inverse-foreground" : "text-foreground"
 )}>{d.ognzNm}</span>
 <span className={cn(
 "text-xs font-mono font-bold tracking-widest",
 selectedDept === d.ognzId ? "text-surface-inverse-foreground/30" : "text-muted-foreground"
 )}>{d.ognzId}</span>
 </div>
 </div>
 <ChevronRight size={14} className={cn(
 "transition-all shrink-0 relative z-10",
 selectedDept === d.ognzId ? "opacity-100 translate-x-1" : "opacity-0 translate-x-0"
 )} />
 {selectedDept === d.ognzId && (
 <motion.div layoutId="active-dept-indicator" className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-primary rounded-r-full shadow-[0_0_15px_rgba(var(--primary-rgb),0.8)]" />
 )}
 </motion.button>
 ))
 )}
 </AnimatePresence>
 </div>
 </div>
 </HubSectionCard>
 </div>

 {/* Right: Policy Matrix Selection */}
 <div className="col-span-12 lg:col-span-8 flex flex-col gap-10 h-full">
 <HubSectionCard 
 title={currentDept ? `[${currentDept.ognzNm}] 보안 마스터 정책 배포` : "보안 메트릭스 선택"} 
 description="선택한 조직의 모든 계정에 동기화할 마스터 권한 아키텍처를 선택하십시오." 
 icon={ShieldCheck}
 >
 <div className="relative h-full flex flex-col pt-4">
 <AnimatePresence mode="wait">
 {!selectedDept ? (
 <motion.div 
 initial={{ opacity: 0 }} 
 animate={{ opacity: 1 }} 
 className="h-full min-h-[600px] flex flex-col items-center justify-center text-center p-12 group select-none"
 >
 <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center text-slate-100 shadow-inner mb-10 group-hover:scale-110 transition-transform duration-1000">
 <Key size={56} className="opacity-20" />
 </div>
 <div className="space-y-4">
 <h3 className="text-3xl font-bold text-slate-200 uppercase tracking-tighter ">Selection_Required</h3>
 <p className="text-xs font-bold text-slate-200 tracking-[0.4em] uppercase leading-relaxed font-mono max-w-xs mx-auto">식별된 부서의 보안 거버넌스 구성을 위해 좌측 리스트를 프로브하십시오</p>
 </div>
 </motion.div>
 ) : (
 <motion.div 
 initial={{ opacity: 0, y: 10 }} 
 animate={{ opacity: 1, y: 0 }} 
 className="space-y-8"
 >
 <div className="p-10 bg-surface-inverse rounded-lg text-surface-inverse-foreground flex items-center gap-8 shadow-2xl relative overflow-hidden group">
 <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
 <Database size={160} className="text-primary" />
 </div>
 <div className="w-20 h-11 bg-white/10 rounded-lg flex items-center justify-center border border-white/5 shadow-inner relative z-10">
 <Building2 size={36} className="text-primary" />
 </div>
 <div className="relative z-10 space-y-2">
 <span className="text-xs font-bold text-surface-inverse-foreground/30 tracking-[0.4em] uppercase font-mono">Organization_Context_Locked</span>
 <div className="flex items-baseline gap-3">
 <h4 className="text-3xl font-bold tracking-tighter leading-none">{currentDept?.ognzNm}</h4>
 <span className="text-xs font-bold text-surface-inverse-foreground/40 tracking-widest font-mono">[{selectedDept}]</span>
 </div>
 <p className="text-xs font-bold text-primary/80 tracking-widest uppercase mt-2">이 부서의 모든 구성원에게 전역 정책 설정을 시작할 수 있는 상태입니다.</p>
 </div>
 </div>

    <div className="min-h-[500px] bg-card rounded-lg border-2 border-border p-4">
      <StandardDataTable
        columns={columns}
        data={roles}
        loading={loading}
        error={rolesError as Error | null}
        onRetry={() => refetchRoles()}
        keyField="authrtCd"
        emptyMessage="시스템에 등록된 권한 그룹 정보가 없습니다."
        onRowClick={(item) => setSelectedAuthorCode(item.authrtCd)}
        rowActionLabel={(item) => `${item.authrtNm || item.authrtCd} 권한 선택`}
        className="border-none bg-transparent"
        pagination={{
          currentPage: rolePage,
          totalPages: rolesTotalPage,
          onPageChange: (p) => setRolePage(p)
        }}
      />
    </div>

 <div className="p-8 flex items-center gap-6 rounded-lg bg-muted border-2 border-dashed border-border">
 <div className="w-12 h-12 bg-card rounded-lg shadow-xl flex items-center justify-center shrink-0 border border-border">
 <ShieldAlert size={24} className="text-rose-500" />
 </div>
 <div className="space-y-1">
 <p className="text-xs font-bold text-foreground tracking-tight leading-relaxed">
 전역 정책 강제 배포(Batch Deployment) 시 해당 조직 구성원이 보유한 기존의 모든 개별 권한은 <span className="text-rose-500 underline decoration-2 underline-offset-4 font-bold ">영구적으로 파기</span>되고 마스터 정책으로 전면 교체됩니다.
 </p>
 <span className="text-xs font-bold text-muted-foreground tracking-[0.3em] uppercase opacity-60">아키텍처 재설정 주의</span>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 </HubSectionCard>
 </div>
 </div>
 </div>
 );
}

