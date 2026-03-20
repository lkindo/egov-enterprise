'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Send, MessageSquare, Phone, Calendar, CheckCircle, AlertTriangle, RefreshCw, X, UserPlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import client from '@/lib/api/client';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Sms {
 smsId: string;
 trnsmitTelno: string;
 trnsmitCn: string;
 frstRegisterPnttm: string;
 recptnTelno: string;
}

export default function SmsListPage() {
 const [smsList, setSmsList] = useState<Sms[]>([]);
 const [loading, setLoading] = useState(true);
 const [searchKeyword, setSearchKeyword] = useState('');
 const [isSending, setIsSending] = useState(false);
 const [isDialogOpen, setIsDialogOpen] = useState(false);
 const [newSms, setNewSms] = useState({
 trnsmitTelno: '010-1234-5678', // Default sender
 recptnTelno: '',
 trnsmitCn: '',
 });

 const fetchSmsList = async () => {
 setLoading(true);
 try {
 const response: any = await client.get('/admin/operation/sms', {
 params: {
 searchKeyword,
 size: 20
 }
 });
 setSmsList(response.content || []);
 } catch (error: any) {
 console.error('Fetch SMS error:', error);
 toast.error('SMS 내역을 불러오는데 실패했습니다.');
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchSmsList();
 }, []);

 const handleSendSms = async (e: React.FormEvent) => {
 e.preventDefault();
 
 if (!newSms.recptnTelno || !newSms.trnsmitCn) {
 toast.error('수신 번호와 내용을 입력해주세요.');
 return;
 }

 setIsSending(true);
 try {
 await client.post('/admin/operation/sms', newSms);
 toast.success('SMS가 성공적으로 전송되었습니다.');
 setNewSms({ ...newSms, recptnTelno: '', trnsmitCn: '' });
 setIsDialogOpen(false);
 fetchSmsList();
 } catch (error: any) {
 console.error('Send SMS error:', error);
 toast.error(error.message || 'SMS 전송 중 오류가 발생했습니다.');
 } finally {
 setIsSending(false);
 }
 };

 return (
 <div className="p-6 space-y-6 max-w-7xl mx-auto">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div>
 <h1 className="text-3xl font-bold tracking-tight text-slate-800">문자 메시지(SMS) 내역</h1>
 <p className="text-slate-500 mt-2">고객 및 임직원에게 발송된 SMS 정보를 관리합니다.</p>
 </div>
 <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
 <DialogTrigger asChild>
 <Button className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-lg shadow-emerald-500/20 text-white font-medium h-12 px-6">
 <Send className="w-4 h-4 mr-2" /> 새 문자 발송
 </Button>
 </DialogTrigger>
 <DialogContent className="sm:max-w-md bg-white border-none shadow-2xl p-0 overflow-hidden">
 <DialogHeader className="bg-emerald-600 p-6 text-white">
 <DialogTitle className="text-xl flex items-center">
 <MessageSquare className="w-5 h-5 mr-2" /> 문자 발송하기
 </DialogTitle>
 </DialogHeader>
 <form onSubmit={handleSendSms} className="p-6 space-y-6">
 <div className="space-y-4">
 <div className="space-y-2">
 <Label htmlFor="recptnTelno" className="text-sm font-semibold text-slate-700">수신 번호</Label>
 <div className="relative">
 <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
 <Input
 id="recptnTelno"
 placeholder="010-0000-0000"
 className="pl-10 h-11 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
 value={newSms.recptnTelno}
 onChange={(e) => setNewSms({ ...newSms, recptnTelno: e.target.value })}
 />
 </div>
 </div>
 <div className="space-y-2">
 <Label htmlFor="trnsmitCn" className="text-sm font-semibold text-slate-700">메시지 내용</Label>
 <div className="relative">
 <Textarea
 id="trnsmitCn"
 placeholder="전달할 내용을 입력하세요..."
 className="min-h-[150px] border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 transition-all p-4 pt-10"
 value={newSms.trnsmitCn}
 onChange={(e) => setNewSms({ ...newSms, trnsmitCn: e.target.value })}
 />
 <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
 </div>
 <div className="text-right text-sm text-slate-400 mt-1">
 {newSms.trnsmitCn.length} / 80 bytes (단문 기준)
 </div>
 </div>
 </div>
 <DialogFooter className="flex md:justify-between items-center sm:justify-end border-t border-slate-100 pt-6">
 <p className="text-[10px] text-slate-400 italic flex-1 hidden md:block">정보통신망법 준수를 권장합니다.</p>
 <div className="flex space-x-2">
 <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="h-10 px-4">취소</Button>
 <Button type="submit" disabled={isSending} className="bg-emerald-600 hover:bg-emerald-700 text-white h-10 px-6 font-medium">
 {isSending ? '전송 중...' : '전송하기'}
 </Button>
 </div>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>
 </div>

 <Card className="border-none shadow-xl bg-white overflow-hidden">
 <CardHeader className="bg-slate-50 border-b border-slate-100 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
 <form onSubmit={(e) => { e.preventDefault(); fetchSmsList(); }} className="relative flex-1 w-full">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
 <Input 
 placeholder="전송 내용이나 번호로 검색..." 
 className="pl-10 h-11 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 transition-all w-full md:max-w-md"
 value={searchKeyword}
 onChange={(e) => setSearchKeyword(e.target.value)}
 />
 </form>
 <Button onClick={fetchSmsList} variant="ghost" className="text-slate-500 hover:text-slate-700">
 <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> 새로고침
 </Button>
 </CardHeader>
 <CardContent className="p-0">
 <div className="overflow-x-auto">
 <table className="w-full text-left border-collapse">
 <thead>
 <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 tracking-tight">
 <th className="px-6 py-4">식별자</th>
 <th className="px-6 py-4">수신 번호</th>
 <th className="px-6 py-4">메시지 본문</th>
 <th className="px-6 py-4">발송 시간</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {loading ? (
 Array(5).fill(0).map((_, i) => (
 <tr key={i} className="animate-pulse">
 <td colSpan={4} className="px-6 py-8">
 <div className="h-4 bg-slate-100 rounded-full w-3/4 mx-auto"></div>
 </td>
 </tr>
 ))
 ) : smsList.length === 0 ? (
 <tr>
 <td colSpan={4} className="px-6 py-24 text-center">
 <div className="flex flex-col items-center justify-center space-y-4">
 <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
 <MessageSquare className="w-8 h-8 text-slate-200" />
 </div>
 <p className="text-slate-400 text-lg font-medium">검색된 SMS 발송 내역이 없습니다.</p>
 </div>
 </td>
 </tr>
 ) : (
 smsList.map((sms) => (
 <tr key={sms.smsId} className="hover:bg-emerald-50/30 transition-colors group">
 <td className="px-6 py-4">
 <span className="text-[10px] font-mono text-slate-400">#{sms.smsId.substring(0, 8)}</span>
 </td>
 <td className="px-6 py-4">
 <div className="flex items-center">
 <div className="w-7 h-7 rounded bg-emerald-100 flex items-center justify-center mr-3 text-emerald-600">
 <Phone className="w-3.5 h-3.5" />
 </div>
 <span className="font-semibold text-slate-700">{sms.recptnTelno}</span>
 </div>
 </td>
 <td className="px-6 py-4">
 <p className="text-slate-600 text-sm font-medium line-clamp-1 max-w-sm" title={sms.trnsmitCn}>
 {sms.trnsmitCn}
 </p>
 </td>
 <td className="px-6 py-4">
 <div className="flex items-center text-sm text-slate-400">
 <Calendar className="w-3 h-3 mr-1.5" />
 {sms.frstRegisterPnttm ? new Date(sms.frstRegisterPnttm).toLocaleString('ko-KR') : '장부 없음'}
 </div>
 </td>
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>
 </CardContent>
 </Card>
 </div>
 );
}
