import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { evaluateSarif, policy, repoRoot } from './sast-policy.mjs';

const language = process.argv[2];
if (!policy.languages.includes(language) || process.argv.length !== 3) throw new Error('Expected java or javascript');
const codeql = process.env.CODEQL_PATH || 'codeql';
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'egov-sast-probe-'));
const source = path.join(root, 'source');
fs.mkdirSync(source);
const log = fs.openSync(path.join(root, 'probe.log'), 'w');
function run(args) {
  const result = spawnSync(codeql, args, { cwd: source, stdio: ['ignore', log, log] });
  if (result.error || result.status !== 0) throw new Error(`CodeQL probe failed: ${root}`);
}
try {
  // These files are only compiled/analyzed; the vulnerable operations never run.
  if (language === 'java') {
    for (const [name, algorithm] of [['Vulnerable', 'DES/ECB/PKCS5Padding'], ['Safe', 'AES/GCM/NoPadding']]) {
      fs.writeFileSync(path.join(source, `${name}.java`), `
import javax.crypto.Cipher;
public class ${name} {
  public Cipher cipher() throws Exception { return Cipher.getInstance("${algorithm}"); }
}
`);
    }
  } else {
    fs.writeFileSync(path.join(source, 'vulnerable.js'), `
const express = require('express');
const child = require('child_process');
const app = express();
app.get('/probe', (req, res) => { child.exec(req.query.command); res.end(); });
`);
    fs.writeFileSync(path.join(source, 'safe.js'), `
const express = require('express');
const app = express();
app.get('/probe', (req, res) => { res.json({ message: String(req.query.message) }); });
`);
  }
  const database = path.join(root, 'database');
  const create = ['database', 'create', database, `--language=${language}`, `--source-root=${source}`, '--threads=2'];
  create.push(language === 'java' ? '--command=javac Vulnerable.java Safe.java' : '--build-mode=none');
  run(create);
  const report = path.join(root, `${language}.sarif`);
  run(['database', 'analyze', database,
    `codeql/${language}-queries:codeql-suites/${language}-${policy.querySuite}.qls`,
    '--format=sarifv2.1.0', `--output=${report}`, '--threads=2', '--ram=4096',
    '--no-sarif-add-snippets', '--no-sarif-add-file-contents']);
  const result = evaluateSarif(JSON.parse(fs.readFileSync(report, 'utf8')), language);
  const expected = language === 'java' ? 'java/weak-cryptographic-algorithm' : 'js/command-line-injection';
  if (!result.blocking.some(f => f.ruleId === expected && /vulnerable\./i.test(f.file))
      || result.findings.some(f => /(?:^|\/)safe\./i.test(f.file))) {
    throw new Error(`Probe did not distinguish vulnerable and safe code: ${root}`);
  }
  const gate = spawnSync(process.execPath, [path.join(repoRoot, 'scripts/sast-policy.mjs'), report, language], { stdio: 'pipe' });
  if (gate.status !== 1) throw new Error('Injected vulnerability did not produce gate exit code 1');
  console.log(`SAST ${language} probe PASS: ${expected} detected, safe code clean, gate exit=1`);
} finally { fs.closeSync(log); }
