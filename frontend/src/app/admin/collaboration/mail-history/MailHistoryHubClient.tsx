'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCcw, Search, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PagePagination } from '@/components/common/PagePagination';
import { MasterDetailPage } from '@/app/components/patterns/master-detail-page';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { mailService, type SentMail, MAIL_SEND_RESULT } from '@/services/business/mail/MailService';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

function sendResultBadge(code?: string) {
  switch (code) {
    case MAIL_SEND_RESULT.SUCCESS:
      return {
        label: '성공',
        className: 'border-success bg-success text-success-foreground',
      };
    case MAIL_SEND_RESULT.PENDING:
      return {
        label: '대기',
        className: 'border-warning bg-warning text-warning-foreground',
      };
    case MAIL_SEND_RESULT.FAILURE:
      return {
        label: '실패',
        className: 'border-destructive bg-destructive text-destructive-foreground',
      };
    default:
      return {
        label: '알 수 없음',
        className: 'border-border bg-muted text-muted-foreground',
      };
  }
}

function SendResultBadge({ code }: { code?: string }) {
  const badge = sendResultBadge(code);

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-xs font-semibold',
        badge.className,
      )}
    >
      {badge.label}
    </span>
  );
}

export default function MailHistoryHubClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mailButtonRefs = useRef(new Map<number, HTMLButtonElement>());
  const deleteRequestRef = useRef(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [selectedMailId, setSelectedMailId] = useState<number | null>(null);
  const debouncedKeyword = useDebouncedValue(searchKeyword, 300);

  const {
    data: mailData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['mail-history', debouncedKeyword, page],
    queryFn: () => mailService.getSentMails({
      page: page - 1,
      size: PAGE_SIZE,
      searchKeyword: debouncedKeyword,
      // 백엔드 SentMailRepositoryImpl 계약상 '1'은 제목 검색이다.
      searchCondition: '1',
    }),
  });

  const mails: SentMail[] = mailData?.list ?? [];
  const totalCount = mailData?.total ?? 0;
  const selectedMail = mails.find((mail) => mail.emlDsptchSn === selectedMailId) ?? null;
  const hasVisibleSelection = selectedMail !== null;
  const pageSuccess = mails.filter((mail) => mail.sndngResultCode === MAIL_SEND_RESULT.SUCCESS).length;
  const pagePending = mails.filter((mail) => mail.sndngResultCode === MAIL_SEND_RESULT.PENDING).length;
  const pageFailure = mails.filter((mail) => mail.sndngResultCode === MAIL_SEND_RESULT.FAILURE).length;

  const deleteMutation = useMutation({
    mutationFn: (emlDsptchSn: number) => mailService.deleteMail(emlDsptchSn),
    onSuccess: (_data, emlDsptchSn) => {
      toast('메일 이력이 삭제되었습니다.', 'success');
      setSelectedMailId((current) => (current === emlDsptchSn ? null : current));
      searchInputRef.current?.focus();
      void queryClient.invalidateQueries({ queryKey: ['mail-history'] });
    },
    onError: () => {
      toast('메일 삭제에 실패했습니다.', 'error');
    },
  });

  const handleDelete = useCallback(async (mail: SentMail) => {
    if (deleteRequestRef.current || deleteMutation.isPending) return;
    deleteRequestRef.current = true;
    try {
    const confirmed = await confirm({
      title: '메일 이력 삭제',
      message: `'${mail.sj}' 발송 이력을 삭제합니다. 삭제한 이력은 복구할 수 없습니다.`,
      confirmText: '삭제',
      variant: 'destructive',
    });

      if (!confirmed) return;
      await deleteMutation.mutateAsync(mail.emlDsptchSn);
    } catch {
      // useMutation.onError가 사용자 피드백을 소유한다. action boundary 밖으로 예외를 흘리지 않는다.
    } finally {
      deleteRequestRef.current = false;
    }
  }, [confirm, deleteMutation]);

  const handleSearchChange = (value: string) => {
    setSearchKeyword(value);
    setPage(1);
    setSelectedMailId(null);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    setSelectedMailId(null);
  };

  const closeDetail = () => {
    const currentId = selectedMailId;
    setSelectedMailId(null);
    if (currentId !== null) {
      mailButtonRefs.current.get(currentId)?.focus();
    }
  };

  const masterDescription = isError
    ? '발신 이력을 불러오지 못했습니다.'
    : `전체 ${totalCount.toLocaleString()}건 · 현재 페이지 성공 ${pageSuccess} · 대기 ${pagePending} · 실패 ${pageFailure}`;

  return (
    <MasterDetailPage
      title="메일 발신 이력 관리"
      description="발송 결과를 조회하고 선택한 메일의 전송 정보를 확인합니다."
      breadcrumbItems={[
        { label: '협업관리' },
        { label: '메시징' },
        { label: '발신 이력' },
      ]}
      actions={(
        <>
          <Button
            type="button"
            variant="outline"
            aria-label="발신 이력 새로고침"
            disabled={isFetching}
            onClick={() => { void refetch(); }}
          >
            <RefreshCcw aria-hidden="true" className={cn(isFetching && 'animate-spin')} />
            새로고침
          </Button>
          <Button
            type="button"
            onClick={() => router.push('/admin/collaboration/mail-send')}
          >
            <Plus aria-hidden="true" />
            신규 발송
          </Button>
        </>
      )}
      masterTitle="발신 이력"
      masterDescription={masterDescription}
      masterTools={(
        <div className="relative w-full min-w-52">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            ref={searchInputRef}
            aria-label="메일 검색"
            value={searchKeyword}
            onChange={(event) => handleSearchChange(event.target.value)}
            className="pl-9"
            placeholder="메일 제목 검색"
          />
        </div>
      )}
      master={(
        <div className="space-y-3">
          {isLoading ? (
            <div role="status" className="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              발신 이력을 불러오는 중입니다.
            </div>
          ) : isError ? (
            <div role="alert" className="space-y-3 rounded-md border border-destructive/30 bg-destructive/10 p-4">
              <p className="text-sm font-semibold text-destructive-emphasis">
                발신 이력을 불러오지 못했습니다.
              </p>
              <p className="text-xs text-muted-foreground">
                네트워크 상태를 확인한 뒤 다시 시도해 주세요.
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => { void refetch(); }}>
                다시 시도
              </Button>
            </div>
          ) : mails.length === 0 ? (
            <div role="status" className="rounded-md border border-dashed border-border p-6 text-center">
              <p className="text-sm font-semibold text-foreground">
                {debouncedKeyword ? '검색 결과가 없습니다.' : '발신 이력이 없습니다.'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {debouncedKeyword ? '메일 제목 검색어를 변경해 보세요.' : '메일을 발송하면 이곳에서 결과를 확인할 수 있습니다.'}
              </p>
            </div>
          ) : (
            <ul aria-label="메일 발신 이력 목록" className="space-y-2">
              {mails.map((mail, index) => {
                const isSelected = selectedMail?.emlDsptchSn === mail.emlDsptchSn;
                return (
                  <li key={mail.emlDsptchSn} data-testid="mail-item">
                    <button
                      ref={(node) => {
                        if (node) mailButtonRefs.current.set(mail.emlDsptchSn, node);
                        else mailButtonRefs.current.delete(mail.emlDsptchSn);
                      }}
                      type="button"
                      data-a2-master-item
                      aria-current={isSelected ? 'true' : undefined}
                      aria-label={`${mail.sj} 발신 이력 상세 열기`}
                      tabIndex={isSelected || (!hasVisibleSelection && index === 0) ? 0 : -1}
                      onClick={() => setSelectedMailId(mail.emlDsptchSn)}
                      className={cn(
                        'w-full rounded-md border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                        isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-background hover:border-primary/50 hover:bg-muted/40',
                      )}
                    >
                      <span className="flex min-w-0 items-start justify-between gap-3">
                        <span className="min-w-0 break-words text-sm font-semibold text-foreground">
                          {mail.sj}
                        </span>
                        <SendResultBadge code={mail.sndngResultCode} />
                      </span>
                      <span className="mt-2 block text-xs tabular-nums text-muted-foreground">
                        {mail.sndngDe}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {!isLoading && !isError && (
            <PagePagination
              total={totalCount}
              page={page}
              size={PAGE_SIZE}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      )}
      detailTitle="발신 상세"
      detailDescription={selectedMail ? '선택한 메일의 발송 정보입니다.' : undefined}
      detailActions={selectedMail ? (
        <>
          <Button type="button" variant="outline" size="sm" aria-label="상세 패널 닫기" onClick={closeDetail}>
            <X aria-hidden="true" />
            닫기
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            data-testid="mail-detail-delete-btn"
            aria-label={`선택한 메일 ${selectedMail.sj} 발송 이력 ${deleteMutation.isPending ? '삭제 중' : '삭제'}`}
            aria-busy={deleteMutation.isPending || undefined}
            disabled={deleteMutation.isPending}
            onClick={() => { void handleDelete(selectedMail); }}
          >
            <Trash2 aria-hidden="true" />
            {deleteMutation.isPending ? '삭제 중…' : '이력 삭제'}
          </Button>
        </>
      ) : undefined}
      detail={selectedMail ? (
        <div className="space-y-5">
          <h3 className="break-words text-base font-semibold text-foreground">
            {selectedMail.sj}
          </h3>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-muted/20 p-4">
              <dt className="text-xs font-medium text-muted-foreground">수신자</dt>
              <dd className="mt-1 break-all text-sm font-semibold text-foreground">
                {selectedMail.recptnPerson}
              </dd>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-4">
              <dt className="text-xs font-medium text-muted-foreground">발송 일시</dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                {selectedMail.sndngDe}
              </dd>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-4">
              <dt className="text-xs font-medium text-muted-foreground">발송 상태</dt>
              <dd className="mt-2">
                <SendResultBadge code={selectedMail.sndngResultCode} />
              </dd>
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-4">
              <dt className="text-xs font-medium text-muted-foreground">발신 이력 번호</dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                {selectedMail.emlDsptchSn}
              </dd>
            </div>
          </dl>

          <div className="rounded-md border border-border p-4">
            <p className="text-sm font-semibold text-foreground">본문 표시 안내</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              이 화면에서는 메일 본문을 표시하지 않습니다.
            </p>
          </div>
        </div>
      ) : undefined}
      emptyDetailTitle="발신 이력을 선택하세요"
      emptyDetailDescription="왼쪽 목록에서 확인할 발신 이력을 선택하세요."
    />
  );
}
