/** Browser task test. Run after installing the frontend's Playwright Chromium. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium, expect } from '../../frontend/node_modules/@playwright/test/index.mjs';
import { createComposerServer } from '../../scripts/project-composer-server.mjs';
import { loadProjectComposerCatalog } from '../../scripts/project-composer-catalog.mjs';
import { resolveProjectRecipe } from '../../scripts/project-composer-recipe.mjs';
import { degradationNotes, inclusionNotes } from '../../scripts/project-composer.mjs';

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
    inclusionNotes: [...resolved].filter(id => !selected.includes(id)).map(domain => ({ domain, label: domain, roots: ['board'], path: `게시판 → ${domain}`,
      steps: [{ from: 'board', to: domain, text: `게시판 → ${domain}: 게시판 기능과 함께 필요합니다.`, evidence: ['코드 참조'], files: ['Board.java'] }],
      removal: '이 기능을 빼려면 게시판을 해제하세요.' })),
    tables: ['tb_user_info', ...[...resolved].map(id => `tb_${id}`)],
    menus: [{ label: '사용자 관리', path: '/admin/users' }, ...[...resolved].map(id => ({ label: id, path: `/${id}` }))],
    warnings: ['실행할 DB 연결은 생성 후 설정하세요.'], outputDirectory: `build/project-composer/${recipe.project.name}`,
    blockers: [],
    degradationNotes: resolved.has('notification') ? [] : [{ to: 'notification', heading: '알림을 고르지 않아 줄어드는 동작',
      reasons: [{ from: 'core', reason: '알림 기능이 없으면 부서 업무의 담당자를 지정하거나 바꿔도 새 담당자에게 업무 배정 알림이 가지 않습니다.' }] }],
    unassignedPermissions: [
      { code: 'ADT_LOG_READ', name: '민감 작업 감사 원장 · 조회', effect: '민감 작업 감사 원장에서 누가 언제 민감한 조회·변경을 했는지 봅니다.',
        howToAssign: "권한 작업대에서 '로그·감사 열람' 묶음을 그룹에 더하면 함께 배정됩니다.", owner: 'core', protected: false },
      { code: 'MFA_RECOVER', name: '다중요소 인증 · 계정 복구', effect: '추가 인증 수단을 잃은 사용자의 계정 복구를 승인합니다.',
        howToAssign: "권한 작업대에서 '계정 복구' 묶음을 그룹에 더하면 함께 배정됩니다. 보호 권한이라 권한 부여와 배정 권한을 함께 가진 관리자만 저장할 수 있습니다.", owner: 'core', protected: true },
    ] };
}

test('keyboard selection, dependent features, preview, failure recovery and generated recipe stay coherent', { timeout: 60_000 }, async t => {
  let generations = 0;
  let submitted;
  const app = createComposerServer({ engine: { catalog: () => catalog, plan, generate: async (recipe, { onProgress }) => {
    generations += 1; submitted = recipe;
    onProgress({ stage: 'database', progress: 20 });
    await new Promise(resolve => setTimeout(resolve, 350));
    if (generations === 1) throw Object.assign(new Error('private-password-must-not-appear'), { failure: { stage: 'verify',
      commandId: 'scripts/verify-reusable-artifact.mjs', exitCode: 1, log: 'build/project-composer/jobs/agency-service-0123456789abcdef/logs/verify.log' } });
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
  // 기능 저하와 미배정 권한은 안내일 뿐 생성 버튼을 막지 않는다.
  await expect(page.getByRole('group', { name: '고르지 않은 연동 기능' })).toContainText('알림을 고르지 않아 줄어드는 동작');
  await expect(page.locator('#plan-degraded')).toContainText('새 담당자에게 업무 배정 알림이 가지 않습니다.');
  await expect(page.locator('#plan-unassigned-summary')).toHaveText('생성 뒤 직접 배정할 권한 2개');
  await page.locator('#plan-unassigned-summary').click();
  await expect(page.locator('#plan-unassigned-list')).toContainText('다중요소 인증 · 계정 복구');
  await expect(page.locator('#plan-unassigned-list')).toContainText('보호 권한이라');
  await expect(page.getByRole('button', { name: '프로젝트 생성', exact: true })).toBeEnabled();
  // 알림을 고르면 저하 안내가 사라지고, 다시 빼면 돌아온다(이전 구성의 안내를 남기지 않는다).
  await page.locator('#capability-notification').check();
  await expect(page.locator('#plan-degraded')).toBeHidden();
  await page.locator('#capability-notification').uncheck();
  await expect(page.locator('#plan-degraded')).toContainText('알림을 고르지 않아 줄어드는 동작');
  await expect(page.getByRole('button', { name: '프로젝트 생성', exact: true })).toBeEnabled();
  await page.setViewportSize({ width: 360, height: 800 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'narrow layout must not scroll horizontally');
  await page.getByRole('button', { name: '프로젝트 생성', exact: true }).click();
  await expect(page.getByLabel('프로젝트 이름')).toBeDisabled();
  await expect(page.getByRole('button', { name: '프로젝트 생성 중…' })).toBeDisabled();
  await expect(page.getByRole('heading', { name: '생성을 완료하지 못했습니다' })).toBeVisible();
  await expect(page.getByLabel('프로젝트 이름')).toHaveValue('agency-service');
  await expect(page.locator('#capability-board')).toBeChecked();
  await expect(page.locator('#job-error')).not.toContainText('private-password');
  await expect(page.locator('#job-error')).toContainText('실패 단계: 생성 프로젝트 검증');
  await expect(page.locator('#job-error')).toContainText('scripts/verify-reusable-artifact.mjs (종료 코드 1)');
  await expect(page.locator('#job-error')).toContainText('logs/verify.log');
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

/*
 * 자동 포함 설명(E2)을 실제 카탈로그와 실제 해석기로 그린다. 쪽지만 고르면 협업 허브와 게시판 묶음을 따라 여섯 기능이
 * 함께 들어온다. 화면은 경로 사슬과 사용자 문장을 보이고, 개발자 근거는 한 번 더 접으며, '해제하기'로 정확히 빠진다.
 */
test('automatic inclusions from the real catalog show a chain, a user sentence, folded evidence and an exact way out', { timeout: 45_000 }, async t => {
  const real = loadProjectComposerCatalog();
  const plan = recipe => {
    const composition = resolveProjectRecipe(recipe, real);
    return { ...composition, blockers: [], inclusionNotes: inclusionNotes(composition, real), degradationNotes: degradationNotes(composition, real),
      unassignedPermissions: [], menus: [], warnings: [], outputDirectory: `build/project-composer/${recipe.project.name}` };
  };
  let release;
  const released = new Promise(resolve => { release = resolve; });
  const app = createComposerServer({ engine: { catalog: () => ({ ...real, sourceRef: 'HEAD', sourceCommit: 'a'.repeat(40) }), plan,
    generate: async () => { await released; throw new Error('not generated in this test'); } } });
  const origin = await app.listen(0);
  t.after(() => app.close());
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(origin);
  await expect(page.getByRole('heading', { name: '새 프로젝트 만들기' })).toBeVisible();
  await expect(page.locator('#domain-count')).toHaveText('0');
  await page.locator('#capability-note').check();
  await expect(page.locator('#domain-count')).toHaveText('7');
  await expect(page.locator('#reason-board')).toHaveText('자동 포함 · 쪽지 → 스크랩 → 게시판·지식');
  await expect(page.locator('#auto-included')).toContainText('함께 포함되는 기능 6개');
  const board = page.locator('#auto-board');
  await expect(board).toContainText('쪽지 → 스크랩 → 게시판·지식');
  await board.getByText('왜 포함됐나').click();
  await expect(board).toContainText('스크랩 → 게시판·지식: 스크랩은 게시글을 저장해 둡니다.');
  await expect(board).toContainText('이 기능을 빼려면 쪽지를 해제하세요.');
  // 개발자 근거(파일 경로)는 접혀 있고, 보이는 설명에는 클래스명·기능 id 같은 영문이 없다.
  await expect(board.locator('code').first()).toBeHidden();
  assert.doesNotMatch(await page.locator('#auto-included').innerText(), /[A-Za-z]/);
  // 같은 구성을 다시 확인해도 펼친 설명과 키보드 포커스가 그 자리에 남는다.
  const summary = board.locator('summary', { hasText: '왜 포함됐나' });
  await summary.focus();
  // 옛 요소에 표시를 남겨, 아래 단언이 다시 그린 새 요소에서만 통과하게 한다.
  await page.evaluate(() => { document.getElementById('auto-board').dataset.stale = 'yes'; });
  await page.evaluate(() => document.getElementById('composer-form').requestSubmit());
  await expect(page.locator('#auto-board:not([data-stale])')).toHaveCount(1);
  await expect(board.locator('details').first()).toHaveAttribute('open', '');
  await expect(summary).toBeFocused();
  await board.getByText('개발자 근거').click();
  await expect(board.locator('code', { hasText: 'nuri/business/domain/scrap/Scrap.java' })).toBeVisible();
  await expect(board).toContainText('코드 참조 · 생성 묶음 선언');
  // 요약은 생성 중 잠기는 구성 영역 밖에 있다. 생성이 도는 동안 해제 버튼도 잠기고, 끝나면 다시 풀린다.
  const drop = board.getByRole('button', { name: '쪽지 해제하기' });
  await page.getByRole('button', { name: '프로젝트 생성', exact: true }).click();
  await expect(page.getByRole('button', { name: '프로젝트 생성 중…' })).toBeDisabled();
  await expect(drop).toBeDisabled();
  await expect(drop).toHaveCSS('opacity', '0.5');
  release();
  await expect(page.getByRole('heading', { name: '생성을 완료하지 못했습니다' })).toBeVisible();
  await expect(drop).toBeEnabled();
  await drop.click();
  await expect(page.locator('#capability-note')).toBeFocused();
  await expect(page.locator('#capability-note')).not.toBeChecked();
  await expect(page.locator('#capability-board')).not.toBeChecked();
  await expect(page.locator('#domain-count')).toHaveText('0');
  await expect(page.locator('#auto-included')).toBeEmpty();
  await expect(page.locator('#preset')).toHaveValue('custom');
  // 해제 대상이 둘이면 버튼이 둘을 함께 뺀다. 댓글과 스크랩이 모두 게시판을 끌어온다.
  await page.locator('#capability-comment').check();
  await page.locator('#capability-scrap').check();
  const shared = page.locator('#auto-board');
  await shared.getByText('왜 포함됐나').click();
  await expect(shared).toContainText('이 기능을 빼려면 댓글, 스크랩을 모두 해제하세요.');
  await shared.getByRole('button', { name: '댓글, 스크랩 해제하기' }).click();
  await expect(page.locator('#capability-comment')).not.toBeChecked();
  await expect(page.locator('#capability-scrap')).not.toBeChecked();
  await expect(page.locator('#domain-count')).toHaveText('0');
  assert.deepEqual(pageErrors, []);
});
