'use client';

import { useRef, useState } from 'react';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { Program } from '@/types/foundation/program';
import type { PageResponse, ProgrmManage } from '@/types/foundation/system';
import { programAdminService } from '@/services/foundation/system/ProgramAdminService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { Plus,
 Loader2,
 Trash2,
 Settings,
 Cpu,
 Link as LinkIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import {
 Tooltip,
 TooltipContent,
 TooltipTrigger,
} from "@/components/ui/tooltip";
import { ProgramForm } from '@/components/admin/system/ProgramForm';

import { extractErrorMessage } from '@/app/actions/actionUtils';

const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });

/** 서버(BaseSearchDto)의 기본 페이지 크기와 동일하게 맞춘다. */
/** 페이지당 건수 기본값(A1 필수 — 사용자가 바꿀 수 있다). URL 에는 싣지 않는다. */
const DEFAULT_PAGE_SIZE = 10;

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
 const programWritePendingRef = useRef(false);
 const [deletingProgramFileName, setDeletingProgramFileName] = useState<string | null>(null);
 const [mode, setMode] = useState<'create' | 'edit'>('create');
 const [editingProgram, setEditingProgram] = useState<Program | null>(null);
 const editingProgramFormData: ProgrmManage | undefined = editingProgram
 ? {
 prgrmFileNm: editingProgram.prgrmFileNm,
 prgrmStrgPath: editingProgram.prgrmStrgPath,
 prgrmKornNm: editingProgram.prgrmKornNm,
 prgrmExpln: editingProgram.prgrmExpln ?? '',
 url: editingProgram.url,
 }
 : undefined;

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
 const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<Error | null>(initialError ? toError(initialError) : null);
 const [currentSearchWrd, setCurrentSearchWrd] = useState(searchWrd);

 /**
  * 목록 조회. 서버는 @ModelAttribute BaseSearchDto(pageIndex 1-based / pageUnit / searchKeyword)로 받는다.
  * pageIndex 는 직접 계산하지 않고 ApiService 의 자동 매핑(page 0-based → pageIndex = page+1)에 위임한다.
  * 페이지 크기는 BaseSearchDto.pageUnit 이 결정하므로 pageUnit 을 함께 보낸다(size 는 recordCountPerPage 로만 매핑됨).
  * 검색어도 BaseSearchDto.searchKeyword 로 실어야 서버에 닿는다(searchWrd 는 바인딩 대상이 아니다).
  */
 const loadData = async (wrd: string = currentSearchWrd, targetPage: number = 1, size: number = pageSize) => {
 try {
 setLoading(true);
 setError(null);
 const res = await programAdminService.getProgramList({
 page: targetPage - 1,
 size,
 pageUnit: size,
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
 const handleOpenCreate = () => {
 if (programWritePendingRef.current || isModalOpen) return;
 setMode('create');
 setEditingProgram(null);
 setIsOpen(true);
 };

 const handleOpenEdit = (program: Program) => {
 if (programWritePendingRef.current || isModalOpen) return;
 setMode('edit');
 setEditingProgram(program);
 setIsOpen(true);
 };

 const handleDelete = async (program: Program) => {
 if (programWritePendingRef.current || isModalOpen) return;
 programWritePendingRef.current = true;
 setDeletingProgramFileName(program.prgrmFileNm);
 try {
 const isConfirmed = await confirm({
 title: '프로그램 삭제',
 message: `[${program.prgrmKornNm}] (${program.prgrmFileNm}) 프로그램을 삭제하시겠습니까? 해당 프로그램과 연결된 모든 메뉴 연동이 해제될 수 있습니다.`,
 variant: 'destructive',
 confirmText: '삭제 실행'
 });
 if (isConfirmed) {
 await programAdminService.deleteProgram(program.prgrmFileNm);
 toast('프로그램이 삭제되었습니다.', 'success');
 loadData(currentSearchWrd, page);
 }
 } catch (err) {
 toast(extractErrorMessage(err, '삭제 중 오류가 발생했습니다.'), 'error');
 } finally {
 programWritePendingRef.current = false;
 setDeletingProgramFileName(null);
 }
 };

 const closeProgramModal = () => {
 if (programWritePendingRef.current) return;
 setIsOpen(false);
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
 accessor: (item: Program) => {
 const isDeleting = deletingProgramFileName === item.prgrmFileNm;
 return (
 <div className="flex justify-end gap-2 pr-4">
 <Tooltip>
 <TooltipTrigger asChild>
 <Button size="icon" aria-label={`${item.prgrmKornNm} 프로그램 수정`} disabled={deletingProgramFileName !== null || isModalOpen} className="h-10 w-10 rounded-lg bg-muted border border-border text-muted-foreground hover:bg-primary hover:border-primary hover:text-white transition-all" onClick={() => handleOpenEdit(item)}>
 <Settings size={16} aria-hidden="true" />
 </Button>
 </TooltipTrigger>
 <TooltipContent side="top" className="bg-surface-inverse text-surface-inverse-foreground border-none rounded-lg px-4 py-2 text-xs font-bold tracking-widest uppercase">
 프로그램 속성 및 엔드포인트 수정
 </TooltipContent>
 </Tooltip>

 <Tooltip>
 <TooltipTrigger asChild>
 <Button
 size="icon"
 aria-label={`${item.prgrmKornNm} 프로그램 ${isDeleting ? '삭제 중…' : '삭제'}`}
 aria-busy={isDeleting || undefined}
 disabled={deletingProgramFileName !== null || isModalOpen}
 className="h-10 w-10 text-destructive-emphasis bg-destructive/10 border border-destructive/20 hover:bg-destructive hover:text-destructive-foreground transition-all rounded-lg"
 onClick={() => handleDelete(item)}
 >
 {isDeleting
 ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
 : <Trash2 size={16} aria-hidden="true" />}
 </Button>
 </TooltipTrigger>
 <TooltipContent side="top" className="bg-surface-inverse text-surface-inverse-foreground border-none rounded-lg px-4 py-2 text-xs font-bold tracking-widest uppercase text-rose-300">
 시스템 자산 영구 삭제
 </TooltipContent>
 </Tooltip>
 </div>
 );
 }
 }
 ];

 return (
 <WorkListPage
 title="시스템 프로그램 관리"
 description="시스템을 구성하는 프로그램 모듈과 API 엔드포인트를 조회·등록합니다."
 breadcrumbItems={[{ label: '시스템관리' }, { label: '프로그램 관리' }]}
 filterStateKey="system-programs"
 totalCount={error ? undefined : total}
 actions={
 <Button size="sm" onClick={handleOpenCreate} disabled={deletingProgramFileName !== null || isModalOpen} className="gap-2">
 <Plus size={16} aria-hidden="true" /> 신규 등록
 </Button>
 }
 filter={
 <KeywordFilter
 label="프로그램명 · 파일명"
 placeholder="프로그램명 또는 파일명으로 검색"
 value={currentSearchWrd}
 onSearch={(keyword) => { setCurrentSearchWrd(keyword); loadData(keyword, 1); }}
 />
 }
 >
 <StandardDataTable
 accessibleLabel="시스템 프로그램 목록"
 columns={columns}
 data={data}
 loading={loading}
 error={error}
 onRetry={() => loadData(currentSearchWrd, page)}
 keyField="prgrmFileNm"
 emptyMessage={emptyResultMessage(currentSearchWrd, '등록된 프로그램이 없습니다.')}
 pagination={{
 currentPage: page,
 totalPages: totalPage,
 pageSize,
 onPageSizeChange: (size) => { setPageSize(size); void loadData(currentSearchWrd, 1, size); },
 onPageChange: (p) => loadData(currentSearchWrd, p)
 }}
 />

 <StandardModal
 isOpen={isModalOpen}
 onClose={closeProgramModal}
 title={mode === 'create' ? '신규 프로그램 등록' : '프로그램 정보 수정'}
 maxWidth="2xl"
 >
 <ProgramForm 
 open={isModalOpen}
 onOpenChange={setIsOpen}
 onWritePendingChange={(pending) => { programWritePendingRef.current = pending; }}
 data={mode === 'edit' ? editingProgramFormData : undefined}
 onSuccess={() => {
 loadData(currentSearchWrd, page);
 setIsOpen(false);
 }}
 />
 </StandardModal>
 </WorkListPage>
 );
}

