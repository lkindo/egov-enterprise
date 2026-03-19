'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { smsAdminService, SmsDto } from '@/services/admin/operation/SmsAdminService';
import {
 MessageSquare,
 Send,
 Search,
 RefreshCcw,
 Plus,
 History,
 Phone,
 User,
 CheckCircle2,
 AlertCircle,
 Calendar,
 TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function SmsAdminClient({ 
 initialSmsList 
}: { 
 initialSmsList: any 
}) {
 const [loading, setLoading] = useState(false);
 const [smsList, setSmsList] = useState(initialSmsList.list || []);
 const [totalCount, setTotalCount] = useState(initialSmsList.pagination.totalItems || 0);
 const [searchKeyword, setSearchKeyword] = useState('');
 
 // Send SMS State
 const [isSendOpen, setIsSendOpen] = useState(false);
 const [sendForm, setSendForm] = useState({
 trnsmitTelno: '02-1234-5678', // 발신번호 (기본값)
 recptnTelno: '',
 trnsmitCn: ''
 });

 const handleSearch = async () => {
 setLoading(true);
 try {
 const res = await smsAdminService.getSmsList({ searchKeyword });
 setSmsList(res.list);
 setTotalCount(res.pagination.totalItems);
 } catch (error) {
 toast.error('발송 내역을 불러오지 못했습니다.');
 } finally {
 setLoading(false);
 }
 };

 const handleSend = async () => {
 if (!sendForm.recptnTelno || !sendForm.trnsmitCn) {
 toast.error('수신번호와 내용을 입력해주세요.');
 return;
 }

 setLoading(true);
 try {
 await smsAdminService.sendSms(sendForm);
 toast.success('문자 메시지를 발송했습니다.');
 setIsSendOpen(false);
 handleSearch(); // 목록 갱신
 } catch (error) {
 toast.error('발송에 실패했습니다.');
 } finally {
 setLoading(false);
 }
 };

 const columns = [
 {
 header: '발송 일시',
 accessor: (item: SmsDto) => (
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
 <Calendar size={14} />
 </div>
 <span className="font-mono font-bold text-slate-900 italic">
 {item.trnsmitPnttm ? format(new Date(item.trnsmitPnttm), 'yyyy-MM-dd HH:mm:ss') : 'N/A'}
 </span>
 </div>
 )
 },
 {
 header: '발신 번호',
 accessor: (item: SmsDto) => (
 <div className="flex items-center gap-2">
 <Phone size={14} className="text-slate-400" />
 <span className="font-bold text-slate-700">{item.trnsmitTelno}</span>
 </div>
 )
 },
 {
 header: '메시지 내용',
 accessor: (item: SmsDto) => (
 <div className="max-w-[400px] truncate font-medium text-slate-600 italic">
 "{item.trnsmitCn}"
 </div>
 )
 },
 {
 header: '상태',
 accessor: () => (
 <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 w-fit">
 <CheckCircle2 size={12} />
 <span className="text-[10px] font-black tracking-tight italic">성공</span>
 </div>
 )
 }
 ];

 return (
 <div className="max-w-6xl mx-auto space-y-12 px-4 md:px-0 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
 <PageHeader
 title="문자 메시지 매트릭스"
 breadcrumbs={[{ label: '부가서비스' }, { label: '문자메시지' }]}
 actions={
 <div className="flex items-center gap-4">
 <Button
 onClick={() => setIsSendOpen(true)}
 className="h-14 px-8 bg-slate-900 text-white rounded-2xl font-black text-sm tracking-[0.2em] shadow-xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3 italic"
 >
 <Plus size={18} />
 메시지 작성
 </Button>
 </div>
 }
 />

 {/* Luxury Stats Overview */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
 <div className="p-10 rounded-[3rem] bg-white border-2 border-slate-100 shadow-xl shadow-slate-900/5 group hover:scale-[1.02] transition-all cursor-default relative overflow-hidden">
 <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center mb-8 shadow-xl group-hover:rotate-12 transition-transform">
 <History size={24} />
 </div>
 <h4 className="text-4xl font-black tracking-tighter italic tabular-nums text-slate-900">{totalCount.toLocaleString()}</h4>
 <p className="text-[10px] font-black text-slate-400 tracking-[0.3em] mt-2 italic flex items-center gap-2">
 <span className="w-4 h-0.5 bg-slate-200" />
 누적 발송 건수
 </p>
 <div className="absolute right-[-10%] bottom-[-10%] opacity-[0.03] -rotate-12 group-hover:rotate-0 transition-all duration-1000">
 <MessageSquare size={200} />
 </div>
 </div>

 <div className="p-10 rounded-[3rem] bg-white border-2 border-primary/5 shadow-xl shadow-primary/5 group hover:scale-[1.02] transition-all cursor-default relative overflow-hidden">
 <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center mb-8 shadow-xl group-hover:rotate-12 transition-transform">
 <Send size={24} />
 </div>
 <h4 className="text-4xl font-black tracking-tighter italic tabular-nums text-primary">{totalCount.toLocaleString()}</h4>
 <p className="text-[10px] font-black text-primary/40 tracking-[0.3em] mt-2 italic flex items-center gap-2">
 <span className="w-4 h-0.5 bg-primary/20" />
 발송 성공
 </p>
 </div>

 <div className="p-10 rounded-[3rem] bg-rose-50 border-2 border-rose-100 shadow-xl shadow-rose-900/5 group hover:scale-[1.02] transition-all cursor-default relative overflow-hidden">
 <div className="w-14 h-14 rounded-2xl bg-white text-rose-600 flex items-center justify-center mb-8 shadow-sm group-hover:rotate-12 transition-transform">
 <AlertCircle size={24} />
 </div>
 <h4 className="text-4xl font-black tracking-tighter italic tabular-nums text-rose-600">0</h4>
 <p className="text-[10px] font-black text-rose-400 tracking-[0.3em] mt-2 italic flex items-center gap-2">
 <span className="w-4 h-0.5 bg-rose-200" />
 발송 실패
 </p>
 </div>
 </div>

 {/* Main Content Area */}
 <div className="responsive-card p-6 md:p-12 border-2 border-slate-100 bg-white/50 backdrop-blur-xl relative overflow-hidden group">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 relative z-10">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg">
 <History size={24} />
 </div>
 <div>
 <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter italic">발송 로그</h3>
 <p className="text-[9px] font-black text-slate-400 tracking-[0.3em]">전체 메시지 이력 데이터</p>
 </div>
 </div>
 <div className="flex items-center gap-4">
 <div className="relative">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
 <Input
 placeholder="검색..."
 value={searchKeyword}
 onChange={(e) => setSearchKeyword(e.target.value)}
 className="h-14 pl-12 pr-6 w-full md:w-[300px] rounded-2xl border-2 border-slate-100 font-black text-[10px] tracking-tight focus:ring-4 focus:ring-primary/10 transition-all bg-white"
 />
 </div>
 <Button
 onClick={handleSearch}
 className="h-14 px-8 bg-slate-900 text-white rounded-2xl font-black text-[10px] tracking-tight shadow-xl hover:bg-primary transition-all active:scale-95 italic"
 >
 검색
 </Button>
 </div>
 </div>

 <div className="px-2 overflow-x-auto relative z-10">
 <StandardDataTable
 columns={columns}
 data={smsList}
 loading={loading}
 emptyMessage="발송된 문자 메시지가 없습니다."
 className="border-none bg-slate-50/50 rounded-[3rem] p-8"
 />
 </div>
 
 <div className="absolute right-[-2%] bottom-[-5%] opacity-[0.02] -rotate-12 group-hover:rotate-0 transition-all duration-1000">
 <TrendingUp size={180} />
 </div>
 </div>

 {/* Send Message Dialog */}
 <Dialog open={isSendOpen} onOpenChange={setIsSendOpen}>
 <DialogContent className="sm:max-w-[500px] rounded-[3rem] p-10 border-none shadow-2xl bg-white">
 <DialogHeader className="space-y-4">
 <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/20 mx-auto">
 <Send size={28} />
 </div>
 <DialogTitle className="text-3xl font-black text-slate-900 tracking-tighter italic text-center">메시지 발송</DialogTitle>
 <DialogDescription className="text-center font-bold text-slate-400 text-sm">
 시스템 인텔리전스를 통해 보안 메시지를 발송합니다.
 </DialogDescription>
 </DialogHeader>
 
 <div className="space-y-8 py-8">
 <div className="space-y-3">
 <label className="text-[10px] font-black text-slate-400 tracking-tight italic ml-2 flex items-center gap-2">
 <Phone size={12} className="text-primary" />
 수신 번호 (대상 단말기)
 </label>
 <Input
 placeholder="010-0000-0000"
 value={sendForm.recptnTelno}
 onChange={(e) => setSendForm(prev => ({ ...prev, recptnTelno: e.target.value }))}
 className="h-16 px-8 rounded-3xl border-2 border-slate-100 bg-slate-50/50 text-lg font-black italic tabular-nums focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
 />
 </div>
 
 <div className="space-y-3">
 <label className="text-[10px] font-black text-slate-400 tracking-tight italic ml-2 flex items-center gap-2">
 <MessageSquare size={12} className="text-primary" />
 메시지 내용
 </label>
 <Textarea
 placeholder="메시지 내용을 입력하세요..."
 value={sendForm.trnsmitCn}
 onChange={(e) => setSendForm(prev => ({ ...prev, trnsmitCn: e.target.value }))}
 className="min-h-[160px] p-8 rounded-[2.5rem] border-2 border-slate-100 bg-slate-50/50 text-base font-bold italic outline-none focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all resize-none shadow-inner"
 />
 <p className="text-[9px] font-black text-slate-300 tracking-tight text-right mr-4 italic">최대 80바이트</p>
 </div>
 </div>
 
 <DialogFooter>
 <Button
 variant="outline"
 onClick={() => setIsSendOpen(false)}
 className="h-16 px-10 rounded-2xl border-2 border-slate-100 font-black text-sm tracking-tight italic hover:bg-slate-50 transition-all"
 >
 취소
 </Button>
 <Button
 onClick={handleSend}
 disabled={loading}
 className="h-16 px-14 bg-slate-900 text-white rounded-2xl font-black text-sm tracking-[0.2em] shadow-xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3 italic flex-1"
 >
 {loading ? <RefreshCcw size={16} className="animate-spin" /> : <Send size={16} />}
 발송 시작
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}
