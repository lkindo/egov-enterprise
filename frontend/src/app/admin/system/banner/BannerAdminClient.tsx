'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { PageHeader } from '@/app/components/layout/page-header';
import { UltimateDataGrid, ColumnDef } from '@/app/components/ui/ultimate-data-grid';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import dynamic from 'next/dynamic';
const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });
import { StandardFileUploader } from '@/app/components/ui/standard-file-uploader';
import { FormField } from '@/app/components/ui/standard-form';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { Banner, Popup } from '@/types/banner';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { fileAdminService } from '@/services/admin/system/FileAdminService';
import {
  LayoutPanelTop,
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
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  saveBannerAction,
  deleteBannerAction,
  savePopupAction,
  deletePopupAction
} from '@/app/actions/promotionActions';

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

  const banners = initialBanners;
  const popups = initialPopups;

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
      title: '삭제 확인',
      message: '정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
      variant: 'destructive',
      confirmText: '삭제'
    });

    if (!ok) return;

    const res = activeTab === 'banner'
      ? await deleteBannerAction(null, id)
      : await deletePopupAction(null, id);

    if (res.success) {
      toast(res.message, 'success');
    } else {
      toast(res.message, 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formDataObj = new FormData(e.currentTarget);
    const data: any = Object.fromEntries(formDataObj.entries());

    try {
      // Logic for file upload
      if (formFiles.length > 0) {
        const uploadRes = await fileAdminService.uploadFiles(formFiles) as any;
        const uploadedFileId = uploadRes?.data?.data || uploadRes?.data || uploadRes;
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
      } else {
        toast(res.message, 'error');
      }
    } catch (error) {
      toast('저장에 실패했습니다.', 'error');
    }
  };

  const bannerColumns = [
    {
      header: '배너 이미지',
      accessor: (item: Banner) => (
        <div className="w-40 h-16 bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-xl relative group/img">
          <ImageIcon size={20} className="absolute inset-0 m-auto text-white/10" />
          {item.bannerImageFile && (
            <Image
              src={`/api/v1/files/download?fileId=${item.bannerImageFile}`}
              className="object-cover z-10 group-hover/img:scale-110 transition-transform duration-500"
              alt="banner"
              fill
              sizes="(max-width: 160px) 100vw, 160px"
            />
          )}
          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/img:opacity-100 transition-opacity z-20 flex items-center justify-center">
            <ExternalLink size={16} className="text-white" />
          </div>
        </div>
      )
    },
    {
      header: 'IDENTIFIER',
      accessor: (item: Banner) => (
        <div className="flex flex-col gap-1">
          <span className="font-black italic uppercase tracking-tighter text-slate-900">{item.bannerNm}</span>
          <span className="text-[9px] font-mono text-slate-400 font-bold">SN: {item.bannerId}</span>
        </div>
      )
    },
    {
      header: 'PRIORITY',
      accessor: (item: Banner) => (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 font-black text-xs text-slate-500 shadow-inner">
          {item.sortOrdr}
        </span>
      )
    },
    { header: 'STATUS', accessor: (item: Banner) => <StatusBadge status={item.reflctAt} /> },
    {
      header: 'CONTROL',
      className: 'text-right',
      accessor: (item: Banner) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="icon" className="h-11 w-11 rounded-[1.25rem] hover:bg-slate-900 hover:text-white transition-all border-2 border-transparent hover:border-slate-800" onClick={() => handleEdit(item)}>
            <Edit size={18} />
          </Button>
          <Button variant="ghost" size="icon" className="h-11 w-11 rounded-[1.25rem] hover:bg-rose-50 hover:text-rose-600 transition-all border-2 border-transparent hover:border-rose-100" onClick={() => handleDelete(item.bannerId)}>
            <Trash2 size={18} />
          </Button>
        </div>
      )
    }
  ];

  const popupColumns = [
    {
      header: 'DOMAIN',
      accessor: (item: Popup) => (
        <div className="flex flex-col gap-1 py-1">
          <span className="font-black italic uppercase tracking-tighter text-slate-900 text-lg">{item.popupTitleNm}</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-black text-slate-400 uppercase tracking-widest italic">Live Duration</span>
            <span className="text-[10px] font-bold text-slate-500 font-mono tracking-tighter opacity-60">
              {item.ntceBgnde} ~ {item.ntceEndde}
            </span>
          </div>
        </div>
      )
    },
    {
      header: 'GEOMETRY',
      accessor: (item: Popup) => (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 shadow-inner">
            <Monitor size={12} className="text-slate-300" />
            <span className="text-[10px] font-black font-mono text-slate-600">{item.popupWSize} <span className="text-slate-300">x</span> {item.popupHSize}</span>
          </div>
        </div>
      )
    },
    { header: 'VISIBILITY', accessor: (item: Popup) => <StatusBadge status={item.ntceAt} /> },
    {
      header: 'CONTROL',
      className: 'text-right',
      accessor: (item: Popup) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="icon" className="h-11 w-11 rounded-[1.25rem] hover:bg-slate-900 hover:text-white transition-all border-2 border-transparent hover:border-slate-800" onClick={() => handleEdit(item)}>
            <Edit size={18} />
          </Button>
          <Button variant="ghost" size="icon" className="h-11 w-11 rounded-[1.25rem] hover:bg-rose-50 hover:text-rose-600 transition-all border-2 border-transparent hover:border-rose-100" onClick={() => handleDelete(item.popupId)}>
            <Trash2 size={18} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <PageHeader
        title="시스템 홍보 엔진 최적화"
        breadcrumbs={[{ label: '시스템관리' }, { label: '홍보관리' }]}
        actions={
          <Button
            onClick={handleCreate}
            className="h-14 px-10 rounded-[1.5rem] font-black shadow-2xl shadow-primary/20 gap-3 hover:-translate-y-1 transition-all active:scale-95 italic uppercase tracking-widest text-xs"
          >
            <Plus size={20} /> Deploy {activeTab === 'banner' ? 'Banner' : 'Popup'} Node
          </Button>
        }
      />

      {/* Modern High-End Tab Switcher */}
      <div className="flex justify-center">
        <div className="flex bg-slate-900/5 backdrop-blur-3xl border-2 border-white p-2 rounded-[2.5rem] shadow-2xl ring-1 ring-slate-900/5">
          <button
            onClick={() => setTab('banner')}
            className={cn(
              "flex items-center gap-4 px-10 py-4 text-xs font-black rounded-[1.75rem] transition-all uppercase tracking-[0.2em] italic",
              activeTab === 'banner'
                ? "bg-slate-900 text-white shadow-2xl scale-105"
                : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
            )}
          >
            <ImageIcon size={20} />
            Banner Control
          </button>
          <button
            onClick={() => setTab('popup')}
            className={cn(
              "flex items-center gap-4 px-10 py-4 text-xs font-black rounded-[1.75rem] transition-all uppercase tracking-[0.2em] italic",
              activeTab === 'popup'
                ? "bg-slate-900 text-white shadow-2xl scale-105"
                : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
            )}
          >
            <LayoutPanelTop size={20} />
            Popup Domain
          </button>
        </div>
      </div>

      <div className="p-10 bg-slate-900 text-white rounded-[4rem] shadow-2xl flex flex-col md:flex-row items-center gap-10 relative overflow-hidden group">
        <div className="w-24 h-24 bg-white/10 rounded-[2rem] flex items-center justify-center backdrop-blur-2xl border border-white/20 shadow-2xl group-hover:rotate-12 transition-transform duration-700">
          <Sparkles size={40} className="text-primary-foreground group-hover:scale-110 transition-transform" />
        </div>
        <div className="space-y-4 flex-1 text-center md:text-left relative z-10">
          <h4 className="text-3xl font-black italic tracking-tighter uppercase tabular-nums">Promotional Intelligence Matrix</h4>
          <p className="text-base text-slate-400 font-bold leading-relaxed max-w-3xl">
            배너 및 팝업 자산을 실시간으로 관리하십시오. 모든 변화는 시스템 전반에 즉시 동기화됩니다. <span className="text-primary font-black italic">Active Status</span>를 확인하여 사용자 경험의 일관성을 유지하십시오.
          </p>
        </div>
        <CheckCircle2 size={240} className="absolute right-[-60px] top-[-60px] opacity-[0.03] -rotate-12 group-hover:rotate-0 transition-all duration-1000" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <SummaryCard
          title="ACTIVE BANNERS"
          value={banners.filter(b => b.reflctAt === 'Y').length}
          icon={<ImageIcon size={24} />}
          color="slate"
        />
        <SummaryCard
          title="ACTIVE POPUPS"
          value={popups.filter(p => p.ntceAt === 'Y').length}
          icon={<LayoutPanelTop size={24} />}
          color="primary"
        />
        <SummaryCard
          title="TOTAL ASSETS"
          value={banners.length + popups.length}
          icon={<Layers size={24} />}
          color="indigo"
        />
        <SummaryCard
          title="SYSTEM HEALTH"
          value="OPTIMAL"
          icon={<Sparkles size={24} />}
          color="emerald"
        />
      </div>

      <div className="bg-white rounded-[4.5rem] p-6 shadow-2xl border border-slate-100 ring-1 ring-slate-50 relative">
        <UltimateDataGrid
          title={activeTab === 'banner' ? "BANNER REGISTRY MASTER" : "POPUP ARCHITECTURE INVENTORY"}
          columns={activeTab === 'banner' ? (bannerColumns as any) : (popupColumns as any)}
          data={activeTab === 'banner' ? (banners as any) : (popups as any)}
          keyField={activeTab === 'banner' ? "bannerId" : "popupId"}
          className="bg-slate-50/50 p-8 rounded-[3.5rem] border border-dashed border-slate-200"
        />
      </div>

      {/* Registration/Edit Modal */}
      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsOpen(false)}
        title={activeTab === 'banner'
          ? (editingItem ? 'Alter Banner Logic' : 'Establish New Banner')
          : (editingItem ? 'Refactor Popup Domain' : 'Define New Popup Node')}
        maxWidth="lg"
      >
        <form id="admin-form" onSubmit={handleSubmit} className="p-8 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-8">
              {activeTab === 'banner' ? (
                <>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Banner Nomenclature</label>
                    <input name="bannerNm" type="text" defaultValue={(editingItem as Banner)?.bannerNm} className="w-full h-16 rounded-2xl border-2 text-lg font-black px-6 focus:ring-4 focus:ring-primary/10 transition-all" required />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Hyperlink Endpoint</label>
                    <input name="linkUrl" type="text" defaultValue={(editingItem as Banner)?.linkUrl} className="w-full h-16 rounded-2xl border-2 text-lg font-black px-6 focus:ring-4 focus:ring-primary/10 transition-all font-mono italic" />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Priority Index</label>
                      <input name="sortOrdr" type="number" defaultValue={(editingItem as Banner)?.sortOrdr || 0} className="w-full h-16 rounded-2xl border-2 text-lg font-black px-6 focus:ring-4 focus:ring-primary/10 transition-all shadow-inner bg-slate-50/50" required />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Active Status</label>
                      <select name="reflctAt" defaultValue={(editingItem as Banner)?.reflctAt || 'Y'} className="w-full h-16 rounded-2xl border-2 text-xs font-black px-6 focus:ring-4 focus:ring-primary/10 transition-all bg-white shadow-xl appearance-none cursor-pointer uppercase italic tracking-widest">
                        <option value="Y">--- ACTIVE ---</option>
                        <option value="N">--- SUSPENDED ---</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Contextual Background</label>
                    <textarea name="bannerDc" defaultValue={(editingItem as Banner)?.bannerDc} className="w-full min-h-[140px] p-8 rounded-[2.5rem] border-2 bg-slate-50/30 text-lg font-bold outline-none focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all resize-none shadow-inner" placeholder="Brief technical summary..." />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Popup Nomenclature</label>
                    <input name="popupTitleNm" type="text" defaultValue={(editingItem as Popup)?.popupTitleNm} className="w-full h-16 rounded-2xl border-2 text-lg font-black px-6 focus:ring-4 focus:ring-primary/10 transition-all" required />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2"><Calendar size={12} /> Origin Date</label>
                      <input name="ntceBgnde" type="date" defaultValue={(editingItem as Popup)?.ntceBgnde} className="w-full h-16 rounded-2xl border-2 text-xs font-black px-6 focus:ring-4 focus:ring-primary/10 transition-all bg-slate-50/50" required />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2"><Calendar size={12} /> Expiry Date</label>
                      <input name="ntceEndde" type="date" defaultValue={(editingItem as Popup)?.ntceEndde} className="w-full h-16 rounded-2xl border-2 text-xs font-black px-6 focus:ring-4 focus:ring-primary/10 transition-all bg-slate-50/50" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 italic">Horizontal LCP</label>
                      <input name="popupWlc" type="number" defaultValue={(editingItem as Popup)?.popupWlc || 0} className="w-full h-16 rounded-2xl border-2 text-lg font-black px-6 focus:ring-4 focus:ring-primary/10 transition-all shadow-inner" required />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 italic">Vertical LCP</label>
                      <input name="popupHlc" type="number" defaultValue={(editingItem as Popup)?.popupHlc || 0} className="w-full h-16 rounded-2xl border-2 text-lg font-black px-6 focus:ring-4 focus:ring-primary/10 transition-all shadow-inner" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Width (Px)</label>
                      <input name="popupWSize" type="number" defaultValue={(editingItem as Popup)?.popupWSize || 400} className="w-full h-16 rounded-2xl border-2 text-lg font-black px-6 focus:ring-4 focus:ring-primary/10 transition-all" required />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Height (Px)</label>
                      <input name="popupHSize" type="number" defaultValue={(editingItem as Popup)?.popupHSize || 300} className="w-full h-16 rounded-2xl border-2 text-lg font-black px-6 focus:ring-4 focus:ring-primary/10 transition-all" required />
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2"><ImageIcon size={14} /> Asset Source Matrix</label>
                <div className="p-2 border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-slate-50/50">
                  <StandardFileUploader
                    onFilesChange={(f) => setFormFiles(f)}
                    maxFiles={1}
                  />
                </div>
                {(editingItem as any)?.bannerImageFile && (
                  <div className="p-8 rounded-[2rem] bg-slate-900/5 border border-slate-900/5 text-[10px] text-slate-400 italic font-bold relative overflow-hidden group/file">
                    <Info size={40} className="absolute right-[-10px] top-[-10px] opacity-[0.05]" />
                    <span className="relative z-10 block leading-relaxed uppercase tracking-tighter opacity-60 mb-2">Persistent Asset Identifier:</span>
                    <span className="relative z-10 font-mono text-slate-900 flex items-center gap-2">
                      <ExternalLink size={12} className="shrink-0" />
                      <span className="truncate">{(editingItem as any).bannerImage || (editingItem as any).fileUrl}</span>
                    </span>
                  </div>
                )}
              </div>

              {activeTab === 'popup' && (
                <div className="grid grid-cols-2 gap-6 pt-4">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 italic">Publication</label>
                    <select name="ntceAt" defaultValue={(editingItem as Popup)?.ntceAt || 'Y'} className="w-full h-16 rounded-2xl border-2 text-[10px] font-black px-6 focus:ring-4 focus:ring-primary/10 transition-all bg-white shadow-xl cursor-pointer uppercase italic">
                      <option value="Y">LIVE</option>
                      <option value="N">STAGING</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 italic">Persist Filter</label>
                    <select name="stopVewAt" defaultValue={(editingItem as Popup)?.stopVewAt || 'Y'} className="w-full h-16 rounded-2xl border-2 text-[10px] font-black px-6 focus:ring-4 focus:ring-primary/10 transition-all bg-white shadow-xl cursor-pointer uppercase italic">
                      <option value="Y">ENABLED</option>
                      <option value="N">DISABLED</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-4 pt-12 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2 hover:bg-slate-50 transition-all">Abort Transaction</Button>
            <Button type="submit" className="flex-[2] h-16 rounded-2xl font-black shadow-2xl shadow-primary/20 italic uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:-translate-y-1 transition-all">
              {editingItem ? 'Execute Update Protocol' : 'Finalize Domain Deployment'}
            </Button>
          </div>
        </form>
      </StandardModal>
    </div>
  );
}

function SummaryCard({ title, value, icon, color }: any) {
  const colorMap: any = {
    slate: "bg-slate-900 text-white border-slate-800 shadow-slate-900/20",
    primary: "bg-white text-primary border-primary/20 shadow-primary/5",
    indigo: "bg-indigo-600 text-white border-indigo-700 shadow-indigo-600/20",
    emerald: "bg-emerald-50 text-emerald-900 border-emerald-100 shadow-emerald-200/50"
  };

  const iconBgMap: any = {
    slate: "bg-white/10 text-white",
    primary: "bg-primary/10 text-primary",
    indigo: "bg-white/20 text-white",
    emerald: "bg-white text-emerald-600 shadow-sm"
  };

  return (
    <div className={cn(
      "p-8 rounded-[3rem] border-2 transition-all group overflow-hidden relative",
      colorMap[color]
    )}>
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className={cn("w-12 h-12 rounded-[1.25rem] flex items-center justify-center group-hover:rotate-6 transition-transform shadow-lg", iconBgMap[color])}>
          {icon}
        </div>
      </div>
      <div className="relative z-10 italic">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-1">{title}</p>
        <h4 className="text-4xl font-black tracking-tighter tabular-nums">{value}</h4>
      </div>
      <div className="absolute right-[-20%] bottom-[-20%] opacity-[0.03] group-hover:rotate-12 transition-all duration-700">
        {React.cloneElement(icon, { size: 160 })}
      </div>
    </div>
  );
}
