'use client';

import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ImageOff } from 'lucide-react';
import { fileService } from '@/services/foundation/file/FileService';
import { cn } from '@/lib/utils';

type LoadState = 'loading' | 'ready' | 'error' | 'empty';

/**
 * 첨부 이미지 캐시의 query key — 첨부 묶음 번호 하나에 그 묶음 첫 파일의 바이트(Blob)가 붙는다.
 *
 * <p>사용자 id 를 key 에 넣지 않는다. 로그인 사용자가 바뀌거나(로그아웃 포함) 권한 판이 바뀌면
 * `AuthContext` 의 `commitUser` 가 진행 중 조회를 취소하고 query 캐시 전체를 비운다 — 다른 사람에게 남지 않는다.
 */
export const attachmentImageQueryKey = (atchFileSn: number) => ['attachment-image', atchFileSn] as const;

/*
 * [2026-10-26 ADR-0042] 같은 이미지를 화면 안에서 다시 받지 않는다. 종전에는 마운트마다 목록 조회와 다운로드를
 *   다시 해, 배너가 5초마다 넘어갈 때·관리 표와 미리보기가 같은 이미지를 그릴 때마다 받았고 그때마다 개인정보
 *   접속기록이 쌓였다. 열람 감사 정책은 그대로다 — 서버는 받은 만큼 기록하고, 화면이 덜 받을 뿐이다.
 *   - staleTime: 한 화면을 오래 열어 두거나 화면을 오가도 다시 받지 않을 만큼 길게, 묶음의 파일이 바뀌었을 때
 *     옛 이미지를 끝없이 붙들지 않을 만큼만 둔다.
 *   - gcTime: 아무도 그리지 않는 이미지의 바이트는 몇 분 뒤 메모리에서 버린다.
 */
const ATTACHMENT_IMAGE_STALE_MS = 30 * 60 * 1000;
const ATTACHMENT_IMAGE_GC_MS = 5 * 60 * 1000;

/** 묶음 첫 파일의 바이트. 묶음에 파일이 없으면 null(빈 첨부). */
async function loadAttachmentImage(atchFileSn: number): Promise<Blob | null> {
  /*
   * [2026-08-26] 실패는 **이 컴포넌트가 대체 표시로 처리한다** — 전역 토스트로 올리지 않는다.
   * 배너처럼 주기적으로 다시 그리는 자리에서는 같은 404 가 반복 토스트가 되어 화면을 가린다
   * (실측: 5초 간격 `Request failed with status code 404`).
   */
  const quiet = { suppressErrorToast: true } as const;
  const files = await fileService.getFileList(atchFileSn, quiet);
  const first = files?.[0];
  if (!first) return null;
  return fileService.fetchBlob(atchFileSn, first.fileSn, quiet);
}

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
  atchFileSn,
  alt,
  className,
  fallbackClassName,
}: {
  /** 첨부파일 일련번호. 없으면 플레이스홀더를 그린다. */
  atchFileSn?: number | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}) {
  const enabled = Boolean(atchFileSn);
  const { data: blob, isError } = useQuery({
    queryKey: attachmentImageQueryKey(atchFileSn ?? 0),
    queryFn: () => loadAttachmentImage(atchFileSn ?? 0),
    enabled,
    staleTime: ATTACHMENT_IMAGE_STALE_MS,
    gcTime: ATTACHMENT_IMAGE_GC_MS,
    // 종전처럼 실패하면 한 번에 대체 표시로 넘어간다 — 앱 기본값의 한 번 재시도는 같은 실패를 한 번 더 받는다.
    retry: false,
    // 앱 기본값은 5xx 최초 실패를 오류 경계로 올려 화면 전체를 바꾼다. 이미지 하나의 실패는 이 자리의 대체 표시다.
    throwOnError: false,
  });
  // 권한 없음(403)·부재(404)·네트워크 실패를 구분해 표시하지는 않는다 —
  // 사용자에게 의미 있는 차이가 아니고, 구분해 보여주면 존재 여부가 새어 나간다.
  const state: LoadState = !enabled ? 'empty'
    : blob ? 'ready'
    : blob === null ? 'empty'
    : isError ? 'error'
    : 'loading';

  /*
   * object URL 은 캐시가 아니라 **그리는 자리마다** 만들고 그 자리가 사라지면 회수한다 — 캐시의 Blob 은 여러 자리가
   * 함께 쓰므로, 한 자리의 회수가 다른 자리의 이미지를 끊으면 안 된다. ref 정리 함수(React 19)로 붙였다 떼어
   * 이미지 요소의 수명과 URL 의 수명을 같게 둔다(Strict Mode 의 이중 부착도 새 URL 을 만든다).
   */
  const attachObjectUrl = useCallback((image: HTMLImageElement | null) => {
    if (!image || !blob) return undefined;
    const objectUrl = URL.createObjectURL(blob);
    image.src = objectUrl;
    return () => URL.revokeObjectURL(objectUrl);
  }, [blob]);

  if (state === 'ready') {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- blob: URL 은 next/image 최적화 대상이 아니다(위 주석 참조).
      <img ref={attachObjectUrl} alt={alt} className={className} />
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
 * <p>팝업(`tb_popup_info.file_url`)은 URL 문자열을 저장한다. V2_72가 기존 문자열 식별자 URL을
 * 숫자 정규 경로로 변환하지만, 롤링 전환 중 들어올 수 있는 질의문자열 형태도 숫자일 때만 허용한다.
 * 외부 URL이나 비숫자 식별자는 첨부가 아니므로 null을 반환한다.
 */
export function extractAtchFileSn(fileUrl?: string | null): number | null {
  if (!fileUrl) return null;
  if (/^https?:\/\//i.test(fileUrl)) return null;

  const legacy = fileUrl.match(/[?&]fileId=([^&]+)/);
  if (legacy) return parseAttachmentSn(legacy[1]);

  const canonical = fileUrl.match(/\/api\/v1\/files\/([^/?#]+)/);
  if (canonical) return parseAttachmentSn(canonical[1]);

  return null;
}

function parseAttachmentSn(rawValue: string): number | null {
  const value = Number(decodeURIComponent(rawValue));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}
