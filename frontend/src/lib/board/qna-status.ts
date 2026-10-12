/**
 * Q&A 글의 해결 상태 판정(게시판 소유, 허브 분해 H2). 지식 허브(게시판 셸)와 도움말 센터가 함께 쓴다 — 도움말은 게시판을
 * 요구하므로 게시판 소유로 두어도 도움말이 다른 기능을 끌어오지 않는다. 게시판이 빠진 구성에서는 함께 지워진다.
 * 서버 값 도메인(BoardDto.qnaSttsCd)은 OPEN/SOLVED 다(종전 등록 경로의 QA01 은 V2_116 이 OPEN 으로 맞췄다).
 */

/** 답변이 끝난 문의인지. 서버 값 도메인 밖은 '진행 중'으로 본다(없는 완료를 지어내지 않는다). */
export function isQnaSolved(qnaSttsCd?: string): boolean {
  return qnaSttsCd === 'SOLVED';
}
