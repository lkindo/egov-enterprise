'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil, Plus, XCircle } from 'lucide-react';
import { z } from 'zod';
import { useAppForm } from '@/hooks/useAppForm';
import {
  Form,
  FormControl,
  FormErrorSummary,
  FormField as ShadcnFormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useToast } from '@/app/components/ui/toast';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import { PagePagination } from '@/components/common/PagePagination';
import { communityAdminService, type Community } from '@/services/foundation/system/CommunityAdminService';
import { templateAdminService } from '@/services/foundation/system/TemplateAdminService';
import { CommunityDtoSchema } from '@/types/generated-zod';

const StandardModal = dynamic(
  () => import('@/app/components/ui/standard-modal').then((mod) => mod.StandardModal),
  { ssr: false },
);

/** Radix Select 는 빈 문자열 value 를 허용하지 않는다 — '템플릿 없음' 은 별도 sentinel 로 나른다. */
const NO_TEMPLATE = '__none__';
const PAGE_SIZE = 10;

/**
 * 커뮤니티 폼 계약. 서버 DTO(CommunityDto)를 확장한다 — 이름은 서버가 @NotBlank·@Size(100) 으로 거부한다.
 * 소개는 비워도 되지만 빈 문자열로 보낸다(읽기 계약 fromCommunity 가 문자열을 요구한다).
 */
export const communitySchema = CommunityDtoSchema.pick({ tmpltId: true }).extend({
  cmntyNm: z.string().trim().min(1, '커뮤니티 이름을 입력하세요.').max(100, '커뮤니티 이름은 100자 이하여야 합니다.'),
  cmntyIntroCn: z.string().max(4000, '소개는 4000자 이하여야 합니다.').optional(),
  tmpltId: z.string().max(20).optional(),
  useYn: z.enum(['Y', 'N']),
});

type CommunityFormValues = z.infer<typeof communitySchema>;

const EMPTY_FORM: CommunityFormValues = { cmntyNm: '', cmntyIntroCn: '', tmpltId: undefined, useYn: 'Y' };

interface CommunityManageDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 🏘 커뮤니티 관리 다이얼로그 — 지식 허브 커뮤니티 탭의 관리자 액션.
 *
 * [2026-09-06 DEC-OPS-037] 관리자 CRUD API(/admin/content/community)와 프런트 서비스 메서드는 있었는데 호출부가
 * 0건이라 커뮤니티 생성이 시드에 의존했다(감사 D07-01). 여기서 생성·수정·폐쇄를 배선한다.
 *
 * 서버의 DELETE 는 물리 삭제가 아니라 `useYn='N'` 논리 삭제다(Community.delete). 그래서 화면 동사는 '삭제' 가
 * 아니라 **'폐쇄'** 이고, 폐쇄된 커뮤니티는 이 목록에 '사용 안 함' 으로 남아 수정에서 다시 열 수 있다 —
 * 화면이 없는 일(영구 삭제)을 약속하지 않는다. 가입 승인 전이는 여전히 없다(GAP-CMTY-001, 별도 설계).
 */
export function CommunityManageDialog({ isOpen, onClose }: CommunityManageDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Community | null>(null);
  const [saving, setSaving] = useState(false);
  const submitLock = useRef(false);
  // 이름의 'pending' 은 폼 검증 census 의 pending 상태 어휘(PENDING_STATE_NAME)에 맞춘 것이다 — 폐쇄 진행 중인 행.
  const [pendingCloseSn, setPendingCloseSn] = useState<number | null>(null);
  const closePendingRef = useRef(false);

  const form = useAppForm(communitySchema, { defaultValues: EMPTY_FORM });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-communities', 'manage', page],
    queryFn: () => communityAdminService.getCommunityList({ page: page - 1, size: PAGE_SIZE }),
    enabled: isOpen,
  });
  const { data: templates } = useQuery({
    queryKey: ['admin-templates', 'community-manage'],
    queryFn: () => templateAdminService.getTemplateList(),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const communities = data?.list ?? [];
  const total = data?.total ?? 0;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-communities'] });
    // 사용자 커뮤니티 목록·포틀릿도 같은 데이터를 읽는다.
    queryClient.invalidateQueries({ queryKey: ['communities'] });
  };

  const startCreate = () => {
    setEditing(null);
    form.reset(EMPTY_FORM);
  };

  const startEdit = (community: Community) => {
    setEditing(community);
    form.reset({
      cmntyNm: community.cmntyNm ?? '',
      cmntyIntroCn: community.cmntyIntrcn ?? '',
      tmpltId: (community as Community & { tmpltId?: string }).tmpltId || undefined,
      useYn: community.useYn === 'N' ? 'N' : 'Y',
    });
  };

  const onSubmit = async (values: CommunityFormValues) => {
    if (submitLock.current) return;
    submitLock.current = true;
    setSaving(true);
    try {
      const payload = {
        cmntyNm: values.cmntyNm,
        cmntyIntroCn: values.cmntyIntroCn ?? '',
        tmpltId: values.tmpltId || undefined,
      };
      if (editing) {
        await communityAdminService.updateCommunity(editing.cmntySn, { ...payload, useYn: values.useYn });
        toast('커뮤니티를 수정했습니다.', 'success');
      } else {
        // 등록은 서버가 useYn='Y'·regSeCd='REGC01' 로 고정한다 — 화면은 사용 여부를 묻지 않는다.
        await communityAdminService.createCommunity({ ...payload, useYn: 'Y' });
        toast('커뮤니티를 등록했습니다.', 'success');
        setPage(1);
      }
      setEditing(null);
      form.reset(EMPTY_FORM);
      invalidate();
    } catch (error) {
      if (!form.applyServerErrors(error)) {
        toast(extractErrorMessage(error, editing ? '커뮤니티 수정에 실패했습니다.' : '커뮤니티 등록에 실패했습니다.'), 'error');
      }
    } finally {
      submitLock.current = false;
      setSaving(false);
    }
  };

  const handleClose = async (community: Community) => {
    if (closePendingRef.current) return;
    closePendingRef.current = true;
    setPendingCloseSn(community.cmntySn);
    try {
      const ok = await confirm({
        title: '커뮤니티 폐쇄',
        message: `'${community.cmntyNm}' 커뮤니티를 폐쇄합니다. 게시글과 회원 정보는 남고 사용자 목록에서만 숨겨집니다. 수정에서 사용 여부를 '사용' 으로 바꾸면 다시 열립니다.`,
        confirmText: '폐쇄',
        variant: 'destructive',
      });
      if (!ok) return;
      await communityAdminService.deleteCommunity(community.cmntySn);
      toast('커뮤니티를 폐쇄했습니다.', 'success');
      if (editing?.cmntySn === community.cmntySn) startCreate();
      invalidate();
    } catch (error) {
      toast(extractErrorMessage(error, '커뮤니티 폐쇄에 실패했습니다.'), 'error');
    } finally {
      closePendingRef.current = false;
      setPendingCloseSn(null);
    }
  };

  const handleDialogClose = () => {
    if (submitLock.current) return;
    startCreate();
    onClose();
  };

  const editingLabel = editing ? `${editing.cmntyNm} 수정 중` : null;

  return (
    <StandardModal
      isOpen={isOpen}
      onClose={handleDialogClose}
      title="커뮤니티 관리"
      footer={
        <div className="flex w-full items-center gap-2">
          {editing && (
            <Button type="button" variant="outline" className="h-11 flex-1" onClick={startCreate} disabled={saving}>
              수정 취소
            </Button>
          )}
          <Button type="submit" form="community-manage-form" className="h-11 flex-[2]" disabled={saving || form.formState.isSubmitting}>
            {saving ? '저장 중…' : editing ? '수정 저장' : '커뮤니티 등록'}
          </Button>
        </div>
      }
    >
      <div className="space-y-6 pt-2 text-left">
        <section aria-labelledby="community-list-heading" className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 id="community-list-heading" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              등록된 커뮤니티 <span className="tabular-nums">{total}</span>개
            </h3>
            {editingLabel && <span className="text-xs font-bold text-primary">{editingLabel}</span>}
          </div>
          {isError ? (
            <div role="alert" className="flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs">
              <span>커뮤니티 목록을 불러오지 못했습니다.</span>
              <Button type="button" size="sm" variant="outline" onClick={() => refetch()}>다시 시도</Button>
            </div>
          ) : isLoading ? (
            <p className="text-xs text-muted-foreground">불러오는 중…</p>
          ) : communities.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
              등록된 커뮤니티가 없습니다. 아래에서 첫 커뮤니티를 등록하세요.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border" aria-label="커뮤니티 목록">
              {communities.map((community) => {
                const isClosePending = pendingCloseSn === community.cmntySn;
                const isCurrent = editing?.cmntySn === community.cmntySn;
                const isOpenState = community.useYn !== 'N';
                return (
                  <li
                    key={community.cmntySn}
                    className={`flex items-center gap-3 px-3 py-2 ${isCurrent ? 'bg-muted' : ''}`}
                    aria-current={isCurrent ? 'true' : undefined}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-bold text-foreground">
                        <span className="truncate">{community.cmntyNm}</span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${isOpenState ? 'bg-success/10 text-success-emphasis' : 'bg-muted text-muted-foreground'}`}
                        >
                          {isOpenState ? '사용' : '사용 안 함'}
                        </span>
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {community.cmntyIntrcn || '소개 없음'}
                      </span>
                    </div>
                    <Button type="button" variant="ghost" size="icon" aria-label={`${community.cmntyNm} 수정`} onClick={() => startEdit(community)} disabled={saving}>
                      <Pencil size={16} aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`${community.cmntyNm} 폐쇄`}
                      aria-busy={isClosePending}
                      disabled={pendingCloseSn !== null || saving || !isOpenState}
                      onClick={() => handleClose(community)}
                      className="text-destructive hover:text-destructive"
                    >
                      {isClosePending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <XCircle size={16} aria-hidden="true" />}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
          <PagePagination page={page} total={total} size={PAGE_SIZE} onPageChange={setPage} />
        </section>

        <Form {...form}>
          <form
            id="community-manage-form"
            noValidate
            // 렌더 시점이 아니라 이벤트 시점에 handleSubmit 을 만든다 — onSubmit 이 읽는 동기 잠금 ref 를 렌더에서 읽지 않는다(react-hooks/refs).
            onSubmit={(event) => { void form.handleSubmit(onSubmit)(event); }}
            className="space-y-4"
            aria-label={editing ? '커뮤니티 수정' : '커뮤니티 등록'}
          >
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <Plus size={14} aria-hidden="true" /> {editing ? '커뮤니티 수정' : '새 커뮤니티'}
            </h3>
            <FormErrorSummary
              labels={{ cmntyNm: '커뮤니티 이름', cmntyIntroCn: '소개', tmpltId: '템플릿', useYn: '사용 여부' }}
              onNavigate={form.focusError}
            />
            <ShadcnFormField
              control={form.control}
              name="cmntyNm"
              required
              render={({ field }) => (
                <FormItem>
                  <FormLabel>커뮤니티 이름</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={100} placeholder="예: 신입사원 모임" className="h-11 rounded-lg" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ShadcnFormField
              control={form.control}
              name="cmntyIntroCn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>소개</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ''} maxLength={4000} rows={3} placeholder="커뮤니티의 목적과 대상을 적어 주세요." className="rounded-lg" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ShadcnFormField
              control={form.control}
              name="tmpltId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>템플릿</FormLabel>
                  <Select
                    value={field.value ?? NO_TEMPLATE}
                    onValueChange={(value) => field.onChange(value === NO_TEMPLATE ? undefined : value)}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-lg" aria-label="템플릿">
                        <SelectValue placeholder="템플릿 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_TEMPLATE}>템플릿 없음</SelectItem>
                      {(templates ?? [])
                        .filter((template) => Boolean(template.tmpltId))
                        .map((template) => (
                          <SelectItem key={template.tmpltId} value={template.tmpltId as string}>
                            {template.tmpltNm || template.tmpltId}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {editing && (
              <ShadcnFormField
                control={form.control}
                name="useYn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>사용 여부</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-lg" aria-label="사용 여부">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Y">사용</SelectItem>
                        <SelectItem value="N">사용 안 함(폐쇄)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </form>
        </Form>
      </div>
    </StandardModal>
  );
}
