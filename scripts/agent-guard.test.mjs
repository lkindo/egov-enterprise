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
    hit: ['git push --force-with-lease origin feat/x', 'git push -f origin feat/x', 'git push origin +feat/x'],
    pass: ['git push -u origin feat/x', 'git push origin --delete feat/old', 'git commit --only -m "정리; git push --force 는 쓰지 않는다" -- a.txt',
      "git commit --only -F - -- a.txt <<'EOF'\n본문에 적은 git push --force 는 명령이 아니다\nEOF"],
  },
  'git-discard-worktree': {
    // 2026-10-27 독립 검토(Antigravity)가 찾은 미탐: 따옴표 속 `<<`·주석 속 아포스트로피가 뒤 줄의 실제 명령을 지웠다.
    hit: ['git reset --hard origin/main', 'git clean -fdx', 'git checkout -- .', 'git checkout .', 'git restore .', 'git branch -D feat/x', 'git stash drop',
      'git commit --only -m "Fix << EOF parser" -- a.txt\ngit reset --hard', "# Let's check\ngit reset --hard\n# It's done",
      'node -e "console.log(1 << shift)"\ngit reset --hard',
      // 작업 트리 디렉터리와 미추적 산출물 삭제는 브랜치 삭제와 별개로 승인을 받는다(SOP §6.6).
      'git worktree remove D:\\wt-board', 'git worktree remove --force D:\\wt-board', 'git branch -df feat/x', 'git branch -fd feat/x',
      // 값을 띄어 쓴 전역 옵션(`--git-dir <경로>`)을 하위 명령으로 읽으면 규칙이 아예 걸리지 않았다.
      'git --git-dir D:/elsewhere/.git branch -D feat/x'],
    pass: ['git reset --soft HEAD~1', 'git checkout main', 'git restore --staged .', 'git restore -- scripts/dev.mjs', 'git branch -d feat/x', 'git stash list',
      'git worktree list', 'git worktree prune'],
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
    hit: ['MSYS_NO_PATHCONV=1 docker run --rm -v "$PWD/db:/flyway/sql" flyway/flyway:12.4.0 -locations=filesystem:/flyway/sql/migration,filesystem:/flyway/sql/seed-dev -baselineOnMigrate=true migrate'],
    pass: ['docker run --rm flyway/flyway:12.4.0 -locations=filesystem:/flyway/sql/migration migrate', 'docker run --rm flyway/flyway:12.4.0 -locations=filesystem:/flyway/sql/seed-dev info',
      'git commit --only -m "flyway migrate 에 seed-dev 를 섞지 않는다" -- a.txt'],
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
      './gradlew :api-server:test --tests "nuri.api.harness.SecurityAuthAnnotationLinterTest.someMethod"'],
    pass: ['./gradlew :api-server:harnessTest --tests "nuri.api.harness.SecurityAuthAnnotationLinterTest"',
      './gradlew :api-server:test --tests "nuri.openapi.OpenApiDocumentationTest" :api-server:harnessTest --tests "nuri.api.harness.SecurityAuthAnnotationLinterTest"'],
  },
  'worktree-name-collides-with-e2e': {
    hit: ['git worktree add D:\\wt-quality -b fix/x origin/main', 'git worktree add -b fix/x ../wt-contracts origin/main'],
    // setup 프로젝트 매처는 `/.*\.setup\.ts/` 라 디렉터리 이름으로는 걸리지 않는다(2026-10-27 감사).
    pass: ['git worktree add D:\\wt-board -b fix/x origin/main', 'git worktree list', 'git worktree add D:\\wt-setup -b fix/x origin/main'],
  },
};

test('규칙 표와 시험 사례가 일대일이다', () => {
  const tested = new Set([...Object.keys(CASES), 'jq-not-installed', 'gitleaks-worktree-mount']);
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

test('git-commit-without-only: 병합 충돌을 푼 커밋은 막지 않는다', () => {
  const root = tempDir('agent-guard-merge-');
  try {
    execFileSync('git', ['init', '-q'], { cwd: root });
    assert.ok(ruleOf('git commit --no-edit', root).includes('git-commit-without-only'));
    writeFileSync(join(root, '.git', 'MERGE_HEAD'), '0'.repeat(40));
    assert.ok(!ruleOf('git commit --no-edit', root).includes('git-commit-without-only'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
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
    process.env.PATH = empty;
    assert.ok(ruleOf("gh pr checks 990 --json name,bucket | jq '.[]'").includes('jq-not-installed'));
    assert.ok(!ruleOf("gh pr checks 990 --json name,bucket --jq '.[]'").includes('jq-not-installed'));
    process.env.PATH = withJq;
    assert.ok(!ruleOf("gh pr checks 990 --json name,bucket | jq '.[]'").includes('jq-not-installed'));
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

test('stdin 으로 받은 실제 입력에 실행 파일이 답하고, 읽을 수 없는 입력은 막지 않는다', () => {
  const run = (agent, input) => spawnSync(process.execPath, [GUARD, '--agent', agent], { input, encoding: 'utf8' });
  const claude = run('claude', JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git commit -am "x"' }, cwd: repoRoot }));
  assert.equal(claude.status, 0);
  assert.equal(JSON.parse(claude.stdout).hookSpecificOutput.permissionDecision, 'deny');
  const antigravity = run('antigravity', JSON.stringify({ toolCall: { name: 'run_command', args: { CommandLine: 'git commit -am "x"', Cwd: repoRoot } } }));
  assert.equal(JSON.parse(antigravity.stdout).decision, 'deny');
  assert.equal(run('claude', 'not json').stdout, '');
  assert.equal(run('antigravity', 'not json').stdout, '{}');
});

test('세 도구의 어댑터가 같은 가드를 자기 형식으로 부른다', () => {
  const read = (file) => JSON.parse(readFileSync(join(repoRoot, file), 'utf8'));
  const claude = read('.claude/settings.json').hooks.PreToolUse.flatMap((group) => group.hooks.map((hook) => ({ ...hook, matcher: group.matcher })));
  assert.ok(claude.some((hook) => /Bash/.test(hook.matcher) && /PowerShell/.test(hook.matcher) && hook.command === 'node'
    && hook.args?.join(' ') === '${CLAUDE_PROJECT_DIR}/scripts/agent-guard.mjs --agent claude'), 'Claude Code 어댑터');
  const codex = read('.codex/hooks.json').hooks.PreToolUse.flatMap((group) => group.hooks);
  assert.ok(codex.some((hook) => hook.command === 'node scripts/agent-guard.mjs --agent codex'), 'Codex 어댑터');
  const antigravity = Object.values(read('.agents/hooks.json')).flatMap((hook) => hook.PreToolUse ?? []);
  assert.ok(antigravity.some((group) => group.matcher === 'run_command'
    && group.hooks.some((hook) => hook.command === 'node ../scripts/agent-guard.mjs --agent antigravity')), 'Antigravity 어댑터(작업 디렉터리는 .agents/)');
});
