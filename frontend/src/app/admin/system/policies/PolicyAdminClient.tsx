'use client';

import React, { useState, useEffect } from 'react';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { policyAdminService, SystemPolicy } from '@/services/foundation/system/PolicyAdminService';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { Settings, Edit2, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PolicyAdminClient() {
  const [policies, setPolicies] = useState<SystemPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState<SystemPolicy | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const data = await policyAdminService.getPolicies();
      setPolicies(data);
    } catch {
      console.error('Failed to fetch policies:', error);
      toast.error('?뺤콉 紐⑸줉님遺덈윭?ㅻ뒗 님?ㅽ뙣?덉뒿?덈떎.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleEdit = (policy: SystemPolicy) => {
    setSelectedPolicy(policy);
    setEditTitle(policy.title);
    setEditContent(policy.content);
    setIsEditModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedPolicy) return;
    setIsSaving(true);
    try {
      await policyAdminService.updatePolicy(selectedPolicy.type || selectedPolicy.id || '', {
        title: editTitle,
        content: editContent
      });
      toast.success('?뺤콉님?깃났?곸쑝濡님섏젙?섏뿀?듬땲님');
      setIsEditModalOpen(false);
      fetchPolicies();
    } catch {
      console.error('Failed to update policy:', error);
      toast.error('?뺤콉 ?섏젙님?ㅽ뙣?덉뒿?덈떎.');
    } finally {
      setIsSaving(false);
    }
  };

  const columns: Column<SystemPolicy>[] = [
    {
      header: '?뺤콉 ?좏삎(ID)',
      accessor: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Settings size={14} />
          </div>
          <span className="font-bold tracking-tighter uppercase">{item.id || item.type}</span>
        </div>
      )
    },
    {
      header: '?뺤콉 ?쒕ぉ',
      accessor: (item) => <span className="font-medium">{item.title}</span>
    },
    {
      header: '?댁슜 ?붿빟',
      accessor: (item) => (
        <div className="max-w-xs truncate text-muted-foreground opacity-60">
          {item.content.replace(/<[^>]*>?/gm, '').substring(0, 50)}...
        </div>
      )
    },
    {
      header: '愿由?,
      className: 'text-right',
      accessor: (item) => (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => handleEdit(item)}
          className="hover:bg-primary/10 hover:text-primary rounded-xl"
        >
          <Edit2 size={14} className="mr-2" /> ?섏젙
        </Button>
      )
    }
  ];

  return (
    <div className="p-10 space-y-10">
      <HubHeader 
        title="?쒖뒪님?뺤콉" 
        highlight="愿由? 
        subtitle="SYSTEM POLICY MANAGEMENT" 
        icon={FileText} 
      />

      <div className="hub-table-container">
        <div className="flex items-center justify-between mb-8 px-4">
          <div className="space-y-1">
            <h3 className="text-xl font-black tracking-tight">?쒕퉬님?뺤콉 紐⑸줉</h3>
            <p className="text-sm text-muted-foreground">濡쒓렇님 媛쒖씤?뺣낫泥섎갑移? ??묎텒 님寃뚯떆님?몄쓽 ?쒖뒪님?뺤콉님愿由ы빀?덈떎.</p>
          </div>
          <Button onClick={fetchPolicies} variant="outline" size="sm" className="rounded-xl">
            ?덈줈怨좎묠
          </Button>
        </div>

        <StandardDataTable 
          columns={columns} 
          data={policies} 
          loading={loading}
          keyField="type"
          emptyMessage="등록님?쒖뒪님?뺤콉님?놁뒿?덈떎."
        />
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-5xl rounded-[3rem] overflow-hidden border-none shadow-2xl p-0">
          <div className="bg-slate-900 p-8 text-white flex items-center justify-between">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black flex items-center gap-3">
                <Edit2 className="text-primary" /> ?뺤콉 ?섏젙 : <span className="opacity-50 tracking-widest uppercase">{selectedPolicy?.id || selectedPolicy?.type}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase">
              <CheckCircle2 size={14} className="text-primary" /> ?ㅼ떆媛님님紐⑤뱶
            </div>
          </div>

          <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="space-y-3">
              <Label className="text-sm font-black tracking-widest uppercase opacity-40 ml-2">?뺤콉 ?쒕ぉ</Label>
              <Input 
                value={editTitle} 
                onChange={(e) => setEditTitle(e.target.value)} 
                placeholder="?뺤콉 ?쒕ぉ님?낅젰?섏꽭님
                className="h-14 rounded-2xl border-2 border-border/50 focus:border-primary/50 bg-slate-50/50"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-black tracking-widest uppercase opacity-40 ml-2">?뺤콉 ?댁슜</Label>
              <RichTextEditor 
                value={editContent} 
                onChange={setEditContent} 
                className="min-h-[400px]"
              />
            </div>
          </div>

          <DialogFooter className="p-8 bg-slate-50 border-t border-border/50 flex items-center justify-between">
             <div className="text-xs text-muted-foreground font-medium italic">
                * ?섏젙 利됱떆 ?꾨줎?몄뿏님?명꽣 諛님뺤콉 ?섏씠吏님諛섏쁺?⑸땲님
             </div>
             <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setIsEditModalOpen(false)} className="rounded-xl h-12 px-8">痍⑥냼</Button>
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="rounded-xl h-12 px-8 bg-primary hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
                >
                  {isSaving ? '?님以?..' : '蹂寃쎌궗님??ν븯湲?}
                </Button>
             </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

