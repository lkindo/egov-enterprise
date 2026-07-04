'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/app/components/layout/page-header';
import { boardAdminService } from '@/services/foundation/system/BoardAdminService';
import { useToast } from '@/components/providers/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Save, 
 ArrowLeft, 
 Layout, 
 FileText, 
 MessageSquare, 
 ShieldCheck, 
 Calendar, 
 Settings2 } from 'lucide-react';
import { boardSchema } from '@/lib/validation/schemas';
import { useAppForm } from '@/hooks/useAppForm';
import {
 Form,
 FormControl,
 FormField,
 FormItem,
 FormLabel,
 FormMessage,
} from '@/components/ui/form';
import { z } from 'zod';

export default function BoardWritePage() {
 const router = useRouter();
 const queryClient = useQueryClient();
 const { toast } = useToast();
 const [loading, setLoading] = useState(false);

 const form = useAppForm(boardSchema, {
 defaultValues: {
 bbsId: '',
 pstTtl: '',
 pstCn: '',
 ntceBgnde: '',
 ntceEndde: '',
 noticeAt: 'N' as 'Y' | 'N',
 secretAt: 'N' as 'Y' | 'N',
 useYn: 'Y' as 'Y' | 'N',
 evntDt: ''
 }
 });

 const onFormSubmit = async (data: z.infer<typeof boardSchema>) => {
 setLoading(true);
 try {
 console.log('>>> Submitting to boardAdminService.createBoardArticle...', data);
 const response = await boardAdminService.createBoardArticle(data as any);
 console.log('>>> API Response Success:', response);
 // 캐시 무효화 추가
 queryClient.invalidateQueries({ queryKey: ['boardList'] });
 toast('새 게시물이 성공적으로 생성되었습니다.', 'success');
 router.push(`/admin/community/boards/selectBoardList?bbsId=${data.bbsId}`);
 } catch (error) {
 console.error('>>> API Submission ERROR:', error);
 toast('게시물 저장 중 오류가 발생했습니다.', 'error');
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="space-y-10 pb-20 animate-in fade-in duration-1000">
 <PageHeader
 title="게시물 아키텍처 정의"
 breadcrumbs={[{ label: '커뮤니티' }, { label: '게시판 관리' }, { label: '새 게시물' }]}
 actions={
 <Button
 variant="outline"
 onClick={() => router.back()}
 className="h-12 rounded-lg font-bold gap-2 border-slate-200"
 >
 <ArrowLeft size={18} /> 이전으로
 </Button>
 }
 />

 <div className="max-w-5xl mx-auto">
 <Form {...form}>
 <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-10">
 <Card className="border-none shadow-2xl rounded-lg overflow-hidden bg-white ring-1 ring-slate-100">
 <CardHeader className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white p-10 pb-16 border-b border-slate-100 dark:border-slate-800 relative overflow-hidden">
 <div className="flex justify-between items-start relative z-10">
 <div className="space-y-3">
 <CardTitle className="text-4xl font-bold tracking-tighter flex items-center gap-4">
 <div className="p-3 bg-primary/10 rounded-lg">
 <FileText className="w-8 h-8 text-primary" />
 </div>
 새 콘텐츠 전개
 </CardTitle>
 <p className="text-slate-500 dark:text-slate-400 font-bold text-lg">시스템 전역에 배포될 새로운 게시물 데이터를 정의합니다.</p>
 </div>
 <div className="p-4 bg-primary/5 dark:bg-white/5 rounded-lg backdrop-blur-xl border border-primary/10 dark:border-white/10 text-right">
 <span className="text-xs font-bold tracking-widest text-primary uppercase animate-pulse">Waiting for Submit</span>
 </div>
 </div>
 {/* Background Decor */}
 <div className="absolute right-[-5%] top-[-10%] opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
 <FileText size={180} className="rotate-12" />
 </div>
 </CardHeader>

 <CardContent className="p-10 -mt-8 space-y-10">
 {/* Basic Info Node */}
 <div className="bg-white rounded-lg p-8 border border-slate-100 shadow-xl space-y-8">
 <div className="flex items-center gap-3 border-b border-slate-50 pb-6 mb-2">
 <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 font-bold ">01</div>
 <h3 className="text-xl font-bold tracking-tight">기본 메타데이터</h3>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <FormField
 control={form.control}
 name="bbsId"
 render={({ field }) => (
 <FormItem className="space-y-2">
 <FormLabel className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
 <Layout size={14} className="text-primary" /> 게시판 식별자 (BBS_ID)
 </FormLabel>
 <FormControl>
 <Input
 {...field}
 placeholder="BBS_0000000000000001"
 className="h-11 rounded-lg bg-slate-50/50 border-slate-100 font-bold text-lg focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
 maxLength={20}
 />
 </FormControl>
 <FormMessage className="text-xs font-bold text-rose-500" />
 </FormItem>
 )}
 />

 <FormField
 control={form.control}
 name="pstTtl"
 render={({ field }) => (
 <FormItem className="space-y-2">
 <FormLabel className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
 <MessageSquare size={14} className="text-primary" /> 게시물 제목
 </FormLabel>
 <FormControl>
 <Input
 {...field}
 placeholder="게시물의 핵심 제목을 입력하십시오."
 className="h-11 rounded-lg font-bold text-lg focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
 maxLength={100}
 />
 </FormControl>
 <FormMessage className="text-xs font-bold text-rose-500" />
 </FormItem>
 )}
 />
 </div>
 </div>

 {/* Content Body Node */}
 <div className="bg-white rounded-lg p-8 border border-slate-100 shadow-xl space-y-8">
 <div className="flex items-center gap-3 border-b border-slate-50 pb-6 mb-2">
 <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 font-bold ">02</div>
 <h3 className="text-xl font-bold tracking-tight">본문 콘텐츠 데이터</h3>
 </div>

 <FormField
 control={form.control}
 name="pstCn"
 render={({ field }) => (
 <FormItem className="space-y-4">
 <FormControl>
 <Textarea
 {...field}
 placeholder="본문 내용을 상세히 기술하십시오. 마크다운 및 HTML 파싱을 지원합니다."
 className="min-h-[400px] p-10 rounded-lg border-2 border-slate-50 bg-slate-50/30 focus:bg-white focus:ring-8 focus:ring-primary/5 transition-all text-lg font-medium leading-relaxed resize-none shadow-inner"
 maxLength={4000}
 />
 </FormControl>
 <FormMessage className="text-xs font-bold text-rose-500" />
 </FormItem>
 )}
 />
 </div>

 {/* Policy & Date Node */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
 <div className="bg-slate-50/50 rounded-lg p-8 border border-slate-100 space-y-6">
 <div className="flex items-center gap-3 border-b border-slate-200/50 pb-4">
 <ShieldCheck size={18} className="text-primary" />
 <h4 className="font-bold text-sm uppercase tracking-widest text-slate-900">배포 및 보안 정책</h4>
 </div>

 <div className="space-y-6">
 <FormField
 control={form.control}
 name="noticeAt"
 render={({ field }) => (
 <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-slate-100">
 <div className="space-y-0.5">
 <Label className="text-sm font-bold text-slate-800">공지사항 설정</Label>
 <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">Notification Priority</p>
 </div>
 <Switch
 checked={field.value === 'Y'}
 onCheckedChange={(checked) => field.onChange(checked ? 'Y' : 'N')}
 />
 </div>
 )}
 />

 <FormField
 control={form.control}
 name="secretAt"
 render={({ field }) => (
 <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-slate-100">
 <div className="space-y-0.5">
 <Label className="text-sm font-bold text-slate-800">비밀글 보호</Label>
 <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">Privacy Guard</p>
 </div>
 <Switch
 checked={field.value === 'Y'}
 onCheckedChange={(checked) => field.onChange(checked ? 'Y' : 'N')}
 />
 </div>
 )}
 />
 </div>
 </div>

 <div className="bg-slate-50/50 rounded-lg p-8 border border-slate-100 space-y-6">
 <div className="flex items-center gap-3 border-b border-slate-200/50 pb-4">
 <Calendar size={18} className="text-primary" />
 <h4 className="font-bold text-sm uppercase tracking-widest text-slate-900">게시 기간 스케줄링</h4>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <FormField
 control={form.control}
 name="ntceBgnde"
 render={({ field }) => (
 <FormItem className="space-y-2">
 <FormLabel className="text-xs font-bold text-slate-400 uppercase tracking-widest">게시 시작일</FormLabel>
 <FormControl>
 <Input type="date" {...field} className="h-11 rounded-lg border-slate-200 font-bold" />
 </FormControl>
 <FormMessage className="text-xs font-bold text-rose-500" />
 </FormItem>
 )}
 />

 <FormField
 control={form.control}
 name="ntceEndde"
 render={({ field }) => (
 <FormItem className="space-y-2">
 <FormLabel className="text-xs font-bold text-slate-400 uppercase tracking-widest">게시 종료일</FormLabel>
 <FormControl>
 <Input type="date" {...field} className="h-11 rounded-lg border-slate-200 font-bold" />
 </FormControl>
 <FormMessage className="text-xs font-bold text-rose-500" />
 </FormItem>
 )}
 />

 <FormField
 control={form.control}
 name="evntDt"
 render={({ field }) => (
 <FormItem className="space-y-2">
 <FormLabel className="text-xs font-bold text-slate-400 uppercase tracking-widest">행사/이벤트 일자</FormLabel>
 <FormControl>
 <Input type="date" {...field} className="h-11 rounded-lg border-slate-200 font-bold bg-primary/5" />
 </FormControl>
 <FormMessage className="text-xs font-bold text-rose-500" />
 </FormItem>
 )}
 />
 </div>
 </div>
 </div>

 {/* Final Action Area */}
 <div className="flex items-center justify-between pt-10 border-t-2 border-slate-50 border-dashed">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 bg-primary/5 rounded-lg flex items-center justify-center">
 <Settings2 size={24} className="text-primary animate-spin-slow" />
 </div>
 <div className="text-left">
 <p className="font-bold text-slate-800">시스템 동기화 준비 완료</p>
 <p className="text-xs font-bold text-slate-400">ID, 제목, 본문 등 필수 필드 무결성 확인됨</p>
 </div>
 </div>
 <div className="flex gap-4">
 <Button
 type="button"
 variant="ghost"
 onClick={() => router.back()}
 className="h-11 px-10 rounded-lg font-bold text-sm uppercase tracking-widest hover:bg-slate-50"
 >
 취소
 </Button>
 <Button
 type="submit"
 disabled={loading}
 className="h-11 px-16 bg-slate-900 dark:bg-primary text-white rounded-lg font-bold text-xs tracking-[0.4em] uppercase shadow-[0_24px_48px_-8px_rgba(15,23,42,0.3)] dark:shadow-primary/40 transition-all hover:-translate-y-2 active:scale-95 flex items-center gap-4"
 >
 <Save size={20} />
 {loading ? 'DEPLOYING...' : '이벤트 게시'}
 </Button>
 </div>
 </div>
 </CardContent>
 </Card>
 </form>
 </Form>
 </div>
 </div>
 );
}
