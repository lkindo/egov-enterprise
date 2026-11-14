/** Exact production file population shared by certification and explicit adopter registration. */
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { containedFileResolver } from './adoption-review.mjs';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const CODE_ROOTS = [
  ...['foundation', 'business-core', 'business-app', 'api-server'].flatMap(module => [`${module}/src/main`, `${module}/build.gradle`]),
  'frontend/src', 'frontend/next.config.ts', 'frontend/package.json', 'frontend/pnpm-lock.yaml', 'frontend/tsconfig.json',
  'build.gradle', 'settings.gradle', 'gradle.properties', 'gradle',
  'package.json', 'scripts', '.githooks/pre-push',
  '.github/workflows', '.github/required-checks.json', 'config/governance/upstream-verification',
  'config/governance/authorization-policies.json', 'config/governance/permission-catalog.json',
];
const TEXT = new Set(['.java', '.kt', '.kts', '.json', '.yaml', '.yml', '.xml', '.properties', '.sql', '.js', '.jsx', '.ts', '.tsx',
  '.mjs', '.cjs', '.css', '.scss', '.html', '.md', '.txt', '.gradle', '.toml', '.lock', '.sh', '.bat', '.ps1']);

export function projectedCodeEntries(root) {
  const files = new Map();
  let contained;
  function walk(file) {
    const path = join(root, file);
    if (!existsSync(path)) return;
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new Error(`Artifact source scope cannot contain a symlink: ${file}`);
    if (stat.isDirectory()) {
      for (const name of readdirSync(path).sort()) walk(`${file}/${name}`);
    } else if (stat.isFile()) {
      if (file.startsWith('scripts/') && /\.test\.[cm]?[jt]s$/u.test(file)) return;
      contained ??= containedFileResolver(root);
      const bytes = readFileSync(contained(file));
      const text = TEXT.has(extname(file)) || file.endsWith('/pre-push');
      files.set(file, sha256(text ? bytes.toString('utf8').replace(/\r\n?/gu, '\n') : bytes));
    }
  }
  for (const rootPath of CODE_ROOTS) walk(rootPath);
  if (!files.has('frontend/src/proxy.ts') || !files.has('frontend/next.config.ts') || files.size < 10) {
    throw new Error('Artifact code scope is missing required online sources');
  }
  return [...files].sort(([a], [b]) => a.localeCompare(b, 'en'));
}

export const codeScopeForEntries = inputs => ({ format: 'reusable-source-evidence-v1-lf-text-raw-binary',
  fileCount: inputs.length, sha256: sha256(JSON.stringify(inputs)) });
export const projectedCodeScope = root => codeScopeForEntries(projectedCodeEntries(root));
