/**
 * 서버(FileService)가 받는 첨부 제한과 게시판 첨부 설정(2026-09-27 DIP B5 F9).
 *
 * 업로더가 서버와 다른 제한을 보이면 사용자는 고른 파일이 저장할 때 거부되는 것을 뒤늦게 안다. 확장자·파일당 크기는
 * 서버 상수와 cross-stack 계약(`server-upload-limits-contract`)이 대조한다.
 */
export const SERVER_UPLOAD_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'gif', 'bmp',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'hwp', 'txt',
  'zip', '7z', 'rar',
] as const;

/** `<input accept>` 형식. */
export const SERVER_UPLOAD_ACCEPT = SERVER_UPLOAD_EXTENSIONS.map((extension) => `.${extension}`).join(',');

/** 서버의 파일당 상한(MB) — FileService.MAX_FILE_SIZE_BYTES. */
export const SERVER_MAX_FILE_SIZE_MB = 10;

/** 서버의 요청당 파일 수 상한 — FileService.MAX_FILES_PER_REQUEST. */
export const SERVER_MAX_FILES_PER_REQUEST = 20;

export interface BoardAttachmentSettings {
  fileAtchPsbltyYn?: string | null;
  atchPsbltyFileQty?: number | null;
  atchPsbltyFileSz?: number | null;
}

export interface BoardUploadLimits {
  /** 이 게시판이 새 첨부를 받는가. */
  allowed: boolean;
  /** 게시판 파일 수 상한(이미 붙은 파일 포함). 없으면 null. */
  boardMaxFiles: number | null;
  /** 지금 더 붙일 수 있는 파일 수. */
  remaining: number;
  /** 파일당 상한(MB). 게시판 상한과 서버 상한 중 작은 값. */
  maxSizeMB: number;
}

/**
 * 게시판 설정과 이미 붙은 파일 수로 업로더 제한을 정한다. 서버(BoardService.assertNewFilesAllowed)와 같은 규칙이다 —
 * 파일 수·크기가 0 이하이거나 비어 있으면 게시판 상한이 없고 서버 상한만 적용된다. 설정을 아직 모르면(조회 전·실패·
 * 값 누락) 서버 상한으로 보이고 판정은 서버가 한다.
 */
export function boardUploadLimits(settings: BoardAttachmentSettings | null | undefined, existingCount: number): BoardUploadLimits {
  // 명시적 N 만 첨부 불가로 본다 — 값을 모르면 받게 두고 판정은 서버가 한다(게시글 화면의 댓글·만족도와 같은 규칙).
  const allowed = settings?.fileAtchPsbltyYn !== 'N';
  const qty = settings?.atchPsbltyFileQty;
  const boardMaxFiles = typeof qty === 'number' && qty > 0 ? qty : null;
  const remaining = Math.max(0, Math.min(
    SERVER_MAX_FILES_PER_REQUEST,
    boardMaxFiles === null ? SERVER_MAX_FILES_PER_REQUEST : boardMaxFiles - existingCount,
  ));
  const bytes = settings?.atchPsbltyFileSz;
  const boardMaxMB = typeof bytes === 'number' && bytes > 0 ? bytes / (1024 * 1024) : null;
  const maxSizeMB = boardMaxMB === null ? SERVER_MAX_FILE_SIZE_MB : Math.min(boardMaxMB, SERVER_MAX_FILE_SIZE_MB);
  return { allowed, boardMaxFiles, remaining, maxSizeMB };
}

/** 사람이 읽는 MB 표기(소수 한 자리까지). */
export function formatMegabytes(mb: number): string {
  return `${Number.isInteger(mb) ? mb : Number(mb.toFixed(1))}MB`;
}
