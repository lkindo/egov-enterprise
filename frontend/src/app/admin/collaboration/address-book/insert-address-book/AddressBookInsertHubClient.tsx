'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User,
 Phone,
 Mail,
 ArrowLeft,
 Plus,
 Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/app/components/ui/toast';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { FormErrorSummary } from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { addressbookUserService } from '@/services/business/user/addressbook/AddressbookUserService';
import type { NameCard } from '@/types/business/addressbook';
import {
 addressBookCreateFormSchema,
 addressBookCreateValidationLabels,
 mapAddressBookCreateFieldErrors,
} from '../address-book-form-validation';

export default function AddressBookInsertHubClient() {
 const router = useRouter();
 const { toast } = useToast();
 const { user } = useAuth();
 const [isSubmitting, setIsSubmitting] = useState(false);
 const submitPendingRef = useRef(false);

 const [form, setForm] = useState({
 adbkNm: '',
 telNo: '',
 email: '',
 });
 const validation = useManualFormValidation(addressBookCreateFormSchema, {
 labels: addressBookCreateValidationLabels,
 });

 /**
  * 공개 범위는 서버 DTO 필수값(@NotBlank)이지만 코드값이 표준화돼 있지 않아 화면에 노출하지 않는다.
  * 작성자(wrterId)는 서버가 인증 주체에서 파생하므로 전송하지 않는다.
  */
 const DEFAULT_RLS_SCOPE_CD = 'G';

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
   nm: validated.adbkNm,
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
 router.push('/admin/collaboration/address-book/select-address-book-list');
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
 <div className="max-w-4xl mx-auto space-y-12 pb-24">
 {/* 1. Header Section */}
 <div className="flex items-center gap-8 px-2">
 <Button
 variant="outline"
 aria-label="이전 화면으로 이동"
 onClick={() => router.back()}
 className="w-16 h-11 rounded-lg border-2 group hover:bg-surface-inverse transition-all duration-500 shadow-xl active:scale-95 bg-card"
 >
 <ArrowLeft className="group-hover:text-surface-inverse-foreground group-hover:-translate-x-1 transition-all" />
 </Button>
 <div className="space-y-2">
 <div className="flex items-center gap-3">
 <span className="text-xs font-bold tracking-tight text-primary leading-none px-3 py-1 bg-primary/5 rounded-lg border border-primary/10">협업 · 주소록</span>
 </div>
 <h1 className="text-4xl font-bold text-foreground tracking-tighter leading-none transition-colors">
 주소록 <span className="text-primary">등록</span>
 </h1>
 </div>
 </div>

 <form onSubmit={handleSubmit} noValidate className="space-y-10 px-2">

 <FormErrorSummary
 errors={validation.errors}
 labels={addressBookCreateValidationLabels}
 onNavigate={validation.focusError}
 />

 {/* 2. 주소록 명칭 */}
 <div className="hub-card-premium p-10 bg-card border-2 border-border shadow-2xl relative overflow-hidden group rounded-lg">
 <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-focus-within:opacity-10 transition-opacity">
 <User size={140} className="rotate-12 text-foreground" />
 </div>
 <div className="relative z-10 space-y-8">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
 <Zap size={20} />
 </div>
 <Label htmlFor="adbkNm" className="text-xs font-bold tracking-tight text-muted-foreground">
 주소록 명칭 <span className="text-destructive-emphasis">*</span>
 </Label>
 </div>
    <Input
      id="adbkNm"
      {...validation.fieldProps('adbkNm')}
      value={form.adbkNm}
      onChange={(e) => {
        validation.clearError('adbkNm');
        setForm({ ...form, adbkNm: e.target.value });
      }}
      className="h-11 bg-transparent border-none text-foreground text-3xl font-bold placeholder:text-foreground/10 focus-visible:ring-0 p-0 tracking-tight"
      placeholder="주소록 명칭을 입력하세요."
      data-testid="identity-name-input"
      maxLength={100}
      required
      autoFocus
    />
 {validation.errors.adbkNm ? (
 <p {...validation.messageProps('adbkNm')} className="text-xs font-bold text-destructive-emphasis" />
 ) : null}
 <div className="h-[1px] w-full bg-gradient-to-r from-primary/40 to-transparent" />
 </div>
 </div>

 {/* 3. 연락 정보 */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 <div className="hub-card-premium p-8 bg-muted border-none shadow-xl rounded-lg space-y-6">
 <div className="flex items-center gap-3">
 <Phone className="text-primary" size={18} />
 <Label htmlFor="telNo" className="text-xs font-bold text-muted-foreground tracking-tight">전화번호</Label>
 </div>
    <Input
      id="telNo"
      {...validation.fieldProps('telNo')}
      value={form.telNo}
      onChange={(e) => {
        validation.clearError('telNo');
        setForm({ ...form, telNo: e.target.value });
      }}
      className="h-11 bg-card border-2 border-border rounded-lg text-lg shadow-inner focus:border-primary/20 transition-all"
      placeholder="010-0000-0000"
      data-testid="identity-tel-input"
      maxLength={15}
      inputMode="numeric"
      pattern="[0-9\s-]*"
    />
 {validation.errors.telNo ? (
 <p {...validation.messageProps('telNo')} className="text-xs font-bold text-destructive-emphasis" />
 ) : null}
 </div>
 <div className="hub-card-premium p-8 bg-muted border-none shadow-xl rounded-lg space-y-6">
 <div className="flex items-center gap-3">
 <Mail className="text-primary" size={18} />
 <Label htmlFor="email" className="text-xs font-bold text-muted-foreground tracking-tight">이메일</Label>
 </div>
    <Input
      id="email"
      {...validation.fieldProps('email')}
      type="email"
      value={form.email}
      onChange={(e) => {
        validation.clearError('email');
        setForm({ ...form, email: e.target.value });
      }}
      className="h-11 bg-card border-2 border-border rounded-lg text-lg shadow-inner focus:border-primary/20 transition-all"
      placeholder="example@egov.go.kr"
      data-testid="identity-email-input"
      maxLength={50}
    />
 {validation.errors.email ? (
 <p {...validation.messageProps('email')} className="text-xs font-bold text-destructive-emphasis" />
 ) : null}
 </div>
 </div>

 {/*
   [死코드 제거] 기존의 '거주 주소' 입력은 서버 DTO(AddressBookDto/AddressBookUserDto)에
   대응 필드가 없고 전송 payload 에도 포함되지 않아 입력해도 저장되지 않았다.
 */}

 {/* 4. Bottom Actions */}
 <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-8 border-t border-border">
 <Button
 type="button"
 variant="outline"
 data-testid="abort-identity-button"
 onClick={() => router.back()}
 className="h-11 w-full sm:w-auto px-10 rounded-lg border-2 font-bold tracking-tight text-xs hover:bg-muted transition-all bg-card"
 >
 취소
 </Button>
 <Button
 type="submit"
 disabled={isSubmitting}
 data-testid="commit-identity-button"
 className="h-11 w-full sm:w-auto px-12 rounded-lg bg-surface-inverse text-surface-inverse-foreground font-bold tracking-tight text-xs hover:scale-105 active:scale-95 transition-all shadow-2xl gap-3 group"
 >
 {isSubmitting ? (
 <span className="animate-pulse">등록 중...</span>
 ) : (
 <>
 <Plus size={18} className="group-hover:rotate-90 transition-transform" /> 주소록 등록
 </>
 )}
 </Button>
 </div>
 </form>
 </div>
 );
}
