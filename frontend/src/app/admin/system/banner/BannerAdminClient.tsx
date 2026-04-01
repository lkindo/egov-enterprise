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
      title: '?ÑÎ°úÎ™®ÏÖò ?êÏÇ∞ ??†ú ?ïÏù∏',
      message: '?¥Îãπ Î∞∞ÎÑà ?êÎäî ?ùÏóÖ ?∞Ïù¥?∞Î? ?úÏä§?úÏóê???ÅÍµ¨?ÅÏúºÎ°???†ú?òÏãúÍ≤†Ïäµ?àÍπå? Í≤åÏãú Ï§ëÏù∏ Í≤ΩÏö∞ Ï¶âÏãú Ï§ëÎã®?©Îãà??',
      variant: 'destructive',
      confirmText: '?∞Ïù¥????†ú ?πÏù∏'
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
<<<<<<< HEAD
      toast('ÏûêÏÇ∞ ÏÇ≠Ï†ú Ï≤òÎ¶¨ Ï§ë ÏòàÏô∏Í∞Ä Î∞úÏÉùÌñàÏäµÎãàÎã§.', 'error');
=======
      toast('?êÏÇ∞ ??†ú Ï≤òÎ¶¨ Ï§??àÏô∏Í∞Ä Î∞úÏÉù?àÏäµ?àÎã§.', 'error');
>>>>>>> 99be2886750c05e99df098d47b5b4fd8f624093f
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
<<<<<<< HEAD
      toast('Ï†ÄÏû• Ï≤òÎ¶¨ Ï§ë Îç∞Ïù¥ÌÑ∞ Î¨¥Í≤∞ÏÑ± Ïò§Î•òÍ∞Ä Î∞úÏÉùÌñàÏäµÎãàÎã§.', 'error');
=======
      toast('?Ä??Ï≤òÎ¶¨ Ï§??∞Ïù¥??Î¨¥Í≤∞???§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§.', 'error');
>>>>>>> 99be2886750c05e99df098d47b5b4fd8f624093f
    }
  };

  const bannerColumns: Column<Banner>[] = [
    {
      header: 'ÎπÑÏ£º???êÏÇ∞ ?§ÎÉÖ??,
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
      header: 'Î∞∞ÎÑà ?êÏÇ∞ Î™ÖÏπ≠',
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
      header: '?∞ÏÑ†?úÏúÑ',
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
      header: 'Í≤åÏãú ?ÅÌÉú',
      accessor: (item: Banner | Popup) => {
        const isLive = 'reflctAt' in item ? item.reflctAt === 'Y' : item.ntceAt === 'Y';
        return <HubStatusBadge status={isLive ? 'Í≤åÏãú Ï§? : '?ÄÍ∏?Ï§?} />;
      },
      className: 'w-32'
    },
    {
      header: 'Í¥ÄÎ¶?,
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
      header: '?ùÏóÖ Î™ÖÏÑ∏ (Architecture)',
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
      header: '?îÎ©ò??(Resolution)',
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
      header: 'Í≤åÏãú ?¨Î?',
      accessor: (item: Popup) => <HubStatusBadge status={item.ntceAt === 'Y' ? 'Í≤åÏãú Ï§? : '?ÄÍ∏?Ï§?} />,
      className: 'w-32'
    },
    {
      header: 'Í¥ÄÎ¶?,
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
        title="Î∞∞ÎÑà/?ùÏóÖ Í¥ÄÎ¶?
        breadcrumbs={[{ label: '?úÏä§?úÍ?Î¶? }, { label: '?çÎ≥¥ Í¥ÄÎ¶? }]}
      />

      <HubHeader
        title="?¨ÌÑ∏"
        highlight="Î∞∞ÎÑà Î∞??ùÏóÖ Í¥ÄÎ¶?
        subtitle="?πÏÇ¨?¥Ìä∏???∏Ï∂ú?òÎäî Î∞∞ÎÑà ?êÏÇ∞Í≥?Í≥µÏ? ?ùÏóÖ???±Î°ù?òÍ≥† Í≤åÏãú ?ÅÌÉúÎ•??úÏñ¥?©Îãà??"
        icon={Megaphone}
        actions={
          <Button
            onClick={handleCreate}
            size="lg"
            className="h-14 px-10 rounded-2xl bg-slate-900 border-none text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3"
          >
            <Plus size={20} /> ?†Í∑ú {activeTab === 'banner' ? 'Î∞∞ÎÑà' : '?ùÏóÖ'} ?±Î°ù
          </Button>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="?úÏÑ± Î∞∞ÎÑà" value={banners.filter(b => b.reflctAt === 'Y').length} icon={ImageIcon} color="primary" />
        <HubMetricCard title="?úÏÑ± ?ùÏóÖ" value={popups.filter(p => p.ntceAt === 'Y').length} icon={Monitor} color="emerald" status="Í≤åÏãú Ï§? />
        <HubMetricCard title="?àÏïΩ ?êÏÇ∞" value={popups.filter(p => new Date(p.ntceBgnde) > new Date()).length} icon={Calendar} color="amber" />
        <HubMetricCard title="?ÑÏ≤¥ ?êÏÇ∞" value={banners.length + popups.length} icon={Layers} color="indigo" />
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
                <span className="text-[10px] font-black tracking-widest uppercase mb-1 opacity-40">?ÅÏó≠ 01</span>
                <span className="text-md font-black tracking-tighter uppercase leading-tight">Î∞∞ÎÑà ?§Ï†ï</span>
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
                <span className="text-[10px] font-black tracking-widest uppercase mb-1 opacity-40">?ÅÏó≠ 02</span>
                <span className="text-md font-black tracking-tighter uppercase leading-tight">?ùÏóÖ ?§Ï†ï</span>
              </div>
              {activeTab === 'popup' && (
                <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none opacity-50" />
              )}
            </button>

            <div className="mt-auto p-8 rounded-[2.5rem] bg-slate-900 text-white space-y-4 relative overflow-hidden group">
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <Sparkles size={16} className="text-primary animate-pulse" />
                  <span className="text-[10px] font-black tracking-widest uppercase text-white/40">?úÏä§???ÅÌÉú</span>
                </div>
                <h5 className="text-lg font-black tracking-tighter uppercase leading-none">?ÑÎ°úÎ™®ÏÖò Í¥ÄÎ¶?/h5>
                <p className="text-[9px] font-bold text-slate-400 leading-relaxed uppercase opacity-60">
                  ?±Î°ù??Î™®Îì† Î∞∞ÎÑà?Ä ?ùÏóÖ ?êÏÇ∞?Ä ?úÏä§?úÏóê Ï¶âÏãú Î∞òÏòÅ?©Îãà??
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
                title={activeTab === 'banner' ? "Î∞∞ÎÑà Î™©Î°ù" : "?ùÏóÖ Î™©Î°ù"}
                description={activeTab === 'banner' ? "?¨ÌÑ∏ Î©îÏù∏ Î∞??úÎ∏å ?πÏÖò???∏Ï∂ú?òÎäî Î∞∞ÎÑà Î™©Î°ù?ÖÎãà??" : "Í∏∞Í∞Ñ ?úÏ†ï Í≥µÏ? Î∞??àÎÇ¥Î•??ÑÌïú ?ùÏóÖ Í¥ÄÎ¶?Î™©Î°ù?ÖÎãà??"}
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
                    emptyMessage={`?±Î°ù??${activeTab === 'banner' ? 'Î∞∞ÎÑà' : '?ùÏóÖ'} ?êÏÇ∞??Ï°¥Ïû¨?òÏ? ?äÏäµ?àÎã§.`}
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
        title={activeTab === 'banner' ? (editingItem ? 'Î∞∞ÎÑà Î™ÖÏÑ∏ ?òÏ†ï' : '?†Í∑ú ÎπÑÏ£º???êÏÇ∞ ?±Î°ù') : (editingItem ? '?ùÏóÖ ?ÑÌÇ§?çÏ≤ò ?òÏ†ï' : '?†Í∑ú ?àÏù¥???ùÏóÖ ?§Í≥Ñ')}
        maxWidth="3xl"
        footer={
          <div className="flex w-full gap-4">
            <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-14 rounded-2xl font-black text-[10px] tracking-widest border-2">Ï∑®ÏÜå</Button>
            <Button form="promotion-form" type="submit" className="flex-[2] h-14 rounded-2xl bg-slate-900 border-none text-white font-black text-[10px] tracking-widest shadow-2xl hover:bg-primary transition-all hover:-translate-y-2 group">
              <Zap size={18} className="group-hover:animate-pulse" /> {editingItem ? '?êÏÇ∞ ?òÏ†ï' : '?¥ÏòÅ Î∞∞Ìè¨'}
            </Button>
          </div>
        }
      >
        <form id="promotion-form" onSubmit={handleSubmit} className="space-y-12 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-8">
              {activeTab === 'banner' ? (
                <>
                  <FormField label="Î∞∞ÎÑà Î™ÖÏπ≠ (Internal Label)" required description="Í¥ÄÎ¶¨Ïö© Î™ÖÏπ≠?ÖÎãà??">
                    <Input name="bannerNm" type="text" defaultValue={(editingItem as Banner)?.bannerNm} className="h-14 rounded-2xl text-md font-black tracking-tight shadow-inner" required placeholder="Î∞∞ÎÑà ?¥Î¶Ñ ?ÖÎ†•" />
                  </FormField>
                  <FormField label="?úÎî© ?òÏù¥ÏßÄ (Target URL)" description="?¥Î¶≠ ???¥Îèô???ÑÎ°†?∏Ïóî???ºÏö∞???êÎäî ?∏Î? Í≤ΩÎ°ú">
                    <div className="relative group/link">
                      <LinkIcon size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/link:opacity-100 transition-opacity" />
                      <Input name="linkUrl" type="text" defaultValue={(editingItem as Banner)?.linkUrl} className="h-14 pl-16 rounded-2xl font-mono text-xs font-black shadow-inner" placeholder="/pages/..." />
                    </div>
                  </FormField>
                  <div className="grid grid-cols-2 gap-8">
                    <FormField label="?úÏ∂ú ?úÏÑú Priority" required>
                      <Input name="sortOrdr" type="number" defaultValue={(editingItem as Banner)?.sortOrdr || 0} className="h-14 rounded-2xl font-black shadow-inner" required />
                    </FormField>
                    <FormField label="?êÏÇ∞ Î°úÎìú ?ÅÌÉú">
                      <Select name="reflctAt" defaultValue={(editingItem as Banner)?.reflctAt || 'Y'}>
                        <SelectTrigger className="h-14 rounded-2xl border-2 border-slate-100 bg-slate-50 font-black text-[10px] tracking-widest uppercase shadow-inner">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl shadow-2xl">
                          <SelectItem value="Y" className="h-12 rounded-xl text-[10px] font-black tracking-widest uppercase">--- ?úÏÑ± (Live) ---</SelectItem>
                          <SelectItem value="N" className="h-12 rounded-xl text-[10px] font-black tracking-widest uppercase text-rose-500">--- ?ÄÍ∏?(Staging) ---</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                  <FormField label="?êÏÇ∞ Î™ÖÏÑ∏ Î∞??§Î™Ö (Metadata)">
                    <textarea name="bannerDc" defaultValue={(editingItem as Banner)?.bannerDc} className="w-full min-h-[120px] p-6 rounded-2xl border-2 border-slate-100 bg-slate-50 text-xs font-bold focus:ring-4 focus:ring-primary/10 outline-none resize-none shadow-inner" placeholder="Î∞∞ÎÑà ?êÏÇ∞???©ÎèÑ Î∞??úÏ∂ú Ï°∞Í±¥ ?§Î™Ö" />
                  </FormField>
                </>
              ) : (
                <>
                  <FormField label="?ùÏóÖ ?Ä?¥Ì? (Header)" required>
                    <Input name="popupTitleNm" type="text" defaultValue={(editingItem as Popup)?.popupTitleNm} className="h-14 rounded-2xl text-md font-black tracking-tight shadow-inner" required placeholder="?ùÏóÖ ?úÎ™© ?ÖÎ†•" />
                  </FormField>
                  <div className="grid grid-cols-2 gap-8 p-10 bg-slate-50 border-2 border-dashed border-slate-100 rounded-[2.5rem] shadow-inner">
                    <FormField label="Í≤åÏãú ?úÏûë ?úÏ†ê (T-0)" required>
                      <Input name="ntceBgnde" type="date" defaultValue={(editingItem as Popup)?.ntceBgnde} className="h-14 rounded-xl text-xs font-black shadow-sm" required />
                    </FormField>
                    <FormField label="Í≤åÏãú Ï¢ÖÎ£å ?úÏ†ê (T-End)" required>
                      <Input name="ntceEndde" type="date" defaultValue={(editingItem as Popup)?.ntceEndde} className="h-14 rounded-xl text-xs font-black shadow-sm" required />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                    <FormField label="Í∞ÄÎ°?Ï¢åÌëú (X_Pivot)">
                      <Input name="popupWlc" type="number" defaultValue={(editingItem as Popup)?.popupWlc || 0} className="h-14 rounded-2xl font-black shadow-inner" required />
                    </FormField>
                    <FormField label="?∏Î°ú Ï¢åÌëú (Y_Pivot)">
                      <Input name="popupHlc" type="number" defaultValue={(editingItem as Popup)?.popupHlc || 0} className="h-14 rounded-2xl font-black shadow-inner" required />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                    <FormField label="Í∞ÄÎ°???(W_Res)">
                      <Input name="popupWSize" type="number" defaultValue={(editingItem as Popup)?.popupWSize || 400} className="h-14 rounded-2xl font-black shadow-inner" required />
                    </FormField>
                    <FormField label="?∏Î°ú ?íÏù¥ (H_Res)">
                      <Input name="popupHSize" type="number" defaultValue={(editingItem as Popup)?.popupHSize || 300} className="h-14 rounded-2xl font-black shadow-inner" required />
                    </FormField>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-12">
              <FormField label="ÎØ∏Îîî???êÏÇ∞ ?ÖÎ°ú??(Visual Payload)" required description="?úÏä§???úÏ? Í∑úÍ≤© ?¥Î?ÏßÄÎ•?Ï§Ä?òÌïò??ãú??">
                <div className="p-4 border-4 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/50 hover:bg-slate-50 transition-colors shadow-inner relative group/upload">
                  <div className="absolute inset-x-0 -top-8 flex justify-center opacity-0 group-hover/upload:opacity-100 transition-opacity">
                    <div className="px-4 py-2 bg-slate-900 text-white rounded-full text-[9px] font-black tracking-widest uppercase animate-bounce">?åÏùº ?ÖÎ°ú???úÏÑ±</div>
                  </div>
                  <StandardFileUploader
                    onFilesChange={(f) => setFormFiles(f)}
                    maxFiles={1}
                  />
                  <div className="mt-4 flex items-center justify-center gap-4 text-muted-foreground/30">
                    <UploadCloud size={24} />
                    <span className="text-[10px] font-black tracking-widest">?¨Í∏∞Î°??åÏùº???úÎûòÍ∑∏Ìïò???ÖÎ°ú??/span>
                  </div>
                </div>
              </FormField>

              {(editingItem as Banner)?.bannerId && (editingItem as Banner).bannerImageFile && (
                <div className="p-8 rounded-[2rem] bg-slate-900 text-white space-y-3 shadow-2xl relative overflow-hidden group">
                  <span className="text-[9px] font-black text-white/30 tracking-[0.4em] uppercase">Í∏∞Ï°¥ ?åÏùº ?ùÎ≥Ñ??/span>
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
                  <p className="text-[9px] font-black text-indigo-500/50 tracking-[0.4em] uppercase mb-1">?ÅÌÉú ?ÑÎ°ú?†ÏΩú</p>
                  <div className="grid grid-cols-2 gap-6">
                    <FormField label="Í≤åÏãú ?§Ï?Ï§ÑÎßÅ">
                      <Select name="ntceAt" defaultValue={(editingItem as Popup)?.ntceAt || 'Y'}>
                        <SelectTrigger className="h-14 rounded-2xl border-2 border-indigo-100 bg-white font-black text-[10px] tracking-widest uppercase shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          <SelectItem value="Y" className="font-black text-[10px] tracking-widest uppercase">Í≤åÏãú (LIVE)</SelectItem>
                          <SelectItem value="N" className="font-black text-[10px] tracking-widest uppercase text-rose-500">?ÄÍ∏?(STAGING)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="?§ÏãúÎ≥¥Ï??äÍ∏∞ Ï≤òÎ¶¨">
                      <Select name="stopVewAt" defaultValue={(editingItem as Popup)?.stopVewAt || 'Y'}>
                        <SelectTrigger className="h-14 rounded-2xl border-2 border-indigo-100 bg-white font-black text-[10px] tracking-widest uppercase shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          <SelectItem value="Y" className="font-black text-[10px] tracking-widest uppercase">?úÏÑ± (ENABLE)</SelectItem>
                          <SelectItem value="N" className="font-black text-[10px] tracking-widest uppercase">ÎπÑÌôú??(DISABLE)</SelectItem>
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
