'use client';

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { useToast } from '@/app/components/ui/toast';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { FormErrorSummary } from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { useDirtyCloseGuard } from '@/hooks/useDirtyCloseGuard';
import { addressbookUserService } from '@/services/business/user/addressbook/AddressbookUserService';
import type { NameCard } from '@/types/business/addressbook';
import {
  addressBookCreateFormSchema,
  addressBookCreateValidationLabels,
  mapAddressBookCreateFieldErrors,
} from './address-book-form-validation';

const EMPTY_FORM = { adbkNm: '', nm: '', telNo: '', email: '' };

/**
 * 주소록 등록 모달 — 업무 화면 문법 §A3-1 의 기본 그릇.
 *
 * <p>종전에는 `/admin/collaboration/address-book/insert-address-book` 전용 페이지였다. 그 화면은
 * 리치 텍스트·첨부·마법사·공유 URL·대형 구조물 어느 조건도 충족하지 않아 페이지가 정당화되지 않았고,
 * **목록 맥락이 전손됐다** — 목록의 `pageNo`·`searchWrd`·`pageUnit` 이 전부 `useState` 이고 URL 에
 * 실리지 않으므로(목록 `page.tsx` 가 producer 0건을 근거로 query 읽기를 의도적으로 걷어냈다),
 * 등록하러 떠났다 돌아오면 1페이지·빈 검색어로 리셋됐다. 모달은 그 맥락을 잃지 않는다.
 *
 * <p>⚠ 미저장 보호는 페이지의 전유물이 아니다(§A3-1). 닫기 경로 **전부**(Esc·배경·X·취소)에
 * {@link useDirtyCloseGuard} 를 걸고, 저장 중 닫기는 `StandardModal` 의 `closeDisabled` 가 막는다.
 * 종전 전용 페이지에는 미저장 가드가 아예 없었으므로 이 이행은 보호를 **늘린다**.
 */
export function AddressBookCreateDialog({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitPendingRef = useRef(false);

  const [form, setForm] = useState(EMPTY_FORM);
  const validation = useManualFormValidation(addressBookCreateFormSchema, {
    labels: addressBookCreateValidationLabels,
  });

  /**
   * 공개 범위는 서버 DTO 필수값(@NotBlank)이지만 코드값이 표준화돼 있지 않아 화면에 노출하지 않는다.
   * 작성자(wrterId)는 서버가 인증 주체에서 파생하므로 전송하지 않는다.
   */
  const DEFAULT_RLS_SCOPE_CD = 'G';

  const dirty = Object.values(form).some((value) => value.trim() !== '');

  const closeAndReset = () => {
    setForm(EMPTY_FORM);
    validation.setFormErrors({}, false);
    onClose();
  };
  const requestClose = useDirtyCloseGuard(dirty, closeAndReset);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitPendingRef.current) return;
    const validated = validation.validate({
      ...form,
      rlsScopeCd: DEFAULT_RLS_SCOPE_CD,
      userId: user?.id ?? '',
    });
    if (!validated) return;

    submitPendingRef.current = true;
    setIsSubmitting(true);
    // 주소록·회원 일련번호는 서버가 채번하므로 생성 요청에서 생략한다.
    const member: NameCard = {
      userId: validated.userId,
      // [2026-08-28] 종전에는 주소록 명칭을 성명으로 복제했다 — '영업팀 연락처' 주소록을 만들면
      //   구성원 이름도 '영업팀 연락처' 가 되어, 상세 표의 '성명' 열이 사람 이름이 아니었다.
      nm: validated.nm,
      emlAddr: validated.email,
      mblTelno: validated.telNo,
    };

    try {
      await addressbookUserService.createAddressBook({
        adbkNm: validated.adbkNm,
        rlsScopeCd: validated.rlsScopeCd,
        adbkMan: [member],
      });
      toast('주소록이 등록되었습니다.', 'success');
      setForm(EMPTY_FORM);
      validation.setFormErrors({}, false);
      onClose();
      onCreated();
    } catch (error: unknown) {
      const fieldErrors = extractFieldErrors(error);
      if (fieldErrors) {
        validation.setFormErrors(mapAddressBookCreateFieldErrors(fieldErrors));
      } else {
        toast(extractErrorMessage(error, '주소록 등록에 실패했습니다.'), 'error');
      }
    } finally {
      submitPendingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <StandardModal
      isOpen={isOpen}
      onClose={requestClose}
      title="주소록 등록"
      maxWidth="2xl"
      closeDisabled={isSubmitting}
    >
      <form id="address-book-create-form" onSubmit={handleSubmit} noValidate className="space-y-6">
        <FormErrorSummary
          errors={validation.errors}
          labels={addressBookCreateValidationLabels}
          onNavigate={validation.focusError}
        />

        <div className="space-y-2">
          <Label htmlFor="adbkNm">
            주소록 명칭 <span className="text-destructive-emphasis">*</span>
          </Label>
          <Input
            id="adbkNm"
            {...validation.fieldProps('adbkNm')}
            value={form.adbkNm}
            onChange={(e) => {
              validation.clearError('adbkNm');
              setForm({ ...form, adbkNm: e.target.value });
            }}
            placeholder="주소록 명칭을 입력하세요."
            data-testid="identity-name-input"
            maxLength={200}
            required
            autoFocus
          />
          {validation.errors.adbkNm ? (
            <p {...validation.messageProps('adbkNm')} className="text-xs font-bold text-destructive-emphasis" />
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="nm">
            구성원 성명 <span className="text-destructive-emphasis">*</span>
          </Label>
          <Input
            id="nm"
            {...validation.fieldProps('nm')}
            value={form.nm}
            onChange={(e) => {
              validation.clearError('nm');
              setForm({ ...form, nm: e.target.value });
            }}
            placeholder="성명을 입력하세요."
            data-testid="identity-member-name-input"
            maxLength={100}
            required
          />
          {validation.errors.nm ? (
            <p {...validation.messageProps('nm')} className="text-xs font-bold text-destructive-emphasis" />
          ) : null}
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="telNo">전화번호</Label>
            <Input
              id="telNo"
              {...validation.fieldProps('telNo')}
              value={form.telNo}
              onChange={(e) => {
                validation.clearError('telNo');
                setForm({ ...form, telNo: e.target.value });
              }}
              placeholder="010-0000-0000"
              data-testid="identity-tel-input"
              maxLength={15}
            />
            {validation.errors.telNo ? (
              <p {...validation.messageProps('telNo')} className="text-xs font-bold text-destructive-emphasis" />
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              {...validation.fieldProps('email')}
              value={form.email}
              onChange={(e) => {
                validation.clearError('email');
                setForm({ ...form, email: e.target.value });
              }}
              placeholder="name@example.com"
              data-testid="identity-email-input"
              maxLength={50}
            />
            {validation.errors.email ? (
              <p {...validation.messageProps('email')} className="text-xs font-bold text-destructive-emphasis" />
            ) : null}
          </div>
        </div>

        {/* 제출 버튼은 form **안**에 둔다 — 폼 계약이 `submit.closest('form')` 으로 form 을 찾는다. */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            data-testid="abort-identity-button"
            onClick={requestClose}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button
            type="submit"
            data-testid="commit-identity-button"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? '등록 중…' : '주소록 등록'}
          </Button>
        </div>
      </form>
    </StandardModal>
  );
}
