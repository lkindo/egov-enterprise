/**
 * 게시판 유형(tb_bbs_master.bbs_type_cd)의 정본. 유형 코드와 이름은 이 표에서만 읽는다(게시판 소유).
 *
 * [2026-10-16 GAP-BOARD-002, DEC-OPS-332] 종전 서버는 유형 이름을 공통코드 COM004 에서 조인했지만 COM004 는 원본
 * 마이그레이션·공유 DB·생성물 어디에도 없어 이름이 늘 비었다. 유형 코드를 정하는 곳은 생성 마법사 하나다 — 템플릿을
 * 고르면 그 템플릿의 유형 코드를 함께 저장한다. 그래서 유형은 템플릿과 1:1 이고 이름은 템플릿 이름이다. 서버는 코드만
 * 저장·응답하고 이름을 싣지 않는다(이름이 두 곳에 있으면 갈린다).
 *
 * 화면 배치는 유형 코드가 아니라 템플릿 ID(tmplt_id)로 갈린다(BoardListClient·BoardPreview).
 *
 * [2026-10-26 ADR-0043 결정 5] 화면 유형 이름은 실제 화면을 정하는 템플릿으로 정한다(boardTypeDisplay). 정본 표는 여전히 이
 * 표 하나다 — 목록·운영 화면 머리·설정 탭·마법사가 같은 함수로 이름을 읽는다.
 */
export const BOARD_TYPES = [
  {
    code: 'BBST01',
    templateId: 'TMPLT_HUB',
    name: '지식 허브',
    description: '대표 게시글과 나머지 글을 카드로 보여주는 목록',
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
    description: '첨부 수와 댓글·추천 수를 함께 보여주는 카드형 목록',
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
    description: '행사일을 기준으로 게시글을 월 달력에 배치하는 목록',
  },
  {
    code: 'BBST06',
    templateId: 'TMPLT_FAQ',
    name: 'Accordion FAQ',
    description: '질문을 펼쳐 답변을 하나씩 확인하는 목록',
  },
  {
    code: 'BBST07',
    templateId: 'TMPLT_WIKI',
    name: 'Knowledge Wiki',
    description: '문서 제목·작성자·등록일을 세로로 보여주는 목록',
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

/** 템플릿(내장 레이아웃)으로 정본 항목을 찾는다. 내장 레이아웃이 아니면 undefined 다. */
export function findBoardTypeByTemplate(tmpltId: string | null | undefined): BoardType | undefined {
  return BOARD_TYPES.find((type) => type.templateId === tmpltId);
}

/**
 * 내장 레이아웃이 아닌 템플릿(예: 시드의 `TMPLAT_BOARD_DEFAULT`)이나 템플릿이 없는 게시판의 이름. 이용 화면은 그런 게시판을
 * 기본 목록으로 그린다(BoardListClient 의 마지막 분기).
 */
export const DEFAULT_LAYOUT_NAME = '기본 목록형(레이아웃 미지정)';

/** 유형 코드와 템플릿이 정본의 짝이 아닐 때 이름 옆에 덧붙이는 보조 문구. */
export const BOARD_TYPE_PAIR_MISMATCH = '유형 코드 짝 불일치';

/** 템플릿이 정하는 화면 유형 이름. 내장 레이아웃이 아니면 '기본 목록형(레이아웃 미지정)' 이다. 마법사 요약도 이 함수를 쓴다. */
export function boardTemplateName(tmpltId: string | null | undefined): string {
  return findBoardTypeByTemplate(tmpltId)?.name ?? DEFAULT_LAYOUT_NAME;
}

export interface BoardTypeDisplay {
  /** 화면 유형 이름 — 템플릿으로 정한다. */
  name: string;
  /** 저장된 유형 코드와 템플릿이 정본의 짝이 아닌가(코드가 표에 없거나 비어 있는 경우 포함). */
  pairMismatch: boolean;
  /** 저장된 유형 코드(없으면 빈 문자열) — 짝이 맞지 않을 때 함께 보인다. */
  storedCode: string;
}

/**
 * [2026-10-26 ADR-0043 결정 5] 목록·운영 화면 머리·설정 탭에 보일 화면 유형. 이름은 실제 화면을 정하는 템플릿으로 정하고,
 * 유형 코드와 템플릿이 정본의 짝이 아니면 그 사실을 함께 돌려준다 — 화면은 이름 옆에 '유형 코드 짝 불일치' 를 덧붙인다.
 *
 * 종전(DEC-OPS-332 ②)에는 짝이 맞을 때만 이름을, 아니면 저장된 코드를 보였다. 시드·라이브 게시판(R__seed_demo.sql 의
 * BBSMSTR_* 4개)은 코드와 템플릿을 다른 짝으로 저장해(예: 질의응답 게시판이 BBST03 + TMPLT_QNA) 주요 게시판이 'BBST03' 같은
 * 코드로 보였다. 코드만으로 이름을 붙이면 질의응답 게시판을 갤러리라고 부르게 되므로 이름의 근거는 템플릿이다. 데이터를 맞추는
 * 일은 여전히 별도 승인 대상이다.
 */
export function boardTypeDisplay(bbsTypeCd: string | null | undefined, tmpltId: string | null | undefined): BoardTypeDisplay {
  return {
    name: boardTemplateName(tmpltId),
    pairMismatch: findBoardType(bbsTypeCd)?.templateId !== tmpltId,
    storedCode: bbsTypeCd ?? '',
  };
}

/** 화면 유형 이름만(짝 불일치 표시 없이). boardTypeDisplay(...).name 과 같다. */
export function boardTypeLabel(bbsTypeCd: string | null | undefined, tmpltId: string | null | undefined): string {
  return boardTypeDisplay(bbsTypeCd, tmpltId).name;
}
