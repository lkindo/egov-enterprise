/**
 * 로그인 API 부하 테스트 시나리오
 * 
 * 사용자 인증 API 의 성능을 테스트합니다.
 * 
 * 실행 방법:
 *   k6 run login-test.js  # 아래에 정의된 모든 시나리오 실행
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Config } from '../config.js';

export const options = {
  // 태그 설정
  tags: {
    api: 'auth',
    endpoint: 'login',
  },
  
  // 기본 임계값
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% 요청이 500ms 이내
    http_req_failed: ['rate<0.01'],   // 1% 미만 실패
    checks: ['rate>0.99'],             // 99% 이상 성공
  },
  
  // 시나리오 정의
  scenarios: {
    // 1. 스모크 테스트 (기본 동작 확인)
    smoke: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      gracefulStop: '5s',
      tags: { test_type: 'smoke' },
    },
    
    // 2. 부하 테스트 (일반 부하)
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },   // 30 초에 걸쳐 50 VU 로 증가
        { duration: '1m', target: 50 },    // 1 분간 50 VU 유지
        { duration: '30s', target: 0 },    // 30 초에 걸쳐 0 VU 로 감소
      ],
      gracefulRampDown: '10s',
      tags: { test_type: 'load' },
    },
    
    // 3. 스트레스 테스트 (한계점 확인)
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 100 },   // 1 분에 걸쳐 100 VU 로 증가
        { duration: '2m', target: 100 },   // 2 분간 100 VU 유지
        { duration: '1m', target: 200 },   // 1 분에 걸쳐 200 VU 로 증가
        { duration: '2m', target: 200 },   // 2 분간 200 VU 유지
        { duration: '1m', target: 0 },     // 1 분에 걸쳐 0 VU 로 감소
      ],
      gracefulRampDown: '10s',
      tags: { test_type: 'stress' },
    },
  },
};

/**
 * 로그인 API 테스트
 */
export default function () {
  const url = `${Config.BASE_URL}${Config.API_PREFIX}/login`;
  
  // 테스트용 사용자 계정 (환경 변수로 설정 가능)
  const username = Config.TEST_USERNAME;
  const password = Config.TEST_PASSWORD;
  
  const payload = {
    username: username,
    password: password,
  };
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };
  
  // POST 요청 전송
  const response = http.post(url, JSON.stringify(payload), params);
  
  // 응답 검증
  const loginSuccess = check(response, {
    'login status is 200': (r) => r.status === 200,
    'login response time < 300ms': (r) => r.timings.duration < 300,
    'login response has token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.token !== undefined && body.token !== null;
      } catch (e) {
        return false;
      }
    },
    'login response has user info': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.user !== undefined && body.user.id !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
  
  // 결과 로깅
  if (!loginSuccess) {
    console.error(`Login failed: status=${response.status}, body=${response.body}`);
  }
  
  // 사용자 행동 모사 (1-3 초 대기)
  sleep(Math.random() * 2 + 1);
}

/**
 * setup 함수: 테스트 전 한 번 실행
 */
export function setup() {
  console.log('Starting login load test...');
  console.log(`Target URL: ${Config.BASE_URL}${Config.API_PREFIX}/login`);
  console.log(`Test username: ${Config.TEST_USERNAME}`);
  
  return {
    startTime: new Date().toISOString(),
    testType: __ENV.K6_SCENARIO || 'default',
  };
}

/**
 * teardown 함수: 테스트 후 한 번 실행
 */
export function teardown(data) {
  console.log('Login load test completed.');
  console.log(`Test duration: ${new Date().toISOString()}`);
  console.log(`Test type: ${data.testType}`);
}
