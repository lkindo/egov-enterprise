'use client';

import React, { useState, Suspense, useActionState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { saveBoardArticle } from '@/app/actions/boardActions';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
 Edit3,
 Send,
 ArrowLeft,
 Home,
 ChevronRight,
 MessageSquare,
 Info,
 Type,
 FileText,
 Paperclip,
 CheckCircle2,
 AlertCircle
} from "lucide-react";
import { StandardFileUploader } from '@/app/components/ui/standard-file-uploader';
import { StandardForm, FormField } from '@/app/components/ui/standard-form';
import { useToast } from '@/app/components/ui/toast';
import { DynamicBreadcrumb } from '@/app/components/layout/DynamicBreadcrumb';

const InsertBBSContent = () => {
 const router = useRouter();
 const pathname = usePathname();
 const { toast } = useToast();
 const searchParams = useSearchParams();
 const bbsId = searchParams.get('bbsId') || 'BBSMSTR_AAAAAAAAAAAA';

 const [state, formAction, isPending] = useActionState(saveBoardArticle, null);

 useEffect(() => {
 if (state?.success) {
 toast(state.message, 'success');
 if (state.redirect) {
 router.push(state.redirect);
 }
 } else if (state && !state.success) {
 toast(state.message, 'error');
 }
 }, [state, router, toast]);

 const [attachedFiles, setFiles] = useState<File[]>([]);

 return (
 <div className="flex flex-col gap-8 p-6 max-w-5xl mx-auto w-full pb-32 animate-in fade-in duration-700">
  {/* Breadcrumb - ?숈쟻 硫붾돱 愿由님곸슜 */}
  <DynamicBreadcrumb 
    customItems={[
      { name: pathname.includes('/admin/system') ? '?쒖뒪님愿由? : '而ㅻ님덊떚 諛?肄섑뀗痢? },
      { name: '寃뚯떆님?곸꽭' },
      { name: '?묒꽦' }
    ]}
  />

 <Card className="shadow-[0_40px_80px_-20px_rgba(0,0,0,0.12)] border-none overflow-hidden rounded-[3.5rem] bg-card ring-1 ring-primary/5">
 <CardHeader className="border-b bg-slate-950 pb-20 pt-20 px-12 md:px-20 text-white relative overflow-hidden">
 {/* Background Accents */}
 <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
 <div className="absolute bottom-[-20%] left-[-10%] w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[100px]" />

 <div className="flex flex-col md:flex-row items-center justify-between gap-10 relative z-10">
 <div className="space-y-6 text-center md:text-left">
 <div className="flex items-center gap-3 px-5 py-2 bg-white/10 w-fit rounded-full border border-white/10 backdrop-blur-xl mx-auto md:mx-0">
 <Edit3 className="w-4 h-4 text-primary animate-bounce" />
 <span className="text-[10px] font-black tracking-[0.3em] text-white">
    {pathname.includes('insertBoardArticle') ? 'NEW POST : ' : 'VIEW : '} {bbsId.includes('NOTICE') ? 'NOTICE' : 'BOARD'}
  </span>
 </div>
 <CardTitle className="text-3xl md:text-3xl font-black tracking-tighter leading-tight ">
    {pathname.includes('insertBoardArticle') ? (
      <>?덈줈님?뚯떇님<br /><span className="text-primary underline decoration-8 decoration-primary/20 underline-offset-8">湲곕줉?섏꽭님/span></>
    ) : (
      <>寃뚯떆湲 ?댁슜님<br /><span className="text-primary underline decoration-8 decoration-primary/20 underline-offset-8">?뺤씤?섏꽭님/span></>
    )}
  </CardTitle>
 <p className="text-slate-400 font-medium text-lg max-w-lg leading-relaxed">
    ?怨?怨듭쑀님媛移님덈뒗 ?뺣낫瑜님뺤꽦?ㅻ읇寃님묒꽦?섏뿬 <br className="hidden md:block" />?뚰넻님님쓣 ?볧?蹂댁꽭님
  </p>
 </div>
 <div className="hidden lg:block relative">
 <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-primary/20 to-transparent border-2 border-white/10 flex items-center justify-center rotate-12 hover:rotate-0 transition-all duration-700 shadow-2xl">
 <MessageSquare className="w-12 h-12 text-white/40" />
 </div>
 <div className="absolute -top-4 -right-4 w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-xl animate-bounce duration-[2000ms]">
 <Send size={20} className="text-white ml-1" />
 </div>
 </div>
 </div>
 </CardHeader>

 <StandardForm action={formAction}>
 <input type="hidden" name="bbsId" value={bbsId} />
 <CardContent className="pt-20 px-12 md:px-20 space-y-20">
 {/* Title Input */}
 <div className="space-y-6 group">
 <div className="flex items-center justify-between">
  <Label htmlFor="nttSj" className="text-[10px] font-black tracking-[0.3em] text-slate-400 group-focus-within:text-primary transition-all flex items-center gap-3 uppercase">
  <span className="w-2 h-2 rounded-full bg-primary" /> 寃뚯떆湲 ?쒕ぉ (Title)
  </Label>
 <span className="text-[10px] font-bold text-primary/40 tracking-tight">?꾩닔</span>
 </div>
 <Input
 id="nttSj"
 name="nttSj"
 placeholder="留ㅻ젰?곸씠怨?紐낇솗님?쒕ぉ님?낅젰?섏꽭님
 className={cn(
 "h-20 text-3xl font-black border-2 border-primary/5 focus:border-primary focus-visible:ring-primary/10 transition-all rounded-[1.75rem] px-8 bg-muted/30 shadow-inner group-focus-within:shadow-2xl group-focus-within:bg-background placeholder:text-muted-foreground/30",
 state?.field === 'nttSj' && "border-rose-500 bg-rose-50"
 )}
 required
 />
 </div>

 {/* Content Area */}
 <div className="space-y-6 group">
 <div className="flex items-center justify-between">
 <Label htmlFor="nttCn" className="text-[11px] font-black tracking-[0.3em] text-muted-foreground group-focus-within:text-primary transition-colors flex items-center gap-3">
 <FileText className="w-4 h-4" /> 02. 蹂몃Ц ?댁슜
 </Label>
 <span className="text-[10px] font-bold text-primary/40 tracking-tight">?꾩닔</span>
 </div>
 <div className="relative">
 <Textarea
 id="nttCn"
 name="nttCn"
 placeholder="?꾨떖?섍퀬님?섎뒗 ?댁슜님?곸꽭님?묒꽦?섏꽭님.."
 className={cn(
 "min-h-[500px] p-10 text-xl font-medium leading-loose border-2 border-primary/5 focus:border-primary focus-visible:ring-primary/10 transition-all rounded-[2.5rem] bg-muted/30 shadow-inner group-focus-within:shadow-2xl group-focus-within:bg-background resize-none",
 state?.field === 'nttCn' && "border-rose-500 bg-rose-50"
 )}
 required
 />
 <div className="absolute bottom-8 right-10 flex items-center gap-2.5 text-[10px] font-black text-muted-foreground/40 tracking-[0.2em] pointer-events-none bg-muted/50 px-4 py-2 rounded-full border border-primary/5 backdrop-blur-sm">
 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> ?꾩떆 ?님以? </div>
 </div>
 </div>

 {/* File Attachment Area */}
 <div className="space-y-6 group">
 <Label className="text-[11px] font-black tracking-[0.3em] text-muted-foreground flex items-center gap-3">
 <Paperclip className="w-4 h-4" /> 03. 泥⑤? ?뚯씪
 </Label>
 <div className="p-8 rounded-[2.5rem] border-2 border-dashed border-primary/10 bg-muted/20 hover:border-primary/30 transition-all">
 <StandardFileUploader
 onFilesChange={setFiles}
 maxFiles={5}
 maxSizeMB={20}
 />
 </div>
 </div>

 {/* Visual Guide / Notice */}
 <div className="p-10 bg-slate-900 rounded-[3rem] flex flex-col md:flex-row items-center gap-10 shadow-2xl relative overflow-hidden group/notice">
 <div className="absolute right-[-20%] top-[-50%] bg-primary/20 w-[400px] h-[400px] rounded-full blur-[100px] group-hover/notice:bg-primary/30 transition-all duration-1000" />
 <div className="w-20 h-20 bg-slate-800 rounded-[2.25rem] border border-slate-700 shadow-2xl flex items-center justify-center shrink-0 group-hover/notice:rotate-12 transition-transform">
 <CheckCircle2 className="w-8 h-8 text-primary" />
 </div>
 <div className="space-y-3 relative z-10 text-center md:text-left">
  <p className="font-black text-2xl text-slate-900 tracking-tight ">보안 以님?ы빆</p>
  <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-[450px]">
  ?묒꽦?섏떊 ?뺣낫님?꾨줈?앺듃 ?먯궛?쇰줈 등록?⑸땲님 <br />誘쇨컧님媛쒖씤?뺣낫님湲곕님님ы븿?섏? ?딅룄濡?二쇱쓽님二쇱꽭님
  </p>
 </div>
 </div>
 </CardContent>

  <CardFooter className="flex flex-col md:flex-row justify-center gap-6 py-20 border-t border-primary/5 bg-muted/5 px-12 md:px-20 rounded-b-[3.5rem]">
    <Button
      type="button"
      variant="ghost"
      onClick={() => router.back()}
      className="h-20 px-16 font-black tracking-[0.3em] text-sm text-muted-foreground hover:bg-background hover:text-rose-500 hover:shadow-2xl transition-all rounded-2xl active:scale-95 border-2 border-transparent"
    >
      <ArrowLeft className="w-5 h-5 mr-4" /> 痍⑥냼
    </Button>
    <Button
      type="submit"
      className="h-20 px-24 gap-4 font-black tracking-[0.3em] text-sm shadow-2xl shadow-primary/20 bg-primary hover:bg-primary/90 text-white transition-all active:scale-95 ring-[12px] ring-primary/5 rounded-2xl"
      disabled={isPending}
    >
      {isPending ? (
        <span className="flex items-center gap-3 animate-pulse">
          <div className="w-3 h-3 bg-white rounded-full" /> ?님以?..
        </span>
      ) : (
        <>
          <Send className="w-5 h-5" /> ?님        </>
      )}
    </Button>
  </CardFooter>
 </StandardForm>
 </Card>
 </div>
 );
};

const InsertBoardArticlePage = () => {
 return (
 <Suspense fallback={
 <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
 <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
 <p className="font-black text-muted-foreground animate-pulse">?먮뵒님濡쒕뱶 以?..</p>
 </div>
 }>
 <InsertBBSContent />
 </Suspense>
 );
};

export default InsertBoardArticlePage;
