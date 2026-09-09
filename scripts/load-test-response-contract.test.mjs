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

test('both load entry points make check failures fail the run and consume the actual response contract', () => {
  for (const file of ['users-list-test.js', 'load-levels.js']) {
    const source = fs.readFileSync(`test/load-tests/scenarios/${file}`, 'utf8');
    assert.match(source, /checks:\s*\['rate==1'\]/);
    assert.match(source, /hasPageResponse\(r\.body\)/);
    assert.doesNotMatch(source, /body\.result/);
  }
});
