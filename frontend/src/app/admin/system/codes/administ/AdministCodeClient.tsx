'use client';

import { useState, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { codeAdminService, AdministCode } from '@/services/foundation/system/CodeAdminService';
import { PageResponse } from '@/types/foundation/system';
import { useToast } from '@/app/components/ui/toast';
import { Plus, MapPin, ShieldCheck, RefreshCcw, Compass } from 'lucide-react';
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

export const administCodeSchema = AdministCodeDtoSchema.extend({
  admdstCd: AdministCodeDtoSchema.shape.admdstCd.unwrap().min(1).max(10),
  admdstZoneNm: AdministCodeDtoSchema.shape.admdstZoneNm.unwrap().min(1),
  admdstSeCd: AdministCodeDtoSchema.shape.admdstSeCd.unwrap().min(1),
  upAdmdstCd: AdministCodeDtoSchema.shape.upAdmdstCd.unwrap().min(1),
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
 const { toast } = useToast();
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

 const closeRegisterModal = () => {
 if (registerSubmitLock.current) return;
 setIsModalOpen(false);
 };

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
   try {
     setRegisterLoading(true);
     await codeAdminService.createAdministCode(values);
     toast('행정 구역 코드가 등록되었습니다.', 'success');
     setIsModalOpen(false);
     form.reset();
     setPageNumber(1);
     refetch();
   } catch (error) {
     if (!form.applyServerErrors(error)) {
       toast('코드 등록 중 오류가 발생했습니다.', 'error');
     }
   } finally {
     registerSubmitLock.current = false;
     setRegisterLoading(false);
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
 ];

 return (
 <WorkListPage
 title="행정 구역 코드 관리"
 headingLevel={embedded ? 2 : 1}
 showBreadcrumb={!embedded}
 description="법정동·행정동 코드 체계를 조회·등록합니다."
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
   title="행정 구역 코드 등록"
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
         {registerLoading ? '등록 중…' : '최종 등록'}
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
               <Input {...field} maxLength={10} inputMode="numeric" placeholder="예: 1111051500" className="h-11 rounded-lg bg-muted border-border" />
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
         required
         render={({ field }) => (
           <FormItem>
             <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">상위 행정 구역 코드</FormLabel>
             <FormControl>
               <Input {...field} maxLength={12} inputMode="numeric" placeholder="예: 1111000000" className="h-11 rounded-lg bg-muted border-border" />
             </FormControl>
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


