'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { StandardFileUploader } from '@/app/components/ui/standard-file-uploader';
import { FormField } from '@/app/components/ui/standard-form';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { bannerService } from '@/services/bannerService';
import { Banner, Popup } from '@/types/banner';
import { useToast } from '@/app/components/ui/toast';
import { LayoutPanelTop, Monitor, Plus, Image as ImageIcon, ExternalLink, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BannerAdminPage() {
  const { toast } = useToast();
  const [activeTab, setTab] = useState<'banner' | 'popup'>('banner');
  const [loading, setLoading] = useState(true);
  
  const [banners, setBanners] = useState<Banner[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  
  const [isModalOpen, setIsOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      if (activeTab === 'banner') {
        const res = await bannerService.getBanners({ page: 0, size: 20 });
        if (res.success) setBanners(res.data.content);
      } else {
        const res = await bannerService.getPopups({ page: 0, size: 20 });
        if (res.success) setPopups(res.data.content);
      }
    } catch (error) {
      toast('데이터를 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const bannerColumns = [
    { 
      header: '미리보기', 
      accessor: (item: Banner) => (
        <div className="w-24 h-12 bg-muted rounded overflow-hidden border relative">
          <ImageIcon size={16} className="absolute inset-0 m-auto text-muted-foreground opacity-20" />
          {item.bannerImage && <img src={item.bannerImage} className="w-full h-full object-cover relative z-10" alt="banner" />}
        </div>
      )
    },
    { header: '배너명', accessor: 'bannerNm', className: 'font-bold' },
    { header: '링크 URL', accessor: 'linkUrl', className: 'text-xs text-muted-foreground' },
    { header: '노출여부', accessor: (item: Banner) => <StatusBadge status={item.reflctAt} /> },
    {
      header: '관리',
      className: 'text-right',
      accessor: () => (
        <div className="flex justify-end gap-2">
          <button className="p-1.5 hover:bg-accent rounded-md"><ExternalLink size={16} /></button>
          <button className="p-1.5 hover:bg-destructive/10 text-destructive rounded-md"><Trash2 size={16} /></button>
        </div>
      )
    }
  ];

  const popupColumns = [
    { header: '팝업명', accessor: 'popupNm', className: 'font-bold' },
    { header: '기간', accessor: (item: Popup) => `${item.ntceBgnde} ~ ${item.ntceEndde}`, className: 'text-xs' },
    { header: '크기', accessor: (item: Popup) => `${item.popupWidth}x${item.popupHeight}`, className: 'text-xs text-muted-foreground' },
    { header: '노출', accessor: (item: Popup) => <StatusBadge status={item.ntceAt} /> },
    {
      header: '관리',
      className: 'text-right',
      accessor: () => (
        <div className="flex justify-end gap-2">
          <button className="p-1.5 hover:bg-accent rounded-md"><ExternalLink size={16} /></button>
          <button className="p-1.5 hover:bg-destructive/10 text-destructive rounded-md"><Trash2 size={16} /></button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="시스템 홍보 관리" 
        breadcrumbs={[{ label: '시스템관리' }, { label: '팝업/배너 관리' }]}
        actions={
          <button 
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
          >
            <Plus size={18} />
            {activeTab === 'banner' ? '새 배너 등록' : '새 팝업 등록'}
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex bg-card border rounded-xl p-1 w-fit shadow-sm">
        <button
          onClick={() => setTab('banner')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 text-sm font-black rounded-lg transition-all",
            activeTab === 'banner' ? "bg-primary text-white shadow-md" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <ImageIcon size={18} />
          배너 관리
        </button>
        <button
          onClick={() => setTab('popup')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 text-sm font-black rounded-lg transition-all",
            activeTab === 'popup' ? "bg-primary text-white shadow-md" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <LayoutPanelTop size={18} />
          팝업 관리
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 bg-card border rounded-2xl shadow-sm">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">활성 배너</p>
          <h4 className="text-2xl font-black">{banners.filter(b => b.reflctAt === 'Y').length} 건</h4>
        </div>
        <div className="p-6 bg-card border rounded-2xl shadow-sm">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">활성 팝업</p>
          <h4 className="text-2xl font-black">{popups.filter(p => p.ntceAt === 'Y').length} 건</h4>
        </div>
      </div>

      {/* Data Table */}
      <StandardDataTable 
        columns={activeTab === 'banner' ? bannerColumns : popupColumns} 
        data={activeTab === 'banner' ? banners : popups} 
        loading={loading}
        emptyMessage={`${activeTab === 'banner' ? '배너' : '팝업'}가 없습니다.`}
      />

      {/* 등록 모달 (배너 기준 예시) */}
      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsOpen(false)}
        title={activeTab === 'banner' ? '배너 신규 등록' : '팝업 신규 등록'}
        maxWidth="lg"
        footer={
          <div className="flex gap-2">
            <button onClick={() => setIsOpen(false)} className="px-4 py-2 border rounded-lg font-bold">취소</button>
            <button className="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-md">등록하기</button>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <FormField label="제목" required>
              <input type="text" className="w-full h-10 px-3 border rounded-md" placeholder="관리용 제목을 입력하세요." />
            </FormField>
            <FormField label="연결 링크 (URL)" required>
              <input type="text" className="w-full h-10 px-3 border rounded-md" placeholder="http://..." />
            </FormField>
            <FormField label="노출 상태" required>
              <select className="w-full h-10 px-3 border rounded-md">
                <option value="Y">노출</option>
                <option value="N">미노출</option>
              </select>
            </FormField>
          </div>
          <div className="space-y-6">
            <FormField label="이미지 업로드" required>
              <StandardFileUploader onFilesChange={(f) => console.log(f)} maxFiles={1} />
            </FormField>
          </div>
        </div>
      </StandardModal>
    </div>
  );
}
