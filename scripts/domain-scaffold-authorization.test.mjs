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

// [2026-10-24 DEC-OPS-382] 스캐폴드 산출물이 저장소의 엔티티 규칙과 기능 소유 레이아웃을 따른다.
//   종전 템플릿은 class-level @Builder·@AllArgsConstructor(GH-ENTITY-LOMBOK-SOURCE 위반)와 repository/<d>
//   (기능 소유 판정 밖)를 찍었다. 이 저장소에서 스캐폴드가 실제로 쓰인 적이 없어 드러나지 않았다.
function assertScaffoldLayout(source) {
  const entity = source.match(/\$entityContent = @"\n([\s\S]*?)\n"@/)?.[1];
  assert.ok(entity, 'entity template missing');
  const classHeader = entity.slice(0, entity.indexOf('public class'));
  assert.doesNotMatch(classHeader, /^@(?:Builder|SuperBuilder|AllArgsConstructor)\b/m, 'entity must not use class-level builder or all-args constructor');
  assert.match(classHeader, /^@NoArgsConstructor\(access = AccessLevel\.PROTECTED\)$/m);
  assert.match(entity, /@Builder\n {4}public static \$domainCap create\(/, 'builder must sit on the static create factory');
  assert.match(source, /^\$repoDir = \$domainDir$/m, 'repository must live with the entity in domain/<d>');
  assert.match(source, /^\$dtoDir = "\$serviceDir\/dto"$/m);
  assert.doesNotMatch(source, /nuri\.business\.repository\b|\$baseDir\/repository\//, 'repository/<d> is outside feature ownership');
  const dto = source.match(/\$dtoContent = @"\n([\s\S]*?)\n"@/)?.[1];
  assert.ok(dto, 'dto template missing');
  assert.match(dto, /^package nuri\.business\.service\.\$domainLower\.dto;$/m);
  assert.match(dto, /public record Request\(\$\{sizeAnnotation\}\$FieldType \$FieldName\)/, 'request DTO must not carry the id');
}

test('domain scaffolder emits exact handler guards and requires reviewed permission registration', () => {
  assertScaffold(read());
});

test('domain scaffolder follows the entity builder rule and the feature-owned layout', () => {
  assertScaffoldLayout(read());
});

test('class-level builder, repository/<d> layout and id-carrying requests are red', () => {
  const source = read();
  for (const mutation of [
    s => s.replace('@NoArgsConstructor(access = AccessLevel.PROTECTED)\npublic class $domainCap', '@Builder\n@NoArgsConstructor(access = AccessLevel.PROTECTED)\npublic class $domainCap'),
    s => s.replace('$repoDir = $domainDir', '$repoDir = "$baseDir/repository/$domainLower"'),
    s => s.replace('public record Request(${sizeAnnotation}$FieldType $FieldName)', 'public record Request(Long id, ${sizeAnnotation}$FieldType $FieldName)'),
  ]) {
    const changed = mutation(source);
    assert.notEqual(changed, source);
    assert.throws(() => assertScaffoldLayout(changed), { name: 'AssertionError' });
  }
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
