#!/usr/bin/env node
/** Representative custom selections use the public engine and its complete verification path. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createComposerEngine } from './project-composer.mjs';
import { normalizeBackendLayout } from './reusable-layout.mjs';

const USAGE = 'Usage: verify-project-composer.mjs --layout multi-module|single-module [--vendor <id>]';

export function parseComposerVerificationArgs(args) {
  if (![2, 4].includes(args.length) || args[0] !== '--layout' || (args.length === 4 && args[2] !== '--vendor')) throw new Error(USAGE);
  return { layout: normalizeBackendLayout(args[1]), vendor: args[3] };
}

/**
 * 벤더 실행은 대표 E2E·증거와 같은 시작 구성을 쓴다. 인증 입력은 모든 기능의 엔티티·마이그레이션이라 일부 기능 구성으로는 바뀐 입력을 돌리지 못한다.
 * 어떤 구성을 도는지는 시험 원장이 정한다.
 */
export function composerVerificationRecipe({ layout, vendor, sourceRef, preset }) {
  const selection = vendor ? { preset } : { domains: layout === 'multi-module' ? ['mail', 'schedule'] : ['board', 'survey'] };
  return { schemaVersion: 1, project: { name: vendor ? `composer-${vendor}-${layout}` : `composer-${layout}` }, sourceRef,
    selection, database: { vendor: vendor ?? 'postgresql' }, backendLayout: layout };
}

async function main(args) {
  const { layout, vendor } = parseComposerVerificationArgs(args);
  const { preset } = JSON.parse(readFileSync(resolve(import.meta.dirname, '../config/governance/vendor-test-ledger.json'), 'utf8')).representativeE2e;
  const engine = createComposerEngine();
  const recipe = composerVerificationRecipe({ layout, vendor, sourceRef: engine.catalog().sourceRef, preset });
  const result = await engine.generate(recipe, { onProgress: ({ stage, progress }) => process.stdout.write(`[composer-verification] ${stage} ${progress}%\n`) });
  const reports = resolve(import.meta.dirname, '../build/reports/project-composer');
  mkdirSync(reports, { recursive: true });
  writeFileSync(resolve(reports, `${vendor ? `${vendor}-` : ''}${layout}.json`), `${JSON.stringify({ ...result, layout, recipe }, null, 2)}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main(process.argv.slice(2));
