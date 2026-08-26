'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import dynamic from 'next/dynamic';
const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });
import { StandardFileUploader } from '@/app/components/ui/standard-file-uploader';
import { AttachmentImage } from '@/app/components/ui/attachment-image';
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
 Loader2,
 Monitor, 
 Calendar, 
 Zap, 
 Settings, 
 SearchCode, 
 Maximize2, 
 UploadCloud, 
 Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
 saveBannerAction,
 deleteBannerAction,
 savePopupAction,
 deletePopupAction
} from '@/app/actions/promotionActions';
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

import { BannerDtoSchema, PopupDtoSchema } from '@/types/generated-zod';

export const bannerSchema = BannerDtoSchema.extend({
 bnrNm: BannerDtoSchema.shape.bnrNm.min(1),
 sortOrdr: z.coerce.number().min(0, '정렬 순서는 0 이상의 숫자여야 합니다.'),
 rfltYn: BannerDtoSchema.shape.rfltYn.unwrap(),
});

const popupNumberSchema = (
 generatedField: z.ZodOptional<z.ZodString>,
 minimum: number,
) => z.coerce.string()
 .pipe(generatedField.unwrap().min(1, '숫자를 입력하세요.'))
 .transform(Number)
 .pipe(z.number().min(minimum));

const isoDateSchema = (generatedField: z.ZodOptional<z.ZodString>) => generatedField.unwrap()
 .min(1, '게시 일자를 입력하세요.')
 .regex(/^\d{4}-\d{2}-\d{2}$/, '게시 일자는 YYYY-MM-DD 형식이어야 합니다.')
 .refine((value) => {
 const [year, month, day] = value.split('-').map(Number);
 const parsed = new Date(Date.UTC(year, month - 1, day));
 return parsed.getUTCFullYear() === year
 && parsed.getUTCMonth() === month - 1
 && parsed.getUTCDate() === day;
 }, '유효한 게시 일자를 입력하세요.');

export const popupSchema = PopupDtoSchema.extend({
 popupTtlNm: PopupDtoSchema.shape.popupTtlNm.min(1),
 ntceBgnde: isoDateSchema(PopupDtoSchema.shape.ntceBgnde),
 ntceEndde: isoDateSchema(PopupDtoSchema.shape.ntceEndde),
 popupWdthPstn: popupNumberSchema(PopupDtoSchema.shape.popupWdthPstn, 0),
 popupVrtcPstn: popupNumberSchema(PopupDtoSchema.shape.popupVrtcPstn, 0),
 popupWdthSz: popupNumberSchema(PopupDtoSchema.shape.popupWdthSz, 100),
 popupVrtcSz: popupNumberSchema(PopupDtoSchema.shape.popupVrtcSz, 100),
 ntceYn: PopupDtoSchema.shape.ntceYn.unwrap(),
 stopvewSetupYn: PopupDtoSchema.shape.stopvewSetupYn.unwrap(),
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
/** 페이지당 건수 기본값(A1 필수 — 사용자가 바꿀 수 있다). URL 에는 싣지 않는다. */
const DEFAULT_PAGE_SIZE = 20;

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

 const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
 const [isModalOpen, setIsOpen] = useState(false);
 const [editingItem, setEditingItem] = useState<Banner | Popup | null>(null);
 const [formFiles, setFormFiles] = useState<File[]>([]);
 const bannerValidationLock = useRef(false);
 const popupValidationLock = useRef(false);
 const bannerSubmitLock = useRef(false);
 const popupSubmitLock = useRef(false);
 const deletePendingRef = useRef(false);
 const [deletingAssetKey, setDeletingAssetKey] = useState<string | null>(null);

 const bannerForm = useAppForm<typeof bannerSchema, BannerFormValues>(bannerSchema, {
 defaultValues: {
 bnrNm: '',
 linkUrl: '',
 sortOrdr: 0,
 rfltYn: 'Y',
 bnrExpln: ''
 }
 });

 const popupForm = useAppForm<typeof popupSchema, PopupFormValues>(popupSchema, {
 defaultValues: {
 popupTtlNm: '',
 ntceBgnde: '',
 ntceEndde: '',
 popupWdthPstn: 0,
 popupVrtcPstn: 0,
 popupWdthSz: 400,
 popupVrtcSz: 400,
 ntceYn: 'Y',
 stopvewSetupYn: 'Y'
 }
 });
 const isAssetSubmitting = activeTab === 'banner'
 ? bannerForm.formState.isSubmitting
 : popupForm.formState.isSubmitting;
 const isAssetWritePending = isAssetSubmitting || deletingAssetKey !== null;

 const resetBannerForm = bannerForm.reset;
 const resetPopupForm = popupForm.reset;

 React.useEffect(() => {
 if (isModalOpen) {
 if (activeTab === 'banner') {
 const item = editingItem as Banner;
 resetBannerForm({
 bnrNm: item?.bnrNm || '',
 linkUrl: item?.linkUrl || '',
 sortOrdr: item?.sortOrdr || 0,
 rfltYn: (item?.rfltYn as 'Y' | 'N') || 'Y',
 bnrExpln: item?.bnrExpln || ''
 });
 } else {
 const item = editingItem as Popup;
 resetPopupForm({
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
 // useAppForm 은 최신 formState 를 노출하기 위해 wrapper 를 새로 만든다. form 객체 자체를
 // 의존성에 두면 입력 렌더마다 effect 가 재실행되어 방금 입력한 값을 빈 값으로 reset 한다.
 }, [isModalOpen, activeTab, editingItem, resetBannerForm, resetPopupForm]);

  /** 비활성 탭은 지표(전체 건수)만 필요하므로 항상 1페이지를 조회한다. */
  const bannerPage = activeTab === 'banner' ? page : 1;
  const popupPage = activeTab === 'popup' ? page : 1;

  /*
   * 배너/팝업 컨트롤러는 모두 Spring Pageable(page/size, 0-based)만 읽는다.
   * 종전의 pageUnit:999 는 바인딩 대상이 아니라 그대로 무시됐고, 실제로는 서버 기본값(size=10)만
   * 내려와 11번째 자산부터는 수정·게시중단이 UI 상 불가능했다. 정상 페이징 + 페이저 연결로 정정한다.
   */
  const { data: bannerPageData, isLoading: isBannersLoading, error: bannerError, refetch: refetchBanners } = useQuery({
  queryKey: ['admin-banners', bannerPage, pageSize],
  queryFn: () => bannerAdminService.getBannerList({ page: bannerPage - 1, size: pageSize })
  });

  const { data: popupPageData, isLoading: isPopupsLoading, error: popupError, refetch: refetchPopups } = useQuery({
  queryKey: ['admin-popups', popupPage, pageSize],
  queryFn: () => popupAdminService.getPopupList({ page: popupPage - 1, size: pageSize })
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
 if (bannerValidationLock.current || popupValidationLock.current
 || bannerSubmitLock.current || popupSubmitLock.current || deletePendingRef.current || isModalOpen) return;
 setEditingItem(null);
 setFormFiles([]);
 setIsOpen(true);
 };

 const handleEdit = (item: Banner | Popup) => {
 if (bannerValidationLock.current || popupValidationLock.current
 || bannerSubmitLock.current || popupSubmitLock.current || deletePendingRef.current || isModalOpen) return;
 setEditingItem(item);
 setFormFiles([]);
 setIsOpen(true);
 };

 /** [P1-9] 확인 본문에 대상 식별자(명칭)를 노출해 오삭제를 막는다. */
 const handleDelete = async (assetType: 'banner' | 'popup', id: string | number, name: string) => {
 if (deletePendingRef.current || bannerValidationLock.current || popupValidationLock.current
 || bannerSubmitLock.current || popupSubmitLock.current || isModalOpen) return;
 deletePendingRef.current = true;
 const assetKey = `${assetType}:${id}`;
 const kind = assetType === 'banner' ? '배너' : '팝업';
 setDeletingAssetKey(assetKey);

 try {
 const ok = await confirm({
 title: `${kind} 삭제 확인`,
 message: `‘${name}’ ${kind}을(를) 시스템에서 영구적으로 삭제합니다. 게시 중인 경우 즉시 중단되며 되돌릴 수 없습니다.`,
 variant: 'destructive',
 confirmText: '삭제'
 });

 if (!ok) return;

 const res = assetType === 'banner'
 ? await deleteBannerAction(null, Number(id))
 : await deletePopupAction(null, Number(id));

 if (res.success) {
 toast(res.message, 'success');
 if (assetType === 'banner') void refetchBanners();
 else void refetchPopups();
 } else {
 toast(res.message, 'error');
 }
 } catch {
 toast('자산 삭제 처리 중 예외가 발생했습니다.', 'error');
 } finally {
 deletePendingRef.current = false;
 setDeletingAssetKey(null);
 }
 };

 const onBannerSubmit = async (values: z.infer<typeof bannerSchema>) => {
 if (bannerSubmitLock.current || popupSubmitLock.current || deletePendingRef.current) return;
 bannerSubmitLock.current = true;
 try {
 const data = {
 ...values,
 rfltYn: values.rfltYn as "Y" | "N"
 } as any;
 if (formFiles.length > 0) {
 const uploadRes = await fileAdminService.uploadFiles(formFiles);
 const uploadedFileSn = (uploadRes as any)?.data?.data || (uploadRes as any)?.data || uploadRes;
 if (uploadedFileSn) {
 data.atchFileSn = uploadedFileSn;
 data.bnrImgNm = formFiles[0].name;
 }
 } else if (editingItem) {
 data.atchFileSn = (editingItem as Banner).atchFileSn;
 data.bnrImgNm = (editingItem as Banner).bnrImgNm;
 }

 const res = await saveBannerAction(null, {
 mode: editingItem ? 'edit' : 'create',
 data: data as Banner,
 id: (editingItem as Banner)?.bnrSn
 });

 if (res.success) {
 toast(res.message, 'success');
 setIsOpen(false);
 refetchBanners();
 } else if (!bannerForm.applyServerErrors(res)) {
 toast(res.message, 'error');
 }
 } catch (error) {
 if (!bannerForm.applyServerErrors(error)) {
 toast('데이터 처리 중 오류가 발생했습니다.', 'error');
 }
 } finally {
 bannerSubmitLock.current = false;
 bannerValidationLock.current = false;
 }
 };

 const onPopupSubmit = async (values: z.infer<typeof popupSchema>) => {
 if (popupSubmitLock.current || bannerSubmitLock.current || deletePendingRef.current) return;
 popupSubmitLock.current = true;
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
 const uploadedFileSn = typeof uploadRes === 'number' ? uploadRes : (uploadRes as any)?.data?.data || (uploadRes as any)?.data;
 
 if (uploadedFileSn) {
 // 종전에는 `/api/v1/files/download?fileId=…` 를 저장했는데 백엔드에 그 경로가 없다(매핑 0건).
 // 실존 경로를 저장한다. 렌더는 blob 으로 하되(헤더 인증), 값 자체는 실재하는 URL 이어야
 // 나중에 다른 소비자가 열어 보더라도 404 가 아니게 된다.
 data.fileUrl = `/api/v1/files/${uploadedFileSn}`;
 }
 } else if (editingItem) {
 data.fileUrl = (editingItem as Popup).fileUrl;
 }

 const res = await savePopupAction(null, {
 mode: editingItem ? 'edit' : 'create',
 data: data as Popup,
 id: (editingItem as Popup)?.popupSn
 });

 if (res.success) {
 toast(res.message, 'success');
 setIsOpen(false);
 refetchPopups();
 } else if (!popupForm.applyServerErrors(res)) {
 toast(res.message, 'error');
 }
 } catch (error) {
 if (!popupForm.applyServerErrors(error)) {
 toast('데이터 처리 중 오류가 발생했습니다.', 'error');
 }
 } finally {
 popupSubmitLock.current = false;
 popupValidationLock.current = false;
 }
 };

 const closeAssetModal = () => {
 if (bannerValidationLock.current || popupValidationLock.current
 || bannerSubmitLock.current || popupSubmitLock.current || deletePendingRef.current) return;
 setIsOpen(false);
 };

 const submitBannerForm = (event?: React.BaseSyntheticEvent) => {
 if (bannerValidationLock.current || popupValidationLock.current
 || bannerSubmitLock.current || popupSubmitLock.current || deletePendingRef.current) {
 event?.preventDefault();
 return;
 }
 bannerValidationLock.current = true;
 const submit = bannerForm.handleSubmit(onBannerSubmit, () => {
 bannerValidationLock.current = false;
 });
 void submit(event).catch(() => {
 bannerValidationLock.current = false;
 bannerSubmitLock.current = false;
 });
 };

 const submitPopupForm = (event?: React.BaseSyntheticEvent) => {
 if (popupValidationLock.current || bannerValidationLock.current
 || popupSubmitLock.current || bannerSubmitLock.current || deletePendingRef.current) {
 event?.preventDefault();
 return;
 }
 popupValidationLock.current = true;
 const submit = popupForm.handleSubmit(onPopupSubmit, () => {
 popupValidationLock.current = false;
 });
 void submit(event).catch(() => {
 popupValidationLock.current = false;
 popupSubmitLock.current = false;
 });
 };

 const bannerColumns: Column<Banner>[] = [
 {
 header: '비주얼 자산 스냅샷',
 accessor: (item: Banner) => (
 <div className="w-56 h-24 bg-surface-inverse rounded-lg overflow-hidden border-2 border-border shadow-xl relative group/img cursor-zoom-in transition-all duration-500 hover:scale-[1.05] hover:z-50">
 <ImageIcon size={24} className="absolute inset-0 m-auto text-white/10" />
 {item.atchFileSn && (
 // blob 렌더 — `<img src="/api/v1/files/…">` 는 Authorization 헤더를 실을 수 없어 401 이다.
 <div className="absolute inset-0 z-10">
 <AttachmentImage
 atchFileSn={item.atchFileSn}
 alt={`${item.bnrNm} 배너 이미지`}
 className="h-full w-full object-cover group-hover/img:scale-110 transition-transform duration-1000"
 />
 </div>
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
 <span className="text-xs font-bold text-muted-foreground/50 tracking-[0.3em] font-mono uppercase">SN: {item.bnrSn}</span>
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
 <Button variant="ghost" size="icon" aria-label={`${item.bnrNm} 배너 수정`} disabled={isAssetWritePending || isModalOpen} className="h-10 w-10 bg-muted hover:bg-surface-inverse hover:text-surface-inverse-foreground rounded-lg border border-border transition-all font-bold" onClick={() => handleEdit(item)}>
 <Settings size={16} aria-hidden="true" />
 </Button>
 <Button
 variant="ghost"
 size="icon"
 aria-label={`${item.bnrNm} 배너 ${deletingAssetKey === `banner:${item.bnrSn}` ? '삭제 중…' : '삭제'}`}
 aria-busy={deletingAssetKey === `banner:${item.bnrSn}` || undefined}
 disabled={isAssetWritePending || isModalOpen}
 className="h-10 w-10 text-destructive-emphasis bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground border border-destructive/20 rounded-lg transition-all"
 onClick={() => handleDelete('banner', item.bnrSn, item.bnrNm)}
 >
 {deletingAssetKey === `banner:${item.bnrSn}`
 ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
 : <Trash2 size={16} aria-hidden="true" />}
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
 <Button variant="ghost" size="icon" aria-label={`${item.popupTtlNm} 팝업 수정`} disabled={isAssetWritePending || isModalOpen} className="h-10 w-10 bg-muted hover:bg-surface-inverse hover:text-surface-inverse-foreground rounded-lg border border-border transition-all font-bold" onClick={() => handleEdit(item)}>
 <Settings size={16} aria-hidden="true" />
 </Button>
 <Button
 variant="ghost"
 size="icon"
 aria-label={`${item.popupTtlNm} 팝업 ${deletingAssetKey === `popup:${item.popupSn}` ? '삭제 중…' : '삭제'}`}
 aria-busy={deletingAssetKey === `popup:${item.popupSn}` || undefined}
 disabled={isAssetWritePending || isModalOpen}
 className="h-10 w-10 text-destructive-emphasis bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground border border-destructive/20 rounded-lg transition-all"
 onClick={() => handleDelete('popup', item.popupSn, item.popupTtlNm)}
 >
 {deletingAssetKey === `popup:${item.popupSn}`
 ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
 : <Trash2 size={16} aria-hidden="true" />}
 </Button>
 </div>
 )
 }
 ];

  return (
    <>
    <WorkListPage
      title="배너/팝업 관리"
      description={activeTab === 'banner'
        ? '포털 메인·서브 영역에 노출되는 배너를 조회하고 게시 상태를 관리합니다.'
        : '기간을 지정해 노출하는 공지 팝업을 조회하고 게시 상태를 관리합니다.'}
      breadcrumbItems={[{ label: '시스템 관리' }, { label: '홍보 관리' }]}
      filterStateKey="system-banner"
      totalCount={activeTab === 'banner'
        ? (bannerError ? undefined : bannerTotal)
        : (popupError ? undefined : popupTotal)}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {/*
            토글 시맨틱은 aria-pressed 다. role="tab" 으로 바꾸지 않는다 —
            e2e POM(PromotionPage.ts)이 getByRole('button', {name:/배너 설정/}) 로 잡고 있어
            역할을 바꾸면 타 소유 파일까지 동반 수정해야 한다.
          */}
          <div className="flex rounded-md border border-border p-0.5">
            <button
              type="button"
              aria-pressed={activeTab === 'banner'}
              onClick={() => setTab('banner')}
              className={cn(
                'flex h-[var(--control-h-sm)] items-center gap-2 rounded px-4 text-xs font-bold transition-colors',
                activeTab === 'banner' ? 'bg-muted text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <ImageIcon size={14} aria-hidden="true" /> 배너 설정
            </button>
            <button
              type="button"
              aria-pressed={activeTab === 'popup'}
              onClick={() => setTab('popup')}
              className={cn(
                'flex h-[var(--control-h-sm)] items-center gap-2 rounded px-4 text-xs font-bold transition-colors',
                activeTab === 'popup' ? 'bg-muted text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Monitor size={14} aria-hidden="true" /> 팝업 설정
            </button>
          </div>
          <Button size="sm" onClick={handleCreate} disabled={isAssetWritePending || isModalOpen}>
            <Plus size={16} aria-hidden="true" /> 신규 {activeTab === 'banner' ? '배너' : '팝업'} 등록
          </Button>
        </div>
      }
      toolbarActions={
        /* 지표 카드 4장을 한 줄 요약으로 수렴한다. '전체 자산'(단순 합)과 장식 카드는 제거했고,
           서버 집계가 없는 '예약 자산'은 현재 페이지 기준임을 문구로 밝힌다. */
        <span className="text-[length:var(--font-size-body)] text-muted-foreground">
          배너 <span className="font-bold text-foreground">{bannerError ? '조회 실패' : bannerTotal}</span> ·
          팝업 <span className="font-bold text-foreground">{popupError ? '조회 실패' : popupTotal}</span>
          {activeTab === 'popup' && now && (
            <> · 현재 페이지 게시 예정 <span className="font-bold text-foreground">
              {popups.filter((item) => new Date(item.ntceBgnde) > now).length}
            </span>건</>
          )}
        </span>
      }
    >
      {/* 배너/팝업은 키 필드가 달라 union 캐스팅 대신 타입별로 분리 렌더한다. */}
      {activeTab === 'banner' ? (
        <StandardDataTable<Banner>
          columns={bannerColumns}
          data={banners}
          loading={isBannersLoading}
          error={bannerError}
          onRetry={() => refetchBanners()}
          keyField="bnrSn"
          emptyMessage="등록된 배너가 없습니다."
          pagination={{
            currentPage: page,
            totalPages: bannerPageData?.totalPage || 1,
            // totalCount 는 셸 툴바가 소유한다(표 하단 중복 표기 방지).
            pageSize,
            onPageSizeChange: (size) => { setPageSize(size); setPage(1); },
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
          keyField="popupSn"
          emptyMessage="등록된 팝업이 없습니다."
          pagination={{
            currentPage: page,
            totalPages: popupPageData?.totalPage || 1,
            // totalCount 는 셸 툴바가 소유한다(표 하단 중복 표기 방지).
            pageSize,
            onPageSizeChange: (size) => { setPageSize(size); setPage(1); },
            onPageChange: setPage
          }}
        />
      )}
    </WorkListPage>

 <StandardModal
 isOpen={isModalOpen}
 onClose={closeAssetModal}
 title={activeTab === 'banner' ? (editingItem ? '배너 명세 수정' : '신규 비주얼 자산 등록') : (editingItem ? '팝업 아키텍처 수정' : '신규 레이어 팝업 설계')}
 maxWidth="3xl"
 footer={
 <div className="flex w-full gap-4">
 <Button variant="outline" onClick={closeAssetModal} disabled={isAssetWritePending} className="flex-1 h-11 rounded-lg font-bold text-xs tracking-widest border-2">취소</Button>
 <Button
 onClick={activeTab === 'banner' ? () => submitBannerForm() : () => submitPopupForm()}
 disabled={isAssetWritePending}
 aria-busy={isAssetSubmitting || undefined}
 className="flex-[2] h-11 rounded-lg bg-surface-inverse border-none text-surface-inverse-foreground font-bold text-xs tracking-widest shadow-2xl hover:bg-primary transition-all hover:-translate-y-2 group"
 >
 <Zap size={18} className="group-hover:animate-pulse mr-2" /> {isAssetSubmitting ? '배포 중…' : editingItem ? '자산 수정' : '운영 배포'}
 </Button>
 </div>
 }
 >
 <div className="pt-4 p-4">
 {activeTab === 'banner' ? (
 <Form {...bannerForm}>
 <form noValidate onSubmit={submitBannerForm} className="space-y-12">
 <FormErrorSummary
 labels={{
 bnrNm: '배너 명칭',
 linkUrl: '랜딩 페이지',
 sortOrdr: '노출 순서',
 rfltYn: '자산 로드 상태',
 bnrExpln: '자산 설명',
 }}
 onNavigate={bannerForm.focusError}
 />
 <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
 <div className="space-y-8">
 <ShadcnFormField
 control={bannerForm.control}
 name="bnrNm"
 required
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">배너 명칭 (Internal Label)</FormLabel>
 <FormControl>
 <Input {...field} maxLength={100} className="h-11 rounded-lg text-md font-bold tracking-tight shadow-inner" placeholder="배너 이름 입력" />
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
 <Input {...field} maxLength={512} className="h-11 pl-16 rounded-lg font-mono text-xs font-bold shadow-inner" placeholder="/pages/..." />
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
 required
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">노출 순서 Priority</FormLabel>
 <FormControl>
 <Input
 {...field}
 value={field.value ?? ''}
 type="number"
 min={0}
 onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
 className="h-11 rounded-lg font-bold shadow-inner"
 />
 </FormControl>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />
 <ShadcnFormField
 control={bannerForm.control}
 name="rfltYn"
 required
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
 <textarea {...field} maxLength={4000} className="w-full min-h-[120px] p-6 rounded-lg border-2 border-border bg-muted text-xs font-bold focus:ring-4 focus:ring-primary/10 outline-none resize-none shadow-inner" placeholder="배너 자산 용도 및 노출 조건 설명" />
 </FormControl>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />
 </div>
 <div className="space-y-12">
 <FormItem className="space-y-1.5 p-0.5">
 <Label className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">미디어 자산 업로드 (Visual Payload)</Label>
 <div className="p-4 border-4 border-dashed border-border rounded-lg bg-muted/50 hover:bg-muted transition-colors shadow-inner relative group/upload">
 <StandardFileUploader onFilesChange={(f) => setFormFiles(f)} maxFiles={1} />
 <div className="mt-4 flex items-center justify-center gap-4 text-muted-foreground/30">
 <UploadCloud size={24} />
 <span className="text-xs font-bold tracking-widest text-center">여기로 파일을 드래그하여 업로드</span>
 </div>
 </div>
 <p className="text-xs font-bold text-muted-foreground px-1 mt-1 leading-relaxed">시스템 표준 규격 이미지를 준수하십시오</p>
 </FormItem>
 {(editingItem as Banner)?.atchFileSn && (
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
 <form noValidate onSubmit={submitPopupForm} className="space-y-12">
 <FormErrorSummary
 labels={{
 popupTtlNm: '팝업 타이틀',
 ntceBgnde: '게시 시작 시점',
 ntceEndde: '게시 종료 시점',
 popupWdthPstn: '가로 좌표',
 popupVrtcPstn: '세로 좌표',
 popupWdthSz: '가로 폭',
 popupVrtcSz: '세로 높이',
 ntceYn: '게시 설정',
 stopvewSetupYn: '다시보지않기 처리',
 }}
 onNavigate={popupForm.focusError}
 />
 <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
 <div className="space-y-8">
 <ShadcnFormField
 control={popupForm.control}
 name="popupTtlNm"
 required
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">팝업 타이틀 (Header)</FormLabel>
 <FormControl>
 <Input {...field} maxLength={100} className="h-11 rounded-lg text-md font-bold tracking-tight shadow-inner" placeholder="팝업 제목 입력" />
 </FormControl>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />
 <div className="grid grid-cols-2 gap-8 p-10 bg-muted border-2 border-dashed border-border rounded-lg shadow-inner">
 <ShadcnFormField
 control={popupForm.control}
 name="ntceBgnde"
 required
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">게시 시작 시점 (T-0)</FormLabel>
 <FormControl>
 <Input 
 {...field} 
 type="text" 
 maxLength={10}
 inputMode="numeric"
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
 required
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">게시 종료 시점 (T-End)</FormLabel>
 <FormControl>
 <Input 
 {...field} 
 type="text" 
 maxLength={10}
 inputMode="numeric"
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
 required
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">가로 좌표 (X_Pivot)</FormLabel>
 <FormControl>
 <Input
 {...field}
 value={field.value ?? ''}
 type="number"
 min={0}
 max={999999999999}
 onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
 className="h-11 rounded-lg font-bold shadow-inner"
 />
 </FormControl>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />
 <ShadcnFormField
 control={popupForm.control}
 name="popupVrtcPstn"
 required
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">세로 좌표 (Y_Pivot)</FormLabel>
 <FormControl>
 <Input
 {...field}
 value={field.value ?? ''}
 type="number"
 min={0}
 max={999999999999}
 onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
 className="h-11 rounded-lg font-bold shadow-inner"
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
 name="popupWdthSz"
 required
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">가로 폭 (W_Res)</FormLabel>
 <FormControl>
 <Input
 {...field}
 value={field.value ?? ''}
 type="number"
 min={100}
 max={999999999999}
 onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
 className="h-11 rounded-lg font-bold shadow-inner"
 />
 </FormControl>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />
 <ShadcnFormField
 control={popupForm.control}
 name="popupVrtcSz"
 required
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">세로 높이 (H_Res)</FormLabel>
 <FormControl>
 <Input
 {...field}
 value={field.value ?? ''}
 type="number"
 min={100}
 max={999999999999}
 onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
 className="h-11 rounded-lg font-bold shadow-inner"
 />
 </FormControl>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />
 </div>
 </div>
 <div className="space-y-12">
 <FormItem className="space-y-1.5 p-0.5">
 <Label className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">미디어 자산 업로드 (Visual Payload)</Label>
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
 required
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
 required
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
    </>
  );
}

