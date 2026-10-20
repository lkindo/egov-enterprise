'use client';

import React, { useCallback, useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { StandardFileUploader } from '@/app/components/ui/standard-file-uploader';
import { FormItem } from '@/components/ui/form';
import { Label } from '@/components/ui/label';

/*
  [2026-10-20] 배너·팝업 관리 화면을 자산별 파일(BannerAssetsPanel·PopupAssetsPanel)로 나누면서 두 폼이 함께 쓰던 조각을 여기에 둔다.
  동작은 바꾸지 않았다 — 종전 한 파일(BannerAdminClient)에 있던 코드를 그대로 옮겼다.
*/

/** 화면에 보이는 자산 종류(`?tab=`). */
export type PromotionAssetKind = 'banner' | 'popup';

/**
 * 한 화면의 쓰기 조정 — 배너·팝업 어느 쪽이든 검증·저장·삭제가 진행 중이면 다른 쓰기를 시작하지 않는다.
 * 종전 한 컴포넌트는 두 자산의 동기 잠금을 함께 들고 있었다. 파일을 나눈 뒤에도 그 범위가 같도록, 각 패널은 자기 잠금(ref)을 그대로
 * 들고 셸은 '다른 패널이 쓰는 중인가' 를 잇는다. 삭제 중 표시(어느 자산의 어느 행인가)는 두 패널이 함께 쓰는 상태다.
 */
export interface PromotionWriteCoordination {
  /** 이 패널의 쓰기 잠금 판정을 등록한다(마운트 때 한 번). */
  register: (kind: PromotionAssetKind, isBusy: () => boolean) => void;
  /** 다른 패널의 쓰기(검증·저장·삭제)가 진행 중인가. */
  otherBusy: (kind: PromotionAssetKind) => boolean;
  deletingAssetKey: string | null;
  setDeletingAssetKey: (key: string | null) => void;
}

export function usePromotionWriteCoordination(): PromotionWriteCoordination {
  const busy = useRef<Partial<Record<PromotionAssetKind, () => boolean>>>({});
  const [deletingAssetKey, setDeletingAssetKey] = useState<string | null>(null);
  const register = useCallback((kind: PromotionAssetKind, isBusy: () => boolean) => {
    busy.current[kind] = isBusy;
  }, []);
  const otherBusy = useCallback((kind: PromotionAssetKind) => {
    const other: PromotionAssetKind = kind === 'banner' ? 'popup' : 'banner';
    return busy.current[other]?.() ?? false;
  }, []);
  return { register, otherBusy, deletingAssetKey, setDeletingAssetKey };
}

/** 자산 패널이 셸에서 받는 것 — 페이지·크기는 셸(URL)이 소유한다. */
export interface PromotionAssetPanelProps<T> {
  /** 이 자산 종류가 지금 보이는가. 비활성 패널은 지표(전체 건수)만 필요하므로 항상 1페이지를 조회한다. */
  active: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  changePageSize: (size: number) => void;
  initialItems: T[];
  coordination: PromotionWriteCoordination;
}

/** 자산 패널이 셸에 돌려주는 것 — 셸이 한 업무 목록(WorkListPage)에 조립한다. */
export interface PromotionAssetPanel {
  /** 서버가 내려준 전체 건수(조회 실패면 0). */
  total: number;
  error: unknown;
  createButton: React.ReactNode;
  table: React.ReactNode;
  modal: React.ReactNode;
}

/** 숫자 입력칸 공통 속성 — 빈 칸은 undefined 로 두어 스키마가 필수 오류를 말하게 한다. `{...field}` 뒤에 펼친다. */
export function numberInputProps(
  field: { value?: unknown; onChange: (value: number | undefined) => void },
  min: number,
  max?: number,
) {
  return {
    value: (field.value ?? '') as number | string,
    type: 'number',
    min,
    max,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => field.onChange(event.target.value === '' ? undefined : Number(event.target.value)),
    className: 'rounded-lg font-bold shadow-inner',
  };
}

/** 배너·팝업 폼이 같은 모양으로 쓰는 미디어 1건 업로드 칸. */
export function AssetUploadField({ onFilesChange }: { onFilesChange: (files: File[]) => void }) {
  return (
    <FormItem className="space-y-1.5 p-0.5">
      <Label className="flex items-center gap-1.5 text-[length:var(--font-size-body)] font-medium text-foreground">미디어 자산 업로드 (Visual Payload)</Label>
      <div className="rounded-md border border-dashed border-border bg-muted/50 p-3 transition-colors hover:bg-muted">
        <StandardFileUploader onFilesChange={onFilesChange} maxFiles={1} />
        <div className="mt-2 flex items-center justify-center gap-2 text-muted-foreground">
          <UploadCloud size={16} aria-hidden="true" />
          <span className="text-center text-xs">여기로 파일을 드래그하여 업로드</span>
        </div>
      </div>
      <p className="mt-1 px-1 text-xs leading-relaxed text-muted-foreground">시스템 표준 규격 이미지를 준수하십시오</p>
    </FormItem>
  );
}
