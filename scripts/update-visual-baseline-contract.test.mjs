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

test('visual baseline workflow masks its ephemeral JWT before later steps can log it', () => {
  const source = readFileSync(workflowUrl, 'utf8');
  assert.deepEqual(validateMaskedJwt(source), []);
});

test('removing or delaying add-mask is a reproducible red', () => {
  const source = readFileSync(workflowUrl, 'utf8');
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
