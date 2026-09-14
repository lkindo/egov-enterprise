import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { hasPageResponse } from '../test/load-tests/response-contracts.mjs';

const page = { success: true, data: { list: [], total: 0, page: 1, size: 10, totalPage: 0 } };

test('current PageResponse accepts empty and populated result pages', () => {
  assert.equal(hasPageResponse(JSON.stringify(page)), true);
  assert.equal(hasPageResponse(JSON.stringify({ ...page, data: { ...page.data, list: [{ userId: 'synthetic' }], total: 1, totalPage: 1 } })), true);
});

test('HTTP 200 alone cannot make malformed, legacy or unsuccessful payloads pass', () => {
  for (const invalid of ['', '<html>error</html>', 'null', '{}',
    JSON.stringify({ ...page, success: false }),
    JSON.stringify({ result: { content: [], page: 1, size: 10, totalElements: 0 } }),
    JSON.stringify({ ...page, data: { ...page.data, page: 0 } }),
    JSON.stringify({ ...page, data: { ...page.data, total: '0' } }),
    JSON.stringify({ ...page, data: { ...page.data, list: null } }),
  ]) assert.equal(hasPageResponse(invalid), false);
});

// [2026-09-14] checks rate==1 은 정확성 실패를 1건도 허용하지 않는 판정이다. 여기에 요청별 지연을 섞으면
// 공유 러너의 느린 요청 몇 건이 실행 전체를 실패로 만든다(오류율 0%·p95 236ms 실행이 실제로 실패했다).
// 지연은 태그별 http_req_duration 분포 임계로만 판정하고, 태그를 단 요청마다 임계가 있어야 한다.
test('scenarios that require every check keep latency out of check() and gate it by tagged p95 thresholds', () => {
  const dir = 'test/load-tests/scenarios';
  const strict = fs.readdirSync(dir).filter((file) => file.endsWith('.js'))
    .map((file) => ({ file, source: fs.readFileSync(`${dir}/${file}`, 'utf8') }))
    .filter(({ source }) => /checks:\s*\['rate==1'\]/.test(source));
  assert.ok(strict.length >= 3, `rate==1 scenarios disappeared: ${strict.map(({ file }) => file)}`);
  for (const { file, source } of strict) {
    assert.doesNotMatch(source, /timings\.duration/, `${file} puts per-request latency inside a rate==1 check`);
    const tagged = [...source.matchAll(/tags:\s*\{\s*endpoint:\s*'([^']+)'\s*\}/g)].map((match) => match[1]);
    for (const endpoint of tagged) {
      assert.match(source, new RegExp(`'http_req_duration\\{endpoint:${endpoint}\\}':\\s*\\['p\\(95\\)<\\d+'\\]`),
        `${file} tags ${endpoint} requests without a p95 threshold`);
    }
  }
  const levels = strict.find(({ file }) => file === 'load-levels.js');
  assert.ok(levels, 'the weekly load-levels scenario must stay a rate==1 scenario');
  assert.deepEqual(
    [...levels.source.matchAll(/tags:\s*\{\s*endpoint:\s*'([^']+)'\s*\}/g)].map((match) => match[1]).sort(),
    ['create-post', 'dashboard', 'login', 'users-list'],
  );
});

test('both load entry points make check failures fail the run and consume the actual response contract', () => {
  for (const file of ['users-list-test.js', 'load-levels.js', 'mixed-workload.js']) {
    const source = fs.readFileSync(`test/load-tests/scenarios/${file}`, 'utf8');
    assert.match(source, /checks:\s*\['rate==1'\]/);
    assert.match(source, /hasPageResponse\(r\.body\)/);
    assert.doesNotMatch(source, /body\.result/);
  }
});
