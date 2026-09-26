'use client';

import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { useToast } from '@/app/components/ui/toast';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { FormErrorSummary } from '@/components/ui/form';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { useDirtyCloseGuard } from '@/hooks/useDirtyCloseGuard';
import { addressbookUserService, type AddressBook } from '@/services/business/user/addressbook/AddressbookUserService';
import type { NameCard } from '@/types/business/addressbook';
import {
  addressBookMemberFormSchema,
  addressBookMemberValidationLabels,
  mapAddressBookMemberFieldErrors,
  toMemberRequest,
} from './address-book-form-validation';

type MemberForm = { nm: string; telNo: string; email: string };

const EMPTY_FORM: MemberForm = { nm: '', telNo: '', email: '' };

function formOf(member: NameCard | null): MemberForm {
  return member ? { nm: member.nm ?? '', telNo: member.mblTelno ?? '', email: member.emlAddr ?? '' } : EMPTY_FORM;
}

/**
 * 주소록 구성원 추가·수정 모달(2026-09-26 DIP B5 F8).
 *
 * <p>구성원은 서버가 {@code adbkMbrSn} 으로 가린다. 저장은 주소록 전체의 구성원 목록을 보내는 PUT 이라, 다른 구성원은
 * 조회한 값 그대로(번호·집 전화·사무실 전화·팩스 포함) 함께 보내고 이 구성원만 바꾼다 — 빠뜨리면 서버가 지운다.
 * 이 화면이 묻지 않는 집 전화·사무실 전화·팩스도 기존 값을 되돌려 보낸다(전체 치환에서 조용히 지워지지 않게).
 */
export function AddressBookMemberDialog({
  book,
  member,
  onClose,
  onSaved,
}: {
  book: AddressBook;
  /** 수정할 구성원. 없으면 새 구성원을 추가한다. */
  member: NameCard | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitPendingRef = useRef(false);
  const initial = formOf(member);
  const [form, setForm] = useState<MemberForm>(initial);
  const validation = useManualFormValidation(addressBookMemberFormSchema, {
    labels: addressBookMemberValidationLabels,
  });
  const dirty = form.nm !== initial.nm || form.telNo !== initial.telNo || form.email !== initial.email;
  const requestClose = useDirtyCloseGuard(dirty, onClose);
  const isEdit = member !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitPendingRef.current) return;
    const validated = validation.validate(form);
    if (!validated) return;

    submitPendingRef.current = true;
    setIsSubmitting(true);
    const changed = { nm: validated.nm, emlAddr: validated.email, mblTelno: validated.telNo };
    const others = (book.adbkMan ?? []).map(toMemberRequest);
    const adbkMan = isEdit
      ? (book.adbkMan ?? []).map((current) => (current.adbkMbrSn === member.adbkMbrSn
        ? { ...toMemberRequest(current), ...changed }
        : toMemberRequest(current)))
      : [...others, changed];
    try {
      await addressbookUserService.updateAddressBook(book.adbkSn, {
        adbkNm: book.adbkNm,
        rlsScopeCd: book.rlsScopeCd,
        adbkMan,
      });
      toast(isEdit ? '구성원 정보를 고쳤습니다.' : '구성원을 추가했습니다.', 'success');
      onSaved();
      onClose();
    } catch (error: unknown) {
      const fieldErrors = extractFieldErrors(error);
      if (fieldErrors) {
        validation.setFormErrors(mapAddressBookMemberFieldErrors(fieldErrors));
      } else {
        toast(extractErrorMessage(error, '구성원을 저장하지 못했습니다.'), 'error');
      }
    } finally {
      submitPendingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <StandardModal
      isOpen
      onClose={requestClose}
      title={isEdit ? '구성원 수정' : '구성원 추가'}
      maxWidth="lg"
      closeDisabled={isSubmitting}
    >
      <form id="address-book-member-form" onSubmit={handleSubmit} noValidate className="space-y-6">
        <FormErrorSummary
          errors={validation.errors}
          labels={addressBookMemberValidationLabels}
          onNavigate={validation.focusError}
        />

        <div className="space-y-2">
          <Label htmlFor="member-nm">
            성명 <span className="text-destructive-emphasis">*</span>
          </Label>
          <Input
            id="member-nm"
            {...validation.fieldProps('nm')}
            value={form.nm}
            onChange={(e) => {
              validation.clearError('nm');
              setForm({ ...form, nm: e.target.value });
            }}
            maxLength={100}
            required
            autoFocus
          />
          {validation.errors.nm ? (
            <p {...validation.messageProps('nm')} className="text-xs font-bold text-destructive-emphasis" />
          ) : null}
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="member-telNo">휴대전화</Label>
            <Input
              id="member-telNo"
              {...validation.fieldProps('telNo')}
              value={form.telNo}
              onChange={(e) => {
                validation.clearError('telNo');
                setForm({ ...form, telNo: e.target.value });
              }}
              placeholder="010-0000-0000"
              maxLength={15}
            />
            {validation.errors.telNo ? (
              <p {...validation.messageProps('telNo')} className="text-xs font-bold text-destructive-emphasis" />
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="member-email">이메일</Label>
            <Input
              id="member-email"
              type="email"
              {...validation.fieldProps('email')}
              value={form.email}
              onChange={(e) => {
                validation.clearError('email');
                setForm({ ...form, email: e.target.value });
              }}
              placeholder="name@example.com"
              maxLength={320}
            />
            {validation.errors.email ? (
              <p {...validation.messageProps('email')} className="text-xs font-bold text-destructive-emphasis" />
            ) : null}
          </div>
        </div>

        {/* 제출 버튼은 form 안에 둔다 — 폼 계약이 submit.closest('form') 으로 form 을 찾는다. */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={requestClose} disabled={isSubmitting}>
            취소
          </Button>
          <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting || undefined}>
            {isSubmitting ? '저장 중…' : isEdit ? '구성원 저장' : '구성원 추가'}
          </Button>
        </div>
      </form>
    </StandardModal>
  );
}
