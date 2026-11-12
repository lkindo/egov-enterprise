#!/usr/bin/env node
/**
 * 카피레프트 라이선스 게이트(Wave 4, H5). 운영 런타임 의존성에 강한 카피레프트(GPL·AGPL·SSPL 등)가 들어오면 막는다.
 *
 * 모집단:
 *   - 프런트엔드 운영 의존성: `pnpm licenses list --prod --json`(frontend 에서 실행)
 *   - 백엔드 런타임: `./gradlew -I scripts/runtime-licenses.gradle :api-server:writeRuntimeLicenses` 가 쓰는
 *     build/licenses/runtime-licenses.json(api-server runtimeClasspath 의 POM 라이선스, 부모 POM 상속 포함)
 *
 * 판정(SPDX 식 단위):
 *   - `A OR B` 는 하나라도 허용이면 허용(이중 라이선스에서 허용 쪽을 고른다 — 예: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0).
 *   - `A AND B` 는 모두 허용이어야 허용.
 *   - GPL·AGPL·SSPL·EUPL·OSL 류는 차단. 단 `WITH Classpath-exception-2.0`(동적 링크 예외)은 허용. LGPL·MPL·EPL 같은 약한 카피레프트는
 *     허용(라이브러리 연결) — 차단 목록은 아래 정규식이 정본이다.
 *   - 라이선스를 알 수 없는 패키지는 차단하지 않고 경고로 남긴다(POM 에 표기가 없는 내부 산출물이 있다). 알 수 없음이 늘면 사람이 본다.
 *
 *   node scripts/copyleft-license-policy.mjs --frontend                     # frontend 에서 pnpm 으로 읽는다
 *   node scripts/copyleft-license-policy.mjs --gradle build/licenses/runtime-licenses.json
 *   node scripts/copyleft-license-policy.mjs --pnpm-json <file>             # 저장한 pnpm 출력(시험·재현용)
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** 강한 카피레프트 식별자(SPDX·자유 표기). LGPL 은 앞의 L 로 제외된다. */
const STRONG_COPYLEFT = /(^|[^L])\b(A?GPL|GNU (Affero )?General Public License|SSPL|Server Side Public License|EUPL|OSL|RPL|Sleepycat)\b/i;
const LINKING_EXCEPTIONS = /\bWITH\s+(Classpath-exception-2\.0|GCC-exception-3\.1)\b|classpath exception/i;

/** 한 SPDX 조각(괄호 없는 단일 라이선스)이 차단 대상인가. */
function isBlockedTerm(term) {
  const text = term.trim();
  if (!text) return false;
  if (/\bLGPL\b|Lesser General Public|Library General Public/i.test(text)) return false;
  if (LINKING_EXCEPTIONS.test(text)) return false;
  return STRONG_COPYLEFT.test(text);
}

/**
 * SPDX 식을 판정한다. 괄호·OR·AND 를 지원하고, 자유 표기 문장도 한 조각으로 본다.
 * @returns {boolean} 차단이면 true
 */
export function isBlockedLicense(expression) {
  if (expression === null || expression === undefined) return false;
  const text = String(expression).trim();
  if (!text) return false;
  return evaluate(tokenize(text)).blocked;
}

const OPERATORS = new Set(['(', ')', 'OR', 'AND']);

/** 괄호와 대문자 OR·AND 로만 나눈다(SPDX 연산자는 대문자다). 이어진 낱말은 한 조각이다 — 선형 분할만 쓴다. */
function tokenize(text) {
  const tokens = [];
  const words = text.replaceAll('(', ' ( ').replaceAll(')', ' ) ').split(/\s+/).filter(Boolean);
  for (const word of words) {
    const previous = tokens.at(-1);
    if (OPERATORS.has(word)) {
      tokens.push(word);
    } else if (previous !== undefined && !OPERATORS.has(previous)) {
      tokens[tokens.length - 1] = `${previous} ${word}`;
    } else {
      tokens.push(word);
    }
  }
  return tokens;
}

/** 재귀 하강: or := and (OR and)*, and := atom (AND atom)*, atom := '(' or ')' | term. */
function evaluate(tokens) {
  let position = 0;
  const parseOr = () => {
    let blocked = parseAnd();
    while (tokens[position] === 'OR') {
      position += 1;
      const next = parseAnd();
      blocked = blocked && next;
    }
    return blocked;
  };
  const parseAnd = () => {
    let blocked = parseAtom();
    while (tokens[position] === 'AND') {
      position += 1;
      const next = parseAtom();
      blocked = blocked || next;
    }
    return blocked;
  };
  const parseAtom = () => {
    const token = tokens[position];
    position += 1;
    if (token === '(') {
      const blocked = parseOr();
      if (tokens[position] === ')') position += 1;
      return blocked;
    }
    return isBlockedTerm(token ?? '');
  };
  return { blocked: parseOr() };
}

/**
 * 패키지 목록을 판정한다.
 * @param {{name:string, version?:string, license?:string|null, source:string}[]} packages
 */
export function evaluatePackages(packages) {
  const blocking = [];
  const unknown = [];
  for (const pkg of packages) {
    const license = pkg.license === undefined || pkg.license === null ? '' : String(pkg.license).trim();
    if (!license || /^(unknown|UNLICENSED|NOASSERTION)$/i.test(license)) {
      unknown.push(pkg);
    } else if (isBlockedLicense(license)) {
      blocking.push(pkg);
    }
  }
  return { checked: packages.length, blocking, unknown };
}

/** `pnpm licenses list --prod --json` 출력 → 패키지 목록. 형식이 틀리면 던진다(fail-closed). */
export function packagesFromPnpm(report) {
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    throw new Error('pnpm licenses JSON must be an object keyed by license');
  }
  const packages = [];
  for (const [license, entries] of Object.entries(report)) {
    if (!Array.isArray(entries)) throw new Error(`pnpm licenses entry for ${license} must be an array`);
    for (const entry of entries) {
      if (!entry || typeof entry.name !== 'string') throw new Error('pnpm licenses entry must have a name');
      const versions = Array.isArray(entry.versions) ? entry.versions : [entry.version].filter(Boolean);
      packages.push({ name: entry.name, version: versions.join(','), license: entry.license ?? license, source: 'pnpm' });
    }
  }
  return packages;
}

/** runtime-licenses.json(Gradle) → 패키지 목록. 형식이 틀리면 던진다. */
export function packagesFromGradle(report) {
  if (!report || report.authority !== 'runtime-licenses' || !Array.isArray(report.components)) {
    throw new Error('runtime-licenses.json must have authority runtime-licenses and a components array');
  }
  if (report.components.length === 0) throw new Error('runtime-licenses.json has no components (empty population)');
  return report.components.map((component) => {
    if (typeof component.module !== 'string') throw new Error('runtime component must have a module');
    const licenses = Array.isArray(component.licenses) ? component.licenses.filter(Boolean) : [];
    // POM 의 <licenses> 가 여럿이면 배포자가 고를 수 있는 이중 라이선스로 읽는다(OR).
    return { name: component.module, version: component.version ?? '', license: licenses.join(' OR '), source: 'gradle' };
  });
}

function pnpmLicenses() {
  const windows = process.platform === 'win32';
  const executable = windows ? (process.env.ComSpec || 'cmd.exe') : 'pnpm';
  const args = windows ? ['/d', '/s', '/c', 'pnpm licenses list --prod --json'] : ['licenses', 'list', '--prod', '--json'];
  const result = spawnSync(executable, args, { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`pnpm licenses exited ${result.status}: ${result.stderr?.trim().slice(0, 500)}`);
  return JSON.parse(result.stdout);
}

function report(policy, label) {
  for (const pkg of policy.unknown) console.warn(`::warning::${label}: license unknown — ${pkg.name}@${pkg.version}`);
  if (policy.blocking.length > 0) {
    for (const pkg of policy.blocking) {
      console.error(`::error::${label}: copyleft license blocked — ${pkg.name}@${pkg.version} (${pkg.license})`);
    }
    return 1;
  }
  console.log(`${label}: copyleft license policy passed (${policy.checked} packages, ${policy.unknown.length} unknown).`);
  return 0;
}

function run(argv) {
  const mode = argv[0];
  if (mode === '--frontend') return report(evaluatePackages(packagesFromPnpm(pnpmLicenses())), 'frontend');
  if (mode === '--pnpm-json' && argv[1]) {
    return report(evaluatePackages(packagesFromPnpm(JSON.parse(readFileSync(argv[1], 'utf8')))), 'frontend');
  }
  if (mode === '--gradle' && argv[1]) {
    return report(evaluatePackages(packagesFromGradle(JSON.parse(readFileSync(argv[1], 'utf8')))), 'backend');
  }
  console.error('usage: copyleft-license-policy.mjs --frontend | --pnpm-json <file> | --gradle <runtime-licenses.json>');
  return 2;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    process.exitCode = run(process.argv.slice(2));
  } catch (error) {
    console.error(`::error::copyleft license policy failed closed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
  }
}
