'use client';

import React, { useRef, useState } from 'react';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import {
  Send,
  ArrowLeft,
  User,
  Zap,
  Clock,
  Search,
  X,
  Plus,
  Mail,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/app/components/ui/toast';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { FormErrorSummary } from '@/components/ui/form';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { mailService } from '@/services/business/mail/MailService';
import { MailRecipientDtoSchema, SentMailDtoSchema } from '@/types/generated-zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { RecipientPicker, recipientKey, type RecipientSelection } from '@/app/components/ui/recipient-picker';

/**
 * 직접 입력 수신자 검증용. 서버가 이 값을 그대로 SMTP 수신 주소로 쓰므로, 주소 형태가 아닌 값은
 * 애초에 받지 않는다. 사람을 고르려면 '수신자 찾기'(사용자 검색·주소록)를 쓴다 — 그쪽은 esntlId 를 실어
 * 서버가 주소를 해석한다(DEC-OPS-035).
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 요청당 수신자 상한 — 백엔드 SentMailDto.recipients @Size(max = 100) 와 같다. 수신자마다 발송 이력 1건이 생긴다. */
const MAX_RECIPIENTS = 100;

/**
 * SentMail 물리 컬럼 계약: 제목 100자, 본문 4,000자. 수신자는 종전 `recptnPerson`(100자 문자열) 대신
 * `recipients[]` 로 보낸다 — 인원 제한이 컬럼 폭이 아니라 요청당 상한이 됐다(2026-09-05 DEC-OPS-035).
 */
export const mailSendSchema = SentMailDtoSchema.pick({
  sj: true,
  emailCn: true,
}).extend({
  recipients: z.array(MailRecipientDtoSchema)
    .min(1, '수신자를 선택해 주세요.')
    .max(MAX_RECIPIENTS, `수신자는 최대 ${MAX_RECIPIENTS}명까지 지정할 수 있습니다.`),
  sj: SentMailDtoSchema.shape.sj.unwrap()
    .trim()
    .min(1, '메일 제목을 입력해 주세요.')
    .max(100, '메일 제목은 최대 100자까지 입력할 수 있습니다.'),
  emailCn: SentMailDtoSchema.shape.emailCn.unwrap()
    .trim()
    .min(1, '메일 본문을 입력해 주세요.')
    .max(4000, '메일 본문은 최대 4000자까지 입력할 수 있습니다.'),
});

type MailSendValues = z.infer<typeof mailSendSchema>;

const mailValidationLabels: Record<keyof MailSendValues, string> = {
  recipients: '수신자',
  sj: '메일 제목',
  emailCn: '메일 본문',
};

/** 화면 선택(사용자·명함·직접 입력)을 발송 요청의 수신자 항목으로 옮긴다. 사용자는 esntlId 만, 나머지는 주소만 싣는다. */
function toRequestRecipient(recipient: RecipientSelection): z.infer<typeof MailRecipientDtoSchema> {
  return recipient.kind === 'user' ? { esntlId: recipient.esntlId } : { emlAddr: recipient.email };
}

export default function MailSendHubClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitPendingRef = useRef(false);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<RecipientSelection[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const [currentTime, setCurrentTime] = useState<string>('');

  React.useEffect(() => {
    setCurrentTime(new Date().toLocaleTimeString());
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [form, setForm] = useState({
    sj: '',
    emailCn: ''
  });
  const validation = useManualFormValidation(mailSendSchema, { labels: mailValidationLabels });

  /**
   * 수신자 추가.
   *
   * [2026-08-29] 이메일 주소만 받는다. 종전에는 아무 문자열이나 받아
   * `email: value.includes('@') ? value : ''` 로 두고, 발송 시
   * `recipient.email || recipient.id` 로 **원시 ID 를 그대로 실어 보냈다.**
   * 서버에는 ID → 이메일 변환 경로가 없다 — MailService 가 recptnPerson 을 손대지 않고
   * MailAsyncProcessor 가 `emailSender.send(..., recptnPerson)` 의 수신 주소로 그대로 쓴다.
   * 즉 'kim01' 을 넣으면 'kim01' 이라는 주소로 보내려다 실패하는데, 발송은 @Async 라
   * 화면에는 '발송 요청되었습니다' 만 남는다. 사용자는 갔다고 믿는다.
   *
   * 변환 경로가 생기면 그때 ID 입력을 되살린다.
   */
  /** 선택을 합친다 — 같은 사람·같은 주소(recipientKey)는 한 번만. */
  const mergeRecipients = (incoming: RecipientSelection[]) => {
    setSelectedRecipients((previous) => {
      const seen = new Set(previous.map(recipientKey));
      const merged = [...previous];
      for (const recipient of incoming) {
        const key = recipientKey(recipient);
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(recipient);
      }
      return merged;
    });
    validation.clearError('recipients');
  };

  const handleAddRecipient = () => {
    const value = recipientSearch.trim();
    if (!value) return;
    if (!EMAIL_PATTERN.test(value)) {
      validation.setFormErrors({ recipients: '이메일 주소 형식이 아닙니다. 이름으로 찾으려면 ‘수신자 찾기’를 누르세요.' });
      return;
    }
    mergeRecipients([{ kind: 'contact', name: value, email: value }]);
    setRecipientSearch('');
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitPendingRef.current) return;
    const validated = validation.validate({
      // [2026-09-05] 수신자는 recipients[] 로 보낸다 — 사용자는 esntlId 만 싣고 서버가 주소를 해석한다.
      //   종전(2026-08-29)의 "이메일이 아닌 값을 SMTP 주소로 싣던" 경로는 직접 입력이 주소 형식을 강제해 닫혀 있다.
      recipients: selectedRecipients.map(toRequestRecipient),
      sj: form.sj,
      emailCn: form.emailCn,
    });
    if (!validated) return;

    submitPendingRef.current = true;
    setIsSubmitting(true);
    try {
      await mailService.sendMail(validated);
      toast('메일이 발송 요청되었습니다.', 'success');
      router.push('/admin/collaboration/mail-history');
    } catch (error: unknown) {
      const fieldErrors = extractFieldErrors(error);
      if (fieldErrors) validation.setFormErrors(fieldErrors);
      else toast(extractErrorMessage(error, '메일 발송에 실패했습니다.'), 'error');
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
            <span className="text-xs font-bold tracking-tight text-primary leading-none px-3 py-1 bg-primary/5 rounded-lg border border-primary/10">통합 메일 시스템</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground tracking-tighter leading-none transition-colors">
            메일 <span className="text-primary">작성</span>
          </h1>
        </div>
      </div>

      <form onSubmit={handleSend} noValidate className="space-y-10 px-2">

        <FormErrorSummary
          errors={validation.errors}
          labels={mailValidationLabels}
          onNavigate={validation.focusError}
        />

        {/* 2. Recipient Selection */}
        <div className="hub-card-premium p-10 bg-card border-2 border-border shadow-2xl relative overflow-hidden group rounded-lg">
          <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-focus-within:opacity-10 transition-opacity">
            <User size={140} className="rotate-12 text-foreground" />
          </div>
          <div className="relative z-10 space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <Search size={20} />
                </div>
                <Label htmlFor="mail-recipient-search" className="text-xs font-bold tracking-tight text-muted-foreground">
                  수신자 선택 <span aria-hidden="true" className="text-destructive-emphasis">*</span>
                </Label>
              </div>
              <div className="flex items-center gap-3">
                {selectedRecipients.length > 0 && (
                  <Badge className="bg-emerald-500 text-white border-none font-bold text-xs px-3 py-1.5 rounded-lg tracking-tight animate-in zoom-in duration-300">
                    {selectedRecipients.length}명 선택됨
                  </Badge>
                )}
                <Button
                  type="button"
                  variant="outline"
                  data-testid="mail-recipient-picker-btn"
                  onClick={() => setIsPickerOpen(true)}
                  className="h-10 px-4 rounded-lg gap-2"
                >
                  <User size={16} aria-hidden="true" /> 수신자 찾기
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {selectedRecipients.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex flex-wrap gap-2 mb-4 p-4 bg-surface-inverse rounded-lg shadow-inner min-h-[60px] items-center"
                    >
                      {selectedRecipients.map((recipient) => {
                        const key = recipientKey(recipient);
                        const detail = recipient.kind === 'user'
                          ? (recipient.deptNm || '사용자')
                          : (recipient.email && recipient.email !== recipient.name ? recipient.email : null);
                        return (
                        <motion.div
                          key={key}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          data-testid="selected-recipient-badge"
                          data-recipient-kind={recipient.kind}
                          className="flex items-center gap-2 pl-3 pr-1.5 py-1.5 bg-white/10 hover:bg-white/20 text-surface-inverse-foreground rounded-lg border border-white/10 transition-colors group"
                        >
                          <span className="text-xs font-bold">{recipient.name}</span>
                          {detail && <span className="text-[10px] text-surface-inverse-foreground/70">{detail}</span>}
                          <button
                            type="button"
                            aria-label={`${recipient.name} 수신자 제외`}
                            onClick={() => {
                              validation.clearError('recipients');
                              setSelectedRecipients(prev => prev.filter((r) => recipientKey(r) !== key));
                            }}
                            className="w-5 h-5 rounded-md flex items-center justify-center hover:bg-rose-500 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </motion.div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-3">
                  <Input
                    id="mail-recipient-search"
                    {...validation.fieldProps('recipients')}
                    data-testid="mail-recipient-input"
                    placeholder="이메일 주소를 직접 입력하거나 ‘수신자 찾기’로 사용자·주소록에서 고르세요"
                    className="h-11 text-xl font-bold tracking-tight bg-muted border-none rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20 transition-all placeholder:text-muted-foreground"
                    value={recipientSearch}
                    onChange={(e) => {
                      validation.clearError('recipients');
                      setRecipientSearch(e.target.value);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleAddRecipient();
                      }
                    }}
                    maxLength={100}
                    required
                  />
                  <Button
                    type="button"
                    data-testid="mail-recipient-add-btn"
                    onClick={handleAddRecipient}
                    className="h-11 px-6 rounded-lg shrink-0"
                  >
                    <Plus size={16} className="mr-2" /> 추가
                  </Button>
                </div>
                {validation.errors.recipients ? (
                  <p {...validation.messageProps('recipients')} className="text-xs font-bold text-destructive-emphasis" />
                ) : null}
                <p className="text-xs text-muted-foreground font-medium">
                  사용자를 고르면 등록된 이메일로 발송됩니다(주소는 화면에 표시되지 않습니다). 수신자마다 발송 이력이 따로 남습니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        {isPickerOpen && (
          <RecipientPicker
            isOpen={isPickerOpen}
            channel="mail"
            onClose={() => setIsPickerOpen(false)}
            onConfirm={mergeRecipients}
          />
        )}

        {/* 3. Subject */}
        <div className="hub-card-premium p-10 bg-muted border-none shadow-2xl relative overflow-hidden group rounded-lg">
          <div className="absolute top-0 right-0 p-12 opacity-[0.05] pointer-events-none group-focus-within:opacity-10 transition-opacity">
            <Zap size={140} className="rotate-12 text-foreground" />
          </div>
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <Mail size={20} />
              </div>
              <Label htmlFor="mail-subject" className="text-xs font-bold tracking-tight text-muted-foreground">
                메일 제목 <span aria-hidden="true" className="text-destructive-emphasis">*</span>
              </Label>
            </div>
            <Input
              id="mail-subject"
              {...validation.fieldProps('sj')}
              data-testid="mail-subject-input"
              value={form.sj}
              onChange={(e) => {
                validation.clearError('sj');
                setForm({ ...form, sj: e.target.value });
              }}
              className="h-11 bg-transparent border-none text-foreground text-3xl font-bold placeholder:text-foreground/10 focus-visible:ring-0 p-0 tracking-tight"
              placeholder="제목을 입력하세요."
              maxLength={100}
              required
            />
            {validation.errors.sj ? (
              <p {...validation.messageProps('sj')} className="text-xs font-bold text-destructive-emphasis" />
            ) : null}
            <div className="h-[1px] w-full bg-gradient-to-r from-primary/40 to-transparent" />
          </div>
        </div>

        {/* 4. Content Area */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <Layers size={18} className="text-primary" />
              <Label htmlFor="mail-content" className="text-sm font-bold text-foreground tracking-tight transition-colors">
                메일 본문 <span aria-hidden="true" className="text-destructive-emphasis">*</span>
              </Label>
            </div>
          </div>
          <Textarea
            id="mail-content"
            {...validation.fieldProps('emailCn')}
            data-testid="mail-content-textarea"
            value={form.emailCn}
            onChange={(e) => {
              validation.clearError('emailCn');
              setForm({ ...form, emailCn: e.target.value });
            }}
            className="min-h-[300px] p-10 text-lg font-medium leading-relaxed bg-card border-2 border-border rounded-lg shadow-xl focus-visible:ring-primary/20 transition-all placeholder:text-muted-foreground"
            placeholder="전달할 상세 내용을 입력하세요."
            maxLength={4000}
            required
          />
          {validation.errors.emailCn ? (
            <p {...validation.messageProps('emailCn')} className="text-xs font-bold text-destructive-emphasis" />
          ) : null}
        </div>

        {/* 5. Bottom Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-8 pt-8 border-t border-border">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-muted-foreground tracking-tight leading-none">현재 시각</span>
            <span className="text-xs font-bold text-foreground mt-1 flex items-center gap-1.5">
              <Clock size={12} /> {currentTime || '--:--:--'}
            </span>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="h-11 flex-1 sm:flex-none px-10 rounded-lg border-2 font-bold tracking-tight text-xs hover:bg-muted transition-all bg-card"
            >
              취소
            </Button>
            <Button
              type="submit"
              data-testid="mail-send-btn"
              disabled={isSubmitting}
              className="h-11 flex-1 sm:flex-none px-12 rounded-lg bg-surface-inverse text-surface-inverse-foreground font-bold tracking-tight text-xs hover:scale-105 active:scale-95 transition-all shadow-2xl gap-3 group"
            >
              {isSubmitting ? (
                <span className="animate-pulse">발송 중...</span>
              ) : (
                <>
                  <Send size={18} className="group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform" /> 메일 발송
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
