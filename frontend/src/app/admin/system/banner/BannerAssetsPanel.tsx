'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import dynamic from 'next/dynamic';
const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });
import { AttachmentImage } from '@/app/components/ui/attachment-image';
import { Banner } from '@/types/foundation/banner';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { fileAdminService } from '@/services/foundation/system/FileAdminService';
import { bannerAdminService } from '@/services/foundation/system/BannerAdminService';
import {
  Plus,
  Image as ImageIcon,
  ExternalLink,
  Trash2,
  Loader2,
  Zap,
  Settings,
  SearchCode,
  Link as LinkIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { saveBannerAction, deleteBannerAction } from '@/app/actions/promotionActions';
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
import { BannerDtoSchema } from '@/types/generated-zod';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import {
  AssetUploadField,
  numberInputProps,
  type PromotionAssetPanel,
  type PromotionAssetPanelProps,
} from './promotion-asset-form';

/*
  [2026-10-20] 배너 관리 패널 — 종전 BannerAdminClient(1,140줄)에서 배너의 조회·표·등록/수정 창·삭제를 그대로 옮겼다(동작 변경 없음).
  URL(탭·페이지)·페이지 크기·업무 목록 셸은 셸(BannerAdminClient)이 소유하고, 이 패널은 그 셸에 조립할 조각을 돌려준다.
  쓰기 처리기와 그 권한 판정은 같은 파일에 둔다 — 쓰기 권한 표시 census 가 파일 단위로 읽는다(DEC-OPS-361).
*/

export const bannerSchema = BannerDtoSchema.extend({
  bnrNm: BannerDtoSchema.shape.bnrNm.min(1),
  sortOrdr: z.coerce.number().min(0, '정렬 순서는 0 이상의 숫자여야 합니다.'),
  rfltYn: BannerDtoSchema.shape.rfltYn.unwrap(),
});

type BannerFormValues = z.infer<typeof bannerSchema>;

/** 배너 폼 기본값 — 첫 렌더의 defaultValues 와 모달을 열 때의 reset 이 같은 값을 쓴다. */
const BANNER_FORM_DEFAULTS: BannerFormValues = {
  bnrNm: '',
  linkUrl: '',
  sortOrdr: 0,
  rfltYn: 'Y',
  bnrExpln: ''
};

export function useBannerAssetsPanel({
  active,
  page,
  pageSize,
  onPageChange,
  changePageSize,
  initialItems: initialBanners,
  coordination,
}: PromotionAssetPanelProps<Banner>): PromotionAssetPanel {
  const { toast } = useToast();
  const confirm = useConfirm();
  // [2026-10-01] 쓰기 버튼은 그 동작의 기능 권한으로 보인다. 이 화면은 조회 권한(BANNER_ADMIN_READ)만으로 들어올 수 있어,
  //   종전에는 배너·팝업의 등록·수정·삭제가 모두 보였고 폼을 다 채운 뒤에야 403 을 만났다.
  //   파일 첨부는 업로드 권한(FILE_UPLOAD_ALL)이 따로 있어, 없으면 첨부 컨트롤만 두지 않는다 — 기존 파일은 그대로 유지된다.
  //   표시 판정일 뿐이며 서버 인가는 그대로 집행된다(H3).
  const { user } = useAuth();
  const canCreateBanner = canPermission(user, 'BANNER_CREATE');
  const canUpdateBanner = canPermission(user, 'BANNER_UPDATE');
  const canDeleteBanner = canPermission(user, 'BANNER_DELETE');
  const canUploadFile = canPermission(user, 'FILE_UPLOAD_ALL');

  const [isModalOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Banner | null>(null);
  const [formFiles, setFormFiles] = useState<File[]>([]);

  const { deletingAssetKey, setDeletingAssetKey, register, otherBusy } = coordination;
  const bannerValidationLock = useRef(false);
  const bannerSubmitLock = useRef(false);
  const deletePendingRef = useRef(false);
  /** 이 패널이나 다른 패널의 쓰기(검증·저장·삭제)가 진행 중인가 — 종전 한 컴포넌트의 공유 잠금과 같은 범위다. */
  const writeLocked = () => bannerValidationLock.current || bannerSubmitLock.current || deletePendingRef.current
    || otherBusy('banner');
  useEffect(() => {
    register('banner', () => bannerValidationLock.current || bannerSubmitLock.current || deletePendingRef.current);
  }, [register]);

  const bannerForm = useAppForm<typeof bannerSchema, BannerFormValues>(bannerSchema, {
    defaultValues: BANNER_FORM_DEFAULTS
  });
  const isAssetSubmitting = bannerForm.formState.isSubmitting;
  const isAssetWritePending = isAssetSubmitting || deletingAssetKey !== null;

  const resetBannerForm = bannerForm.reset;

  React.useEffect(() => {
    if (isModalOpen) {
      const item = editingItem;
      const fallback = BANNER_FORM_DEFAULTS;
      resetBannerForm({
        bnrNm: item?.bnrNm || fallback.bnrNm,
        linkUrl: item?.linkUrl || fallback.linkUrl,
        sortOrdr: item?.sortOrdr || fallback.sortOrdr,
        rfltYn: (item?.rfltYn as 'Y' | 'N') || fallback.rfltYn,
        bnrExpln: item?.bnrExpln || fallback.bnrExpln
      });
    }
    // useAppForm 은 최신 formState 를 노출하기 위해 wrapper 를 새로 만든다. form 객체 자체를
    // 의존성에 두면 입력 렌더마다 effect 가 재실행되어 방금 입력한 값을 빈 값으로 reset 한다.
  }, [isModalOpen, editingItem, resetBannerForm]);

  /** 비활성 탭은 지표(전체 건수)만 필요하므로 항상 1페이지를 조회한다. */
  const bannerPage = active ? page : 1;

  /*
   * 배너/팝업 컨트롤러는 모두 page(1부터)·size 만 읽는다(ADR-0036).
   * 종전의 pageUnit:999 는 바인딩 대상이 아니라 그대로 무시됐고, 실제로는 서버 기본값(size=10)만
   * 내려와 11번째 자산부터는 수정·게시중단이 UI 상 불가능했다. 정상 페이징 + 페이저 연결로 정정한다.
   */
  const { data: bannerPageData, isLoading: isBannersLoading, error: bannerError, refetch: refetchBanners } = useQuery({
    queryKey: ['admin-banners', bannerPage, pageSize],
    queryFn: () => bannerAdminService.getBannerList({ page: bannerPage, size: pageSize })
  });

  /*
   * [P1-1] 조회 실패 시에는 SSR 초기값으로 되돌아가 "데이터가 있는 척" 하지 않는다.
   * 실패는 StandardDataTable 의 error/onRetry 로 화면에 드러낸다.
   */
  const banners: Banner[] = bannerPageData?.list ?? (bannerError ? [] : initialBanners);
  /** 지표는 현재 페이지 길이가 아니라 서버가 내려준 전체 건수(total)를 쓴다. */
  const bannerTotal = bannerPageData?.total ?? (bannerError ? 0 : initialBanners.length);

  const handleCreate = () => {
    if (writeLocked() || isModalOpen) return;
    setEditingItem(null);
    setFormFiles([]);
    setIsOpen(true);
  };

  const handleEdit = (item: Banner) => {
    if (writeLocked() || isModalOpen) return;
    setEditingItem(item);
    setFormFiles([]);
    setIsOpen(true);
  };

  /** [P1-9] 확인 본문에 대상 식별자(명칭)를 노출해 오삭제를 막는다. */
  const handleDelete = async (id: string | number, name: string) => {
    if (writeLocked() || isModalOpen) return;
    deletePendingRef.current = true;
    const assetKey = `banner:${id}`;
    setDeletingAssetKey(assetKey);

    try {
      const ok = await confirm({
        title: '배너 삭제 확인',
        message: `‘${name}’ 배너을(를) 시스템에서 영구적으로 삭제합니다. 게시 중인 경우 즉시 중단되며 되돌릴 수 없습니다.`,
        variant: 'destructive',
        confirmText: '삭제'
      });

      if (!ok) return;

      const res = await deleteBannerAction(null, Number(id));

      if (res.success) {
        toast(res.message, 'success');
        void refetchBanners();
      } else {
        toast(res.message, 'error');
      }
    } catch {
      toast('자산 삭제 처리 중 예외가 발생했습니다.', 'error');
    } finally {
      deletePendingRef.current = false;
      setDeletingAssetKey(null);
    }
  };

  const onBannerSubmit = async (values: z.infer<typeof bannerSchema>) => {
    if (bannerSubmitLock.current || deletePendingRef.current || otherBusy('banner')) return;
    bannerSubmitLock.current = true;
    try {
      const data: Partial<Banner> = {
        ...values,
        rfltYn: values.rfltYn as "Y" | "N"
      };
      if (formFiles.length > 0) {
        // [2026-09-03] 종전에는 `(uploadRes as any)?.data?.data || (uploadRes as any)?.data || uploadRes`
        //   로 응답 형태를 **짐작**했다. 앞 두 항은 도달 불가능한 죽은 코드다 — `uploadFiles` 는
        //   생성 계약(uploadFiles_1Operation, responseSchema `z.number().int()`)을 지나고,
        //   생성 클라이언트가 envelope 을 이미 언랩·검증한 뒤 값만 돌려준다. 계약과 어긋나면
        //   여기 도달하기 전에 예외가 난다. 짐작을 지우면 응답 형태가 바뀌었을 때 런타임에 조용히
        //   undefined 가 되는 대신 컴파일 시점에 드러난다.
        //   같은 이유로 `if (uploadedFileSn)` 가드도 걷었다 — atchFileSn 은 IDENTITY BIGINT PK 이고
        //   서비스가 non-null 을 단언하므로(FileService#uploadFiles) falsy 값이 만들어질 경로가 없다.
        data.atchFileSn = await fileAdminService.uploadFiles(formFiles);
        data.bnrImgNm = formFiles[0].name;
      } else if (editingItem) {
        data.atchFileSn = editingItem.atchFileSn;
        data.bnrImgNm = editingItem.bnrImgNm;
      }
      // [2026-10-18] 창을 열 때 읽은 버전을 함께 보낸다 — 다른 사람이 먼저 고쳤으면 서버가 409 로 거부해 덮어쓰지 않는다.
      if (editingItem) data.version = editingItem.version;

      const res = await saveBannerAction(null, {
        mode: editingItem ? 'edit' : 'create',
        data: data as Banner,
        id: editingItem?.bnrSn
      });

      if (res.success) {
        toast(res.message, 'success');
        setIsOpen(false);
        refetchBanners();
      } else {
        // 다른 사람이 먼저 고쳤다(409) — 서버 사유를 보이고 목록을 다시 읽는다. 입력한 내용은 창에 남긴다.
        if (res.conflict) refetchBanners();
        if (!bannerForm.applyServerErrors(res)) toast(res.message, 'error');
      }
    } catch (error) {
      if (!bannerForm.applyServerErrors(error)) {
        toast('데이터 처리 중 오류가 발생했습니다.', 'error');
      }
    } finally {
      bannerSubmitLock.current = false;
      bannerValidationLock.current = false;
    }
  };

  const closeAssetModal = () => {
    if (writeLocked()) return;
    setIsOpen(false);
  };

  const submitBannerForm = (event?: React.BaseSyntheticEvent) => {
    if (writeLocked()) {
      event?.preventDefault();
      return;
    }
    bannerValidationLock.current = true;
    const submit = bannerForm.handleSubmit(onBannerSubmit, () => {
      bannerValidationLock.current = false;
    });
    void submit(event).catch(() => {
      bannerValidationLock.current = false;
      bannerSubmitLock.current = false;
    });
  };

  const bannerColumns: Column<Banner>[] = [
    {
      header: '비주얼 자산 스냅샷',
      accessor: (item: Banner) => (
        <div className="relative h-14 w-28 overflow-hidden rounded-md border border-border bg-surface-inverse">
          <ImageIcon size={16} className="absolute inset-0 m-auto text-surface-inverse-foreground/40" aria-hidden="true" />
          {item.atchFileSn && (
            // blob 렌더 — `<img src="/api/v1/files/…">` 는 Authorization 헤더를 실을 수 없어 401 이다.
            <div className="absolute inset-0 z-10">
              <AttachmentImage
                atchFileSn={item.atchFileSn}
                alt={`${item.bnrNm} 배너 이미지`}
                className="h-full w-full object-cover"
              />
            </div>
          )}
        </div>
      ),
      className: 'py-2 px-2'
    },
    {
      header: '배너 자산 명칭',
      accessor: (item: Banner) => (
        <div className="flex flex-col gap-0.5 py-1">
          <span className="text-[length:var(--font-size-body)] font-medium leading-tight text-foreground">{item.bnrNm}</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">SN: {item.bnrSn}</span>
            {item.linkUrl && (
              <span className="flex items-center gap-1.5 text-xs text-primary">
                <ExternalLink size={10} /> {item.linkUrl}
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      header: '우선순위',
      accessor: (item: Banner) => (
        <div className="w-12 h-12 rounded-lg bg-muted border-2 border-border flex items-center justify-center shadow-inner group-hover:bg-surface-inverse group-hover:text-surface-inverse-foreground transition-all duration-500">
          <span className="font-bold text-lg font-mono tabular-nums leading-none">{item.sortOrdr}</span>
        </div>
      ),
      className: 'w-24 text-center'
    },
    {
      header: '게시 상태',
      accessor: (item: Banner) => {
        // 팝업은 자기 열(게시 여부)을 쓴다 — 이 열은 배너의 반영 여부만 본다.
        const isLive = item.rfltYn === 'Y';
        return <HubStatusBadge status={isLive ? '게시 중' : '대기 중'} variant={isLive ? 'success' : 'secondary'} />;
      },
      className: 'w-32'
    },
    // 수정·삭제 권한이 하나도 없으면 관리 열을 두지 않는다.
    ...(canUpdateBanner || canDeleteBanner ? [{
      header: '관리',
      className: 'text-right',
      accessor: (item: Banner) => (
        <div className="flex justify-end gap-2 pr-4">
          {canUpdateBanner && (
            <Button variant="ghost" size="icon" aria-label={`${item.bnrNm} 배너 수정`} disabled={isAssetWritePending || isModalOpen} className="size-8 rounded-md border border-border bg-muted hover:bg-accent" onClick={() => handleEdit(item)}>
              <Settings size={16} aria-hidden="true" />
            </Button>
          )}
          {canDeleteBanner && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`${item.bnrNm} 배너 ${deletingAssetKey === `banner:${item.bnrSn}` ? '삭제 중…' : '삭제'}`}
              aria-busy={deletingAssetKey === `banner:${item.bnrSn}` || undefined}
              disabled={isAssetWritePending || isModalOpen}
              className="size-8 rounded-md border border-destructive/30 text-destructive-emphasis hover:bg-destructive/10"
              onClick={() => handleDelete(item.bnrSn, item.bnrNm)}
            >
              {deletingAssetKey === `banner:${item.bnrSn}`
                ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                : <Trash2 size={16} aria-hidden="true" />}
            </Button>
          )}
        </div>
      )
    }] : []),
  ];

  const createButton = canCreateBanner ? (
    <Button size="sm" onClick={handleCreate} disabled={isAssetWritePending || isModalOpen}>
      <Plus size={16} aria-hidden="true" /> 신규 배너 등록
    </Button>
  ) : null;

  const table = (
    <StandardDataTable<Banner>
      columns={bannerColumns}
      data={banners}
      loading={isBannersLoading}
      error={bannerError}
      onRetry={() => refetchBanners()}
      keyField="bnrSn"
      emptyMessage="등록된 배너가 없습니다."
      pagination={{
        currentPage: page,
        totalPages: bannerPageData?.totalPage || 1,
        // totalCount 는 셸 툴바가 소유한다(표 하단 중복 표기 방지).
        pageSize,
        onPageSizeChange: (size) => { changePageSize(size); onPageChange(1); },
        onPageChange
      }}
    />
  );

  const modal = (
    <StandardModal
      isOpen={isModalOpen}
      onClose={closeAssetModal}
      title={editingItem ? '배너 명세 수정' : '신규 비주얼 자산 등록'}
      maxWidth="3xl"
      footer={
        <div className="flex w-full gap-2">
          <Button variant="outline" onClick={closeAssetModal} disabled={isAssetWritePending} className="flex-1">취소</Button>
          <Button
            onClick={() => submitBannerForm()}
            disabled={isAssetWritePending}
            aria-busy={isAssetSubmitting || undefined}
            className="flex-[2]"
          >
            <Zap size={16} className="mr-2" aria-hidden="true" /> {isAssetSubmitting ? '배포 중…' : editingItem ? '자산 수정' : '운영 배포'}
          </Button>
        </div>
      }
    >
      <div className="pt-4 p-4">
        <Form {...bannerForm}>
          <form noValidate onSubmit={submitBannerForm} className="space-y-12">
            <FormErrorSummary
              labels={{
                bnrNm: '배너 명칭',
                linkUrl: '랜딩 페이지',
                sortOrdr: '노출 순서',
                rfltYn: '자산 로드 상태',
                bnrExpln: '자산 설명',
              }}
              onNavigate={bannerForm.focusError}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <ShadcnFormField
                  control={bannerForm.control}
                  name="bnrNm"
                  required
                  render={({ field }) => (
                    <FormItem className="space-y-1.5 p-0.5">
                      <FormLabel className="flex items-center gap-1.5 text-[length:var(--font-size-body)] font-medium text-foreground">배너 명칭 (Internal Label)</FormLabel>
                      <FormControl>
                        <Input {...field} maxLength={100} className="rounded-lg text-md font-bold tracking-tight shadow-inner" placeholder="배너 이름 입력" />
                      </FormControl>
                      <p className="text-xs font-bold text-muted-foreground px-1 mt-1 leading-relaxed">관리용 명칭입니다</p>
                      <FormMessage className="mt-1 px-1 text-xs text-destructive-emphasis" />
                    </FormItem>
                  )}
                />
                <ShadcnFormField
                  control={bannerForm.control}
                  name="linkUrl"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5 p-0.5">
                      <FormLabel className="flex items-center gap-1.5 text-[length:var(--font-size-body)] font-medium text-foreground">랜딩 페이지 (Target URL)</FormLabel>
                      <div className="relative group/link">
                        <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                        <FormControl>
                          <Input {...field} maxLength={512} className="pl-16 rounded-lg font-mono text-xs font-bold shadow-inner" placeholder="/pages/..." />
                        </FormControl>
                      </div>
                      <p className="text-xs font-bold text-muted-foreground px-1 mt-1 leading-relaxed">클릭 시 이동할 프론트엔드 라우트 또는 외부 경로</p>
                      <FormMessage className="mt-1 px-1 text-xs text-destructive-emphasis" />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-8">
                  <ShadcnFormField
                    control={bannerForm.control}
                    name="sortOrdr"
                    required
                    render={({ field }) => (
                      <FormItem className="space-y-1.5 p-0.5">
                        <FormLabel className="flex items-center gap-1.5 text-[length:var(--font-size-body)] font-medium text-foreground">노출 순서 Priority</FormLabel>
                        <FormControl>
                          <Input {...field} {...numberInputProps(field, 0)} />
                        </FormControl>
                        <FormMessage className="mt-1 px-1 text-xs text-destructive-emphasis" />
                      </FormItem>
                    )}
                  />
                  <ShadcnFormField
                    control={bannerForm.control}
                    name="rfltYn"
                    required
                    render={({ field }) => (
                      <FormItem className="space-y-1.5 p-0.5">
                        <FormLabel className="flex items-center gap-1.5 text-[length:var(--font-size-body)] font-medium text-foreground">자산 로드 상태</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-[var(--control-h)] rounded-md border border-border bg-muted text-[length:var(--font-size-body)]">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-lg shadow-2xl">
                            <SelectItem value="Y" className="text-[length:var(--font-size-body)]">--- 활성 (Live) ---</SelectItem>
                            <SelectItem value="N" className="text-[length:var(--font-size-body)]">--- 대기 (Staging) ---</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="mt-1 px-1 text-xs text-destructive-emphasis" />
                      </FormItem>
                    )}
                  />
                </div>
                <ShadcnFormField
                  control={bannerForm.control}
                  name="bnrExpln"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5 p-0.5">
                      <FormLabel className="flex items-center gap-1.5 text-[length:var(--font-size-body)] font-medium text-foreground">자산 명세 및 설명 (Metadata)</FormLabel>
                      <FormControl>
                        <textarea {...field} maxLength={4000} className="w-full min-h-[120px] p-6 rounded-lg border-2 border-border bg-muted text-xs font-bold focus:ring-4 focus:ring-primary/10 outline-none resize-none shadow-inner" placeholder="배너 자산 용도 및 노출 조건 설명" />
                      </FormControl>
                      <FormMessage className="mt-1 px-1 text-xs text-destructive-emphasis" />
                    </FormItem>
                  )}
                />
              </div>
              <div className="space-y-4">
                {canUploadFile && <AssetUploadField onFilesChange={(f) => setFormFiles(f)} />}
                {editingItem?.atchFileSn && (
                  <div className="space-y-2 rounded-md border border-surface-inverse-border bg-surface-inverse p-3 text-surface-inverse-foreground">
                    <span className="text-xs text-surface-inverse-foreground/70">기존 파일 식별자</span>
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-inverse-foreground/10">
                        <SearchCode size={16} className="text-primary" aria-hidden="true" />
                      </div>
                      <span className="truncate font-mono text-xs text-surface-inverse-foreground">{editingItem.bnrImgNm}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </form>
        </Form>
      </div>
    </StandardModal>
  );

  return { total: bannerTotal, error: bannerError, createButton, table, modal };
}
