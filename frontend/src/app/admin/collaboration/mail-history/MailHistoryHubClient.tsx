'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCcw, RotateCw, Search, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PagePagination } from '@/components/common/PagePagination';
import { MasterDetailPage } from '@/app/components/patterns/master-detail-page';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { extractErrorMessage } from '@/app/actions/actionUtils';
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
  const resendRequestRef = useRef(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchField, setSearchField] = useState<'1' | '3'>('1');
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
    queryKey: ['mail-history', searchField, debouncedKeyword, page],
    queryFn: () => mailService.getSentMails({
      page: page - 1,
      size: PAGE_SIZE,
      searchKeyword: debouncedKeyword,
      // 백엔드 SentMailRepositoryImpl 계약상 '1'은 제목, '3'은 발신자 검색이다.
      searchCondition: searchField,
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

  /*
   * [2026-09-26 DIP B5 F7] 실패했거나 대기에 멈춘 본인 메일을 같은 이력으로 다시 보낸다. 가능 여부는 서버가 판정해
   * resendable 로 알린다. 다시 보내는 동안과 삭제하는 동안은 서로를 잠근다 — 지우는 중인 이력을 다시 보내지 않는다.
   */
  const resendMutation = useMutation({
    mutationFn: (emlDsptchSn: number) => mailService.resendMail(emlDsptchSn),
    onSuccess: () => {
      toast('메일을 다시 보냈습니다. 결과는 잠시 뒤 이 목록에 반영됩니다.', 'success');
      void queryClient.invalidateQueries({ queryKey: ['mail-history'] });
    },
    onError: (error) => {
      toast(extractErrorMessage(error, '메일을 다시 보내지 못했습니다.'), 'error');
      void queryClient.invalidateQueries({ queryKey: ['mail-history'] });
    },
  });

  const handleResend = useCallback(async (mail: SentMail) => {
    if (resendRequestRef.current || deleteRequestRef.current || resendMutation.isPending) return;
    resendRequestRef.current = true;
    try {
      await resendMutation.mutateAsync(mail.emlDsptchSn);
    } catch {
      // useMutation.onError 가 사용자 피드백을 소유한다.
    } finally {
      resendRequestRef.current = false;
    }
  }, [resendMutation]);

  const handleDelete = useCallback(async (mail: SentMail) => {
    if (deleteRequestRef.current || resendRequestRef.current || deleteMutation.isPending) return;
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

  const handleSearchFieldChange = (value: '1' | '3') => {
    setSearchField(value);
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
            placeholder={searchField === '3' ? '발신자 이름 검색' : '메일 제목 검색'}
          />
          {/* [2026-09-26 DIP V4] 발신자 칸에 이름이 저장되므로 발신자로도 찾는다. 이전 이력은 식별자가 남아 있어
              이름으로 찾아지지 않는다. */}
          <select
            aria-label="검색 대상"
            value={searchField}
            onChange={(event) => handleSearchFieldChange(event.target.value === '3' ? '3' : '1')}
            className="mt-2 h-[var(--control-h-sm)] rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="1">제목</option>
            <option value="3">발신자</option>
          </select>
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
                        {mail.dsptchPerson ? `${mail.dsptchPerson} · ` : ''}{mail.sndngDe}
                      </span>
                      {/* [2026-09-26 DIP B5 F7] 여러 명에게 보낸 메일은 수신자마다 이력이 한 줄씩 생긴다. 받는 사람을
                          보이지 않으면 같은 제목·발신자·시각의 줄이 구분되지 않는다. */}
                      <span className="mt-1 block break-all text-xs text-muted-foreground">
                        받는 사람 {mail.recptnPerson || '-'}
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
          {selectedMail.resendable ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label={`선택한 메일 ${selectedMail.sj} ${resendMutation.isPending ? '다시 보내기 중' : '다시 보내기'}`}
              aria-busy={resendMutation.isPending || undefined}
              disabled={resendMutation.isPending || deleteMutation.isPending}
              onClick={() => { void handleResend(selectedMail); }}
            >
              <RotateCw aria-hidden="true" />
              {resendMutation.isPending ? '다시 보내는 중…' : '다시 보내기'}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="destructive"
            size="sm"
            data-testid="mail-detail-delete-btn"
            aria-label={`선택한 메일 ${selectedMail.sj} 발송 이력 ${deleteMutation.isPending ? '삭제 중' : '삭제'}`}
            aria-busy={deleteMutation.isPending || undefined}
            disabled={deleteMutation.isPending || resendMutation.isPending}
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
              <dt className="text-xs font-medium text-muted-foreground">발신자</dt>
              <dd className="mt-1 break-all text-sm font-semibold text-foreground">
                {selectedMail.dsptchPerson || '-'}
              </dd>
            </div>
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
              {selectedMail.sndngResultCode !== MAIL_SEND_RESULT.SUCCESS && !selectedMail.resendable ? (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  다시 보내기는 보낸 사람 본인이, 실패했거나 10분 넘게 대기 중인 메일에만 할 수 있습니다.
                </p>
              ) : null}
            </div>
            <div className="rounded-md border border-border bg-muted/20 p-4">
              <dt className="text-xs font-medium text-muted-foreground">발신 이력 번호</dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                {selectedMail.emlDsptchSn}
              </dd>
            </div>
          </dl>

          {/*
            [DEC-OPS-022] 이 화면은 메일 본문·첨부를 표시하지 않는다.
            목록은 관리자에게 전 사용자의 발신 이력을 내려주는데(MailService#getSentMailList 는
            ADMIN/SYSTEM 이면 소유자 필터를 걸지 않는다), 같은 저장소가 발신 메일 첨부를
            `AttachmentSource.SENT_MAIL = PERSONAL` 로 분류해 **관리자의 열람을 명시적으로 거부**한다
            (FileAccessPolicy §5). 본문만 열면 첨부 정책이 지키는 프라이버시 경계를 옆으로 돌아가게 된다.
            본문이 필요하면 발신자 본인의 메일함에서 연다.
          */}
          <div className="rounded-md border border-border p-4">
            <p className="text-sm font-semibold text-foreground">본문 표시 안내</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              이 화면에서는 메일 본문과 첨부를 표시하지 않습니다. 발신 결과와 수신자만 확인할 수 있습니다.
            </p>
          </div>
        </div>
      ) : undefined}
      emptyDetailTitle="발신 이력을 선택하세요"
      emptyDetailDescription="왼쪽 목록에서 확인할 발신 이력을 선택하세요."
    />
  );
}
