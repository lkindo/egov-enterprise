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
      title: '프로모션 자산 삭제 확인',
      message: '해당 배너 또는 팝업 데이터를 시스템에서 영구적으로 삭제하시겠습니까? 게시 중인 경우 즉시 중단됩니다.',
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
    } catch (error) {
      toast('데이터 처리 중 데이터 무결성 오류가 발생했습니다.', 'error');
    }
  };

  const bannerColumns: Column<Banner>[] = [
    {
      header: '비주얼 자산 스냅샷',
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
      header: '배너 자산 명칭',
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
      header: '우선순위',
      accessor: (item: Banner) => (
        <div className="w-12 h-12 rounded-2xl bg-slate-50 border-2 border-slate-100 flex items-center justify-center shadow-inner group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
          <span className="font-black text-lg font-mono tabular-nums leading-none">{item.sortOrdr}</span>
        </div>
      ),
      className: 'w-24 text-center'
    },
    {
      header: '게시 상태',
      accessor: (item: Banner | Popup) => {
        const isLive = 'reflctAt' in item ? item.reflctAt === 'Y' : item.ntceAt === 'Y';
        return <HubStatusBadge status={isLive ? '게시 중' : '대기 중'} />;
      },
      className: 'w-32'
    },
    {
      header: '관리',
      className: 'text-right',
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
      header: '팝업 명세 (Architecture)',
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
      header: '화면 해상도(Resolution)',
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
      header: '게시 여부',
      accessor: (item: Popup) => <HubStatusBadge status={item.ntceAt === 'Y' ? '게시 중' : '대기 중'} />,
      className: 'w-32'
    },
    {
      header: '관리',
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
            className="h-14 px-10 rounded-2xl bg-slate-900 border-none text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3"
          >
            <Plus size={20} /> 신규 {activeTab === 'banner' ? '배너' : '팝업'} 등록
          </Button>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="활성 배너" value={banners.filter(b => b.reflctAt === 'Y').length} icon={ImageIcon} color="primary" />
        <HubMetricCard title="활성 팝업" value={popups.filter(p => p.ntceAt === 'Y').length} icon={Monitor} color="emerald" status="게시 중" />
        <HubMetricCard title="예약 자산" value={popups.filter(p => new Date(p.ntceBgnde) > new Date()).length} icon={Calendar} color="amber" />
        <HubMetricCard title="전체 자산" value={banners.length + popups.length} icon={Layers} color="indigo" />
      </HubMetricGrid>

      <div className="grid grid-cols-12 gap-12">
        <div className="col-span-12 lg:col-span-3 h-full">
          <div className="rounded-[3.5rem] bg-white border-2 border-slate-100 shadow-xl h-full p-4 flex flex-col gap-4">
            <button
              onClick={() => setTab('banner')}
              className={cn(
                "w-full group p-8 rounded-[2.5rem] border-2 transition-all flex items-center gap-6 relative overflow-hidden",
                activeTab === 'banner' ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.02] z-10" : "bg-transparent border-transparent hover:bg-slate-50 text-slate-400 hover:text-slate-900"
              )}
            >
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg relative z-10", activeTab === 'banner' ? "bg-white/10 text-white shadow-black/20" : "bg-white text-slate-300 group-hover:bg-primary group-hover:text-white")}>
                <ImageIcon size={22} />
              </div>
              <div className="flex flex-col text-left relative z-10">
                <span className="text-[10px] font-black tracking-widest uppercase mb-1 opacity-40">영역 01</span>
                <span className="text-md font-black tracking-tighter uppercase leading-tight">배너 설정</span>
              </div>
              {activeTab === 'banner' && <div className="absolute right-0 top-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none opacity-50" />}
            </button>
            <button
              onClick={() => setTab('popup')}
              className={cn(
                "w-full group p-8 rounded-[2.5rem] border-2 transition-all flex items-center gap-6 relative overflow-hidden",
                activeTab === 'popup' ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.02] z-10" : "bg-transparent border-transparent hover:bg-slate-50 text-slate-400 hover:text-slate-900"
              )}
            >
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg relative z-10", activeTab === 'popup' ? "bg-white/10 text-white shadow-black/20" : "bg-white text-slate-300 group-hover:bg-indigo-500 group-hover:text-white")}>
                <Monitor size={22} />
              </div>
              <div className="flex flex-col text-left relative z-10">
                <span className="text-[10px] font-black tracking-widest uppercase mb-1 opacity-40">영역 02</span>
                <span className="text-md font-black tracking-tighter uppercase leading-tight">팝업 설정</span>
              </div>
              {activeTab === 'popup' && <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none opacity-50" />}
            </button>
            <div className="mt-auto p-8 rounded-[2.5rem] bg-slate-900 text-white space-y-4 relative overflow-hidden group">
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <Sparkles size={16} className="text-primary animate-pulse" />
                  <span className="text-[10px] font-black tracking-widest uppercase text-white/40">시스템 상태</span>
                </div>
                <h5 className="text-lg font-black tracking-tighter uppercase leading-none">프로모션 엔진</h5>
                <p className="text-[9px] font-bold text-slate-400 leading-relaxed uppercase opacity-60">등록된 모든 배너 및 팝업 자산은 시스템에 즉시 반영됩니다.</p>
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
                  <StandardDataTable<Banner | Popup>
                    columns={activeTab === 'banner' ? (bannerColumns as Column<Banner | Popup>[]) : (popupColumns as Column<Banner | Popup>[])}
                    data={activeTab === 'banner' ? banners : popups}
                    loading={activeTab === 'banner' ? isBannersLoading : isPopupsLoading}
                    onRetry={() => activeTab === 'banner' ? refetchBanners() : refetchPopups()}
                    keyField={(activeTab === 'banner' ? 'bannerId' : 'popupId') as any}
                    emptyMessage={`등록된 ${activeTab === 'banner' ? '배너' : '팝업'} 자산이 존재하지 않습니다.`}
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
        title={activeTab === 'banner' ? (editingItem ? '배너 명세 수정' : '신규 비주얼 자산 등록') : (editingItem ? '팝업 아키텍처 수정' : '신규 레이어 팝업 설계')}
        maxWidth="3xl"
        footer={
          <div className="flex w-full gap-4">
            <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-14 rounded-2xl font-black text-[10px] tracking-widest border-2">취소</Button>
            <Button form="promotion-form" type="submit" className="flex-[2] h-14 rounded-2xl bg-slate-900 border-none text-white font-black text-[10px] tracking-widest shadow-2xl hover:bg-primary transition-all hover:-translate-y-2 group">
              <Zap size={18} className="group-hover:animate-pulse mr-2" /> {editingItem ? '자산 수정' : '운영 배포'}
            </Button>
          </div>
        }
      >
        <form id="promotion-form" onSubmit={handleSubmit} className="space-y-12 pt-4 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-8">
              {activeTab === 'banner' ? (
                <>
                  <FormField label="배너 명칭 (Internal Label)" required description="관리용 명칭입니다">
                    <Input name="bannerNm" type="text" defaultValue={(editingItem as Banner)?.bannerNm} className="h-14 rounded-2xl text-md font-black tracking-tight shadow-inner" required placeholder="배너 이름 입력" />
                  </FormField>
                  <FormField label="랜딩 페이지 (Target URL)" description="클릭 시 이동할 프론트엔드 라우트 또는 외부 경로">
                    <div className="relative group/link">
                      <LinkIcon size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/link:opacity-100 transition-opacity" />
                      <Input name="linkUrl" type="text" defaultValue={(editingItem as Banner)?.linkUrl} className="h-14 pl-16 rounded-2xl font-mono text-xs font-black shadow-inner" placeholder="/pages/..." />
                    </div>
                  </FormField>
                  <div className="grid grid-cols-2 gap-8">
                    <FormField label="노출 순서 Priority" required>
                      <Input name="sortOrdr" type="number" defaultValue={(editingItem as Banner)?.sortOrdr || 0} className="h-14 rounded-2xl font-black shadow-inner" required />
                    </FormField>
                    <FormField label="자산 로드 상태">
                      <Select name="reflctAt" defaultValue={(editingItem as Banner)?.reflctAt || 'Y'}>
                        <SelectTrigger className="h-14 rounded-2xl border-2 border-slate-100 bg-slate-50 font-black text-[10px] tracking-widest uppercase shadow-inner">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl shadow-2xl">
                          <SelectItem value="Y" className="h-12 rounded-xl text-[10px] font-black tracking-widest uppercase">--- 활성 (Live) ---</SelectItem>
                          <SelectItem value="N" className="h-12 rounded-xl text-[10px] font-black tracking-widest uppercase text-rose-500">--- 대기 (Staging) ---</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                  <FormField label="자산 명세 및 설명 (Metadata)">
                    <textarea name="bannerDc" defaultValue={(editingItem as Banner)?.bannerDc} className="w-full min-h-[120px] p-6 rounded-2xl border-2 border-slate-100 bg-slate-50 text-xs font-bold focus:ring-4 focus:ring-primary/10 outline-none resize-none shadow-inner" placeholder="배너 자산 용도 및 노출 조건 설명" />
                  </FormField>
                </>
              ) : (
                <>
                  <FormField label="팝업 타이틀 (Header)" required>
                    <Input name="popupTitleNm" type="text" defaultValue={(editingItem as Popup)?.popupTitleNm} className="h-14 rounded-2xl text-md font-black tracking-tight shadow-inner" required placeholder="팝업 제목 입력" />
                  </FormField>
                  <div className="grid grid-cols-2 gap-8 p-10 bg-slate-50 border-2 border-dashed border-slate-100 rounded-[2.5rem] shadow-inner">
                    <FormField label="게시 시작 시점 (T-0)" required>
                      <Input name="ntceBgnde" type="date" defaultValue={(editingItem as Popup)?.ntceBgnde} className="h-14 rounded-xl text-xs font-black shadow-sm" required />
                    </FormField>
                    <FormField label="게시 종료 시점 (T-End)" required>
                      <Input name="ntceEndde" type="date" defaultValue={(editingItem as Popup)?.ntceEndde} className="h-14 rounded-xl text-xs font-black shadow-sm" required />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                    <FormField label="가로 좌표 (X_Pivot)">
                      <Input name="popupWlc" type="number" defaultValue={(editingItem as Popup)?.popupWlc || 0} className="h-14 rounded-2xl font-black shadow-inner" required />
                    </FormField>
                    <FormField label="세로 좌표 (Y_Pivot)">
                      <Input name="popupHlc" type="number" defaultValue={(editingItem as Popup)?.popupHlc || 0} className="h-14 rounded-2xl font-black shadow-inner" required />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                    <FormField label="가로 폭 (W_Res)">
                      <Input name="popupWSize" type="number" defaultValue={(editingItem as Popup)?.popupWSize || 400} className="h-14 rounded-2xl font-black shadow-inner" required />
                    </FormField>
                    <FormField label="세로 높이 (H_Res)">
                      <Input name="popupHSize" type="number" defaultValue={(editingItem as Popup)?.popupHSize || 300} className="h-14 rounded-2xl font-black shadow-inner" required />
                    </FormField>
                  </div>
                </>
              )}
            </div>
            <div className="space-y-12">
              <FormField label="미디어 자산 업로드 (Visual Payload)" required description="시스템 표준 규격 이미지를 준수하십시오">
                <div className="p-4 border-4 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/50 hover:bg-slate-50 transition-colors shadow-inner relative group/upload">
                  <StandardFileUploader onFilesChange={(f) => setFormFiles(f)} maxFiles={1} />
                  <div className="mt-4 flex items-center justify-center gap-4 text-muted-foreground/30">
                    <UploadCloud size={24} />
                    <span className="text-[10px] font-black tracking-widest text-center">여기로 파일을 드래그하여 업로드</span>
                  </div>
                </div>
              </FormField>
              {(editingItem as any)?.bannerImageFile && (
                <div className="p-8 rounded-[2rem] bg-slate-900 text-white space-y-3 shadow-2xl relative overflow-hidden group">
                  <span className="text-[9px] font-black text-white/30 tracking-[0.4em] uppercase">기존 파일 식별자</span>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shadow-inner group-hover:rotate-12 transition-transform">
                      <SearchCode size={20} className="text-primary" />
                    </div>
                    <span className="font-mono text-[10px] font-black tracking-tighter text-white/80 truncate">{(editingItem as any).bannerImage || (editingItem as any).fileUrl}</span>
                  </div>
                </div>
              )}
              {activeTab === 'popup' && (
                <div className="grid grid-cols-1 gap-8 p-10 bg-indigo-50/30 border-2 border-indigo-100/50 rounded-[2.5rem] shadow-sm">
                  <p className="text-[9px] font-black text-indigo-500/50 tracking-[0.4em] uppercase mb-1">상태 프로토콜</p>
                  <div className="grid grid-cols-2 gap-6">
                    <FormField label="게시 설정">
                      <Select name="ntceAt" defaultValue={(editingItem as Popup)?.ntceAt || 'Y'}>
                        <SelectTrigger className="h-14 rounded-2xl border-2 border-indigo-100 bg-white font-black text-[10px] tracking-widest uppercase shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          <SelectItem value="Y" className="font-black text-[10px] tracking-widest uppercase">게시 (LIVE)</SelectItem>
                          <SelectItem value="N" className="font-black text-[10px] tracking-widest uppercase text-rose-500">대기 (STAGING)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="다시보지않기 처리">
                      <Select name="stopVewAt" defaultValue={(editingItem as Popup)?.stopVewAt || 'Y'}>
                        <SelectTrigger className="h-14 rounded-2xl border-2 border-indigo-100 bg-white font-black text-[10px] tracking-widest uppercase shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          <SelectItem value="Y" className="font-black text-[10px] tracking-widest uppercase">활성 (ENABLE)</SelectItem>
                          <SelectItem value="N" className="font-black text-[10px] tracking-widest uppercase">비활성 (DISABLE)</SelectItem>
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
