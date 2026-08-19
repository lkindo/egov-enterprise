/**
 * 게시글 등록 API 부하 테스트 시나리오
 * 
 * 게시글 생성 성능을 테스트합니다.
 * 
 * 실행 방법:
 *   k6 run post-create-test.js  # 아래에 정의된 모든 시나리오 실행
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Config } from '../config.js';
import { AuthTokenManager, generateUuid } from '../utils.js';

export const options = {
  tags: {
    api: 'board',
    endpoint: 'create-post',
  },
  
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% 요청이 1000ms 이내
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
        { duration: '30s', target: 20 },   // 30 초에 걸쳐 20 VU 로 증가
        { duration: '1m', target: 20 },    // 1 분간 20 VU 유지
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
  console.log('Starting post creation load test...');
  
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
  const url = `${Config.BASE_URL}${Config.API_PREFIX}/boards/posts`;
  
  const headers = {
    ...Config.getDefaultHeaders(),
    'Authorization': `Bearer ${data.token}`,
  };
  
  // 고유한 제목과 내용 생성
  const uniqueId = generateUuid();
  const payload = {
    bbsId: 'BBSMSTR_AAAAAAAAAAAA', // 공지사항 게시판
    nttSj: `[부하테스트] 게시글 ${uniqueId.substring(0, 8)}`,
    nttCn: `이 글은 k6 부하 테스트를 위해 자동으로 생성된 게시글입니다. (ID: ${uniqueId})`,
    ntceBgnde: '20260401',
    ntceEndde: '20261231',
  };
  
  const response = http.post(url, JSON.stringify(payload), { headers });
  
  // 응답 검증
  const success = check(response, {
    'create post status is 200': (r) => r.status === 200,
    'create post response time < 1000ms': (r) => r.timings.duration < 1000,
    'create post returns post ID': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.result && typeof body.result === 'number';
      } catch (e) {
        return false;
      }
    },
  });
  
  if (!success) {
    console.error(`Post creation failed: status=${response.status}, body=${response.body}`);
  }
  
  // 사용자 행동 모사 (3-8 초 대기)
  sleep(Math.random() * 5 + 3);
}

/**
 * 정리 함수
 */
export function teardown(data) {
  console.log('Post creation load test completed.');
  console.log(`Test started at: ${data.startTime}`);
  console.log(`Test completed at: ${new Date().toISOString()}`);
}
