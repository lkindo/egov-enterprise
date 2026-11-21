import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { hasDashboardResponse, hasPageResponse, verifySettledDashboard } from '../test/load-tests/response-contracts.mjs';

const page = { success: true, data: { list: [], total: 0, page: 1, size: 10, totalPage: 0 } };

test('dashboard load checks compare both widgets with the known board pages', () => {
  const references = {
    task: { boardId: 'task', total: 0, ids: [] },
    notice: { boardId: 'notice', total: 1, ids: [10] },
  };
  const data = {
    taskList: [], taskListTotal: 0, taskListUnavailable: false,
    notiList: [{ bbsId: 'notice', pstSn: 10 }], notiListTotal: 1, notiListUnavailable: false,
  };
  const matches = (overrides, growing = false) =>
    hasDashboardResponse(JSON.stringify({ success: true, data: { ...data, ...overrides } }), references, growing);
  assert.equal(matches({}), true);
  for (const invalid of [
    { taskListTotal: null }, { taskListUnavailable: true }, { taskListUnavailable: undefined },
    { notiList: [], notiListTotal: 0 }, { notiList: [] }, { notiListTotal: 2 },
    { notiList: [{ bbsId: 'task', pstSn: 10 }] }, { notiList: [{ bbsId: 'notice', pstSn: 12 }] },
  ]) assert.equal(matches(invalid), false);
  assert.equal(hasDashboardResponse('{"success":false}', references), false);
  assert.equal(hasDashboardResponse('invalid JSON', references), false);
  // More than five visible notices can displace the setup post; the task board stays constant.
  const shifted = { notiListTotal: 6, notiList: [15, 14, 13, 12, 11].map(pstSn => ({ bbsId: 'notice', pstSn })) };
  assert.equal(matches(shifted, true), true);
  assert.equal(matches(shifted), false);
  assert.equal(matches({ ...shifted, taskListTotal: 1 }, true), false);
  assert.equal(matches({ ...shifted, notiList: [shifted.notiList[0], shifted.notiList[0]] }, true), false);
  const full = { ...references, notice: { boardId: 'notice', total: 12, ids: [15, 14, 13, 12, 11] } };
  const withNewNotice = (ids) => hasDashboardResponse(JSON.stringify({ success: true, data: {
    ...data, notiListTotal: 13, notiList: ids.map(pstSn => ({ bbsId: 'notice', pstSn })),
  } }), full, true);
  assert.equal(withNewNotice([16, 15, 14, 13, 12]), true);
  assert.equal(withNewNotice([16, 15]), false);
  assert.equal(withNewNotice([20, 19, 18, 17, 16]), false);
  // An unseeded external board can receive its first post between the page and count queries.
  const emptyNotice = { ...references, notice: { boardId: 'notice', total: 0, ids: [] } };
  const firstInsert = JSON.stringify({ success: true, data: { ...data, notiList: [], notiListTotal: 1 } });
  assert.equal(hasDashboardResponse(firstInsert, emptyNotice, true), true);
  assert.equal(hasDashboardResponse(firstInsert, emptyNotice), false);
  const staleAfterGrowth = JSON.stringify({ success: true, data: { ...data, notiListTotal: 6 } });
  assert.equal(hasDashboardResponse(staleAfterGrowth, references, true), true);
  assert.equal(hasDashboardResponse(staleAfterGrowth, references, true, 6), false);
  assert.equal(hasDashboardResponse(JSON.stringify({ success: true, data: { ...data, ...shifted } }), references, true, 6), true);
  assert.equal(withNewNotice([15, 14, 13, 12, 11]), true); // all five are pinned
});

test('teardown retries only when reference pages moved, and limits the attempts', () => {
  const ids = (n) => Array.from({ length: Math.min(5, n) }, (_, i) => n - i);
  const refs = (n) => ({ task: { boardId: 'task', total: 0, ids: [] }, notice: { boardId: 'notice', total: n, ids: ids(n) } });
  const dashboard = (n) => JSON.stringify({ success: true, data: {
    taskList: [], taskListTotal: 0, taskListUnavailable: false,
    notiList: ids(n).map(pstSn => ({ bbsId: 'notice', pstSn })), notiListTotal: n, notiListUnavailable: false,
  } });
  const verify = (pages, responses) => verifySettledDashboard(() => pages.shift(), () => responses.shift());
  verify([refs(1), refs(2)], [dashboard(2), dashboard(2)]);
  const fixed = [dashboard(3), dashboard(1)];
  assert.throws(() => verify([refs(1), refs(1)], fixed), /reference boards/);
  assert.equal(fixed.length, 1);
  const moving = [dashboard(8), dashboard(8), dashboard(8), dashboard(4)];
  assert.throws(() => verify([1, 2, 3, 4].map(refs), moving), /reference boards/);
  assert.equal(moving.length, 1);
});

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
  assert.match(levels.source, /check\(response,\s*\{[^}]*hasDashboardResponse\(r\.body, references, true, observedNoticeTotal\)/);
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

// [2026-10-07] 주간 부하 워크플로는 시크릿을 환경변수로 실은 채 k6 를 실행하고, k6 는 시스템 환경변수를 __ENV 로
// 넘긴다. 그래서 원격 모듈은 내용이 바뀔 수 없는 주소로만 가져온다 — jslib 은 버전 경로, GitHub raw 는 40자리 커밋.
// 종전에는 k6-reporter 를 `main` 브랜치에서 가져와, 그 저장소의 다음 커밋이 검토 없이 시크릿 옆에서 실행됐다.
test('load-test sources import remote modules only from immutable, version-pinned URLs', () => {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) { if (entry.name !== 'results' && entry.name !== 'node_modules') walk(path); }
      else if (/\.(m?js)$/.test(entry.name)) files.push(path);
    }
  };
  walk('test/load-tests');
  const remote = files.flatMap((file) => [...fs.readFileSync(file, 'utf8').matchAll(/\bfrom\s+['"](https?:\/\/[^'"]+)['"]/g)]
    .map((match) => ({ file, url: match[1] })));
  assert.ok(remote.length >= 2, 'remote imports disappeared — re-check this contract');
  const pinned = (url) => /^https:\/\/jslib\.k6\.io\/[\w-]+\/\d+\.\d+\.\d+\//.test(url)
    || /^https:\/\/raw\.githubusercontent\.com\/[\w.-]+\/[\w.-]+\/[0-9a-f]{40}\//.test(url);
  for (const { file, url } of remote) assert.ok(pinned(url), `${file} imports a mutable remote module: ${url}`);
});
