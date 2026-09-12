#!/usr/bin/env node
/**
 * a3-1-form-container-census — 등록·수정 입력 폼이 **어느 그릇에 담겼는가**를 exact census 로 동결한다.
 *
 * [왜 필요한가] 업무 화면 문법 카탈로그 §A3-1 은 "인라인 ≥ 모달 > 전용 페이지" 를 판정 규칙으로 세웠지만
 * **집행 게이트가 없었다** — 2026-09-12 실측에서 `A3-1` 문자열은 문서 밖에 주석 한 곳뿐이었다. 규칙만 있고
 * 게이트가 없으면 위반이 들어와도 아무 신호가 없고, 카탈로그는 지켜지지 않는 문서가 된다.
 *
 * [무엇을 세는가] `frontend/src/app` 아래 라우트 중 **모달도 목록도 없이 폼만 렌더하는 것** = 전용 입력 페이지
 * 후보다. 목록 위 모달(기본값)과 master-detail 인라인(최선)은 애초에 후보가 아니다.
 *
 * [알려진 한계 — 숨기지 않는다]
 *   ① 탐지는 **라우트 디렉터리 파일만** 읽고 import 를 따라가지 않는다. 그래서 자식 컴포넌트에 있는
 *      인라인 폼(예: 게시글 상세의 댓글·만족도 폼)은 애초에 후보가 아니다 — §A3-1 이 인라인을 최우선
 *      그릇으로 두므로 놓치는 방향이고 거짓 red 를 만들지 않는다.
 *   ② 라우트에 확인 Dialog 가 하나라도 있으면 MODAL 매치로 후보에서 빠진다. 전용 입력 페이지에
 *      Dialog 를 하나 넣는 것이 census 를 빠져나가는 경로다. 2026-09-12 실측에서 `FORM && MODAL`
 *      라우트는 2건(`/admin/notifications`·`/smart-toolkit/schedule/dept`)이고 둘 다 폼이 모달 안에
 *      있어 무해했다. 정확히 하려면 폼 JSX 가 모달 JSX 안에 있는지 AST 로 봐야 한다.
 *
 * [서랍이 되지 않게 하는 장치] 후보는 전부 census 에 있어야 하고, 판정마다 **기계 검증**이 붙는다 —
 * `justified` 는 자기가 든 조건(1a 리치텍스트 · 1b 첨부관리 · 2 마법사)의 흔적이 소스에 실재해야 하고,
 * `excluded-menu-leaf` 는 그 경로를 가리키는 메뉴 시드가 실재해야 한다. 사유만 적고 통과하지 못한다.
 * 부채(`violation`·`partial-violation`)는 단조 감소 래칫에 걸린다.
 *
 * 사용법:
 *   node scripts/a3-1-form-container-census.mjs          # 리포트
 *   node scripts/a3-1-form-container-census.mjs --check  # 위반 시 exit 1
 *   node scripts/a3-1-form-container-census.mjs --json
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(SCRIPT_PATH), '..');
const CENSUS_PATH = join(ROOT, 'config', 'governance', 'a3-1-form-container-census.json');
const APP_ROOT = join(ROOT, 'frontend', 'src', 'app');
const MIGRATION_ROOT = join(ROOT, 'api-server', 'src', 'main', 'resources', 'db', 'migration');
const GAPS_PATH = join(ROOT, '.agent', 'memory', 'known-gaps.md');

/**
 * 탐지 술어 — 느슨하게 잡고(후보를 놓치지 않고) 판정은 census 가 한다.
 * ⚠ 좁히면 위반이 후보에서 빠져 census 밖으로 샌다. 넓히면 소음이 늘 뿐이다. 넓은 쪽이 안전하다.
 */
const FORM = /useManualFormValidation|<form[\s>]/;
const MODAL = /StandardModal|<Dialog[\s>]|DialogContent/;
const LIST = /StandardDataTable|WorkListPage|MasterDetailPage|<table[\s>]/;

/** 조건별 기계 검증 — 사유만 적고 통과하는 것을 막는다. */
const CONDITION_EVIDENCE = {
  /*
    ⚠ `dangerouslySetInnerHTML` 은 여기 없다 — 그것은 본문을 **렌더**하는 흔적이지 **편집**하는 흔적이
    아니다. 열람 상세는 거의 전부 그것을 쓰므로, 넣으면 모든 상세 라우트가 조건 1a 로 정당화된다.
  */
  '1a': /RichTextEditor|TiptapEditor|<Editor[\s>]|ReactQuill|QuillEditor/,
  /*
    ⚠ 단순 파일 입력으로는 부족하다 — §A3-1 은 "제출과 함께 보내는 1건은 모달에서도 된다" 며
    `/admin/system/banner` 를 예시로 드는데, 그 화면은 `StandardFileUploader maxFiles={1}` 을
    **모달 안에서** 쓴다. 문자열이 같으므로 파일 입력만 보면 모달 허용 사례까지 페이지로 정당화된다.
    조건 1b 의 실질은 **건별 업로드·기존 첨부 관리**이므로 목록 조회·건별 삭제·다건 업로드를 요구한다.
  */
  '1b': /getFileList|deleteFile|maxFiles=\{\s*[2-9]|multiple/,
  '2': /Wizard|currentStep|stepIndex/,
};
/** 소스 흔적으로 증명할 수 없는 조건 — 사유와 근거 파일을 요구한다. */
const NARRATIVE_CONDITIONS = new Set(['3', '4']);

const VERDICTS = new Set([
  'violation',
  'partial-violation',
  'justified',
  'excluded-menu-leaf',
  'excluded-not-resource-input',
  'pending-pack-ownership',
]);
const DEBT_VERDICTS = new Set(['violation', 'partial-violation']);

function normalize(path) {
  return path.split(sep).join('/');
}

/**
 * 주석을 제거한다 — **주석은 코드가 아니다.**
 *
 * <p>실측(2026-09-12): `/admin/community/boards/detail` 이 전용 입력 페이지 후보로 잡혔는데, 그
 * `<form` 매칭은 2026-07-27 결함을 설명하는 **주석 안**에 있었다(실제 코드는 그 형태를 이미 버렸다).
 * 주석 한 줄이 열람 상세를 입력 페이지로 둔갑시키면 census 가 거짓 부채를 세고, 그것을 정당화하려고
 * 느슨한 조건을 들이게 된다 — 서랍이 만들어지는 전형적인 경로다.
 */
function stripComments(source) {
  let output = '';
  for (let index = 0; index < source.length;) {
    const char = source[index];
    if (char === '"' || char === "'" || char === '`') {
      let cursor = index + 1;
      while (cursor < source.length) {
        if (source[cursor] === '\\') { cursor += 2; continue; }
        if (source[cursor] === char) break;
        cursor += 1;
      }
      output += source.slice(index, cursor + 1);
      index = cursor + 1;
    } else if (char === '/' && source[index + 1] === '/') {
      const newline = source.indexOf('\n', index + 2);
      index = newline < 0 ? source.length : newline;
      output += ' ';
    } else if (char === '/' && source[index + 1] === '*') {
      const close = source.indexOf('*/', index + 2);
      index = close < 0 ? source.length : close + 2;
      output += ' ';
    } else {
      output += char;
      index += 1;
    }
  }
  return output;
}

function routeSources(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) continue;
    if (/\.(tsx|ts)$/.test(name) && !/\.test\.(tsx|ts)$/.test(name)) files.push(path);
  }
  return files;
}

/** `frontend/src/app` 아래에서 전용 입력 페이지 후보를 찾는다. */
export function detectCandidates(root = ROOT) {
  const appRoot = join(root, 'frontend', 'src', 'app');
  const candidates = [];
  const walk = (dir) => {
    const names = readdirSync(dir);
    for (const name of names) {
      const path = join(dir, name);
      if (!statSync(path).isDirectory()) continue;
      if (name === '__tests__' || name === 'node_modules') continue;
      walk(path);
    }
    if (!names.includes('page.tsx')) return;
    const files = routeSources(dir);
    const blob = stripComments(files.map((file) => readFileSync(file, 'utf8')).join('\n'));
    if (!FORM.test(blob) || MODAL.test(blob) || LIST.test(blob)) return;
    const relative = normalize(dir.slice(appRoot.length)).replace(/^\/?/, '/');
    candidates.push({ route: relative === '/' ? '/' : relative, files: files.map((f) => normalize(f.slice(root.length + 1))), blob });
  };
  walk(appRoot);
  return candidates.sort((left, right) => left.route.localeCompare(right.route));
}

/**
 * SQL 주석을 지운다 — 주석 속 경로 한 줄로 면제가 성립하면 안 된다.
 *
 * <p>⚠ 정규식 치환으로는 안 된다. 이 저장소의 migration 에는 `'/api/v1/admin/**'` 같은 **URL 패턴**이
 * 들어 있어 그 안의 슬래시+별표를 블록 주석 시작으로 오인한다(2026-09-12 실측: 여는 토큰 47개 대 닫는 토큰 1개 —
 * 한 번의 오인이 뒤따르는 수천 줄을 통째로 지웠고, 활성 메뉴 행이 사라져 거짓 red 가 났다).
 * 문자열 리터럴을 존중하는 상태 기계로 처리한다(오탐 = 거짓 red = 신뢰 붕괴).
 */
function stripSqlComments(sql) {
  let output = '';
  for (let index = 0; index < sql.length;) {
    const char = sql[index];
    if (char === "'") {
      let cursor = index + 1;
      while (cursor < sql.length) {
        if (sql[cursor] === "'" && sql[cursor + 1] === "'") {
          cursor += 2;
          continue;
        }
        if (sql[cursor] === "'") break;
        cursor += 1;
      }
      output += sql.slice(index, cursor + 1);
      index = cursor + 1;
    } else if (char === '-' && sql[index + 1] === '-') {
      const newline = sql.indexOf(String.fromCharCode(10), index + 2);
      index = newline < 0 ? sql.length : newline;
      output += ' ';
    } else if (char === '/' && sql[index + 1] === '*') {
      const close = sql.indexOf('*/', index + 2);
      index = close < 0 ? sql.length : close + 2;
      output += ' ';
    } else {
      output += char;
      index += 1;
    }
  }
  return output;
}

function migrationCorpus(root = ROOT) {
  const dir = join(root, 'api-server', 'src', 'main', 'resources', 'db', 'migration');
  if (!existsSync(dir)) return '';
  return stripSqlComments(readdirSync(dir)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => readFileSync(join(dir, name), 'utf8'))
    .join('\n'));
}

/**
 * 메뉴 리프 면제를 기계로 대조한다.
 *
 * <p>⚠ 종전 검사는 `migrations.includes(route)` 였다 — 세 방향으로 넓었다. ① SQL **주석**에 경로가
 * 한 번만 나와도 통과한다. ② `/admin/survey/hub?tab=manage` 가 코퍼스에 있으면 접두가 겹치는
 * `/admin/survey/hub` 아래 새 입력 페이지가 자동 면제된다. ③ 나중 migration 이 그 메뉴를 지우거나
 * `use_yn='N'` 으로 내려도 문자열은 남아 있어 **죽은 메뉴가 면제를 계속 발급**한다.
 *
 * <p>그래서 ⓐ 주석 제거 후 ⓑ **따옴표로 감싼 정확 일치**(쿼리 접미는 허용)를 요구하고 ⓒ census 가 적은
 * {@code menuSn} 이 이후 DELETE·비활성 문장에 걸리지 않는지 본다.
 *
 * <p>⚠ 남는 한계: migration 을 실제로 재생하지 않으므로 복잡한 조건부 UPDATE 는 판정하지 못한다.
 * 정본은 Flyway 적용 DB 의 `SELECT modern_route FROM tb_menu_info WHERE use_yn='Y'` 다.
 */
function menuLeafViolations(entry, migrations) {
  const problems = [];
  const quoted = new RegExp(`'${entry.route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\?[^']*)?'`);
  if (!quoted.test(migrations)) {
    problems.push(
      `메뉴 시드에서 '${entry.route}' 를 modern_route 값으로 찾지 못했다(주석·접두 일치는 인정하지 않는다).`,
    );
  }
  if (!Number.isInteger(entry.menuSn)) {
    problems.push('menuSn 을 적어야 한다 — 그 메뉴가 나중에 삭제·비활성됐는지 대조할 수 없다.');
    return problems;
  }
  const sn = String(entry.menuSn);
  const retired = new RegExp(`DELETE\\s+FROM[^;]{0,200}menu_sn\\s*=\\s*${sn}\\b`, 'i');
  const disabled = new RegExp(`use_yn\\s*=\\s*'N'[^;]{0,300}menu_sn\\s*=\\s*${sn}\\b`, 'i');
  if (retired.test(migrations) || disabled.test(migrations)) {
    problems.push(`메뉴 ${sn} 은 이후 migration 에서 삭제·비활성됐다 — 죽은 메뉴는 면제를 발급하지 못한다.`);
  }
  return problems;
}

export function validateCensus(census, candidates, context = {}) {
  const errors = [];
  const migrations = context.migrations ?? migrationCorpus();
  const gaps = context.gaps
    ?? (existsSync(GAPS_PATH) ? readFileSync(GAPS_PATH, 'utf8') : '');

  if (census.schemaVersion !== 1) errors.push('schemaVersion 은 1 이어야 한다.');
  if (census.authority !== 'work-screen-grammar-a3-1-form-container') {
    errors.push('authority 가 올바르지 않다.');
  }

  const entries = census.entries ?? [];
  const byRoute = new Map();
  for (const entry of entries) {
    if (byRoute.has(entry.route)) errors.push(`route '${entry.route}' 가 중복 등재됐다.`);
    byRoute.set(entry.route, entry);
  }

  const detected = new Map(candidates.map((candidate) => [candidate.route, candidate]));

  for (const route of detected.keys()) {
    if (!byRoute.has(route)) {
      errors.push(
        `전용 입력 페이지 후보 '${route}' 가 census 에 없다 — §A3-1 판정을 적어야 한다`
          + `(violation / partial-violation / justified / excluded-* / pending-pack-ownership).`,
      );
    }
  }
  for (const route of byRoute.keys()) {
    if (!detected.has(route)) {
      errors.push(
        `census 의 '${route}' 는 더 이상 전용 입력 페이지가 아니다 — 이행이 끝났으면 항목을 지우고`
          + ` 래칫을 함께 내려라(낡은 등재는 다음 위반을 조용히 통과시킨다).`,
      );
    }
  }

  for (const entry of entries) {
    const label = `entries['${entry.route}']`;
    if (!VERDICTS.has(entry.verdict)) {
      errors.push(`${label}.verdict 는 닫힌 어휘여야 한다: ${[...VERDICTS].join(' | ')}`);
      continue;
    }
    if (typeof entry.reason !== 'string' || !entry.reason.trim()) {
      errors.push(`${label}.reason 이 비어 있다 — 판정 근거 없는 등재는 서랍이다.`);
    }
    const candidate = detected.get(entry.route);
    if (!candidate) continue;

    if (entry.verdict === 'justified') {
      const conditions = entry.conditions ?? [];
      if (conditions.length === 0) {
        errors.push(`${label} 은 justified 인데 충족 조건(1a/1b/2/3/4)을 적지 않았다.`);
      }
      for (const condition of conditions) {
        if (CONDITION_EVIDENCE[condition]) {
          if (!CONDITION_EVIDENCE[condition].test(candidate.blob)) {
            errors.push(
              `${label} 이 조건 ${condition} 을 들었으나 라우트 소스에 그 흔적이 없다`
                + ` — 조건을 적는 것만으로 페이지가 정당해지지 않는다.`,
            );
          }
        } else if (NARRATIVE_CONDITIONS.has(condition)) {
          if (typeof entry.evidence !== 'string' || !entry.evidence.trim()) {
            errors.push(`${label} 의 조건 ${condition} 은 소스로 증명할 수 없으므로 evidence 가 필요하다.`);
          }
        } else {
          errors.push(`${label}.conditions 의 '${condition}' 은 §A3-1 조건표에 없다.`);
        }
      }
    }

    if (entry.verdict === 'excluded-menu-leaf') {
      for (const problem of menuLeafViolations(entry, migrations)) {
        errors.push(`${label} ${problem}`);
      }
    }

    /*
      제외 판정은 census 에서 가장 넓은 문이다 — 후보는 이미 폼 탐지를 통과한 라우트이므로,
      사유 한 줄로 빠져나갈 수 있으면 그것이 서랍이다. 최소한 근거 파일·라인을 요구한다.
    */
    if (entry.verdict.startsWith('excluded-')
        && (typeof entry.evidence !== 'string' || !entry.evidence.trim())) {
      errors.push(`${label} 은 제외 판정이므로 evidence(파일:라인)를 적어야 한다.`);
    }

    if (entry.verdict === 'pending-pack-ownership') {
      const gapId = entry.gap ?? '';
      if (!gapId || !gaps.includes(gapId)) {
        errors.push(`${label} 은 pack 소유권 미결이라면 실재하는 gap id 를 gap 필드에 적어야 한다.`);
      }
    }

    if (DEBT_VERDICTS.has(entry.verdict)
        && (typeof entry.remedy !== 'string' || !entry.remedy.trim())) {
      errors.push(`${label} 은 부채이므로 remedy(이행 방법)를 적어야 한다.`);
    }
  }

  const debt = entries.filter((entry) => DEBT_VERDICTS.has(entry.verdict)).length;
  const max = census.expected?.debtMax;
  if (!Number.isInteger(max)) {
    errors.push('expected.debtMax 는 정수여야 한다.');
  } else if (debt > max) {
    errors.push(
      `A3-1 부채가 래칫을 넘었다: ${debt} > ${max}. 새 전용 입력 페이지를 들이지 말고 모달·인라인으로 두라.`,
    );
  } else if (debt < max) {
    errors.push(
      `A3-1 부채가 ${debt} 로 줄었는데 래칫은 ${max} 그대로다 — 같은 변경에서 expected.debtMax 를 내려라`
        + ' (내리지 않으면 줄어든 만큼 새 위반이 조용히 들어올 자리가 남는다).',
    );
  }

  return { errors, summary: { candidates: candidates.length, entries: entries.length, debt } };
}

export function analyze(root = ROOT) {
  const census = JSON.parse(readFileSync(CENSUS_PATH, 'utf8'));
  const candidates = detectCandidates(root);
  return { census, candidates, result: validateCensus(census, candidates) };
}

function printReport({ candidates, census, result }) {
  console.log('\n=== A3-1 폼 그릇 census ===');
  const byVerdict = new Map();
  for (const entry of census.entries ?? []) {
    byVerdict.set(entry.verdict, (byVerdict.get(entry.verdict) ?? 0) + 1);
  }
  for (const [verdict, count] of [...byVerdict].sort()) console.log(`${verdict.padEnd(28)} ${count}`);
  console.log(`전용 입력 페이지 후보  : ${candidates.length}`);
  console.log(`부채(래칫 ${census.expected?.debtMax}) : ${result.summary.debt}`);
  if (result.errors.length === 0) {
    console.log('\n✅ 모든 전용 입력 페이지가 §A3-1 판정과 함께 등재돼 있다');
  } else {
    console.error('\n❌ A3-1 폼 그릇 census 위반');
    for (const error of result.errors) console.error(`  - ${error}`);
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(SCRIPT_PATH);
if (isMain) {
  const analysis = analyze();
  if (process.argv.includes('--json')) console.log(JSON.stringify(analysis.result, null, 2));
  else printReport(analysis);
  if (analysis.result.errors.length > 0) process.exit(1);
}
