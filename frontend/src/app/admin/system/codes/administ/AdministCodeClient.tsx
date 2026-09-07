'use client';

import { useState, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { codeAdminService, AdministCode } from '@/services/foundation/system/CodeAdminService';
import { PageResponse } from '@/types/foundation/system';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import { Plus, MapPin, ShieldCheck, RefreshCcw, Compass, Pencil, Trash2 } from 'lucide-react';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { z } from 'zod';
import { useAppForm } from '@/hooks/useAppForm';
import {
  Form,
  FormControl,
  FormErrorSummary,
  FormField as ShadcnFormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import dynamic from 'next/dynamic';

const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });

import { AdministCodeDtoSchema } from '@/types/generated-zod';

/*
  [2026-09-08] `upAdmdstCd` 의 필수 제약을 푼다.

  서버 DTO(`AdministCodeDto`)에는 이 필드에 @NotBlank 가 없고 물리 컬럼도 NULL 을 받는다
  (V2_0: `up_admdst_cd character varying(12)`). 즉 필수는 **화면이 스스로 만든 규칙**이었고,
  그 때문에 **상위가 없는 최상위 행정구역(시·도)을 등록할 수 없었다** — 서울특별시를 넣으려면
  존재하지 않는 상위 코드를 지어내야 했다. 정정 경로를 열면서 같은 이유로 수정도 막혔다
  (기존 최상위 행 하나도 저장되지 않는다). 외부인사 수정 폼에서 확인한 것과 같은 유형이다.

  나머지 셋은 화면이 필수로 두는 것이 정당하다 — 식별 코드는 PK 이고, 명칭이 없으면 목록이
  빈칸이 되며, 구분은 select 라 언제나 값이 있다.
*/
export const administCodeSchema = AdministCodeDtoSchema.extend({
  admdstCd: AdministCodeDtoSchema.shape.admdstCd.unwrap().min(1).max(10),
  admdstZoneNm: AdministCodeDtoSchema.shape.admdstZoneNm.unwrap().min(1),
  admdstSeCd: AdministCodeDtoSchema.shape.admdstSeCd.unwrap().min(1),
  upAdmdstCd: AdministCodeDtoSchema.shape.upAdmdstCd.unwrap().max(12),
  useYn: AdministCodeDtoSchema.shape.useYn.min(1),
});

type AdministCodeFormValues = z.infer<typeof administCodeSchema>;

/** 서버 페이지 크기(백엔드 기본 pageUnit). PagePagination 계산과 동일해야 한다. */
/** 페이지당 건수 기본값(A1 필수 — 사용자가 바꿀 수 있다). URL 에는 싣지 않는다. */
const DEFAULT_PAGE_SIZE = 10;

export default function AdministCodeClient({
 initialData,
 embedded = false,
}: {
 initialData?: Partial<PageResponse<AdministCode>>;
 embedded?: boolean;
}) {
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [registerLoading, setRegisterLoading] = useState(false);
 const registerSubmitLock = useRef(false);
 /*
   [2026-09-08] 정정 경로. 종전에는 등록만 있어 코드나 명칭을 잘못 넣으면 되돌릴 방법이
   없었다(operation-consumer-census 축 2 가 updateAdministCode·deleteAdministCode 를 화면
   호출부 0 으로 지목). 수정은 등록 모달을 재사용하되 식별 코드는 잠근다 — 그것을 바꾸는
   것은 다른 코드를 만드는 일이지 이 코드를 고치는 일이 아니다.
 */
 const [editingCode, setEditingCode] = useState<AdministCode | null>(null);
 const [deletingCode, setDeletingCode] = useState<string | null>(null);
 const deletePendingRef = useRef(false);
 const { toast } = useToast();
 const confirm = useConfirm();
 /** 실제 서버에 제출된 검색어. 입력 중 값은 KeywordFilter 가 소유한다(제출형 검색). */
 const [appliedSearch, setAppliedSearch] = useState('');
 const [pageNumber, setPageNumber] = useState(1);
 const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

 const form = useAppForm(administCodeSchema, {
   defaultValues: {
     admdstCd: '',
     admdstZoneNm: '',
     admdstSeCd: '1',
     upAdmdstCd: '',
     useYn: 'Y',
   }
 });

 const closeFormModal = (force = false) => {
 if (!force && registerSubmitLock.current) return;
 setIsModalOpen(false);
 setEditingCode(null);
 form.reset({ admdstCd: '', admdstZoneNm: '', admdstSeCd: '1', upAdmdstCd: '', useYn: 'Y' });
 };
 const closeRegisterModal = () => closeFormModal();

 /*
  * [P1-1] 종전에는 수동 fetch + catch→toast 였다.
  * 실패해도 목록 state 가 그대로 남아 "조회 성공"처럼 보였고, 재시도 수단도 없었다.
  * useQuery 로 옮겨 error/refetch 를 StandardDataTable 에 그대로 전달한다.
  */
 const seedList: AdministCode[] = initialData?.list ?? [];
 const {
 data: pageData,
 isLoading,
 error,
 refetch,
 } = useQuery({
 queryKey: ['administ-codes', appliedSearch, pageNumber, pageSize],
 // 서버(AdministCodeApiController)는 BaseSearchDto 의 searchKeyword·pageIndex·pageUnit 만 읽는다.
 // 종전의 searchWrd·pageNo 는 ApiService.get 의 매핑 대상도 아니라 **셋 다 통째로 무시**됐다 —
 // 검색어를 넣어도 목록이 그대로였고 2페이지를 눌러도 늘 1페이지 10건만 나왔다.
 queryFn: () => codeAdminService.getAdministCodeList({
 searchKeyword: appliedSearch,
 pageIndex: pageNumber,
 pageUnit: pageSize,
 }),
 placeholderData: (prev) => prev ?? (
 pageNumber === 1 && appliedSearch === '' && seedList.length > 0
 ? { list: seedList, total: initialData?.total ?? seedList.length, page: 1, size: pageSize, totalPage: 1 }
 : undefined
 ),
 });

 const data: AdministCode[] = pageData?.list ?? [];
 const total = pageData?.total ?? 0;

 /** [P1-8] 검색 실행 시 페이지를 1로 되돌린다(3페이지에서 검색하면 빈 화면이 되던 결함). */
 const handleSearchSubmit = useCallback((keyword: string) => {
 setAppliedSearch(keyword);
 setPageNumber(1);
 }, []);

 const onRegisterSubmit = async (values: AdministCodeFormValues) => {
   if (registerSubmitLock.current) return;
   registerSubmitLock.current = true;
   const editing = editingCode;
   try {
     setRegisterLoading(true);
     if (editing) {
       // 서버 update 는 구분·명칭·상위·사용여부를 갱신한다(식별 코드는 PK 라 대상이 아니다).
       await codeAdminService.updateAdministCode(editing.admdstCd, values);
     } else {
       await codeAdminService.createAdministCode(values);
     }
     toast(editing ? '행정 구역 코드가 수정되었습니다.' : '행정 구역 코드가 등록되었습니다.', 'success');
     closeFormModal(true);
     if (!editing) setPageNumber(1);
     refetch();
   } catch (error) {
     if (!form.applyServerErrors(error)) {
       toast(extractErrorMessage(error, editing ? '코드 수정 중 오류가 발생했습니다.' : '코드 등록 중 오류가 발생했습니다.'), 'error');
     }
   } finally {
     registerSubmitLock.current = false;
     setRegisterLoading(false);
   }
 };

 const openEditModal = (item: AdministCode) => {
   if (registerSubmitLock.current || deletePendingRef.current) return;
   setEditingCode(item);
   form.reset({
     admdstCd: item.admdstCd,
     admdstSeCd: item.admdstSeCd ?? '1',
     admdstZoneNm: item.admdstZoneNm ?? '',
     upAdmdstCd: item.upAdmdstCd ?? '',
     useYn: item.useYn ?? 'Y',
   });
   setIsModalOpen(true);
 };

 /** 확인 본문에 대상 코드·명칭을 노출해 오삭제를 막는다. 하위 코드가 있으면 서버가 409 로 거부한다. */
 const handleDelete = async (item: AdministCode) => {
   if (deletePendingRef.current || registerSubmitLock.current || isModalOpen) return;
   deletePendingRef.current = true;
   setDeletingCode(item.admdstCd);
   try {
     const ok = await confirm({
       title: '행정 구역 코드 삭제',
       message: `‘${item.admdstZoneNm}’(코드 ${item.admdstCd}) 를 영구히 삭제합니다. 되돌릴 수 없으며, 이 코드를 상위로 두는 하위 코드가 있으면 삭제되지 않습니다.`,
       variant: 'destructive',
       confirmText: '삭제',
     });
     if (!ok) return;

     await codeAdminService.deleteAdministCode(item.admdstCd);
     toast('행정 구역 코드가 삭제되었습니다.', 'success');
     refetch();
   } catch (error) {
     toast(extractErrorMessage(error, '코드 삭제 중 오류가 발생했습니다.'), 'error');
   } finally {
     deletePendingRef.current = false;
     setDeletingCode(null);
   }
 };

 const columns: Column<AdministCode>[] = [
 { 
 header: '식별 코드', 
 accessor: (item: AdministCode) => (
 <div className="flex items-center gap-4 py-2">
 <div className="w-10 h-9 rounded-xl bg-surface-inverse flex items-center justify-center text-surface-inverse-foreground shadow-lg group-hover:rotate-6 transition-transform">
 <MapPin size={18} />
 </div>
 <div className="flex flex-col gap-0.5">
 <span className="font-black text-foreground tracking-tighter text-xs uppercase">{item.admdstCd}</span>
 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">행정 코드</span>
 </div>
 </div>
 ),
 className: 'w-48 py-4' 
 },
 { 
 header: '구분', 
 accessor: (item: AdministCode) => (
 <div className={cn(
 "px-3 py-1 rounded-lg border w-fit text-[10px] font-black tracking-widest uppercase shadow-sm",
 item.admdstSeCd === '1' ? 'bg-surface-inverse text-surface-inverse-foreground border-surface-inverse-border' : 'bg-muted text-muted-foreground border-border'
 )}>
 {item.admdstSeCd === '1' ? '법정동' : '행정동'}
 </div>
 ),
 className: 'w-24 py-4'
 },
 { 
 header: '행정구역명', 
 accessor: (item: AdministCode) => (
 <div className="flex flex-col gap-0.5 py-4">
 <span className="font-black text-foreground tracking-tighter text-sm leading-tight uppercase">{item.admdstZoneNm}</span>
 <div className="flex items-center gap-1.5 mt-1">
 <Compass size={10} className="text-primary opacity-40" />
 <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase leading-none">표준 명칭</span>
 </div>
 </div>
 ),
 className: 'py-4'
 },
 { 
 header: '상위 코드', 
 accessor: (item: AdministCode) => (
 <div className="font-black text-muted-foreground tabular-nums tracking-widest text-[10px] uppercase">
 {item.upAdmdstCd || '최상위'}
 </div>
 ), 
 className: 'w-32 py-4' 
 },
 { 
 header: '상태', 
 accessor: (item: AdministCode) => (
 <HubStatusBadge status={item.useYn === 'Y' ? '활성' : '중단'} />
 ),
 className: 'w-24 py-4'
 },
 {
 header: '관리',
 accessor: (item: AdministCode) => (
 <div className="flex items-center gap-1.5">
 <Button
 variant="ghost"
 size="sm"
 aria-label={`${item.admdstZoneNm} 수정`}
 className="h-8 gap-1.5 px-2 text-xs font-bold"
 onClick={() => openEditModal(item)}
 disabled={deletingCode === item.admdstCd}
 >
 <Pencil size={14} aria-hidden="true" /> 수정
 </Button>
 <Button
 variant="ghost"
 size="sm"
 aria-label={`${item.admdstZoneNm} 삭제`}
 className="h-8 gap-1.5 px-2 text-xs font-bold text-destructive-emphasis hover:text-destructive-emphasis hover:bg-destructive/10"
 onClick={() => handleDelete(item)}
 disabled={deletingCode === item.admdstCd}
 aria-busy={deletingCode === item.admdstCd || undefined}
 >
 <Trash2 size={14} aria-hidden="true" /> {deletingCode === item.admdstCd ? '삭제 중…' : '삭제'}
 </Button>
 </div>
 ),
 className: 'w-40 py-4'
 },
 ];

 return (
 <WorkListPage
 title="행정 구역 코드 관리"
 headingLevel={embedded ? 2 : 1}
 showBreadcrumb={!embedded}
 description="법정동·행정동 코드 체계를 조회·등록하고 정정합니다."
 breadcrumbItems={[{ label: '시스템관리' }, { label: '코드 관리' }, { label: '행정 구역' }]}
 filterStateKey="system-codes-administ"
 totalCount={error ? undefined : total}
 actions={
 <>
 <Button
 variant="outline"
 size="sm"
 aria-label="행정 구역 목록 새로고침"
 onClick={() => refetch()}
 className="gap-2"
 >
 <RefreshCcw size={16} aria-hidden="true" />
 새로고침
 </Button>
 <Button size="sm" onClick={() => setIsModalOpen(true)} className="gap-2">
 <Plus size={16} aria-hidden="true" /> 신규 등록
 </Button>
 </>
 }
 filter={
 <KeywordFilter
 label="행정구역명"
 placeholder="행정구역명을 입력하세요"
 value={appliedSearch}
 onSearch={handleSearchSubmit}
 />
 }
 >
 <StandardDataTable<AdministCode>
 accessibleLabel="행정 구역 코드 목록"
 columns={columns}
 data={data}
 loading={isLoading}
 error={error}
 onRetry={() => refetch()}
 keyField="admdstCd"
 emptyMessage={emptyResultMessage(appliedSearch, '등록된 행정 구역 코드가 없습니다.')}
 pagination={{
 currentPage: pageNumber,
 totalPages: Math.max(Math.ceil(total / pageSize), 1),
 onPageChange: setPageNumber,
 pageSize,
          onPageSizeChange: (size) => { setPageSize(size); setPageNumber(1); },
 }}
 />

 <StandardModal
   isOpen={isModalOpen}
   onClose={closeRegisterModal}
   title={editingCode ? '행정 구역 코드 수정' : '행정 구역 코드 등록'}
   maxWidth="xl"
   footer={
     <div className="flex w-full gap-4">
       <Button
         type="button"
         variant="outline"
         onClick={closeRegisterModal}
         disabled={registerLoading || form.formState.isSubmitting}
         className="flex-1 h-11 rounded-lg font-bold text-xs tracking-widest uppercase border-2"
       >
         취소
       </Button>
       <Button 
         type="submit"
         form="administ-code-register-form"
         disabled={registerLoading || form.formState.isSubmitting}
         className="flex-[2] h-11 bg-surface-inverse border-none text-surface-inverse-foreground rounded-lg font-bold text-xs tracking-widest uppercase shadow-2xl flex items-center justify-center gap-3 hover:bg-primary transition-all active:scale-95 group"
       >
         <ShieldCheck size={18} strokeWidth={3} className="text-primary group-hover:rotate-12 transition-transform" />
         {registerLoading ? (editingCode ? '저장 중…' : '등록 중…') : (editingCode ? '저장' : '최종 등록')}
       </Button>
     </div>
   }
 >
   <Form {...form}>
      <form
        id="administ-code-register-form"
        noValidate
        onSubmit={form.handleSubmit(onRegisterSubmit)}
        className="space-y-6 pt-4 text-left"
      >
       <FormErrorSummary
         labels={{
           admdstCd: '행정 구역 식별 코드',
           admdstSeCd: '구분',
           admdstZoneNm: '행정 구역 명칭',
           upAdmdstCd: '상위 행정 구역 코드',
           useYn: '사용 여부',
         }}
         onNavigate={form.focusError}
       />
       <ShadcnFormField
         control={form.control}
         name="admdstCd"
         required
         render={({ field }) => (
           <FormItem>
             <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">행정 구역 식별 코드</FormLabel>
             <FormControl>
               <Input
                 {...field}
                 maxLength={10}
                 inputMode="numeric"
                 placeholder="예: 1111051500"
                 readOnly={Boolean(editingCode)}
                 aria-readonly={editingCode ? true : undefined}
                 className="h-11 rounded-lg bg-muted border-border read-only:opacity-70"
               />
             </FormControl>
             <FormMessage />
           </FormItem>
         )}
       />
       <ShadcnFormField
         control={form.control}
         name="admdstSeCd"
         required
         render={({ field }) => (
           <FormItem>
             <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">구분</FormLabel>
             <FormControl>
               <select {...field} className="w-full h-11 px-3 rounded-lg border bg-muted border-border focus:bg-card text-sm outline-none">
                 <option value="1">법정동</option>
                 <option value="2">행정동</option>
               </select>
             </FormControl>
             <FormMessage />
           </FormItem>
         )}
       />
       <ShadcnFormField
         control={form.control}
         name="admdstZoneNm"
         required
         render={({ field }) => (
           <FormItem>
             <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">행정 구역 명칭</FormLabel>
             <FormControl>
               <Input {...field} maxLength={100} placeholder="예: 서울특별시 종로구 청운효자동" className="h-11 rounded-lg bg-muted border-border" />
             </FormControl>
             <FormMessage />
           </FormItem>
         )}
       />
       <ShadcnFormField
         control={form.control}
         name="upAdmdstCd"
         render={({ field }) => (
           <FormItem>
             <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">상위 행정 구역 코드</FormLabel>
             <FormControl>
               <Input {...field} maxLength={12} inputMode="numeric" placeholder="예: 1111000000 (최상위면 비워 두세요)" className="h-11 rounded-lg bg-muted border-border" />
             </FormControl>
             <p className="text-xs text-muted-foreground">시·도처럼 상위가 없는 최상위 구역은 비워 둡니다.</p>
             <FormMessage />
           </FormItem>
         )}
       />
       <ShadcnFormField
         control={form.control}
         name="useYn"
         required
         render={({ field }) => (
           <FormItem>
             <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">사용 여부</FormLabel>
             <FormControl>
               <select {...field} className="w-full h-11 px-3 rounded-lg border bg-muted border-border focus:bg-card text-sm outline-none">
                 <option value="Y">활성 (사용함)</option>
                 <option value="N">중단 (사용안함)</option>
               </select>
             </FormControl>
             <FormMessage />
           </FormItem>
         )}
       />
     </form>
   </Form>
 </StandardModal>
 </WorkListPage>
 );
}


