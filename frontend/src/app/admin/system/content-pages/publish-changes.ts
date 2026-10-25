import { sameCmsDocument, type CmsDocument, type CmsSection } from '@/lib/cms/document';

/** 비교할 판 하나 — 제목·요약·문서. */
export interface PublishSide {
  contsTtl?: string | null;
  contsExpln?: string | null;
  document: CmsDocument;
}

/** 지금 게시본과 게시할 초안의 차이(ADR-0042). 영역 이름은 편집용 이름이고, 없으면 그 판에서의 순번('2번 영역')이다. */
export interface PublishChangeSummary {
  titleChanged: boolean;
  summaryChanged: boolean;
  changed: string[];
  added: string[];
  removed: string[];
  /** 두 판에 모두 있는 영역의 순서가 바뀌었다. */
  reordered: boolean;
}

const sectionName = (section: CmsSection, index: number) => section.label.trim() || `${index + 1}번 영역`;

/** 영역 하나를 같은 판정(정규화한 뒤 비교)으로 견준다 — 편집기가 덧붙이는 기본 속성 차이는 바뀐 것으로 보지 않는다. */
const sameSection = (left: CmsSection, right: CmsSection) =>
  sameCmsDocument({ schemaVersion: 1, sections: [left] }, { schemaVersion: 1, sections: [right] });

/**
 * 영역 식별자로 두 판을 맞춰 바뀐 영역·새 영역·지운 영역을 고른다. 식별자는 편집기가 영역을 만들 때 정하고 옮겨도 그대로라, 순서를
 * 바꾼 영역은 '바뀐 영역' 이 아니라 순서 변경으로 따로 센다.
 */
export function summarizePublishChanges(published: PublishSide, draft: PublishSide): PublishChangeSummary {
  const before = new Map(published.document.sections.map((section, index) => [section.id, { section, index }] as const));
  const afterIds = new Set(draft.document.sections.map((section) => section.id));
  const changed: string[] = [];
  const added: string[] = [];
  draft.document.sections.forEach((section, index) => {
    const previous = before.get(section.id);
    if (!previous) added.push(sectionName(section, index));
    else if (!sameSection(previous.section, section)) changed.push(sectionName(section, index));
  });
  const removed = published.document.sections
    .map((section, index) => ({ section, index }))
    .filter(({ section }) => !afterIds.has(section.id))
    .map(({ section, index }) => sectionName(section, index));
  const commonBefore = published.document.sections.map((section) => section.id).filter((id) => afterIds.has(id));
  const commonAfter = draft.document.sections.map((section) => section.id).filter((id) => before.has(id));
  return {
    titleChanged: (published.contsTtl ?? '').trim() !== (draft.contsTtl ?? '').trim(),
    summaryChanged: (published.contsExpln ?? '').trim() !== (draft.contsExpln ?? '').trim(),
    changed,
    added,
    removed,
    reordered: commonBefore.some((id, index) => commonAfter[index] !== id),
  };
}

/** 바뀐 것이 하나라도 있는가. */
export function hasPublishChanges(summary: PublishChangeSummary): boolean {
  return summary.titleChanged || summary.summaryChanged || summary.reordered
    || summary.changed.length > 0 || summary.added.length > 0 || summary.removed.length > 0;
}
