import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { startRequirementsServer } from './server.mjs';
import { context, source, envelope } from './test-fixtures/ai.mjs';
import { pipelineReply } from './test-fixtures/pipeline.mjs';
import { randomUUID } from 'node:crypto';
import { AI_MODEL } from './ai-cli.mjs';
const require = createRequire(new URL('../../frontend/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const { default: AxeBuilder } = await import(pathToFileURL(require.resolve('@axe-core/playwright')).href);

test('an interrupted original-reading queue can resume visibly without re-reading completed originals', async () => {
  const workspace = mkdtempSync(join(tmpdir(), 'synthetic-reading-resume-')); let app, browser;
  let readings = 0, releaseReading;
  try {
    app = await startRequirementsServer({ workspace, port: 0, contextProvider: async () => context, aiRunner: async ({ request }) => {
      if (request.phase === 'reading' && ++readings === 2) await new Promise(resolve => { releaseReading = resolve; });
      return envelope(pipelineReply(request));
    } });
    const upload = (filename, text) => app.engine.action(app.store.read().revision, 'source.ingest', { requestId: randomUUID(), filename, base64: Buffer.from(text).toString('base64'), classification: 'internal', sourceType: 'interview', sensitivityAcknowledged: true, readWithAI: true, consent: true, model: AI_MODEL });
    await upload('first.txt', '담당자는 본인 접수 목록만 조회한다.'); await app.engine.waitForImports();
    await app.engine.action(app.store.read().revision, 'source.ingest', { requestId: randomUUID(), filename: 'second.txt', base64: Buffer.from('빈 접수 목록은 빈 결과로 표시한다.').toString('base64'), classification: 'internal', sourceType: 'interview', sensitivityAcknowledged: true, readWithAI: false }); await app.engine.waitForImports();
    await app.engine.action(app.store.read().revision, 'source.ingest', { requestId: randomUUID(), filename: 'third.txt', base64: Buffer.from('조회 결과는 최근 접수일 순서로 정렬한다.').toString('base64'), classification: 'internal', sourceType: 'interview', sensitivityAcknowledged: true, readWithAI: false }); await app.engine.waitForImports();
    browser = await chromium.launch({ headless: true }); const page = await browser.newPage(); page.setDefaultTimeout(10000);
    await page.goto(app.launchUrl);
    await page.getByRole('button', { name: 'AI 판독 이어서 진행', exact: true }).click();
    await page.locator('[name="sensitivityAcknowledged"]').check(); await page.locator('[name="ai-consent"]').check();
    await page.getByRole('button', { name: '동의하고 전체 AI 처리 시작', exact: true }).click();
    const viewer = await browser.newPage(); viewer.setDefaultTimeout(10000); await viewer.goto(app.launchUrl);
    await viewer.getByRole('heading', { name: 'AI 원본 판독 진행 중', exact: true }).waitFor();
    assert.match(await viewer.getByRole('region', { name: 'AI 판독 진행' }).textContent(), /완료 기록 1\/3건/);
    assert.match(await viewer.getByRole('region', { name: 'AI 판독 진행' }).textContent(), /2\/3번째 자료/);
    assert.equal(await viewer.getByRole('button', { name: 'AI 판독 이어서 진행', exact: true }).isEnabled(), false);
    assert.equal(readings, 2);
    await page.close(); releaseReading(); releaseReading = undefined; await app.engine.waitForImports();
    assert.equal(readings, 2); assert.equal((await app.engine.state()).ai.current, null);
    await viewer.getByRole('button', { name: 'AI 판독 이어서 진행', exact: true }).click();
    await viewer.locator('[name="sensitivityAcknowledged"]').check(); await viewer.locator('[name="ai-consent"]').check();
    await viewer.getByRole('button', { name: '동의하고 전체 AI 처리 시작', exact: true }).click();
    await viewer.getByRole('button', { name: '전체 초안 확인·반영', exact: true }).waitFor({ timeout: 90000 });
    assert.equal(readings, 3, 'both completed originals must be reused after closing the first queue window');
    assert.equal((await app.engine.state()).metadata.baselines.length, 0);
  } catch (error) {
    const safe = new Error(String(error.message).replaceAll(app?.launchSecret ?? '\0', '[redacted]').replace(/#launch=[A-Za-z0-9_%.-]+/g, '#launch=[redacted]')); throw safe;
  } finally { releaseReading?.(); await browser?.close(); await app?.close(); rmSync(workspace, { recursive: true, force: true }); }
});

test('a disconnected UI reconnects with a same-origin launcher address without transmitting it elsewhere', async () => {
  const workspace = mkdtempSync(join(tmpdir(), 'synthetic-reconnect-ui-')); let app, browser;
  try {
    app = await startRequirementsServer({ workspace, port: 0, contextProvider: async () => context });
    browser = await chromium.launch({ headless: true }); const page = await browser.newPage(); page.setDefaultTimeout(10000);
    const foreign = []; page.on('request', request => { if (new URL(request.url()).origin !== app.url) foreign.push(request.url()); });
    await page.goto(app.url);
    await page.getByLabel('실행기 전체 주소', { exact: true }).fill('https://example.invalid/#launch=untrusted');
    await page.getByRole('button', { name: '다시 연결', exact: true }).click();
    await page.getByText('현재 실행기의 전체 주소를 #launch= 부분까지 입력해 주세요.', { exact: true }).waitFor();
    await page.getByLabel('실행기 전체 주소', { exact: true }).fill(app.launchUrl);
    await page.getByRole('button', { name: '다시 연결', exact: true }).click();
    await page.getByRole('button', { name: '프로젝트 정보', exact: true }).waitFor();
    assert.equal(new URL(page.url()).hash, ''); assert.deepEqual(foreign, []);
    await page.getByRole('button', { name: '프로젝트 정보', exact: true }).click();
    await page.getByLabel('프로젝트 코드', { exact: true }).fill('SYNTHETIC');
    await page.getByLabel('프로젝트 이름', { exact: true }).fill('보존할 합성 초안');
    const oldLaunch = app.launchUrl, port = Number(new URL(app.url).port); await app.close();
    app = await startRequirementsServer({ workspace, port, contextProvider: async () => context });
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await page.getByRole('button', { name: '실행기 주소로 다시 연결', exact: true }).click();
    assert.equal(await page.getByLabel('실행기 전체 주소', { exact: true }).evaluate(input => input.form === null), true, 'launcher credentials are not project form data');
    assert.equal(await page.getByLabel('프로젝트 이름', { exact: true }).inputValue(), '보존할 합성 초안');
    assert.equal(await page.getByRole('button', { name: '저장', exact: true }).count(), 1);
    await page.getByLabel('실행기 전체 주소', { exact: true }).fill(oldLaunch);
    await page.getByRole('button', { name: '다시 연결', exact: true }).click();
    await page.getByRole('dialog').getByText('실행기 터미널의 전체 주소로 연결해 주세요.', { exact: true }).waitFor();
    assert.equal(new URL(page.url()).hash, '');
    assert.equal(await page.getByLabel('프로젝트 이름', { exact: true }).inputValue(), '보존할 합성 초안');
    await page.getByLabel('실행기 전체 주소', { exact: true }).fill(app.launchUrl);
    await page.getByRole('button', { name: '다시 연결', exact: true }).click();
    await page.getByRole('dialog').getByText('연결을 복구했습니다. 현재 입력을 확인하고 다시 실행하세요.', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('프로젝트 이름', { exact: true }).inputValue(), '보존할 합성 초안');
    page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: '취소', exact: true }).click();
    assert.equal(new URL(page.url()).hash, '');
    assert.equal((await app.engine.state()).ai.current, null, 'reconnecting does not implicitly start model work');
    const other = await browser.newPage(); other.setDefaultTimeout(10000); await other.goto(app.url);
    await other.evaluate(url => { location.hash = new URL(url).hash; }, app.launchUrl);
    await other.getByRole('button', { name: '프로젝트 정보', exact: true }).waitFor();
  } catch (error) {
    const safe = new Error(String(error.message).replaceAll(app?.launchSecret ?? '\0', '[redacted]').replace(/#launch=[A-Za-z0-9_%.-]+/g, '#launch=[redacted]')); throw safe;
  } finally { await browser?.close(); await app?.close(); rmSync(workspace, { recursive: true, force: true }); }
});

for (const differentWorkspace of [true, false]) test(differentWorkspace ? 'reconnecting to another workspace cannot save the previous workspace draft there' : 'reconnecting to the same workspace preserves concurrent changes through CAS', async () => {
  const workspace = mkdtempSync(join(tmpdir(), 'synthetic-workspace-binding-a-'));
  const otherWorkspace = mkdtempSync(join(tmpdir(), 'synthetic-workspace-binding-b-')); let app, browser;
  try {
    app = await startRequirementsServer({ workspace, port: 0, contextProvider: async () => context });
    browser = await chromium.launch({ headless: true }); const page = await browser.newPage(); page.setDefaultTimeout(10000);
    await page.goto(app.launchUrl); await page.getByRole('button', { name: '프로젝트 정보', exact: true }).click();
    await page.getByLabel('프로젝트 코드', { exact: true }).fill('SYNTHETIC-A'); await page.getByLabel('프로젝트 이름', { exact: true }).fill('다른 작업공간에 보내면 안 되는 합성 초안');
    if (!differentWorkspace) await app.engine.action(app.store.read().revision, 'project.save', { code: 'SYNTHETIC-OTHER', name: '다른 작성자가 저장한 합성 내용', institution: '합성 기관', baselineProfile: 'core' });
    const port = Number(new URL(app.url).port); await app.close();
    app = await startRequirementsServer({ workspace: differentWorkspace ? otherWorkspace : workspace, port, contextProvider: async () => context });
    const before = structuredClone((await app.engine.state()).backlog.project);
    await page.getByRole('button', { name: '저장', exact: true }).click(); await page.getByRole('button', { name: '실행기 주소로 다시 연결', exact: true }).click();
    await page.getByLabel('실행기 전체 주소', { exact: true }).fill(app.launchUrl); await page.getByRole('button', { name: '다시 연결', exact: true }).click();
    await page.getByRole('dialog').getByText(differentWorkspace ? '다른 작업공간의 실행기입니다. 현재 입력을 보존하고 해당 작업공간은 새 창에서 열어 주세요.' : '연결을 복구했습니다. 현재 입력을 확인하고 다시 실행하세요.', { exact: true }).waitFor();
    const message = await page.getByRole('dialog').locator('.form-errors').textContent();
    const posted = page.waitForResponse(response => new URL(response.url()).pathname === '/api/action' && response.request().method() === 'POST');
    await page.getByRole('button', { name: '저장', exact: true }).click();
    assert.equal((await posted).status(), differentWorkspace ? 403 : 409);
    assert.deepEqual((await app.engine.state()).backlog.project, before);
    if (differentWorkspace) assert.match(message, /다른 작업공간/);
  } catch (error) {
    const safe = new Error(String(error.message).replaceAll(app?.launchSecret ?? '\0', '[redacted]').replace(/#launch=[A-Za-z0-9_%.-]+/g, '#launch=[redacted]')); throw safe;
  } finally { await browser?.close(); await app?.close(); rmSync(workspace, { recursive: true, force: true }); rmSync(otherWorkspace, { recursive: true, force: true }); }
});

test('a server restart during a selected upload batch preserves the files and resumes failed requests', async () => {
  const workspace = mkdtempSync(join(tmpdir(), 'synthetic-upload-reconnect-')); let app, browser, started;
  const secondStarted = new Promise(resolve => { started = resolve; }); let readings = 0;
  const runner = async ({ request, signal }) => {
    if (request.phase === 'reading' && ++readings === 2) { started(); await new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(Object.assign(new Error('Synthetic interrupted reading'), { code: 'AI_CANCELLED' })), { once: true })); }
    return envelope(pipelineReply(request));
  };
  try {
    app = await startRequirementsServer({ workspace, port: 0, contextProvider: async () => context, aiRunner: runner });
    browser = await chromium.launch({ headless: true }); const page = await browser.newPage(); page.setDefaultTimeout(10000);
    await page.goto(app.launchUrl); await page.getByRole('button', { name: 'AI로 산출물 등록', exact: true }).click();
    await page.locator('#artifact-files').setInputFiles(['담당자는 본인 접수 목록만 조회한다.', '빈 접수 목록은 빈 결과로 표시한다.', '조회 결과는 최근 접수일 순서로 정렬한다.'].map((text, index) => ({ name: `source-${index + 1}.txt`, mimeType: 'text/plain', buffer: Buffer.from(text) })));
    await page.locator('[name="sensitivityAcknowledged"]').check(); await page.locator('[name="ai-consent"]').check(); await page.getByRole('button', { name: '등록하고 계속', exact: true }).click();
    await secondStarted; const port = Number(new URL(app.url).port); await app.close();
    await page.getByRole('button', { name: '실행기 주소로 다시 연결', exact: true }).waitFor();
    await page.getByRole('dialog').locator('.form-errors').getByText('실행기와 연결이 끊겼습니다. 실행기를 다시 시작한 뒤 전체 주소로 다시 연결해 주세요.', { exact: true }).waitFor();
    await page.waitForFunction(() => document.querySelector('#server-reading-status')?.textContent.includes('실행기와 연결이 끊겼습니다.'));
    app = await startRequirementsServer({ workspace, port, contextProvider: async () => context, aiRunner: runner });
    const viewer = await browser.newPage(); viewer.setDefaultTimeout(10000); await viewer.goto(app.launchUrl);
    assert.match(await viewer.getByRole('region', { name: 'AI 판독 진행' }).textContent(), /등록을 완료하지 못한 파일 1건/);
    await viewer.getByRole('button', { name: '남은 파일 추가', exact: true }).waitFor();
    await page.getByRole('button', { name: '등록하고 계속', exact: true }).click();
    await page.getByRole('button', { name: '실행기 주소로 다시 연결', exact: true }).click(); await page.getByLabel('실행기 전체 주소', { exact: true }).fill(app.launchUrl); await page.getByRole('button', { name: '다시 연결', exact: true }).click();
    await page.getByRole('dialog').getByText('연결을 복구했습니다. 현재 입력을 확인하고 다시 실행하세요.', { exact: true }).waitFor();
    await app.close();
    await page.getByRole('button', { name: '실행기 주소로 다시 연결', exact: true }).waitFor();
    app = await startRequirementsServer({ workspace, port, contextProvider: async () => context, aiRunner: runner });
    await page.getByRole('button', { name: '실행기 주소로 다시 연결', exact: true }).click(); await page.getByLabel('실행기 전체 주소', { exact: true }).fill(app.launchUrl); await page.getByRole('button', { name: '다시 연결', exact: true }).click();
    assert.equal(await page.locator('#artifact-files').evaluate(input => input.files.length), 3);
    assert.equal(await page.locator('[name="ai-consent"]').isChecked(), true);
    await page.getByRole('button', { name: '등록하고 계속', exact: true }).click();
    try { await page.getByRole('button', { name: '전체 초안 확인·반영', exact: true }).waitFor({ timeout: 90000 }); }
    catch { const value = await app.engine.state(); throw new Error(JSON.stringify({ readings, ai: value.ai.current?.status, fullPipeline: value.ai.current?.fullPipeline, imports: value.imports.jobs.map(job => job.status), ui: await page.evaluate(() => ({ open: document.querySelector('#dialog').open, busy: document.body.getAttribute('aria-busy'), confirmation: document.querySelector('[data-action="ai-confirm"]')?.textContent, error: document.querySelector('.form-errors')?.textContent })) })); }
    assert.equal(readings, 4, 'one completed reading is reused; the interrupted second file is retried once, then the third is read');
    assert.equal((await app.engine.state()).backlog.sources.length, 3); assert.equal((await app.engine.state()).metadata.baselines.length, 0);
  } catch (error) {
    const safe = new Error(String(error.message).replaceAll(app?.launchSecret ?? '\0', '[redacted]').replace(/#launch=[A-Za-z0-9_%.-]+/g, '#launch=[redacted]')); throw safe;
  } finally { await browser?.close(); await app?.close(); rmSync(workspace, { recursive: true, force: true }); }
});

test('an open failed analysis dialog follows actual server progress without losing consent or re-reading completed files', async () => {
  const workspace = mkdtempSync(join(tmpdir(), 'synthetic-dialog-live-progress-')); let app, browser, release;
  let readings = 0;
  try {
    app = await startRequirementsServer({ workspace, port: 0, contextProvider: async () => context, aiRunner: async ({ request }) => {
      if (request.phase === 'reading') {
        readings++;
        if (readings === 1) throw Object.assign(new Error('Synthetic invalid reading'), { code: 'AI_DOCUMENT_OUTPUT_INVALID' });
        if (readings === 3) await new Promise(resolve => { release = resolve; });
      }
      return envelope(pipelineReply(request));
    } });
    const act = (name, payload) => app.engine.action(app.store.read().revision, name, payload);
    for (const [index, text] of ['담당자는 본인 접수 목록만 조회한다.', '빈 목록은 빈 결과로 표시한다.'].entries()) {
      await act('source.ingest', { requestId: randomUUID(), filename: `source-${index + 1}.txt`, base64: Buffer.from(text).toString('base64'), classification: 'internal', sourceType: 'interview', sensitivityAcknowledged: true, readWithAI: false }); await app.engine.waitForImports();
    }
    browser = await chromium.launch({ headless: true }); const page = await browser.newPage(); page.setDefaultTimeout(15000);
    await page.goto(app.launchUrl); await page.getByRole('button', { name: 'AI 판독 이어서 진행', exact: true }).click();
    await page.locator('[name="sensitivityAcknowledged"]').check(); await page.locator('[name="ai-consent"]').check(); await page.getByRole('button', { name: '동의하고 전체 AI 처리 시작', exact: true }).click();
    await page.locator('.form-errors').filter({ hasText: 'AI_DOCUMENT_OUTPUT_INVALID' }).waitFor();
    const sources = (await app.engine.state()).backlog.sources;
    for (const source of sources) { await act('source.reingest', { sourceId: source.id, requestId: randomUUID(), consent: true, sensitivityAcknowledged: true, model: AI_MODEL }); if (source.id === sources[0].id) await app.engine.waitForImports(); }
    await page.waitForFunction(() => document.querySelector('#server-reading-status')?.textContent.includes('2/2번째 자료'));
    assert.match(await page.locator('#server-reading-status').textContent(), /완료 기록 1\/2건/);
    assert.match(await page.locator('#full-progress').textContent(), /^이 창의 마지막 요청: 1\/2/);
    assert.equal(await page.locator('[name="ai-consent"]').isChecked(), true);
    release(); release = undefined; await app.engine.waitForImports();
    await page.waitForFunction(() => document.querySelector('#server-reading-status')?.textContent.includes('완료 기록 2/2건'));
    await page.context().setOffline(true);
    await page.waitForFunction(() => document.querySelector('#server-reading-status')?.textContent.includes('실행기와 연결이 끊겼습니다.'));
    page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: '취소', exact: true }).click();
    assert.match(await page.getByRole('region', { name: 'AI 판독 진행', exact: true }).textContent(), /완료 기록 2\/2건/);
    await page.locator('#page-errors').getByRole('button', { name: '실행기 주소로 다시 연결', exact: true }).waitFor();
    await page.context().setOffline(false);
    await page.getByRole('button', { name: 'AI 판독 이어서 진행', exact: true }).click();
    await page.locator('[name="sensitivityAcknowledged"]').check(); await page.locator('[name="ai-consent"]').check(); await page.getByRole('button', { name: '동의하고 전체 AI 처리 시작', exact: true }).click();
    try { await page.getByRole('button', { name: '전체 초안 확인·반영', exact: true }).waitFor({ timeout: 90000 }); }
    catch (error) {
      const view = await app.engine.state().catch(() => null);
      error.message += '\nSynthetic recovery state: ' + JSON.stringify({ aiStatus: view?.ai.current?.status ?? null, aiError: view?.ai.current?.errorCode ?? null, stage: view?.ai.current?.stage ?? null, importsActive: view?.imports.active ?? null, readings, dialogOpen: await page.locator('#dialog').evaluate(element => element.open, undefined, { timeout: 1000 }).catch(() => null), dialogError: await page.locator('#editor .form-errors').textContent({ timeout: 1000 }).catch(() => null), pageError: await page.locator('#page-errors').textContent({ timeout: 1000 }).catch(() => null) });
      throw error;
    }
    assert.equal(readings, 3); assert.equal((await app.engine.state()).metadata.baselines.length, 0);
  } catch (error) {
    const safe = new Error(String(error.message).replaceAll(app?.launchSecret ?? '\0', '[redacted]').replace(/#launch=[A-Za-z0-9_%.-]+/g, '#launch=[redacted]')); throw safe;
  } finally { release?.(); await browser?.close(); await app?.close(); rmSync(workspace, { recursive: true, force: true }); }
});

test('closing a failed first upload in the same window exposes resume and remaining-file actions', async () => {
  const workspace = mkdtempSync(join(tmpdir(), 'synthetic-close-failed-upload-')); let app, browser, readings = 0;
  try {
    app = await startRequirementsServer({ workspace, port: 0, contextProvider: async () => context, aiRunner: async ({ request }) => {
      if (request.phase === 'reading' && ++readings === 2) throw Object.assign(new Error('Synthetic invalid second reading'), { code: 'AI_DOCUMENT_OUTPUT_INVALID' });
      return envelope(pipelineReply(request));
    } });
    browser = await chromium.launch({ headless: true }); const page = await browser.newPage(); page.setDefaultTimeout(15000);
    await page.goto(app.launchUrl); await page.getByRole('button', { name: 'AI로 산출물 등록', exact: true }).click();
    await page.locator('#artifact-files').setInputFiles(['담당자는 본인 접수 목록만 조회한다.', '빈 접수 목록은 빈 결과로 표시한다.'].map((text, index) => ({ name: `source-${index + 1}.txt`, mimeType: 'text/plain', buffer: Buffer.from(text) })));
    await page.locator('[name="sensitivityAcknowledged"]').check(); await page.locator('[name="ai-consent"]').check(); await page.getByRole('button', { name: '등록하고 계속', exact: true }).click();
    await page.locator('.form-errors').filter({ hasText: 'AI_DOCUMENT_OUTPUT_INVALID' }).waitFor();
    page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: '취소', exact: true }).click();
    await page.getByRole('region', { name: 'AI 판독 진행', exact: true }).waitFor();
    assert.match(await page.getByRole('region', { name: 'AI 판독 진행', exact: true }).textContent(), /등록을 완료하지 못한 파일 1건/);
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent === 'AI 판독 이어서 진행' && !button.disabled));
    assert.equal(await page.getByRole('button', { name: '남은 파일 추가', exact: true }).isVisible(), true);
    assert.equal((await app.engine.state()).backlog.sources.length, 1);
    await page.getByRole('link', { name: '산출물 수집', exact: true }).click();
    const details = page.locator('#main details').first(); await details.locator('summary').click();
    assert.equal(await details.evaluate(element => element.open), true);
    await page.locator('#help').click(); await page.getByRole('dialog').getByRole('button', { name: '창 닫기', exact: true }).click();
    assert.equal(await page.locator('#main details').first().evaluate(element => element.open), true);
  } catch (error) {
    const safe = new Error(String(error.message).replaceAll(app?.launchSecret ?? '\0', '[redacted]').replace(/#launch=[A-Za-z0-9_%.-]+/g, '#launch=[redacted]')); throw safe;
  } finally { await browser?.close(); await app?.close(); rmSync(workspace, { recursive: true, force: true }); }
});

test('the default UI reads uploaded material with AI, shows real prompts and the full draft, then applies one reviewed plan', async () => {
  const workspace = mkdtempSync(join(tmpdir(), 'synthetic-full-pipeline-browser-'));
  let app, browser;
  try {
    const phases = [], injection = '<img data-pipeline-probe src=x onerror="window.untrustedPipelineRan=true">';
    app = await startRequirementsServer({ workspace, port: 0, contextProvider: async () => context, aiRunner: async ({ request, attachments = [] }) => {
      phases.push(request.phase);
      if (request.phase === 'analysis') assert.equal(attachments.length, 0, 'already read originals are not resent in every requirement batch');
      const value = pipelineReply(request); if (request.phase === 'synthesis') value.summary += injection;
      if (request.phase === 'reading') value.summary += ' 연락처 010-1234-5678';
      return envelope(value);
    } });
    await app.engine.action(app.store.read().revision, 'project.save', { code: 'SYNTHETIC', name: '합성 AI 문서 흐름', institution: '합성 기관', baselineProfile: '' });
    browser = await chromium.launch({ headless: true });
    const browserContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await browserContext.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${app.url}/#launch=${app.launchSecret}`);
    await page.getByRole('button', { name: '프로젝트 정보', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'AI로 산출물 등록', exact: true }).count(), 1);
    await page.getByRole('button', { name: '단계별 AI 지시문 보기', exact: true }).click();
    await page.getByRole('dialog').getByText('원본 판독', { exact: true }).waitFor();
    assert.match(await page.getByRole('dialog').textContent(), /좋은 예/);
    await page.getByRole('button', { name: '닫고 돌아가기', exact: true }).click();
    await page.getByRole('button', { name: 'AI로 산출물 등록', exact: true }).click();
    await page.locator('#artifact-files').setInputFiles({ name: 'meeting.custom', mimeType: 'text/plain', buffer: Buffer.from('담당자는 본인 접수 목록만 조회한다. 빈 목록은 빈 결과로 표시한다.') });
    await page.locator('[name="sensitivityAcknowledged"]').check(); await page.locator('[name="ai-consent"]').check();
    await page.getByRole('button', { name: '등록하고 계속', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 90000 });
    await page.getByRole('button', { name: '전체 초안 확인·반영', exact: true }).waitFor({ timeout: 90000 });
    const before = await app.engine.state();
    await page.getByRole('note', { name: '민감정보 감지 안내' }).waitFor();
    assert.ok(before.sensitivityWarnings.some(warning => warning.kind === 'mobile-phone'));
    assert.doesNotMatch(JSON.stringify(before.sensitivityWarnings), /010-1234/);
    assert.deepEqual(phases, ['reading', 'synthesis', 'analysis', 'review-requirements', 'decomposition', 'review-plan']);
    assert.equal(before.backlog.businessRequirements.length, 0); assert.equal(before.metadata.baselines.length, 0);
    assert.equal(await page.locator('[data-pipeline-probe]').count(), 0);
    assert.equal(await page.evaluate(() => Boolean(window.untrustedPipelineRan)), false);
    await page.getByText('통합 업무 흐름', { exact: true }).waitFor();
    await page.getByText('개발 작업계획 미리보기', { exact: true }).waitFor();
    const dismiss = page.getByRole('button', { name: '알림 닫기', exact: true });
    if (await dismiss.isVisible()) await dismiss.click();
    if (process.env.REQUIREMENTS_TEST_SCREENSHOTS) { mkdirSync(process.env.REQUIREMENTS_TEST_SCREENSHOTS, { recursive: true }); await page.screenshot({ path: join(process.env.REQUIREMENTS_TEST_SCREENSHOTS, 'ai-full-pipeline-desktop.png'), fullPage: true }); }
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    assert.deepEqual(axe.violations.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) })), []);
    const headings = await new AxeBuilder({ page }).withRules(['heading-order']).analyze();
    assert.deepEqual(headings.violations.map(item => item.id), []);
    if (process.env.REQUIREMENTS_TEST_SCREENSHOTS) { mkdirSync(process.env.REQUIREMENTS_TEST_SCREENSHOTS, { recursive: true }); await page.screenshot({ path: join(process.env.REQUIREMENTS_TEST_SCREENSHOTS, 'ai-full-pipeline-mobile.png'), fullPage: true }); }
    await page.getByRole('button', { name: '전체 초안 확인·반영', exact: true }).click();
    await page.locator('[name="ai-consent"]').check();
    await page.getByRole('button', { name: '검토한 전체 결과 반영', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    const state = await app.engine.state();
    assert.equal(state.backlog.workItems.length, 2); assert.equal(state.metadata.baselines.length, 1);
    assert.equal(state.metadata.exports.at(-1).kind, 'task'); assert.equal(state.backlog.businessRequirements[0].acceptanceDisposition, 'pending');
    assert.deepEqual(errors, []);
  } catch (error) {
    const redact = value => String(value ?? '').replaceAll(app?.launchSecret ?? '\0', '[redacted]').replace(/#launch=[A-Za-z0-9_%.-]+/g, '#launch=[redacted]');
    const safe = new Error(redact(error.message)); safe.stack = redact(error.stack); throw safe;
  } finally { await browser?.close(); await app?.close(); rmSync(workspace, { recursive: true, force: true }); }
});

test('a changed source list after the consent screen opens is stopped before any model transmission', async () => {
  const workspace = mkdtempSync(join(tmpdir(), 'synthetic-consent-scope-browser-')); let app, browser;
  try {
    let calls = 0;
    app = await startRequirementsServer({ workspace, port: 0, contextProvider: async () => context, aiRunner: async ({ request }) => { calls++; return envelope(pipelineReply(request)); } });
    const act = (name, payload) => app.engine.action(app.store.read().revision, name, payload);
    await act('project.save', { code: 'SYNTHETIC', name: '합성 동의 범위', institution: '합성 기관', baselineProfile: '' }); await act('source.save', source);
    browser = await chromium.launch({ headless: true }); const browserContext = await browser.newContext(); const page = await browserContext.newPage();
    await page.goto(`${app.url}/#launch=${app.launchSecret}`); await page.getByRole('button', { name: 'AI 전체 분석', exact: true }).click();
    await act('source.save', { ...source, id: 'SRC-NEW', title: '동의 화면에 없던 추가 자료' });
    await page.locator('[name="sensitivityAcknowledged"]').check(); await page.locator('[name="ai-consent"]').check();
    await page.getByRole('button', { name: '동의하고 전체 AI 처리 시작', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('#dialog').open || document.querySelector('.form-errors:not([hidden])'));
    assert.equal(await page.getByRole('dialog').isVisible(), true);
    assert.match(await page.getByRole('dialog').textContent(), /동의한 자료 범위가 변경/);
    assert.equal(calls, 0);
  } catch (error) {
    const redact = value => String(value ?? '').replaceAll(app?.launchSecret ?? '\0', '[redacted]').replace(/#launch=[A-Za-z0-9_%.-]+/g, '#launch=[redacted]');
    const safe = new Error(redact(error.message)); safe.stack = redact(error.stack); throw safe;
  } finally { await browser?.close(); await app?.close(); rmSync(workspace, { recursive: true, force: true }); }
});

test('AI upload discloses all existing material and a synthetic submit cannot bypass unchecked full-analysis consent', async () => {
  const workspace = mkdtempSync(join(tmpdir(), 'synthetic-existing-consent-')); let app, browser;
  try {
    let calls = 0;
    app = await startRequirementsServer({ workspace, port: 0, contextProvider: async () => context, aiRunner: async ({ request }) => { calls++; return envelope(pipelineReply(request)); } });
    const act = (name, payload) => app.engine.action(app.store.read().revision, name, payload);
    await act('project.save', { code: 'SYNTHETIC', name: '합성 기존 자료 동의', institution: '합성 기관', baselineProfile: '' }); await act('source.save', source);
    browser = await chromium.launch({ headless: true }); const browserContext = await browser.newContext(); const page = await browserContext.newPage();
    await page.goto(app.launchUrl); await page.getByRole('button', { name: 'AI로 산출물 등록', exact: true }).click();
    assert.match(await page.getByRole('dialog').textContent(), /기존 자료 전체도 AI 재판독/);
    assert.match(await page.getByRole('dialog').textContent(), new RegExp(source.title));
    await page.getByRole('button', { name: '취소', exact: true }).click();
    await page.getByRole('button', { name: 'AI 전체 분석', exact: true }).click();
    await page.locator('[name="sensitivityAcknowledged"]').check();
    await page.locator('#editor').evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await page.getByText('원문 분석 방식 확인과 모델 서비스 전송 동의가 필요합니다.', { exact: true }).waitFor();
    assert.equal(calls, 0); assert.equal((await app.engine.state()).ai.current, null);
  } catch (error) {
    const safe = new Error(String(error.message).replaceAll(app?.launchSecret ?? '\0', '[redacted]').replace(/#launch=[A-Za-z0-9_%.-]+/g, '#launch=[redacted]')); throw safe;
  } finally { await browser?.close(); await app?.close(); rmSync(workspace, { recursive: true, force: true }); }
});

test('a source added while an uploaded-source digest is awaited cannot widen the approved model scope', async () => {
  const workspace = mkdtempSync(join(tmpdir(), 'synthetic-digest-scope-browser-')); let app, browser;
  try {
    const phases = [];
    app = await startRequirementsServer({ workspace, port: 0, contextProvider: async () => context, aiRunner: async ({ request }) => { phases.push(request.phase); return envelope(pipelineReply(request)); } });
    const act = (name, payload) => app.engine.action(app.store.read().revision, name, payload);
    await act('project.save', { code: 'SYNTHETIC', name: '합성 비동기 동의 범위', institution: '합성 기관', baselineProfile: '' });
    browser = await chromium.launch({ headless: true }); const browserContext = await browser.newContext(); const page = await browserContext.newPage();
    let inserted = false;
    await page.exposeFunction('__addSourceDuringDigest', async () => { if (!inserted) { inserted = true; await act('source.save', { ...source, id: 'SRC-RACE', title: '비동기 확인 중 추가된 자료' }); } });
    await page.goto(`${app.url}/#launch=${app.launchSecret}`);
    await page.evaluate(() => { const digest = crypto.subtle.digest.bind(crypto.subtle); crypto.subtle.digest = async (...args) => { await window.__addSourceDuringDigest(); return digest(...args); }; });
    await page.getByRole('button', { name: 'AI로 산출물 등록', exact: true }).click();
    await page.locator('#artifact-files').setInputFiles({ name: 'meeting.txt', mimeType: 'text/plain', buffer: Buffer.from('담당자는 본인 접수 목록만 조회한다.') });
    await page.locator('[name="sensitivityAcknowledged"]').check(); await page.locator('[name="ai-consent"]').check();
    await page.getByRole('button', { name: '등록하고 계속', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('#dialog').open || document.querySelector('.form-errors:not([hidden])'));
    assert.equal(await page.getByRole('dialog').isVisible(), true);
    assert.match(await page.getByRole('dialog').textContent(), /동의한 자료 범위가 변경/);
    assert.equal(inserted, true); assert.deepEqual(phases, ['reading']);
  } catch (error) {
    const redact = value => String(value ?? '').replaceAll(app?.launchSecret ?? '\0', '[redacted]').replace(/#launch=[A-Za-z0-9_%.-]+/g, '#launch=[redacted]');
    const safe = new Error(redact(error.message)); safe.stack = redact(error.stack); throw safe;
  } finally { await browser?.close(); await app?.close(); rmSync(workspace, { recursive: true, force: true }); }
});
