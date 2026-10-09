import assert from 'node:assert/strict';
import test from 'node:test';
import { DISK_BLOCK_BYTES, DISK_WARN_BYTES, PREFLIGHT_IMAGE, composerPreflight } from './project-composer-preflight.mjs';

/*
 * 생성 전 환경 점검(설계서 14장·19장, E5). 명령 실행은 가짜로 바꿔 도구 상태마다 판정을 고정한다.
 * 출력 원문(경로·이름 같은 다른 글자)은 내보내지 않고 판정에 쓴 버전과 개수만 싣는지도 본다.
 */
const HEAD = 'a'.repeat(40);
const healthy = {
  'docker version': 'linux 29.1.3',
  'java --version': 'openjdk 21.0.9 2025-10-21 LTS\nOpenJDK Runtime Environment Temurin-21.0.9+10 (build 21.0.9+10-LTS)',
  'javac --version': 'javac 21.0.9',
  'pnpm --version': '10.13.1',
  'git status': '',
  'git rev-parse': HEAD,
  'docker image': 'sha256:742f40ea20b9f',
};
const missing = () => Object.assign(new Error('spawn ENOENT'), { code: 'TOOL_UNAVAILABLE' });
// 실행 파일 이름(경로 제외)과 첫 번째 플래그가 아닌 인자로 명령을 가린다.
const keyOf = (command, args) => `${command.split(/[\\/]/).pop()} ${args.find(arg => !arg.startsWith('--') || arg === '--version')}`;
function preflightWith(overrides = {}, options = {}) {
  const outputs = { ...healthy, ...overrides };
  const calls = [];
  const probe = async (command, args) => {
    calls.push([command, ...args]);
    const value = outputs[keyOf(command, args)];
    if (value instanceof Error || value === undefined) throw value ?? new Error('not found');
    return value;
  };
  return composerPreflight({ outputRoot: 'D:/out', sourceCommit: HEAD, probe, nodeVersion: '22.17.1', javaHome: '',
    freeBytes: () => 250 * 1024 ** 3, ...options }).then(result => ({ ...result, calls }));
}
const byId = (result, id) => result.checks.find(check => check.id === id);

test('a healthy computer passes every check and reports only parsed versions', async () => {
  const result = await preflightWith();
  assert.equal(result.blocked, false);
  assert.deepEqual(result.checks.map(check => [check.id, check.status]), [
    ['docker', 'pass'], ['java', 'pass'], ['node', 'pass'], ['pnpm', 'pass'], ['image', 'pass'], ['worktree', 'pass'], ['source', 'pass'], ['disk', 'pass']]);
  assert.deepEqual(result.checks.map(check => check.detail ?? null), ['29.1.3', '21.0.9', '22.17.1', '10.13.1', null, null, HEAD.slice(0, 12), '250.0GB']);
  assert.equal(byId(result, 'disk').label, '출력 위치의 남은 공간이 충분합니다');
  assert.ok(result.calls.some(call => call.join(' ') === `docker image inspect --format {{.Id}} ${PREFLIGHT_IMAGE}`));
  assert.doesNotMatch(JSON.stringify(result.checks), /Temurin|OpenJDK Runtime|sha256|linux/);
});

test('Docker that is missing, stopped or in Windows container mode blocks with the right action', async () => {
  const stopped = await preflightWith({ 'docker version': new Error('pipe not found') });
  assert.equal(stopped.blocked, true);
  assert.deepEqual(byId(stopped, 'docker'), { id: 'docker', status: 'block', code: 'TOOL_UNAVAILABLE',
    label: 'Docker 엔진에 연결할 수 없습니다. Docker를 시작하거나 접근 권한을 확인한 뒤 다시 점검하세요.' });
  assert.equal(byId(stopped, 'image'), undefined);
  assert.ok(!stopped.calls.some(call => call[1] === 'image'));
  // 실행 파일이 없으면 다시 점검으로는 풀리지 않는다. 생성기 서버의 PATH 는 시작할 때 고정된다.
  assert.equal(byId(await preflightWith({ 'docker version': missing() }), 'docker').label, 'Docker를 찾지 못했습니다. Docker를 설치한 뒤 생성기를 다시 시작하세요.');
  const windows = await preflightWith({ 'docker version': 'windows 29.1.3' });
  assert.equal(byId(windows, 'docker').status, 'block');
  assert.equal(byId(windows, 'docker').label, 'Docker가 Windows 컨테이너 모드입니다. Linux 컨테이너로 전환한 뒤 다시 점검하세요.');
  assert.equal(byId(windows, 'image'), undefined, 'a Windows-mode engine cannot answer for the Linux image');
});

test('other missing tools block with a restart, because the generator keeps the environment it started with', async () => {
  assert.equal(byId(await preflightWith({ 'pnpm --version': new Error('not found') }), 'pnpm').label, 'pnpm 9 이상을 찾지 못했습니다. pnpm을 설치한 뒤 생성기를 다시 시작하세요.');
  assert.equal(byId(await preflightWith({ 'pnpm --version': '8.15.0' }), 'pnpm').status, 'block');
  assert.equal(byId(await preflightWith({}, { nodeVersion: '20.11.0' }), 'node').label, 'Node.js 22 이상이 필요합니다(지금 20.11.0). Node.js 22 이상으로 생성기를 다시 시작하세요.');
  assert.equal(byId(await preflightWith({ 'git status': new Error('not a repository') }), 'worktree').status, 'block');
});

test('Java 21 with a JDK passes, a missing JDK or another Java warns, and an old or missing Java blocks', async () => {
  const jre = byId(await preflightWith({ 'javac --version': missing() }), 'java');
  assert.equal(jre.status, 'warn');
  assert.equal(jre.label, 'Java 21은 있지만 JDK(javac)를 찾지 못했습니다. 빌드는 이 컴퓨터에 설치된 JDK 21을 찾아 쓰며, 없으면 실패합니다.');
  const other = byId(await preflightWith({ 'java --version': 'openjdk 25.0.1 2025-10-21' }), 'java');
  assert.equal(other.status, 'warn');
  assert.equal(other.label, 'Gradle을 실행하는 Java가 25입니다. 빌드는 이 컴퓨터에 설치된 JDK 21을 찾아 쓰며, 없으면 실패합니다.');
  assert.equal(byId(await preflightWith({ 'java --version': 'openjdk 17.0.2 2022-01-18' }), 'java').status, 'warn');
  assert.equal(byId(await preflightWith({ 'java --version': 'openjdk 11.0.2 2019-01-15' }), 'java').status, 'block');
  // Java 8 은 --version 을 몰라 실패한다. 찾지 못한 것과 같이 막는다.
  const old = byId(await preflightWith({ 'java --version': new Error('Unrecognized option') }), 'java');
  assert.equal(old.label, 'Java 21을 찾지 못했습니다. JDK 21을 설치하고 JAVA_HOME을 맞춘 뒤 생성기를 다시 시작하세요.');
  // Gradle 은 JAVA_HOME 의 Java 로 돈다. gradlew.bat 처럼 큰따옴표와 앞뒤 공백을 걷고 그 실행 파일을 묻는다.
  const home = await preflightWith({}, { javaHome: ' "C:/Program Files/jdk-21" ' });
  assert.ok(home.calls.some(call => call[0] === 'C:/Program Files/jdk-21/bin/java' && call[1] === '--version'));
  assert.ok(home.calls.some(call => call[0] === 'C:/Program Files/jdk-21/bin/javac'));
  assert.equal(byId(home, 'java').status, 'pass');
});

test('a missing image and uncommitted changes warn, counting new folders file by file as the generator copies them', async () => {
  const result = await preflightWith({ 'docker image': new Error('No such image'), 'git status': ' M a.js\n?? new/b.js\n?? new/c.js\n D d.js\n' });
  assert.equal(result.blocked, false);
  assert.deepEqual(byId(result, 'image'), { id: 'image', status: 'warn', label: `${PREFLIGHT_IMAGE} 이미지가 없습니다. 첫 생성 때 내려받습니다(네트워크 필요).` });
  assert.deepEqual(byId(result, 'worktree'), { id: 'worktree', status: 'warn', label: '커밋되지 않은 변경 4개가 그대로 생성물에 들어갑니다.' });
  assert.ok(result.calls.some(call => call.join(' ') === 'git --no-optional-locks status --porcelain --untracked-files=all'));
});

test('the source check compares the commit the requesting screen loaded, and an unknown commit blocks', async () => {
  const moved = await preflightWith({ 'git rev-parse': 'b'.repeat(40) });
  assert.equal(moved.blocked, true);
  assert.deepEqual(byId(moved, 'source'), { id: 'source', status: 'block', code: 'SOURCE_CHANGED',
    label: '원본이 새 커밋으로 바뀌었습니다. 화면을 새로 고쳐 새 원본으로 다시 확인하세요.' });
  const unknown = '원본 커밋을 확인하지 못했습니다. 화면을 새로 고친 뒤 다시 점검하세요.';
  assert.equal(byId(await preflightWith({}, { sourceCommit: undefined }), 'source').label, unknown);
  assert.equal(byId(await preflightWith({ 'git rev-parse': new Error('not a repository') }), 'source').label, unknown);
  assert.equal((await preflightWith({}, { sourceCommit: undefined })).blocked, true);
});

test('free space at the output location is judged against the measured size of one generated project', async () => {
  const at = async bytes => byId(await preflightWith({}, { freeBytes: () => bytes }), 'disk');
  assert.equal((await at(DISK_BLOCK_BYTES - 1)).status, 'block');
  assert.deepEqual(await at(DISK_BLOCK_BYTES), { id: 'disk', status: 'warn', label: '출력 위치에 2.0GB 남았습니다. 생성 하나가 약 1GB를 씁니다.' });
  assert.equal((await at(DISK_WARN_BYTES - 1)).status, 'warn');
  assert.equal((await at(DISK_WARN_BYTES)).status, 'pass');
  assert.equal((await at(Number.NaN)).status, 'warn');
  const failed = byId(await preflightWith({}, { freeBytes: () => { throw new Error('EPERM'); } }), 'disk');
  assert.deepEqual(failed, { id: 'disk', status: 'warn', label: '출력 위치의 남은 공간을 확인하지 못했습니다.' });
});
