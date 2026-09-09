import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function classifyLengthDrift(rows) {
  return rows.map(row => ({
    ...row,
    action: row.table_name === 'tb_user_info' && row.column_name === 'rrno'
      ? 'encrypted-storage-representation-review'
      : row.physical_length < row.standard_length
        ? 'expand-contract-candidate' : 'narrowing-data-and-contract-review',
  }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 4 || args[0] !== '--env' || args[2] !== '--output') {
      throw new Error('usage');
    }
    const bootstrap = `
      (async () => {
        const target = new URL(process.env.DB_URL.replace(/^jdbc:/, ''));
        process.env.DB_NAME ||= decodeURIComponent(target.pathname.slice(1));
        process.env.DB_PORT ||= target.port || '5432';
        await require('./.agent/scripts/db-bridge.js').run(process.argv.slice(1));
      })().catch(() => { process.exitCode = 1; });
    `;
    const raw = execFileSync(process.execPath, [
      '--env-file=' + path.resolve(args[1]), '-e', bootstrap, '--',
      '--file', path.join(root, 'scripts/sql/db-standard-length-audit.sql'), '--json',
    ], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 15_000 });
    const findings = classifyLengthDrift(JSON.parse(raw));
    const report = {
      schemaVersion: 1, checkedAt: new Date().toISOString(), readOnly: true,
      scope: 'public tb_* varchar columns with an exact standard-term abbreviation match',
      status: findings.length ? 'RECONCILIATION_REQUIRED' : 'NO_LENGTH_DRIFT_IN_SCOPE',
      findingCount: findings.length, findings,
    };
    const output = path.resolve(args[3]);
    mkdirSync(path.dirname(output), { recursive: true });
    writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ status: report.status, findingCount: findings.length }));
  } catch {
    console.error('Read-only standard audit failed; check arguments, environment and output path. Details suppressed.');
    process.exitCode = 1;
  }
}
