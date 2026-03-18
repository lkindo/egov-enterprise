'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { policyAdminService, PolicyDto } from '@/services/admin/user/PolicyAdminService';
import {
  ShieldCheck,
  Save,
  RefreshCcw,
  FileText,
  Lock,
  Eye,
  History,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function PrivacyPolicyClient({ 
    initialPolicy 
}: { 
    initialPolicy: PolicyDto 
}) {
  const [loading, setLoading] = useState(false);
  const [policy, setPolicy] = useState(initialPolicy);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await policyAdminService.updatePolicy('privacy', policy);
      toast.success('개인정보 처리 방침이 업데이트되었습니다.');
      setIsEditing(false);
    } catch (error) {
      toast.error('저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 px-4 md:px-0 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <PageHeader
        title="보안 정책 거버넌스"
        breadcrumbs={[{ label: '시스템관리' }, { label: '보안관리' }, { label: '개인정보보호정책' }]}
        actions={
          <div className="flex items-center gap-4">
            {isEditing ? (
                <>
                    <Button
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                        className="h-14 px-8 rounded-2xl border-2 border-slate-100 font-black text-xs uppercase tracking-widest italic hover:bg-slate-50 transition-all"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={loading}
                        className="h-14 px-10 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3 italic"
                    >
                        {loading ? <RefreshCcw size={18} className="animate-spin" /> : <Save size={18} />}
                        Commit Changes
                    </Button>
                </>
            ) : (
                <Button
                    onClick={() => setIsEditing(true)}
                    className="h-14 px-10 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3 italic"
                >
                    <FileText size={18} />
                    Modify Policy
                </Button>
            )}
          </div>
        }
      />

      {/* Luxury Policy Header */}
      <div className="responsive-card p-10 md:p-16 border-2 border-slate-100 bg-white/50 backdrop-blur-xl relative overflow-hidden group">
        <div className="relative z-10 space-y-10">
            <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-[2rem] bg-slate-900 text-white flex items-center justify-center shadow-2xl group-hover:rotate-6 transition-transform duration-500">
                    <ShieldCheck size={40} />
                </div>
                <div>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter italic">Privacy Framework</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1 italic flex items-center gap-3">
                        <span className="w-6 h-0.5 bg-primary/30" />
                        Data Protection Protocol v2.4
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-2 flex items-center gap-2">
                        <Lock size={12} className="text-primary" />
                        Policy Designation
                    </label>
                    {isEditing ? (
                        <Input
                            value={policy.title}
                            onChange={(e) => setPolicy(prev => ({ ...prev, title: e.target.value }))}
                            className="h-16 px-8 rounded-3xl border-2 border-slate-100 bg-white text-xl font-black italic focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
                        />
                    ) : (
                        <h3 className="text-2xl font-black text-slate-800 italic px-2">{policy.title}</h3>
                    )}
                </div>

                <div className="space-y-3 pt-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-2 flex items-center gap-2">
                        <FileText size={12} className="text-primary" />
                        Policy Payload (Markdown/Text)
                    </label>
                    {isEditing ? (
                        <Textarea
                            value={policy.content}
                            onChange={(e) => setPolicy(prev => ({ ...prev, content: e.target.value }))}
                            className="min-h-[500px] p-10 rounded-[3rem] border-2 border-slate-100 bg-white text-base font-medium leading-relaxed italic outline-none focus:ring-4 focus:ring-primary/10 transition-all resize-none shadow-inner"
                        />
                    ) : (
                        <div className="p-10 md:p-16 rounded-[3rem] bg-slate-50/50 border-2 border-slate-100/50 text-slate-600 leading-loose font-medium whitespace-pre-wrap italic shadow-inner">
                            {policy.content}
                        </div>
                    )}
                </div>
            </div>
        </div>

        <div className="absolute right-[-5%] top-[-5%] opacity-[0.02] -rotate-12 group-hover:rotate-0 transition-all duration-1000">
            <ShieldCheck size={400} />
        </div>
      </div>

      {/* Meta Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-8 rounded-[2.5rem] bg-white border-2 border-slate-100 flex items-center gap-6 group hover:border-primary/20 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                <Eye size={24} />
            </div>
            <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Visibility</p>
                <h4 className="text-sm font-black text-slate-900 uppercase italic">Public Protocol</h4>
            </div>
        </div>
        <div className="p-8 rounded-[2.5rem] bg-white border-2 border-slate-100 flex items-center gap-6 group hover:border-primary/20 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                <History size={24} />
            </div>
            <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Last Modified</p>
                <h4 className="text-sm font-black text-slate-900 uppercase italic">2026-03-18</h4>
            </div>
        </div>
        <div className="p-8 rounded-[2.5rem] bg-white border-2 border-slate-100 flex items-center gap-6 group hover:border-primary/20 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-all shadow-sm">
                <AlertCircle size={24} />
            </div>
            <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Compliance</p>
                <h4 className="text-sm font-black text-slate-900 uppercase italic">GDPR Ready</h4>
            </div>
        </div>
      </div>
    </div>
  );
}
