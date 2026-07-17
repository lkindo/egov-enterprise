import { NextRequest, NextResponse } from 'next/server';

/**
 * CSP 위반 리포트 수집 엔드포인트 (report-uri / report-to 대상).
 *
 * ⚠ 비인증 공개 쓰기 엔드포인트이므로 방어적으로 설계한다:
 *  - Content-Type 허용목록(외 415), 바디 크기 상한(초과 415), 필드 화이트리스트만 로깅(원문 통짜 금지),
 *    로그 값 새니타이즈(제어문자 제거), 백엔드 호출 없이 즉시 204.
 *  - 리포트 데이터는 '신뢰 불가 텔레메트리'다 — 위조/스팸 가능. enforce 전환의 유일 근거로 삼지 않는다
 *    (1차 게이트는 프로덕션 빌드 E2E + 수동 스모크의 콘솔 위반 0건).
 */
const ALLOWED_TYPES = ['application/csp-report', 'application/reports+json', 'application/json'];
const MAX_BODY = 32 * 1024; // 32KB

function sanitize(v: unknown): string {
  // 제어문자(개행 포함) 제거로 로그 인젝션 방어 후 길이 제한.
  return String(v ?? '').replace(new RegExp('[' + String.fromCharCode(0) + '-' + String.fromCharCode(31) + ']', 'g'), ' ').slice(0, 512);
}

export async function POST(request: NextRequest) {
  const type = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!ALLOWED_TYPES.includes(type)) {
    return new NextResponse(null, { status: 415 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY) {
    return new NextResponse(null, { status: 415 });
  }

  try {
    const parsed = JSON.parse(raw);
    // report-uri 형식: { "csp-report": {...} }, report-to 형식: [{ body: {...} }]
    const reports = Array.isArray(parsed) ? parsed.map((r) => r?.body ?? r) : [parsed['csp-report'] ?? parsed];
    for (const r of reports) {
      if (!r) continue;
      // 필드 화이트리스트만 기록 (원문 바디 통짜 로깅 금지)
      console.warn('[csp-violation]', JSON.stringify({
        directive: sanitize(r['effective-directive'] || r['effectiveDirective'] || r['violated-directive']),
        blocked: sanitize(r['blocked-uri'] || r['blockedURL']),
        document: sanitize(r['document-uri'] || r['documentURL']),
        sample: sanitize(r['script-sample'] || r['sample']),
      }));
    }
  } catch {
    // 파싱 실패는 조용히 무시(스팸/위조 방어). 상태 코드로 정보 노출하지 않는다.
  }

  return new NextResponse(null, { status: 204 });
}
