import { describe, expect, it } from 'vitest';
import { hasPublishChanges, summarizePublishChanges } from '../publish-changes';
import { issueText, issuesBySection, locationLabel, publishBlockers } from '../content-page-issues';
import { cmsConflict } from '../content-page-errors';
import type { CmsCell, CmsDocument, CmsSection } from '@/lib/cms/document';

const rich = (text: string): CmsCell => ({ kind: 'rich', doc: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] } });
const section = (id: string, label: string, cells: CmsCell[], layout: CmsSection['layout'] = 'one'): CmsSection => ({
  id, label, layout, tone: 'default', spacing: 'normal', cells,
});
const doc = (...sections: CmsSection[]): CmsDocument => ({ schemaVersion: 1, sections });

describe('summarizePublishChanges — 지금 게시본과 게시할 초안의 차이(ADR-0042)', () => {
  const published = {
    contsTtl: '이용 안내',
    contsExpln: '요약',
    document: doc(section('a', '안내', [rich('하나')]), section('b', '', [rich('둘')]), section('c', '문의', [rich('셋')])),
  };

  it('바뀐 것이 없으면 아무것도 보고하지 않는다(편집기 기본 속성 차이는 바뀐 것이 아니다)', () => {
    const draft = {
      contsTtl: ' 이용 안내 ',
      contsExpln: '요약',
      document: doc(
        section('a', '안내', [{ kind: 'rich', doc: { type: 'doc', content: [{ type: 'paragraph', attrs: { textAlign: null }, content: [{ type: 'text', text: '하나' }] }] } }]),
        section('b', '', [rich('둘')]),
        section('c', '문의', [rich('셋')]),
      ),
    };
    const summary = summarizePublishChanges(published, draft);
    expect(hasPublishChanges(summary)).toBe(false);
  });

  it('영역 식별자로 맞춰 바뀐 영역·새 영역·지운 영역을 고르고, 이름이 없으면 그 판의 순번으로 부른다', () => {
    const draft = {
      contsTtl: '새 제목',
      contsExpln: '',
      document: doc(section('a', '안내', [rich('바뀐 하나')]), section('b', '', [rich('둘')]), section('d', '', [rich('넷')])),
    };
    expect(summarizePublishChanges(published, draft)).toEqual({
      titleChanged: true,
      summaryChanged: true,
      changed: ['안내'],
      added: ['3번 영역'],
      removed: ['문의'],
      reordered: false,
    });
  });

  it('순서만 바꾼 영역은 바뀐 영역이 아니라 순서 변경이다', () => {
    const draft = { ...published, document: doc(section('b', '', [rich('둘')]), section('a', '안내', [rich('하나')]), section('c', '문의', [rich('셋')])) };
    const summary = summarizePublishChanges(published, draft);
    expect(summary.changed).toEqual([]);
    expect(summary.reordered).toBe(true);
  });
});

describe('publishBlockers — 게시를 막는 문제', () => {
  it('게시 판정과 시작 양식 문장을 문서 순서로 모은다', () => {
    const issues = publishBlockers(doc(
      section('a', '안내', [rich('안내할 내용을 작성해 주세요.')]),
      section('b', '사진', [{ kind: 'image', atchFileSn: 0, alt: '', decorative: false, caption: '' }, { kind: 'links', items: [{ title: '', url: '' }] }], 'two'),
    ));
    expect(issues.map(({ section: s, cell }) => [s, cell])).toEqual([[0, 0], [1, 0], [1, 1]]);
    expect(issueText(issues[1].message)).toBe('이미지를 선택해 주세요');
    expect(issueText(issues[2].message)).toBe('바로가기 1 이름: 값을 입력해 주세요');
  });

  it('초안 판정부터 통과하지 못하면 그 문제 하나만 준다', () => {
    const issues = publishBlockers(doc(section('a', '', [{ kind: 'links', items: [{ title: '가', url: 'javascript:alert(1)' }] }])));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ section: 0, cell: 0 });
  });

  it('영역별로 묶고 위치 표기를 뗀다 — 영역이 없는 문제는 빼고 넘긴다', () => {
    const grouped = issuesBySection([
      { section: 1, cell: 0, message: '영역 2 1단: 이미지를 선택해 주세요' },
      { section: 1, message: '영역 2 이름: 80자 이내로 입력해 주세요' },
      { message: '보이는 내용이 없습니다. 본문을 작성해 주세요.' },
    ]);
    expect([...grouped.keys()]).toEqual([1]);
    expect(grouped.get(1)).toEqual([
      { cell: 0, message: '이미지를 선택해 주세요' },
      { message: '이름: 80자 이내로 입력해 주세요' },
    ]);
  });

  it('위치 이름은 영역 번호·편집용 이름·단이다', () => {
    const document = doc(section('a', '', [rich('가')]), section('b', '절차', [rich('나')]));
    expect(locationLabel(document, { section: 0, cell: 0 })).toBe('1번 영역 1단');
    expect(locationLabel(document, { section: 1 })).toBe('2번 영역 ‘절차’');
    expect(locationLabel(document, {})).toBe('문서 전체');
  });
});

describe('cmsConflict — 409 를 코드로 가른다', () => {
  it('C008 은 주소 중복, C013 은 동시 수정, 그 밖은 어느 쪽도 아니다', () => {
    expect(cmsConflict({ response: { status: 409, data: { code: 'C008' } } })).toBe('duplicate-path');
    expect(cmsConflict({ response: { status: 409, data: { code: 'C013' } } })).toBe('concurrent');
    expect(cmsConflict({ response: { status: 409, data: { code: 'C014' } } })).toBeNull();
    expect(cmsConflict({ isAxiosError: true, response: { status: 409 } })).toBeNull();
    expect(cmsConflict({ response: { status: 400, data: { code: 'C013' } } })).toBeNull();
  });
});
