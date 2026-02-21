'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { StandardFileUploader } from '@/app/components/ui/standard-file-uploader';
import { FormField } from '@/app/components/ui/standard-form';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { bannerService } from '@/services/bannerService';
import { popupService } from '@/services/popupService';
import { fileMngService } from '@/services/fileMngService';
import { Banner, Popup } from '@/types/banner';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { LayoutPanelTop, Plus, Image as ImageIcon, ExternalLink, Trash2, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BannerAdminPage() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [activeTab, setTab] = useState<'banner' | 'popup'>('banner');
  const [loading, setLoading] = useState(true);
  
  const [banners, setBanners] = useState<Banner[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);
  
  const [isModalOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Banner | Popup | null>(null);
  const [formFiles, setFormFiles] = useState<File[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      if (activeTab === 'banner') {
        const res = await bannerService.getBanners({ page: 0, size: 20 });
        if (res.success) setBanners(res.data.content);
      } else {
        const res = await popupService.getPopups({ page: 0, size: 20 });
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

    try {
      if (activeTab === 'banner') {
        await bannerService.deleteBanner(id);
      } else {
        await popupService.deletePopup(id);
      }
      toast('삭제되었습니다.', 'success');
      loadData();
    } catch (error) {
      toast('삭제에 실패했습니다.', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: any = Object.fromEntries(formData.entries());

    try {
      // 1. 파일 업로드 처리
      if (formFiles.length > 0) {
        const uploadRes = await fileMngService.uploadFiles(formFiles);
        if (uploadRes.success) {
          if (activeTab === 'banner') {
            data.bannerImageFile = uploadRes.data;
            data.bannerImage = formFiles[0].name;
          } else {
            data.fileUrl = `/api/v1/files/download?fileId=${uploadRes.data}`;
          }
        }
      } else if (editingItem) {
        // 기존 파일 유지
        if (activeTab === 'banner') {
          data.bannerImageFile = (editingItem as Banner).bannerImageFile;
          data.bannerImage = (editingItem as Banner).bannerImage;
        } else {
          data.fileUrl = (editingItem as Popup).fileUrl;
        }
      }

      // 2. 등록 또는 수정
      if (activeTab === 'banner') {
        if (editingItem) {
          await bannerService.updateBanner((editingItem as Banner).bannerId, data as Banner);
        } else {
          await bannerService.createBanner(data as Banner);
        }
      } else {
        if (editingItem) {
          await popupService.updatePopup((editingItem as Popup).popupId, data as Popup);
        } else {
          await popupService.createPopup(data as Popup);
        }
      }

      toast(editingItem ? '수정되었습니다.' : '등록되었습니다.', 'success');
      setIsOpen(false);
      loadData();
    } catch (error) {
      toast('저장에 실패했습니다.', 'error');
    }
  };

  const bannerColumns = [
    { 
      header: '미리보기', 
      accessor: (item: Banner) => (
        <div className="w-24 h-12 bg-muted rounded overflow-hidden border relative flex items-center justify-center">
          <ImageIcon size={16} className="text-muted-foreground opacity-20" />
          {item.bannerImageFile && (
             <img 
               src={`/api/v1/files/download?fileId=${item.bannerImageFile}`} 
               className="absolute inset-0 w-full h-full object-cover z-10" 
               alt="banner" 
               onError={(e) => (e.currentTarget.style.display = 'none')}
             />
          )}
        </div>
      )
    },
    { 
      header: '배너명', 
      accessor: (item: Banner) => item.bannerNm, 
      className: 'font-bold' 
    },
    { 
      header: '순서', 
      accessor: (item: Banner) => item.sortOrdr, 
      className: 'text-center w-20' 
    },
    { header: '노출여부', accessor: (item: Banner) => <StatusBadge status={item.reflctAt} /> },
    {
      header: '관리',
      className: 'text-right',
      accessor: (item: Banner) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => handleEdit(item)} className="p-1.5 hover:bg-accent rounded-md text-slate-600"><Edit size={16} /></button>
          <button onClick={() => handleDelete(item.bannerId)} className="p-1.5 hover:bg-destructive/10 text-destructive rounded-md"><Trash2 size={16} /></button>
        </div>
      )
    }
  ];

  const popupColumns = [
    { 
      header: '팝업명', 
      accessor: (item: Popup) => item.popupTitleNm, 
      className: 'font-bold' 
    },
    { header: '기간', accessor: (item: Popup) => `${item.ntceBgnde} ~ ${item.ntceEndde}`, className: 'text-xs' },
    { header: '크기', accessor: (item: Popup) => `${item.popupWSize}x${item.popupHSize}`, className: 'text-xs text-muted-foreground' },
    { header: '노출', accessor: (item: Popup) => <StatusBadge status={item.ntceAt} /> },
    {
      header: '관리',
      className: 'text-right',
      accessor: (item: Popup) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => handleEdit(item)} className="p-1.5 hover:bg-accent rounded-md text-slate-600"><Edit size={16} /></button>
          <button onClick={() => handleDelete(item.popupId)} className="p-1.5 hover:bg-destructive/10 text-destructive rounded-md"><Trash2 size={16} /></button>
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
            onClick={handleCreate}
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
        columns={activeTab === 'banner' ? (bannerColumns as any) : (popupColumns as any)} 
        data={activeTab === 'banner' ? banners : popups} 
        loading={loading}
        emptyMessage={`${activeTab === 'banner' ? '배너' : '팝업'}가 없습니다.`}
      />

      {/* 등록/수정 모달 */}
      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsOpen(false)}
        title={activeTab === 'banner' 
          ? (editingItem ? '배너 수정' : '배너 신규 등록') 
          : (editingItem ? '팝업 수정' : '팝업 신규 등록')}
        maxWidth="lg"
      >
        <form id="admin-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {activeTab === 'banner' ? (
                <>
                  <FormField label="배너 명" required>
                    <input name="bannerNm" type="text" defaultValue={(editingItem as Banner)?.bannerNm} className="w-full h-10 px-3 border rounded-md" required />
                  </FormField>
                  <FormField label="연결 URL">
                    <input name="linkUrl" type="text" defaultValue={(editingItem as Banner)?.linkUrl} className="w-full h-10 px-3 border rounded-md" />
                  </FormField>
                  <FormField label="정렬 순서" required>
                    <input name="sortOrdr" type="number" defaultValue={(editingItem as Banner)?.sortOrdr || 0} className="w-full h-10 px-3 border rounded-md" required />
                  </FormField>
                  <FormField label="반영 여부" required>
                    <select name="reflctAt" defaultValue={(editingItem as Banner)?.reflctAt || 'Y'} className="w-full h-10 px-3 border rounded-md">
                      <option value="Y">반영</option>
                      <option value="N">미반영</option>
                    </select>
                  </FormField>
                  <FormField label="배너 설명">
                    <textarea name="bannerDc" defaultValue={(editingItem as Banner)?.bannerDc} className="w-full p-3 border rounded-md h-24" />
                  </FormField>
                </>
              ) : (
                <>
                  <FormField label="팝업 제목" required>
                    <input name="popupTitleNm" type="text" defaultValue={(editingItem as Popup)?.popupTitleNm} className="w-full h-10 px-3 border rounded-md" required />
                  </FormField>
                  <div className="grid grid-cols-2 gap-2">
                    <FormField label="시작일" required>
                      <input name="ntceBgnde" type="date" defaultValue={(editingItem as Popup)?.ntceBgnde} className="w-full h-10 px-3 border rounded-md" required />
                    </FormField>
                    <FormField label="종료일" required>
                      <input name="ntceEndde" type="date" defaultValue={(editingItem as Popup)?.ntceEndde} className="w-full h-10 px-3 border rounded-md" required />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <FormField label="가로 위치" required>
                      <input name="popupWlc" type="number" defaultValue={(editingItem as Popup)?.popupWlc || 0} className="w-full h-10 px-3 border rounded-md" required />
                    </FormField>
                    <FormField label="세로 위치" required>
                      <input name="popupHlc" type="number" defaultValue={(editingItem as Popup)?.popupHlc || 0} className="w-full h-10 px-3 border rounded-md" required />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <FormField label="가로 크기" required>
                      <input name="popupWSize" type="number" defaultValue={(editingItem as Popup)?.popupWSize || 400} className="w-full h-10 px-3 border rounded-md" required />
                    </FormField>
                    <FormField label="세로 크기" required>
                      <input name="popupHSize" type="number" defaultValue={(editingItem as Popup)?.popupHSize || 300} className="w-full h-10 px-3 border rounded-md" required />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <FormField label="게시 여부" required>
                      <select name="ntceAt" defaultValue={(editingItem as Popup)?.ntceAt || 'Y'} className="w-full h-10 px-3 border rounded-md">
                        <option value="Y">게시</option>
                        <option value="N">미게시</option>
                      </select>
                    </FormField>
                    <FormField label="그만보기 여부" required>
                      <select name="stopVewAt" defaultValue={(editingItem as Popup)?.stopVewAt || 'Y'} className="w-full h-10 px-3 border rounded-md">
                        <option value="Y">사용</option>
                        <option value="N">미사용</option>
                      </select>
                    </FormField>
                  </div>
                </>
              )}
            </div>
            <div className="space-y-4">
              <FormField label="홍보 이미지 업로드" required={!editingItem}>
                <StandardFileUploader 
                  onFilesChange={(f) => setFormFiles(f)} 
                  maxFiles={1} 
                />
                {(editingItem as any)?.bannerImageFile && (
                  <div className="mt-2 p-2 border rounded-md bg-muted/20 text-xs">
                    기존 파일: {(editingItem as any).bannerImage || (editingItem as any).fileUrl}
                  </div>
                )}
              </FormField>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 border rounded-lg font-bold">취소</button>
            <button type="submit" className="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-md">
              {editingItem ? '수정하기' : '등록하기'}
            </button>
          </div>
        </form>
      </StandardModal>
    </div>
  );
}
