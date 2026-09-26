import { describe, expect, it } from 'vitest';
import { boardUploadLimits, formatMegabytes, SERVER_UPLOAD_ACCEPT } from '../server-upload-limits';

/** 게시판 첨부 제한 — 서버 BoardService.assertNewFilesAllowed 와 같은 규칙(2026-09-27 DIP B5 F9). */
describe('boardUploadLimits', () => {
  it('파일 수는 이미 붙은 파일을 빼고 남은 만큼, 크기는 게시판과 서버 중 작은 값이다', () => {
    expect(boardUploadLimits({ fileAtchPsbltyYn: 'Y', atchPsbltyFileQty: 3, atchPsbltyFileSz: 5 * 1024 * 1024 }, 1))
      .toEqual({ allowed: true, boardMaxFiles: 3, remaining: 2, maxSizeMB: 5 });
    expect(boardUploadLimits({ fileAtchPsbltyYn: 'Y', atchPsbltyFileQty: 3, atchPsbltyFileSz: 50 * 1024 * 1024 }, 5))
      .toEqual({ allowed: true, boardMaxFiles: 3, remaining: 0, maxSizeMB: 10 });
  });

  it('첨부를 받지 않는 게시판은 allowed 가 거짓이고, 상한이 0·비어 있으면 서버 상한만 적용된다', () => {
    expect(boardUploadLimits({ fileAtchPsbltyYn: 'N', atchPsbltyFileQty: 3 }, 0).allowed).toBe(false);
    expect(boardUploadLimits({ fileAtchPsbltyYn: 'Y', atchPsbltyFileQty: 0, atchPsbltyFileSz: null }, 2))
      .toEqual({ allowed: true, boardMaxFiles: null, remaining: 20, maxSizeMB: 10 });
  });

  it('설정을 아직 모르면 서버 상한으로 보인다 — 판정은 서버가 한다', () => {
    expect(boardUploadLimits(undefined, 0)).toEqual({ allowed: true, boardMaxFiles: null, remaining: 20, maxSizeMB: 10 });
    expect(boardUploadLimits({}, 0).allowed).toBe(true);
  });

  it('accept 는 서버 확장자에 점을 붙인 목록이고 MB 표기는 소수 한 자리까지다', () => {
    expect(SERVER_UPLOAD_ACCEPT.split(',')).toContain('.hwp');
    expect(SERVER_UPLOAD_ACCEPT).not.toContain('*');
    expect(formatMegabytes(5)).toBe('5MB');
    expect(formatMegabytes(1.5)).toBe('1.5MB');
  });
});
