/** Browser task test. Run after installing the frontend's Playwright Chromium. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium, expect } from '../../frontend/node_modules/@playwright/test/index.mjs';
import { createComposerServer } from '../../scripts/project-composer-server.mjs';

const catalog = {
  sourceRef: 'HEAD', sourceCommit: 'a'.repeat(40), mandatory: ['foundation', 'core'],
  presets: [{ id: 'core', label: '공통 기반', description: '기본 기능', domains: [] },
    { id: 'collaboration', label: '협업', description: '게시판과 알림', domains: ['board', 'comment', 'scrap', 'notification'] }],
  capabilities: [
    { id: 'board', label: '게시판', description: '게시글 관리', available: true },
    { id: 'comment', label: '댓글', description: '게시글 의견', available: true },
    { id: 'scrap', label: '스크랩', description: '게시글 보관', available: true },
    { id: 'notification', label: '알림', description: '업무 알림', available: true },
  ],
};
function plan(recipe) {
  const selected = recipe.selection.domains ?? catalog.presets.find(item => item.id === recipe.selection.preset).domains;
  const resolved = new Set(selected);
  if (['board', 'comment', 'scrap'].some(id => selected.includes(id))) ['board', 'comment', 'scrap'].forEach(id => resolved.add(id));
  return { recipe, selectedDomains: selected, resolvedDomains: [...resolved],
    autoIncluded: [...resolved].filter(id => !selected.includes(id)).map(domain => ({ domain, reason: '게시판 기능과 함께 필요합니다.' })),
    tables: ['tb_user_info', ...[...resolved].map(id => `tb_${id}`)],
    menus: [{ label: '사용자 관리', path: '/admin/users' }, ...[...resolved].map(id => ({ label: id, path: `/${id}` }))],
    warnings: ['실행할 DB 연결은 생성 후 설정하세요.'], outputDirectory: `build/project-composer/${recipe.project.name}` };
}

test('keyboard selection, dependent features, preview, failure recovery and generated recipe stay coherent', { timeout: 60_000 }, async t => {
  let generations = 0;
  let submitted;
  const app = createComposerServer({ engine: { catalog: () => catalog, plan, generate: async (recipe, { onProgress }) => {
    generations += 1; submitted = recipe;
    onProgress({ stage: 'database', progress: 20 });
    await new Promise(resolve => setTimeout(resolve, 350));
    if (generations === 1) throw new Error('private-password-must-not-appear');
    return { projectDirectory: `build/project-composer/${recipe.project.name}`, databaseDirectory: 'build/db',
      reportPath: 'build/report.json', verified: true };
  } } });
  const origin = await app.listen(0);
  t.after(() => app.close());
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const pageErrors = [];
  const externalRequests = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('request', request => { if (!request.url().startsWith(origin)) externalRequests.push(request.url()); });
  await page.goto(origin);
  await expect(page.getByRole('heading', { name: '새 프로젝트 만들기' })).toBeVisible();
  await expect(page.getByRole('button', { name: '프로젝트 생성', exact: true })).toBeEnabled();
  await page.getByLabel('프로젝트 이름').fill('../bad');
  await page.getByRole('button', { name: '구성 다시 확인' }).click();
  await expect(page.getByLabel('프로젝트 이름')).toBeFocused();
  await expect(page.getByLabel('프로젝트 이름')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('button', { name: '프로젝트 생성', exact: true })).toBeDisabled();
  await page.getByLabel('프로젝트 이름').fill('agency-service');
  const board = page.locator('#capability-board');
  await board.focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#capability-comment')).toBeChecked();
  await expect(page.locator('#capability-comment')).toBeDisabled();
  await expect(page.locator('#capability-scrap')).toBeChecked();
  await expect(page.locator('#reason-comment')).toContainText('자동 포함');
  await expect(board).toBeFocused();
  await expect(page.locator('#preset')).toHaveValue('custom');
  await expect(page.locator('#domain-count')).toHaveText('3');
  await page.getByRole('radio', { name: /단일모듈/ }).check();
  await expect(page.getByRole('button', { name: '프로젝트 생성', exact: true })).toBeEnabled();
  await page.getByText('포함되는 메뉴', { exact: true }).click();
  await expect(page.locator('#menu-preview')).toContainText('/board');
  await page.setViewportSize({ width: 360, height: 800 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'narrow layout must not scroll horizontally');
  await page.getByRole('button', { name: '프로젝트 생성', exact: true }).click();
  await expect(page.getByLabel('프로젝트 이름')).toBeDisabled();
  await expect(page.getByRole('button', { name: '프로젝트 생성 중…' })).toBeDisabled();
  await expect(page.getByRole('heading', { name: '생성을 완료하지 못했습니다' })).toBeVisible();
  await expect(page.getByLabel('프로젝트 이름')).toHaveValue('agency-service');
  await expect(page.locator('#capability-board')).toBeChecked();
  await expect(page.locator('#job-error')).not.toContainText('private-password');
  assert.equal(generations, 1);
  assert.deepEqual(submitted, { schemaVersion: 1, project: { name: 'agency-service' }, sourceRef: 'HEAD',
    selection: { domains: ['board'] }, database: { vendor: 'postgresql' }, backendLayout: 'single-module' });
  await page.getByRole('button', { name: '프로젝트 생성', exact: true }).click();
  await expect(page.getByRole('heading', { name: '프로젝트가 준비되었습니다' })).toBeVisible();
  await expect(page.locator('#job-result')).toContainText('build/project-composer/agency-service');
  await expect(page.locator('#job-result')).toContainText('기술 검증을 통과');
  assert.equal(generations, 2);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '선택 정보 저장' }).click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), 'agency-service.recipe.json');
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  assert.deepEqual(JSON.parse(Buffer.concat(chunks).toString('utf8')), submitted);
  await page.reload();
  await expect(page.getByRole('heading', { name: '프로젝트가 준비되었습니다' })).toBeVisible();
  await expect(page.getByLabel('프로젝트 이름')).toHaveValue('agency-service');
  assert.equal(generations, 2, 'reload must never create a second job');
  assert.deepEqual(pageErrors, []);
  assert.deepEqual(externalRequests, []);
});

test('polling disconnect retains the active job and recovery does not submit it twice', { timeout: 30_000 }, async t => {
  let release;
  let generations = 0;
  const pending = new Promise(resolve => { release = resolve; });
  const app = createComposerServer({ engine: { catalog: () => catalog, plan, generate: () => { generations += 1; return pending; } } });
  const origin = await app.listen(0);
  t.after(() => app.close());
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.goto(origin);
  await expect(page.getByRole('button', { name: '프로젝트 생성', exact: true })).toBeEnabled();
  await page.route('**/api/jobs/*', route => route.abort());
  await page.getByRole('button', { name: '프로젝트 생성', exact: true }).click();
  await expect(page.getByRole('button', { name: '상태 다시 확인' })).toBeVisible();
  await expect(page.getByLabel('프로젝트 이름')).toBeDisabled();
  release({ projectDirectory: 'build/project-composer/my-service', verified: true });
  await page.unroute('**/api/jobs/*');
  await page.getByRole('button', { name: '상태 다시 확인' }).click();
  await expect(page.getByRole('heading', { name: '프로젝트가 준비되었습니다' })).toBeVisible();
  assert.equal(generations, 1);
});

test('another tab running a different recipe cannot overwrite the selection after BUSY', { timeout: 30_000 }, async t => {
  let release;
  let generations = 0;
  const pending = new Promise(resolve => { release = resolve; });
  const app = createComposerServer({ engine: { catalog: () => catalog, plan, generate: () => { generations += 1; return pending; } } });
  const origin = await app.listen(0);
  t.after(() => { release({ verified: true }); return app.close(); });
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const first = await browser.newPage();
  const second = await browser.newPage();
  await first.goto(origin);
  await second.goto(origin);
  await first.getByLabel('프로젝트 이름').fill('first-service');
  await first.locator('#capability-board').check();
  await second.getByLabel('프로젝트 이름').fill('second-service');
  await second.locator('#capability-notification').check();
  await second.getByRole('radio', { name: /단일모듈/ }).check();
  await expect(first.locator('#generate')).toBeEnabled();
  await expect(second.locator('#generate')).toBeEnabled();
  await first.locator('#generate').click();
  await expect(first.getByLabel('프로젝트 이름')).toBeDisabled();
  await second.locator('#generate').click();
  await expect(second.locator('#job-error')).toContainText('다른 프로젝트를 생성하고 있습니다');
  await expect(second.getByLabel('프로젝트 이름')).toHaveValue('second-service');
  await expect(second.getByLabel('프로젝트 이름')).toBeEnabled();
  await expect(second.locator('#capability-notification')).toBeChecked();
  await expect(second.locator('#capability-board')).not.toBeChecked();
  await expect(second.getByRole('radio', { name: /단일모듈/ })).toBeChecked();
  await expect(second.locator('#generate')).toBeEnabled();
  assert.equal(generations, 1);
});

test('lost generation response recovers only its accepted request without submitting twice', { timeout: 45_000 }, async t => {
  for (const completeBeforeRecovery of [false, true]) await t.test(completeBeforeRecovery ? 'already completed' : 'still running', async t => {
    let release;
    let generations = 0;
    let submissions = 0;
    const result = { projectDirectory: 'build/project-composer/own-service', verified: true };
    const pending = completeBeforeRecovery ? Promise.resolve(result) : new Promise(resolve => { release = resolve; });
    const app = createComposerServer({ engine: { catalog: () => catalog, plan, generate: () => { generations += 1; return pending; } } });
    const origin = await app.listen(0);
    t.after(() => { release?.(result); return app.close(); });
    const browser = await chromium.launch({ headless: true });
    t.after(() => browser.close());
    const page = await browser.newPage();
    await page.goto(origin);
    await page.getByLabel('프로젝트 이름').fill('own-service');
    await expect(page.locator('#generate')).toBeEnabled();
    await page.route('**/api/jobs', async route => {
      submissions += 1;
      const accepted = await route.fetch();
      assert.equal(accepted.status(), 202);
      await route.abort('failed'); // The server accepted the job, but the browser never received its reply.
    });
    await page.locator('#generate').click();
    if (!completeBeforeRecovery) {
      await expect(page.locator('#job-message')).toHaveText('선택한 구성 확인 중');
      await expect(page.getByLabel('프로젝트 이름')).toBeDisabled();
      release(result);
    }
    await expect(page.getByRole('heading', { name: '프로젝트가 준비되었습니다' })).toBeVisible();
    await expect(page.getByLabel('프로젝트 이름')).toHaveValue('own-service');
    await expect(page.locator('#job-result')).toContainText(result.projectDirectory);
    assert.equal(submissions, 1);
    assert.equal(generations, 1);
  });
});
