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
