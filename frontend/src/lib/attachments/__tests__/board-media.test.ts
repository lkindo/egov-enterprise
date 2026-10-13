import { describe, expect, it } from 'vitest';
import {
  BOARD_MEDIA_ACCEPT,
  createBoardMediaFile,
  getBoardMediaKind,
  getBoardMediaReferences,
  isBoardMediaReference,
  sanitizeBoardRichText,
} from '../board-media';

const name = 'media-12345678-1234-4234-8234-123456789abc-회의_사진.png';
const marker = `<figure data-board-file="${name}" data-media-kind="image" data-media-label="회의 사진"><figcaption>회의 사진</figcaption></figure>`;

describe('게시판 본문 미디어 참조', () => {
  it('원본 바이트를 보존하면서 안전한 UUID 파일명을 생성한다', () => {
    const original = new File(['picture'], '../회의 사진(최종).PNG', { type: 'image/png', lastModified: 42 });
    const result = createBoardMediaFile(original);
    expect(result.reference).toEqual({ name: result.file.name, label: original.name, kind: 'image' });
    expect(result.file.name).toMatch(/^media-[0-9a-f-]{36}-\.\._회의_사진_최종_\.png$/);
    expect(result.file.size).toBe(original.size);
    expect(result.file.type).toBe(original.type);
    expect(result.file.lastModified).toBe(42);
    expect(isBoardMediaReference(result.reference)).toBe(true);
    expect(createBoardMediaFile(original).file.name).not.toBe(result.file.name);
  });

  it('긴 Unicode 파일명도 서버의 300자 제한 안에 둔다', () => {
    const original = new File(['picture'], `${'𠀀'.repeat(220)}.png`);
    const result = createBoardMediaFile(original);
    expect(result.file.name.length).toBeLessThan(300);
    expect(result.reference.label.length).toBeLessThanOrEqual(300);
    expect(isBoardMediaReference(result.reference)).toBe(true);
  });

  it('형식 allowlist를 적용하고 이름이 없는 확장자·실행형식·외부 URL 참조를 거부한다', () => {
    expect(BOARD_MEDIA_ACCEPT).toBe('.jpg,.jpeg,.png,.gif,.bmp,.mp4,.webm');
    expect(getBoardMediaKind('movie.WEBM')).toBe('video');
    expect(getBoardMediaKind('png')).toBeNull();
    expect(() => createBoardMediaFile(new File(['svg'], 'drawing.svg'))).toThrow();
    for (const unsafe of ['https://example.test/a.png', 'blob:abc', 'data:image/png,abc', '../a.png', name.replace('회의_사진', 'a/b')]) {
      expect(isBoardMediaReference({ name: unsafe, label: '사진', kind: 'image' })).toBe(false);
    }
    expect(isBoardMediaReference({ name, label: '사진', kind: 'video' })).toBe(false);
    expect(isBoardMediaReference({ name, label: '', kind: 'image' })).toBe(true);
  });

  it('정상 figure만 읽으며 임의 태그나 형식이 다른 참조는 콘텐츠로 인정하지 않는다', () => {
    expect(getBoardMediaReferences(marker)).toEqual([{ name, label: '회의 사진', kind: 'image' }]);
    expect(getBoardMediaReferences(marker.replaceAll('figure', 'div'))).toEqual([]);
    expect(getBoardMediaReferences(marker.replace('data-media-kind="image"', 'data-media-kind="video"'))).toEqual([]);
    expect(getBoardMediaReferences('<img src="data:image/png,abc">')).toEqual([]);
  });

  it('서식과 표를 보존하되 미디어 marker의 임의 src와 실행 속성은 DOM 주입 전에 제거한다', () => {
    const html = '<p style="text-align:center">안내</p><table><tbody><tr><th colspan="2">항목</th></tr></tbody></table>'
      + marker.replace('<figcaption>', '<img src="https://evil.test/a.png" onerror="alert(1)"><video src="blob:old" poster="https://evil.test/p.png"></video><figcaption>')
      + '<script>alert(1)</script>';
    const sanitized = sanitizeBoardRichText(html);
    expect(sanitized).toContain('text-align:center');
    expect(sanitized).toContain('<th colspan="2">항목</th>');
    expect(sanitized).toContain(marker);
    expect(sanitized).not.toMatch(/<img|<video|src=|poster=|onerror|<script|evil\.test|blob:|base64/);
  });

  it('깨진 참조 안의 SVG·iframe·폼과 figure 속성의 우회 리소스는 활성 콘텐츠가 되지 않는다', () => {
    const malicious = marker.replace('<figcaption>', '<svg><image href="https://evil.test/a.png"></image></svg>'
      + '<iframe src="https://evil.test"></iframe><input type="image" src="/api/private"><figcaption>')
      .replace('<figure ', '<figure style="background-image:url(https://evil.test/background)" ');
    const sanitized = sanitizeBoardRichText(malicious.replace(name, '../secret.png'));
    expect(sanitized).toContain('첨부 연결을 확인할 수 없습니다.');
    expect(sanitized).not.toMatch(/data-board-file|<svg|<iframe|<input|evil\.test|api\/private/);
  });

  it('기존 URL 이미지의 표시 계약은 유지하며 설명을 비운 새 marker도 남긴다', () => {
    expect(sanitizeBoardRichText('<img src="/legacy.png" alt="기존 이미지" onerror="alert(1)">'))
      .toBe('<img src="/legacy.png" alt="기존 이미지">');
    const emptyLabel = marker.replace('data-media-label="회의 사진"', 'data-media-label=""');
    expect(getBoardMediaReferences(emptyLabel)).toEqual([{ name, label: '', kind: 'image' }]);
    expect(sanitizeBoardRichText(emptyLabel)).toContain('<figcaption>첨부 이미지</figcaption>');
  });
});
