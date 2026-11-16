'use client';

import { useQuery } from '@tanstack/react-query';
import { Download, Paperclip, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fileService } from '@/services/foundation/file/FileService';
import { useOptionalAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { useToast } from '@/app/components/ui/toast';
import { cn } from '@/lib/utils';

export interface AttachmentFileListProps {
  atchFileSn?: number | null;
  clearable?: boolean;
  cleared?: boolean;
  onToggleClear?: () => void;
  title?: string;
  className?: string;
}

export const attachmentFileListQueryKey = (atchFileSn: number) =>
  ['attachment-file-list', atchFileSn] as const;

function formatFileSize(bytes?: number): string {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentFileList({
  atchFileSn,
  clearable = false,
  cleared = false,
  onToggleClear,
  title = '첨부파일',
  className,
}: AttachmentFileListProps) {
  const user = useOptionalAuth()?.user;
  const canReadList = canPermission(user, 'FILE_READ');
  const canDownload = canPermission(user, 'FILE_DOWNLOAD');
  const toastApi = useToast();

  const enabled = typeof atchFileSn === 'number' && atchFileSn > 0;
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: attachmentFileListQueryKey(atchFileSn ?? 0),
    queryFn: ({ signal }) => fileService.getFileList(atchFileSn ?? 0, { signal, suppressErrorToast: true }),
    enabled: enabled && canReadList,
    retry: false,
  });

  if (!enabled) return null;

  const files = Array.isArray(data) ? data : [];
  if (canReadList && !clearable && !isLoading && !isError && files.length === 0) {
    return null;
  }

  const handleDownload = async (fileSn: number, fileName?: string) => {
    try {
      await fileService.downloadFile(atchFileSn, fileSn, fileName);
    } catch {
      const msg = '첨부파일을 내려받지 못했습니다.';
      if (typeof toastApi.error === 'function') {
        toastApi.error(msg);
      } else {
        toastApi.toast(msg, 'error');
      }
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-muted/20 p-3 space-y-2',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
          <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{title}</span>
          {canReadList && files.length > 0 && (
            <Badge variant="secondary" className="text-[11px] font-medium">
              {files.length}개
            </Badge>
          )}
        </div>
        {clearable && onToggleClear && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onToggleClear}
            className="px-2 text-xs"
          >
            {cleared ? (
              <>
                <RotateCcw className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                기존 첨부 유지
              </>
            ) : (
              <>
                <X className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                기존 첨부 제거
              </>
            )}
          </Button>
        )}
      </div>

      {!canReadList && (
        <p className="text-xs text-muted-foreground">
          {cleared
            ? '저장 시 기존 첨부가 연결 해제됩니다.'
            : '첨부파일 목록을 볼 수 있는 권한이 없습니다.'}
        </p>
      )}

      {canReadList && isLoading && (
        <p className="text-xs text-muted-foreground">첨부파일 목록을 불러오는 중입니다.</p>
      )}

      {canReadList && !isLoading && isError && (
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-destructive-emphasis">
            첨부파일 목록을 불러오지 못했습니다.
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            className="px-2 text-xs shrink-0"
          >
            다시 시도
          </Button>
        </div>
      )}

      {canReadList && !isLoading && !isError && files.length === 0 && clearable && (
        <p className="text-xs text-muted-foreground">
          {cleared
            ? '저장 시 기존 첨부가 연결 해제됩니다.'
            : '기존 첨부 묶음이 연결되어 있습니다.'}
        </p>
      )}

      {canReadList && files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((file) => {
            const sizeLabel = formatFileSize(file.fileMg);
            return (
              <li
                key={`${file.atchFileSn}-${file.fileSn}`}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs',
                  cleared && 'opacity-50 line-through',
                )}
              >
                <div className="min-w-0 flex-1 truncate font-medium text-foreground">
                  {file.orignlFileNm || `첨부파일 ${file.fileSn}`}
                  {sizeLabel && (
                    <span className="ml-2 font-normal text-muted-foreground">
                      ({sizeLabel})
                    </span>
                  )}
                </div>
                {canDownload && !cleared && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleDownload(file.fileSn, file.orignlFileNm)}
                    className="px-2 text-xs shrink-0"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                    내려받기
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canReadList && cleared && files.length > 0 && (
        <p className="text-xs text-muted-foreground">
          저장 시 기존 첨부가 연결 해제됩니다. 새 파일을 추가하면 새 첨부로 바뀝니다.
        </p>
      )}
    </div>
  );
}
