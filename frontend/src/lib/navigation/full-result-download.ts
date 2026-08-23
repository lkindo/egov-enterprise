/**
 * 전체 결과 파일 export 를 브라우저 내비게이션으로 내려받는다.
 *
 * 서버가 `Content-Disposition: attachment` 를 명시하는 스트리밍 엔드포인트
 * (예: `GET /api/v1/admin/system/logs/login/export.xlsx`, DEC-OPS-016)는
 * 브라우저가 페이지를 떠나지 않고 저장 대화상자를 띄우므로, XHR+Blob 버퍼링 없이
 * `window.location` 이동 한 번이 가장 단순하고 메모리 안전한 다운로드 경로다.
 * 인증은 same-origin 쿠키(`withCredentials` 축과 동일)로 전달된다.
 *
 * ⚠ jsdom 의 `window.location` 은 [LegacyUnforgeable] 이라 테스트에서 spy 를 붙일 수
 * 없다. 호출부는 이 모듈을 경유해야 단위 테스트가 배선을 검증할 수 있다.
 */
export function navigateToDownload(url: string): void {
  window.location.assign(url);
}
