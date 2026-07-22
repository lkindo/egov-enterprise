'use client';

/**
 * 도메인 단위 Error Boundary (감사 P1-12).
 *
 * 이 파일이 없으면 이 도메인의 한 화면에서 발생한 오류가 `/admin` 전체를 대체하고,
 * `reset()` 시 관리자 서브트리 전체가 재마운트된다. 세그먼트별 error.tsx 를 두면
 * 오류 경계가 해당 도메인 안으로 국소화된다.
 *
 * UI/규약은 `app/admin/error.tsx` 와 동일해야 하므로 재수출만 한다(중복 구현 금지).
 */
export { default } from '../error';
