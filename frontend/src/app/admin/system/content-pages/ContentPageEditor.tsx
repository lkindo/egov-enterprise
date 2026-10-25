'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, History, Home, Plus, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FormErrorSummary } from '@/components/ui/form';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { useAuth } from '@/contexts/AuthContext';
import { useUnsavedChanges } from '@/contexts/UnsavedChangesContext';
import { canPermission } from '@/lib/auth/permissions';
import { canOpenPage } from '@/lib/auth/page-access';
import { canAddScreensToMenus } from '@/lib/navigation/menu-screen-resolution';
import { handOffScreen } from '@/lib/navigation/target-handoff';
import { generalMenuState } from '@/lib/navigation/route-menu-links';
import { useMenuAccessSources } from '@/lib/navigation/use-menu-access-sources';
import { cmsPageRoute, findCmsPageMenuLinks, type CmsPageMenuLinks } from '@/lib/cms/page-menu-links';
import {
  CMS_LAYOUT_LABELS,
  changeSectionLayout,
  createSection,
  newSectionId,
  normalizeCmsDocument,
  sameCmsDocument,
  withoutAttachments,
  type CmsDocument,
  type CmsDocumentIssue,
  type CmsDocumentLocation,
  type CmsLayout,
  type CmsSection,
} from '@/lib/cms/document';
import { cmsService, type CmsPageDetail } from '@/services/business/cms/CmsService';
import { cmsKeys, cmsQueryOptions } from '@/queries/cms-query-options';
import { SectionEditor } from './SectionEditor';
import { PreviewDialog } from './PreviewDialog';
import { PublishDialog } from './PublishDialog';
import { RevisionsDialog, type LoadableRevision } from './RevisionsDialog';
import { PurgePageDialog } from './PurgeDialogs';
import { PageNextSteps } from './PageNextSteps';
import { PageMenuLinksPanel } from './PageMenuLinksPanel';
import { statusLabel } from './content-page-status';
import { cmsConflict, DUPLICATE_PATH_MESSAGE } from './content-page-errors';
import { focusDocumentLocation, issuesBySection, publishBlockers } from './content-page-issues';
import {
  contentPageDraftFormSchema,
  contentPageDraftValidationLabels,
} from './content-page-form-validation';

interface Draft {
  contsPathNm: string;
  contsTtl: string;
  contsExpln: string;
  document: CmsDocument;
}

type PendingAction = 'save' | 'unpublish' | 'archive' | 'unarchive' | 'home' | 'delete';

/** 저장을 부른 곳. 게시 대화상자의 '저장하고 게시' 면 실패했을 때 게시하지 않았다는 것까지 알린다. */
type SaveContext = 'editor' | 'publish' | 'overwrite';

const MENUS_ROUTE = '/admin/system/menus';

const draftOf = (detail: CmsPageDetail): Draft => ({
  contsPathNm: detail.contsPathNm ?? '',
  contsTtl: detail.contsTtl ?? '',
  contsExpln: detail.contsExpln ?? '',
  document: detail.document,
});

const sameDraft = (left: Draft, right: Draft) => left.contsPathNm === right.contsPathNm
  && left.contsTtl.trim() === right.contsTtl.trim() && left.contsExpln.trim() === right.contsExpln.trim()
  && sameCmsDocument(left.document, right.document);

const fieldValues = (value: Draft) => ({ contsTtl: value.contsTtl, contsPathNm: value.contsPathNm, contsExpln: value.contsExpln });

/** 다음 그림 뒤에 한다. 대화상자를 닫은 직후면 대화상자가 포커스를 되돌린 다음 차례에 한다(되돌림이 옮긴 포커스를 덮지 않게). */
function later(run: () => void, afterDialog = false) {
  const step = afterDialog ? () => { window.setTimeout(run, 0); } : run;
  if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(step);
  else window.setTimeout(step, 0);
}

/**
 * 이 페이지를 가리키는 메뉴 안내 — 게시 중지·보관·파기 확인에 넣는다. 활성 메뉴의 수와 위치를 말하고, 판정할 수 없으면(권한 없음·
 * 조회 실패·확인 중) 메뉴가 남는다는 일반 문구를 쓴다 — 메뉴가 없다고 추정하지 않는다.
 */
function menuNoteOf(links: CmsPageMenuLinks | null): string {
  if (links?.status !== 'ready') return '이 페이지로 가는 메뉴는 그대로 남으니 메뉴 관리에서 정리해 주세요.';
  const active = links.links.filter((link) => link.exposure.kind !== 'inactive');
  if (active.length === 0) return '이 페이지를 가리키는 활성 메뉴는 없습니다.';
  const shown = active.slice(0, 3).map((link) => link.path.join(' › ')).join(', ');
  const rest = active.length > 3 ? ` 외 ${active.length - 3}개` : '';
  return `이 페이지를 가리키는 메뉴 ${active.length}개(${shown}${rest})는 그대로 남습니다 — 메뉴 관리에서 정리하세요.`;
}

/** 업무 홈 소개로 두면 업무 홈의 카드를 아래로 밀 만한 문서인가 — 영역이 많거나 이미지가 있다. */
const isLongIntro = (document: CmsDocument) => document.sections.length >= 3
  || document.sections.some((section) => section.cells.some((cell) => cell.kind === 'image' && cell.atchFileSn > 0));

export interface ContentPageEditorHandle {
  save: () => Promise<void>;
}

interface ContentPageEditorProps {
  contsSn: number;
  onDirtyChange: (dirty: boolean) => void;
  /** 초안 삭제·페이지 파기로 페이지가 없어진 뒤 부른다(ADR-0042). 목록이 고른 페이지를 비우고 다시 읽는다. */
  onDeleted?: () => void;
}

const STATE_MESSAGES = {
  unpublish: '게시를 중지했습니다. 사용자에게 더 이상 보이지 않습니다.',
  archive: '페이지를 보관했습니다.',
  unarchive: '보관을 해제했습니다. 다시 게시하기 전까지 사용자에게 보이지 않습니다.',
} as const;

/**
 * 콘텐츠 페이지 하나의 초안 편집(ADR-0039·ADR-0042). 초안 저장은 게시본을 바꾸지 않는다. 게시는 저장한 초안을 화면이 읽은 버전에 묶어
 * 보내고, 다른 사람이 먼저 바꿨으면(409 C013) 입력을 지우지 않고 알린 뒤 최신 내용 불러오기와 내 변경으로 덮어쓰기 가운데 고르게
 * 한다. 이미 쓰는 주소(409 C008)는 주소 칸 오류다. 열람 범위는 로그인 사용자 전체다.
 *
 * 초안 저장은 미완성 칸을 받고(ADR-0042), 저장 전 문서 판정이 실패하면 그 영역·칸에 문제를 보이고 포커스를 옮긴다. 게시를 막는 문제는
 * 게시 대화상자가 칸마다 모아 보이고 '이 칸으로 가기' 로 데려간다.
 *
 * 쓰기는 한 번에 하나다 — 동기 잠금(ref)이 두 번째 누름을 막고, 처리 중인 단추는 비활성·aria-busy 로 보인다.
 */
export const ContentPageEditor = React.forwardRef<ContentPageEditorHandle, ContentPageEditorProps>(
  function ContentPageEditor({ contsSn, onDirtyChange, onDeleted }, ref) {
    const { user } = useAuth();
    const canUpdate = canPermission(user, 'CMS_UPDATE');
    const canPublish = canPermission(user, 'CMS_PUBLISH');
    const canHome = canPermission(user, 'CMS_HOME_UPDATE');
    const canUpload = canPermission(user, 'FILE_UPLOAD');
    const canPurge = canPermission(user, 'CMS_PURGE');
    // 메뉴에 화면을 넘기는 기준은 화면 관리와 같다 — 메뉴 등록·수정 권한과 메뉴 관리 화면 접근.
    const canAddMenu = canAddScreensToMenus(user) && canOpenPage(user, MENUS_ROUTE);
    const queryClient = useQueryClient();
    const router = useRouter();
    const { toast } = useToast();
    const confirm = useConfirm();
    const detail = useQuery(cmsQueryOptions.detail(contsSn));
    const home = useQuery(cmsQueryOptions.home());
    const { menuSource, groupSource, retry: retryMenus } = useMenuAccessSources({
      canReadMenus: canPermission(user, 'MENU_READ'),
      canReadGroups: canPermission(user, 'AUTHRT_READ'),
    });

    const [baseline, setBaseline] = React.useState<CmsPageDetail | null>(null);
    const [draft, setDraft] = React.useState<Draft | null>(null);
    const [conflict, setConflict] = React.useState(false);
    const [announcement, setAnnouncement] = React.useState('');
    const [dialog, setDialog] = React.useState<'preview' | 'publish' | 'revisions' | 'purge' | null>(null);
    const [pending, setPending] = React.useState<PendingAction | null>(null);
    // 저장 전 판정에 걸렸거나 게시 대화상자에서 칸으로 왔다 — 그때부터 문제를 칸에 살아 있게 보인다(고치면 바로 사라진다).
    const [draftCheck, setDraftCheck] = React.useState(false);
    const [publishCheck, setPublishCheck] = React.useState(false);
    const [deleted, setDeleted] = React.useState(false);
    const pendingRef = React.useRef(false);
    const rootRef = React.useRef<HTMLDivElement>(null);
    const infoFormRef = React.useRef<HTMLFormElement>(null);
    // 페이지 정보 칸의 오류 이동은 늘 이 폼 안에서 찾는다 — 게시 대화상자에서 저장할 때 포커스가 대화상자 폼에 있어도 칸을 찾게.
    const validation = useManualFormValidation(contentPageDraftFormSchema, {
      labels: contentPageDraftValidationLabels,
      form: () => infoFormRef.current,
    });

    // 서버 상세가 처음 오거나 저장·게시로 바뀌면 그것을 기준으로 삼는다. 편집 중인 입력은 409 처럼 사용자가 고르기 전에는 덮지 않는다.
    if (detail.data && detail.data !== baseline && (draft === null || (baseline && sameDraft(draft, draftOf(baseline))))) {
      setBaseline(detail.data);
      setDraft(draftOf(detail.data));
    }

    const pagePath = baseline?.contsPathNm ?? '';
    // 두 원천이 모두 확정된 뒤에 판정한다 — 확인 중인 것을 '연결 없음' 으로 판정하지 않는다.
    const menuLinks = React.useMemo(() => (menuSource === null || groupSource === null || pagePath === ''
      ? null : findCmsPageMenuLinks(pagePath, menuSource, groupSource)), [pagePath, menuSource, groupSource]);

    const archived = baseline?.status === 'ARCHIVED';
    const readOnly = !canUpdate || archived;
    const dirty = !deleted && Boolean(draft && baseline && !sameDraft(draft, draftOf(baseline)));
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
        // 사용자용 안내 페이지 목록·바로가기 주소 점검이 읽는 게시 목록 — 게시·게시 중지·파기가 바꾼다.
        queryClient.invalidateQueries({ queryKey: [...cmsKeys.all, 'published'] }),
      ]);
    };
    // 성공·실패 알림은 토스트가 읽어 준다(sonner 의 live region). announce 는 토스트 없이 바뀌는 편집 동작에만 쓴다.
    // 응답을 기다리는 동안에도 입력할 수 있다 — 요청을 보낸 뒤 바뀐 입력은 서버 응답으로 덮지 않고, 기준만 새 버전으로 옮긴다
    //   (그 입력은 저장하지 않은 변경으로 남는다). 요청을 보낸 때의 입력(sent)과 지금 입력이 같을 때만 응답으로 바꾼다.
    //   초안을 보내지 않는 동작(게시·상태 변경·게시본 파기)은 응답의 초안을 sent 로 준다 — 저장하지 않은 변경이 있으면 그대로 남는다.
    const accept = async (next: CmsPageDetail, message: string | null, sent: Draft) => {
      setConflict(false);
      setBaseline(next);
      setDraft((current) => (current && !sameDraft(current, sent) ? current : draftOf(next)));
      await refresh(next);
      if (message) toast(message, 'success');
    };

    /** 저장 전 판정을 화면에 보인다 — 칸 오류는 그 칸에, 본문 문제는 그 영역·칸에 표시하고 첫 문제로 포커스를 옮긴다. */
    const showDraftProblems = (value: Draft) => {
      const fields = validation.validate(fieldValues(value));
      const normalized = normalizeCmsDocument(value.document, 'draft');
      if (normalized.ok) return;
      setDraftCheck(true);
      if (normalized.location.section === undefined) {
        toast(`본문을 저장하지 못했습니다. ${normalized.error}. 입력한 내용은 그대로 있습니다.`, 'error');
        return;
      }
      // 페이지 정보 칸에도 오류가 있으면 그 칸이 먼저다(검증이 포커스를 옮긴다).
      if (fields) later(() => { focusDocumentLocation(rootRef.current, normalized.location); });
    };

    /**
     * 초안 저장의 공통 경로. base 의 버전으로 value 를 보낸다. 게시 대화상자에서 부르면(publish) 실패할 때 대화상자를 먼저 닫고 문제를
     * 그 칸에 보인다 — 대화상자 뒤에 가린 칸을 가리키면 고칠 수 없다. 쓰기는 한 번에 하나다(동기 잠금).
     */
    const performSave = async (base: CmsPageDetail, value: Draft, context: SaveContext): Promise<CmsPageDetail | null> => {
      if (pendingRef.current) return null;
      const fields = contentPageDraftFormSchema.safeParse(fieldValues(value));
      const normalized = normalizeCmsDocument(value.document, 'draft');
      if (!fields.success || !normalized.ok) {
        if (context === 'publish') {
          setDialog(null);
          later(() => showDraftProblems(value), true);
          toast('초안을 저장하지 못해 게시하지 않았습니다. 표시한 곳을 고친 뒤 다시 게시해 주세요.', 'error');
        } else {
          showDraftProblems(value);
        }
        return null;
      }
      pendingRef.current = true;
      setPending('save');
      try {
        const next = await cmsService.saveDraft(contsSn, { ...fields.data, document: normalized.document, version: base.version ?? 0 });
        setDraftCheck(false);
        validation.setFormErrors({}, false);
        await accept(next, context === 'publish' ? null
          : context === 'overwrite' ? '내 변경으로 덮어써 초안을 저장했습니다. 게시본은 바뀌지 않았습니다.'
            : '초안을 저장했습니다. 게시본은 바뀌지 않았습니다.', value);
        return next;
      } catch (error) {
        // 실패를 알린다 — 동시 수정(409 C013)은 배너, 이미 쓰는 주소(409 C008)·필드 오류는 그 칸, 그 밖은 사유 토스트. 입력은 그대로다.
        const report = () => {
          const notPublished = '초안을 저장하지 못해 게시하지 않았습니다.';
          const conflictKind = cmsConflict(error);
          if (conflictKind === 'concurrent') {
            setConflict(true);
            return;
          }
          const fieldErrors = extractFieldErrors(error);
          if (conflictKind === 'duplicate-path') validation.setFormErrors({ contsPathNm: DUPLICATE_PATH_MESSAGE });
          else if (fieldErrors) validation.setFormErrors(fieldErrors);
          else {
            toast(extractErrorMessage(error, context === 'publish'
              ? `${notPublished} 입력한 내용은 그대로 있습니다.`
              : '초안을 저장하지 못했습니다. 입력한 내용은 그대로 있습니다.'), 'error');
            return;
          }
          if (context === 'publish') toast(`${notPublished} 표시한 칸을 고친 뒤 다시 게시해 주세요.`, 'error');
        };
        if (context === 'publish') {
          setDialog(null);
          later(report, true);
        } else {
          report();
        }
        return null;
      } finally {
        pendingRef.current = false;
        setPending(null);
      }
    };

    const saveDraft = async () => {
      if (pendingRef.current || !draft || !baseline || readOnly || !dirty) return;
      await performSave(baseline, draft, 'editor');
    };
    React.useImperativeHandle(ref, () => ({ save: saveDraft }));

    if (detail.isError && !deleted) {
      return <p role="alert" className="text-[length:var(--font-size-body)] text-destructive">페이지를 불러오지 못했습니다.</p>;
    }
    if (deleted) {
      return <p role="status" className="text-[length:var(--font-size-body)] text-muted-foreground">이 페이지는 없어졌습니다. 목록에서 다른 페이지를 고르세요.</p>;
    }
    if (!baseline || !draft) {
      return <div className="h-64 animate-pulse rounded-md bg-muted" aria-label="페이지를 불러오는 중" />;
    }

    const published = baseline.status === 'PUBLISHED';
    const isHome = home.data?.contsSn === contsSn;
    const busy = pending !== null;
    const revisionCount = baseline.revisionCount ?? 0;
    const sections = draft.document.sections;
    const menuNote = menuNoteOf(menuLinks);
    const menuState = menuLinks === null ? null : generalMenuState(menuLinks);
    const setDocument = (document: CmsDocument) => setDraft({ ...draft, document });
    /**
     * 영역 하나를 바꾼다 — 지금의 초안에서 영역 식별자로 찾아 바꾼다(함수형). 늦게 끝난 올리기처럼 렌더 뒤에 오는 변경이 그사이의 다른
     * 편집을 덮지 않고, 그사이 지운 영역을 되살리지 않는다.
     */
    const updateSection = (next: CmsSection) => setDraft((current) => current && ({
      ...current,
      document: {
        ...current.document,
        sections: current.document.sections.map((item) => (item.id === next.id ? next : item)),
      },
    }));

    // 칸에 보일 문제. 초안 판정이 실패하면 그 하나가 먼저다(형식이 깨진 문서의 게시 문제는 뜻이 없다).
    const draftResult = draftCheck ? normalizeCmsDocument(draft.document, 'draft') : null;
    const liveIssues: CmsDocumentIssue[] = draftResult && !draftResult.ok
      ? [{ ...draftResult.location, message: draftResult.error }]
      : publishCheck && !readOnly ? publishBlockers(draft.document) : [];
    const sectionIssues = issuesBySection(liveIssues);

    const changeState = async (action: 'unpublish' | 'archive' | 'unarchive', question?: { title: string; message: string; confirmText: string }) => {
      if (pendingRef.current) return;
      if (question && !(await confirm({ ...question, variant: action === 'unpublish' ? 'destructive' : undefined }))) return;
      if (pendingRef.current) return;
      pendingRef.current = true;
      setPending(action);
      const version = baseline.version ?? 0;
      try {
        const next = action === 'unpublish' ? await cmsService.unpublish(contsSn, version)
          : action === 'archive' ? await cmsService.archive(contsSn, version)
            : await cmsService.unarchive(contsSn, version);
        await accept(next, STATE_MESSAGES[action], draftOf(next));
      } catch (error) {
        if (cmsConflict(error) === 'concurrent') setConflict(true);
        else toast(extractErrorMessage(error, '상태를 바꾸지 못했습니다.'), 'error');
      } finally {
        pendingRef.current = false;
        setPending(null);
      }
    };

    const toggleHome = async () => {
      if (pendingRef.current) return;
      const isHomeNow = home.data?.contsSn === contsSn;
      const current = home.data?.contsSn ? home.data.contsTtl : undefined;
      const ok = await confirm(isHomeNow
        ? {
          title: '업무 홈 소개에서 내리기',
          message: '업무 홈을 볼 수 있는 모든 사용자의 업무 홈 맨 위에서 이 페이지가 사라집니다. 페이지 게시는 그대로입니다.',
          confirmText: '내리기',
        }
        : {
          title: '업무 홈 소개로 보이기',
          message: `업무 홈을 볼 수 있는 모든 사용자의 업무 홈 맨 위에 이 페이지의 게시본이 보입니다.${current ? ` 지금 보이는 ‘${current}’은(는) 내려갑니다.` : ''}`
            + `${isLongIntro(baseline.document) ? ' 영역이 많거나 이미지가 있어 업무 홈의 카드가 아래로 밀릴 수 있습니다.' : ''} 업무 홈의 다른 내용은 그대로입니다.`,
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
        if (cmsConflict(error) === 'concurrent') {
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

    /** 페이지가 없어졌다(초안 삭제·파기). 목록을 다시 읽게 하고 목록에 알린다. */
    const finishRemoval = (message: string) => {
      setDeleted(true);
      toast(message, 'success');
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: cmsKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: cmsKeys.home() }),
        queryClient.invalidateQueries({ queryKey: cmsKeys.homeIntro() }),
        queryClient.invalidateQueries({ queryKey: [...cmsKeys.all, 'published'] }),
      ]);
      onDeleted?.();
    };

    const deletePage = async () => {
      if (pendingRef.current) return;
      const name = baseline.contsTtl || '이 페이지';
      const ok = await confirm({
        title: '페이지 삭제',
        message: `‘${name}’ 페이지를 지웁니다. 저장한 초안과 이 페이지에 올린 이미지·내려받기 파일도 함께 지워지고 되살릴 수 없습니다. `
          + `한 번도 게시하지 않아 사용자에게 보인 적은 없습니다.${dirty ? ' 이 화면에서 저장하지 않은 변경도 함께 버려집니다.' : ''}`,
        confirmText: '페이지 삭제',
        variant: 'destructive',
      });
      if (!ok || pendingRef.current) return;
      pendingRef.current = true;
      setPending('delete');
      try {
        await cmsService.deleteDraftPage(contsSn, baseline.version ?? 0);
        finishRemoval('페이지를 지웠습니다.');
      } catch (error) {
        if (cmsConflict(error) === 'concurrent') setConflict(true);
        else toast(extractErrorMessage(error, '페이지를 지우지 못했습니다. 페이지와 입력한 내용은 그대로 있습니다.'), 'error');
      } finally {
        pendingRef.current = false;
        setPending(null);
      }
    };

    // 옮긴 영역의 같은 방향 이동 단추로 포커스를 둔다 — 끝에 닿아 비활성이면 반대 방향, 둘 다 없으면 그 영역의 첫 입력.
    //   선택자는 옮긴 영역 안에서만 찾는다(문서 전체의 첫 입력으로 튀지 않게).
    const focusMovedSection = (position: number, direction: -1 | 1) => later(() => {
      const root = rootRef.current?.querySelector<HTMLElement>(`[data-section-index="${position}"]`);
      if (!root) return;
      const same = direction < 0 ? 'up' : 'down';
      const other = direction < 0 ? 'down' : 'up';
      (root.querySelector<HTMLElement>(`button[data-move="${same}"]:not(:disabled)`)
        ?? root.querySelector<HTMLElement>(`button[data-move="${other}"]:not(:disabled)`)
        ?? root.querySelector<HTMLElement>('input:not(:disabled)'))?.focus();
    });
    const focusSectionStart = (position: number) => later(() => { focusDocumentLocation(rootRef.current, { section: position }); });

    const moveSection = (index: number, direction: -1 | 1) => {
      const next = [...sections];
      const [moved] = next.splice(index, 1);
      next.splice(index + direction, 0, moved);
      setDocument({ ...draft.document, sections: next });
      const position = index + direction;
      announce(`${moved.label || '영역'}을(를) ${position + 1}번째로 옮겼습니다.`);
      focusMovedSection(position, direction);
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
      // 확인을 기다리는 동안 다른 변경(늦게 끝난 올리기 등)이 왔을 수 있다 — 지금의 초안에서 이 영역만 뺀다.
      setDraft((current) => current && ({
        ...current,
        document: { ...current.document, sections: current.document.sections.filter((item) => item.id !== target.id) },
      }));
      announce('영역을 지웠습니다.');
      focusSectionStart(Math.min(index, sections.length - 2));
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
      focusSectionStart(sections.length);
    };
    const insertBelow = (index: number, layout: CmsLayout) => {
      const next = [...sections];
      next.splice(index + 1, 0, createSection(sections, layout));
      setDocument({ ...draft.document, sections: next });
      announce(`${index + 2}번째에 ${CMS_LAYOUT_LABELS[layout]} 영역을 더했습니다.`);
      focusSectionStart(index + 1);
    };
    // 복제는 첨부를 뗀다 — 한 첨부는 한 곳에만 쓴다(같은 파일을 두 칸에 두면 저장이 거부된다). 새 식별자로 만들어 원본과 섞이지 않게 한다.
    const duplicateSection = (index: number) => {
      const source = sections[index];
      const [stripped] = withoutAttachments({ schemaVersion: 1, sections: [source] }).sections;
      const copy: CmsSection = {
        ...(JSON.parse(JSON.stringify(stripped)) as CmsSection),
        id: newSectionId(sections),
        label: source.label ? `${source.label} (복제)`.slice(0, 80) : '',
      };
      const droppedFiles = source.cells.some((cell) => (cell.kind === 'image' && cell.atchFileSn > 0)
        || (cell.kind === 'files' && cell.items.length > 0));
      const next = [...sections];
      next.splice(index + 1, 0, copy);
      setDocument({ ...draft.document, sections: next });
      const name = source.label || `${index + 1}번 영역`;
      announce(`${name}을(를) 바로 아래에 복제했습니다.`);
      if (droppedFiles) toast(`${name}을(를) 복제했습니다. 이미지와 내려받기 파일은 한 곳에만 쓸 수 있어 복제하지 않았습니다. 복제한 영역에 다시 올려 주세요.`, 'info');
      focusSectionStart(index + 1);
    };

    const discard = async () => {
      const ok = await confirm({ title: '변경 버리기', message: '저장하지 않은 변경을 모두 버리고 저장된 초안으로 되돌립니다.', confirmText: '변경 버리기', variant: 'destructive' });
      if (!ok) return;
      setConflict(false);
      setDraftCheck(false);
      setPublishCheck(false);
      validation.setFormErrors({}, false);
      setDraft(draftOf(baseline));
      announce('저장된 초안으로 되돌렸습니다.');
    };

    /** 최신 상세를 서버에서 다시 읽는다. 실패하면 알리고 null. */
    const fetchLatest = async () => {
      try {
        return await queryClient.fetchQuery({ ...cmsQueryOptions.detail(contsSn), staleTime: 0 });
      } catch (error) {
        toast(extractErrorMessage(error, '최신 내용을 불러오지 못했습니다. 이 화면의 입력은 그대로 있습니다. 다시 시도해 주세요.'), 'error');
        return null;
      }
    };
    // 바꾼 것이 없으면 묻지 않는다 — 버릴 것이 없다.
    const reloadAfterConflict = async () => {
      if (dirty && !(await confirm({
        title: '최신 내용 불러오기',
        message: '이 화면에서 바꾼 내용을 버리고 다른 사람이 저장한 최신 초안을 불러옵니다.',
        confirmText: '변경 버리고 불러오기',
        variant: 'destructive',
      }))) return;
      const latest = await fetchLatest();
      if (!latest) return;
      setConflict(false);
      setDraftCheck(false);
      setPublishCheck(false);
      validation.setFormErrors({}, false);
      setBaseline(latest);
      setDraft(draftOf(latest));
      announce('최신 초안을 불러왔습니다.');
    };
    // 최신 버전을 읽어 그 버전으로 이 화면의 초안을 다시 저장한다 — 다른 사람이 저장한 초안은 버려진다(게시본은 그대로다).
    const overwriteAfterConflict = async () => {
      if (pendingRef.current) return;
      const ok = await confirm({
        title: '내 변경으로 덮어쓰기',
        message: '다른 사람이 저장한 초안을 버리고 이 화면의 내용으로 초안을 다시 저장합니다. 게시본은 바뀌지 않습니다.',
        confirmText: '내 변경으로 덮어쓰기',
        variant: 'destructive',
      });
      if (!ok || pendingRef.current) return;
      const latest = await fetchLatest();
      if (!latest) return;
      setBaseline(latest);
      // 그사이 처음 게시돼 주소가 고정됐으면 내가 바꾼 주소는 저장할 수 없다 — 고정된 주소로 되돌리고 나머지 변경으로 덮어쓴다.
      let value = draft;
      if (latest.pathLocked && latest.contsPathNm && draft.contsPathNm !== latest.contsPathNm) {
        value = { ...draft, contsPathNm: latest.contsPathNm };
        setDraft((current) => current && ({ ...current, contsPathNm: latest.contsPathNm ?? current.contsPathNm }));
        toast('그사이 게시돼 주소가 고정됐습니다. 주소는 게시된 주소로 되돌리고 나머지 변경으로 덮어씁니다.', 'info');
      }
      await performSave(latest, value, 'overwrite');
    };

    const loadRevision = async (revision: LoadableRevision) => {
      if (dirty && !(await confirm({
        title: '게시본 불러오기',
        message: `저장하지 않은 변경을 버리고 편집 중인 초안을 게시본 v${revision.revisionNumber}의 내용으로 바꿉니다. 저장하기 전에는 사용자 화면이 바뀌지 않습니다.`,
        confirmText: '변경 버리고 불러오기',
        variant: 'destructive',
      }))) return;
      setDialog(null);
      setDraftCheck(false);
      validation.setFormErrors({}, false);
      setDraft((current) => current && ({
        ...current,
        contsTtl: revision.contsTtl ?? current.contsTtl,
        contsExpln: revision.contsExpln ?? '',
        document: revision.document,
      }));
      toast(`게시본 v${revision.revisionNumber}을 편집기로 불러왔습니다. 저장하면 새 초안이 되고, 게시하기 전에는 사용자 화면이 바뀌지 않습니다.`, 'info');
    };

    const goToIssue = (location: CmsDocumentLocation) => {
      setDialog(null);
      setPublishCheck(true);
      later(() => { focusDocumentLocation(rootRef.current, location); }, true);
    };

    const addToMenu = () => {
      const label = baseline.publishedRevision?.contsTtl ?? baseline.contsTtl ?? null;
      if (!handOffScreen({ route: cmsPageRoute(pagePath), label })) {
        toast('메뉴 관리로 넘기지 못했습니다. 메뉴 관리에서 이 페이지 주소를 직접 등록해 주세요.', 'error');
        return;
      }
      router.push(MENUS_ROUTE);
    };

    const stateActions = [
      canPublish && published,
      canPublish && !published && !archived,
      canPublish && archived,
      canUpdate && revisionCount === 0,
      canPurge && !published && revisionCount > 0,
    ].some(Boolean);

    return (
      <div ref={rootRef} className="space-y-4">
        <div aria-live="polite" role="status" className="sr-only">{announcement}</div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={published ? 'default' : 'secondary'}>{statusLabel(baseline.status)}</Badge>
          {published && baseline.unpublishedChanges && <Badge variant="outline">게시본과 다른 저장 초안</Badge>}
          {dirty && <Badge variant="outline">저장하지 않은 변경</Badge>}
          {isHome && <Badge variant="outline"><Home size={12} aria-hidden="true" /> 업무 홈 소개</Badge>}
          <span className="text-sm text-muted-foreground">
            {baseline.publishedRevision
              ? `지금 사용자에게 보이는 게시본 v${baseline.publishedRevision.revisionNumber}`
              : '사용자에게 보이는 게시본이 없습니다'}
          </span>
        </div>

        {published && pagePath && (
          <PageNextSteps
            contsPathNm={pagePath}
            menuState={menuState}
            canAddMenu={canAddMenu}
            onAddToMenu={addToMenu}
            home={canHome ? { isHome, pending: pending === 'home', disabled: busy || home.isLoading, onToggle: () => void toggleHome() } : null}
          />
        )}

        {baseline.documentError && (
          <div role="alert" className="space-y-2 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-[length:var(--font-size-body)] text-foreground">
            <p className="font-semibold">저장된 초안의 본문을 읽지 못해 빈 본문으로 열었습니다.</p>
            <p>읽지 못한 까닭: {baseline.documentError}</p>
            <p>
              저장된 초안은 서버에 그대로 있습니다.{' '}
              {revisionCount > 0 ? '게시 이력에서 지난 게시본을 불러와 고치세요.' : '불러올 게시본이 없으니 본문을 다시 작성하세요.'}{' '}
              이대로 저장하면 저장된 초안이 지금 화면의 내용으로 바뀝니다.
            </p>
            {revisionCount > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={() => setDialog('revisions')}>
                <History size={16} aria-hidden="true" /> 게시 이력 열기
              </Button>
            )}
          </div>
        )}
        {conflict && (
          <div role="alert" className="space-y-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-[length:var(--font-size-body)]">
            <p className="text-foreground">
              다른 사람이 먼저 이 페이지를 바꿨습니다. 그래서 이 화면의 요청을 저장하지 않았습니다. 이 화면의 입력은 그대로 있습니다 — 둘 중 하나를 고르세요.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => void reloadAfterConflict()} disabled={busy}>
                {dirty ? '최신 내용 불러오기(이 화면의 변경을 버림)' : '최신 내용 불러오기'}
              </Button>
              {dirty && !readOnly && (
                <Button type="button" variant="outline" size="sm" onClick={() => void overwriteAfterConflict()} disabled={busy}
                  aria-busy={pending === 'save'}>
                  내 변경으로 덮어쓰기(다른 사람의 저장 내용을 버림)
                </Button>
              )}
            </div>
          </div>
        )}
        {archived && (
          <p role="status" className="rounded-md border border-border bg-muted px-4 py-3 text-[length:var(--font-size-body)]">
            보관한 페이지입니다. 고치거나 게시하려면 보관을 해제하세요.
          </p>
        )}

        {stateActions && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="페이지 상태">
            {canPublish && published && (
              <Button type="button" variant="ghost" disabled={busy} aria-busy={pending === 'unpublish'}
                onClick={() => changeState('unpublish', {
                  title: '게시 중지',
                  message: `사용자는 주소로 들어와도 이 페이지를 볼 수 없게 됩니다.${isHome ? ' 업무 홈 소개에서도 내려갑니다.' : ''} ${menuNote} 초안과 게시 이력은 남습니다.`,
                  confirmText: '게시 중지',
                })}>게시 중지</Button>
            )}
            {canPublish && !published && !archived && (
              <Button type="button" variant="ghost" disabled={busy || dirty} aria-busy={pending === 'archive'}
                onClick={() => changeState('archive', {
                  title: '보관',
                  message: `기본 목록에서 정리합니다. 보관 목록에서 다시 해제할 수 있습니다. ${menuNote}`,
                  confirmText: '보관',
                })}>
                보관
              </Button>
            )}
            {canPublish && archived && (
              <Button type="button" variant="outline" disabled={busy} aria-busy={pending === 'unarchive'}
                onClick={() => changeState('unarchive')}>보관 해제</Button>
            )}
            {canUpdate && revisionCount === 0 && (
              <Button type="button" variant="ghost" className="text-destructive-emphasis" disabled={busy} aria-busy={pending === 'delete'}
                onClick={() => void deletePage()}>
                <Trash2 size={16} aria-hidden="true" /> 페이지 삭제
              </Button>
            )}
            {canPurge && !published && revisionCount > 0 && (
              <Button type="button" variant="ghost" className="text-destructive-emphasis" disabled={busy}
                onClick={() => setDialog('purge')}>
                <Trash2 size={16} aria-hidden="true" /> 영구 파기
              </Button>
            )}
          </div>
        )}

        <div role="group" aria-label="저장과 게시"
          className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-2 border-b border-border bg-card px-1 py-2">
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
          <Button type="button" variant="outline" onClick={() => setDialog('revisions')} disabled={revisionCount === 0}>
            <History size={16} aria-hidden="true" /> 게시 이력 {revisionCount}
          </Button>
          {dirty && !readOnly && (
            <Button type="button" variant="ghost" onClick={discard} disabled={busy}>변경 버리기</Button>
          )}
        </div>
        {canUpdate && !canPublish && !archived && (
          <p className="text-sm text-muted-foreground">게시는 콘텐츠 게시 권한자가 합니다. 저장한 초안은 목록의 ‘게시 대기’에 보입니다.</p>
        )}

        <FormErrorSummary errors={validation.errors} labels={contentPageDraftValidationLabels} onNavigate={validation.focusError} />
        <form ref={infoFormRef} noValidate onSubmit={(event) => event.preventDefault()}>
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
        </form>

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
              issues={sectionIssues.get(index)}
              onChange={updateSection}
              onLayoutChange={(layout) => changeLayout(index, layout)}
              onMove={(direction) => moveSection(index, direction)}
              onRemove={() => void removeSection(index)}
              onNotice={(message) => toast(message, 'info')}
              onInsertBelow={(layout) => insertBelow(index, layout)}
              onDuplicate={() => duplicateSection(index)}
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

        {pagePath && (
          <PageMenuLinksPanel
            contsPathNm={pagePath}
            title={baseline.contsTtl ?? pagePath}
            links={menuLinks}
            menuSource={menuSource}
            groupSource={groupSource}
            retry={retryMenus}
          />
        )}

        {dialog === 'preview' && (
          <PreviewDialog draft={draft} onClose={() => setDialog(null)} />
        )}
        {dialog === 'publish' && (
          <PublishDialog
            contsSn={contsSn}
            baseline={baseline}
            draft={draft}
            dirty={dirty}
            isHome={isHome}
            canEdit={!readOnly}
            onClose={() => setDialog(null)}
            onSaveDraft={async () => {
              if (pendingRef.current || readOnly) return null;
              return dirty ? performSave(baseline, draft, 'publish') : baseline;
            }}
            onPublished={(next) => {
              setDialog(null);
              setPublishCheck(false);
              const number = next.publishedRevision?.revisionNumber;
              void accept(next, `게시했습니다. 로그인 사용자는 이제 주소와 안내 페이지 목록에서 v${number ?? ''} 게시본을 봅니다.`
                + `${menuState === 'pass' ? '' : ' 사이드바에서 찾게 하려면 메뉴에 연결하세요.'}`, draftOf(next));
            }}
            onConflict={() => { setDialog(null); setConflict(true); }}
            onGoToIssue={goToIssue}
          />
        )}
        {dialog === 'revisions' && (
          <RevisionsDialog
            contsSn={contsSn}
            version={baseline.version ?? 0}
            readOnly={readOnly}
            canPurge={canPurge}
            onClose={() => setDialog(null)}
            onLoad={(revision) => void loadRevision(revision)}
            onPurged={(next, number) => {
              void queryClient.invalidateQueries({ queryKey: [...cmsKeys.all, 'revision', contsSn] });
              void accept(next, `게시본 v${number}을 파기했습니다. 뒤에 게시한 본의 번호는 하나씩 당겨집니다.`, draftOf(next));
            }}
            onConflict={() => { setDialog(null); setConflict(true); }}
          />
        )}
        {dialog === 'purge' && (
          <PurgePageDialog
            contsSn={contsSn}
            contsPathNm={pagePath}
            version={baseline.version ?? 0}
            revisionCount={revisionCount}
            dirty={dirty}
            menuNote={menuNote}
            onClose={() => setDialog(null)}
            onPurged={() => { setDialog(null); finishRemoval('페이지를 파기했습니다.'); }}
            onConflict={() => { setDialog(null); setConflict(true); }}
          />
        )}
      </div>
    );
  },
);
