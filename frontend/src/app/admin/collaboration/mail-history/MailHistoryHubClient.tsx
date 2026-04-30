'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  RefreshCcw,
  Mail,
  Search,
  Plus,
  Trash2,
  Zap,
  ArrowUpRight,
  Clock,
  Sparkles,
  Layers,
  Send,
  Loader2,
  ShieldCheck,
  User,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/app/components/ui/toast';
import { mailService, SentMail } from '@/services/business/mail/MailService';
import { motion, AnimatePresence } from 'framer-motion';
import { hubContainerVariants, hubItemVariants } from '@/lib/hub-animations';
import { Badge } from '@/components/ui/badge';
import { HubListSkeleton, HubDetailSkeleton } from '@/components/ui/hub/HubSkeleton';

export default function MailHistoryHubClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // --- Data Fetching ---
  const { data: mailData, isLoading } = useQuery({
    queryKey: ['mail-history', searchKeyword],
    queryFn: () => mailService.getSentMails({ page: 0, size: 50, searchKeyword }),
  });
  const mails = (mailData as any)?.list || [];

  // --- Mutations ---
  const deleteMailMutation = useMutation({
    mutationFn: (mssageId: string) => mailService.deleteMail(mssageId),
    onSuccess: () => {
      toast('메일이 성공적으로 삭제되었습니다.', 'success');
      queryClient.invalidateQueries({ queryKey: ['mail-history'] });
      setSelectedItemId(null);
    },
    onError: () => {
      toast('메일 삭제에 실패했습니다.', 'error');
    }
  });

  const handleDelete = () => {
    if (!selectedItemId) return;
    if (confirm('정말 이 메일 이력을 삭제하시겠습니까?')) {
      deleteMailMutation.mutate(selectedItemId);
    }
  };

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return mails.find((m: SentMail) => m.mssageId === selectedItemId);
  }, [selectedItemId, mails]);

  return (
    <motion.div 
        initial="hidden"
        animate="visible"
        variants={hubContainerVariants}
        className="space-y-12 pb-24 pt-8"
    >
      {/* 1. Header */}
      <motion.div variants={hubItemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-10 px-2">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <span className="text-[10px] font-black tracking-[0.5em] text-primary uppercase leading-none px-3 py-1 bg-primary/5 rounded-full border border-primary/10">Mail Archive</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none transition-colors">
            Dispatch <span className="text-primary">History</span>
          </h1>
          <p className="text-sm font-bold text-slate-400 max-w-lg leading-relaxed uppercase tracking-widest italic">
            Enterprise mail dispatch logs and transmission status.
          </p>
        </div>
        <div className="flex items-center gap-4">
            <Button 
                onClick={() => router.push('/admin/collaboration/mail-send')}
                className="h-16 px-10 rounded-xl bg-slate-900 text-white font-black tracking-widest text-[11px] uppercase hover:scale-105 active:scale-95 transition-all shadow-2xl gap-3 group"
            >
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" /> New Dispatch
            </Button>
        </div>
      </motion.div>

      {/* 2. Operations Grid */}
      <motion.div variants={hubItemVariants} className="grid grid-cols-12 gap-8 px-2">
        
        {/* List Column */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-6 h-full min-h-[600px]">
          <div className="hub-glass-premium flex-1 rounded-2xl border-2 border-slate-100/50 shadow-2xl overflow-hidden flex flex-col bg-white">
            <div className="p-8 border-b border-slate-100 space-y-6 bg-white/30 backdrop-blur-3xl">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-slate-400 tracking-[0.4em] uppercase italic">
                  Dispatch Stream
                </h3>
                <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries()} className="h-10 px-4 text-[9px] font-black tracking-widest gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg">
                  <RefreshCcw size={12} className="text-primary" /> RELOAD
                </Button>
              </div>
              <div className="relative group/search">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/search:text-primary transition-colors" size={18} />
                <Input
                  className="pl-14 h-14 bg-white border-2 border-slate-100 rounded-xl text-sm font-black shadow-inner placeholder:text-slate-200 focus:ring-0 focus:border-primary/20 transition-all"
                  placeholder="메일 제목 또는 수신자 검색..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  aria-label="메일 검색"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              {isLoading ? <HubListSkeleton /> : (
                <div className="space-y-4">
                  {mails.map((mail: SentMail) => (
                    <motion.div
                      key={mail.mssageId}
                      data-testid="mail-item"
                      layout
                      onClick={() => setSelectedItemId(mail.mssageId)}
                      className={cn(
                        "group p-6 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between relative overflow-hidden",
                        selectedItemId === mail.mssageId
                          ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.02]"
                          : "bg-white border-slate-50 hover:border-primary/20 text-slate-600 shadow-sm"
                      )}
                    >
                      <div className="flex items-start gap-6 relative z-10">
                        <div className={cn(
                          "w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-lg border transition-all",
                          selectedItemId === mail.mssageId 
                            ? "bg-primary text-white border-primary/20 rotate-6" 
                            : "bg-slate-50 text-slate-400 border-slate-100 group-hover:rotate-6"
                        )}>
                          <Mail size={24} />
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <span className={cn(
                                    "text-[8px] font-black tracking-widest uppercase italic font-mono",
                                    selectedItemId === mail.mssageId ? "text-primary" : "text-slate-400"
                                )}>
                                    MAIL_PROTOCOL
                                </span>
                                <span className="text-[10px] font-black opacity-30 tabular-nums">
                                    {mail.createdDate?.substring(0, 10)}
                                </span>
                            </div>
                          <h4 className={cn("text-lg font-black tracking-tighter leading-none truncate max-w-[200px]", selectedItemId === mail.mssageId ? "text-white" : "text-slate-900")}>
                            {mail.sj}
                          </h4>
                          <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">To: {mail.recptnPerson}</p>
                        </div>
                      </div>
                      <div className="relative z-10">
                        {mail.sndngResultCode === '1' ? (
                          <div className="flex flex-col items-end">
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black text-[8px] px-2">SUCCESS</Badge>
                          </div>
                        ) : (
                          <Badge className="bg-rose-500/10 text-rose-500 border-none font-black text-[8px] px-2">FAILED</Badge>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  {mails.length === 0 && (
                    <div className="p-20 text-center opacity-20">
                      <Mail size={48} className="mx-auto mb-4" />
                      <p className="text-xs font-black uppercase tracking-widest">No Records Found</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Detail Column */}
        <div className="col-span-12 lg:col-span-7 h-full">
          <AnimatePresence mode="wait">
            {selectedItemId ? (
              <motion.div
                key={selectedItemId}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full"
              >
                <div className="hub-glass-premium h-full rounded-2xl border-2 border-primary/20 shadow-2xl overflow-hidden flex flex-col bg-white">
                  <div className="p-10 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-transparent flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-2xl">
                           <Sparkles size={24} />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tighter italic leading-none uppercase">Mail Intelligence</h2>
                            <p className="text-[9px] font-black text-slate-400 tracking-widest uppercase italic">ID: {selectedItemId}</p>
                        </div>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-primary/20 font-black text-[9px] px-3 py-1.5 rounded-full uppercase tracking-widest italic">Verified Logs</Badge>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-12 space-y-10 scrollbar-hide">
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recipient_Node</span>
                          <div className="p-4 bg-slate-50 rounded-xl flex items-center gap-3">
                            <User size={16} className="text-primary" />
                            <span className="text-sm font-bold text-slate-900">{selectedItem?.recptnPerson}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dispatch_Timestamp</span>
                          <div className="p-4 bg-slate-50 rounded-xl flex items-center gap-3">
                            <Clock size={16} className="text-primary" />
                            <span className="text-sm font-bold text-slate-900">{selectedItem?.createdDate}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 pt-4">
                        <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic underline decoration-primary/20 underline-offset-8 leading-tight">
                          {selectedItem?.sj}
                        </h3>
                        <div className="p-10 rounded-2xl bg-slate-50 border border-slate-100 shadow-inner min-h-[200px]">
                          <p className="text-slate-600 text-lg font-medium leading-relaxed whitespace-pre-wrap italic">
                            {selectedItem?.emailCn}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 border-t border-slate-100 bg-slate-50/50 backdrop-blur-xl flex gap-4">
                    <Button 
                      onClick={handleDelete}
                      disabled={deleteMailMutation.isPending}
                      data-testid="delete-mail-btn"
                      variant="outline"
                      className="h-16 w-full rounded-xl border-2 border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-500/20 hover:bg-rose-50 transition-all shadow-xl font-black tracking-widest text-[11px] uppercase gap-3"
                    >
                      {deleteMailMutation.isPending ? <Loader2 className="animate-spin" /> : (
                        <>
                          <Trash2 size={20} /> Purge Record
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="hub-glass-premium h-full rounded-2xl border-4 border-dashed border-slate-100 bg-white/30 flex flex-col items-center justify-center p-32 text-center group">
                <div className="w-32 h-32 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-200 group-hover:text-primary/20 transition-all duration-1000 rotate-12 group-hover:rotate-45 mb-10 border-2 border-slate-100 shadow-inner">
                    <Layers size={64} />
                </div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic leading-none uppercase opacity-30">
                  Select Dispatch Node
                </h3>
                <p className="text-[10px] mt-6 font-black tracking-[0.3em] uppercase opacity-20 max-w-xs mx-auto leading-relaxed">
                    발신 이력 스트림에서 데이터를 선택하여 상세 전송 프로토콜을 확인하십시오.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
