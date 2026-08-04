'use client';

import React, { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { fileService } from '@/services/foundation/file/FileService';
import { cn } from '@/lib/utils';

type LoadState = 'loading' | 'ready' | 'error' | 'empty';

/**
 * 첨부 이미지를 **blob 으로 받아** 렌더한다.
 *
 * <p>[왜 이렇게 하나] `<img src="/api/v1/files/…">` 는 이 저장소에서 **원리적으로 인증되지 않는다**.
 * 백엔드 `JwtTokenProvider.resolveToken` 은 `Authorization` 헤더만 읽고 쿠키 폴백이 없는데,
 * `<img>` 는 헤더를 실을 수 없고 Next 의 `/api/v1/:path*` rewrite 는 헤더를 주입하지 않는
 * 투명 프록시다. 그래서 URL 을 아무리 고쳐도 401 이 된다.
 * axios 로 받아 `URL.createObjectURL` 로 그리는 것이 백엔드 계약을 바꾸지 않는 유일한 길이다.
 *
 * <p>[대가] `next/image` 최적화를 쓰지 못한다. 바이트를 이미 우리가 받아왔으므로 최적화기가
 * 개입할 여지도 없다 — 그래서 일반 `<img>` 를 쓴다.
 *
 * <p>[실패를 숨기지 않는다] 첨부가 없거나 권한이 없으면 <b>깨진 이미지 아이콘</b>이 아니라
 * 명시적인 플레이스홀더를 그린다. 종전 코드는 존재하지 않는 경로를 불러 브라우저 기본
 * 깨진-이미지가 나왔고, 그것이 "이미지가 없는 것" 인지 "불러오지 못한 것" 인지 구분되지 않았다.
 */
export function AttachmentImage({
  atchFileId,
  alt,
  className,
  fallbackClassName,
}: {
  /** 통합 파일 ID. 없으면 플레이스홀더를 그린다. */
  atchFileId?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [state, setState] = useState<LoadState>(atchFileId ? 'loading' : 'empty');

  useEffect(() => {
    if (!atchFileId) {
      setSrc(null);
      setState('empty');
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;
    setState('loading');

    (async () => {
      try {
        const files = await fileService.getFileList(atchFileId);
        const first = files?.[0];
        if (!first) {
          if (!cancelled) setState('empty');
          return;
        }
        const blob = await fileService.fetchBlob(atchFileId, first.fileSn);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
        setState('ready');
      } catch {
        // 권한 없음(403)·부재(404)·네트워크 실패를 구분해 표시하지는 않는다 —
        // 사용자에게 의미 있는 차이가 아니고, 구분해 보여주면 존재 여부가 새어 나간다.
        if (!cancelled) setState('error');
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [atchFileId]);

  if (state === 'ready' && src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- blob: URL 은 next/image 최적화 대상이 아니다(위 주석 참조).
      <img src={src} alt={alt} className={className} />
    );
  }

  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center bg-muted text-muted-foreground',
        fallbackClassName,
      )}
      role="img"
      aria-label={state === 'loading' ? `${alt} 불러오는 중` : `${alt} 이미지를 표시할 수 없습니다`}
    >
      {state === 'loading' ? (
        <div className="h-6 w-6 animate-pulse rounded-full bg-muted-foreground/30" />
      ) : (
        <ImageOff size={20} aria-hidden="true" />
      )}
    </div>
  );
}

/**
 * 저장된 `fileUrl` 문자열에서 첨부 ID 를 뽑는다.
 *
 * <p>팝업(`tb_popup_manage.file_url`)은 URL 문자열을 저장한다. 종전 코드가 저장해 온 값은
 * `/api/v1/files/download?fileId=FILE_xxx` 인데 **백엔드에 그 경로가 없다**(download 매핑 0건).
 * 기존 행을 마이그레이션하지 않고도 살리기 위해, 레거시 질의문자열 형태와 정규 경로 형태를
 * 모두 파싱한다. 외부 URL(http/https)은 첨부가 아니므로 null 을 반환한다 — 호출부가 그대로 렌더한다.
 */
export function extractAtchFileId(fileUrl?: string | null): string | null {
  if (!fileUrl) return null;
  if (/^https?:\/\//i.test(fileUrl)) return null;

  const legacy = fileUrl.match(/[?&]fileId=([^&]+)/);
  if (legacy) return decodeURIComponent(legacy[1]);

  const canonical = fileUrl.match(/\/api\/v1\/files\/([^/?#]+)/);
  if (canonical) return decodeURIComponent(canonical[1]);

  return null;
}
