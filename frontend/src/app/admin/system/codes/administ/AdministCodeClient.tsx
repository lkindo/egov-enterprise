'use client';

import React, { useState, useMemo } from 'react';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { codeAdminService, AdministCode } from '@/services/foundation/system/CodeAdminService';
import { useToast } from '@/app/components/ui/toast';
import { Plus, 
 MapPin, 
 Search, 
 Layers, 
 ShieldCheck, 
 Database, 
 SearchCode, 
 Milestone, 
 Monitor, 
 RefreshCcw, 
 Map, 
 Compass } from 'lucide-react';
import { PagePagination } from '@/components/common/PagePagination';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { useAppForm } from '@/hooks/useAppForm';
import {
  Form,
  FormControl,
  FormField as ShadcnFormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import dynamic from 'next/dynamic';

const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });

import { AdministCodeDtoSchema } from '@/types/generated-zod';

const administCodeSchema = AdministCodeDtoSchema.extend({
  admdstCd: z.string().min(1).max(10),
  admdstZoneNm: z.string().min(1),
  admdstSeCd: z.string().min(1),
  upAdmdstCd: z.string().min(1),
  useYn: z.string().min(1),
});

type AdministCodeFormValues = z.infer<typeof administCodeSchema>;

export default function AdministCodeClient({ initialData }: { initialData: any }) {
 const [data, setData] = useState(initialData?.list || []);
 const [total, setTotal] = useState(initialData?.total || 0);
 const [loading, setLoading] = useState(false);
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [registerLoading, setRegisterLoading] = useState(false);
 const { toast } = useToast();
 const [searchWrd, setSearchWrd] = useState('');
 const [pageNumber, setPageNumber] = useState(1);

 const form = useAppForm(administCodeSchema, {
   defaultValues: {
     admdstCd: '',
     admdstZoneNm: '',
     admdstSeCd: '1',
     upAdmdstCd: '',
     useYn: 'Y',
   }
 });

 const loadData = async (wrd: string = searchWrd, page: number = pageNumber) => {
 try {
 setLoading(true);
 const res = await codeAdminService.getAdministCodeList({ searchWrd: wrd, pageNo: page });
 setData(res.list || []);
 setTotal(res.total || 0);
 setPageNumber(page);
 } catch (error) {
 toast('데이터를 불러오는 중 오류가 발생했습니다.', 'error');
 } finally {
 setLoading(false);
 }
 };

 const onRegisterSubmit = async (values: AdministCodeFormValues) => {
   try {
     setRegisterLoading(true);
     await codeAdminService.createAdministCode(values);
     toast('행정 구역 코드가 등록되었습니다.', 'success');
     setIsModalOpen(false);
     form.reset();
     loadData(searchWrd, 1);
   } catch (error) {
     toast('코드 등록 중 오류가 발생했습니다.', 'error');
   } finally {
     setRegisterLoading(false);
   }
 };

 const stats = useMemo(() => {
 const totalCount = total || 0;
 const legalDist = (data || []).filter((item: any) => item?.admdstSeCd === '1').length;
 const adminDist = (data || []).filter((item: any) => item?.admdstSeCd === '2').length;
 const syncStatus = ((data || []).filter((item: any) => item?.useYn === 'Y').length / ((data || []).length || 1) * 100).toFixed(0);
 
 return { totalCount, legalDist, adminDist, syncStatus };
 }, [total, data]);

 const columns: Column<AdministCode>[] = [
 { 
 header: '식별 코드', 
 accessor: (item: any) => (
 <div className="flex items-center gap-4 py-2">
 <div className="w-10 h-9 rounded-xl bg-surface-inverse flex items-center justify-center text-surface-inverse-foreground shadow-lg group-hover:rotate-6 transition-transform">
 <MapPin size={18} />
 </div>
 <div className="flex flex-col gap-0.5">
 <span className="font-black text-foreground tracking-tighter text-xs uppercase">{item.admdstCd}</span>
 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">ADMIN_CODE</span>
 </div>
 </div>
 ),
 className: 'w-48 py-4' 
 },
 { 
 header: '구분', 
 accessor: (item: any) => (
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
 accessor: (item: any) => (
 <div className="flex flex-col gap-0.5 py-4">
 <span className="font-black text-foreground tracking-tighter text-sm leading-tight uppercase">{item.admdstZoneNm}</span>
 <div className="flex items-center gap-1.5 mt-1">
 <Compass size={10} className="text-primary opacity-40" />
 <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase leading-none">Namespace</span>
 </div>
 </div>
 ),
 className: 'py-4'
 },
 { 
 header: '상위 코드', 
 accessor: (item: any) => (
 <div className="font-black text-muted-foreground tabular-nums tracking-widest text-[10px] uppercase">
 {item.upAdmdstCd || 'ROOT'}
 </div>
 ), 
 className: 'w-32 py-4' 
 },
 { 
 header: '상태', 
 accessor: (item: any) => (
 <HubStatusBadge status={item.useYn === 'Y' ? '활성' : '중단'} />
 ),
 className: 'w-24 py-4'
 },
 ];

 return (
 <div className="space-y-10 pb-24 animate-in fade-in duration-1000">
 
 <HubHeader 
 title="행정 구역" 
 highlight="관리 인벤토리" 
 subtitle="전국 행정 구역에 따른 법정동 및 행정동 코드 체계를 관리합니다." 
 icon={Milestone} 
 actions={
 <div className="flex gap-3 p-1 items-center">
 <Button
 variant="ghost"
 onClick={() => loadData()}
 className="h-10 w-12 rounded-xl bg-white border border-border text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all shadow-sm group active:scale-95 px-4"
 >
 <RefreshCcw size={20} className="group-hover:rotate-180 transition-transform duration-700" />
 </Button>
 <Button 
  onClick={() => setIsModalOpen(true)}
  className="h-10 px-8 rounded-xl bg-surface-inverse border-none text-surface-inverse-foreground font-black text-xs tracking-widest uppercase shadow-xl hover:bg-primary transition-all hover:-translate-y-1 gap-2 group"
 >
 <Plus size={18} /> 신규 등록
 </Button>
 </div>
 }
 />

 <HubMetricGrid>
 <HubMetricCard title="전체 구역" value={stats.totalCount} icon={Database} color="primary" />
 <HubMetricCard title="법정동" value={stats.legalDist} icon={Map} color="indigo" />
 <HubMetricCard title="행정동" value={stats.adminDist} icon={Compass} color="amber" />
 <HubMetricCard title="동기화" value={`${stats.syncStatus}%`} icon={ShieldCheck} color="emerald" status="최적" />
 </HubMetricGrid>

 <div className="grid grid-cols-12 gap-8">
 {/* Navigation Sidebar */}
 <div className="col-span-12 lg:col-span-4 h-full">
 <div className="rounded-2xl bg-white/40 backdrop-blur-md text-foreground p-10 shadow-xl relative overflow-hidden group h-full border border-white/60 ring-1 ring-black/5 min-h-[500px]">
 <div className="absolute top-0 right-0 p-16 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
 <Milestone size={240} className="text-primary" />
 </div>
 <div className="relative z-10 space-y-10">
 <div className="space-y-4">
 <div className="w-16 h-10 rounded-xl bg-surface-inverse flex items-center justify-center shadow-2xl">
 <Monitor size={28} className="text-primary" />
 </div>
 <h4 className="text-2xl font-black tracking-tighter leading-tight uppercase text-foreground">공간 인텔리전스<br />허브</h4>
 </div>
 
 <p className="text-xs font-bold text-muted-foreground leading-relaxed border-l-4 border-primary pl-6">
 행정구역코드 체계(KAS)는 전국 공간정보 통합 관리 체계와 실시간으로 동기화됩니다.
 </p>

 <div className="space-y-5 pt-10 border-t border-border/50">
 <div className="flex items-center justify-between group/stat">
 <span className="text-[10px] font-black text-muted-foreground tracking-widest uppercase group-hover/stat:text-primary transition-colors">데이터 수집 엔진</span>
 <span className="text-sm font-black text-emerald-500 uppercase tracking-widest">Normal</span>
 </div>
 <div className="flex items-center justify-between group/stat">
 <span className="text-[10px] font-black text-muted-foreground tracking-widest uppercase group-hover/stat:text-amber-500 transition-colors">동기화 빈도</span>
 <span className="text-sm font-black text-foreground uppercase tracking-widest">Daily 00:00</span>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Data Area */}
 <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">
 <HubSectionCard title="행정 코드 탐색기" description="행정 구역 및 법정동 메타데이터 상세 정보입니다." icon={SearchCode}>
 <div className="bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 shadow-xl p-8 mb-8 ring-1 ring-black/5">
 <form onSubmit={(e) => { e.preventDefault(); loadData(searchWrd, 1); }} className="flex flex-col md:flex-row md:items-center justify-between gap-6">
 <div className="relative group/search flex-1">
 <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/search:text-primary transition-colors" size={18} />
 <Input
 placeholder="행정구역명을 입력하세요..."
 value={searchWrd}
 onChange={(e) => setSearchWrd(e.target.value)}
 className="h-10 pl-14 pr-6 w-full bg-muted/50 border-none rounded-xl text-xs font-bold tracking-tight shadow-inner focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground"
 />
 </div>
 <Button type="submit" size="lg" className="h-10 px-8 rounded-xl bg-surface-inverse border-none text-surface-inverse-foreground font-black text-xs tracking-widest uppercase shadow-xl hover:bg-primary transition-all gap-2 group active:scale-95">
 <Layers size={18} className="group-hover:rotate-180 transition-transform duration-700" /> 검색 실행
 </Button>
 </form>
 </div>

 <div className="bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 shadow-xl overflow-hidden ring-1 ring-black/5">
 <div className="overflow-hidden min-h-[500px] p-2">
 <AnimatePresence mode="wait">
 <motion.div
 key={searchWrd + pageNumber}
 initial={{ opacity: 0, scale: 0.99 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 1.01 }}
 transition={{ duration: 0.4, ease: "circOut" }}
 >
 <StandardDataTable
 columns={columns}
 data={data}
 loading={loading}
 emptyMessage="데이터가 존재하지 않습니다."
 className="border-none bg-transparent shadow-none"
 isPremium={true}
 />
 </motion.div>
 </AnimatePresence>
 </div>
 </div>

 <div className="mt-10 flex justify-center">
 <PagePagination
 total={total}
 size={10}
 page={pageNumber}
 onPageChange={(p) => loadData(searchWrd, p)}
 />
 </div>
 </HubSectionCard>
 </div>
 </div>

 <StandardModal
   isOpen={isModalOpen}
   onClose={() => setIsModalOpen(false)}
   title="행정 구역 코드 등록"
   maxWidth="xl"
   footer={
     <div className="flex w-full gap-4">
       <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 h-11 rounded-lg font-bold text-xs tracking-widest uppercase border-2">취소</Button>
       <Button 
         onClick={form.handleSubmit(onRegisterSubmit)}
         disabled={registerLoading}
         className="flex-[2] h-11 bg-surface-inverse border-none text-surface-inverse-foreground rounded-lg font-bold text-xs tracking-widest uppercase shadow-2xl flex items-center justify-center gap-3 hover:bg-primary transition-all active:scale-95 group"
       >
         <ShieldCheck size={18} strokeWidth={3} className="text-primary group-hover:rotate-12 transition-transform" /> 최종 등록
       </Button>
     </div>
   }
 >
   <Form {...form}>
     <form className="space-y-6 pt-4 text-left">
       <ShadcnFormField
         control={form.control}
         name="admdstCd"
         render={({ field }) => (
           <FormItem>
             <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">행정 구역 식별 코드</FormLabel>
             <FormControl>
               <Input {...field} placeholder="예: 1111051500" className="h-11 rounded-lg bg-muted border-border" />
             </FormControl>
             <FormMessage />
           </FormItem>
         )}
       />
       <ShadcnFormField
         control={form.control}
         name="admdstSeCd"
         render={({ field }) => (
           <FormItem>
             <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">구분</FormLabel>
             <FormControl>
               <select {...field} className="w-full h-11 px-3 rounded-lg border bg-muted border-border focus:bg-white text-sm outline-none">
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
         render={({ field }) => (
           <FormItem>
             <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">행정 구역 명칭</FormLabel>
             <FormControl>
               <Input {...field} placeholder="예: 서울특별시 종로구 청운효자동" className="h-11 rounded-lg bg-muted border-border" />
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
               <Input {...field} placeholder="예: 1111000000" className="h-11 rounded-lg bg-muted border-border" />
             </FormControl>
             <FormMessage />
           </FormItem>
         )}
       />
       <ShadcnFormField
         control={form.control}
         name="useYn"
         render={({ field }) => (
           <FormItem>
             <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">사용 여부</FormLabel>
             <FormControl>
               <select {...field} className="w-full h-11 px-3 rounded-lg border bg-muted border-border focus:bg-white text-sm outline-none">
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
 </div>
 );
}


