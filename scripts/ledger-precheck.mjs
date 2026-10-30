#!/usr/bin/env node
/**
 * 손 결속 원장 사전 점검 — `npm run regen -- --check`(scripts/regenerate.mjs 의 LEDGER_CHECKS 'hand-bound-ledgers')가 부른다.
 *
 * 재생성이 고치지 않고 사람이 맞추는 결속 셋을 운영 계약(pre-push 의 약 11분 뒤) 전에 본다. 셋 다 실제로 push 를 거부시켰다.
 *   TAGGED_GATE_REGISTRY — 태그 시험과 게이트 원장(config/governance/gates.json)의 등록이 어긋났다(2026-10-19 보안 묶음의 미등록
 *     @Tag("schema-validation") 시험). 선택 결과 밖 등록, 없는 root, 선언 root 밖 태그도 같은 코드다.
 *   MENU_SNAPSHOT_STALE — 메뉴에 닿는 마이그레이션 뒤 생성기 메뉴 스냅숏(config/project-composer-menus.json)의 해시가 낡았다(PR #897).
 *   UNASSIGNED_PERMISSION_GUIDANCE — 기본 그룹이 없는 권한에 기능 파일의 unassignedPermissions 안내가 없다(2026-10-26 CMS_PURGE).
 *
 * 새 판정이 아니다 — 점검마다 그 결속을 판정하는 함수를 그대로 부른다. 태그는 거버넌스 원장 계약이 쓰는 대조(taggedGateRegistryErrors),
 * 메뉴는 생성기 계획이 쓰는 스냅숏 적재(loadProjectComposerMenus), 안내는 생성기 계획이 쓰는 판정(loadUnassignedPermissionGuidance)이다.
 * 운영 계약(governance-gates-contract·project-composer 시험)이 같은 함수로 다시 보므로 거기서 걷지 않는다 — 병합 권위는 그대로다.
 * 읽기만 하고 Docker·네트워크 없이 수 초다. 판정 모듈이 없는 저장소에서는 그 점검만 건너뛰고 그렇게 말한다 — 통과해도 `건너뜀: 코드 — …`
 * 줄을 쓰고, regen --check 는 통과 출력을 숨기는 대신 그 줄을 `  ⚠ hand-bound-ledgers: …` 로 보인다(regenerate.mjs 의 notices). 판정 모듈이
 * 있는데 자료(원장·스냅숏·기능 파일)가 없으면 건너뛰지 않는다 — 판정 함수가 붉힌다.
 *
 * 사용법: node scripts/ledger-precheck.mjs   (인자 없음. 위반은 `  - [코드] 판정 문장` 머리줄과 코드마다 `    → 고치는 법` 줄을 쓰고 종료 코드 1)
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const GATE_REGISTRY = 'config/governance/gates.json';

const TAGGED_GATE_PRECHECK = Object.freeze({
  code: 'TAGGED_GATE_REGISTRY',
  requires: 'scripts/governance-gates-contract.mjs',
  run: (root, contract) => contract.taggedGateRegistryErrors({
    registry: contract.loadGovernanceRegistry(path.join(root, GATE_REGISTRY)), repoRoot: root,
  }),
  fix: `태그 시험과 ${GATE_REGISTRY} 의 등록을 맞춘다 — 새 시험은 사람이 그 gateSet 의 rules 에 등록한다`
    + '(`node scripts/domain-registration-doctor.mjs <기능 id>` 가 붙일 항목을 보인다). 태그를 떼거나 root 밖으로 옮겨 피하지 않는다(H2).',
});

export const MENU_SNAPSHOT_PRECHECK = Object.freeze({
  code: 'MENU_SNAPSHOT_STALE',
  requires: 'scripts/project-composer-menu-preview.mjs',
  run: (root, preview) => { preview.loadProjectComposerMenus(root); return []; },
  fix: '`npm run project:menus:refresh`(Docker 의 일회용 PostgreSQL, 무거운 실행)로 스냅숏을 다시 만들어 함께 커밋한다. 메뉴와 무관한'
    + ' 마이그레이션인데 붉으면 해시 포함 규칙(scripts/project-composer-menu-preview.mjs)이 그렇게 본 이유를 먼저 본다.',
});

const UNASSIGNED_GUIDANCE_PRECHECK = Object.freeze({
  code: 'UNASSIGNED_PERMISSION_GUIDANCE',
  requires: 'scripts/project-composer-unassigned.mjs',
  run: (root, unassigned) => { unassigned.loadUnassignedPermissionGuidance(root); return []; },
  fix: '기본 그룹이 없는 권한은 그 권한을 소유한 기능 파일(config/modules/<기능>.json, 없으면 core.json)의 unassignedPermissions 에'
    + ' {code, bundle, protected, effect} 안내를 둔다 — 안내를 피하려고 권한에 기본 그룹을 붙이지 않는다(H3).',
});

/** 점검 목록. `run(root, 판정 모듈)` 은 위반 문장 배열을 돌려주거나 판정 함수의 예외를 그대로 던진다. */
export const LEDGER_PRECHECKS = Object.freeze([TAGGED_GATE_PRECHECK, MENU_SNAPSHOT_PRECHECK, UNASSIGNED_GUIDANCE_PRECHECK]);

/** 여러 줄 판정 문장을 머리줄 하나로 — 발췌(regenerate.mjs)는 머리줄만 남긴다. */
const oneLine = text => String(text).split(/\r?\n/).map(line => line.trim()).filter(Boolean).join(' ');

/**
 * 점검을 돌린다. `root` 는 자료(원장·스냅숏·기능 파일)를 읽는 저장소, `moduleRoot` 는 판정 모듈을 불러오는 저장소다(둘 다 기본은 이 저장소 —
 * 시험은 자료만 임시 복사본으로 바꾼다). 반환: `{ findings: [{ code, message, fix }], ran: [코드], skipped: [{ code, requires }] }`.
 */
export async function ledgerPrecheck({ root = repoRoot, moduleRoot = repoRoot, checks = LEDGER_PRECHECKS } = {}) {
  const findings = [];
  const ran = [];
  const skipped = [];
  for (const check of checks) {
    const modulePath = path.join(moduleRoot, check.requires);
    if (!existsSync(modulePath)) {
      skipped.push({ code: check.code, requires: check.requires });
      continue;
    }
    ran.push(check.code);
    let messages;
    try {
      messages = await check.run(root, await import(pathToFileURL(modulePath).href));
    } catch (failure) {
      messages = [failure instanceof Error ? failure.message : String(failure)];
    }
    for (const message of messages) findings.push({ code: check.code, message: oneLine(message), fix: check.fix });
  }
  return { findings, ran, skipped };
}

/**
 * 결과를 CLI 줄로 — 코드마다 위반 머리줄(`  - [코드] …`)을 쓰고 그 뒤에 고치는 법(`    → …`) 한 줄. 건너뛴 점검은 통과·실패와 상관없이
 * `건너뜀: ` 으로 시작하는 줄이다(regen --check 가 이 머리말로 알림을 꺼낸다).
 */
export function formatPrecheck({ findings, ran, skipped }) {
  const notes = skipped.map(({ code, requires }) => `건너뜀: ${code} — ${requires} 이 이 저장소에 없다.`);
  if (findings.length === 0) {
    return { ok: true, lines: [...notes, `✅ 손 결속 원장 사전 점검 통과: ${ran.join(', ') || '(돈 점검 없음)'}`] };
  }
  const lines = [...notes, `❌ hand-bound ledger precheck failed (${findings.length}):`];
  for (const code of new Set(findings.map(finding => finding.code))) {
    const own = findings.filter(finding => finding.code === code);
    lines.push(...own.map(({ message }) => `  - [${code}] ${message}`));
    if (own[0].fix) lines.push(`    → ${own[0].fix}`);
  }
  return { ok: false, lines };
}

export async function main(argv, { root, moduleRoot, log = console.log, error = console.error } = {}) {
  if (argv.length !== 0) {
    error('사용법: node scripts/ledger-precheck.mjs (인자 없음 — 읽기만 한다)');
    return 2;
  }
  const { ok, lines } = formatPrecheck(await ledgerPrecheck({ root, moduleRoot }));
  (ok ? log : error)(lines.join('\n'));
  return ok ? 0 : 1;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (failure) {
    console.error(failure instanceof Error ? failure.message : String(failure));
    process.exitCode = 1;
  }
}
