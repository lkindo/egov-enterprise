import { redirect } from 'next/navigation';

/**
 * 공통코드 통합 관리 화면으로 보낸다.
 *
 * [2026-11-08 DEC-OPS-404] 이 경로의 처분은 정본 통합(consolidate-to-canonical)이다. 종전에는 클라이언트 화면이
 * 그려진 뒤 브라우저에서 주소를 바꿔 넘겼다 — 다른 통합 별칭처럼 서버에서 바로 보낸다. 진입 권한은 정본과 같은 CODE_READ 다.
 */
export default function CommonCodeCodesRedirectPage() {
  redirect('/admin/system/common-code');
}
