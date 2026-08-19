#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function evaluateRequiredAggregate({ classifierResult, expectedWork, sourceResult }) {
  if (classifierResult !== 'success') {
    return { ok: false, reason: `change classification did not succeed: ${classifierResult}` };
  }
  if (expectedWork === 'false' && sourceResult === 'skipped') {
    return { ok: true, reason: 'work was explicitly out of scope and the source job was skipped' };
  }
  if (expectedWork === 'true' && sourceResult === 'success') {
    return { ok: true, reason: 'selected source work completed successfully' };
  }
  return {
    ok: false,
    reason: `invalid aggregate state: expected=${expectedWork}, source=${sourceResult}`,
  };
}

function main() {
  const input = {
    classifierResult: process.env.CLASSIFIER_RESULT ?? '',
    expectedWork: process.env.EXPECTED_WORK ?? '',
    sourceResult: process.env.SOURCE_RESULT ?? '',
  };
  const result = evaluateRequiredAggregate(input);
  const summary = `classifier=${input.classifierResult} / expected=${input.expectedWork} / source=${input.sourceResult}`;
  if (!result.ok) {
    console.error(`::error::required aggregate failed — ${summary} — ${result.reason}`);
    process.exitCode = 1;
    return;
  }
  console.log(`required aggregate passed — ${summary} — ${result.reason}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
