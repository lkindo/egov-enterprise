'use client';

import { useEffect, useState } from 'react';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { helpUserService, FAQ, QNA } from '@/services/business/user/help/HelpUserService';
import { useToast } from '@/app/components/ui/toast';
import { HelpCircle, MessageCircle, ChevronDown, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    <WorkListPage
      title="도움말 센터"
      description="자주 묻는 질문을 확인하거나 1:1 문의 내역을 조회합니다."
      breadcrumbItems={[{ label: '지원서비스' }, { label: '도움말센터' }]}
      filterStateKey="help-center"
      actions={
        <div role="tablist" aria-label="도움말 구분" className="flex rounded-md border border-border p-0.5">
          <TabButton
            active={tab === 'faq'}
            onClick={() => setTab('faq')}
            icon={<HelpCircle size={16} aria-hidden="true" />}
            label="FAQ 자주 묻는 질문"
          />
          <TabButton
            active={tab === 'qna'}
            onClick={() => setTab('qna')}
            icon={<MessageCircle size={16} aria-hidden="true" />}
            label="1:1 Q&A 문의"
          />
        </div>
      }
      filter={
        <div className="min-w-60 max-w-xl space-y-1">
          <label htmlFor="help-search" className="text-[length:var(--font-size-body)] font-medium">
            도움말 키워드
          </label>
          <Input
            id="help-search"
            type="text"
            aria-label="도움말 키워드 검색"
            placeholder="키워드로 검색"
            value={searchKeyword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchKeyword(e.target.value)}
          />
        </div>
      }
    >
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
                  {/* onClick 도 대상 라우트도 없던 死버튼이다(카탈로그 G10). 문의 등록 경로가
                      생기기 전까지 사유를 밝혀 비활성으로 남긴다. */}
                  <Button size="sm" disabled title="문의 등록 화면이 아직 연결되지 않았습니다" className="gap-2">
                      <PlusCircle size={16} aria-hidden="true" /> 새로운 문의 작성
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
    </WorkListPage>
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
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex h-[var(--control-h-sm)] items-center gap-2 rounded px-4 text-xs font-bold transition-colors",
        active ? "bg-muted text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
