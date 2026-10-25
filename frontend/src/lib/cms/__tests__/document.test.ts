import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  changeSectionLayout,
  cmsPublishIssues,
  createSection,
  emptyCellLocations,
  hasVisibleContent,
  normalizeCmsDocument,
  safeHref,
  sameCmsDocument,
  templateDocument,
  templateInstructionIssues,
  withoutAttachments,
  type CmsDocument,
  type CmsValidationMode,
} from '../document';

// 서버 검증기(CmsDocumentValidatorTest)와 같은 판정 fixture 다 — 한쪽 판정만 바뀌면 두 시험이 함께 붉어진다(ADR-0039 결정 5).
//   정본은 서버 시험 자원이고 이 파일은 그 사본이다. 두 파일이 같은지는 cross-stack 계약(cms-document-fixture)이 백엔드 축에서도 본다.
const fixture = JSON.parse(readFileSync(resolve(__dirname, 'cms-document-fixtures.json'), 'utf8')) as {
  hrefs: { valid: string[]; invalid: string[] };
  cases: Array<{ name: string; mode?: CmsValidationMode; valid: boolean; document: unknown; normalized?: unknown; error?: string }>;
};

describe('콘텐츠 문서 판정은 서버 검증기와 같다', () => {
  // mode 가 없는 사례는 게시 판정이다(ADR-0039 의 원래 규칙). 초안 판정은 ADR-0042 가 넓힌 수준이다.
  it.each(fixture.cases.map((entry) => [entry.name, entry] as const))('%s', (_name, entry) => {
    const mode = entry.mode ?? 'publish';
    const result = normalizeCmsDocument(entry.document, mode);
    expect(result.ok).toBe(entry.valid);
    if (result.ok && entry.normalized) {
      expect(result.document).toEqual(entry.normalized);
    }
    if (result.ok && mode === 'publish') {
      // 초안 판정은 게시 판정을 넓힐 뿐이다 — 게시할 수 있는 문서는 초안으로도 같은 모양으로 저장된다.
      const draft = normalizeCmsDocument(entry.document, 'draft');
      expect(draft.ok && draft.document).toEqual(result.document);
    }
    if (!result.ok && entry.error) {
      expect(result.error).toContain(entry.error);
    }
  });

  it('링크 주소 판정이 fixture 와 같다', () => {
    for (const href of fixture.hrefs.valid) expect(safeHref(href), href).not.toBeNull();
    for (const href of fixture.hrefs.invalid) expect(safeHref(href), href).toBeNull();
  });
});

describe('편집 도우미', () => {
  const base = (): CmsDocument => templateDocument('intro');

  it('시작 양식은 모두 검증을 통과한다', () => {
    for (const template of ['blank', 'guide', 'intro'] as const) {
      expect(normalizeCmsDocument(templateDocument(template), 'publish').ok, template).toBe(true);
    }
  });

  it('단을 줄여도 내용을 버리지 않고 아래 새 영역으로 옮긴다', () => {
    const document = base();
    const index = document.sections.findIndex((section) => section.layout === 'three');
    const { sections, moved } = changeSectionLayout(document.sections, index, 'one');
    expect(moved).toBe(2);
    expect(sections).toHaveLength(document.sections.length + 2);
    expect(sections[index].cells).toHaveLength(1);
    expect(sections[index + 1].cells[0]).toBe(document.sections[index].cells[1]);
    expect(sections[index + 2].cells[0]).toBe(document.sections[index].cells[2]);
    expect(new Set(sections.map((section) => section.id)).size).toBe(sections.length);
    expect(normalizeCmsDocument({ schemaVersion: 1, sections }, 'publish').ok).toBe(true);
  });

  it('단을 늘리면 빈 본문 칸을 더한다', () => {
    const sections = [createSection([], 'one')];
    const result = changeSectionLayout(sections, 0, 'three');
    expect(result.moved).toBe(0);
    expect(result.sections[0].cells).toHaveLength(3);
  });

  it('같은 문서 판정은 편집기 기본 속성과 키 순서를 무시한다', () => {
    const stored = templateDocument('blank');
    const fromEditor = JSON.parse(JSON.stringify(stored));
    fromEditor.sections[0].cells[0].doc.content[0].attrs = { textAlign: null };
    expect(sameCmsDocument(stored, fromEditor)).toBe(true);
    fromEditor.sections[0].cells[0].doc.content[0].content[0].text = '바뀐 내용';
    expect(sameCmsDocument(stored, fromEditor)).toBe(false);
  });

  it('빈 본문만 있으면 보이는 내용이 없다고 판정한다', () => {
    expect(hasVisibleContent({ schemaVersion: 1, sections: [createSection([], 'one')] })).toBe(false);
    expect(hasVisibleContent(templateDocument('blank'))).toBe(true);
  });

  it('고르지 않은 이미지·빈 바로가기·빈 내려받기 칸은 보이는 내용이 아니다', () => {
    const section = { ...createSection([], 'three') };
    section.cells = [
      { kind: 'image', atchFileSn: 0, alt: '', decorative: false, caption: '' },
      { kind: 'links', items: [{ title: '안내', url: '' }] },
      { kind: 'files', items: [] },
    ];
    const document: CmsDocument = { schemaVersion: 1, sections: [section] };
    expect(hasVisibleContent(document)).toBe(false);
    expect(emptyCellLocations(document)).toEqual([{ section: 0, cell: 0 }, { section: 0, cell: 1 }, { section: 0, cell: 2 }]);
  });
});

describe('초안·게시 판정(ADR-0042)', () => {
  const draftWithGaps = (): CmsDocument => {
    const first = createSection([], 'two');
    first.cells = [
      { kind: 'image', atchFileSn: 0, alt: '', decorative: false, caption: '' },
      { kind: 'rich', doc: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '본문' }] }] } },
    ];
    const second = createSection([first], 'one');
    second.cells = [{ kind: 'links', items: [{ title: '', url: '/pages/a' }] }];
    return { schemaVersion: 1, sections: [first, second] };
  };

  it('미완성 칸이 있어도 초안으로는 저장할 수 있고 게시 판정은 처음 걸린 칸의 위치를 준다', () => {
    expect(normalizeCmsDocument(draftWithGaps(), 'draft').ok).toBe(true);
    const result = normalizeCmsDocument(draftWithGaps(), 'publish');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('이미지를 선택해 주세요');
      expect(result.location).toEqual({ section: 0, cell: 0 });
    }
  });

  it('게시를 막는 칸을 한 번에 모두 모은다', () => {
    const issues = cmsPublishIssues(draftWithGaps());
    expect(issues.map(({ section, cell }) => [section, cell])).toEqual([[0, 0], [1, 0]]);
    expect(issues[1].message).toContain('값을 입력해 주세요');
  });

  it('완성된 문서에는 게시를 막는 문제가 없다', () => {
    expect(cmsPublishIssues(templateDocument('guide'))).toEqual([]);
  });

  it('시작 양식의 작성 안내 문장이 남은 칸을 찾는다', () => {
    expect(templateInstructionIssues(templateDocument('guide')).map(({ section, cell }) => [section, cell])).toEqual([[0, 0]]);
    expect(templateInstructionIssues(templateDocument('blank'))).toHaveLength(1);
    expect(templateInstructionIssues(templateDocument('intro'))).toEqual([]);
  });

  it('다른 페이지를 시작점으로 쓰면 첨부만 떼고 나머지는 그대로 둔다', () => {
    const source = draftWithGaps();
    source.sections[0].cells[0] = { kind: 'image', atchFileSn: 7, alt: '안내도', decorative: false, caption: '그림 1' };
    source.sections[1].cells[0] = { kind: 'files', items: [{ atchFileSn: 8, title: '신청서' }] };
    const copy = withoutAttachments(source);
    expect(copy.sections[0].cells[0]).toEqual({ kind: 'image', atchFileSn: 0, alt: '안내도', decorative: false, caption: '그림 1' });
    expect(copy.sections[1].cells[0]).toEqual({ kind: 'files', items: [] });
    expect(copy.sections[0].cells[1]).toEqual(source.sections[0].cells[1]);
    expect(normalizeCmsDocument(copy, 'draft').ok).toBe(true);
  });
});
