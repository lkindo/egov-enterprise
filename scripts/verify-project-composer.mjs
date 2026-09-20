#!/usr/bin/env node
/** Representative custom selections use the public engine and its complete verification path. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createComposerEngine } from './project-composer.mjs';
import { normalizeBackendLayout } from './reusable-layout.mjs';

const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--layout') throw new Error('Usage: verify-project-composer.mjs --layout multi-module|single-module');
const layout = normalizeBackendLayout(args[1]);
const engine = createComposerEngine();
const recipe = { schemaVersion: 1, project: { name: `composer-${layout}` }, sourceRef: engine.catalog().sourceRef,
  selection: { domains: layout === 'multi-module' ? ['mail', 'schedule'] : ['board', 'survey'] },
  database: { vendor: 'postgresql' }, backendLayout: layout };
const result = await engine.generate(recipe, { onProgress: ({ stage, progress }) => process.stdout.write(`[composer-verification] ${stage} ${progress}%\n`) });
const reports = resolve(import.meta.dirname, '../build/reports/project-composer');
mkdirSync(reports, { recursive: true });
writeFileSync(resolve(reports, `${layout}.json`), `${JSON.stringify({ ...result, layout, recipe }, null, 2)}\n`);
