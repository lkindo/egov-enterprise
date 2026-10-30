'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTodayStorageYmd } from '@/lib/hooks/use-today-ymd';
import { popupPostingState, POPUP_POSTING_LABEL } from '@/lib/popup-status';
import { isStorageYmd } from '@/lib/format-date';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import dynamic from 'next/dynamic';
const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });
import { Popup, PublicPopup } from '@/types/foundation/banner';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { fileAdminService } from '@/services/foundation/system/FileAdminService';
import { popupAdminService, type PopupInput } from '@/services/foundation/system/PopupAdminService';
import {
  Plus,
  Trash2,
  Loader2,
  Monitor,
  Calendar,
  Zap,
  Settings,
  SearchCode,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { savePopupAction, deletePopupAction } from '@/app/actions/promotionActions';
import { z } from 'zod';
import { useAppForm } from '@/hooks/useAppForm';
import {
  Form,
  FormControl,
  FormDescription,
  FormErrorSummary,
  FormField as ShadcnFormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { PopupSaveRequestRequestSchema } from '@/types/generated-zod';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import {
  AssetUploadField,
  numberInputProps,
  type PromotionAssetPanel,
  type PromotionAssetPanelProps,
} from './promotion-asset-form';
import { PopupPreview } from './PopupPreview';

/*
  [2026-10-20] 팝업 관리 패널 — 종전 BannerAdminClient(1,140줄)에서 팝업의 조회·표·등록/수정 창·삭제를 그대로 옮겼다(동작 변경 없음).
  더한 것은 편집 창의 사용자 화면 미리보기 하나다(PopupPreview — 사용자 화면과 같은 패널을 그린다).
  쓰기 처리기와 그 권한 판정은 같은 파일에 둔다 — 쓰기 권한 표시 census 가 파일 단위로 읽는다(DEC-OPS-361).
*/

const popupNumberSchema = (
  generatedField: z.ZodOptional<z.ZodString>,
  minimum: number,
) => z.coerce.string()
  .pipe(generatedField.unwrap().min(1, '숫자를 입력하세요.'))
  .transform(Number)
  .pipe(z.number().min(minimum));

const isoDateSchema = (generatedField: z.ZodOptional<z.ZodString>) => generatedField.unwrap()
  .min(1, '게시 일자를 입력하세요.')
  .regex(/^\d{4}-\d{2}-\d{2}$/, '게시 일자는 YYYY-MM-DD 형식이어야 합니다.')
  // 달력 실재 판정은 날짜 표기 단일 관문(lib/format-date)의 isStorageYmd 를 쓴다.
  .refine((value) => isStorageYmd(value.replace(/-/g, '')), '유효한 게시 일자를 입력하세요.');

/** 게시 일자 입력 마스크 — 숫자만 남겨 YYYY-MM-DD 로 끼워 넣는다. 숫자가 8자리를 넘으면 null(그 입력은 무시한다). */
function maskIsoDateTyping(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length > 8) return null;
  if (digits.length > 6) return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
  if (digits.length > 4) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return digits;
}

/** 팝업 좌표 입력의 상한 — 생성 계약이 좌표를 12자 문자열(max(12))로 받는다. */
const POPUP_NUMBER_MAX = 999999999999;

const POPUP_SIZE_ERROR = '100~4,000 사이의 정수를 입력하세요. 앞자리 0·소수·부호·공백은 사용할 수 없습니다.';
// Number/trim 변환 없이 생성된 저장 계약으로 원문을 판정한다. 조회 계약은 기존 값을 허용한다.
const popupSizeSchema = (generatedField: z.ZodType) => z.string({ error: POPUP_SIZE_ERROR })
  .refine(value => generatedField.safeParse(value).success, POPUP_SIZE_ERROR);

export const popupSchema = PopupSaveRequestRequestSchema.extend({
  popupTtlNm: PopupSaveRequestRequestSchema.shape.popupTtlNm.min(1),
  ntceBgnde: isoDateSchema(PopupSaveRequestRequestSchema.shape.ntceBgnde),
  ntceEndde: isoDateSchema(PopupSaveRequestRequestSchema.shape.ntceEndde),
  popupWdthPstn: popupNumberSchema(PopupSaveRequestRequestSchema.shape.popupWdthPstn, 0),
  popupVrtcPstn: popupNumberSchema(PopupSaveRequestRequestSchema.shape.popupVrtcPstn, 0),
  popupWdthSz: popupSizeSchema(PopupSaveRequestRequestSchema.shape.popupWdthSz),
  popupVrtcSz: popupSizeSchema(PopupSaveRequestRequestSchema.shape.popupVrtcSz),
  ntceYn: PopupSaveRequestRequestSchema.shape.ntceYn.unwrap(),
  stopvewSetupYn: PopupSaveRequestRequestSchema.shape.stopvewSetupYn.unwrap(),
}).refine(data => {
  if (!data.ntceBgnde || !data.ntceEndde) return true;
  const start = data.ntceBgnde.replace(/\D/g, '');
  const end = data.ntceEndde.replace(/\D/g, '');
  if (start.length !== 8 || end.length !== 8) return true; // Let min(1) or other rules handle empty
  return parseInt(end) >= parseInt(start);
}, {
  message: '종료일은 시작일보다 빠를 수 없습니다.',
  path: ['ntceEndde']
});

type PopupFormValues = z.infer<typeof popupSchema>;

/**
 * 팝업 폼 기본값 — 첫 렌더의 defaultValues 와 모달을 열 때의 reset 이 같은 값을 쓴다.
 * 세로 높이는 신규 등록 화면이 실제로 보여 온 300 이다(종전 defaultValues 의 400 은 열 때 reset 이 덮어 보이지 않았다).
 */
const POPUP_FORM_DEFAULTS: PopupFormValues = {
  popupTtlNm: '',
  ntceBgnde: '',
  ntceEndde: '',
  popupWdthPstn: 0,
  popupVrtcPstn: 0,
  popupWdthSz: '400',
  popupVrtcSz: '300',
  ntceYn: 'Y',
  stopvewSetupYn: 'Y'
};

/** 입력 중인 값(검증 전)을 미리보기용 팝업으로 바꾼다 — 숫자가 아닌 좌표·크기는 패널이 기본값으로 읽는다. */
function previewPopupOf(values: Partial<Record<keyof PopupFormValues, unknown>>, fileUrl: string, popupSn: number): PublicPopup {
  const text = (value: unknown) => (value === undefined || value === null ? '' : String(value));
  return {
    popupSn,
    popupTtlNm: text(values.popupTtlNm),
    fileUrl,
    popupWdthPstn: text(values.popupWdthPstn),
    popupVrtcPstn: text(values.popupVrtcPstn),
    popupWdthSz: text(values.popupWdthSz),
    popupVrtcSz: text(values.popupVrtcSz),
    ntceBgnde: text(values.ntceBgnde),
    ntceEndde: text(values.ntceEndde),
    ntceYn: values.ntceYn === 'N' ? 'N' : 'Y',
    stopvewSetupYn: values.stopvewSetupYn === 'N' ? 'N' : 'Y',
  };
}

export function usePopupAssetsPanel({
  active,
  page,
  pageSize,
  onPageChange,
  changePageSize,
  initialItems: initialPopups,
  coordination,
}: PromotionAssetPanelProps<Popup>): PromotionAssetPanel & { scheduledOnPage: number | null } {
  const { toast } = useToast();
  const confirm = useConfirm();
  // [2026-10-01] 쓰기 버튼은 그 동작의 기능 권한으로 보인다(표시 판정일 뿐이며 서버 인가는 그대로 집행된다, H3).
  //   파일 첨부는 업로드 권한(FILE_UPLOAD_ALL)이 따로 있어, 없으면 첨부 컨트롤만 두지 않는다 — 기존 파일은 그대로 유지된다.
  const { user } = useAuth();
  const canCreatePopup = canPermission(user, 'POPUP_CREATE');
  const canUpdatePopup = canPermission(user, 'POPUP_UPDATE');
  const canDeletePopup = canPermission(user, 'POPUP_DELETE');
  const canUploadFile = canPermission(user, 'FILE_UPLOAD_ALL');

  const todayYmd = useTodayStorageYmd();
  const [isModalOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Popup | null>(null);
  const [formFiles, setFormFiles] = useState<File[]>([]);
  /*
    미리보기용 새 그림의 주소. 올리기 전의 파일은 서버 주소가 없어 브라우저 객체 주소로 그린다. 고를 때 만들고(이전 것은 그때 놓는다),
    창을 다시 열 때 놓는다 — 미리보기 말고는 쓰지 않는다(저장은 종전대로 파일을 올려 받은 주소를 싣는다).
  */
  const previewObjectUrl = useRef<string | null>(null);
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
  const replacePreviewFile = (file: File | undefined) => {
    if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current);
    previewObjectUrl.current = null;
    if (file instanceof Blob && typeof URL.createObjectURL === 'function') {
      try {
        previewObjectUrl.current = URL.createObjectURL(file);
      } catch {
        // 미리보기 그림만 잃는다 — 고른 파일은 그대로 저장에 쓰인다.
      }
    }
    setPreviewFileUrl(previewObjectUrl.current);
  };

  const { deletingAssetKey, setDeletingAssetKey, register, otherBusy } = coordination;
  const popupValidationLock = useRef(false);
  const popupSubmitLock = useRef(false);
  const deletePendingRef = useRef(false);
  /** 이 패널이나 다른 패널의 쓰기(검증·저장·삭제)가 진행 중인가 — 종전 한 컴포넌트의 공유 잠금과 같은 범위다. */
  const writeLocked = () => popupValidationLock.current || popupSubmitLock.current || deletePendingRef.current
    || otherBusy('popup');
  useEffect(() => {
    register('popup', () => popupValidationLock.current || popupSubmitLock.current || deletePendingRef.current);
  }, [register]);

  const popupForm = useAppForm<typeof popupSchema, PopupFormValues>(popupSchema, {
    defaultValues: POPUP_FORM_DEFAULTS
  });
  // 미리보기는 입력 중인 값을 따라 그린다(검증 전 값이다 — 숫자가 아니면 패널이 기본값으로 읽는다).
  const watchedValues = popupForm.watch();
  const isAssetSubmitting = popupForm.formState.isSubmitting;
  const isAssetWritePending = isAssetSubmitting || deletingAssetKey !== null;

  const resetPopupForm = popupForm.reset;

  React.useEffect(() => {
    if (isModalOpen) {
      const item = editingItem;
      const fallback = POPUP_FORM_DEFAULTS;
      resetPopupForm({
        popupTtlNm: item?.popupTtlNm || fallback.popupTtlNm,
        ntceBgnde: item?.ntceBgnde || fallback.ntceBgnde,
        ntceEndde: item?.ntceEndde || fallback.ntceEndde,
        popupWdthPstn: item?.popupWdthPstn ? Number(item.popupWdthPstn) : fallback.popupWdthPstn,
        popupVrtcPstn: item?.popupVrtcPstn ? Number(item.popupVrtcPstn) : fallback.popupVrtcPstn,
        popupWdthSz: item?.popupWdthSz ?? fallback.popupWdthSz,
        popupVrtcSz: item?.popupVrtcSz ?? fallback.popupVrtcSz,
        ntceYn: (item?.ntceYn as 'Y' | 'N') || fallback.ntceYn,
        stopvewSetupYn: (item?.stopvewSetupYn as 'Y' | 'N') || fallback.stopvewSetupYn
      });
    }
    // useAppForm 은 최신 formState 를 노출하기 위해 wrapper 를 새로 만든다. form 객체 자체를
    // 의존성에 두면 입력 렌더마다 effect 가 재실행되어 방금 입력한 값을 빈 값으로 reset 한다.
  }, [isModalOpen, editingItem, resetPopupForm]);

  /** 비활성 탭은 지표(전체 건수)만 필요하므로 항상 1페이지를 조회한다. */
  const popupPage = active ? page : 1;

  /* 배너/팝업 컨트롤러는 모두 page(1부터)·size 만 읽는다(ADR-0036). */
  const { data: popupPageData, isLoading: isPopupsLoading, error: popupError, refetch: refetchPopups } = useQuery({
    queryKey: ['admin-popups', popupPage, pageSize],
    queryFn: () => popupAdminService.getPopupList({ page: popupPage, size: pageSize })
  });

  /*
   * [P1-1] 조회 실패 시에는 SSR 초기값으로 되돌아가 "데이터가 있는 척" 하지 않는다.
   * 실패는 StandardDataTable 의 error/onRetry 로 화면에 드러낸다.
   */
  const popups: Popup[] = popupPageData?.list ?? (popupError ? [] : initialPopups);
  /** 지표는 현재 페이지 길이가 아니라 서버가 내려준 전체 건수(total)를 쓴다. */
  const popupTotal = popupPageData?.total ?? (popupError ? 0 : initialPopups.length);

  const openModal = (item: Popup | null) => {
    setEditingItem(item);
    setFormFiles([]);
    replacePreviewFile(undefined);
    setIsOpen(true);
  };

  const handleCreate = () => {
    if (writeLocked() || isModalOpen) return;
    openModal(null);
  };

  const handleEdit = (item: Popup) => {
    if (writeLocked() || isModalOpen) return;
    openModal(item);
  };

  /** [P1-9] 확인 본문에 대상 식별자(명칭)를 노출해 오삭제를 막는다. */
  const handleDelete = async (id: string | number, name: string) => {
    if (writeLocked() || isModalOpen) return;
    deletePendingRef.current = true;
    const assetKey = `popup:${id}`;
    setDeletingAssetKey(assetKey);

    try {
      const ok = await confirm({
        title: '팝업 삭제 확인',
        message: `‘${name}’ 팝업을(를) 시스템에서 영구적으로 삭제합니다. 게시 중인 경우 즉시 중단되며 되돌릴 수 없습니다.`,
        variant: 'destructive',
        confirmText: '삭제'
      });

      if (!ok) return;

      const res = await deletePopupAction(null, Number(id));

      if (res.success) {
        toast(res.message, 'success');
        void refetchPopups();
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

  const onPopupSubmit = async (values: z.infer<typeof popupSchema>) => {
    if (popupSubmitLock.current || deletePendingRef.current || otherBusy('popup')) return;
    popupSubmitLock.current = true;
    try {
      const data: PopupInput = {
        ...values,
        ntceYn: values.ntceYn as "Y" | "N",
        stopvewSetupYn: values.stopvewSetupYn as "Y" | "N",
        ntceBgnde: values.ntceBgnde,
        ntceEndde: values.ntceEndde,
        popupWdthPstn: String(values.popupWdthPstn),
        popupVrtcPstn: String(values.popupVrtcPstn),
        popupWdthSz: values.popupWdthSz,
        popupVrtcSz: values.popupVrtcSz
      };

      if (formFiles.length > 0) {
        // [2026-09-03] 배너 쪽과 같은 짐작을 걷었다. 두 호출부는 **모양이 달랐지만**
        //   (여기는 `typeof === 'number'` 가드로 시작해 최종 폴백이 없고, 배너 쪽은 3중 `||` 였다)
        //   실제 도달 가능한 표현은 양쪽 다 `uploadRes` 하나뿐이다 — 생성 계약이 number 를 보장한다.
        //   같은 문법이 같은 의미가 아니므로 한쪽 형태를 복사하지 않고 각각의 도달 가능성을 확인했다.
        const uploadedFileSn = await fileAdminService.uploadFiles(formFiles);
        // 종전에는 `/api/v1/files/download?fileId=…` 를 저장했는데 백엔드에 그 경로가 없다(매핑 0건).
        // 실존 경로를 저장한다. 렌더는 blob 으로 하되(헤더 인증), 값 자체는 실재하는 URL 이어야
        // 나중에 다른 소비자가 열어 보더라도 404 가 아니게 된다.
        data.fileUrl = `/api/v1/files/${uploadedFileSn}`;
      } else if (editingItem) {
        // 조회 null은 파일 없음이다. 저장 계약의 생략값도 같은 의미이며 기존 파일 URL은 보존한다.
        data.fileUrl = editingItem.fileUrl ?? undefined;
      }
      // [2026-10-18] 창을 열 때 읽은 버전을 함께 보낸다 — 다른 사람이 먼저 고쳤으면 서버가 409 로 거부해 덮어쓰지 않는다.
      if (editingItem) data.version = editingItem.version;

      const res = await savePopupAction(null, {
        mode: editingItem ? 'edit' : 'create',
        data,
        id: editingItem?.popupSn
      });

      if (res.success) {
        toast(res.message, 'success');
        setIsOpen(false);
        refetchPopups();
      } else {
        // 다른 사람이 먼저 고쳤다(409) — 서버 사유를 보이고 목록을 다시 읽는다. 입력한 내용은 창에 남긴다.
        if (res.conflict) refetchPopups();
        if (!popupForm.applyServerErrors(res)) toast(res.message, 'error');
      }
    } catch (error) {
      if (!popupForm.applyServerErrors(error)) {
        toast('데이터 처리 중 오류가 발생했습니다.', 'error');
      }
    } finally {
      popupSubmitLock.current = false;
      popupValidationLock.current = false;
    }
  };

  const closeAssetModal = () => {
    if (writeLocked()) return;
    setIsOpen(false);
  };

  const submitPopupForm = (event?: React.BaseSyntheticEvent) => {
    if (writeLocked()) {
      event?.preventDefault();
      return;
    }
    popupValidationLock.current = true;
    const submit = popupForm.handleSubmit(onPopupSubmit, () => {
      popupValidationLock.current = false;
    });
    void submit(event).catch(() => {
      popupValidationLock.current = false;
      popupSubmitLock.current = false;
    });
  };

  const popupColumns: Column<Popup>[] = [
    {
      header: '팝업 명세',
      accessor: (item: Popup) => (
        <div className="flex flex-col gap-0.5 py-1">
          <span className="text-[length:var(--font-size-body)] font-medium leading-tight text-foreground">{item.popupTtlNm}</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 rounded border border-border bg-muted px-2 py-0.5">
              <Calendar size={12} className="text-muted-foreground" aria-hidden="true" />
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {item.ntceBgnde} ~ {item.ntceEndde}
              </span>
            </div>
          </div>
        </div>
      )
    },
    {
      header: '화면 크기',
      accessor: (item: Popup) => (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <Monitor size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="font-mono text-xs tabular-nums text-foreground">{item.popupWdthSz}px x {item.popupVrtcSz}px</span>
          </div>
          <div className="flex items-center gap-2 pl-5">
            <span className="text-xs tabular-nums text-muted-foreground">표시 좌표 (X:{item.popupWdthPstn}, Y:{item.popupVrtcPstn})</span>
          </div>
        </div>
      ),
      className: 'w-64'
    },
    {
      header: '게시 여부',
      // [2026-09-26 DIP V9] 게시 여부만이 아니라 게시 기간까지 본다 — 사용자 화면의 활성 팝업 조회와 같은 판정.
      accessor: (item: Popup) => {
        const state = popupPostingState(item, todayYmd);
        return <HubStatusBadge status={POPUP_POSTING_LABEL[state]} variant={state === 'live' ? 'success' : 'secondary'} />;
      },
      className: 'w-32'
    },
    // 수정·삭제 권한이 하나도 없으면 관리 열을 두지 않는다.
    ...(canUpdatePopup || canDeletePopup ? [{
      header: '관리',
      className: 'text-right w-32',
      accessor: (item: Popup) => (
        <div className="flex justify-end gap-2 pr-4">
          {canUpdatePopup && (
            <Button variant="ghost" size="icon" aria-label={`${item.popupTtlNm} 팝업 수정`} disabled={isAssetWritePending || isModalOpen} className="size-8 rounded-md border border-border bg-muted hover:bg-accent" onClick={() => handleEdit(item)}>
              <Settings size={16} aria-hidden="true" />
            </Button>
          )}
          {canDeletePopup && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`${item.popupTtlNm} 팝업 ${deletingAssetKey === `popup:${item.popupSn}` ? '삭제 중…' : '삭제'}`}
              aria-busy={deletingAssetKey === `popup:${item.popupSn}` || undefined}
              disabled={isAssetWritePending || isModalOpen}
              className="size-8 rounded-md border border-destructive/30 text-destructive-emphasis hover:bg-destructive/10"
              onClick={() => handleDelete(item.popupSn, item.popupTtlNm)}
            >
              {deletingAssetKey === `popup:${item.popupSn}`
                ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                : <Trash2 size={16} aria-hidden="true" />}
            </Button>
          )}
        </div>
      )
    }] : []),
  ];

  const createButton = canCreatePopup ? (
    <Button size="sm" onClick={handleCreate} disabled={isAssetWritePending || isModalOpen}>
      <Plus size={16} aria-hidden="true" /> 신규 팝업 등록
    </Button>
  ) : null;

  const table = (
    <StandardDataTable<Popup>
      columns={popupColumns}
      data={popups}
      loading={isPopupsLoading}
      error={popupError}
      onRetry={() => refetchPopups()}
      keyField="popupSn"
      emptyMessage="등록된 팝업이 없습니다."
      pagination={{
        currentPage: page,
        totalPages: popupPageData?.totalPage || 1,
        // totalCount 는 셸 툴바가 소유한다(표 하단 중복 표기 방지).
        pageSize,
        onPageSizeChange: (size) => { changePageSize(size); onPageChange(1); },
        onPageChange
      }}
    />
  );

  // 미리보기는 입력 중인 값으로 그린다 — 새로 고른 그림이 있으면 그것을, 없으면 저장된 그림을 쓴다.
  const previewPopup = previewPopupOf(watchedValues, previewFileUrl ?? editingItem?.fileUrl ?? '', editingItem?.popupSn ?? 0);

  const modal = (
    <StandardModal
      isOpen={isModalOpen}
      onClose={closeAssetModal}
      title={editingItem ? '팝업 아키텍처 수정' : '신규 레이어 팝업 설계'}
      maxWidth="3xl"
      footer={
        <div className="flex w-full gap-2">
          <Button variant="outline" onClick={closeAssetModal} disabled={isAssetWritePending} className="flex-1">취소</Button>
          <Button
            onClick={() => submitPopupForm()}
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
        <Form {...popupForm}>
          <form noValidate onSubmit={submitPopupForm} className="space-y-12">
            <FormErrorSummary
              labels={{
                popupTtlNm: '팝업 타이틀',
                ntceBgnde: '게시 시작 시점',
                ntceEndde: '게시 종료 시점',
                popupWdthPstn: '가로 좌표',
                popupVrtcPstn: '세로 좌표',
                popupWdthSz: '가로 폭',
                popupVrtcSz: '세로 높이',
                ntceYn: '게시 설정',
                stopvewSetupYn: '다시보지않기 처리',
              }}
              onNavigate={popupForm.focusError}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <ShadcnFormField
                  control={popupForm.control}
                  name="popupTtlNm"
                  required
                  render={({ field }) => (
                    <FormItem className="space-y-1.5 p-0.5">
                      <FormLabel className="flex items-center gap-1.5 text-[length:var(--font-size-body)] font-medium text-foreground">팝업 타이틀 (Header)</FormLabel>
                      <FormControl>
                        <Input {...field} maxLength={100} className="rounded-lg text-md font-bold tracking-tight shadow-inner" placeholder="팝업 제목 입력" />
                      </FormControl>
                      <FormMessage className="mt-1 px-1 text-xs text-destructive-emphasis" />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-8 p-10 bg-muted border-2 border-dashed border-border rounded-lg shadow-inner">
                  <ShadcnFormField
                    control={popupForm.control}
                    name="ntceBgnde"
                    required
                    render={({ field }) => (
                      <FormItem className="space-y-1.5 p-0.5">
                        <FormLabel className="flex items-center gap-1.5 text-[length:var(--font-size-body)] font-medium text-foreground">게시 시작 시점 (T-0)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            maxLength={10}
                            inputMode="numeric"
                            placeholder="YYYY-MM-DD"
                            onChange={(e) => {
                              const masked = maskIsoDateTyping(e.target.value);
                              if (masked !== null) field.onChange(masked);
                            }}
                            className="rounded-lg text-xs font-bold shadow-sm"
                          />
                        </FormControl>
                        <FormMessage className="mt-1 px-1 text-xs text-destructive-emphasis" />
                      </FormItem>
                    )}
                  />
                  <ShadcnFormField
                    control={popupForm.control}
                    name="ntceEndde"
                    required
                    render={({ field }) => (
                      <FormItem className="space-y-1.5 p-0.5">
                        <FormLabel className="flex items-center gap-1.5 text-[length:var(--font-size-body)] font-medium text-foreground">게시 종료 시점 (T-End)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="text"
                            maxLength={10}
                            inputMode="numeric"
                            placeholder="YYYY-MM-DD"
                            onChange={(e) => {
                              const masked = maskIsoDateTyping(e.target.value);
                              if (masked !== null) field.onChange(masked);
                            }}
                            className="rounded-lg text-xs font-bold shadow-sm"
                          />
                        </FormControl>
                        <FormMessage className="mt-1 px-1 text-xs text-destructive-emphasis" />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <ShadcnFormField
                    control={popupForm.control}
                    name="popupWdthPstn"
                    required
                    render={({ field }) => (
                      <FormItem className="space-y-1.5 p-0.5">
                        <FormLabel className="flex items-center gap-1.5 text-[length:var(--font-size-body)] font-medium text-foreground">가로 좌표 (X_Pivot)</FormLabel>
                        <FormControl>
                          <Input {...field} {...numberInputProps(field, 0, POPUP_NUMBER_MAX)} />
                        </FormControl>
                        <FormMessage className="mt-1 px-1 text-xs text-destructive-emphasis" />
                      </FormItem>
                    )}
                  />
                  <ShadcnFormField
                    control={popupForm.control}
                    name="popupVrtcPstn"
                    required
                    render={({ field }) => (
                      <FormItem className="space-y-1.5 p-0.5">
                        <FormLabel className="flex items-center gap-1.5 text-[length:var(--font-size-body)] font-medium text-foreground">세로 좌표 (Y_Pivot)</FormLabel>
                        <FormControl>
                          <Input {...field} {...numberInputProps(field, 0, POPUP_NUMBER_MAX)} />
                        </FormControl>
                        <FormMessage className="mt-1 px-1 text-xs text-destructive-emphasis" />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <ShadcnFormField
                    control={popupForm.control}
                    name="popupWdthSz"
                    required
                    render={({ field }) => (
                      <FormItem className="space-y-1.5 p-0.5">
                        <FormLabel className="flex items-center gap-1.5 text-[length:var(--font-size-body)] font-medium text-foreground">가로 폭 (W_Res)</FormLabel>
                        <FormControl>
                          <Input {...field} type="text" inputMode="numeric" />
                        </FormControl>
                        <FormDescription>
                          100~4,000 사이의 정수를 입력하세요.
                          {editingItem?.popupWdthSz != null
                            && !PopupSaveRequestRequestSchema.shape.popupWdthSz.safeParse(editingItem.popupWdthSz).success
                            && !PopupSaveRequestRequestSchema.shape.popupWdthSz.safeParse(field.value).success
                            && ' 기존 값이 범위나 형식에 맞지 않습니다. 수정 후 저장해 주세요.'}
                        </FormDescription>
                        <FormMessage className="mt-1 px-1 text-xs text-destructive-emphasis" />
                      </FormItem>
                    )}
                  />
                  <ShadcnFormField
                    control={popupForm.control}
                    name="popupVrtcSz"
                    required
                    render={({ field }) => (
                      <FormItem className="space-y-1.5 p-0.5">
                        <FormLabel className="flex items-center gap-1.5 text-[length:var(--font-size-body)] font-medium text-foreground">세로 높이 (H_Res)</FormLabel>
                        <FormControl>
                          <Input {...field} type="text" inputMode="numeric" />
                        </FormControl>
                        <FormDescription>
                          100~4,000 사이의 정수를 입력하세요.
                          {editingItem?.popupVrtcSz != null
                            && !PopupSaveRequestRequestSchema.shape.popupVrtcSz.safeParse(editingItem.popupVrtcSz).success
                            && !PopupSaveRequestRequestSchema.shape.popupVrtcSz.safeParse(field.value).success
                            && ' 기존 값이 범위나 형식에 맞지 않습니다. 수정 후 저장해 주세요.'}
                        </FormDescription>
                        <FormMessage className="mt-1 px-1 text-xs text-destructive-emphasis" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <div className="space-y-4">
                {canUploadFile && (
                  <AssetUploadField onFilesChange={(f) => { setFormFiles(f); replacePreviewFile(f[0]); }} />
                )}
                {editingItem?.fileUrl && (
                  <div className="space-y-2 rounded-md border border-surface-inverse-border bg-surface-inverse p-3 text-surface-inverse-foreground">
                    <span className="text-xs text-surface-inverse-foreground/70">기존 파일 식별자</span>
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-inverse-foreground/10">
                        <SearchCode size={16} className="text-primary" aria-hidden="true" />
                      </div>
                      <span className="truncate font-mono text-xs text-surface-inverse-foreground">{editingItem.fileUrl}</span>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-3 rounded-md border border-border bg-muted/40 p-4">
                  <p className="text-xs text-muted-foreground">상태 프로토콜</p>
                  <div className="grid grid-cols-2 gap-3">
                    <ShadcnFormField
                      control={popupForm.control}
                      name="ntceYn"
                      required
                      render={({ field }) => (
                        <FormItem className="space-y-1.5 p-0.5">
                          <FormLabel className="flex items-center gap-1.5 text-[length:var(--font-size-body)] font-medium text-foreground">게시 설정</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-[var(--control-h)] rounded-md border border-border bg-card text-[length:var(--font-size-body)]">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-lg">
                              <SelectItem value="Y" className="text-[length:var(--font-size-body)]">게시 (LIVE)</SelectItem>
                              <SelectItem value="N" className="text-[length:var(--font-size-body)]">대기 (STAGING)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage className="mt-1 px-1 text-xs text-destructive-emphasis" />
                        </FormItem>
                      )}
                    />
                    <ShadcnFormField
                      control={popupForm.control}
                      name="stopvewSetupYn"
                      required
                      render={({ field }) => (
                        <FormItem className="space-y-1.5 p-0.5">
                          <FormLabel className="flex items-center gap-1.5 text-[length:var(--font-size-body)] font-medium text-foreground">다시보지않기 처리</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-[var(--control-h)] rounded-md border border-border bg-card text-[length:var(--font-size-body)]">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-lg">
                              <SelectItem value="Y" className="text-[length:var(--font-size-body)]">활성 (ENABLE)</SelectItem>
                              <SelectItem value="N" className="text-[length:var(--font-size-body)]">비활성 (DISABLE)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage className="mt-1 px-1 text-xs text-destructive-emphasis" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
            <PopupPreview popup={previewPopup} />
          </form>
        </Form>
      </div>
    </StandardModal>
  );

  /* 게시 예정 수는 '게시 여부' 열과 같은 판정(popupPostingState)·같은 오늘(todayYmd)로 센다. 오늘을 모르는 서버 렌더에서는 null 이다. */
  const scheduledOnPage = todayYmd !== ''
    ? popups.filter((item) => popupPostingState(item, todayYmd) === 'scheduled').length
    : null;

  return { total: popupTotal, error: popupError, createButton, table, modal, scheduledOnPage };
}
