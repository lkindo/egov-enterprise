import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * 📎 문서 링크 무결성 게이트 — 팬텀 링크(존재하지 않는 파일을 가리키는 상대 링크) 차단.
 *
 * [왜] 이 저장소의 문서는 코드 경로를 상대 링크로 대량 인용한다. 코드가 이동·삭제돼도
 *   링크는 조용히 남아, 다음 사람이 "그 파일이 있다"고 믿고 찾아 나선다. 실제로 발생했다 —
 *   2026-08-16 실측에서 자체 문서(docs/·루트·.githooks/)에 **깨진 상대 링크 17건**이 있었다:
 *     · `business-suite` 모듈(2026-07-11 business-core/business-app 으로 분할되어 소멸) 3건
 *     · `nuri.foundation.jwt.JwtTokenProvider`(→ `nuri.foundation.security.jwt`) 등 이동 경로
 *     · `NoteServiceImpl`(→ `NoteService` 로 개명), `LogRetentionScheduler`(business-app → business-core)
 *     · leader 도메인 폐기로 삭제된 `LeaderScheduleService`·`BusinessIdGnrConfig`·`admin/system/lsm/`
 *     · Windows 절대경로 `file:///d:/project/...`(다른 사람 기계에서 원리적으로 열리지 않는다)
 *   같은 종류의 사고가 앞서도 있었다(`e2e-test-guide.md` 가 존재하지 않는 스펙 파일을 인용).
 *
 * [규칙] 대상 문서의 마크다운 링크 `](target)` 중 **로컬 상대 경로**가 실재해야 한다.
 *   - `http(s):` / `mailto:` / 순수 앵커(`#...`)는 대상 밖.
 *   - `path#L10-L20` 형태는 `#` 앞의 경로만 검사한다(행 번호 유효성은 검사하지 않는다 — 코드가
 *     한 줄만 밀려도 red 가 되면 게이트 신뢰가 깎이고, 그 오탐 비용이 이득을 넘는다).
 *   - **`file://` 스킴은 명시적으로 금지**한다. 존재 검사로는 잡히지 않지만(작성자 기계에서는 열린다)
 *     타인에게는 항상 죽은 링크다.
 *
 * [범위] 우리가 소유한 문서만 — `docs/**`, 저장소 루트 `*.md`, `.githooks/**`.
 *   `.agent/skills/**` 는 벤더링된 서드파티 스킬 문서이고, 그 안의 `FORMS.md`·`file:///path/to/file`
 *   같은 링크는 **문서 작성법을 설명하는 예시**라 실재하지 않는 것이 정상이다(실측 46건).
 *   남의 예시를 우리 게이트로 판정하면 오탐만 낳는다 — 예외 목록을 만드는 대신 범위를 정확히 긋는다.
 *
 * [실행 경로] `.githooks/pre-push`(문서 변경 푸시 시) · CI `secret-scan` 잡의 계약 테스트 묶음.
 *   실행되지 않는 게이트는 없는 게이트다(GEMINI.md §0.7-H5).
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 우리가 소유한 문서인가. */
function isOwnedDoc(file) {
  if (file.startsWith('build/')) return false;
  if (file.startsWith('docs/')) return true;
  if (file.startsWith('.githooks/')) return true;
  return !file.includes('/'); // 저장소 루트의 *.md (README·GEMINI·CLAUDE·AGENTS …)
}

function trackedMarkdown() {
  const out = execFileSync('git', ['ls-files', '*.md'], { cwd: repoRoot, encoding: 'utf8' });
  return out.trim().split('\n').filter(Boolean).filter(isOwnedDoc);
}

/** `](target)` 에서 target 을 뽑는다. 공백 없는 형태만 — 마크다운 타이틀 문법은 이 저장소에 없다. */
const LINK = /\]\(([^)\s]+)\)/g;

/**
 * vacuity 하한 — 2026-08-16 실측 55문서 / 로컬 링크 330개.
 * 스캔이 조용히 붕괴하면(경로 규칙 변경·git 명령 실패) 0건 통과가 되어 게이트가 사라진다.
 * 실측의 약 60% 로 둔다: 실측에 붙이면 문서 정리에도 red 가 되고, 너무 낮으면 붕괴를 못 잡는다.
 */
const MIN_DOCS = 30;
const MIN_LINKS = 200;

test('owned documentation has no phantom relative links', () => {
  const files = trackedMarkdown();
  assert.ok(
    files.length >= MIN_DOCS,
    `게이트 무결성 파손: 스캔 문서 수(${files.length})가 하한(${MIN_DOCS}) 미만 — 경로/스캔 파손 의심. 조용한 skip 은 false-green 입니다.`,
  );

  let linkCount = 0;
  const broken = [];
  const fileScheme = [];

  for (const file of files) {
    const dir = path.dirname(path.join(repoRoot, file));
    const text = fs.readFileSync(path.join(repoRoot, file), 'utf8');

    for (const match of text.matchAll(LINK)) {
      const raw = match[1];

      if (/^file:\/\//i.test(raw)) {
        fileScheme.push(`${file}  ->  ${raw}`);
        continue;
      }
      if (/^(https?:|mailto:|#)/i.test(raw)) continue;

      const target = raw.split('#')[0];
      if (!target) continue; // 순수 앵커

      linkCount++;
      let resolved;
      try {
        resolved = path.resolve(dir, decodeURIComponent(target));
      } catch {
        resolved = path.resolve(dir, target);
      }
      if (!fs.existsSync(resolved)) broken.push(`${file}  ->  ${target}`);
    }
  }

  assert.ok(
    linkCount >= MIN_LINKS,
    `게이트 무결성 파손: 로컬 링크 수(${linkCount})가 하한(${MIN_LINKS}) 미만 — 링크 추출 정규식 부식 의심.`,
  );

  assert.deepEqual(
    fileScheme,
    [],
    `📎 file:// 절대경로 링크는 작성자 기계에서만 열립니다. 저장소 상대경로로 바꾸십시오.\n  ${fileScheme.join('\n  ')}`,
  );

  assert.deepEqual(
    broken,
    [],
    `📎 [DOC LINK] 존재하지 않는 대상을 가리키는 링크가 ${broken.length}건 있습니다.\n`
      + `코드가 이동·삭제됐다면 현재 경로로 고치고, 대상이 사라진 이력 서술이라면 링크를 해제하고\n`
      + `소멸 사실을 본문에 남기십시오(없는 파일을 가리키는 링크는 독자를 오도합니다).\n  `
      + broken.join('\n  '),
  );
});
