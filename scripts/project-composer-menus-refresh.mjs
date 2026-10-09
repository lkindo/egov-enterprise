#!/usr/bin/env node
/*
 * 메뉴 미리보기 자료(config/project-composer-menus.json)를 갱신한다: npm run project:menus:refresh.
 * 이 작업만을 위해 새로 만든 일회용 PostgreSQL 17 컨테이너에 원본 마이그레이션을 적용하고, 메뉴와 그룹별 메뉴 표시 배정을
 * 읽어 자료를 다시 쓴다. 운영·공유·기존 업무 DB 컨테이너는 쓰지 않는다. 컨테이너는 포트를 공개하지 않고, 비밀번호는 임시
 * 환경으로만 넘기며, 끝나면 소유 표식을 확인한 뒤 익명 데이터 볼륨과 함께 지운다(project-composer-postgres.mjs). 로그는 가려서
 * 이 컴퓨터에만 남긴다. 정리에 실패하면 남은 컨테이너 이름을 알린다 — 표식이 바뀐 컨테이너는 남의 것일 수 있어 알리지 않는다.
 */
import { randomBytes } from 'node:crypto';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runComposerCommand } from './project-composer.mjs';
import { createOwnedPostgres, ownedContainerId, removeOwnedPostgres, removeOwnedPostgresByToken, waitForOwnedPostgres } from './project-composer-postgres.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** 갱신을 한 번 한다. 로그 경로를 돌려주며, 실패하면 로그 경로를 단 오류를 던진다. readiness 는 시험용 대기 설정이다. */
export async function refreshComposerMenus({ root = ROOT, run = runComposerCommand, readiness } = {}) {
  const token = randomBytes(8).toString('hex');
  const log = join(root, 'build', 'project-composer', 'menus-refresh', `${token}.log`);
  const docker = (args, options = {}) => run('docker', args, { root, capture: true, ...options });
  const name = `egov-composer-menus-${token}`;
  let container;
  let created = false;
  let failure;
  try {
    created = true;
    container = await createOwnedPostgres(docker, { name, token, log });
    if (!ownedContainerId(container)) throw new Error('Invalid owned database container identity');
    if (!await waitForOwnedPostgres(docker, container, readiness)) throw new Error('Owned PostgreSQL did not become ready');
    await run('node', ['scripts/generate-reusable-base-db.mjs', '--write-menu-snapshot', '--container', container,
      '--allow-dirty', '--allow-non-release-ref'], { root, log });
    return { log };
  } catch (error) {
    failure = Object.assign(error, { log });
    throw failure;
  } finally {
    // 정리 실패가 원래 실패를 가리지 않게 한다. 자료를 이미 다시 쓴 뒤의 정리 실패는 '갱신하지 못했다' 가 아니다.
    // 시작에 실패해 ID 를 받지 못했어도 컨테이너는 만들어졌을 수 있다. 그때는 이 작업의 표식으로 찾아 지운다.
    if (created) {
      try {
        if (ownedContainerId(container)) await removeOwnedPostgres(docker, container, token);
        else await removeOwnedPostgresByToken(docker, token);
      } catch (cleanupError) {
        // 표식이 바뀐 컨테이너는 남의 것일 수 있고, 찾기가 실패했으면(Docker 에 닿지 않음) 남았는지 알 수 없다. 둘 다 이름을 대지 않는다.
        const leftover = ['OWNERSHIP_CHANGED', 'LOOKUP_FAILED'].includes(cleanupError.code) ? {} : { leftoverContainer: name };
        if (failure) Object.assign(failure, leftover);
        else {
          throw Object.assign(new Error(`메뉴 자료는 갱신했지만 일회용 컨테이너를 지우지 못했습니다: ${cleanupError.message}`),
            { log, snapshotWritten: true, ...leftover });
        }
      }
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const shown = path => relative(ROOT, path).replaceAll('\\', '/');
  try {
    const { log } = await refreshComposerMenus();
    process.stdout.write(`[menus] config/project-composer-menus.json 을 원본 마이그레이션 적용 결과로 갱신했습니다. 로그: ${shown(log)}\n`);
    process.stdout.write('[menus] 바뀐 자료를 SQL 변경과 함께 검토한 뒤 생성기 화면을 새로고침하세요.\n');
  } catch (error) {
    process.stderr.write(error.snapshotWritten ? `[menus] ${error.message}\n` : `[menus] 메뉴 자료를 갱신하지 못했습니다: ${error.message}\n`);
    if (error.leftoverContainer) process.stderr.write(`[menus] 남은 컨테이너를 지우세요: docker rm --force --volumes ${error.leftoverContainer}\n`);
    if (error.log) process.stderr.write(`[menus] 로그: ${shown(error.log)}\n`);
    process.exitCode = 1;
  }
}
