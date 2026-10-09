import assert from 'node:assert/strict';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { refreshComposerMenus } from './project-composer-menus-refresh.mjs';

const root = resolve(import.meta.dirname, '..');
const quick = { attempts: 2, delayMs: 1 };

// docker·node 호출을 기록하는 가짜 실행기. 실제 컨테이너를 띄우지 않는다. 실제 실행기처럼 capture 를 켠 호출만 출력을 돌려준다.
function fakeRun({ ready = true, owner = 'self', failNode = false, failRemove = false, failStart = false, dockerDown = false } = {}) {
  const calls = [];
  let token;
  const run = async (command, args, options) => {
    calls.push({ command, args, options });
    const out = value => (options?.capture ? value : '');
    if (command === 'docker') {
      if (dockerDown) throw Object.assign(new Error(`Command failed: docker ${args[0]}`), { code: 'COMMAND_FAILED' });
      if (args[0] === 'run') {
        token = args[args.indexOf('--label') + 1].split('=')[1];
        if (failStart) throw Object.assign(new Error('Command failed: docker (COMMAND_FAILED 125)'), { code: 'COMMAND_FAILED' });
        return out('c'.repeat(64));
      }
      if (args[0] === 'ps') return out(failStart && args.includes(`label=egov.project-composer=${token}`) ? 'c'.repeat(64) : '');
      if (args[0] === 'exec') { if (!ready) throw new Error('not ready'); return ''; }
      if (args[0] === 'inspect') return out(owner === 'self' ? token : 'someone-else');
      if (args[0] === 'rm' && failRemove) throw new Error('rm failed');
      return '';
    }
    if (command === 'node' && failNode) throw Object.assign(new Error('Command failed: node (COMMAND_FAILED 1)'), { code: 'COMMAND_FAILED' });
    return '';
  };
  return { calls, run, get token() { return token; } };
}
const removed = calls => calls.some(call => call.command === 'docker' && call.args[0] === 'rm');

/*
 * 메뉴 미리보기 자료 갱신(npm run project:menus:refresh). 이 작업만의 일회용 컨테이너를 포트·볼륨 없이 띄우고, 비밀번호는 임시
 * 환경으로만 넘기며, 스냅숏 모드의 DB 생성기를 돌린 뒤 소유 표식을 확인하고 지운다.
 */
test('the menu refresh runs the snapshot generator in an owned, unpublished, single-use database and removes it', async () => {
  const fake = fakeRun();
  const { log } = await refreshComposerMenus({ root, run: fake.run, readiness: quick });
  const start = fake.calls.find(call => call.command === 'docker' && call.args[0] === 'run');
  assert.equal(start.args[start.args.indexOf('--name') + 1], `egov-composer-menus-${fake.token}`);
  assert.equal(start.args[start.args.indexOf('--label') + 1], `egov.project-composer=${fake.token}`);
  assert.ok(!start.args.some(arg => ['--publish', '-p', '--volume', '-v', '--mount'].includes(arg)), 'no published port or mounted volume');
  assert.ok(start.args.includes('POSTGRES_PASSWORD') && !start.args.some(arg => /^POSTGRES_PASSWORD=/.test(arg)), 'the password is not an argument');
  assert.match(start.options.env.POSTGRES_PASSWORD, /^[a-f0-9]{64}$/);
  const generator = fake.calls.find(call => call.command === 'node');
  assert.deepEqual(generator.args, ['scripts/generate-reusable-base-db.mjs', '--write-menu-snapshot', '--container', 'c'.repeat(64),
    '--allow-dirty', '--allow-non-release-ref']);
  assert.equal(generator.options.root, root);
  assert.equal(log, join(root, 'build', 'project-composer', 'menus-refresh', `${fake.token}.log`));
  assert.equal(generator.options.log, log);
  assert.deepEqual(fake.calls.slice(-2).map(call => call.args[0]), ['inspect', 'rm']);
  assert.deepEqual(fake.calls.at(-1).args, ['rm', '--force', '--volumes', 'c'.repeat(64)], 'the anonymous data volume goes with the container');
});

test('a failed refresh keeps the original failure with its log and still removes its own container', async () => {
  let fake = fakeRun({ failNode: true });
  await assert.rejects(refreshComposerMenus({ root, run: fake.run, readiness: quick }), error => error.code === 'COMMAND_FAILED' && /menus-refresh/.test(error.log));
  assert.ok(removed(fake.calls));
  // 정리까지 실패해도 원래 실패를 가리지 않고, 남은 컨테이너 이름을 함께 알린다.
  fake = fakeRun({ failNode: true, failRemove: true });
  await assert.rejects(refreshComposerMenus({ root, run: fake.run, readiness: quick }),
    error => error.code === 'COMMAND_FAILED' && error.leftoverContainer === `egov-composer-menus-${fake.token}` && !error.snapshotWritten);
  fake = fakeRun({ ready: false });
  await assert.rejects(refreshComposerMenus({ root, run: fake.run, readiness: quick }), /did not become ready/);
  assert.ok(removed(fake.calls));
  assert.ok(!fake.calls.some(call => call.command === 'node'), 'the generator never runs against an unready database');
  // 정리만 실패하면 자료는 갱신했다고 말하고 남은 컨테이너를 알린다('갱신하지 못했다' 가 아니다).
  fake = fakeRun({ failRemove: true });
  await assert.rejects(refreshComposerMenus({ root, run: fake.run, readiness: quick }), error => error.snapshotWritten === true
    && /갱신했지만/.test(error.message) && /rm failed/.test(error.message) && error.leftoverContainer === `egov-composer-menus-${fake.token}`);
  // 표식이 다른 컨테이너는 지우지 않고, 남의 것일 수 있으니 지우라고 알리지도 않는다.
  fake = fakeRun({ owner: 'other' });
  await assert.rejects(refreshComposerMenus({ root, run: fake.run, readiness: quick }),
    error => /ownership changed/.test(error.message) && error.leftoverContainer === undefined);
  assert.ok(!removed(fake.calls));
  // 만들기는 됐지만 시작이 실패해 ID 를 받지 못해도, 이 작업의 표식으로 찾아 지우고 원래 실패를 알린다.
  fake = fakeRun({ failStart: true });
  await assert.rejects(refreshComposerMenus({ root, run: fake.run, readiness: quick }),
    error => error.code === 'COMMAND_FAILED' && error.leftoverContainer === undefined);
  assert.deepEqual(fake.calls.filter(call => call.command === 'docker').map(call => call.args[0]), ['run', 'ps', 'inspect', 'rm']);
  assert.deepEqual(fake.calls.at(-1).args, ['rm', '--force', '--volumes', 'c'.repeat(64)]);
  // Docker 에 닿지 않으면 남았는지 알 수 없다. 없는 컨테이너를 지우라고 하지 않고 원래 실패를 알린다.
  fake = fakeRun({ dockerDown: true });
  await assert.rejects(refreshComposerMenus({ root, run: fake.run, readiness: quick }),
    error => error.message === 'Command failed: docker run' && error.leftoverContainer === undefined);
  // 생성기가 실패했고 표식도 바뀌었으면, 남의 것일 수 있는 컨테이너는 지우지도 이름을 대지도 않는다.
  fake = fakeRun({ failNode: true, owner: 'other' });
  await assert.rejects(refreshComposerMenus({ root, run: fake.run, readiness: quick }),
    error => error.code === 'COMMAND_FAILED' && error.leftoverContainer === undefined);
  assert.ok(!removed(fake.calls));
  // 컨테이너 ID 를 받지 못하면(출력을 모으지 않은 실행) 생성기를 돌리지 않는다.
  fake = fakeRun();
  await assert.rejects(refreshComposerMenus({ root, run: (command, args, options) => fake.run(command, args, { ...options, capture: false }), readiness: quick }),
    /Invalid owned database container identity/);
  assert.ok(!fake.calls.some(call => call.command === 'node'));
});
