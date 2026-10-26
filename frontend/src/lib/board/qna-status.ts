/**
 * Q&A 글의 해결 상태 판정(게시판 소유, 허브 분해 H2). 지식 허브(게시판 셸)와 도움말 센터가 함께 쓴다 — 도움말은 게시판을
 * 요구하므로 게시판 소유로 두어도 도움말이 다른 기능을 끌어오지 않는다. 게시판이 빠진 구성에서는 함께 지워진다.
 * 서버 값 도메인(BoardDto.qnaSttsCd)은 OPEN/SOLVED 다(종전 등록 경로의 QA01 은 V2_116 이 OPEN 으로 맞췄다).
 */

/** 답변이 끝난 문의인지. 서버 값 도메인 밖은 '진행 중'으로 본다(없는 완료를 지어내지 않는다). */
export function isQnaSolved(qnaSttsCd?: string): boolean {
  return qnaSttsCd === 'SOLVED';
}

/** Q&A 해결 상태 조건 값(서버 qnaStatus). 비우면 전체다. */
export type QnaStatusCode = 'OPEN' | 'SOLVED';

/**
 * [2026-10-26 ADR-0043 1차 OPS-02·UX-05] Q&A 상태 이름의 정본. 두 상태(OPEN/SOLVED)는 '작성자·전체 수정 권한자가 해결로 표시했는가'
 * 이지 답변이 달렸는가가 아니다(DEC-OPS-137 ③, 결정 20). 그래서 OPEN 을 '답변 대기'·'접수' 로 부르지 않고 '미해결' 이라 부른다 —
 * 답이 달린 질문도 해결로 표시하기 전까지는 미해결이다. 화면마다 이름을 따로 두지 않고 이 표를 읽는다.
 */
export const QNA_STATUS_LABELS: Readonly<Record<QnaStatusCode, string>> = {
  OPEN: '미해결',
  SOLVED: '해결됨',
};

/** 서버 해결 상태의 화면 이름. 값 도메인 밖이나 빈 값은 isQnaSolved 와 같게 '미해결' 이다. */
export function qnaStatusLabel(qnaSttsCd?: string | null): string {
  return isQnaSolved(qnaSttsCd ?? undefined) ? QNA_STATUS_LABELS.SOLVED : QNA_STATUS_LABELS.OPEN;
}

/**
 * [2026-10-26 ADR-0043 1차 UX-16] Q&A 분류의 화면 이름. 분류 체계(C1 말머리)는 아직 정하지 않았다 — 종전 등록 경로가 넣은 'CAT01'
 * 같은 값은 정의된 이름이 없는 코드라 화면에 그대로 내보이지 않고, 분류가 없는 글과 같게 '일반' 으로 부른다. C1 이 분류를 정하면
 * 그 이름표를 여기에 둔다.
 */
export function qnaCategoryLabel(_qnaCatCd?: string | null): string {
  return '일반';
}
