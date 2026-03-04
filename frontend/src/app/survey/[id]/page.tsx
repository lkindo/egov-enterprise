'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/app/components/layout/page-header';
import { surveyAdminService } from '@/services/admin/survey/SurveyAdminService';
import { Survey, SurveyQuestion } from '@/types/survey';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { CheckCircle2, ListChecks, HelpCircle, Send } from 'lucide-react';

export default function SurveyDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [sRes, qRes] = (await Promise.all([
          surveyAdminService.getSurvey(id as string),
          surveyAdminService.getQuestions(id as string)
        ])) as any[];
        if (sRes?.success) setSurvey(sRes.data);
        if (qRes?.success) setQuestions(qRes.data);
      } catch (error) {
        toast('설문 정보를 불러오지 못했습니다.', 'error');
        router.back();
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, toast, router]);

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      toast('모든 질문에 응답해 주세요.', 'error');
      return;
    }

    const isConfirmed = await confirm({
      title: '설문 응답 제출',
      message: '응답하신 내용을 제출하시겠습니까? 제출 후에는 수정이 불가능합니다.'
    });

    if (isConfirmed) {
      try {
        await surveyAdminService.submitAnswers(id as string, answers);
        toast('설문에 참여해 주셔서 감사합니다.', 'success');
        router.push('/survey');
      } catch (error) {
        toast('제출 중 오류가 발생했습니다.', 'error');
      }
    }
  };

  if (loading) return <div className="p-12 text-center animate-pulse">로딩 중...</div>;
  if (!survey) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20">
      <PageHeader
        title={survey.qestnrSj}
        breadcrumbs={[{ label: '설문조사', href: '/survey' }, { label: '참여' }]}
      />

      <div className="bg-card border rounded-2xl p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-primary font-bold">
          <ListChecks size={20} />
          설문 안내
        </div>
        <p className="text-muted-foreground leading-relaxed">
          {survey.qestnrWritngGuidanceCn}
        </p>
        <div className="pt-4 border-t flex justify-between text-xs font-medium text-muted-foreground">
          <span>참여 대상: {survey.qestnrTrget}</span>
          <span>기간: {survey.qestnrBgnde} ~ {survey.qestnrEndde}</span>
        </div>
      </div>

      <div className="space-y-6">
        {questions.map((q, idx) => (
          <div key={q.qestnrQesitmId} className="bg-card border rounded-2xl p-8 shadow-sm">
            <div className="flex items-start gap-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-black shrink-0">
                {idx + 1}
              </span>
              <div className="flex-1 space-y-6">
                <h3 className="text-lg font-bold text-foreground">{q.qestnCn}</h3>

                {q.qestnTyCode === '1' ? (
                  <div className="grid gap-3">
                    {/* Mock Options - In real case, fetch from answers API */}
                    {['매우 만족', '만족', '보통', '불만족'].map((opt) => (
                      <label key={opt} className="flex items-center gap-3 p-4 border rounded-xl hover:bg-accent/50 cursor-pointer transition-colors group">
                        <input
                          type="radio"
                          name={q.qestnrQesitmId}
                          value={opt}
                          onChange={(e) => setAnswers({ ...answers, [q.qestnrQesitmId]: e.target.value })}
                          className="w-4 h-4 text-primary"
                        />
                        <span className="text-sm font-medium group-hover:text-primary">{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea
                    className="w-full min-h-[120px] p-4 border rounded-xl bg-background outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="의견을 입력해 주세요."
                    onChange={(e) => setAnswers({ ...answers, [q.qestnrQesitmId]: e.target.value })}
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center pt-8">
        <button
          onClick={handleSubmit}
          className="flex items-center gap-2 px-12 py-4 bg-primary text-white rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all"
        >
          <Send size={20} />
          설문 응답 제출하기
        </button>
      </div>
    </div>
  );
}
