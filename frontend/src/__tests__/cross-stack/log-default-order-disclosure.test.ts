import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REPO_DIR = join(SRC_DIR, '..', '..');

/**
 * 로그 목록의 **기본 정렬 순서**를 화면이 밝히는지 고정한다.
 *
 * [왜 필요한가 — 2026-08-26 실측]
 * GAP-UI-001 은 "표 정렬이 현재 페이지 범위라 전체에서 가장 최근 N건을 얻는 경로가 없다"고
 * 기록돼 있었다. 그런데 저장소 5종을 실측하니 **서버가 이미 전부 최신순으로 정렬해서 내려준다**
 * (`ocrnYmd.desc()` · `crtDt.desc()` · `occrYmd.desc()` · `inqDt.desc()`). 즉 조건을 좁힌 결과의
 * 1페이지가 곧 "전체에서 가장 최근 N건"이다.
 *
 * 빠져 있던 것은 기능이 아니라 **그 사실을 화면이 말하지 않는다는 점**이었다. 사용자는 표 안의
 * 페이지 범위 정렬 컨트롤만 보고 "정렬을 직접 해야 최신순"이라고 오해할 수 있다.
 *
 * ⚠ 이 계약은 문구와 백엔드 정렬을 **함께** 본다. 저장소의 `orderBy` 가 바뀌면 화면 문구가
 *   거짓이 되므로, 그때 이 테스트가 red 가 되어 둘을 같이 고치게 만든다.
 */
const SCREENS = [
  {
    screen: 'system',
    client: 'app/admin/system/logs/system/SystemLogsSystemClient.tsx',
    phrase: '발생일자 최신순',
    repository: 'SysLogRepositoryImpl.java',
    orderBy: /ocrnYmd\.desc\(\)/,
  },
  {
    screen: 'login',
    client: 'app/admin/system/logs/login/SystemLogsLoginClient.tsx',
    phrase: '접속일시 최신순',
    repository: 'LoginLogRepositoryImpl.java',
    orderBy: /crtDt\.desc\(\)/,
  },
  {
    screen: 'user',
    client: 'app/admin/system/logs/user/SystemLogsUserClient.tsx',
    phrase: '발생일자 최신순',
    repository: 'UserLogRepositoryImpl.java',
    orderBy: /cb\.desc\(root\.get\("ocrnYmd"\)\)/,
  },
  {
    screen: 'web',
    client: 'app/admin/system/logs/web/SystemLogsWebClient.tsx',
    phrase: '발생일자 최신순',
    repository: 'WebLogRepositoryImpl.java',
    orderBy: /occrYmd\.desc\(\)/,
  },
  {
    screen: 'privacy',
    client: 'app/admin/system/logs/privacy/SystemLogsPrivacyClient.tsx',
    phrase: '조회일시 최신순',
    repository: 'PrivacyLogRepositoryImpl.java',
    orderBy: /inqDt\.desc\(\)/,
  },
];

const REPO_BASE = 'business-core/src/main/java/nuri/business/domain/log';

describe('로그 기본 정렬 고지', () => {
  it('다섯 화면 모두 기본 정렬이 최신순임을 밝힌다', () => {
    for (const { screen, client, phrase } of SCREENS) {
      const source = readFileSync(join(SRC_DIR, client), 'utf8');
      expect(source, `${screen}: 기본 정렬을 밝히지 않습니다`).toContain(phrase);
    }
  });

  it('화면이 말하는 정렬이 서버의 실제 정렬과 일치한다', () => {
    // 문구만 고정하면 저장소가 정렬을 바꿨을 때 화면이 거짓말을 하게 된다.
    for (const { screen, repository, orderBy } of SCREENS) {
      const source = readFileSync(join(REPO_DIR, REPO_BASE, repository), 'utf8');
      expect(source, `${screen}: 저장소의 기본 정렬이 바뀌었습니다 — 화면 문구도 함께 고쳐야 합니다`)
        .toMatch(orderBy);
    }
  });
});
