#!/usr/bin/env node
/** Execute the existing alert contract's time fixtures with an immutable local promtool. */
import { spawnSync } from 'node:child_process';
import { lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { closedEnvironment } from './run-isolated-e2e.mjs';

export const PROMTOOL_IMAGE = 'prom/prometheus@sha256:2659f4c2ebb718e7695cb9b25ffa7d6be64db013daba13e05c875451cf51b0d3';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function main() {
  const execute = (args, visible = false) => {
    const result = spawnSync('docker', args, { cwd: ROOT, env: closedEnvironment(), encoding: 'utf8',
      windowsHide: true, timeout: 300_000, maxBuffer: 1024 * 1024 });
    if (visible) { process.stdout.write(result.stdout ?? ''); process.stderr.write(result.stderr ?? ''); }
    if (result.error || result.status !== 0) throw new Error('Prometheus alert validation failed.');
    return result.stdout.trim();
  };
  const context = execute(['context', 'show']);
  const endpoint = execute(['context', 'inspect', context, '--format', '{{.Endpoints.docker.Host}}']);
  if (!/^(?:unix:\/\/|npipe:\/\/)/u.test(endpoint)) throw new Error('Promtool requires a local Docker daemon.');
  const rules = realpathSync(path.join(ROOT, 'config/observability'));
  for (const file of ['prometheus-alert-rules.yml', 'prometheus-alert-rules.test.yml']) {
    if (!lstatSync(path.join(rules, file)).isFile() || lstatSync(path.join(rules, file)).isSymbolicLink()) throw new Error('Invalid alert fixture input.');
  }
  const inspect = spawnSync('docker', ['image', 'inspect', PROMTOOL_IMAGE], { env: closedEnvironment(), windowsHide: true, stdio: 'ignore' });
  if (inspect.status !== 0) execute(['pull', PROMTOOL_IMAGE]);
  const launch = ['run', '--rm', '--pull', 'never', '--network', 'none', '--read-only', '--cap-drop', 'ALL',
    '--security-opt', 'no-new-privileges', '--tmpfs', '/tmp:rw,noexec,nosuid,size=128m',
    '--mount', `type=bind,source=${rules},target=/rules,readonly`, '--entrypoint', '/bin/promtool', PROMTOOL_IMAGE];
  execute([...launch, 'check', 'rules', '/rules/prometheus-alert-rules.yml'], true);
  execute([...launch, 'test', 'rules', '/rules/prometheus-alert-rules.test.yml'], true);
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
