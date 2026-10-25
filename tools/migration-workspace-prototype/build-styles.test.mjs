// 커밋된 시안 CSS(styles.css)가 지금의 원본과 frontend 에 설치된 Tailwind 로 만든 결과와 같은지 본다.
// 운영 계약 잡(secret-scan)과 로컬 운영 계약은 frontend 의존성을 이미 전제로 한다(generated-boundary-census 가 typescript 를 쓴다).
// premium.css·화면 클래스·Tailwind 판이 바뀌면 붉어지고 `node tools/migration-workspace-prototype/build-styles.mjs` 로 다시 만든다.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderStyles, stylesAreCurrent } from './build-styles.mjs';

test('the committed prototype stylesheet matches a fresh Tailwind build of the current sources', async () => {
  assert.equal(await stylesAreCurrent(), true, 'stale stylesheet — run node tools/migration-workspace-prototype/build-styles.mjs');
  // 빈 입력·빈 결과끼리 같아지는 경로를 막는다 — 실제 Tailwind 결과와 시안 글꼴 선언이 들어 있어야 한다.
  const rendered = await renderStyles();
  assert.ok(rendered.length > 10_000 && /tailwindcss v4/.test(rendered));
  assert.match(rendered, /Pretendard Variable/);
});
