'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import dynamic from 'next/dynamic';
const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });
import { StandardFileUploader } from '@/app/components/ui/standard-file-uploader';
;
import { Banner, Popup } from '@/types/foundation/banner';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { fileAdminService } from '@/services/foundation/system/FileAdminService';
import { bannerAdminService } from '@/services/foundation/system/BannerAdminService';
import { popupAdminService } from '@/services/foundation/system/PopupAdminService';
import { Plus, 
 Image as ImageIcon, 
 ExternalLink, 
 Trash2, 
 Monitor, 
 Calendar, 
 Layers, 
 Sparkles, 
 Zap, 
 Megaphone, 
 Settings, 
 SearchCode, 
 Maximize2, 
 UploadCloud, 
 Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
 saveBannerAction,
 deleteBannerAction,
 savePopupAction,
 deletePopupAction
} from '@/app/actions/promotionActions';
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

import { BannerDtoSchema, PopupDtoSchema } from '@/types/generated-zod';

const bannerSchema = BannerDtoSchema.extend({
 bnrNm: z.string().min(1),
 sortOrdr: z.coerce.number().min(0, '정렬 순서는 0 이상의 숫자여야 합니다.'),
 rfltYn: z.enum(['Y', 'N']),
});

const popupSchema = PopupDtoSchema.extend({
 popupTtlNm: z.string().min(1),
 ntceBgnde: z.string().min(1),
 ntceEndde: z.string().min(1),
 popupWdthPstn: z.coerce.number().min(0) as any,
 popupVrtcPstn: z.coerce.number().min(0) as any,
 popupWdthSz: z.coerce.number().min(100) as any,
 popupVrtcSz: z.coerce.number().min(100) as any,
 ntceYn: z.enum(['Y', 'N']),
 stopvewSetupYn: z.enum(['Y', 'N']),
}).refine(data => {
 if (!data.ntceBgnde || !data.ntceEndde) return true;
 const start = data.ntceBgnde.replace(/\D/g, '');
 const end = data.ntceEndde.replace(/\D/g, '');
 if (start.length !== 8 || end.length !== 8) return true; // Let min(1) or other rules handle empty
 return parseInt(end) >= parseInt(start);
 }, {
 message: '종료일은 시작일보다 빠를 수 없습니다.',
 path: ['ntceEndde']
 });

type BannerFormValues = z.infer<typeof bannerSchema>;
type PopupFormValues = z.infer<typeof popupSchema>;

interface BannerAdminClientProps {
 initialBanners: Banner[];
 initialPopups: Popup[];
}

/** 화면 페이지 크기. 서버는 Spring Pageable 의 size 를 그대로 수용한다(@PageableDefault size=10 은 미지정 시 기본값). */
const PAGE_SIZE = 20;

export default function BannerAdminClient({ initialBanners, initialPopups }: BannerAdminClientProps) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
  }, []);

  const { toast } = useToast();
 const confirm = useConfirm();

 /*
  * [P1-7] 탭·페이지를 URL 에 반영한다. activeTab/page 는 URL 파생값이라
  * 공유·새로고침·뒤로가기가 그대로 복원되고 사이드바 활성 표시도 유지된다.
  * (검색어는 이 화면에 없으므로 URL 반영 대상 자체가 없다.)
  */
 const router = useRouter();
 const pathname = usePathname();
 const searchParams = useSearchParams();

 const activeTab: 'banner' | 'popup' = searchParams.get('tab') === 'popup' ? 'popup' : 'banner';
 const page = Math.max(1, Number(searchParams.get('page')) || 1);

 const syncUrl = useCallback((tab: 'banner' | 'popup', nextPage: number) => {
 const params = new URLSearchParams(searchParams.toString());
 params.set('tab', tab);
 params.set('page', String(nextPage));
 router.replace(`${pathname}?${params.toString()}`, { scroll: false });
 }, [router, pathname, searchParams]);

 /** 탭 전환 시 페이지는 1로 리셋한다(3페이지에서 탭을 바꾸면 빈 목록이 되던 문제). */
 const setTab = useCallback((tab: 'banner' | 'popup') => syncUrl(tab, 1), [syncUrl]);
 const setPage = useCallback((nextPage: number) => syncUrl(activeTab, nextPage), [syncUrl, activeTab]);

 const [isModalOpen, setIsOpen] = useState(false);
 const [editingItem, setEditingItem] = useState<Banner | Popup | null>(null);
 const [formFiles, setFormFiles] = useState<File[]>([]);

 const bannerForm = useAppForm(bannerSchema, {
 defaultValues: {
 bnrNm: '',
 linkUrl: '',
 sortOrdr: 0,
 rfltYn: 'Y',
 bnrExpln: ''
 }
 });

 const popupForm = useAppForm(popupSchema, {
 defaultValues: {
 popupTtlNm: '',
 ntceBgnde: '',
 ntceEndde: '',
 popupWdthPstn: 0 as any,
 popupVrtcPstn: 0 as any,
 popupWdthSz: 400 as any,
 popupVrtcSz: 400 as any,
 ntceYn: 'Y' as any,
 stopvewSetupYn: 'Y' as any
 }
 });

 React.useEffect(() => {
 if (isModalOpen) {
 if (activeTab === 'banner') {
 const item = editingItem as Banner;
 bannerForm.reset({
 bnrNm: item?.bnrNm || '',
 linkUrl: item?.linkUrl || '',
 sortOrdr: item?.sortOrdr || 0,
 rfltYn: (item?.rfltYn as 'Y' | 'N') || 'Y',
 bnrExpln: item?.bnrExpln || ''
 });
 } else {
 const item = editingItem as Popup;
 popupForm.reset({
 popupTtlNm: item?.popupTtlNm || '',
 ntceBgnde: item?.ntceBgnde || '',
 ntceEndde: item?.ntceEndde || '',
 popupWdthPstn: item?.popupWdthPstn ? Number(item.popupWdthPstn) : 0,
 popupVrtcPstn: item?.popupVrtcPstn ? Number(item.popupVrtcPstn) : 0,
 popupWdthSz: item?.popupWdthSz ? Number(item.popupWdthSz) : 400,
 popupVrtcSz: item?.popupVrtcSz ? Number(item.popupVrtcSz) : 300,
 ntceYn: (item?.ntceYn as 'Y' | 'N') || 'Y',
 stopvewSetupYn: (item?.stopvewSetupYn as 'Y' | 'N') || 'Y'
 });
 }
 }
 }, [isModalOpen, activeTab, editingItem, bannerForm, popupForm]);

  /** 비활성 탭은 지표(전체 건수)만 필요하므로 항상 1페이지를 조회한다. */
  const bannerPage = activeTab === 'banner' ? page : 1;
  const popupPage = activeTab === 'popup' ? page : 1;

  /*
   * 배너/팝업 컨트롤러는 모두 Spring Pageable(page/size, 0-based)만 읽는다.
   * 종전의 pageUnit:999 는 바인딩 대상이 아니라 그대로 무시됐고, 실제로는 서버 기본값(size=10)만
   * 내려와 11번째 자산부터는 수정·게시중단이 UI 상 불가능했다. 정상 페이징 + 페이저 연결로 정정한다.
   */
  const { data: bannerPageData, isLoading: isBannersLoading, error: bannerError, refetch: refetchBanners } = useQuery({
  queryKey: ['admin-banners', bannerPage],
  queryFn: () => bannerAdminService.getBannerList({ page: bannerPage - 1, size: PAGE_SIZE })
  });

  const { data: popupPageData, isLoading: isPopupsLoading, error: popupError, refetch: refetchPopups } = useQuery({
  queryKey: ['admin-popups', popupPage],
  queryFn: () => popupAdminService.getPopupList({ page: popupPage - 1, size: PAGE_SIZE })
  });

  /*
   * [P1-1] 조회 실패 시에는 SSR 초기값으로 되돌아가 "데이터가 있는 척" 하지 않는다.
   * 실패는 StandardDataTable 의 error/onRetry 로 화면에 드러낸다.
   */
  const banners: Banner[] = bannerPageData?.list ?? (bannerError ? [] : initialBanners);
  const popups: Popup[] = popupPageData?.list ?? (popupError ? [] : initialPopups);
  /** 지표는 현재 페이지 길이가 아니라 서버가 내려준 전체 건수(total)를 쓴다. */
  const bannerTotal = bannerPageData?.total ?? (bannerError ? 0 : initialBanners.length);
  const popupTotal = popupPageData?.total ?? (popupError ? 0 : initialPopups.length);

 const handleCreate = () => {
 setEditingItem(null);
 setFormFiles([]);
 setIsOpen(true);
 };

 const handleEdit = (item: Banner | Popup) => {
 setEditingItem(item);
 setFormFiles([]);
 setIsOpen(true);
 };

 /** [P1-9] 확인 본문에 대상 식별자(명칭)를 노출해 오삭제를 막는다. */
 const handleDelete = async (id: string, name: string) => {
 const kind = activeTab === 'banner' ? '배너' : '팝업';
 const ok = await confirm({
 title: `${kind} 삭제 확인`,
 message: `‘${name}’ ${kind}을(를) 시스템에서 영구적으로 삭제합니다. 게시 중인 경우 즉시 중단되며 되돌릴 수 없습니다.`,
 variant: 'destructive',
 confirmText: '삭제'
 });

 if (!ok) return;

 try {
 const res = activeTab === 'banner'
 ? await deleteBannerAction(null, id)
 : await deletePopupAction(null, id);

 if (res.success) {
 toast(res.message, 'success');
 activeTab === 'banner' ? refetchBanners() : refetchPopups();
 } else {
 toast(res.message, 'error');
 }
 } catch (error) {
 toast('자산 삭제 처리 중 예외가 발생했습니다.', 'error');
 }
 };

 const onBannerSubmit = async (values: any) => {
 try {
 const data = {
 ...values,
 rfltYn: values.rfltYn as "Y" | "N"
 } as any;
 if (formFiles.length > 0) {
 const uploadRes = await fileAdminService.uploadFiles(formFiles);
 const uploadedFileId = (uploadRes as any)?.data?.data || (uploadRes as any)?.data || uploadRes;
 if (uploadedFileId) {
 data.atchFileId = uploadedFileId;
 data.bnrImgNm = formFiles[0].name;
 }
 } else if (editingItem) {
 data.atchFileId = (editingItem as Banner).atchFileId;
 data.bnrImgNm = (editingItem as Banner).bnrImgNm;
 }

 const res = await saveBannerAction(null, {
 mode: editingItem ? 'edit' : 'create',
 data: data as Banner,
 id: (editingItem as Banner)?.bnrId
 });

 if (res.success) {
 toast(res.message, 'success');
 setIsOpen(false);
 refetchBanners();
 } else {
 toast(res.message, 'error');
 }
 } catch (error) {
 toast('데이터 처리 중 오류가 발생했습니다.', 'error');
 }
 };

 const onPopupSubmit = async (values: any) => {
 try {
 const data = {
 ...values,
 ntceYn: values.ntceYn as "Y" | "N",
 stopvewSetupYn: values.stopvewSetupYn as "Y" | "N",
 ntceBgnde: values.ntceBgnde,
 ntceEndde: values.ntceEndde,
 popupWdthPstn: String(values.popupWdthPstn),
 popupVrtcPstn: String(values.popupVrtcPstn),
 popupWdthSz: String(values.popupWdthSz),
 popupVrtcSz: String(values.popupVrtcSz)
 } as any;

 if (formFiles.length > 0) {
 const uploadRes = await fileAdminService.uploadFiles(formFiles);
 const uploadedFileId = typeof uploadRes === 'string' ? uploadRes : (uploadRes as any)?.data?.data || (uploadRes as any)?.data;
 
 if (uploadedFileId) {
 data.fileUrl = `/api/v1/files/download?fileId=${uploadedFileId}`;
 }
 } else if (editingItem) {
 data.fileUrl = (editingItem as Popup).fileUrl;
 }

 const res = await savePopupAction(null, {
 mode: editingItem ? 'edit' : 'create',
 data: data as Popup,
 id: (editingItem as Popup)?.popupId
 });

 if (res.success) {
 toast(res.message, 'success');
 setIsOpen(false);
 refetchPopups();
 } else {
 toast(res.message, 'error');
 }
 } catch (error) {
 toast('데이터 처리 중 오류가 발생했습니다.', 'error');
 }
 };

 const bannerColumns: Column<Banner>[] = [
 {
 header: '비주얼 자산 스냅샷',
 accessor: (item: Banner) => (
 <div className="w-56 h-24 bg-surface-inverse rounded-lg overflow-hidden border-2 border-border shadow-xl relative group/img cursor-zoom-in transition-all duration-500 hover:scale-[1.05] hover:z-50">
 <ImageIcon size={24} className="absolute inset-0 m-auto text-white/10" />
 {item.atchFileId && (
 <Image
 src={`/api/v1/files/download?fileId=${item.atchFileId}`}
 className="object-cover z-10 group-hover/img:scale-110 transition-transform duration-1000"
 alt="banner"
 fill
 sizes="(max-width: 224px) 100vw, 224px"
 />
 )}
 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity z-20 flex items-center justify-center">
 <Maximize2 size={24} className="text-white scale-50 group-hover/img:scale-100 transition-transform duration-500" />
 </div>
 </div>
 ),
 className: 'py-6 px-4'
 },
 {
 header: '배너 자산 명칭',
 accessor: (item: Banner) => (
 <div className="flex flex-col gap-1.5 py-4">
 <span className="font-bold tracking-tighter text-foreground text-md uppercase leading-tight">{item.bnrNm}</span>
 <div className="flex items-center gap-2">
 <span className="text-xs font-bold text-muted-foreground/50 tracking-[0.3em] font-mono uppercase">ID: {item.bnrId}</span>
 {item.linkUrl && (
 <span className="text-xs font-bold text-primary/60 flex items-center gap-1.5 lowercase">
 <ExternalLink size={10} /> {item.linkUrl}
 </span>
 )}
 </div>
 </div>
 )
 },
 {
 header: '우선순위',
 accessor: (item: Banner) => (
 <div className="w-12 h-12 rounded-lg bg-muted border-2 border-border flex items-center justify-center shadow-inner group-hover:bg-surface-inverse group-hover:text-surface-inverse-foreground transition-all duration-500">
 <span className="font-bold text-lg font-mono tabular-nums leading-none">{item.sortOrdr}</span>
 </div>
 ),
 className: 'w-24 text-center'
 },
 {
 header: '게시 상태',
 accessor: (item: Banner | Popup) => {
 const isLive = 'rfltYn' in item ? item.rfltYn === 'Y' : item.ntceYn === 'Y';
 return <HubStatusBadge status={isLive ? '게시 중' : '대기 중'} />;
 },
 className: 'w-32'
 },
 {
 header: '관리',
 className: 'text-right',
 accessor: (item: Banner) => (
 <div className="flex justify-end gap-2 pr-4">
 <Button variant="ghost" size="icon" aria-label={`${item.bnrNm} 배너 수정`} className="h-10 w-10 bg-muted hover:bg-surface-inverse hover:text-surface-inverse-foreground rounded-lg border border-border transition-all font-bold" onClick={() => handleEdit(item)}>
 <Settings size={16} aria-hidden="true" />
 </Button>
 <Button variant="ghost" size="icon" aria-label={`${item.bnrNm} 배너 삭제`} className="h-10 w-10 text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white border border-rose-100 rounded-lg transition-all" onClick={() => handleDelete(item.bnrId, item.bnrNm)}>
 <Trash2 size={16} aria-hidden="true" />
 </Button>
 </div>
 )
 }
 ];

 const popupColumns: Column<Popup>[] = [
 {
 header: '팝업 명세',
 accessor: (item: Popup) => (
 <div className="flex flex-col gap-2 py-4">
 <span className="font-bold tracking-tighter text-foreground text-md uppercase leading-tight">{item.popupTtlNm}</span>
 <div className="flex items-center gap-4">
 <div className="flex items-center gap-2 px-3 py-1 bg-muted border border-border rounded-lg">
 <Calendar size={12} className="text-primary opacity-40" />
 <span className="text-xs font-bold text-muted-foreground/60 font-mono tracking-tighter tabular-nums uppercase ">
 {item.ntceBgnde} ~ {item.ntceEndde}
 </span>
 </div>
 </div>
 </div>
 )
 },
 {
 header: '화면 크기',
 accessor: (item: Popup) => (
 <div className="flex flex-col gap-1.5">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shadow-inner border border-border text-muted-foreground">
 <Monitor size={14} />
 </div>
 <span className="text-xs font-bold font-mono tracking-widest text-foreground uppercase">{item.popupWdthSz}px x {item.popupVrtcSz}px</span>
 </div>
 <div className="flex items-center gap-2 pl-11">
 <div className="w-1 h-1 rounded-full bg-slate-300" />
 <span className="text-xs font-bold text-muted-foreground/40 ">표시 좌표 (X:{item.popupWdthPstn}, Y:{item.popupVrtcPstn})</span>
 </div>
 </div>
 ),
 className: 'w-64'
 },
 {
 header: '게시 여부',
 accessor: (item: Popup) => <HubStatusBadge status={item.ntceYn === 'Y' ? '게시 중' : '대기 중'} />,
 className: 'w-32'
 },
 {
 header: '관리',
 className: 'text-right w-32',
 accessor: (item: Popup) => (
 <div className="flex justify-end gap-2 pr-4">
 <Button variant="ghost" size="icon" aria-label={`${item.popupTtlNm} 팝업 수정`} className="h-10 w-10 bg-muted hover:bg-surface-inverse hover:text-surface-inverse-foreground rounded-lg border border-border transition-all font-bold" onClick={() => handleEdit(item)}>
 <Settings size={16} aria-hidden="true" />
 </Button>
 <Button variant="ghost" size="icon" aria-label={`${item.popupTtlNm} 팝업 삭제`} className="h-10 w-10 text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white border border-rose-100 rounded-lg transition-all" onClick={() => handleDelete(item.popupId, item.popupTtlNm)}>
 <Trash2 size={16} aria-hidden="true" />
 </Button>
 </div>
 )
 }
 ];

 return (
 <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
 <PageHeader
 title="배너/팝업 관리"
 breadcrumbs={[{ label: '시스템 관리' }, { label: '홍보 관리' }]}
 />

 <HubHeader
 title="Promotional"
 highlight="Matrix"
 subtitle="웹사이트에 노출되는 배너 자산과 공지 팝업을 등록하고 게시 상태를 제어합니다"
 icon={Megaphone}
 actions={
 <Button
 onClick={handleCreate}
 size="lg"
 className="h-11 px-10 rounded-lg bg-surface-inverse border-none text-surface-inverse-foreground font-bold text-xs tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3"
 >
 <Plus size={20} /> 신규 {activeTab === 'banner' ? '배너' : '팝업'} 등록
 </Button>
 }
 />

 {/* 지표는 전체 건수(total) 기준. 게시/예약 여부는 서버 집계가 없어 현재 페이지 기준임을 제목에 명시한다. */}
 <HubMetricGrid>
 <HubMetricCard title="전체 배너" value={bannerTotal} icon={ImageIcon} color="primary" />
 <HubMetricCard title="전체 팝업" value={popupTotal} icon={Monitor} color="emerald" status="등록됨" />
 <HubMetricCard title="예약 자산 (현재 페이지)" value={now ? popups.filter(p => new Date(p.ntceBgnde) > now).length : 0} icon={Calendar} color="amber" />
 <HubMetricCard title="전체 자산" value={bannerTotal + popupTotal} icon={Layers} color="indigo" />
 </HubMetricGrid>

 <div className="grid grid-cols-12 gap-12">
 <div className="col-span-12 lg:col-span-3 h-full">
 <div className="rounded-lg bg-card border-2 border-border shadow-xl h-full p-4 flex flex-col gap-4">
 {/*
 * 토글 버튼 시맨틱(aria-pressed)을 부여한다. role="tab" 은 쓰지 않는다 —
 * e2e POM(PromotionPage.ts)이 getByRole('button', {name:/배너 설정/}) 로 잡고 있어
 * 역할을 바꾸면 타 소유 파일(e2e)까지 동반 수정해야 한다.
 */}
 <button
 type="button"
 aria-pressed={activeTab === 'banner'}
 onClick={() => setTab('banner')}
 className={cn(
 "w-full group p-8 rounded-lg border-2 transition-all flex items-center gap-6 relative overflow-hidden",
 activeTab === 'banner' ? "bg-surface-inverse border-surface-inverse-border text-surface-inverse-foreground shadow-2xl scale-[1.02] z-10" : "bg-transparent border-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
 )}
 >
 <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center transition-all shadow-lg relative z-10", activeTab === 'banner' ? "bg-white/10 text-white shadow-black/20" : "bg-card text-muted-foreground group-hover:bg-primary group-hover:text-white")}>
 <ImageIcon size={22} />
 </div>
 <div className="flex flex-col text-left relative z-10">
 <span className="text-xs font-bold tracking-widest uppercase mb-1 opacity-40">영역 01</span>
 <span className="text-md font-bold tracking-tighter uppercase leading-tight">배너 설정</span>
 </div>
 {activeTab === 'banner' && <div className="absolute right-0 top-0 w-32 h-32 bg-primary/20 rounded-lg blur-3xl -mr-16 -mt-16 pointer-events-none opacity-50" />}
 </button>
 <button
 type="button"
 aria-pressed={activeTab === 'popup'}
 onClick={() => setTab('popup')}
 className={cn(
 "w-full group p-8 rounded-lg border-2 transition-all flex items-center gap-6 relative overflow-hidden",
 activeTab === 'popup' ? "bg-surface-inverse border-surface-inverse-border text-surface-inverse-foreground shadow-2xl scale-[1.02] z-10" : "bg-transparent border-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
 )}
 >
 <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center transition-all shadow-lg relative z-10", activeTab === 'popup' ? "bg-white/10 text-white shadow-black/20" : "bg-card text-muted-foreground group-hover:bg-hub-indigo group-hover:text-white")}>
 <Monitor size={22} />
 </div>
 <div className="flex flex-col text-left relative z-10">
 <span className="text-xs font-bold tracking-widest uppercase mb-1 opacity-40">영역 02</span>
 <span className="text-md font-bold tracking-tighter uppercase leading-tight">팝업 설정</span>
 </div>
 {activeTab === 'popup' && <div className="absolute right-0 top-0 w-32 h-32 bg-hub-indigo/20 rounded-lg blur-3xl -mr-16 -mt-16 pointer-events-none opacity-50" />}
 </button>
 <div className="mt-auto p-8 rounded-lg bg-surface-inverse text-surface-inverse-foreground space-y-4 relative overflow-hidden group">
 <div className="relative z-10 space-y-4">
 <div className="flex items-center gap-3">
 <Sparkles size={16} className="text-primary animate-pulse" />
 <span className="text-xs font-bold tracking-widest uppercase text-white/40">시스템 상태</span>
 </div>
 <h5 className="text-lg font-bold tracking-tighter uppercase leading-none">프로모션 엔진</h5>
 <p className="text-xs font-bold text-muted-foreground leading-relaxed uppercase opacity-60">등록된 모든 배너 및 팝업 자산은 시스템에 즉시 반영됩니다.</p>
 </div>
 </div>
 </div>
 </div>

 <div className="col-span-12 lg:col-span-9">
 <AnimatePresence mode="wait">
 <motion.div
 key={activeTab}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -10 }}
 transition={{ duration: 0.5 }}
 >
 <HubSectionCard
 title={activeTab === 'banner' ? "배너 목록" : "팝업 목록"}
 description={activeTab === 'banner' ? "포털 메인 및 서브 섹션에 노출되는 배너 목록입니다" : "기간 지정 공지 및 안내를 위한 팝업 관리 목록입니다"}
 icon={activeTab === 'banner' ? ImageIcon : Monitor}
 >
 <div className="overflow-hidden">
 {/* 배너/팝업은 키 필드가 달라 union 캐스팅 대신 타입별로 분리 렌더한다(as any 제거). */}
 {activeTab === 'banner' ? (
 <StandardDataTable<Banner>
 columns={bannerColumns}
 data={banners}
 loading={isBannersLoading}
 error={bannerError}
 onRetry={() => refetchBanners()}
 keyField="bnrId"
 emptyMessage="등록된 배너 자산이 존재하지 않습니다."
 className="border-none bg-transparent"
 pagination={{
 currentPage: page,
 totalPages: bannerPageData?.totalPage || 1,
 totalCount: bannerTotal,
 pageSize: PAGE_SIZE,
 onPageChange: setPage
 }}
 />
 ) : (
 <StandardDataTable<Popup>
 columns={popupColumns}
 data={popups}
 loading={isPopupsLoading}
 error={popupError}
 onRetry={() => refetchPopups()}
 keyField="popupId"
 emptyMessage="등록된 팝업 자산이 존재하지 않습니다."
 className="border-none bg-transparent"
 pagination={{
 currentPage: page,
 totalPages: popupPageData?.totalPage || 1,
 totalCount: popupTotal,
 pageSize: PAGE_SIZE,
 onPageChange: setPage
 }}
 />
 )}
 </div>
 </HubSectionCard>
 </motion.div>
 </AnimatePresence>
 </div>
 </div>

 <StandardModal
 isOpen={isModalOpen}
 onClose={() => setIsOpen(false)}
 title={activeTab === 'banner' ? (editingItem ? '배너 명세 수정' : '신규 비주얼 자산 등록') : (editingItem ? '팝업 아키텍처 수정' : '신규 레이어 팝업 설계')}
 maxWidth="3xl"
 footer={
 <div className="flex w-full gap-4">
 <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-11 rounded-lg font-bold text-xs tracking-widest border-2">취소</Button>
 <Button
 onClick={activeTab === 'banner' ? (bannerForm.handleSubmit(onBannerSubmit) as any) : (popupForm.handleSubmit(onPopupSubmit) as any)}
 disabled={activeTab === 'banner' ? bannerForm.formState.isSubmitting : popupForm.formState.isSubmitting}
 className="flex-[2] h-11 rounded-lg bg-surface-inverse border-none text-surface-inverse-foreground font-bold text-xs tracking-widest shadow-2xl hover:bg-primary transition-all hover:-translate-y-2 group"
 >
 <Zap size={18} className="group-hover:animate-pulse mr-2" /> {editingItem ? '자산 수정' : '운영 배포'}
 </Button>
 </div>
 }
 >
 <div className="pt-4 p-4">
 {activeTab === 'banner' ? (
 <Form {...bannerForm}>
 <form onSubmit={bannerForm.handleSubmit(onBannerSubmit) as any} className="space-y-12">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
 <div className="space-y-8">
 <ShadcnFormField
 control={bannerForm.control}
 name="bnrNm"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">배너 명칭 (Internal Label) <span className="text-rose-500 font-bold text-xs">*</span></FormLabel>
 <FormControl>
 <Input {...field} className="h-11 rounded-lg text-md font-bold tracking-tight shadow-inner" placeholder="배너 이름 입력" />
 </FormControl>
 <p className="text-xs font-bold text-muted-foreground px-1 mt-1 leading-relaxed">관리용 명칭입니다</p>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />
 <ShadcnFormField
 control={bannerForm.control}
 name="linkUrl"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">랜딩 페이지 (Target URL)</FormLabel>
 <div className="relative group/link">
 <LinkIcon size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/link:opacity-100 transition-opacity" />
 <FormControl>
 <Input {...field} className="h-11 pl-16 rounded-lg font-mono text-xs font-bold shadow-inner" placeholder="/pages/..." />
 </FormControl>
 </div>
 <p className="text-xs font-bold text-muted-foreground px-1 mt-1 leading-relaxed">클릭 시 이동할 프론트엔드 라우트 또는 외부 경로</p>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />
 <div className="grid grid-cols-2 gap-8">
 <ShadcnFormField
 control={bannerForm.control}
 name="sortOrdr"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">노출 순서 Priority <span className="text-rose-500 font-bold text-xs">*</span></FormLabel>
 <FormControl>
 <Input {...field} type="number" onChange={(e) => field.onChange(Number(e.target.value))} className="h-11 rounded-lg font-bold shadow-inner" />
 </FormControl>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />
 <ShadcnFormField
 control={bannerForm.control}
 name="rfltYn"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">자산 로드 상태</FormLabel>
 <Select onValueChange={field.onChange} value={field.value}>
 <FormControl>
 <SelectTrigger className="h-11 rounded-lg border-2 border-border bg-muted font-bold text-xs tracking-widest uppercase shadow-inner">
 <SelectValue />
 </SelectTrigger>
 </FormControl>
 <SelectContent className="rounded-lg shadow-2xl">
 <SelectItem value="Y" className="h-12 rounded-lg text-xs font-bold tracking-widest uppercase">--- 활성 (Live) ---</SelectItem>
 <SelectItem value="N" className="h-12 rounded-lg text-xs font-bold tracking-widest uppercase text-rose-500">--- 대기 (Staging) ---</SelectItem>
 </SelectContent>
 </Select>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />
 </div>
 <ShadcnFormField
 control={bannerForm.control}
 name="bnrExpln"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">자산 명세 및 설명 (Metadata)</FormLabel>
 <FormControl>
 <textarea {...field} className="w-full min-h-[120px] p-6 rounded-lg border-2 border-border bg-muted text-xs font-bold focus:ring-4 focus:ring-primary/10 outline-none resize-none shadow-inner" placeholder="배너 자산 용도 및 노출 조건 설명" />
 </FormControl>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />
 </div>
 <div className="space-y-12">
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">미디어 자산 업로드 (Visual Payload) <span className="text-rose-500 font-bold text-xs">*</span></FormLabel>
 <div className="p-4 border-4 border-dashed border-border rounded-lg bg-muted/50 hover:bg-muted transition-colors shadow-inner relative group/upload">
 <StandardFileUploader onFilesChange={(f) => setFormFiles(f)} maxFiles={1} />
 <div className="mt-4 flex items-center justify-center gap-4 text-muted-foreground/30">
 <UploadCloud size={24} />
 <span className="text-xs font-bold tracking-widest text-center">여기로 파일을 드래그하여 업로드</span>
 </div>
 </div>
 <p className="text-xs font-bold text-muted-foreground px-1 mt-1 leading-relaxed">시스템 표준 규격 이미지를 준수하십시오</p>
 </FormItem>
 {(editingItem as Banner)?.atchFileId && (
 <div className="p-8 rounded-lg bg-surface-inverse text-surface-inverse-foreground space-y-3 shadow-2xl relative overflow-hidden group">
 <span className="text-xs font-bold text-white/30 tracking-[0.4em] uppercase">기존 파일 식별자</span>
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shadow-inner group-hover:rotate-12 transition-transform">
 <SearchCode size={20} className="text-primary" />
 </div>
 <span className="font-mono text-xs font-bold tracking-tighter text-white/80 truncate">{(editingItem as Banner).bnrImgNm}</span>
 </div>
 </div>
 )}
 </div>
 </div>
 </form>
 </Form>
 ) : (
 <Form {...popupForm}>
 <form onSubmit={popupForm.handleSubmit(onPopupSubmit) as any} className="space-y-12">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
 <div className="space-y-8">
 <ShadcnFormField
 control={popupForm.control}
 name="popupTtlNm"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">팝업 타이틀 (Header) <span className="text-rose-500 font-bold text-xs">*</span></FormLabel>
 <FormControl>
 <Input {...field} className="h-11 rounded-lg text-md font-bold tracking-tight shadow-inner" placeholder="팝업 제목 입력" />
 </FormControl>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />
 <div className="grid grid-cols-2 gap-8 p-10 bg-muted border-2 border-dashed border-border rounded-lg shadow-inner">
 <ShadcnFormField
 control={popupForm.control}
 name="ntceBgnde"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">게시 시작 시점 (T-0) <span className="text-rose-500 font-bold text-xs">*</span></FormLabel>
 <FormControl>
 <Input 
 {...field} 
 type="text" 
 placeholder="YYYY-MM-DD"
 onChange={(e) => {
 const value = e.target.value.replace(/\D/g, '');
 if (value.length <= 8) {
 let formatted = value;
 if (value.length > 4 && value.length <= 6) {
 formatted = `${value.slice(0, 4)}-${value.slice(4)}`;
 } else if (value.length > 6) {
 formatted = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6)}`;
 }
 field.onChange(formatted);
 }
 }}
 className="h-11 rounded-lg text-xs font-bold shadow-sm" 
 />
 </FormControl>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />
 <ShadcnFormField
 control={popupForm.control}
 name="ntceEndde"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">게시 종료 시점 (T-End) <span className="text-rose-500 font-bold text-xs">*</span></FormLabel>
 <FormControl>
 <Input 
 {...field} 
 type="text" 
 placeholder="YYYY-MM-DD"
 onChange={(e) => {
 const value = e.target.value.replace(/\D/g, '');
 if (value.length <= 8) {
 let formatted = value;
 if (value.length > 4 && value.length <= 6) {
 formatted = `${value.slice(0, 4)}-${value.slice(4)}`;
 } else if (value.length > 6) {
 formatted = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6)}`;
 }
 field.onChange(formatted);
 }
 }}
 className="h-11 rounded-lg text-xs font-bold shadow-sm" 
 />
 </FormControl>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />
 </div>
 <div className="grid grid-cols-2 gap-8">
 <ShadcnFormField
 control={popupForm.control}
 name="popupWdthPstn"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">가로 좌표 (X_Pivot) <span className="text-rose-500 font-bold text-xs">*</span></FormLabel>
 <FormControl>
 <Input {...field} type="number" onChange={(e) => field.onChange(Number(e.target.value))} className="h-11 rounded-lg font-bold shadow-inner" />
 </FormControl>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />
 <ShadcnFormField
 control={popupForm.control}
 name="popupVrtcPstn"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">세로 좌표 (Y_Pivot) <span className="text-rose-500 font-bold text-xs">*</span></FormLabel>
 <FormControl>
 <Input {...field} type="number" onChange={(e) => field.onChange(Number(e.target.value))} className="h-11 rounded-lg font-bold shadow-inner" />
 </FormControl>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />
 </div>
 <div className="grid grid-cols-2 gap-8">
 <ShadcnFormField
 control={popupForm.control}
 name="popupWdthSz"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">가로 폭 (W_Res) <span className="text-rose-500 font-bold text-xs">*</span></FormLabel>
 <FormControl>
 <Input {...field} type="number" onChange={(e) => field.onChange(Number(e.target.value))} className="h-11 rounded-lg font-bold shadow-inner" />
 </FormControl>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />
 <ShadcnFormField
 control={popupForm.control}
 name="popupVrtcSz"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">세로 높이 (H_Res) <span className="text-rose-500 font-bold text-xs">*</span></FormLabel>
 <FormControl>
 <Input {...field} type="number" onChange={(e) => field.onChange(Number(e.target.value))} className="h-11 rounded-lg font-bold shadow-inner" />
 </FormControl>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />
 </div>
 </div>
 <div className="space-y-12">
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">미디어 자산 업로드 (Visual Payload) <span className="text-rose-500 font-bold text-xs">*</span></FormLabel>
 <div className="p-4 border-4 border-dashed border-border rounded-lg bg-muted/50 hover:bg-muted transition-colors shadow-inner relative group/upload">
 <StandardFileUploader onFilesChange={(f) => setFormFiles(f)} maxFiles={1} />
 <div className="mt-4 flex items-center justify-center gap-4 text-muted-foreground/30">
 <UploadCloud size={24} />
 <span className="text-xs font-bold tracking-widest text-center">여기로 파일을 드래그하여 업로드</span>
 </div>
 </div>
 <p className="text-xs font-bold text-muted-foreground px-1 mt-1 leading-relaxed">시스템 표준 규격 이미지를 준수하십시오</p>
 </FormItem>
 {(editingItem as Popup)?.fileUrl && (
 <div className="p-8 rounded-lg bg-surface-inverse text-surface-inverse-foreground space-y-3 shadow-2xl relative overflow-hidden group">
 <span className="text-xs font-bold text-white/30 tracking-[0.4em] uppercase">기존 파일 식별자</span>
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shadow-inner group-hover:rotate-12 transition-transform">
 <SearchCode size={20} className="text-primary" />
 </div>
 <span className="font-mono text-xs font-bold tracking-tighter text-white/80 truncate">{(editingItem as Popup).fileUrl}</span>
 </div>
 </div>
 )}
 <div className="grid grid-cols-1 gap-8 p-10 bg-indigo-50/30 border-2 border-indigo-100/50 rounded-lg shadow-sm">
 <p className="text-xs font-bold text-hub-indigo/50 tracking-[0.4em] uppercase mb-1">상태 프로토콜</p>
 <div className="grid grid-cols-2 gap-6">
 <ShadcnFormField
 control={popupForm.control}
 name="ntceYn"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight tracking-widest uppercase">게시 설정</FormLabel>
 <Select onValueChange={field.onChange} value={field.value}>
 <FormControl>
 <SelectTrigger className="h-11 rounded-lg border-2 border-indigo-100 bg-card font-bold text-xs tracking-widest uppercase shadow-sm">
 <SelectValue />
 </SelectTrigger>
 </FormControl>
 <SelectContent className="rounded-lg">
 <SelectItem value="Y" className="font-bold text-xs tracking-widest uppercase">게시 (LIVE)</SelectItem>
 <SelectItem value="N" className="font-bold text-xs tracking-widest uppercase text-rose-500">대기 (STAGING)</SelectItem>
 </SelectContent>
 </Select>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />
 <ShadcnFormField
 control={popupForm.control}
 name="stopvewSetupYn"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight tracking-widest uppercase">다시보지않기 처리</FormLabel>
 <Select onValueChange={field.onChange} value={field.value}>
 <FormControl>
 <SelectTrigger className="h-11 rounded-lg border-2 border-indigo-100 bg-card font-bold text-xs tracking-widest uppercase shadow-sm">
 <SelectValue />
 </SelectTrigger>
 </FormControl>
 <SelectContent className="rounded-lg">
 <SelectItem value="Y" className="font-bold text-xs tracking-widest uppercase">활성 (ENABLE)</SelectItem>
 <SelectItem value="N" className="font-bold text-xs tracking-widest uppercase">비활성 (DISABLE)</SelectItem>
 </SelectContent>
 </Select>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />
 </div>
 </div>
 </div>
 </div>
 </form>
 </Form>
 )}
 </div>
 </StandardModal>
 </div>
 );
}

