/** Browser interaction checks. --fixture isolates UI transport; live mode requires a disposable empty workspace. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const require = createRequire(new URL('../../frontend/package.json', import.meta.url));
const { chromium } = require('@playwright/test');

export async function runBrowserChecks({ url, launch = '', screenshots }) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const exceptions = [];
  page.on('pageerror', error => exceptions.push(error.message));
  try {
    await page.goto(`${url}/#launch=${encodeURIComponent(launch)}`);
    await page.getByRole('heading', { name: '프로젝트 진행 현황', exact: true }).waitFor();
    assert.equal(new URL(page.url()).hash, '', 'launch fragment removed after exchange');
    await page.getByRole('link', { name: /산출물 수집/ }).click();
    await page.getByRole('button', { name: '자료 추가', exact: true }).click();
    await page.getByLabel('자료 제목', { exact: true }).fill('브라우저 합성 요구사항');
    assert.match(await page.getByLabel('자료 ID', { exact: true }).inputValue(), /^SRC-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, 'new entity uses a complete UUID');
    await page.getByLabel('자료 위치', { exact: true }).fill('§1');
    await page.getByLabel('요약', { exact: true }).fill('<img src=x onerror=window.__xss=1>');
    await page.getByLabel('조항 본문', { exact: true }).fill('요구사항과 검수 근거를 보관한다.');
    await page.getByLabel('조항 위치', { exact: true }).fill('§1.1');
    await page.locator('#source-file').setInputFiles({ name: 'bad.txt', mimeType: 'text/plain', buffer: Buffer.from([0xff, 0xfe]) });
    await page.getByRole('alert').filter({ hasText: 'UTF-8 텍스트를 읽지 못했습니다.' }).waitFor();
    assert.equal(await page.getByLabel('자료 제목', { exact: true }).inputValue(), '브라우저 합성 요구사항', 'invalid import preserves source draft');
    await page.locator('#source-file').setInputFiles({ name: 'source.md', mimeType: 'text/markdown', buffer: Buffer.from('첫 조항\n\n셋째 줄 조항', 'utf8') });
    await page.getByLabel('조항 본문', { exact: true }).nth(2).waitFor();
    assert.equal(await page.locator('[name="clause-2-locator"]').inputValue(), 'L3', 'import retains original line positions');
    assert.match(await page.getByLabel('원본 파일 SHA-256', { exact: true }).inputValue(), /^[0-9a-f]{64}$/);
    await page.route('**/api/action', route => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 'SENSITIVE_INPUT', message: '비식별 처리할 입력이 있습니다.', errors: [{ path: 'sources[0].clauses[0].text', kind: 'private-host-ip' }] }) }));
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: '확인할 위치: sources[0].clauses[0].text' }).waitFor();
    assert.equal(await page.getByLabel('자료 제목', { exact: true }).inputValue(), '브라우저 합성 요구사항', 'sensitive input diagnostic preserves the draft');
    await page.unroute('**/api/action');
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => window.__xss), undefined, 'source content never executes');
    await page.getByRole('button', { name: '자료 추가', exact: true }).click();
    await page.getByLabel('자료 제목', { exact: true }).fill('가져오기 전용 합성 자료');
    await page.locator('#source-file').setInputFiles({ name: 'fresh.md', mimeType: 'text/markdown', buffer: Buffer.from('가져온 첫 조항\n\n가져온 셋째 줄 조항', 'utf8') });
    await page.getByLabel('조항 본문', { exact: true }).last().waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('[name$="-text"]')].some(element => element.value === '가져온 셋째 줄 조항'));
    assert.equal(await page.getByLabel('조항 본문', { exact: true }).count(), 2, 'import replaces only untouched empty unpersisted placeholder');
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    const savedSources = await page.evaluate(async () => {
      const { token: requestToken } = await (await fetch('/api/session')).json();
      return (await (await fetch('/api/state', { headers: { 'x-workspace-token': requestToken } })).json()).backlog.sources;
    });
    assert.equal(savedSources.find(source => source.title === '가져오기 전용 합성 자료').clauses.some(clause => !clause.text.trim() || !clause.locator.trim()), false, 'saved imported source contains no empty clause');
    assert.equal(savedSources.find(source => source.title === '브라우저 합성 요구사항').clauses.some(clause => clause.text === '요구사항과 검수 근거를 보관한다.'), true, 'import preserves manually entered draft clause');
    await page.getByRole('link', { name: /요구사항 검토/ }).click();
    await page.getByRole('button', { name: '요구사항 추가', exact: true }).click();
    await page.getByLabel('요구사항 제목', { exact: true }).fill('실제 저장 경로 확인');
    await page.getByLabel('상세 설명', { exact: true }).fill('새로고침 후 보관한 요구사항을 확인한다.');
    await page.getByLabel('후보 모듈', { exact: true }).fill('core');
    await page.getByLabel('근거 자료', { exact: true }).selectOption({ label: '브라우저 합성 요구사항' });
    await page.getByLabel('원문 조항', { exact: true }).selectOption({ index: 0 });
    await page.getByRole('checkbox', { name: '이 내용의 근거·범위·질문을 확인했습니다.' }).check();
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.reload();
    await page.getByRole('heading', { name: '프로젝트 진행 현황', exact: true }).waitFor();
    await page.getByRole('link', { name: /요구사항 검토/ }).click();
    assert.equal(await page.locator('.candidate-card').getByRole('columnheader', { name: '원장 관측', exact: true }).count() > 0, true, 'recommendation candidates render readable evidence columns');
    assert.equal(await page.locator('.candidate-card pre').count(), 0, 'recommendations do not dump Markdown/JSON');
    await page.getByRole('button', { name: /실제 저장 경로 확인/ }).click();
    assert.equal(await page.getByRole('checkbox', { name: '이 내용의 근거·범위·질문을 확인했습니다.' }).isChecked(), true, 'current review record opens checked');
    await page.getByLabel('요구사항 제목', { exact: true }).fill('아직 저장하지 않은 제목');
    assert.equal(await page.getByRole('checkbox', { name: '이 내용의 근거·범위·질문을 확인했습니다.' }).isChecked(), false, 'substantive edit requires an explicit fresh review');
    await page.getByRole('checkbox', { name: '이 내용의 근거·범위·질문을 확인했습니다.' }).check();
    await page.getByLabel('상세 설명', { exact: true }).fill('추가로 바뀐 요구사항 본문');
    assert.equal(await page.getByRole('checkbox', { name: '이 내용의 근거·범위·질문을 확인했습니다.' }).isChecked(), false, 'later edits reset an explicit recheck too');
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('button', { name: '취소', exact: true }).click();
    assert.equal(await page.getByRole('dialog').isVisible(), true, 'cancel guard keeps draft');
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: '취소', exact: true }).click();
    await page.getByRole('link', { name: /에픽·스토리/ }).click();
    await page.getByRole('button', { name: '작업 추가', exact: true }).click();
    await page.getByLabel('작업 유형', { exact: true }).selectOption('epic');
    await page.getByLabel('작업 제목', { exact: true }).fill('브라우저 합성 에픽');
    await page.getByLabel('연결 요구사항', { exact: true }).selectOption({ label: '실제 저장 경로 확인' });
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: '작업 추가', exact: true }).click();
    await page.getByLabel('작업 유형', { exact: true }).selectOption('story');
    await page.getByLabel('작업 제목', { exact: true }).fill('브라우저 합성 스토리');
    await page.getByLabel('상위 에픽', { exact: true }).selectOption({ label: '브라우저 합성 에픽' });
    await page.getByLabel('연결 요구사항', { exact: true }).selectOption({ label: '실제 저장 경로 확인' });
    await page.getByLabel('사용자 역할', { exact: true }).fill('분석 담당자');
    await page.getByLabel('원하는 행동', { exact: true }).fill('요구사항 저장');
    await page.getByLabel('얻는 가치', { exact: true }).fill('작업 이력 보존');
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: '인수조건 추가', exact: true }).click();
    await page.getByLabel('대상 작업', { exact: true }).selectOption({ label: '브라우저 합성 스토리' });
    await page.getByLabel('연결 요구사항', { exact: true }).selectOption({ label: '실제 저장 경로 확인' });
    await page.getByLabel('사전 조건 (Given)', { exact: true }).fill('자료를 등록한 경우');
    await page.getByLabel('행동 (When)', { exact: true }).fill('저장하면');
    await page.getByLabel('기대 결과 (Then)', { exact: true }).fill('재접속해도 보관된다');
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(await page.getByText('재접속해도 보관된다', { exact: false }).count() > 0, true);
    await page.getByRole('button', { name: '추적 링크 추가', exact: true }).click();
    assert.equal(await page.getByLabel('대상 식별자', { exact: true }).getAttribute('list'), 'trace-target-options', 'trace identifier uses catalog suggestions');
    assert.equal(await page.locator('#trace-target-options option').count() > 0, true, 'catalog suggestions come from actual context');
    await page.getByLabel('대상 식별자', { exact: true }).fill('/future-ui-manual');
    await page.getByLabel('대상 종류', { exact: true }).selectOption('interface');
    assert.equal(await page.getByLabel('대상 식별자', { exact: true }).inputValue(), '/future-ui-manual', 'manual future target remains editable');
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: '취소', exact: true }).click();
    await page.getByRole('link', { name: /분석 기준선/ }).click();
    assert.equal(await page.getByRole('button', { name: '분석 기준선 확정', exact: true }).isDisabled(), true, 'unready backlog cannot baseline');
    await page.getByRole('link', { name: /검수·감리/ }).click();
    await page.getByRole('button', { name: '지적 등록', exact: true }).click();
    assert.equal(await page.getByLabel('근거·조치 내용', { exact: true }).evaluate(element => element.required), false, 'open finding can be captured before evidence exists');
    await page.getByLabel('근거·조치 내용', { exact: true }).fill('재검증 근거 초안');
    await page.getByLabel('조치 상태', { exact: true }).selectOption('resolved');
    assert.equal(await page.getByLabel('근거·조치 내용', { exact: true }).evaluate(element => element.required), true, 'resolved finding requires evidence');
    await page.getByLabel('조치 상태', { exact: true }).selectOption('open');
    assert.equal(await page.getByLabel('근거·조치 내용', { exact: true }).inputValue(), '재검증 근거 초안', 'finding transition preserves draft');
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: '취소', exact: true }).click();
    await page.getByRole('button', { name: '검수 CSV 반영', exact: true }).click();
    assert.equal(await page.getByLabel('검수 대상 빌드·커밋', { exact: true }).evaluate(element => element.required), true, 'CSV UAT binds the real build');
    await page.getByRole('button', { name: '취소', exact: true }).click();
    const recoveryCases = [
      ['REQUIREMENTS_EXTERNAL_CHANGE', '외부 파일 변경을 확인해야 합니다.'],
      ['REQUIREMENTS_LOCK_LOST', '작업공간 잠금이 변경되었습니다.'],
      ['REQUIREMENTS_RECOVERY_REQUIRED', '중단된 저장을 복구해야 합니다.'],
      ['LAUNCH_REQUIRED', '작업공간 연결 주소를 확인하세요.'],
    ];
    for (const [code, title] of recoveryCases) {
      const errorPage = await context.newPage();
      const endpoint = code === 'LAUNCH_REQUIRED' ? '/api/session' : '/api/state';
      await errorPage.route(`**${endpoint}`, route => route.fulfill({ status: code === 'LAUNCH_REQUIRED' ? 403 : 409, contentType: 'application/json', body: JSON.stringify({ code, message: '합성 오류 진단' }) }));
      await errorPage.goto(`${url}/#launch=${encodeURIComponent(launch)}`);
      await errorPage.getByRole('heading', { name: title, exact: true }).waitFor();
      assert.equal(await errorPage.getByRole('alert').getByText(`오류 코드: ${code}`, { exact: true }).count(), 1);
      if (code !== 'LAUNCH_REQUIRED') assert.equal(await errorPage.getByText('실행기 터미널에 표시된 주소를 #launch= 부분까지 다시 열어주세요.', { exact: true }).count(), 0, 'storage failure does not suggest an irrelevant session renewal');
      await errorPage.close();
    }
    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const label of ['진행 현황', '산출물 수집', '요구사항 검토', '분석 기준선', '에픽·스토리', '개발 인계', '검수·감리']) {
        await page.getByRole('link', { name: new RegExp(label) }).click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `no page overflow: ${label} ${width}`);
      }
      if (screenshots) await page.screenshot({ path: `${screenshots}/requirements-${width}.png`, fullPage: true });
    }
    const { default: AxeBuilder } = await import(pathToFileURL(require.resolve('@axe-core/playwright')).href);
    for (const dark of [false, true]) {
      if (dark) await page.getByRole('button', { name: '다크 모드로 전환' }).click();
      for (const label of ['진행 현황', '산출물 수집', '에픽·스토리', '검수·감리']) {
        await page.getByRole('link', { name: new RegExp(label) }).click();
        const audit = await new AxeBuilder({ page }).analyze();
        assert.deepEqual(audit.violations.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) })), [], `axe ${label} dark=${dark}`);
      }
    }
    assert.deepEqual(exceptions, [], 'no uncaught browser exceptions');
    return { interactionFlow: 'passed', responsiveViewports: [375, 1280], accessibilityStates: 8 };
  } finally { await context.close(); await browser.close(); }
}

/** Synthetic inputs for a separate disposable server; this is never called by the UI. */
export async function seedLifecycleFixture(engine) {
  const action = async (name, payload) => engine.action((await engine.state()).revision, name, payload);
  await action('project.save', { code: 'SYNTHETIC-LIFECYCLE', name: '합성 수명주기 검증', institution: '검증기관', baselineProfile: 'core' });
  await action('source.save', { id: 'SRC-1', title: '비식별 협의 기록', sourceType: 'interview', classification: 'internal', locator: '회의 1쪽', clauses: [{ id: 'C-1', locator: '1행', text: '담당자가 목록을 조회한다', disposition: 'question', requirementIds: [], rationale: '분석 예정' }] });
  await action('requirement.save', { requirement: { id: 'REQ-1', sourceIds: ['SRC-1'], title: '목록 조회', description: '인가된 담당자가 목록을 조회한다', requirementType: 'functional', scopeDisposition: 'included', solutionDisposition: 'gap-dev', moduleCandidates: ['core'], openQuestions: [], rationale: '새 업무 목록', acceptanceDisposition: 'pending' }, reviewed: true, clauseIds: ['SRC-1/C-1'] });
  await action('work.save', { id: 'EP-1', title: '목록 업무', workItemType: 'epic', parentEpicId: null, requirementIds: ['REQ-1'], priority: 'MUST', batch: '1' });
  await action('work.save', { id: 'US-1', title: '업무 목록 조회', workItemType: 'story', parentEpicId: 'EP-1', requirementIds: ['REQ-1'], priority: 'MUST', batch: '1', asA: '담당자', iWant: '목록 조회', soThat: '업무 확인', archetype: 'A1', decisionCards: ['D-1: 목록', 'D-2: 소유자만', 'D-3: 업무 식별자', 'D-4: 길이 검증', 'D-5: 거부 시험'] });
  for (const polarity of ['allow', 'forbid']) await action('ac.save', { id: `AC-${polarity}`, workItemId: 'US-1', requirementIds: ['REQ-1'], polarity, given: polarity === 'allow' ? '담당자' : '비인가 사용자', when: '목록 요청', then: polarity === 'allow' ? '목록 표시' : '403 거부', verificationMethod: 'manual-uat' });
  await action('trace.save', { id: 'TR-1', requirementId: 'REQ-1', workItemId: 'US-1', targetKind: 'screen', targetId: '/future-list', linkIntent: 'planned' });
}

/** Full UI lifecycle for the synthetic seed above. Caller owns the disposable workspace/server. */
export async function runLifecycleChecks({ url, launch = '', inspectState, readArtifact }) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const api = endpoint => page.evaluate(async path => {
    const session = await (await fetch('/api/session')).json();
    const response = await fetch(path, { headers: { 'x-workspace-token': session.token } });
    if (!response.ok) throw new Error('Lifecycle API read failed');
    return response.json();
  }, endpoint);
  const inspect = inspectState ?? (() => api('/api/state'));
  const artifact = readArtifact ?? (key => api(`/api/artifacts/${encodeURIComponent(key)}`));
  try {
    await page.goto(`${url}/#launch=${encodeURIComponent(launch)}`);
    await page.getByRole('heading', { name: '프로젝트 진행 현황', exact: true }).waitFor();
    await page.getByRole('link', { name: /분석 기준선/ }).click();
    await page.getByRole('button', { name: '분석 기준선 확정', exact: true }).click();
    await page.getByLabel('기준선 이름', { exact: true }).fill('합성 분석 기준선');
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal((await inspect()).baselineCurrent, true, 'baseline is persisted by the real engine');
    assert.ok((await inspect()).metadata.baselines.at(-1).backlogRef?.id, 'new baseline uses an immutable archive reference');
    const baselineDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: '기준선 백로그 내려받기', exact: true }).last().click();
    const baseline = JSON.parse(await readFile(await (await baselineDownload).path(), 'utf8'));
    assert.equal(baseline.businessRequirements[0].id, 'REQ-1', 'immutable baseline JSON is available');
    await page.getByRole('link', { name: /개발 인계/ }).click();
    await page.getByRole('button', { name: '개발 작업 패키지 생성', exact: true }).click();
    await page.getByText('TASK-PACKAGE.md', { exact: true }).waitFor();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: '내려받기', exact: true }).click();
    assert.match(await readFile(await (await download).path(), 'utf8'), /US-1/, 'downloaded package contains the planned story');
    await page.getByRole('link', { name: /검수·감리/ }).click();
    for (const acId of ['AC-allow', 'AC-forbid']) {
      await page.getByRole('row').filter({ hasText: acId }).getByRole('button', { name: '검수 기록', exact: true }).click();
      await page.getByLabel('검수자 역할·비식별 식별자', { exact: true }).fill('기관 검수 역할');
      await page.getByLabel('검수일', { exact: true }).fill('2026-11-04');
      await page.getByLabel('대상 빌드·커밋', { exact: true }).fill('SYNTHETIC-BUILD-1');
      await page.getByLabel('검수 근거', { exact: true }).fill('TEST-1 합성 시험 기록');
      await page.getByRole('button', { name: '저장', exact: true }).click();
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
    }
    assert.equal((await inspect()).backlog.businessRequirements[0].acceptanceDisposition, 'accepted', 'real evidence records roll up to the requirement');
    await page.getByRole('link', { name: /개발 인계/ }).click();
    await page.getByRole('button', { name: '검토 CSV 생성', exact: true }).click();
    await page.getByText('stories-ac-review.csv', { exact: true }).waitFor();
    await page.getByRole('button', { name: '검수표 생성', exact: true }).click();
    await page.getByText('uat-checklist.csv', { exact: true }).waitFor();
    let uatCsv;
    for (const filename of ['requirements-review.csv', 'stories-ac-review.csv', 'uat-checklist.csv']) {
      const csvDownload = page.waitForEvent('download');
      await page.locator('.check-row').filter({ hasText: filename }).getByRole('button', { name: '내려받기', exact: true }).click();
      const csv = await readFile(await (await csvDownload).path(), 'utf8');
      assert.equal(csv.charCodeAt(0), 0xfeff, 'CSV download preserves the exact UTF-8 BOM bytes');
      assert.match(csv, /REQ-1/, 'download contains the synthetic requirement');
      if (filename === 'uat-checklist.csv') uatCsv = csv;
    }
    await page.getByRole('link', { name: /검수·감리/ }).click();
    await page.getByRole('button', { name: '검수 CSV 반영', exact: true }).click();
    await page.getByLabel('검수 대상 빌드·커밋', { exact: true }).fill('SYNTHETIC-BUILD-2');
    await page.getByLabel('검수 CSV 본문', { exact: true }).fill(uatCsv);
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal((await inspect()).metadata.uatRecords.length, 2, 'unchanged downloaded CSV creates no new attestation');
    assert.ok((await inspect()).backlog.acceptanceCriteria.every(ac => ac.uatBuildRef === 'SYNTHETIC-BUILD-1'));
    await page.getByRole('button', { name: '감리 보고서 생성', exact: true }).click();
    await page.getByText('AUDIT-REVIEW.md', { exact: true }).waitFor();
    const report = (await inspect()).metadata.exports.find(item => item.kind === 'audit');
    const reportContent = (await artifact(report.id)).content;
    assert.match(reportContent, /제출 전 검토 가능/, 'report reflects current evidence');
    assert.match(reportContent, /SYNTHETIC-BUILD-1/, 'audit report includes the actual verified build');
    assert.match(reportContent, /TEST-1 합성 시험 기록/, 'audit report includes current UAT evidence');
    await page.reload();
    await page.getByRole('heading', { name: '프로젝트 진행 현황', exact: true }).waitFor();
    assert.equal((await inspect()).metadata.uatRecords.length, 2, 'reconnection preserves both manual UAT records');
    assert.deepEqual(errors, [], 'lifecycle has no uncaught browser errors');
    return { actualBaseline: true, taskDownload: true, evidencedUat: 2, auditReport: true, reload: true };
  } finally { await context.close(); await browser.close(); }
}

async function fixture() {
  const token = randomBytes(24).toString('hex');
  let count = 0;
  const state = { revision: '0', backlog: { project: { code: 'UI-TEST', name: '합성 UI 시험' }, sources: [], businessRequirements: [], workItems: [], acceptanceCriteria: [], traceLinks: [] }, metadata: { baselines: [], reviewedRequirements: {}, auditFindings: [], exports: [] }, context: { modules: [{ id: 'core', label: '공통 기반' }], screens: [{ route: '/fixture-list', label: '검증 목록', status: 'partial' }], interfaces: [{ id: 'GET /api/fixture-list', status: 'partial', evidenceLevel: 'E1' }] }, readiness: { valid: false, errors: ['자료·범위·스토리 검토가 필요합니다.'], warnings: [] }, contextChanged: false, baselineCurrent: false };
  const files = { '/': 'index.html', '/app.js': 'app.js', '/styles.css': 'styles.css', '/tokens.css': 'tokens.css', '/fonts/PretendardVariable.woff2': 'fonts/PretendardVariable.woff2' };
  const server = createServer(async (request, response) => {
    try {
      if (files[request.url]) { response.setHeader('Content-Type', request.url.endsWith('.js') ? 'text/javascript' : request.url.endsWith('.css') ? 'text/css' : request.url.endsWith('.woff2') ? 'font/woff2' : 'text/html'); response.end(await readFile(new URL(`./public/${files[request.url]}`, import.meta.url))); return; }
      response.setHeader('Content-Type', 'application/json');
      if (request.url === '/api/session') { response.end(JSON.stringify({ token })); return; }
      if (request.headers['x-workspace-token'] !== token) { response.writeHead(403); response.end('{}'); return; }
      if (request.method === 'POST') {
        let content = ''; for await (const chunk of request) content += chunk;
        const { action, payload, revision } = JSON.parse(content);
        assert.equal(revision, state.revision);
        const collections = { 'source.save': 'sources', 'requirement.save': 'businessRequirements', 'work.save': 'workItems', 'ac.save': 'acceptanceCriteria', 'trace.save': 'traceLinks' };
        const value = payload.requirement ?? payload;
        const collection = collections[action];
        if (action === 'requirement.save') { state.reviewedRequirementsCurrent ??= {}; state.reviewedRequirementsCurrent[value.id] = payload.reviewed; }
        if (collection) { const index = state.backlog[collection].findIndex(item => item.id === value.id); if (index < 0) state.backlog[collection].push(value); else state.backlog[collection][index] = value; }
        state.matches = { results: state.backlog.businessRequirements.map(requirement => ({ requirementId: requirement.id, title: requirement.title, currentDisposition: requirement.solutionDisposition, suggestedDisposition: 'hybrid', candidates: { modules: state.context.modules, screens: state.context.screens, interfaces: state.context.interfaces } })) };
        state.revision = String(++count);
      }
      response.end(JSON.stringify(state));
    } catch { response.writeHead(500); response.end('{}'); }
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(resolve => server.close(resolve)) };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const app = process.argv.includes('--fixture') ? await fixture() : null;
  try {
    const url = app?.url ?? process.env.REQUIREMENTS_TEST_URL;
    if (!url) throw new Error('Set REQUIREMENTS_TEST_URL to a disposable empty workspace or use --fixture.');
    console.log(JSON.stringify(await runBrowserChecks({ url, launch: process.env.REQUIREMENTS_TEST_LAUNCH ?? '', screenshots: process.env.REQUIREMENTS_TEST_SCREENSHOTS })));
  } finally { await app?.close(); }
}
