'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { ReorderableList } from '@/app/components/ui/reorderable-list';
import { menuAdminService } from '@/services/menuAdminService';
import { MenuInfo } from '@/types/menu';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { 
  Plus, 
  ListTree, 
  ChevronRight, 
  Settings, 
  Trash2, 
  GripVertical, 
  FolderTree, 
  FileCode,
  Save
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { StandardModal } from '@/app/components/ui/standard-modal';
import { FormField, StandardForm } from '@/app/components/ui/standard-form';
import { programService } from '@/services/programService';
import { Program } from '@/types/program';

export default function MenuAdminPage() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [menus, setMenus] = useState<MenuInfo[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // 모달 상태
  const [isModalOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<Partial<MenuInfo>>({
    menuNo: 0,
    menuNm: '',
    menuOrdr: 0,
    upperMenuId: 0,
    progrmFileNm: '',
    relateImagePath: '',
    relateImageNm: '',
    menuDc: ''
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [mRes, pRes] = await Promise.all([
        menuAdminService.getAllMenus(),
        programService.getPrograms({ page: 0, size: 500 }) // 프로그램 매핑용 전체 로드
      ]);
      if (mRes.success) setMenus(mRes.data || []);
      if (pRes.success) setPrograms(pRes.data.content || []);
    } catch (error) {
      toast('정보를 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setMode('create');
    setFormData({ menuNo: Date.now(), menuNm: '', menuOrdr: menus.length + 1, upperMenuId: 0, progrmFileNm: '' });
    setIsOpen(true);
  };

  const handleOpenEdit = (menu: MenuInfo) => {
    setMode('edit');
    setFormData(menu);
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === 'create') {
        await menuAdminService.createMenu(formData);
        toast('메뉴가 등록되었습니다.', 'success');
      } else {
        await menuAdminService.updateMenu(formData.menuNo!, formData);
        toast('메뉴 정보가 수정되었습니다.', 'success');
      }
      setIsOpen(false);
      loadData();
    } catch (error) {
      toast('저장 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleReorder = (newItems: MenuInfo[]) => {
    setMenus(newItems);
    setHasChanges(true);
  };

  const handleSaveChanges = async () => {
    try {
      const updatedMenus = menus.map((m, idx) => ({ ...m, menuOrdr: idx + 1 }));
      const res = await menuAdminService.updateOrders(updatedMenus);
      if (res.success) {
        toast('메뉴 순서 변경사항이 저장되었습니다.', 'success');
        setHasChanges(false);
        loadData();
      }
    } catch (error) {
      toast('저장 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    const isConfirmed = await confirm({
      title: '메뉴 삭제',
      message: '이 메뉴와 하위 메뉴가 모두 삭제됩니다. 계속하시겠습니까?',
      variant: 'destructive'
    });
    if (isConfirmed) {
      try {
        await menuAdminService.deleteMenu(id);
        toast('삭제되었습니다.', 'success');
        loadData();
      } catch (error) {
        toast('삭제 중 오류가 발생했습니다.', 'error');
      }
    }
  };

  const renderMenuItem = (item: MenuInfo) => (
    <div className="flex items-center justify-between w-full pr-4 group">
      <div className="flex items-center gap-3">
        {item.upperMenuId === 0 ? (
          <div className="p-1.5 bg-primary/10 text-primary rounded-md">
            <FolderTree size={16} />
          </div>
        ) : (
          <div className="flex items-center ml-6 text-muted-foreground">
            <ChevronRight size={14} className="mr-2" />
            <FileCode size={14} />
          </div>
        )}
        <div className="flex flex-col">
          <span className={cn(
            "text-sm font-bold",
            item.upperMenuId === 0 ? "text-foreground" : "text-foreground/80"
          )}>
            {item.menuNm}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">
            {item.progrmFileNm || 'No Program'}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={() => handleOpenEdit(item)}
          className="p-1.5 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground"
        >
          <Settings size={14} />
        </button>
        <button 
          onClick={() => handleDelete(item.menuNo)}
          className="p-1.5 hover:bg-destructive/10 rounded-md text-muted-foreground hover:text-destructive"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <PageHeader 
        title="시스템 메뉴 트리 관리" 
        breadcrumbs={[{ label: '시스템관리' }, { label: '메뉴관리' }]}
        actions={
          <div className="flex gap-2">
            {hasChanges && (
              <button 
                onClick={handleSaveChanges}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-bold shadow-md hover:bg-green-700 transition-all animate-in fade-in zoom-in"
              >
                <Save size={18} /> 순서 저장
              </button>
            )}
            <button 
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
            >
              <Plus size={18} /> 새 메뉴 추가
            </button>
          </div>
        }
      />

      <div className="p-6 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-3xl flex items-center gap-4 mb-8 text-blue-800 dark:text-blue-300">
        <div className="p-3 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm"><ListTree size={20} /></div>
        <div className="text-xs font-medium leading-relaxed">
          <p className="font-bold mb-0.5 text-sm">드래그 앤 드롭 활성화</p>
          <li>메뉴 왼쪽의 핸들을 잡아 상하로 이동하여 순서를 변경할 수 있습니다.</li>
          <li>변경 후 상단의 <strong>[순서 저장]</strong> 버튼을 눌러야 최종 반영됩니다.</li>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />)}
        </div>
      ) : (
        <ReorderableList 
          items={menus} 
          onReorder={handleReorder}
          renderItem={renderMenuItem}
          keyExtractor={(item) => item.menuNo}
          className="bg-card/50 p-2 rounded-3xl border border-dashed"
        />
      )}

      {/* 등록/수정 모달 */}
      <StandardModal 
        isOpen={isModalOpen} 
        onClose={() => setIsOpen(false)} 
        title={mode === 'create' ? '신규 메뉴 등록' : '메뉴 정보 수정'}
      >
        <StandardForm onSubmit={handleSave}>
          <FormField label="메뉴 한글명" required>
            <input 
              type="text" 
              value={formData.menuNm}
              onChange={(e) => setFormData({...formData, menuNm: e.target.value})}
              placeholder="게시판 관리"
              className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
            />
          </FormField>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="상위 메뉴" required>
              <select 
                value={formData.upperMenuId}
                onChange={(e) => setFormData({...formData, upperMenuId: Number(e.target.value)})}
                className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value={0}>최상위 메뉴</option>
                {menus.filter(m => m.upperMenuId === 0).map(m => (
                  <option key={m.menuNo} value={m.menuNo}>{m.menuNm}</option>
                ))}
              </select>
            </FormField>
            <FormField label="연결 프로그램" required>
              <select 
                value={formData.progrmFileNm}
                onChange={(e) => setFormData({...formData, progrmFileNm: e.target.value})}
                className="w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">프로그램 선택 없음</option>
                {programs.map(p => (
                  <option key={p.progrmFileNm} value={p.progrmFileNm}>{p.progrmNm} ({p.progrmFileNm})</option>
                ))}
              </select>
            </FormField>
          </div>
          <FormField label="상세 설명">
            <textarea 
              value={formData.menuDc || ''}
              onChange={(e) => setFormData({...formData, menuDc: e.target.value})}
              className="w-full min-h-[80px] p-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </FormField>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 border rounded-lg font-bold">취소</button>
            <button type="submit" className="px-6 py-2 bg-primary text-white rounded-lg font-bold shadow-md">저장하기</button>
          </div>
        </StandardForm>
      </StandardModal>
    </div>
  );
}
