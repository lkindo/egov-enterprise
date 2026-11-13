'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/app/components/ui/toast';
import { fileService } from '@/services/foundation/file/FileService';

/**
 * 결재 문서·차수의 첨부 목록(V2_151). 내려받기는 일반 첨부 경로(fileService)라 열람 권한은 서버가 본문 상세와 같은 조건으로 판정한다 —
 * 기안자, 그 차수 결재선(원결재자·대리결재자), 참조자, 지금 유효한 대리결재자. 여기서는 지우지 않는다: 결재에 붙은 첨부는 하나씩 지울 수
 * 없고(위변조 방지), 반려·회수 뒤 재상신에서 새로 올린 묶음으로 바꾼다.
 *
 * <p>목록 조회 실패는 이 칸이 스스로 알린다(전역 알림을 띄우지 않는다). 권한 없음·없음·연결 실패를 구분해 보이지 않는다 — 구분하면
 * 첨부의 존재가 드러난다(CmsFileList 와 같은 원칙).
 */
export const approvalAttachmentQueryKey = (atchFileSn: number) => ['approvals', 'attachments', atchFileSn] as const;

/** 같은 묶음은 바뀌지 않는다(재상신은 새 묶음 번호다) — 다시 그려도 다시 읽지 않는다. */
const ATTACHMENT_STALE_MS = 10 * 60 * 1000;

function formatFileSize(bytes: number | undefined): string {
  if (!bytes || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toLocaleString('ko-KR', { maximumFractionDigits: unit === 0 ? 0 : 1 })} ${units[unit]}`;
}

export function ApprovalAttachmentList({ atchFileSn, label = '첨부 파일' }: { atchFileSn?: number | null; label?: string }) {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState<number | null>(null);
  const files = useQuery({
    queryKey: approvalAttachmentQueryKey(atchFileSn ?? 0),
    queryFn: ({ signal }) => fileService.getFileList(atchFileSn as number, { signal, suppressErrorToast: true }),
    enabled: typeof atchFileSn === 'number' && atchFileSn > 0,
    staleTime: ATTACHMENT_STALE_MS,
    retry: false,
    throwOnError: false,
  });
  if (typeof atchFileSn !== 'number' || atchFileSn <= 0) return null;

  const download = async (fileSn: number, name: string) => {
    if (downloading !== null) return;
    setDownloading(fileSn);
    try {
      await fileService.downloadFile(atchFileSn, fileSn, name);
    } catch {
      toast(`'${name}' 파일을 내려받지 못했습니다. 잠시 후 다시 시도해 주세요.`, 'error');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <section aria-label={label} className="space-y-2 rounded-md border border-border p-4">
      <h3 className="text-[length:var(--font-size-body)] font-semibold text-foreground">{label}</h3>
      {files.isPending ? (
        <p role="status" className="text-sm text-muted-foreground">첨부 파일을 불러오는 중입니다.</p>
      ) : files.isError ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <p className="text-muted-foreground">첨부 파일을 불러오지 못했습니다.</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void files.refetch()}>
            <RefreshCw aria-hidden="true" />
            <span className="sr-only">{label}</span>{' '}다시 시도
          </Button>
        </div>
      ) : (files.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">첨부 파일이 없습니다.</p>
      ) : (
        <ul className="grid min-w-0 gap-2">
          {(files.data ?? []).map(file => {
            const name = file.orignlFileNm || `첨부 ${file.fileSn}`;
            const meta = [file.fileExtsn?.toUpperCase(), formatFileSize(file.fileMg)].filter(Boolean).join(' · ');
            return (
              <li key={file.fileSn} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2">
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block break-words text-sm font-medium text-foreground">{name}</span>
                    {meta && <span className="block text-xs text-muted-foreground">{meta}</span>}
                  </span>
                </span>
                <Button type="button" variant="outline" size="sm" disabled={downloading !== null}
                  onClick={() => void download(file.fileSn, name)}>
                  <Download aria-hidden="true" />
                  {/* 보이는 글자를 이름에 그대로 담고 어느 파일인지를 앞에 붙인다(보이는 이름과 접근 이름이 어긋나지 않게). */}
                  <span className="sr-only">{name}</span>{' '}{downloading === file.fileSn ? '내려받는 중…' : '내려받기'}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
