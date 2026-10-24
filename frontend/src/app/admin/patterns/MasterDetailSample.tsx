'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { CmmnCodeDtoRequestSchema } from '@/types/generated-zod';
import { MasterDetailPage } from '@/app/components/patterns/master-detail-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormErrorSummary,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppForm } from '@/hooks/useAppForm';
import { cn } from '@/lib/utils';

/**
 * A2(마스터-디테일) + A3(편집 폼) 표본 — 상세 칸 안의 인라인 편집 폼.
 *
 * 정본 스펙: docs/02-architecture/work-screen-grammar-catalog.md §5 A2·A3, §A3-1(인라인 ≥ 모달 > 전용 페이지).
 * 데이터는 이 파일 안의 정적 표본이고 서버를 부르지 않는다. 저장은 표본 목록만 바꾸며, 그 사실을 저장 결과 문구로 밝힌다.
 * 이 화면이 보이는 것: 마스터 선택(`aria-current`·↑/↓), 필수 표시·필드 오류·첫 오류 포커스, 저장 결과 피드백,
 * 다른 항목으로 옮길 때의 미저장 경고, `Ctrl+S` 저장과 `Esc` 변경 취소.
 */

interface SampleCodeGroup {
  codeId: string;
  name: string;
  description: string;
  useYn: 'Y' | 'N';
}

const SAMPLE_GROUPS: SampleCodeGroup[] = [
  { codeId: 'COM001', name: '사용 여부', description: '화면 항목의 사용·미사용 구분', useYn: 'Y' },
  { codeId: 'COM002', name: '처리 상태', description: '요청의 대기·승인·반려·완료 상태', useYn: 'Y' },
  { codeId: 'COM003', name: '공개 범위', description: '전체·부서·본인 공개 구분', useYn: 'Y' },
  { codeId: 'COM004', name: '첨부 유형', description: '첨부 파일의 문서·이미지·기타 구분', useYn: 'N' },
  { codeId: 'COM005', name: '알림 채널', description: '쪽지·메일·문자 알림 경로', useYn: 'Y' },
  { codeId: 'COM006', name: '보존 기간', description: '기록물 보존 기간 구분', useYn: 'N' },
];

// 길이 상한은 공통코드 요청 계약(CmmnCodeDtoRequest)의 값이다 — 표본도 실제 화면과 같은 제약을 보인다.
const NAME_MAX = 100;
const DESCRIPTION_MAX = 4000;

const groupSchema = CmmnCodeDtoRequestSchema.pick({ cdIdNm: true, cdIdExpln: true, useYn: true }).extend({
  cdIdNm: z.string().trim().min(1, '이름을 입력하세요.').max(NAME_MAX, `이름은 ${NAME_MAX}자 이내로 입력하세요.`),
  cdIdExpln: z.string().trim().max(DESCRIPTION_MAX, `설명은 ${DESCRIPTION_MAX}자 이내로 입력하세요.`),
});

type GroupFormValues = z.infer<typeof groupSchema>;

const FORM_LABELS: Record<keyof GroupFormValues, string> = {
  cdIdNm: '이름',
  cdIdExpln: '설명',
  useYn: '사용 여부',
};

interface GroupEditFormProps {
  group: SampleCodeGroup;
  formRef: React.RefObject<HTMLFormElement | null>;
  onDirtyChange: (dirty: boolean) => void;
  onSave: (values: GroupFormValues) => void;
}

function GroupEditForm({ group, formRef, onDirtyChange, onSave }: GroupEditFormProps) {
  const form = useAppForm(groupSchema, {
    defaultValues: { cdIdNm: group.name, cdIdExpln: group.description, useYn: group.useYn },
  });
  const { isDirty } = form.formState;

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const submit = form.handleSubmit((values) => {
    onSave(values);
    form.reset(values);
  });

  return (
    <Form {...form}>
      {/* noValidate — 브라우저 기본 말풍선 대신 요약·인라인·첫 오류 포커스가 소유한다. */}
      <form
        ref={formRef}
        onSubmit={submit}
        noValidate
        onKeyDown={(event) => {
          if (event.key !== 'Escape' || event.defaultPrevented || !isDirty) return;
          // 선택 목록 같은 안쪽 팝업의 Esc 는 그 팝업을 닫는 키다 — 포털로 그려져도 React 이벤트는 폼까지 올라온다.
          if (event.target instanceof Element && event.target.closest('[role="listbox"], [role="menu"], [role="dialog"]')) return;
          event.preventDefault();
          form.reset();
        }}
        className="space-y-[var(--form-gap)]"
      >
        <FormErrorSummary labels={FORM_LABELS} onNavigate={form.focusError} />

        <div className="space-y-1">
          <p className="text-[length:var(--font-size-body)] font-medium text-foreground">코드</p>
          <p className="font-mono text-[length:var(--font-size-body)] text-muted-foreground">{group.codeId}</p>
        </div>

        <FormField
          control={form.control}
          name="cdIdNm"
          required
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel>이름</FormLabel>
              <FormControl>
                <Input {...field} maxLength={NAME_MAX} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cdIdExpln"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel>설명</FormLabel>
              <FormControl>
                <Input {...field} maxLength={DESCRIPTION_MAX} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="useYn"
          required
          render={({ field }) => (
            <FormItem className="space-y-1">
              <FormLabel>사용 여부</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Y">사용</SelectItem>
                  <SelectItem value="N">미사용</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-[var(--form-gap)]">
          <Button type="button" size="sm" variant="outline" disabled={!isDirty} onClick={() => form.reset()}>
            변경 취소
          </Button>
          <Button type="submit" size="sm">저장</Button>
        </div>
      </form>
    </Form>
  );
}

export default function MasterDetailSample() {
  const [groups, setGroups] = useState(SAMPLE_GROUPS);
  const [keyword, setKeyword] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const formRef = useRef<HTMLFormElement | null>(null);

  const visible = useMemo(() => {
    const needle = keyword.trim();
    return groups.filter((group) => needle === '' || group.name.includes(needle) || group.codeId.includes(needle));
  }, [groups, keyword]);
  const selected = groups.find((group) => group.codeId === selectedId) ?? null;

  const select = (codeId: string) => {
    if (codeId === selectedId) return;
    if (dirty) {
      setPendingId(codeId);
      return;
    }
    setSavedMessage('');
    setSelectedId(codeId);
  };

  // 변경을 취소해 폼이 깨끗해지면 옮기기 경고도 거둔다 — 버릴 변경이 없는데 '변경 버리고 이동' 을 묻지 않는다.
  const onDirtyChange = useCallback((next: boolean) => {
    setDirty(next);
    if (!next) setPendingId(null);
  }, []);

  const discardAndMove = () => {
    setDirty(false);
    setSavedMessage('');
    setSelectedId(pendingId);
    setPendingId(null);
  };

  const save = (values: GroupFormValues) => {
    setGroups((current) => current.map((group) => (
      group.codeId === selectedId
        ? { ...group, name: values.cdIdNm, description: values.cdIdExpln ?? '', useYn: values.useYn }
        : group
    )));
    setPendingId(null);
    setSavedMessage(`${values.cdIdNm} 그룹을 표본에 저장했습니다. 실제 데이터는 바뀌지 않습니다.`);
  };

  return (
    <MasterDetailPage
      title="코드 그룹 관리"
      headingLevel={2}
      showBreadcrumb={false}
      description="A2 마스터-디테일 + A3 인라인 편집 — 왼쪽에서 고르고 오른쪽 칸에서 고칩니다."
      masterTitle="코드 그룹"
      masterDescription={<span className="tabular-nums">{visible.length}개</span>}
      masterTools={(
        <KeywordFilter
          label="코드·이름"
          landmarkLabel="코드 그룹 조회 조건"
          value={keyword}
          onSearch={setKeyword}
          onReset={() => setKeyword('')}
        />
      )}
      master={visible.length === 0 ? (
        <p role="status" className="p-4 text-center text-[length:var(--font-size-body)] text-muted-foreground">
          {emptyResultMessage(keyword, '등록된 코드 그룹이 없습니다.')}
        </p>
      ) : (
        <ul className="space-y-1">
          {visible.map((group) => {
            const current = group.codeId === selectedId;
            return (
              <li key={group.codeId}>
                <button
                  type="button"
                  data-a2-master-item=""
                  aria-current={current ? 'true' : undefined}
                  onClick={() => select(group.codeId)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-[length:var(--font-size-body)] transition-colors focus-visible:outline-2 focus-visible:outline-ring',
                    current ? 'border-primary bg-primary/5 text-foreground' : 'border-transparent hover:bg-muted/60',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block font-mono text-muted-foreground">{group.codeId}</span>
                    <span className="block truncate font-medium text-foreground">{group.name}</span>
                  </span>
                  <StatusBadge status={group.useYn} labels={{ Y: '사용', N: '미사용' }} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      selectedItemLabel={selected ? `${selected.name} (${selected.codeId})` : undefined}
      detailDescription={selected ? '필수 항목은 표시로 구분합니다. Esc 는 변경 취소, Ctrl+S 는 저장입니다.' : undefined}
      detail={selected ? (
        <div className="space-y-[var(--form-gap)]">
          {pendingId && (
            <div role="alert" className="space-y-2 rounded-md border border-border bg-muted/40 p-3 text-[length:var(--font-size-body)]">
              <p className="text-foreground">저장하지 않은 변경이 있습니다. 다른 항목으로 옮기면 변경이 사라집니다.</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setPendingId(null)}>계속 편집</Button>
                <Button type="button" size="sm" variant="destructive" onClick={discardAndMove}>변경 버리고 이동</Button>
              </div>
            </div>
          )}
          {savedMessage && (
            <p role="status" className="text-[length:var(--font-size-body)] text-muted-foreground">{savedMessage}</p>
          )}
          <GroupEditForm
            key={selected.codeId}
            group={selected}
            formRef={formRef}
            onDirtyChange={onDirtyChange}
            onSave={save}
          />
        </div>
      ) : undefined}
      onSaveShortcut={() => formRef.current?.requestSubmit()}
    />
  );
}
