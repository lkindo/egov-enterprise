/**
 * 간단한 로그인 부하 테스트
 *
 * 실행 방법:
 *   k6 run test/load-tests/scenarios/simple-login-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const API_PREFIX = '/api/v1';

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<1000'],
  },
};

export default function () {
  const url = `${BASE_URL}${API_PREFIX}/login`;
  
  const payload = {
    username: 'admin',
    password: 'admin123!',
  };

  const response = http.post(url, JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  check(response, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
