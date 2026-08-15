'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { surveyAdminService, SurveyTemplate } from '@/services/foundation/system/SurveyAdminService';
import { PageResponse } from '@/types/foundation/system';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Trash2, LayoutTemplate } from 'lucide-react';

/**
 * 설문 템플릿 관리 패널 — 허브의 `templates` 탭에서 렌더한다.
 *
 * <p>백엔드 CRUD 4종은 처음부터 있었고 화면만 없었다. 타입은 생성 타입을 SSOT 로 삼는다 —
 * 종전 서비스는 템플릿을 `Survey` 타입 별칭으로 선언했는데 두 DTO 는 필드가 전혀 겹치지 않는다.
 */
export default function SurveyTemplatesPanel() {
  const queryClient = useQueryClient();
  const [newType, setNewType] = useState('');
  const [newExpln, setNewExpln] = useState('');
  const [error, setError] = useState<string | null>(null);

  const key = ['admin-survey-templates'];
  const { data, isLoading } = useQuery<PageResponse<SurveyTemplate>>({
    queryKey: key,
    queryFn: () => surveyAdminService.getTemplateList({ pageIndex: 1, size: 50 }),
  });

  const templates = data?.list ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  const onError = (e: unknown) => setError(e instanceof Error ? e.message : '처리에 실패했습니다.');

  const create = useMutation({
    mutationFn: () =>
      surveyAdminService.createTemplate({ srvyTmpltTypeCd: newType, srvyTmpltExpln: newExpln }),
    onSuccess: () => {
      setNewType('');
      setNewExpln('');
      setError(null);
      invalidate();
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: (srvyTmpltSn: number) => surveyAdminService.deleteTemplate(srvyTmpltSn),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError,
  });

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!newType.trim()) {
            setError('템플릿 유형 코드를 입력해 주세요.');
            return;
          }
          create.mutate();
        }}
        className="flex flex-col sm:flex-row gap-2"
      >
        <Input
          value={newType}
          onChange={(e) => setNewType(e.target.value)}
          placeholder="유형 코드"
          aria-label="템플릿 유형 코드"
          className="sm:max-w-[180px]"
        />
        <Input
          value={newExpln}
          onChange={(e) => setNewExpln(e.target.value)}
          placeholder="설명"
          aria-label="템플릿 설명"
        />
        <Button type="submit" disabled={create.isPending} className="shrink-0">
          <Plus className="h-4 w-4 mr-1" /> 템플릿 추가
        </Button>
      </form>

      {error && <p className="text-sm text-destructive-emphasis">{error}</p>}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : templates.length === 0 ? (
        <div className="p-16 text-center bg-card rounded-lg border-2 border-dashed">
          <LayoutTemplate size={36} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">등록된 템플릿이 없습니다.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {templates.map((t) => (
            <li
              key={t.srvyTmpltSn}
              className="flex items-center gap-3 p-3 border rounded-lg bg-card"
            >
              <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono shrink-0">
                {t.srvyTmpltTypeCd || '-'}
              </code>
              <span className="flex-1 min-w-0 text-sm break-words">{t.srvyTmpltExpln || '(설명 없음)'}</span>
              <span className="text-xs text-muted-foreground font-mono tabular-nums shrink-0">
                {t.crtDt ? t.crtDt.substring(0, 10) : ''}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`${t.srvyTmpltExpln || t.srvyTmpltSn} 템플릿 삭제`}
                className="h-8 w-8 text-destructive-emphasis hover:bg-destructive/10 shrink-0"
                onClick={() => t.srvyTmpltSn && remove.mutate(t.srvyTmpltSn)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
