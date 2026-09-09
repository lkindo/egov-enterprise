'use client';

import { useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormErrorSummary } from '@/components/ui/form';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { useToast } from '@/app/components/ui/toast';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { UserSelfProfileUpdateRequestSchema } from '@/types/generated-zod';
import type { components } from '@/types/generated-api';

type SelfProfileUpdate = components['schemas']['UserSelfProfileUpdateRequest'];

/** 서버가 이 경계에서 받는 선택 필드. `userNm` 은 필수라 항상 따로 싣는다. */
const OPTIONAL_KEYS = [
  'emplNo',
  'ofcpsNm',
  'emlAddr',
  'mblTelno',
  'officeTelno',
  'areaNo',
  'middleTelno',
  'endTelno',
  'faxNo',
  'zip',
  'homeAddr',
  'daddr',
] as const;

type OptionalKey = (typeof OPTIONAL_KEYS)[number];
type FormValues = { userNm: string } & Record<OptionalKey, string>;

const LABELS: Record<keyof FormValues, string> = {
  userNm: '이름',
  emplNo: '사번',
  ofcpsNm: '직위',
  emlAddr: '이메일',
  mblTelno: '휴대전화',
  officeTelno: '사무실 전화',
  areaNo: '자택 전화 지역번호',
  middleTelno: '자택 전화 국번',
  endTelno: '자택 전화 종번',
  faxNo: '팩스',
  zip: '우편번호',
  homeAddr: '주소',
  daddr: '상세주소',
};

/**
 * 내 프로필 수정 스키마 — 백엔드 SSOT(`UserSelfProfileUpdateRequest`)를 확장한다.
 *
 * <p>생성 스키마의 `userNm` 은 정규식 하나뿐이라 빈 값도 형식 오류로만 알려 준다. 빈 값을 먼저
 * 가려내고 그 뒤 같은 정규식(생성 스키마의 것을 그대로 재사용한다 — 복제하지 않는다)으로 형식을
 * 본다. 순서를 뒤집으면 이름을 지운 사용자에게 "형식이 올바르지 않습니다" 만 보인다.
 */
export const profileEditSchema = UserSelfProfileUpdateRequestSchema.extend({
  userNm: z
    .string()
    .min(1, '이름을 입력해 주세요.')
    .superRefine((value, ctx) => {
      if (!UserSelfProfileUpdateRequestSchema.shape.userNm.safeParse(value).success) {
        ctx.addIssue({ code: 'custom', message: '이름은 2~50자의 한글·영문·숫자만 사용할 수 있습니다.' });
      }
    }),
});

export interface ProfileEditFormProps {
  /** 서버가 내려준 현재 값. 여기 없는 필드는 서버에서 null(미설정)이다. */
  initialValues: Partial<FormValues>;
  /** 서버 호출은 부모가 소유한다. 실패는 그대로 throw 해야 이 폼이 필드 오류·안내를 처리한다. */
  onSubmit: (patch: SelfProfileUpdate) => Promise<void>;
  onCancel: () => void;
  /** 이 폼의 저장이 진행 중 */
  isPending?: boolean;
}

function toFormValues(initial: Partial<FormValues>): FormValues {
  const values = { userNm: initial.userNm ?? '' } as FormValues;
  for (const key of OPTIONAL_KEYS) values[key] = initial[key] ?? '';
  return values;
}

/**
 * 내 프로필 수정.
 *
 * <p>[2026-09-08] 서버는 `PUT /api/v1/users/me` 와 `userService.updateMe` 를 갖췄는데
 * <b>호출부가 0건</b>이었다(operation-consumer-census 축 2 실측). 사용자는 전화번호 한 칸을
 * 고치려 해도 관리자에게 부탁하는 길밖에 없었다.
 *
 * <p><b>⚠ 바꾼 필드만 보낸다.</b> `UserService.updateUser` 는 <code>null = 보내지 않음</code>으로
 * 보아 기존 값을 유지하고 <code>""</code> 는 '지움' 으로 반영하는 <b>부분 수정</b> 계약이다
 * (2026-08-12 결함 수정 — 관리자 폼이 12필드를 null 로 덮어써 주소·연락처가 통째로 날아가던 것을
 * 막은 규칙). 전 필드를 늘 실어 보내면 서버가 응답에서 생략한 null 필드가 전부 ""(지움)로
 * 바뀌므로, 여기서는 <b>초기값과 달라진 필드만</b> 싣는다. 설문 수정(DEC-OPS-058)이 전체 치환
 * 계약이라 왕복이 필요했던 것과 정확히 반대다 — 같은 저장소 안에서도 계약이 다르다.
 *
 * <p>소속 그룹·부서·기관은 이 경계가 역직렬화하지 않는다(`UserSelfProfileUpdateRequest` 의
 * `@JsonIgnoreProperties`) — 관리자 소유 필드라 폼에도 두지 않고 그 사실을 화면이 말한다.
 */
export function ProfileEditForm({ initialValues, onSubmit, onCancel, isPending = false }: ProfileEditFormProps) {
  const { toast } = useToast();
  const initial = useMemo(() => toFormValues(initialValues), [initialValues]);
  const [values, setValues] = useState<FormValues>(initial);
  const submitPendingRef = useRef(false);
  const [isSubmitPending, setSubmitPending] = useState(false);

  const validation = useManualFormValidation(profileEditSchema, {
    labels: LABELS,
    // 13필드라 ref 를 13개 두는 대신 렌더가 부여한 id 로 찾는다 — 포커스 이동은 제출 이후
    // 이벤트 시점이라 그때 DOM 이 이미 있다.
    focusTargets: Object.fromEntries(
      (Object.keys(LABELS) as (keyof FormValues)[]).map((key) => [
        key,
        () => document.getElementById(`account-profile-${key}`) as HTMLInputElement | null,
      ]),
    ),
  });

  const isBusy = isPending || isSubmitPending;

  const setValue = (key: keyof FormValues, value: string) => {
    validation.clearError(key);
    setValues((previous) => ({ ...previous, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitPendingRef.current || isBusy) return;

    const validated = validation.validate(values);
    if (!validated) return;

    // 이름은 서버 필수(@NotBlank)라 늘 싣고, 나머지는 초기값과 달라진 것만 싣는다.
    const patch: SelfProfileUpdate = { userNm: validated.userNm };
    for (const key of OPTIONAL_KEYS) {
      if (values[key] !== initial[key]) patch[key] = values[key];
    }

    submitPendingRef.current = true;
    setSubmitPending(true);
    try {
      await onSubmit(patch);
    } catch (error: unknown) {
      const fieldErrors = extractFieldErrors(error);
      if (fieldErrors) validation.setFormErrors(fieldErrors);
      else toast(extractErrorMessage(error, '내 정보를 저장하지 못했습니다. 입력한 내용은 유지됩니다.'), 'error');
    } finally {
      submitPendingRef.current = false;
      setSubmitPending(false);
    }
  };

  const renderField = (key: keyof FormValues, options?: { type?: string; maxLength?: number; autoComplete?: string }) => (
    <div className="space-y-2">
      <label htmlFor={`account-profile-${key}`} className="text-sm font-semibold text-foreground">
        {LABELS[key]}
        {key === 'userNm' ? <span className="ml-1 text-destructive-emphasis">*</span> : null}
      </label>
      <Input
        {...validation.fieldProps(key)}
        id={`account-profile-${key}`}
        type={options?.type ?? 'text'}
        maxLength={options?.maxLength}
        autoComplete={options?.autoComplete}
        value={values[key]}
        onChange={(event) => setValue(key, event.target.value)}
        disabled={isBusy}
      />
      {validation.errors[key] ? (
        <p {...validation.messageProps(key)} className="text-xs font-bold text-destructive-emphasis" />
      ) : null}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-label="내 정보 수정 폼">
      <FormErrorSummary errors={validation.errors} labels={LABELS} onNavigate={validation.focusError} />

      <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        소속 그룹·부서·기관과 권한은 관리자가 관리합니다. 비운 칸은 저장 시 지워집니다.
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {renderField('userNm', { maxLength: 50, autoComplete: 'name' })}
        {renderField('emplNo', { maxLength: 20 })}
        {renderField('ofcpsNm', { maxLength: 300 })}
        {renderField('emlAddr', { type: 'email', maxLength: 50, autoComplete: 'email' })}
        {renderField('mblTelno', { maxLength: 11, autoComplete: 'tel' })}
        {renderField('officeTelno', { maxLength: 20 })}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-foreground">자택 전화</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          {renderField('areaNo', { maxLength: 4 })}
          {renderField('middleTelno', { maxLength: 4 })}
          {renderField('endTelno', { maxLength: 4 })}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        {renderField('faxNo', { maxLength: 11 })}
        {renderField('zip', { maxLength: 5, autoComplete: 'postal-code' })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {renderField('homeAddr', { maxLength: 200, autoComplete: 'street-address' })}
        {renderField('daddr', { maxLength: 200 })}
      </div>

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={isBusy}>
          취소
        </Button>
        <Button type="submit" className="flex-[2]" disabled={isBusy} aria-busy={isBusy || undefined}>
          {isBusy ? '저장 중…' : '저장'}
        </Button>
      </div>
    </form>
  );
}
