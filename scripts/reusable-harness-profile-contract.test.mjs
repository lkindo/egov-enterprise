import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isHistoricalAuthorizationRehearsal, projectedWriteHandlerCounts } from './generate-reusable-base-source.mjs';

test('projected handler census counts actual success bodies, private delegates and explicit non-success separately', () => {
  const source = `class Controller {
    @PostMapping("/one") public Object one() { return ApiResponse.success("}"); }
    @PutMapping("/two") public Object two() { return delegated(); }
    private Object delegated() { return ResponseEntity.ok("("); }
    @DeleteMapping("/three") public Object three() { return ResponseEntity.noContent().build(); }
  }`;
  assert.deepEqual(projectedWriteHandlerCounts(source), { handlers: 3, successful: 2 });
  assert.deepEqual(projectedWriteHandlerCounts(source.replace('ResponseEntity.ok', 'ResponseEntity.noContent')), { handlers: 3, successful: 1 });
  assert.throws(() => projectedWriteHandlerCounts('@PostMapping("/broken") public Object broken() {'), /Unclosed/);
});

test('only the three historical authorization transitions are projected out, and source drift is red', () => {
  const fixtures = [
    ['AuthorityReferenceFkIntegrationTest.java', '"2.99"'],
    ['AuthorizationContractIntegrationTest.java', '"2.99"'],
    ['AuthorizationGrantExpansionIntegrationTest.java', '"2.97"'],
  ];
  for (const [name, version] of fixtures) {
    const source = readFileSync(new URL(`../api-server/src/test/java/nuri/api/schema/${name}`, import.meta.url), 'utf8');
    assert.equal(isHistoricalAuthorizationRehearsal(name, source), true);
    assert.throws(() => isHistoricalAuthorizationRehearsal(name, source.replaceAll(version, '"1.0"')), /changed scope/);
    assert.throws(() => isHistoricalAuthorizationRehearsal(name, `/* ${source.replaceAll('*/', '')} */ class CurrentSchema {}`), /changed scope/);
  }
  const current = readFileSync(new URL('../api-server/src/test/java/nuri/api/schema/SchemaValidationIntegrationTest.java', import.meta.url), 'utf8');
  assert.equal(isHistoricalAuthorizationRehearsal('SchemaValidationIntegrationTest.java', current), false);
  assert.equal(isHistoricalAuthorizationRehearsal('NewAuthorizationContractIntegrationTest.java', 'fromVersion("2.99")'), false);
});
