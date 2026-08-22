'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { helpUserService, FAQ, QNA } from '@/services/business/user/help/HelpUserService';
import { useToast } from '@/app/components/ui/toast';
import { HelpCircle,  MessageCircle,  ChevronDown,  Search,  PlusCircle,  Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { EmptyStateDisplay } from '@/app/components/ui/status-displays';

type FaqDetailState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; answer: string };

export default function HelpClient() {
  const { toast } = useToast();
  const [tab, setTab] = useState<'faq' | 'qna'>('faq');
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [qnas, setQnas] = useState<QNA[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [faqDetails, setFaqDetails] = useState<Record<string, FaqDetailState>>({});

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
        toast('데이터를 불러오지 못했습니다.', 'error');
      } finally {
        setLoading(false);
      }
    }, 300); // Debounce
    return () => clearTimeout(timer);
  }, [tab, searchKeyword, toast]);

  const qnaColumns = [
    {
      header: '제목',
      accessor: (item: QNA) => <span className="font-bold text-foreground/80">{item.qstnTtl}</span>,
    },
    {
      header: '작성자',
      accessor: (item: QNA) => <span className="text-muted-foreground/60 font-medium">{item.wrterNm}</span>
    },
    {
      header: '등록일',
      accessor: (item: QNA) => <span className="text-muted-foreground/40 font-mono text-xs">{item.writngDe}</span>
    },
    {
      header: '상태',
      accessor: (item: QNA) => (
        <StatusBadge status={item.qnaProcessSttusCode === '3' ? 'Y' : 'R'} />
      )
    }
  ];

  const loadFaqDetail = async (faqId: string) => {
    setFaqDetails((current) => ({ ...current, [faqId]: { status: 'loading' } }));
    try {
      const detail = await helpUserService.getFaqDetail(faqId);
      setFaqDetails((current) => ({
        ...current,
        [faqId]: { status: 'success', answer: detail.ansCn },
      }));
    } catch {
      setFaqDetails((current) => ({ ...current, [faqId]: { status: 'error' } }));
    }
  };

  const toggleFaq = (faqId: string) => {
    if (expandedFaq === faqId) {
      setExpandedFaq(null);
      return;
    }

    setExpandedFaq(faqId);
    if (!faqDetails[faqId]) void loadFaqDetail(faqId);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24 p-8 animate-in fade-in duration-1000">
      <PageHeader
        title="도움말 커스터머 센터"
        breadcrumbs={[{ label: '지원서비스' }, { label: '도움말센터' }]}
      />

      <div className="hub-glass-premium rounded-lg p-16 text-center relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
            <Sparkles size={200} className="text-primary" />
        </div>
        <div className="relative z-10 space-y-6">
            <h2 className="text-5xl hub-title-normal hub-text-gradient">_ 무엇을 도와드릴까요?</h2>
            <p className="text-muted-foreground text-lg font-medium max-w-2xl mx-auto uppercase tracking-tight">자주 묻는 질문을 확인하거나 1:1 전담 문의를 통해 문제를 신속하게 해결하세요.</p>
            <div className="max-w-xl mx-auto relative mt-12 scale-100 group-hover:scale-[1.02] transition-transform">
            <Search className="absolute left-6 top-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" size={24} />
            <input
                type="text"
                aria-label="도움말 키워드 검색"
                placeholder="키워드로 신속하게 검색하세요..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full h-11 pl-16 pr-6 rounded-lg bg-background/50 border-2 border-border focus:border-primary text-foreground text-lg font-bold outline-none focus:ring-8 focus:ring-primary/5 transition-all placeholder:text-muted-foreground/30"
            />
            </div>
        </div>
      </div>

      <div className="flex justify-center p-2 bg-muted rounded-lg w-fit mx-auto">
        <TabButton
          active={tab === 'faq'}
          onClick={() => setTab('faq')}
          icon={<HelpCircle size={22} />}
          label="FAQ 자주 묻는 질문"
        />
        <TabButton
          active={tab === 'qna'}
          onClick={() => setTab('qna')}
          icon={<MessageCircle size={22} />}
          label="1:1 Q&A 전문가 상담"
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
                <EmptyStateDisplay message="등록된 자주 묻는 질문이 없습니다." className="bg-card border-2 border-dashed border-border" />
              ) : (
                faqs.map((faq) => (
                  <div key={faq.faqId} className="bg-card border-2 border-border/40 rounded-lg overflow-hidden transition-all hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/20 scale-100 hover:scale-[1.005]">
                    <button
                      id={`faq-question-${faq.faqId}`}
                      aria-controls={`faq-answer-${faq.faqId}`}
                      aria-expanded={expandedFaq === faq.faqId}
                      onClick={() => toggleFaq(faq.faqId)}
                      className="w-full px-12 py-10 flex items-center justify-between group text-left"
                    >
                      <span className="font-bold text-2xl text-foreground group-hover:text-primary transition-colors flex items-start gap-4 tracking-tighter">
                        <span className="text-primary text-3xl">Q.</span> {faq.qstnTtl}
                      </span>
                      <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center transition-all", expandedFaq === faq.faqId ? "bg-primary text-white rotate-180" : "bg-muted font-bold text-muted-foreground group-hover:bg-accent")}>
                        <ChevronDown size={24} />
                      </div>
                    </button>
                    {expandedFaq === faq.faqId && (
                      <div
                        id={`faq-answer-${faq.faqId}`}
                        role="region"
                        aria-labelledby={`faq-question-${faq.faqId}`}
                        className="px-12 pb-12 pt-2"
                      >
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-10 bg-accent/30 rounded-lg border-2 border-accent/50 text-foreground/80 font-bold leading-[1.8] text-lg flex items-start gap-4 shadow-inner"
                        >
                          <span className="text-primary text-3xl font-bold shrink-0 pt-1">A.</span>
                          <FaqAnswer
                            state={faqDetails[faq.faqId] ?? { status: 'loading' }}
                            onRetry={() => void loadFaqDetail(faq.faqId)}
                          />
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
              className="space-y-8 bg-card p-12 rounded-lg border-2 border-border/40 shadow-xl overflow-hidden"
            >
              <div className="flex justify-between items-center pb-8 border-b border-border/40">
                  <div className="space-y-1">
                      <h3 className="text-2xl font-bold tracking-tight uppercase">_ 나의 문의 내역</h3>
                      <p className="text-xs font-bold text-muted-foreground tracking-[0.3em] uppercase">Private Interaction History</p>
                  </div>
                  <Button className="h-11 px-8 rounded-lg bg-foreground text-background border-none font-bold text-xs tracking-widest gap-3 shadow-2xl hover:bg-primary hover:text-white transition-all uppercase">
                      <PlusCircle size={20} /> 새로운 문의 작성
                  </Button>
              </div>
              <StandardDataTable
                columns={qnaColumns}
                data={qnas}
                loading={loading}
                emptyMessage="등록된 Q&A 문의 내역이 없습니다."
                className="border-none shadow-none rounded-none"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function FaqAnswer({ state, onRetry }: { state: FaqDetailState; onRetry: () => void }) {
  if (state.status === 'loading') {
    return <p role="status" className="whitespace-pre-line">답변을 불러오는 중입니다.</p>;
  }

  if (state.status === 'error') {
    return (
      <div className="space-y-4">
        <p role="alert">답변을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
        <Button type="button" variant="outline" onClick={onRetry}>
          답변 다시 불러오기
        </Button>
      </div>
    );
  }

  return (
    <p className="whitespace-pre-line">
      {state.answer || '등록된 답변 내용이 없습니다.'}
    </p>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-10 py-5 rounded-lg font-bold text-xs transition-all duration-500 uppercase tracking-widest",
        active
          ? "bg-background text-foreground shadow-2xl scale-105 z-10"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
