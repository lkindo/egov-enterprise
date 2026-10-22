'use client';

import React from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Home, Plus, Search } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { CMS_TEMPLATE_LABELS, templateDocument, type CmsTemplate } from '@/lib/cms/document';
import { cmsService } from '@/services/business/cms/CmsService';
import { cmsKeys, cmsQueryOptions, type CmsPageListParams } from '@/queries/cms-query-options';
import { ContentPageEditor, STATUS_LABELS, type ContentPageEditorHandle } from './ContentPageEditor';
import {
  contentPageCreateFormSchema,
  contentPageCreateValidationLabels,
} from './content-page-form-validation';

const PAGE_SIZE = 20;
const STATUS_FILTERS: Array<{ value: CmsPageListParams['status']; label: string }> = [
  { value: 'ACTIVE', label: '전체' },
  { value: 'PUBLISHED', label: '게시 중' },
  { value: 'DRAFT', label: '초안' },
  { value: 'ARCHIVED', label: '보관' },
];

/**
 * 콘텐츠 페이지 관리(ADR-0039) — A2 마스터-디테일. 왼쪽은 페이지 목록, 오른쪽은 고른 페이지의 초안 편집이다.
 * 페이지와 메뉴는 따로 저장한다: 게시한 뒤 '메뉴에 추가' 로 기존 메뉴 관리에 주소를 넘긴다.
 */
export default function ContentPagesClient() {
  const { user } = useAuth();
  const canCreate = canPermission(user, 'CMS_UPDATE');
  const { toast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const editorRef = React.useRef<ContentPageEditorHandle>(null);
  const dirtyRef = React.useRef(false);

  const [keywordInput, setKeywordInput] = React.useState('');
  const [params, setParams] = React.useState<CmsPageListParams>({ keyword: '', status: 'ACTIVE', page: 1, size: PAGE_SIZE });
  const [selected, setSelected] = React.useState<number | null>(null);
  const [creating, setCreating] = React.useState(false);

  const list = useQuery({ ...cmsQueryOptions.list(params), placeholderData: keepPreviousData });
  const home = useQuery(cmsQueryOptions.home());
  const pages = list.data?.list ?? [];
  const selectedSummary = pages.find((page) => page.contsSn === selected);

  const select = async (contsSn: number) => {
    if (contsSn === selected) return;
    if (dirtyRef.current) {
      const ok = await confirm({
        title: '저장하지 않은 변경',
        message: '지금 페이지에 저장하지 않은 변경이 있습니다. 다른 페이지로 옮기면 그 변경은 버려집니다.',
        confirmText: '변경 버리고 옮기기',
        variant: 'destructive',
      });
      if (!ok) return;
    }
    dirtyRef.current = false;
    setSelected(contsSn);
  };

  const applySearch = (event: React.FormEvent) => {
    event.preventDefault();
    setParams((current) => ({ ...current, keyword: keywordInput.trim(), page: 1 }));
  };

  const total = list.data?.total ?? 0;
  const totalPages = list.data?.totalPage ?? 1;

  return (
    <>
    <MasterDetailPage
      title="콘텐츠 페이지"
      description="안내 페이지를 작성·게시하고 업무 홈 맨 위 소개를 정합니다. 게시한 페이지는 로그인한 모든 사용자가 읽습니다."
      breadcrumbItems={[{ label: '관리 센터' }, { label: '콘텐츠 운영' }, { label: '콘텐츠 페이지' }]}
      actions={canCreate ? (
        <Button type="button" onClick={() => setCreating(true)}>
          <Plus aria-hidden="true" /> 새 페이지
        </Button>
      ) : undefined}
      notice={home.data?.contsSn ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Home size={14} aria-hidden="true" /> 업무 홈 소개: <span className="font-medium text-foreground">{home.data.contsTtl}</span>
        </p>
      ) : undefined}
      masterTitle="페이지 목록"
      masterDescription={<span className="tabular-nums">{total}개</span>}
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
        </form>
      )}
      master={(
        <div className="space-y-2">
          {list.isError && <p role="alert" className="text-sm text-destructive">목록을 불러오지 못했습니다.</p>}
          {list.isLoading && <p role="status" className="text-sm text-muted-foreground">목록을 불러오는 중입니다.</p>}
          {!list.isLoading && !list.isError && pages.length === 0 && (
            <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
              조건에 맞는 페이지가 없습니다.
            </p>
          )}
          <ul className="space-y-1">
            {pages.map((page) => (
              <li key={page.contsSn}>
                <button
                  type="button"
                  data-a2-master-item
                  aria-current={page.contsSn === selected ? 'true' : undefined}
                  onClick={() => page.contsSn && void select(page.contsSn)}
                  className={cn('w-full rounded-md border px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    page.contsSn === selected ? 'border-primary bg-primary/10' : 'border-transparent')}
                >
                  <span className="block truncate font-medium text-foreground">{page.contsTtl}</span>
                  <span className="block truncate text-sm text-muted-foreground">/pages/{page.contsPathNm}</span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    <Badge variant={page.status === 'PUBLISHED' ? 'default' : 'secondary'}>{STATUS_LABELS[page.status ?? 'DRAFT']}</Badge>
                    {page.unpublishedChanges && <Badge variant="outline">게시 전 수정 있음</Badge>}
                    {page.home && <Badge variant="outline">업무 홈 소개</Badge>}
                  </span>
                </button>
              </li>
            ))}
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
      selectedItemLabel={selectedSummary?.contsTtl}
      detailTitle="페이지 편집"
      detail={selected !== null ? (
        <ContentPageEditor
          key={selected}
          ref={editorRef}
          contsSn={selected}
          onDirtyChange={(dirty) => { dirtyRef.current = dirty; }}
        />
      ) : undefined}
      emptyDetailTitle="페이지를 고르세요"
      emptyDetailDescription="왼쪽 목록에서 페이지를 고르거나 새 페이지를 만드세요."
      onSaveShortcut={() => editorRef.current?.save()}
    />
    {creating && (
      <CreatePageDialog
        onClose={() => setCreating(false)}
        onCreated={async (contsSn) => {
          setCreating(false);
          await queryClient.invalidateQueries({ queryKey: cmsKeys.lists() });
          setParams((current) => ({ ...current, status: 'ACTIVE', keyword: '', page: 1 }));
          setKeywordInput('');
          dirtyRef.current = false;
          setSelected(contsSn);
          toast('새 페이지를 초안으로 만들었습니다. 내용을 작성한 뒤 게시하세요.', 'success');
        }}
      />
    )}
    </>
  );
}

function CreatePageDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (contsSn: number) => void }) {
  const { toast } = useToast();
  const [title, setTitle] = React.useState('');
  const [path, setPath] = React.useState('');
  const [template, setTemplate] = React.useState<CmsTemplate>('blank');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const submitPendingRef = React.useRef(false);
  const validation = useManualFormValidation(contentPageCreateFormSchema, { labels: contentPageCreateValidationLabels });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitPendingRef.current) return;
    const validated = validation.validate({ contsTtl: title, contsPathNm: path });
    if (!validated) return;
    submitPendingRef.current = true;
    setIsSubmitting(true);
    try {
      const contsSn = await cmsService.createPage({
        contsPathNm: validated.contsPathNm,
        contsTtl: validated.contsTtl,
        document: templateDocument(template),
      });
      onCreated(contsSn);
    } catch (failure) {
      const status = (failure as { response?: { status?: number } })?.response?.status;
      const fieldErrors = extractFieldErrors(failure);
      if (status === 409) validation.setFormErrors({ contsPathNm: '이미 쓰는 주소입니다. 다른 주소를 입력해 주세요.' });
      else if (fieldErrors) validation.setFormErrors(fieldErrors);
      else toast(extractErrorMessage(failure, '페이지를 만들지 못했습니다.'), 'error');
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
            {(Object.keys(CMS_TEMPLATE_LABELS) as CmsTemplate[]).map((value) => (
              <label key={value} className={cn('flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm',
                template === value ? 'border-primary bg-primary/10' : 'border-border')}>
                <input type="radio" name="cms-template" value={value} checked={template === value}
                  aria-label={CMS_TEMPLATE_LABELS[value]} onChange={() => setTemplate(value)} />
                {CMS_TEMPLATE_LABELS[value]}
              </label>
            ))}
          </div>
        </fieldset>
        <p className="text-sm text-muted-foreground">새 페이지는 초안으로 만들어지고, 게시하기 전에는 사용자에게 보이지 않습니다.</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>취소</Button>
          <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>{isSubmitting ? '만드는 중…' : '초안 만들기'}</Button>
        </div>
      </form>
    </StandardModal>
  );
}
