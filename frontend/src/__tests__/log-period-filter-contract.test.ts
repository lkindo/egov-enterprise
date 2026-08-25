import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EMPTY_PERIOD, periodToParams, presetToPeriod } from '@/app/components/patterns/period-filter';

const SRC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_DIR = join(SRC_DIR, '..', '..');

/**
 * A6 조회 기간 계약.
 *
 * 정본 스펙: docs/02-architecture/work-screen-grammar-catalog.md §5 A6.
 *
 * [경위 — 2026-08-26]
 * 로그 저장소 5종은 처음부터 기간 조건을 구현하고 있었는데 화면이 그 값을 보내지 않았다.
 * 배선하면서 두 가지 침묵을 함께 발견해 고쳤다.
 *
 *   1. **엔드포인트마다 파싱 형식이 달랐다** — 틀려도 오류가 아니라 조용한 무시나 빈 결과였다.
 *      백엔드를 `LogSearchPeriod` 로 통일해 두 형식을 모두 받고 해석 불가 값은 400 으로 실패시킨다.
 *   2. **사용자·웹·개인정보 서비스가 기간을 `null` 로 버리고 있었다** — 저장소도 컨트롤러도
 *      기간을 지원하는데 가운데 한 층이 삼켜서, 화면이 좁힌 조건이 사라졌다.
 *
 * 그래서 이 계약은 프런트 배선뿐 아니라 **백엔드가 그 값을 실제로 쓰는지**까지 함께 본다.
 */
const PERIOD_SCREENS = [
  { screen: 'system', client: 'app/admin/system/logs/system/SystemLogsSystemClient.tsx' },
  { screen: 'login', client: 'app/admin/system/logs/login/SystemLogsLoginClient.tsx' },
  { screen: 'user', client: 'app/admin/system/logs/user/SystemLogsUserClient.tsx' },
  { screen: 'web', client: 'app/admin/system/logs/web/SystemLogsWebClient.tsx' },
  { screen: 'privacy', client: 'app/admin/system/logs/privacy/SystemLogsPrivacyClient.tsx' },
];

const LOG_SERVICES = [
  'LogManageService.java',
  'LoginLogManageService.java',
  'UserLogManageService.java',
  'WebLogManageService.java',
  'PrivacyLogManageService.java',
];

function client(relativePath: string): string {
  return readFileSync(join(SRC_DIR, relativePath), 'utf8');
}

function backend(relativePath: string): string {
  return readFileSync(join(REPO_DIR, relativePath), 'utf8');
}

describe('로그 조회 기간 계약', () => {
  it('다섯 화면 모두 조회 기간을 제공하고 서버 파라미터로 보낸다', () => {
    for (const { screen, client: path } of PERIOD_SCREENS) {
      const source = client(path);
      expect(source, `${screen}: 조회 기간 컨트롤이 없습니다`).toMatch(/<PeriodFilter/);
      expect(source, `${screen}: 기간이 요청 파라미터에 실리지 않습니다`).toContain('...periodToParams(period)');
      // queryKey 에 없으면 기간을 바꿔도 캐시가 돌아와 컨트롤이 조용히 죽는다.
      expect(source, `${screen}: 기간이 queryKey 에 결속되지 않았습니다`)
        .toMatch(/queryKey: \[[^\]]*periodToParams\(period\)\]/);
    }
  });

  it('모니터링 허브의 목록 탭도 기간을 제공하고, 감사 검색이 서버 필드명을 쓴다', () => {
    const hub = client('app/admin/system/monitoring/MonitoringHubClient.tsx');

    expect(hub, '모니터링 허브에 조회 기간이 없습니다').toMatch(/<PeriodFilter/);
    expect(hub, '기간이 요청 파라미터에 실리지 않습니다').toContain('...periodToParams(period)');

    /*
     * `/logs/system` 은 `@ModelAttribute BaseSearchDto` 로 바인딩하고 그 필드는 `searchKeyword` 다.
     * 종전에는 `keyword` 를 보내 **검색어가 통째로 무시**됐다(보안 감사 탭에서 무엇을 입력해도
     * 결과가 그대로였다). 서비스 시그니처에서 `keyword` 를 없애 회귀를 타입으로도 막는다.
     */
    const service = client('services/foundation/system/AuditAdminService.ts');
    expect(service, '감사 서비스가 서버 필드명을 쓰지 않습니다').toMatch(/searchKeyword\?: string;/);
    expect(service, '무시되는 keyword 파라미터가 되살아났습니다').not.toMatch(/(?<![A-Za-z])keyword\?: string;/);
    expect(backend('business-core/src/main/java/nuri/business/domain/common/BaseSearchDto.java'))
      .toMatch(/private String searchKeyword = "";/);
  });

  it('백엔드가 두 형식을 모두 받고, 해석 불가 값을 조용히 버리지 않는다', () => {
    const rule = backend('business-core/src/main/java/nuri/business/domain/log/LogSearchPeriod.java');

    // 존재하지 않는 날짜(2월 31일)를 말일로 보정하면 사용자가 지정하지 않은 기간이 만들어진다.
    expect(rule, 'STRICT 리졸버가 아니면 없는 날짜가 말일로 보정된다').toMatch(/ResolverStyle\.STRICT/);
    // 예외는 팩터리 메서드로 만든다 — 던지는 지점과 만드는 지점을 함께 확인해야
    // "조용히 null 반환"으로 되돌아가는 회귀를 잡는다.
    expect(rule, '해석 불가 값을 던지지 않습니다').toMatch(/throw invalid\(/);
    expect(rule, '입력 오류로 알리지 않습니다').toMatch(/new BusinessException\(CommonErrorCode\.INVALID_INPUT_VALUE/);

    // 저장소 5종이 모두 이 규칙을 거쳐야 형식 차이가 사라진다.
    const repoBase = 'business-core/src/main/java/nuri/business/domain/log';
    for (const repository of [
      'SysLogRepositoryImpl.java',
      'LoginLogRepositoryImpl.java',
      'UserLogRepositoryImpl.java',
      'WebLogRepositoryImpl.java',
      'PrivacyLogRepositoryImpl.java',
    ]) {
      expect(backend(`${repoBase}/${repository}`), `${repository} 가 공통 규칙을 쓰지 않습니다`)
        .toContain('LogSearchPeriod.');
    }
  });

  it('서비스 계층이 기간을 저장소까지 넘긴다', () => {
    // 저장소도 컨트롤러도 기간을 지원하는데 가운데 한 층이 null 로 버리면
    // 화면이 좁힌 조건이 조용히 사라진다(2026-08-26 실측: 사용자·웹·개인정보 3종).
    const serviceBase = 'business-core/src/main/java/nuri/business/service/log';
    for (const service of LOG_SERVICES) {
      const source = backend(`${serviceBase}/${service}`);
      expect(source, `${service} 가 기간을 전달하지 않습니다`).toContain('getSearchKeywordFrom()');
      expect(source, `${service} 가 기간을 버리고 있습니다`).not.toContain('null, null, pageable');
    }
  });

  it('한쪽만 입력된 기간은 서버로 보내지 않는다', () => {
    // 저장소가 between 을 쓰므로 한쪽만 주면 조건이 통째로 무시된다 —
    // 화면은 좁혀졌다고 보여 주는데 결과는 전체인 상태가 가장 위험하다.
    expect(periodToParams({ from: '2026-08-01', to: '' })).toEqual({});
    expect(periodToParams({ from: '', to: '2026-08-26' })).toEqual({});
    expect(periodToParams(EMPTY_PERIOD)).toEqual({});
  });

  it('저장소 컬럼 표준과 같은 8자리로 보낸다', () => {
    expect(periodToParams({ from: '2026-08-01', to: '2026-08-26' })).toEqual({
      searchKeywordFrom: '20260801',
      searchKeywordTo: '20260826',
    });
  });

  it('프리셋이 오늘을 포함한 기간을 만든다', () => {
    const today = new Date(2026, 7, 26);
    // '최근 1일' 은 오늘 하루다 — 어제부터가 아니다.
    expect(presetToPeriod('1d', today)).toEqual({ from: '2026-08-26', to: '2026-08-26' });
    expect(presetToPeriod('1w', today)).toEqual({ from: '2026-08-20', to: '2026-08-26' });
    expect(presetToPeriod('1m', today)).toEqual({ from: '2026-07-28', to: '2026-08-26' });
    expect(presetToPeriod('all', today)).toEqual(EMPTY_PERIOD);
  });
});
