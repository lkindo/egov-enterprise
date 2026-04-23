'use client';

import React, { useState } from 'react';
import { z } from 'zod';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { smsAdminService, SmsDto } from '@/services/foundation/operation/SmsAdminService';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
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
  TrendingUp,
  Mail,
  Zap,
  ShieldCheck,
  ChevronRight
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
import { motion, AnimatePresence } from 'framer-motion';
import { smsSchema } from '@/lib/validation/schemas';
import { useAppForm } from '@/hooks/useAppForm';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

export default function SmsAdminClient({ 
  initialSmsList 
}: { 
  initialSmsList: any 
}) {
  const [loading, setLoading] = useState(false);
  const [smsList, setSmsList] = useState(initialSmsList.list || []);
  const [totalCount, setTotalCount] = useState(initialSmsList.total || 0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSendOpen, setIsSendOpen] = useState(false);
  
  // Send SMS Form
  const form = useAppForm(smsSchema, {
    defaultValues: {
      trnsmitTelno: '02-1234-5678', // 諛쒖떊踰덊샇 (湲곕낯媛?
      recptnTelno: '',
      trnsmitCn: ''
    }
  });

  const handleSearch = async () => {
    setLoading(true);
    try {
      const res = await smsAdminService.getSmsList({ searchKeyword });
      setSmsList(res.list);
      setTotalCount(res.total);
    } catch (error) {
      toast.error('諛쒖넚 ?댁뿭??遺덈윭?ㅼ? 紐삵뻽?듬땲??');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (data: z.infer<typeof smsSchema>) => {
    setLoading(true);
    try {
      await smsAdminService.sendSms(data as any);
      toast.success('臾몄옄 硫붿떆吏瑜?諛쒖넚?덉뒿?덈떎.');
      setIsSendOpen(false);
      form.reset();
      handleSearch(); // 紐⑸줉 媛깆떊
    } catch (error) {
      toast.error('諛쒖넚???ㅽ뙣?덉뒿?덈떎.');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: '諛쒖넚 ?쇱떆',
      accessor: (item: SmsDto) => (
        <div className="flex items-center gap-4 py-2">
          <div className="w-10 h-10 rounded-[0.1rem] bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 shadow-inner">
            <Calendar size={16} />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-mono font-black text-foreground tracking-tighter leading-none">
              {item.trnsmitPnttm ? format(new Date(item.trnsmitPnttm), 'yyyy.MM.dd') : 'N/A'}
            </span>
            <span className="text-[9px] font-bold text-muted-foreground mt-1 tracking-widest opacity-40">
              {item.trnsmitPnttm ? format(new Date(item.trnsmitPnttm), 'HH:mm:ss') : 'WAITING'}
            </span>
          </div>
        </div>
      )
    },
    {
      header: '諛쒖떊 踰덊샇',
      accessor: (item: SmsDto) => (
        <div className="flex items-center gap-3">
          <Phone size={14} className="text-primary opacity-50" />
          <span className="font-black text-foreground tracking-tighter">{item.trnsmitTelno}</span>
        </div>
      )
    },
    {
      header: '硫붿떆吏 ?댁슜',
      accessor: (item: SmsDto) => (
        <div className="max-w-[450px] truncate font-bold text-muted-foreground/80 tracking-tight italic text-left">
          "{item.trnsmitCn}"
        </div>
      )
    },
    {
      header: '?곹깭',
      accessor: () => (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20 w-fit shadow-sm">
          <ShieldCheck size={14} />
          <span className="text-[9px] font-black tracking-widest uppercase">?꾩넚?꾨즺</span>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="硫붿떆吏 ?ㅼ??ㅽ듃?덉씠??
        breadcrumbs={[{ label: '遺媛?쒕퉬?? }, { label: '臾몄옄硫붿떆吏 ?붿쭊' }]}
      />

      <HubHeader 
        title="SMS ?몃옖??뀡" 
        highlight="留ㅽ듃由?뒪" 
        subtitle="?쒖뒪???먮룞 ?뚮┝ 諛?蹂댁븞 ?몄쬆 臾몄옄 硫붿떆吏 ?꾩넚 ?꾩뭅?대툕 愿由? 
        icon={Send} 
        actions={
          <div className="flex gap-4 p-2 items-center">
            <Button
              variant="outline"
              size="lg"
              onClick={handleSearch}
              className="h-12 rounded-[0.1rem] border-2 font-black text-[10px] tracking-widest uppercase gap-2"
            >
              <RefreshCcw size={16} className={cn(loading && "animate-spin")} /> 濡쒓렇 ?숆린??            </Button>
            <Button
              size="lg"
              onClick={() => setIsSendOpen(true)}
              className="h-12 px-8 rounded-[0.1rem] font-black text-[10px] tracking-widest uppercase shadow-lg shadow-primary/20 hover:-translate-y-1 transition gap-2"
            >
              <Plus size={18} /> ??硫붿떆吏 援ъ꽦
            </Button>
          </div>
        }
      />

      {/* Luxury Stats Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-2">
        <SummaryBlock 
          title="ACCUMULATED LOGS" 
          value={totalCount.toLocaleString()} 
          icon={<History size={26} />} 
          status="?덉젙"
          color="text-slate-900"
        />
        <SummaryBlock 
          title="DELIVERY SUCCESS" 
          value={totalCount.toLocaleString()} 
          icon={<Zap size={26} />} 
          status="NOMINAL"
          color="text-primary"
        />
        <SummaryBlock 
          title="FAILED ATTEMPTS" 
          value="0" 
          icon={<AlertCircle size={26} />} 
          status="CRITICAL"
          color="text-rose-500"
          bg="bg-rose-500/5 shadow-rose-500/5 border-rose-500/20"
        />
      </div>

      {/* Main Stream Area */}
      <HubSectionCard
        title="硫붿떆吏 ?꾩넚 ?ㅽ듃由?
        description="?쒖뒪?쒖뿉??泥섎━??紐⑤뱺 ?꾩썐諛붿슫??硫붿떆吏 ?몃옒?쎌쓽 ?ㅼ떆媛?湲곕줉?낅땲??"
        icon={MessageSquare}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-10 border-b border-border/30">
          <div className="text-left">
            <h3 className="text-2xl font-black tracking-tighter uppercase leading-none text-left">?꾩넚 濡쒓렇</h3>
            <p className="text-[9px] font-bold text-muted-foreground tracking-[0.3em] uppercase mt-2 opacity-50 text-left">硫붿떆吏 異쒕젰 紐⑤땲?곕쭅</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative group/search flex-1 md:flex-none">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/search:opacity-100 transition-opacity" size={16} />
              <Input
                placeholder="寃??.."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="h-14 pl-12 pr-6 w-full md:w-[320px] bg-slate-50 border-none rounded-[0.1rem] text-[10px] font-black tracking-widest uppercase shadow-inner focus:ring-4 focus:ring-primary/10 transition font-mono"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <StandardDataTable
            columns={columns}
            data={smsList}
            loading={loading}
            emptyMessage="?쒖뒪?쒖뿉 ?깅줉??硫붿떆吏 ?댁뿭??議댁옱?섏? ?딆뒿?덈떎."
            className="border-none bg-transparent"
          />
        </div>
      </HubSectionCard>

      {/* Send Message Composition Dialog */}
      <Dialog open={isSendOpen} onOpenChange={setIsSendOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-[0.1rem] p-0 border-none shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] bg-white/95 backdrop-blur-3xl overflow-hidden relative">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSend)}>
              <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-primary/10 blur-[80px] rounded-full pointer-events-none" />
              
              <DialogHeader className="p-12 pb-0 space-y-6 relative z-10">
                <div className="w-20 h-20 bg-slate-900 text-white rounded-[0.1rem] flex items-center justify-center shadow-2xl shadow-primary/30 mx-auto transition-transform hover:rotate-12 duration-500 border-4 border-white/20">
                  <Send size={32} />
                </div>
                <div className="text-center space-y-2">
                  <DialogTitle className="text-4xl font-black text-slate-900 tracking-tighter leading-none uppercase">硫붿떆吏 ?묒꽦</DialogTitle>
                  <DialogDescription className="text-[10px] font-black tracking-[0.4em] uppercase opacity-40">
                    Outbound Message Configuration
                  </DialogDescription>
                </div>
              </DialogHeader>
              
              <div className="p-12 space-y-10 relative z-10 text-left">
                <FormField
                  control={form.control}
                  name="recptnTelno"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <FormLabel className="text-[11px] font-black text-slate-400 tracking-[0.2em] uppercase ml-2 flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        Target Terminal Number
                      </FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={20} />
                          <Input
                            {...field}
                            placeholder="010-0000-0000"
                            className="h-18 pl-16 pr-8 rounded-[0.1rem] border-none bg-slate-50 text-xl font-black tabular-nums focus:bg-white focus:ring-8 focus:ring-primary/5 transition shadow-inner uppercase tracking-wider"
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="trnsmitCn"
                  render={({ field }) => (
                    <FormItem className="space-y-4">
                      <FormLabel className="text-[11px] font-black text-slate-400 tracking-[0.2em] uppercase ml-2 flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        Payload Content
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Textarea
                            {...field}
                            placeholder="硫붿떆吏 ?댁슜???낅젰?섏꽭??.."
                            className="min-h-[180px] p-8 rounded-[0.1rem] border-none bg-slate-50 text-base font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:bg-white focus:ring-8 focus:ring-primary/5 transition resize-none shadow-inner leading-relaxed"
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-[10px] font-bold" />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter className="p-12 pt-0 relative z-10 gap-4 flex !justify-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsSendOpen(false)}
                  className="h-18 px-10 rounded-[0.1rem] border-2 border-slate-100 font-black text-[11px] tracking-widest uppercase hover:bg-slate-50 transition hover:border-slate-200"
                >
                  Terminate
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-18 px-16 bg-slate-900 border-none text-white rounded-[0.1rem] font-black text-[11px] tracking-[0.3em] uppercase shadow-2xl hover:bg-primary transition hover:-translate-y-1 active:scale-95 flex items-center gap-3 flex-1"
                >
                  {loading ? <RefreshCcw size={18} className="animate-spin" /> : <Zap size={18} />}
                  Execute Send
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryBlock({ title, value, icon, status, color, bg }: any) {
  return (
    <div className={cn("hub-table-container p-12 group hover:scale-[1.02] transition relative overflow-hidden bg-white text-left", bg)}>
      <div className="flex justify-between items-start mb-10">
        <div className={cn("w-14 h-14 rounded-[0.1rem] bg-slate-50 flex items-center justify-center shadow-inner border border-border/10 group-hover:rotate-12 transition-transform", color)}>
          {icon}
        </div>
        <HubStatusBadge label={`SYSTEM STATUS: ${status}`} variant="default" className="text-[8px] font-black tracking-widest shadow-sm" />
      </div>
      <div>
        <h3 className="text-4xl font-black tracking-tighter text-foreground leading-none tabular-nums">{value}</h3>
        <p className="text-[10px] font-black text-muted-foreground/40 tracking-[0.4em] uppercase mt-4 leading-none">{title}</p>
      </div>
      <div className="absolute right-[-14%] bottom-[-14%] opacity-[0.02] group-hover:scale-125 group-hover:rotate-12 transition duration-1000 grayscale pointer-events-none">
        {React.cloneElement(icon, { size: 180 })}
      </div>
    </div>
  );
}

const Smartphone = ({ className, size }: { className?: string, size?: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>
  </svg>
);
