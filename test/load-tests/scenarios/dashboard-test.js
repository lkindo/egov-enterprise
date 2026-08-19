/**
 * 대시보드 조회 API 부하 테스트 시나리오
 * 
 * 인증된 사용자의 대시보드 데이터 조회 성능을 테스트합니다.
 * 
 * 실행 방법:
 *   k6 run dashboard-test.js  # 아래에 정의된 모든 시나리오 실행
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Config } from '../config.js';
import { AuthTokenManager, HttpClient, checkSuccessResponse } from '../utils.js';

export const options = {
  tags: {
    api: 'dashboard',
    endpoint: 'main',
  },
  
  thresholds: {
    http_req_duration: ['p(95)<800'], // 95% 요청이 800ms 이내 (대시보드는 여러 데이터 조회)
    http_req_failed: ['rate<0.01'],   // 1% 미만 실패
  },
  
  scenarios: {
    // 1. 스모크 테스트
    smoke: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      gracefulStop: '5s',
      tags: { test_type: 'smoke' },
    },
    
    // 2. 부하 테스트
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 30 },   // 30 초에 걸쳐 30 VU 로 증가
        { duration: '1m', target: 30 },    // 1 분간 30 VU 유지
        { duration: '30s', target: 0 },    // 30 초에 걸쳐 0 VU 로 감소
      ],
      gracefulRampDown: '10s',
      tags: { test_type: 'load' },
    },
    
    // 3. 스트레스 테스트
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '2m', target: 50 },
        { duration: '1m', target: 100 },
        { duration: '2m', target: 100 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '10s',
      tags: { test_type: 'stress' },
    },
  },
};

/**
 * 테스트 설정 함수
 */
export function setup() {
  console.log('Starting dashboard load test...');
  
  // 로그인하여 토큰 획득
  const authManager = new AuthTokenManager();
  
  try {
    const token = authManager.login(Config.TEST_USERNAME, Config.TEST_PASSWORD);
    console.log('Login successful, token obtained');
    
    return {
      token: token,
      startTime: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Setup failed: Could not obtain authentication token');
    throw error;
  }
}

/**
 * 메인 테스트 함수
 */
export default function (data) {
  const url = `${Config.BASE_URL}${Config.API_PREFIX}/dashboard`;
  
  const headers = {
    ...Config.getDefaultHeaders(),
    'Authorization': `Bearer ${data.token}`,
  };
  
  const response = http.get(url, { headers });
  
  // 응답 검증
  const success = check(response, {
    'dashboard status is 200': (r) => r.status === 200,
    'dashboard response time < 800ms': (r) => r.timings.duration < 800,
    'dashboard response has taskList': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.result && body.result.taskList !== undefined;
      } catch (e) {
        return false;
      }
    },
    'dashboard response has notiList': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.result && body.result.notiList !== undefined;
      } catch (e) {
        return false;
      }
    },
    'dashboard response has pendingApprovalCount': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.result && typeof body.result.pendingApprovalCount === 'number';
      } catch (e) {
        return false;
      }
    },
  });
  
  if (!success) {
    console.error(`Dashboard fetch failed: status=${response.status}`);
  }
  
  // 사용자 행동 모사 (2-5 초 대기)
  sleep(Math.random() * 3 + 2);
}

/**
 * 정리 함수
 */
export function teardown(data) {
  console.log('Dashboard load test completed.');
  console.log(`Test started at: ${data.startTime}`);
  console.log(`Test completed at: ${new Date().toISOString()}`);
}
