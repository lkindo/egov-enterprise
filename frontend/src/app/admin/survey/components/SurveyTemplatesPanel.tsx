'use client';

import { useRef, useState } from 'react';
import { useUnsavedChanges } from '@/contexts/UnsavedChangesContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { surveyAdminService, SurveyTemplate } from '@/services/foundation/system/SurveyAdminService';
import { PageResponse } from '@/types/foundation/system';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Trash2, LayoutTemplate, Pencil } from 'lucide-react';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { FormErrorSummary } from '@/components/ui/form';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import {
  surveyTemplateCreateSchema,
  surveyTemplateValidationLabels,
} from './survey-panel-form-validation';

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
  const [editing, setEditing] = useState<SurveyTemplate | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState<number | null>(null);
  const editPendingRef = useRef(false);
  const [deletingTemplate, setDeletingTemplate] = useState<number | null>(null);
  const createPendingRef = useRef(false);
  const deletePendingRef = useRef(false);
  const navigate = useUnsavedChanges(() => ({
    dirty: newType !== (editing?.srvyTmpltTypeCd ?? '') || newExpln !== (editing?.srvyTmpltExpln ?? ''),
    pending: createPendingRef.current || editPendingRef.current || deletePendingRef.current,
  }));
  const validation = useManualFormValidation(surveyTemplateCreateSchema, {
    labels: surveyTemplateValidationLabels,
  });

  const key = ['admin-survey-templates'];
  const { data, isLoading } = useQuery<PageResponse<SurveyTemplate>>({
    queryKey: key,
    queryFn: () => surveyAdminService.getTemplateList({ pageIndex: 1, size: 50 }),
  });

  const templates = data?.list ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  const onError = (e: unknown) => setError(extractErrorMessage(e, '처리에 실패했습니다.'));

  const create = useMutation({
    mutationFn: (payload: { srvyTmpltTypeCd: string; srvyTmpltExpln: string }) =>
      editing?.srvyTmpltSn
        ? surveyAdminService.updateTemplate(editing.srvyTmpltSn, {
          ...payload,
          srvyTmpltPathNm: editing.srvyTmpltPathNm,
        })
        : surveyAdminService.createTemplate(payload),
    onSuccess: () => {
      setNewType('');
      setNewExpln('');
      setEditing(null);
      setError(null);
      validation.setFormErrors({}, false);
      invalidate();
    },
    onError: (mutationError: unknown) => {
      const fieldErrors = extractFieldErrors(mutationError);
      if (fieldErrors) validation.setFormErrors(fieldErrors);
      else onError(mutationError);
    },
    onSettled: () => {
      createPendingRef.current = false;
    },
  });

  const remove = useMutation({
    mutationFn: (srvyTmpltSn: number) => surveyAdminService.deleteTemplate(srvyTmpltSn),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError,
    onSettled: () => {
      deletePendingRef.current = false;
      setDeletingTemplate(null);
    },
  });

  const beginDelete = (srvyTmpltSn: number) => {
    if (deletePendingRef.current || editPendingRef.current || createPendingRef.current) return;
    deletePendingRef.current = true;
    setDeletingTemplate(srvyTmpltSn);
    setError(null);
    remove.mutate(srvyTmpltSn);
  };

  const beginEdit = async (srvyTmpltSn: number) => {
    if (editPendingRef.current || createPendingRef.current || deletePendingRef.current) return;
    editPendingRef.current = true;
    setLoadingTemplate(srvyTmpltSn);
    setError(null);
    try {
      const detail = await surveyAdminService.getSurveyTemplate(srvyTmpltSn);
      setEditing({ ...detail, srvyTmpltSn });
      setNewType(detail.srvyTmpltTypeCd ?? '');
      setNewExpln(detail.srvyTmpltExpln ?? '');
      validation.setFormErrors({}, false);
    } catch (loadError) {
      setError(extractErrorMessage(loadError, '템플릿 상세 조회에 실패했습니다. 다시 시도해 주세요.'));
    } finally {
      editPendingRef.current = false;
      setLoadingTemplate(null);
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (createPendingRef.current || editPendingRef.current || deletePendingRef.current) return;
          const validated = validation.validate({
            srvyTmpltTypeCd: newType,
            srvyTmpltExpln: newExpln,
          });
          if (!validated) return;
          setError(null);
          createPendingRef.current = true;
          create.mutate(validated);
        }}
        noValidate
        className="space-y-2"
      >
        <FormErrorSummary
          errors={validation.errors}
          labels={surveyTemplateValidationLabels}
          onNavigate={validation.focusError}
        />
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="space-y-1 sm:max-w-[180px] w-full">
            <Input
              {...validation.fieldProps('srvyTmpltTypeCd')}
              value={newType}
              disabled={loadingTemplate !== null || create.isPending}
              onChange={(e) => {
                validation.clearError('srvyTmpltTypeCd');
                setNewType(e.target.value);
              }}
              placeholder="유형 코드"
              aria-label="템플릿 유형 코드"
              maxLength={12}
              required
            />
            {validation.errors.srvyTmpltTypeCd ? (
              <p {...validation.messageProps('srvyTmpltTypeCd')} className="text-xs font-bold text-destructive-emphasis" />
            ) : null}
          </div>
          <div className="space-y-1 flex-1">
            <Input
              {...validation.fieldProps('srvyTmpltExpln')}
              value={newExpln}
              disabled={loadingTemplate !== null || create.isPending}
              onChange={(e) => {
                validation.clearError('srvyTmpltExpln');
                setNewExpln(e.target.value);
              }}
              placeholder="설명"
              aria-label="템플릿 설명"
              maxLength={4000}
            />
            {validation.errors.srvyTmpltExpln ? (
              <p {...validation.messageProps('srvyTmpltExpln')} className="text-xs font-bold text-destructive-emphasis" />
            ) : null}
          </div>
          <Button type="submit" disabled={create.isPending || loadingTemplate !== null || deletingTemplate !== null} className="shrink-0">
            {editing ? <Pencil className="h-4 w-4 mr-1" aria-hidden="true" /> : <Plus className="h-4 w-4 mr-1" aria-hidden="true" />}
            {editing ? '템플릿 수정 저장' : '템플릿 추가'}
          </Button>
          {editing && (
            <Button type="button" variant="outline" disabled={create.isPending || loadingTemplate !== null}
              onClick={() => {
                setEditing(null); setNewType(''); setNewExpln('');
                validation.setFormErrors({}, false);
              }}>
              수정 취소
            </Button>
          )}
        </div>
      </form>

      {error && <p role="alert" className="text-sm text-destructive-emphasis">{error}</p>}

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
                aria-label={`${t.srvyTmpltExpln || t.srvyTmpltSn} 템플릿 수정`}
                aria-busy={loadingTemplate === t.srvyTmpltSn}
                disabled={loadingTemplate !== null || create.isPending || deletingTemplate !== null}
                onClick={() => { if (t.srvyTmpltSn && editing?.srvyTmpltSn !== t.srvyTmpltSn) void navigate(() => { void beginEdit(t.srvyTmpltSn!); }); }}
              >
                {loadingTemplate === t.srvyTmpltSn
                  ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  : <Pencil className="h-4 w-4" aria-hidden="true" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={deletingTemplate === t.srvyTmpltSn
                  ? `${t.srvyTmpltExpln || t.srvyTmpltSn} 템플릿 삭제 중`
                  : `${t.srvyTmpltExpln || t.srvyTmpltSn} 템플릿 삭제`}
                aria-busy={deletingTemplate === t.srvyTmpltSn}
                disabled={deletingTemplate !== null || loadingTemplate !== null || create.isPending || editing?.srvyTmpltSn === t.srvyTmpltSn}
                className="h-8 w-8 text-destructive-emphasis hover:bg-destructive/10 shrink-0"
                onClick={() => t.srvyTmpltSn && beginDelete(t.srvyTmpltSn)}
              >
                {deletingTemplate === t.srvyTmpltSn
                  ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  : <Trash2 className="h-4 w-4" aria-hidden="true" />}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
