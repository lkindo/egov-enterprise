import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { startRequirementsServer } from './server.mjs';
import { context, source, analysis, decomposition, envelope } from './test-fixtures/ai.mjs';
const require = createRequire(new URL('../../frontend/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const { default: AxeBuilder } = await import(pathToFileURL(require.resolve('@axe-core/playwright')).href);
async function audit(page, label) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  assert.deepEqual(result.violations.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) })), [], label);
  if (process.env.REQUIREMENTS_TEST_SCREENSHOTS) {
    mkdirSync(process.env.REQUIREMENTS_TEST_SCREENSHOTS, { recursive: true });
    await page.screenshot({ path: join(process.env.REQUIREMENTS_TEST_SCREENSHOTS, `${label}.png`), fullPage: true });
  }
}

test('a changed human scope is visible and needs separate acknowledgement in the actual confirmation UI', async () => {
  const workspace = mkdtempSync(join(tmpdir(), 'synthetic-scope-browser-'));
  let app, browser;
  try {
    app = await startRequirementsServer({ workspace, port: 0, contextProvider: async () => context, aiRunner: async ({ request }) => { const value = analysis(request, { question: false }); value.requirements[0].scope = 'included'; return envelope(value); } });
    const act = (action, payload) => app.engine.action(app.store.read().revision, action, payload);
    await act('project.save', { code: 'SYNTHETIC', name: '합성 범위 변경', institution: '합성 기관', baselineProfile: '' });
    await act('source.save', source);
    await act('requirement.save', { requirement: { id: 'REQ-1', title: '접수 목록 조회', description: '본인 접수 목록 조회', sourceIds: [source.id], requirementType: 'functional', solutionDisposition: 'gap-dev', scopeDisposition: 'excluded', rationale: '기관의 명시적 제외 결정', moduleCandidates: [], openQuestions: [], acceptanceDisposition: 'pending' }, clauseIds: [`${source.id}/${source.clauses[0].id}`], reviewed: true });
    browser = await chromium.launch({ headless: true });
    const browserContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await browserContext.newPage();
    await page.goto(`${app.url}/#launch=${app.launchSecret}`);
    await page.getByRole('button', { name: 'AI 요구사항 생성', exact: true }).click();
    await page.locator('[name="ai-consent"]').check();
    await page.getByRole('button', { name: '동의하고 AI 분석 시작', exact: true }).click();
    await page.getByRole('button', { name: '요구사항 확정하고 에픽 생성', exact: true }).click();
    await page.locator('[name="continue-ai"]').uncheck();
    await page.getByLabel('AI가 생성한 요구사항과 원문 근거를 검토했습니다.', { exact: true }).check();
    await audit(page, 'ai-scope-change-dialog');
    await page.getByRole('button', { name: '요구사항만 확정', exact: true }).click();
    assert.equal((await app.engine.state()).backlog.businessRequirements[0].scopeDisposition, 'excluded');
    await page.getByLabel('REQ-1: 기존 업무 범위 변경 (제외 → 포함)에 동의합니다.', { exact: true }).check();
    await page.getByRole('button', { name: '요구사항만 확정', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal((await app.engine.state()).backlog.businessRequirements[0].scopeDisposition, 'included');
  } catch (error) {
    const redact = value => String(value ?? '').replaceAll(app?.launchSecret ?? '\0', '[redacted]').replace(/#launch=[A-Za-z0-9_%.-]+/g, '#launch=[redacted]');
    const safe = new Error(redact(error.message)); safe.stack = redact(error.stack); throw safe;
  } finally { await browser?.close(); await app?.close(); rmSync(workspace, { recursive: true, force: true }); }
});

test('the file upload UI registers real multi-format documents and continues into AI analysis', async () => {
  const workspace = mkdtempSync(join(tmpdir(), 'synthetic-upload-browser-'));
  let app, browser;
  try {
    app = await startRequirementsServer({ workspace, port: 0, contextProvider: async () => context, aiRunner: async ({ request }) => envelope(analysis(request, { question: false })) });
    await app.engine.action(app.store.read().revision, 'project.save', { code: 'SYNTHETIC', name: '합성 파일 등록', institution: '합성 기관', baselineProfile: '' });
    browser = await chromium.launch({ headless: true });
    const browserContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await browserContext.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${app.url}/#launch=${app.launchSecret}`);
    await page.getByRole('button', { name: '산출물 파일 등록', exact: true }).click();
    assert.equal(await page.locator('[data-action="import-stop"]').isVisible(), false, 'stop is shown only while a registration is active');
    const checkboxBox = await page.locator('[name="redacted"]').boundingBox();
    assert.ok(checkboxBox.width <= 24 && checkboxBox.height <= 24, 'checkbox is not stretched by text-field styling');
    await audit(page, 'ai-upload-dialog');
    const filenames = ['receipt.hwp', 'receipt.hwpx', 'receipt.docx', 'receipt.xlsx', 'receipt.pdf', 'receipt.png', 'scanned-receipt.pdf'];
    await page.locator('#artifact-files').setInputFiles(filenames.map(filename => fileURLToPath(new URL(`./test-fixtures/${filename}`, import.meta.url))));
    await page.locator('[name="redacted"]').check();
    await page.locator('[name="ai-consent"]').check();
    await page.getByRole('button', { name: '등록하고 계속', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 90000 });
    await page.getByRole('button', { name: '요구사항 확정하고 에픽 생성', exact: true }).waitFor({ timeout: 15000 });
    const state = await app.engine.state();
    assert.equal(state.backlog.sources.length, filenames.length);
    assert.equal(state.imports.jobs.every(job => job.status === 'ready'), true);
    assert.equal(state.ai.proposal.requirements[0].citations.length >= filenames.length, true);
    for (const source of state.backlog.sources) assert.ok(app.engine.sourceFile(source.id).base64);
    assert.deepEqual(errors, []);
  } catch (error) {
    const redact = value => String(value ?? '').replaceAll(app?.launchSecret ?? '\0', '[redacted]').replace(/#launch=[A-Za-z0-9_%.-]+/g, '#launch=[redacted]');
    const safe = new Error(redact(error.message)); safe.stack = redact(error.stack); throw safe;
  } finally { await browser?.close(); await app?.close(); rmSync(workspace, { recursive: true, force: true }); }
});

test('real UI runs AI analysis, resolves decisions, confirms requirements and automatically generates epics', async () => {
  const workspace = mkdtempSync(join(tmpdir(), 'synthetic-ai-browser-'));
  let app, browser;
  try {
    let releaseInitial, initial = true, failPoll = false, pollFailed = false;
    const initialAnalysis = new Promise(resolve => { releaseInitial = resolve; });
    app = await startRequirementsServer({ workspace, port: 0, contextProvider: async () => context, aiRunner: async ({ request }) => { if (initial) { initial = false; await initialAnalysis; } return envelope(request.phase === 'analysis' ? analysis(request) : decomposition()); } });
    const act = (name, payload) => app.engine.action(app.store.read().revision, name, payload);
    await act('project.save', { code: 'SYNTHETIC', name: '합성 접수 업무', institution: '합성 기관', baselineProfile: '' });
    await act('source.save', source);
    browser = await chromium.launch({ headless: true });
    const browserContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await browserContext.newPage();
    await page.route('**/api/state', async route => {
      if (failPoll && !pollFailed) { pollFailed = true; await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ code: 'SYNTHETIC_TRANSIENT', message: '합성 일시 통신 오류' }) }); releaseInitial(); }
      else await route.continue();
    });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${app.url}/#launch=${app.launchSecret}`);
    await page.getByRole('button', { name: 'AI 요구사항 생성', exact: true }).click({ timeout: 5000 });
    await page.getByLabel('등록된 비식별 자료를 선택한 CLI의 모델 서비스로 보내 분석하는 데 동의합니다.', { exact: true }).check();
    failPoll = true;
    await page.getByRole('button', { name: '동의하고 AI 분석 시작', exact: true }).click();
    await page.getByRole('heading', { name: 'AI가 확인을 요청한 사항', exact: true }).waitFor({ timeout: 12000 });
    assert.equal(pollFailed, true, 'a transient background fetch failure was actually injected');
    for (const dark of [false, true]) {
      if (dark) await page.getByRole('button', { name: '다크 모드로 전환' }).click();
      for (const width of [390, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await audit(page, `ai-decisions-${width}-${dark ? 'dark' : 'light'}`);
      }
    }
    await page.getByRole('button', { name: '라이트 모드로 전환' }).click();
    await page.getByRole('button', { name: '답변하고 계속', exact: true }).click();
    await page.getByLabel('접수 열람 범위를 결정해 주세요.', { exact: true }).fill('담당자는 본인 접수만 열람한다.');
    await page.getByRole('button', { name: '답변을 반영하고 AI 계속 실행', exact: true }).click();
    await page.getByRole('button', { name: '요구사항 확정하고 에픽 생성', exact: true }).waitFor();
    await page.reload();
    await page.getByRole('button', { name: '요구사항 확정하고 에픽 생성', exact: true }).click();
    await audit(page, 'ai-confirm-dialog');
    await page.getByLabel('AI가 생성한 요구사항과 원문 근거를 검토했습니다.', { exact: true }).check();
    await page.getByRole('button', { name: '확정하고 에픽·스토리 생성', exact: true }).click();
    await page.getByRole('button', { name: '에픽·스토리 반영', exact: true }).waitFor();
    await page.getByRole('button', { name: '에픽·스토리 반영', exact: true }).click();
    await page.getByLabel('생성된 작업과 인수조건의 변경 내용을 검토했습니다.', { exact: true }).check();
    await page.getByRole('button', { name: '검토한 작업 반영', exact: true }).click();
    await page.getByRole('link', { name: /에픽·스토리/ }).click();
    await page.getByRole('heading', { name: '에픽·스토리', exact: true }).waitFor();
    assert.match(await page.locator('#main').innerText(), /접수 목록 조회/);
    assert.equal((await app.engine.state()).readiness.valid, true);
    assert.deepEqual(errors, []);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  } catch (error) {
    const redact = value => String(value ?? '').replaceAll(app?.launchSecret ?? '\0', '[redacted]').replace(/#launch=[A-Za-z0-9_%.-]+/g, '#launch=[redacted]');
    const safe = new Error(redact(error.message)); safe.stack = redact(error.stack); throw safe;
  } finally { await browser?.close(); await app?.close(); rmSync(workspace, { recursive: true, force: true }); }
});
