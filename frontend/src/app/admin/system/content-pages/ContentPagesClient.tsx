'use client';

import React from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Home, Info, Plus, Search } from 'lucide-react';
import { MasterDetailPage } from '@/app/components/patterns/master-detail-page';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FormErrorSummary } from '@/components/ui/form';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { usePageClamp } from '@/lib/hooks/use-page-clamp';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { summarizeError } from '@/lib/safe-error-log';
import { generalMenuState } from '@/lib/navigation/route-menu-links';
import { useMenuAccessSources } from '@/lib/navigation/use-menu-access-sources';
import { cn } from '@/lib/utils';
import {
  CMS_TEMPLATE_LABELS,
  templateDocument,
  withoutAttachments,
  type CmsDocument,
  type CmsTemplate,
} from '@/lib/cms/document';
import { takeContentPageHandoff } from '@/lib/cms/editor-handoff';
import { findCmsPageMenuLinks } from '@/lib/cms/page-menu-links';
import { cmsService, type CmsPageSummary } from '@/services/business/cms/CmsService';
import { cmsKeys, cmsQueryOptions, type CmsPageListParams } from '@/queries/cms-query-options';
import { ContentPageEditor, type ContentPageEditorHandle } from './ContentPageEditor';
import { ContentPageGuide } from './ContentPageGuide';
import { statusLabel } from './content-page-status';
import {
  contentPageCreateFormSchema,
  contentPageCreateValidationLabels,
} from './content-page-form-validation';

const PAGE_SIZE = 20;
type StatusFilter = CmsPageListParams['status'];

/**
 * 목록의 상태 조건(ADR-0042). '전체' 는 보관을 뺀 전체다. 뜻이 이름만으로 갈리지 않는 조건은 고르면 한 줄 설명을 함께 보인다.
 */
const STATUS_FILTERS: ReadonlyArray<{ value: StatusFilter; label: string; hint?: string }> = [
  { value: 'ACTIVE', label: '전체(보관 제외)' },
  { value: 'PENDING', label: '게시 대기', hint: '한 번도 게시하지 않은 초안과, 게시한 뒤 저장한 수정이 아직 게시되지 않은 페이지입니다.' },
  { value: 'PUBLISHED', label: '게시 중' },
  { value: 'UNPUBLISHED', label: '게시 중지', hint: '게시한 적이 있지만 지금은 사용자에게 보이지 않게 내린 페이지입니다.' },
  { value: 'DRAFT', label: '초안', hint: '한 번도 게시하지 않은 페이지입니다.' },
  { value: 'ARCHIVED', label: '보관' },
];

const filterLabel = (status: StatusFilter) => STATUS_FILTERS.find((filter) => filter.value === status)?.label ?? status;

/** 전송 날짜·시각('2026-10-25T09:30:00')의 날짜 부분(yyyy-MM-dd). 값이 없거나 형식이 다르면 null 이다. */
function dateOf(value: string | null | undefined): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value ?? '');
  return match ? match[1] : null;
}

/** 고른 페이지와 그 마지막 제목. 목록 쪽을 옮기거나 조건을 바꿔 그 행이 목록에서 빠져도 편집 머리의 제목은 그대로다. */
interface Selection {
  contsSn: number;
  title: string;
}

/**
 * 콘텐츠 페이지 관리(ADR-0039·ADR-0042) — A2 마스터-디테일. 왼쪽은 페이지 목록(최근 수정 순), 오른쪽은 고른 페이지의 초안 편집이다.
 * 페이지와 메뉴는 따로 저장한다: 게시한 뒤 '메뉴에 추가' 로 기존 메뉴 관리에 주소를 넘긴다. 게시 중인데 일반 사용자 그룹에 보이는
 * 활성 메뉴가 없는 페이지는 목록이 '메뉴 연결 없음' 으로 알린다(메뉴·그룹을 확인할 수 없으면 알리지 않는다 — 연결 없음으로 추정하지
 * 않는다). 열람 화면의 '이 페이지 편집' 이 넘긴 주소(editor-handoff)는 열릴 때 한 번 받아 그 페이지를 고른다.
 */
export default function ContentPagesClient() {
  const { user } = useAuth();
  const canCreate = canPermission(user, 'CMS_UPDATE');
  const canPublish = canPermission(user, 'CMS_PUBLISH');
  const { toast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const editorRef = React.useRef<ContentPageEditorHandle>(null);
  const dirtyRef = React.useRef(false);

  const [keywordInput, setKeywordInput] = React.useState('');
  const [params, setParams] = React.useState<CmsPageListParams>({ keyword: '', status: 'ACTIVE', page: 1, size: PAGE_SIZE });
  const [selection, setSelection] = React.useState<Selection | null>(null);
  const [creating, setCreating] = React.useState(false);
  const selected = selection?.contsSn ?? null;

  const list = useQuery({ ...cmsQueryOptions.list(params), placeholderData: keepPreviousData });
  const home = useQuery(cmsQueryOptions.home());
  const { menuSource, groupSource } = useMenuAccessSources();
  const listData = list.data;
  const pages = listData?.list ?? [];
  const selectedSummary = pages.find((page) => page.contsSn === selected);
  const total = listData?.total ?? 0;
  const totalPages = listData?.totalPage ?? 1;

  // 고른 페이지가 목록에 보이면 그 제목으로 맞춘다(저장으로 바뀐 제목). 목록에서 빠져도 마지막 제목을 그대로 둔다.
  if (selection && selectedSummary?.contsTtl && selectedSummary.contsTtl !== selection.title) {
    setSelection({ contsSn: selection.contsSn, title: selectedSummary.contsTtl });
  }

  // 마지막 쪽의 마지막 페이지를 지우거나 보관해 그 쪽이 비면 앞 쪽으로 돌아간다. 조회 중·임시 표시(앞 조건의 결과)는 믿지 않는다.
  usePageClamp({
    page: params.page,
    totalPages,
    ready: list.isSuccess && !list.isFetching && !list.isPlaceholderData,
    onPageChange: (page) => setParams((current) => ({ ...current, page })),
  });

  /**
   * 게시 중이면서 일반 그룹에 보이는 활성 메뉴가 없는 페이지. 메뉴·그룹 원천을 확인하는 중이면 아무것도 고르지 않고, 판정할 수
   * 없는 연결(권한 없음·조회 실패)은 'unknown' 이라 고르지 않는다.
   */
  const unlinkedPages = React.useMemo(() => {
    const unlinked = new Set<number>();
    if (!listData || menuSource === null || groupSource === null) return unlinked;
    for (const page of listData.list) {
      if (page.status !== 'PUBLISHED' || !page.contsSn || !page.contsPathNm) continue;
      if (generalMenuState(findCmsPageMenuLinks(page.contsPathNm, menuSource, groupSource)) === 'fail') unlinked.add(page.contsSn);
    }
    return unlinked;
  }, [listData, menuSource, groupSource]);

  /*
   * 열람 화면에서 넘어온 편집(editor-handoff). 열릴 때 한 번 꺼내 그 주소로 찾고, 찾은 행을 고른다. 꺼내면 저장소에서 지워지므로
   * 개발 모드의 이중 실행에도 같은 값을 쓰도록 ref 에 둔다. 사용자가 그사이 다른 페이지를 골랐으면 그 선택을 덮지 않는다.
   */
  const handoffRef = React.useRef<string | null | undefined>(undefined);
  React.useEffect(() => {
    if (handoffRef.current === undefined) handoffRef.current = takeContentPageHandoff();
    const path = handoffRef.current;
    if (!path) return;
    let active = true;
    const handoffParams: CmsPageListParams = { keyword: path, status: 'ACTIVE', page: 1, size: PAGE_SIZE };
    const apply = (found: CmsPageSummary | undefined) => {
      if (!active) return;
      handoffRef.current = null;
      setKeywordInput(path);
      setParams(handoffParams);
      if (found?.contsSn) {
        const next = { contsSn: found.contsSn, title: found.contsTtl ?? '' };
        setSelection((current) => current ?? next);
      }
    };
    // 실패하면 그 조건으로 목록만 연다 — 목록 조회가 실패를 알리고 다시 시도할 수 있다.
    queryClient.fetchQuery(cmsQueryOptions.list(handoffParams)).then(
      (result) => apply(result.list.find((page) => page.contsPathNm === path)),
      () => apply(undefined),
    );
    return () => { active = false; };
  }, [queryClient]);

  // 지금 보이는 목록이 이번 조건의 결과일 때만 빈 상태를 말한다(앞 조건의 결과를 임시로 보이는 동안에는 말하지 않는다).
  const settled = list.isSuccess && !list.isPlaceholderData;
  const filtered = params.keyword !== '' || params.status !== 'ACTIVE';
  const noActivePages = settled && !filtered && total === 0;
  // 조건 없이 0건이면 보관한 페이지만 있는지 확인한다 — 그때 '아직 만든 페이지가 없다' 는 사실이 아니다.
  const archivedProbe = useQuery({
    ...cmsQueryOptions.list({ keyword: '', status: 'ARCHIVED', page: 1, size: 1 }),
    enabled: noActivePages,
  });
  const archivedCount = noActivePages ? archivedProbe.data?.total : undefined;

  /** 편집 중인 페이지를 떠나기 전에 저장하지 않은 변경을 버릴지 묻는다. 변경이 없으면 묻지 않는다. */
  const confirmLeave = async () => !dirtyRef.current || confirm({
    title: '저장하지 않은 변경',
    message: '지금 페이지에 저장하지 않은 변경이 있습니다. 다른 페이지로 옮기면 그 변경은 버려집니다.',
    confirmText: '변경 버리고 옮기기',
    variant: 'destructive',
  });

  const select = async (page: CmsPageSummary) => {
    if (!page.contsSn || page.contsSn === selected) return;
    if (!(await confirmLeave())) return;
    dirtyRef.current = false;
    setSelection({ contsSn: page.contsSn, title: page.contsTtl ?? '' });
  };

  // 새 페이지를 만들면 편집기가 그 페이지로 바뀐다 — 목록에서 고를 때와 같이 먼저 묻는다. 취소하면 지금 입력이 그대로다.
  const openCreate = async () => {
    if (!(await confirmLeave())) return;
    setCreating(true);
  };

  const applySearch = (event: React.FormEvent) => {
    event.preventDefault();
    setParams((current) => ({ ...current, keyword: keywordInput.trim(), page: 1 }));
  };

  const clearConditions = () => {
    setKeywordInput('');
    setParams((current) => ({ ...current, keyword: '', status: 'ACTIVE', page: 1 }));
  };

  // 편집기가 초안을 지우거나 페이지를 파기했다 — 고른 페이지를 비우고 목록을 다시 읽는다.
  const handleDeleted = async () => {
    dirtyRef.current = false;
    setSelection(null);
    await queryClient.invalidateQueries({ queryKey: cmsKeys.lists() });
  };

  const activeHint = STATUS_FILTERS.find((filter) => filter.value === params.status)?.hint;
  const conditionSummary = [
    params.keyword ? `검색어 “${params.keyword}”` : null,
    params.status !== 'ACTIVE' ? `상태 ‘${filterLabel(params.status)}’` : null,
  ].filter(Boolean).join(', ');

  return (
    <>
    <MasterDetailPage
      title="콘텐츠 페이지"
      description="안내 페이지를 작성·게시하고 업무 홈 맨 위 소개를 정합니다. 게시한 페이지는 로그인한 모든 사용자가 읽습니다."
      breadcrumbItems={[{ label: '관리 센터' }, { label: '콘텐츠 운영' }, { label: '콘텐츠 페이지' }]}
      actions={canCreate ? (
        <Button type="button" onClick={() => void openCreate()}>
          <Plus aria-hidden="true" /> 새 페이지
        </Button>
      ) : undefined}
      notice={(
        <div className="space-y-2">
          {home.data?.contsSn ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Home size={14} aria-hidden="true" /> 업무 홈 소개: <span className="font-medium text-foreground">{home.data.contsTtl}</span>
            </p>
          ) : null}
          {canCreate && !canPublish && (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <Info size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
              <span>게시는 게시 권한이 있는 사람이 합니다. 저장한 초안은 ‘게시 대기’ 목록에 보이고, 게시 권한이 있는 사람이 확인한 뒤 게시합니다.</span>
            </p>
          )}
          <ContentPageGuide subject={user} />
        </div>
      )}
      masterTitle="페이지 목록"
      masterDescription={<><span className="tabular-nums">{total}개</span> · 최근 수정 순</>}
      masterTools={(
        <form onSubmit={applySearch} className="w-full space-y-2" role="search" aria-label="콘텐츠 페이지 찾기">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="제목 또는 주소" className="pl-9" value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)} placeholder="제목 또는 주소" />
            </div>
            <Button type="submit" variant="outline">조회</Button>
          </div>
          <div className="flex flex-wrap gap-1" role="group" aria-label="상태">
            {STATUS_FILTERS.map((filter) => (
              <Button key={filter.value} type="button" size="sm"
                variant={params.status === filter.value ? 'default' : 'outline'}
                aria-pressed={params.status === filter.value}
                onClick={() => setParams((current) => ({ ...current, status: filter.value, page: 1 }))}>
                {filter.label}
              </Button>
            ))}
          </div>
          {activeHint && <p className="text-sm text-muted-foreground">{activeHint}</p>}
        </form>
      )}
      master={(
        <div className="space-y-2">
          {list.isError && (
            <div role="alert" className="space-y-2 rounded-md border border-destructive/40 px-3 py-3 text-sm">
              <p className="text-destructive">페이지 목록을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.</p>
              <Button type="button" size="sm" variant="outline" onClick={() => void list.refetch()}>다시 시도</Button>
            </div>
          )}
          {list.isLoading && <p role="status" className="text-sm text-muted-foreground">목록을 불러오는 중입니다.</p>}
          {settled && total === 0 && (noActivePages ? (
            <div className="space-y-1 rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                {archivedCount === 0 ? '아직 만든 콘텐츠 페이지가 없습니다.' : '보관하지 않은 페이지가 없습니다.'}
              </p>
              {archivedCount !== undefined && archivedCount > 0 && (
                <p>
                  보관한 페이지 <span className="tabular-nums">{archivedCount}개</span>는 상태 ‘보관’에서 볼 수 있습니다.{' '}
                  <Button type="button" size="sm" variant="link" className="h-auto p-0"
                    onClick={() => setParams((current) => ({ ...current, status: 'ARCHIVED', page: 1 }))}>
                    보관한 페이지 보기
                  </Button>
                </p>
              )}
              <p>
                {canCreate
                  ? '‘새 페이지’를 눌러 페이지를 만드세요. 만든 페이지는 게시하기 전까지 사용자에게 보이지 않습니다.'
                  : '페이지를 만들 권한이 없습니다. 페이지는 콘텐츠 페이지 편집 권한이 있는 사람이 만듭니다.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">조건에 맞는 페이지가 없습니다.</p>
              <p>찾은 조건: {conditionSummary}. 검색어를 지우거나 상태를 바꿔 보세요.</p>
              <Button type="button" size="sm" variant="outline" onClick={clearConditions}>조건 지우기</Button>
            </div>
          ))}
          <ul className="space-y-1">
            {pages.map((page) => {
              const modified = dateOf(page.mdfcnDt);
              const published = dateOf(page.publishedAt);
              return (
                <li key={page.contsSn}>
                  <button
                    type="button"
                    data-a2-master-item
                    aria-current={page.contsSn === selected ? 'true' : undefined}
                    onClick={() => void select(page)}
                    className={cn('w-full rounded-md border px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      page.contsSn === selected ? 'border-primary bg-primary/10' : 'border-transparent')}
                  >
                    <span className="block truncate font-medium text-foreground">{page.contsTtl}</span>
                    <span className="block truncate text-sm text-muted-foreground">/pages/{page.contsPathNm}</span>
                    {(modified || published) && (
                      <span className="block text-sm tabular-nums text-muted-foreground">
                        {[modified ? `수정 ${modified}` : null, published ? `게시 ${published}` : null].filter(Boolean).join(' · ')}
                      </span>
                    )}
                    <span className="mt-1 flex flex-wrap gap-1">
                      <Badge variant={page.status === 'PUBLISHED' ? 'default' : 'secondary'}>{statusLabel(page.status)}</Badge>
                      {page.unpublishedChanges && <Badge variant="outline">게시 전 수정 있음</Badge>}
                      {page.home && <Badge variant="outline">업무 홈 소개</Badge>}
                      {page.contsSn !== undefined && unlinkedPages.has(page.contsSn) && <Badge variant="outline">메뉴 연결 없음</Badge>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {totalPages > 1 && (
            <nav aria-label="페이지 목록 쪽" className="flex items-center justify-between pt-2 text-sm">
              <Button type="button" size="sm" variant="outline" disabled={params.page <= 1}
                onClick={() => setParams((current) => ({ ...current, page: current.page - 1 }))}>이전</Button>
              <span className="tabular-nums text-muted-foreground">{params.page} / {totalPages}</span>
              <Button type="button" size="sm" variant="outline" disabled={params.page >= totalPages}
                onClick={() => setParams((current) => ({ ...current, page: current.page + 1 }))}>다음</Button>
            </nav>
          )}
        </div>
      )}
      selectedItemLabel={selection?.title || undefined}
      detailTitle="페이지 편집"
      detail={selected !== null ? (
        <ContentPageEditor
          key={selected}
          ref={editorRef}
          contsSn={selected}
          onDirtyChange={(dirty) => { dirtyRef.current = dirty; }}
          onDeleted={() => void handleDeleted()}
        />
      ) : undefined}
      emptyDetailTitle="페이지를 고르세요"
      emptyDetailDescription="왼쪽 목록에서 페이지를 고르거나 새 페이지를 만드세요."
      onSaveShortcut={() => editorRef.current?.save()}
    />
    {creating && (
      <CreatePageDialog
        onClose={() => setCreating(false)}
        onCreated={async (contsSn, title) => {
          setCreating(false);
          await queryClient.invalidateQueries({ queryKey: cmsKeys.lists() });
          setParams((current) => ({ ...current, status: 'ACTIVE', keyword: '', page: 1 }));
          setKeywordInput('');
          dirtyRef.current = false;
          setSelection({ contsSn, title });
          toast(canPublish
            ? '새 페이지를 초안으로 만들었습니다. 내용을 작성한 뒤 게시하세요.'
            : '새 페이지를 초안으로 만들었습니다. 내용을 작성해 저장하면 게시 권한이 있는 사람이 게시합니다.', 'success');
        }}
      />
    )}
    </>
  );
}

/** 새 페이지의 시작 양식 — 문서 양식 셋과 기존 페이지 복사(ADR-0042). */
type StartKind = CmsTemplate | 'copy';
const START_LABELS: Record<StartKind, string> = { ...CMS_TEMPLATE_LABELS, copy: '기존 페이지 복사' };
const START_KINDS = Object.keys(START_LABELS) as StartKind[];

function CreatePageDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (contsSn: number, title: string) => void }) {
  const { toast } = useToast();
  const [title, setTitle] = React.useState('');
  const [path, setPath] = React.useState('');
  const [start, setStart] = React.useState<StartKind>('blank');
  const [copySource, setCopySource] = React.useState<Selection | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const submitPendingRef = React.useRef(false);
  const validation = useManualFormValidation(contentPageCreateFormSchema, { labels: contentPageCreateValidationLabels });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitPendingRef.current) return;
    const validated = validation.validate({ contsTtl: title, contsPathNm: path });
    if (!validated) return;
    const plan: { kind: 'template'; template: CmsTemplate } | { kind: 'copy'; source: Selection } | null =
      start !== 'copy' ? { kind: 'template', template: start } : copySource ? { kind: 'copy', source: copySource } : null;
    if (plan === null) {
      validation.setFormErrors({ copySource: '복사할 페이지를 골라 주세요.' });
      return;
    }
    submitPendingRef.current = true;
    setIsSubmitting(true);
    let stage: 'read' | 'create' = 'read';
    try {
      let document: CmsDocument;
      if (plan.kind === 'copy') {
        // 원본의 저장된 초안을 읽어 첨부(이미지·내려받기 파일)를 뗀다 — 첨부는 원본 페이지의 참조라 새 페이지가 함께 쓰지 않는다.
        const source = await cmsService.getPage(plan.source.contsSn);
        if (source.documentError) {
          toast(`‘${plan.source.title}’의 초안을 읽지 못해 복사하지 않았습니다. 입력한 내용은 그대로입니다. 다른 페이지를 고르거나 그 페이지를 먼저 고쳐 저장해 주세요.`, 'error');
          return;
        }
        document = withoutAttachments(source.document);
      } else {
        document = templateDocument(plan.template);
      }
      stage = 'create';
      const contsSn = await cmsService.createPage({
        contsPathNm: validated.contsPathNm,
        contsTtl: validated.contsTtl,
        document,
      });
      onCreated(contsSn, validated.contsTtl);
    } catch (failure) {
      if (stage === 'read') {
        toast(extractErrorMessage(failure, '복사할 페이지를 읽지 못했습니다. 입력한 내용은 그대로입니다. 다시 시도해 주세요.'), 'error');
        return;
      }
      // 409 는 코드로 가른다 — C008 만 주소 중복이다. 다른 충돌을 주소 칸에 붙이면 맞는 주소를 고치게 만든다.
      const { status, code } = summarizeError(failure);
      const fieldErrors = extractFieldErrors(failure);
      if (status === 409 && code === 'C008') validation.setFormErrors({ contsPathNm: '이미 쓰는 주소입니다. 다른 주소를 입력해 주세요.' });
      else if (fieldErrors) validation.setFormErrors(fieldErrors);
      else toast(extractErrorMessage(failure, '페이지를 만들지 못했습니다. 입력한 내용은 그대로입니다. 다시 시도해 주세요.'), 'error');
    } finally {
      submitPendingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <StandardModal isOpen onClose={onClose} title="새 콘텐츠 페이지" maxWidth="lg" closeDisabled={isSubmitting}>
      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <FormErrorSummary errors={validation.errors} labels={contentPageCreateValidationLabels} onNavigate={validation.focusError} />
        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          페이지 제목 <span className="sr-only">(필수)</span>
          <Input {...validation.fieldProps('contsTtl')} value={title} maxLength={256} required autoFocus
            onChange={(event) => { validation.clearError('contsTtl'); setTitle(event.target.value); }} />
          {validation.errors.contsTtl ? <p {...validation.messageProps('contsTtl')} className="text-sm text-destructive" /> : null}
        </label>
        <label className="flex flex-col gap-1 text-sm text-muted-foreground">
          주소
          <div className="flex items-center gap-1">
            <span aria-hidden="true" className="text-foreground">/pages/</span>
            <Input {...validation.fieldProps('contsPathNm')} value={path} maxLength={100} required placeholder="service-guide"
              aria-describedby={[validation.fieldProps('contsPathNm')['aria-describedby'], 'cms-new-path-help'].filter(Boolean).join(' ')}
              onChange={(event) => { validation.clearError('contsPathNm'); setPath(event.target.value.toLowerCase()); }} />
          </div>
          <span id="cms-new-path-help">영문 소문자·숫자·하이픈. 처음 게시하면 바꿀 수 없습니다.</span>
          {validation.errors.contsPathNm ? <p {...validation.messageProps('contsPathNm')} className="text-sm text-destructive" /> : null}
        </label>
        <fieldset className="space-y-1">
          <legend className="text-sm text-muted-foreground">시작 양식</legend>
          <div className="flex flex-wrap gap-2">
            {START_KINDS.map((value) => (
              <label key={value} className={cn('flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm',
                start === value ? 'border-primary bg-primary/10' : 'border-border')}>
                <input type="radio" name="cms-template" value={value} checked={start === value}
                  aria-label={START_LABELS[value]}
                  onChange={() => { validation.clearError('copySource'); setStart(value); }} />
                {START_LABELS[value]}
              </label>
            ))}
          </div>
        </fieldset>
        {start === 'copy' && (
          <CopySourcePicker
            value={copySource}
            onChange={(source) => { validation.clearError('copySource'); setCopySource(source); }}
            searchFieldProps={validation.fieldProps('copySource')}
            error={validation.errors.copySource
              ? <p {...validation.messageProps('copySource')} className="text-sm text-destructive" />
              : null}
          />
        )}
        <p className="text-sm text-muted-foreground">새 페이지는 초안으로 만들어지고, 게시하기 전에는 사용자에게 보이지 않습니다.</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>취소</Button>
          <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>{isSubmitting ? '만드는 중…' : '초안 만들기'}</Button>
        </div>
      </form>
    </StandardModal>
  );
}

const COPY_SOURCE_LIMIT = 10;

interface CopySourcePickerProps {
  value: Selection | null;
  onChange: (source: Selection) => void;
  /** 찾기 칸에 붙이는 검증 연결 — 고르지 않고 만들면 오류 요약이 이 칸으로 데려온다. */
  searchFieldProps: Pick<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'aria-invalid' | 'aria-describedby' | 'aria-errormessage'>;
  error: React.ReactNode;
}

/**
 * 복사할 페이지 고르기. 제목·주소로 찾고(입력이 멈추면 찾는다) 보관하지 않은 페이지에서 고른다. 찾기 칸은 대화상자 폼 안이라 Enter 가
 * 페이지 만들기를 보내지 않게 막는다.
 */
function CopySourcePicker({ value, onChange, searchFieldProps, error }: CopySourcePickerProps) {
  const [keyword, setKeyword] = React.useState('');
  const debouncedKeyword = useDebouncedValue(keyword.trim(), 300);
  const result = useQuery({
    ...cmsQueryOptions.list({ keyword: debouncedKeyword, status: 'ACTIVE', page: 1, size: COPY_SOURCE_LIMIT }),
    placeholderData: keepPreviousData,
  });
  const candidates = (result.data?.list ?? []).filter((page): page is CmsPageSummary & { contsSn: number } => Boolean(page.contsSn));
  const found = result.data?.total ?? 0;

  return (
    <fieldset className="space-y-2 rounded-md border border-border p-3">
      <legend className="px-1 text-sm text-muted-foreground">복사할 페이지</legend>
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input {...searchFieldProps} aria-label="복사할 페이지 찾기" className="pl-9" value={keyword} placeholder="제목 또는 주소"
          onChange={(event) => setKeyword(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') event.preventDefault(); }} />
      </div>
      {error}
      {value && (
        <p className="text-sm text-muted-foreground">고른 페이지: <span className="font-medium text-foreground">{value.title}</span></p>
      )}
      {result.isError ? (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-destructive">
          페이지 목록을 불러오지 못했습니다.
          <Button type="button" size="sm" variant="outline" onClick={() => void result.refetch()}>다시 시도</Button>
        </div>
      ) : result.isPending ? (
        <p role="status" className="text-sm text-muted-foreground">페이지를 찾는 중입니다.</p>
      ) : candidates.length === 0 ? (
        <p className="text-sm text-muted-foreground">찾는 페이지가 없습니다. 검색어를 바꿔 보세요.</p>
      ) : (
        <div className="max-h-56 space-y-1 overflow-auto">
          {candidates.map((page) => (
            <label key={page.contsSn} className={cn('flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm',
              value?.contsSn === page.contsSn ? 'border-primary bg-primary/10' : 'border-border')}>
              <input type="radio" name="cms-copy-source" value={page.contsSn} className="mt-1"
                aria-label={`${page.contsTtl ?? ''} /pages/${page.contsPathNm ?? ''} · ${statusLabel(page.status)}`}
                checked={value?.contsSn === page.contsSn}
                onChange={() => onChange({ contsSn: page.contsSn, title: page.contsTtl ?? '' })} />
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">{page.contsTtl}</span>
                <span className="block truncate text-muted-foreground">/pages/{page.contsPathNm} · {statusLabel(page.status)}</span>
              </span>
            </label>
          ))}
        </div>
      )}
      {found > candidates.length && (
        <p className="text-sm text-muted-foreground">
          찾은 <span className="tabular-nums">{found}개</span> 가운데 앞의 <span className="tabular-nums">{candidates.length}개</span>를 보입니다. 검색어를 더 입력해 좁혀 주세요.
        </p>
      )}
      <p className="text-sm text-muted-foreground">글과 영역 구성만 복사합니다. 이미지와 내려받기 파일은 복사하지 않으니 만든 뒤 다시 골라 넣어 주세요.</p>
    </fieldset>
  );
}
