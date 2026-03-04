'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { helpUserService, FAQ, QNA } from '@/services/user/help/HelpUserService';
import { useToast } from '@/app/components/ui/toast';
import { HelpCircle, MessageCircle, ChevronDown, ChevronUp, Search, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StatusBadge } from '@/app/components/ui/status-badge';

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
          const res = (await helpUserService.getFaqs({})) as any;
          if (res?.success) setFaqs(res.data || []);
        } else {
          const res = (await helpUserService.getQnas({ page: 0, size: 10 })) as any;
          if (res?.success) setQnas(res.data.content || []);
        }
      } catch (error) {
        toast('데이터를 불러오지 못했습니다.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadHelpData();
  }, [tab, toast]);

  const qnaColumns = [
    {
      header: '제목',
      accessor: (item: QNA) => item.qestnSj,
      className: 'font-bold'
    },
    {
      header: '작성자',
      accessor: (item: QNA) => item.wrterNm
    },
    {
      header: '등록일',
      accessor: (item: QNA) => item.writngDe
    },
    {
      header: '상태',
      accessor: (item: QNA) => (
        <StatusBadge status={item.qnaProcessSttusCode === '3' ? 'Y' : 'R'} />
      )
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <PageHeader
        title="도움말 센터"
        breadcrumbs={[{ label: '지원서비스' }, { label: '도움말센터' }]}
      />

      {/* Hero Section */}
      <div className="bg-primary rounded-3xl p-12 text-white text-center shadow-xl space-y-4">
        <h2 className="text-3xl font-black">무엇을 도와드릴까요?</h2>
        <p className="opacity-80 text-sm font-medium">자주 묻는 질문을 확인하거나 1:1 문의를 남겨주세요.</p>
        <div className="max-w-xl mx-auto relative mt-8">
          <Search className="absolute left-4 top-3.5 text-primary" size={20} />
          <input
            type="text"
            placeholder="키워드로 검색하세요"
            className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white text-black text-sm outline-none focus:ring-4 focus:ring-white/20"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-center gap-2">
        <TabButton
          active={tab === 'faq'}
          onClick={() => setTab('faq')}
          icon={<HelpCircle size={20} />}
          label="자주 묻는 질문 (FAQ)"
        />
        <TabButton
          active={tab === 'qna'}
          onClick={() => setTab('qna')}
          icon={<MessageCircle size={20} />}
          label="1:1 Q&A 문의"
        />
      </div>

      {/* Content Area */}
      <div className="space-y-4">
        {tab === 'faq' ? (
          faqs.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground italic">자주 묻는 질문이 없습니다.</div>
          ) : (
            faqs.map((faq) => (
              <div key={faq.faqId} className="bg-card border rounded-2xl overflow-hidden transition-all hover:border-primary/20">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === faq.faqId ? null : faq.faqId)}
                  className="w-full px-8 py-6 flex items-center justify-between group"
                >
                  <span className="font-bold text-lg text-foreground group-hover:text-primary transition-colors text-left">
                    Q. {faq.qestnSj}
                  </span>
                  {expandedFaq === faq.faqId ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                {expandedFaq === faq.faqId && (
                  <div className="px-8 pb-8 pt-2 animate-in slide-in-from-top-4 duration-300">
                    <div className="p-6 bg-muted/20 rounded-xl text-muted-foreground leading-relaxed text-sm">
                      {faq.answerCn}
                    </div>
                  </div>
                )}
              </div>
            ))
          )
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button className="flex items-center gap-2 text-primary font-bold text-sm hover:underline">
                <PlusCircle size={18} /> 문의하기
              </button>
            </div>
            <StandardDataTable
              columns={qnaColumns}
              data={qnas}
              loading={loading}
              emptyMessage="등록된 Q&A가 없습니다."
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
        "flex items-center gap-2 px-8 py-4 rounded-2xl font-black transition-all",
        active
          ? "bg-primary text-white shadow-lg shadow-primary/20 -translate-y-1"
          : "bg-card border text-muted-foreground hover:bg-accent"
      )}
    >
      {icon}
      {label}
    </button>
  );
}