'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import { policyAdminService, PolicyDto } from '@/services/foundation/user/PolicyAdminService';
import {
  ShieldCheck,
  Save,
  RefreshCcw,
  FileText,
  Lock,
  Eye,
  History,
  AlertCircle,
  Zap,
  ShieldAlert,
  Fingerprint,
  FileCode,
  Shield,
  ArrowUpRight,
  Gavel,
  ClipboardCheck,
  SearchCode
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

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
      toast.success('Î≥¥Ïïà ?ïÏ±Ö ?ÑÎ†à?ÑÏõå?¨Í? ?±Í≥µ?ÅÏúºÎ°?Ïª§Î∞ã?òÏóà?µÎãà??');
      setIsEditing(false);
    } catch {
      toast.error('?∞Ïù¥???ïÌï©???§Î•òÎ°?ÏµúÏ¢Ö ?Ä?•Ïù¥ Ï§ëÎã®?òÏóà?µÎãà??');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="Î≥¥Ïïà ?ïÏ±Ö Í±∞Î≤Ñ?åÏä§"
        breadcrumbs={[{ label: '?úÏä§?úÍ?Î¶? }, { label: 'Î≥¥ÏïàÍ¥ÄÎ¶? }, { label: 'Í∞úÏù∏?ïÎ≥¥Î≥¥Ìò∏?ïÏ±Ö' }]}
      />

      <HubHeader 
        title="?ÑÎùº?¥Î≤Ñ?? 
        highlight="Compliance" 
        subtitle="?ÑÏÇ¨ ?∞Ïù¥??Î≥¥Ìò∏ Í∑úÏ†ï Î∞?Í∞úÏù∏?ïÎ≥¥ Ï≤òÎ¶¨ Î∞©Ïπ®???§ÏãúÍ∞?Í±∞Î≤Ñ?åÏä§ Í¥ÄÎ¶??úÏä§?? 
        icon={ShieldCheck} 
        actions={
          <div className="flex gap-4 p-2 items-center">
            {isEditing ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => setIsEditing(false)}
                  className="h-14 px-8 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 font-black text-[10px] tracking-widest uppercase hover:text-rose-500 hover:bg-rose-50 transition-all shadow-xl active:scale-95 px-6"
                >
                  CANCEL_CHANGES
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="h-14 px-10 rounded-2xl bg-slate-900 border-none text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3 group"
                >
                  {loading ? <RefreshCcw size={18} className="animate-spin" /> : <Zap size={18} className="group-hover:animate-pulse" />} 
                  COMMIT_SPECIFICATION
                  <ArrowUpRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setIsEditing(true)}
                className="h-14 px-10 rounded-2xl bg-slate-900 border-none text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3 group"
              >
                <FileCode size={20} /> POLICY_SPEC_OVERRIDE
              </Button>
            )}
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="COMPLIANCE_STATUS" value="CERTIFIED" icon={ClipboardCheck} color="emerald" status="ONLINE" />
        <HubMetricCard title="PRIVACY_LEVEL" value="TIER_1" icon={ShieldAlert} color="primary" />
        <HubMetricCard title="AUDIT_PROBE" value="?úÏÑ±" icon={SearchCode} color="indigo" />
        <HubMetricCard title="REGULATORY_SYNC" value="99.8%" icon={Gavel} color="amber" />
      </HubMetricGrid>

      <div className="grid grid-cols-12 gap-12">
        {/* Statistics & Search Panel */}
        <div className="col-span-12 lg:col-span-4 h-full">
            <div className="rounded-[3.5rem] p-12 bg-slate-900 text-white shadow-2xl relative overflow-hidden group h-full border-none">
                <div className="absolute top-0 right-0 p-16 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
                    <Shield size={240} className="text-primary" />
                </div>
                <div className="relative z-10 space-y-12">
                    <div className="space-y-3">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-white/10 flex items-center justify-center border border-white/5 shadow-inner">
                            <Fingerprint size={32} className="text-primary" />
                        </div>
                        <h4 className="text-3xl font-black tracking-tighter leading-tight uppercase">?ÑÎùº?¥Î≤Ñ??br />?îÌò∏??ÏΩîÏñ¥</h4>
                    </div>

                    <div className="space-y-8">
                         <div className="space-y-3">
                            <label className="text-[10px] font-black text-white/30 tracking-[0.4em] px-2 uppercase font-mono">Governance_Probing</label>
                            <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest ">ÎßàÏ?Îß?Ïª§Î∞ã</span>
                                    <span className="text-[9px] font-black text-primary font-mono tracking-widest uppercase ">2026-03-18_1433</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest ">?©Î≤ï??Í≤Ä??/span>
                                    <span className="text-[9px] font-black text-emerald-400 font-mono tracking-widest uppercase ">ISO_27001_OK</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest ">Í∞Ä?úÏÑ±</span>
                                    <span className="text-[9px] font-black text-indigo-400 font-mono tracking-widest uppercase ">PUBLIC_SYNC</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-white/5 space-y-4">
                        <p className="text-[10px] font-bold text-slate-500 leading-relaxed italic uppercase opacity-60">
                            * Î≥??ïÏ±Ö Î™ÖÏÑ∏??Î≥ÄÍ≤ΩÏ? ?ÑÏÇ¨ ?úÎπÑ??Î∞?Í≥ÑÏïΩ ?ÑÎ°ú?†ÏΩú??Ï¶âÍ∞Å?ÅÏù∏ Î≤ïÏ†Å ?®Î†•??Î∞úÌúò?©Îãà??
                        </p>
                        <HubStatusBadge status="?úÏÑ±" className="bg-emerald-500/10 text-emerald-500 border-none px-6 py-2 rounded-xl text-[9px] tracking-widest font-black" />
                    </div>
                </div>
            </div>
        </div>

        {/* Policy Content Stream */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">
            <HubSectionCard 
                title="?∞Ïù¥??Î≥¥Ìò∏ ?ÑÎ°ú?†ÏΩú Î™ÖÏÑ∏" 
                description="?ÑÏÇ¨?ÅÏúºÎ°??ÅÏö©?òÎäî Í∞úÏù∏?ïÎ≥¥ Ï≤òÎ¶¨ Î∞?Î≥¥Ïïà Í∑úÏ†ï???Ä???ÅÏÑ∏ ?ÑÌÇ§?çÏ≤ò Î™ÖÏÑ∏?ÖÎãà??" 
                icon={FileCode}
                className="flex-1"
            >
                <div className="space-y-12">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 px-2">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            <label className="text-[11px] font-black text-muted-foreground/40 tracking-[0.4em] uppercase font-mono">Policy_Identifier_Title</label>
                        </div>
                        {isEditing ? (
                            <Input
                                value={policy.title}
                                onChange={(e) => setPolicy(prev => ({ ...prev, title: e.target.value }))}
                                className="h-16 px-10 rounded-2xl border-2 border-slate-100 bg-slate-50/50 text-xl font-black tracking-tight focus:ring-8 focus:ring-primary/5 transition-all shadow-inner uppercase"
                                placeholder="?ÑÎ°ú?†ÏΩú Î™ÖÏπ≠ ?ïÏùò"
                            />
                        ) : (
                            <h3 className="text-4xl font-black text-slate-900 px-2 tracking-tighter leading-none uppercase">{policy.title}</h3>
                        )}
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-3 px-2">
                             <div className="w-2 h-2 rounded-full bg-primary" />
                            <label className="text-[11px] font-black text-muted-foreground/40 tracking-[0.4em] uppercase font-mono">Policy_Raw_Specification</label>
                        </div>
                        {isEditing ? (
                            <Textarea
                                value={policy.content}
                                onChange={(e) => setPolicy(prev => ({ ...prev, content: e.target.value }))}
                                className="min-h-[550px] p-12 rounded-[3.5rem] border-2 border-slate-100 bg-slate-50/50 text-base font-bold leading-[2] focus:ring-8 focus:ring-primary/5 outline-none transition-all resize-none shadow-inner custom-scrollbar"
                                placeholder="?∞Ïù¥??Î≥¥Ìò∏ Í∑úÏ†ï???ÅÏÑ∏ Î™ÖÏÑ∏Î•??ÖÎ†•?òÏã≠?úÏò§..."
                            />
                        ) : (
                            <div className="p-16 rounded-[4rem] bg-white border-2 border-slate-100/50 text-slate-600 leading-[2.2] font-semibold whitespace-pre-wrap shadow-2xl text-lg relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-12 opacity-[0.01] scale-[2] pointer-events-none group-hover:rotate-12 transition-transform duration-1000">
                                    <Shield size={240} className="text-primary" />
                                </div>
                                <div className="relative z-10">
                                    {policy.content}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </HubSectionCard>
        </div>
      </div>
    </div>
  );
}
