'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { helpUserService, FAQ, QNA } from '@/services/business/user/help/HelpUserService';
import { useToast } from '@/app/components/ui/toast';
import { HelpCircle, MessageCircle, ChevronDown, ChevronUp, Search, PlusCircle, Sparkles, Hash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { ErrorStateDisplay, EmptyStateDisplay } from '@/app/components/ui/status-displays';

export default function HelpCenterPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<'faq' | 'qna'>('faq');
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [qnas, setQnas] = useState<QNA[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        if (tab === 'faq') {
          const res = await helpUserService.getFaqs({ keyword: searchKeyword });
          setFaqs(res.list || []);
        } else {
          const res = await helpUserService.getQnas({ page: 0, size: 10, keyword: searchKeyword });
          setQnas(res.list || []);
        }
      } catch {
        toast('?꾩?留??곗씠?곕? 遺덈윭?ㅼ? 紐삵뻽?듬땲??', 'error');
      } finally {
        setLoading(false);
      }
    }, 300); // Debounce
    return () => clearTimeout(timer);
  }, [tab, searchKeyword, toast]);

  const qnaColumns = [
    {
      header: '?쒕ぉ',
      accessor: (item: QNA) => <span className="font-bold text-foreground/80">{item.qestnSj}</span>,
    },
    {
      header: '?묒꽦??,
      accessor: (item: QNA) => <span className="text-muted-foreground/60 font-medium">{item.wrterNm}</span>
    },
    {
      header: '?깅줉??,
      accessor: (item: QNA) => <span className="text-muted-foreground/40 font-mono text-xs">{item.writngDe}</span>
    },
    {
      header: '?곹깭',
      accessor: (item: QNA) => (
        <StatusBadge status={item.qnaProcessSttusCode === '3' ? 'Y' : 'R'} />
      )
    }
  ];

  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24 p-8 animate-in fade-in duration-1000">
      <PageHeader
        title="?꾩?留?而ㅼ뒪?곕㉧ ?쇳꽣"
        breadcrumbs={[{ label: '吏?먯꽌鍮꾩뒪' }, { label: '?꾩?留먯꽱?? }]}
      />

      <div className="hub-glass-premium rounded-[0.1rem] p-16 text-center relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
            <Sparkles size={200} className="text-primary" />
        </div>
        <div className="relative z-10 space-y-6">
            <h2 className="text-5xl hub-title-normal hub-text-gradient">_ 臾댁뾿???꾩??쒕┫源뚯슂?</h2>
            <p className="text-muted-foreground text-lg font-medium max-w-2xl mx-auto uppercase tracking-tight">?먯＜ 臾삳뒗 吏덈Ц???뺤씤?섍굅??1:1 ?꾨떞 臾몄쓽瑜??듯빐 臾몄젣瑜??좎냽?섍쾶 ?닿껐?섏꽭??</p>
            <div className="max-w-xl mx-auto relative mt-12 scale-100 group-hover:scale-[1.02] transition-transform">
            <Search className="absolute left-6 top-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" size={24} />
            <input
                type="text"
                placeholder="?ㅼ썙?쒕줈 ?좎냽?섍쾶 寃?됲븯?몄슂..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full h-16 pl-16 pr-6 rounded-[0.1rem] bg-background/50 border-2 border-border focus:border-primary text-foreground text-lg font-bold outline-none focus:ring-8 focus:ring-primary/5 transition-all placeholder:text-muted-foreground/30"
            />
            </div>
        </div>
      </div>

      <div className="flex justify-center p-2 bg-muted rounded-[0.1rem] w-fit mx-auto">
        <TabButton
          active={tab === 'faq'}
          onClick={() => setTab('faq')}
          icon={<HelpCircle size={22} />}
          label="FAQ ?먯＜ 臾삳뒗 吏덈Ц"
        />
        <TabButton
          active={tab === 'qna'}
          onClick={() => setTab('qna')}
          icon={<MessageCircle size={22} />}
          label="1:1 Q&A ?듭뒪?쇳듃 ?곷떞"
        />
      </div>

      <div className="space-y-6">
        <AnimatePresence mode="wait">
          {tab === 'faq' ? (
            <motion.div 
              key="faq-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {faqs.length === 0 ? (
                <EmptyStateDisplay message="?깅줉???먯＜ 臾삳뒗 吏덈Ц???놁뒿?덈떎." className="bg-card border-2 border-dashed border-border" />
              ) : (
                faqs.map((faq) => (
                  <div key={faq.faqId} className="bg-card border-2 border-border/40 rounded-[0.1rem] overflow-hidden transition-all hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/20 scale-100 hover:scale-[1.005]">
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === faq.faqId ? null : faq.faqId)}
                      className="w-full px-12 py-10 flex items-center justify-between group text-left"
                    >
                      <span className="font-black text-2xl text-foreground group-hover:text-primary transition-colors flex items-start gap-4 tracking-tighter">
                        <span className="text-primary opacity-30 text-3xl">Q.</span> {faq.qestnSj}
                      </span>
                      <div className={cn("w-12 h-12 rounded-[0.1rem] flex items-center justify-center transition-all", expandedFaq === faq.faqId ? "bg-primary text-white rotate-180" : "bg-muted font-black text-muted-foreground group-hover:bg-accent")}>
                        <ChevronDown size={24} />
                      </div>
                    </button>
                    {expandedFaq === faq.faqId && (
                      <div className="px-12 pb-12 pt-2">
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-10 bg-accent/30 rounded-[0.1rem] border-2 border-accent/50 text-foreground/80 font-bold leading-[1.8] text-lg flex items-start gap-4 shadow-inner"
                        >
                          <span className="text-primary/20 text-3xl font-black shrink-0 pt-1">A.</span>
                          {faq.answerCn}
                        </motion.div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="qna-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8 bg-card p-12 rounded-[0.1rem] border-2 border-border/40 shadow-xl overflow-hidden"
            >
              <div className="flex justify-between items-center pb-8 border-b border-border/40">
                  <div className="space-y-1">
                      <h3 className="text-2xl font-black tracking-tight uppercase">_ ??臾몄쓽 ?댁뿭</h3>
                      <p className="text-[10px] font-black text-muted-foreground tracking-[0.3em] uppercase">Private Interaction History</p>
                  </div>
                  <Button className="h-14 px-8 rounded-[0.1rem] bg-foreground text-background border-none font-black text-[11px] tracking-widest gap-3 shadow-2xl hover:bg-primary hover:text-white transition-all uppercase">
                      <PlusCircle size={20} /> ?덈줈??臾몄쓽 ?묒꽦
                  </Button>
              </div>
              <StandardDataTable
                columns={qnaColumns}
                data={qnas}
                loading={loading}
                emptyMessage="?깅줉??Q&A 臾몄쓽 ?댁뿭???놁뒿?덈떎."
                className="border-none shadow-none rounded-none"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-10 py-5 rounded-[0.1rem] font-black text-[11px] transition-all duration-500 uppercase tracking-widest",
        active
          ? "bg-background text-foreground shadow-2xl scale-105 z-10"
          : "text-muted-foreground/60 hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
