'스크랩명을 입력해주세요.';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bookmark, Globe, FileText, ArrowLeft, Send, Home, ChevronRight, Info } from "lucide-react";

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
 if (!formData.scrapNm.trim()) { alert('?ㅽ겕?⑸챸님?낅젰?댁＜?몄슂.'); return; }
 if (!formData.scrapUrl.trim()) { alert('URL을 입력해주세요.'); return; }
 if (!formData.scrapUrl.startsWith('http')) {
 alert('올바른 URL 형식이 아닙니다. (http:// 또는 https:// 로 시작해야 합니다)');
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
 alert(error.response?.data?.message || '등록에 실패했습니다.');
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
 {/* Breadcrumb */}
 <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg w-fit">
 <Link href="/" className="hover:text-foreground flex items-center gap-1 transition-colors">
 <Home className="w-4 h-4" /> 님 </Link>
 <ChevronRight className="w-4 h-4" />
 <Link href="/admin/collaboration/scraps/selectScrapList" className="hover:text-foreground transition-colors font-medium">?ㅽ겕?⑷?由?/Link>
 <ChevronRight className="w-4 h-4" />
 <span className="text-foreground font-semibold">님?ㅽ겕님등록</span>
 </div>

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
 ?덈줈님吏?앷낵 ?곴컧님님蹂닿님⑥뿉 異붽님섏꽭님
 </p>
 </div>
 </div>
 </CardHeader>
 <form onSubmit={handleSubmit}>
 <CardContent className="pt-14 px-12 space-y-12">
 {/* Scrap Name */}
 <div className="space-y-4">
 <Label htmlFor="scrapNm" className="text-[10px] font-black tracking-[0.2em] text-indigo-500 flex items-center gap-2">
 <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> ?ㅽ겕님?쒕ぉ (Required)
 </Label>
 <Input
 id="scrapNm"
 placeholder="?ㅽ겕?⑹쓽 ?쒕ぉ님吏곴님곸쑝濡님낅젰?섏꽭님
 className="h-16 text-2xl font-black border-2 border-slate-100 focus:border-indigo-400 focus-visible:ring-indigo-50 transition-all rounded-2xl px-6 bg-slate-50/30"
 value={formData.scrapNm}
 onChange={(e) => setFormData({ ...formData, scrapNm: e.target.value })}
 required
 />
 </div>

 {/* Scrap URL */}
 <div className="space-y-4">
 <Label htmlFor="scrapUrl" className="text-[10px] font-black tracking-[0.2em] text-indigo-500 flex items-center gap-2">
 <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> 님?섏씠吏 二쇱냼 (URL)
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
 <span className="w-1.5 h-1.5 rounded-full bg-slate-300" /> ?곸꽭 ?ㅻ챸 (Optional)
 </Label>
 <Textarea
 id="scrapDc"
 placeholder="이 페이지에서 얻은 영감이나 기억해야 할 내용을 자유롭게 기록하세요..."
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
 <p className="font-black text-lg">URL ?낅젰 媛?대뱶</p>
 <p className="text-white/80 text-sm font-medium leading-relaxed">
 URL? 諛섎뱶님`http://` ?먮뒗 `https://` 濡님쒖옉?댁빞 ?⑸땲님 ?щ컮瑜?二쇱냼瑜님낅젰?댁빞 ?섏쨷님?먮낯 ?섏씠吏濡님뺤긽?곸쑝濡님대룞님님?덉뒿?덈떎.
 </p>
 </div>
 </div>
 </CardContent>
 <CardFooter className="flex justify-center gap-8 py-14 border-t bg-slate-50/50 px-12 rounded-b-[2.5rem]">
 <Link href="/admin/collaboration/scraps/selectScrapList">
 <Button type="button" variant="ghost" className="h-16 px-12 font-black tracking-tight text-slate-500 hover:bg-white hover:shadow-xl transition-all active:scale-95 border-2 border-transparent hover:border-slate-100 rounded-2xl">
 <ArrowLeft className="w-5 h-5 mr-3" /> 痍⑥냼
 </Button>
 </Link>
 <Button type="submit" className="h-16 px-20 gap-4 font-black tracking-tight shadow-2xl bg-indigo-600 hover:bg-indigo-700 transition-all active:scale-95 ring-[12px] ring-indigo-50 rounded-2xl" disabled={loading}>
 {loading ? (
 <span className="flex items-center gap-2 animate-pulse font-black">蹂닿? 以?..</span>
 ) : (
 <>
 <Send className="w-5 h-5" /> ?ㅽ겕님?꾩뭅?대튃 ?꾨즺
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
