'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/app/components/ui/toast';
import { fileService } from '@/services/foundation/file/FileService';
import type { CmsFileItem } from '@/lib/cms/document';

/**
 * 콘텐츠 페이지의 내려받기 파일 칸(ADR-0042). 항목마다 운영자가 붙인 이름, 형식·크기, 내려받기 단추를 보인다.
 *
 * <p>형식·크기는 첨부 목록 조회로 읽는다 — 문서에는 첨부 번호와 이름만 있다. 내려받기는 기존 첨부 경로(fileService)를 그대로 쓰므로
 * 열람 권한·감사는 서버가 첨부마다 같게 판정한다. 목록 조회 실패는 이 칸이 스스로 알리고(전역 알림을 띄우지 않는다), 권한 없음·
 * 없음·연결 실패를 구분해 보이지 않는다 — 구분하면 첨부의 존재가 드러난다(AttachmentImage 와 같은 원칙).
 */

/** 같은 화면에서 다시 그려도 다시 읽지 않는다. 파일이 바뀌면 첨부 번호가 바뀌므로 오래 둬도 낡지 않는다. */
const FILE_INFO_STALE_MS = 10 * 60 * 1000;

const cmsFileInfoQueryKey = (atchFileSn: number) => ['cms', 'file-info', atchFileSn] as const;

/** 바이트 크기를 읽기 쉬운 단위로 쓴다. 모르면 빈 문자열(형식만 보인다). */
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

function CmsFileRow({ item }: { item: CmsFileItem }) {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const info = useQuery({
    queryKey: cmsFileInfoQueryKey(item.atchFileSn),
    queryFn: ({ signal }) => fileService.getFileList(item.atchFileSn, { signal, suppressErrorToast: true }),
    staleTime: FILE_INFO_STALE_MS,
    retry: false,
    // 파일 하나의 실패가 페이지 전체를 오류 화면으로 바꾸지 않는다 — 이 줄이 알린다.
    throwOnError: false,
  });
  const file = info.data?.[0];
  const name = item.title.trim() || file?.orignlFileNm || '내려받기 파일';
  const size = formatFileSize(file?.fileMg);
  const meta = file ? [file.fileExtsn?.toUpperCase(), size].filter(Boolean).join(' · ') : '';

  const download = async () => {
    if (!file || downloading) return;
    setDownloading(true);
    try {
      await fileService.downloadFile(file.atchFileSn, file.fileSn, file.orignlFileNm);
    } catch {
      toast(`'${name}' 파일을 내려받지 못했습니다. 잠시 후 다시 시도해 주세요.`, 'error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3">
      <span className="flex min-w-0 flex-1 items-center gap-3">
        <FileText aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
        <span className="min-w-0">
          <span className="block break-words font-medium text-foreground">{name}</span>
          <span className="block text-sm text-muted-foreground">
            {info.isPending ? '파일 정보를 불러오는 중…'
              : info.isError ? '파일을 불러오지 못했습니다.'
              : file ? meta || '형식 정보 없음'
              : '파일을 찾을 수 없습니다.'}
          </span>
        </span>
      </span>
      {info.isError ? (
        <Button type="button" variant="outline" size="sm" onClick={() => void info.refetch()}>
          <RefreshCw aria-hidden="true" />
          <span className="sr-only">{name} 파일 정보 </span>다시 시도
        </Button>
      ) : file ? (
        <Button type="button" variant="outline" size="sm" onClick={() => void download()} disabled={downloading}>
          <Download aria-hidden="true" />
          {/* 보이는 글자를 이름에 그대로 담고 어느 파일인지를 앞에 붙인다(보이는 이름과 접근 이름이 어긋나지 않게). */}
          <span className="sr-only">{name} </span>{downloading ? '내려받는 중…' : '내려받기'}
        </Button>
      ) : null}
    </li>
  );
}

/** 내려받기 파일 목록. 항목이 없으면 그리지 않는다(사용자 화면의 빈 칸은 렌더러가 거른다). */
export function CmsFileList({ items }: { items: readonly CmsFileItem[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="grid min-w-0 gap-2" aria-label="내려받기 파일">
      {items.map((item) => <CmsFileRow key={item.atchFileSn} item={item} />)}
    </ul>
  );
}
