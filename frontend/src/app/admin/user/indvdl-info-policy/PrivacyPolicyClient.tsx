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
 RefreshCcw,
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
 toast.success('보안 정책 프레임워크가 성공적으로 커밋되었습니다.');
 setIsEditing(false);
 } catch {
 toast.error('데이터 정합성 오류로 최종 서명이 중단되었습니다.');
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
 <PageHeader
 title="보안 정책 거버넌스"
 breadcrumbs={[{ label: '시스템관리' }, { label: '보안관리' }, { label: '개인정보보호정책' }]}
 />

 <HubHeader 
 title="프라이버시" 
 highlight="Compliance" 
 subtitle="전사 데이터 보호 규정 및 개인정보 처리 방침 실시간 거버넌스 관리 시스템" 
 icon={ShieldCheck} 
 actions={
 <div className="flex gap-4 p-2 items-center">
 {isEditing ? (
 <>
 <Button
 variant="ghost"
 onClick={() => setIsEditing(false)}
 className="h-11 px-8 rounded-lg bg-white border-2 border-slate-100 text-slate-400 font-bold text-xs tracking-widest uppercase hover:text-rose-500 hover:bg-rose-50 transition-all shadow-xl active:scale-95 px-6"
 >
 CANCEL_CHANGES
 </Button>
 <Button
 onClick={handleSave}
 disabled={loading}
 className="h-11 px-10 rounded-lg bg-slate-900 border-none text-white font-bold text-xs tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3 group"
 >
 {loading ? <RefreshCcw size={18} className="animate-spin" /> : <Zap size={18} className="group-hover:animate-pulse" />} 
 COMMIT_SPECIFICATION
 <ArrowUpRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
 </Button>
 </>
 ) : (
 <Button
 onClick={() => setIsEditing(true)}
 className="h-11 px-10 rounded-lg bg-slate-900 border-none text-white font-bold text-xs tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3 group"
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
 <HubMetricCard title="AUDIT_PROBE" value="활성" icon={SearchCode} color="indigo" />
 <HubMetricCard title="REGULATORY_SYNC" value="99.8%" icon={Gavel} color="amber" />
 </HubMetricGrid>

 <div className="grid grid-cols-12 gap-12">
 {/* Statistics & Search Panel */}
 <div className="col-span-12 lg:col-span-4 h-full text-left">
 <div className="rounded-lg p-12 bg-slate-900 text-white shadow-2xl relative overflow-hidden group h-full border-none">
 <div className="absolute top-0 right-0 p-16 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
 <Shield size={240} className="text-primary" />
 </div>
 <div className="relative z-10 space-y-12">
 <div className="space-y-3">
 <div className="w-16 h-11 rounded-lg bg-white/10 flex items-center justify-center border border-white/5 shadow-inner">
 <Fingerprint size={32} className="text-primary" />
 </div>
 <h4 className="text-3xl font-bold tracking-tighter leading-tight uppercase text-left">프라이버시<br />보호 코어</h4>
 </div>

 <div className="space-y-8">
 <div className="space-y-3">
 <label className="text-xs font-bold text-white/30 tracking-[0.4em] px-2 uppercase font-mono text-left block text-left">Governance_Probing</label>
 <div className="p-8 rounded-lg bg-white/5 border border-white/5 space-y-4">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-white/40 uppercase tracking-widest ">마지막 커밋</span>
 <span className="text-xs font-bold text-primary font-mono tracking-widest uppercase ">2026-03-18_1433</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-white/40 uppercase tracking-widest ">규범 검증</span>
 <span className="text-xs font-bold text-emerald-400 font-mono tracking-widest uppercase ">ISO_27001_OK</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-white/40 uppercase tracking-widest ">가용성</span>
 <span className="text-xs font-bold text-indigo-400 font-mono tracking-widest uppercase ">PUBLIC_SYNC</span>
 </div>
 </div>
 </div>
 </div>

 <div className="pt-8 border-t border-white/5 space-y-4">
 <p className="text-xs font-bold text-slate-500 leading-relaxed uppercase opacity-60 text-left">
 * 본 정책 명세 변경 시 전사 서비스 및 계약 프로토콜에 즉각적인 법적 효력을 발생시킵니다.
 </p>
 <HubStatusBadge status="활성" className="bg-emerald-500/10 text-emerald-500 border-none px-6 py-2 rounded-lg text-xs tracking-widest font-bold" />
 </div>
 </div>
 </div>
 </div>

 {/* Policy Content Stream */}
 <div className="col-span-12 lg:col-span-8 flex flex-col gap-8 text-left">
 <HubSectionCard 
 title="데이터 보호 프로토콜 명세" 
 description="전사적으로 적용되는 개인정보 처리 및 보안 규정에 대한 상세 아키텍처 명세입니다." 
 icon={FileCode}
 className="flex-1"
 >
 <div className="space-y-12">
 <div className="space-y-4">
 <div className="flex items-center gap-3 px-2">
 <div className="w-2 h-2 rounded-lg bg-primary" />
 <label className="text-xs font-bold text-muted-foreground/40 tracking-[0.4em] uppercase font-mono text-left block">Policy_Identifier_Title</label>
 </div>
 {isEditing ? (
 <Input
 value={policy.title}
 onChange={(e) => setPolicy(prev => ({ ...prev, title: e.target.value }))}
 className="h-11 px-10 rounded-lg border-2 border-slate-100 bg-slate-50/50 text-xl font-bold tracking-tight focus:ring-8 focus:ring-primary/5 transition-all shadow-inner uppercase"
 placeholder="프로토콜 명칭 정의"
 />
 ) : (
 <h3 className="text-4xl font-bold text-slate-900 px-2 tracking-tighter leading-none uppercase text-left">{policy.title}</h3>
 )}
 </div>

 <div className="space-y-4 pt-4 border-t border-slate-100">
 <div className="flex items-center gap-3 px-2">
 <div className="w-2 h-2 rounded-lg bg-primary" />
 <label className="text-xs font-bold text-muted-foreground/40 tracking-[0.4em] uppercase font-mono text-left block">Policy_Raw_Specification</label>
 </div>
 {isEditing ? (
 <Textarea
 value={policy.content}
 onChange={(e) => setPolicy(prev => ({ ...prev, content: e.target.value }))}
 className="min-h-[550px] p-12 rounded-lg border-2 border-slate-100 bg-slate-50/50 text-base font-bold leading-[2] focus:ring-8 focus:ring-primary/5 outline-none transition-all resize-none shadow-inner custom-scrollbar text-left font-sans"
 placeholder="데이터 보호 규정 상세 명세를 입력하십시오..."
 />
 ) : (
 <div className="p-16 rounded-lg bg-white border-2 border-slate-100/50 text-slate-600 leading-[2.2] font-semibold whitespace-pre-wrap shadow-2xl text-lg relative overflow-hidden group text-left">
 <div className="absolute top-0 right-0 p-12 opacity-[0.01] scale-[2] pointer-events-none group-hover:rotate-12 transition-transform duration-1000">
 <Shield size={240} className="text-primary" />
 </div>
 <div className="relative z-10 font-sans">
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

