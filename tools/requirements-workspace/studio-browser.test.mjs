import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { startRequirementsServer } from './server.mjs';
import { context } from './test-fixtures/ai.mjs';
import { pipelineReply } from './test-fixtures/pipeline.mjs';
import { STUDIO_MODEL, extractReply, studioRunner } from './test-fixtures/studio.mjs';

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
const first = ['[SFR:시설 예약 신청] 시민은 시설을 검색하고 예약을 신청한다. <function-tree:예약 신청> <screen-def:예약 신청 화면>', '<entity-def:예약> 예약 정보를 관리한다. 속성(예약번호, 이용 일시)', '[SFR:이용료 결제] 승인 후 24시간 안에 결제한다. <process-def:결제 처리>', '[PER:응답 시간] 조회는 3초 안에 응답한다.'].join('\n\n');
const second = ['[SFR:시설 예약 신청] 예약은 이용일 30일 전부터 신청한다.', '[SFR:예약 현황 통계] (미정) 담당자가 이용 현황을 조회한다.', '<entity-def:예약> 예약 식별 방법을 정한다.'].join('\n\n');
// The two documents name the identifier of the same entity differently.
const worded = request => { const reply = extractReply(request); for (const item of reply.items) if (item.name === '예약') item.fields.identifier = request.data.clauses.some(clause => clause.text.includes('식별 방법')) ? '예약ID' : '예약번호'; return reply; };
const file = (name, text) => ({ name, mimeType: 'text/plain', buffer: Buffer.from(text) });

test('documents become requirements, deliverables and stories through the studio screen', async () => {
  const workspace = mkdtempSync(join(tmpdir(), 'synthetic-studio-browser-'));
  let app, browser;
  try {
    const studio = studioRunner({ overrides: { 'studio-extract': worded } }), reading = { calls: 0, hold: false, release: null };
    app = await startRequirementsServer({ workspace, port: 0, contextProvider: async () => context, aiRunner: async input => {
      if (input.request.phase !== 'reading') return studio(input);
      reading.calls += 1;
      // A held reading stands in for the minutes a real document can take, so the progress shown meanwhile can be checked.
      if (reading.hold) await new Promise(resolve => { reading.release = resolve; });
      return { output: pipelineReply(input.request), model: STUDIO_MODEL, effort: 'xhigh', usage: { inputTokens: 1, outputTokens: 1 } };
    } });
    browser = await chromium.launch({ headless: true });
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(app.studioUrl);
    await page.getByRole('button', { name: '프로젝트 정보 입력', exact: true }).click();
    await page.getByLabel('사업 이름', { exact: true }).fill('합성 시설예약 구축');
    await page.getByLabel('사업 코드', { exact: true }).fill('SYNTHETIC-1');
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await page.getByRole('heading', { name: '합성 시설예약 구축', exact: true }).waitFor();
    assert.equal(new URL(page.url()).hash, '', 'the launch secret leaves the address bar');
    await audit(page, 'studio-empty');

    // One dialog registers the file, reads it and goes on to the analysis.
    // `result` is the stage summary this document must produce. The finished heading alone is not a signal: an earlier run leaves the same heading on screen.
    // `whileReading` runs while the model is still reading the file, with the reading held.
    const add = async (name, text, result, whileReading) => {
      await page.getByRole('button', { name: '문서 추가', exact: true }).click();
      await page.getByLabel('문서 파일', { exact: true }).setInputFiles([file(name, text)]);
      await page.getByRole('button', { name: '등록 시작', exact: true }).click();
      await page.getByText('두 항목을 모두 확인해 주세요.', { exact: true }).waitFor();
      await page.getByLabel(/문서 원문에 민감정보가 있을 수 있음을/).check();
      await page.getByLabel(/모델 서비스로 보내는 데 동의합니다/).check();
      if (whileReading) { reading.hold = true; await page.getByLabel(/글자 문서\(TXT·Markdown·HTML\)는 AI 판독 없이/).uncheck(); }
      await page.getByRole('button', { name: '등록 시작', exact: true }).click();
      if (whileReading) { await whileReading(); reading.hold = false; reading.release(); }
      await page.getByRole('cell', { name: new RegExp(name) }).waitFor();
      await page.getByRole('button', { name: result }).waitFor();
      await page.getByRole('heading', { name: '문서 분석 — 완료', exact: true }).waitFor();
    };
    await add('합성-제안요청서.txt', first, /^2\. 요구사항 확정 0 \/ 3건/);
    // A text document is split on this PC: the model is not asked to read it, and the result is listed per file.
    assert.equal(reading.calls, 0);
    await page.getByRole('heading', { name: '문서 등록 결과', exact: true }).waitFor();
    await page.getByText('완료 1건', { exact: true }).waitFor();
    await page.getByText('조각 4개', { exact: true }).waitFor();
    await audit(page, 'studio-sources');

    await page.getByRole('button', { name: /^2\. 요구사항/ }).click();
    await page.getByRole('button', { name: /^시설 예약 신청 초안/ }).click();
    await page.getByText('확정할 때 분류별 일련번호를 받습니다').waitFor();
    await page.getByRole('button', { name: '확정', exact: true }).click();
    await page.getByText('SFR-001 번호로 확정했습니다.').waitFor();
    await audit(page, 'studio-requirements');

    // The second document proposes a change to the confirmed requirement instead of editing it.
    await page.getByRole('button', { name: /^1\. 자료함/ }).click();
    // With the option off the model reads the file. While that takes its time the screen says which file is being read
    // and for how long, and the other stages show that registration is under way.
    await add('합성-회의록.txt', second, /^2\. 요구사항 확정 1 \/ 4건 · 쟁점 1/, async () => {
      await page.getByRole('heading', { name: '문서 등록 — 0 / 1건 끝남', exact: true }).waitFor();
      await page.getByText(/AI가 문서를 읽는 중/).first().waitFor();
      await page.locator('.st-files').getByText('읽는 중', { exact: true }).waitFor();
      await audit(page, 'studio-registering');
      await page.getByRole('button', { name: /^2\. 요구사항/ }).click();
      await page.locator('#activity').getByText(/문서 등록 중 · 0 \/ 1건 끝남 · 합성-회의록\.txt · 경과 \d\d:\d\d/).waitFor();
      const before = await page.locator('#activity [data-since]').textContent();
      await page.waitForFunction(shown => document.querySelector('#activity [data-since]')?.textContent !== shown, before);
      await page.locator('#activity').getByRole('button', { name: '자료함에서 보기', exact: true }).click();
      await page.getByRole('heading', { name: '문서 등록 — 0 / 1건 끝남', exact: true }).waitFor();
      assert.equal(reading.calls, 1);
    });
    assert.equal(await page.locator('#activity').isHidden(), true);
    await page.getByRole('button', { name: /^2\. 요구사항/ }).click();
    await page.getByRole('button', { name: /^확인할 것 2$/ }).click();
    await page.getByRole('button', { name: /^시설 예약 신청 SFR-001/ }).click();
    await page.getByText('예약은 이용일 30일 전부터 신청한다.').first().waitFor();
    await page.getByRole('button', { name: '반영', exact: true }).click();
    await page.getByText('변경 제안을 반영했습니다.').waitFor();
    await page.getByRole('button', { name: /^예약 현황 통계 초안/ }).click();
    assert.equal(await page.getByRole('button', { name: '확정', exact: true }).isDisabled(), true, 'an open question blocks confirmation');
    await page.getByRole('button', { name: '답변하기', exact: true }).click();
    await page.getByLabel('답변', { exact: true }).fill('시설 담당자만 조회한다.');
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await page.getByText('답변을 기록했습니다.').waitFor();
    await page.getByRole('button', { name: /^검토 가능한 초안 3건 모두 확정$/ }).click();
    await page.getByRole('button', { name: '기준선 만들기', exact: true }).click();
    await page.getByRole('button', { name: '만들기', exact: true }).click();
    await page.getByText(/기준선 BL-1 ‘1차 요구사항 확정’ · 요구사항 4건/).waitFor();
    await page.getByRole('button', { name: '요구사항정의서', exact: true }).click();
    await page.getByText(/### SFR-001 시설 예약 신청/).waitFor();
    await audit(page, 'studio-document');
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: '내려받기', exact: true }).click()]);
    assert.equal(download.suggestedFilename(), '요구사항정의서.md');
    await page.getByRole('button', { name: '닫기', exact: true }).click();

    await page.getByRole('button', { name: /^3\. 분석·설계 산출물/ }).click();
    await page.getByRole('button', { name: '화면설계서', exact: true }).click();
    await page.getByRole('button', { name: /^예약 신청 화면/ }).click();
    await page.getByText(/필수 칸\(버튼·이벤트\)을 채워야 확정할 수 있습니다\./).waitFor();
    // A deliverable switched on later is drafted from clauses that were already tagged.
    await page.getByRole('button', { name: '프로세스정의서', exact: true }).click();
    await page.getByText(/관련된 조각 1개를 표시해 두었습니다/).waitFor();
    await page.getByRole('button', { name: '이 산출물 작성하기', exact: true }).click();
    await page.getByRole('button', { name: 'AI 분석 진행', exact: true }).click();
    await page.getByLabel(/문서 원문에 민감정보가 있을 수 있음을/).check();
    await page.getByLabel(/모델 서비스로 보내는 데 동의합니다/).check();
    await page.getByRole('button', { name: '시작', exact: true }).click();
    await page.getByRole('button', { name: /^3\. 분석·설계 산출물 4종 작성 중 · 평균 [1-9]/ }).click();
    await page.getByRole('button', { name: /^결제 처리/ }).click();
    await audit(page, 'studio-artifacts');
    // A bar inside a table cell survives an edit: it is shown escaped and read back into the same cell.
    await page.getByRole('button', { name: '엔터티정의서', exact: true }).click();
    await page.getByRole('button', { name: /^예약 /, exact: false }).first().click();
    // The identifier is worded differently in the second document: a folded note, not counted as an issue, and the record can still be confirmed.
    await page.getByText('문서마다 표기가 다른 값 1건', { exact: true }).click();
    await page.getByText('‘식별자’ 값이 문서마다 다릅니다.', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: '확정', exact: true }).isEnabled(), true, 'a wording note does not block confirmation');
    await audit(page, 'studio-wording-note');
    await page.getByRole('button', { name: '다른 문서의 내용으로 바꿈', exact: true }).click();
    await page.getByText('새 문서의 내용을 반영했습니다.').waitFor();
    await page.getByRole('cell', { name: '예약ID', exact: true }).waitFor();
    await page.getByRole('button', { name: '수정', exact: true }).click();
    await page.getByLabel('속성 *', { exact: true }).fill('예약번호 | 승인\\|반려 | VARCHAR(10) | 예');
    await page.getByRole('button', { name: '저장', exact: true }).click();
    await page.getByText('저장했습니다.').waitFor();
    await page.getByRole('cell', { name: '승인|반려', exact: true }).waitFor();
    await page.getByRole('button', { name: '수정', exact: true }).click();
    assert.equal(await page.getByLabel('속성 *', { exact: true }).inputValue(), '예약번호 | 승인\\|반려 | VARCHAR(10) | 예');
    await page.getByRole('button', { name: '닫기', exact: true }).click();

    await page.getByRole('button', { name: /^4\. 에픽·스토리/ }).click();
    await page.getByRole('button', { name: '에픽·스토리 만들기', exact: true }).click();
    await page.getByLabel(/문서 원문에 민감정보가 있을 수 있음을/).check();
    await page.getByLabel(/모델 서비스로 보내는 데 동의합니다/).check();
    await page.getByRole('button', { name: '시작', exact: true }).click();
    await page.getByRole('button', { name: /^시설 예약 신청 ST-0001/ }).waitFor();
    await audit(page, 'studio-plan');
    await page.getByRole('button', { name: '개발 패키지 보기', exact: true }).click();
    await page.getByText(/# ST-0001 시설 예약 신청/).waitFor();
    await page.getByText(/PER-001 응답 시간/).first().waitFor();

    // A phone-width screen keeps every stage reachable without sideways scrolling.
    await page.getByRole('button', { name: '닫기', exact: true }).click();
    await page.setViewportSize({ width: 400, height: 800 });
    await page.getByRole('button', { name: /^2\. 요구사항/ }).click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no sideways page scroll at phone width');
    await audit(page, 'studio-phone');
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close(); await app?.close();
    rmSync(workspace, { recursive: true, force: true });
  }
});
