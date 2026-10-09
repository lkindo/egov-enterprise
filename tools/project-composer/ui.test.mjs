/** Browser task test. Run after installing the frontend's Playwright Chromium. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '../../frontend/node_modules/@playwright/test/index.mjs';
import { createComposerServer } from '../../scripts/project-composer-server.mjs';
import { loadProjectComposerCatalog } from '../../scripts/project-composer-catalog.mjs';
import { resolveProjectRecipe } from '../../scripts/project-composer-recipe.mjs';
import { createComposerEngine, degradationNotes, diffSummary, inclusionNotes } from '../../scripts/project-composer.mjs';
import { compositionDiff } from '../../scripts/project-composer-diff.mjs';
import { loadProjectComposerMenus } from '../../scripts/project-composer-menu-preview.mjs';
import { composerPresentation, loadRouteKinds } from '../../scripts/project-composer-presentation.mjs';
import { ComposerError, MENUS_REFRESH_COMMAND } from '../../scripts/project-composer-errors.mjs';
import { NAME_RULE_MESSAGE } from '../../scripts/project-composer-name.mjs';

const catalog = {
  sourceRef: 'HEAD', sourceCommit: 'a'.repeat(40), mandatory: ['foundation', 'core'],
  presets: [{ id: 'core', domains: [] }, { id: 'collaboration', domains: ['board', 'comment', 'scrap', 'notification'] }],
  capabilities: [
    { id: 'board', label: '게시판', available: true, database: { tables: ['tb_bbs_item', 'tb_bbs_master'] }, frontend: { routes: ['/board'] }, permissionCodes: ['BOARD_READ'], requirements: [] },
    { id: 'comment', label: '댓글', available: true, database: { tables: ['tb_bbs_comment'] }, frontend: { routes: [] }, permissionCodes: [], requirements: [] },
    { id: 'scrap', label: '스크랩', available: true, database: { tables: ['tb_bbs_scrap'] }, frontend: { routes: [] }, permissionCodes: [], requirements: [] },
    { id: 'notification', label: '알림', available: true, database: { tables: ['tb_noti'] }, frontend: { routes: ['/notifications'] }, permissionCodes: [], requirements: [] },
  ],
  presentation: {
    areas: [{ id: 'knowledge', label: '지식', domains: ['board', 'comment', 'scrap'] }, { id: 'communication', label: '소통', domains: ['notification'] }],
    summaries: { board: '게시글 관리', comment: '게시글 의견', scrap: '게시글 보관', notification: '업무 알림' },
    presets: { core: { label: '공통 기반' }, collaboration: { label: '협업' } },
    screens: { board: 1, comment: 0, scrap: 0, notification: 1 },
  },
};
// 생성 전 점검(설계서 19장)이 모두 통과하는 엔진 조각. 생성 흐름 테스트는 최종 확인을 거쳐 시작한다.
const passingPreflight = () => ({ checks: [{ id: 'docker', status: 'pass', label: 'Docker 엔진이 응답합니다', detail: '29.1.3' }], blocked: false });
// 소스 정밀 점검(설계서 10장 plan/deep)이 차단 없이 끝나는 엔진 조각.
const passingDeep = () => ({ java: { removedFiles: 517, cascadeFiles: 114 }, frontend: { removedFiles: 388, cascadeFiles: 73 }, removedGates: [],
  blockers: [], summary: '제거: Java 517개(연쇄 114) · 프런트 388개(연쇄 73) · 검증 게이트 0건', durationMs: 10 });
const DEEP_PASSED = '. 지워지는 검증 게이트는 승인 목록과 같고, 선택한 기능의 소스와 화면 진입점은 남습니다.';
async function confirmGenerate(page) {
  await page.getByRole('button', { name: '프로젝트 생성', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '이 구성으로 생성할까요?' });
  await expect(dialog.getByRole('button', { name: '생성 시작' })).toBeEnabled();
  await dialog.getByRole('button', { name: '생성 시작' }).click();
  await expect(dialog).toBeHidden();
}
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
  const app = createComposerServer({ engine: { catalog: () => catalog, plan, preflight: passingPreflight, deep: passingDeep, generate: async (recipe, { onProgress }) => {
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
  await confirmGenerate(page);
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
  await confirmGenerate(page);
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
  const app = createComposerServer({ engine: { catalog: () => catalog, plan, preflight: passingPreflight, deep: passingDeep, generate: () => { generations += 1; return pending; } } });
  const origin = await app.listen(0);
  t.after(() => app.close());
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.goto(origin);
  await expect(page.getByRole('button', { name: '프로젝트 생성', exact: true })).toBeEnabled();
  await page.route('**/api/jobs/*', route => route.abort());
  await confirmGenerate(page);
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
  const app = createComposerServer({ engine: { catalog: () => catalog, plan, preflight: passingPreflight, deep: passingDeep, generate: () => { generations += 1; return pending; } } });
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
  await confirmGenerate(first);
  await expect(first.getByLabel('프로젝트 이름')).toBeDisabled();
  await confirmGenerate(second);
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
    const app = createComposerServer({ engine: { catalog: () => catalog, plan, preflight: passingPreflight, deep: passingDeep, generate: () => { generations += 1; return pending; } } });
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
    await confirmGenerate(page);
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
/*
 * 실제 카탈로그·실제 해석기·실제 화면 문구로 도는 서버(설계서 Phase 1 종료 조건: UI 테스트가 실제 카탈로그를 쓴다).
 * 생성은 하지 않는다. generate 는 release() 를 부를 때까지 기다렸다가 실패한다.
 */
const root = fileURLToPath(new URL('../..', import.meta.url));
const real = loadProjectComposerCatalog(root);
const realMenus = loadProjectComposerMenus(root).menus;
const realDiff = (recipe, domain) => {
  const result = compositionDiff({ catalog: real, menus: realMenus, recipe, domain });
  return { ...result, summary: diffSummary(result, real) };
};
async function realCatalogPage(t, { preflight = passingPreflight, deep = passingDeep } = {}) {
  const plan = recipe => {
    const composition = resolveProjectRecipe(recipe, real);
    return { ...composition, blockers: [], inclusionNotes: inclusionNotes(composition, real), degradationNotes: degradationNotes(composition, real),
      unassignedPermissions: [], menus: [], warnings: [], outputDirectory: `build/project-composer/${recipe.project.name}` };
  };
  let release;
  const released = new Promise(resolve => { release = resolve; });
  const app = createComposerServer({ engine: { catalog: () => ({ ...real, sourceRef: 'HEAD', sourceCommit: 'a'.repeat(40), presentation: composerPresentation(real, { routeKinds: loadRouteKinds(root) }) }), plan, diff: realDiff, preflight, deep,
    generate: async () => { await released; throw new Error('not generated in this test'); } } });
  const origin = await app.listen(0);
  t.after(() => app.close());
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(origin);
  return { page, pageErrors, release };
}

test('automatic inclusions from the real catalog show a chain, a user sentence, folded evidence and an exact way out', { timeout: 45_000 }, async t => {
  const { page, pageErrors, release } = await realCatalogPage(t);
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
  await confirmGenerate(page);
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

/*
 * 기능 카드를 업무 영역으로 묶고(E3), 이름·요약으로 찾으며(E9), 카탈로그가 소유한 수를 배지로 보인다.
 * 시작 구성은 한국어 이름과 기능 수로 고른다. 검색은 보이는 카드만 바꾸고 선택을 지우지 않는다.
 */
test('the real catalog renders feature areas, search, owned-count badges and Korean preset names', { timeout: 60_000 }, async t => {
  const { page, pageErrors } = await realCatalogPage(t);
  await expect(page.getByRole('heading', { name: '새 프로젝트 만들기' })).toBeVisible();
  const presentation = composerPresentation(real, { routeKinds: loadRouteKinds(root) });
  const options = await page.locator('#preset option').allTextContents();
  assert.deepEqual(options, [...real.presets.map(preset => `${presentation.presets[preset.id].label} · ${preset.domains.length ? `업무 기능 ${preset.domains.length}개` : '업무 기능 없음'}`), '직접 선택']);
  assert.ok(options.includes('공통 기반만 · 업무 기능 없음') && options.includes('협업 기본 · 업무 기능 8개'), options.join(' / '));
  for (const area of presentation.areas) {
    const group = page.getByRole('group', { name: new RegExp(`^${area.label}`) });
    await expect(group).toBeVisible();
    await expect(group.locator('input[type="checkbox"]')).toHaveCount(area.domains.length);
  }
  // 체크박스의 이름은 기능 이름만이다. 요약·배지는 설명으로 한 번만 읽힌다.
  await expect(page.getByRole('checkbox', { name: '메일', exact: true })).toHaveAttribute('aria-describedby', 'reason-mail badges-mail preview-mail');
  await expect(page.locator('#reason-mail')).toHaveText('메일 작성·발송과 발송 이력');
  await expect(page.locator('#badges-dashboard')).toHaveText('테이블 0 · 화면 0 · 권한 0');
  // 화면 수는 실제 페이지만 센다. 설문·투표는 리다이렉트 별칭을 함께 소유하지만 그것은 화면이 아니다.
  const survey = real.capabilities.find(capability => capability.id === 'survey');
  assert.ok(presentation.screens.survey < survey.frontend.routes.length);
  await expect(page.locator('#badges-survey')).toContainText(`화면 ${presentation.screens.survey} ·`);
  const mail = real.capabilities.find(capability => capability.id === 'mail');
  await expect(page.locator('#badges-mail')).toContainText(`테이블 ${mail.database.tables.length} · 화면 ${presentation.screens.mail} · 권한 ${mail.permissionCodes.length}`);
  await expect(page.locator('#badges-mail')).toContainText('외부 설정: 메일 발송에 사용할 SMTP 설정');
  // 메일을 고른 뒤 다른 기능을 찾아도 메일 선택은 남는다. 같은 영역 안에서도 맞지 않는 카드는 숨는다.
  await page.locator('#capability-mail').check();
  await expect(page.locator('#domain-count')).toHaveText('1');
  await page.getByLabel('기능 찾기').fill('결재');
  await expect(page.locator('#capability-search-status')).toHaveText('‘결재’ 검색 결과 기능 1개');
  await expect(page.locator('#capability-informalsanction')).toBeVisible();
  await expect(page.getByRole('group', { name: /^업무 지원/ })).toContainText('1개');
  await expect(page.getByRole('group', { name: /^업무 지원/ }).locator('input:visible')).toHaveCount(1);
  await expect(page.locator('#capability-operation')).toBeHidden();
  await expect(page.locator('#area-communication')).toBeHidden();
  await expect(page.locator('#area-communication')).toHaveCount(1);
  await expect(page.locator('#capability-search')).toBeFocused();
  // 계획을 다시 받아도 같은 검색 결과를 다시 알리지 않는다.
  await page.evaluate(() => {
    window.statusMutations = 0;
    new MutationObserver(records => { window.statusMutations += records.length; }).observe(document.getElementById('capability-search-status'), { childList: true, characterData: true, subtree: true });
  });
  await page.evaluate(() => document.getElementById('composer-form').requestSubmit());
  await expect(page.locator('#preview')).toBeEnabled();
  assert.equal(await page.evaluate(() => window.statusMutations), 0);
  // 검색칸의 Enter 는 구성 확인 폼을 제출하지 않는다. 이름이 틀려도 포커스가 이름 칸으로 옮겨 가지 않는다.
  await page.getByLabel('프로젝트 이름').fill('Bad Name');
  await page.getByLabel('기능 찾기').press('Enter');
  await expect(page.locator('#capability-search')).toBeFocused();
  await page.getByLabel('프로젝트 이름').fill('agency-project');
  // 한글 조합 중(결ㅈ)에는 거르지 않는다. 조합이 끝나면 한 번 거른다.
  await page.getByLabel('기능 찾기').fill('');
  await page.getByLabel('기능 찾기').focus();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.imeSetComposition', { text: '결ㅈ', selectionStart: 2, selectionEnd: 2 });
  await expect(page.getByLabel('기능 찾기')).toHaveValue('결ㅈ');
  await expect(page.locator('#capabilities')).not.toContainText('에 맞는 기능이 없습니다');
  await expect(page.locator('#capability-search-status')).toHaveText('');
  await cdp.send('Input.insertText', { text: '결재' });
  await expect(page.locator('#capability-search-status')).toHaveText('‘결재’ 검색 결과 기능 1개');
  // 요약으로도 찾는다. 게시판의 이름에는 없지만 요약에 있는 낱말이다.
  await page.getByLabel('기능 찾기').fill('질의응답');
  await expect(page.locator('#capability-board')).toBeVisible();
  await page.getByLabel('기능 찾기').fill('없는 기능');
  await expect(page.locator('#capabilities')).toContainText('‘없는 기능’에 맞는 기능이 없습니다.');
  // 검색을 비우고 계획을 다시 받아도 선택은 그대로다(오래된 계획으로 그린 화면이 아니라 새 계획으로 확인한다).
  await page.getByLabel('기능 찾기').fill('');
  await expect(page.locator('#capability-search-status')).toHaveText('');
  await page.evaluate(() => document.getElementById('composer-form').requestSubmit());
  await expect(page.locator('#preview')).toBeEnabled();
  await expect(page.locator('#domain-count')).toHaveText('1');
  await expect(page.locator('#capability-mail')).toBeChecked();
  // 좁은 화면에서 띄어쓰기 없는 긴 검색어도 가로 스크롤을 만들지 않는다.
  await page.setViewportSize({ width: 360, height: 800 });
  await page.getByLabel('기능 찾기').fill('x'.repeat(48));
  await expect(page.locator('#capabilities')).toContainText('에 맞는 기능이 없습니다');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'a long search term must not scroll horizontally');
  assert.deepEqual(pageErrors, []);
});

/*
 * 자동 포함 설명의 해제 버튼을 누를 때 해제한 기능이 검색으로 가려져 있으면, 검색을 비워 그 카드에 포커스를 둔다.
 */
test('deselecting a root hidden by search clears the search and focuses the root', { timeout: 45_000 }, async t => {
  const { page, pageErrors } = await realCatalogPage(t);
  await expect(page.locator('#domain-count')).toHaveText('0');
  await page.locator('#capability-note').check();
  await expect(page.locator('#domain-count')).toHaveText('7');
  await page.getByLabel('기능 찾기').fill('알림');
  await expect(page.locator('#capability-note')).toBeHidden();
  const board = page.locator('#auto-board');
  await board.getByText('왜 포함됐나').click();
  await board.getByRole('button', { name: '쪽지 해제하기' }).click();
  await expect(page.locator('#capability-note')).toBeFocused();
  await expect(page.locator('#capability-note')).not.toBeChecked();
  await expect(page.getByLabel('기능 찾기')).toHaveValue('');
  await expect(page.locator('#domain-count')).toHaveText('0');
  assert.deepEqual(pageErrors, []);
});

/*
 * 카드에 포커스나 마우스가 오면 고르거나 뺄 때 무엇이 늘고 주는지 한 줄로 보인다(설계서 10장·E3).
 * 빼도 남는 기능은 무엇이 붙잡는지 말하고, 직접 선택으로 바뀌며 생기는 변화도 감추지 않는다.
 * 자동 포함 카드는 직접 바꿀 수 없어 미리보기가 없고, 포커스 뒤에 도착한 문장은 그 카드에 대해서만 한 번 알린다.
 * 시간에 기대지 않도록 계획 요청은 미리 붙잡고, 구성이 바뀐 직후의 화면은 같은 이벤트 처리 안에서 읽는다.
 */
test('feature cards preview what choosing or removing them changes before the click', { timeout: 60_000 }, async t => {
  const { page, pageErrors } = await realCatalogPage(t);
  const recipe = selection => ({ schemaVersion: 1, project: { name: 'my-service' }, sourceRef: 'HEAD', selection, database: { vendor: 'postgresql' }, backendLayout: 'multi-module' });
  const labelOf = id => real.capabilities.find(item => item.id === id).label;
  const announced = page.locator('#capability-preview-status');
  const diffRequests = [];
  page.on('request', request => { if (request.url().endsWith('/api/plan/diff')) diffRequests.push(JSON.parse(request.postData()).domain); });
  await expect(page.locator('#domain-count')).toHaveText('0');
  await page.locator('#capability-mail').focus();
  const choose = realDiff(recipe({ preset: 'core' }), 'mail').summary;
  await expect(page.locator('#preview-mail')).toHaveText(choose);
  await expect(page.locator('#preview-mail')).toContainText('고르면 기능 +1');
  await expect(page.locator('#capability-mail')).toHaveAttribute('aria-describedby', /preview-mail/);
  await expect(announced).toHaveText(`${labelOf('mail')}: ${choose}`);
  await page.locator('#capability-survey').focus();
  const survey = realDiff(recipe({ preset: 'core' }), 'survey').summary;
  await expect(page.locator('#preview-survey')).toHaveText(survey);
  await expect(announced).toHaveText(`${labelOf('survey')}: ${survey}`);
  // 이미 받은 미리보기는 카드 설명으로 읽히므로 다시 포커스해도 알리지 않는다.
  await page.locator('#capability-mail').focus();
  await page.waitForTimeout(300);
  await expect(announced).toHaveText(`${labelOf('survey')}: ${survey}`);
  // 고르는 순간 이전 구성 기준 미리보기와 알림을 모두 지운다. 새 계획이 오기 전에도 옛 문장이 남지 않는다.
  const cleared = await page.locator('#capability-mail').evaluate(input => {
    input.click();
    return ['preview-mail', 'preview-survey', 'capability-preview-status'].map(id => document.getElementById(id).textContent);
  });
  assert.deepEqual(cleared, ['', '', '']);
  await expect(page.locator('#domain-count')).toHaveText('1');
  // 새 계획이 오면 포커스가 있던 카드를 새 구성 기준으로 다시 계산한다.
  await expect(page.locator('#preview-mail')).toHaveText(realDiff(recipe({ domains: ['mail'] }), 'mail').summary);
  await expect(page.locator('#preview-mail')).toContainText('빼면 기능 −1');
  await expect(page.locator('#preview-survey')).toBeHidden();
  // 시작 구성을 바꾸는 순간에도 옛 미리보기를 지우고, 계획이 오면 새 구성 기준으로 다시 계산한다.
  const switched = await page.locator('#preset').evaluate(select => {
    select.value = 'collaboration';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return document.getElementById('preview-mail').textContent;
  });
  assert.equal(switched, '');
  await expect(page.locator('#domain-count')).toHaveText('8');
  await expect(page.locator('#preview-mail')).toHaveText(realDiff(recipe({ preset: 'collaboration' }), 'mail').summary);
  // 시작 구성에서 게시판을 빼려 하면 댓글·대시보드·쪽지·스크랩이 붙잡고, 직접 선택이 되며 들어오는 기능도 밝힌다.
  await page.locator('#capability-board').focus();
  const board = realDiff(recipe({ preset: 'collaboration' }), 'board').summary;
  assert.match(board, /^빼도 댓글, 실시간 대시보드, 쪽지, 스크랩이 요구해 계속 포함됩니다 · 기능 \+3\(들어옴: /);
  await expect(page.locator('#preview-board')).toHaveText(board);
  // 포커스와 마우스는 따로 기다린다. 다른 카드를 지나가는 마우스가 포커스된 카드의 요청을 지우지 않고,
  // 마우스만 올린 카드는 미리보기를 받아도 알리지 않는다.
  await page.evaluate(() => {
    document.getElementById('capability-survey').focus();
    document.getElementById('capability-schedule').closest('label').dispatchEvent(new MouseEvent('mouseenter'));
  });
  const surveyInPreset = realDiff(recipe({ preset: 'collaboration' }), 'survey').summary;
  await expect(page.locator('#preview-survey')).toHaveText(surveyInPreset);
  await expect(page.locator('#preview-schedule')).toHaveText(realDiff(recipe({ preset: 'collaboration' }), 'schedule').summary);
  await page.waitForTimeout(300);
  await expect(announced).toHaveText(`${labelOf('survey')}: ${surveyInPreset}`);
  // 자동 포함이 될 카드도 계획을 확인하기 전에는 미리보기를 묻지 않는다. 계획 요청은 구성을 바꾸기 전에 붙잡는다.
  const held = [];
  await page.route('**/api/plan', route => { held.push(route); });
  await page.locator('#preset').selectOption('custom');
  await expect.poll(() => held.length).toBe(1);
  await expect(page.locator('#capability-help')).toBeEnabled();
  await page.locator('label').filter({ has: page.locator('#capability-help') }).hover();
  // 미리보기 요청은 120ms 뒤에 나간다. 그보다 충분히 기다려도 요청이 없다.
  await page.waitForTimeout(500);
  assert.ok(!diffRequests.includes('help'), diffRequests.join(','));
  for (const route of held.splice(0)) await route.continue();
  await expect(page.locator('#capability-help')).toBeDisabled();
  await page.locator('label').filter({ has: page.locator('#capability-help') }).hover();
  await page.waitForTimeout(500);
  await expect(page.locator('#preview-help')).toBeHidden();
  assert.ok(!diffRequests.includes('help'), diffRequests.join(','));
  // 카드를 누르면 포커스가 먼저 미리보기를 예약하고 곧 구성이 바뀐다. 그 요청은 계획 확인 전의 새 구성으로 나가지 않는다.
  // 게시판이 댓글을 요구하므로 댓글을 빼면 댓글은 자동 포함이 된다.
  await expect(page.locator('#capability-comment')).toBeEnabled();
  await expect(page.locator('#capability-comment')).toBeChecked();
  const sent = diffRequests.length;
  await page.locator('#capability-comment').click();
  await expect.poll(() => held.length).toBe(1);
  await page.waitForTimeout(500);
  assert.deepEqual(diffRequests.slice(sent).filter(id => id === 'comment'), []);
  await expect(page.locator('#preview-comment')).toBeHidden();
  await expect(announced).toHaveText('');
  for (const route of held.splice(0)) await route.continue();
  await page.unroute('**/api/plan');
  await expect(page.locator('#capability-comment')).toBeDisabled();
  await expect(page.locator('#preview-comment')).toBeHidden();
  await page.locator('#capability-sms').hover();
  await expect(page.locator('#preview-sms')).toBeVisible();
  // 포커스가 없는 카드에 마우스만 올리면 미리보기는 보여도 화면 낭독기에는 알리지 않는다.
  await page.waitForTimeout(300);
  await expect(announced).toHaveText('');
  assert.deepEqual(pageErrors, []);
});

/*
 * 생성 전 최종 확인(설계서 19장, E5). 생성 버튼은 곧바로 생성하지 않고 이 컴퓨터의 생성 환경 점검과 구성 요약을 보인다.
 * 차단 항목이 있거나 점검이 실패하면 생성 시작이 잠기고 이유가 버튼 설명으로 붙는다. 경고는 확인하고 진행할 수 있다.
 */
test('the final confirmation shows the environment check and the composition, and blocks generation until it passes', { timeout: 60_000 }, async t => {
  const blocked = { checks: [
    { id: 'docker', status: 'block', code: 'TOOL_UNAVAILABLE', label: 'Docker에 연결할 수 없습니다. Docker Desktop을 시작한 뒤 다시 점검하세요.' },
    { id: 'worktree', status: 'warn', label: '커밋되지 않은 변경 2개가 그대로 생성물에 들어갑니다.' },
  ], blocked: true };
  const warned = { checks: [
    { id: 'docker', status: 'pass', label: 'Docker 엔진이 응답합니다', detail: '29.1.3' },
    { id: 'worktree', status: 'warn', label: '커밋되지 않은 변경 2개가 그대로 생성물에 들어갑니다.' },
  ], blocked: false };
  let next = blocked;
  let runs = 0;
  let deepRuns = 0;
  const { page, pageErrors, release } = await realCatalogPage(t, { preflight: () => {
    runs += 1;
    if (next instanceof Error) throw next;
    return next;
  }, deep: () => { deepRuns += 1; return passingDeep(); } });
  await page.locator('#capability-mail').check();
  await expect(page.locator('#domain-count')).toHaveText('1');
  const generateButton = page.getByRole('button', { name: '프로젝트 생성', exact: true });
  await generateButton.click();
  const dialog = page.getByRole('dialog', { name: '이 구성으로 생성할까요?' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: '돌아가기' })).toBeFocused();
  const start = dialog.getByRole('button', { name: '생성 시작' });
  // 차단 항목은 상태 글자와 함께 보이고, 생성 시작은 이유를 설명으로 단 채 잠긴다.
  await expect(page.locator('#preflight-status')).toHaveText('차단 1건 · 확인 필요 1건');
  await expect(page.locator('#preflight-list li').first()).toHaveText('차단Docker에 연결할 수 없습니다. Docker Desktop을 시작한 뒤 다시 점검하세요.');
  await expect(start).toBeDisabled();
  await expect(start).toHaveAccessibleDescription('차단 항목을 해결한 뒤 다시 점검하세요.');
  // 환경이 이미 생성을 막으면 수 초가 걸리는 소스 정밀 점검은 하지 않고 그 이유를 말한다.
  await expect(page.locator('#deep-status')).toHaveText('생성 환경의 차단 항목을 해결한 뒤 다시 점검하면 이어서 점검합니다.');
  assert.equal(deepRuns, 0);
  // 구성 요약: 직접·자동 기능, 기능 저하, 외부 설정, 검증 순서.
  const summary = page.locator('#confirm-summary');
  await expect(summary).toContainText(`직접 1 · 자동 0 — ${real.capabilities.find(item => item.id === 'mail').label}`);
  await expect(summary).toContainText('알림을 고르지 않아 줄어드는 동작');
  await expect(summary).toContainText('메일 발송에 사용할 SMTP 설정');
  await expect(summary).toContainText('DB 구성, 소스 구성, 의존성 설치, 전체 기술 검증');
  await expect(summary).not.toContainText('수 분');
  // 점검이 실패하면 통과로 보이지 않는다. '다시 점검'은 잠기지 않아 누른 뒤에도 포커스가 그 자리에 남는다.
  next = new Error('probe crashed');
  const retry = dialog.getByRole('button', { name: '다시 점검' });
  await retry.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#preflight-status')).toHaveText('생성 환경을 점검하지 못했습니다. 잠시 후 다시 점검해 주세요.');
  // 환경 점검을 마치지 못했으면 정밀 점검 칸은 없는 '차단 항목'이 아니라 점검을 하지 않은 이유를 말한다.
  await expect(page.locator('#deep-status')).toHaveText('생성 환경 점검을 마치지 못해 소스 정밀 점검을 하지 않았습니다.');
  await expect(retry).toBeFocused();
  await expect(start).toBeDisabled();
  await expect(start).toHaveAccessibleDescription('점검을 마치지 못해 생성할 수 없습니다. 다시 점검하세요.');
  // 생성기 서버에 닿지 못하면 브라우저 영문 오류 대신 한국어로 알린다.
  await page.route('**/api/preflight', route => route.abort());
  await retry.click();
  await expect(page.locator('#preflight-status')).toHaveText('생성기 서버에 연결하지 못했습니다. 생성기가 실행 중인지 확인한 뒤 다시 시도해 주세요.');
  await expect(start).toBeDisabled();
  await page.unroute('**/api/preflight');
  // 경고만 남으면 확인하고 진행할 수 있다.
  next = warned;
  await dialog.getByRole('button', { name: '다시 점검' }).click();
  await expect(page.locator('#preflight-status')).toHaveText('확인 필요 1건이 있습니다. 경고는 생성을 막지 않습니다.');
  await expect(start).toBeEnabled();
  await expect(start).toHaveAccessibleDescription('');
  // 환경 점검이 통과하면 소스 정밀 점검이 이어서 돌고, 둘 다 통과해야 생성 시작이 열린다.
  await expect(page.locator('#deep-status')).toHaveText(`${passingDeep().summary}${DEEP_PASSED}`);
  assert.equal(deepRuns, 1);
  assert.equal(runs, 3, 'the aborted request never reached the server');
  // 돌아가기(Esc)는 생성하지 않고 생성 버튼으로 돌아간다.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(generateButton).toBeFocused();
  await expect(page.locator('#job-panel')).toBeHidden();
  // 다시 열면 새로 점검하고, 생성 시작을 눌러야 생성이 시작된다.
  await generateButton.click();
  await expect(start).toBeEnabled();
  assert.equal(runs, 4);
  await start.click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: '프로젝트 생성 중…' })).toBeDisabled();
  release();
  await expect(page.getByRole('heading', { name: '생성을 완료하지 못했습니다' })).toBeVisible();
  // 좁은 화면에서도 대화상자가 가로로 넘치지 않는다.
  await page.setViewportSize({ width: 360, height: 800 });
  await generateButton.click();
  await expect(dialog).toBeVisible();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  const box = await dialog.boundingBox();
  assert.ok(box.x >= 0 && box.x + box.width <= 360, JSON.stringify(box));
  assert.deepEqual(pageErrors, []);
});

/* 대화상자를 닫았다 다시 열면 새로 점검한다. 늦게 도착한 앞선 점검의 답은 새 점검 결과를 덮지 않는다. */
test('a late answer from an earlier preflight never replaces the latest one', { timeout: 45_000 }, async t => {
  const answers = [
    { checks: [{ id: 'docker', status: 'block', code: 'TOOL_UNAVAILABLE', label: 'Docker에 연결할 수 없습니다. Docker Desktop을 시작한 뒤 다시 점검하세요.' }], blocked: true },
    { checks: [{ id: 'docker', status: 'pass', label: 'Docker 엔진이 응답합니다', detail: '29.1.3' }], blocked: false },
  ];
  let calls = 0;
  const { page, pageErrors } = await realCatalogPage(t, { preflight: () => answers[Math.min(calls++, answers.length - 1)] });
  let releaseFirst;
  const firstHeld = new Promise(resolve => { releaseFirst = resolve; });
  let routed = 0;
  await page.route('**/api/preflight', async route => {
    routed += 1;
    if (routed > 1) return route.continue();
    const response = await route.fetch();
    await firstHeld;
    return route.fulfill({ response });
  });
  await expect(page.locator('#generate')).toBeEnabled();
  await page.locator('#generate').click();
  const dialog = page.getByRole('dialog', { name: '이 구성으로 생성할까요?' });
  await expect(page.locator('#preflight-status')).toHaveText('이 컴퓨터의 생성 환경을 점검하고 있습니다…');
  await expect.poll(() => calls).toBe(1);
  await page.keyboard.press('Escape');
  await page.locator('#generate').click();
  await expect(page.locator('#preflight-status')).toHaveText('생성 환경 점검을 모두 통과했습니다.');
  releaseFirst();
  await expect.poll(() => routed).toBe(2);
  await page.waitForTimeout(500);
  await expect(page.locator('#preflight-status')).toHaveText('생성 환경 점검을 모두 통과했습니다.');
  await expect(dialog.getByRole('button', { name: '생성 시작' })).toBeEnabled();
  assert.deepEqual(pageErrors, []);
});

/*
 * 소스 정밀 점검(설계서 10장 plan/deep, C3). 처음 점검은 이 저장소에서 생성기와 같은 판정을 실제로 돌린다.
 * 차단 사유가 있으면 사유와 파일(앞 다섯 개와 나머지 수)을 보이고 생성 시작을 잠근다. 점검이 실패해도 통과로 보이지 않는다.
 */
test('the source deep check shows the real generator judgement and blocks generation on a projection blocker', { timeout: 120_000 }, async t => {
  const engine = createComposerEngine({ root });
  let real;
  let next = 'real';
  const { page, pageErrors } = await realCatalogPage(t, { deep: recipe => {
    if (next === 'real') return (real = engine.deep(recipe));
    if (next instanceof Error) throw next;
    return next;
  } });
  await page.locator('#capability-mail').check();
  await expect(page.locator('#domain-count')).toHaveText('1');
  await page.getByRole('button', { name: '프로젝트 생성', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '이 구성으로 생성할까요?' });
  const start = dialog.getByRole('button', { name: '생성 시작' });
  await expect(page.locator('#deep-status')).toHaveText(/개\(연쇄 \d+\)/, { timeout: 60_000 });
  assert.match(real.summary, /^제거: Java \d+개\(연쇄 \d+\) · 프런트 \d+개\(연쇄 \d+\) · 검증 게이트 \d+건$/);
  assert.ok(real.java.removedFiles > 0 && real.removedGates.length > 0, 'choosing mail alone removes sources and gates');
  await expect(page.locator('#deep-status')).toHaveText(`${real.summary}${DEEP_PASSED}`);
  await expect(page.locator('#deep-list li')).toHaveCount(0);
  await expect(start).toBeEnabled();

  // 차단 사유: 사유 문장과 파일 앞 다섯 개, 나머지 수. 서버는 파일을 앞 200개만 보내므로 나머지 수는 서버가 센 전체 수로 말한다.
  // 파일 목록이 없으면 투영 오류 문장을 보인다.
  const missing = Array.from({ length: 250 }, (_, index) => `frontend/src/app/mail/page-${index}.tsx`);
  next = { ...passingDeep(), blockers: [
    { code: 'SOURCE_SURVIVAL', label: '선택한 기능의 소스가 투영 중 지워집니다', files: missing },
    { code: 'JAVA_PROJECTION', label: 'Java 소스를 투영할 수 없습니다', message: '필수 모듈이 제외 domain을 참조한다: business-core/X.java -> nuri.Y' },
  ] };
  const retry = dialog.getByRole('button', { name: '다시 점검' });
  await retry.click();
  await expect(page.locator('#deep-status')).toHaveText(`차단 2건 · ${passingDeep().summary}`);
  await expect(page.locator('#deep-list li').nth(0)).toHaveText(`차단선택한 기능의 소스가 투영 중 지워집니다: ${missing.slice(0, 5).join(', ')} 외 245개`);
  await expect(page.locator('#deep-list li').nth(1)).toHaveText('차단Java 소스를 투영할 수 없습니다: 필수 모듈이 제외 domain을 참조한다: business-core/X.java -> nuri.Y');
  await expect(start).toBeDisabled();
  await expect(start).toHaveAccessibleDescription('소스 정밀 점검의 차단 항목을 해결한 뒤 다시 점검하세요.');
  // 점검이 실패하면 통과로 보이지 않고, 앞선 차단 목록도 남기지 않는다.
  next = new Error('C:/Users/me/private-path');
  await retry.click();
  await expect(page.locator('#deep-status')).toHaveText('소스 정밀 점검 결과를 확인하지 못했습니다. 다시 점검해 주세요.');
  await expect(page.locator('#deep-list li')).toHaveCount(0);
  await expect(start).toBeDisabled();
  await expect(start).toHaveAccessibleDescription('정밀 점검을 마치지 못해 생성할 수 없습니다. 다시 점검하세요.');
  // 차단이 풀리면 다시 생성할 수 있다.
  next = passingDeep();
  await retry.click();
  await expect(page.locator('#deep-status')).toHaveText(`${passingDeep().summary}${DEEP_PASSED}`);
  await expect(start).toBeEnabled();
  assert.deepEqual(pageErrors, []);
});

/* 대화상자를 닫았다 다시 열면 새로 점검한다. 늦게 도착한 앞선 정밀 점검의 차단 답은 새 통과 결과를 덮지 않는다. */
test('a late answer from an earlier deep check never replaces the latest one', { timeout: 45_000 }, async t => {
  const answers = [{ ...passingDeep(), blockers: [{ code: 'GATE_STALE', label: '승인 목록에 지워지지 않는 게이트가 남아 있습니다', files: ['api-server/src/test/java/nuri/api/OldTest.java'] }] }, passingDeep()];
  let calls = 0;
  const { page, pageErrors } = await realCatalogPage(t, { deep: () => answers[Math.min(calls++, answers.length - 1)] });
  let releaseFirst;
  const firstHeld = new Promise(resolve => { releaseFirst = resolve; });
  let routed = 0;
  await page.route('**/api/plan/deep', async route => {
    routed += 1;
    if (routed > 1) return route.continue();
    const response = await route.fetch();
    await firstHeld;
    return route.fulfill({ response });
  });
  await expect(page.locator('#generate')).toBeEnabled();
  await page.locator('#generate').click();
  const dialog = page.getByRole('dialog', { name: '이 구성으로 생성할까요?' });
  await expect(page.locator('#deep-status')).toHaveText('선택하지 않은 기능의 소스를 미리 걷어 보고 있습니다…');
  await expect.poll(() => calls).toBe(1);
  await page.keyboard.press('Escape');
  await page.locator('#generate').click();
  await expect(page.locator('#deep-status')).toHaveText(`${passingDeep().summary}${DEEP_PASSED}`);
  releaseFirst();
  await expect.poll(() => routed).toBe(2);
  await page.waitForTimeout(500);
  await expect(page.locator('#deep-status')).toHaveText(`${passingDeep().summary}${DEEP_PASSED}`);
  await expect(page.locator('#deep-list li')).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: '생성 시작' })).toBeEnabled();
  assert.deepEqual(pageErrors, []);
});

/* 창을 닫으면(돌아가기·Esc) 진행 중인 점검을 버린다. 닫힌 창을 위해 정밀 점검이 생성기 서버를 수 초 붙잡지 않는다. */
test('closing the confirmation abandons the running check so no deep check starts for a closed dialog', { timeout: 45_000 }, async t => {
  let deepRuns = 0;
  const { page, pageErrors } = await realCatalogPage(t, { deep: () => { deepRuns += 1; return passingDeep(); } });
  let release;
  const held = new Promise(resolve => { release = resolve; });
  let routed = 0;
  await page.route('**/api/preflight', async route => {
    routed += 1;
    const response = await route.fetch();
    await held;
    return route.fulfill({ response });
  });
  await expect(page.locator('#generate')).toBeEnabled();
  await page.locator('#generate').click();
  await expect.poll(() => routed).toBe(1);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: '이 구성으로 생성할까요?' })).toBeHidden();
  release();
  await page.waitForTimeout(800);
  assert.equal(deepRuns, 0, 'no deep check starts after the dialog closed');
  assert.deepEqual(pageErrors, []);
});

/*
 * 브라우저는 창이 닫힌 뒤 다음 화면 갱신 때 close 이벤트를 보낸다. 그 전에(Esc·돌아가기 직후 Enter) 창을 다시 열어도 새 점검은 끝까지
 * 가야 한다. 같은 작업 안에서 닫고 다시 열어 그 순서를 늘 재현한다.
 */
test('reopening the confirmation before the close event arrives still completes the new check', { timeout: 45_000 }, async t => {
  const { page, pageErrors } = await realCatalogPage(t);
  await expect(page.locator('#generate')).toBeEnabled();
  const dialog = page.getByRole('dialog', { name: '이 구성으로 생성할까요?' });
  for (const close of ['dialog', 'cancel']) {
    await page.locator('#generate').click();
    await expect(dialog.getByRole('button', { name: '생성 시작' })).toBeEnabled();
    await page.evaluate(how => {
      if (how === 'cancel') document.getElementById('confirm-cancel').click();
      else document.getElementById('confirm-dialog').close();
      document.getElementById('generate').click();
    }, close);
    await expect(dialog).toBeVisible();
    await expect(page.locator('#deep-status')).toHaveText(`${passingDeep().summary}${DEEP_PASSED}`);
    await expect(dialog.getByRole('button', { name: '생성 시작' })).toBeEnabled();
    await expect(page.locator('#preflight-retry')).not.toHaveAttribute('aria-disabled', 'true');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  }
  assert.deepEqual(pageErrors, []);
});

/*
 * 요청 오류(설계서 14.2, E4). 서버는 코드와 행동(action)을 주고, 화면은 문장을 상태 줄에, 행동은 그 밖의 버튼으로 잇는다.
 * 이름 규칙은 서버·해석기와 같은 사본(name-rule.js)으로 요청 전에 막는다. 연결 자체가 안 될 때만 서버 실행을 안내한다.
 */
const SOURCE_CHANGED_MESSAGE = '화면을 연 뒤 원본 저장소가 바뀌었습니다. 기능 목록을 새 원본으로 다시 불러온 뒤 확인해 주세요.';
async function errorPage(t, engine = {}, { permissions } = {}) {
  const app = createComposerServer({ engine: { catalog: () => catalog, plan, preflight: passingPreflight, deep: passingDeep,
    generate: async () => { throw new Error('generation is not part of this test'); }, ...engine } });
  const origin = await app.listen(0);
  t.after(() => app.close());
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  if (permissions) await context.grantPermissions(permissions, { origin });
  const page = await context.newPage();
  const pageErrors = [];
  const calls = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('request', request => { const { pathname } = new URL(request.url()); if (pathname.startsWith('/api/')) calls.push(pathname); });
  return { page, origin, pageErrors, count: path => calls.filter(item => item === path).length };
}
const generateButton = page => page.getByRole('button', { name: '프로젝트 생성', exact: true });

test('a reserved Windows name is refused before any request, and a server name refusal uses the same sentence', { timeout: 45_000 }, async t => {
  let serverRefuses = false;
  const { page, origin, pageErrors, count } = await errorPage(t, {
    plan: recipe => { if (serverRefuses) throw new ComposerError('INVALID_NAME', { field: 'project.name' }); return plan(recipe); } });
  await page.goto(origin);
  await expect(generateButton(page)).toBeEnabled();
  const plans = count('/api/plan');
  await page.getByLabel('프로젝트 이름').fill('con');
  await page.getByRole('button', { name: '구성 다시 확인' }).click();
  await expect(page.getByLabel('프로젝트 이름')).toBeFocused();
  await expect(page.getByLabel('프로젝트 이름')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#name-error')).toHaveText(NAME_RULE_MESSAGE);
  await expect(page.locator('#plan-status')).toHaveText('프로젝트 이름을 확인해 주세요.');
  await expect(generateButton(page)).toBeDisabled();
  // 입력 뒤의 자동 확인(250ms)도 요청을 보내지 않는다.
  await page.waitForTimeout(600);
  assert.equal(count('/api/plan'), plans, 'a reserved name never reaches the server');
  // 서버가 이름을 거부하면(규칙이 어긋난 다른 화면 등) 같은 문장을 이름 칸에 달고 포커스를 옮긴다.
  serverRefuses = true;
  await page.getByLabel('프로젝트 이름').fill('agency-service');
  await page.locator('#capability-board').focus();
  await page.getByRole('button', { name: '구성 다시 확인' }).click();
  await expect(page.locator('#plan-status')).toHaveText('프로젝트 이름을 확인해 주세요.');
  await expect(page.locator('#name-error')).toHaveText(NAME_RULE_MESSAGE);
  await expect(page.getByLabel('프로젝트 이름')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('프로젝트 이름')).toBeFocused();
  await expect(page.locator('#plan-actions')).toBeHidden();
  assert.deepEqual(pageErrors, []);
});

test('a changed source offers a reload that keeps the name and selection and shows the new source', { timeout: 45_000 }, async t => {
  let current = catalog;
  let sourceChanged = false;
  const { page, origin, pageErrors, count } = await errorPage(t, { catalog: () => current,
    plan: recipe => { if (sourceChanged) throw new ComposerError('SOURCE_CHANGED', {}, 'Recipe sourceRef does not identify the current checkout'); return plan(recipe); } });
  await page.goto(origin);
  await expect(page.locator('#source-ref')).toHaveText('HEAD · aaaaaaaaaaaa');
  await page.getByLabel('프로젝트 이름').fill('agency-service');
  await page.locator('#capability-notification').check();
  await expect(generateButton(page)).toBeEnabled();
  sourceChanged = true;
  current = { ...catalog, sourceCommit: 'b'.repeat(40) };
  await page.getByRole('button', { name: '구성 다시 확인' }).click();
  await expect(page.locator('#plan-status')).toHaveText(SOURCE_CHANGED_MESSAGE);
  await expect(generateButton(page)).toBeDisabled();
  await expect(page.locator('#plan-status')).not.toContainText('sourceRef');
  // 행동은 상태 문장(live region) 밖에 있어 문장이 한 번만 읽히고 버튼은 Tab 으로 닿는다.
  assert.equal(await page.locator('#plan-status button').count(), 0);
  const reload = page.locator('#plan-actions').getByRole('button', { name: '새 원본으로 다시 불러오기' });
  await expect(reload).toBeVisible();
  sourceChanged = false;
  const sessions = count('/api/session');
  // 키보드로 누르면 버튼이 사라져도 포커스가 요약 제목으로 옮겨 가 위치를 잃지 않는다.
  await reload.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#summary-heading')).toBeFocused();
  await expect(page.locator('#source-ref')).toHaveText('HEAD · bbbbbbbbbbbb');
  await expect(generateButton(page)).toBeEnabled();
  await expect(page.locator('#plan-actions')).toBeHidden();
  await expect(page.getByLabel('프로젝트 이름')).toHaveValue('agency-service');
  await expect(page.locator('#preset')).toHaveValue('custom');
  await expect(page.locator('#capability-notification')).toBeChecked();
  await expect(page.locator('#capability-board')).not.toBeChecked();
  assert.equal(count('/api/session'), sessions + 1, 'the reload asks for the catalog once');
  assert.deepEqual(pageErrors, []);
});

test('a stale menu snapshot shows the real refresh command and copies it', { timeout: 45_000 }, async t => {
  const { page, origin, pageErrors } = await errorPage(t, {
    plan: () => { throw new ComposerError('MENU_SNAPSHOT_STALE', {}, 'Composer menu snapshot: source hash mismatch'); } },
  { permissions: ['clipboard-read', 'clipboard-write'] });
  await page.goto(origin);
  await expect(page.locator('#plan-status')).toContainText('메뉴 미리보기 자료가 원본 DB 변경을 따라가지 못했습니다.');
  await expect(page.locator('#plan-status')).not.toContainText('hash');
  await expect(generateButton(page)).toBeDisabled();
  await expect(page.locator('#plan-actions code')).toHaveText(MENUS_REFRESH_COMMAND);
  await page.locator('#plan-actions').getByRole('button', { name: '명령 복사' }).click();
  await expect(page.locator('#plan-actions').getByRole('status')).toHaveText('복사했습니다.');
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), MENUS_REFRESH_COMMAND);
  assert.deepEqual(pageErrors, []);
});

test('a session failure shows the server sentence with its developer details, and only a lost connection asks to start the server', { timeout: 45_000 }, async t => {
  let failure = new ComposerError('CATALOG_DRIFT', { violations: ['project-composer catalog: declared UI dependency drifted: frontend/src/a.tsx'] });
  const { page, origin, pageErrors } = await errorPage(t, { catalog: () => { throw failure; } });
  await page.goto(origin);
  await expect(page.locator('#connection-message')).toHaveText('기능 선언이 원본 코드와 맞지 않아 구성을 계산할 수 없습니다. 개발자 정보의 위반을 고친 뒤 다시 확인해 주세요.');
  await expect(page.locator('#workspace')).toBeHidden();
  const developer = page.locator('#connection-actions details');
  await expect(developer.locator('summary')).toHaveText('개발자 정보');
  await expect(developer.locator('code')).toBeHidden();
  // 경고(role=alert)는 문장 하나만 담고, 개발자 정보와 버튼은 그 밖에 둔다.
  await expect(page.locator('#connection-message')).toHaveAttribute('role', 'alert');
  assert.equal(await page.locator('#connection-error [role=alert] :is(button, code, details)').count(), 0);
  await developer.locator('summary').click();
  await expect(developer.locator('code')).toHaveText('project-composer catalog: declared UI dependency drifted: frontend/src/a.tsx');
  await expect(developer).toContainText('첫 위반에서 멈춥니다');
  failure = new ComposerError('TOOL_UNAVAILABLE', { tool: 'git' });
  await page.reload();
  await expect(page.locator('#connection-message')).toHaveText('Git 을 실행하지 못했습니다. Git 을 설치하거나 PATH 를 확인한 뒤 생성기를 다시 시작해 주세요.');
  await expect(page.locator('#connection-actions')).toBeHidden();
  // 알 수 없는 코드는 일반 문장이며 원문을 싣지 않는다.
  failure = new ComposerError('SOMETHING_NEW', {}, 'private-detail-must-not-appear');
  await page.reload();
  // 아직 입력 화면이 없으므로 '입력은 유지됩니다' 라고 말하지 않는다.
  await expect(page.locator('#connection-message')).toHaveText('기능 목록을 불러오지 못했습니다. 잠시 후 다시 연결해 주세요.');
  await expect(page.locator('#connection-actions')).toBeHidden();
  await page.route('**/api/session', route => route.abort());
  await page.reload();
  await expect(page.locator('#connection-message')).toHaveText('로컬 생성기에 연결하지 못했습니다. 생성기 서버가 실행 중인지 확인해 주세요.');
  await expect(page.locator('#connection-actions')).toBeHidden();
  assert.deepEqual(pageErrors, []);
});

test('an unknown action or a malformed command from the server shows the sentence without a button', { timeout: 45_000 }, async t => {
  const { page, origin, pageErrors } = await errorPage(t);
  await page.goto(origin);
  await expect(generateButton(page)).toBeEnabled();
  const answer = error => page.route('**/api/plan', route => route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error }) }));
  await answer({ code: 'FUTURE_CODE', message: '새 버전의 오류 문장입니다.', action: 'future-action', details: { command: 'rm -rf /' } });
  await page.getByRole('button', { name: '구성 다시 확인' }).click();
  await expect(page.locator('#plan-status')).toHaveText('새 버전의 오류 문장입니다.');
  await expect(page.locator('#plan-actions')).toBeHidden();
  await page.unroute('**/api/plan');
  await answer({ code: 'MENU_SNAPSHOT_STALE', message: '명령이 없는 응답입니다.', action: 'copy-command', details: { command: 42 } });
  await page.getByRole('button', { name: '구성 다시 확인' }).click();
  await expect(page.locator('#plan-status')).toHaveText('명령이 없는 응답입니다.');
  await expect(page.locator('#plan-actions')).toBeHidden();
  assert.equal(await page.locator('#plan-actions button').count(), 0);
  assert.deepEqual(pageErrors, []);
});

test('a changed source found by the final check closes the dialog and reloads without losing the input', { timeout: 45_000 }, async t => {
  let current = catalog;
  let moved = false;
  let slow = false;
  const { page, origin, pageErrors } = await errorPage(t, {
    catalog: async () => { if (slow) await new Promise(accept => setTimeout(accept, 1500)); return current; },
    preflight: () => moved
      ? { checks: [{ id: 'source', status: 'block', code: 'SOURCE_CHANGED', label: '원본이 새 커밋으로 바뀌었습니다. 화면을 새로 고쳐 새 원본으로 다시 확인하세요.' }], blocked: true }
      : passingPreflight() });
  await page.goto(origin);
  await page.getByLabel('프로젝트 이름').fill('agency-service');
  await page.locator('#capability-notification').check();
  await expect(generateButton(page)).toBeEnabled();
  moved = true;
  current = { ...catalog, sourceCommit: 'c'.repeat(40) };
  await generateButton(page).click();
  const dialog = page.getByRole('dialog', { name: '이 구성으로 생성할까요?' });
  await expect(dialog.locator('#preflight-status')).toHaveText('차단 1건 · 확인 필요 0건');
  await expect(dialog.getByRole('button', { name: '생성 시작' })).toBeDisabled();
  await expect(dialog.locator('#confirm-blocked')).toHaveText('원본이 바뀌어 생성할 수 없습니다. 새 원본으로 다시 불러온 뒤 확인하세요.');
  const reload = dialog.locator('#confirm-actions').getByRole('button', { name: '새 원본으로 다시 불러오기' });
  await expect(reload).toBeVisible();
  moved = false; slow = true;
  await reload.click();
  await expect(dialog).toBeHidden();
  // 새 기능 목록을 받는 동안 옛 계획으로 생성·저장하거나 확인 창을 다시 열지 못한다. 기다려서 보면 다시 받기가 끝난 뒤
  // 새 계획을 확인하는 동안의 잠금과 구분되지 않으므로, 누른 직후의 상태를 바로 읽는다.
  assert.deepEqual(await page.evaluate(() => [document.getElementById('generate').disabled, document.getElementById('download-recipe').disabled]),
    [true, true]);
  slow = false;
  await expect(page.locator('#source-ref')).toHaveText('HEAD · cccccccccccc');
  await expect(generateButton(page)).toBeEnabled();
  await expect(page.getByLabel('프로젝트 이름')).toHaveValue('agency-service');
  await expect(page.locator('#capability-notification')).toBeChecked();
  await generateButton(page).click();
  await expect(dialog.getByRole('button', { name: '생성 시작' })).toBeEnabled();
  await expect(dialog.locator('#confirm-actions')).toBeHidden();
  assert.deepEqual(pageErrors, []);
});

test('a reload that drops a selected feature or preset says so instead of dropping it silently', { timeout: 45_000 }, async t => {
  let current = catalog;
  let slowPlan = false;
  const { page, origin, pageErrors } = await errorPage(t, { catalog: () => current,
    plan: async recipe => { if (slowPlan) await new Promise(accept => setTimeout(accept, 1500)); return plan(recipe); } });
  await page.goto(origin);
  await page.getByLabel('프로젝트 이름').fill('agency-service');
  await page.locator('#capability-board').check();
  await page.locator('#capability-notification').check();
  await expect(generateButton(page)).toBeEnabled();
  // 새 원본에서 알림이 빠졌다.
  current = { ...catalog, sourceCommit: 'd'.repeat(40), capabilities: catalog.capabilities.filter(item => item.id !== 'notification'),
    presets: [{ id: 'core', domains: [] }],
    presentation: { ...catalog.presentation, areas: catalog.presentation.areas.filter(area => area.id !== 'communication'),
      summaries: { board: '게시글 관리', comment: '게시글 의견', scrap: '게시글 보관' }, screens: { board: 1, comment: 0, scrap: 0 } } };
  await page.route('**/api/plan', route => route.fulfill({ status: 409, contentType: 'application/json',
    body: JSON.stringify({ error: { code: 'SOURCE_CHANGED', message: '원본이 바뀌었습니다.', action: 'reload-source' } }) }), { times: 1 });
  await page.getByRole('button', { name: '구성 다시 확인' }).click();
  slowPlan = true;
  await page.locator('#plan-actions').getByRole('button', { name: '새 원본으로 다시 불러오기' }).click();
  await expect(page.locator('#plan-status')).toHaveText('변경한 구성을 확인하고 있습니다… 새 원본에 없는 기능을 선택에서 뺐습니다: 알림.');
  slowPlan = false;
  await expect(page.locator('#plan-status')).toHaveText('포함 범위를 확인했습니다. 이 구성으로 생성할 수 있습니다. 새 원본에 없는 기능을 선택에서 뺐습니다: 알림.');
  await expect(page.locator('#capability-notification')).toHaveCount(0);
  await expect(page.locator('#capability-board')).toBeChecked();
  // 다음 구성 변경부터는 그 안내를 싣지 않는다.
  await page.locator('#capability-board').uncheck();
  await expect(page.locator('#plan-status')).toHaveText('포함 범위를 확인했습니다. 이 구성으로 생성할 수 있습니다.');
  // 고른 시작 구성이 새 원본에서 사라져도 알린다.
  current = catalog;
  await page.reload();
  await page.locator('#preset').selectOption('collaboration');
  await expect(generateButton(page)).toBeEnabled();
  current = { ...catalog, sourceCommit: 'e'.repeat(40), presets: [{ id: 'core', domains: [] }] };
  await page.route('**/api/plan', route => route.fulfill({ status: 409, contentType: 'application/json',
    body: JSON.stringify({ error: { code: 'SOURCE_CHANGED', message: '원본이 바뀌었습니다.', action: 'reload-source' } }) }), { times: 1 });
  await page.getByRole('button', { name: '구성 다시 확인' }).click();
  await page.locator('#plan-actions').getByRole('button', { name: '새 원본으로 다시 불러오기' }).click();
  await expect(page.locator('#plan-status')).toContainText('새 원본에 없는 시작 구성(협업)을 직접 선택으로 바꿨습니다.');
  await expect(page.locator('#preset')).toHaveValue('custom');
  assert.deepEqual(pageErrors, []);
});

test('a reload that fails leaves no plan to generate or save', { timeout: 45_000 }, async t => {
  let sessionFails = false;
  let moved = false;
  const { page, origin, pageErrors } = await errorPage(t, {
    catalog: () => { if (sessionFails) throw new ComposerError('CATALOG_DRIFT', { violations: ['project-composer catalog: drifted'] }); return catalog; },
    preflight: () => moved
      ? { checks: [{ id: 'source', status: 'block', code: 'SOURCE_CHANGED', label: '원본이 새 커밋으로 바뀌었습니다. 화면을 새로 고쳐 새 원본으로 다시 확인하세요.' }], blocked: true }
      : passingPreflight() });
  await page.goto(origin);
  await page.locator('#capability-board').check();
  await expect(generateButton(page)).toBeEnabled();
  await expect(page.getByRole('button', { name: '선택 정보 저장' })).toBeEnabled();
  // 최종 확인이 원본 변경을 찾았고, 새 원본의 기능 목록은 선언 불일치로 받지 못한다.
  moved = true; sessionFails = true;
  await generateButton(page).click();
  const dialog = page.getByRole('dialog', { name: '이 구성으로 생성할까요?' });
  await dialog.locator('#confirm-actions').getByRole('button', { name: '새 원본으로 다시 불러오기' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('#plan-status')).toHaveText('기능 선언이 원본 코드와 맞지 않아 구성을 계산할 수 없습니다. 개발자 정보의 위반을 고친 뒤 다시 확인해 주세요.');
  await expect(generateButton(page)).toBeDisabled();
  await expect(page.getByRole('button', { name: '선택 정보 저장' })).toBeDisabled();
  await expect(page.locator('#plan-actions details')).toBeAttached();
  await expect(page.locator('#summary-heading')).toBeFocused();
  assert.deepEqual(pageErrors, []);
});

test('a generation request rejected by the plan check withdraws the plan and a later job leaves no stale action', { timeout: 60_000 }, async t => {
  let rejectJob = null;
  let generations = 0;
  const { page, origin, pageErrors } = await errorPage(t, {
    plan: recipe => { if (rejectJob) { const error = rejectJob; rejectJob = null; throw error; } return plan(recipe); },
    diff: (recipe, domain) => ({ domain, summary: `옛 원본 기준: ${domain}` }),
    generate: async recipe => { generations += 1; return { projectDirectory: `build/project-composer/${recipe.project.name}`, verified: true }; } });
  await page.goto(origin);
  await page.getByLabel('프로젝트 이름').fill('agency-service');
  await page.locator('#capability-board').check();
  await expect(generateButton(page)).toBeEnabled();
  // 카드 미리보기는 그 계획 기준이다.
  await page.locator('#capability-notification').focus();
  await expect(page.locator('#preview-notification')).toHaveText('옛 원본 기준: notification');
  await expect(page.locator('#plan-degraded')).toBeVisible();
  await expect(page.locator('#domain-count')).toHaveText('3');
  // 확인 창의 점검은 통과했는데 생성 요청의 계획 단계 검사가 낡은 메뉴 자료를 찾았다.
  rejectJob = new ComposerError('MENU_SNAPSHOT_STALE');
  await generateButton(page).click();
  const dialog = page.getByRole('dialog', { name: '이 구성으로 생성할까요?' });
  await dialog.getByRole('button', { name: '생성 시작' }).click();
  await expect(page.locator('#plan-status')).toContainText('메뉴 미리보기 자료가 원본 DB 변경을 따라가지 못했습니다.');
  await expect(page.locator('#plan-actions code')).toHaveText(MENUS_REFRESH_COMMAND);
  await expect(generateButton(page)).toBeDisabled();
  await expect(page.getByRole('button', { name: '선택 정보 저장' })).toBeDisabled();
  await expect(page.locator('#job-panel')).toBeHidden();
  await expect(page.locator('#summary-heading')).toBeFocused();
  // 거둔 계획 기준의 카드 미리보기와 자동 포함 표시도 남지 않는다.
  await expect(page.locator('#preview-notification')).toHaveText('');
  await expect(page.locator('#capability-comment')).not.toBeChecked();
  await expect(page.locator('#plan-degraded')).toBeHidden();
  await expect(page.locator('#plan-unassigned')).toBeHidden();
  await expect(page.locator('#domain-count')).toHaveText('—');
  assert.equal(await page.locator('#menu-preview li').count(), 0);
  assert.equal(generations, 0);
  // 다시 확인하면 행동이 걷히고, 이어지는 생성이 끝나도 옛 행동이 남지 않는다.
  await page.getByRole('button', { name: '구성 다시 확인' }).click();
  await expect(generateButton(page)).toBeEnabled();
  await expect(page.locator('#plan-actions')).toBeHidden();
  await confirmGenerate(page);
  await expect(page.getByRole('heading', { name: '프로젝트가 준비되었습니다' })).toBeVisible();
  await expect(page.locator('#plan-actions')).toBeHidden();
  assert.equal(generations, 1);
  // 원본 변경으로 거부되면 다시 불러오기를 계획 옆에 두고, 앞선 작업의 결과는 그대로 보인다.
  // (같은 구성의 같은 요청은 앞선 작업을 돌려받으므로 이름을 바꿔 새 요청을 만든다.)
  await page.getByLabel('프로젝트 이름').fill('agency-service-two');
  await expect(generateButton(page)).toBeEnabled();
  rejectJob = new ComposerError('SOURCE_CHANGED');
  await generateButton(page).click();
  await dialog.getByRole('button', { name: '생성 시작' }).click();
  await expect(page.locator('#plan-status')).toHaveText(SOURCE_CHANGED_MESSAGE);
  await expect(page.locator('#plan-actions').getByRole('button', { name: '새 원본으로 다시 불러오기' })).toBeVisible();
  // 작업은 시작되지 않았다. 앞선 작업의 결과를 이번 요청의 결과처럼 다시 보이지 않고, 그 작업의 선택 정보도 저장하지 않는다.
  await expect(page.locator('#job-panel')).toBeHidden();
  await expect(page.getByRole('button', { name: '선택 정보 저장' })).toBeDisabled();
  await page.locator('#plan-actions').getByRole('button', { name: '새 원본으로 다시 불러오기' }).click();
  await expect(generateButton(page)).toBeEnabled();
  await expect(page.locator('#job-error')).toBeHidden();
  assert.deepEqual(pageErrors, []);
});

test('a reload that fails while a check is in flight leaves the re-check button usable', { timeout: 45_000 }, async t => {
  let sessionFails = false;
  let slowPlan = false;
  const { page, origin, pageErrors } = await errorPage(t, {
    catalog: async () => {
      if (!sessionFails) return catalog;
      await new Promise(accept => setTimeout(accept, 700));
      throw new ComposerError('CATALOG_DRIFT', { violations: ['project-composer catalog: drifted'] });
    },
    plan: async recipe => { if (slowPlan) await new Promise(accept => setTimeout(accept, 1800)); return plan(recipe); } });
  await page.goto(origin);
  await expect(generateButton(page)).toBeEnabled();
  await page.route('**/api/plan', route => route.fulfill({ status: 409, contentType: 'application/json',
    body: JSON.stringify({ error: { code: 'SOURCE_CHANGED', message: '원본이 바뀌었습니다.', action: 'reload-source' } }) }), { times: 1 });
  await page.getByRole('button', { name: '구성 다시 확인' }).click();
  sessionFails = true; slowPlan = true;
  // 다시 불러오는 동안 구성을 바꿔 느린 확인이 걸린다. 다시 불러오기가 실패하면 그 확인은 버려진다.
  await page.locator('#plan-actions').getByRole('button', { name: '새 원본으로 다시 불러오기' }).click();
  await page.locator('#capability-notification').check();
  await expect(page.locator('#plan-status')).toHaveText('기능 선언이 원본 코드와 맞지 않아 구성을 계산할 수 없습니다. 개발자 정보의 위반을 고친 뒤 다시 확인해 주세요.');
  await page.waitForTimeout(2200);
  await expect(page.locator('#plan-status')).toHaveText('기능 선언이 원본 코드와 맞지 않아 구성을 계산할 수 없습니다. 개발자 정보의 위반을 고친 뒤 다시 확인해 주세요.');
  await expect(page.getByRole('button', { name: '구성 다시 확인' })).toBeEnabled();
  slowPlan = false;
  await page.getByRole('button', { name: '구성 다시 확인' }).click();
  await expect(generateButton(page)).toBeEnabled();
  assert.deepEqual(pageErrors, []);
});

test('a coded deep-check failure in the final confirmation shows its action in the dialog', { timeout: 45_000 }, async t => {
  let deepFailure = new ComposerError('CATALOG_DRIFT', { violations: ['project-composer catalog: declared UI dependency drifted: frontend/src/a.tsx'] });
  const { page, origin, pageErrors, count } = await errorPage(t, { deep: () => { if (deepFailure) throw deepFailure; return passingDeep(); } });
  await page.goto(origin);
  await page.locator('#capability-board').check();
  await expect(generateButton(page)).toBeEnabled();
  await generateButton(page).click();
  const dialog = page.getByRole('dialog', { name: '이 구성으로 생성할까요?' });
  await expect(dialog.locator('#deep-status')).toHaveText('기능 선언이 원본 코드와 맞지 않아 구성을 계산할 수 없습니다. 개발자 정보의 위반을 고친 뒤 다시 확인해 주세요.');
  await expect(dialog.getByRole('button', { name: '생성 시작' })).toBeDisabled();
  await expect(dialog.locator('#confirm-blocked')).toHaveText('기능 선언이 원본 코드와 맞지 않아 생성할 수 없습니다. 개발자 정보의 위반을 고친 뒤 다시 점검하세요.');
  await dialog.locator('#confirm-actions summary').click();
  await expect(dialog.locator('#confirm-actions code')).toHaveText('project-composer catalog: declared UI dependency drifted: frontend/src/a.tsx');
  // 구성을 만들 수 없다고 하면 다시 불러오기가 창을 닫고 새 기능 목록을 받는다.
  deepFailure = new ComposerError('INVALID_RECIPE', { field: 'selection.domains', reason: 'UNAVAILABLE_DOMAIN' });
  await dialog.getByRole('button', { name: '다시 점검' }).click();
  const reload = dialog.locator('#confirm-actions').getByRole('button', { name: '새 원본으로 다시 불러오기' });
  await expect(reload).toBeVisible();
  await expect(dialog.locator('#confirm-blocked')).toHaveText('지금 원본으로는 이 구성을 생성할 수 없습니다. 새 원본으로 다시 불러온 뒤 확인하세요.');
  deepFailure = null;
  const sessions = count('/api/session');
  await reload.click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('#summary-heading')).toBeFocused();
  await expect(generateButton(page)).toBeEnabled();
  assert.equal(count('/api/session'), sessions + 1);
  assert.deepEqual(pageErrors, []);
});
