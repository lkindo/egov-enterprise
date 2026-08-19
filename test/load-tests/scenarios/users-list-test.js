/**
 * 사용자 목록 조회 API 부하 테스트 시나리오
 * 
 * 관리자용 사용자 목록 조회 성능을 테스트합니다.
 * 
 * 실행 방법:
 *   k6 run users-list-test.js  # 아래에 정의된 모든 시나리오 실행
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Config } from '../config.js';
import { AuthTokenManager } from '../utils.js';

export const options = {
  tags: {
    api: 'user',
    endpoint: 'list-users',
  },
  
  thresholds: {
    http_req_duration: ['p(95)<600'], // 95% 요청이 600ms 이내
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
  },
};

/**
 * 테스트 설정 - 로그인하여 토큰 획득
 */
export function setup() {
  console.log('Starting users list load test...');
  
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
  const url = `${Config.BASE_URL}${Config.API_PREFIX}/admin/system/users`;
  
  const headers = {
    ...Config.getDefaultHeaders(),
    'Authorization': `Bearer ${data.token}`,
  };
  
  // 페이지 번호 랜덤화 (1-5 페이지)
  const page = Math.floor(Math.random() * 5) + 1;
  const size = 10;
  
  const response = http.get(`${url}?page=${page}&size=${size}`, { headers });
  
  // 응답 검증
  const success = check(response, {
    'users list status is 200': (r) => r.status === 200,
    'users list response time < 600ms': (r) => r.timings.duration < 600,
    'users list has content array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.result && Array.isArray(body.result.content);
      } catch (e) {
        return false;
      }
    },
    'users list has pagination': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.result && 
               typeof body.result.page === 'number' && 
               typeof body.result.size === 'number' &&
               typeof body.result.totalElements === 'number';
      } catch (e) {
        return false;
      }
    },
  });
  
  if (!success) {
    console.error(`Users list fetch failed: status=${response.status}`);
  }
  
  // 사용자 행동 모사 (2-4 초 대기)
  sleep(Math.random() * 2 + 2);
}

/**
 * 정리 함수
 */
export function teardown(data) {
  console.log('Users list load test completed.');
  console.log(`Test started at: ${data.startTime}`);
  console.log(`Test completed at: ${new Date().toISOString()}`);
}
