'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Send, UserPlus, X } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/app/components/ui/toast';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import { RecipientPicker, recipientKey, type RecipientSelection } from '@/app/components/ui/recipient-picker';
import { notificationAdminService } from '@/services/foundation/system/NotificationAdminService';
import { NotificationDispatchRequestRequestSchema } from '@/types/generated-zod';

const StandardModal = dynamic(
  () => import('@/app/components/ui/standard-modal').then((mod) => mod.StandardModal),
  { ssr: false, loading: () => null },
);

/** 요청당 수신자 상한 — 백엔드 NotificationDispatchRequest.MAX_RECIPIENTS 와 같다. */
export const MAX_DISPATCH_RECIPIENTS = 100;

/**
 * 발송 폼 계약. 서버 DTO(NotificationDispatchRequest)의 길이·필수(제목 100·내용 4000·링크 2000) 위에 안내 문구를
 * 얹는다. 수신자는 폼 입력이 아니라 피커 선택 상태라 제출 시점에 합쳐 보낸다.
 */
export const notificationDispatchSchema = NotificationDispatchRequestRequestSchema
  .pick({ notiTtlNm: true, notiCn: true, linkUrl: true })
  .extend({
    notiTtlNm: z.string().trim().min(1, '제목을 입력하세요.').max(100, '제목은 100자 이하여야 합니다.'),
    notiCn: z.string().trim().min(1, '내용을 입력하세요.').max(4000, '내용은 4000자 이하여야 합니다.'),
    linkUrl: z.string().trim().max(2000, '링크는 2000자 이하여야 합니다.').optional(),
  });

type NotificationDispatchFormValues = z.infer<typeof notificationDispatchSchema>;

const EMPTY_FORM: NotificationDispatchFormValues = { notiTtlNm: '', notiCn: '', linkUrl: '' };

const FIELD_LABELS = { notiTtlNm: '제목', notiCn: '내용', linkUrl: '링크' };

interface NotificationDispatchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 🔔 관리자 알림 발송 다이얼로그(2026-09-06 DEC-OPS-042, 감사 D09-05 후속).
 *
 * 종전 알림 센터의 '발송 미리보기' 는 "서버에는 어떤 내용도 저장하거나 전송하지 않습니다" 라고 스스로 밝히는 데모였고
 * DEC-OPS-038 이 걷었다. 이 다이얼로그는 실제 API(`/admin/notifications/dispatch`)를 부른다 — 수신자는 메일·문자와
 * 같은 공용 피커(사용자 검색 탭)로 고르고 esntlId 만 싣는다. 서버가 존재를 확인하며 하나라도 없으면 전체를 거부한다.
 */
export function NotificationDispatchDialog({ isOpen, onClose }: NotificationDispatchDialogProps) {
  const { toast } = useToast();
  const [recipients, setRecipients] = useState<RecipientSelection[]>([]);
  const [recipientError, setRecipientError] = useState<string | null>(null);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);

  const form = useAppForm(notificationDispatchSchema, { defaultValues: EMPTY_FORM });

  /** 선택을 합친다 — 같은 사람(recipientKey)은 한 번만. 앱 내 알림은 계정으로 가므로 사용자 선택만 받는다. */
  const mergeRecipients = (incoming: RecipientSelection[]) => {
    setRecipients((previous) => {
      const seen = new Set(previous.map(recipientKey));
      const merged = [...previous];
      for (const recipient of incoming) {
        if (recipient.kind !== 'user') continue;
        const key = recipientKey(recipient);
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(recipient);
      }
      return merged;
    });
    setRecipientError(null);
  };

  const removeRecipient = (key: string) => {
    setRecipients((previous) => previous.filter((recipient) => recipientKey(recipient) !== key));
  };

  const handleClose = () => {
    if (submitLock.current) return;
    onClose();
  };

  const onSubmit = async (values: NotificationDispatchFormValues) => {
    if (submitLock.current) return;
    if (recipients.length === 0) {
      setRecipientError('수신자를 한 명 이상 선택하세요.');
      return;
    }
    if (recipients.length > MAX_DISPATCH_RECIPIENTS) {
      setRecipientError(`수신자는 한 번에 ${MAX_DISPATCH_RECIPIENTS}명까지 보낼 수 있습니다.`);
      return;
    }
    submitLock.current = true;
    setSubmitting(true);
    try {
      const count = await notificationAdminService.dispatch({
        recipients: recipients.flatMap((recipient) => (recipient.kind === 'user' ? [{ esntlId: recipient.esntlId }] : [])),
        notiTtlNm: values.notiTtlNm,
        notiCn: values.notiCn,
        ...(values.linkUrl ? { linkUrl: values.linkUrl } : {}),
      });
      toast(`${count}명에게 알림을 보냈습니다.`, 'success');
      form.reset(EMPTY_FORM);
      setRecipients([]);
      onClose();
    } catch (error: unknown) {
      if (!form.applyServerErrors(error)) {
        toast(extractErrorMessage(error, '알림 발송에 실패했습니다.'), 'error');
      }
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  return (
    <StandardModal
      isOpen={isOpen}
      onClose={handleClose}
      title="알림 보내기"
      footer={
        <div className="flex w-full items-center gap-2">
          <Button type="button" variant="outline" className="h-11 flex-1" onClick={handleClose} disabled={submitting}>
            취소
          </Button>
          <Button
            type="submit"
            form="notification-dispatch-form"
            className="h-11 flex-[2] gap-2"
            disabled={submitting || form.formState.isSubmitting}
            aria-busy={submitting}
          >
            <Send size={16} aria-hidden="true" /> {submitting ? '보내는 중…' : `알림 보내기${recipients.length > 0 ? ` (${recipients.length}명)` : ''}`}
          </Button>
        </div>
      }
    >
      <div className="space-y-6 pt-2 text-left">
        <section aria-labelledby="notification-recipients-heading" className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 id="notification-recipients-heading" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              수신자 <span className="tabular-nums">{recipients.length}</span>명
            </h3>
            <Button type="button" size="sm" variant="outline" className="gap-2" onClick={() => setPickerOpen(true)} disabled={submitting}>
              <UserPlus size={14} aria-hidden="true" /> 수신자 찾기
            </Button>
          </div>
          {recipients.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
              아직 선택한 수신자가 없습니다. ‘수신자 찾기’ 로 사용자를 고르세요.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2" aria-label="선택된 수신자">
              {recipients.map((recipient) => {
                const key = recipientKey(recipient);
                return (
                  <li key={key} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-xs font-bold">
                    <span>{recipient.name}</span>
                    {recipient.kind === 'user' && recipient.deptNm && (
                      <span className="text-muted-foreground">· {recipient.deptNm}</span>
                    )}
                    <button
                      type="button"
                      aria-label={`${recipient.name} 수신자 제외`}
                      onClick={() => removeRecipient(key)}
                      disabled={submitting}
                      className="ml-1 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                    >
                      <X size={12} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {recipientError && (
            <p role="alert" className="text-xs font-bold text-destructive-emphasis">{recipientError}</p>
          )}
          <p className="text-xs text-muted-foreground">
            수신자가 하나라도 존재하지 않으면 서버가 전체 발송을 거부합니다(부분 발송 없음). 알림은 각 사용자의 알림함과 실시간 알림으로 전달됩니다.
          </p>
        </section>

        <Form {...form}>
          <form
            id="notification-dispatch-form"
            noValidate
            // 렌더 시점이 아니라 이벤트 시점에 handleSubmit 을 만든다 — onSubmit 이 읽는 동기 잠금 ref 를 렌더에서 읽지 않는다(react-hooks/refs).
            onSubmit={(event) => { void form.handleSubmit(onSubmit)(event); }}
            className="space-y-4"
            aria-label="알림 발송"
          >
            <FormErrorSummary labels={FIELD_LABELS} onNavigate={form.focusError} />
            <ShadcnFormField
              control={form.control}
              name="notiTtlNm"
              required
              render={({ field }) => (
                <FormItem>
                  <FormLabel>제목</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={100} placeholder="예: 9월 7일 시스템 점검 안내" className="h-11 rounded-lg" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ShadcnFormField
              control={form.control}
              name="notiCn"
              required
              render={({ field }) => (
                <FormItem>
                  <FormLabel>내용</FormLabel>
                  <FormControl>
                    <Textarea {...field} maxLength={4000} rows={5} placeholder="알림함에 표시될 내용" className="rounded-lg" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ShadcnFormField
              control={form.control}
              name="linkUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>링크 (선택)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} maxLength={2000} placeholder="/admin/... 형태의 앱 내 경로" className="h-11 rounded-lg" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </div>

      <RecipientPicker
        isOpen={isPickerOpen}
        onClose={() => setPickerOpen(false)}
        channel="notification"
        onConfirm={mergeRecipients}
        title="알림 수신자 찾기"
      />
    </StandardModal>
  );
}
