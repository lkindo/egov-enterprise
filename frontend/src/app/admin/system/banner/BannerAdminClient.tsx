'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import dynamic from 'next/dynamic';
const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });
import { StandardFileUploader } from '@/app/components/ui/standard-file-uploader';
import { FormField } from '@/app/components/ui/standard-form';
import { Banner, Popup } from '@/types/foundation/banner';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { fileAdminService } from '@/services/foundation/system/FileAdminService';
import {
 Plus,
 Image as ImageIcon,
 ExternalLink,
 Trash2,
 Monitor,
 Calendar,
 Layers,
 Sparkles,
 CheckCircle2,
 Zap,
 Clock,
 Megaphone,
 Settings,
 SearchCode,
 Maximize2,
 UploadCloud,
 Link as LinkIcon
} from 'lucide-react';
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

const bannerSchema = z.object({
 bannerNm: z.string().min(1, '��� ��Ī�� �ʼ� �Է� �����Դϴ�.'),
 linkUrl: z.string().optional(),
 sortOrdr: z.coerce.number().min(0, '���� ������ 0 �̻��� ���ڿ��� �մϴ�.'),
 reflctAt: z.enum(['Y', 'N']),
 bannerDc: z.string().optional(),
});

const popupSchema = z.object({
 popupTitleName: z.string().min(1, '�˾� ������ �ʼ� �Է� �����Դϴ�.'),
 noticeBeginDate: z.string().min(1, '�Խ� �������� �ʼ��Դϴ�.'),
 noticeEndDate: z.string().min(1, '�Խ� �������� �ʼ��Դϴ�.'),
 popupWidthLocation: z.coerce.number().min(0),
 popupHeightLocation: z.coerce.number().min(0),
 popupWidthSize: z.coerce.number().min(100),
 popupHeightSize: z.coerce.number().min(100),
 isNotice: z.enum(['Y', 'N']),
 isStopView: z.enum(['Y', 'N']),
}).refine(data => {
 if (!data.noticeBeginDate || !data.noticeEndDate) return true;
 const start = data.noticeBeginDate.replace(/\D/g, '');
 const end = data.noticeEndDate.replace(/\D/g, '');
 if (start.length !== 8 || end.length !== 8) return true; // Let min(1) or other rules handle empty
 return parseInt(end) >= parseInt(start);
 }, {
 message: '�������� �����Ϻ��� ���� �� �����ϴ�.',
 path: ['noticeEndDate']
 });

type BannerFormValues = z.infer<typeof bannerSchema>;
type PopupFormValues = z.infer<typeof popupSchema>;

interface BannerAdminClientProps {
 initialBanners: Banner[];
 initialPopups: Popup[];
}

export default function BannerAdminClient({ initialBanners, initialPopups }: BannerAdminClientProps) {
 const { toast } = useToast();
 const confirm = useConfirm();
 const [activeTab, setTab] = useState<'banner' | 'popup'>('banner');

 const [isModalOpen, setIsOpen] = useState(false);
 const [editingItem, setEditingItem] = useState<Banner | Popup | null>(null);
 const [formFiles, setFormFiles] = useState<File[]>([]);

 const bannerForm = useAppForm(bannerSchema, {
 defaultValues: {
 bannerNm: '',
 linkUrl: '',
 sortOrdr: 0,
 reflctAt: 'Y',
 bannerDc: ''
 }
 });

 const popupForm = useAppForm(popupSchema, {
 defaultValues: {
 popupTitleName: '',
 noticeBeginDate: '',
 noticeEndDate: '',
 popupWidthLocation: 0 as any,
 popupHeightLocation: 0 as any,
 popupWidthSize: 400 as any,
 popupHeightSize: 400 as any,
 isNotice: 'Y' as any,
 isStopView: 'Y' as any
 }
 });

 React.useEffect(() => {
 if (isModalOpen) {
 if (activeTab === 'banner') {
 const item = editingItem as Banner;
 bannerForm.reset({
 bannerNm: item?.bannerNm || '',
 linkUrl: item?.linkUrl || '',
 sortOrdr: item?.sortOrdr || 0,
 reflctAt: (item?.reflctAt as 'Y' | 'N') || 'Y',
 bannerDc: item?.bannerDc || ''
 });
 } else {
 const item = editingItem as Popup;
 popupForm.reset({
 popupTitleName: item?.popupTitleName || '',
 noticeBeginDate: item?.noticeBeginDate || '',
 noticeEndDate: item?.noticeEndDate || '',
 popupWidthLocation: item?.popupWidthLocation || 0,
 popupHeightLocation: item?.popupHeightLocation || 0,
 popupWidthSize: item?.popupWidthSize || 400,
 popupHeightSize: item?.popupHeightSize || 300,
 isNotice: (item?.isNotice as 'Y' | 'N') || 'Y',
 isStopView: (item?.isStopView as 'Y' | 'N') || 'Y'
 });
 }
 }
 }, [isModalOpen, activeTab, editingItem, bannerForm, popupForm]);

 const { data: banners = initialBanners, isLoading: isBannersLoading, refetch: refetchBanners } = useQuery({
 queryKey: ['admin-banners'],
 queryFn: async () => initialBanners,
 enabled: activeTab === 'banner'
 });

 const { data: popups = initialPopups, isLoading: isPopupsLoading, refetch: refetchPopups } = useQuery({
 queryKey: ['admin-popups'],
 queryFn: async () => initialPopups,
 enabled: activeTab === 'popup'
 });

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

 const handleDelete = async (id: string) => {
 const ok = await confirm({
 title: '���θ�� �ڻ� ���� Ȯ��',
 message: '�ش� ��� �Ǵ� �˾� �����͸� �ý��ۿ��� ���������� �����Ͻðڽ��ϱ�? �Խ� ���� ��� ��� �ߴܵ˴ϴ�.',
 variant: 'destructive',
 confirmText: '����'
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
 toast('�ڻ� ���� ó�� �� ���ܰ� �߻��߽��ϴ�.', 'error');
 }
 };

 const onBannerSubmit = async (values: any) => {
 try {
 const data = {
 ...values,
 reflctAt: values.reflctAt as "Y" | "N"
 } as any;
 if (formFiles.length > 0) {
 const uploadRes = await fileAdminService.uploadFiles(formFiles);
 const uploadedFileId = (uploadRes as any)?.data?.data || (uploadRes as any)?.data || uploadRes;
 if (uploadedFileId) {
 data.bannerImageFile = uploadedFileId;
 data.bannerImage = formFiles[0].name;
 }
 } else if (editingItem) {
 data.bannerImageFile = (editingItem as Banner).bannerImageFile;
 data.bannerImage = (editingItem as Banner).bannerImage;
 }

 const res = await saveBannerAction(null, {
 mode: editingItem ? 'edit' : 'create',
 data: data as Banner,
 id: (editingItem as Banner)?.bannerId
 });

 if (res.success) {
 toast(res.message, 'success');
 setIsOpen(false);
 refetchBanners();
 } else {
 toast(res.message, 'error');
 }
 } catch (error) {
 toast('������ ó�� �� ������ �߻��߽��ϴ�.', 'error');
 }
 };

 const onPopupSubmit = async (values: any) => {
 try {
 const formatDate = (dateStr: string, timeSuffix: string) => {
 if (!dateStr) return '';
 // Remove all non-numeric characters
 const cleanDate = dateStr.replace(/\D/g, '');
 // If we have at least 8 digits, take the first 8 (yyyyMMdd)
 if (cleanDate.length >= 8) {
 return cleanDate.substring(0, 8) + timeSuffix;
 }
 return dateStr; // Fallback
 };

 const data = {
 ...values,
 isNotice: values.isNotice as "Y" | "N",
 isStopView: values.isStopView as "Y" | "N",
 noticeBeginDate: formatDate(values.noticeBeginDate, '0000'),
 noticeEndDate: formatDate(values.noticeEndDate, '2359'),
 // Explicitly convert to string for Backend DTO
 popupWidthLocation: String(values.popupWidthLocation),
 popupHeightLocation: String(values.popupHeightLocation),
 popupWidthSize: String(values.popupWidthSize),
 popupHeightSize: String(values.popupHeightSize)
 } as any;

 if (formFiles.length > 0) {
 const uploadRes = await fileAdminService.uploadFiles(formFiles);
 // FileAdminService.uploadFiles returns a string (atchFileId)
 const uploadedFileId = typeof uploadRes === 'string' ? uploadRes : (uploadRes as any)?.data?.data || (uploadRes as any)?.data;
 
 if (uploadedFileId) {
 data.fileUrl = `/api/v1/files/download?fileId=${uploadedFileId}`;
 console.log('>>> [Frontend] Setting fileUrl with atchFileId:', uploadedFileId);
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
 toast('������ ó�� �� ������ �߻��߽��ϴ�.', 'error');
 }
 };

 const bannerColumns: Column<Banner>[] = [
 {
 header: '���־� �ڻ� ������',
 accessor: (item: Banner) => (
 <div className="w-56 h-24 bg-slate-900 rounded-lg overflow-hidden border-2 border-slate-100 shadow-xl relative group/img cursor-zoom-in transition-all duration-500 hover:scale-[1.05] hover:z-50">
 <ImageIcon size={24} className="absolute inset-0 m-auto text-white/10" />
 {item.bannerImageFile && (
 <Image
 src={`/api/v1/files/download?fileId=${item.bannerImageFile}`}
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
 header: '��� �ڻ� ��Ī',
 accessor: (item: Banner) => (
 <div className="flex flex-col gap-1.5 py-4">
 <span className="font-bold tracking-tight text-foreground text-md uppercase leading-tight">{item.bannerNm}</span>
 <div className="flex items-center gap-2">
 <span className="text-xs font-bold text-muted-foreground/50 tracking-[0.3em] font-mono uppercase">ID: {item.bannerId}</span>
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
 header: '�켱����',
 accessor: (item: Banner) => (
 <div className="w-12 h-12 rounded-lg bg-slate-50 border-2 border-slate-100 flex items-center justify-center shadow-inner group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
 <span className="font-bold text-lg font-mono tabular-nums leading-none">{item.sortOrdr}</span>
 </div>
 ),
 className: 'w-24 text-center'
 },
 {
 header: '�Խ� ����',
 accessor: (item: Banner | Popup) => {
 const isLive = 'reflctAt' in item ? item.reflctAt === 'Y' : item.isNotice === 'Y';
 return <HubStatusBadge status={isLive ? '�Խ� ��' : '��� ��'} />;
 },
 className: 'w-32'
 },
 {
 header: '����',
 className: 'text-right',
 accessor: (item: Banner) => (
 <div className="flex justify-end gap-2 pr-4">
 <Button variant="ghost" size="icon" className="h-10 w-10 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-lg border border-slate-200 transition-all font-bold" onClick={() => handleEdit(item)}>
 <Settings size={16} />
 </Button>
 <Button variant="ghost" size="icon" className="h-10 w-10 text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white border border-rose-100 rounded-lg transition-all" onClick={() => handleDelete(item.bannerId)}>
 <Trash2 size={16} />
 </Button>
 </div>
 )
 }
 ];

 const popupColumns: Column<Popup>[] = [
 {
 header: '�˾� ��� (Architecture)',
 accessor: (item: Popup) => (
 <div className="flex flex-col gap-2 py-4">
 <span className="font-bold tracking-tight text-foreground text-md uppercase leading-tight">{item.popupTitleName}</span>
 <div className="flex items-center gap-4">
 <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg">
 <Calendar size={12} className="text-primary opacity-40" />
 <span className="text-xs font-bold text-muted-foreground/60 font-mono tracking-tight tabular-nums uppercase ">
 {item.noticeBeginDate} ~ {item.noticeEndDate}
 </span>
 </div>
 </div>
 </div>
 )
 },
 {
 header: 'ȭ�� �ػ�(Resolution)',
 accessor: (item: Popup) => (
 <div className="flex flex-col gap-1.5">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shadow-inner border border-slate-100 text-slate-400">
 <Monitor size={14} />
 </div>
 <span className="text-xs font-bold font-mono tracking-widest text-slate-900 uppercase">{item.popupWidthSize}px x {item.popupHeightSize}px</span>
 </div>
 <div className="flex items-center gap-2 pl-11">
 <div className="w-1 h-1 rounded-full bg-slate-300" />
 <span className="text-xs font-bold text-muted-foreground/40 ">Coordinates: (X:{item.popupWidthLocation}, Y:{item.popupHeightLocation})</span>
 </div>
 </div>
 ),
 className: 'w-64'
 },
 {
 header: '�Խ� ����',
 accessor: (item: Popup) => <HubStatusBadge status={item.isNotice === 'Y' ? '�Խ� ��' : '��� ��'} />,
 className: 'w-32'
 },
 {
 header: '����',
 className: 'text-right w-32',
 accessor: (item: Popup) => (
 <div className="flex justify-end gap-2 pr-4">
 <Button variant="ghost" size="icon" className="h-10 w-10 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-lg border border-slate-200 transition-all font-bold" onClick={() => handleEdit(item)}>
 <Settings size={16} />
 </Button>
 <Button variant="ghost" size="icon" className="h-10 w-10 text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white border border-rose-100 rounded-lg transition-all" onClick={() => handleDelete(item.popupId)}>
 <Trash2 size={16} />
 </Button>
 </div>
 )
 }
 ];

 return (
 <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
 <PageHeader
 title="���/�˾� ����"
 breadcrumbs={[{ label: '�ý��� ����' }, { label: 'ȫ�� ����' }]}
 />

 <HubHeader
 title="Promotional"
 highlight="Matrix"
 subtitle="������Ʈ�� ����Ǵ� ��� �ڻ�� ���� �˾��� ����ϰ� �Խ� ���¸� �����մϴ�"
 icon={Megaphone}
 actions={
 <Button
 onClick={handleCreate}
 size="lg"
 className="h-11 px-10 rounded-lg bg-slate-900 border-none text-white font-bold text-xs tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3"
 >
 <Plus size={20} /> �ű� {activeTab === 'banner' ? '���' : '�˾�'} ���
 </Button>
 }
 />

 <HubMetricGrid>
 <HubMetricCard title="Ȱ�� ���" value={banners.filter(b => b.reflctAt === 'Y').length} icon={ImageIcon} color="primary" />
 <HubMetricCard title="Ȱ�� �˾�" value={popups.filter(p => p.isNotice === 'Y').length} icon={Monitor} color="emerald" status="�Խ� ��" />
 <HubMetricCard title="���� �ڻ�" value={popups.filter(p => new Date(p.noticeBeginDate) > new Date()).length} icon={Calendar} color="amber" />
 <HubMetricCard title="��ü �ڻ�" value={banners.length + popups.length} icon={Layers} color="indigo" />
 </HubMetricGrid>

 <div className="grid grid-cols-12 gap-12">
 <div className="col-span-12 lg:col-span-3 h-full">
 <div className="rounded-lg bg-white border-2 border-slate-100 shadow-xl h-full p-4 flex flex-col gap-4">
 <button
 onClick={() => setTab('banner')}
 className={cn(
 "w-full group p-8 rounded-lg border-2 transition-all flex items-center gap-6 relative overflow-hidden",
 activeTab === 'banner' ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.02] z-10" : "bg-transparent border-transparent hover:bg-slate-50 text-slate-400 hover:text-slate-900"
 )}
 >
 <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center transition-all shadow-lg relative z-10", activeTab === 'banner' ? "bg-white/10 text-white shadow-black/20" : "bg-white text-slate-300 group-hover:bg-primary group-hover:text-white")}>
 <ImageIcon size={22} />
 </div>
 <div className="flex flex-col text-left relative z-10">
 <span className="text-xs font-bold tracking-widest uppercase mb-1 opacity-40">���� 01</span>
 <span className="text-md font-bold tracking-tight uppercase leading-tight">��� ����</span>
 </div>
 {activeTab === 'banner' && <div className="absolute right-0 top-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none opacity-50" />}
 </button>
 <button
 onClick={() => setTab('popup')}
 className={cn(
 "w-full group p-8 rounded-lg border-2 transition-all flex items-center gap-6 relative overflow-hidden",
 activeTab === 'popup' ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.02] z-10" : "bg-transparent border-transparent hover:bg-slate-50 text-slate-400 hover:text-slate-900"
 )}
 >
 <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center transition-all shadow-lg relative z-10", activeTab === 'popup' ? "bg-white/10 text-white shadow-black/20" : "bg-white text-slate-300 group-hover:bg-indigo-500 group-hover:text-white")}>
 <Monitor size={22} />
 </div>
 <div className="flex flex-col text-left relative z-10">
 <span className="text-xs font-bold tracking-widest uppercase mb-1 opacity-40">���� 02</span>
 <span className="text-md font-bold tracking-tight uppercase leading-tight">�˾� ����</span>
 </div>
 {activeTab === 'popup' && <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none opacity-50" />}
 </button>
 <div className="mt-auto p-8 rounded-lg bg-slate-900 text-white space-y-4 relative overflow-hidden group">
 <div className="relative z-10 space-y-4">
 <div className="flex items-center gap-3">
 <Sparkles size={16} className="text-primary animate-pulse" />
 <span className="text-xs font-bold tracking-widest uppercase text-white/40">�ý��� ����</span>
 </div>
 <h5 className="text-lg font-bold tracking-tight uppercase leading-none">���θ�� ����</h5>
 <p className="text-xs font-bold text-slate-400 leading-relaxed uppercase opacity-60">��ϵ� ��� ��� �� �˾� �ڻ��� �ý��ۿ� ��� �ݿ��˴ϴ�.</p>
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
 title={activeTab === 'banner' ? "��� ���" : "�˾� ���"}
 description={activeTab === 'banner' ? "���� ���� �� ���� ���ǿ� ����Ǵ� ��� ����Դϴ�" : "�Ⱓ ���� ���� �� �ȳ��� ���� �˾� ���� ����Դϴ�"}
 icon={activeTab === 'banner' ? ImageIcon : Monitor}
 >
 <div className="overflow-hidden">
 <StandardDataTable<Banner | Popup>
 columns={activeTab === 'banner' ? (bannerColumns as Column<Banner | Popup>[]) : (popupColumns as Column<Banner | Popup>[])}
 data={activeTab === 'banner' ? banners : popups}
 loading={activeTab === 'banner' ? isBannersLoading : isPopupsLoading}
 onRetry={() => activeTab === 'banner' ? refetchBanners() : refetchPopups()}
 keyField={(activeTab === 'banner' ? 'bannerId' : 'popupId') as any}
 emptyMessage={`��ϵ� ${activeTab === 'banner' ? '���' : '�˾�'} �ڻ��� �������� �ʽ��ϴ�.`}
 className="border-none bg-transparent"
 />
 </div>
 </HubSectionCard>
 </motion.div>
 </AnimatePresence>
 </div>
 </div>

 <StandardModal
 isOpen={isModalOpen}
 onClose={() => setIsOpen(false)}
 title={activeTab === 'banner' ? (editingItem ? '��� ��� ����' : '�ű� ���־� �ڻ� ���') : (editingItem ? '�˾� ��Ű��ó ����' : '�ű� ���̾� �˾� ����')}
 maxWidth="3xl"
 footer={
 <div className="flex w-full gap-4">
 <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-11 rounded-lg font-bold text-xs tracking-widest border-2">���</Button>
 <Button
 onClick={activeTab === 'banner' ? (bannerForm.handleSubmit(onBannerSubmit) as any) : (popupForm.handleSubmit(onPopupSubmit) as any)}
 disabled={activeTab === 'banner' ? bannerForm.formState.isSubmitting : popupForm.formState.isSubmitting}
 className="flex-[2] h-11 rounded-lg bg-slate-900 border-none text-white font-bold text-xs tracking-widest shadow-2xl hover:bg-primary transition-all hover:-translate-y-2 group"
 >
 <Zap size={18} className="group-hover:animate-pulse mr-2" /> {editingItem ? '�ڻ� ����' : '� ����'}
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
 name="bannerNm"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">��� ��Ī (Internal Label) <span className="text-rose-500 font-bold text-xs">*</span></FormLabel>
 <FormControl>
 <Input {...field} className="h-11 rounded-lg text-md font-bold tracking-tight shadow-inner" placeholder="��� �̸� �Է�" />
 </FormControl>
 <p className="text-xs font-bold text-slate-400 px-1 mt-1 leading-relaxed">������ ��Ī�Դϴ�</p>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />
 <ShadcnFormField
 control={bannerForm.control}
 name="linkUrl"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">���� ������ (Target URL)</FormLabel>
 <div className="relative group/link">
 <LinkIcon size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/link:opacity-100 transition-opacity" />
 <FormControl>
 <Input {...field} className="h-11 pl-16 rounded-lg font-mono text-xs font-bold shadow-inner" placeholder="/pages/..." />
 </FormControl>
 </div>
 <p className="text-xs font-bold text-slate-400 px-1 mt-1 leading-relaxed">Ŭ�� �� �̵��� ����Ʈ���� ���Ʈ �Ǵ� �ܺ� ���</p>
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
 <FormLabel className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">���� ���� Priority <span className="text-rose-500 font-bold text-xs">*</span></FormLabel>
 <FormControl>
 <Input {...field} type="number" onChange={(e) => field.onChange(Number(e.target.value))} className="h-11 rounded-lg font-bold shadow-inner" />
 </FormControl>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />
 <ShadcnFormField
 control={bannerForm.control}
 name="reflctAt"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">�ڻ� �ε� ����</FormLabel>
 <Select onValueChange={field.onChange} value={field.value}>
 <FormControl>
 <SelectTrigger className="h-11 rounded-lg border-2 border-slate-100 bg-slate-50 font-bold text-xs tracking-widest uppercase shadow-inner">
 <SelectValue />
 </SelectTrigger>
 </FormControl>
 <SelectContent className="rounded-lg shadow-2xl">
 <SelectItem value="Y" className="h-12 rounded-lg text-xs font-bold tracking-widest uppercase">--- Ȱ�� (Live) ---</SelectItem>
 <SelectItem value="N" className="h-12 rounded-lg text-xs font-bold tracking-widest uppercase text-rose-500">--- ��� (Staging) ---</SelectItem>
 </SelectContent>
 </Select>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />
 </div>
 <ShadcnFormField
 control={bannerForm.control}
 name="bannerDc"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">�ڻ� ��� �� ���� (Metadata)</FormLabel>
 <FormControl>
 <textarea {...field} className="w-full min-h-[120px] p-6 rounded-lg border-2 border-slate-100 bg-slate-50 text-xs font-bold focus:ring-4 focus:ring-primary/10 outline-none resize-none shadow-inner" placeholder="��� �ڻ� �뵵 �� ���� ���� ����" />
 </FormControl>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />
 </div>
 <div className="space-y-12">
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">�̵�� �ڻ� ���ε� (Visual Payload) <span className="text-rose-500 font-bold text-xs">*</span></FormLabel>
 <div className="p-4 border-4 border-dashed border-slate-100 rounded-lg bg-slate-50/50 hover:bg-slate-50 transition-colors shadow-inner relative group/upload">
 <StandardFileUploader onFilesChange={(f) => setFormFiles(f)} maxFiles={1} />
 <div className="mt-4 flex items-center justify-center gap-4 text-muted-foreground/30">
 <UploadCloud size={24} />
 <span className="text-xs font-bold tracking-widest text-center">����� ������ �巡���Ͽ� ���ε�</span>
 </div>
 </div>
 <p className="text-xs font-bold text-slate-400 px-1 mt-1 leading-relaxed">�ý��� ǥ�� �԰� �̹����� �ؼ��Ͻʽÿ�</p>
 </FormItem>
 {(editingItem as Banner)?.bannerImageFile && (
 <div className="p-8 rounded-lg bg-slate-900 text-white space-y-3 shadow-2xl relative overflow-hidden group">
 <span className="text-xs font-bold text-white/30 tracking-[0.4em] uppercase">���� ���� �ĺ���</span>
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shadow-inner group-hover:rotate-12 transition-transform">
 <SearchCode size={20} className="text-primary" />
 </div>
 <span className="font-mono text-xs font-bold tracking-tight text-white/80 truncate">{(editingItem as Banner).bannerImage}</span>
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
 name="popupTitleName"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">�˾� Ÿ��Ʋ (Header) <span className="text-rose-500 font-bold text-xs">*</span></FormLabel>
 <FormControl>
 <Input {...field} className="h-11 rounded-lg text-md font-bold tracking-tight shadow-inner" placeholder="�˾� ���� �Է�" />
 </FormControl>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />
 <div className="grid grid-cols-2 gap-8 p-10 bg-slate-50 border-2 border-dashed border-slate-100 rounded-lg shadow-inner">
 <ShadcnFormField
 control={popupForm.control}
 name="noticeBeginDate"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">�Խ� ���� ���� (T-0) <span className="text-rose-500 font-bold text-xs">*</span></FormLabel>
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
 name="noticeEndDate"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">�Խ� ���� ���� (T-End) <span className="text-rose-500 font-bold text-xs">*</span></FormLabel>
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
 name="popupWidthLocation"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">���� ��ǥ (X_Pivot) <span className="text-rose-500 font-bold text-xs">*</span></FormLabel>
 <FormControl>
 <Input {...field} type="number" onChange={(e) => field.onChange(Number(e.target.value))} className="h-11 rounded-lg font-bold shadow-inner" />
 </FormControl>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />
 <ShadcnFormField
 control={popupForm.control}
 name="popupHeightLocation"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">���� ��ǥ (Y_Pivot) <span className="text-rose-500 font-bold text-xs">*</span></FormLabel>
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
 name="popupWidthSize"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">���� �� (W_Res) <span className="text-rose-500 font-bold text-xs">*</span></FormLabel>
 <FormControl>
 <Input {...field} type="number" onChange={(e) => field.onChange(Number(e.target.value))} className="h-11 rounded-lg font-bold shadow-inner" />
 </FormControl>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />
 <ShadcnFormField
 control={popupForm.control}
 name="popupHeightSize"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">���� ���� (H_Res) <span className="text-rose-500 font-bold text-xs">*</span></FormLabel>
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
 <FormLabel className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">�̵�� �ڻ� ���ε� (Visual Payload) <span className="text-rose-500 font-bold text-xs">*</span></FormLabel>
 <div className="p-4 border-4 border-dashed border-slate-100 rounded-lg bg-slate-50/50 hover:bg-slate-50 transition-colors shadow-inner relative group/upload">
 <StandardFileUploader onFilesChange={(f) => setFormFiles(f)} maxFiles={1} />
 <div className="mt-4 flex items-center justify-center gap-4 text-muted-foreground/30">
 <UploadCloud size={24} />
 <span className="text-xs font-bold tracking-widest text-center">����� ������ �巡���Ͽ� ���ε�</span>
 </div>
 </div>
 <p className="text-xs font-bold text-slate-400 px-1 mt-1 leading-relaxed">�ý��� ǥ�� �԰� �̹����� �ؼ��Ͻʽÿ�</p>
 </FormItem>
 {(editingItem as Popup)?.fileUrl && (
 <div className="p-8 rounded-lg bg-slate-900 text-white space-y-3 shadow-2xl relative overflow-hidden group">
 <span className="text-xs font-bold text-white/30 tracking-[0.4em] uppercase">���� ���� �ĺ���</span>
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shadow-inner group-hover:rotate-12 transition-transform">
 <SearchCode size={20} className="text-primary" />
 </div>
 <span className="font-mono text-xs font-bold tracking-tight text-white/80 truncate">{(editingItem as Popup).fileUrl}</span>
 </div>
 </div>
 )}
 <div className="grid grid-cols-1 gap-8 p-10 bg-indigo-50/30 border-2 border-indigo-100/50 rounded-lg shadow-sm">
 <p className="text-xs font-bold text-indigo-500/50 tracking-[0.4em] uppercase mb-1">���� ��������</p>
 <div className="grid grid-cols-2 gap-6">
 <ShadcnFormField
 control={popupForm.control}
 name="isNotice"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight tracking-widest uppercase">�Խ� ����</FormLabel>
 <Select onValueChange={field.onChange} value={field.value}>
 <FormControl>
 <SelectTrigger className="h-11 rounded-lg border-2 border-indigo-100 bg-white font-bold text-xs tracking-widest uppercase shadow-sm">
 <SelectValue />
 </SelectTrigger>
 </FormControl>
 <SelectContent className="rounded-lg">
 <SelectItem value="Y" className="font-bold text-xs tracking-widest uppercase">�Խ� (LIVE)</SelectItem>
 <SelectItem value="N" className="font-bold text-xs tracking-widest uppercase text-rose-500">��� (STAGING)</SelectItem>
 </SelectContent>
 </Select>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />
 <ShadcnFormField
 control={popupForm.control}
 name="isStopView"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight tracking-widest uppercase">�ٽú����ʱ� ó��</FormLabel>
 <Select onValueChange={field.onChange} value={field.value}>
 <FormControl>
 <SelectTrigger className="h-11 rounded-lg border-2 border-indigo-100 bg-white font-bold text-xs tracking-widest uppercase shadow-sm">
 <SelectValue />
 </SelectTrigger>
 </FormControl>
 <SelectContent className="rounded-lg">
 <SelectItem value="Y" className="font-bold text-xs tracking-widest uppercase">Ȱ�� (ENABLE)</SelectItem>
 <SelectItem value="N" className="font-bold text-xs tracking-widest uppercase">��Ȱ�� (DISABLE)</SelectItem>
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

