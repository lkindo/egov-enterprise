import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readRegularFile } from './read-regular-file.mjs';

function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

function gradleDependencySurface(content) {
  const withoutComments = content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[\s;{}])\/\/.*$/gm, '$1');
  const captured = [];
  let depth = 0;
  for (const rawLine of withoutComments.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    if (depth > 0) {
      captured.push(line);
      for (const ch of line) {
        if (ch === '{') depth += 1;
        else if (ch === '}') depth -= 1;
      }
      continue;
    }
    if (/^(?:buildscript|plugins|repositories|dependencyManagement|dependencies|configurations(?:\.all)?|bootJar|jar)\b.*\{/.test(line)) {
      captured.push(line);
      for (const ch of line) {
        if (ch === '{') depth += 1;
        else if (ch === '}') depth -= 1;
      }
      continue;
    }
    if (/^(?:apply\s+plugin\b|ext\s*\[)/.test(line)) {
      captured.push(line);
      continue;
    }
    if (/\bh2(?:database)?\b/i.test(line)
        || /(?:^|[;{])\s*(?:dependencies|dependencyManagement|configurations|implementation|api|compileOnly|runtimeOnly|testImplementation|testRuntimeOnly|testFixtures\w*|annotationProcessor|testAnnotationProcessor|classpath)\b(?!\s*=)/.test(line)) {
      throw new Error('Unscoped Gradle dependency statement outside gradle-dependencies surface');
    }
  }
  if (depth !== 0 || captured.length === 0) {
    throw new Error('Malformed Gradle dependency surface');
  }
  return `${captured.join('\n')}\n`;
}

export function sourceHash(root, file, scope) {
  if (typeof file !== 'string' || !/^[A-Za-z0-9_./-]+$/.test(file)
      || file.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error('Exception source must be an exact repository-relative path');
  }
  if (scope !== undefined && (scope !== 'gradle-dependencies' || !file.endsWith('.gradle'))) {
    throw new Error('Unsupported exception source scope');
  }
  const absolute = path.resolve(root, file);
  if (fs.realpathSync(absolute) !== absolute) throw new Error('Exception source cannot traverse symlinks');
  const normalized = readRegularFile(absolute, { encoding: 'utf8' }).replace(/\r\n/g, '\n');
  const payload = scope === 'gradle-dependencies' ? gradleDependencySurface(normalized) : normalized;
  return createHash('sha256').update(payload).digest('hex');
}

/** A reviewed result is exempt only while its exact source and defenses match. */
export function applyReviewedExceptions(report, evaluation, { manifest, root, codeqlVersion,
  today = new Date().toISOString().slice(0, 10) }) {
  if (manifest?.schemaVersion !== 1 || manifest.status !== 'approved'
      || manifest.codeqlVersion !== codeqlVersion || !validDate(manifest.approvedOn)
      || !validDate(today) || today < manifest.approvedOn || !Array.isArray(manifest.findings)) {
    throw new Error('Invalid or unapproved SAST exception manifest');
  }
  const ids = new Set();
  const keys = new Set();
  const hashes = new Map();
  const key = entry => JSON.stringify([entry.language, entry.ruleId, entry.file, entry.line, entry.fingerprint]);
  for (const entry of manifest.findings) {
    if (entry.status !== 'approved' || !/^SAST-FP-\d{3}$/.test(entry.id ?? '')
        || !['java', 'javascript'].includes(entry.language)
        || !entry.ruleId?.startsWith(entry.language === 'java' ? 'java/' : 'js/')
        || !Number.isSafeInteger(entry.line) || entry.line < 1
        || !/^[a-f0-9]{16}:\d+$/.test(entry.fingerprint ?? '')
        || typeof entry.reason !== 'string' || entry.reason.trim().length < 20
        || !Array.isArray(entry.supportingSources) || !validDate(entry.expiresOn)
        || entry.expiresOn <= manifest.approvedOn || today > entry.expiresOn
        || Date.parse(entry.expiresOn) - Date.parse(manifest.approvedOn) > 90 * 86_400_000
        || ids.has(entry.id) || keys.has(key(entry))) {
      throw new Error(`Invalid, duplicate or expired SAST exception: ${entry.id ?? '(missing ID)'}`);
    }
    ids.add(entry.id); keys.add(key(entry));
    for (const source of [{ file: entry.file, sha256: entry.sourceSha256 }, ...entry.supportingSources]) {
      if (!/^[a-f0-9]{64}$/.test(source.sha256 ?? '')) throw new Error(`Invalid source hash: ${entry.id}`);
      const cacheKey = `${source.file}#${source.scope ?? 'full'}`;
      if (!hashes.has(cacheKey)) hashes.set(cacheKey, sourceHash(root, source.file, source.scope));
      if (hashes.get(cacheKey) !== source.sha256) throw new Error(`SAST exception source changed: ${entry.id}; re-review required`);
    }
  }
  const expected = manifest.findings.filter(entry => entry.language === evaluation.language);
  const raw = report.runs[0].results;
  const candidates = new Map();
  for (const [index, finding] of evaluation.findings.entries()) {
    const match = expected.find(entry => key(entry) === key({ ...finding,
      language: evaluation.language, fingerprint: raw[index].partialFingerprints?.primaryLocationLineHash }));
    if (match && finding.blocking) {
      const indices = candidates.get(match.id) ?? [];
      indices.push(index); candidates.set(match.id, indices);
    }
  }
  const findings = structuredClone(evaluation.findings);
  const errors = [];
  for (const entry of expected) {
    const indices = candidates.get(entry.id) ?? [];
    if (indices.length !== 1) {
      errors.push(`Reviewed finding must match exactly once: ${entry.id} (matched ${indices.length}); re-review required`);
      continue;
    }
    const finding = findings[indices[0]];
    finding.blocking = false;
    finding.exception = { id: entry.id, reason: entry.reason, expiresOn: entry.expiresOn };
  }
  return { ...evaluation, findings, errors,
    reviewed: findings.filter(finding => finding.exception),
    blocking: findings.filter(finding => finding.blocking) };
}

/** Keep every result in the audit artifact; publish only unexempted results. */
export function exceptionReports(sanitized, evaluation) {
  const audit = structuredClone(sanitized);
  for (const [index, result] of audit.runs[0].results.entries()) {
    // Incoming suppressions never grant an exception, even in the published view.
    delete result.suppressions;
    if (result.properties) delete result.properties['egov/sast-exception'];
    const exception = evaluation.findings[index].exception;
    if (exception) {
      result.properties = { ...result.properties, 'egov/sast-exception': exception };
      result.suppressions = [{ kind: 'external', status: 'accepted',
        justification: `${exception.id}: ${exception.reason} Expires ${exception.expiresOn}.` }];
    }
  }
  const publish = structuredClone(audit);
  publish.runs[0].results = publish.runs[0].results.filter((_, index) => !evaluation.findings[index].exception);
  return { audit, publish };
}
