'use client';

import type { FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { DEFAULT_BOARD_TYPE, type BoardTemplateId } from '@/lib/board/board-types';
import { SERVER_MAX_FILES_PER_REQUEST, SERVER_MAX_FILE_SIZE_MB } from '@/lib/attachments/server-upload-limits';
import { BoardPreview, type BoardPreviewFeatures } from './BoardPreview';
import type { BoardMakerFormValues } from './BoardMakerWizard';
import {
  BYTES_PER_MB,
  PRIVATE_POST_POLICY_OPTIONS,
  TEMPLATES,
  type PrivatePostPolicy,
  type PurposeField,
} from './board-maker-model';

const FEATURE_OPTIONS = [
  ['ansYn', '댓글 받기', '끄면 새 댓글을 받지 않습니다. 이미 달린 댓글은 그대로 보입니다.'],
  ['stsfdgYn', '만족도 평가 받기', '끄면 새 만족도 평가를 받지 않습니다.'],
  ['fileAtchPsbltyYn', '파일 첨부 허용', '끄면 새 첨부를 받지 않습니다.'],
  ['rsvtPstgPsbltyYn', '예약 게시 받기', '켜면 오늘보다 뒤의 시작일을 받습니다. 그 글은 시작일까지 작성자와 게시판 관리자에게만 보입니다.'],
  ['upendFixPsbltyYn', '상단 고정 받기', '켜면 운영 화면에서 글을 게시판 목록 맨 위에 고정할 수 있습니다(게시글 상단 고정 권한 필요).'],
  ['rcmdtnUseYn', '추천 받기', '끄면 새 추천을 받지 않습니다. 쌓인 추천 수는 그대로이고 각자 자기 추천은 거둘 수 있습니다.'],
] as const;

interface PinRange {
  min?: number | null;
  max?: number | null;
}

interface BoardMakerStep2FieldsProps {
  selectedTemplate: BoardTemplateId | undefined;
  setTemplate: (templateId: BoardTemplateId) => void;
  touch: (field: PurposeField) => void;
  watch: UseFormWatch<BoardMakerFormValues>;
  setValue: UseFormSetValue<BoardMakerFormValues>;
  errors: FieldErrors<{
    atchPsbltyFileQty?: unknown;
    atchPsbltyFileSz?: unknown;
    upendFixUplmtNocs?: unknown;
    upendFixBscDayCnt?: unknown;
  }>;
  fileSizeBytes: number;
  bbsTtl: string;
  bbsExpln: string;
  previewFeatures: BoardPreviewFeatures;
  pinLimitRange: PinRange;
  pinDaysRange: PinRange;
}

export function BoardMakerStep2Fields({
  selectedTemplate,
  setTemplate,
  touch,
  watch,
  setValue,
  errors,
  fileSizeBytes,
  bbsTtl,
  bbsExpln,
  previewFeatures,
  pinLimitRange,
  pinDaysRange,
}: BoardMakerStep2FieldsProps) {
  return (
    <div className="flex flex-col gap-6 text-left lg:flex-row">
      <div className="flex-1 space-y-4 text-left">
        <div className="space-y-1 text-left">
          <h3 className="text-[length:var(--font-size-body)] font-semibold text-foreground text-left">화면 유형</h3>
          <p className="text-[length:var(--font-size-body)] text-muted-foreground text-left">
            게시판 글을 어떤 모양으로 보일지 고르세요. 만든 뒤에는 바꿀 수 없습니다.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {TEMPLATES.map((tpl) => {
            const Icon = tpl.icon;
            const isSelected = selectedTemplate === tpl.id;

            return (
              <div
                key={tpl.id}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                onClick={() => {
                  touch('tmpltId');
                  setTemplate(tpl.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    touch('tmpltId');
                    setTemplate(tpl.id);
                  }
                }}
                className={cn(
                  'group relative p-8 rounded-md border cursor-pointer flex items-center gap-3 transition-colors',
                  isSelected ? 'border-primary bg-primary/5' : 'border-border bg-muted/30 hover:border-primary',
                )}
              >
                <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-md', tpl.color)}>
                  <Icon size={18} aria-hidden="true" />
                </div>

                <div className="flex-1 space-y-0.5 text-left">
                  <h4 className="text-[length:var(--font-size-body)] font-semibold text-foreground text-left">
                    {tpl.name}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-snug text-left">{tpl.description}</p>
                </div>

                <div
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-md border transition-colors',
                    isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-border text-transparent',
                  )}
                >
                  <Check size={14} strokeWidth={3} aria-hidden="true" />
                </div>
              </div>
            );
          })}
        </div>

        <fieldset className="space-y-2 rounded-md border border-border p-3">
          <legend className="px-1 text-[length:var(--font-size-body)] font-medium text-foreground">게시판 기능</legend>
          {FEATURE_OPTIONS.map(([field, label, help]) => (
            <label key={field} className="flex items-start gap-2 text-[length:var(--font-size-body)] text-foreground">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-primary"
                aria-label={label}
                checked={watch(field) !== 'N'}
                onChange={(event) => {
                  touch(field);
                  setValue(field, event.target.checked ? 'Y' : 'N', { shouldDirty: true });
                }}
                aria-describedby={`${field}-help`}
              />
              <span>
                <span className="font-medium">{label}</span>
                <span id={`${field}-help`} className="block text-xs text-muted-foreground">
                  {help}
                </span>
              </span>
            </label>
          ))}
          <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="atchPsbltyFileQty" className="text-xs font-medium text-foreground">
                첨부 파일 수(0 은 상한 없음)
              </Label>
              <Input
                id="atchPsbltyFileQty"
                type="number"
                min={0}
                max={SERVER_MAX_FILES_PER_REQUEST}
                aria-invalid={errors.atchPsbltyFileQty ? 'true' : 'false'}
                aria-describedby={errors.atchPsbltyFileQty ? 'atchPsbltyFileQty-error' : undefined}
                value={Number.isNaN(Number(watch('atchPsbltyFileQty'))) ? '' : String(watch('atchPsbltyFileQty'))}
                onChange={(event) => {
                  touch('atchPsbltyFileQty');
                  setValue('atchPsbltyFileQty', event.target.value === '' ? Number.NaN : Number(event.target.value), {
                    shouldDirty: true,
                  });
                }}
              />
              {errors.atchPsbltyFileQty && (
                <p id="atchPsbltyFileQty-error" className="text-destructive-emphasis text-xs font-bold">
                  {String(errors.atchPsbltyFileQty.message ?? '')}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="atchPsbltyFileSz" className="text-xs font-medium text-foreground">
                파일당 크기(MB, 비우면 전역 상한 {SERVER_MAX_FILE_SIZE_MB}MB)
              </Label>
              <Input
                id="atchPsbltyFileSz"
                type="number"
                min={0}
                max={SERVER_MAX_FILE_SIZE_MB}
                step="0.5"
                aria-invalid={errors.atchPsbltyFileSz ? 'true' : 'false'}
                aria-describedby={errors.atchPsbltyFileSz ? 'atchPsbltyFileSz-error' : undefined}
                value={fileSizeBytes > 0 ? String(fileSizeBytes / BYTES_PER_MB) : ''}
                onChange={(event) =>
                  setValue('atchPsbltyFileSz', event.target.value === '' ? 0 : Math.round(Number(event.target.value) * BYTES_PER_MB), {
                    shouldDirty: true,
                  })
                }
              />
              {errors.atchPsbltyFileSz && (
                <p id="atchPsbltyFileSz-error" className="text-destructive-emphasis text-xs font-bold">
                  {String(errors.atchPsbltyFileSz.message ?? '')}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
            {([
              ['upendFixUplmtNocs', '상단 고정 상한(건)', pinLimitRange],
              ['upendFixBscDayCnt', '상단 고정 기본 일수(일)', pinDaysRange],
            ] as const).map(([field, label, range]) => (
              <div key={field} className="space-y-1">
                <Label htmlFor={field} className="text-xs font-medium text-foreground">
                  {label}
                </Label>
                <Input
                  id={field}
                  type="number"
                  min={range.min ?? undefined}
                  max={range.max ?? undefined}
                  readOnly={watch('upendFixPsbltyYn') !== 'Y'}
                  aria-invalid={errors[field] ? 'true' : 'false'}
                  aria-describedby={errors[field] ? `${field}-error` : undefined}
                  value={Number.isNaN(Number(watch(field))) ? '' : String(watch(field) ?? '')}
                  onChange={(event) => {
                    touch(field);
                    setValue(field, event.target.value === '' ? Number.NaN : Number(event.target.value), {
                      shouldDirty: true,
                    });
                  }}
                />
                {errors[field] && (
                  <p id={`${field}-error`} className="text-destructive-emphasis text-xs font-bold">
                    {String(errors[field]?.message ?? '')}
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="space-y-1 pt-1">
            <Label htmlFor="prvtPstPlcyCd" className="text-xs font-medium text-foreground">
              비밀글 정책
            </Label>
            <select
              id="prvtPstPlcyCd"
              value={watch('prvtPstPlcyCd') ?? 'NONE'}
              aria-describedby="prvtPstPlcyCd-help"
              onChange={(event) => {
                touch('prvtPstPlcyCd');
                setValue('prvtPstPlcyCd', event.target.value as PrivatePostPolicy, { shouldDirty: true });
              }}
              className="h-[var(--control-h)] w-full rounded-md border border-input bg-card px-3 text-[length:var(--font-size-body)] sm:w-60"
            >
              {(Object.keys(PRIVATE_POST_POLICY_OPTIONS) as PrivatePostPolicy[]).map((policy) => (
                <option key={policy} value={policy}>
                  {PRIVATE_POST_POLICY_OPTIONS[policy]}
                </option>
              ))}
            </select>
            <p id="prvtPstPlcyCd-help" className="text-xs text-muted-foreground">
              비밀글은 작성자와 게시판 관리자만 봅니다. 필수면 저장하는 글이 모두 비밀글이 됩니다.
            </p>
          </div>
        </fieldset>
      </div>

      <div className="flex-1 lg:sticky lg:top-0">
        <div className="mb-2">
          <h3 className="text-xs font-medium text-muted-foreground lg:text-right">레이아웃 미리보기 · 예시 데이터</h3>
        </div>
        <BoardPreview
          tmpltId={selectedTemplate || DEFAULT_BOARD_TYPE.templateId}
          bbsTtl={bbsTtl}
          bbsExpln={bbsExpln || ''}
          features={previewFeatures}
        />
      </div>
    </div>
  );
}
