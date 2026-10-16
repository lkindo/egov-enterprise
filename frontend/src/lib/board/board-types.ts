/**
 * 게시판 유형(tb_bbs_master.bbs_type_cd)의 정본. 유형 코드와 이름은 이 표에서만 읽는다(게시판 소유).
 *
 * [2026-10-16 GAP-BOARD-002, DEC-OPS-332] 종전 서버는 유형 이름을 공통코드 COM004 에서 조인했지만 COM004 는 원본
 * 마이그레이션·공유 DB·생성물 어디에도 없어 이름이 늘 비었다. 유형 코드를 정하는 곳은 생성 마법사 하나다 — 템플릿을
 * 고르면 그 템플릿의 유형 코드를 함께 저장한다. 그래서 유형은 템플릿과 1:1 이고 이름은 템플릿 이름이다. 서버는 코드만
 * 저장·응답하고 이름을 싣지 않는다(이름이 두 곳에 있으면 갈린다).
 *
 * 화면 배치는 유형 코드가 아니라 템플릿 ID(tmplt_id)로 갈린다(BoardListClient·BoardPreview).
 */
export const BOARD_TYPES = [
  {
    code: 'BBST01',
    templateId: 'TMPLT_HUB',
    name: '지식 허브',
    description: '지식 공유에 최적화된 고도화된 대시보드형 레이아웃',
  },
  {
    code: 'BBST02',
    templateId: 'TMPLT_LIST',
    name: 'Enterprise List',
    description: '빠른 검색과 가독성을 중시하는 표준 데이터 테이블',
  },
  {
    code: 'BBST03',
    templateId: 'TMPLT_GALLERY',
    name: 'Visual Gallery',
    description: '이미지 및 카드 중심의 시각적 커뮤니티 레이아웃',
  },
  {
    code: 'BBST04',
    templateId: 'TMPLT_QNA',
    name: 'Professional Q&A',
    description: '질문과 해결 중심의 사내 기술 지원 및 상담 레이아웃',
  },
  {
    code: 'BBST05',
    templateId: 'TMPLT_CALENDAR',
    name: 'Event Calendar',
    description: '날짜 기반의 전사 일정 및 교육 현황 관리 레이아웃',
  },
  {
    code: 'BBST06',
    templateId: 'TMPLT_FAQ',
    name: 'Accordion FAQ',
    description: '질문과 답변을 한눈에 펼쳐보는 아코디언 스타일의 FAQ 레이아웃',
  },
  {
    code: 'BBST07',
    templateId: 'TMPLT_WIKI',
    name: 'Knowledge Wiki',
    description: '방대한 정보를 체계적으로 정리하는 도큐먼트형 위키 레이아웃',
  },
] as const;

export type BoardType = (typeof BOARD_TYPES)[number];
export type BoardTypeCode = BoardType['code'];
export type BoardTemplateId = BoardType['templateId'];

/** 생성 마법사가 처음 고른 상태로 두는 유형. */
export const DEFAULT_BOARD_TYPE: BoardType = BOARD_TYPES[0];

/** 유형 코드로 정본 항목을 찾는다. 표에 없는 코드는 undefined 다. */
export function findBoardType(code: string | null | undefined): BoardType | undefined {
  return BOARD_TYPES.find((type) => type.code === code);
}

/**
 * 목록에 보일 유형 표기. 저장된 유형 코드와 템플릿이 정본의 짝과 같을 때만 이름을 보이고, 아니면 저장된 코드를 그대로
 * 보인다(코드도 없으면 빈 문자열).
 *
 * 시드·라이브 게시판(R__seed_demo.sql 의 BBSMSTR_* 4개)은 코드와 템플릿을 다른 짝으로 저장했다 — 예를 들어 질의응답
 * 게시판이 BBST03 + TMPLT_QNA 다. 코드만으로 이름을 붙이면 질의응답 게시판을 'Visual Gallery' 라고 부르게 된다. 없는
 * 사실을 말하지 않으려고 짝이 맞을 때만 이름을 붙인다(데이터를 맞추는 일은 별도 승인 대상이다 — DEC-OPS-332).
 */
export function boardTypeLabel(bbsTypeCd: string | null | undefined, tmpltId: string | null | undefined): string {
  const type = findBoardType(bbsTypeCd);
  if (type && type.templateId === tmpltId) return type.name;
  return bbsTypeCd ?? '';
}
