import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

import { RULES, evaluate, readHookInput, renderVerdict } from './agent-guard.mjs';

const repoRoot = resolve(import.meta.dirname, '..');
const GUARD = join(repoRoot, 'scripts', 'agent-guard.mjs');
const decide = (command, cwd = repoRoot) => evaluate(command, { cwd });
const ruleOf = (command, cwd) => decide(command, cwd)?.rules ?? [];

function tempDir(prefix) {
  return mkdtempSync(join(tmpdir(), prefix));
}

/** 각 규칙: 실제로 일어났던 명령은 걸리고, 비슷하지만 정상인 명령은 통과한다. */
const CASES = {
  'git-no-verify': {
    hit: ['git commit --only --no-verify -m "x" -- a.txt', 'git push --no-verify origin feat/x', 'git commit --only -nm "x" -- a.txt'],
    pass: ['git commit --only -m "--no-verify 를 막는 규칙" -- a.txt', 'git commit --only -m "훅 우회 --no-verify 금지" -- a.txt',
      'git push origin feat/x',
      "git commit --only -F - -- a.txt <<'EOF'\n가드가 git commit --no-verify 를 묻는다\nEOF"],
  },
  // 2026-10-27 감사: `--no-verify` 만 잡고 환경 변수·hooksPath 우회는 그대로 통과했다(.githooks/README.md 「우회」).
  'git-hook-bypass': {
    hit: ['SKIP_HOOKS=1 git push', 'SKIP_HARNESS=1 git push origin feat/x', 'export SKIP_HOOKS=1', '$env:SKIP_HARNESS = "1"', 'set SKIP_HOOKS=1',
      'git -c core.hooksPath=/dev/null push', 'git config --unset core.hooksPath', 'git config core.hooksPath D:/project/egov-enterprise/.githooks',
      // 2026-10-27 독립 검토(Argon)가 찾은 미탐: Git 2.46 하위 명령 형태·섹션째 지우기·--config-env·cross-env·따옴표 친 -c 값.
      'git config unset core.hooksPath', 'git config set core.hooksPath D:/x', 'git config --remove-section core',
      'git --config-env=core.hooksPath=HOOKS_DIR push', 'git -c "core.hooksPath=/dev/null" push', 'npx cross-env SKIP_HOOKS=1 git push',
      // 2026-10-27 독립 검토(Codex)가 찾은 미탐: 값을 붙인 -c, 값 자체가 get 인 설정, CMD 의 따옴표 친 set, 하위 명령 형태의 섹션 지우기.
      'git -ccore.hooksPath=/dev/null push', 'git config core.hooksPath get', 'set "SKIP_HOOKS=1"', 'set "SKIP_HARNESS=1" && git push',
      'git config remove-section core'],
    pass: ['git push origin feat/x', 'SKIP_HOOKS= git push', '$env:SKIP_HARNESS=""', 'grep -n SKIP_HOOKS=1 .githooks/pre-push',
      'echo "SKIP_HARNESS=1 git push 는 묻는다"', 'git config core.hooksPath .githooks', 'git config --get core.hooksPath',
      'NO_HOOK_INSTALL=1 ./gradlew compileJava', 'git config get core.hooksPath', 'git config set core.hooksPath .githooks',
      'git config --remove-section alias', 'npx cross-env TZ=UTC npm run verify:fast',
      // 같은 검토가 찾은 오탐: 메시지에 적은 -c core.hooksPath 는 명령이 아니다.
      'git commit --only -m "guard: ask on git -c core.hooksPath=/dev/null" -- scripts/agent-guard.mjs'],
  },
  'git-force-push': {
    hit: ['git push --force-with-lease origin feat/x', 'git push -f origin feat/x', 'git push origin +feat/x',
      // 2026-10-28 감사(D5-3): 따옴표 친 `+` refspec 은 가린 판에서 밑줄이 되어 놓쳤다.
      'git push origin "+feat/x"', "git push origin '+main:main'",
      // 2026-10-28 감사(D5-1): 명시적 셸 래퍼·명령 치환 안의 명령을 판정하지 않았다.
      'powershell -Command "git push -f"', 'pwsh -NoProfile -c "git push --force origin feat/x"', 'cmd /c "git push -f origin feat/x"',
      "bash -lc 'cd frontend && git push -f origin feat/x'", 'x=$(git push -f origin feat/x)',
      // 줄 이음으로 나눈 한 명령(bash `\`, PowerShell 백틱).
      'git push origin feat/x \\\n  --force-with-lease', 'git push origin feat/x `\r\n  --force',
      // 2026-10-29 교차 검토: 주석을 건너뛰어도 단어 중간의 `#`·큰따옴표 안의 `#`·주석 다음 줄의 치환은 실행된다.
      'echo a#$(git push -f origin feat/x)', 'echo "# $(git push -f origin feat/x)"', 'git status # 확인\nx=$(git push -f origin feat/x)',
      'echo $(echo a # )\ngit push -f origin feat/x)'],
    pass: ['git push -u origin feat/x', 'git push origin --delete feat/old', 'git commit --only -m "정리; git push --force 는 쓰지 않는다" -- a.txt',
      "git commit --only -F - -- a.txt <<'EOF'\n본문에 적은 git push --force 는 명령이 아니다\nEOF",
      'git push -o "+ci.skip" origin feat/x', 'powershell -Command "git push origin feat/x"', "bash -lc 'git push origin feat/x'",
      'git commit --only -m "pwsh -c git push -f 는 묻는다" -- a.txt', "echo 'literal $(git push -f origin feat/x)'",
      'git commit --only -m "\\$(git push -f) 는 치환이 아니다" -- a.txt',
      // 2026-10-29 교차 검토(Codex) 오탐: 셸 주석 속 `$( … )` 를 명령 치환으로 읽어 승인을 요구했다(bash·PowerShell 공통 `#`).
      'git status # $(git push --force origin main)', 'git status;# $(git push -f origin main)', '# $(git push -f origin main)\ngit status',
      "Write-Output 'ok' # 나중에 $(git push -f) 를 쓰지 않는다"],
  },
  'git-discard-worktree': {
    // 2026-10-27 독립 검토(Antigravity)가 찾은 미탐: 따옴표 속 `<<`·주석 속 아포스트로피가 뒤 줄의 실제 명령을 지웠다.
    hit: ['git reset --hard origin/main', 'git clean -fdx', 'git checkout -- .', 'git checkout .', 'git restore .', 'git branch -D feat/x', 'git stash drop',
      'git commit --only -m "Fix << EOF parser" -- a.txt\ngit reset --hard', "# Let's check\ngit reset --hard\n# It's done",
      'node -e "console.log(1 << shift)"\ngit reset --hard',
      // 작업 트리 디렉터리와 미추적 산출물 삭제는 브랜치 삭제와 별개로 승인을 받는다(SOP §6.6).
      'git worktree remove D:\\wt-board', 'git worktree remove --force D:\\wt-board', 'git branch -df feat/x', 'git branch -fd feat/x',
      // 값을 띄어 쓴 전역 옵션(`--git-dir <경로>`)을 하위 명령으로 읽으면 규칙이 아예 걸리지 않았다.
      'git --git-dir D:/elsewhere/.git branch -D feat/x',
      // 2026-10-28 감사(D5-3): `.` 만 작업 트리 전체로 봤고 강제 전환은 보지 않았다.
      'git checkout -- ":/"', "git checkout '*'", 'git checkout HEAD -- ..', 'git checkout -- ./*', 'git checkout -- ":(top)"', 'git restore ":/"',
      'git restore -s HEAD~1 -- .', 'git checkout -f main', 'git checkout --force main', 'git switch -f main', 'git switch --force main',
      'git switch --discard-changes main',
      // 2026-10-28 감사(D5-1): 셸 래퍼·예약어 뒤의 명령.
      "bash -c 'git reset --hard'", 'sh -c "git clean -fdx"', 'for b in a; do git reset --hard; done', 'if true; then git clean -fd; else git status; fi',
      // 줄 이음을 합친 판만 보면 PowerShell 의 줄 끝 `\` 경로 뒤 명령을 cd 인자로 삼킨다 — 원문 판도 함께 본다.
      'Set-Location D:\\wt-x\\\ngit reset --hard'],
    pass: ['git reset --soft HEAD~1', 'git checkout main', 'git restore --staged .', 'git restore -- scripts/dev.mjs', 'git branch -d feat/x', 'git stash list',
      'git worktree list', 'git worktree prune',
      'git checkout -- frontend/', 'git restore scripts/', 'git restore --staged :/', 'git switch -c feat/x', 'git checkout -b feat/x origin/main',
      'git switch main', "bash -c 'git status'", 'git checkout main # .', 'git commit --only -m "git checkout -f 는 묻는다" -- a.txt'],
  },
  'git-commit-without-only': {
    hit: ['git commit -am "x"', 'git commit -m "x"', 'cd frontend && git commit -m "x"', 'MSYS_NO_PATHCONV=1 git commit -m "x"', '& git commit -m "x"',
      // --only 여도 작업 트리 전체 경로나 -a 면 다른 작업의 변경이 모두 들어간다(2026-10-27 감사).
      'git commit --only -m "x" -- .', 'git commit --only -m "x" .', 'git commit --only -m "x" -- ":/"', 'git commit -o -am "x" -- a.txt',
      // 독립 검토(Argon)가 찾은 미탐: `--` 없이 따옴표 친 경로, PowerShell `.\`, 상위 디렉터리, `:(top)`.
      'git commit --only -m "x" ":/"', 'git commit --only -m "x" "."', 'git commit --only -m "x" -- .\\', 'git commit --only -m "x" -- ..',
      'git commit --only -m "x" -- ":(top)"'],
    // git 이 명령 자리에 있을 때만 git 호출이다 — 검색어·인자로 쓴 git 은 막지 않는다(독립 검토가 찾은 오탐).
    pass: ['git commit --only -m "x" -- a.txt', 'git commit --dry-run', 'git log -1', 'rg git commit docs', 'grep -rn "git commit" docs/',
      'echo git commit -am x', 'git commit --only -m "Use `"--no-verify`" carefully" -- a.txt',
      'git commit --only -m . -- a.txt', 'git commit --only -m "x" -- docs/a.md scripts/b.mjs',
      // 같은 검토가 찾은 오탐: 경로 뒤 주석의 `.`, 메시지 `--`.
      'git commit --only -m "x" -- a.txt # .', 'git commit --only -m "--" -- a.txt'],
  },
  'powershell-herestring-commit': {
    hit: ["@'\n제목\n\n본문\n'@ | git commit --only -F - -- a.txt", "git commit --only -F - @'\n제목\n'@ -- a.txt"],
    pass: ["git commit --only -F - -- a.txt <<'EOF'\n제목\nEOF", 'git commit --only -F msg.txt -- a.txt'],
  },
  'flyway-seed-dev': {
    hit: ['MSYS_NO_PATHCONV=1 docker run --rm -v "$PWD/db:/flyway/sql" flyway/flyway:12.4.0 -locations=filesystem:/flyway/sql/migration,filesystem:/flyway/sql/seed-dev -baselineOnMigrate=true migrate',
      // 2026-10-28 감사(D5-1): 줄 이음으로 나눠 쓴 같은 명령은 줄마다 다른 조각이 되어 걸리지 않았다(bash `\`, PowerShell 백틱+CRLF).
      'MSYS_NO_PATHCONV=1 docker run --rm -v "$PWD/db:/flyway/sql" flyway/flyway:12.4.0 \\\n  -locations=filesystem:/flyway/sql/migration,filesystem:/flyway/sql/seed-dev \\\n  -baselineOnMigrate=true \\\n  migrate',
      'docker run --rm -v "${PWD}/db:/flyway/sql" flyway/flyway:12.4.0 `\r\n  -locations=filesystem:/flyway/sql/migration,filesystem:/flyway/sql/seed-dev `\r\n  migrate'],
    pass: ['docker run --rm flyway/flyway:12.4.0 -locations=filesystem:/flyway/sql/migration migrate', 'docker run --rm flyway/flyway:12.4.0 -locations=filesystem:/flyway/sql/seed-dev info',
      'git commit --only -m "flyway migrate 에 seed-dev 를 섞지 않는다" -- a.txt',
      'docker run --rm flyway/flyway:12.4.0 \\\n  -locations=filesystem:/flyway/sql/seed-dev \\\n  info'],
  },
  // 2026-10-30: .env 내용 출력은 Claude 자동 모드 분류기만 막아 Codex·Antigravity 에서는 글로만 금지였다(oci-db-access 기억).
  // 첫 일곱은 그 기억이 기록한 실제 읽기 형태다.
  'env-file-read': {
    hit: ['cat .env', 'Get-Content .env', 'grep DB_URL .env', 'type .env', "bash -lc 'cat .env'", 'Select-String -Path .env -Pattern DB',
      'Get-Content -Raw frontend/.env.local',
      // 경로·glob·여러 파일 — 마지막 이름으로 본다.
      'cat ./.env', 'type .\\.env.production', 'Get-Content "D:\\project\\egov-enterprise\\.env"', 'cat .env*', 'cat .env.example .env',
      'gc .env.example,.env', 'head -n 3 .env', 'tail -f .env', 'base64 .env', 'xxd .env', 'diff .env .env.example',
      // 패턴·스크립트가 앞에 오는 명령: 위치 패턴, 옵션 패턴, 값을 받는 옵션 뒤, 입력 리디렉션.
      'grep -e DB .env', 'rg -n -g "*" DB_ .env.local', 'grep -- -DB_URL .env', 'cat ${HOME}/.env', 'sls DB .env', 'Select-String -Path .env DB', 'findstr DB .env', 'findstr /c:"DB" .env',
      "awk -F= '{print $2}' .env", "awk -F '=' '{print $2}' .env", 'sed -n p < .env', 'more <.env', 'sed -n 1,5p .env',
      // 파이프·대입·묶음·스크립트 블록·치환·래퍼·호출 연산자·.NET 읽기.
      'cat .env | grep DB', 'Get-Content .env | Select-String DB', '$s = Get-Content .env -Raw', '(gc .env) -match "DB"',
      'if (Test-Path .env) { Get-Content .env }', 'x=$(cat .env)', 'echo "$(grep DB_ .env)"', 'x=`cat .env`', 'diff <(cat .env) .env.example',
      'pwsh -NoProfile -Command "Get-Content .env"', 'cmd /c type .env', '& "C:\\Program Files\\Git\\usr\\bin\\cat.exe" .env',
      "[IO.File]::ReadAllText('.env')", '$t = [System.IO.File]::ReadAllLines("$PWD\\.env")',
      // compose 는 .env 를 기본으로 읽어 보간한 비밀(docker-compose.prod.yml 의 DB_PASSWORD·JWT_SECRET)을 출력한다.
      'docker compose config', 'docker compose --env-file .env -f docker-compose.prod.yml config', 'docker-compose config --environment',
      'docker compose -p egov config --format json'],
    pass: ['cat .env.example', 'Get-Content frontend/.env.example', 'cat .env.sample', 'cat .env.template', 'cat .env.local.example',
      // 값을 출력하지 않고 쓰는 길 — 규칙의 fix 가 권하는 명령이다.
      'node --env-file=.env scripts/x.mjs', 'DB_NAME=egovdb node --env-file=.env .agent/scripts/db-bridge.js "SELECT 1"',
      'node --env-file=.env -e "console.log(Boolean(process.env.DB_URL))"', "grep -q '^DB_URL=' .env", 'grep -c DB_URL .env', 'rg -l DB_URL .env',
      'Select-String -Path .env -Pattern DB -Quiet',
      // 있음·무시 여부·메타데이터만 본다.
      'git check-ignore -v .env', 'ls .env', 'ls -la .env*', 'Test-Path .env', 'wc -l .env', 'Get-Item .env',
      // 문자열·메시지·주석 속 문구는 명령이 아니다.
      'git commit --only -m "cat .env 대신 node --env-file 을 쓴다" -- a.txt', 'echo "cat .env"', 'echo cat .env', "Write-Output 'Get-Content .env'",
      'echo "(Get-Content .env)"',
      "git commit --only -F - -- a.txt <<'EOF'\n가드가 cat .env 를 막는다\nEOF", 'git status # cat .env',
      // `.env` 를 검색어로 찾는 명령(첫 위치 인자·옵션 패턴·값을 받는 옵션 뒤의 패턴).
      'grep -rn ".env" .gitignore', 'rg -g "*.mjs" ".env" scripts', 'grep -m 1 .env .gitignore', 'grep -e .env .gitignore',
      'Select-String -Pattern .env -Path .gitignore', 'findstr /c:".env" .gitignore', 'rg -- .env scripts',
      // 쓰기·복사는 내용을 출력하지 않는다.
      'cat .env.example > .env', 'cp .env.example .env', 'Copy-Item .env.example .env', "sed -i 's/^X=.*/X=1/' .env",
      "cat <<'EOF' > .env\nX=1\nEOF",
      // compose 의 이름만 내는 config 와 다른 하위 명령.
      'docker compose --env-file .env up -d', 'docker compose config --quiet', 'docker compose -f docker-compose.prod.yml config --services',
      'docker compose logs config', 'docker compose -p config up', 'docker compose config --hash="*"'],
  },
  'openapi-relative-export-path': {
    hit: ['./gradlew :api-server:test --tests "nuri.openapi.OpenApiDocumentationTest" -Dopenapi.export.path="api-docs.json" --rerun-tasks',
      '.\\gradlew.bat :api-server:test --tests nuri.openapi.OpenApiDocumentationTest "-Dopenapi.export.path=api-docs.json"'],
    // 2026-10-27 실측 오탐: 다른 에이전트에게 준 프롬프트 문자열 속 플래그를 명령으로 읽어 막았다.
    pass: ['./gradlew :api-server:test --tests "nuri.openapi.OpenApiDocumentationTest" -Dopenapi.export.path="D:/project/egov-enterprise/api-docs.json" --rerun-tasks',
      'agy -p "Run this command: echo -Dopenapi.export.path=api-docs.json"'],
  },
  'tagged-test-on-default-task': {
    hit: ['./gradlew :api-server:test --tests "nuri.api.harness.SecurityAuthAnnotationLinterTest"', './gradlew :api-server:test --tests "*AnnotationLinterTest"',
      './gradlew :api-server:test --warning-mode fail --tests "nuri.api.harness.SecurityAuthAnnotationLinterTest"',
      './gradlew :api-server:test --tests "nuri.api.harness.SecurityAuthAnnotationLinterTest.someMethod"',
      // 루트 집계 test 도 api-server 의 test 를 포함한다.
      './gradlew test --tests "nuri.api.harness.SecurityAuthAnnotationLinterTest"'],
    pass: ['./gradlew :api-server:harnessTest --tests "nuri.api.harness.SecurityAuthAnnotationLinterTest"',
      './gradlew :api-server:test --tests "nuri.openapi.OpenApiDocumentationTest" :api-server:harnessTest --tests "nuri.api.harness.SecurityAuthAnnotationLinterTest"',
      // 2026-10-28 감사(D5-7) 오탐: excludeTags 가 없는 다른 모듈의 test 가 api-server 태그 시험 이름(Authorization…)과 겹쳐 막혔다.
      './gradlew :business-core:test --tests "*Authorization*"'],
  },
  // 2026-09-24 PR #735: `--watch` 는 집계 체크가 등록되기 전 pending 0 에서 끝났다. 첫 사례는 기억이 권하던 실제 명령이다.
  'gh-pr-checks-watch': {
    hit: ['gh pr checks 1002 --watch --interval 30', 'gh pr checks 735 --required --watch', 'gh.exe pr checks 1 --watch=true',
      'x=$(gh pr checks 1002 --watch)', "bash -lc 'gh pr checks 1002 --watch'",
      // 2026-10-29 독립 검토(Codex) 미탐: gh 는 하위 명령 앞·사이의 저장소 옵션을 받는데 `gh` 바로 뒤의 `pr checks` 만 봤고,
      // PowerShell 호출 연산자로 부른 따옴표 친 실행 파일 경로는 가린 판에서 밑줄이 되어 명령 이름을 놓쳤다.
      'gh --repo=OWNER/REPO pr checks 1002 --watch', 'gh -R OWNER/REPO pr checks 1002 --watch', 'gh --repo OWNER/REPO pr checks 1002 --watch',
      'gh pr -R OWNER/REPO checks 1002 --watch', '& "C:\\Program Files\\GitHub CLI\\gh.exe" pr checks 1002 --watch',
      "& 'C:\\Program Files\\GitHub CLI\\gh.exe' pr checks 1002 --watch", '&"C:\\Program Files\\GitHub CLI\\gh.exe" pr checks 1002 --watch'],
    pass: ['gh pr checks 735 --required', 'node scripts/pr-checks-wait.mjs --pr 1002', 'gh run watch 123 --exit-status', 'echo "gh pr checks --watch"',
      'git commit --only -m "gh pr checks --watch 대신 도구를 쓴다" -- a.txt',
      // 같은 검토의 오탐: 거짓 값을 준 `--watch` 는 감시하지 않는다(pflag 의 ParseBool).
      'gh pr checks 1002 --watch=false', 'gh pr checks 1002 --watch=0', 'gh pr checks 1002 --watch="false"',
      'gh -R OWNER/REPO pr checks 1002 --required', 'Write-Output "& \'C:\\Program Files\\GitHub CLI\\gh.exe\' pr checks 1002 --watch"'],
  },
  'guard-canary': {
    hit: ['echo AGENT_GUARD_CANARY', '  echo AGENT_GUARD_CANARY  '],
    pass: ['echo AGENT_GUARD_CANARY_X', 'grep -n AGENT_GUARD_CANARY scripts/agent-guard.mjs', 'echo hello'],
  },
  'worktree-name-collides-with-e2e': {
    hit: ['git worktree add D:\\wt-quality -b fix/x origin/main', 'git worktree add -b fix/x ../wt-contracts origin/main'],
    // setup 프로젝트 매처는 `/.*\.setup\.ts/` 라 디렉터리 이름으로는 걸리지 않는다(2026-10-27 감사).
    pass: ['git worktree add D:\\wt-board -b fix/x origin/main', 'git worktree list', 'git worktree add D:\\wt-setup -b fix/x origin/main'],
  },
};

test('규칙 표와 시험 사례가 일대일이다', () => {
  const tested = new Set([...Object.keys(CASES), 'jq-not-installed', 'gitleaks-worktree-mount', 'worktree-recursive-delete']);
  assert.deepEqual(RULES.map((rule) => rule.id).sort(), [...tested].sort(), '규칙을 더하면 실제 사례 시험도 함께 더한다.');
  for (const rule of RULES) {
    assert.ok(['deny', 'ask'].includes(rule.decision), rule.id);
    assert.ok(rule.why.length > 20 && rule.fix.length > 10, `${rule.id}: 이유와 대신 쓸 방법을 적는다`);
  }
});

for (const [id, { hit, pass }] of Object.entries(CASES)) {
  test(`${id}: 실제 실수는 걸리고 정상 명령은 통과한다`, () => {
    for (const command of hit) assert.ok(ruleOf(command).includes(id), `걸려야 한다: ${command}`);
    for (const command of pass) assert.ok(!ruleOf(command).includes(id), `통과해야 한다: ${command}`);
  });
}

test('git-commit-without-only: 병합·cherry-pick·revert·rebase 가 충돌로 멈춘 동안의 커밋은 막지 않는다', () => {
  const root = tempDir('agent-guard-merge-');
  try {
    execFileSync('git', ['init', '-q'], { cwd: root });
    assert.ok(ruleOf('git commit --no-edit', root).includes('git-commit-without-only'));
    // 2026-10-28 감사(D5-7): MERGE_HEAD 만 봐서 cherry-pick·rebase 도중의 커밋(git 이 부분 커밋을 거부한다)을 막았다.
    for (const [marker, isDir] of [['MERGE_HEAD', false], ['CHERRY_PICK_HEAD', false], ['REVERT_HEAD', false], ['rebase-merge', true], ['rebase-apply', true]]) {
      const path = join(root, '.git', marker);
      if (isDir) mkdirSync(path); else writeFileSync(path, '0'.repeat(40));
      assert.ok(!ruleOf('git commit --no-edit', root).includes('git-commit-without-only'), `${marker} 가 있으면 통과한다`);
      rmSync(path, { recursive: true, force: true });
    }
    assert.ok(ruleOf('git commit --no-edit', root).includes('git-commit-without-only'), '표지가 사라지면 다시 막는다');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

const slash = (path) => path.replaceAll('\\', '/');

/** 원본 checkout(repo)과 나란한 작업 트리(wt-alpha), 등록이 풀린 잔재·다른 디렉터리·다른 저장소의 작업 트리를 둔 임시 배치에서 run 을 돈다. */
function withWorktreeLayout(run) {
  const base = tempDir('agent-guard-trees-');
  const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.email=guard@test', '-c', 'user.name=guard', ...args], { cwd, encoding: 'utf8' });
  const repo = join(base, 'repo');
  const tree = join(base, 'wt-alpha');
  try {
    mkdirSync(repo);
    git(repo, 'init', '-q', '-b', 'main');
    git(repo, 'commit', '-q', '--allow-empty', '-m', 'base');
    git(repo, 'worktree', 'add', '-q', '-b', 'alpha', tree);
    mkdirSync(join(repo, 'build', 'x'), { recursive: true });
    mkdirSync(join(tree, 'build'));
    mkdirSync(join(base, 'wt-stale')); // 등록이 풀린 잔재(작업 트리와 나란한 wt-*)
    mkdirSync(join(base, 'other'));
    mkdirSync(join(base, 'foreign', 'tree'), { recursive: true });
    writeFileSync(join(base, 'foreign', 'tree', '.git'), 'gitdir: D:/elsewhere/.git/worktrees/tree\n'); // 다른 저장소의 작업 트리 표지
    run({ base, repo, tree });
  } finally {
    try { git(repo, 'worktree', 'remove', '--force', tree); } catch { /* 이미 지워졌으면 아래에서 함께 지운다 */ }
    rmSync(base, { recursive: true, force: true });
  }
}

test('worktree-recursive-delete: 작업 트리 디렉터리의 재귀 삭제만 묻고 저장소 안 build·임시 디렉터리는 통과한다', () => {
  withWorktreeLayout(({ base, repo, tree }) => {
    const hit = [`Remove-Item -Recurse -Force ${tree}`, `rm -rf ${slash(tree)}`, 'rm -rf ../wt-alpha', `rmdir /s /q ${tree}`, `rd /S ${tree}`,
      `Remove-Item -LiteralPath "${tree}" -Recurse`, `node -e "require('fs').rmSync('${slash(tree)}', { recursive: true, force: true })"`,
      `node -e "require('node:fs').rmdirSync('${tree.replaceAll('\\', '\\\\')}', {recursive:true})"`,
      `rm -rf ${slash(join(base, 'wt-stale'))}`, `Remove-Item -Recurse ${repo}`, `rm -rf ${slash(base)}`, `rm -rf ${slash(join(base, 'foreign', 'tree'))}`,
      `cd ${slash(tree)} && rm -rf ./*`, `cmd /c "rmdir /s /q ${tree}"`, `rd /s/q ${tree}`];
    if (process.platform === 'win32') hit.push(`rm -rf /${tree[0].toLowerCase()}${slash(tree.slice(2))}`);
    const pass = ['rm -rf build/x', 'Remove-Item -Recurse -Force build', `rm -rf ${slash(join(base, 'other'))}`, `rm -f ${slash(join(tree, 'a.txt'))}`,
      `Remove-Item -Force ${join(tree, 'a.txt')}`, `node -e "require('fs').rmSync('${slash(join(repo, 'build'))}', { recursive: true })"`,
      `rm -rf ${slash(join(tree, 'build'))}`, `rmdir ${join(base, 'other')}`, `node -e "require('fs').rmSync('${slash(tree)}')"`, 'git worktree list',
      // 재귀가 아니면 비어 있지 않은 디렉터리는 지워지지 않는다(PowerShell `-Force` 는 재귀가 아니다).
      `Remove-Item -Force ${tree}`, `rmdir ${tree}`, `rm -f ${slash(tree)}`];
    for (const command of hit) assert.ok(ruleOf(command, repo).includes('worktree-recursive-delete'), `걸려야 한다: ${command}`);
    for (const command of pass) assert.ok(!ruleOf(command, repo).includes('worktree-recursive-delete'), `통과해야 한다: ${command}`);
    assert.equal(decide(`rm -rf ${slash(tree)}`, repo).decision, 'ask', '삭제 승인은 사용자에게 묻는다');
  });
});

// 2026-10-29 교차 검토(Codex): `$( … )` 안의 삭제를 처음 cwd 로 읽어, 앞의 `cd ..` 뒤 상대 경로로 지우는 작업 트리를 놓쳤다.
test('worktree-recursive-delete: 명령 치환은 그 자리 앞의 cd 로 판정하고, cwd 를 정할 수 없으면 이름으로 묻는다', () => {
  withWorktreeLayout(({ base, repo }) => {
    const other = slash(join(base, 'other'));
    const hit = [
      // 치환 앞의 cd(;·&&), 큰따옴표 안 치환, Set-Location·pushd, 중첩 치환, 치환 안의 cd 뒤 중첩 치환.
      'cd ..; Write-Output $(Remove-Item -Recurse -Force wt-alpha)', 'cd .. && echo "$(rm -rf wt-alpha)"',
      'Set-Location ..; $x = $(Remove-Item -Recurse wt-alpha)', 'pushd ..; echo $(rm -rf wt-alpha); popd',
      'cd ..; echo $(echo $(rm -rf wt-alpha))', 'echo $(cd ..; echo $(rm -rf wt-alpha))',
      // 치환 안 주석의 `)` 는 치환을 닫지 않는다 — 다음 줄의 삭제도 치환 안의 cd 뒤에서 실행된다.
      'echo $(cd .. # )\nrm -rf wt-alpha)',
      // cwd 를 정할 수 없는 cd(변수·명령 치환·cd -·빈 스택의 popd) 뒤의 상대 삭제는 이름이 등록 작업 트리·wt-* 이거나 이름 없이
      // 디렉터리를 지우면 묻는다.
      'cd $env:TEMP; Remove-Item -Recurse -Force wt-alpha', 'cd "$(git rev-parse --show-toplevel)/.." && rm -rf wt-alpha',
      'cd $dir && rm -rf ../wt-beta', 'cd -; rm -rf ./*', 'cd $dir; echo $(rm -rf wt-alpha)', 'cd $dir; cd sub; rm -rf .',
      'popd; rm -rf wt-alpha'];
    const pass = [
      // 치환 뒤의 cd 는 치환에 닿지 않는다(마지막 cwd 로 읽으면 이 줄이 걸린다).
      'Write-Output $(Remove-Item -Recurse -Force wt-alpha); cd ..', 'echo $(rm -rf wt-alpha) && cd .. && echo done',
      // 치환 앞의 cd 뒤라도 작업 트리가 아닌 상대 삭제.
      'cd ..; Write-Output $(Remove-Item -Recurse -Force other)', 'cd ..; echo $(rm -rf repo/build/x)',
      // 치환 안의 cd 는 그 하위 셸만 옮긴다 — 바깥 조각의 cwd 는 그대로다.
      'echo $(true; cd ..;); rm -rf wt-alpha',
      // cwd 를 정할 수 없어도 이름이 작업 트리와 무관하면 통과하고, 절대 경로로 다시 옮기면 다시 안다.
      'cd $env:TEMP; Remove-Item -Recurse -Force build', 'cd "$(git rev-parse --show-toplevel)" && rm -rf build/x',
      'cd $dir; rm -rf node_modules/.cache', `cd $dir; cd ${other}; rm -rf ./*`,
      // popd 는 pushd 앞의 디렉터리(repo)로 돌아간다.
      `pushd ${slash(base)}; popd; rm -rf wt-alpha`];
    for (const command of hit) assert.ok(ruleOf(command, repo).includes('worktree-recursive-delete'), `걸려야 한다: ${command}`);
    for (const command of pass) assert.ok(!ruleOf(command, repo).includes('worktree-recursive-delete'), `통과해야 한다: ${command}`);
  });
});

test('git-discard-worktree: 끝 커밋이 원격 추적 ref 에 있는 브랜치의 강제 삭제는 묻지 않는다', () => {
  const root = tempDir('agent-guard-branch-');
  const git = (...args) => execFileSync('git', ['-c', 'user.email=guard@test', '-c', 'user.name=guard', ...args], { cwd: root, encoding: 'utf8' });
  try {
    git('init', '-q', '-b', 'main');
    git('commit', '-q', '--allow-empty', '-m', 'base');
    git('switch', '-q', '-c', 'feat-x');
    git('commit', '-q', '--allow-empty', '-m', 'work');
    git('update-ref', 'refs/remotes/origin/feat-x', 'HEAD');
    git('switch', '-q', 'main');
    // squash 병합 뒤의 로컬 정리: -d 는 거부되고 -D 만 된다 — 잃을 커밋이 없으면 AGENTS 상시 승인 범위다.
    assert.ok(!ruleOf('git branch -D feat-x', root).includes('git-discard-worktree'));
    assert.ok(!ruleOf('git branch --delete --force feat-x', root).includes('git-discard-worktree'));
    git('switch', '-q', 'feat-x');
    git('commit', '-q', '--allow-empty', '-m', 'local only');
    git('switch', '-q', 'main');
    assert.ok(ruleOf('git branch -D feat-x', root).includes('git-discard-worktree'), '원격에 없는 커밋을 잃으면 묻는다');
    assert.ok(ruleOf('git branch -D missing', root).includes('git-discard-worktree'), '판정할 수 없으면 묻는다');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// 2026-10-27 독립 검토(Codex): cwd 저장소의 같은 이름 브랜치가 원격에 있어도, 다른 저장소를 고른 호출은 그 저장소의 브랜치를 지운다.
test('git-discard-worktree: 다른 저장소를 고른 강제 삭제는 cwd 판정으로 면제하지 않는다', () => {
  const pushed = tempDir('agent-guard-repo-a-');
  const local = tempDir('agent-guard-repo-b-');
  const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.email=guard@test', '-c', 'user.name=guard', ...args], { cwd, encoding: 'utf8' });
  try {
    for (const [root, onRemote] of [[pushed, true], [local, false]]) {
      git(root, 'init', '-q', '-b', 'main');
      git(root, 'commit', '-q', '--allow-empty', '-m', 'base');
      git(root, 'switch', '-q', '-c', 'topic');
      git(root, 'commit', '-q', '--allow-empty', '-m', 'work');
      if (onRemote) git(root, 'update-ref', 'refs/remotes/origin/topic', 'HEAD');
      git(root, 'switch', '-q', 'main');
    }
    const other = join(local, '.git').replaceAll('\\', '/');
    assert.ok(!ruleOf('git branch -D topic', pushed).includes('git-discard-worktree'));
    for (const command of [`git --git-dir=${other} branch -D topic`, `git --git-dir ${other} branch -D topic`, `GIT_DIR=${other} git branch -D topic`]) {
      assert.ok(ruleOf(command, pushed).includes('git-discard-worktree'), `다른 저장소를 고르면 묻는다: ${command}`);
    }
  } finally {
    rmSync(pushed, { recursive: true, force: true });
    rmSync(local, { recursive: true, force: true });
  }
});

test('jq-not-installed: PATH 에 jq 가 없을 때만 막는다', () => {
  const empty = tempDir('agent-guard-path-');
  const withJq = tempDir('agent-guard-jq-');
  const saved = process.env.PATH;
  try {
    writeFileSync(join(withJq, process.platform === 'win32' ? 'jq.exe' : 'jq'), '');
    // 2026-10-28 감사(D5-2): Monitor 도구 설명서가 권하는 폴링 루프는 jq 를 `$( … )`·백틱 안이나 예약어 뒤에 둔다.
    const monitorLoop = [
      'prev=""',
      'while true; do',
      '  s=$(gh pr checks 123 --json name,bucket)',
      '  cur=$(jq -r \'.[] | select(.bucket!="pending") | "\\(.name): \\(.bucket)"\' <<<"$s" | sort)',
      '  prev=$cur',
      '  sleep 30',
      'done',
    ].join('\n');
    const hits = ["gh pr checks 990 --json name,bucket | jq '.[]'", 'cur=$(jq -r \'.[]\' <<<"$s")', 'cur=`jq -r .name f.json`',
      'for x in a; do jq . f.json; done', monitorLoop, "s=$(gh pr checks 1 --json bucket); echo \"$(jq -e 'all(.bucket!=\"pending\")' <<<\"$s\")\""];
    const passes = ["gh pr checks 990 --json name,bucket --jq '.[]'", 'echo "use jq later"', 'grep -n jq scripts/agent-guard.mjs', "echo '$(jq .)'"];
    process.env.PATH = empty;
    for (const command of hits) assert.ok(ruleOf(command).includes('jq-not-installed'), `걸려야 한다: ${command}`);
    for (const command of passes) assert.ok(!ruleOf(command).includes('jq-not-installed'), `통과해야 한다: ${command}`);
    process.env.PATH = withJq;
    for (const command of hits) assert.ok(!ruleOf(command).includes('jq-not-installed'), `jq 가 있으면 통과한다: ${command}`);
  } finally {
    process.env.PATH = saved;
    rmSync(empty, { recursive: true, force: true });
    rmSync(withJq, { recursive: true, force: true });
  }
});

test('gitleaks-worktree-mount: .git 이 파일인 작업 트리 마운트만 막는다', () => {
  const worktree = tempDir('agent-guard-wt-');
  const checkout = tempDir('agent-guard-repo-');
  try {
    writeFileSync(join(worktree, '.git'), 'gitdir: D:/project/egov-enterprise/.git/worktrees/x\n');
    mkdirSync(join(checkout, '.git'));
    const scan = (dir) => `docker run --rm -v "${dir.replaceAll('\\', '/')}:/repo" zricethezav/gitleaks:v8.28.0 git /repo --log-opts="origin/main..feat/x"`;
    assert.ok(ruleOf(scan(worktree)).includes('gitleaks-worktree-mount'));
    assert.ok(!ruleOf(scan(checkout)).includes('gitleaks-worktree-mount'));
    // `$PWD` 마운트와 `cd <작업 트리> &&` 뒤의 상대 마운트도 그 디렉터리로 판정한다.
    assert.ok(ruleOf(scan('$PWD'), worktree).includes('gitleaks-worktree-mount'));
    assert.ok(ruleOf(`cd "${worktree}" && ${scan('.')}`).includes('gitleaks-worktree-mount'));
  } finally {
    rmSync(worktree, { recursive: true, force: true });
    rmSync(checkout, { recursive: true, force: true });
  }
});

test('막는 판정이 묻는 판정보다 앞서고, 걸린 규칙의 이유와 방법을 모두 돌려준다', () => {
  const verdict = decide('git commit -am "x" && git push --force origin feat/x');
  assert.equal(verdict.decision, 'deny');
  assert.deepEqual(verdict.rules, ['git-commit-without-only', 'git-force-push']);
  assert.match(verdict.reason, /\[agent-guard:git-commit-without-only\].*--only/u);
  assert.equal(decide('git status && npm test'), null);
  assert.equal(decide(''), null);
});

test('도구마다 입력을 읽고 그 도구의 형식으로 답한다', () => {
  assert.deepEqual(readHookInput('claude', { tool_name: 'Bash', tool_input: { command: 'git status' }, cwd: 'D:/r' }), { command: 'git status', cwd: 'D:/r' });
  // Codex 의 셸 래퍼 배열은 셸에 넘긴 스크립트를 판정한다 — 이어 붙이면 git 이 명령 자리에서 밀려나 아무 규칙도 걸리지 않는다.
  assert.deepEqual(readHookInput('codex', { tool_input: { command: ['powershell.exe', '-Command', 'git status'] }, cwd: 'D:/r' }),
    { command: 'git status', cwd: 'D:/r' });
  assert.deepEqual(readHookInput('codex', { tool_input: { command: ['bash', '-lc', 'git commit -am x'] }, cwd: 'D:/r' }),
    { command: 'git commit -am x', cwd: 'D:/r' });
  assert.deepEqual(readHookInput('codex', { tool_input: { command: ['git', 'status'] }, cwd: 'D:/r' }), { command: 'git status', cwd: 'D:/r' });
  assert.deepEqual(readHookInput('antigravity', { toolCall: { name: 'run_command', args: { CommandLine: 'git status', Cwd: 'D:/r' } } }),
    { command: 'git status', cwd: 'D:/r' });
  assert.equal(readHookInput('claude', { tool_name: 'Read', tool_input: { file_path: 'a' } }), null);
  // Codex 의 apply_patch 는 파일 편집이다 — 본문의 명령 같은 줄을 판정하면 문서 편집이 막힌다.
  assert.equal(readHookInput('codex', { tool_input: { command: ['apply_patch', '*** Begin Patch\n+git commit -m x\n*** End Patch'] }, cwd: 'D:/r' }), null);
  assert.equal(readHookInput('codex', { tool_input: { command: ['C:\\codex\\apply_patch.exe', '*** Begin Patch\n+git commit -m x\n'] }, cwd: 'D:/r' }), null);

  const ask = { decision: 'ask', rules: ['git-force-push'], reason: 'r' };
  assert.equal(JSON.parse(renderVerdict('claude', ask)).hookSpecificOutput.permissionDecision, 'ask');
  assert.equal(JSON.parse(renderVerdict('codex', ask)).hookSpecificOutput.permissionDecision, 'deny', 'Codex 는 묻는 판정이 없어 막고 안내한다');
  assert.equal(JSON.parse(renderVerdict('antigravity', ask)).decision, 'force_ask');
  assert.equal(renderVerdict('claude', null), '', '판정이 없으면 승인도 내리지 않는다');
  assert.equal(renderVerdict('codex', null), '');
  assert.equal(renderVerdict('antigravity', null), '{}', 'Antigravity 에 allow 를 주면 사용자 승인을 건너뛴다');
});

test('stdin 으로 받은 실제 입력에 실행 파일이 답하고, 읽을 수 없는 입력은 막지 않되 단계 이름과 오류 이름만 stderr 에 남긴다', () => {
  const run = (agent, input) => spawnSync(process.execPath, [GUARD, '--agent', agent], { input, encoding: 'utf8' });
  const claude = run('claude', JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git commit -am "x"' }, cwd: repoRoot }));
  assert.equal(claude.status, 0);
  assert.equal(JSON.parse(claude.stdout).hookSpecificOutput.permissionDecision, 'deny');
  assert.equal(claude.stderr, '', '판정이 끝나면 진단을 쓰지 않는다');
  const antigravity = run('antigravity', JSON.stringify({ toolCall: { name: 'run_command', args: { CommandLine: 'git commit -am "x"', Cwd: repoRoot } } }));
  assert.equal(JSON.parse(antigravity.stdout).decision, 'deny');
  // 2026-10-28 교차 검토(N2): 판정 실패가 "걸린 규칙 없음"과 구분되지 않았다. 입력 원문(비밀이 섞일 수 있다)은 진단에 싣지 않는다.
  const broken = run('claude', 'not json PRIVATE_MARKER');
  assert.equal(broken.status, 0);
  assert.equal(broken.stdout, '');
  assert.match(broken.stderr, /^\[agent-guard\] input 판정 실패\(SyntaxError\)[^\n]*\n$/u, '읽지 못한 입력을 "걸린 규칙 없음"과 구분되게 알린다');
  assert.ok(!broken.stderr.includes('PRIVATE_MARKER') && !broken.stderr.includes('not json'), '입력 원문을 진단에 싣지 않는다');
  assert.equal(run('antigravity', 'not json').stdout, '{}');
});

test('규칙 판정이 던지면 그 규칙만 통과로 두고(fail-open) 규칙 id 와 오류 이름만 stderr 에 한 번 남긴다', () => {
  const secret = 'PRIVATE_MARKER'; // 비밀 대신 쓰는 표지 — 진단에 실리면 안 되는 문구
  const thrower = (error) => ({ id: 'throwing-rule', decision: 'deny', why: 'x'.repeat(30), fix: 'x'.repeat(20), match: () => { throw error; } });
  const capture = (rules, command) => {
    const written = [];
    const original = process.stderr.write;
    process.stderr.write = (chunk) => { written.push(String(chunk)); return true; };
    try { return { verdict: evaluate(command, { cwd: repoRoot, rules }), written }; } finally { process.stderr.write = original; }
  };
  const { verdict, written } = capture([thrower(new TypeError(`boom ${secret}`)), ...RULES], `git push -f origin x && echo ${secret} && git status`);
  assert.deepEqual(verdict.rules, ['git-force-push'], '다른 규칙은 그대로 판정한다');
  assert.match(written.join(''), /^\[agent-guard\] throwing-rule 판정 실패\(TypeError\)[^\n]*\n/u, '던진 규칙을 "걸린 규칙 없음"과 구분되게 알린다');
  assert.equal(written.length, 1, '같은 규칙의 실패는 조각마다 되풀이하지 않는다');
  for (const leaked of [secret, 'boom', 'git push', 'git status']) assert.ok(!written[0].includes(leaked), `진단에 명령·메시지를 싣지 않는다: ${leaked}`);
  // 이름 자리에 명령 문구를 넣은 오류도 이름을 싣지 않는다.
  const named = Object.assign(new Error('x'), { name: `git push ${secret}` });
  const second = capture([thrower(named)], 'git status');
  assert.equal(second.verdict, null);
  assert.match(second.written[0], /^\[agent-guard\] throwing-rule 판정 실패\(object\)/u);
  assert.ok(!second.written[0].includes(secret));
});

test('세 도구의 어댑터가 같은 가드를 자기 형식으로 부른다', () => {
  const read = (file) => JSON.parse(readFileSync(join(repoRoot, file), 'utf8'));
  const claude = read('.claude/settings.json').hooks.PreToolUse.flatMap((group) => group.hooks.map((hook) => ({ ...hook, matcher: group.matcher })));
  const claudeGuards = claude.filter((hook) => hook.command === 'node' && hook.args?.join(' ') === '${CLAUDE_PROJECT_DIR}/scripts/agent-guard.mjs --agent claude');
  assert.ok(claudeGuards.length, 'Claude Code 어댑터');
  // 2026-10-28 감사(D5-2): Monitor 도 셸 명령(`command`)을 실행하는데 matcher 가 Bash·PowerShell 만 봤다.
  const covers = (tool) => claudeGuards.some((hook) => new RegExp(`^(?:${hook.matcher})$`, 'u').test(tool));
  for (const tool of ['Bash', 'PowerShell', 'Monitor']) assert.ok(covers(tool), `Claude Code 어댑터가 ${tool} 의 셸 명령을 본다`);
  assert.ok(!covers('Read'), '셸 명령이 아닌 도구는 거치지 않는다');
  const codex = read('.codex/hooks.json').hooks.PreToolUse.flatMap((group) => group.hooks);
  assert.ok(codex.some((hook) => hook.command === 'node scripts/agent-guard.mjs --agent codex'), 'Codex 어댑터');
  const antigravity = Object.values(read('.agents/hooks.json')).flatMap((hook) => hook.PreToolUse ?? []);
  assert.ok(antigravity.some((group) => group.matcher === 'run_command'
    && group.hooks.some((hook) => hook.command === 'node ../scripts/agent-guard.mjs --agent antigravity')), 'Antigravity 어댑터(작업 디렉터리는 .agents/)');
});

test('Monitor 도구의 셸 명령도 읽고, 세 어댑터의 실제 명령줄로 확인 명령(echo AGENT_GUARD_CANARY)이 막힌다', () => {
  assert.deepEqual(readHookInput('claude', { tool_name: 'Monitor', tool_input: { command: 'tail -f a.log', description: 'd', timeout_ms: 1000 }, cwd: 'D:/r' }),
    { command: 'tail -f a.log', cwd: 'D:/r' });
  assert.equal(readHookInput('claude', { tool_name: 'Monitor', tool_input: { ws: { url: 'wss://x' }, description: 'd' } }), null, 'ws 감시는 셸 명령이 아니다');
  const read = (file) => JSON.parse(readFileSync(join(repoRoot, file), 'utf8'));
  // 어댑터에 적힌 명령줄 그대로 실행한다 — 경로·--agent 값이 틀리면 확인 명령이 막히지 않는다.
  const runAdapter = (label, [program, ...args], cwd, input) => {
    assert.equal(program, 'node');
    const argv = args.map((arg) => arg.replaceAll('${CLAUDE_PROJECT_DIR}', repoRoot));
    const out = spawnSync(process.execPath, argv, { cwd, input: JSON.stringify(input), encoding: 'utf8' });
    const verdict = out.stdout.trim() ? JSON.parse(out.stdout) : {};
    assert.equal(verdict.hookSpecificOutput?.permissionDecision ?? verdict.decision, 'deny', `${label} 어댑터가 확인 명령을 막아야 한다`);
  };
  const canary = 'echo AGENT_GUARD_CANARY';
  for (const hook of read('.claude/settings.json').hooks.PreToolUse.flatMap((group) => group.hooks)) {
    for (const tool_name of ['Bash', 'PowerShell', 'Monitor']) {
      // Claude Code 는 command 와 args 를 따로 넘긴다(경로에 공백이 있어도 한 인자다).
      runAdapter(`Claude Code ${tool_name}`, [hook.command, ...(hook.args ?? [])], repoRoot, { tool_name, tool_input: { command: canary }, cwd: repoRoot });
    }
  }
  // Codex·Antigravity 어댑터는 저장소 상대 경로만 쓰는 한 줄 명령이다.
  for (const hook of read('.codex/hooks.json').hooks.PreToolUse.flatMap((group) => group.hooks)) {
    runAdapter('Codex', hook.command.split(' '), repoRoot, { tool_input: { command: ['powershell.exe', '-Command', canary] }, cwd: repoRoot });
  }
  for (const hook of Object.values(read('.agents/hooks.json')).flatMap((group) => group.PreToolUse ?? []).flatMap((group) => group.hooks)) {
    runAdapter('Antigravity', hook.command.split(' '), join(repoRoot, '.agents'), { toolCall: { name: 'run_command', args: { CommandLine: canary, Cwd: repoRoot } } });
  }
});
