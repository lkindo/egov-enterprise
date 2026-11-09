import test from 'node:test';
import assert from 'node:assert/strict';
import { collectSensitivityWarnings, mergeSensitivityWarnings, validateSensitivityWarnings, PRIVATE_ANALYSIS_VALIDATION } from './privacy-warnings.mjs';
import { createEmptyBacklogPack, validateBacklogPack, PII_SECRET_KINDS } from '../../scripts/export-deliverables-workspace.mjs';
import { validateAiValue, validatePrivateAiValue } from './ai-contract.mjs';
import { documentReadingProfile, isReusableDocumentReading, sourceEvidenceDigest } from './artifact-imports.mjs';

test('private analysis reports patterns without retaining values or untrusted object keys', () => {
  const warnings = collectSensitivityWarnings({ text: '연락처 010-1234-5678', 'person@example.test': 'person@example.test' }, 'input');
  assert.ok(warnings.some(warning => warning.kind === 'mobile-phone'));
  assert.ok(warnings.some(warning => warning.kind === 'email-address'));
  assert.doesNotMatch(JSON.stringify(warnings), /010-1234|person@example/);
  validateSensitivityWarnings(warnings);
  assert.deepEqual(mergeSensitivityWarnings(warnings, []), warnings);
  assert.throws(() => validateSensitivityWarnings([{ ...warnings[0], paths: ['person@example.test'] }]));
});

test('warning kinds use the same scanner catalog and reject invented notice types', () => {
  for (const kind of PII_SECRET_KINDS) assert.doesNotThrow(() => validateSensitivityWarnings([{ kind, stage: 'workspace', count: 1, paths: ['project'] }]));
  assert.throws(() => validateSensitivityWarnings([{ kind: 'invented', stage: 'workspace', count: 1, paths: ['project'] }]));
});

test('private AI validation permits patterns but still rejects malformed structures and public validation stays strict', () => {
  const schema = { type: 'object', properties: { text: { type: 'string', minLength: 1, maxLength: 100 } }, required: ['text'], additionalProperties: false };
  const value = { text: '연락처 010-1234-5678' };
  assert.throws(() => validateAiValue(value, schema), { code: 'AI_OUTPUT_INVALID' });
  assert.doesNotThrow(() => validatePrivateAiValue(value, schema));
  assert.throws(() => validatePrivateAiValue({ ...value, unexpected: true }, schema), { code: 'AI_OUTPUT_INVALID' });
  const pack = createEmptyBacklogPack(); pack.project.name = value.text;
  assert.equal(validateBacklogPack(pack).valid, false);
  const privateResult = validateBacklogPack(pack, null, PRIVATE_ANALYSIS_VALIDATION);
  assert.equal(privateResult.valid, true);
  assert.ok(privateResult.warnings.some(message => message.includes('PII/secret')));
});

test('only the immediately preceding strict privacy prompt is compatible with unchanged verified reading evidence', () => {
  const source = { fileSha256: 'a'.repeat(64), sourceType: 'interview', classification: 'internal', clauses: [{ id: 'C-1', text: '합성 업무 근거', locator: '본문' }] };
  const job = { status: 'ready', method: 'ai-document', sha256: source.fileSha256, promptVersion: '2026-11-07.1', sourceDigest: sourceEvidenceDigest(source), readingProfile: documentReadingProfile(source.sourceType, source.classification, '2026-11-07.1') };
  assert.equal(isReusableDocumentReading(job, source), true);
  for (const changed of [{ ...source, classification: 'restricted' }, { ...source, sourceType: 'regulation' }, { ...source, fileSha256: 'b'.repeat(64) }, { ...source, clauses: [{ ...source.clauses[0], text: '수정한 근거' }] }]) assert.equal(isReusableDocumentReading(job, changed), false);
  assert.equal(isReusableDocumentReading({ ...job, promptVersion: '2026-11-01.1' }, source), false);
});
