import { describe, expect, it } from 'vitest';
import { extractAtchFileId } from '../attachment-image';

/**
 * 팝업의 `fileUrl` 은 URL 문자열을 저장한다. 이 파서가 틀리면 이미지가 조용히 사라진다 —
 * 화면에는 플레이스홀더만 남고 원인이 보이지 않으므로, 형태별로 못박아 둔다.
 *
 * 특히 **레거시 형태**가 중요하다. 종전 코드는 백엔드에 존재하지 않는
 * `/api/v1/files/download?fileId=…` 를 저장해 왔고, 그 값이 이미 DB 에 들어 있다.
 * 그 행들을 마이그레이션하지 않고 살리는 것이 이 파서의 존재 이유다.
 */
describe('extractAtchFileId', () => {
  it('레거시 질의문자열 형태(?fileId=)에서 ID 를 뽑는다 — 기존 DB 행을 마이그레이션 없이 살린다', () => {
    expect(extractAtchFileId('/api/v1/files/download?fileId=FILE_abc123')).toBe('FILE_abc123');
  });

  it('정규 경로 형태에서 ID 를 뽑는다', () => {
    expect(extractAtchFileId('/api/v1/files/FILE_abc123')).toBe('FILE_abc123');
  });

  it('경로 뒤에 파일 순번이 붙어도 첨부 ID 만 뽑는다', () => {
    expect(extractAtchFileId('/api/v1/files/FILE_abc123/1')).toBe('FILE_abc123');
  });

  it('외부 URL 은 첨부가 아니므로 null — 호출부가 그대로 렌더해야 한다', () => {
    expect(extractAtchFileId('https://cdn.example.com/banner.png')).toBeNull();
    expect(extractAtchFileId('http://example.com/a.png?fileId=NOT_OURS')).toBeNull();
  });

  it('빈 값·null·undefined 는 null', () => {
    expect(extractAtchFileId('')).toBeNull();
    expect(extractAtchFileId(null)).toBeNull();
    expect(extractAtchFileId(undefined)).toBeNull();
  });

  it('첨부와 무관한 경로에서는 null 을 반환한다 — 아무 문자열이나 ID 로 오인하지 않는다', () => {
    expect(extractAtchFileId('/api/placeholder/400/300')).toBeNull();
    expect(extractAtchFileId('/images/logo.png')).toBeNull();
  });

  it('URL 인코딩된 ID 를 복원한다', () => {
    expect(extractAtchFileId('/api/v1/files/download?fileId=FILE_a%2Fb')).toBe('FILE_a/b');
  });
});
