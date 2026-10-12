/**
 * Q&A 글의 해결 상태 판정(core, 허브 분해 H2). 지식 허브(게시판 셸)와 도움말 센터가 함께 쓴다 — 어느 한 기능에 두면 다른 기능이
 * 그 기능을 끌어온다. 서버 값 도메인(BoardDto.qnaSttsCd)은 OPEN/SOLVED 다(종전 등록 경로의 QA01 은 V2_116 이 OPEN 으로 맞췄다).
 */

/** 답변이 끝난 문의인지. 서버 값 도메인 밖은 '진행 중'으로 본다(없는 완료를 지어내지 않는다). */
export function isQnaSolved(qnaSttsCd?: string): boolean {
  return qnaSttsCd === 'SOLVED';
}
