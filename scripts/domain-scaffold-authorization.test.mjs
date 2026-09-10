import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = () => fs.readFileSync(path.join(root, 'scripts/generate-domain.ps1'), 'utf8').replace(/\r\n/g, '\n');
const methods = ['getList', 'get', 'create', 'update', 'delete'];

function assertScaffold(source) {
  const template = source.match(/\$controllerContent = @"\n([\s\S]*?)\n"@/)?.[1];
  assert.ok(template, 'controller template missing');
  assert.match(template, /package nuri\.api\.controller\.business\.\$domainLower;/);
  assert.match(template, /import org\.springframework\.security\.access\.prepost\.PreAuthorize;/);
  assert.doesNotMatch(template, /@(Authenticated|AdminOnly|AdminOrSystem)|hasRole\(|permitAll\(/);
  const expressions = [...template.matchAll(/@PreAuthorize\("([^"]+)"\)/g)].map(match => match[1]);
  assert.deepEqual(expressions, methods.map(method =>
    "@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.$domainLower.${domainCap}ApiController#" + method + "')"));
  assert.match(template, /permission-catalog\.json/);
  assert.match(template, /authorization-policies\.json/);
  assert.match(template, /operationBindings/);
  assert.match(source, /node scripts\/generate-permissions\.mjs/);
  assert.match(source, /미등록 상태는 HTTP\/메서드 거부 및 린터 red/);
  // Scaffold emits Java files and a review-only DDL draft; permission defaults require a separate reviewed change.
  const writes = [...source.matchAll(/^Write-Utf8File\s+"([^"]+)"/gm)].map(match => match[1]);
  assert.equal(writes.length, 5);
  assert.ok(writes.every(file => file.endsWith('.java')));
  assert.doesNotMatch(source, /INSERT\s+INTO\s+tb_authrt_(?:grnt|user)_map|Set-Content[^\n]*(?:permission-catalog|authorization-policies)/i);
}

test('domain scaffolder emits exact handler guards and requires reviewed permission registration', () => {
  assertScaffold(read());
});

test('missing guard, wrong handler and role-based or public fallback are red', () => {
  const source = read();
  for (const mutation of [
    s => s.replace('#getList', '#get'),
    s => s.replace(/^    @PreAuthorize[^\n]*\n/m, ''),
    s => s.replace('@permissionPolicy.allowed(authentication,', 'hasRole(authentication,'),
    s => s.replace('미등록 상태는 HTTP/메서드 거부 및 린터 red', 'automatically approved'),
  ]) {
    const changed = mutation(source);
    assert.notEqual(changed, source);
    assert.throws(() => assertScaffold(changed), { name: 'AssertionError' });
  }
});

test('scaffolder authorization contract is included in local and required CI operational execution', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.ok(pkg.scripts['test:operational-contracts'].includes('"scripts/*.test.mjs"'));
  for (const file of ['scripts/verify.mjs', '.githooks/pre-push', '.github/workflows/ci.yml']) {
    assert.ok(fs.readFileSync(path.join(root, file), 'utf8').includes('npm run test:operational-contracts'), file);
  }
});
