'use client';

import { useRef, useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { useToast } from '@/app/components/ui/toast';
import { extractFieldErrors } from '@/app/actions/actionUtils';
import { FormErrorSummary } from '@/components/ui/form';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { useDirtyCloseGuard } from '@/hooks/useDirtyCloseGuard';
import { createPoll, pollUserService } from '@/services/business/user/poll/PollUserService';
import type { OnlinePollManageVO } from '@/types/business/poll';
import { toStorageYmd } from '@/lib/format-date';
import { pollFormSchema } from './poll-form-validation';

/** 오류 요약 라벨 — 종전 등록·수정 화면과 같은 문구를 쓴다. */
const pollValidationLabels = {
  pollNm: '설문명',
  pollBgngYmd: '시작일',
  pollEndYmd: '종료일',
  pollKndCd: '설문 유형',
  pollDsuseYn: '진행 상태',
};

export interface SurveyFormInitialValues {
  pollNm: string;
  pollKndCd: string;
  pollDsuseYn: string;
  beginDate?: Date;
  endDate?: Date;
}

/**
 * 설문(온라인 투표) 등록·수정 모달 — 업무 화면 문법 §A3-1 의 기본 그릇.
 *
 * <p>종전에는 등록이 `/admin/survey/manage/create` 전용 페이지였고, 수정은 상세 라우트의 인라인 폼이었다.
 * 등록 화면은 입력 4개(설문명·시작일·종료일·유형)뿐이고 응답 선택지는 소스에 고정돼 있어 리치 텍스트·첨부·
 * 마법사·공유 URL·대형 구조물 어느 조건도 충족하지 않았다. 목록의 조회 상태(page·pageSize·검색어)는
 * `useState` 이고 URL 에 실리지 않으므로 라우트를 떠나면 전손된다.
 *
 * <p>상세 라우트는 **남긴다** — 항목별 득표('응답 선택지')라는 열람 표면이 있기 때문이다(§A3-1: 한 라우트가
 * 열람과 입력을 겸하면 열람을 라우트에 남기고 입력 컨트롤만 모달로 올린다).
 */
export function SurveyFormDialog({
  isOpen,
  mode,
  pollSn,
  initialValues,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  mode: 'create' | 'edit';
  pollSn?: number;
  initialValues?: SurveyFormInitialValues;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { success, error: toastError } = useToast();
  const isEdit = mode === 'edit';

  const [formData, setFormData] = useState<OnlinePollManageVO>({
    pollNm: initialValues?.pollNm ?? '',
    pollBgngYmd: '',
    pollEndYmd: '',
    pollKndCd: initialValues?.pollKndCd ?? '001',
    pollDsuseYn: initialValues?.pollDsuseYn ?? 'N',
  });
  const [beginDate, setBeginDate] = useState<Date | undefined>(initialValues?.beginDate);
  const [endDate, setEndDate] = useState<Date | undefined>(initialValues?.endDate);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);
  const validation = useManualFormValidation(pollFormSchema, { labels: pollValidationLabels });

  const dirty = formData.pollNm !== (initialValues?.pollNm ?? '')
    || formData.pollKndCd !== (initialValues?.pollKndCd ?? '001')
    || formData.pollDsuseYn !== (initialValues?.pollDsuseYn ?? 'N')
    || beginDate?.getTime() !== initialValues?.beginDate?.getTime()
    || endDate?.getTime() !== initialValues?.endDate?.getTime();

  const closeAndReset = () => {
    validation.setFormErrors({}, false);
    onClose();
  };
  const requestClose = useDirtyCloseGuard(dirty, closeAndReset);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;
    // 저장 포맷은 'yyyyMMdd' 8자다 — 컬럼 varchar(8)/DTO @Size(max = 8) 이라 10자는 100% 400 이다.
    const validated = validation.validate({
      ...formData,
      pollBgngYmd: beginDate ? toStorageYmd(beginDate) : '',
      pollEndYmd: endDate ? toStorageYmd(endDate) : '',
    });
    if (!validated) return;

    savingRef.current = true;
    setIsSaving(true);
    try {
      if (isEdit) {
        if (pollSn === undefined) throw new Error('설문 일련번호를 확인할 수 없습니다.');
        await pollUserService.updatePoll({ ...formData, ...validated, pollSn });
        success('설문 정보를 저장했습니다.');
      } else {
        // 응답 선택지는 등록 시점에 고정 4종으로 만든다(종전 전용 페이지와 같은 값).
        const payload = {
          ...formData,
          ...validated,
          pollArticles: [
            { pollArtclNm: '매우 만족' },
            { pollArtclNm: '만족' },
            { pollArtclNm: '보통' },
            { pollArtclNm: '불만족' },
          ],
        };
        await createPoll(payload);
        success('설문이 등록되었습니다.');
      }
      validation.setFormErrors({}, false);
      onClose();
      onSaved();
    } catch (error) {
      const fieldErrors = extractFieldErrors(error);
      if (fieldErrors) validation.setFormErrors(fieldErrors);
      else {
        toastError(isEdit
          ? '설문 저장에 실패했습니다. 입력 내용은 유지됩니다.'
          : '설문을 등록하지 못했습니다. 입력 내용은 유지됩니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const datePicker = (
    label: string,
    value: Date | undefined,
    onSelect: (next: Date | undefined) => void,
    field: 'pollBgngYmd' | 'pollEndYmd',
    testId: string,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={field}>
        {label} <span className="text-destructive-emphasis">*</span>
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={field}
            type="button"
            variant="outline"
            data-testid={testId}
            {...validation.fieldProps(field)}
            className="w-full justify-start gap-2 font-normal"
          >
            <CalendarIcon className="h-4 w-4" aria-hidden="true" />
            {value ? format(value, 'yyyy-MM-dd', { locale: ko }) : '날짜 선택'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(next) => {
              validation.clearError(field);
              onSelect(next);
            }}
            locale={ko}
          />
        </PopoverContent>
      </Popover>
      {validation.errors[field] ? (
        <p {...validation.messageProps(field)} className="text-xs font-bold text-destructive-emphasis" />
      ) : null}
    </div>
  );

  return (
    <StandardModal
      isOpen={isOpen}
      onClose={requestClose}
      title={isEdit ? '설문 수정' : '설문 등록'}
      maxWidth="2xl"
      closeDisabled={isSaving}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <FormErrorSummary
          errors={validation.errors}
          labels={pollValidationLabels}
          onNavigate={(name) => { validation.focusError(name); }}
        />

        {/* maxLength 100 — 서버가 그 길이에서 조용히 자른다(OnlinePollService#updatePoll). */}
        <div className="space-y-2">
          <Label htmlFor="pollNm">설문명 (필수)</Label>
          <Input
            id="pollNm"
            {...validation.fieldProps('pollNm')}
            value={formData.pollNm}
            onChange={(e) => {
              validation.clearError('pollNm');
              setFormData({ ...formData, pollNm: e.target.value });
            }}
            placeholder="설문 제목을 입력하세요."
            data-testid="poll-name-input"
            maxLength={100}
            required
            autoFocus
          />
          {validation.errors.pollNm ? (
            <p {...validation.messageProps('pollNm')} className="text-xs font-bold text-destructive-emphasis" />
          ) : null}
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {datePicker('시작일', beginDate, setBeginDate, 'pollBgngYmd', 'poll-begin-date')}
          {datePicker('종료일', endDate, setEndDate, 'pollEndYmd', 'poll-end-date')}
        </div>

        {/*
          설문 유형은 종전 전용 등록 페이지가 갖고 있던 컨트롤이다(SurveyManageCreateClient).
          모달 이행에서 빠지면서 새 설문이 전부 001(일반 설문)로 굳었다 — 되돌린다.
        */}
        <div className="space-y-2">
          <Label htmlFor="poll-knd-cd">설문 유형</Label>
          <Select
            value={formData.pollKndCd}
            onValueChange={(value) => {
              validation.clearError('pollKndCd');
              setFormData({ ...formData, pollKndCd: value });
            }}
          >
            <SelectTrigger
              id="poll-knd-cd"
              {...validation.fieldProps('pollKndCd')}
              data-testid="poll-knd-cd-trigger"
            >
              <SelectValue placeholder="유형 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="001">일반 설문</SelectItem>
              <SelectItem value="002">투표</SelectItem>
            </SelectContent>
          </Select>
          {validation.errors.pollKndCd ? (
            <p {...validation.messageProps('pollKndCd')} className="text-xs font-bold text-destructive-emphasis" />
          ) : null}
        </div>

        {/*
          진행 상태는 **수정에서만** 묻는다 — 새로 만드는 설문을 폐기 상태로 두는 것은 의미가 없고,
          종전 등록 페이지에도 이 컨트롤이 없었다.
          ⚠ 이 값이 이 모달에 없으면 안 된다 — updatePoll 은 전체 치환이라, 다른 이유로 수정하는 순간
          폐기된 설문이 조용히 다시 열린다. 서버는 이 값을 실제로 집행한다(OnlinePollService#vote).
        */}
        {isEdit ? (
          <div className="space-y-2">
            <Label htmlFor="poll-dsuse-yn">진행 상태</Label>
            <Select
              value={formData.pollDsuseYn}
              onValueChange={(value) => {
                validation.clearError('pollDsuseYn');
                setFormData({ ...formData, pollDsuseYn: value });
              }}
            >
              <SelectTrigger
                id="poll-dsuse-yn"
                {...validation.fieldProps('pollDsuseYn')}
                data-testid="poll-dsuse-yn-trigger"
              >
                <SelectValue placeholder="상태 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="N">진행 중</SelectItem>
                <SelectItem value="Y">폐기(투표 중지)</SelectItem>
              </SelectContent>
            </Select>
            <p className="px-1 text-xs text-muted-foreground">
              폐기하면 새 투표를 받지 않습니다. 이미 모인 결과는 그대로 남고 언제든 되돌릴 수 있습니다.
            </p>
            {validation.errors.pollDsuseYn ? (
              <p {...validation.messageProps('pollDsuseYn')} className="text-xs font-bold text-destructive-emphasis" />
            ) : null}
          </div>
        ) : null}

        {/*
          등록 시점에 선택지가 무엇으로 굳는지 **미리** 말한다. 나중에 바꿀 수 없기 때문이다 —
          updatePoll 은 항목을 clear-and-recreate 하는데 tb_onln_poll_rslt → tb_onln_poll_artcl 외래키가
          NO ACTION(V2_67) 이라 투표가 한 건이라도 있으면 저장이 실패한다.
        */}
        {isEdit ? null : (
          <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
            응답 선택지가 매우 만족·만족·보통·불만족으로 고정된 설문을 등록합니다.
          </p>
        )}

        {/* 제출 버튼은 form **안**에 둔다 — 폼 계약이 `submit.closest('form')` 으로 form 을 찾는다. */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={requestClose} disabled={isSaving}>
            취소
          </Button>
          <Button type="submit" data-testid="poll-submit-button" disabled={isSaving} aria-busy={isSaving}>
            {isSaving ? '저장 중…' : isEdit ? '설문 수정' : '설문 등록'}
          </Button>
        </div>
      </form>
    </StandardModal>
  );
}
