'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { ReorderableList } from '@/app/components/ui/reorderable-list';
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
  Info,
  X,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { FormField, StandardForm } from '@/app/components/ui/standard-form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { saveMenuAction, updateMenuOrdersAction, deleteMenuAction } from '@/app/actions/menuActions';

export default function MenuAdminClient({ initialMenus, programs }: { initialMenus: MenuInfo[]; programs: any[] }) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [hasChanges, setHasChanges] = useState(false);
  const [orderedMenus, setOrderedMenus] = useState<MenuInfo[] | null>(null);

  const [isModalOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<Partial<MenuInfo>>({
    menuNo: 0,
    menuNm: '',
    menuOrdr: 0,
    upperMenuId: 0,
    progrmFileNm: '',
    menuDc: '',
    modernRoute: ''
  });

  const menus = orderedMenus || initialMenus;

  const handleOpenCreate = () => {
    setMode('create');
    setFormData({ menuNo: Date.now(), menuNm: '', menuOrdr: menus.length + 1, upperMenuId: 0, progrmFileNm: '' });
    setIsOpen(true);
  };

  const handleOpenEdit = (menu: MenuInfo) => {
    setMode('edit');
    setFormData({
      ...menu,
      modernRoute: menu.modernRoute || ''
    });
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await saveMenuAction(null, { mode, data: formData });
    if (res.success) {
      toast(res.message, 'success');
      setIsOpen(false);
      setOrderedMenus(null);
      setHasChanges(false);
    } else {
      toast(res.message, 'error');
    }
  };

  const handleReorder = (newItems: MenuInfo[]) => {
    setOrderedMenus(newItems);
    setHasChanges(true);
  };

  const handleSaveChanges = async () => {
    if (!orderedMenus) return;
    const updatedMenus = orderedMenus.map((m, idx) => ({ ...m, menuOrdr: idx + 1 }));
    const res = await updateMenuOrdersAction(null, updatedMenus);
    if (res.success) {
      toast(res.message, 'success');
      setHasChanges(false);
      setOrderedMenus(null);
    } else {
      toast(res.message, 'error');
    }
  };

  const handleDelete = async (id: number) => {
    const isConfirmed = await confirm({
      title: '메뉴 삭제',
      message: '이 메뉴와 하위 메뉴가 모두 삭제됩니다. 계속하시겠습니까?',
      variant: 'destructive'
    });
    if (isConfirmed) {
      const res = await deleteMenuAction(null, id);
      if (res.success) {
        toast(res.message, 'success');
        setOrderedMenus(null);
        setHasChanges(false);
      } else {
        toast(res.message, 'error');
      }
    }
  };

  const renderMenuItem = (item: MenuInfo) => (
    <div className="flex items-center justify-between w-full pr-8 group py-2">
      <div className="flex items-center gap-5">
        {item.upperMenuId === 0 ? (
          <div className="w-12 h-12 bg-slate-900 text-white rounded-[1rem] flex items-center justify-center shadow-lg group-hover:rotate-3 transition-transform">
            <FolderTree size={20} />
          </div>
        ) : (
          <div className="flex items-center ml-10 text-slate-300">
            <ChevronRight size={18} className="mr-3 opacity-30" />
            <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors uppercase font-black text-[8px]">
              Sub
            </div>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <span className={cn(
            "text-lg font-black tracking-tighter italic uppercase",
            item.upperMenuId === 0 ? "text-slate-900" : "text-slate-600"
          )}>
            {item.menuNm}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-[10px] bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded text-muted-foreground font-mono font-black tracking-tight tabular-nums border border-black/5 dark:border-white/5">
              KEY_{item.menuNo}
            </span>
            {item.progrmFileNm ? (
              <span className="text-[10px] flex items-center gap-1.5 text-primary font-black uppercase tracking-[0.1em] opacity-60">
                <LinkIcon size={12} strokeWidth={3} /> {item.progrmFileNm}
              </span>
            ) : null}
            {item.modernRoute ? (
              <span className="text-[10px] flex items-center gap-1.5 text-emerald-600 font-black uppercase tracking-[0.1em] opacity-80">
                <CheckCircle2 size={12} strokeWidth={3} /> {item.modernRoute}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleOpenEdit(item)}
          className="h-11 w-11 hover:bg-slate-900 hover:text-white rounded-[1rem] border-2 border-transparent hover:border-slate-900 transition-all active:scale-90"
        >
          <Settings size={18} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleDelete(item.menuNo)}
          className="h-11 w-11 hover:bg-rose-50 hover:text-rose-600 rounded-[1rem] border-2 border-transparent hover:border-rose-100 transition-all active:scale-90"
        >
          <Trash2 size={18} />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <PageHeader
        title="시스템 메뉴 아키텍처"
        breadcrumbs={[{ label: '시스템관리' }, { label: '메뉴관리' }]}
        actions={
          <div className="flex gap-4">
            {hasChanges ? (
              <Button
                onClick={handleSaveChanges}
                className="bg-emerald-600 text-white hover:bg-emerald-700 h-14 px-8 rounded-2xl font-black shadow-2xl shadow-emerald-200 animate-in zoom-in-95 gap-3 hover:-translate-y-1 transition-all active:scale-95 italic uppercase tracking-widest text-xs"
              >
                <Save size={20} /> Commit Orders
              </Button>
            ) : null}
            <Button
              onClick={handleOpenCreate}
              className="h-14 px-10 rounded-2xl font-black shadow-2xl shadow-primary/20 gap-3 hover:-translate-y-1 transition-all active:scale-95 italic uppercase tracking-widest text-xs"
            >
              <Plus size={20} /> Create Entity
            </Button>
          </div>
        }
      />

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-xl flex items-center gap-6 group hover:border-slate-300 transition-all overflow-hidden relative">
          <div className="w-16 h-16 rounded-[1.25rem] bg-slate-900 text-white flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform relative z-10">
            <Layers size={28} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">TOTAL NODES</p>
            <h4 className="text-3xl font-black italic tracking-tighter tabular-nums">{menus.length} Units</h4>
          </div>
          <Layers size={100} className="absolute right-[-20px] bottom-[-20px] opacity-[0.02] -rotate-12" />
        </div>
        <div className="p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-xl flex items-center gap-6 group hover:border-primary/20 transition-all overflow-hidden relative">
          <div className="w-16 h-16 rounded-[1.25rem] bg-primary text-white flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform relative z-10">
            <LinkIcon size={28} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">LINKED ASSETS</p>
            <h4 className="text-3xl font-black italic tracking-tighter tabular-nums text-primary">{menus.filter(m => m.progrmFileNm).length} Links</h4>
          </div>
          <LinkIcon size={100} className="absolute right-[-20px] bottom-[-20px] opacity-[0.02] -rotate-12" />
        </div>
        <div className="p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-xl flex items-center gap-6 group hover:border-orange-200 transition-all overflow-hidden relative">
          <div className="w-16 h-16 rounded-[1.25rem] bg-orange-600 text-white flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform relative z-10">
            <ListTree size={28} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">ROOT DOMAINS</p>
            <h4 className="text-3xl font-black italic tracking-tighter tabular-nums text-orange-600">{menus.filter(m => m.upperMenuId === 0).length} Roots</h4>
          </div>
          <ListTree size={100} className="absolute right-[-20px] bottom-[-20px] opacity-[0.02] -rotate-12" />
        </div>
      </div>

      <div className="p-10 bg-slate-900 text-white rounded-[3rem] shadow-2xl flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group">
        <div className="w-20 h-20 bg-white/10 rounded-[1.5rem] flex items-center justify-center backdrop-blur-xl border border-white/20 shadow-2xl group-hover:rotate-12 transition-transform duration-700">
          <Info size={32} className="text-primary-foreground group-hover:scale-110 transition-transform" />
        </div>
        <div className="space-y-3 flex-1 text-center md:text-left">
          <h4 className="text-2xl font-black italic tracking-tighter uppercase">Dynamic Architecture Control</h4>
          <p className="text-sm text-slate-400 font-bold leading-relaxed max-w-2xl">
            드래그 앤 드롭을 실행하여 메뉴의 가시적 순서를 즉시 조정하십시오. 변경 사항은 <span className="text-emerald-400 font-black italic uppercase">Commit Orders</span> 버튼을 통해 영구적으로 반영됩니다. 계층 관계를 재정의하려면 상세 설정에서 상위 엔터티를 수정하십시오…
          </p>
        </div>
        <CheckCircle2 size={180} className="absolute right-[-40px] top-[-40px] opacity-[0.03] -rotate-12 group-hover:rotate-0 transition-all duration-1000" />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[4rem] p-4 shadow-2xl border border-slate-100 dark:border-white/5 ring-1 ring-slate-50 dark:ring-white/5 relative bg-card/60 backdrop-blur-3xl">
        <ReorderableList
          items={menus}
          onReorder={handleReorder}
          renderItem={renderMenuItem}
          keyExtractor={(item) => item.menuNo}
          className="bg-slate-50/50 p-6 rounded-[3rem] border border-dashed border-slate-200"
        />
      </div>

      {/* Registration/Edit Modal */}
      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsOpen(false)}
        title={mode === 'create' ? 'Define New Entity' : 'Alter Node Blueprint'}
      >
        <div className="p-4">
          <StandardForm onSubmit={handleSave}>
            <div className="space-y-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Entity Nomenclature</Label>
                <Input
                  value={formData.menuNm}
                  onChange={(e) => setFormData({ ...formData, menuNm: e.target.value })}
                  placeholder="E.g. SYSTEM DASHBOARD, USER MANAGEMENT"
                  className="h-16 rounded-2xl border-2 text-xl font-black px-8 focus:ring-4 focus:ring-primary/10 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Parent Hierarchy</Label>
                  <Select
                    value={String(formData.upperMenuId)}
                    onValueChange={(v) => setFormData({ ...formData, upperMenuId: Number(v) })}
                  >
                    <SelectTrigger className="h-16 rounded-2xl border-2 font-black text-lg px-8 bg-slate-50/50">
                      <SelectValue placeholder="Select Origin" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-2 shadow-2xl">
                      <SelectItem value="0" className="font-black italic uppercase tracking-widest text-[10px] py-4">--- ROOT DIRECTORY ---</SelectItem>
                      {menus.filter(m => m.upperMenuId === 0).map((m, idx) => (
                        <SelectItem key={m.menuNo || `root-${idx}`} value={String(m.menuNo)} className="py-3 font-bold">{m.menuNm}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Program Linkage</Label>
                  <Select
                    value={formData.progrmFileNm || ''}
                    onValueChange={(v) => setFormData({ ...formData, progrmFileNm: v })}
                  >
                    <SelectTrigger className="h-16 rounded-2xl border-2 font-black text-lg px-8 bg-white shadow-inner">
                      <SelectValue placeholder="Unlinked Page" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-2 shadow-2xl max-h-[300px]">
                      {programs.map((p, idx) => (
                        <SelectItem key={p.progrmFileNm || `prog-${idx}`} value={p.progrmFileNm} className="py-4 border-b last:border-0 border-slate-50">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-black italic uppercase tracking-tighter text-sm">{p.progrmNm}</span>
                            <span className="text-[9px] opacity-40 font-mono tracking-widest">{p.progrmFileNm}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Modern React Route (Optional)</Label>
                <Input
                  value={formData.modernRoute || ''}
                  onChange={(e) => setFormData({ ...formData, modernRoute: e.target.value })}
                  placeholder="E.g. /admin/system/common-code/groups"
                  className="h-14 rounded-xl border-2 font-bold px-6 bg-emerald-50/10 border-emerald-100 focus:ring-emerald-500/10 transition-all text-emerald-800"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Contextual Background</Label>
                <textarea
                  value={formData.menuDc || ''}
                  onChange={(e) => setFormData({ ...formData, menuDc: e.target.value })}
                  className="w-full min-h-[140px] p-8 rounded-[2.5rem] border-2 bg-slate-50/30 text-lg font-bold outline-none focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all resize-none shadow-inner"
                  placeholder="Describe the functional scope of this menu entry…"
                />
              </div>

              <div className="flex gap-4 pt-10">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2 hover:bg-slate-50 transition-all">Cancel Process</Button>
                <Button type="submit" className="flex-[2] h-16 rounded-2xl font-black shadow-2xl shadow-primary/20 italic uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:-translate-y-1 transition-all">
                  {mode === 'create' ? 'Complete Core Extraction' : 'Persist Blueprint Modifications'}
                </Button>
              </div>
            </div>
          </StandardForm>
        </div>
      </StandardModal>
    </div>
  );
}
