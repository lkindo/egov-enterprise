import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { policy, repoRoot } from './sast-policy.mjs';

// 구현단계 보안약점 49개 원장의 CodeQL 대응을 고정 판의 규칙 메타데이터로 다시 계산하고(map),
// 감사 SARIF 의 탐지를 항목별로 센다(summarize). 판정·통제·수동 검토 필드는 손대지 않는다.
// 문서: docs/04-operations/secure-coding-weakness-baseline.md
export const LEDGER = path.join(repoRoot, 'config/security/secure-coding-weaknesses.json');
const LANGUAGES = ['java', 'javascript'];
const SUITES = ['security-extended', 'security-and-quality'];
// 이 저장소에 대상 코드가 없는 플랫폼 전용 질의는 대응에서 뺀다.
const IRRELEVANT = /^(java\/android\/|js\/angular\/|js\/(disabling|enabling)-electron-|java\/jhipster-)/;

export function parseQueryHeader(source) {
  const end = source.indexOf('*/');
  const head = end < 0 ? '' : source.slice(0, end);
  const id = head.match(/@id\s+(\S+)/)?.[1];
  if (!id) return null;
  const tags = head.match(/@tags([\s\S]*?)(?:\n\s*\*\s*@|$)/)?.[1] ?? '';
  const severity = Number(head.match(/@security-severity\s+([\d.]+)/)?.[1]);
  return {
    id,
    cwes: [...tags.matchAll(/external\/cwe\/cwe-0*(\d+)/g)].map(m => Number(m[1])),
    severity: Number.isFinite(severity) ? severity : null,
  };
}

export function automationLevel(entries) {
  if (entries.some(e => e.blocking)) return 'blocking';
  if (entries.some(e => e.suite === 'security-extended')) return 'report';
  return entries.length ? 'quality-only' : 'none';
}

// queries: { java: Map<id, {cwes, severity, suites:Set}>, javascript: ... }
export function computeCodeql(item, queries, minimumBlockingScore = policy.minimumBlockingScore) {
  const codeql = {};
  const automation = {};
  for (const language of LANGUAGES) {
    codeql[language] = [...queries[language]]
      .filter(([id, q]) => !IRRELEVANT.test(id) && q.cwes.some(c => item.matchCwe.includes(c)))
      .map(([id, q]) => {
        const extended = q.suites.has('security-extended');
        return {
          query: id,
          suite: extended ? 'security-extended' : 'security-and-quality',
          blocking: extended && (q.severity ?? 0) >= minimumBlockingScore,
        };
      })
      .sort((a, b) => a.query.localeCompare(b.query));
    automation[language] = automationLevel(codeql[language]);
  }
  return { codeql, automation };
}

// 스칼라 배열과 질의 항목을 한 줄로 두어 원장 diff 를 항목 단위로 읽게 한다.
export function formatLedger(ledger) {
  return JSON.stringify(ledger, null, 2)
    .replace(/\[\s*([^[\]{}]*?)\s*\]/g, (m, body) => `[${body.replace(/\s*\n\s*/g, ' ')}]`)
    .replace(/\{\s*("query"[^{}]*?)\s*\}/g, (m, body) => `{ ${body.replace(/\s*\n\s*/g, ' ')} }`) + '\n';
}

export function summarize(ledger, reports) {
  const owners = new Map();
  for (const item of ledger.items) {
    for (const language of LANGUAGES) {
      for (const entry of item.codeql[language]) {
        owners.set(entry.query, [...(owners.get(entry.query) ?? []), item.id]);
      }
    }
  }
  const perItem = new Map(ledger.items.map(i => [i.id, new Map()]));
  const unmapped = new Map();
  for (const report of reports) {
    for (const run of report.runs ?? []) {
      for (const result of run.results ?? []) {
        const rule = result.ruleId ?? result.rule?.id;
        if (!rule) continue;
        const ids = owners.get(rule);
        if (!ids) {
          unmapped.set(rule, (unmapped.get(rule) ?? 0) + 1);
          continue;
        }
        for (const id of ids) perItem.get(id).set(rule, (perItem.get(id).get(rule) ?? 0) + 1);
      }
    }
  }
  return { perItem, unmapped };
}

function codeqlBinary() {
  const binary = process.env.CODEQL_PATH;
  if (!binary) throw new Error('CODEQL_PATH 에 고정 판 CodeQL 실행 파일을 지정한다.');
  const version = spawnSync(binary, ['version', '--format=terse'], { encoding: 'utf8' });
  if (version.status !== 0 || version.stdout.trim() !== policy.codeqlVersion) {
    throw new Error(`CodeQL ${policy.codeqlVersion} 가 필요하다(실행 결과: ${version.stdout?.trim() || version.error?.message}).`);
  }
  return binary;
}

function resolveQueries(binary) {
  const queries = {};
  for (const language of LANGUAGES) {
    queries[language] = new Map();
    for (const suite of SUITES) {
      const resolved = spawnSync(binary,
        ['resolve', 'queries', `codeql/${language}-queries:codeql-suites/${language}-${suite}.qls`],
        { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
      if (resolved.status !== 0) throw new Error(`${language} ${suite} 질의 목록을 풀지 못했다.\n${resolved.stderr}`);
      for (const file of resolved.stdout.split(/\r?\n/).filter(Boolean)) {
        const header = parseQueryHeader(fs.readFileSync(file, 'utf8'));
        if (!header) continue;
        const known = queries[language].get(header.id) ?? { ...header, suites: new Set() };
        known.suites.add(suite);
        queries[language].set(header.id, known);
      }
    }
  }
  return queries;
}

function map(write) {
  const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
  if (ledger.standards.codeql.version !== policy.codeqlVersion) {
    throw new Error(`원장의 CodeQL 판(${ledger.standards.codeql.version})이 SAST 정책(${policy.codeqlVersion})과 다르다.`);
  }
  const queries = resolveQueries(codeqlBinary());
  const drift = [];
  for (const item of ledger.items) {
    const next = computeCodeql(item, queries);
    if (JSON.stringify(next) !== JSON.stringify({ codeql: item.codeql, automation: item.automation })) {
      drift.push(item.id);
      Object.assign(item, next);
    }
  }
  if (write) {
    fs.writeFileSync(LEDGER, formatLedger(ledger));
    console.log(drift.length ? `다시 계산한 항목: ${drift.join(', ')}` : '원장의 CodeQL 대응이 이미 최신이다.');
    return 0;
  }
  if (drift.length) {
    console.error(`CodeQL 대응이 원장과 다른 항목: ${drift.join(', ')} — --write 로 다시 만들고 diff 를 검토한다.`);
    return 1;
  }
  console.log('원장의 CodeQL 대응이 고정 판 규칙과 같다.');
  return 0;
}

function report(files) {
  if (!files.length) throw new Error('SARIF 파일을 하나 이상 준다.');
  const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
  const { perItem, unmapped } = summarize(ledger, files.map(f => JSON.parse(fs.readFileSync(f, 'utf8'))));
  for (const item of ledger.items) {
    const rules = perItem.get(item.id);
    const total = [...rules.values()].reduce((a, b) => a + b, 0);
    if (!total) continue;
    console.log(`${item.id} ${item.name}: ${total} — ${[...rules].map(([r, n]) => `${r} ${n}`).join(', ')}`);
  }
  const rest = [...unmapped].sort((a, b) => b[1] - a[1]);
  console.log(`49개 항목에 대응하지 않는 규칙 ${rest.length}종, ${rest.reduce((a, [, n]) => a + n, 0)}건`);
  for (const [rule, count] of rest) console.log(`  ${rule} ${count}`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, ...rest] = process.argv.slice(2);
  try {
    if (command === 'map') process.exitCode = map(rest.includes('--write'));
    else if (command === 'summarize') process.exitCode = report(rest);
    else {
      console.error('Usage: CODEQL_PATH=<binary> node scripts/secure-coding-weaknesses.mjs map [--write]\n'
        + '       node scripts/secure-coding-weaknesses.mjs summarize <sarif>...');
      process.exitCode = 2;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}
