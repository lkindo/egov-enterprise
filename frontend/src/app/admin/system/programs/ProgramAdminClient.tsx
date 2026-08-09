'use client';

import { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { Input } from '@/components/ui/input';
import { Program } from '@/types/foundation/program';
import { PageResponse } from '@/types/foundation/system';
import { programAdminService } from '@/services/foundation/system/ProgramAdminService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { Plus,
 Trash2,
 Settings,
 Cpu,
 Link as LinkIcon,
 Search,
 Box,
 Layers,
 SearchCode } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import {
 Tooltip,
 TooltipContent,
 TooltipTrigger,
} from "@/components/ui/tooltip";
;
import { ProgramForm } from '@/components/admin/system/ProgramForm';
import { z } from 'zod';
import { useAppForm } from '@/hooks/useAppForm';

import { ProgramDtoSchema } from '@/types/generated-zod';

import { extractErrorMessage } from '@/app/actions/actionUtils';
const programSchema = ProgramDtoSchema.extend({
 prgrmFileNm: z.string().min(1).max(60),
 prgrmStrgPath: z.string().max(100).optional().or(z.literal('')),
 prgrmKornNm: z.string().min(1).max(60),
 url: z.string().min(1).startsWith('/', 'URL은 /로 시작해야 합니다.').max(100),
 prgrmExpln: z.string().max(200).optional().or(z.literal('')),
});


const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });

/** 서버(BaseSearchDto)의 기본 페이지 크기와 동일하게 맞춘다. */
const PAGE_SIZE = 10;

/** 조회 실패 사유를 Error 로 정규화한다(StandardDataTable 의 error prop 계약). */
function toError(value: unknown): Error {
 if (value instanceof Error) return value;
 if (typeof value === 'string' && value) return new Error(value);
 return new Error('데이터를 불러오는 중 오류가 발생했습니다.');
}

/** 현재 페이지를 URL 에 반영한다(공유·새로고침 복원). 서버 재실행 없이 주소만 갱신한다. */
function syncPageToUrl(page: number) {
 if (typeof window === 'undefined') return;
 const url = new URL(window.location.href);
 if (page <= 1) url.searchParams.delete('page');
 else url.searchParams.set('page', String(page));
 window.history.replaceState(null, '', `${url.pathname}${url.search}`);
}

export default function ProgramAdminClient({
 initialData,
 searchWrd,
 initialError = null,
 initialPage = 1,
}: {
 initialData: PageResponse<Program>;
 searchWrd: string;
 /** 서버 컴포넌트 조회 실패 사유. 실패를 빈 목록으로 위장하지 않기 위해 그대로 전달받는다. */
 initialError?: string | null;
 /** URL `?page=` 로 복원된 초기 페이지(1-base) */
 initialPage?: number;
}) {
 const { toast } = useToast();
 const confirm = useConfirm();

 const [isModalOpen, setIsOpen] = useState(false);
 const [mode, setMode] = useState<'create' | 'edit'>('create');
 
 const form = useAppForm(programSchema, {
 defaultValues: {
 prgrmFileNm: '',
 prgrmStrgPath: '',
 prgrmKornNm: '',
 url: '',
 prgrmExpln: ''
 }
 });

 const [data, setData] = useState<Program[]>(() => {
 return (initialData?.list || []) as Program[];
 });
 const [total, setTotal] = useState<number>(() => {
 return initialData?.total || 0;
 });
 const [totalPage, setTotalPage] = useState<number>(() => {
 return initialData?.totalPage || 1;
 });
 const [page, setPage] = useState(initialPage);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<Error | null>(initialError ? toError(initialError) : null);
 const [currentSearchWrd, setCurrentSearchWrd] = useState(searchWrd);

 /**
  * 목록 조회. 서버는 @ModelAttribute BaseSearchDto(pageIndex 1-based / pageUnit / searchKeyword)로 받는다.
  * pageIndex 는 직접 계산하지 않고 ApiService 의 자동 매핑(page 0-based → pageIndex = page+1)에 위임한다.
  * 페이지 크기는 BaseSearchDto.pageUnit 이 결정하므로 pageUnit 을 함께 보낸다(size 는 recordCountPerPage 로만 매핑됨).
  * 검색어도 BaseSearchDto.searchKeyword 로 실어야 서버에 닿는다(searchWrd 는 바인딩 대상이 아니다).
  */
 const loadData = async (wrd: string = currentSearchWrd, targetPage: number = 1) => {
 try {
 setLoading(true);
 setError(null);
 const res = await programAdminService.getProgramList({
 page: targetPage - 1,
 size: PAGE_SIZE,
 pageUnit: PAGE_SIZE,
 searchKeyword: wrd
 });

 const list = (res.list || []) as Program[];
 const totalCount = res.total || 0;

 setData(list);
 setTotal(totalCount);
 setTotalPage(res.totalPage || 1);
 setPage(targetPage);
 syncPageToUrl(targetPage);
 } catch (err: unknown) {
 // 실패를 "데이터 없음"으로 위장하지 않는다 — 목록 영역에 오류와 재시도 수단을 노출한다.
 setError(toError(err));
 setData([]);
 toast('데이터를 불러오는 중 오류가 발생했습니다.', 'error');
 } finally {
 setLoading(false);
 }
 };

 /** 검색은 항상 1페이지부터 — 3페이지에서 검색하면 빈 화면이 되는 결함 방지. */
 const handleSearch = () => loadData(currentSearchWrd, 1);

 const handleOpenCreate = () => {
 setMode('create');
 form.reset({ prgrmFileNm: '', prgrmStrgPath: '', prgrmKornNm: '', url: '', prgrmExpln: '' });
 setIsOpen(true);
 };

 const handleOpenEdit = (program: Program) => {
 setMode('edit');
 form.reset(program);
 setIsOpen(true);
 };

 const handleDelete = async (program: Program) => {
 const isConfirmed = await confirm({
 title: '프로그램 삭제',
 message: `[${program.prgrmKornNm}] (${program.prgrmFileNm}) 프로그램을 삭제하시겠습니까? 해당 프로그램과 연결된 모든 메뉴 연동이 해제될 수 있습니다.`,
 variant: 'destructive',
 confirmText: '삭제 실행'
 });
 if (isConfirmed) {
 try {
 await programAdminService.deleteProgram(program.prgrmFileNm);
 toast('프로그램이 삭제되었습니다.', 'success');
 loadData(currentSearchWrd, page);
 } catch (err) {
 toast(extractErrorMessage(err, '삭제 중 오류가 발생했습니다.'), 'error');
 }
 }
 };

 const columns: Column<Program>[] = [
 {
 header: '파일명',
 accessor: (item: Program) => (
 <div className="flex items-center gap-4 py-3">
 <div className="w-12 h-12 rounded-lg bg-surface-inverse flex items-center justify-center text-surface-inverse-foreground shadow-lg group-hover:scale-110 transition-transform">
 <Cpu size={20} />
 </div>
 <div className="text-left">
 <span className="font-bold tracking-tighter text-foreground block text-md leading-none">{item.prgrmKornNm}</span>
 {/* 근거 없는 고정 문구(SYSTEM_MODULE) 대신 실제 저장 경로를 노출한다. */}
 <span className="text-xs font-bold text-muted-foreground tracking-tight mt-2 opacity-100 text-left font-mono">
 {item.prgrmStrgPath || '저장 경로 미지정'}
 </span>
 </div>
 </div>
 )
 },
 {
 header: '식별 파일명',
 accessor: (item: Program) => (
 <div className="flex justify-start">
 <div className="px-3 py-1 bg-muted border border-border rounded-lg w-fit">
 <span className="text-xs font-bold text-primary tracking-tight font-mono">{item.prgrmFileNm}</span>
 </div>
 </div>
 ),
 className: 'w-48'
 },
 {
 header: '엔드포인트(API/URL)',
 accessor: (item: Program) => (
 <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground tracking-tighter text-left">
 <LinkIcon size={12} className="text-primary opacity-40 shrink-0" />
 <span className="truncate">{item.url}</span>
 </div>
 ),
 className: 'w-64'
 },
 {
 header: '관리',
 className: 'text-right w-32',
 accessor: (item: Program) => (
 <div className="flex justify-end gap-2 pr-4">
 <Tooltip>
 <TooltipTrigger asChild>
 <Button size="icon" aria-label={`${item.prgrmKornNm} 프로그램 수정`} className="h-10 w-10 rounded-lg bg-muted border border-border text-muted-foreground hover:bg-primary hover:border-primary hover:text-white transition-all" onClick={() => handleOpenEdit(item)}>
 <Settings size={16} />
 </Button>
 </TooltipTrigger>
 <TooltipContent side="top" className="bg-surface-inverse text-surface-inverse-foreground border-none rounded-lg px-4 py-2 text-xs font-bold tracking-widest uppercase">
 프로그램 속성 및 엔드포인트 수정
 </TooltipContent>
 </Tooltip>

 <Tooltip>
 <TooltipTrigger asChild>
 <Button size="icon" aria-label={`${item.prgrmKornNm} 프로그램 삭제`} className="h-10 w-10 text-rose-500 bg-rose-50 border border-rose-100 hover:bg-rose-500 hover:text-white transition-all rounded-lg" onClick={() => handleDelete(item)}>
 <Trash2 size={16} />
 </Button>
 </TooltipTrigger>
 <TooltipContent side="top" className="bg-surface-inverse text-surface-inverse-foreground border-none rounded-lg px-4 py-2 text-xs font-bold tracking-widest uppercase text-rose-300">
 시스템 자산 영구 삭제
 </TooltipContent>
 </Tooltip>
 </div>
 )
 }
 ];

 return (
 <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
 <PageHeader
 title="시스템 프로그램 미들웨어"
 breadcrumbs={[{ label: '시스템관리' }, { label: '프로그램 관리' }]}
 />

 <HubHeader
 title="프로그램"
 highlight="자산 관리"
 subtitle="시스템을 구성하는 모든 물리 프로그램 모듈 및 API 엔드포인트의 생명주기를 관리합니다."
 icon={Box}
 actions={
 <Tooltip>
 <TooltipTrigger asChild>
 <Button
 onClick={handleOpenCreate}
 size="lg"
 className="h-11 px-10 rounded-lg bg-surface-inverse border-none text-surface-inverse-foreground font-bold text-xs tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3"
 >
 <Plus size={20} /> 신규 등록
 </Button>
 </TooltipTrigger>
 <TooltipContent side="bottom" className="bg-surface-inverse text-surface-inverse-foreground border-none rounded-lg px-4 py-2 text-xs font-bold tracking-widest uppercase">
 새로운 물리 프로그램 자산 정의
 </TooltipContent>
 </Tooltip>
 }
 />

 {/*
   근거 없는 고정 지표('시스템 무결성 정상' · '가동시간 99.9%' · '동기화 실시간')는 산출 근거가 없어 삭제했다.
   남긴 카드는 모두 서버 응답(total/totalPage)과 현재 목록에서 실제로 계산되는 값이다.
 */}
 <HubMetricGrid className="lg:grid-cols-3">
 <HubMetricCard title="전체 프로그램" value={total} icon={Layers} color="primary" />
 <HubMetricCard title="현재 페이지" value={`${page} / ${Math.max(totalPage, 1)}`} icon={Box} color="indigo" />
 <HubMetricCard title="현재 페이지 표시 건수" value={data.length} icon={Cpu} color="emerald" />
 </HubMetricGrid>

 <HubSectionCard 
 title="소프트웨어 레포지토리" 
 description="현재 시스템에 등록되어 동작 중인 모든 소프트웨어 자산의 명세 및 메타데이터 정보입니다." 
 icon={SearchCode}
 >
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-10 border-b border-border/30">
 <div className="flex-1 max-w-2xl text-left">
 <div className="relative group/search">
 <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/search:opacity-100 transition-opacity" size={20} />
 <Input
 aria-label="프로그램 검색어"
 placeholder="프로그램명 또는 파일명을 입력하여 검색.."
 value={currentSearchWrd}
 onChange={(e) => setCurrentSearchWrd(e.target.value)}
 onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
 className="h-11 pl-16 pr-8 w-full bg-muted/50 border-none rounded-lg text-xs font-bold tracking-widest uppercase shadow-inner focus:ring-4 focus:ring-primary/10 transition-all"
 />
 </div>
 </div>
 <Button onClick={handleSearch} size="lg" className="h-11 px-10 rounded-lg bg-surface-inverse border-none text-surface-inverse-foreground font-bold text-xs tracking-widest uppercase shadow-xl hover:bg-primary transition-all gap-2">
 <Search size={18} /> 검색
 </Button>
 </div>

 <div className="overflow-hidden">
 <StandardDataTable
 columns={columns}
 data={data}
 loading={loading}
 error={error}
 onRetry={() => loadData(currentSearchWrd, page)}
 keyField="prgrmFileNm"
 emptyMessage="시스템에 등록된 프로그램 자산이 존재하지 않습니다."
 className="border-none bg-transparent"
 pagination={{
 currentPage: page,
 totalPages: totalPage,
 totalCount: total,
 pageSize: PAGE_SIZE,
 onPageChange: (p) => loadData(currentSearchWrd, p)
 }}
 />
 </div>
 </HubSectionCard>

 <StandardModal
 isOpen={isModalOpen}
 onClose={() => setIsOpen(false)}
 title={mode === 'create' ? '신규 프로그램 등록' : '프로그램 정보 수정'}
 maxWidth="2xl"
 >
 <ProgramForm 
 open={isModalOpen}
 onOpenChange={setIsOpen}
 data={mode === 'edit' ? (form.getValues() as any) : undefined}
 onSuccess={() => {
 loadData(currentSearchWrd, page);
 setIsOpen(false);
 }}
 />
 </StandardModal>
 </div>
 );
}

