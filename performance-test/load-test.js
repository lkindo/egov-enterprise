import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp-up to 20 VUs
    { duration: '1m', target: 20 },  // Stay at 20 VUs
    { duration: '30s', target: 0 },  // Ramp-down to 0 VUs
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate must be less than 1%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080/api/v1';

export default function () {
  // 1. Get Menus (Public)
  const menuRes = http.get(`${BASE_URL}/menus`);
  check(menuRes, {
    'status is 200': (r) => r.status === 200,
    'has menu data': (r) => r.json().data !== undefined,
  });

  sleep(1);
}
