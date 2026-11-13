import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { renderStyles, stylesAreCurrent } from './build-styles.mjs';
import { buildPrototypeTokenKit, readKitInputs } from '../../frontend/scripts/prototype-token-kit.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
const repository = resolve(here, '../..');
const normalizeLf = (value) => value.replace(/\r\n/g, '\n');
const { JSDOM } = createRequire(new URL('../../frontend/package.json', import.meta.url))('jsdom');

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

function assertStaticDocument(html, entry = '/app.js', links = []) {
  // Parse like a browser; regex matching can miss mixed-case tags and unquoted attributes.
  // JSDOM does not execute scripts or fetch resources with these default options.
  const dom = new JSDOM(html);
  try {
    const { document } = dom.window;
    assert.equal(document.documentElement.lang, 'ko');
    assert.equal(document.querySelectorAll('style').length, 0, 'CSP-compatible markup has no inline stylesheets');
    for (const element of document.querySelectorAll('*')) {
      for (const attribute of element.attributes) {
        assert.ok(attribute.name !== 'style' && !/^on[a-z]+$/u.test(attribute.name), 'CSP-compatible markup has no inline styles or handlers');
        if (!['src', 'href'].includes(attribute.name)) continue;
        assert.ok([entry, '/tokens.css', '/styles.css', 'data:,', ...links].includes(attribute.value) || attribute.value.startsWith('#'), 'static assets must remain local');
      }
    }
    const scripts = [...document.querySelectorAll('script')];
    assert.equal(scripts.length, 1, 'the application entrypoint must exist exactly once');
    assert.ok(scripts.every(script => script.getAttribute('src') === entry && !script.textContent.trim()), 'only the external application script is allowed');
  } finally {
    dom.window.close();
  }
}

test('static document parsing rejects mixed-case inline scripts, unquoted remote assets and inline styles', async () => {
  const html = await readFile(join(here, 'public/index.html'), 'utf8');
  for (const appended of ['<SCRIPT>globalThis.synthetic = true</SCRIPT>', '<sCrIpT>void 0</sCrIpT>', '<IMG SRC=https://evil.invalid/pixel>', '<p style="color:red">synthetic</p>']) {
    assert.throws(() => assertStaticDocument(html + appended), undefined, 'the actual parsed document must reject nonlocal or inline executable assets');
  }
});

test('the studio page follows the same static rules and its script builds no inline styles or handlers', async () => {
  const html = await readFile(join(here, 'public/studio.html'), 'utf8');
  // The only link out of the page is the earlier screen served by the same launcher.
  assertStaticDocument(html, '/studio.js', ['/']);
  for (const appended of ['<script>void 0</script>', '<script src="/app.js"></script>', '<a href="https://evil.invalid/">x</a>', '<p style="color:red">synthetic</p>']) {
    assert.throws(() => assertStaticDocument(html + appended, '/studio.js', ['/']), undefined, appended);
  }
  // The server's CSP refuses inline styles and handlers, so markup the script generates must not rely on them.
  const script = await readFile(join(here, 'public/studio.js'), 'utf8');
  assert.doesNotMatch(script, /\sstyle="|\son[a-z]+="/u);
  assert.doesNotMatch(script, /\binnerHTML\s*\+=|document\.write|\beval\(|new Function\(/u);
});

test('static document and font references work offline and keep the font license', async () => {
  const html = await readFile(join(here, 'public/index.html'), 'utf8');
  assertStaticDocument(html);
  const font = await readFile(join(here, 'public/fonts/PretendardVariable.woff2'));
  assert.equal(font.subarray(0, 4).toString('ascii'), 'wOF2');
  const license = await readFile(join(here, 'public/fonts/OFL.txt'), 'utf8');
  assert.match(license, /SIL OPEN FONT LICENSE Version 1\.1/u);
  assert.match(license, /Pretendard/u);
});
