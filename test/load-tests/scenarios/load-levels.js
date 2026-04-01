/**
 * 부하 레벨별 테스트 시나리오
 * 
 * 동시 사용자 100/500/1000 명 부하 테스트를 실행합니다.
 * 
 * 실행 방법:
 *   # 100 명 시나리오
 *   k6 run --scenario users-100 load-levels.js
 *   
 *   # 500 명 시나리오
 *   k6 run --scenario users-500 load-levels.js
 *   
 *   # 1000 명 시나리오
 *   k6 run --scenario users-1000 load-levels.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Config } from '../config.js';
import { AuthTokenManager } from '../utils.js';
import { createHtmlReport, textSummary } from '../utils/report.js';

export const options = {
  tags: {
    api: 'mixed',
    test_type: 'load-level',
  },

  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.01'],
  },

  scenarios: {
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
  },
};

/**
 * 테스트 설정 - 로그인하여 토큰 획득
 */
export function setup() {
  console.log(`Starting load level test: ${__ENV.K6_SCENARIO || 'default'}`);

  const authManager = new AuthTokenManager();

  try {
    const token = authManager.login(Config.TEST_USERNAME, Config.TEST_PASSWORD);
    console.log('Login successful, token obtained');

    return {
      token: token,
      startTime: new Date().toISOString(),
      loadLevel: __ENV.K6_SCENARIO || 'default',
    };
  } catch (error) {
    console.error('Setup failed: Could not obtain authentication token');
    throw error;
  }
}

/**
 * 메인 테스트 함수 - 혼합 시나리오
 */
export default function (data) {
  const scenario = Math.random();

  // 40% 로그인 API
  if (scenario < 0.4) {
    runLoginTest();
  }
  // 30% 대시보드 조회
  else if (scenario < 0.7) {
    runDashboardTest(data.token);
  }
  // 20% 사용자 목록 조회
  else if (scenario < 0.9) {
    runUsersListTest(data.token);
  }
  // 10% 게시글 등록
  else {
    runPostCreateTest(data.token);
  }
}

/**
 * 로그인 API 테스트
 */
function runLoginTest() {
  const url = `${Config.BASE_URL}${Config.API_PREFIX}/login`;
  const payload = {
    username: Config.TEST_USERNAME,
    password: Config.TEST_PASSWORD,
  };

  const response = http.post(url, JSON.stringify(payload), {
    headers: Config.getDefaultHeaders(),
  });

  check(response, {
    'login status is 200': (r) => r.status === 200,
    'login response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}

/**
 * 대시보드 조회 테스트
 */
function runDashboardTest(token) {
  const url = `${Config.BASE_URL}${Config.API_PREFIX}/dashboard`;

  const response = http.get(url, {
    headers: Config.getAuthHeaders(token),
  });

  check(response, {
    'dashboard status is 200': (r) => r.status === 200,
    'dashboard response time < 800ms': (r) => r.timings.duration < 800,
  });

  sleep(2);
}

/**
 * 사용자 목록 조회 테스트
 */
function runUsersListTest(token) {
  const url = `${Config.BASE_URL}${Config.API_PREFIX}/admin/system/users`;
  const page = Math.floor(Math.random() * 5) + 1;

  const response = http.get(`${url}?page=${page}&size=10`, {
    headers: Config.getAuthHeaders(token),
  });

  check(response, {
    'users list status is 200': (r) => r.status === 200,
    'users list response time < 600ms': (r) => r.timings.duration < 600,
  });

  sleep(2);
}

/**
 * 게시글 등록 테스트
 */
function runPostCreateTest(token) {
  const url = `${Config.BASE_URL}${Config.API_PREFIX}/boards/posts`;
  const uniqueId = Math.random().toString(36).substring(2, 10);

  const payload = {
    bbsId: 'BBSMSTR_AAAAAAAAAAAA',
    nttSj: `[부하테스트] 게시글 ${uniqueId}`,
    nttCn: `k6 부하 테스트 자동 생성 게시글 (ID: ${uniqueId})`,
    ntceBgnde: '20260401',
    ntceEndde: '20261231',
  };

  const response = http.post(url, JSON.stringify(payload), {
    headers: Config.getAuthHeaders(token),
  });

  check(response, {
    'create post status is 200': (r) => r.status === 200,
    'create post response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  sleep(3);
}

/**
 * 정리 함수
 */
export function teardown(data) {
  console.log('Load level test completed.');
  console.log(`Load Level: ${data.loadLevel}`);
  console.log(`Test started at: ${data.startTime}`);
  console.log(`Test completed at: ${new Date().toISOString()}`);
}

/**
 * HTML 리포트 생성
 */
export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const loadLevel = data.root_group?.checks?.[0]?.name?.includes('100') ? '100' :
    data.root_group?.checks?.[0]?.name?.includes('500') ? '500' :
      data.root_group?.checks?.[0]?.name?.includes('1000') ? '1000' : 'unknown';

  const reportTitle = `k6 Load Test Report - ${loadLevel} Users (${timestamp})`;

  return {
    [`test/load-tests/results/report-${loadLevel}-${timestamp}.html`]: createHtmlReport(data, {
      title: reportTitle,
      theme: 'dark',
      showChart: true,
    }),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
