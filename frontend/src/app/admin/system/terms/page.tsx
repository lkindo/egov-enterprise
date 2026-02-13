'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardEditor } from '@/app/components/ui/standard-editor';
import { termsService, Term } from '@/services/termsService';
import { useToast } from '@/app/components/ui/toast';
import { ShieldCheck, FileText, Save, History } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminTermsPage() {
  const { toast } = useToast();
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await termsService.getTerms();
        if (res.success && res.data.length > 0) {
          setTerms(res.data);
          setSelectedId(res.data[0].stplatId);
          setContent(res.data[0].stplatCn);
        }
      } catch (error) {
        toast('약관 정보를 불러오지 못했습니다.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [toast]);

  const handleSave = async () => {
    if (!selectedId) return;
    try {
      await termsService.updateTerm(selectedId, content);
      toast('성공적으로 저장되었습니다.', 'success');
    } catch (error) {
      toast('저장 중 오류가 발생했습니다.', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <PageHeader 
        title="시스템 정책 및 약관 관리" 
        breadcrumbs={[{ label: '시스템관리' }, { label: '약관관리' }]}
        actions={
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
          >
            <Save size={18} /> 설정 저장
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left: Term List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">약관 카테고리</h3>
          <div className="flex flex-col gap-2">
            {terms.map((t) => (
              <button
                key={t.stplatId}
                onClick={() => {
                  setSelectedId(t.stplatId);
                  setContent(t.stplatCn);
                }}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-2xl border text-left transition-all",
                  selectedId === t.stplatId 
                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                    : "bg-card hover:bg-accent"
                )}
              >
                <FileText size={18} />
                <span className="text-sm font-bold">{t.stplatNm}</span>
              </button>
            ))}
          </div>
          
          <div className="p-6 bg-muted/20 border border-dashed rounded-2xl mt-8">
            <p className="text-[10px] font-bold text-muted-foreground leading-relaxed">
              * 여기서 수정된 내용은 회원가입 및 로그인 하단 약관 링크에 즉시 반영됩니다.
            </p>
          </div>
        </div>

        {/* Right: Editor Area */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-black text-foreground flex items-center gap-2">
              <ShieldCheck size={18} className="text-primary" />
              정책 내용 편집
            </h3>
            <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1">
              <History size={12} /> 최종 수정: {terms.find(t => t.stplatId === selectedId)?.lastUpdusrPnttm || '-'}
            </span>
          </div>
          
          <StandardEditor 
            value={content} 
            onChange={setContent} 
            minHeight="600px" 
            placeholder="약관 내용을 입력하세요..."
          />
        </div>
      </div>
    </div>
  );
}
