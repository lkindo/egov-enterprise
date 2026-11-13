import assert from 'node:assert/strict';
import test from 'node:test';
import { validateAdditiveApiDocs, isAdopterContractArtifact } from './adopter-api-contract.mjs';
import { validateAdopterHarnessManifest } from './reusable-adopter-project.mjs';

test('API additions retain existing wire contracts and require a registered operation', () => {
  const original = { openapi: '3.1.0', info: { title: 'Original', version: '1' },
    paths: { '/api/old': { get: { operationId: 'old', responses: { 200: { description: 'OK' } } } } },
    components: { schemas: { Old: { type: 'string' } } }, tags: [{ name: 'Original' }] };
  const current = structuredClone(original);
  const binding = { method: 'GET', path: '/api/new', handler: 'sample.NewController#read' };
  current.paths['/api/new'] = { get: { operationId: 'new', responses: { 200: { description: 'OK' } } } };
  current.components.schemas.New = { type: 'object', properties: { old: { $ref: '#/components/schemas/Old' } } };
  current.tags.push({ name: 'Adopter' });
  assert.doesNotThrow(() => validateAdditiveApiDocs(original, current, [binding]));
  assert.throws(() => validateAdditiveApiDocs(original, current, []), /registered added handler binding/);
  for (const [mutate, expected] of [
    [doc => { doc.paths['/api/old'].get.operationId = 'changed'; }, /Original API operation/],
    [doc => { delete doc.paths['/api/old']; }, /Original API operation/],
    [doc => { doc.components.schemas.Old.type = 'integer'; }, /Original API schema/],
    [doc => { doc.info.title = 'Changed original'; }, /Original API document settings/],
    [doc => { doc.components.schemas.New.properties.old.$ref = 'https://example.invalid/schema'; }, /local schema references/],
    [doc => { doc.paths['/api/new'].parameters = []; }, /Only new GET/],
    [doc => { doc.paths['/api/new'].post = doc.paths['/api/new'].get; }, /Only new GET/],
  ]) {
    const bad = structuredClone(current); mutate(bad);
    assert.throws(() => validateAdditiveApiDocs(original, bad, [binding]), expected);
  }
  assert.equal(isAdopterContractArtifact('frontend/src/types/generated-zod/adopter.ts'), true);
  for (const path of ['frontend/src/arbitrary.ts', 'scripts/adopter-api-contract.mjs',
    'frontend/src/types/generated-zod/nested/handwritten.ts', 'frontend/src/types/generated-zod/../../arbitrary.ts']) {
    assert.equal(isAdopterContractArtifact(path), false, path);
  }
});

test('new read paths cannot shadow inherited literal or template operations', () => {
  for (const [oldPath, newPath] of [['/api/x/{id}', '/api/x/probe'], ['/api/x/{id}', '/api/x/{key}'],
    ['/api/{group}/probe', '/api/x/{id}'], ['/api/x/probe', '/api/x/probe/']]) {
    const original = { paths: { [oldPath]: { get: { operationId: 'original' } } } };
    const current = structuredClone(original);
    current.paths[newPath] = { get: { operationId: 'added' } };
    assert.throws(() => validateAdditiveApiDocs(original, current, [{ method: 'GET', path: newPath }]), /overlaps an inherited/);
  }
  const original = { paths: { '/api/x/{id}': { get: { operationId: 'original' } } } };
  const current = structuredClone(original);
  current.paths['/api/x/{id}/children'] = { get: { operationId: 'children' } };
  assert.doesNotThrow(() => validateAdditiveApiDocs(original, current, [{ method: 'GET', path: '/api/x/{id}/children' }]));
});

test('a manually resealed manifest cannot change other gate keys', () => {
  const baseline = { harnessManifestText: '# Original\nGate.THRESHOLD=5\n__registry.config/governance/authorization-policies.json=old\n' };
  assert.doesNotThrow(() => validateAdopterHarnessManifest(baseline,
    'Gate.THRESHOLD=5\n__registry.config/governance/authorization-policies.json=new\n'));
  assert.throws(() => validateAdopterHarnessManifest(baseline,
    'Gate.THRESHOLD=1\n__registry.config/governance/authorization-policies.json=new\n'), /other harness rules/);
  assert.throws(() => validateAdopterHarnessManifest(baseline,
    '__registry.config/governance/authorization-policies.json=new\n'), /other harness rules/);
});
