'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/app/components/layout/page-header';
import { boardAdminService } from '@/services/foundation/system/BoardAdminService';
import { useToast } from '@/app/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Save,
  ArrowLeft,
  Layout,
  FileText,
  MessageSquare,
  ShieldCheck,
  Calendar,
  Settings2,
  CheckCircle2
} from 'lucide-react';
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
      nttSj: '',
      nttCn: '',
      ntceBgnde: '',
      ntceEndde: '',
      noticeAt: 'N' as 'Y' | 'N',
      secretAt: 'N' as 'Y' | 'N',
      useAt: 'Y' as 'Y' | 'N',
      eventDate: ''
    }
  });

  const onFormSubmit = async (data: z.infer<typeof boardSchema>) => {
    setLoading(true);
    try {
      console.log('>>> Submitting to boardAdminService.createBoardArticle...', data);
      const response = await boardAdminService.createBoardArticle(data as any);
      console.log('>>> API Response Success:', response);
      // 罹먯떆 臾댄슚??異붽?
      queryClient.invalidateQueries({ queryKey: ['boardList'] });
      toast('??寃뚯떆臾쇱씠 ?깃났?곸쑝濡??앹꽦?섏뿀?듬땲??', 'success');
      router.push(`/admin/community/boards/selectBoardList?bbsId=${data.bbsId}`);
    } catch (error) {
      console.error('>>> API Submission ERROR:', error);
      toast('寃뚯떆臾????以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-1000">
      <PageHeader
        title="寃뚯떆臾??꾪궎?띿쿂 ?뺤쓽"
        breadcrumbs={[{ label: '而ㅻ??덊떚' }, { label: '寃뚯떆??愿由? }, { label: '??寃뚯떆臾? }]}
        actions={
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="h-12 rounded-[0.1rem] font-black gap-2 border-slate-200"
          >
            <ArrowLeft size={18} /> ?댁쟾?쇰줈
          </Button>
        }
      />

      <div className="max-w-5xl mx-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-10">
            <Card className="border-none shadow-2xl rounded-[0.1rem] overflow-hidden bg-white ring-1 ring-slate-100">
              <CardHeader className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white p-10 pb-16 border-b border-slate-100 dark:border-slate-800 relative overflow-hidden">
                <div className="flex justify-between items-start relative z-10">
                  <div className="space-y-3">
                    <CardTitle className="text-4xl font-black tracking-tighter flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-[0.1rem]">
                        <FileText className="w-8 h-8 text-primary" />
                      </div>
                      ??肄섑뀗痢??꾧컻
                    </CardTitle>
                    <p className="text-slate-500 dark:text-slate-400 font-bold text-lg">?쒖뒪???꾩뿭??諛고룷???덈줈??寃뚯떆臾??곗씠?곕? ?뺤쓽?⑸땲??</p>
                  </div>
                  <div className="p-4 bg-primary/5 dark:bg-white/5 rounded-[0.1rem] backdrop-blur-xl border border-primary/10 dark:border-white/10 text-right">
                    <span className="text-[10px] font-black tracking-widest text-primary uppercase animate-pulse">Waiting for Submit</span>
                  </div>
                </div>
                {/* Background Decor */}
                <div className="absolute right-[-5%] top-[-10%] opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
                  <FileText size={180} className="rotate-12" />
                </div>
              </CardHeader>

              <CardContent className="p-10 -mt-8 space-y-10">
                {/* Basic Info Node */}
                <div className="bg-white rounded-[0.1rem] p-8 border border-slate-100 shadow-xl space-y-8">
                  <div className="flex items-center gap-3 border-b border-slate-50 pb-6 mb-2">
                    <div className="w-10 h-10 rounded-[0.1rem] bg-slate-50 flex items-center justify-center text-slate-400 font-black italic">01</div>
                    <h3 className="text-xl font-black tracking-tight">湲곕낯 硫뷀??곗씠??/h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormField
                      control={form.control}
                      name="bbsId"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Layout size={14} className="text-primary" /> 寃뚯떆???앸퀎??(BBS_ID)
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="BBS_0000000000000001"
                              className="h-14 rounded-[0.1rem] bg-slate-50/50 border-slate-100 font-black text-lg focus:bg-white focus:ring-4 focus:ring-primary/10 transition shadow-inner"
                            />
                          </FormControl>
                          <FormMessage className="text-[10px] font-bold text-rose-500" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="nttSj"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <MessageSquare size={14} className="text-primary" /> 寃뚯떆臾??쒕ぉ
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="寃뚯떆臾쇱쓽 ?듭떖 ?쒕ぉ???낅젰?섏떗?쒖삤."
                              className="h-14 rounded-[0.1rem] font-black text-lg focus:ring-4 focus:ring-primary/10 transition shadow-sm"
                            />
                          </FormControl>
                          <FormMessage className="text-[10px] font-bold text-rose-500" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Content Body Node */}
                <div className="bg-white rounded-[0.1rem] p-8 border border-slate-100 shadow-xl space-y-8">
                  <div className="flex items-center gap-3 border-b border-slate-50 pb-6 mb-2">
                    <div className="w-10 h-10 rounded-[0.1rem] bg-slate-50 flex items-center justify-center text-slate-400 font-black italic">02</div>
                    <h3 className="text-xl font-black tracking-tight">蹂몃Ц 肄섑뀗痢??곗씠??/h3>
                  </div>

                  <FormField
                    control={form.control}
                    name="nttCn"
                    render={({ field }) => (
                      <FormItem className="space-y-4">
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="蹂몃Ц ?댁슜???곸꽭??湲곗닠?섏떗?쒖삤. 留덊겕?ㅼ슫 諛?HTML ?뚯떛??吏?먰빀?덈떎."
                            className="min-h-[400px] p-10 rounded-[0.1rem] border-2 border-slate-50 bg-slate-50/30 focus:bg-white focus:ring-8 focus:ring-primary/5 transition text-lg font-medium leading-relaxed resize-none shadow-inner"
                          />
                        </FormControl>
                        <FormMessage className="text-[10px] font-bold text-rose-500" />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Policy & Date Node */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="bg-slate-50/50 rounded-[0.1rem] p-8 border border-slate-100 space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-200/50 pb-4">
                      <ShieldCheck size={18} className="text-primary" />
                      <h4 className="font-black text-sm uppercase tracking-widest text-slate-900">諛고룷 諛?蹂댁븞 ?뺤콉</h4>
                    </div>

                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="noticeAt"
                        render={({ field }) => (
                          <div className="flex items-center justify-between p-4 bg-white rounded-[0.1rem] shadow-sm border border-slate-100">
                            <div className="space-y-0.5">
                              <Label className="text-sm font-black text-slate-800">怨듭??ы빆 ?ㅼ젙</Label>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Notification Priority</p>
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
                          <div className="flex items-center justify-between p-4 bg-white rounded-[0.1rem] shadow-sm border border-slate-100">
                            <div className="space-y-0.5">
                              <Label className="text-sm font-black text-slate-800">鍮꾨?湲 蹂댄샇</Label>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Privacy Guard</p>
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

                  <div className="bg-slate-50/50 rounded-[0.1rem] p-8 border border-slate-100 space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-200/50 pb-4">
                      <Calendar size={18} className="text-primary" />
                      <h4 className="font-black text-sm uppercase tracking-widest text-slate-900">寃뚯떆 湲곌컙 ?ㅼ?以꾨쭅</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="ntceBgnde"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">寃뚯떆 ?쒖옉??/FormLabel>
                            <FormControl>
                              <Input type="date" {...field} className="h-14 rounded-[0.1rem] border-slate-200 font-bold" />
                            </FormControl>
                            <FormMessage className="text-[10px] font-bold text-rose-500" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="ntceEndde"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">寃뚯떆 醫낅즺??/FormLabel>
                            <FormControl>
                              <Input type="date" {...field} className="h-14 rounded-[0.1rem] border-slate-200 font-bold" />
                            </FormControl>
                            <FormMessage className="text-[10px] font-bold text-rose-500" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="eventDate"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-[10px] font-black text-slate-400 uppercase tracking-widest">?됱궗/?대깽???쇱옄</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} className="h-14 rounded-[0.1rem] border-slate-200 font-bold bg-primary/5" />
                            </FormControl>
                            <FormMessage className="text-[10px] font-bold text-rose-500" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Final Action Area */}
                <div className="flex items-center justify-between pt-10 border-t-2 border-slate-50 border-dashed">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/5 rounded-[0.1rem] flex items-center justify-center">
                      <Settings2 size={24} className="text-primary animate-spin-slow" />
                    </div>
                    <div className="text-left">
                      <p className="font-black text-slate-800">?쒖뒪???숆린??以鍮??꾨즺</p>
                      <p className="text-[10px] font-bold text-slate-400">ID, ?쒕ぉ, 蹂몃Ц ???꾩닔 ?꾨뱶 臾닿껐???뺤씤??/p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => router.back()}
                      className="h-16 px-10 rounded-[0.1rem] font-black text-sm uppercase tracking-widest hover:bg-slate-50"
                    >
                      痍⑥냼
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="h-20 px-16 bg-slate-900 dark:bg-primary text-white rounded-[0.1rem] font-black text-[11px] tracking-[0.4em] uppercase shadow-[0_24px_48px_-8px_rgba(15,23,42,0.3)] dark:shadow-primary/40 transition hover:-translate-y-2 active:scale-95 flex items-center gap-4"
                    >
                      <Save size={20} />
                      {loading ? 'DEPLOYING...' : '?대깽??寃뚯떆'}
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
