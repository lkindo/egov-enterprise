/**
 * 부하 레벨별 테스트 시나리오
 *
 * 동시 사용자 100/500/1000 명 부하 테스트를 실행합니다.
 *
 * 실행 방법 (K6_SCENARIO 환경변수로 선택):
 *   K6_SCENARIO=users-100  k6 run load-levels.js
 *   K6_SCENARIO=users-500  k6 run load-levels.js
 *   K6_SCENARIO=users-1000 k6 run load-levels.js
 *
 *   ⚠ K6_SCENARIO 를 지정하지 않으면 **세 시나리오가 동시에** 돈다(합계 1600 VU · 약 20분).
 *   의도적으로 그러는 경우가 아니라면 항상 지정할 것.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Config, defaultOptions } from '../config.js';
import { AuthTokenManager } from '../utils.js';
import { hasDashboardResponse, hasPageResponse, verifySettledDashboard } from '../response-contracts.mjs';
import { createHtmlReport, textSummary } from '../utils/report.js';

const NOTICE_BOARD = __ENV.LOAD_TEST_NOTICE_BOARD_ID || 'BBSMSTR_AAAAAAAAAAAA';
const TASK_BOARD = __ENV.LOAD_TEST_TASK_BOARD_ID || 'BBSMSTR_CCCCCCCCCCCC';
// k6 isolates module state per VU. The last confirmed count is visible before our next SELECT.
let observedNoticeTotal = 0;

/** 정의된 부하 레벨 전체. K6_SCENARIO 로 이 중 하나만 골라 돌린다. */
const ALL_SCENARIOS = {
    // 100 명 동시 사용자
    'users-100': {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 100 },  // 1 분에 걸쳐 100 VU 로 증가
        { duration: '3m', target: 100 },  // 3 분간 100 VU 유지
        { duration: '1m', target: 0 },    // 1 분에 걸쳐 0 VU 로 감소
      ],
      gracefulRampDown: '10s',
      tags: { load_level: '100' },
    },

    // 500 명 동시 사용자
    'users-500': {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 500 },  // 2 분에 걸쳐 500 VU 로 증가
        { duration: '5m', target: 500 },  // 5 분간 500 VU 유지
        { duration: '2m', target: 0 },    // 2 분에 걸쳐 0 VU 로 감소
      ],
      gracefulRampDown: '10s',
      tags: { load_level: '500' },
    },

    // 1000 명 동시 사용자
    'users-1000': {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 1000 },  // 5 분에 걸쳐 1000 VU 로 증가
        { duration: '10m', target: 1000 }, // 10 분간 1000 VU 유지
        { duration: '5m', target: 0 },     // 5 분에 걸쳐 0 VU 로 감소
      ],
      gracefulRampDown: '10s',
      tags: { load_level: '1000' },
    },
};

/**
 * K6_SCENARIO 로 지정된 시나리오 하나만 남긴다.
 *
 * <p>미지정이면 전체를 돌려주는데(기존 거동 보존), 그건 1600 VU 동시 실행이라
 * 사실상 의도한 경우가 아니다. 오타로 조용히 "전체 실행" 이 되는 사고를 막기 위해,
 * 값이 있는데 목록에 없으면 **즉시 실패**시킨다 — 잘못된 이름으로 20분짜리를 돌리는 것보다 낫다.
 */
function selectedScenarios() {
  const name = __ENV.K6_SCENARIO;
  if (!name) {
    return ALL_SCENARIOS;
  }
  const picked = ALL_SCENARIOS[name];
  if (!picked) {
    throw new Error(
      `알 수 없는 K6_SCENARIO: "${name}". 가능한 값: ${Object.keys(ALL_SCENARIOS).join(', ')}`
    );
  }
  return { [name]: picked };
}

export const options = {
  summaryTrendStats: defaultOptions.summaryTrendStats,
  tags: {
    api: 'mixed',
    test_type: 'load-level',
  },

  // check() 는 정확성(상태·응답 계약)만 보고 100% 를 요구한다. 지연은 요청 하나가 아니라 분포로
  // 판정한다 — [2026-09-14] 종전에는 요청별 지연을 check() 에 넣어, 오류율 0%·p95 236ms 인 실행이
  // 공유 러너에서 느린 요청 17건(2만 9천여 건 중) 때문에 checks rate==1 을 넘지 못하고 실패했다.
  thresholds: {
    checks: ['rate==1'],
    http_req_duration: ['p(95)<1000'],
    'http_req_duration{endpoint:login}': ['p(95)<500'],
    'http_req_duration{endpoint:dashboard}': ['p(95)<800'],
    'http_req_duration{endpoint:users-list}': ['p(95)<600'],
    'http_req_duration{endpoint:create-post}': ['p(95)<1000'],
    http_req_failed: ['rate<0.01'],
  },

  scenarios: selectedScenarios(),
};

/**
 * 테스트 설정 - 로그인하여 토큰 획득
 */
export function setup() {
  console.log(`Starting load level test: ${__ENV.K6_SCENARIO || 'default'}`);

  const token = new AuthTokenManager().login(Config.TEST_USERNAME, Config.TEST_PASSWORD);
  const loopback = /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/i.test(Config.BASE_URL);
  const seedEmpty = loopback && __ENV.LOAD_TEST_SEED_EMPTY_BOARDS === 'true';
  const references = readDashboardReferences(token, seedEmpty);
  if (!hasDashboardResponse(readDashboard(token), references)) throw new Error('Dashboard does not match the reference boards');
  return { token, references, startTime: new Date().toISOString(), loadLevel: __ENV.K6_SCENARIO || 'default' };
}

function dashboardBoardReference(token, boardId, seedEmpty) {
  const headers = Config.getAuthHeaders(token);
  const url = `${Config.BASE_URL}${Config.API_PREFIX}/boards/${boardId}?page=1&size=5`;
  const response = http.get(url, { headers });
  if (response.status !== 200 || !hasPageResponse(response.body)) throw new Error('Cannot read dashboard reference board');
  const page = response.json('data');
  if (page.list.length > Math.min(page.total, 5)) throw new Error('Unexpected dashboard reference page size');
  if (page.total === 0 && seedEmpty) {
    const created = createLoadPost(token, boardId);
    if (created.status !== 201 || created.json('success') !== true) throw new Error('Cannot seed dashboard reference board');
    const id = created.json('data');
    if (!Number.isSafeInteger(id) || id < 1) throw new Error('Invalid dashboard fixture post ID');
    return { boardId, total: 1, ids: [id] };
  }
  return { boardId, total: page.total, ids: page.list.map(item => item.pstSn) };
}

function readDashboardReferences(token, seedEmpty) {
  return {
    task: dashboardBoardReference(token, TASK_BOARD, seedEmpty),
    notice: dashboardBoardReference(token, NOTICE_BOARD, seedEmpty),
  };
}

function readDashboard(token) {
  const response = http.get(`${Config.BASE_URL}${Config.API_PREFIX}/dashboard`, { headers: Config.getAuthHeaders(token) });
  if (response.status !== 200) throw new Error('Cannot read dashboard');
  return response.body;
}

/**
 * 메인 테스트 함수 - 혼합 시나리오
 */
export default function (data) {
  const scenario = Math.random();

  // [2026-11-17] 로그인 비중 40% → 10%. 2026-11-14 비밀번호 해시 비용을 10 에서 12 로 올리면서(OWASP 하한, 로그인 한 번의
  //   CPU 작업량 4배) 반복의 40% 를 로그인으로 채우던 혼합은 실제 사용(세션당 한 번 로그인)과 멀어졌고, 같은 러너의 CPU 를
  //   해시가 차지해 지연 기준이 해시 비용을 재게 됐다. 나머지 셋은 종전 비율(3:2:1)을 그대로 키웠다. 로그인 지연 기준
  //   (p95<500ms)은 바꾸지 않는다. 함께 고친 것: 로그인이 해시 동안 DB 연결을 붙잡아 다른 요청까지 풀 대기 초과로 실패하던
  //   결함(EgovAuthenticationProvider) — 혼합만 바꿔 붉은 신호를 지우지 않는다.
  // 10% 로그인 API
  if (scenario < 0.1) {
    runLoginTest();
  }
  // 45% 대시보드 조회
  else if (scenario < 0.55) {
    runDashboardTest(data.token, data.references);
  }
  // 30% 사용자 목록 조회
  else if (scenario < 0.85) {
    runUsersListTest(data.token);
  }
  // 15% 게시글 등록
  else {
    runPostCreateTest(data.token);
  }
}

/**
 * 로그인 API 테스트
 */
function runLoginTest() {
  // [2026-08-09 계약 정정] 종전 `/api/v1/login` + `{username}` 은 실제 API 와 어긋났다.
  //   실제는 `/api/v1/auth/login` + LoginRequest{userId, password} 다.
  //   setup() 의 AuthTokenManager 와 같은 계약이어야 하므로 함께 맞춘다
  //   (여기만 틀리면 전체 트래픽의 40% 가 404 를 받으면서도 "부하 테스트 성공" 으로 보고된다).
  const url = `${Config.BASE_URL}${Config.API_PREFIX}/auth/login`;
  const payload = {
    userId: Config.TEST_USERNAME,
    password: Config.TEST_PASSWORD,
  };

  const response = http.post(url, JSON.stringify(payload), {
    headers: Config.getDefaultHeaders(),
    tags: { endpoint: 'login' },
  });

  check(response, {
    'login status is 200': (r) => r.status === 200,
  });

  sleep(1);
}

/**
 * 대시보드 조회 테스트
 */
function runDashboardTest(token, references) {
  const url = `${Config.BASE_URL}${Config.API_PREFIX}/dashboard`;

  const response = http.get(url, {
    headers: Config.getAuthHeaders(token),
    tags: { endpoint: 'dashboard' },
  });

  check(response, {
    'dashboard status is 200': (r) => r.status === 200,
    'dashboard serves both reference boards': (r) => {
      if (!hasDashboardResponse(r.body, references, true, observedNoticeTotal)) return false;
      observedNoticeTotal = r.json('data.notiListTotal');
      return true;
    },
  });

  sleep(2);
}

/**
 * 사용자 목록 조회 테스트
 */
function runUsersListTest(token) {
  const url = `${Config.BASE_URL}${Config.API_PREFIX}/admin/system/users`;
  // [ADR-0036] page 는 1 기반이다. 종전 0 기반 서버에서는 1..5 가 둘째~여섯째 페이지라 첫 페이지를 한 번도 재지 않았다.
  const page = Math.floor(Math.random() * 5) + 1;

  const response = http.get(`${url}?page=${page}&size=10`, {
    headers: Config.getAuthHeaders(token),
    tags: { endpoint: 'users-list' },
  });

  check(response, {
    'users list status is 200': (r) => r.status === 200,
    'users list matches ApiResponse PageResponse': (r) => hasPageResponse(r.body),
  });

  sleep(2);
}

/**
 * 게시글 등록 테스트
 */
function createLoadPost(token, boardId, params = {}) {
  const url = `${Config.BASE_URL}${Config.API_PREFIX}/boards/posts`;
  const uniqueId = Math.random().toString(36).substring(2, 10);
  const expiresOn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, '');

  // [2026-08-09 계약 정정] 종전 필드명은 eGov 레거시(nttSj/nttCn/ntceBgnde/ntceEndde)였다.
  //   현행 BoardSaveRequest 의 필수 필드는 bbsId·pstTtl·pstCn 이다. 테스트 게시글은 일주일 뒤 게시를 끝낸다.
  //   실측: 옛 필드명으로 POST 하면 **HTTP 400** 이다(검증 실패로 필수 3종이 비어 있다고 판정).
  const payload = {
    bbsId: boardId,
    pstTtl: `[부하테스트] 게시글 ${uniqueId}`,
    pstCn: `k6 부하 테스트 자동 생성 게시글 (ID: ${uniqueId})`,
    pstEndYmd: expiresOn,
  };

  const headers = Config.getAuthHeaders(token);
  // setup()은 로그인과 같은 쿠키 저장소를 쓴다. 쿠키를 동반한 쓰기는 SPA와 같은 CSRF 헤더가 필요하다.
  const csrf = http.cookieJar().cookiesForURL(url)['XSRF-TOKEN']?.[0];
  if (csrf) headers['X-XSRF-TOKEN'] = csrf;
  return http.post(url, JSON.stringify(payload), { ...params, headers });
}

function runPostCreateTest(token) {
  const response = createLoadPost(token, NOTICE_BOARD, { tags: { endpoint: 'create-post' } });
  check(response, {
    // [ADR-0036] 자원을 만드는 POST 는 201 이다.
    'create post status is 201': (r) => r.status === 201,
  });

  sleep(3);
}

/**
 * 정리 함수
 */
export function teardown(data) {
  verifySettledDashboard(() => readDashboardReferences(data.token, false), () => readDashboard(data.token));
  console.log('Load level test completed.');
  console.log(`Load Level: ${data.loadLevel}`);
  console.log(`Test started at: ${data.startTime}`);
  console.log(`Test completed at: ${new Date().toISOString()}`);
}

/**
 * k6의 setup_data에는 인증 토큰이 있다. 공개 측정값만 JSON·HTML에 전달한다.
 */
export function handleSummary({ root_group, options, state, metrics }) {
  const data = { root_group, options, state, metrics };
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const loadLevel = __ENV.K6_SCENARIO || 'all-1600';

  const reportTitle = `k6 Load Test Report - ${loadLevel} Users (${timestamp})`;

  return {
    [`test/load-tests/results/summary-${loadLevel}-${timestamp}.json`]: JSON.stringify(data, null, 2),
    [`test/load-tests/results/report-${loadLevel}-${timestamp}.html`]: createHtmlReport(data, {
      title: reportTitle,
      theme: 'dark',
      showChart: true,
    }),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
