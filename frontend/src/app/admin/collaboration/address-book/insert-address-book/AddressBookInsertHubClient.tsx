'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User,  
 Phone,  
 Mail,  
 ArrowLeft,  
 Plus,  
 ShieldCheck,  
 Zap,  
 Globe, 
 CheckCircle2, 
 Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/providers/toast';
import { addressbookUserService } from '@/services/business/user/addressbook/AddressbookUserService';
;
;
;

export default function AddressBookInsertHubClient() {
 const router = useRouter();
 const { toast } = useToast();
 const [isSubmitting, setIsSubmitting] = useState(false);

 const [form, setForm] = useState({
 adbkNm: '',
 telNo: '',
 email: '',
 adres: '',
 rlsScopeCd: 'G', // [FIX] Required field for backend integrity
 wrterId: 'webmaster' // [FIX] Required field for backend integrity
 });

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
    if (!form.adbkNm.trim()) {
      toast('이름을 입력해 주세요.', 'error');
      return;
    }
    if (form.adbkNm.length > 100) {
      toast('이름은 100자 이내여야 합니다.', 'error');
      return;
    }
    if (form.telNo && form.telNo.replace(/-/g, '').length > 11) {
      toast('전화번호는 11자 이내여야 합니다.', 'error');
      return;
    }
    if (form.email && form.email.length > 50) {
      toast('이메일은 50자 이내여야 합니다.', 'error');
      return;
    }

 setIsSubmitting(true);
 const payload = {
 adbkNm: form.adbkNm,
 rlsScopeCd: form.rlsScopeCd,
 wrterId: form.wrterId,
 adbkMan: [
 {
 nm: form.adbkNm,
 emlAddr: form.email,
 mblTelno: form.telNo
 }
 ]
 };

 try {
 await addressbookUserService.createAddressBook(payload as any);
 toast('ID 노드가 성공적으로 네트워크에 등록되었습니다.', 'success');
 router.push('/admin/collaboration?tab=ADDRESS_BOOK');
 } catch (error) {
 toast('네트워크 등록 중 오류가 발생했습니다.', 'error');
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <div className="max-w-5xl mx-auto space-y-12 pb-24 pt-8 animate-in fade-in duration-700">
 {/* 1. Header Section */}
 <div className="flex items-center gap-8 px-2">
 <Button
 variant="outline"
 onClick={() => router.back()}
 className="w-16 h-11 rounded-lg border-2 group hover:bg-slate-900 transition-all duration-500 shadow-xl active:scale-95 bg-white"
 >
 <ArrowLeft className="group-hover:text-white group-hover:-translate-x-1 transition-all" />
 </Button>
 <div className="space-y-2">
 <div className="flex items-center gap-3">
 <span className="text-xs font-bold tracking-tight text-primary leading-none px-3 py-1 bg-primary/5 rounded-lg border border-primary/10">Organizational Network</span>
 </div>
 <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tighter leading-none transition-colors">
 Identity <span className="text-primary">Registration</span>
 </h1>
 </div>
 </div>

 <form onSubmit={handleSubmit} className="space-y-10 px-2">
 
 {/* 2. Core Identity Info */}
 <div className="hub-card-premium p-10 bg-white border-2 border-slate-100 shadow-2xl relative overflow-hidden group rounded-lg">
 <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-focus-within:opacity-10 transition-opacity">
 <User size={140} className="rotate-12 text-slate-900" />
 </div>
 <div className="relative z-10 space-y-8">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
 <Zap size={20} />
 </div>
 <span className="text-xs font-bold tracking-tight text-slate-400">Primary_Identity_Label</span>
 </div>
    <Input
      value={form.adbkNm}
      onChange={(e) => setForm({ ...form, adbkNm: e.target.value })}
      className="h-11 bg-transparent border-none text-slate-900 text-3xl font-bold placeholder:text-slate-900/10 focus-visible:ring-0 p-0 tracking-tight"
      placeholder="성명을 입력하십시오..."
      aria-label="주소록 명칭"
      data-testid="identity-name-input"
      maxLength={100}
      required
      autoFocus
    />
 <div className="h-[1px] w-full bg-gradient-to-r from-primary/40 to-transparent" />
 </div>
 </div>

 {/* 3. Communication Matrix */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <div className="hub-card-premium p-8 bg-slate-50 border-none shadow-xl rounded-lg space-y-6">
 <div className="flex items-center gap-3">
 <Phone className="text-primary" size={18} />
 <span className="text-xs font-bold text-slate-400 tracking-tight">Comm_Link_Protocol</span>
 </div>
    <Input
      value={form.telNo}
      onChange={(e) => setForm({ ...form, telNo: e.target.value })}
      className="h-11 bg-white border-2 border-slate-100 rounded-lg text-lg shadow-inner focus:border-primary/20 transition-all"
      placeholder="010-0000-0000"
      aria-label="전화번호"
      data-testid="identity-tel-input"
      maxLength={15}
    />
 </div>
 <div className="hub-card-premium p-8 bg-slate-50 border-none shadow-xl rounded-lg space-y-6">
 <div className="flex items-center gap-3">
 <Mail className="text-primary" size={18} />
 <span className="text-xs font-bold text-slate-400 tracking-tight">Electronic_Mail_Node</span>
 </div>
    <Input
      type="email"
      value={form.email}
      onChange={(e) => setForm({ ...form, email: e.target.value })}
      className="h-11 bg-white border-2 border-slate-100 rounded-lg text-lg shadow-inner focus:border-primary/20 transition-all"
      placeholder="example@egov.com"
      aria-label="이메일"
      data-testid="identity-email-input"
      maxLength={50}
    />
 </div>
 </div>

 {/* 4. Location Mapping */}
 <div className="hub-card-premium p-8 bg-slate-50 border-none shadow-xl rounded-lg space-y-6">
 <div className="flex items-center gap-3">
 <Globe className="text-primary" size={18} />
 <span className="text-xs font-bold text-slate-400 tracking-tight">Geospatial_Node_Address</span>
 </div>
 <Input
 value={form.adres}
 onChange={(e) => setForm({ ...form, adres: e.target.value })}
 className="h-11 bg-white border-2 border-slate-100 rounded-lg text-lg shadow-inner focus:border-primary/20 transition-all"
 placeholder="상세 위치 정보를 입력하십시오..."
 />
 </div>

 {/* 5. Bottom Actions */}
 <div className="flex flex-col sm:flex-row items-center justify-between gap-8 pt-8 border-t border-slate-100">
 <div className="flex items-center gap-8">
 <div className="flex flex-col">
 <span className="text-xs font-bold text-slate-400 tracking-tight leading-none">Access_Level</span>
 <span className="text-xs font-bold text-emerald-500 mt-1 flex items-center gap-1.5">
 <ShieldCheck size={12} /> Certified Identity
 </span>
 </div>
 <div className="w-[1px] h-8 bg-slate-100" />
 <div className="flex flex-col">
 <span className="text-xs font-bold text-slate-400 tracking-tight leading-none">System_Status</span>
 <span className="text-xs font-bold text-primary mt-1 flex items-center gap-1.5">
 <CheckCircle2 size={12} /> Online
 </span>
 </div>
 </div>

 <div className="flex items-center gap-4 w-full sm:w-auto">
 <Button
 type="button"
 variant="outline"
 data-testid="abort-identity-button"
 onClick={() => router.back()}
 className="h-11 flex-1 sm:flex-none px-10 rounded-lg border-2 font-bold tracking-tight text-xs hover:bg-slate-50 transition-all bg-white"
 >
 Abort
 </Button>
 <Button
 type="submit"
 disabled={isSubmitting}
 data-testid="commit-identity-button"
 className="h-11 flex-1 sm:flex-none px-12 rounded-lg bg-slate-900 text-white font-bold tracking-tight text-xs hover:scale-105 active:scale-95 transition-all shadow-2xl gap-3 group"
 >
 {isSubmitting ? (
 <span className="animate-pulse">Registering...</span>
 ) : (
 <>
 <Plus size={18} className="group-hover:rotate-90 transition-transform" /> Commit Identity
 </>
 )}
 </Button>
 </div>
 </div>
 </form>

 {/* 6. Footer Insight */}
 <div className="text-center">
 <div className="inline-flex items-center gap-3 px-6 py-2 bg-slate-50 rounded-lg border border-slate-100">
 <Sparkles size={14} className="text-primary/40" />
 <span className="text-xs font-bold text-slate-300 tracking-tight">Network Identity Indexer - V2.1.0</span>
 </div>
 </div>
 </div>
 );
}
