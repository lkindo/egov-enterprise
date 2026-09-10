import http from 'k6/http';
import { check, sleep } from 'k6';
import { Config } from '../config.js';
import { AuthTokenManager } from '../utils.js';
import { hasPageResponse } from '../response-contracts.mjs';

// This scenario creates and deletes synthetic schedules; its target is always disposable.
if (!/^http:\/\/(?:127\.0\.0\.1|localhost)(?::[0-9]+)?$/.test(Config.BASE_URL)) {
  throw new Error('Mixed workload requires an isolated loopback API');
}

const smoke = __ENV.K6_SCENARIO === 'smoke';
export const options = {
  thresholds: {
    checks: ['rate==1'],
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.01'],
  },
  scenarios: {
    mixed: smoke
      ? { executor: 'constant-vus', vus: 5, duration: '10s' }
      : { executor: 'ramping-vus', startVUs: 0, stages: [
        { duration: '60s', target: 100 }, { duration: '60s', target: 100 }, { duration: '15s', target: 0 },
      ], gracefulRampDown: '10s' },
  },
};

function envelope(response) {
  try { return JSON.parse(response.body); } catch { return null; }
}

export function setup() {
  const token = new AuthTokenManager().login(Config.TEST_USERNAME, Config.TEST_PASSWORD);
  return { token, run: Date.now().toString(36), date: new Date().toISOString().slice(0, 10).replace(/-/g, '') };
}

export default function (data) {
  const headers = Config.getAuthHeaders(data.token);
  const api = `${Config.BASE_URL}/api/v1`;
  const users = http.get(`${api}/admin/system/users?page=1&size=10`, { headers });
  check(users, {
    'users status': r => r.status === 200,
    'users page contract': r => hasPageResponse(r.body),
  });
  const dashboard = http.get(`${api}/dashboard`, { headers });
  check(dashboard, {
    'dashboard status': r => r.status === 200,
    'dashboard envelope': r => envelope(r)?.success === true && envelope(r)?.data != null,
  });

  if (__ITER % 5 === 0) {
    const body = { schdlNm: `k6-${data.run}-${__VU}-${__ITER}`, schdlBgngYmd: data.date, schdlEndYmd: data.date };
    const created = http.post(`${api}/schedules`, JSON.stringify(body), { headers });
    const id = envelope(created)?.data;
    const validId = Number.isSafeInteger(id) && id > 0;
    check(created, { 'schedule created': r => r.status === 200 && envelope(r)?.success === true && validId });
    if (validId) {
      const url = `${api}/schedules/${id}`;
      const params = { headers, tags: { name: '/api/v1/schedules/:id' } };
      try {
        const found = http.get(url, params);
        check(found, { 'created schedule persisted': r => r.status === 200 && envelope(r)?.data?.schdlNm === body.schdlNm });
        body.schdlNm += '-updated';
        const updated = http.put(url, JSON.stringify(body), params);
        check(updated, { 'schedule updated': r => r.status === 200 && envelope(r)?.success === true });
        const reloaded = http.get(url, params);
        check(reloaded, { 'updated schedule persisted': r => r.status === 200 && envelope(r)?.data?.schdlNm === body.schdlNm });
      } finally {
        const deleted = http.del(url, null, params);
        check(deleted, { 'schedule deleted': r => r.status === 200 && envelope(r)?.success === true });
        const missing = http.get(url, { ...params, responseCallback: http.expectedStatuses(404) });
        check(missing, { 'deleted schedule absent': r => r.status === 404 });
      }
    }
  }
  sleep(2);
}

export function handleSummary(data) {
  return { [__ENV.K6_SUMMARY_PATH || 'build/readiness-followups/mixed-load-summary.json']: JSON.stringify(data, null, 2) };
}
