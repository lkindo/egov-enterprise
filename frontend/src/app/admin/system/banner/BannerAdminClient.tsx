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
  Edit,
  Monitor,
  Calendar,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  Zap,
  LayoutGrid,
  Clock,
  Eye,
  Megaphone,
  Settings,
  XCircle,
  SearchCode,
  Download,
  UploadCloud,
  ArrowUpRight,
  Maximize2,
  Link as LinkIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  saveBannerAction,
  deleteBannerAction,
  savePopupAction,
  deletePopupAction
} from '@/app/actions/promotionActions';
import { motion, AnimatePresence } from 'framer-motion';

interface BannerAdminClientProps {
  initialBanners: Banner[];
  initialPopups: Popup[];
}

export default function BannerAdminClient({ initialBanners, initialPopups }: BannerAdminClientProps) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [activeTab, setTab] = useState<'banner' | 'popup'>('banner');

  const [isModalOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Banner | Popup | null>(null);
  const [formFiles, setFormFiles] = useState<File[]>([]);

  const { data: banners = initialBanners, isLoading: isBannersLoading, error: bannersError, refetch: refetchBanners } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: async () => initialBanners,
    enabled: activeTab === 'banner'
  });

  const { data: popups = initialPopups, isLoading: isPopupsLoading, error: popupsError, refetch: refetchPopups } = useQuery({
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
      title: '?„ë¡œëª¨ì…˜ ?ì‚° ?? œ ?•ì¸',
      message: '?´ë‹¹ ë°°ë„ˆ ?ëŠ” ?ì—… ?°ì´?°ë? ?œìŠ¤?œì—???êµ¬?ìœ¼ë¡??? œ?˜ì‹œê² ìŠµ?ˆê¹Œ? ê²Œì‹œ ì¤‘ì¸ ê²½ìš° ì¦‰ì‹œ ì¤‘ë‹¨?©ë‹ˆ??',
      variant: 'destructive',
      confirmText: '?°ì´???? œ ?¹ì¸'
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
    } catch {
      toast('?ì‚° ?? œ ì²˜ë¦¬ ì¤??ˆì™¸ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.', 'error');
      console.error('Promotion handleDelete error:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formDataObj = new FormData(e.currentTarget);
    const data: Partial<Banner & Popup> = Object.fromEntries(formDataObj.entries());

    try {
      if (formFiles.length > 0) {
        const uploadRes = await fileAdminService.uploadFiles(formFiles);
        const uploadedFileId = (uploadRes as any)?.data?.data || (uploadRes as any)?.data || uploadRes;
        if (uploadedFileId) {
          if (activeTab === 'banner') {
            data.bannerImageFile = uploadedFileId;
            data.bannerImage = formFiles[0].name;
          } else {
            data.fileUrl = `/api/v1/files/download?fileId=${uploadedFileId}`;
          }
        }
      } else if (editingItem) {
        if (activeTab === 'banner') {
          data.bannerImageFile = (editingItem as Banner).bannerImageFile;
          data.bannerImage = (editingItem as Banner).bannerImage;
        } else {
          data.fileUrl = (editingItem as Popup).fileUrl;
        }
      }

      const res = activeTab === 'banner'
        ? await saveBannerAction(null, {
          mode: editingItem ? 'edit' : 'create',
          data: data as Banner,
          id: (editingItem as Banner)?.bannerId
        })
        : await savePopupAction(null, {
          mode: editingItem ? 'edit' : 'create',
          data: data as Popup,
          id: (editingItem as Popup)?.popupId
        });

      if (res.success) {
        toast(res.message, 'success');
        setIsOpen(false);
        activeTab === 'banner' ? refetchBanners() : refetchPopups();
      } else {
        toast(res.message, 'error');
      }
    } catch {
      toast('?€??ì²˜ë¦¬ ì¤??°ì´??ë¬´ê²°???¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.', 'error');
    }
  };

  const bannerColumns: Column<Banner>[] = [
    {
      header: 'ë¹„ì£¼???ì‚° ?¤ëƒ…??,
      accessor: (item: Banner) => (
        <div className="w-56 h-24 bg-slate-900 rounded-[1.5rem] overflow-hidden border-2 border-slate-100 shadow-xl relative group/img cursor-zoom-in transition-all duration-500 hover:scale-[1.05] hover:z-50">
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
      header: 'ë°°ë„ˆ ?ì‚° ëª…ì¹­',
      accessor: (item: Banner) => (
        <div className="flex flex-col gap-1.5 py-4">
          <span className="font-black tracking-tighter text-foreground text-md uppercase leading-tight">{item.bannerNm}</span>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-muted-foreground/50 tracking-[0.3em] font-mono uppercase">ID: {item.bannerId}</span>
            {item.linkUrl && (
              <span className="text-[9px] font-black text-primary/60 flex items-center gap-1.5 italic lowercase">
                <ExternalLink size={10} /> {item.linkUrl}
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      header: '?°ì„ ?œìœ„',
      accessor: (item: Banner) => (
        <div className="w-12 h-12 rounded-2xl bg-slate-50 border-2 border-slate-100 flex items-center justify-center shadow-inner group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
          <span className="font-black text-lg font-mono tabular-nums leading-none">
            {item.sortOrdr}
          </span>
        </div>
      ),
      className: 'w-24 text-center'
    },
    {
      header: 'ê²Œì‹œ ?íƒœ',
      accessor: (item: Banner | Popup) => {
        const isLive = 'reflctAt' in item ? item.reflctAt === 'Y' : item.ntceAt === 'Y';
        return <HubStatusBadge status={isLive ? 'ê²Œì‹œ ì¤? : '?€ê¸?ì¤?} />;
      },
      className: 'w-32'
    },
    {
      header: 'ê´€ë¦?,
      className: 'text-right w-32',
      accessor: (item: Banner) => (
        <div className="flex justify-end gap-2 pr-4">
          <Button variant="ghost" size="icon" className="h-10 w-10 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-xl border border-slate-200 transition-all font-black" onClick={() => handleEdit(item)}>
            <Settings size={16} />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10 text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white border border-rose-100 rounded-xl transition-all" onClick={() => handleDelete(item.bannerId)}>
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  const popupColumns: Column<Popup>[] = [
    {
      header: '?ì—… ëª…ì„¸ (Architecture)',
      accessor: (item: Popup) => (
        <div className="flex flex-col gap-2 py-4">
          <span className="font-black tracking-tighter text-foreground text-md uppercase leading-tight">{item.popupTitleNm}</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg">
              <Calendar size={12} className="text-primary opacity-40" />
              <span className="text-[10px] font-black text-muted-foreground/60 font-mono tracking-tighter tabular-nums uppercase italic">
                {item.ntceBgnde} ~ {item.ntceEndde}
              </span>
            </div>
          </div>
        </div>
      )
    },
    {
      header: '?”ë©˜??(Resolution)',
      accessor: (item: Popup) => (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shadow-inner border border-slate-100 text-slate-400">
              <Monitor size={14} />
            </div>
            <span className="text-xs font-black font-mono tracking-widest text-slate-900 uppercase">{item.popupWSize}px x {item.popupHSize}px</span>
          </div>
          <div className="flex items-center gap-2 pl-11">
            <div className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="text-[9px] font-bold text-muted-foreground/40 italic">Coordinates: (X:{item.popupWlc}, Y:{item.popupHlc})</span>
          </div>
        </div>
      ),
      className: 'w-64'
    },
    {
      header: 'ê²Œì‹œ ?¬ë?',
      accessor: (item: Popup) => <HubStatusBadge status={item.ntceAt === 'Y' ? 'ê²Œì‹œ ì¤? : '?€ê¸?ì¤?} />,
      className: 'w-32'
    },
    {
      header: 'ê´€ë¦?,
      className: 'text-right w-32',
      accessor: (item: Popup) => (
        <div className="flex justify-end gap-2 pr-4">
          <Button variant="ghost" size="icon" className="h-10 w-10 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-xl border border-slate-200 transition-all font-black" onClick={() => handleEdit(item)}>
            <Settings size={16} />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10 text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white border border-rose-100 rounded-xl transition-all" onClick={() => handleDelete(item.popupId)}>
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="ë°°ë„ˆ/?ì—… ê´€ë¦?
        breadcrumbs={[{ label: '?œìŠ¤?œê?ë¦? }, { label: '?ë³´ ê´€ë¦? }]}
      />

      <HubHeader
        title="?¬í„¸"
        highlight="ë°°ë„ˆ ë°??ì—… ê´€ë¦?
        subtitle="?¹ì‚¬?´íŠ¸???¸ì¶œ?˜ëŠ” ë°°ë„ˆ ?ì‚°ê³?ê³µì? ?ì—…???±ë¡?˜ê³  ê²Œì‹œ ?íƒœë¥??œì–´?©ë‹ˆ??"
        icon={Megaphone}
        actions={
          <Button
            onClick={handleCreate}
            size="lg"
            className="h-14 px-10 rounded-2xl bg-slate-900 border-none text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3"
          >
            <Plus size={20} /> ? ê·œ {activeTab === 'banner' ? 'ë°°ë„ˆ' : '?ì—…'} ?±ë¡
          </Button>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="?œì„± ë°°ë„ˆ" value={banners.filter(b => b.reflctAt === 'Y').length} icon={ImageIcon} color="primary" />
        <HubMetricCard title="?œì„± ?ì—…" value={popups.filter(p => p.ntceAt === 'Y').length} icon={Monitor} color="emerald" status="ê²Œì‹œ ì¤? />
        <HubMetricCard title="?ˆì•½ ?ì‚°" value={popups.filter(p => new Date(p.ntceBgnde) > new Date()).length} icon={Calendar} color="amber" />
        <HubMetricCard title="?„ì²´ ?ì‚°" value={banners.length + popups.length} icon={Layers} color="indigo" />
      </HubMetricGrid>

      <div className="grid grid-cols-12 gap-12">
        {/* Navigation Control Panel */}
        <div className="col-span-12 lg:col-span-3 h-full">
          <div className="rounded-[3.5rem] bg-white border-2 border-slate-100 shadow-xl h-full p-4 flex flex-col gap-4">
            <button
              onClick={() => setTab('banner')}
              className={cn(
                "w-full group p-8 rounded-[2.5rem] border-2 transition-all flex items-center gap-6 relative overflow-hidden",
                activeTab === 'banner'
                  ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.02] z-10"
                  : "bg-transparent border-transparent hover:bg-slate-50 text-slate-400 hover:text-slate-900"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg relative z-10",
                activeTab === 'banner' ? "bg-white/10 text-white shadow-black/20" : "bg-white text-slate-300 group-hover:bg-primary group-hover:text-white"
              )}>
                <ImageIcon size={22} />
              </div>
              <div className="flex flex-col text-left relative z-10">
                <span className="text-[10px] font-black tracking-widest uppercase mb-1 opacity-40">?ì—­ 01</span>
                <span className="text-md font-black tracking-tighter uppercase leading-tight">ë°°ë„ˆ ?¤ì •</span>
              </div>
              {activeTab === 'banner' && (
                <div className="absolute right-0 top-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none opacity-50" />
              )}
            </button>

            <button
              onClick={() => setTab('popup')}
              className={cn(
                "w-full group p-8 rounded-[2.5rem] border-2 transition-all flex items-center gap-6 relative overflow-hidden",
                activeTab === 'popup'
                  ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.02] z-10"
                  : "bg-transparent border-transparent hover:bg-slate-50 text-slate-400 hover:text-slate-900"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg relative z-10",
                activeTab === 'popup' ? "bg-white/10 text-white shadow-black/20" : "bg-white text-slate-300 group-hover:bg-indigo-500 group-hover:text-white"
              )}>
                <Monitor size={22} />
              </div>
              <div className="flex flex-col text-left relative z-10">
                <span className="text-[10px] font-black tracking-widest uppercase mb-1 opacity-40">?ì—­ 02</span>
                <span className="text-md font-black tracking-tighter uppercase leading-tight">?ì—… ?¤ì •</span>
              </div>
              {activeTab === 'popup' && (
                <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none opacity-50" />
              )}
            </button>

            <div className="mt-auto p-8 rounded-[2.5rem] bg-slate-900 text-white space-y-4 relative overflow-hidden group">
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <Sparkles size={16} className="text-primary animate-pulse" />
                  <span className="text-[10px] font-black tracking-widest uppercase text-white/40">?œìŠ¤???íƒœ</span>
                </div>
                <h5 className="text-lg font-black tracking-tighter uppercase leading-none">?„ë¡œëª¨ì…˜ ê´€ë¦?/h5>
                <p className="text-[9px] font-bold text-slate-400 leading-relaxed uppercase opacity-60">
                  ?±ë¡??ëª¨ë“  ë°°ë„ˆ?€ ?ì—… ?ì‚°?€ ?œìŠ¤?œì— ì¦‰ì‹œ ë°˜ì˜?©ë‹ˆ??
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Multi-Tab Stream */}
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
                title={activeTab === 'banner' ? "ë°°ë„ˆ ëª©ë¡" : "?ì—… ëª©ë¡"}
                description={activeTab === 'banner' ? "?¬í„¸ ë©”ì¸ ë°??œë¸Œ ?¹ì…˜???¸ì¶œ?˜ëŠ” ë°°ë„ˆ ëª©ë¡?…ë‹ˆ??" : "ê¸°ê°„ ?œì • ê³µì? ë°??ˆë‚´ë¥??„í•œ ?ì—… ê´€ë¦?ëª©ë¡?…ë‹ˆ??"}
                icon={activeTab === 'banner' ? ImageIcon : Monitor}
              >
                <div className="overflow-hidden">
                  <StandardDataTable<Banner | Popup>
                    columns={activeTab === 'banner' ? (bannerColumns as Column<Banner | Popup>[]) : (popupColumns as Column<Banner | Popup>[])}
                    data={activeTab === 'banner' ? banners : popups}
                    loading={activeTab === 'banner' ? isBannersLoading : isPopupsLoading}
                    error={(activeTab === 'banner' ? bannersError : popupsError) as Error | null}
                    onRetry={() => activeTab === 'banner' ? refetchBanners() : refetchPopups()}
                    keyField={(activeTab === 'banner' ? 'bannerId' : 'popupId') as any}
                    emptyMessage={`?±ë¡??${activeTab === 'banner' ? 'ë°°ë„ˆ' : '?ì—…'} ?ì‚°??ì¡´ì¬?˜ì? ?ŠìŠµ?ˆë‹¤.`}
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
        title={activeTab === 'banner' ? (editingItem ? 'ë°°ë„ˆ ëª…ì„¸ ?˜ì •' : '? ê·œ ë¹„ì£¼???ì‚° ?±ë¡') : (editingItem ? '?ì—… ?„í‚¤?ì²˜ ?˜ì •' : '? ê·œ ?ˆì´???ì—… ?¤ê³„')}
        maxWidth="3xl"
        footer={
          <div className="flex w-full gap-4">
            <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-14 rounded-2xl font-black text-[10px] tracking-widest border-2">ì·¨ì†Œ</Button>
            <Button form="promotion-form" type="submit" className="flex-[2] h-14 rounded-2xl bg-slate-900 border-none text-white font-black text-[10px] tracking-widest shadow-2xl hover:bg-primary transition-all hover:-translate-y-2 group">
              <Zap size={18} className="group-hover:animate-pulse" /> {editingItem ? '?ì‚° ?˜ì •' : '?´ì˜ ë°°í¬'}
            </Button>
          </div>
        }
      >
        <form id="promotion-form" onSubmit={handleSubmit} className="space-y-12 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-8">
              {activeTab === 'banner' ? (
                <>
                  <FormField label="ë°°ë„ˆ ëª…ì¹­ (Internal Label)" required description="ê´€ë¦¬ìš© ëª…ì¹­?…ë‹ˆ??">
                    <Input name="bannerNm" type="text" defaultValue={(editingItem as Banner)?.bannerNm} className="h-14 rounded-2xl text-md font-black tracking-tight shadow-inner" required placeholder="ë°°ë„ˆ ?´ë¦„ ?…ë ¥" />
                  </FormField>
                  <FormField label="?œë”© ?˜ì´ì§€ (Target URL)" description="?´ë¦­ ???´ë™???„ë¡ ?¸ì—”???¼ìš°???ëŠ” ?¸ë? ê²½ë¡œ">
                    <div className="relative group/link">
                      <LinkIcon size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/link:opacity-100 transition-opacity" />
                      <Input name="linkUrl" type="text" defaultValue={(editingItem as Banner)?.linkUrl} className="h-14 pl-16 rounded-2xl font-mono text-xs font-black shadow-inner" placeholder="/pages/..." />
                    </div>
                  </FormField>
                  <div className="grid grid-cols-2 gap-8">
                    <FormField label="?œì¶œ ?œì„œ Priority" required>
                      <Input name="sortOrdr" type="number" defaultValue={(editingItem as Banner)?.sortOrdr || 0} className="h-14 rounded-2xl font-black shadow-inner" required />
                    </FormField>
                    <FormField label="?ì‚° ë¡œë“œ ?íƒœ">
                      <Select name="reflctAt" defaultValue={(editingItem as Banner)?.reflctAt || 'Y'}>
                        <SelectTrigger className="h-14 rounded-2xl border-2 border-slate-100 bg-slate-50 font-black text-[10px] tracking-widest uppercase shadow-inner">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl shadow-2xl">
                          <SelectItem value="Y" className="h-12 rounded-xl text-[10px] font-black tracking-widest uppercase">--- ?œì„± (Live) ---</SelectItem>
                          <SelectItem value="N" className="h-12 rounded-xl text-[10px] font-black tracking-widest uppercase text-rose-500">--- ?€ê¸?(Staging) ---</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                  <FormField label="?ì‚° ëª…ì„¸ ë°??¤ëª… (Metadata)">
                    <textarea name="bannerDc" defaultValue={(editingItem as Banner)?.bannerDc} className="w-full min-h-[120px] p-6 rounded-2xl border-2 border-slate-100 bg-slate-50 text-xs font-bold focus:ring-4 focus:ring-primary/10 outline-none resize-none shadow-inner" placeholder="ë°°ë„ˆ ?ì‚°???©ë„ ë°??œì¶œ ì¡°ê±´ ?¤ëª…" />
                  </FormField>
                </>
              ) : (
                <>
                  <FormField label="?ì—… ?€?´í? (Header)" required>
                    <Input name="popupTitleNm" type="text" defaultValue={(editingItem as Popup)?.popupTitleNm} className="h-14 rounded-2xl text-md font-black tracking-tight shadow-inner" required placeholder="?ì—… ?œëª© ?…ë ¥" />
                  </FormField>
                  <div className="grid grid-cols-2 gap-8 p-10 bg-slate-50 border-2 border-dashed border-slate-100 rounded-[2.5rem] shadow-inner">
                    <FormField label="ê²Œì‹œ ?œì‘ ?œì  (T-0)" required>
                      <Input name="ntceBgnde" type="date" defaultValue={(editingItem as Popup)?.ntceBgnde} className="h-14 rounded-xl text-xs font-black shadow-sm" required />
                    </FormField>
                    <FormField label="ê²Œì‹œ ì¢…ë£Œ ?œì  (T-End)" required>
                      <Input name="ntceEndde" type="date" defaultValue={(editingItem as Popup)?.ntceEndde} className="h-14 rounded-xl text-xs font-black shadow-sm" required />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                    <FormField label="ê°€ë¡?ì¢Œí‘œ (X_Pivot)">
                      <Input name="popupWlc" type="number" defaultValue={(editingItem as Popup)?.popupWlc || 0} className="h-14 rounded-2xl font-black shadow-inner" required />
                    </FormField>
                    <FormField label="?¸ë¡œ ì¢Œí‘œ (Y_Pivot)">
                      <Input name="popupHlc" type="number" defaultValue={(editingItem as Popup)?.popupHlc || 0} className="h-14 rounded-2xl font-black shadow-inner" required />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                    <FormField label="ê°€ë¡???(W_Res)">
                      <Input name="popupWSize" type="number" defaultValue={(editingItem as Popup)?.popupWSize || 400} className="h-14 rounded-2xl font-black shadow-inner" required />
                    </FormField>
                    <FormField label="?¸ë¡œ ?’ì´ (H_Res)">
                      <Input name="popupHSize" type="number" defaultValue={(editingItem as Popup)?.popupHSize || 300} className="h-14 rounded-2xl font-black shadow-inner" required />
                    </FormField>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-12">
              <FormField label="ë¯¸ë””???ì‚° ?…ë¡œ??(Visual Payload)" required description="?œìŠ¤???œì? ê·œê²© ?´ë?ì§€ë¥?ì¤€?˜í•˜??‹œ??">
                <div className="p-4 border-4 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/50 hover:bg-slate-50 transition-colors shadow-inner relative group/upload">
                  <div className="absolute inset-x-0 -top-8 flex justify-center opacity-0 group-hover/upload:opacity-100 transition-opacity">
                    <div className="px-4 py-2 bg-slate-900 text-white rounded-full text-[9px] font-black tracking-widest uppercase animate-bounce">?Œì¼ ?…ë¡œ???œì„±</div>
                  </div>
                  <StandardFileUploader
                    onFilesChange={(f) => setFormFiles(f)}
                    maxFiles={1}
                  />
                  <div className="mt-4 flex items-center justify-center gap-4 text-muted-foreground/30">
                    <UploadCloud size={24} />
                    <span className="text-[10px] font-black tracking-widest">?¬ê¸°ë¡??Œì¼???œë˜ê·¸í•˜???…ë¡œ??/span>
                  </div>
                </div>
              </FormField>

              {(editingItem as Banner)?.bannerId && (editingItem as Banner).bannerImageFile && (
                <div className="p-8 rounded-[2rem] bg-slate-900 text-white space-y-3 shadow-2xl relative overflow-hidden group">
                  <span className="text-[9px] font-black text-white/30 tracking-[0.4em] uppercase">ê¸°ì¡´ ?Œì¼ ?ë³„??/span>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shadow-inner group-hover:rotate-12 transition-transform">
                      <SearchCode size={20} className="text-primary" />
                    </div>
                    <span className="font-mono text-[10px] font-black tracking-tighter text-white/80 truncate">
                      {(editingItem as any).bannerImage || (editingItem as any).fileUrl}
                    </span>
                  </div>
                  {/* Preview of existing */}
                  <div className="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
                </div>
              )}

              {activeTab === 'popup' && (
                <div className="grid grid-cols-1 gap-8 p-10 bg-indigo-50/30 border-2 border-indigo-100/50 rounded-[2.5rem] shadow-sm">
                  <p className="text-[9px] font-black text-indigo-500/50 tracking-[0.4em] uppercase mb-1">?íƒœ ?„ë¡œ? ì½œ</p>
                  <div className="grid grid-cols-2 gap-6">
                    <FormField label="ê²Œì‹œ ?¤ì?ì¤„ë§">
                      <Select name="ntceAt" defaultValue={(editingItem as Popup)?.ntceAt || 'Y'}>
                        <SelectTrigger className="h-14 rounded-2xl border-2 border-indigo-100 bg-white font-black text-[10px] tracking-widest uppercase shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          <SelectItem value="Y" className="font-black text-[10px] tracking-widest uppercase">ê²Œì‹œ (LIVE)</SelectItem>
                          <SelectItem value="N" className="font-black text-[10px] tracking-widest uppercase text-rose-500">?€ê¸?(STAGING)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="?¤ì‹œë³´ì??Šê¸° ì²˜ë¦¬">
                      <Select name="stopVewAt" defaultValue={(editingItem as Popup)?.stopVewAt || 'Y'}>
                        <SelectTrigger className="h-14 rounded-2xl border-2 border-indigo-100 bg-white font-black text-[10px] tracking-widest uppercase shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          <SelectItem value="Y" className="font-black text-[10px] tracking-widest uppercase">?œì„± (ENABLE)</SelectItem>
                          <SelectItem value="N" className="font-black text-[10px] tracking-widest uppercase">ë¹„í™œ??(DISABLE)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>
      </StandardModal>
    </div>
  );
}
