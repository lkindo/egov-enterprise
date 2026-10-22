import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  changeSectionLayout,
  createSection,
  hasVisibleContent,
  normalizeCmsDocument,
  safeHref,
  sameCmsDocument,
  templateDocument,
  type CmsDocument,
} from '../document';

// 서버 검증기(CmsDocumentValidatorTest)와 같은 판정 fixture 다 — 한쪽 판정만 바뀌면 두 시험이 함께 붉어진다(ADR-0039 결정 5).
//   정본은 서버 시험 자원이고 이 파일은 그 사본이다. 두 파일이 같은지는 cross-stack 계약(cms-document-fixture)이 백엔드 축에서도 본다.
const fixture = JSON.parse(readFileSync(resolve(__dirname, 'cms-document-fixtures.json'), 'utf8')) as {
  hrefs: { valid: string[]; invalid: string[] };
  cases: Array<{ name: string; valid: boolean; document: unknown; normalized?: unknown; error?: string }>;
};

describe('콘텐츠 문서 판정은 서버 검증기와 같다', () => {
  it.each(fixture.cases.map((entry) => [entry.name, entry] as const))('%s', (_name, entry) => {
    const result = normalizeCmsDocument(entry.document);
    expect(result.ok).toBe(entry.valid);
    if (result.ok && entry.normalized) {
      expect(result.document).toEqual(entry.normalized);
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
      expect(normalizeCmsDocument(templateDocument(template)).ok, template).toBe(true);
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
    expect(normalizeCmsDocument({ schemaVersion: 1, sections }).ok).toBe(true);
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
});
