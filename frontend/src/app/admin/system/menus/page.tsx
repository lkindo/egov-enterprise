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
  FolderTree, 
  FileCode,
  Save,
  Layers,
  Link as LinkIcon,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { StandardModal } from '@/app/components/ui/standard-modal';
import { FormField, StandardForm } from '@/app/components/ui/standard-form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
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
    menuDc: ''
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [mRes, pRes] = await Promise.all([
        menuAdminService.getAllMenus(),
        programService.getPrograms({ page: 0, size: 500 })
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
    <div className="flex items-center justify-between w-full pr-6 group py-1">
      <div className="flex items-center gap-4">
        {item.upperMenuId === 0 ? (
          <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shadow-inner">
            <FolderTree size={18} />
          </div>
        ) : (
          <div className="flex items-center ml-8 text-muted-foreground/40">
            <ChevronRight size={16} className="mr-2" />
            <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center text-muted-foreground/60">
              <FileCode size={14} />
            </div>
          </div>
        )}
        <div className="flex flex-col gap-0.5">
          <span className={cn(
            "text-base font-black tracking-tight",
            item.upperMenuId === 0 ? "text-foreground" : "text-foreground/70"
          )}>
            {item.menuNm}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-muted/50 px-2 py-0.5 rounded-md text-muted-foreground font-mono font-bold">
              #{item.menuNo}
            </span>
            {item.progrmFileNm && (
              <span className="text-[10px] flex items-center gap-1 text-primary/60 font-bold uppercase tracking-wider">
                <LinkIcon size={10} /> {item.progrmFileNm}
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => handleOpenEdit(item)}
          className="h-9 w-9 hover:bg-primary/10 hover:text-primary rounded-xl"
        >
          <Settings size={16} />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => handleDelete(item.menuNo)}
          className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive rounded-xl"
        >
          <Trash2 size={16} />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <PageHeader 
        title="시스템 메뉴 트리 관리" 
        breadcrumbs={[{ label: '시스템관리' }, { label: '메뉴관리' }]}
        actions={
          <div className="flex gap-3">
            {hasChanges && (
              <Button 
                onClick={handleSaveChanges}
                className="bg-emerald-600 text-white hover:bg-emerald-700 h-11 px-6 rounded-xl font-black shadow-lg shadow-emerald-200 animate-in zoom-in gap-2"
              >
                <Save size={18} /> 변경된 순서 저장
              </Button>
            )}
            <Button 
              onClick={handleOpenCreate}
              className="h-11 px-6 rounded-xl font-black shadow-lg shadow-primary/20 gap-2"
            >
              <Plus size={18} /> 새 메뉴 등록
            </Button>
          </div>
        }
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-[2.5rem] border-2 border-primary/5 bg-card shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
            <Layers size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">전체 메뉴 수</p>
            <h4 className="text-2xl font-black">{menus.length} 개</h4>
          </div>
        </div>
        <div className="p-6 rounded-[2.5rem] border-2 border-primary/5 bg-card shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-inner">
            <LinkIcon size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">연결 프로그램</p>
            <h4 className="text-2xl font-black text-purple-600">{menus.filter(m => m.progrmFileNm).length} 개</h4>
          </div>
        </div>
        <div className="p-6 rounded-[2.5rem] border-2 border-primary/5 bg-card shadow-sm flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-inner">
            <ListTree size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">최상위 메뉴</p>
            <h4 className="text-2xl font-black text-orange-600">{menus.filter(m => m.upperMenuId === 0).length} 개</h4>
          </div>
        </div>
      </div>

      <div className="p-8 bg-primary/[0.03] border-2 border-primary/5 rounded-[2.5rem] flex items-start gap-5 relative overflow-hidden group">
        <div className="p-4 bg-white rounded-2xl shadow-xl text-primary relative z-10">
          <Info size={24} />
        </div>
        <div className="space-y-1 relative z-10">
          <h4 className="text-base font-black">드래그 앤 드롭 가이드</h4>
          <p className="text-sm text-muted-foreground font-medium leading-relaxed">
            메뉴 좌측의 핸들을 드래그하여 자유롭게 순서를 변경할 수 있습니다.<br />
            계층 구조 변경은 각 메뉴의 상세 설정에서 [상위 메뉴]를 수정하여 변경 가능합니다.
          </p>
        </div>
        <div className="absolute right-[-2%] top-[-20%] opacity-[0.03] scale-[2.5] -rotate-12 group-hover:rotate-0 transition-transform duration-700">
          <ListTree size={150} />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-20 bg-muted/40 animate-pulse rounded-[1.5rem]" />)}
        </div>
      ) : (
        <ReorderableList 
          items={menus} 
          onReorder={handleReorder}
          renderItem={renderMenuItem}
          keyExtractor={(item) => item.menuNo}
          className="bg-card/30 p-4 rounded-[2.5rem] border-2 border-dashed border-primary/10"
        />
      )}

      {/* Registration/Edit Modal */}
      <StandardModal 
        isOpen={isModalOpen} 
        onClose={() => setIsOpen(false)} 
        title={mode === 'create' ? '신규 메뉴 등록' : '메뉴 정보 수정'}
      >
        <StandardForm onSubmit={handleSave} className="p-4">
          <div className="space-y-6">
            <FormField label="메뉴 이름" required>
              <Input 
                value={formData.menuNm}
                onChange={(e) => setFormData({...formData, menuNm: e.target.value})}
                placeholder="예: 사용자 관리, 시스템 설정 등"
                className="h-12 rounded-xl border-primary/10"
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="상위 메뉴" required>
                <Select 
                  value={String(formData.upperMenuId)}
                  onValueChange={(v) => setFormData({...formData, upperMenuId: Number(v)})}
                >
                  <SelectTrigger className="h-12 rounded-xl border-primary/10">
                    <SelectValue placeholder="상위 메뉴 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">최상위 메뉴</SelectItem>
                    {menus.filter(m => m.upperMenuId === 0).map(m => (
                      <SelectItem key={m.menuNo} value={String(m.menuNo)}>{m.menuNm}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="연결 프로그램" required>
                <Select 
                  value={formData.progrmFileNm || ''}
                  onValueChange={(v) => setFormData({...formData, progrmFileNm: v})}
                >
                  <SelectTrigger className="h-12 rounded-xl border-primary/10">
                    <SelectValue placeholder="프로그램 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map(p => (
                      <SelectItem key={p.progrmFileNm} value={p.progrmFileNm}>
                        <div className="flex flex-col">
                          <span className="font-bold">{p.progrmNm}</span>
                          <span className="text-[10px] opacity-50 font-mono">{p.progrmFileNm}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <FormField label="메뉴 상세 설명">
              <textarea 
                value={formData.menuDc || ''}
                onChange={(e) => setFormData({...formData, menuDc: e.target.value})}
                className="w-full min-h-[100px] p-4 rounded-xl border-2 border-primary/5 bg-background outline-none focus:border-primary/20 transition-all resize-none text-sm"
                placeholder="메뉴의 용도 및 기능을 간략히 설명하세요."
              />
            </FormField>

            <div className="flex justify-end gap-3 pt-6 border-t border-primary/5">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="h-12 px-6 rounded-xl font-bold">취소</Button>
              <Button type="submit" className="h-12 px-10 rounded-xl font-black shadow-lg shadow-primary/20">
                {mode === 'create' ? '새 메뉴 등록 완료' : '정보 수정 저장'}
              </Button>
            </div>
          </div>
        </StandardForm>
      </StandardModal>
    </div>
  );
}
