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
const require = createRequire(new URL('../../frontend/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const { default: AxeBuilder } = await import(pathToFileURL(require.resolve('@axe-core/playwright')).href);

test('the default UI reads uploaded material with AI, shows real prompts and the full draft, then applies one reviewed plan', async () => {
  const workspace = mkdtempSync(join(tmpdir(), 'synthetic-full-pipeline-browser-'));
  let app, browser;
  try {
    const phases = [], injection = '<img data-pipeline-probe src=x onerror="window.untrustedPipelineRan=true">';
    app = await startRequirementsServer({ workspace, port: 0, contextProvider: async () => context, aiRunner: async ({ request, attachments = [] }) => {
      phases.push(request.phase);
      if (request.phase === 'analysis') assert.equal(attachments.length, 0, 'already read originals are not resent in every requirement batch');
      const value = pipelineReply(request); if (request.phase === 'synthesis') value.summary += injection;
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
    await page.locator('[name="redacted"]').check(); await page.locator('[name="ai-consent"]').check();
    await page.getByRole('button', { name: '등록하고 계속', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 90000 });
    await page.getByRole('button', { name: '전체 초안 확인·반영', exact: true }).waitFor({ timeout: 90000 });
    const before = await app.engine.state();
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
    await page.locator('[name="redacted"]').check(); await page.locator('[name="ai-consent"]').check();
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
    await page.locator('[name="redacted"]').check();
    await page.locator('#editor').evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await page.getByText('비식별 확인과 모델 서비스 전송 동의가 필요합니다.', { exact: true }).waitFor();
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
    await page.locator('[name="redacted"]').check(); await page.locator('[name="ai-consent"]').check();
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
