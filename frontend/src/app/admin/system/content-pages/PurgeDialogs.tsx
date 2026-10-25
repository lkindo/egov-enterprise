'use client';

import React from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormErrorSummary } from '@/components/ui/form';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { cmsPageRoute } from '@/lib/cms/page-menu-links';
import { cmsService, type CmsPageDetail, type CmsRevisionSummary } from '@/services/business/cms/CmsService';
import { CmsPagePurgeRequestRequestSchema, CmsRevisionPurgeRequestRequestSchema } from '@/types/generated-zod';
import { cmsConflict } from './content-page-errors';

/**
 * 콘텐츠 페이지 파기(ADR-0042 — 개인정보 오게시 같은 사고 대응). 파기 권한(CMS_PURGE, 기본 그룹 없음)이 있는 사람에게만 보인다.
 *  · 페이지 파기 — 게시 중이 아닌 페이지의 초안·모든 게시본·첨부를 되돌릴 수 없게 지운다. 주소를 다시 입력받아 맞춰 본다.
 *  · 게시본 파기 — 지금 보이는 게시본이 아닌 지난 게시본 하나를 지운다. 뒤 판 번호가 하나씩 당겨진다.
 * 둘 다 처리 근거 번호를 받아 민감 작업 감사에 남긴다 — 사유 본문이 아니라 번호만 받는다(감사 기록에 자유 글이 쌓이지 않게).
 * 서버가 거부하면 그 문구를 그대로 보이고 입력은 남긴다.
 */

/** 처리 근거 번호 형식 — 서버 요청 계약(CmsPagePurgeRequest·CmsRevisionPurgeRequest)의 패턴을 전체 일치로 본다. */
export const CASE_REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/;

export const caseReferenceSchema = z.string()
  .trim()
  .min(1, '처리 근거 번호를 입력해 주세요.')
  .max(200, '처리 근거 번호는 200자 이내로 입력해 주세요.')
  .regex(CASE_REFERENCE_PATTERN,
    '처리 근거 번호는 영문이나 숫자로 시작하고 영문·숫자·마침표(.)·밑줄(_)·하이픈(-)만 쓸 수 있습니다(예: INC-2026-0012).')
  .pipe(CmsPagePurgeRequestRequestSchema.shape.caseReference);

const CASE_REFERENCE_HINT = '사고·요청 처리 번호처럼 이 파기의 근거를 찾을 수 있는 번호만 입력하세요(예: INC-2026-0012). '
  + '감사 기록에 남으니 사유 본문이나 개인정보는 쓰지 마세요.';

// 요청 계약(generated zod)의 칸에 화면 문구를 입힌다 — 버전은 편집기가 채우므로 화면 입력에서 뺀다.
const purgeRevisionSchema = CmsRevisionPurgeRequestRequestSchema
  .pick({ caseReference: true })
  .extend({ caseReference: caseReferenceSchema });
const purgeLabels = { contsPathNm: '확인용 주소', caseReference: '처리 근거 번호' };

function purgePageSchema(expected: string) {
  return CmsPagePurgeRequestRequestSchema
    .pick({ contsPathNm: true, caseReference: true })
    .extend({
      contsPathNm: z.string()
        .trim()
        .min(1, '확인용 주소를 입력해 주세요.')
        .refine((value) => value === expected, '이 페이지의 주소와 다릅니다. /pages/ 뒤의 주소를 그대로 입력해 주세요.')
        .pipe(CmsPagePurgeRequestRequestSchema.shape.contsPathNm),
      caseReference: caseReferenceSchema,
    });
}

type FieldValidation = Pick<ReturnType<typeof useManualFormValidation>, 'fieldProps' | 'messageProps' | 'errors' | 'clearError'>;

function CaseReferenceField({ id, value, onChange, validation, autoFocus }: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  validation: FieldValidation;
  autoFocus?: boolean;
}) {
  const hintId = `${id}-hint`;
  const field = validation.fieldProps('caseReference');
  return (
    <label className="flex flex-col gap-1 text-sm text-muted-foreground">
      처리 근거 번호 <span className="sr-only">(필수)</span>
      <Input {...field} value={value} maxLength={200} required autoFocus={autoFocus} autoComplete="off" spellCheck={false}
        aria-describedby={[field['aria-describedby'], hintId].filter(Boolean).join(' ')}
        onChange={(event) => { validation.clearError('caseReference'); onChange(event.target.value); }} />
      <span id={hintId}>{CASE_REFERENCE_HINT}</span>
      {validation.errors.caseReference ? <p {...validation.messageProps('caseReference')} className="text-sm text-destructive" /> : null}
    </label>
  );
}

export interface PurgePageDialogProps {
  contsSn: number;
  contsPathNm: string;
  version: number;
  revisionCount: number;
  /** 저장하지 않은 변경이 있다 — 그것도 함께 버려진다고 알린다. */
  dirty: boolean;
  /** 이 주소를 가리키는 메뉴 안내(편집기가 메뉴 연결 판정으로 만든다). */
  menuNote: string;
  onClose: () => void;
  onPurged: () => void;
  /** 다른 사람이 먼저 바꿨다(409 C013). 편집기가 대화상자를 닫고 충돌을 알린다. */
  onConflict: () => void;
}

export function PurgePageDialog({
  contsSn, contsPathNm, version, revisionCount, dirty, menuNote, onClose, onPurged, onConflict,
}: PurgePageDialogProps) {
  const [path, setPath] = React.useState('');
  const [caseReference, setCaseReference] = React.useState('');
  const [serverError, setServerError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const pendingRef = React.useRef(false);
  const schema = React.useMemo(() => purgePageSchema(contsPathNm), [contsPathNm]);
  const validation = useManualFormValidation(schema, { labels: purgeLabels });
  const pathField = validation.fieldProps('contsPathNm');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pendingRef.current) return;
    setServerError('');
    const validated = validation.validate({ contsPathNm: path, caseReference });
    if (!validated) return;
    pendingRef.current = true;
    setIsSubmitting(true);
    try {
      await cmsService.purgePage(contsSn, { version, contsPathNm: validated.contsPathNm, caseReference: validated.caseReference });
      onPurged();
    } catch (error) {
      if (cmsConflict(error) === 'concurrent') {
        onConflict();
        return;
      }
      const fieldErrors = extractFieldErrors(error);
      if (fieldErrors) validation.setFormErrors(fieldErrors);
      else setServerError(extractErrorMessage(error, '페이지를 파기하지 못했습니다. 페이지는 그대로 있습니다. 잠시 후 다시 시도해 주세요.'));
    } finally {
      pendingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <StandardModal isOpen onClose={onClose} title="페이지 영구 파기" maxWidth="lg" closeDisabled={isSubmitting}>
      <form onSubmit={handleSubmit} noValidate className="space-y-3 text-[length:var(--font-size-body)]">
        <FormErrorSummary errors={validation.errors} labels={purgeLabels} onNavigate={validation.focusError} />
        <div className="space-y-1 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-foreground">
          <p className="font-semibold">파기하면 되돌릴 수 없습니다.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>저장한 초안, 게시 이력의 게시본 <span className="tabular-nums">{revisionCount}개</span>, 이 페이지에 올린 이미지·내려받기 파일이 모두 지워집니다.</li>
            <li>주소 {cmsPageRoute(contsPathNm)} 는 비워집니다. 이 주소로 가는 메뉴와 링크는 없는 페이지를 엽니다. {menuNote}</li>
            <li>개인정보를 잘못 게시한 것처럼 사고에 대응할 때만 씁니다. 사용자에게서 내리기만 하려면 보관하세요.</li>
            {dirty && <li>이 화면에서 저장하지 않은 변경도 함께 버려집니다.</li>}
          </ul>
        </div>
        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          확인용 주소 — 이 페이지의 주소({contsPathNm})를 그대로 입력하세요 <span className="sr-only">(필수)</span>
          <div className="flex items-center gap-1">
            <span aria-hidden="true" className="text-foreground">/pages/</span>
            <Input {...pathField} value={path} maxLength={100} required autoComplete="off" spellCheck={false}
              onChange={(event) => { validation.clearError('contsPathNm'); setPath(event.target.value); }} />
          </div>
          {validation.errors.contsPathNm ? <p {...validation.messageProps('contsPathNm')} className="text-sm text-destructive" /> : null}
        </label>
        <CaseReferenceField id="cms-purge-page-case" value={caseReference} onChange={setCaseReference} validation={validation} />
        {serverError && <p role="alert" className="text-sm text-destructive">{serverError}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>취소</Button>
          <Button type="submit" variant="destructive" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? '페이지 파기 중…' : '페이지 파기'}
          </Button>
        </div>
      </form>
    </StandardModal>
  );
}

export interface PurgeRevisionFormProps {
  contsSn: number;
  revision: CmsRevisionSummary;
  /** 이 페이지에 뒤 판이 있다 — 번호가 당겨진다는 안내의 예를 든다. */
  hasLaterRevision: boolean;
  version: number;
  onCancel: () => void;
  onPurged: (next: CmsPageDetail, revisionNumber: number) => void;
  onConflict: () => void;
}

/** 게시 이력 대화상자 안의 게시본 파기 칸. 열리면 처리 근거 번호 칸에 포커스를 둔다. */
export function PurgeRevisionForm({
  contsSn, revision, hasLaterRevision, version, onCancel, onPurged, onConflict,
}: PurgeRevisionFormProps) {
  const [caseReference, setCaseReference] = React.useState('');
  const [serverError, setServerError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const pendingRef = React.useRef(false);
  const validation = useManualFormValidation(purgeRevisionSchema, { labels: purgeLabels });
  const number = revision.revisionNumber ?? 0;
  const headingId = `cms-purge-revision-${revision.contsRvsnSn}`;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pendingRef.current || revision.contsRvsnSn === undefined) return;
    setServerError('');
    const validated = validation.validate({ caseReference });
    if (!validated) return;
    pendingRef.current = true;
    setIsSubmitting(true);
    try {
      onPurged(await cmsService.purgeRevision(contsSn, revision.contsRvsnSn, { version, caseReference: validated.caseReference }), number);
    } catch (error) {
      if (cmsConflict(error) === 'concurrent') {
        onConflict();
        return;
      }
      const fieldErrors = extractFieldErrors(error);
      if (fieldErrors) validation.setFormErrors(fieldErrors);
      else setServerError(extractErrorMessage(error, '게시본을 파기하지 못했습니다. 게시 이력은 그대로 있습니다. 잠시 후 다시 시도해 주세요.'));
    } finally {
      pendingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate aria-labelledby={headingId}
      className="mt-4 space-y-3 rounded-md border border-destructive/40 p-4 text-[length:var(--font-size-body)]">
      <h3 id={headingId} className="text-base font-semibold text-foreground">v{number} 게시본 파기</h3>
      <ul className="list-disc space-y-1 pl-5 text-foreground">
        <li>되돌릴 수 없습니다. 이 게시본과, 이 게시본에만 쓰인 이미지·내려받기 파일이 지워집니다.</li>
        {hasLaterRevision && <li>뒤에 게시한 본의 번호가 하나씩 당겨집니다(예: v{number + 1} → v{number}).</li>}
        <li>개인정보를 잘못 게시한 것처럼 사고에 대응할 때만 씁니다.</li>
      </ul>
      <FormErrorSummary errors={validation.errors} labels={purgeLabels} onNavigate={validation.focusError} />
      <CaseReferenceField id={`${headingId}-case`} value={caseReference} onChange={setCaseReference} validation={validation} autoFocus />
      {serverError && <p role="alert" className="text-sm text-destructive">{serverError}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>취소</Button>
        <Button type="submit" variant="destructive" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? '게시본 파기 중…' : '게시본 파기'}
        </Button>
      </div>
    </form>
  );
}
