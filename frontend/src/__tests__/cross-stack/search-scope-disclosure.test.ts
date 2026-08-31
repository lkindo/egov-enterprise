/**
 * 조회 조건 라벨은 **서버가 실제로 검색하는 필드만** 약속한다.
 *
 * ── 부류 ──────────────────────────────────────────────────────────────────────
 * 화면이 "포상 명칭 또는 대상자로 검색" 이라고 말하는데 서버는 포상명만 본다면, 사용자는
 * 대상자 이름을 넣고 "결과 없음" 을 받는다. 그건 **없다는 뜻이 아니라 그 축으로 찾지
 * 않았다는 뜻**인데 화면은 구분해 주지 않는다. 사용자는 데이터가 없다고 믿는다.
 *
 * 실측된 사례 셋:
 * - 쪽지: 라벨 '제목·발신자' / 서버는 noteTtl·noteCn (제목·본문)
 * - 포상: 라벨 '포상 명칭 · 대상자' / 서버는 findByRwrdNmContaining (포상명만)
 * - 부서 일정: placeholder '일정명 또는 내용으로' / 서버는 schdlNm LIKE (일정명만)
 *
 * ── 왜 라벨만 검사하면 부족한가 ────────────────────────────────────────────────
 * 금지어 목록은 두 방향에서 샌다. ①다른 낱말('수신자', '작성자명')로 바꾸면 통과한다.
 * ②**서버가 나중에 축을 넓히면** 정직해진 라벨이 오히려 계약에 걸린다.
 *
 * 그래서 각 화면을 **대응 백엔드 소스와 함께** 검사한다. 서버 술어가 바뀌면 계약이 red 가
 * 되어 라벨을 같이 고치게 강제한다. 행사 화면은 서버가 실제로 두 필드를 보므로 **통과해야
 * 하는 양성 사례**로 함께 넣는다 — 금지만 하는 계약은 옳은 코드도 막는다.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8');
const stripComments = (source: string) => source
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\/\/.*$/gm, ' ');

/**
 * 화면 소스에서 **조회 조건 문구**만 뽑는다 — label / placeholder 로 쓰인 문자열.
 *
 * 표 컬럼 헤더나 상세 라벨은 대상이 아니다. 거짓은 "그 축으로 검색된다" 는 약속에서만
 * 생기고, 값을 보여 주는 것 자체는 정직하다.
 */
/** label / placeholder 로 쓰인 문자열 리터럴(따옴표 · 템플릿 리터럴 둘 다). */
// 백슬래시를 쓰지 않는다 — 공백은 문자 클래스로, 중괄호는 클래스로 표현한다.
const RE_SEARCH_COPY = /(?:label|placeholder)[ ]*=[ ]*(?:"([^"]*)"|[{]`([^`]*)`[}])/g;

function searchLabels(source: string): string[] {
  const stripped = stripComments(source);
  const found: string[] = [];
  for (const match of stripped.matchAll(RE_SEARCH_COPY)) {
    const value = match[1] ?? match[2];
    if (value && value.trim()) found.push(value);
  }
  return found;
}

interface Axis {
  /** 화면 파일 */
  screen: string;
  /** 백엔드 검색 술어가 있는 파일 */
  backend: string;
  /** 백엔드에 있어야 하는 검색 대상 컬럼 */
  serverFields: string[];
  /** 백엔드가 보지 않으므로 라벨이 약속하면 안 되는 낱말 */
  forbiddenInLabel: string[];
  /** 화면이 실제로 쓰는 라벨 문구(있어야 한다) */
  expectedLabel: string;
}

const AXES: Axis[] = [
  {
    screen: 'frontend/src/app/admin/collaboration/CollaborationHubClient.tsx',
    backend: 'business-app/src/main/java/nuri/business/domain/note/NoteRecptnDomainRepository.java',
    serverFields: ['noteTtl', 'noteCn'],
    forbiddenInLabel: ['발신자', '수신자', '보낸사람'],
    expectedLabel: '제목·내용',
  },
  {
    screen: 'frontend/src/app/admin/operation/rewards/RewardManageClient.tsx',
    backend: 'business-app/src/main/java/nuri/business/domain/operation/RewardManageRepository.java',
    serverFields: ['findByRwrdNmContaining'],
    forbiddenInLabel: ['대상자', '수상자'],
    expectedLabel: '포상 명칭으로 검색',
  },
  {
    screen: 'frontend/src/app/smart-toolkit/schedule/dept/ScheduleDeptClient.tsx',
    backend: 'business-app/src/main/java/nuri/business/domain/schedule/ScheduleRepository.java',
    serverFields: ['schdlNm'],
    forbiddenInLabel: ['내용으로 검색', '상세 내용'],
    expectedLabel: '일정명으로 검색',
  },
];

/** 서버가 실제로 두 필드를 보는 양성 사례. 이 화면은 '상세 내용' 을 약속해도 정직하다. */
const HONEST_TWO_FIELD_AXIS = {
  screen: 'frontend/src/app/admin/operation/events/EventManagementClient.tsx',
  backend: 'business-app/src/main/java/nuri/business/domain/operation/EventInfoRepository.java',
  serverFields: ['evntNm', 'evntCn'],
  expectedLabel: '행사 명칭 · 상세 내용',
};

describe('조회 조건 라벨 ↔ 서버 검색 술어 결속', () => {
  it.each(AXES)('$screen 이 서버가 보지 않는 축을 약속하지 않는다', (axis) => {
    const backend = stripComments(read(axis.backend));

    // 서버 술어가 실제로 그 필드만 보는지 먼저 확인한다 — 이 단언이 계약의 입력이다.
    for (const field of axis.serverFields) {
      expect(backend, `${axis.backend} 에서 ${field} 검색 술어를 찾지 못했다 — 계약이 vacuous 하다`)
        .toContain(field);
    }

    /*
      검사 범위는 **조회 조건 문구만**이다. 표 컬럼이 발신자를 보여 주는 것은 정직하며
      금지 대상이 아니다 — 거짓은 "그 축으로 검색된다" 는 약속에서만 생긴다.
    */
    const searchCopy = searchLabels(read(axis.screen));
    expect(searchCopy.length, `${axis.screen} 에서 조회 조건 문구를 찾지 못했다 — 계약이 vacuous 하다`)
      .toBeGreaterThan(0);
    const screen = searchCopy.join(' | ');

    for (const word of axis.forbiddenInLabel) {
      /*
        서버가 그 축을 지원하게 됐다면 이 단언 대신 라벨을 되살리고 serverFields 를 갱신하라 —
        계약을 지우지 말 것. 지금은 그 축으로 검색해도 결과가 걸리지 않는다.
      */
      expect(screen, `'${word}' 로 검색된다고 말하지만 서버는 그 축을 보지 않는다`)
        .not.toContain(word);
    }
    expect(screen, '정직해진 라벨이 실제로 화면에 있는지 확인한다').toContain(axis.expectedLabel);
  });

  it('서버가 두 필드를 보는 화면은 두 필드를 약속해도 된다 — 금지만 하는 계약이 되지 않게', () => {
    const backend = stripComments(read(HONEST_TWO_FIELD_AXIS.backend));
    for (const field of HONEST_TWO_FIELD_AXIS.serverFields) {
      expect(backend).toContain(field);
    }
    expect(stripComments(read(HONEST_TWO_FIELD_AXIS.screen)))
      .toContain(HONEST_TWO_FIELD_AXIS.expectedLabel);
  });
});
