'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bookmark, Send, ArrowLeft, Home, ChevronRight, Activity, FileText, CheckCircle, Globe, Layout, Info } from "lucide-react";
import { DynamicBreadcrumb } from '@/app/components/layout/DynamicBreadcrumb';

const InsertScrapPage = () => {
 const router = useRouter();
 const [formData, setFormData] = useState({
 scrapNm: '',
 scrapUrl: '',
 scrapDc: ''
 });
 const [loading, setLoading] = useState(false);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();

 // Basic Validation
 if (!formData.scrapNm.trim()) { alert('?¤í¬?©ëª…???…ë ¥?´ì£¼?¸ìš”.'); return; }
 if (!formData.scrapUrl.trim()) { alert('URL???…ë ¥?´ì£¼?¸ìš”.'); return; }
 if (!formData.scrapUrl.startsWith('http')) {
 alert('?¬ë°”ë¥?URL ?•ì‹???„ë‹™?ˆë‹¤. (http:// ?ëŠ” https:// ë¡??œì‘?´ì•¼ ?©ë‹ˆ??');
 return;
 }

 setLoading(true);
 try {
 const response = (await axios.post('/scrap', formData)) as any;
 if (response.data.success) {
 alert(response.data.message);
 router.push('/admin/collaboration/scraps/selectScrapList');
 }
 } catch (error: any) {
 alert(error.response?.data?.message || '?±ë¡???¤íŒ¨?ˆìŠµ?ˆë‹¤.');
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
  <DynamicBreadcrumb />

 <Card className="shadow-2xl border-none overflow-hidden rounded-[2.5rem] bg-white ring-1 ring-slate-100">
 <CardHeader className="border-b bg-gradient-to-tr from-indigo-50 via-slate-50 to-white pb-12 pt-12 px-10">
 <div className="flex items-center gap-5">
 <div className="p-4 bg-indigo-600 rounded-[1.5rem] shadow-xl shadow-indigo-200 animate-bounce-slow">
 <Bookmark className="w-8 h-8 text-white fill-white/20" />
 </div>
 <div className="space-y-1">
 <CardTitle className="text-3xl font-black tracking-tighter text-slate-900 ">
 New Scrap Archive
 </CardTitle>
 <p className="text-sm font-bold text-slate-500 leading-relaxed tracking-tight">
 ?ˆë¡œ??ì§€?ê³¼ ?ê°????ë³´ê??¨ì— ì¶”ê??˜ì„¸??
 </p>
 </div>
 </div>
 </CardHeader>
 <form onSubmit={handleSubmit}>
 <CardContent className="pt-14 px-12 space-y-12">
 {/* Scrap Name */}
 <div className="space-y-4">
 <Label htmlFor="scrapNm" className="text-[10px] font-black tracking-[0.2em] text-indigo-500 flex items-center gap-2">
 <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> ?¤í¬???œëª© (Required)
 </Label>
 <Input
 id="scrapNm"
 placeholder="?¤í¬?©ì˜ ?œëª©??ì§ê??ìœ¼ë¡??…ë ¥?˜ì„¸??
 className="h-16 text-2xl font-black border-2 border-slate-100 focus:border-indigo-400 focus-visible:ring-indigo-50 transition-all rounded-2xl px-6 bg-slate-50/30"
 value={formData.scrapNm}
 onChange={(e) => setFormData({ ...formData, scrapNm: e.target.value })}
 required
 />
 </div>

 {/* Scrap URL */}
 <div className="space-y-4">
 <Label htmlFor="scrapUrl" className="text-[10px] font-black tracking-[0.2em] text-indigo-500 flex items-center gap-2">
 <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> ???˜ì´ì§€ ì£¼ì†Œ (URL)
 </Label>
 <div className="relative group">
 <div className="absolute left-6 top-1/2 -translate-y-1/2 z-10 p-2 bg-indigo-100/50 rounded-xl text-indigo-600 group-focus-within:bg-indigo-600 group-focus-within:text-white transition-all">
 <Globe className="w-5 h-5" />
 </div>
 <Input
 id="scrapUrl"
 placeholder="https://example.com"
 className="h-16 pl-20 text-lg font-bold border-2 border-slate-100 focus:border-indigo-400 focus-visible:ring-indigo-50 transition-all rounded-2xl bg-slate-50/30"
 value={formData.scrapUrl}
 onChange={(e) => setFormData({ ...formData, scrapUrl: e.target.value })}
 required
 />
 </div>
 </div>

 {/* Scrap Description */}
 <div className="space-y-4">
 <Label htmlFor="scrapDc" className="text-[10px] font-black tracking-[0.2em] text-slate-400 flex items-center gap-2">
 <span className="w-1.5 h-1.5 rounded-full bg-slate-300" /> ?ì„¸ ?¤ëª… (Optional)
 </Label>
 <Textarea
 id="scrapDc"
 placeholder="???˜ì´ì§€?ì„œ ?»ì? ?ê°?´ë‚˜ ê¸°ì–µ?´ì•¼ ???´ìš©???ìœ ë¡?²Œ ê¸°ë¡?˜ì„¸??.."
 className="min-h-[220px] p-8 text-lg font-medium leading-relaxed border-2 border-slate-100 focus:border-indigo-400 focus-visible:ring-indigo-50 transition-all rounded-3xl bg-slate-50/30 resize-none shadow-inner"
 value={formData.scrapDc}
 onChange={(e) => setFormData({ ...formData, scrapDc: e.target.value })}
 />
 </div>

 {/* Notice Card */}
 <div className="p-6 bg-indigo-600 rounded-3xl flex items-start gap-4 shadow-xl shadow-indigo-100 text-white relative overflow-hidden group">
 <div className="absolute right-[-20px] top-[-20px] bg-white opacity-10 w-32 h-32 rounded-full scale-150 group-hover:scale-[2] transition-transform duration-1000" />
 <Info className="w-6 h-6 mt-0.5 shrink-0" />
 <div className="space-y-1 relative z-10">
 <p className="font-black text-lg">URL ?…ë ¥ ê°€?´ë“œ</p>
 <p className="text-white/80 text-sm font-medium leading-relaxed">
 URL?€ ë°˜ë“œ??`http://` ?ëŠ” `https://` ë¡??œì‘?´ì•¼ ?©ë‹ˆ?? ?¬ë°”ë¥?ì£¼ì†Œë¥??…ë ¥?´ì•¼ ?˜ì¤‘???ë³¸ ?˜ì´ì§€ë¡??•ìƒ?ìœ¼ë¡??´ë™?????ˆìŠµ?ˆë‹¤.
 </p>
 </div>
 </div>
 </CardContent>
 <CardFooter className="flex justify-center gap-8 py-14 border-t bg-slate-50/50 px-12 rounded-b-[2.5rem]">
 <Link href="/admin/collaboration/scraps/selectScrapList">
 <Button type="button" variant="ghost" className="h-16 px-12 font-black tracking-tight text-slate-500 hover:bg-white hover:shadow-xl transition-all active:scale-95 border-2 border-transparent hover:border-slate-100 rounded-2xl">
 <ArrowLeft className="w-5 h-5 mr-3" /> ì·¨ì†Œ
 </Button>
 </Link>
 <Button type="submit" className="h-16 px-20 gap-4 font-black tracking-tight shadow-2xl bg-indigo-600 hover:bg-indigo-700 transition-all active:scale-95 ring-[12px] ring-indigo-50 rounded-2xl" disabled={loading}>
 {loading ? (
 <span className="flex items-center gap-2 animate-pulse font-black">ë³´ê? ì¤?..</span>
 ) : (
 <>
 <Send className="w-5 h-5" /> ?¤í¬???„ì¹´?´ë¹™ ?„ë£Œ
 </>
 )}
 </Button>
 </CardFooter>
 </form>
 </Card>
 </div>
 );
};

export default InsertScrapPage;
