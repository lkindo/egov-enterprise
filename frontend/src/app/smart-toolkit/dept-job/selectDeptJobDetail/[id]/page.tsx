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
import { Briefcase, Send, ArrowLeft, Home, ChevronRight, Activity, AlertCircle, FileText, CheckCircle } from "lucide-react";

const InsertDeptJobPage = () => {
 const router = useRouter();
 const [formData, setFormData] = useState({
 deptJobNm: '',
 deptJobCn: '',
 priort: '3'
 });
 const [loading, setLoading] = useState(false);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!formData.deptJobNm.trim()) {
 alert('업무?쒕ぉ님?낅젰님二쇱꽭님');
 return;
 }

 setLoading(true);
 try {
 const response = (await axios.post('/deptjob', formData)) as any;
 if (response.data.success) {
 alert(response.data.message);
 router.push('/smart-toolkit/dept-job/selectDeptJobList');
 }
 } catch (error: any) {
 alert(error.response?.data?.message || '등록님?ㅽ뙣?섏님듬땲님');
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
 {/* Breadcrumb */}
 <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-2xl w-fit border border-slate-100">
 <Link href="/" className="hover:text-foreground flex items-center gap-1 transition-colors">
 <Home className="w-4 h-4" /> 님 </Link>
 <ChevronRight className="w-4 h-4" />
 <Link href="/smart-toolkit/dept-job/selectDeptJobList" className="hover:text-foreground transition-colors font-bold">遺?쒖뾽臾?愿由?/Link>
 <ChevronRight className="w-4 h-4" />
 <span className="text-foreground font-black">님업무 등록</span>
 </div>

 <Card className="shadow-[0_64px_128px_-32px_rgba(0,0,0,0.15)] border-none overflow-hidden rounded-[3.5rem] bg-white ring-1 ring-slate-100">
 <CardHeader className="border-b bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-800 pb-20 pt-20 px-12 text-white text-center md:text-left">
 <div className="flex flex-col md:flex-row items-center gap-8">
 <div className="w-24 h-24 bg-white/5 backdrop-blur-2xl border-2 border-white/10 rounded-[2.5rem] flex items-center justify-center shadow-2xl scale-110 rotate-3 group hover:rotate-0 transition-transform duration-700">
 <Briefcase className="w-10 h-10 text-primary-foreground" />
 </div>
 <div className="space-y-4">
 <div className="flex items-center justify-center md:justify-start gap-3 px-4 py-1.5 bg-white/10 w-fit rounded-full border border-white/10 mx-auto md:mx-0">
 <Activity className="w-3.5 h-3.5 text-primary-foreground animate-pulse" />
 <span className="text-[10px] font-black tracking-[0.25em] text-white/80">?뚰겕?뚮줈님?쒖뒪님2.0</span>
 </div>
 <CardTitle className="text-3xl font-black tracking-tighter leading-none ">
 Dispatch New Task
 </CardTitle>
 <p className="text-slate-400 font-medium text-lg max-w-lg leading-relaxed mx-auto md:mx-0">
 遺?쒖쓽 ?덈줈님업무瑜님뺤쓽?섍퀬 ?좊떦?⑸땲님 <br />紐낇솗님紐⑺몴 ?ㅼ젙님?듯빐 ?⑥쑉?곸씤 ?묒뾽님?쒖옉?섏꽭님
 </p>
 </div>
 </div>
 </CardHeader>
 <form onSubmit={handleSubmit}>
 <CardContent className="pt-24 pb-20 px-12 md:px-20 space-y-20">
 {/* Task Title */}
 <div className="space-y-6 group">
 <Label htmlFor="deptJobNm" className="text-[10px] font-black tracking-[0.3em] text-slate-400 group-focus-within:text-slate-900 transition-all flex items-center gap-3">
 <span className="w-2 h-2 rounded-full bg-primary" /> Core Task Designation
 </Label>
 <Input
 id="deptJobNm"
 placeholder="?섑뻾?댁빞 님?듭떖 업무 ?쒕ぉ님?낅젰?섏꽭님
 className="h-20 text-3xl font-black border-2 border-slate-50 focus:border-slate-900 focus-visible:ring-slate-100 transition-all rounded-[1.5rem] px-10 bg-slate-50/50 shadow-inner group-focus-within:bg-white group-focus-within:shadow-2xl"
 value={formData.deptJobNm}
 onChange={(e) => setFormData({ ...formData, deptJobNm: e.target.value })}
 required
 />
 </div>

 {/* Priority Selection */}
 <div className="space-y-6 group">
 <Label htmlFor="priort" className="text-[10px] font-black tracking-[0.3em] text-slate-400 flex items-center gap-3">
 <AlertCircle className="w-4 h-4 text-primary" /> Strategic Priority Ranking
 </Label>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {[
 { value: '1', label: 'CRITICAL', desc: 'Immediate Action' },
 { value: '2', label: 'STANDARD', desc: 'Planned Schedule' },
 { value: '3', label: 'DEFERRED', desc: 'Low Urgency' }
 ].map((p) => (
 <button
 key={p.value}
 type="button"
 onClick={() => setFormData({ ...formData, priort: p.value })}
 className={`p-8 rounded-[2rem] border-2 text-center transition-all active:scale-95 ${formData.priort === p.value
 ? 'bg-slate-900 text-white border-slate-900 shadow-2xl ring-8 ring-slate-100'
 : 'bg-slate-50 text-slate-400 border-transparent hover:border-slate-200'
 }`}
 >
 <div className={`text-sm font-black tracking-[0.2em] mb-1 ${formData.priort === p.value ? 'text-primary' : ''}`}>{p.label}</div>
 <div className="text-sm font-bold opacity-60 ">{p.desc}</div>
 </button>
 ))}
 </div>
 </div>

 {/* Task Description */}
 <div className="space-y-6 group">
 <Label htmlFor="deptJobCn" className="text-[10px] font-black tracking-[0.3em] text-slate-400 group-focus-within:text-slate-900 transition-all flex items-center gap-3">
 <FileText className="w-4 h-4" /> Detailed Specifications
 </Label>
 <Textarea
 id="deptJobCn"
 placeholder="업무님?곸꽭 紐⑺몴, ?섑뻾 諛⑸쾿, 요청 ?ы빆 ?깆쓣 援ъ껜?곸쑝濡님쒖닠?섏꽭님."
 className="min-h-[350px] p-12 text-xl font-medium leading-[1.8] border-2 border-slate-50 focus:border-slate-900 focus-visible:ring-slate-100 transition-all rounded-[3.5rem] bg-slate-50/50 shadow-inner group-focus-within:bg-white group-focus-within:shadow-2xl resize-none scrollbar-thin scrollbar-thumb-slate-200"
 value={formData.deptJobCn}
 onChange={(e) => setFormData({ ...formData, deptJobCn: e.target.value })}
 required
 />
 </div>

 {/* Confirmation Indicator */}
 <div className="p-10 bg-slate-50 border-2 border-white rounded-[3rem] shadow-xl flex items-center gap-8 relative overflow-hidden">
 <div className="p-6 bg-slate-900 rounded-[2rem] text-white shadow-2xl">
 <CheckCircle className="w-10 h-10 text-primary-foreground" />
 </div>
 <div className="space-y-1">
 <p className="font-black text-2xl text-slate-900 tracking-tight ">?좏슚님寃님?꾩슂</p>
 <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-[450px]">
 등록님업무님遺님?꾩껜 ??쒕낫?쒖뿉 利됱떆 ?몄텧?⑸땲님 湲곗엯님?댁슜님遺님?댁쁺 媛?대뱶?쇱씤님以?섑븯?붿? ?뺤씤님二쇱꽭님
 </p>
 </div>
 </div>
 </CardContent>
 <CardFooter className="flex flex-col md:flex-row justify-center gap-8 py-20 border-t border-slate-50 bg-slate-50/30 px-12 rounded-b-[3.5rem]">
 <Link href="/smart-toolkit/dept-job/selectDeptJobList">
 <Button type="button" variant="ghost" className="h-20 px-16 font-black tracking-[0.3em] text-sm text-slate-400 hover:bg-white hover:text-rose-500 hover:shadow-2xl transition-all rounded-[1.75rem] border-2 border-transparent hover:border-rose-50">
 <ArrowLeft className="w-6 h-6 mr-4" /> Discard & Return
 </Button>
 </Link>
 <Button type="submit" className="h-20 px-24 gap-4 font-black tracking-[0.3em] text-sm shadow-[0_24px_48px_-8px_theme(colors.slate.900/40)] bg-slate-900 hover:bg-black transition-all active:scale-95 ring-[20px] ring-slate-100 rounded-[1.75rem]" disabled={loading}>
 {loading ? (
 <span className="flex items-center gap-3 animate-pulse">
 <div className="w-3 h-3 bg-white rounded-full" /> Dispatching...
 </span>
 ) : (
 <>
 <Send className="w-6 h-6" /> Deploy New Task
 </>
 )}
 </Button>
 </CardFooter>
 </form>
 </Card>
 </div>
 );
};

export default InsertDeptJobPage;
