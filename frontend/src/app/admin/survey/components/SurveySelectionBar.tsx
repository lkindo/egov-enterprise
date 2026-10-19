'use client';

import type { ReactNode } from 'react';
import { Copy, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Survey } from '@/types/business/survey';

/**
 * 문항·항목 관리 패널의 설문지 선택기와 설문지 단위 동작(제목·기간 수정, 공개 전환, 복제, 삭제) 줄.
 *
 * <p>2026-10-18 패널 분해 때 SurveyQuestionsPanel 에서 옮겼다 — 마크업·문구·비활성 조건은 그대로다. 쓰기 단추(공개 전환·삭제)는
 * 패널이 그려 `releaseAction`·`deleteAction` 자리에 넣는다 — 쓰기 처리기와 그 단추를 한 컴포넌트에 둬야 폼 검증 census 가
 * 처리기·동기 잠금·처리 중 표시를 함께 본다(census 는 한 요소가 넘기는 처리기를 하나만 따라간다). `deletePending` 은 삭제
 * 요청의 대기 상태로, 수정·복제 단추도 그동안 막는다.
 */
export function SurveySelectionBar({
  surveyOptions,
  srvySn,
  selectedSurvey,
  onSelect,
  canCreateSurvey,
  canUpdateSurvey,
  editing,
  deletePending,
  onBeginSurveyEdit,
  onCopy,
  releaseAction,
  deleteAction,
}: {
  surveyOptions: Survey[];
  srvySn: number | null;
  selectedSurvey: Survey | null;
  /** 고른 설문지(빈 값이면 null). 미저장 입력 확인은 패널이 한다. */
  onSelect: (next: number | null) => void;
  canCreateSurvey: boolean;
  canUpdateSurvey: boolean;
  /** 무언가를 고치는 중인가 — 고치는 동안에는 설문지 단위 동작을 막는다. */
  editing: boolean;
  deletePending: boolean;
  onBeginSurveyEdit: (survey: Survey) => void;
  onCopy: (source: { srvySn: number; srvyTtl?: string | null }) => void;
  /** 공개 전환 단추(수정 권한·고른 설문지가 있을 때 패널이 그린다). */
  releaseAction: ReactNode;
  /** 설문지 삭제 단추(삭제 권한이 있을 때 패널이 그린다). */
  deleteAction: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <label htmlFor="questions-srvy" className="text-sm font-bold shrink-0">
        설문 선택
      </label>
      <select
        id="questions-srvy"
        value={srvySn ?? ''}
        onChange={(e) => {
          const next = e.target.value ? Number(e.target.value) : null;
          onSelect(next);
        }}
        className="border rounded-lg px-3 py-2 text-sm bg-card max-w-md w-full"
      >
        <option value="">— 설문을 선택하세요 —</option>
        {surveyOptions.map((s) => (
          <option key={s.srvySn} value={s.srvySn}>
            {s.srvyTtl}{s.rlsYn === 'N' ? ' (작성 중)' : ''}
          </option>
        ))}
      </select>
      {/*
        [2026-08-28] 설문지 삭제. deleteSurvey 도 소비자가 0건이었다 — 잘못 만든 설문지를
        지울 방법이 없어 선택기에 영원히 쌓였다. 문항·응답이 함께 사라지므로 확인에서 말한다.
      */}
      {canUpdateSurvey && (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={srvySn === null || deletePending || editing}
        aria-label={selectedSurvey ? `${selectedSurvey.srvyTtl} 제목·기간 수정` : '설문지 제목·기간 수정'}
        onClick={() => {
          if (!selectedSurvey) return;
          onBeginSurveyEdit(selectedSurvey);
        }}
        className="shrink-0"
      >
        <Pencil size={14} aria-hidden="true" /> 제목·기간 수정
      </Button>
      )}
      {releaseAction}
      {canCreateSurvey && (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={srvySn === null || deletePending || editing}
        aria-label={selectedSurvey ? `${selectedSurvey.srvyTtl} 복제` : '설문지 복제'}
        onClick={() => { if (selectedSurvey?.srvySn != null) onCopy({ srvySn: selectedSurvey.srvySn, srvyTtl: selectedSurvey.srvyTtl }); }}
        className="shrink-0"
      >
        <Copy size={14} aria-hidden="true" /> 복제
      </Button>
      )}
      {deleteAction}
    </div>
  );
}
