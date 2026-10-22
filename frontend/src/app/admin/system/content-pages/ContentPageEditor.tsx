'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, History, Home, Link2, Plus, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FormErrorSummary } from '@/components/ui/form';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { useAuth } from '@/contexts/AuthContext';
import { useUnsavedChanges } from '@/contexts/UnsavedChangesContext';
import { canPermission } from '@/lib/auth/permissions';
import { canOpenPage } from '@/lib/auth/page-access';
import { isConflictError } from '@/lib/query/list-query-defaults';
import { handOffScreen } from '@/lib/navigation/target-handoff';
import { CmsDocumentView } from '@/components/cms/CmsDocumentView';
import {
  CMS_LAYOUT_LABELS,
  changeSectionLayout,
  createSection,
  hasVisibleContent,
  normalizeCmsDocument,
  sameCmsDocument,
  type CmsDocument,
  type CmsLayout,
} from '@/lib/cms/document';
import { cmsService, type CmsPageDetail } from '@/services/business/cms/CmsService';
import { cmsKeys, cmsQueryOptions } from '@/queries/cms-query-options';
import { SectionEditor } from './SectionEditor';
import {
  contentPageDraftFormSchema,
  contentPageDraftValidationLabels,
  contentPagePublishFormSchema,
  contentPagePublishValidationLabels,
} from './content-page-form-validation';

export const STATUS_LABELS: Record<string, string> = { DRAFT: '초안', PUBLISHED: '게시 중', ARCHIVED: '보관' };

interface Draft {
  contsPathNm: string;
  contsTtl: string;
  contsExpln: string;
  document: CmsDocument;
}

type PendingAction = 'save' | 'unpublish' | 'archive' | 'unarchive' | 'home';

const draftOf = (detail: CmsPageDetail): Draft => ({
  contsPathNm: detail.contsPathNm ?? '',
  contsTtl: detail.contsTtl ?? '',
  contsExpln: detail.contsExpln ?? '',
  document: detail.document,
});

const sameDraft = (left: Draft, right: Draft) => left.contsPathNm === right.contsPathNm
  && left.contsTtl.trim() === right.contsTtl.trim() && left.contsExpln.trim() === right.contsExpln.trim()
  && sameCmsDocument(left.document, right.document);

export interface ContentPageEditorHandle {
  save: () => Promise<void>;
}

interface ContentPageEditorProps {
  contsSn: number;
  onDirtyChange: (dirty: boolean) => void;
}

const STATE_MESSAGES = {
  unpublish: '게시를 중지했습니다. 사용자에게 더 이상 보이지 않습니다.',
  archive: '페이지를 보관했습니다.',
  unarchive: '보관을 해제했습니다. 다시 게시하기 전까지 사용자에게 보이지 않습니다.',
} as const;

/**
 * 콘텐츠 페이지 하나의 초안 편집(ADR-0039). 초안 저장은 게시본을 바꾸지 않는다. 게시는 저장한 초안을 화면이 읽은 버전에 묶어
 * 보내고, 다른 사람이 먼저 바꿨으면(409) 입력을 지우지 않고 알린다. 열람 범위는 1차에서 로그인 사용자 전체다.
 *
 * 쓰기는 한 번에 하나다 — 동기 잠금(ref)이 두 번째 누름을 막고, 처리 중인 단추는 비활성·aria-busy 로 보인다.
 */
export const ContentPageEditor = React.forwardRef<ContentPageEditorHandle, ContentPageEditorProps>(
  function ContentPageEditor({ contsSn, onDirtyChange }, ref) {
    const { user } = useAuth();
    const canUpdate = canPermission(user, 'CMS_UPDATE');
    const canPublish = canPermission(user, 'CMS_PUBLISH');
    const canHome = canPermission(user, 'CMS_HOME_UPDATE');
    const canUpload = canPermission(user, 'FILE_UPLOAD');
    const canOpenMenus = canOpenPage(user, '/admin/system/menus');
    const queryClient = useQueryClient();
    const router = useRouter();
    const { toast } = useToast();
    const confirm = useConfirm();
    const detail = useQuery(cmsQueryOptions.detail(contsSn));
    const home = useQuery(cmsQueryOptions.home());

    const [baseline, setBaseline] = React.useState<CmsPageDetail | null>(null);
    const [draft, setDraft] = React.useState<Draft | null>(null);
    const [conflict, setConflict] = React.useState(false);
    const [announcement, setAnnouncement] = React.useState('');
    const [dialog, setDialog] = React.useState<'preview' | 'publish' | 'revisions' | null>(null);
    const [pending, setPending] = React.useState<PendingAction | null>(null);
    const pendingRef = React.useRef(false);
    const validation = useManualFormValidation(contentPageDraftFormSchema, { labels: contentPageDraftValidationLabels });

    // 서버 상세가 처음 오거나 저장·게시로 바뀌면 그것을 기준으로 삼는다. 편집 중인 입력은 409 처럼 사용자가 고르기 전에는 덮지 않는다.
    if (detail.data && detail.data !== baseline && (draft === null || (baseline && sameDraft(draft, draftOf(baseline))))) {
      setBaseline(detail.data);
      setDraft(draftOf(detail.data));
    }

    const archived = baseline?.status === 'ARCHIVED';
    const readOnly = !canUpdate || archived;
    const dirty = Boolean(draft && baseline && !sameDraft(draft, draftOf(baseline)));
    React.useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
    useUnsavedChanges(() => ({ dirty, pending: pending !== null }));

    const announce = (message: string) => setAnnouncement(message);
    const refresh = async (next?: CmsPageDetail) => {
      if (next) queryClient.setQueryData(cmsKeys.detail(contsSn), next);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: cmsKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: cmsKeys.home() }),
        queryClient.invalidateQueries({ queryKey: cmsKeys.revisions(contsSn) }),
        queryClient.invalidateQueries({ queryKey: cmsKeys.homeIntro() }),
      ]);
    };
    // 성공·실패 알림은 토스트가 읽어 준다(sonner 의 live region). announce 는 토스트 없이 바뀌는 편집 동작에만 쓴다.
    // 응답을 기다리는 동안에도 입력할 수 있다 — 요청을 보낸 뒤 바뀐 입력은 서버 응답으로 덮지 않고, 기준만 새 버전으로 옮긴다
    //   (그 입력은 저장하지 않은 변경으로 남는다). 요청을 보낸 때의 입력(sent)과 지금 입력이 같을 때만 응답으로 바꾼다.
    const accept = async (next: CmsPageDetail, message: string, sent: Draft) => {
      setConflict(false);
      setBaseline(next);
      setDraft((current) => (current && !sameDraft(current, sent) ? current : draftOf(next)));
      await refresh(next);
      toast(message, 'success');
    };

    const saveDraft = async () => {
      if (pendingRef.current || !draft || !baseline || readOnly || !dirty) return;
      const fields = validation.validate({ contsTtl: draft.contsTtl, contsPathNm: draft.contsPathNm, contsExpln: draft.contsExpln });
      if (!fields) return;
      const normalized = normalizeCmsDocument(draft.document);
      if (!normalized.ok) {
        toast(normalized.error, 'error');
        return;
      }
      pendingRef.current = true;
      setPending('save');
      try {
        const next = await cmsService.saveDraft(contsSn, { ...fields, document: normalized.document, version: baseline.version ?? 0 });
        await accept(next, '초안을 저장했습니다. 게시본은 바뀌지 않았습니다.', draft);
      } catch (error) {
        const fieldErrors = extractFieldErrors(error);
        if (isConflictError(error)) setConflict(true);
        else if (fieldErrors) validation.setFormErrors(fieldErrors);
        else toast(extractErrorMessage(error, '초안을 저장하지 못했습니다. 입력한 내용은 그대로 있습니다.'), 'error');
      } finally {
        pendingRef.current = false;
        setPending(null);
      }
    };
    React.useImperativeHandle(ref, () => ({ save: saveDraft }));

    const changeState = async (action: 'unpublish' | 'archive' | 'unarchive', question?: { title: string; message: string; confirmText: string }) => {
      if (pendingRef.current || !baseline) return;
      if (question && !(await confirm({ ...question, variant: action === 'unpublish' ? 'destructive' : undefined }))) return;
      if (pendingRef.current) return;
      pendingRef.current = true;
      setPending(action);
      const version = baseline.version ?? 0;
      try {
        const next = action === 'unpublish' ? await cmsService.unpublish(contsSn, version)
          : action === 'archive' ? await cmsService.archive(contsSn, version)
            : await cmsService.unarchive(contsSn, version);
        await accept(next, STATE_MESSAGES[action], draft ?? draftOf(baseline));
      } catch (error) {
        if (isConflictError(error)) setConflict(true);
        else toast(extractErrorMessage(error, '상태를 바꾸지 못했습니다.'), 'error');
      } finally {
        pendingRef.current = false;
        setPending(null);
      }
    };

    const toggleHome = async () => {
      if (pendingRef.current || !baseline) return;
      const isHomeNow = home.data?.contsSn === contsSn;
      const current = home.data?.contsTtl;
      const ok = await confirm(isHomeNow
        ? { title: '업무 홈 소개에서 내리기', message: '모든 사용자의 업무 홈 맨 위에서 이 페이지가 사라집니다. 페이지 게시는 그대로입니다.', confirmText: '내리기' }
        : {
          title: '업무 홈 소개로 보이기',
          message: `모든 로그인 사용자의 업무 홈 맨 위에 이 페이지의 게시본이 보입니다.${current ? ` 지금 보이는 '${current}'은(는) 내려갑니다.` : ''} 업무 홈의 다른 내용은 그대로입니다.`,
          confirmText: '업무 홈에 보이기',
        });
      if (!ok || pendingRef.current) return;
      pendingRef.current = true;
      setPending('home');
      try {
        await cmsService.updateHome(isHomeNow ? null : contsSn, home.data?.version ?? 0);
        await refresh();
        toast(isHomeNow ? '업무 홈 소개에서 내렸습니다.' : '업무 홈 맨 위에 이 페이지가 보입니다.', 'success');
      } catch (error) {
        if (isConflictError(error)) {
          await queryClient.invalidateQueries({ queryKey: cmsKeys.home() });
          toast('다른 사람이 업무 홈 소개를 먼저 바꿨습니다. 최신 상태를 다시 읽었습니다.', 'error');
        } else {
          toast(extractErrorMessage(error, '업무 홈 소개를 바꾸지 못했습니다.'), 'error');
        }
      } finally {
        pendingRef.current = false;
        setPending(null);
      }
    };

    if (detail.isError) {
      return <p role="alert" className="text-[length:var(--font-size-body)] text-destructive">페이지를 불러오지 못했습니다.</p>;
    }
    if (!baseline || !draft) {
      return <div className="h-64 animate-pulse rounded-md bg-muted" aria-label="페이지를 불러오는 중" />;
    }

    const published = baseline.status === 'PUBLISHED';
    const isHome = home.data?.contsSn === contsSn;
    const busy = pending !== null;
    const setDocument = (document: CmsDocument) => setDraft({ ...draft, document });
    const sections = draft.document.sections;
    const focusSection = (index: number, selector = 'input') => requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[data-section-index="${index}"] ${selector}`)?.focus();
    });

    const moveSection = (index: number, direction: -1 | 1) => {
      const next = [...sections];
      const [moved] = next.splice(index, 1);
      next.splice(index + direction, 0, moved);
      setDocument({ ...draft.document, sections: next });
      const position = index + direction;
      announce(`${moved.label || '영역'}을(를) ${position + 1}번째로 옮겼습니다.`);
      focusSection(position, `button[data-move="${direction < 0 ? 'up' : 'down'}"]:not(:disabled), input`);
    };
    const removeSection = async (index: number) => {
      const target = sections[index];
      const ok = await confirm({
        title: '영역 삭제',
        message: `${target.label || `${index + 1}번 영역`}과(와) 그 안의 내용 ${target.cells.length}칸을 초안에서 지웁니다. 저장하기 전에는 되돌릴 수 있습니다(변경 버리기).`,
        confirmText: '영역 삭제',
        variant: 'destructive',
      });
      if (!ok) return;
      setDocument({ ...draft.document, sections: sections.filter((_, position) => position !== index) });
      announce('영역을 지웠습니다.');
      focusSection(Math.min(index, sections.length - 2));
    };
    const changeLayout = (index: number, layout: CmsLayout) => {
      const result = changeSectionLayout(sections, index, layout);
      setDocument({ ...draft.document, sections: result.sections });
      const message = result.moved > 0
        ? `${CMS_LAYOUT_LABELS[layout]}(으)로 바꾸고 넘친 내용 ${result.moved}칸을 아래 새 영역으로 옮겼습니다.`
        : `${CMS_LAYOUT_LABELS[layout]}(으)로 바꿨습니다.`;
      announce(message);
      if (result.moved > 0) toast(message, 'info');
    };
    const addSection = (layout: CmsLayout) => {
      setDocument({ ...draft.document, sections: [...sections, createSection(sections, layout)] });
      announce(`${CMS_LAYOUT_LABELS[layout]} 영역을 더했습니다.`);
      focusSection(sections.length);
    };

    const discard = async () => {
      const ok = await confirm({ title: '변경 버리기', message: '저장하지 않은 변경을 모두 버리고 저장된 초안으로 되돌립니다.', confirmText: '변경 버리기', variant: 'destructive' });
      if (!ok) return;
      setConflict(false);
      setDraft(draftOf(baseline));
      announce('저장된 초안으로 되돌렸습니다.');
    };
    const reloadAfterConflict = async () => {
      const ok = await confirm({ title: '최신 내용 다시 읽기', message: '이 화면에서 바꾼 내용을 버리고 다른 사람이 저장한 최신 초안을 불러옵니다.', confirmText: '최신 내용 불러오기', variant: 'destructive' });
      if (!ok) return;
      const latest = await queryClient.fetchQuery({ ...cmsQueryOptions.detail(contsSn), staleTime: 0 });
      setConflict(false);
      setBaseline(latest);
      setDraft(draftOf(latest));
      announce('최신 초안을 불러왔습니다.');
    };
    const addToMenu = () => {
      const route = `/pages/${baseline.contsPathNm}`;
      if (!handOffScreen({ route, label: baseline.publishedRevision?.contsTtl ?? baseline.contsTtl ?? null })) {
        toast('메뉴 관리로 넘길 수 없는 주소입니다.', 'error');
        return;
      }
      router.push('/admin/system/menus');
    };

    return (
      <div className="space-y-4">
        <div aria-live="polite" role="status" className="sr-only">{announcement}</div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={published ? 'default' : 'secondary'}>{STATUS_LABELS[baseline.status ?? 'DRAFT']}</Badge>
          {baseline.unpublishedChanges && <Badge variant="outline">게시본과 다른 저장 초안</Badge>}
          {dirty && <Badge variant="outline">저장하지 않은 변경</Badge>}
          {isHome && <Badge variant="outline"><Home size={12} aria-hidden="true" /> 업무 홈 소개</Badge>}
          <span className="text-sm text-muted-foreground">
            {baseline.publishedRevision
              ? `지금 사용자에게 보이는 게시본 v${baseline.publishedRevision.revisionNumber}`
              : '사용자에게 보이는 게시본이 없습니다'}
          </span>
        </div>

        {conflict && (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-[length:var(--font-size-body)]">
            <p className="flex-1 text-foreground">다른 사람이 먼저 이 페이지를 바꿨습니다. 이 화면의 입력은 그대로 있습니다 — 필요한 부분을 따로 옮겨 둔 뒤 최신 내용을 불러오세요.</p>
            <Button type="button" variant="outline" size="sm" onClick={reloadAfterConflict}>최신 내용 불러오기</Button>
          </div>
        )}
        {archived && (
          <p role="status" className="rounded-md border border-border bg-muted px-4 py-3 text-[length:var(--font-size-body)]">
            보관한 페이지입니다. 고치거나 게시하려면 보관을 해제하세요.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={saveDraft} disabled={readOnly || !dirty || busy} aria-busy={pending === 'save'}>
            {pending === 'save' ? '저장 중…' : '초안 저장'}
          </Button>
          <Button type="button" variant="outline" onClick={() => setDialog('preview')}>
            <Eye size={16} aria-hidden="true" /> 미리보기
          </Button>
          {canPublish && !archived && (
            <Button type="button" variant="outline" onClick={() => setDialog('publish')} disabled={busy}>
              <Send size={16} aria-hidden="true" /> 게시하기
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => setDialog('revisions')} disabled={(baseline.revisionCount ?? 0) === 0}>
            <History size={16} aria-hidden="true" /> 게시 이력 {baseline.revisionCount ?? 0}
          </Button>
          {published && canOpenMenus && (
            <Button type="button" variant="outline" onClick={addToMenu}>
              <Link2 size={16} aria-hidden="true" /> 메뉴에 추가
            </Button>
          )}
          {canHome && published && (
            <Button type="button" variant="outline" onClick={toggleHome} disabled={busy || home.isLoading} aria-busy={pending === 'home'}>
              <Home size={16} aria-hidden="true" /> {isHome ? '업무 홈 소개에서 내리기' : '업무 홈 소개로 보이기'}
            </Button>
          )}
          {dirty && !readOnly && (
            <Button type="button" variant="ghost" onClick={discard} disabled={busy}>변경 버리기</Button>
          )}
          {canPublish && published && (
            <Button type="button" variant="ghost" disabled={busy} aria-busy={pending === 'unpublish'}
              onClick={() => changeState('unpublish', {
                title: '게시 중지',
                message: `사용자는 주소로 들어와도 이 페이지를 볼 수 없게 됩니다.${isHome ? ' 업무 홈 소개에서도 내려갑니다.' : ''} 이 페이지로 가는 메뉴는 그대로 남으니 메뉴 관리에서 정리해 주세요. 초안과 게시 이력은 남습니다.`,
                confirmText: '게시 중지',
              })}>게시 중지</Button>
          )}
          {canPublish && !published && !archived && (
            <Button type="button" variant="ghost" disabled={busy || dirty} aria-busy={pending === 'archive'}
              onClick={() => changeState('archive', { title: '보관', message: '기본 목록에서 정리합니다. 보관 목록에서 다시 해제할 수 있습니다.', confirmText: '보관' })}>
              보관
            </Button>
          )}
          {canPublish && archived && (
            <Button type="button" variant="outline" disabled={busy} aria-busy={pending === 'unarchive'}
              onClick={() => changeState('unarchive')}>보관 해제</Button>
          )}
        </div>

        <FormErrorSummary errors={validation.errors} labels={contentPageDraftValidationLabels} onNavigate={validation.focusError} />
        <fieldset disabled={readOnly} className="grid gap-3 md:grid-cols-2">
          <legend className="sr-only">페이지 정보</legend>
          <label className="flex flex-col gap-1 text-sm text-muted-foreground md:col-span-2">
            페이지 제목 <span className="sr-only">(필수)</span>
            <Input {...validation.fieldProps('contsTtl')} value={draft.contsTtl} maxLength={256} required
              onChange={(event) => { validation.clearError('contsTtl'); setDraft({ ...draft, contsTtl: event.target.value }); }} />
            {validation.errors.contsTtl ? <p {...validation.messageProps('contsTtl')} className="text-sm text-destructive" /> : null}
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted-foreground">
            주소
            <div className="flex items-center gap-1">
              <span aria-hidden="true" className="text-foreground">/pages/</span>
              <Input {...validation.fieldProps('contsPathNm')} value={draft.contsPathNm} maxLength={100}
                disabled={readOnly || baseline.pathLocked === true}
                aria-describedby={[validation.fieldProps('contsPathNm')['aria-describedby'], 'cms-path-help'].filter(Boolean).join(' ')}
                onChange={(event) => { validation.clearError('contsPathNm'); setDraft({ ...draft, contsPathNm: event.target.value.toLowerCase() }); }} />
            </div>
            <span id="cms-path-help" className="text-sm text-muted-foreground">
              {baseline.pathLocked ? '게시한 적이 있어 주소를 바꿀 수 없습니다(메뉴와 공유한 링크를 지킵니다).' : '영문 소문자·숫자·하이픈. 처음 게시하면 고정됩니다.'}
            </span>
            {validation.errors.contsPathNm ? <p {...validation.messageProps('contsPathNm')} className="text-sm text-destructive" /> : null}
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted-foreground">
            요약(제목 아래에 보임, 선택)
            <Textarea {...validation.fieldProps('contsExpln')} value={draft.contsExpln} maxLength={4000} rows={2}
              onChange={(event) => { validation.clearError('contsExpln'); setDraft({ ...draft, contsExpln: event.target.value }); }} />
            {validation.errors.contsExpln ? <p {...validation.messageProps('contsExpln')} className="text-sm text-destructive" /> : null}
          </label>
        </fieldset>

        <div className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">본문 영역 <span className="text-sm font-normal text-muted-foreground">· {sections.length}개</span></h3>
          {sections.map((section, index) => (
            <SectionEditor
              key={section.id}
              section={section}
              index={index}
              total={sections.length}
              readOnly={readOnly}
              canUpload={canUpload}
              onChange={(next) => setDocument({ ...draft.document, sections: sections.map((item, position) => (position === index ? next : item)) })}
              onLayoutChange={(layout) => changeLayout(index, layout)}
              onMove={(direction) => moveSection(index, direction)}
              onRemove={() => void removeSection(index)}
              onNotice={(message) => toast(message, 'info')}
            />
          ))}
          {!readOnly && (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="영역 더하기">
              <span className="text-sm text-muted-foreground">영역 더하기</span>
              {(Object.keys(CMS_LAYOUT_LABELS) as CmsLayout[]).map((layout) => (
                <Button key={layout} type="button" variant="outline" size="sm" disabled={sections.length >= 50} onClick={() => addSection(layout)}>
                  <Plus size={14} aria-hidden="true" /> {CMS_LAYOUT_LABELS[layout]}
                </Button>
              ))}
            </div>
          )}
          <p className="text-sm text-muted-foreground">좁은 화면에서는 영역 순서, 그 안에서는 왼쪽 칸부터 한 줄로 보입니다.</p>
        </div>

        {dialog === 'preview' && (
          <PreviewDialog draft={draft} onClose={() => setDialog(null)} />
        )}
        {dialog === 'publish' && (
          <PublishDialog
            contsSn={contsSn}
            baseline={baseline}
            dirty={dirty}
            hasContent={hasVisibleContent(draft.document)}
            onClose={() => setDialog(null)}
            onPublished={(next) => { setDialog(null); void accept(next, `게시했습니다. 로그인한 모든 사용자에게 v${next.publishedRevision?.revisionNumber ?? ''}이 보입니다.`, draft); }}
            onConflict={() => { setDialog(null); setConflict(true); }}
          />
        )}
        {dialog === 'revisions' && (
          <RevisionsDialog
            contsSn={contsSn}
            readOnly={readOnly}
            onClose={() => setDialog(null)}
            onLoad={(revision) => {
              setDialog(null);
              setDraft({ ...draft, contsTtl: revision.contsTtl ?? draft.contsTtl, contsExpln: revision.contsExpln ?? '', document: revision.document });
              toast(`게시본 v${revision.revisionNumber}을 편집기로 불러왔습니다. 저장하면 새 초안이 되고, 게시하기 전에는 사용자 화면이 바뀌지 않습니다.`, 'info');
            }}
          />
        )}
      </div>
    );
  },
);

function PreviewDialog({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const [width, setWidth] = React.useState<'desktop' | 'mobile'>('desktop');
  const normalized = normalizeCmsDocument(draft.document);
  return (
    <StandardModal isOpen onClose={onClose} title="미리보기 — 저장하지 않은 변경 포함" maxWidth="5xl">
      <div className="mb-3 flex gap-2" role="group" aria-label="미리보기 폭">
        <Button type="button" size="sm" variant={width === 'desktop' ? 'default' : 'outline'} aria-pressed={width === 'desktop'} onClick={() => setWidth('desktop')}>넓은 화면</Button>
        <Button type="button" size="sm" variant={width === 'mobile' ? 'default' : 'outline'} aria-pressed={width === 'mobile'} onClick={() => setWidth('mobile')}>휴대전화 폭</Button>
      </div>
      <div className="max-h-[70vh] overflow-auto rounded-md border border-border bg-background p-4">
        <div className={width === 'mobile' ? 'mx-auto w-[390px] max-w-full' : 'w-full'}>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{draft.contsTtl || '제목 없음'}</h1>
          {draft.contsExpln.trim() && <p className="mt-2 text-muted-foreground">{draft.contsExpln}</p>}
          {normalized.ok
            ? <CmsDocumentView document={normalized.document} className="mt-4" />
            : <p role="alert" className="mt-4 text-destructive">게시할 수 없는 내용이 있습니다: {normalized.error}</p>}
        </div>
      </div>
    </StandardModal>
  );
}

function PublishDialog({ contsSn, baseline, dirty, hasContent, onClose, onPublished, onConflict }: {
  contsSn: number;
  baseline: CmsPageDetail;
  dirty: boolean;
  hasContent: boolean;
  onClose: () => void;
  onPublished: (next: CmsPageDetail) => void;
  onConflict: () => void;
}) {
  const { toast } = useToast();
  const [note, setNote] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const submitPendingRef = React.useRef(false);
  const validation = useManualFormValidation(contentPagePublishFormSchema, { labels: contentPagePublishValidationLabels });
  const blockers = [
    dirty && '저장하지 않은 변경이 있습니다. 먼저 초안을 저장해 주세요.',
    baseline.status === 'PUBLISHED' && !baseline.unpublishedChanges && '지금 게시본과 같은 내용입니다. 바꾼 뒤 게시해 주세요.',
    !hasContent && '보이는 내용이 없습니다. 본문을 작성해 주세요.',
  ].filter((item): item is string => Boolean(item));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitPendingRef.current || blockers.length > 0) return;
    const validated = validation.validate({ rvsnRsn: note });
    if (!validated) return;
    submitPendingRef.current = true;
    setIsSubmitting(true);
    try {
      onPublished(await cmsService.publish(contsSn, baseline.version ?? 0, validated.rvsnRsn || undefined));
    } catch (error) {
      if (isConflictError(error)) {
        onConflict();
        return;
      }
      const fieldErrors = extractFieldErrors(error);
      if (fieldErrors) validation.setFormErrors(fieldErrors);
      else toast(extractErrorMessage(error, '게시하지 못했습니다. 저장한 초안은 그대로 있습니다.'), 'error');
    } finally {
      submitPendingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <StandardModal
      isOpen
      onClose={onClose}
      title="저장한 초안 게시"
      maxWidth="lg"
      closeDisabled={isSubmitting}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-3 text-[length:var(--font-size-body)]">
        <FormErrorSummary errors={validation.errors} labels={contentPagePublishValidationLabels} onNavigate={validation.focusError} />
        <p className="rounded-md border border-border bg-muted px-3 py-2 text-foreground">
          게시하면 <strong>로그인한 모든 사용자</strong>가 /pages/{baseline.contsPathNm} 에서 읽을 수 있습니다. 개인정보나 내부 전용 내용이 없는지 확인해 주세요.
          {baseline.status !== 'PUBLISHED' && ' 처음 게시하면 주소가 고정됩니다.'}
        </p>
        {blockers.length > 0 && (
          <ul role="alert" className="list-disc space-y-1 pl-5 text-destructive">
            {blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
          </ul>
        )}
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
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>취소</Button>
          <Button type="submit" disabled={blockers.length > 0 || isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? '게시 중…' : '게시'}
          </Button>
        </div>
      </form>
    </StandardModal>
  );
}

function RevisionsDialog({ contsSn, readOnly, onClose, onLoad }: {
  contsSn: number;
  readOnly: boolean;
  onClose: () => void;
  onLoad: (revision: { revisionNumber?: number; contsTtl?: string | null; contsExpln?: string | null; document: CmsDocument }) => void;
}) {
  const revisions = useQuery(cmsQueryOptions.revisions(contsSn));
  const [viewing, setViewing] = React.useState<number | null>(null);
  const revision = useQuery({ ...cmsQueryOptions.revision(contsSn, viewing ?? 0), enabled: viewing !== null });
  return (
    <StandardModal isOpen onClose={onClose} title="게시 이력" maxWidth="4xl">
      {revisions.isError && <p role="alert" className="text-destructive">게시 이력을 불러오지 못했습니다.</p>}
      <ul className="divide-y divide-border">
        {(revisions.data ?? []).map((item) => (
          <li key={item.contsRvsnSn} className="flex flex-wrap items-center gap-3 py-2">
            <span className="font-semibold tabular-nums">v{item.revisionNumber}</span>
            {item.current && <Badge>지금 보이는 게시본</Badge>}
            <span className="min-w-0 flex-1 truncate">{item.contsTtl}{item.rvsnRsn ? ` — ${item.rvsnRsn}` : ''}</span>
            <span className="text-sm tabular-nums text-muted-foreground">{item.crtDt?.replace('T', ' ').slice(0, 16)} · {item.frstRgtrId}</span>
            <Button type="button" variant="outline" size="sm" aria-pressed={viewing === item.contsRvsnSn}
              onClick={() => setViewing(item.contsRvsnSn ?? null)}>보기</Button>
          </li>
        ))}
      </ul>
      {viewing !== null && (
        <div className="mt-4 space-y-3 rounded-md border border-border p-4">
          {revision.isLoading && <p className="text-muted-foreground">불러오는 중…</p>}
          {revision.isError && <p role="alert" className="text-destructive">게시본을 불러오지 못했습니다.</p>}
          {revision.data && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-foreground">v{revision.data.revisionNumber} {revision.data.contsTtl}</h3>
                {!readOnly && (
                  <Button type="button" size="sm" onClick={() => onLoad(revision.data)}>이 내용으로 편집하기</Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground">불러오면 편집 중인 초안이 이 내용으로 바뀝니다. 저장하기 전에는 아무것도 바뀌지 않고, 주소·업무 홈 지정은 그대로입니다.</p>
              <div className="max-h-[45vh] overflow-auto rounded-md bg-background p-2">
                <CmsDocumentView document={revision.data.document} />
              </div>
            </>
          )}
        </div>
      )}
    </StandardModal>
  );
}
