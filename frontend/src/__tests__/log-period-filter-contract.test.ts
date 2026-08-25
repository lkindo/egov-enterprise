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
 * [왜 이 계약이 필요한가 — 2026-08-26 실측]
 * 로그 엔드포인트 5종이 **서로 다른 날짜 형식**을 파싱한다. 형식을 틀려도 서버는 오류를 내지
 * 않는다 — `catch` 가 조건을 null 로 만들거나(login·privacy) 문자열 비교가 어긋나(system)
 * **조용히 필터가 무시되거나 빈 결과가 된다.** 화면은 "기간을 좁혔다"고 보여 주는데 결과가
 * 전체이거나 0건인 상태는 감사·장애 조사에서 잘못된 결론으로 직결된다.
 *
 * 그래서 각 화면이 고른 형식을 **백엔드 소스와 함께** 고정한다. 백엔드 파싱 규칙이 바뀌면
 * 이 테스트가 red 가 되어 프런트가 따라가야 한다는 사실이 드러난다.
 */
const SCREEN_FORMAT: Array<{ screen: string; client: string; format: 'compact' | 'hyphenated' }> = [
  { screen: 'system', client: 'app/admin/system/logs/system/SystemLogsSystemClient.tsx', format: 'compact' },
  { screen: 'login', client: 'app/admin/system/logs/login/SystemLogsLoginClient.tsx', format: 'compact' },
  { screen: 'user', client: 'app/admin/system/logs/user/SystemLogsUserClient.tsx', format: 'compact' },
  { screen: 'web', client: 'app/admin/system/logs/web/SystemLogsWebClient.tsx', format: 'compact' },
  { screen: 'privacy', client: 'app/admin/system/logs/privacy/SystemLogsPrivacyClient.tsx', format: 'hyphenated' },
];

function client(relativePath: string): string {
  return readFileSync(join(SRC_DIR, relativePath), 'utf8');
}

function backend(relativePath: string): string {
  return readFileSync(join(REPO_DIR, relativePath), 'utf8');
}

describe('로그 조회 기간 계약', () => {
  it('다섯 화면 모두 조회 기간을 제공하고 서버 파라미터로 보낸다', () => {
    for (const { screen, client: path } of SCREEN_FORMAT) {
      const source = client(path);
      expect(source, `${screen}: 조회 기간 컨트롤이 없습니다`).toMatch(/<PeriodFilter/);
      expect(source, `${screen}: 기간이 요청 파라미터에 실리지 않습니다`).toMatch(/\.\.\.periodToParams\(period, '/);
      // queryKey 에 없으면 기간을 바꿔도 캐시가 돌아와 컨트롤이 조용히 죽는다.
      expect(source, `${screen}: 기간이 queryKey 에 결속되지 않았습니다`)
        .toMatch(/queryKey: \[[^\]]*periodToParams\(period, '[a-z]+'\)\]/);
    }
  });

  it('화면이 고른 날짜 형식이 각 엔드포인트의 실제 파싱 규칙과 일치한다', () => {
    const chosen = new Map(SCREEN_FORMAT.map(({ screen, client: path, format }) => {
      const matched = client(path).match(/periodToParams\(period, '(compact|hyphenated)'\)/);
      return [screen, { declared: format, actual: matched?.[1] }];
    }));

    for (const [screen, { declared, actual }] of chosen) {
      expect(actual, `${screen}: 선언과 실제 호출이 다릅니다`).toBe(declared);
    }

    const repoBase = 'business-core/src/main/java/nuri/business/domain/log';

    // system: 하이픈 제거 없이 8자리 컬럼과 문자열 비교한다.
    const sysLog = backend(`${repoBase}/SysLogRepositoryImpl.java`);
    expect(sysLog).toMatch(/ocrnYmd\.trim\(\)\.between\(searchBgnDe, searchEndDe\)/);
    expect(sysLog, 'system 이 하이픈을 제거하기 시작했다면 프런트 형식을 다시 판정해야 한다')
      .not.toMatch(/searchBgnDe\.replace\("-", ""\)/);
    expect(backend('business-core/src/main/java/nuri/business/domain/log/SysLog.java'))
      .toMatch(/@Column\(length = 8\)\s*\n\s*private String ocrnYmd;/);

    // login: yyyyMMdd 로 파싱한다(하이픈이 있으면 예외 → 조건 무시).
    expect(backend(`${repoBase}/LoginLogRepositoryImpl.java`))
      .toMatch(/DateTimeFormatter\.ofPattern\("yyyyMMdd"\)/);

    // privacy: yyyy-MM-dd 로 파싱한다.
    expect(backend(`${repoBase}/PrivacyLogRepositoryImpl.java`))
      .toMatch(/DateTimeFormatter\.ofPattern\("yyyy-MM-dd"\)/);

    // user·web: 하이픈을 제거하므로 compact 가 안전하다.
    expect(backend(`${repoBase}/UserLogRepositoryImpl.java`)).toMatch(/searchBgnDe\.replace\("-", ""\)/);
    expect(backend(`${repoBase}/WebLogRepositoryImpl.java`)).toMatch(/searchBgnDe\.replace\("-", ""\)/);
  });

  it('모니터링 허브의 목록 탭도 기간을 제공하고, 감사 검색이 서버 필드명을 쓴다', () => {
    const hub = client('app/admin/system/monitoring/MonitoringHubClient.tsx');

    expect(hub, '모니터링 허브에 조회 기간이 없습니다').toMatch(/<PeriodFilter/);
    expect(hub, '기간이 요청 파라미터에 실리지 않습니다').toMatch(/\.\.\.periodToParams\(period, 'compact'\)/);

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

  it('한쪽만 입력된 기간은 서버로 보내지 않는다', () => {
    // 저장소가 between 을 쓰므로 한쪽만 주면 조건이 통째로 무시된다 —
    // 화면은 좁혀졌다고 보여 주는데 결과는 전체인 상태가 가장 위험하다.
    expect(periodToParams({ from: '2026-08-01', to: '' }, 'compact')).toEqual({});
    expect(periodToParams({ from: '', to: '2026-08-26' }, 'compact')).toEqual({});
    expect(periodToParams(EMPTY_PERIOD, 'compact')).toEqual({});
  });

  it('형식 변환이 엔드포인트 계약대로 동작한다', () => {
    const period = { from: '2026-08-01', to: '2026-08-26' };
    expect(periodToParams(period, 'compact')).toEqual({
      searchKeywordFrom: '20260801',
      searchKeywordTo: '20260826',
    });
    expect(periodToParams(period, 'hyphenated')).toEqual({
      searchKeywordFrom: '2026-08-01',
      searchKeywordTo: '2026-08-26',
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
