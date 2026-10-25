'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FormErrorSummary } from '@/components/ui/form';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { useToast } from '@/app/components/ui/toast';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { cmsPageRoute } from '@/lib/cms/page-menu-links';
import { emptyCellLocations, type CmsDocument, type CmsDocumentLocation } from '@/lib/cms/document';
import { cmsService, type CmsPageDetail } from '@/services/business/cms/CmsService';
import { cmsQueryOptions } from '@/queries/cms-query-options';
import { cmsConflict } from './content-page-errors';
import { issueText, locationLabel, publishBlockers } from './content-page-issues';
import { contentPagePublishFormSchema, contentPagePublishValidationLabels } from './content-page-form-validation';
import { hasPublishChanges, summarizePublishChanges } from './publish-changes';

export interface PublishDraft {
  contsPathNm: string;
  contsTtl: string;
  contsExpln: string;
  document: CmsDocument;
}

export interface PublishDialogProps {
  contsSn: number;
  baseline: CmsPageDetail;
  /** 편집기의 지금 입력. 저장하지 않은 변경이 없으면 저장한 초안과 같다. */
  draft: PublishDraft;
  dirty: boolean;
  /** 이 페이지가 지금 업무 홈 소개다. */
  isHome: boolean;
  /** 칸으로 가서 고칠 수 있다(편집 권한이 있고 보관하지 않은 페이지). 아니면 '이 칸으로 가기' 를 두지 않는다. */
  canEdit: boolean;
  onClose: () => void;
  /**
   * '저장하고 게시' 의 초안 저장. 저장한 상세를 돌려주고, 실패하면 null 이다 — 그때는 편집기가 이 대화상자를 닫고 무엇이 실패했는지
   * 그 칸에서 알린다(게시는 하지 않는다).
   */
  onSaveDraft: () => Promise<CmsPageDetail | null>;
  onPublished: (next: CmsPageDetail) => void;
  /** 다른 사람이 먼저 바꿨다(409 C013). */
  onConflict: () => void;
  /** 게시를 막는 문제의 칸으로 간다 — 편집기가 대화상자를 닫고 그 칸에 문제를 표시하고 포커스를 옮긴다. */
  onGoToIssue: (location: CmsDocumentLocation) => void;
}

const sameLocation = (left: CmsDocumentLocation, right: CmsDocumentLocation) =>
  left.section === right.section && left.cell === right.cell;

/**
 * 저장한 초안 게시(ADR-0039·ADR-0042). 막지 않고 알리는 것과 막는 것을 가른다.
 *  · 막는 것 — 게시 판정에 걸린 칸(고르지 않은 이미지·설명 없는 이미지·빈 바로가기·빈 내려받기)과 시작 양식의 작성 안내 문장, 보이는
 *    내용이 없는 문서, 지금 게시본과 같은 내용. 칸마다 '이 칸으로 가기' 로 그 칸에 데려간다.
 *  · 알리는 것 — 아무 내용도 없는 칸(게시하면 빈 자리), 업무 홈 소개인 페이지(모든 사용자의 업무 홈 맨 위가 바뀐다).
 *  · 바뀐 점 — 지금 게시본과 영역 식별자로 맞춰 바뀐 영역·새 영역·지운 영역과 제목·요약 변경을 보인다.
 * 저장하지 않은 변경이 있으면 막지 않고 '저장하고 게시' 로 초안을 먼저 저장한 뒤 받은 버전으로 게시한다. 저장이 실패하면 게시하지
 * 않는다.
 */
export function PublishDialog({
  contsSn, baseline, draft, dirty, isHome, canEdit, onClose, onSaveDraft, onPublished, onConflict, onGoToIssue,
}: PublishDialogProps) {
  const { toast } = useToast();
  const [note, setNote] = React.useState('');
  const [stage, setStage] = React.useState<'save' | 'publish' | null>(null);
  const submitPendingRef = React.useRef(false);
  const validation = useManualFormValidation(contentPagePublishFormSchema, { labels: contentPagePublishValidationLabels });
  const publishedRevision = baseline.publishedRevision;
  const current = useQuery({
    ...cmsQueryOptions.revision(contsSn, publishedRevision?.contsRvsnSn ?? 0),
    enabled: publishedRevision?.contsRvsnSn !== undefined,
  });

  const issues = publishBlockers(draft.document);
  const pageBlockers = [
    baseline.status === 'PUBLISHED' && !baseline.unpublishedChanges && !dirty && '지금 게시본과 같은 내용입니다. 바꾼 뒤 게시해 주세요.',
  ].filter((item): item is string => Boolean(item));
  const blockerCount = issues.length + pageBlockers.length;
  // 빈 칸 가운데 이미 막는 문제로 보인 칸(고르지 않은 이미지 등)은 다시 세지 않는다.
  const emptyCells = emptyCellLocations(draft.document)
    .filter((location) => !issues.some((issue) => sameLocation(issue, location)));
  const warnings = [
    emptyCells.length > 0 && `아무 내용도 없는 칸이 ${emptyCells.length}개 있습니다. 게시하면 그 자리는 비어 보입니다.`,
    isHome && '이 페이지는 업무 홈 소개입니다. 게시하면 모든 사용자의 업무 홈 맨 위가 바뀝니다.',
  ].filter((item): item is string => Boolean(item));
  const changes = current.data ? summarizePublishChanges(current.data, draft) : null;
  const busy = stage !== null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitPendingRef.current || blockerCount > 0) return;
    const validated = validation.validate({ rvsnRsn: note });
    if (!validated) return;
    submitPendingRef.current = true;
    const saveFirst = dirty;
    setStage(saveFirst ? 'save' : 'publish');
    try {
      let version = baseline.version ?? 0;
      if (saveFirst) {
        const saved = await onSaveDraft();
        // 저장이 실패했다 — 편집기가 대화상자를 닫고 실패를 알렸다. 게시하지 않는다.
        if (!saved) return;
        version = saved.version ?? 0;
        setStage('publish');
      }
      onPublished(await cmsService.publish(contsSn, version, validated.rvsnRsn || undefined));
    } catch (error) {
      if (cmsConflict(error) === 'concurrent') {
        onConflict();
        return;
      }
      const fieldErrors = extractFieldErrors(error);
      if (fieldErrors) validation.setFormErrors(fieldErrors);
      else {
        toast(extractErrorMessage(error, saveFirst
          ? '초안은 저장했지만 게시하지 못했습니다. 저장한 초안은 그대로 있습니다. 다시 게시해 주세요.'
          : '게시하지 못했습니다. 저장한 초안은 그대로 있습니다.'), 'error');
      }
    } finally {
      submitPendingRef.current = false;
      setStage(null);
    }
  };

  return (
    <StandardModal isOpen onClose={onClose} title="저장한 초안 게시" maxWidth="2xl" closeDisabled={busy}>
      <form onSubmit={handleSubmit} noValidate className="space-y-3 text-[length:var(--font-size-body)]">
        <FormErrorSummary errors={validation.errors} labels={contentPagePublishValidationLabels} onNavigate={validation.focusError} />
        <p className="rounded-md border border-border bg-muted px-3 py-2 text-foreground">
          게시하면 <strong>로그인한 모든 사용자</strong>가 {cmsPageRoute(draft.contsPathNm)} 에서 읽을 수 있습니다. 개인정보나 내부 전용 내용이 없는지 확인해 주세요.
          {!baseline.pathLocked && ' 처음 게시하면 주소가 고정됩니다.'}
        </p>
        {dirty && (
          <p className="text-foreground">
            저장하지 않은 변경이 있습니다. ‘저장하고 게시’를 누르면 초안을 먼저 저장한 뒤 그 내용을 게시합니다.
          </p>
        )}

        {blockerCount > 0 && (
          <div role="alert" className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2">
            <p className="font-semibold text-destructive-emphasis">게시를 막는 문제 {blockerCount}개 — 고친 뒤 게시하세요.</p>
            <ul className="space-y-1 text-foreground">
              {pageBlockers.map((message) => <li key={message}>{message}</li>)}
              {issues.map((issue, position) => {
                const textId = `cms-publish-issue-${position}`;
                return (
                  <li key={position} className="flex flex-wrap items-center gap-x-2">
                    <span id={textId}>
                      {issue.section !== undefined && <span className="font-medium">{locationLabel(draft.document, issue)} — </span>}
                      {issueText(issue.message)}
                    </span>
                    {canEdit && issue.section !== undefined && (
                      <Button type="button" variant="link" size="sm" className="h-auto p-0" aria-describedby={textId}
                        onClick={() => onGoToIssue(issue)}>
                        {issue.cell === undefined ? '이 영역으로 가기' : '이 칸으로 가기'}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="space-y-1 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-foreground">
            <p className="font-semibold">확인할 점(게시는 됩니다)</p>
            <ul className="list-disc space-y-1 pl-5">
              {warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          </div>
        )}

        <section aria-labelledby="cms-publish-changes" className="space-y-1">
          <h3 id="cms-publish-changes" className="font-semibold text-foreground">
            {publishedRevision ? `지금 게시본(v${publishedRevision.revisionNumber})과 바뀐 점` : '게시할 내용'}
          </h3>
          {!publishedRevision && (
            <p className="text-muted-foreground">
              지금 사용자에게 보이는 게시본이 없습니다. 게시하면 이 내용이 사용자에게 보이고 게시 이력에 새 게시본으로 남습니다(v{(baseline.revisionCount ?? 0) + 1}).
            </p>
          )}
          {publishedRevision && current.isPending && <p role="status" className="text-muted-foreground">지금 게시본과 비교하는 중…</p>}
          {publishedRevision && current.isError && (
            <p className="text-muted-foreground">지금 게시본을 불러오지 못해 바뀐 점을 보일 수 없습니다. 게시는 할 수 있습니다.</p>
          )}
          {changes && !hasPublishChanges(changes) && <p className="text-muted-foreground">본문과 제목·요약에 바뀐 점이 없습니다.</p>}
          {changes && hasPublishChanges(changes) && (
            <ul className="list-disc space-y-0.5 pl-5 text-foreground">
              {changes.titleChanged && <li>제목을 바꿨습니다.</li>}
              {changes.summaryChanged && <li>요약을 바꿨습니다.</li>}
              {changes.changed.length > 0 && <li>바뀐 영역 {changes.changed.length}개: {changes.changed.join(', ')}</li>}
              {changes.added.length > 0 && <li>새 영역 {changes.added.length}개: {changes.added.join(', ')}</li>}
              {changes.removed.length > 0 && <li>지운 영역 {changes.removed.length}개: {changes.removed.join(', ')}</li>}
              {changes.reordered && <li>영역 순서를 바꿨습니다.</li>}
            </ul>
          )}
        </section>

        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          변경 설명(게시 이력에 남음, 선택)
          <Textarea
            {...validation.fieldProps('rvsnRsn')}
            value={note}
            rows={2}
            maxLength={4000}
            placeholder="예: 문의처를 바꿈"
            onChange={(event) => { validation.clearError('rvsnRsn'); setNote(event.target.value); }}
          />
          {validation.errors.rvsnRsn ? <p {...validation.messageProps('rvsnRsn')} className="text-sm text-destructive" /> : null}
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>취소</Button>
          <Button type="submit" disabled={blockerCount > 0 || busy} aria-busy={busy}>
            {stage === 'save' ? '초안 저장 중…' : stage === 'publish' ? '게시 중…' : dirty ? '저장하고 게시' : '게시'}
          </Button>
        </div>
      </form>
    </StandardModal>
  );
}
