'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { PageHeader } from '@/app/components/layout/page-header';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
        <div className="w-40 h-16 bg-slate-900 rounded-xl overflow-hidden border border-border shadow-sm relative group/img">
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
        </div>
      )
    },
    {
      header: '배너 명칭',
      accessor: (item: Banner) => (
        <div className="flex flex-col">
          <span className="font-bold text-foreground italic">{item.bannerNm}</span>
          <span className="text-[10px] font-mono text-muted-foreground">ID: {item.bannerId}</span>
        </div>
      )
    },
    {
      header: '순서',
      accessor: (item: Banner) => (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-muted font-bold text-sm text-foreground">
          {item.sortOrdr}
        </span>
      )
    },
    { header: '상태', accessor: (item: Banner) => <StatusBadge status={item.reflctAt} /> },
    {
      header: '액션',
      className: 'text-right',
      accessor: (item: Banner) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => handleEdit(item)}>
            <Edit size={16} />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-rose-500 hover:text-rose-600 rounded-lg" onClick={() => handleDelete(item.bannerId)}>
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  const popupColumns = [
    {
      header: '팝업 타이틀',
      accessor: (item: Popup) => (
        <div className="flex flex-col py-1">
          <span className="font-bold text-foreground italic">{item.popupTitleNm}</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground font-mono">
              Duration: {item.ntceBgnde} ~ {item.ntceEndde}
            </span>
          </div>
        </div>
      )
    },
    {
      header: '사이즈',
      accessor: (item: Popup) => (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md border text-[10px] font-mono text-muted-foreground">
            <Monitor size={12} />
            {item.popupWSize} x {item.popupHSize}
          </div>
        </div>
      )
    },
    { header: '게시여부', accessor: (item: Popup) => <StatusBadge status={item.ntceAt} /> },
    {
      header: '액션',
      className: 'text-right',
      accessor: (item: Popup) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => handleEdit(item)}>
            <Edit size={16} />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-rose-500 hover:text-rose-600 rounded-lg" onClick={() => handleDelete(item.popupId)}>
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <PageHeader
        title="포털 홍보 채널 관리"
        breadcrumbs={[{ label: '시스템관리' }, { label: '홍보관리' }]}
        actions={
          <Button
            onClick={handleCreate}
            className="h-14 px-10 rounded-2xl font-bold shadow-lg gap-3 hover:-translate-y-1 transition-all italic text-sm"
          >
            <Plus size={20} /> {activeTab === 'banner' ? '배너' : '팝업'} 등록
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <SummaryCard title="Active Banners" value={banners.filter(b => b.reflctAt === 'Y').length} icon={<ImageIcon />} color="slate" />
        <SummaryCard title="Live Popups" value={popups.filter(p => p.ntceAt === 'Y').length} icon={<Monitor />} color="primary" />
        <SummaryCard title="Scheduled" value={popups.filter(p => new Date(p.ntceBgnde) > new Date()).length} icon={<Calendar />} color="emerald" />
        <SummaryCard title="Total Assets" value={banners.length + popups.length} icon={<Layers />} color="indigo" />
      </div>

      <div className="responsive-card border-none bg-background/50 backdrop-blur-xl p-0">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
          <div className="flex bg-muted/50 p-1.5 rounded-2xl gap-2 w-full md:w-auto">
            <button
              onClick={() => setTab('banner')}
              className={cn(
                "flex-1 md:flex-none px-10 py-4 rounded-xl font-black text-xs tracking-[0.2em] italic transition-all",
                activeTab === 'banner' ? "bg-background shadow-xl text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              BANNERS
            </button>
            <button
              onClick={() => setTab('popup')}
              className={cn(
                "flex-1 md:flex-none px-10 py-4 rounded-xl font-black text-xs tracking-[0.2em] italic transition-all",
                activeTab === 'popup' ? "bg-background shadow-xl text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              POPUPS
            </button>
          </div>

          <div className="flex items-center gap-4 text-muted-foreground italic">
            <Sparkles size={16} className="animate-pulse" />
            <span className="text-[10px] font-black tracking-widest uppercase">Promotion Engine v2.0</span>
          </div>
        </div>

        <StandardDataTable
          columns={activeTab === 'banner' ? bannerColumns : (popupColumns as any)}
          data={activeTab === 'banner' ? banners : (popups as any[])}
          emptyMessage={`등록된 ${activeTab === 'banner' ? '배너' : '팝업'}가 없습니다.`}
          className="border-none bg-card/50 rounded-[2.5rem] p-1 shadow-sm"
        />
      </div>

      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsOpen(false)}
        title={activeTab === 'banner' ? (editingItem ? '배너 정보 수정' : '신규 배너 등록') : (editingItem ? '팝업 정보 수정' : '신규 팝업 등록')}
        maxWidth="2xl"
        footer={
          <div className="flex w-full gap-3">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-11 rounded-xl font-bold">취소</Button>
            <Button form="promotion-form" type="submit" className="flex-[2] h-11 rounded-xl font-bold italic">
              {editingItem ? '수정 완료' : '등록 완료'}
            </Button>
          </div>
        }
      >
        <form id="promotion-form" onSubmit={handleSubmit} className="space-y-6 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-5">
              {activeTab === 'banner' ? (
                <>
                  <FormField label="배너 명칭" required>
                    <Input name="bannerNm" type="text" defaultValue={(editingItem as Banner)?.bannerNm} className="h-10 text-sm font-semibold" placeholder="배너 이름 입력" required />
                  </FormField>
                  <FormField label="연결 URL (Hyperlink)" description="배너 클릭 시 이동할 경로">
                    <Input name="linkUrl" type="text" defaultValue={(editingItem as Banner)?.linkUrl} className="h-10 text-sm font-mono" placeholder="예: /notices/1" />
                  </FormField>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="표시 순서" required>
                      <Input name="sortOrdr" type="number" defaultValue={(editingItem as Banner)?.sortOrdr || 0} className="h-10 text-sm" required />
                    </FormField>
                    <FormField label="사용 여부">
                      <Select name="reflctAt" defaultValue={(editingItem as Banner)?.reflctAt || 'Y'}>
                        <SelectTrigger className="h-10 text-xs font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Y">--- 사용중 ---</SelectItem>
                          <SelectItem value="N">--- 중지 ---</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                  <FormField label="상세 설명">
                    <Textarea name="bannerDc" defaultValue={(editingItem as Banner)?.bannerDc} className="min-h-[100px] text-sm" placeholder="배너에 대한 간략한 설명" />
                  </FormField>
                </>
              ) : (
                <>
                  <FormField label="팝업 타이틀" required>
                    <Input name="popupTitleNm" type="text" defaultValue={(editingItem as Popup)?.popupTitleNm} className="h-10 text-sm font-semibold" placeholder="팝업 제목 입력" required />
                  </FormField>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="게시 시작일" required>
                      <Input name="ntceBgnde" type="date" defaultValue={(editingItem as Popup)?.ntceBgnde} className="h-10 text-sm" required />
                    </FormField>
                    <FormField label="게시 종료일" required>
                      <Input name="ntceEndde" type="date" defaultValue={(editingItem as Popup)?.ntceEndde} className="h-10 text-sm" required />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="가로 좌표 (Px)" description="좌상단 기준 X">
                      <Input name="popupWlc" type="number" defaultValue={(editingItem as Popup)?.popupWlc || 0} className="h-10 text-sm" required />
                    </FormField>
                    <FormField label="세로 좌표 (Px)" description="좌상단 기준 Y">
                      <Input name="popupHlc" type="number" defaultValue={(editingItem as Popup)?.popupHlc || 0} className="h-10 text-sm" required />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="가로 크기 (Px)">
                      <Input name="popupWSize" type="number" defaultValue={(editingItem as Popup)?.popupWSize || 400} className="h-10 text-sm" required />
                    </FormField>
                    <FormField label="세로 크기 (Px)">
                      <Input name="popupHSize" type="number" defaultValue={(editingItem as Popup)?.popupHSize || 300} className="h-10 text-sm" required />
                    </FormField>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-6">
              <FormField label="이미지 자산" required description="권장 사이즈를 준수하십시오.">
                <div className="p-2 border-2 border-dashed border-muted rounded-2xl bg-muted/30">
                  <StandardFileUploader
                    onFilesChange={(f) => setFormFiles(f)}
                    maxFiles={1}
                  />
                </div>
              </FormField>

              {(editingItem as any)?.bannerImageFile && (
                <div className="p-4 rounded-xl bg-muted/50 border border-border text-[10px] text-muted-foreground italic flex flex-col gap-1">
                  <span className="opacity-60">기존 이미지 ID:</span>
                  <span className="font-mono text-foreground truncate">
                    {(editingItem as any).bannerImage || (editingItem as any).fileUrl}
                  </span>
                </div>
              )}

              {activeTab === 'popup' && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <FormField label="게시 상태">
                    <Select name="ntceAt" defaultValue={(editingItem as Popup)?.ntceAt || 'Y'}>
                      <SelectTrigger className="h-10 text-xs font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Y">LIVE (게시)</SelectItem>
                        <SelectItem value="N">STAGING (중단)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="다시보기 중지">
                    <Select name="stopVewAt" defaultValue={(editingItem as Popup)?.stopVewAt || 'Y'}>
                      <SelectTrigger className="h-10 text-xs font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Y">활성</SelectItem>
                        <SelectItem value="N">비활성</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>
              )}
            </div>
          </div>
        </form>
      </StandardModal>
    </div>
  );
}

function SummaryCard({ title, value, icon, color }: any) {
  const colorMap: any = {
    slate: "bg-slate-900 text-white border-slate-800 shadow-slate-900/20 dark:bg-card dark:text-foreground dark:border-border",
    primary: "bg-white text-primary border-primary/20 shadow-primary/5 dark:bg-card dark:text-primary dark:border-border",
    indigo: "bg-indigo-600 text-white border-indigo-700 shadow-indigo-600/20",
    emerald: "bg-emerald-50 text-emerald-900 border-emerald-100 shadow-emerald-200/50 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
  };

  const iconBgMap: any = {
    slate: "bg-white/10 text-white",
    primary: "bg-primary/10 text-primary",
    indigo: "bg-white/20 text-white",
    emerald: "bg-white text-emerald-600 shadow-sm dark:bg-emerald-500/20 dark:text-emerald-400"
  };

  return (
    <div className={cn(
      "p-6 rounded-3xl border transition-all group overflow-hidden relative",
      colorMap[color]
    )}>
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center group-hover:rotate-6 transition-transform shadow-lg", iconBgMap[color])}>
          {icon}
        </div>
      </div>
      <div className="relative z-10 italic">
        <p className="text-[10px] font-bold tracking-widest opacity-60 mb-1">{title}</p>
        <h4 className="text-3xl font-black tracking-tighter tabular-nums">{value}</h4>
      </div>
      <div className="absolute right-[-15%] bottom-[-15%] opacity-[0.05] group-hover:rotate-12 transition-all duration-700">
        {React.cloneElement(icon, { size: 120 })}
      </div>
    </div>
  );
}
