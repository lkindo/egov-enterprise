import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const APP_DIR = join(FRONTEND_DIR, 'src', 'app');

/**
 * 진입 애니메이션 차단 게이트.
 *
 * 정본 스펙: docs/02-architecture/work-screen-grammar-catalog.md §3 —
 * **금지: 진입 애니메이션으로 첫 데이터 행 도달을 지연시키기.**
 *
 * 업무 화면에서 페이지 전체를 감싸는 fade-in 은 "예쁘게 등장하는" 대신 **조회 결과를 늦게
 * 보여 주는** 비용만 남긴다. 하루에 같은 화면을 수십 번 여는 사용자에게는 그 지연이 매번 쌓인다.
 * 2026-08-26 실측에서 21개 화면이 700~1000ms 짜리 래퍼를 갖고 있었다.
 *
 * ⚠ 모든 애니메이션을 금지하는 게 아니다. 오버레이(다이얼로그·팝오버·드롭다운)의 등장과
 *   로딩 스켈레톤의 페이드는 **상태 전환 자체를 알리는 신호**라 유지한다 — 아래에 이유와 함께
 *   나열하고, 목록에 없는 신규 사용은 red 다.
 */
const ALLOWED: Record<string, string> = {
  'src/app/admin/loading.tsx':
    '로딩 스켈레톤 자체의 페이드 — 지연시킬 데이터가 아직 없다',
  'src/app/components/ui/global-command-center.tsx':
    '커맨드 팔레트 오버레이 등장 — 열림/닫힘 상태 전환 신호',
  'src/app/components/ui/smart-notification-hub.tsx':
    '알림 드롭다운 패널 등장 — 열림/닫힘 상태 전환 신호',
  'src/app/admin/system/monitoring/components/MonitoringPanels.tsx':
    '탭 내부 패널 전환 — 페이지 진입이 아니라 선택 결과 교체 신호',
  // 아래 둘은 next.config 리다이렉트로 도달 불가한 화면이라 사용자에게 보이는 변화가 없다.
  // 손대지 않는다는 판단을 기록으로 남긴다(DEC-OPS-023).
  'src/app/admin/security/login-policy/LoginPolicyAdminClient.tsx':
    '도달 불가(리다이렉트) 화면 — 이행 대상이 아니다',
  'src/app/admin/system/audit/AuditTimelineClient.tsx':
    '도달 불가(리다이렉트) 화면 — 이행 대상이 아니다',
  'src/app/cop/sms/selectSmsList/SmsHubClient.tsx':
    '도달 불가(리다이렉트) alias — 이행 대상이 아니다',
};

const ENTRY_ANIMATION = /animate-in fade-in duration-\d+/;

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(path);
    if (!entry.name.endsWith('.tsx') || entry.name.endsWith('.test.tsx')) return [];
    return [path];
  });
}

function offenders(): string[] {
  return sourceFiles(APP_DIR)
    .filter((path) => ENTRY_ANIMATION.test(readFileSync(path, 'utf8')))
    .map((path) => relative(FRONTEND_DIR, path).split(sep).join('/'))
    .sort();
}

describe('진입 애니메이션 차단', () => {
  it('허용 목록 밖의 화면은 진입 페이드를 쓰지 않는다', () => {
    const unexpected = offenders().filter((path) => !(path in ALLOWED));

    expect(
      unexpected,
      `진입 애니메이션이 되살아났습니다:\n${unexpected.join('\n')}\n`
        + '업무 화면에서 페이지 래퍼 fade-in 은 첫 데이터 행 도달만 늦춘다(카탈로그 §3).',
    ).toEqual([]);
  });

  it('허용 목록에 사유가 사라진 항목이 남아 있지 않다', () => {
    // 사유 없는 예외가 남으면 다음 사람이 "여기는 원래 그래도 된다"고 읽는다.
    const current = new Set(offenders());
    const stale = Object.keys(ALLOWED).filter((path) => !current.has(path));

    expect(stale, `사유가 없어진 예외: ${stale.join(', ')}`).toEqual([]);
  });
});
