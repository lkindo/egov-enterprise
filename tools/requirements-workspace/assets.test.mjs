import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { renderStyles, stylesAreCurrent } from './build-styles.mjs';
import { buildPrototypeTokenKit, readKitInputs } from '../../frontend/scripts/prototype-token-kit.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const repository = resolve(here, '../..');
const normalizeLf = (value) => value.replace(/\r\n/g, '\n');

test('requirements workspace CSS comes from current theme tokens and checked-in style inputs', async () => {
  assert.equal(await stylesAreCurrent(), true, 'run npm run requirements:ui:css to regenerate styles');
  const rendered = await renderStyles();
  assert.equal(rendered['tokens.css'], normalizeLf(buildPrototypeTokenKit(readKitInputs())['tokens.css']).replace(/[\t ]+$/gm, ''));
  for (const [name, expected] of Object.entries(rendered)) {
    assert.equal(normalizeLf(await readFile(join(here, 'public', name), 'utf8')), expected);
    assert.ok(!expected.includes('\r'), name);
    assert.doesNotMatch(expected, /[\t ]+$/m, `${name}: generated assets have no trailing whitespace`);
  }
  const inputs = await readFile(join(here, 'public/styles.input.css'), 'utf8');
  assert.doesNotMatch(inputs, /#[0-9a-f]{3,8}\b/iu, 'workspace colors use existing semantic tokens');
  assert.doesNotMatch(inputs, /@import\b|url\(\s*["']?(?:https?:)?\/\//iu, 'CSS assets stay local');
});

test('a stale stylesheet makes --check red without rewriting customer-facing assets', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'requirements-assets-'));
  t.after(async () => {
    assert.equal(dirname(root), resolve(tmpdir()));
    assert.ok(basename(root).startsWith('requirements-assets-'));
    await rm(root, { recursive: true, force: true });
  });
  const relativeFiles = ['tools/requirements-workspace/build-styles.mjs',
    'tools/requirements-workspace/public/styles.input.css', 'tools/requirements-workspace/public/styles.css',
    'tools/requirements-workspace/public/tokens.css', 'frontend/scripts/prototype-token-kit.mjs',
    'frontend/src/styles/themes/premium.css', 'frontend/src/styles/themes/krds-aligned.css', 'frontend/src/app/globals.css'];
  for (const relative of relativeFiles) {
    await mkdir(dirname(join(root, relative)), { recursive: true });
    await copyFile(join(repository, relative), join(root, relative));
  }
  const tool = join(root, 'tools/requirements-workspace');
  const run = (...args) => spawnSync(process.execPath, [join(tool, 'build-styles.mjs'), ...args], { encoding: 'utf8', windowsHide: true });
  assert.equal(run('--check').status, 0);
  const styles = await readFile(join(tool, 'public/styles.css'), 'utf8');
  const tokens = await readFile(join(tool, 'public/tokens.css'), 'utf8');
  await writeFile(join(tool, 'public/styles.input.css'), 'body { min-height: 1px; }\n');
  const stale = run('--check');
  assert.equal(stale.status, 1);
  assert.match(stale.stderr, /styles are stale/);
  assert.notEqual(run('--unknown').status, 0);
  assert.equal(await readFile(join(tool, 'public/styles.css'), 'utf8'), styles);
  assert.equal(await readFile(join(tool, 'public/tokens.css'), 'utf8'), tokens);
  assert.equal(run().status, 0);
  assert.equal(run('--check').status, 0);
});

test('static document and font references work offline and keep the font license', async () => {
  const html = await readFile(join(here, 'public/index.html'), 'utf8');
  assert.match(html, /<html\b[^>]*lang="ko"/u);
  assert.doesNotMatch(html, /<style\b|\son[a-z]+\s*=/iu, 'CSP-compatible markup has no inline handlers or stylesheets');
  for (const match of html.matchAll(/\b(?:src|href)="([^"]+)"/gu)) {
    assert.ok(['/app.js', '/tokens.css', '/styles.css', 'data:,'].includes(match[1]) || match[1].startsWith('#'), match[1]);
  }
  assert.ok([...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gu)].every((match) => /\bsrc="\/app.js"/u.test(match[1]) && !match[2].trim()));
  const font = await readFile(join(here, 'public/fonts/PretendardVariable.woff2'));
  assert.equal(font.subarray(0, 4).toString('ascii'), 'wOF2');
  const license = await readFile(join(here, 'public/fonts/OFL.txt'), 'utf8');
  assert.match(license, /SIL OPEN FONT LICENSE Version 1\.1/u);
  assert.match(license, /Pretendard/u);
});
