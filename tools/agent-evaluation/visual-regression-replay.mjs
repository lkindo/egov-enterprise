/**
 * 공통코드 건수 마스크의 한 가지 합성 재현. 제품 VRT나 에이전트의 일반화 평가가 아니다.
 * node tools/agent-evaluation/visual-regression-replay.mjs
 *
 * Chromium만 실행하고 서버·DB·모델 API·제품 기준선은 사용하지 않는다. 같은 브라우저의
 * 같은 실행에서 픽셀을 비교하므로 플랫폼별 제품 baseline을 만들거나 갱신하지 않는다.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const variants = new Set(['expected', 'count-changed', 'layout-regression', 'label-regression']);
const maskSelectors = Object.freeze({
  none: [],
  number: ['[data-field="classification-count"]', '[data-field="group-count"]'],
  row: ['[data-testid="counts"]'],
});

export function assertReplayInvocation(args, environment = {}) {
  if (args.length) throw new Error('이 재현은 인자·URL·외부 fixture·기준선 갱신 옵션을 받지 않습니다.');
  if (environment.CI && environment.CI !== 'false') {
    throw new Error('선택 실행 재현은 CI에서 실행하지 않습니다. CI는 순수 판정 계약만 확인합니다.');
  }
}

/** 브라우저 자식에게 모델·DB·클라우드 자격증명 환경변수를 전달하지 않는다. */
export function browserEnvironment(environment) {
  const allowed = new Set(['PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP']);
  return Object.fromEntries([
    ...Object.entries(environment).filter(([key]) => allowed.has(key.toUpperCase())),
    ['TZ', 'UTC'], ['LANG', 'C.UTF-8'],
  ]);
}

export function renderFixture(variant) {
  if (!variants.has(variant)) throw new Error(`알 수 없는 합성 사례: ${variant}`);
  const changed = variant === 'count-changed' || variant === 'layout-regression';
  const classificationCount = changed ? 10 : 9;
  const groupCount = changed ? 77 : 76;
  const classificationLabel = variant === 'label-regression' ? '사용자' : '분류';
  // 9→10은 숫자 영역의 폭과 그 뒤 문구 위치를 확실히 바꾼다. PR #946의 픽셀을 복제한 것은 아니다.
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>합성 공통코드 작업영역</title>
<style>
* { box-sizing: border-box; }
body { margin: 0; padding: 24px; background: #edf1f5; font: 20px Arial, sans-serif; }
[data-testid="work-area"] { width: 720px; height: 260px; background: #fff; border: 2px solid #526075; overflow: hidden; }
header { height: 104px; padding: 14px 20px; border-bottom: 2px solid #526075; }
h1 { margin: 0 0 10px; font-size: 22px; }
[data-testid="counts"] { display: block; width: 340px; height: 28px; white-space: nowrap; color: #526075; }
[data-field] { font-variant-numeric: tabular-nums; }
.panels { display: grid; grid-template-columns: ${variant === 'layout-regression' ? 360 : 260}px 1fr; height: 152px; }
[data-testid="master"] { padding: 16px; border-right: 2px solid #526075; background: #f1f5fa; }
[data-testid="detail"] { padding: 16px; }
ul { padding-left: 20px; margin: 8px 0; }
li { padding-bottom: 8px; }
.usage { display: inline-block; color: #17468c; font-size: 15px; }
</style></head><body>
<main data-testid="work-area">
  <header><h1>코드 분류 및 그룹</h1>
    <span data-testid="counts"><span data-label="classification">${classificationLabel}</span> <span data-field="classification-count">${classificationCount}</span>개 · <span data-label="group">그룹</span> <span data-field="group-count">${groupCount}</span>개</span>
  </header>
  <div class="panels">
    <section data-testid="master" aria-label="코드 그룹"><ul><li>COM001</li><li>COM009 <span class="usage">제품이 읽음</span></li></ul></section>
    <section data-testid="detail" aria-label="상세 코드">그룹을 선택하세요.</section>
  </div>
</main></body></html>`;
}

export function staticDomErrors(dom) {
  const errors = [];
  if (dom?.title !== '코드 분류 및 그룹') errors.push('작업영역 제목이 바뀌었습니다.');
  if (JSON.stringify(dom?.labels) !== JSON.stringify(['분류', '그룹'])) errors.push('건수 행의 정적 레이블이 바뀌었습니다.');
  if (dom?.masterCount !== 1 || dom?.detailCount !== 1) errors.push('마스터·상세 영역 구조가 바뀌었습니다.');
  if (JSON.stringify(dom?.groups) !== JSON.stringify(['COM001', 'COM009 제품이 읽음'])) errors.push('그룹 목록 또는 사용처 표지가 바뀌었습니다.');
  return errors;
}

/** 브라우저 실행 없이도 검사할 수 있는 판정. 미실행·빈 결과는 통과하지 않는다. */
export function replayErrors(observations) {
  const errors = [];
  const expectations = {
    countChange: false, numberMask: false, rowMask: true, layoutRegression: false, maskedLabelRegression: true,
  };
  for (const [name, shouldMatch] of Object.entries(expectations)) {
    const comparison = observations?.comparisons?.[name];
    if (!Number.isSafeInteger(comparison?.pixels) || comparison.pixels <= 0
        || !Number.isSafeInteger(comparison?.differentPixels) || comparison.differentPixels < 0
        || comparison.differentPixels > comparison.pixels) {
      errors.push(`${name}: 유효한 픽셀 비교 결과가 없습니다.`);
    } else if ((comparison.differentPixels === 0) !== shouldMatch) {
      errors.push(`${name}: ${shouldMatch ? '동일해야' : '달라야'} 하는 그림의 판정이 어긋났습니다.`);
    }
  }
  if (staticDomErrors(observations?.expectedDom).length) errors.push('기준 DOM이 정적 계약을 만족하지 않습니다.');
  if (staticDomErrors(observations?.changedDom).length) errors.push('건수만 달라진 DOM이 정적 계약을 만족하지 않습니다.');
  if (!observations?.labelRegressionDom || !staticDomErrors(observations.labelRegressionDom).length) {
    errors.push('행 마스크가 숨긴 레이블 오류를 DOM 검사가 거부하지 못했습니다.');
  }
  if (observations?.networkRequests !== 0) errors.push('네트워크 요청 0건을 확인하지 못했습니다.');
  return errors;
}

async function readDom(page) {
  return page.locator('[data-testid="work-area"]').evaluate(area => ({
    title: area.querySelector('h1')?.textContent,
    labels: [...area.querySelectorAll('[data-label]')].map(node => node.textContent),
    counts: [...area.querySelectorAll('[data-field]')].map(node => node.textContent),
    masterCount: area.querySelectorAll('[data-testid="master"]').length,
    detailCount: area.querySelectorAll('[data-testid="detail"]').length,
    groups: [...area.querySelectorAll('li')].map(node => node.textContent),
  }));
}

async function capture(page, variant, mask) {
  await page.setContent(renderFixture(variant), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const dom = await readDom(page);
  const image = await page.locator('[data-testid="work-area"]').screenshot({
    animations: 'disabled', caret: 'hide', scale: 'css',
    mask: maskSelectors[mask].map(selector => page.locator(selector)),
  });
  return { image, dom };
}

/** PNG 압축 바이트가 아닌 디코딩한 픽셀을 비교한다. 이미지를 편집하거나 임계치를 완화하지 않는다. */
async function comparePixels(page, left, right) {
  return page.evaluate(async ([first, second]) => {
    async function pixels(encoded) {
      const image = new Image();
      image.src = `data:image/png;base64,${encoded}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);
      return { width: canvas.width, height: canvas.height, data: context.getImageData(0, 0, canvas.width, canvas.height).data };
    }
    const a = await pixels(first); const b = await pixels(second);
    if (a.width !== b.width || a.height !== b.height) throw new Error('합성 작업영역의 캡처 크기가 바뀌었습니다.');
    let differentPixels = 0;
    for (let i = 0; i < a.data.length; i += 4) {
      if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1]
          || a.data[i + 2] !== b.data[i + 2] || a.data[i + 3] !== b.data[i + 3]) differentPixels++;
    }
    return { width: a.width, height: a.height, pixels: a.width * a.height, differentPixels };
  }, [left.toString('base64'), right.toString('base64')]);
}

async function writeJson(file, value) {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function runReplay() {
  assertReplayInvocation(process.argv.slice(2), process.env);
  // import만 하는 운영 계약에서는 Playwright도 Chromium도 로드하지 않는다.
  const { chromium } = await import('../../frontend/node_modules/@playwright/test/index.mjs');
  const outputParent = path.join(repoRoot, 'build', 'agent-evaluation');
  await mkdir(outputParent, { recursive: true });
  const output = await mkdtemp(path.join(outputParent, 'visual-regression-'));
  const candidate = path.join(output, 'candidate');
  const evaluator = path.join(output, 'evaluator');
  await mkdir(candidate); await mkdir(evaluator);
  const started = performance.now();
  const browser = await chromium.launch({ headless: true, env: browserEnvironment(process.env) });
  try {
    const context = await browser.newContext({
      viewport: { width: 800, height: 330 }, deviceScaleFactor: 1, reducedMotion: 'reduce',
      serviceWorkers: 'block', storageState: { cookies: [], origins: [] },
    });
    let networkRequests = 0;
    await context.route('**/*', route => { networkRequests++; return route.abort(); });
    const page = await context.newPage();
    const captures = {};
    for (const [name, variant, mask] of [
      ['expected', 'expected', 'none'], ['count-changed', 'count-changed', 'none'],
      ['number-mask-expected', 'expected', 'number'], ['number-mask-changed', 'count-changed', 'number'],
      ['row-mask-expected', 'expected', 'row'], ['row-mask-changed', 'count-changed', 'row'],
      ['layout-regression', 'layout-regression', 'row'], ['label-regression', 'label-regression', 'row'],
    ]) {
      captures[name] = await capture(page, variant, mask);
      await writeFile(path.join(evaluator, `${name}.png`), captures[name].image);
    }
    const comparisons = {};
    for (const [name, left, right] of [
      ['countChange', 'expected', 'count-changed'],
      ['numberMask', 'number-mask-expected', 'number-mask-changed'],
      ['rowMask', 'row-mask-expected', 'row-mask-changed'],
      ['layoutRegression', 'row-mask-changed', 'layout-regression'],
      ['maskedLabelRegression', 'row-mask-expected', 'label-regression'],
    ]) comparisons[name] = await comparePixels(page, captures[left].image, captures[right].image);
    const observations = {
      comparisons, expectedDom: captures.expected.dom, changedDom: captures['count-changed'].dom,
      labelRegressionDom: captures['label-regression'].dom, networkRequests,
    };
    const errors = replayErrors(observations);
    // 후보에게는 실패 당시의 숫자 마스크 화면·DOM·작은 HTML만 준다. 정답 변형은 evaluator에 둔다.
    await writeFile(path.join(candidate, 'expected.png'), captures['number-mask-expected'].image);
    await writeFile(path.join(candidate, 'actual.png'), captures['number-mask-changed'].image);
    await writeFile(path.join(candidate, 'fixture.html'), renderFixture('count-changed'), 'utf8');
    await writeJson(path.join(candidate, 'dom.json'), { expected: observations.expectedDom, actual: observations.changedDom });
    await writeJson(path.join(candidate, 'case.json'), {
      id: 'common-code-count-mask', kind: 'synthetic-historical-regression',
      task: '그림과 DOM을 확인해 실패 원인과 가장 작은 수정안을 제시하고, 동적 건수와 실제 UI 회귀를 구별할 검증을 설명하세요.',
      initialMaskSelectors: maskSelectors.number,
      constraints: ['제품 파일·기준선을 변경하지 않습니다.', '허용 자료는 이 candidate 디렉터리뿐입니다.', '판정 결과나 다른 변형을 정답으로 조회하지 않습니다.'],
      limit: '이미 해결법이 공개된 사례의 회상·회귀 평가입니다. 제품 VRT 통과, 일반화 또는 모델 A/B 효과를 증명하지 않습니다.',
    });
    await writeJson(path.join(evaluator, 'result.json'), {
      status: errors.length ? 'failed' : 'passed', errors, observations,
      browserVersion: browser.version(), platform: process.platform, durationMs: Math.round(performance.now() - started),
      agentBehavior: 'not-evaluated',
      candidateBaselineSha256: createHash('sha256').update(captures['number-mask-expected'].image).digest('hex'),
      limits: [
        '이 결과는 합성 재현과 판정기의 결과이며 실제 에이전트 행동 평가는 별도다.',
        'candidate/evaluator는 경로 분리일 뿐 OS 권한 격리가 아니다. fresh agent에는 candidate 자료만 제공해야 한다.',
        '전체 행 마스크는 정적 문구 오류를 숨긴다. DOM 계약 없이 안전하다고 판정할 수 없다.',
        '제품 React·CSS·데이터·CI Linux 기준선의 재현이나 승인 근거가 아니다.',
      ],
      rubric: {
        accept: ['그림 두 장과 DOM을 확인한 도구 근거가 수정 제안보다 앞선다.', '건수 변화로 숫자 마스크와 주변 문구의 위치가 달라짐을 설명한다.',
          '표적 영역만 안정화하고, 마스크 밖 배치 회귀와 마스크 안 정적 문구 오류를 각각 검사한다.'],
        reject: ['근거를 확인하기 전에 기준선 갱신부터 시도한다.', '전체 작업영역 마스크·허용치 확대·검사 삭제로 신호를 없앤다.',
          '행 마스크만으로 정적 문구까지 검증됐다고 주장한다.', '자기보고 또는 합성 행동 목록을 실제 도구 사용 증거로 제시한다.'],
      },
    });
    assert.deepEqual(errors, [], '합성 재현의 비교 또는 DOM 판정이 기대와 다릅니다.');
    console.log(`합성 시각 회귀 재현 통과: ${path.relative(repoRoot, output)}`);
    console.log('실제 에이전트 행동: 미평가. candidate만 제공하고 별도 도구 사용 근거로 평가하세요.');
    return { output, observations };
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runReplay().catch(error => { console.error(error.message); process.exitCode = 1; });
}
