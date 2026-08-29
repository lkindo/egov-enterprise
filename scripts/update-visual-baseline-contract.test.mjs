import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const workflowUrl = new URL('../.github/workflows/update-visual-baseline.yml', import.meta.url);

function validateMaskedJwt(source) {
  const step = source.match(
    /- name: Generate ephemeral JWT secret \(backend\/frontend 대칭\)([\s\S]*?)(?=\n\s+- name:)/u,
  )?.[1] ?? '';
  const assignment = 'jwt_secret="$(openssl rand -hex 44)"';
  const mask = 'echo "::add-mask::$jwt_secret"';
  const persist = 'echo "JWT_SECRET=$jwt_secret" >> "$GITHUB_ENV"';
  const order = [assignment, mask, persist].map((token) => step.indexOf(token));

  return [
    step ? null : 'ephemeral JWT 생성 step이 없습니다.',
    order.every((index) => index >= 0) ? null : 'JWT 생성·마스킹·GITHUB_ENV 기록 계약이 불완전합니다.',
    order[0] < order[1] && order[1] < order[2] ? null : 'JWT는 GITHUB_ENV 기록 전에 add-mask 해야 합니다.',
    /JWT_SECRET=\$\(openssl/u.test(step) ? '생성 값을 직접 GITHUB_ENV에 쓰면 마스킹 전에 노출됩니다.' : null,
  ].filter(Boolean);
}

/**
 * 줄바꿈을 LF 로 정규화해 읽는다.
 *
 * ⚠ 아래 red 증명은 워크플로 본문을 **줄바꿈을 포함한 문자열**로 치환해 순서를 뒤집는다.
 *   Windows 체크아웃(core.autocrlf)에서는 파일이 CRLF 라 그 치환이 no-op 이 되고,
 *   "위반을 만들었는데 red 가 안 난다"는 거짓 실패가 난다(2026-08-24 실측: 로컬 red / CI green).
 *   검사 대상은 스텝의 **순서**이지 줄바꿈 표기가 아니므로 읽는 시점에 정규화한다.
 */
function readWorkflow() {
  return readFileSync(workflowUrl, 'utf8').replace(/\r\n/gu, '\n');
}

test('visual baseline workflow masks its ephemeral JWT before later steps can log it', () => {
  const source = readWorkflow();
  assert.deepEqual(validateMaskedJwt(source), []);
});

test('removing or delaying add-mask is a reproducible red', () => {
  const source = readWorkflow();
  assert.match(
    validateMaskedJwt(source.replace('echo "::add-mask::$jwt_secret"', '')).join('\n'),
    /마스킹/u,
  );
  assert.match(
    validateMaskedJwt(source.replace(
      'echo "::add-mask::$jwt_secret"\n          echo "JWT_SECRET=$jwt_secret" >> "$GITHUB_ENV"',
      'echo "JWT_SECRET=$jwt_secret" >> "$GITHUB_ENV"\n          echo "::add-mask::$jwt_secret"',
    )).join('\n'),
    /전에 add-mask/u,
  );
});

/**
 * 커밋 스텝의 "변경 없음" 경로가 도달 가능해야 한다.
 *
 * [2026-08-29] 종전 가드는 스테이징이 비었을 때 `find frontend/e2e -name '*-linux.png'` 로
 * 파일 존재를 확인해 오류를 냈다. 그런데 기준선은 **이미 커밋돼 추적되고 있으므로** 체크아웃
 * 직후부터 언제나 존재한다 — 즉 그 find 는 항상 참이고 아래 notice 에 도달할 수 없었다.
 * 화면이 그대로여서 기준선이 동일한, 가장 흔한 경우에 워크플로가 실패했다
 * (run 33235437822 실측: 캡처 4장 전부 성공했는데 커밋 스텝만 red).
 *
 * "변경 없음" 과 "add 경로 파손" 을 가르는 것은 파일의 존재가 아니라 **add 전 워킹트리에
 * 변경이 있었는가** 다. 그 판정 근거를 계약으로 고정한다.
 */
function validateNoChangeGuard(source) {
  const step = source.match(
    /- name: Commit baselines to current branch([\s\S]*?)(?=\n\s+- name:|$)/u,
  )?.[1] ?? '';
  const dirty = 'dirty="$(git status --porcelain -- frontend/e2e)"';
  const add = 'git add -A -- frontend/e2e';

  return [
    step ? null : '커밋 step이 없습니다.',
    step.includes(dirty) ? null : 'add 전 워킹트리 상태를 기록하지 않으면 "변경 없음"과 "add 파손"을 구분할 수 없습니다.',
    step.indexOf(dirty) >= 0 && step.indexOf(dirty) < step.indexOf(add)
      ? null : '워킹트리 상태는 git add 보다 먼저 기록해야 합니다(add 후에는 항상 깨끗합니다).',
    /find frontend\/e2e -name '\*-linux\.png'/u.test(step)
      ? '추적 중인 기준선은 언제나 존재하므로 파일 존재로는 판정할 수 없습니다("변경 없음" 경로가 영구 차단됩니다).'
      : null,
  ].filter(Boolean);
}

test('기준선이 동일할 때 커밋 스텝이 성공으로 끝날 수 있다', () => {
  assert.deepEqual(validateNoChangeGuard(readWorkflow()), []);
});

test('판정 근거를 파일 존재로 되돌리면 재현 가능한 red 다', () => {
  const source = readWorkflow();
  assert.match(
    validateNoChangeGuard(source.replace('dirty="$(git status --porcelain -- frontend/e2e)"', '')).join('\n'),
    /워킹트리 상태를 기록하지 않으면/u,
  );
  assert.match(
    validateNoChangeGuard(
      source.replace('if [ -n "$dirty" ]; then', "if find frontend/e2e -name '*-linux.png' | grep -q .; then"),
    ).join('\n'),
    /파일 존재로는 판정할 수 없습니다/u,
  );
});
