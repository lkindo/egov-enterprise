'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { helpUserService, FAQ, QNA } from '@/services/business/user/help/HelpUserService';
import { useToast } from '@/app/components/ui/toast';
import { HelpCircle, MessageCircle, ChevronDown, ChevronUp, Search, PlusCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { Button } from '@/components/ui/button';

export default function HelpCenterPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<'faq' | 'qna'>('faq');
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [qnas, setQnas] = useState<QNA[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  useEffect(() => {
    async function loadHelpData() {
      try {
        setLoading(true);
        if (tab === 'faq') {
          const res = await helpUserService.getFaqs({});
          setFaqs(res.list || []);
        } else {
          const res = await helpUserService.getQnas({ page: 0, size: 10 });
          setQnas(res.list || []);
        }
      } catch {
        toast('?꾩?留??곗씠?곕? 遺덈윭?ㅼ? 紐삵뻽?듬땲??', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadHelpData();
  }, [tab, toast]);

  const qnaColumns = [
    {
      header: '?쒕ぉ',
      accessor: (item: QNA) => <span className="font-bold text-slate-700">{item.qestnSj}</span>,
    },
    {
      header: '?묒꽦??,
      accessor: (item: QNA) => <span className="text-slate-500 font-medium">{item.wrterNm}</span>
    },
    {
      header: '?깅줉??,
      accessor: (item: QNA) => <span className="text-slate-400 font-mono text-xs">{item.writngDe}</span>
    },
    {
      header: '?곹깭',
      accessor: (item: QNA) => (
        <StatusBadge status={item.qnaProcessSttusCode === '3' ? 'Y' : 'R'} />
      )
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24 p-8 animate-in fade-in duration-1000">
      <PageHeader
        title="?꾩?留?而ㅼ뒪?곕㉧ ?쇳꽣"
        breadcrumbs={[{ label: '吏?먯꽌鍮꾩뒪' }, { label: '?꾩?留먯꽱?? }]}
      />

      <div className="bg-slate-900 rounded-[0.1rem] p-16 text-white text-center shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
            <Sparkles size={200} className="text-primary" />
        </div>
        <div className="relative z-10 space-y-6">
            <h2 className="text-5xl font-black tracking-tighter leading-tight">臾댁뾿???꾩??쒕┫源뚯슂?</h2>
            <p className="text-slate-400 text-lg font-medium max-w-2xl mx-auto">?먯＜ 臾삳뒗 吏덈Ц???뺤씤?섍굅??1:1 ?꾨떞 臾몄쓽瑜??듯빐 臾몄젣瑜??좎냽?섍쾶 ?닿껐?섏꽭??</p>
            <div className="max-w-xl mx-auto relative mt-12 scale-100 group-hover:scale-[1.02] transition-transform">
            <Search className="absolute left-6 top-5 text-slate-300" size={24} />
            <input
                type="text"
                placeholder="?ㅼ썙?쒕줈 ?좎냽?섍쾶 寃?됲븯?몄슂..."
                className="w-full h-16 pl-16 pr-6 rounded-[0.1rem] bg-white/10 border border-white/10 text-white text-lg font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:ring-4 focus:ring-primary/20 backdrop-blur-md placeholder:text-slate-500"
            />
            </div>
        </div>
      </div>

      <div className="flex justify-center p-2 bg-slate-100 rounded-[0.1rem] w-fit mx-auto">
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

      <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-700">
        {tab === 'faq' ? (
          faqs.length === 0 ? (
            <div className="text-center py-32 bg-white rounded-[0.1rem] border-2 border-dashed border-slate-100 flex flex-col items-center gap-4">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                    <Search size={32} />
                </div>
                <p className="font-black text-slate-300 uppercase tracking-widest">?깅줉???먯＜ 臾삳뒗 吏덈Ц???놁뒿?덈떎.</p>
            </div>
          ) : (
            faqs.map((faq) => (
              <div key={faq.faqId} className="bg-white border-2 border-slate-50 rounded-[0.1rem] overflow-hidden transition hover:shadow-2xl hover:shadow-slate-200/50 hover:border-primary/20 scale-100 hover:scale-[1.01]">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === faq.faqId ? null : faq.faqId)}
                  className="w-full px-12 py-10 flex items-center justify-between group"
                >
                  <span className="font-black text-2xl text-slate-800 group-hover:text-primary transition-colors text-left flex items-start gap-4">
                    <span className="text-primary opacity-30 text-3xl italic">Q.</span> {faq.qestnSj}
                  </span>
                  <div className={cn("w-12 h-12 rounded-[0.1rem] flex items-center justify-center transition", expandedFaq === faq.faqId ? "bg-slate-900 text-white rotate-180" : "bg-slate-50 font-black text-slate-400 group-hover:bg-slate-100")}>
                    <ChevronDown size={24} />
                  </div>
                </button>
                {expandedFaq === faq.faqId && (
                  <div className="px-12 pb-12 pt-2 animate-in fade-in zoom-in-95 duration-500">
                    <div className="p-10 bg-slate-50/50 rounded-[0.1rem] border-2 border-slate-50 text-slate-600 font-bold leading-[1.8] text-lg flex items-start gap-4 shadow-inner">
                      <span className="text-slate-300 text-3xl italic font-black shrink-0 pt-1">A.</span>
                      {faq.answerCn}
                    </div>
                  </div>
                )}
              </div>
            ))
          )
        ) : (
          <div className="space-y-8 bg-white p-12 rounded-[0.1rem] border-2 border-slate-50 shadow-xl overflow-hidden">
            <div className="flex justify-between items-center pb-8 border-b border-slate-50">
                <div className="space-y-1">
                    <h3 className="text-2xl font-black tracking-tight uppercase">??臾몄쓽 ?댁뿭</h3>
                    <p className="text-xs font-bold text-slate-300 tracking-[0.2em] uppercase">Private Interaction History</p>
                </div>
                <Button className="h-14 px-8 rounded-[0.1rem] bg-slate-900 border-none text-white font-black text-sm tracking-widest gap-3 shadow-2xl hover:bg-primary transition">
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
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-10 py-5 rounded-[0.1rem] font-black text-[11px] transition duration-500 uppercase tracking-widest",
        active
          ? "bg-white text-slate-900 shadow-2xl shadow-slate-200 scale-105 z-10"
          : "text-slate-400 hover:text-slate-600"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
