/**
 * k6 기본 테스트 스크립트
 * 
 * k6 설치 및 설정 검증을 위한 기본 테스트입니다.
 * 
 * 실행 방법:
 *   k6 run --out json=test-results.json basic-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';

export const options = {
  vus: 5,
  duration: '10s',
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% 요청이 1000ms 이내
    http_req_failed: ['rate<0.1'], // 10% 미만 실패
  },
};

export default function () {
  // 1. 기본 헬스체크 엔드포인트 테스트
  const healthUrl = 'http://localhost:8080/actuator/health';

  const healthResponse = http.get(healthUrl);

  const healthCheck = check(healthResponse, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 500ms': (r) => r.timings.duration < 500,
  });

  console.log(`Health check: ${healthCheck ? 'PASS' : 'FAIL'}`);

  sleep(1);

  // 2. API 버전 확인 (존재하는 경우)
  const apiVersionUrl = 'http://localhost:8080/api/v1/version';

  const versionResponse = http.get(apiVersionUrl, {
    headers: {
      'Accept': 'application/json',
    },
  });

  check(versionResponse, {
    'version check status is 200': (r) => r.status === 200,
  });

  sleep(1);
}

/**
 * HTML 리포트 생성
 */
export function handleSummary(data) {
  return {
    'test/load-tests/results/summary.html': htmlReport(data, {
      title: 'k6 Load Test - Basic Test',
      theme: 'default',
    }),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
