import DOMPurify from 'isomorphic-dompurify';

export type BoardMediaKind = 'image' | 'video';

export interface BoardMediaReference {
  name: string;
  label: string;
  kind: BoardMediaKind;
}

export interface BoardMediaAttachment {
  atchFileSn: number;
  fileSn: number;
  fileExtsn: string;
  orignlFileNm: string;
}

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp'];
const VIDEO_EXTENSIONS = ['mp4', 'webm'];
export const BOARD_MEDIA_ACCEPT = [...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS]
  .map(extension => `.${extension}`).join(',');

// The UUID binds a body reference to one exact stored filename, never to a URL or another attachment group.
const MEDIA_NAME = /^media-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[\p{L}\p{N}._-]{1,180}\.(?:jpg|jpeg|png|gif|bmp|mp4|webm)$/u;

export function getBoardMediaKind(filename: string): BoardMediaKind | null {
  const separator = filename.lastIndexOf('.');
  if (separator < 0) return null;
  const extension = filename.slice(separator + 1).toLowerCase();
  if (IMAGE_EXTENSIONS.includes(extension)) return 'image';
  if (VIDEO_EXTENSIONS.includes(extension)) return 'video';
  return null;
}

export function isBoardMediaReference(value: unknown): value is BoardMediaReference {
  if (typeof value !== 'object' || value === null) return false;
  const reference = value as Partial<BoardMediaReference>;
  return typeof reference.name === 'string' && reference.name.length < 300 && MEDIA_NAME.test(reference.name)
    && typeof reference.label === 'string' && reference.label.length <= 300
    && getBoardMediaKind(reference.name) === reference.kind;
}

export function createBoardMediaFile(file: File): { reference: BoardMediaReference; file: File } {
  const kind = getBoardMediaKind(file.name);
  if (!kind) throw new Error('이미지 또는 MP4, WebM 영상 파일을 선택해 주세요.');
  const separator = file.name.lastIndexOf('.');
  const extension = file.name.slice(separator + 1).toLowerCase();
  let stem = '';
  for (const character of file.name.slice(0, separator).normalize('NFC').replace(/[^\p{L}\p{N}._-]/gu, '_')) {
    if (stem.length + character.length > 180) break;
    stem += character;
  }
  if (!stem) stem = 'file';
  const name = `media-${crypto.randomUUID()}-${stem}.${extension}`;
  return {
    reference: { name, label: file.name.slice(0, 300), kind },
    file: new File([file], name, { type: file.type, lastModified: file.lastModified }),
  };
}

export function readBoardMediaReference(element: Element): BoardMediaReference | null {
  if (element.tagName !== 'FIGURE') return null;
  const reference = {
    name: element.getAttribute('data-board-file'),
    label: element.getAttribute('data-media-label'),
    kind: element.getAttribute('data-media-kind'),
  };
  return isBoardMediaReference(reference) ? reference : null;
}

export function getBoardMediaReferences(html: string): BoardMediaReference[] {
  const fragment = DOMPurify.sanitize(html, { RETURN_DOM_FRAGMENT: true });
  return Array.from(fragment.querySelectorAll('figure[data-board-file]'))
    .map(readBoardMediaReference).filter(reference => reference !== null);
}

/** Stored media markers never supply URLs. Preserve the existing DOMPurify policy for legacy rich text. */
export function sanitizeBoardRichText(html: string): string {
  const fragment = DOMPurify.sanitize(html, { RETURN_DOM_FRAGMENT: true });
  const ownerDocument = fragment.ownerDocument;
  for (const figure of fragment.querySelectorAll('figure[data-board-file]')) {
    const reference = readBoardMediaReference(figure);
    const normalized = ownerDocument.createElement('figure');
    const caption = ownerDocument.createElement('figcaption');
    caption.textContent = reference
      ? reference.label.trim() || (reference.kind === 'image' ? '첨부 이미지' : '첨부 영상')
      : '첨부 연결을 확인할 수 없습니다.';
    if (reference) {
      normalized.setAttribute('data-board-file', reference.name);
      normalized.setAttribute('data-media-kind', reference.kind);
      normalized.setAttribute('data-media-label', reference.label);
    }
    normalized.append(caption);
    figure.replaceWith(normalized);
  }
  const container = ownerDocument.createElement('div');
  container.append(fragment);
  return container.innerHTML;
}
