'use client';

/**
 * 구역 단위 Error Boundary.
 *
 * 이 파일이 없으면 이 구역의 한 화면에서 발생한 오류가 루트 경계로 올라가
 * 셸 전체가 오류 화면으로 대체되고, reset() 시 앱 서브트리 전체가 재마운트된다.
 * 구역별 error.tsx 를 두면 오류 경계가 해당 구역 안으로 국소화된다
 * (admin/* 하위 세그먼트들과 동일한 재수출 패턴 — 중복 구현 금지).
 */
export { default } from '../error';
