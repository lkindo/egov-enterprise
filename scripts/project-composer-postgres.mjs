/*
 * 생성기가 소유하는 일회용 PostgreSQL 컨테이너. 생성(DB 번들)과 메뉴 미리보기 자료 갱신이 같은 수명 관리를 쓴다.
 * 포트를 공개하지 않고 이름 있는 볼륨·바인드 마운트를 붙이지 않는다. 이미지가 데이터 폴더에 만드는 익명 볼륨은 지울 때
 * 함께 지운다(--volumes). 비밀번호는 명령 인자가 아니라 임시 환경으로만 넘긴다(인자는 로그에 남는다).
 * 지울 때는 소유 표식이 이 작업의 표식과 같은지 확인한다 — 같은 ID 라도 남의 컨테이너는 지우지 않는다.
 */
import { randomBytes } from 'node:crypto';

export const COMPOSER_POSTGRES_IMAGE = 'postgres:17-alpine';
export const COMPOSER_OWNER_LABEL = 'egov.project-composer';
export const ownedContainerId = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

/** `docker` 는 (args, options) => Promise<stdout> 이다. 컨테이너 ID 를 돌려준다(형식 확인은 호출자가 한다). */
export function createOwnedPostgres(docker, { name, token, log }) {
  return docker(['run', '--detach', '--name', name, '--label', `${COMPOSER_OWNER_LABEL}=${token}`,
    '--env', 'POSTGRES_USER=composer', '--env', 'POSTGRES_DB=composer', '--env', 'POSTGRES_PASSWORD', COMPOSER_POSTGRES_IMAGE],
  { env: { ...process.env, POSTGRES_PASSWORD: randomBytes(32).toString('hex') }, ...(log ? { log } : {}) });
}

/** 준비될 때까지 기다린다. 제한 안에 준비되지 않으면 false 다. */
export async function waitForOwnedPostgres(docker, container, { attempts = 120, delayMs = 500 } = {}) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try { await docker(['exec', container, 'pg_isready', '-h', '127.0.0.1', '-U', 'composer', '-d', 'composer']); return true; }
    catch { await new Promise(accept => setTimeout(accept, delayMs)); }
  }
  return false;
}

export async function removeOwnedPostgres(docker, container, token) {
  const owner = await docker(['inspect', '--format', `{{ index .Config.Labels "${COMPOSER_OWNER_LABEL}" }}`, container]);
  if (owner !== token) throw Object.assign(new Error('Database container ownership changed; refusing cleanup'), { code: 'OWNERSHIP_CHANGED' });
  await docker(['rm', '--force', '--volumes', container]);
}

/**
 * ID 를 받지 못한 컨테이너를 지운다. `docker run --detach` 는 만들기와 시작을 함께 하므로 시작이 실패하면 ID 없이
 * 컨테이너(소유 표식·익명 볼륨 포함)가 남는다. 이 작업만의 표식으로 찾으므로 남의 컨테이너는 고르지 않는다. 지운 수를 돌려준다.
 */
export async function removeOwnedPostgresByToken(docker, token) {
  let listed;
  try { listed = await docker(['ps', '--all', '--no-trunc', '--quiet', '--filter', `label=${COMPOSER_OWNER_LABEL}=${token}`]); }
  catch (error) { throw Object.assign(new Error(`Owned container lookup failed: ${error.message}`), { code: 'LOOKUP_FAILED' }); }
  const ids = String(listed).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  for (const id of ids) {
    if (!ownedContainerId(id)) throw new Error('Invalid owned database container identity');
    await removeOwnedPostgres(docker, id, token);
  }
  return ids.length;
}
