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
import { AddressBookConflictNotice, isAddressBookConflict } from './AddressBookConflictNotice';
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
  const [snapshot, setSnapshot] = useState(book);
  const [hasConflict, setHasConflict] = useState(false);
  const [latest, setLatest] = useState<AddressBook | null>(null);
  const [isReloading, setIsReloading] = useState(false);
  const reloadPendingRef = useRef(false);
  const [reloadError, setReloadError] = useState<string | null>(null);
  const currentMember = member ? snapshot.adbkMan?.find((item) => item.adbkMbrSn === member.adbkMbrSn) ?? member : null;
  const initial = formOf(currentMember);
  const [form, setForm] = useState<MemberForm>(initial);
  const validation = useManualFormValidation(addressBookMemberFormSchema, {
    labels: addressBookMemberValidationLabels,
  });
  const dirty = form.nm !== initial.nm || form.telNo !== initial.telNo || form.email !== initial.email;
  const requestClose = useDirtyCloseGuard(dirty, onClose);
  const isEdit = member !== null;
  const latestMember = member ? latest?.adbkMan?.find((item) => item.adbkMbrSn === member.adbkMbrSn) : undefined;

  const reloadLatest = async () => {
    if (reloadPendingRef.current) return;
    reloadPendingRef.current = true;
    setIsReloading(true);
    setLatest(null);
    setReloadError(null);
    try {
      setLatest(await addressbookUserService.getAddressBook(book.adbkSn));
    } catch (error: unknown) {
      setReloadError(extractErrorMessage(error, '최신 내용을 불러오지 못했습니다. 다시 확인해 주세요.'));
    } finally {
      reloadPendingRef.current = false;
      setIsReloading(false);
    }
  };

  const reapplyChanges = () => {
    if (!latest?.editToken || (isEdit && !latestMember)) return;
    // 최신 구성원의 값에 사용자가 바꾼 필드만 얹는다. 수정하지 않은 연락처는 최신 값을 보존한다.
    const serverForm = formOf(latestMember ?? null);
    setForm(isEdit ? {
      nm: form.nm !== initial.nm ? form.nm : serverForm.nm,
      telNo: form.telNo !== initial.telNo ? form.telNo : serverForm.telNo,
      email: form.email !== initial.email ? form.email : serverForm.email,
    } : form);
    setSnapshot(latest);
    setHasConflict(false);
    setLatest(null);
    toast('내 변경을 최신 내용에 반영했습니다. 확인 후 저장해 주세요.', 'info');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitPendingRef.current || hasConflict) return;
    const validated = validation.validate(form);
    if (!validated) return;
    if (!snapshot.editToken) {
      toast('주소록의 최신 내용을 다시 불러온 뒤 저장해 주세요.', 'error');
      return;
    }

    submitPendingRef.current = true;
    setIsSubmitting(true);
    const changed = { nm: validated.nm, emlAddr: validated.email, mblTelno: validated.telNo };
    const others = (snapshot.adbkMan ?? []).map(toMemberRequest);
    const adbkMan = isEdit
      ? (snapshot.adbkMan ?? []).map((current) => (current.adbkMbrSn === member.adbkMbrSn
        ? { ...toMemberRequest(current), ...changed }
        : toMemberRequest(current)))
      : [...others, changed];
    try {
      await addressbookUserService.updateAddressBook(book.adbkSn, {
        adbkNm: snapshot.adbkNm,
        rlsScopeCd: snapshot.rlsScopeCd,
        adbkMan,
        editToken: snapshot.editToken,
      });
      toast(isEdit ? '구성원 정보를 고쳤습니다.' : '구성원을 추가했습니다.', 'success');
      onSaved();
      onClose();
    } catch (error: unknown) {
      if (isAddressBookConflict(error)) {
        setHasConflict(true);
        setLatest(null);
        setReloadError(null);
        return;
      }
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

        {hasConflict ? (
          <AddressBookConflictNotice
            isReloading={isReloading}
            hasLatest={latest !== null}
            reloadError={reloadError}
            canReapply={!!latest?.editToken && (!isEdit || !!latestMember)}
            onReload={() => { void reloadLatest(); }}
            onDiscard={() => { onSaved(); onClose(); }}
            onReapply={reapplyChanges}
          >
            <div className="space-y-2 text-sm text-foreground">
              <p>최신 주소록: {latest?.adbkNm}</p>
              {isEdit && !latestMember ? <p>이 구성원은 삭제되었습니다. 편집 내용을 다시 반영할 수 없습니다.</p> : (
                <>
                  <p>서버 성명: {latestMember?.nm || (isEdit ? '-' : '새 구성원')}</p>
                  <p>서버 휴대전화: {latestMember?.mblTelno || '-'}</p>
                  <p>서버 이메일: {latestMember?.emlAddr || '-'}</p>
                  <p>내 입력: {form.nm || '-'} / {form.telNo || '-'} / {form.email || '-'}</p>
                </>
              )}
              <p>최신 구성원 {latest?.adbkMan?.length ?? 0}명은 함께 보존합니다.</p>
              <p>최신 구성원: {(latest?.adbkMan ?? []).map((item) => item.nm || '이름 없음').join(', ') || '없음'}</p>
            </div>
          </AddressBookConflictNotice>
        ) : null}

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
          <Button type="submit" disabled={isSubmitting || hasConflict} aria-busy={isSubmitting || undefined}>
            {isSubmitting ? '저장 중…' : isEdit ? '구성원 저장' : '구성원 추가'}
          </Button>
        </div>
      </form>
    </StandardModal>
  );
}
