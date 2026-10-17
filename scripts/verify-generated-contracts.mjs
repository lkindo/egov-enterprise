import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputs = {
  api: ['frontend/src/types/generated-api.d.ts'],
  zod: ['frontend/src/types/generated-zod.ts', 'frontend/src/types/generated-operations.ts'],
};
const normalizeLineEndings = text => text.replace(/\r\n?/gu, '\n');

function run(command, args, options) {
  const result = spawnSync(command, args, {
    encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024, ...options,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} failed (${result.status ?? 'spawn'}): ${result.error?.message ?? `${result.stderr}${result.stdout}`}`);
  }
}

/** Compare current tracked files with temporary regeneration; never rewrite the worktree or Git index. */
export function verifyGeneratedContracts(kind, root = repoRoot) {
  if (!Object.hasOwn(outputs, kind)) throw new Error('Expected contract kind: api or zod');
  const files = outputs[kind];
  run('git', ['ls-files', '--error-unmatch', '--', ...files], { cwd: root });
  const current = files.map(file => readFileSync(join(root, file), 'utf8'));
  const temporary = mkdtempSync(join(tmpdir(), 'egov-contract-verify-'));
  try {
    const generated = files.map(file => join(temporary, basename(file)));
    const spec = join(root, 'api-docs.json');
    const options = { cwd: join(root, 'frontend'), env: { ...process.env } };
    if (kind === 'api') {
      // The standard codegen:file has no Redocly config. Preserve the CLI's exact default;
      // an isolated cwd prevents discovery of `apis` output paths that would override -o.
      run(process.execPath, [join(repoRoot, 'frontend/node_modules/openapi-typescript/bin/cli.js'),
        spec, '-o', generated[0]], { ...options, cwd: temporary });
    } else {
      run(process.execPath, [join(repoRoot, '.agent/scripts/codegen-zod.js')], {
        ...options,
        env: {
          ...options.env,
          CODEGEN_API_DOCS_PATH: spec,
          CODEGEN_ZOD_OUTPUT_PATH: generated[0],
          CODEGEN_OPERATIONS_OUTPUT_PATH: generated[1],
        },
      });
    }
    const stale = files.filter((file, index) =>
      normalizeLineEndings(current[index]) !== normalizeLineEndings(readFileSync(generated[index], 'utf8')));
    if (stale.length) {
      throw new Error(`Generated contract drift: ${stale.join(', ')}. Review the spec and run pnpm -C frontend syncContract to update intentionally.`);
    }
    return files;
  } finally {
    // Only remove the directory allocated by this invocation, outside the checkout.
    if (dirname(resolve(temporary)) !== resolve(tmpdir()) || !basename(temporary).startsWith('egov-contract-verify-')) {
      throw new Error('Unexpected temporary contract directory');
    }
    rmSync(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const files = verifyGeneratedContracts(process.argv[2]);
    console.log(`Generated contracts match: ${files.join(', ')}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
