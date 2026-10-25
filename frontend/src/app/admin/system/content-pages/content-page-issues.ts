import {
  cmsPublishIssues,
  normalizeCmsDocument,
  templateInstructionIssues,
  type CmsDocument,
  type CmsDocumentIssue,
  type CmsDocumentLocation,
} from '@/lib/cms/document';
import type { SectionIssue } from './SectionEditor';

/**
 * 편집기·게시 대화상자가 함께 쓰는 문서 문제 도우미(ADR-0042). 판정 자체는 문서 모듈(lib/cms/document)이 하고, 여기서는 그 결과를
 * 화면 위치(영역·칸)로 묶고 그 칸으로 데려간다.
 */

/**
 * 게시를 막는 문제. 게시 판정(cmsPublishIssues)이 칸마다 모은 것과 시작 양식의 작성 안내 문장이 남은 칸이다 — 안내 문장은 형식상
 * 올바르지만 그대로 게시하면 사용자에게 '작성해 주세요' 가 보인다. 초안 판정부터 통과하지 못하면 그 문제 하나만 준다(형식이 깨진
 * 문서는 칸마다 모아도 뜻이 없다).
 */
export function publishBlockers(document: CmsDocument): CmsDocumentIssue[] {
  const normalized = normalizeCmsDocument(document, 'draft');
  if (!normalized.ok) return [{ ...normalized.location, message: normalized.error }];
  // 문서 순서(영역·칸)로 늘어놓는다 — 목록을 위에서부터 고쳐 내려가게. 위치가 없는 문서 전체의 문제는 맨 뒤다.
  const order = (issue: CmsDocumentIssue) => [issue.section ?? Number.MAX_SAFE_INTEGER, issue.cell ?? -1];
  return [...cmsPublishIssues(normalized.document), ...templateInstructionIssues(normalized.document)]
    .map((issue, position) => ({ issue, position }))
    .sort((left, right) => {
      const [leftSection, leftCell] = order(left.issue);
      const [rightSection, rightCell] = order(right.issue);
      return leftSection - rightSection || leftCell - rightCell || left.position - right.position;
    })
    .map(({ issue }) => issue);
}

/** 문서 판정 문구 앞의 위치 표기('영역 2 1단: ', '영역 2 1단 바로가기 1 …')를 뗀다 — 화면이 위치를 따로 보인다. */
export function issueText(message: string): string {
  return message.replace(/^영역 \d+(?: \d+단)?(?::\s*|\s+)/, '');
}

/** 위치의 화면 이름 — 예: '2번 영역 ‘절차’ 1단'. 영역이 없으면 '문서 전체' 다. */
export function locationLabel(document: CmsDocument, location: CmsDocumentLocation): string {
  if (location.section === undefined) return '문서 전체';
  const section = document.sections[location.section];
  const name = `${location.section + 1}번 영역${section?.label ? ` ‘${section.label}’` : ''}`;
  return location.cell === undefined ? name : `${name} ${location.cell + 1}단`;
}

/** 영역마다 SectionEditor 에 넘길 문제(칸 번호는 그대로, 위치 표기는 뗀 문구). 영역이 없는 문제는 빼고 넘긴다. */
export function issuesBySection(issues: readonly CmsDocumentIssue[]): Map<number, SectionIssue[]> {
  const result = new Map<number, SectionIssue[]>();
  for (const issue of issues) {
    if (issue.section === undefined) continue;
    const list = result.get(issue.section) ?? [];
    list.push({ ...(issue.cell === undefined ? {} : { cell: issue.cell }), message: issueText(issue.message) });
    result.set(issue.section, list);
  }
  return result;
}

const CONTENT_CONTROLS = 'input:not([type="file"]):not([hidden]):not(:disabled), button:not(:disabled), textarea:not(:disabled)';

/**
 * 위치로 포커스를 옮긴다. 칸이면 그 칸에서 고칠 입력 — 문제로 표시된 입력(aria-invalid, 칸 종류 고르기는 빼고), 본문 편집 영역,
 * 첫 입력·단추 순 — 이고, 영역 전체면 그 영역의 첫 입력(영역 이름)이다. 옮겼으면 true.
 *
 * 영역 루트는 SectionEditor 의 `data-section-index`, 칸은 그 안의 `data-cell-index` 다(ADR-0042 편집기 계약).
 */
export function focusDocumentLocation(root: ParentNode | null, location: CmsDocumentLocation): boolean {
  if (!root || location.section === undefined) return false;
  const section = root.querySelector<HTMLElement>(`[data-section-index="${location.section}"]`);
  if (!section) return false;
  let target: HTMLElement | null;
  if (location.cell === undefined) {
    target = section.querySelector<HTMLElement>('input:not([type="file"]):not([hidden]):not(:disabled)');
  } else {
    const cell = section.querySelector<HTMLElement>(`[data-cell-index="${location.cell}"]`);
    target = cell && (cell.querySelector<HTMLElement>('[aria-invalid="true"]:not(select):not(:disabled)')
      ?? cell.querySelector<HTMLElement>('[contenteditable="true"]')
      ?? cell.querySelector<HTMLElement>(CONTENT_CONTROLS)
      ?? cell.querySelector<HTMLElement>('select:not(:disabled)'));
  }
  if (!target) return false;
  target.focus();
  return document.activeElement === target;
}
