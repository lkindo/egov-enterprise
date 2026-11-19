'use client';

import { Button } from '@/components/ui/button';
import { MemoReportInfo } from '@/services/business/memoreport/memoReportService';

export type MemoReportAttachment = NonNullable<MemoReportInfo['attachments']>[number];

interface MemoReportInstructionNoticeProps {
  attachmentRestriction: string | null;
  instructionRecovery: 'conflict' | 'review' | null;
  latestError: string | null;
  detailError: unknown;
  canInstruct: boolean;
  hasInstructionSnapshot: boolean;
  isLoadingLatest: boolean;
  isSavingInstruction: boolean;
  onReloadLatest: () => void;
  onConfirmReviewed: () => void;
}

export function MemoReportInstructionNotice({
  attachmentRestriction,
  instructionRecovery,
  latestError,
  detailError,
  canInstruct,
  hasInstructionSnapshot,
  isLoadingLatest,
  isSavingInstruction,
  onReloadLatest,
  onConfirmReviewed,
}: MemoReportInstructionNoticeProps) {
  if (!(attachmentRestriction || instructionRecovery || latestError || detailError || (canInstruct && !hasInstructionSnapshot))) {
    return null;
  }

  return (
    <div role={latestError ? 'alert' : 'status'} aria-label="메모 보고 재확인 안내" className="space-y-3 rounded-md border border-border bg-muted p-4 text-sm">
      <p>
        {attachmentRestriction || latestError || (instructionRecovery === 'review'
          ? '최신 본문과 첨부를 불러왔습니다. 내용을 확인한 다음 지시사항을 별도로 저장해 주세요.'
          : instructionRecovery === 'conflict'
            ? '본문이나 첨부가 변경되어 지시사항을 저장하지 않았습니다. 작성 중인 지시는 유지됩니다. 최신 내용을 불러와 다시 확인해 주세요.'
            : '보고의 본문과 첨부를 확인할 수 없어 지시사항을 저장할 수 없습니다. 최신 내용을 다시 불러와 주세요.')}
      </p>
      {!attachmentRestriction && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={isLoadingLatest || isSavingInstruction} aria-busy={isLoadingLatest || undefined} onClick={onReloadLatest}>
            최신 내용 불러오기
          </Button>
          {instructionRecovery === 'review' && (
            <Button type="button" size="sm" disabled={!hasInstructionSnapshot || isLoadingLatest || !!detailError || !!latestError || !canInstruct} onClick={onConfirmReviewed}>
              내용을 확인했습니다
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function MemoReportDetailMetadata({ detail }: { detail: MemoReportInfo }) {
  return (
    <dl className="grid gap-3 rounded-md bg-muted p-4 sm:grid-cols-2">
      <div>
        <dt className="text-xs text-muted-foreground">작성자</dt>
        <dd className="mt-1 text-sm font-semibold text-foreground">{detail?.wrterNm || detail?.userId || '-'}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">수신자</dt>
        <dd className="mt-1 text-sm font-semibold text-foreground">{detail?.rptrNm || detail?.rptrId || '-'}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">보고 일자</dt>
        <dd className="mt-1 text-sm font-semibold text-foreground tabular-nums">{detail?.memoRptYmd || '-'}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">열람 기록</dt>
        <dd className="mt-1 text-sm font-semibold text-foreground tabular-nums">
          {detail?.rptrInqDt ? String(detail.rptrInqDt).replace('T', ' ').slice(0, 16) : '없음'}
        </dd>
      </div>
    </dl>
  );
}

interface MemoReportAttachmentsSectionProps {
  detail: MemoReportInfo;
  canDownloadAttachments: boolean;
  downloadingFile: string | null;
  onDownloadAttachment: (file: MemoReportAttachment) => void;
}

export function MemoReportAttachmentsSection({
  detail,
  canDownloadAttachments,
  downloadingFile,
  onDownloadAttachment,
}: MemoReportAttachmentsSectionProps) {
  return (
    <section aria-labelledby="memo-report-attachments-heading" className="space-y-2">
      <h3 id="memo-report-attachments-heading" className="text-sm font-bold text-foreground">첨부파일</h3>
      {detail.attachments == null ? (
        <p className="text-sm text-muted-foreground">첨부 정보를 확인할 수 없습니다.</p>
      ) : detail.attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">첨부파일이 없습니다.</p>
      ) : (
        <>
          <ul className="space-y-2">
            {detail.attachments.map((file, index) => {
              const name = file.orignlFileNm || '첨부파일';
              const key = `${file.atchFileSn}:${file.fileSn}`;
              return (
                <li key={`${key}:${index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium">{name}</p>
                    <p className="text-xs text-muted-foreground">{file.fileExtsn || '형식 정보 없음'} · {file.fileMg == null ? '크기 정보 없음' : `${file.fileMg.toLocaleString('ko-KR')} bytes`}</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" aria-label={`${name} 다운로드`} aria-busy={downloadingFile === key || undefined}
                    disabled={!canDownloadAttachments || downloadingFile !== null || file.atchFileSn == null || file.fileSn == null}
                    onClick={() => onDownloadAttachment(file)}>
                    {downloadingFile === key ? '내려받는 중…' : '다운로드'}
                  </Button>
                </li>
              );
            })}
          </ul>
          {!canDownloadAttachments && <p className="text-xs text-muted-foreground">첨부파일 다운로드 권한이 없습니다.</p>}
        </>
      )}
    </section>
  );
}
