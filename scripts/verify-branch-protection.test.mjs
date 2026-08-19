import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { validateClassicAdminEnforcement } from './branch-protection-contract.mjs';

test('classic branch protection must explicitly enforce rules for administrators', () => {
  assert.deepEqual(validateClassicAdminEnforcement({ enforce_admins: { enabled: true } }), []);

  for (const classicProtection of [
    {},
    { enforce_admins: null },
    { enforce_admins: {} },
    { enforce_admins: { enabled: false } },
  ]) {
    assert.match(
      validateClassicAdminEnforcement(classicProtection).join('\n'),
      /enforce_admins\.enabled=true required/,
    );
  }
});

test('live verifier wires the administrator check into the classic fallback', () => {
  const verifier = fs.readFileSync(new URL('./verify-branch-protection.mjs', import.meta.url), 'utf8');
  assert.match(
    verifier,
    /if \(classic\) \{\s*failures\.push\(\.\.\.validateClassicAdminEnforcement\(classic\)\);/,
  );
});
